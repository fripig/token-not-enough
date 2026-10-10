import {COMPANIES,SEAT,STACKS,SUBV,VENDORS,bestKey,companyName,kt,nt,planOf,vc} from './data.js';
import {S,addGigs,clearSave,daySnap,loadGame,saveGame,track} from './state.js';
import {log} from './calc.js';
import {PAR,REVIEW_LOAD,SLOT_CHOICES,invCount} from './actions.js';
import {app,langSwitch,mo,ov,render} from './view.js';
import {firstIssues,start} from './main.js';
import {showRules} from './rules.js';
import {setLang,t} from './i18n.js';

/* ===== 彈窗 ===== */
/* 開局說明的條列，內容在字典 */
export const SETUP_RULES=['ui.setup.r.sub','ui.setup.r.api','ui.setup.r.corp','ui.setup.r.sens','ui.setup.r.review','ui.setup.r.cn','ui.setup.r.stack','ui.setup.r.invest','ui.setup.r.late'];
export let draft=null;
export function planPicker(adjust){
  const rows=SUBV.map(v=>{
    const V=VENDORS[v];
    return `<div class="pv" style="--vc:${vc(v)}"><b>${V.name}${t('sep')}${V.agent}</b><div class="seg">${V.plans.map(p=>`<button class="sb ${draft.subs[v]===p.id?'sel':''}" data-pv="${v}" data-pp="${p.id}">${p.name}<small>${p.price?t('ui.plan.price',{price:nt(p.price),day:kt(p.day)}):t('ui.plan.apiOnly')}</small></button>`).join('')}</div></div>`;
  }).join('');
  const canSeat=!S.seatReq&&S.seats.length<SEAT.vendors.length;
  const seat=canSeat?`<div class="pv" style="--vc:var(--accent)"><b>${t('ui.seat.ask',{n:S.seats.length+1,days:SEAT.review,trust:SEAT.trust[S.seats.length]})}</b><div class="seg">
    ${[['',t('ui.seat.none')],...SEAT.vendors.filter(v=>!S.seats.includes(v)).map(v=>[v,VENDORS[v].name])].map(([v,n])=>`<button class="sb ${draft.seat===v?'sel':''}" data-seat="${v}">${n}<small>${v?t('ui.seat.paid'):t('ui.seat.self')}</small></button>`).join('')}</div></div>`:'';
  const cost=planCost(adjust);
  return `${rows}${seat}<div class="sum"><span>${t('ui.sum.pay')}</span><b class="num">${nt(cost)}</b><span>${t('ui.sum.left')} <b class="num">${nt(S.wallet-cost)}</b></span>${planShort(adjust)?`<span class="short">${t('ui.sum.short')}</span>`:''}</div>`;
}
/* 這次要付錢而且錢包不夠才擋；沒改、降級（付 NT$0）不受錢包影響 */
export const planShort=adjust=>{const c=planCost(adjust);return c>0&&c>S.wallet;};
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
  const rulesBtn=`<div class="actions"><button class="btn ghost" data-act="rules">${t('ui.setup.rules')}</button></div>`;
  draft={subs:{...S.subs},seat:'',mode:S.mode,companies:[...S.companies],slots:S.slots,outsource:S.outsource,advanced:S.advanced};
  const draw=()=>{
    mo.innerHTML=`<h2>${adjust?t('ui.setup.titleAdj'):t('ui.setup.title')}</h2>
    <div class="mlang">${langSwitch()}</div>
    ${adjust?`<p class="lead">${t('ui.setup.leadAdj')}</p>${rulesBtn}`:`<p class="lead">${t('ui.setup.lead',{company:companyName(draft.companies),wallet:nt(S.wallet),corp:nt(S.corp)})}</p>
    <ul class="rules">
      ${SETUP_RULES.map(k=>`<li>${t(k)}</li>`).join('')}
    </ul>${rulesBtn}
    <div class="sec"><label>${t('ui.setup.work')}</label><div class="modes">
      ${COMPANIES.map(k=>{const on=draft.companies.includes(k);return `<button class="sb ${on?'sel':''}" data-company="${k}" ${!on&&draft.companies.length>=2?'disabled':''}><b>${STACKS[k].company}</b><small>${t('ui.setup.level')} ${'★'.repeat(STACKS[k].level)}${t('sep')}${STACKS[k].desc}</small></button>`;}).join('')}
    </div></div>
    <div class="sec"><label>${t('ui.setup.gig')}</label><div class="modes">
      <button class="sb ${draft.outsource?'':'sel'}" data-out="0"><b>${t('ui.setup.gigOff')}</b><small>${t('ui.setup.gigOffSub')}</small></button>
      <button class="sb ${draft.outsource?'sel':''}" data-out="1"><b>${t('ui.setup.gigOn')}</b><small>${t('ui.setup.gigOnSub')}</small></button>
    </div></div>
    <div class="sec"><label>${t('ui.setup.adv')}</label><div class="modes">
      <button class="sb ${draft.advanced?'':'sel'}" data-adv="0"><b>${t('ui.setup.advOff')}</b><small>${t('ui.setup.advOffSub')}</small></button>
      <button class="sb ${draft.advanced?'sel':''}" data-adv="1"><b>${t('ui.setup.advOn')}</b><small>${t('ui.setup.advOnSub')}</small></button>
    </div></div>
    <div class="sec"><label>${t('ui.setup.mode')}</label><div class="modes">
      <button class="sb ${draft.mode==='parallel'?'sel':''}" data-mode="parallel"><b>${t('ui.setup.par')}</b><small>${t('ui.setup.parSub',{n:draft.slots})}</small></button>
      <button class="sb ${draft.mode==='serial'?'sel':''}" data-mode="serial"><b>${t('ui.setup.serial')}</b><small>${t('ui.setup.serialSub')}</small></button>
    </div></div>
    ${draft.mode==='parallel'?`<div class="sec"><label>${t('ui.setup.slots')}</label><div class="seg">${SLOT_CHOICES.map(n=>`<button class="sb ${draft.slots===n?'sel':''}" data-slots="${n}">${t('ui.setup.slotN',{n})}<small>${t('ui.setup.slotSub',{x:(1+REVIEW_LOAD*(n-1)).toFixed(2),c:Math.round(10*(n-1))})}</small></button>`).join('')}</div></div>`:''}`}
    <div class="plans">${planPicker(adjust)}</div>
    <div class="actions"><button class="btn primary" data-act="confirm" ${planShort(adjust)?'disabled':''}>${adjust?t('ui.setup.confirmAdj'):t('ui.setup.confirm')}</button>${adjust?`<button class="btn ghost" data-act="close">${t('ui.setup.cancel')}</button>`:''}</div>`;
  };
  /* 規則 modal 關閉後重畫開局彈窗、掛回處理器，draft 不重設 */
  const back=()=>{draw();mo.onclick=onClick;};
  const onClick=ev=>{
    const bt=ev.target.closest('button'); if(!bt) return;
    if(bt.dataset.pv){draft.subs[bt.dataset.pv]=bt.dataset.pp;draw();}
    else if(bt.dataset.seat!==undefined){draft.seat=bt.dataset.seat;draw();}
    else if(bt.dataset.mode){draft.mode=bt.dataset.mode;draw();}
    else if(bt.dataset.company){draft.companies=toggleCompany(draft.companies,bt.dataset.company);draw();}
    else if(bt.dataset.slots){draft.slots=+bt.dataset.slots;draw();}
    else if(bt.dataset.out){draft.outsource=bt.dataset.out==='1';draw();}
    else if(bt.dataset.adv){draft.advanced=bt.dataset.adv==='1';draw();}
    else if(bt.dataset.act==='close'){ov.hidden=true;}
    else if(bt.dataset.act==='rules'){showRules(back);}
    /* 開局視窗蓋住標頭，所以這裡也能換語言；草稿不重設 */
    else if(bt.dataset.lang){setLang(bt.dataset.lang);render();draw();}
    else if(bt.dataset.act==='confirm'){
      if(planShort(adjust)) return; const c=planCost(adjust); S.wallet-=c; S.st.subFee+=c;
      if(!adjust){
        const outChanged=draft.outsource!==S.outsource; S.outsource=draft.outsource;
        if(draft.companies.join()!==S.companies.join()){S.companies=draft.companies;firstIssues();}
        else if(outChanged){S.issues=S.issues.filter(i=>!i.out);const g=addGigs();if(g)log('dim',t('log.setup.gigs',{n:g}));}
        S.mode=draft.mode; S.slots=draft.slots; S.advanced=draft.advanced; log('dim',t('log.setup.mode',{company:companyName(),mode:PAR()?t('ui.modePar',{n:S.slots}):t('ui.modeSerial'),adv:S.advanced?t('sep')+t('ui.setup.advOn'):''}));
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
      if(draft.seat){S.seatReq={vendor:draft.seat,day:S.day};log('dim',t('log.setup.seat',{v:VENDORS[draft.seat].name}));}
      const names=SUBV.filter(v=>S.subs[v]!=='none').map(v=>`${VENDORS[v].name} ${planOf(v).name}`);
      log('dim',t('log.setup.subs',{names:names.join(t('sep.list'))||t('log.setup.subsNone'),paid:c?t('log.setup.paid',{c:nt(c)}):''}));
      if(!adjust){ S.dayStart=daySnap(); saveGame(); }
      ov.hidden=true; render();
    }
  };
  draw(); ov.hidden=false; mo.onclick=onClick;
}
export function showDay(rep,ev,monday){
  mo.innerHTML=`<h2>${t('ui.day.title',{d:S.day})}${monday?t('sep')+t('ui.day.newWeek'):''}</h2>
  ${monday?`<p class="lead">${t('ui.day.monday')}</p>`:''}
  ${ev?`<div class="evt"><b>${ev[0]}</b>${ev[1]}</div>`:''}
  ${rep.length?`<ul class="rules">${rep.map(r=>`<li>${r}</li>`).join('')}</ul>`:''}
  <p class="lead">${t('ui.day.queue',{n:S.issues.length,due:S.issues.filter(i=>i.due<=S.day).length})}</p>
  <div class="actions"><button class="btn primary" data-act="close">${t('ui.day.start')}</button>${monday?`<button class="btn ghost" data-act="adj">${t('ui.adjust')}</button>`:''}</div>`;
  ov.hidden=false;
  mo.onclick=e=>{const bt=e.target.closest('button');if(!bt)return;if(bt.dataset.act==='close')ov.hidden=true;if(bt.dataset.act==='adj')showSetup(true);};
}
/* 開頁時有存檔：繼續回到當天早上（第 2 天以後再開一次早上報告），或開新局 */
export function showResume(d){
  const s=d.S;
  const sp=t('sep');
  mo.innerHTML=`<h2>${t('ui.resume.title')}</h2>
  <p class="lead">${t('ui.day.title',{d:s.day})}${sp}${companyName(s.companies)}${sp}${s.mode==='parallel'?t('ui.modePar',{n:s.slots}):t('ui.modeSerial')}</p>
  <div class="actions"><button class="btn primary" data-act="resume">${t('ui.resume.go')}</button><button class="btn ghost" data-act="new">${t('ui.resume.new')}</button></div>`;
  ov.hidden=false;
  mo.onclick=e=>{const bt=e.target.closest('button');if(!bt)return;
    if(bt.dataset.act==='resume'){loadGame(d);render();const m=d.morning;if(m)showDay(m.rep,m.ev,m.monday);else ov.hidden=true;}
    if(bt.dataset.act==='new')start();};
}
export function showBadSave(){
  mo.innerHTML=`<h2>${t('ui.bad.title')}</h2>
  <p class="lead">${t('ui.bad.lead')}</p>
  <div class="actions"><button class="btn primary" data-act="new">${t('ui.resume.new')}</button></div>`;
  ov.hidden=false;
  mo.onclick=e=>{const bt=e.target.closest('button');if(!bt)return;if(bt.dataset.act==='new')start();};
}
/* 總分權重與評等門檻（平行模式門檻 ×PAR_GRADE）；錢不算分，個人花費只顯示與判定稱號 */
export const SCORE={kpi:10,trust:4,audit:80}, GRADES=[4300,3300,2500,1700], PAR_GRADE=1.6;
/* 月底總分與評等；self 是你自己掏的錢 */
export function monthScore(){
  const self=S.st.subFee+S.st.api+S.st.outPenalty+S.st.confFee-S.st.outIncome;
  const score=Math.round(S.kpi*SCORE.kpi+S.trust*SCORE.trust-S.st.audits*SCORE.audit);
  const gm=PAR()?PAR_GRADE:1; const gi=GRADES.findIndex(x=>score>=x*gm);
  return {self,score,grade:gi<0?'D':'SABC'[gi]};
}
export function showEnd(){
  const {self,score,grade:g}=monthScore();
  const tot=Object.values(S.st.tk).reduce((a,b)=>a+b,0)||1;
  let title,desc;
  if(S.st.audits>=2){title=t('end.title.audits');desc=t('end.desc.audits')}
  else if(self>7000){title=t('end.title.selfPay');desc=t('end.desc.selfPay')}
  else if(S.st.corp>10500){title=t('end.title.corp');desc=t('end.desc.corp')}
  else if(['deepseek','zhipu','moonshot'].reduce((a,v)=>a+S.st.tk[v],0)/tot>.4){title=t('end.title.cn');desc=t('end.desc.cn')}
  else if(S.st.tk.local/tot>.4){title=t('end.title.local');desc=t('end.desc.local')}
  else if(S.st.manual>12){title=t('end.title.manual');desc=t('end.desc.manual')}
  else if(g==='S'||g==='A'){title=t('end.title.saver');desc=t('end.desc.saver')}
  else {title=t('end.title.newbie');desc=t('end.desc.newbie')}
  /* 最高分依模式與公司分開記錄；Laravel 沿用改版前的舊 key */
  let best=0; const bk=bestKey();
  try{best=+localStorage.getItem(bk)||(S.companies.join()==='laravel'?+localStorage.getItem('tokgame-best-'+S.mode)||0:0); if(score>best)localStorage.setItem(bk,score);}catch(e){}
  track('game_end',{score,grade:g}); clearSave();
  const vendorLines=Object.keys(S.st.tk).filter(v=>S.st.tk[v]>0).map(v=>`<div><span>${VENDORS[v].name}</span><span>${kt(S.st.tk[v])} tokens${t('sep')}${Math.round(S.st.tk[v]/tot*100)}%</span></div>`).join('')||`<div><span>${t('end.noAgent')}</span><span>—</span></div>`;
  const conf=S.conf.went.length||S.conf.req;
  const sp=t('sep'), row=(k,v)=>`<div><span>${t(k)}</span><span>${v}</span></div>`;
  mo.innerHTML=`<h2>${t('end.title')}${sp}${companyName()}${sp}${PAR()?t('end.modePar',{n:S.slots}):t('end.modeSerial')}</h2>
  <div class="grade"><span class="g">${g}</span><div class="gt"><b>${title}</b><span>${desc}</span></div></div>
  <div class="rc">
    ${row('end.subFee',nt(S.st.subFee))}
    ${row('end.api',nt(S.st.api))}
    ${conf?row('end.confFee',nt(S.st.confFee)):''}
    ${S.outsource?row('end.outIncome',nt(S.st.outIncome))+row('end.outPenalty',nt(S.st.outPenalty)):''}
    <div class="tot"><span>${t('end.self')}</span><span>${nt(self)}</span></div>
    ${row('end.wallet',nt(S.wallet))}
    ${row('end.corp',nt(S.st.corp))}
    <hr>${vendorLines}<hr>
    ${row('end.done',t('end.nTickets',{n:S.st.done}))}
    ${row('end.late',t('end.lateVal',{n:S.st.late,kpi:S.st.kpiLost}))}
    ${S.outsource?row('end.outDone',t('end.nTickets',{n:S.st.outDone}))+row('end.outLate',t('end.nTickets',{n:S.st.outLate})):''}
    ${row('end.manual',t('end.nTimes',{n:S.st.manual}))}
    ${row('end.caught',t('end.nTickets',{n:S.st.caught}))}
    ${row('end.trapHit',t('end.nTimes',{n:S.st.trapHit}))}
    ${row('end.trapFound',t('end.nTimes',{n:S.st.trapFound}))}
    ${row('end.invest',t('end.nItems',{n:invCount()}))}
    ${conf?row('end.conf',t('end.nConfs',{n:S.conf.went.length})):''}
    ${PAR()?row('end.conflicts',t('end.nTimes',{n:S.st.conflicts})):''}
    ${row('end.audits',t('end.nTimes',{n:S.st.audits}))}
    ${row('ui.meter.trust',Math.round(S.trust))}
    <div><span>KPI</span><span>${S.kpi}</span></div>
    <hr><div class="tot"><span>${t('end.score')}</span><span>${score.toLocaleString('en-US')}</span></div>
    ${best?row('end.best',best.toLocaleString('en-US')):''}
  </div>
  <p class="lead">${t('end.formula',{kpi:SCORE.kpi,trust:SCORE.trust,audit:SCORE.audit})}</p>
  <div class="actions"><button class="btn primary" data-act="again">${t('end.again')}</button><button class="btn ghost" data-act="close">${t('end.log')}</button></div>`;
  ov.hidden=false;
  mo.onclick=e=>{const bt=e.target.closest('button');if(!bt)return;if(bt.dataset.act==='again')start();if(bt.dataset.act==='close'){ov.hidden=true;app.querySelector('[data-act="end"]')?.setAttribute('disabled','');}};
}

