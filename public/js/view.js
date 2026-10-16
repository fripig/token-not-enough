import {ACCEPT_HRS,CAP_SCALE,CONFLICT_MAX,RESEARCH_DIRECT_TK,SKILLS_CX,SDD_EG,SDD_NAME,SDD_P,SDD_TK,SDD_TRAP_STOP,lv,BILL_LABEL,EFFORT,HW,HW_IDLE,HW_KEYS,HW_REQ_HRS,HW_SETUP_HRS,INVEST,INV_KEYS,PN,SEAT,STACKS,SUBV,VENDORS,cnBlock,companyName,h1,kt,model,nt,planOf,vc,CONF,CONF_CATS,CONF_KEYS,CONF_LAST_DAY,CONF_MANUAL,INV_CX} from './data.js';
import {GIG_LATE,S,issueTitle,sel,unfamiliar,dueBy} from './state.js';
import {REVIEW,reviewer,reviewCost,rvModelBlock,sddLevel,bills,costLine,est,hwBlock,localBusy,manualBlocked,manualHrs,presetBlock,quotaLeft,burnStat,stackHint,skillsLv,invQ,sddP,sddStop} from './calc.js';
import {ABANDON_TRUST,canAbandon,INV_STACKS,PAR,TRAP_STOP,researchBlock,researchCost,selfResearchHrs,auditOdds,auditRisk,canEvaluate,canQuick,clock,evalCost,hwReqBlock,invCount,invHint,investBlock,queueOrder,reviewLoad,confBlock,invCost,invLevel,invMax,invTicketBlock,invSelfBlock,lvCost,acceptBlock,acceptHrs} from './actions.js';
import {LANGS,LANG_SWITCH,lang,t} from './i18n.js';

/* ===== 畫面 ===== */
/* 背景 agent 的兩段式中止：第一次點只是待確認，記住是哪張單（不進存檔） */
export let cancelArm=null;
export const armCancel=id=>{cancelArm=id;};
export const cancelBtn=id=>cancelArm===id?`<button class="btn ghost jx armed" data-cancel="${id}">${t('ui.cancelConfirm')}</button>`:`<button class="btn ghost jx" data-cancel="${id}">${t('ui.cancel')}</button>`;
/* 退單也是兩段式：第一次按變成「確定退單？」，點別處恢復 */
export let abandonArm=null;
export const armAbandon=id=>{abandonArm=id;};
export const abandonBtn=is=>abandonArm===is.id?`<button class="btn ghost armed" data-abandon="${is.id}">${t(is.inv?'ui.dp.invCancelConfirm':'ui.dp.abandonConfirm')}</button>`:`<button class="btn ghost" data-abandon="${is.id}">${is.inv?t('ui.dp.invCancel'):is.out?t('ui.dp.abandonGig',{pen:nt(Math.round(is.pay*GIG_LATE))}):t('ui.dp.abandon',{n:ABANDON_TRUST})}</button>`;
export const app=document.getElementById('app'), ov=document.getElementById('ov'), mo=document.getElementById('mo');

export function render(){
  const weekOf=d=>Math.ceil(d/5), sp=t('sep');
  let cal='';
  for(let w=1;w<=4;w++){let c='';for(let d=(w-1)*5+1;d<=w*5;d++)c+=`<span class="d ${d<S.day?'past':d===S.day?'now':''}">${d}</span>`;cal+=`<div class="wk"><b>${t('ui.week',{w})}</b><div>${c}</div></div>`;}

  const meters=`
  <div class="meters">
    ${PAR()?`<div class="m"><label>${t('ui.meter.now')}</label><span class="v">${clock(8-S.hours)}<small style="font-size:13px"> / 17:00</small></span><div class="bar"><i style="width:${S.hours/8*100}%"></i></div><span class="s">${t('ui.meter.agents',{n:S.jobs.length})}</span></div>`
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
  /* 用量挑戰：這個月到目前為止用掉的價值（這週當作現在結束），放在最前面 */
  if(S.burn){const b=burnStat(), n=Math.round(b.pct*100);
    qs=`<div class="q"><div class="nm">${t('ui.burn.row')}<span>${nt(b.v)} / ${nt(b.m)}${t('ui.burn.pct',{n})}</span></div><div class="bar"><i style="width:${n}%"></i></div></div>`+qs;}

  const jobsHtml=!PAR()?'':`<div class="ph" style="margin-top:6px"><h2>${t('ui.jobs.title')}</h2><span>${t('ui.jobs.slots',{n:S.jobs.length})}</span></div>
    <div class="jobs">${S.jobs.map(j=>{const sh=j.shownHrs??j.hrs, el=j.hrs-j.left, over=el>=sh, pr=over?1:Math.max(0,el/sh);const lbl=BILL_LABEL[j.b];
      return `<div class="job" style="--vc:${vc(j.v)}"><div class="jt"><b>${issueTitle(j.issue)}</b><span class="num">${over?t('ui.jobs.over'):t('ui.jobs.done',{t:clock(8-S.hours+sh-el)})}</span>${cancelBtn(j.issue.id)}</div>
      <div class="jm">${VENDORS[j.v].agent} / ${j.M.name}${sp}${lbl}${dueBy(j.issue,S.day)?`${sp}<span style="color:var(--bad)">${t('ui.dueToday')}</span>`:''}</div>
      <div class="bar"><i style="width:${pr*100}%;background:var(--vc)"></i></div></div>`;}).join('')
      ||`<div class="empty" style="padding:14px">${t('ui.jobs.empty')}</div>`}</div>`;
  const pips=i=>`<span class="pips" title="${t('ui.card.cx',{cx:i.cx})}">${Array.from({length:Math.max(5,i.cx)},(_,n)=>`<i class="${n<i.cx?'on':''}"></i>`).join('')}</span>`;
  /* 投資工單：只寫投資名稱、投資標籤、複雜度與 token，沒有 KPI、到期、案主 */
  const invCard=i=>`<div class="issw"><button class="iss ${sel.issue===i.id?'sel':''}" data-iss="${i.id}">
      <span class="t">${issueTitle(i)}</span><span class="k"></span>
      <span class="meta">${pips(i)}<span class="num">~${kt(i.base)} tokens</span><span class="chip inv">${t('ui.chip.inv')}</span>${i.acc?`<span class="chip acc">${t('ui.chip.acc')}</span>`:''}</span>
    </button>${i.acc?'':quickBtn(i)}</div>`;
  const list=S.issues.filter(i=>!i.running).sort(queueOrder).map(i=>{
    if(i.inv) return invCard(i);
    const left=i.due-S.day;
    return `<div class="issw"><button class="iss ${sel.issue===i.id?'sel':''}" data-iss="${i.id}">
      <span class="t">${issueTitle(i)}</span><span class="k">${i.out?nt(i.pay):`+${i.kpi}`}</span>
      <span class="meta"><span class="pips" title="${t('ui.card.cx',{cx:i.cx})}">${Array.from({length:Math.max(5,i.cx)},(_,n)=>`<i class="${n<i.cx?'on':''}"></i>`).join('')}</span>
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
    <section class="panel"><div class="ph"><h2>${t('ui.queue.title')}</h2><span>${t('ui.queue.count',{n:S.issues.filter(i=>!i.running).length})}</span></div>${skillsLv()?`<button class="btn ghost" data-act="batch" ${canQuick()?'':'disabled'}>${t('ui.batch',{cx:SKILLS_CX[skillsLv()]})}</button>`:''}<div class="issues">${list}</div>${jobsHtml}</section>
    ${tabPanel()}
  </div>
  <section class="panel">
    <div class="ph"><h2>${t('ui.log.title')}</h2></div>
    <div class="log">${logLines(S.log)||`<p class="dim">${t('ui.log.empty')}</p>`}</div>
    <small style="color:var(--muted);font-size:12px">${t('ui.disclaimer')}</small>
  </section>
  ${dayDock()}`;
}
/* 畫面底部的動作列：等待、調整訂閱、下班，捲到哪裡都按得到 */
export function dayDock(){
  const time=PAR()?clock(8-S.hours):`${h1(S.hours)}h`;
  return `<div class="dock"><span class="dst num">${t('ui.dock.status',{d:S.day,time})}</span><div class="actions">${PAR()?`<button class="btn ghost" data-act="wait1" ${S.hours<=0?'disabled':''}>${t('ui.wait1')}</button><button class="btn ghost" data-act="waitn" ${!S.jobs.length||S.hours<=0?'disabled':''}>${t('ui.waitn')}</button>`:''}${((S.day-1)%5===0)?`<button class="btn ghost" data-act="adjust">${t('ui.adjust')}</button>`:''}<button class="btn" data-act="end">${t('ui.endDay',{d:S.day})}</button></div></div>`;
}
/* 標頭的語言切換：每個註冊的語言一顆按鈕，名稱用該語言自己寫，目前的語言亮起來 */
export const langSwitch=()=>LANG_SWITCH?`<div class="lang" role="group" aria-label="${t('ui.lang')}">${LANGS.map(l=>`<button class="${l.id===lang?'on':''}" data-lang="${l.id}" lang="${l.id}" aria-pressed="${l.id===lang}">${l.dict['lang.name']}</button>`).join('')}</div>`:'';
/* 開發流程：買了 SDD 才顯示；只列已買的等級，亮的是這次會套用的等級 */
export function sddRow(){
  const own=lv(S.inv.sdd); if(!own) return '';
  const cur=sddLevel(), pc=x=>`${Math.round(x*100)}%`;
  const b=L=>`<button class="sb ${cur===L?'sel':''}" data-sdd="${L}">${L?t('ui.sdd.lv',{name:SDD_NAME[L],L}):SDD_NAME[0]}<small>${L?t('ui.sdd.desc',{eg:SDD_EG[L],tk:SDD_TK[L],p:pc(sddP(L)),stop:pc(sddStop(L))}):t('ui.sdd.off',{stop:pc(TRAP_STOP)})}</small></button>`;
  return `<div class="sec"><label>${t('ui.sdd.title')}</label><div class="seg"><span class="seglbl">SDD</span>${[0,1,2].filter(L=>L<=own).map(b).join('')}</div></div>`;
}
/* 工單卡片上的一鍵派工：A／B／C 各一顆，不能用的停用並寫原因；機敏單用個人付費的寫稽核機率 */
export function quickBtn(is){
  const can=canQuick();
  const b=(p,i)=>{const why=presetBlock(is,p), risk=!why&&auditRisk(is,p.b);
    return `<button class="qk" data-quick="${is.id}" data-p="${i}" ${why||!can?'disabled':''}><b>${PN[i]}</b><span>${model(p.v,p.m).name}${t('sep')}${BILL_LABEL[p.b]}</span>${why?`<span class="why">${why}</span>`:risk?`<span class="why">${t('ui.quick.auditShort',{p:Math.round(auditOdds(p.v)*100)})}</span>`:''}</button>`;};
  return `<div class="qkrow"><span class="qkl">${t('ui.quick.label')}</span>${S.presets.map(b).join('')}</div>`;
}
export function invPanel(){
  /* 有等級的投資按鈕寫下一級（買滿寫最高級）；鎖住時寫要先做什麼 */
  /* 平行模式寫東西的投資：按了開投資工單（不花錢、不花時間），拒絕原因不看工時與預算 */
  const btn=(k,st)=>{const I=invCost(k,st), tk=PAR()&&INV_CX[k], why=tk?invTicketBlock(k,st):investBlock(k,st), cur=invLevel(k,st), max=invMax(k), L=Math.min(cur+1,max);
    const tag=max>1&&(cur>=1||k==='ai')?` Lv${L}`:'';
    /* 已有的最高級品質不到 100%：多一顆重做 */
    const redo=tk&&cur>0&&invQ(k,st,cur)<1&&!invTicketBlock(k,st,cur)?`<button class="sb" data-invredo="${k}" ${st?`data-st="${st}"`:''}><b>${k==='md'?STACKS[st].name:INVEST[k].name}${max>1?` Lv${cur}`:''}</b><small>${t('ui.inv.redo',{q:Math.round(invQ(k,st,cur)*100)})}</small></button>`:'';
    return `<button class="sb" data-inv="${k}" ${st?`data-st="${st}"`:''} ${why?'disabled':''}><b>${k==='md'?STACKS[st].name:INVEST[k].name}${tag}</b><small>${why||(tk?t('ui.inv.ticket',{h:I.hrs,cost:nt(I.cost)}):t('ui.inv.cost',{h:I.hrs,cost:nt(I.cost)}))}</small></button>${redo}`;};
  const row=(k,body)=>{const I=INVEST[k];
    return `<div class="inv"><div><b>${I.name}</b><span>${I.desc}${k==='md'?t('ui.inv.mdCost',{h:I.hrs,cost:nt(I.cost)}):''}${I.lv2?t('ui.inv.lv2',{desc:I.lv2.desc,h:I.lv2.hrs,cost:nt(I.lv2.cost)}):''}</span></div><div class="seg">${body}</div></div>`;};
  return `<p class="hint">${t('ui.inv.note')}</p>
    <div class="invs">${row('md',INV_STACKS().map(st=>btn('md',st)).join(''))}${INV_KEYS.map(k=>row(k,btn(k))).join('')}${confRow()}${hwRow()}</div>`;
}
/* 派工台與工程投資：同一欄的兩個分頁。兩頁都產生，沒選到的藏起來；選哪頁不進存檔 */
export let tab='dispatch';
export const setTab=id=>{tab=id;};
/* 一欄版面（要跟 style.css 裡 .main 改成一欄的斷點一樣）：點工單後捲到派工台；桌機兩欄並排不捲 */
export const NARROW_MQ='(max-width:860px)';
export function scrollToDispatch(){
  if(typeof globalThis.matchMedia!=='function'||!matchMedia(NARROW_MQ).matches) return;
  const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  app.querySelector?.('.tabbed')?.scrollIntoView?.({behavior,block:'start'});
}
export function tabPanel(){
  const tb=(id,label)=>`<button role="tab" class="tab ${tab===id?'on':''}" data-tab="${id}" aria-selected="${tab===id}" aria-controls="tp-${id}">${label}</button>`;
  const tp=(id,body)=>`<div role="tabpanel" class="tp" id="tp-${id}" data-tabpanel="${id}" ${tab===id?'':'hidden'}>${body}</div>`;
  return `<section class="panel tabbed"><div class="tabs" role="tablist">${tb('dispatch',t('ui.dp.title'))}${tb('invest',`${t('ui.inv.title')} <small>${t('ui.inv.count',{n:invCount()})}</small>`)}</div>
    ${tp('dispatch',dispatchPanel())}${tp('invest',invPanel())}</section>`;
}
/* 國內研討會：平日自費報名，週末出席、下週一生效 */
export function confRow(){
  const b=k=>{const C=CONF[k], why=confBlock(k);
    return `<button class="sb" data-conf="${k}" ${why?'disabled':''}><b>${C.name}</b><small>${CONF_CATS[C.cat]}${C.stacks.length?`${t('sep')}${C.stacks.map(st=>STACKS[st].name).join(t('sep.list'))}`:''}${t('sep')}${t('ui.conf.fee',{fee:nt(C.fee)})}</small>${why?`<small>${why}</small>`:''}</button>`;};
  return `<div class="inv"><div><b>${t('ui.conf.title')}</b><span>${t('ui.conf.desc',{last:CONF_LAST_DAY,x:CONF_MANUAL,scan:INVEST.scan.name,skills:INVEST.skills.name,tests:INVEST.tests.name,ai:INVEST.ai.name})}</span></div><div class="seg">${CONF_KEYS.map(b).join('')}</div></div>`;
}
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

/* 紀錄行：執行紀錄與派工台的「剛剛」共用，顏色 class 照紀錄 */
export const logLines=a=>a.map(l=>`<p class="${l.cls}">${l.msg}</p>`).join('');
/* 派工台沒選工單時顯示最新幾筆紀錄，派完單看得到剛剛發生什麼 */
export const DP_RECENT=3;
/* 能力條：每 10 一顆實心點，多 5 畫半顆，補空心點到 5 格，後面寫數字（能力 45 → ●●●●◐ 45） */
export function capBar(cap){
  const full=Math.floor(cap/CAP_SCALE), half=cap%CAP_SCALE>=CAP_SCALE/2?1:0;
  return `${'●'.repeat(full)}${'◐'.repeat(half)}${'○'.repeat(Math.max(0,5-full-half))} ${cap}`;
}
/* 上下限一樣（投資工單的預估不擲亂數）時只寫一個數字 */
const costTxt=c=>c.unit==='q'?(c.lo===c.hi?kt(c.hi):`${kt(c.lo)}–${kt(c.hi)}`):c.hi?(c.lo===c.hi?nt(c.hi):`${nt(c.lo)}–${nt(c.hi)}`):'NT$0';
/* 選的審核模型不能用、或那家沒有能用的付費方式就回到同一個；審核付費方式不能用就換第一個能用的 */
export function fixReviewer(is){
  if(sel.rvv==null) return;
  const R=model(sel.rvv,sel.rvm);
  if(!R||(sel.rvv===sel.v&&sel.rvm===sel.m)||rvModelBlock(is,sel.rvv,R)){Object.assign(sel,{rvv:null,rvm:null,rvb:null});return;}
  const rbl=bills(sel.rvv,is); if(!rbl.find(b=>b.id===sel.rvb&&b.ok)){const f=rbl.find(b=>b.ok); if(f) sel.rvb=f.id; else Object.assign(sel,{rvv:null,rvm:null,rvb:null});}
}
/* 交叉審核：買了交叉審核工具、選了自審或嚴格審核才出現；審核模型一律中強度 */
export function reviewerRows(is){
  if(!lv(S.inv.xreview)||!sel.rv) return '';
  const sp=t('sep'), pc=(v,m)=>Math.round(est(is,sel.v,sel.m,sel.rv,sel.ef,sel.sdd,{v,m,b:'corp'}).c*100);
  const same=`<button class="sb ${sel.rvv==null?'sel':''}" data-rvv="">${t('ui.dp.rvSame')}<small>${t('ui.dp.reviewDesc',{tk:REVIEW[sel.rv].tk,p:Math.round(est(is,sel.v,sel.m,sel.rv,sel.ef,sel.sdd,null).c*100)})}</small></button>`;
  const mods=Object.keys(VENDORS).flatMap(v=>VENDORS[v].models.filter(M=>!(v===sel.v&&M.id===sel.m)).map(M=>{const why=rvModelBlock(is,v,M);
    return `<button class="mb ${sel.rvv===v&&sel.rvm===M.id?'sel':''}" style="--vc:${vc(v)}" data-rvv="${v}" data-rvm="${M.id}" ${why?'disabled':''}><b>${M.name}</b><span>${t('ui.dp.cap')} ${capBar(M.cap)}</span><span class="${why?'why':''}">${why||`${M.price?`$${M.price}/k`:t('ui.dp.free')}${sp}${t('ui.dp.rvCatch',{p:pc(v,M.id)})}`}</span></button>`;})).join('');
  const bill=sel.rvv==null?'':`<div class="sec"><label>${t('ui.dp.rvBill')}</label><div class="seg">${bills(sel.rvv,is).map(b=>`<button class="sb ${sel.rvb===b.id?'sel':''}" data-rvb="${b.id}" ${b.ok?'':'disabled'}>${b.label}<small>${b.note}</small></button>`).join('')}</div></div>`;
  return `<div class="sec"><label>${t('ui.dp.rvModel')}</label><div class="seg">${same}</div><div class="mods">${mods}</div></div>${bill}`;
}
/* 目前選擇跟方案一樣時，載入方案按鈕亮起來；強度只在進階模式比 */
export const presetIs=p=>p.v===sel.v&&p.m===sel.m&&p.b===sel.b&&p.rv===sel.rv&&(!S.advanced||p.ef===sel.ef)&&sddLevel(p.sdd)===sddLevel()&&JSON.stringify(reviewer(p))===JSON.stringify(reviewer());
/* 待驗收的投資工單：只剩驗收與取消投資（#67） */
export function invAccept(is){
  const why=acceptBlock(is), h=h1(acceptHrs(is)), q=Math.round(is.acc.q*100);
  return `<p class="dpt">${issueTitle(is)}</p>
  <div class="est">
    <div><label>${t('ui.dp.invQ')}</label><b class="${q>=100?'good':q>=60?'meh':'bad'}">${q}%</b></div>
    <div><label>${t('ui.dp.accHrs')}</label><b>${h}h</b></div>
  </div>
  <p class="hint">${t('ui.dp.accHint',{q,h,pct:Math.round(ACCEPT_HRS*100)})}</p>
  <div class="actions">
    <button class="btn primary" data-act="invaccept" ${why?'disabled':''}>${why?`${t('ui.dp.acceptShort')}${t('sep')}${why}`:t('ui.dp.accept',{h})}</button>
    ${abandonBtn(is)}
  </div>`;
}
/* 投資工單的派工台：方案、預估（品質取代成功率）、派出、自己做、取消投資；不顯示審核、SDD、交叉審核、評估、研究 */
export function invDispatch(is,{e,cl,segs,rows,warn,blocked}){
  const sp=t('sep'), why=invSelfBlock(is), {k,L}=is.inv, I=lvCost(k,L), q=Math.round(e.q*100);
  return `<p class="dpt">${issueTitle(is)}</p>
  <div class="sec"><label>${t('ui.dp.presets')}</label><div class="seg">${S.presets.map((p,i)=>`<button class="sb ${presetIs(p)?'sel':''}" data-load="${i}">${t('ui.dp.load',{p:PN[i]})}<small>${model(p.v,p.m).name}${S.advanced&&p.ef!==1?`${sp}${t('ui.dp.effortTag',{name:EFFORT[p.ef].name})}`:''}${sp}${BILL_LABEL[p.b]}</small></button>`).join('')}</div></div>
  <div class="est">
    <div><label>${t('ui.dp.estTk')}</label><b>${kt(e.tk)}</b></div>
    <div><label>${cl.t}</label><b>${costTxt(cl)}</b></div>
    <div><label>${t('ui.dp.invQ')}</label><b class="${q>=100?'good':q>=60?'meh':'bad'}">${q}%</b></div>
    <div><label>${t('ui.dp.runHrs')}</label><b>${h1(e.hrs)}h</b></div>
    <div><label>${t('ui.dp.accHrs')}</label><b>${h1(acceptHrs(is))}h</b></div>
  </div>
  <p class="hint">${t('ui.dp.invHint',{cx:is.cx})}</p>
  ${S.jobs.length?`<p class="hint">${t('ui.dp.parHint',{n:S.jobs.length,x:reviewLoad().toFixed(2),max:Math.round(CONFLICT_MAX*100)})}</p>`:''}
  <div class="warnline">${warn}</div>
  <div class="actions">
    <button class="btn primary" data-act="go" ${blocked||S.hours<.2?'disabled':''}>${t('ui.dp.goPar',{agent:VENDORS[sel.v].agent})}</button>
    <button class="btn ghost" data-act="invself" ${why?'disabled':''}>${why?`${t('ui.dp.invSelfShort')}${sp}${why}`:t('ui.dp.invSelf',{h:h1(I.hrs),cost:nt(I.cost)})}</button>
    ${abandonBtn(is)}
  </div>
  <p class="dptune">${t('ui.dp.tune')}</p>
  <div class="sec"><label>${t('ui.dp.pick')}</label>${rows}</div>
  <div class="sec"><label>${t('ui.dp.bill')}</label><div class="seg">${segs}</div></div>
  ${S.advanced?`<div class="sec"><label>${t('ui.dp.effort')}</label><div class="seg">${EFFORT.map((f,i)=>`<button class="sb ${sel.ef===i?'sel':''}" data-ef="${i}">${f.name}<small>${f.cap?t('ui.dp.effortDesc',{sign:f.cap>0?'+':'−',n:Math.abs(f.cap),tk:f.tk,hrs:f.hrs}):t('ui.dp.effortMid')}</small></button>`).join('')}</div></div>`:''}`;
}
export function dispatchPanel(){
  const is=S.issues.find(i=>i.id===sel.issue), sp=t('sep'), ls=t('sep.list');
  if(!is) return `<div class="empty">${t('ui.dp.empty1')}<br>${t('ui.dp.empty2')}</div>${S.log.length?`<div class="recent"><label>${t('ui.dp.recent')}</label>${logLines(S.log.slice(0,DP_RECENT))}</div>`:''}`;
  if(is.acc) return invAccept(is);
  // ensure billing valid
  const avail=(v,M)=>S.outage!==v&&!cnBlock(is,v,M)&&!hwBlock(M);
  if(!avail(sel.v,model(sel.v,sel.m))){for(const v in VENDORS){const M=VENDORS[v].models.find(M=>avail(v,M));if(M){sel.v=v;sel.m=M.id;break;}}if(sel.v==='local')sel.b='local';else if(sel.b==='local')sel.b='api';}
  let bl=bills(sel.v,is); if(!bl.find(b=>b.id===sel.b&&b.ok)){const f=bl.find(b=>b.ok);sel.b=f?f.id:bl[0].id;}
  fixReviewer(is);
  const rows=Object.keys(VENDORS).map(v=>{
    const V=VENDORS[v], down=S.outage===v;
    return `<div class="vrow" style="--vc:${vc(v)}"><div class="vn"><b>${V.name}</b><span>${down?t('ui.q.down'):V.agent}</span>${V.cn?`<span class="cn">${t('ui.dp.cnVendor')}</span>`:''}</div>
      <div class="mods">${V.models.map(M=>{const why=cnBlock(is,v,M)||hwBlock(M);return `<button class="mb ${sel.v===v&&sel.m===M.id?'sel':''}" data-v="${v}" data-m="${M.id}" ${down||why?'disabled':''}><b>${M.name}</b><span>${t('ui.dp.cap')} ${capBar(M.cap)}</span><span class="${why?'why':''}">${why||(M.price?`$${M.price}/k`:t('ui.dp.free'))}${!why&&M.cn?`${sp}${t('ui.dp.cnWeights')}`:''}</span></button>`;}).join('')}</div></div>`;
  }).join('');
  const e=est(is,sel.v,sel.m), M=e.M, cl=costLine(sel.b,M,sel.v,e), rcl=reviewCost(e), rr=e.rv;
  const segs=bl.map(b=>`<button class="sb ${sel.b===b.id?'sel':''}" data-b="${b.id}" ${b.ok?'':'disabled'}>${b.label}<small>${b.note}</small></button>`).join('');
  const pc=e.pe>=.8?'good':e.pe>=.5?'meh':'bad';
  let warn='';
  if(S.outage===sel.v) warn=t('ui.warn.down');
  else if(sel.b==='local'&&localBusy()) warn=t('ui.warn.localBusy');
  else if(is.sens&&VENDORS[sel.v].cn) warn=t('ui.warn.sensCn',{p:Math.round(auditOdds(sel.v)*100)});
  else if(is.sens&&(sel.b==='sub'||sel.b==='api')) warn=t('ui.warn.sensPersonal',{p:Math.round(auditOdds(sel.v)*100)});
  else if(rr&&is.sens&&(rr.b==='sub'||rr.b==='api')) warn=t('why.rv',{w:t(VENDORS[rr.v].cn?'ui.warn.sensCn':'ui.warn.sensPersonal',{p:Math.round(auditOdds(rr.v)*100)})});
  else if((sel.b==='sub'||sel.b==='seat')&&cl.hi>quotaLeft(sel.b,sel.v)) warn=t('ui.warn.quota');
  else if(rr&&(rr.b==='sub'||rr.b==='seat')&&rcl.hi+(rr.v===sel.v&&rr.b===sel.b?cl.hi:0)>quotaLeft(rr.b,rr.v)) warn=t('why.rv',{w:t('ui.warn.quota')});
  else if(PAR()&&dueBy(is,S.day)&&e.hrs+.2>S.hours) warn=t('ui.warn.late');
  else if(PAR()&&S.day>=20&&e.hrs+.2>S.hours) warn=t('ui.warn.monthEnd');
  else if(PAR()&&e.hrs+.2>S.hours) warn=t('ui.warn.overnight');
  else if(!PAR()&&e.hrs*1.2>S.hours) warn=t('ui.warn.hours');
  else if(sel.b==='api'&&cl.hi>S.wallet) warn=t('ui.warn.wallet');
  else if(rr&&rr.b==='api'&&rcl.hi+(sel.b==='api'?cl.hi:0)>S.wallet) warn=t('why.rv',{w:t('ui.warn.wallet')});
  const mh=manualHrs(is), ec=evalCost(model(sel.v,sel.m),sel.v), rc=researchCost(model(sel.v,sel.m),sel.v);
  const blocked=S.outage===sel.v||!!cnBlock(is,sel.v,model(sel.v,sel.m))||!!hwBlock(model(sel.v,sel.m))||(sel.b==='local'&&localBusy());
  if(is.inv) return invDispatch(is,{e,cl,segs,rows,warn,blocked});
  return `<p class="dpt">${issueTitle(is)}</p>
  <div class="sec"><label>${t('ui.dp.presets')}</label><div class="seg">${S.presets.map((p,i)=>`<button class="sb ${presetIs(p)?'sel':''}" data-load="${i}">${t('ui.dp.load',{p:PN[i]})}<small>${model(p.v,p.m).name}${S.advanced&&p.ef!==1?`${sp}${t('ui.dp.effortTag',{name:EFFORT[p.ef].name})}`:''}${sp}${BILL_LABEL[p.b]}${sp}${REVIEW[p.rv].name}${lv(S.inv.sdd)?`${sp}SDD ${SDD_NAME[sddLevel(p.sdd)]}`:''}${reviewer(p)?`${sp}${t('ui.dp.rvTag',{m:model(p.rvv,p.rvm).name})}`:''}</small></button>`).join('')}</div></div>
  <div class="est">
    <div><label>${t('ui.dp.estTk')}</label><b>${kt(e.lo+e.rlo)}–${kt(e.hi+e.rhi)}</b></div>
    <div><label>${cl.t}</label><b>${costTxt(cl)}</b></div>
    ${rcl?`<div><label>${t('ui.dp.rvCost',{t:rcl.t})}</label><b>${costTxt(rcl)}</b></div>`:''}
    <div><label>${t('ui.dp.p')}${sel.rv||is.store?t('ui.dp.pRaw',{p:Math.round(e.p*100)}):''}</label><b class="${pc}">${Math.round(e.pe*100)}%</b></div>
    <div><label>${PAR()?t('ui.dp.runHrs'):t('ui.dp.workHrs')}</label><b>${h1(e.hrs)}h</b></div>
  </div>
  ${stackHint(is)?`<p class="hint">${stackHint(is)}</p>`:''}
  ${invHint(is)?`<p class="hint">${invHint(is)}</p>`:''}
  ${PAR()&&S.jobs.length?`<p class="hint">${t('ui.dp.parHint',{n:S.jobs.length,x:reviewLoad().toFixed(2),max:Math.round(CONFLICT_MAX*100)})}</p>`:''}
  <div class="warnline">${warn}</div>
  <div class="actions">
    <button class="btn primary" data-act="go" ${blocked||S.hours<.2?'disabled':''}>${t(PAR()?'ui.dp.goPar':'ui.dp.go',{agent:VENDORS[sel.v].agent})}</button>
    <button class="btn ghost" data-act="manual" ${mh>S.hours||manualBlocked()?'disabled':''}>${manualBlocked()?t('ui.dp.manualBlocked'):t('ui.dp.manual',{h:h1(mh)})}</button>
    ${is.research?`<button class="btn ghost" data-act="research" ${researchBlock(is,'agent')?'disabled':''}>${t('ui.dp.research',{tk:kt(rc.tk),h:h1(rc.hrs)})}</button>
    <button class="btn ghost" data-act="selfresearch" ${researchBlock(is,'self')?'disabled':''}>${t('ui.dp.selfResearch',{h:h1(selfResearchHrs(is))})}</button>`:''}
    ${canEvaluate(is)?`<button class="btn ghost" data-act="eval" ${blocked||ec.hrs>S.hours?'disabled':''}>${t('ui.dp.eval',{tk:kt(ec.tk),h:h1(ec.hrs)})}</button>`:''}
    ${is.revealed&&!is.rescoped&&!is.out?`<button class="btn ghost" data-act="rescope">${t('ui.dp.rescope')}</button>`:''}
    ${canAbandon(is)?abandonBtn(is):''}
  </div>
  <p class="dptune">${t('ui.dp.tune')}</p>
  <div class="sec"><label>${t('ui.dp.pick')}</label>${rows}</div>
  <div class="sec"><label>${t('ui.dp.bill')}</label><div class="seg">${segs}</div>${S.seats.length&&!S.seats.includes(sel.v)?`<p class="hint">${t('ui.dp.seatHint',{seats:S.seats.map(v=>VENDORS[v].name).join(ls),agents:S.seats.map(v=>VENDORS[v].agent).join(ls)})}</p>`:''}</div>
  <div class="sec"><label>${t('ui.dp.review')}</label><div class="seg">${REVIEW.map((r,i)=>`<button class="sb ${sel.rv===i?'sel':''}" data-rv="${i}">${r.name}<small>${i?t('ui.dp.reviewDesc',{tk:r.tk,p:Math.round(est(is,sel.v,sel.m,i).c*100)}):t('ui.dp.reviewNone')}</small></button>`).join('')}</div></div>
  ${reviewerRows(is)}
  ${S.advanced?`<div class="sec"><label>${t('ui.dp.effort')}</label><div class="seg">${EFFORT.map((f,i)=>`<button class="sb ${sel.ef===i?'sel':''}" data-ef="${i}">${f.name}<small>${f.cap?t('ui.dp.effortDesc',{sign:f.cap>0?'+':'−',n:Math.abs(f.cap),tk:f.tk,hrs:f.hrs}):t('ui.dp.effortMid')}</small></button>`).join('')}</div></div>`:''}
  ${sddRow()}
  <div class="sec"><label>${t('ui.dp.savePresets')}</label><div class="seg">${PN.map((n,i)=>`<button class="sb" data-save="${i}">${t('ui.dp.save',{p:n})}<small>${t('ui.dp.saveSub')}</small></button>`).join('')}</div></div>`;
}

