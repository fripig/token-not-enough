import {RESEARCH_DIRECT_TK,SKILLS_CX,SDD_EG,SDD_NAME,SDD_P,SDD_TK,SDD_TRAP_STOP,lv,BILL_LABEL,EFFORT,HW,HW_IDLE,HW_KEYS,HW_REQ_HRS,HW_SETUP_HRS,INVEST,INV_KEYS,PN,SEAT,STACKS,SUBV,VENDORS,cnBlock,companyName,h1,kt,model,nt,planOf,vc,CONF,CONF_CATS,CONF_KEYS,CONF_LAST_DAY,CONF_MANUAL} from './data.js';
import {S,sel,unfamiliar} from './state.js';
import {REVIEW,sddLevel,bills,catchRate,costLine,est,hwBlock,localBusy,manualBlocked,manualHrs,presetFor,quotaLeft,stackHint} from './calc.js';
import {INV_STACKS,PAR,TRAP_STOP,researchBlock,researchCost,selfResearchHrs,auditOdds,auditRisk,canEvaluate,canQuick,clock,evalCost,hwReqBlock,invCount,invHint,investBlock,queueOrder,reviewLoad,confBlock,invCost,invLevel,invMax} from './actions.js';
import {LANGS,LANG_SWITCH,lang,t} from './i18n.js';

/* ===== 畫面 ===== */
/* 背景 agent 的兩段式中止：第一次點只是待確認，記住是哪張單（不進存檔） */
export let cancelArm=null;
export const armCancel=id=>{cancelArm=id;};
export const cancelBtn=id=>cancelArm===id?`<button class="btn ghost jx armed" data-cancel="${id}">${t('ui.cancelConfirm')}</button>`:`<button class="btn ghost jx" data-cancel="${id}">${t('ui.cancel')}</button>`;
export const app=document.getElementById('app'), ov=document.getElementById('ov'), mo=document.getElementById('mo');

export function render(){
  const weekOf=d=>Math.ceil(d/5), sp=t('sep');
  let cal='';
  for(let w=1;w<=4;w++){let c='';for(let d=(w-1)*5+1;d<=w*5;d++)c+=`<span class="d ${d<S.day?'past':d===S.day?'now':''}">${d}</span>`;cal+=`<div class="wk"><b>${t('ui.week',{w})}</b><div>${c}</div></div>`;}

  const meters=`
  <div class="meters">
    ${PAR()?`<div class="m"><label>${t('ui.meter.now')}</label><span class="v">${clock(8-S.hours)}<small style="font-size:13px"> / 17:00</small></span><div class="bar"><i style="width:${S.hours/8*100}%"></i></div><span class="s">${t('ui.meter.agents',{n:S.jobs.length,slots:S.slots})}</span></div>`
    :`<div class="m"><label>${t('ui.meter.hoursLeft')}</label><span class="v">${h1(S.hours)}<small style="font-size:13px"> / 8h</small></span><div class="bar"><i style="width:${S.hours/8*100}%"></i></div></div>`}
    <div class="m"><label>${t('ui.meter.wallet')}</label><span class="v ${S.wallet<0?'neg':''}">${nt(S.wallet)}</span><span class="s">${t('ui.meter.walletSub',{sub:nt(S.st.subFee),api:nt(S.st.api)})}</span></div>
    <div class="m"><label>${t('ui.meter.corp')}</label><span class="v">${nt(S.corp)}</span><span class="s">${t('ui.meter.corpDay',{n:nt(S.corpDay)})}</span></div>
    <div class="m"><label>${t('ui.meter.trust')}</label><span class="v ${S.trust<40?'neg':''}">${Math.round(S.trust)}</span><div class="bar"><i style="width:${S.trust}%;background:${S.trust<40?'var(--bad)':'var(--ok)'}"></i></div></div>
    <div class="m"><label>KPI</label><span class="v">${S.kpi}</span><span class="s">${t('ui.meter.kpiSub',{done:S.st.done,late:S.st.late})}</span></div>
  </div>`;

  let qs='';
  for(const v of SUBV){
    const p=planOf(v);
    if(p.id==='none'){continue;}
    const u=S.used.sub[v], cm=S.capMod[v], dl=Math.max(0,p.day*cm-u.d), wl=Math.max(0,p.week*cm-u.w);
    qs+=qbox(`${VENDORS[v].name} ${p.name}`,S.outage===v?t('ui.q.down'):t('ui.q.personal'),dl,p.day*cm,wl,p.week*cm);
  }
  for(const v of S.seats){const u=S.used.seat[v];qs+=qbox(t('ui.q.seat',{v:VENDORS[v].name}),t('ui.q.corpPaid'),Math.max(0,SEAT.day-u.d),SEAT.day,Math.max(0,SEAT.week-u.w),SEAT.week);}
  if(S.seatReq) qs+=`<div class="q none">${t('ui.q.seatReq',{d:S.seatReq.day+5})}</div>`;
  if(S.hwReq) qs+=`<div class="q none">${t('ui.q.hwReq',{name:HW[S.hwReq.k].name,d:S.hwReq.day+HW[S.hwReq.k].days})}</div>`;
  if(!qs) qs=`<div class="q none">${t('ui.q.none')}</div>`;

  const jobsHtml=!PAR()?'':`<div class="ph" style="margin-top:6px"><h2>${t('ui.jobs.title')}</h2><span>${t('ui.jobs.slots',{n:S.jobs.length,slots:S.slots})}</span></div>
    <div class="jobs">${S.jobs.map(j=>{const sh=j.shownHrs??j.hrs, el=j.hrs-j.left, over=el>=sh, pr=over?1:Math.max(0,el/sh);const lbl=BILL_LABEL[j.b];
      return `<div class="job" style="--vc:${vc(j.v)}"><div class="jt"><b>${j.issue.title}</b><span class="num">${over?t('ui.jobs.over'):t('ui.jobs.done',{t:clock(8-S.hours+sh-el)})}</span>${cancelBtn(j.issue.id)}</div>
      <div class="jm">${VENDORS[j.v].agent} / ${j.M.name}${sp}${lbl}${j.issue.due<=S.day?`${sp}<span style="color:var(--bad)">${t('ui.dueToday')}</span>`:''}</div>
      <div class="bar"><i style="width:${pr*100}%;background:var(--vc)"></i></div></div>`;}).join('')
      ||`<div class="empty" style="padding:14px">${t('ui.jobs.empty')}</div>`}</div>`;
  const list=S.issues.filter(i=>!i.running).sort(queueOrder).map(i=>{
    const left=i.due-S.day;
    return `<div class="issw"><button class="iss ${sel.issue===i.id?'sel':''}" data-iss="${i.id}">
      <span class="t">${i.title}</span><span class="k">${i.out?nt(i.pay):`+${i.kpi}`}</span>
      <span class="meta"><span class="pips" title="${t('ui.card.cx',{cx:i.cx})}">${[1,2,3,4,5].map(n=>`<i class="${n<=i.cx?'on':''}"></i>`).join('')}</span>
      <span class="num">~${kt(i.base)} tokens</span>
      ${i.out?`<span class="chip out">${t('ui.chip.gig')}</span>`:''}<span class="chip stack">${STACKS[i.stack].name}</span>${unfamiliar(i)?`<span class="chip unfam">${t('ui.chip.unfam')}</span>`:''}${i.merge?`<span class="chip trap">${t('ui.chip.merge')}</span>`:''}${i.research?`<span class="chip rsch">${t('ui.chip.research')}</span>`:''}${i.store?`<span class="chip store">${t('ui.chip.store')}</span>`:''}${i.revealed?`<span class="chip trap">${t('ui.chip.trap',{cx:i.shownCx})}</span>`:i.evaluated?`<span class="chip">${t('ui.chip.evaluated')}</span>`:''}
      ${i.inc?`<span class="chip inc">${t('ui.chip.inc')}</span>`:''}${i.sens?`<span class="chip sens">${t('ui.chip.sens')}</span>`:''}${i.big?`<span class="chip big">${t('ui.chip.big')}</span>`:''}${i.client.ban?`<span class="chip ban">${i.client.name}${sp}${i.client.ban==='all'?t('ui.chip.banAll'):t('ui.chip.banApi')}</span>`:S.cnBan&&!i.out?`<span class="chip ban">${t('ui.chip.banApi')}</span>`:`<span class="chip">${i.client.name}</span>`}
      <span class="chip ${left<=0?'due':''}">${left<=0?t('ui.dueToday'):t('ui.chip.left',{n:left})}</span>${i.tries?`<span class="chip">${t('ui.chip.tries',{n:i.tries})}</span>`:''}</span>
      ${i.research?`<span class="rnote">${t('ui.card.researchNote',{x:RESEARCH_DIRECT_TK})}</span>`:''}
    </button>${quickBtn(i)}</div>`;}).join('') || `<div class="empty">${t('ui.queue.empty')}</div>`;

  app.innerHTML=`
  <header class="top">
    <div class="brand"><h1><span class="tk">Token</span> ${t('ui.brand')}</h1><p>${t('ui.brandSub',{company:companyName()})}</p></div>
    <div class="cal">${cal}</div>
    <div class="tools">${langSwitch()}<button class="btn ghost rbtn" data-act="rules">${t('ui.rules')}</button></div>
  </header>
  ${meters}
  <div class="quotas">${qs}</div>
  <div class="main">
    <section class="panel"><div class="ph"><h2>${t('ui.queue.title')}</h2><span>${t('ui.queue.count',{n:S.issues.filter(i=>!i.running).length})}</span></div>${S.inv.skills?`<button class="btn ghost" data-act="batch" ${canQuick()?'':'disabled'}>${t('ui.batch',{cx:SKILLS_CX[lv(S.inv.skills)]})}</button>`:''}<div class="issues">${list}</div>${jobsHtml}</section>
    <section class="panel">${dispatchPanel()}</section>
  </div>
  ${invPanel()}
  <section class="panel">
    <div class="foot"><div class="ph"><h2>${t('ui.log.title')}</h2></div>
      <div class="actions">${PAR()?`<button class="btn ghost" data-act="wait1" ${S.hours<=0?'disabled':''}>${t('ui.wait1')}</button><button class="btn ghost" data-act="waitn" ${!S.jobs.length||S.hours<=0?'disabled':''}>${t('ui.waitn')}</button>`:''}${((S.day-1)%5===0)?`<button class="btn ghost" data-act="adjust">${t('ui.adjust')}</button>`:''}<button class="btn" data-act="end">${t('ui.endDay',{d:S.day})}</button></div></div>
    <div class="log">${S.log.map(l=>`<p class="${l.cls}">${l.msg}</p>`).join('')||`<p class="dim">${t('ui.log.empty')}</p>`}</div>
    <small style="color:var(--muted);font-size:12px">${t('ui.disclaimer')}</small>
  </section>`;
}
/* 標頭的語言切換：每個註冊的語言一顆按鈕，名稱用該語言自己寫，目前的語言亮起來 */
export const langSwitch=()=>LANG_SWITCH?`<div class="lang" role="group" aria-label="${t('ui.lang')}">${LANGS.map(l=>`<button class="${l.id===lang?'on':''}" data-lang="${l.id}" lang="${l.id}" aria-pressed="${l.id===lang}">${l.dict['lang.name']}</button>`).join('')}</div>`:'';
/* 開發流程：買了 SDD 才顯示；只列已買的等級，亮的是這次會套用的等級 */
export function sddRow(){
  const own=lv(S.inv.sdd); if(!own) return '';
  const cur=sddLevel(), pc=x=>`${Math.round(x*100)}%`;
  const b=L=>`<button class="sb ${cur===L?'sel':''}" data-sdd="${L}">${L?t('ui.sdd.lv',{name:SDD_NAME[L],L}):SDD_NAME[0]}<small>${L?t('ui.sdd.desc',{eg:SDD_EG[L],tk:SDD_TK[L],p:pc(SDD_P[L]),stop:pc(SDD_TRAP_STOP[L])}):t('ui.sdd.off',{stop:pc(TRAP_STOP)})}</small></button>`;
  return `<div class="sec"><label>${t('ui.sdd.title')}</label><div class="seg"><span class="seglbl">SDD</span>${[0,1,2].filter(L=>L<=own).map(b).join('')}</div></div>`;
}
/* 工單卡片上的一鍵派工按鈕：顯示會用哪個方案、前面的方案為什麼不能用 */
export function quickBtn(is){
  const {i,skip}=presetFor(is);
  const why=skip.length?`<span class="why">${t('ui.quick.skip',{p:PN[skip[0].i],r:skip[0].r})}</span>`:'';
  if(i<0) return `<button class="qk" disabled><b>${t('ui.quick.none')}</b>${why}</button>`;
  const p=S.presets[i], risk=auditRisk(is,p.b);
  return `<button class="qk" data-quick="${is.id}" ${canQuick()?'':'disabled'}><b>${t('ui.quick.go',{p:PN[i]})}</b><span>${VENDORS[p.v].agent} / ${model(p.v,p.m).name}${t('sep')}${BILL_LABEL[p.b]}</span>${why}${risk?`<span class="why">${t('ui.quick.audit',{p:Math.round(auditOdds(p.v)*100)})}</span>`:''}</button>`;
}
export function invPanel(){
  /* 有等級的投資按鈕寫下一級（買滿寫最高級）；鎖住時寫要先做什麼 */
  const btn=(k,st)=>{const I=invCost(k,st), why=investBlock(k,st), cur=invLevel(k,st), max=invMax(k), L=Math.min(cur+1,max);
    const tag=max>1&&(cur>=1||k==='ai')?` Lv${L}`:'';
    return `<button class="sb" data-inv="${k}" ${st?`data-st="${st}"`:''} ${why?'disabled':''}><b>${k==='md'?STACKS[st].name:INVEST[k].name}${tag}</b><small>${why||t('ui.inv.cost',{h:I.hrs,cost:nt(I.cost)})}</small></button>`;};
  const row=(k,body)=>{const I=INVEST[k];
    return `<div class="inv"><div><b>${I.name}</b><span>${I.desc}${k==='md'?t('ui.inv.mdCost',{h:I.hrs,cost:nt(I.cost)}):''}${I.lv2?t('ui.inv.lv2',{desc:I.lv2.desc,h:I.lv2.hrs,cost:nt(I.lv2.cost)}):''}</span></div><div class="seg">${body}</div></div>`;};
  const f=invFolded();
  return `<section class="panel"><div class="ph"><h2><button class="fold" data-act="invfold" aria-expanded="${!f}">${f?'▸':'▾'} ${t('ui.inv.title')}</button></h2><span>${f?'':t('ui.inv.lasting')}${t('ui.inv.count',{n:invCount()})}</span></div>
    ${f?'':`<div class="invs">${row('md',INV_STACKS().map(st=>btn('md',st)).join(''))}${INV_KEYS.map(k=>row(k,btn(k))).join('')}${confRow()}${hwRow()}</div>`}</section>`;
}
/* 國內研討會：平日自費報名，週末出席、下週一生效 */
export function confRow(){
  const b=k=>{const C=CONF[k], why=confBlock(k);
    return `<button class="sb" data-conf="${k}" ${why?'disabled':''}><b>${C.name}</b><small>${CONF_CATS[C.cat]}${C.stacks.length?`${t('sep')}${C.stacks.map(st=>STACKS[st].name).join(t('sep.list'))}`:''}${t('sep')}${t('ui.conf.fee',{fee:nt(C.fee)})}</small>${why?`<small>${why}</small>`:''}</button>`;};
  return `<div class="inv"><div><b>${t('ui.conf.title')}</b><span>${t('ui.conf.desc',{last:CONF_LAST_DAY,x:CONF_MANUAL,scan:INVEST.scan.name,skills:INVEST.skills.name,tests:INVEST.tests.name,ai:INVEST.ai.name})}</span></div><div class="seg">${CONF_KEYS.map(b).join('')}</div></div>`;
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
    return `<button class="sb" data-hw="${k}" ${why?'disabled':''}><b>${H.name}</b><small>${why||t('ui.hw.meta',{price:H.price,trust:H.trust,days:H.days})}</small><small>${H.desc}</small></button>`;};
  return `<div class="inv"><div><b>${t('ui.hw.title')}</b><span>${t('ui.hw.desc',{req:HW_REQ_HRS,setup:HW_SETUP_HRS,idle:HW_IDLE})}</span></div><div class="seg">${HW_KEYS.map(b).join('')}</div></div>`;
}
export function qbox(name,sub,dl,dc,wl,wc){
  const dp=dc?dl/dc*100:0, wp=wc?wl/wc*100:0;
  return `<div class="q"><div class="nm">${name}<span>${sub}</span></div>
    <label>${t('ui.q.today')}</label><div><div class="bar"><i class="${dp<20?'lo':''}" style="width:${dp}%"></i></div><span class="num" style="font-size:11px;color:var(--muted)">${kt(dl)} / ${kt(dc)}</span></div>
    <label>${t('ui.q.week')}</label><div><div class="bar"><i class="${wp<20?'lo':''}" style="width:${wp}%"></i></div><span class="num" style="font-size:11px;color:var(--muted)">${kt(wl)} / ${kt(wc)}</span></div></div>`;
}

export function dispatchPanel(){
  const is=S.issues.find(i=>i.id===sel.issue), sp=t('sep'), ls=t('sep.list');
  if(!is) return `<div class="ph"><h2>${t('ui.dp.title')}</h2></div><div class="empty">${t('ui.dp.empty1')}<br>${t('ui.dp.empty2')}</div>`;
  // ensure billing valid
  const avail=(v,M)=>S.outage!==v&&!cnBlock(is,v,M)&&!hwBlock(M);
  if(!avail(sel.v,model(sel.v,sel.m))){for(const v in VENDORS){const M=VENDORS[v].models.find(M=>avail(v,M));if(M){sel.v=v;sel.m=M.id;break;}}if(sel.v==='local')sel.b='local';else if(sel.b==='local')sel.b='api';}
  let bl=bills(sel.v,is); if(!bl.find(b=>b.id===sel.b&&b.ok)){const f=bl.find(b=>b.ok);sel.b=f?f.id:bl[0].id;}
  const rows=Object.keys(VENDORS).map(v=>{
    const V=VENDORS[v], down=S.outage===v;
    return `<div class="vrow" style="--vc:${vc(v)}"><div class="vn"><b>${V.name}</b><span>${down?t('ui.q.down'):V.agent}</span>${V.cn?`<span class="cn">${t('ui.dp.cnVendor')}</span>`:''}</div>
      <div class="mods">${V.models.map(M=>{const why=cnBlock(is,v,M)||hwBlock(M);return `<button class="mb ${sel.v===v&&sel.m===M.id?'sel':''}" data-v="${v}" data-m="${M.id}" ${down||why?'disabled':''}><b>${M.name}</b><span>${t('ui.dp.cap')} ${'●'.repeat(M.cap)}${'○'.repeat(Math.max(0,5-M.cap))}</span><span class="${why?'why':''}">${why||(M.price?`$${M.price}/k`:t('ui.dp.free'))}${!why&&M.cn?`${sp}${t('ui.dp.cnWeights')}`:''}</span></button>`;}).join('')}</div></div>`;
  }).join('');
  const e=est(is,sel.v,sel.m), M=e.M, cl=costLine(sel.b,M,sel.v,e);
  const segs=bl.map(b=>`<button class="sb ${sel.b===b.id?'sel':''}" data-b="${b.id}" ${b.ok?'':'disabled'}>${b.label}<small>${b.note}</small></button>`).join('');
  const pc=e.pe>=.8?'good':e.pe>=.5?'meh':'bad';
  let warn='';
  if(S.outage===sel.v) warn=t('ui.warn.down');
  else if(sel.b==='local'&&localBusy()) warn=t('ui.warn.localBusy');
  else if(is.sens&&VENDORS[sel.v].cn) warn=t('ui.warn.sensCn',{p:Math.round(auditOdds(sel.v)*100)});
  else if(is.sens&&(sel.b==='sub'||sel.b==='api')) warn=t('ui.warn.sensPersonal',{p:Math.round(auditOdds(sel.v)*100)});
  else if((sel.b==='sub'||sel.b==='seat')&&cl.hi>quotaLeft(sel.b,sel.v)) warn=t('ui.warn.quota');
  else if(PAR()&&S.jobs.length>=S.slots) warn=t('ui.warn.slots');
  else if(PAR()&&is.due<=S.day&&e.hrs+.2>S.hours) warn=t('ui.warn.late');
  else if(PAR()&&e.hrs+.2>S.hours) warn=t('ui.warn.overnight');
  else if(!PAR()&&e.hrs*1.2>S.hours) warn=t('ui.warn.hours');
  else if(sel.b==='api'&&cl.hi>S.wallet) warn=t('ui.warn.wallet');
  const mh=manualHrs(is), ec=evalCost(model(sel.v,sel.m),sel.v), rc=researchCost(model(sel.v,sel.m),sel.v);
  const blocked=S.outage===sel.v||!!cnBlock(is,sel.v,model(sel.v,sel.m))||!!hwBlock(model(sel.v,sel.m))||(sel.b==='local'&&localBusy());
  return `<div class="ph"><h2>${t('ui.dp.title')}</h2><span>${is.title}</span></div>
  <div class="sec"><label>${t('ui.dp.pick')}</label>${rows}</div>
  <div class="sec"><label>${t('ui.dp.bill')}</label><div class="seg">${segs}</div>${S.seats.length&&!S.seats.includes(sel.v)?`<p class="hint">${t('ui.dp.seatHint',{seats:S.seats.map(v=>VENDORS[v].name).join(ls),agents:S.seats.map(v=>VENDORS[v].agent).join(ls)})}</p>`:''}</div>
  <div class="sec"><label>${t('ui.dp.review')}</label><div class="seg">${REVIEW.map((r,i)=>`<button class="sb ${sel.rv===i?'sel':''}" data-rv="${i}">${r.name}<small>${i?t('ui.dp.reviewDesc',{tk:r.tk,p:Math.round(catchRate(i,M)*100)}):t('ui.dp.reviewNone')}</small></button>`).join('')}</div></div>
  ${S.advanced?`<div class="sec"><label>${t('ui.dp.effort')}</label><div class="seg">${EFFORT.map((f,i)=>`<button class="sb ${sel.ef===i?'sel':''}" data-ef="${i}">${f.name}<small>${f.cap?t('ui.dp.effortDesc',{sign:f.cap>0?'+':'−',n:Math.abs(f.cap),tk:f.tk,hrs:f.hrs}):t('ui.dp.effortMid')}</small></button>`).join('')}</div></div>`:''}
  ${sddRow()}
  <div class="sec"><label>${t('ui.dp.presets')}</label><div class="seg">${S.presets.map((p,i)=>`<button class="sb" data-load="${i}">${t('ui.dp.load',{p:PN[i]})}<small>${model(p.v,p.m).name}${S.advanced&&p.ef!==1?`${sp}${t('ui.dp.effortTag',{name:EFFORT[p.ef].name})}`:''}${sp}${BILL_LABEL[p.b]}${sp}${REVIEW[p.rv].name}${lv(S.inv.sdd)?`${sp}SDD ${SDD_NAME[sddLevel(p.sdd)]}`:''}</small></button>`).join('')}</div>
    <div class="seg">${PN.map((n,i)=>`<button class="sb" data-save="${i}">${t('ui.dp.save',{p:n})}<small>${t('ui.dp.saveSub')}</small></button>`).join('')}</div></div>
  <div class="est">
    <div><label>${t('ui.dp.estTk')}</label><b>${kt(e.lo)}–${kt(e.hi)}</b></div>
    <div><label>${cl.t}</label><b>${cl.unit==='q'?`${kt(cl.lo)}–${kt(cl.hi)}`:cl.hi?`${nt(cl.lo)}–${nt(cl.hi)}`:'NT$0'}</b></div>
    <div><label>${t('ui.dp.p')}${sel.rv||is.store?t('ui.dp.pRaw',{p:Math.round(e.p*100)}):''}</label><b class="${pc}">${Math.round(e.pe*100)}%</b></div>
    <div><label>${PAR()?t('ui.dp.runHrs'):t('ui.dp.workHrs')}</label><b>${h1(e.hrs)}h</b></div>
  </div>
  ${stackHint(is)?`<p class="hint">${stackHint(is)}</p>`:''}
  ${invHint(is)?`<p class="hint">${invHint(is)}</p>`:''}
  ${PAR()&&S.jobs.length?`<p class="hint">${t('ui.dp.parHint',{n:S.jobs.length,x:reviewLoad().toFixed(2)})}</p>`:''}
  <div class="warnline">${warn}</div>
  <div class="actions">
    <button class="btn primary" data-act="go" ${blocked||S.hours<.2||(PAR()&&S.jobs.length>=S.slots)?'disabled':''}>${t(PAR()?'ui.dp.goPar':'ui.dp.go',{agent:VENDORS[sel.v].agent})}</button>
    <button class="btn ghost" data-act="manual" ${mh>S.hours||manualBlocked()?'disabled':''}>${manualBlocked()?t('ui.dp.manualBlocked'):t('ui.dp.manual',{h:h1(mh)})}</button>
    ${is.research?`<button class="btn ghost" data-act="research" ${researchBlock(is,'agent')?'disabled':''}>${t('ui.dp.research',{tk:kt(rc.tk),h:h1(rc.hrs)})}</button>
    <button class="btn ghost" data-act="selfresearch" ${researchBlock(is,'self')?'disabled':''}>${t('ui.dp.selfResearch',{h:h1(selfResearchHrs(is))})}</button>`:''}
    ${canEvaluate(is)?`<button class="btn ghost" data-act="eval" ${blocked||ec.hrs>S.hours?'disabled':''}>${t('ui.dp.eval',{tk:kt(ec.tk),h:h1(ec.hrs)})}</button>`:''}
    ${is.revealed&&!is.rescoped&&!is.out?`<button class="btn ghost" data-act="rescope">${t('ui.dp.rescope')}</button>`:''}
  </div>`;
}

