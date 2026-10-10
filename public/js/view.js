import {BILL_LABEL,EFFORT,HW,HW_IDLE,HW_KEYS,HW_REQ_HRS,HW_SETUP_HRS,INVEST,INV_KEYS,PN,SEAT,STACKS,SUBV,VENDORS,cnBlock,companyName,h1,kt,model,nt,planOf,vc} from './data.js';
import {S,sel,unfamiliar} from './state.js';
import {REVIEW,bills,catchRate,costLine,est,hwBlock,localBusy,manualBlocked,manualHrs,presetFor,quotaLeft,stackHint} from './calc.js';
import {INV_STACKS,PAR,auditOdds,auditRisk,canEvaluate,canQuick,clock,evalCost,hwReqBlock,invCount,invHint,investBlock,queueOrder,reviewLoad} from './actions.js';

/* ===== 畫面 ===== */
export const app=document.getElementById('app'), ov=document.getElementById('ov'), mo=document.getElementById('mo');

export function render(){
  const weekOf=d=>Math.ceil(d/5);
  let cal='';
  for(let w=1;w<=4;w++){let c='';for(let d=(w-1)*5+1;d<=w*5;d++)c+=`<span class="d ${d<S.day?'past':d===S.day?'now':''}">${d}</span>`;cal+=`<div class="wk"><b>第 ${w} 週</b><div>${c}</div></div>`;}

  const meters=`
  <div class="meters">
    ${PAR()?`<div class="m"><label>現在時間</label><span class="v">${clock(8-S.hours)}<small style="font-size:13px"> / 17:00</small></span><div class="bar"><i style="width:${S.hours/8*100}%"></i></div><span class="s">背景 agent ${S.jobs.length} / ${S.slots}</span></div>`
    :`<div class="m"><label>今日剩餘工時</label><span class="v">${h1(S.hours)}<small style="font-size:13px"> / 8h</small></span><div class="bar"><i style="width:${S.hours/8*100}%"></i></div></div>`}
    <div class="m"><label>個人錢包</label><span class="v ${S.wallet<0?'neg':''}">${nt(S.wallet)}</span><span class="s">訂閱費 ${nt(S.st.subFee)}・API ${nt(S.st.api)}</span></div>
    <div class="m"><label>公司 API 預算</label><span class="v">${nt(S.corp)}</span><span class="s">今日已刷 ${nt(S.corpDay)}</span></div>
    <div class="m"><label>主管信任</label><span class="v ${S.trust<40?'neg':''}">${Math.round(S.trust)}</span><div class="bar"><i style="width:${S.trust}%;background:${S.trust<40?'var(--bad)':'var(--ok)'}"></i></div></div>
    <div class="m"><label>KPI</label><span class="v">${S.kpi}</span><span class="s">完成 ${S.st.done}・逾期 ${S.st.late}</span></div>
  </div>`;

  let qs='';
  for(const v of SUBV){
    const p=planOf(v);
    if(p.id==='none'){continue;}
    const u=S.used.sub[v], cm=S.capMod[v], dl=Math.max(0,p.day*cm-u.d), wl=Math.max(0,p.week*cm-u.w);
    qs+=qbox(`${VENDORS[v].name} ${p.name}`,S.outage===v?'今日當機':'個人訂閱',dl,p.day*cm,wl,p.week*cm);
  }
  for(const v of S.seats){const u=S.used.seat[v];qs+=qbox(`${VENDORS[v].name} 團隊席位`,'公司付費',Math.max(0,SEAT.day-u.d),SEAT.day,Math.max(0,SEAT.week-u.w),SEAT.week);}
  if(S.seatReq) qs+=`<div class="q none">團隊席位採購審核中，預計第 ${S.seatReq.day+5} 天有結果</div>`;
  if(S.hwReq) qs+=`<div class="q none">採購 ${HW[S.hwReq.k].name} 審核中，預計第 ${S.hwReq.day+HW[S.hwReq.k].days} 天到貨</div>`;
  if(!qs) qs=`<div class="q none">目前沒有任何訂閱。只能用 API、公司預算或本地模型。</div>`;

  const jobsHtml=!PAR()?'':`<div class="ph" style="margin-top:6px"><h2>背景 agent</h2><span>${S.jobs.length} / ${S.slots} 個工作槽</span></div>
    <div class="jobs">${S.jobs.map(j=>{const pr=Math.max(0,1-j.left/j.hrs);const lbl=BILL_LABEL[j.b];
      return `<div class="job" style="--vc:${vc(j.v)}"><div class="jt"><b>${j.issue.title}</b><span class="num">${clock(8-S.hours+j.left)} 完成</span></div>
      <div class="jm">${VENDORS[j.v].agent} / ${j.M.name}・${lbl}${j.issue.due<=S.day?'・<span style="color:var(--bad)">今天到期</span>':''}</div>
      <div class="bar"><i style="width:${pr*100}%;background:var(--vc)"></i></div></div>`;}).join('')
      ||'<div class="empty" style="padding:14px">沒有 agent 在跑。派出去的工作會在這裡同時進行。</div>'}</div>`;
  const list=S.issues.filter(i=>!i.running).sort(queueOrder).map(i=>{
    const left=i.due-S.day;
    return `<div class="issw"><button class="iss ${sel.issue===i.id?'sel':''}" data-iss="${i.id}">
      <span class="t">${i.title}</span><span class="k">${i.out?nt(i.pay):`+${i.kpi}`}</span>
      <span class="meta"><span class="pips" title="複雜度 ${i.cx}">${[1,2,3,4,5].map(n=>`<i class="${n<=i.cx?'on':''}"></i>`).join('')}</span>
      <span class="num">~${kt(i.base)} tokens</span>
      ${i.out?'<span class="chip out">外包</span>':''}<span class="chip stack">${STACKS[i.stack].name}</span>${unfamiliar(i)?'<span class="chip unfam">不熟</span>':''}${i.merge?'<span class="chip trap">合併衝突</span>':''}${i.store?'<span class="chip store">需上架審核</span>':''}${i.revealed?`<span class="chip trap">牽一髮動全身・原估 ${i.shownCx}</span>`:i.evaluated?'<span class="chip">已評估</span>':''}
      ${i.inc?'<span class="chip inc">事故</span>':''}${i.sens?'<span class="chip sens">機敏</span>':''}${i.big?'<span class="chip big">大型 codebase</span>':''}${i.client.ban?`<span class="chip ban">${i.client.name}・${i.client.ban==='all'?'禁中國模型':'禁中國雲端'}</span>`:S.cnBan&&!i.out?'<span class="chip ban">禁中國雲端</span>':`<span class="chip">${i.client.name}</span>`}
      <span class="chip ${left<=0?'due':''}">${left<=0?'今天到期':`剩 ${left} 天`}</span>${i.tries?`<span class="chip">已失敗 ${i.tries} 次</span>`:''}</span>
    </button>${quickBtn(i)}</div>`;}).join('') || `<div class="empty">工單清空了。可以提早下班，把工時留給明天。</div>`;

  app.innerHTML=`
  <header class="top">
    <div class="brand"><h1><span class="tk">Token</span> 撐到月底</h1><p>${companyName()}・工程師・20 個工作天，有限的錢和額度，把工單做完。</p></div>
    <div class="cal">${cal}</div>
    <button class="btn ghost rbtn" data-act="rules">規則</button>
  </header>
  ${meters}
  <div class="quotas">${qs}</div>
  <div class="main">
    <section class="panel"><div class="ph"><h2>工單佇列</h2><span>${S.issues.filter(i=>!i.running).length} 張・依到期排序</span></div>${S.inv.skills?`<button class="btn ghost" data-act="batch" ${canQuick()?'':'disabled'}>批次派工（複雜度 ≤2）</button>`:''}<div class="issues">${list}</div>${jobsHtml}</section>
    <section class="panel">${dispatchPanel()}</section>
  </div>
  ${invPanel()}
  <section class="panel">
    <div class="foot"><div class="ph"><h2>執行紀錄</h2></div>
      <div class="actions">${PAR()?`<button class="btn ghost" data-act="wait1" ${S.hours<=0?'disabled':''}>等 1 小時</button><button class="btn ghost" data-act="waitn" ${!S.jobs.length||S.hours<=0?'disabled':''}>等到下一個 agent 完成</button>`:''}${((S.day-1)%5===0)?'<button class="btn ghost" data-act="adjust">調整訂閱</button>':''}<button class="btn" data-act="end">下班，結束第 ${S.day} 天</button></div></div>
    <div class="log">${S.log.map(l=>`<p class="${l.cls}">${l.msg}</p>`).join('')||'<p class="dim">還沒有紀錄。點左邊一張工單開始派工。</p>'}</div>
    <small style="color:var(--muted);font-size:12px">價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。</small>
  </section>`;
}
/* 工單卡片上的一鍵派工按鈕：顯示會用哪個方案、前面的方案為什麼不能用 */
export function quickBtn(is){
  const {i,skip}=presetFor(is);
  if(i<0) return `<button class="qk" disabled><b>沒有可用方案</b>${skip.length?`<span class="why">${PN[skip[0].i]} 不能用：${skip[0].r}</span>`:''}</button>`;
  const p=S.presets[i], risk=auditRisk(is,p.b);
  return `<button class="qk" data-quick="${is.id}" ${canQuick()?'':'disabled'}><b>一鍵派工：方案 ${PN[i]}</b><span>${VENDORS[p.v].agent} / ${model(p.v,p.m).name}・${BILL_LABEL[p.b]}</span>${skip.length?`<span class="why">${PN[skip[0].i]} 不能用：${skip[0].r}</span>`:''}${risk?`<span class="why">機敏工單用個人帳號：${Math.round(auditOdds(p.v)*100)}% 機率被資安稽核</span>`:''}</button>`;
}
export function invPanel(){
  const btn=(k,st)=>{const I=INVEST[k], why=investBlock(k,st);
    return `<button class="sb" data-inv="${k}" ${st?`data-st="${st}"`:''} ${why?'disabled':''}><b>${k==='md'?STACKS[st].name:I.name}</b><small>${why||`${I.hrs}h・公司 ${nt(I.cost)}`}</small></button>`;};
  const row=(k,body)=>`<div class="inv"><div><b>${INVEST[k].name}</b><span>${INVEST[k].desc}${k==='md'?`・每條技術線 ${INVEST.md.hrs}h、公司 ${nt(INVEST.md.cost)}`:''}</span></div><div class="seg">${body}</div></div>`;
  const f=invFolded();
  return `<section class="panel"><div class="ph"><h2><button class="fold" data-act="invfold" aria-expanded="${!f}">${f?'▸':'▾'} 工程投資</button></h2><span>${f?'':'效果維持到月底・'}已做 ${invCount()} 項</span></div>
    ${f?'':`<div class="invs">${row('md',INV_STACKS().map(st=>btn('md',st)).join(''))}${INV_KEYS.map(k=>row(k,btn(k))).join('')}${hwRow()}</div>`}</section>`;
}
/* 工程投資面板收合：瀏覽器偏好，存 localStorage，不進存檔；讀寫失敗就只記在這一頁 */
export const INV_FOLD_KEY='tokgame-invfold';
export let invFold=null;
export function invFolded(){
  if(invFold===null){try{invFold=localStorage.getItem(INV_FOLD_KEY)==='1';}catch(e){invFold=false;}}
  return invFold;
}
export function toggleInvFold(){
  invFold=!invFolded();
  try{localStorage.setItem(INV_FOLD_KEY,invFold?'1':'0');}catch(e){}
}
/* 下次 render 重新讀 localStorage（check.js 用） */
export function resetInvFold(){invFold=null;}
/* 採購電腦：公司採購申請，不扣 API 預算，到貨當天看信任 */
export function hwRow(){
  const b=k=>{const H=HW[k], why=hwReqBlock(k);
    return `<button class="sb" data-hw="${k}" ${why?'disabled':''}><b>${H.name}</b><small>${why||`${H.price}・信任 ${H.trust}・${H.days} 天到貨`}</small><small>${H.desc}</small></button>`;};
  return `<div class="inv"><div><b>採購電腦</b><span>走公司採購，不扣 API 預算：申請花 ${HW_REQ_HRS}h，到貨當天信任夠才核准、架設 ${HW_SETUP_HRS}h；同時只能一張申請。買了以後本地跑 agent 時還能手寫，但每台當天沒用到信任 -${HW_IDLE}</span></div><div class="seg">${HW_KEYS.map(b).join('')}</div></div>`;
}
export function qbox(name,sub,dl,dc,wl,wc){
  const dp=dc?dl/dc*100:0, wp=wc?wl/wc*100:0;
  return `<div class="q"><div class="nm">${name}<span>${sub}</span></div>
    <label>今日</label><div><div class="bar"><i class="${dp<20?'lo':''}" style="width:${dp}%"></i></div><span class="num" style="font-size:11px;color:var(--muted)">${kt(dl)} / ${kt(dc)}</span></div>
    <label>本週</label><div><div class="bar"><i class="${wp<20?'lo':''}" style="width:${wp}%"></i></div><span class="num" style="font-size:11px;color:var(--muted)">${kt(wl)} / ${kt(wc)}</span></div></div>`;
}

export function dispatchPanel(){
  const is=S.issues.find(i=>i.id===sel.issue);
  if(!is) return `<div class="ph"><h2>派工台</h2></div><div class="empty">先從工單佇列選一張。<br>每張單可以挑一家 agent、一個模型，再決定這筆 token 誰來付。</div>`;
  // ensure billing valid
  const avail=(v,M)=>S.outage!==v&&!cnBlock(is,v,M)&&!hwBlock(M);
  if(!avail(sel.v,model(sel.v,sel.m))){for(const v in VENDORS){const M=VENDORS[v].models.find(M=>avail(v,M));if(M){sel.v=v;sel.m=M.id;break;}}if(sel.v==='local')sel.b='local';else if(sel.b==='local')sel.b='api';}
  let bl=bills(sel.v,is); if(!bl.find(b=>b.id===sel.b&&b.ok)){const f=bl.find(b=>b.ok);sel.b=f?f.id:bl[0].id;}
  const rows=Object.keys(VENDORS).map(v=>{
    const V=VENDORS[v], down=S.outage===v;
    return `<div class="vrow" style="--vc:${vc(v)}"><div class="vn"><b>${V.name}</b><span>${down?'今日當機':V.agent}</span>${V.cn?'<span class="cn">中國廠商</span>':''}</div>
      <div class="mods">${V.models.map(M=>{const why=cnBlock(is,v,M)||hwBlock(M);return `<button class="mb ${sel.v===v&&sel.m===M.id?'sel':''}" data-v="${v}" data-m="${M.id}" ${down||why?'disabled':''}><b>${M.name}</b><span>能力 ${'●'.repeat(M.cap)}${'○'.repeat(Math.max(0,5-M.cap))}</span><span class="${why?'why':''}">${why||(M.price?`$${M.price}/k`:'免費')}${!why&&M.cn?'・中國權重':''}</span></button>`;}).join('')}</div></div>`;
  }).join('');
  const e=est(is,sel.v,sel.m), M=e.M, cl=costLine(sel.b,M,sel.v,e);
  const segs=bl.map(b=>`<button class="sb ${sel.b===b.id?'sel':''}" data-b="${b.id}" ${b.ok?'':'disabled'}>${b.label}<small>${b.note}</small></button>`).join('');
  const pc=e.pe>=.8?'good':e.pe>=.5?'meh':'bad';
  let warn='';
  if(S.outage===sel.v) warn='這家今天當機，換一家吧。';
  else if(sel.b==='local'&&localBusy()) warn='本地 GPU 已經有一個 agent 在跑，等它跑完才能再派。';
  else if(is.sens&&VENDORS[sel.v].cn) warn=`機敏工單送到中國雲端：有 ${Math.round(auditOdds(sel.v)*100)}% 機率被資安稽核抓到。`;
  else if(is.sens&&(sel.b==='sub'||sel.b==='api')) warn=`機敏工單用個人帳號：有 ${Math.round(auditOdds(sel.v)*100)}% 機率被資安稽核抓到。`;
  else if((sel.b==='sub'||sel.b==='seat')&&cl.hi>quotaLeft(sel.b,sel.v)) warn='剩餘額度可能不夠，跑到一半會被限流。';
  else if(PAR()&&S.jobs.length>=S.slots) warn='工作槽都滿了，先等一個 agent 跑完。';
  else if(PAR()&&is.due<=S.day&&e.hrs+.2>S.hours) warn='這張今天到期，但下班前跑不完，會逾期。';
  else if(PAR()&&e.hrs+.2>S.hours) warn='今天跑不完，agent 會跑過夜，明早才有結果。';
  else if(!PAR()&&e.hrs*1.2>S.hours) warn='今天剩的工時可能不夠跑完。';
  else if(sel.b==='api'&&cl.hi>S.wallet) warn='錢包可能不夠付這一筆。';
  const mh=manualHrs(is), ec=evalCost(model(sel.v,sel.m),sel.v);
  const blocked=S.outage===sel.v||!!cnBlock(is,sel.v,model(sel.v,sel.m))||!!hwBlock(model(sel.v,sel.m))||(sel.b==='local'&&localBusy());
  return `<div class="ph"><h2>派工台</h2><span>${is.title}</span></div>
  <div class="sec"><label>選 AGENT 與模型</label>${rows}</div>
  <div class="sec"><label>誰付這筆 TOKEN</label><div class="seg">${segs}</div>${S.seats.length&&!S.seats.includes(sel.v)?`<p class="hint">你有 ${S.seats.map(v=>VENDORS[v].name).join('、')} 團隊席位，選 ${S.seats.map(v=>VENDORS[v].agent).join('、')} 的模型才能用公司席位付款。</p>`:''}</div>
  <div class="sec"><label>自我審核</label><div class="seg">${REVIEW.map((r,i)=>`<button class="sb ${sel.rv===i?'sel':''}" data-rv="${i}">${r.name}<small>${i?`token ×${r.tk}・抓錯 ${Math.round(catchRate(i,M)*100)}%`:'改壞就整單重做'}</small></button>`).join('')}</div></div>
  ${S.advanced?`<div class="sec"><label>推理強度</label><div class="seg">${EFFORT.map((f,i)=>`<button class="sb ${sel.ef===i?'sel':''}" data-ef="${i}">${f.name}<small>${f.cap?`能力 ${f.cap>0?'+':'−'}${Math.abs(f.cap)}・token ×${f.tk}・時間 ×${f.hrs}`:'原本的模型'}</small></button>`).join('')}</div></div>`:''}
  <div class="sec"><label>派工方案</label><div class="seg">${S.presets.map((p,i)=>`<button class="sb" data-load="${i}">載入方案 ${PN[i]}<small>${model(p.v,p.m).name}${S.advanced&&p.ef!==1?`・${EFFORT[p.ef].name}強度`:''}・${BILL_LABEL[p.b]}・${REVIEW[p.rv].name}</small></button>`).join('')}</div>
    <div class="seg">${PN.map((n,i)=>`<button class="sb" data-save="${i}">存成方案 ${n}<small>用上面的選擇</small></button>`).join('')}</div></div>
  <div class="est">
    <div><label>預估 tokens</label><b>${kt(e.lo)}–${kt(e.hi)}</b></div>
    <div><label>${cl.t}</label><b>${cl.unit==='q'?`${kt(cl.lo)}–${kt(cl.hi)}`:cl.hi?`${nt(cl.lo)}–${nt(cl.hi)}`:'NT$0'}</b></div>
    <div><label>成功率${sel.rv||is.store?`（原 ${Math.round(e.p*100)}%）`:''}</label><b class="${pc}">${Math.round(e.pe*100)}%</b></div>
    <div><label>${PAR()?'執行時間':'工時'}</label><b>${h1(e.hrs)}h</b></div>
  </div>
  ${stackHint(is)?`<p class="hint">${stackHint(is)}</p>`:''}
  ${invHint(is)?`<p class="hint">${invHint(is)}</p>`:''}
  ${PAR()&&S.jobs.length?`<p class="hint">平行切換成本：已有 ${S.jobs.length} 個 agent 在跑，每個 agent 做完時，其他還在跑的越多，審 PR 越久（照現在是 ×${reviewLoad().toFixed(2)}），合併衝突機率也每個 +10%；衝突時會留下一張「解決衝突」工單，KPI 等它完成才拿。</p>`:''}
  <div class="warnline">${warn}</div>
  <div class="actions">
    <button class="btn primary" data-act="go" ${blocked||S.hours<.2||(PAR()&&S.jobs.length>=S.slots)?'disabled':''}>${PAR()?'派到背景':'派給'} ${VENDORS[sel.v].agent}</button>
    <button class="btn ghost" data-act="manual" ${mh>S.hours||manualBlocked()?'disabled':''}>${manualBlocked()?'本地 GPU 跑 agent 中，電腦卡到沒辦法手寫':`自己手寫（${h1(mh)}h，0 token）`}</button>
    ${canEvaluate(is)?`<button class="btn ghost" data-act="eval" ${blocked||ec.hrs>S.hours?'disabled':''}>先讓 agent 評估架構（${kt(ec.tk)} tokens，${h1(ec.hrs)}h）</button>`:''}
    ${is.revealed&&!is.rescoped&&!is.out?`<button class="btn ghost" data-act="rescope">找主管重新評估</button>`:''}
  </div>`;
}

