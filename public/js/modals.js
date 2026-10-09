import {COMPANIES,SEAT,STACKS,SUBV,VENDORS,bestKey,companyName,kt,nt,planOf,vc} from './data.js';
import {S,addGigs,clearSave,loadGame,saveGame,track} from './state.js';
import {log} from './calc.js';
import {PAR,REVIEW_LOAD,SLOT_CHOICES,invCount} from './actions.js';
import {app,mo,ov,render} from './view.js';
import {firstIssues,start} from './main.js';
import {showRules} from './rules.js';

/* ===== 彈窗 ===== */
export let draft=null;
export function planPicker(adjust){
  const rows=SUBV.map(v=>{
    const V=VENDORS[v];
    return `<div class="pv" style="--vc:${vc(v)}"><b>${V.name}・${V.agent}</b><div class="seg">${V.plans.map(p=>`<button class="sb ${draft.subs[v]===p.id?'sel':''}" data-pv="${v}" data-pp="${p.id}">${p.name}<small>${p.price?`${nt(p.price)}/月・每日 ${kt(p.day)}`:'只用 API'}</small></button>`).join('')}</div></div>`;
  }).join('');
  const canSeat=!S.seatReq&&S.seats.length<SEAT.vendors.length;
  const seat=canSeat?`<div class="pv" style="--vc:var(--accent)"><b>向公司申請第 ${S.seats.length+1} 個團隊席位（${SEAT.review} 天後審核，信任需 ${SEAT.trust[S.seats.length]} 以上）</b><div class="seg">
    ${[['','不申請'],...SEAT.vendors.filter(v=>!S.seats.includes(v)).map(v=>[v,VENDORS[v].name])].map(([v,n])=>`<button class="sb ${draft.seat===v?'sel':''}" data-seat="${v}">${n}<small>${v?'公司付・每日 2.5M 額度':'自己想辦法'}</small></button>`).join('')}</div></div>`:'';
  const cost=planCost(adjust);
  return `${rows}${seat}<div class="sum"><span>這次要從個人錢包付</span><b class="num">${nt(cost)}</b><span>付完剩 <b class="num">${nt(S.wallet-cost)}</b></span></div>`;
}
export function planCost(adjust){
  let c=0; const wl=adjust?4-Math.floor((S.day-1)/5):4;
  for(const v of SUBV){
    const np=VENDORS[v].plans.find(p=>p.id===draft.subs[v]).price, op=adjust?planOf(v).price:0;
    c+=Math.max(0,np-op)*wl/4;
  }
  return c;
}
/* 開局的工作內容按鈕：選滿兩條不能再加、最後一條不能取消，結果照固定順序 */
export function toggleCompany(cs,k){
  if(cs.includes(k)) return cs.length>1?cs.filter(x=>x!==k):cs;
  return cs.length<2?COMPANIES.filter(x=>x===k||cs.includes(x)):cs;
}
export function showSetup(adjust){
  const rulesBtn='<div class="actions"><button class="btn ghost" data-act="rules">看完整規則</button></div>';
  draft={subs:{...S.subs},seat:'',mode:S.mode,companies:[...S.companies],slots:S.slots,outsource:S.outsource,advanced:S.advanced};
  const draw=()=>{
    mo.innerHTML=`<h2>${adjust?'週一：調整訂閱':'月初：決定這個月怎麼付 token'}</h2>
    ${adjust?`<p class="lead">升級只補剩下週數的差價，降級不退費。</p>${rulesBtn}`:`<p class="lead">你是工程師，負責「${companyName(draft.companies)}」。接下來 20 個工作天，每天都會有新工單進來。你有 ${nt(S.wallet)} 的個人 AI 預算，部門另外有 ${nt(S.corp)} 的公司 API 預算。</p>
    <ul class="rules">
      <li><b>個人訂閱</b>月費固定，有每日與每週額度，越強的模型吃額度越快。額度用完 agent 會停在一半。</li>
      <li><b>個人 API</b> 用多少付多少，沒有上限，錢從你口袋出。</li>
      <li><b>公司 API</b> 不花你的錢，但只能用公司簽約的廠商，單日刷太兇主管會不高興。</li>
      <li>標著「機敏」的工單送進個人帳號，有機率被資安稽核抓到；送到中國雲端機率更高。</li>
      <li><b>自我審核</b>讓 agent 寫完再自己檢查一輪：token 和時間會加成，但改壞時有機會當場修好，不用整單重做。能力越強的模型越會抓錯。</li>
      <li><b>中國模型</b>（DeepSeek、GLM、Kimi）便宜又夠用，但每張工單有案主：金融客戶禁止資料送往中國雲端，政府標案連本地跑的中國開源權重（Qwen）都不能用。</li>
      <li><b>技術線</b>：可以選 1–2 條主技術線，大部分工單平分給它們，也會有前端工單和少量其他技術線的工單。沒選的技術線算不熟，自己手寫要花兩倍時間。</li>
      <li><b>派工方案與工程投資</b>：存三組常用組合，工單卡片上一鍵派工；花工時和公司預算寫 CLAUDE.md、單元測試、CI、hook、資安掃描、上架自動化、監控告警、做 skills、接 MCP 文件、導入 SDD，越早做越划算。</li>
      <li>工單逾期扣 KPI 和信任。月底結算看 KPI、信任，還有你自己花了多少錢。</li>
    </ul>${rulesBtn}
    <div class="sec"><label>工作內容（可選 1–2 項）</label><div class="modes">
      ${COMPANIES.map(k=>{const on=draft.companies.includes(k);return `<button class="sb ${on?'sel':''}" data-company="${k}" ${!on&&draft.companies.length>=2?'disabled':''}><b>${STACKS[k].company}</b><small>難度 ${'★'.repeat(STACKS[k].level)}・${STACKS[k].desc}</small></button>`;}).join('')}
    </div></div>
    <div class="sec"><label>外包（不佔主技術線名額）</label><div class="modes">
      <button class="sb ${draft.outsource?'':'sel'}" data-out="0"><b>不接外包</b><small>專心做公司的工單。</small></button>
      <button class="sb ${draft.outsource?'sel':''}" data-out="1"><b>接外包</b><small>每天多 0–2 張外包單，只能自己付 token；做完拿現金不拿 KPI，逾期賠違約金。</small></button>
    </div></div>
    <div class="sec"><label>進階模式</label><div class="modes">
      <button class="sb ${draft.advanced?'':'sel'}" data-adv="0"><b>一般</b><small>每個模型的能力、token 用量和速度都固定。</small></button>
      <button class="sb ${draft.advanced?'sel':''}" data-adv="1"><b>進階</b><small>派工時多選推理強度：高強度能力 +1，但 token ×1.5、時間 ×1.4；低強度能力 −1，token ×0.7、時間 ×0.8。</small></button>
    </div></div>
    <div class="sec"><label>遊戲模式</label><div class="modes">
      <button class="sb ${draft.mode==='parallel'?'sel':''}" data-mode="parallel"><b>平行模式</b><small>最多 ${draft.slots} 個 agent 在背景同時跑，你的時間花在派工和審 PR。同時跑越多，每次審 PR 越要切換腦袋、花越久，也越容易合併衝突。跑不完的會過夜。</small></button>
      <button class="sb ${draft.mode==='serial'?'sel':''}" data-mode="serial"><b>單線模式</b><small>一次只處理一張，agent 跑多久你就等多久。比較單純，適合先熟悉付費方式的取捨。</small></button>
    </div></div>
    ${draft.mode==='parallel'?`<div class="sec"><label>同時跑幾個 agent</label><div class="seg">${SLOT_CHOICES.map(n=>`<button class="sb ${draft.slots===n?'sel':''}" data-slots="${n}">同時 ${n} 個 agent<small>審 PR 最多 ×${(1+REVIEW_LOAD*(n-1)).toFixed(2)}・衝突最多 ${Math.round(10*(n-1))}%</small></button>`).join('')}</div></div>`:''}`}
    <div class="plans">${planPicker(adjust)}</div>
    <div class="actions"><button class="btn primary" data-act="confirm">${adjust?'確定調整':'開始第 1 天'}</button>${adjust?'<button class="btn ghost" data-act="close">不改了</button>':''}</div>`;
  };
  /* 規則 modal 關閉後重畫開局彈窗、掛回處理器，draft 不重設 */
  const back=()=>{draw();mo.onclick=onClick;};
  const onClick=ev=>{
    const t=ev.target.closest('button'); if(!t) return;
    if(t.dataset.pv){draft.subs[t.dataset.pv]=t.dataset.pp;draw();}
    else if(t.dataset.seat!==undefined){draft.seat=t.dataset.seat;draw();}
    else if(t.dataset.mode){draft.mode=t.dataset.mode;draw();}
    else if(t.dataset.company){draft.companies=toggleCompany(draft.companies,t.dataset.company);draw();}
    else if(t.dataset.slots){draft.slots=+t.dataset.slots;draw();}
    else if(t.dataset.out){draft.outsource=t.dataset.out==='1';draw();}
    else if(t.dataset.adv){draft.advanced=t.dataset.adv==='1';draw();}
    else if(t.dataset.act==='close'){ov.hidden=true;}
    else if(t.dataset.act==='rules'){showRules(back);}
    else if(t.dataset.act==='confirm'){
      const c=planCost(adjust); S.wallet-=c; S.st.subFee+=c;
      if(!adjust){
        const outChanged=draft.outsource!==S.outsource; S.outsource=draft.outsource;
        if(draft.companies.join()!==S.companies.join()){S.companies=draft.companies;firstIssues();}
        else if(outChanged){S.issues=S.issues.filter(i=>!i.out);const g=addGigs();if(g)log('dim',`· 接外包：第 1 天多 ${g} 張外包單`);}
        S.mode=draft.mode; S.slots=draft.slots; S.advanced=draft.advanced; log('dim',`· ${companyName()}・遊戲模式：${PAR()?`平行（同時 ${S.slots} 個 agent）`:'單線'}${S.advanced?'・進階':''}`);
      }
      const changed=SUBV.filter(v=>draft.subs[v]!==S.subs[v]);
      for(const v of changed) S.subs[v]=draft.subs[v];
      /* GA：開局送每家有訂閱的方案（都沒有就送一筆 none），週一只送有改的 */
      if(!adjust){
        track('game_start');
        const on=SUBV.filter(v=>S.subs[v]!=='none');
        if(on.length) on.forEach(v=>track('subscription',{vendor:v,plan:S.subs[v]})); else track('subscription',{vendor:'none',plan:'none'});
        track('day_reached');
      } else changed.forEach(v=>track('subscription',{vendor:v,plan:S.subs[v]}));
      if(draft.seat){S.seatReq={vendor:draft.seat,day:S.day};log('dim',`· 提出 ${VENDORS[draft.seat].name} 團隊席位採購申請`);}
      const names=SUBV.filter(v=>S.subs[v]!=='none').map(v=>`${VENDORS[v].name} ${planOf(v).name}`);
      log('dim',`· 訂閱：${names.join('、')||'無'}${c?`（付 ${nt(c)}）`:''}`);
      if(!adjust) saveGame();
      ov.hidden=true; render();
    }
  };
  draw(); ov.hidden=false; mo.onclick=onClick;
}
export function showDay(rep,ev,monday){
  mo.innerHTML=`<h2>第 ${S.day} 天${monday?'・新的一週':''}</h2>
  ${monday?'<p class="lead">每週額度已重置。今天可以調整訂閱方案。</p>':''}
  ${ev?`<div class="evt"><b>${ev[0]}</b>${ev[1]}</div>`:''}
  ${rep.length?`<ul class="rules">${rep.map(r=>`<li>${r}</li>`).join('')}</ul>`:''}
  <p class="lead">佇列裡有 ${S.issues.length} 張工單，其中 ${S.issues.filter(i=>i.due<=S.day).length} 張今天到期。</p>
  <div class="actions"><button class="btn primary" data-act="close">開工</button>${monday?'<button class="btn ghost" data-act="adj">調整訂閱</button>':''}</div>`;
  ov.hidden=false;
  mo.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.act==='close')ov.hidden=true;if(t.dataset.act==='adj')showSetup(true);};
}
/* 開頁時有存檔：繼續回到當天早上（第 2 天以後再開一次早上報告），或開新局 */
export function showResume(d){
  const s=d.S;
  mo.innerHTML=`<h2>繼續上一局？</h2>
  <p class="lead">第 ${s.day} 天・${companyName(s.companies)}・${s.mode==='parallel'?`平行（同時 ${s.slots} 個 agent）`:'單線'}</p>
  <div class="actions"><button class="btn primary" data-act="resume">繼續</button><button class="btn ghost" data-act="new">開新局</button></div>`;
  ov.hidden=false;
  mo.onclick=e=>{const t=e.target.closest('button');if(!t)return;
    if(t.dataset.act==='resume'){loadGame(d);render();const m=d.morning;if(m)showDay(m.rep,m.ev,m.monday);else ov.hidden=true;}
    if(t.dataset.act==='new')start();};
}
export function showBadSave(){
  mo.innerHTML=`<h2>存檔無法讀取</h2>
  <p class="lead">上一局的存檔來自舊版本或已經損壞，已經清掉了。</p>
  <div class="actions"><button class="btn primary" data-act="new">開新局</button></div>`;
  ov.hidden=false;
  mo.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.act==='new')start();};
}
/* 總分權重與評等門檻（平行模式門檻 ×PAR_GRADE）；個人花費超過 SPEND_FLOOR 就不再多扣 */
export const SCORE={kpi:10,trust:4,spendBase:8000,spendDiv:8,spendFloor:-12000,audit:80}, GRADES=[4600,3800,3000,2200], PAR_GRADE=1.6;
export const SPEND_FLOOR=SCORE.spendBase-SCORE.spendFloor;
/* 月底總分與評等（tools/sim.js 的 SIM_FLOOR 傳別的 floor 重算） */
export function monthScore(floor=SPEND_FLOOR){
  const self=S.st.subFee+S.st.api+S.st.outPenalty-S.st.outIncome;
  const score=Math.round(S.kpi*SCORE.kpi+S.trust*SCORE.trust+Math.max(SCORE.spendBase-floor,SCORE.spendBase-self)/SCORE.spendDiv-S.st.audits*SCORE.audit);
  const gm=PAR()?PAR_GRADE:1; const gi=GRADES.findIndex(t=>score>=t*gm);
  return {self,score,grade:gi<0?'D':'SABC'[gi]};
}
export function showEnd(){
  const {self,score,grade:g}=monthScore();
  const tot=Object.values(S.st.tk).reduce((a,b)=>a+b,0)||1;
  let title,desc;
  if(S.st.audits>=2){title='資安部門的常客';desc='機敏程式碼進了個人帳號太多次。'}
  else if(self>7000){title='自費養 AI 的勇者';desc='公司的 KPI，你的信用卡。'}
  else if(S.st.corp>10500){title='公司帳單上的頭號人物';desc='財務記住你的名字了。'}
  else if(['deepseek','zhipu','moonshot'].reduce((a,v)=>a+S.st.tk[v],0)/tot>.4){title='對岸模型省錢達人';desc='帳單很漂亮，但每張單都要先看案主是誰。'}
  else if(S.st.tk.local/tot>.4){title='地端信仰者';desc='慢一點沒關係，資料不出門。'}
  else if(S.st.manual>12){title='手工藝工程師';desc='Token 省下來了，工時也燒掉了。'}
  else if(g==='S'||g==='A'){title='Token 精算師';desc='每一個 token 都花在刀口上。'}
  else {title='還在摸索的開發者';desc='下個月再調整組合試試。'}
  /* 最高分依模式與公司分開記錄；Laravel 沿用改版前的舊 key */
  let best=0; const bk=bestKey();
  try{best=+localStorage.getItem(bk)||(S.companies.join()==='laravel'?+localStorage.getItem('tokgame-best-'+S.mode)||0:0); if(score>best)localStorage.setItem(bk,score);}catch(e){}
  track('game_end',{score,grade:g}); clearSave();
  const vendorLines=Object.keys(S.st.tk).filter(v=>S.st.tk[v]>0).map(v=>`<div><span>${VENDORS[v].name}</span><span>${kt(S.st.tk[v])} tokens・${Math.round(S.st.tk[v]/tot*100)}%</span></div>`).join('')||'<div><span>沒有用到任何 agent</span><span>—</span></div>';
  mo.innerHTML=`<h2>月底結算・${companyName()}・${PAR()?`平行模式（${S.slots} 個 agent）`:'單線模式'}</h2>
  <div class="grade"><span class="g">${g}</span><div class="gt"><b>${title}</b><span>${desc}</span></div></div>
  <div class="rc">
    <div><span>個人訂閱月費</span><span>${nt(S.st.subFee)}</span></div>
    <div><span>個人 API 帳單</span><span>${nt(S.st.api)}</span></div>
    ${S.outsource?`<div><span>外包收入</span><span>${nt(S.st.outIncome)}</span></div><div><span>外包違約金</span><span>${nt(S.st.outPenalty)}</span></div>`:''}
    <div class="tot"><span>你自己掏的錢</span><span>${nt(self)}</span></div>
    <div><span>公司 API 帳單</span><span>${nt(S.st.corp)}</span></div>
    <hr>${vendorLines}<hr>
    <div><span>完成工單</span><span>${S.st.done} 張</span></div>
    <div><span>逾期工單</span><span>${S.st.late} 張（KPI -${S.st.kpiLost}）</span></div>
    ${S.outsource?`<div><span>外包完成</span><span>${S.st.outDone} 張</span></div><div><span>外包逾期</span><span>${S.st.outLate} 張</span></div>`:''}
    <div><span>自己手寫</span><span>${S.st.manual} 次</span></div>
    <div><span>審核救回</span><span>${S.st.caught} 張</span></div>
    <div><span>踩到陷阱</span><span>${S.st.trapHit} 次</span></div>
    <div><span>事先識破</span><span>${S.st.trapFound} 次</span></div>
    <div><span>工程投資</span><span>${invCount()} 項</span></div>
    ${PAR()?`<div><span>合併衝突</span><span>${S.st.conflicts} 次</span></div>`:''}
    <div><span>資安稽核</span><span>${S.st.audits} 次</span></div>
    <div><span>主管信任</span><span>${Math.round(S.trust)}</span></div>
    <div><span>KPI</span><span>${S.kpi}</span></div>
    <hr><div class="tot"><span>總分</span><span>${score.toLocaleString('en-US')}</span></div>
    ${best?`<div><span>先前最佳</span><span>${best.toLocaleString('en-US')}</span></div>`:''}
  </div>
  <p class="lead">總分 = KPI × ${SCORE.kpi} + 信任 × ${SCORE.trust} + 省下的個人預算 ÷ ${SCORE.spendDiv} − 稽核次數 × ${SCORE.audit}</p>
  <div class="actions"><button class="btn primary" data-act="again">再玩一個月</button><button class="btn ghost" data-act="close">看看紀錄</button></div>`;
  ov.hidden=false;
  mo.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.act==='again')start();if(t.dataset.act==='close'){ov.hidden=true;app.querySelector('[data-act="end"]')?.setAttribute('disabled','');}};
}

