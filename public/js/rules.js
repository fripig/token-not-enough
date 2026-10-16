import {ACCEPT_HRS,BURN_PTS,BURN_SEAT_VALUE,CAP_SCALE,WEAK_CAP,P_TOP,RESEARCH_DIRECT_TK,RESEARCH_HRS,RESEARCH_SELF_HRS,RESEARCH_SPLIT,RESEARCH_TK,APIV,BIG,BILL_LABEL,CATCH,CI_CONFLICT,CONFLICT_MAX,CLIENTS,CONFLICT,EFFORT,EVAL_HRS,FASTLANE_REJECT,HARD_KPI,HOOK_PR,HW,HW_IDLE,HW_KEYS,HW_REQ_HRS,HW_SETUP_HRS,INC_KPI,INVEST,INV_KEYS,KPI,BASE,LATE_KPI,MANUAL_HRS,MCP_EVAL_HRS,MCP_REVEAL,MONITOR_KPI,MONITOR_LATE,PN,PR_HRS,PR_REVIEWED,RESCOPE,RETRY,REVEAL,SCAN_AUDIT,SDD_EG,SDD_NAME,SDD_TRAP_STOP,SEAT,STACK_HRS,STORE_RATE,UNFAMILIAR_HRS,VENDORS,kt,nt,AI_MAX,AI_P,CONF,CONF_CATS,CONF_KEYS,CONF_LAST_DAY,CONF_MANUAL,MD_P,SKILLS_CX,TEST_CATCH,STACKS,INV_Q,INV_CX,INV_ON} from './data.js';
import {GIG_LATE,GIG_PAY,RESEARCH_RATE,SIX_DAY,SIX_RATE,START,TRAP_RATE,S} from './state.js';
import {P_STEP,REVIEW,STORE_REJECT,pStep,invQ,mdTk,mdP,testCatch,ciMul,hookMul,scanMul,storeReject,monOn,skillsLv,mcpReveal,mcpEvalHrs,sddP,sddStop} from './calc.js';
import {ABANDON_TRUST,CANCEL_MIN,AUDIT_ODDS,AUDIT_TRUST,CORP_DAY_LIMIT,CORP_DAY_TRUST,DOUBT_TRUST,EVAL_TK,EVENT_RATE,INC_LATE_TRUST,INC_RAMP,INC_RATE,LATE_TRUST,OVERDRAFT_TRUST,OVERNIGHT_HRS,PACE_KPI,PRAISE_TRUST,RESCOPE_TRUST,REVIEW_LOAD,TRAP_STOP,invLevel} from './actions.js';
import {GRADES,SCORE} from './modals.js';
import {mo,ov} from './view.js';
import {t} from './i18n.js';
import {NEWS,newsList} from './news.js';

/* ===== 規則速查：數字一律從遊戲常數插值，改數值時這裡跟著變；文字在字典的 rules.* ===== */
export const RULE_TABS=['basic','dispatch','billing','tickets','invest','score','news'].map(id=>({id,get title(){return t(`rules.tab.${id}`);}}));
export let ruleTab='basic';
/* 審核多出來的倍率（×1.3 → 0.3），避開浮點尾數 */
export const x1=m=>Math.round((m-1)*100)/100;
export const pct=x=>`${Math.round(x*1000)/10}%`;
export const rtag=s=>`<span class="rtag">${s}</span>`;
export const rtable=(head,rows)=>`<div class="rtw"><table class="rt"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td data-h="${head[i]}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const rlist=items=>`<ul class="rules">${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
export const rsec=(title,body)=>`<div class="rsec"><h3>${title}</h3>${body}</div>`;
/* 投資表的「目前」那行：已買但有一級品質不到 100% 時，寫各級品質與打折後實際生效的數值（gh-64-01） */
const r2=x=>Math.round(x*100)/100;
export function invNow(k){
  const lvq=(k,st)=>{const L=invLevel(k,st); if(!L) return null; const qs=Array.from({length:L},(_,i)=>invQ(k,st,i+1)); return qs.every(q=>q===1)?null:qs.map((q,i)=>r('nowLv',{l:i+1,q:pct(q)})).join(t('sep.list'));};
  const line=(q,eff)=>`<br><small class="invnow">${r('now',{q,eff})}</small>`;
  const sw=on=>on?r('now.on'):r('now.off',{on:pct(INV_ON)});
  if(k==='md') return Object.keys(S.inv.md).map(st=>{const q=lvq('md',st); return q?line(q,r('now.md',{st:STACKS[st].name,tk:r2(mdTk(st)),p:pct(mdP(st))})):'';}).join('');
  const q=INV_CX[k]?lvq(k,null):null; if(!q) return '';
  const eff={tests:()=>r('now.tests',{p:pct(testCatch())}),ci:()=>r('now.ci',{x:r2(ciMul())}),hook:()=>r('now.hook',{x:r2(hookMul())}),scan:()=>r('now.scan',{x:r2(scanMul())}),
    fastlane:()=>r('now.fastlane',{p:pct(storeReject())}),monitor:()=>sw(monOn()),skills:()=>skillsLv()?r('now.skills',{cx:SKILLS_CX[skillsLv()]}):sw(false),
    mcp:()=>r('now.mcp',{p:pct(mcpReveal()),x:r2(mcpEvalHrs())}),
    sdd:()=>Array.from({length:invLevel('sdd',null)},(_,i)=>r('now.sdd',{name:SDD_NAME[i+1],p:pct(sddP(i+1)),s:pct(sddStop(i+1))})).join(t('sep.semi'))}[k];
  return line(q,eff());
}
const banText=ban=>t(`rules.ban.${ban}`);
/* 字典裡的規則句子；tag 是平行模式、接外包這類標籤 */
const r=(k,p)=>t(`rules.${k}`,p);
const tag=k=>rtag(t(`rules.tag.${k}`));

export function rulesTab(id){
  const ls=t('sep.list');
  switch(RULE_TABS.some(x=>x.id===id)?id:'basic'){
  case 'dispatch': return rsec(r('h.p'),`${rtable([r('th.capGap',{d:CAP_SCALE}),r('th.p')],P_STEP.map((p,i)=>{const g=P_TOP-i*CAP_SCALE;return [i===0?r('gap.up',{n:g}):i===P_STEP.length-1?r('gap.down',{n:-g}):g>0?`+${g}`:g<0?`−${-g}`:'0',pct(p)];}))}
    ${rlist([r('gap.interp',{g:`${CAP_SCALE/2}`,p:pct(pStep(CAP_SCALE/2))}),r('failCut',{p:pct(P_STEP[2]),md:pct(MD_P[2]),x:pct(1-(1-P_STEP[2])*(1-MD_P[2]))}),r('big',{g:BIG.gap,tk:BIG.tk,w:WEAK_CAP}),
      r('retry',{tk:RETRY.tk,hrs:RETRY.hrs}),
      `${tag('adv')}${r('effortSee')}`])}`)
    +rsec(r('h.review'),`${rtable([r('th.level'),'token',r('th.time'),r('th.catch')],REVIEW.map((rv,i)=>[rv.name,`×${rv.tk}`,`×${rv.hrs}`,i===0?'0':r('catchFormula',{base:CATCH.base,per:CATCH.per,d:CAP_SCALE,strict:i===2?` + ${CATCH.strict}`:'',max:pct(CATCH.max)})]))}
    ${rlist([r('review1'),r('review2'),r('review3',{name:INVEST.xreview.name,h:INVEST.xreview.hrs,cost:nt(INVEST.xreview.cost),tk1:x1(REVIEW[1].tk),tk2:x1(REVIEW[2].tk),h1:x1(REVIEW[1].hrs),h2:x1(REVIEW[2].hrs)})])}`)
    +rsec(r('h.stack'),rlist([
      r('stack.conv'),
      r('stack.rust',{x:STACK_HRS.rust,w:WEAK_CAP}),
      r('stack.app',{x:STACK_HRS.app,store:pct(STORE_RATE),reject:pct(STORE_REJECT),fast:pct(FASTLANE_REJECT)}),
      r('stack.devops',{x:STACK_HRS.devops}),
      r('stack.hard',{x:HARD_KPI}),
      r('stack.sre')]))
    +rsec(r('h.presets'),rlist([
      r('presets',{list:PN.join(t('rules.slash')),order:PN.join('→')}),
      r('sdd',{inv:INVEST.sdd.name,off:SDD_NAME[0],n1:SDD_NAME[1],eg1:SDD_EG[1],n2:SDD_NAME[2],eg2:SDD_EG[2]}),
      r('batch'),
      r('manual',{h:MANUAL_HRS,x:UNFAMILIAR_HRS})]));
  case 'billing': return rsec(r('h.bill'),rlist([
      `<b>${BILL_LABEL.sub}</b>${r('bill.sub')}`,
      `<b>${BILL_LABEL.seat}</b>${r('bill.seat',{day:kt(SEAT.day),week:kt(SEAT.week)})}`,
      `<b>${BILL_LABEL.api}</b>${r('bill.api')}`,
      `<b>${BILL_LABEL.corp}</b>${r(S.corpApi.length?'bill.corp':'bill.corpNone',{vendors:S.corpApi.map(v=>VENDORS[v].name).join(ls),limit:nt(CORP_DAY_LIMIT),n:CORP_DAY_TRUST,od:OVERDRAFT_TRUST})}`,
      `<b>${BILL_LABEL.local}</b>${r('bill.local',{tag:tag('par')})}`,
      `${tag('gig')}${r('bill.gig')}`]))
    +rsec(r('h.audit'),rlist([
      r('audit',{base:pct(AUDIT_ODDS.base),cn:pct(AUDIT_ODDS.cn),n:AUDIT_TRUST,s:SCORE.audit}),
      r('auditScan',{x:SCAN_AUDIT[1]})]))
    +rsec(r('h.seat'),rlist([
      r('seat1',{n:SEAT.vendors.length,vendors:SEAT.vendors.map(v=>VENDORS[v].name).join(ls),days:SEAT.review}),
      r('seat2',{nth:SEAT.trust.map((_,i)=>i+1).join(t('rules.slash')),trust:SEAT.trust.join(t('rules.slash'))})]))
    +rsec(r('h.client'),`${rtable([r('th.client'),r('th.cn')],CLIENTS.map(c=>[c.name,banText(c.ban)]))}${rlist([r('client1'),r('client2')])}`);
  case 'tickets': return rsec(r('h.tickets'),`${rtable([r('th.cx'),r('th.base'),'KPI'],BASE.slice(1).map((b,i)=>[i+1,kt(b),KPI[i+1]]))}
    ${rlist([r('six',{day:SIX_DAY,p:pct(SIX_RATE)}),r('inc',{ramp:pct(INC_RAMP),max:pct(INC_RATE),kpi:INC_KPI,mkpi:MONITOR_KPI}),
      r('late',{kpi:pct(LATE_KPI),n:LATE_TRUST,inc:INC_LATE_TRUST,mon:MONITOR_LATE}),
      r('abandon',{n:ABANDON_TRUST,gig:pct(GIG_LATE)}),
      r('unfam',{x:UNFAMILIAR_HRS})])}`)
    +rsec(r('h.trap'),rlist([
      r('trap1',{p:pct(TRAP_RATE)}),
      r('trap2',{stop:pct(TRAP_STOP),n1:SDD_NAME[1],s1:pct(SDD_TRAP_STOP[1]),n2:SDD_NAME[2],s2:pct(SDD_TRAP_STOP[2])}),
      r('trap3',{tk:EVAL_TK,h:EVAL_HRS,base:REVEAL.base,per:REVEAL.per,d:CAP_SCALE,max:pct(REVEAL.max),mcp:pct(MCP_REVEAL),mh:MCP_EVAL_HRS}),
      r('trap4',{trust:RESCOPE_TRUST,ok:RESCOPE.ok,days:RESCOPE.days,no:RESCOPE.no})]))
    +rsec(r('h.research'),rlist([
      r('res1',{p:pct(RESEARCH_RATE)}),
      r('res2',{x:RESEARCH_DIRECT_TK}),
      r('res3',{tk:RESEARCH_TK,h:RESEARCH_HRS}),
      r('res4',{h:RESEARCH_SELF_HRS,x:UNFAMILIAR_HRS}),
      r('res5',{split:Object.entries(RESEARCH_SPLIT).map(([c,[a,b]])=>r('resSplit',{c,a,b})).join(ls)})]))
    +rsec(`${r('h.gig')} ${tag('gig')}`,rlist([
      r('gig1',{pay:GIG_PAY}),
      r('gig2',{p:pct(GIG_LATE)})]));
  case 'invest': return rsec(r('h.invest'),`${rtable([r('th.inv'),r('th.hrs'),r('th.corp'),r('th.effect')],['md',...INV_KEYS].flatMap(k=>{const I=INVEST[k];return [[`${I.name}${k==='md'?r('mdEach'):''}${k==='ai'?r('aiEach',{n:AI_MAX}):''}`,`${I.hrs}h`,nt(I.cost),I.desc+invNow(k)],
      ...(I.lv2?[[`${I.name} Lv2`,`${I.lv2.hrs}h`,nt(I.lv2.cost),I.lv2.desc]]:[])];}))}
    ${rlist([r('inv1'),
      r('inv2',{sdd:INVEST.sdd.name,scan:INVEST.scan.name,skills:INVEST.skills.name,tests:INVEST.tests.name,md:pct(MD_P[2]),tc:pct(TEST_CATCH[2]),sa:SCAN_AUDIT[2],cx:SKILLS_CX[2]}),
      r('inv3',{ai:INVEST.ai.name,p:pct(AI_P)})])}`)
    +rsec(`${r('h.invTicket')} ${tag('par')}`,rlist([
      r('invT1'),
      r('invT2',{q:INV_Q.slice(1).map(([g,q])=>r('invTq',{g:-g,q:pct(q)})).join(ls),cx:Object.keys(INV_CX).map(k=>`${INVEST[k].name} ${INV_CX[k].join(r('invTlv'))}`).join(ls),d:CAP_SCALE}),
      r('invTacc',{p:pct(ACCEPT_HRS),a:INVEST.tests.hrs,b:INVEST.tests.hrs*ACCEPT_HRS}),
      r('invT3',{on:pct(INV_ON)}),
      r('invT4')]))
    +rsec(r('h.conf'),`${rtable([r('th.conf'),r('th.cat'),r('th.stacks'),r('th.fee')],CONF_KEYS.map(k=>{const C=CONF[k];return [C.name,CONF_CATS[C.cat],C.stacks.map(st=>STACKS[st].name).join(ls)||'—',nt(C.fee)];}))}
    ${rlist([r('conf1',{last:CONF_LAST_DAY}),
      r('conf2'),
      r('conf3',{x:CONF_MANUAL})])}`)
    +rsec(r('h.hw'),`${rtable([r('th.hw'),r('th.price'),r('th.trust'),r('th.arrive'),r('th.effect')],HW_KEYS.map(k=>{const H=HW[k];return [H.name,H.price,H.trust,r('days',{n:H.days}),H.desc];}))}
    ${rlist([r('hw1',{h:HW_REQ_HRS,setup:HW_SETUP_HRS}),
      r('hw2'),
      r('hw3',{n:HW_IDLE})])}`);
  /* 最近更新的完整紀錄，新的在前（gh-66-01） */
  case 'news': return newsList(NEWS);
  case 'score': return rsec(r('h.score'),rlist([
      r('score1',{kpi:SCORE.kpi,trust:SCORE.trust,audit:SCORE.audit}),
      r('score2')]))
    +rsec(r('h.grade'),`${rtable([r('th.grade'),r('th.serial'),r('th.par')],GRADES.serial.map((g,i)=>['SABC'[i],g,GRADES.parallel[i]]).concat([['D',r('below'),r('below')]]))}
    ${rlist([r('best')])}`)
    +rsec(r('h.burn'),`${rlist([r('burn1',{seat:nt(BURN_SEAT_VALUE)}),
      r('burn2'),
      r('burn3',{s:BURN_PTS.serial,p:BURN_PTS.parallel.toLocaleString('en-US'),c:nt(CORP_DAY_LIMIT)})])}
    ${rtable([r('th.grade'),r('th.serial'),r('th.par')],GRADES.burnSerial.map((g,i)=>['SABC'[i],g,GRADES.burnParallel[i]]).concat([['D',r('below'),r('below')]]))}`)
    +rsec(r('h.save'),rlist([r('save1'),r('save2')]));
  default: return rsec(r('h.time'),rlist([
      r('time1',{h:START.hours}),
      r('time2',{wallet:nt(START.wallet),corp:nt(START.corp),trust:START.trust}),
      r('time3'),
      r('time4',{p:pct(EVENT_RATE)}),
      r('time5',{x:PACE_KPI,up:PRAISE_TRUST,down:DOUBT_TRUST})]))
    +rsec(r('h.mode'),rlist([
      r('mode1'),
      `${tag('par')}${r('mode2')}`,
      `${tag('par')}${r('mode3',{h:PR_HRS,rv:PR_REVIEWED,hook:HOOK_PR,load:pct(REVIEW_LOAD)})}`,
      `${tag('par')}${r('mode4',{p:pct(CONFLICT),ci:CI_CONFLICT,max:pct(CONFLICT_MAX)})}`,
      `${tag('par')}${r('mode5',{h:OVERNIGHT_HRS})}`,
      `${tag('par')}${r('mode6',{p:pct(CANCEL_MIN)})}`]))
    +rsec(`${r('h.effort')} ${tag('adv')}`,rtable([r('th.effort'),r('th.cap'),'token',r('th.time')],EFFORT.map(e=>[e.name,e.cap>0?`+${e.cap}`:e.cap<0?`${e.cap}`:r('same'),`×${e.tk}`,`×${e.hrs}`])));
  }
}
/* 規則 modal：back 是從其他彈窗打開時，關閉後回到那個彈窗的函式；tab 是要直接打開的分頁（最近更新彈窗開「更新」） */
export function showRules(back,tab){
  if(tab&&RULE_TABS.some(x=>x.id===tab)) ruleTab=tab;
  const draw=()=>{
    mo.innerHTML=`<h2>${r('title')}</h2>
    <div class="seg rtabs">${RULE_TABS.map(x=>`<button class="sb ${x.id===ruleTab?'sel':''}" data-rtab="${x.id}">${x.title}</button>`).join('')}</div>
    <div class="rbody">${rulesTab(ruleTab)}</div>
    <small class="rnote">${r('note')}</small>
    <div class="actions"><button class="btn" data-act="close">${r('close')}</button></div>`;
  };
  draw(); ov.hidden=false;
  mo.onclick=e=>{
    const bt=e.target.closest('button'); if(!bt) return;
    if(bt.dataset.rtab){ruleTab=RULE_TABS.some(x=>x.id===bt.dataset.rtab)?bt.dataset.rtab:'basic';draw();}
    else if(bt.dataset.act==='close'){if(back)back();else ov.hidden=true;}
  };
}
