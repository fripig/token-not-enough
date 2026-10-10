import {RESEARCH_DIRECT_TK,RESEARCH_HRS,RESEARCH_SELF_HRS,RESEARCH_SPLIT,RESEARCH_TK,APIV,BIG,BILL_LABEL,CATCH,CI_CONFLICT,CLIENTS,CONFLICT,EFFORT,EVAL_HRS,FASTLANE_REJECT,HARD_KPI,HOOK_PR,HW,HW_IDLE,HW_KEYS,HW_REQ_HRS,HW_SETUP_HRS,INC_KPI,INVEST,INV_KEYS,KPI,BASE,LATE_KPI,MANUAL_HRS,MCP_EVAL_HRS,MCP_REVEAL,MONITOR_KPI,MONITOR_LATE,PN,PR_HRS,PR_REVIEWED,RESCOPE,RETRY,REVEAL,SCAN_AUDIT,SDD_EG,SDD_NAME,SDD_TRAP_STOP,SEAT,STACK_HRS,STORE_RATE,UNFAMILIAR_HRS,VENDORS,kt,nt,AI_MAX,AI_P,CONF,CONF_CATS,CONF_KEYS,CONF_LAST_DAY,CONF_MANUAL,MD_P,SKILLS_CX,TEST_CATCH,STACKS} from './data.js';
import {GIG_LATE,GIG_PAY,RESEARCH_RATE,START,TRAP_RATE} from './state.js';
import {P_STEP,REVIEW,STORE_REJECT} from './calc.js';
import {CANCEL_MIN,AUDIT_ODDS,AUDIT_TRUST,CORP_DAY_LIMIT,CORP_DAY_TRUST,DOUBT_TRUST,EVAL_TK,EVENT_RATE,INC_LATE_TRUST,INC_RAMP,INC_RATE,LATE_TRUST,OVERDRAFT_TRUST,OVERNIGHT_HRS,PACE_KPI,PRAISE_TRUST,RESCOPE_TRUST,REVIEW_LOAD,SLOT_CHOICES,TRAP_STOP} from './actions.js';
import {GRADES,PAR_GRADE,SCORE} from './modals.js';
import {mo,ov} from './view.js';
import {t} from './i18n.js';

/* ===== 規則速查：數字一律從遊戲常數插值，改數值時這裡跟著變；文字在字典的 rules.* ===== */
export const RULE_TABS=['basic','dispatch','billing','tickets','invest','score'].map(id=>({id,get title(){return t(`rules.tab.${id}`);}}));
export let ruleTab='basic';
export const pct=x=>`${Math.round(x*1000)/10}%`;
export const rtag=s=>`<span class="rtag">${s}</span>`;
export const rtable=(head,rows)=>`<div class="rtw"><table class="rt"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td data-h="${head[i]}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const rlist=items=>`<ul class="rules">${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
export const rsec=(title,body)=>`<div class="rsec"><h3>${title}</h3>${body}</div>`;
const banText=ban=>t(`rules.ban.${ban}`);
/* 字典裡的規則句子；tag 是平行模式、接外包這類標籤 */
const r=(k,p)=>t(`rules.${k}`,p);
const tag=k=>rtag(t(`rules.tag.${k}`));

export function rulesTab(id){
  const ls=t('sep.list');
  switch(RULE_TABS.some(x=>x.id===id)?id:'basic'){
  case 'dispatch': return rsec(r('h.p'),`${rtable([r('th.capGap'),r('th.p')],[[r('gap.up'),pct(P_STEP[0])],['0',pct(P_STEP[1])],['−1',pct(P_STEP[2])],['−2',pct(P_STEP[3])],[r('gap.down'),pct(P_STEP[4])]])}
    ${rlist([r('big',{p:pct(BIG.p),tk:BIG.tk}),
      r('retry',{tk:RETRY.tk,hrs:RETRY.hrs}),
      `${tag('adv')}${r('effortSee')}`])}`)
    +rsec(r('h.review'),`${rtable([r('th.level'),'token',r('th.time'),r('th.catch')],REVIEW.map((rv,i)=>[rv.name,`×${rv.tk}`,`×${rv.hrs}`,i===0?'0':r('catchFormula',{base:CATCH.base,per:CATCH.per,strict:i===2?` + ${CATCH.strict}`:'',max:pct(CATCH.max)})]))}
    ${rlist([r('review1'),r('review2')])}`)
    +rsec(r('h.stack'),rlist([
      r('stack.conv'),
      r('stack.rust',{x:STACK_HRS.rust}),
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
      `<b>${BILL_LABEL.corp}</b>${r('bill.corp',{vendors:APIV.filter(v=>VENDORS[v].corp).map(v=>VENDORS[v].name).join(ls),limit:nt(CORP_DAY_LIMIT),n:CORP_DAY_TRUST,od:OVERDRAFT_TRUST})}`,
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
    ${rlist([r('inc',{ramp:pct(INC_RAMP),max:pct(INC_RATE),kpi:INC_KPI,mkpi:MONITOR_KPI}),
      r('late',{kpi:pct(LATE_KPI),n:LATE_TRUST,inc:INC_LATE_TRUST,mon:MONITOR_LATE}),
      r('unfam',{x:UNFAMILIAR_HRS})])}`)
    +rsec(r('h.trap'),rlist([
      r('trap1',{p:pct(TRAP_RATE)}),
      r('trap2',{stop:pct(TRAP_STOP),n1:SDD_NAME[1],s1:pct(SDD_TRAP_STOP[1]),n2:SDD_NAME[2],s2:pct(SDD_TRAP_STOP[2])}),
      r('trap3',{tk:EVAL_TK,h:EVAL_HRS,base:REVEAL.base,per:REVEAL.per,max:pct(REVEAL.max),mcp:pct(MCP_REVEAL),mh:MCP_EVAL_HRS}),
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
  case 'invest': return rsec(r('h.invest'),`${rtable([r('th.inv'),r('th.hrs'),r('th.corp'),r('th.effect')],['md',...INV_KEYS].flatMap(k=>{const I=INVEST[k];return [[`${I.name}${k==='md'?r('mdEach'):''}${k==='ai'?r('aiEach',{n:AI_MAX}):''}`,`${I.hrs}h`,nt(I.cost),I.desc],
      ...(I.lv2?[[`${I.name} Lv2`,`${I.lv2.hrs}h`,nt(I.lv2.cost),I.lv2.desc]]:[])];}))}
    ${rlist([r('inv1'),
      r('inv2',{sdd:INVEST.sdd.name,scan:INVEST.scan.name,skills:INVEST.skills.name,tests:INVEST.tests.name,md:pct(MD_P[2]),tc:pct(TEST_CATCH[2]),sa:SCAN_AUDIT[2],cx:SKILLS_CX[2]}),
      r('inv3',{ai:INVEST.ai.name,p:pct(AI_P)})])}`)
    +rsec(r('h.conf'),`${rtable([r('th.conf'),r('th.cat'),r('th.stacks'),r('th.fee')],CONF_KEYS.map(k=>{const C=CONF[k];return [C.name,CONF_CATS[C.cat],C.stacks.map(st=>STACKS[st].name).join(ls)||'—',nt(C.fee)];}))}
    ${rlist([r('conf1',{last:CONF_LAST_DAY}),
      r('conf2'),
      r('conf3',{x:CONF_MANUAL})])}`)
    +rsec(r('h.hw'),`${rtable([r('th.hw'),r('th.price'),r('th.trust'),r('th.arrive'),r('th.effect')],HW_KEYS.map(k=>{const H=HW[k];return [H.name,H.price,H.trust,r('days',{n:H.days}),H.desc];}))}
    ${rlist([r('hw1',{h:HW_REQ_HRS,setup:HW_SETUP_HRS}),
      r('hw2'),
      r('hw3',{n:HW_IDLE})])}`);
  case 'score': return rsec(r('h.score'),rlist([
      r('score1',{kpi:SCORE.kpi,trust:SCORE.trust,audit:SCORE.audit}),
      r('score2')]))
    +rsec(r('h.grade'),`${rtable([r('th.grade'),r('th.serial'),r('th.par')],GRADES.map((g,i)=>['SABC'[i],g,Math.round(g*PAR_GRADE)]).concat([['D',r('below'),r('below')]]))}
    ${rlist([r('best')])}`)
    +rsec(r('h.save'),rlist([r('save1'),r('save2')]));
  default: return rsec(r('h.time'),rlist([
      r('time1',{h:START.hours}),
      r('time2',{wallet:nt(START.wallet),corp:nt(START.corp),trust:START.trust}),
      r('time3'),
      r('time4',{p:pct(EVENT_RATE)}),
      r('time5',{x:PACE_KPI,up:PRAISE_TRUST,down:DOUBT_TRUST})]))
    +rsec(r('h.mode'),rlist([
      r('mode1'),
      `${tag('par')}${r('mode2',{a:SLOT_CHOICES[0],b:SLOT_CHOICES[SLOT_CHOICES.length-1]})}`,
      `${tag('par')}${r('mode3',{h:PR_HRS,rv:PR_REVIEWED,hook:HOOK_PR,load:pct(REVIEW_LOAD)})}`,
      `${tag('par')}${r('mode4',{p:pct(CONFLICT),ci:CI_CONFLICT})}`,
      `${tag('par')}${r('mode5',{h:OVERNIGHT_HRS})}`,
      `${tag('par')}${r('mode6',{p:pct(CANCEL_MIN)})}`]))
    +rsec(`${r('h.effort')} ${tag('adv')}`,rtable([r('th.effort'),r('th.cap'),'token',r('th.time')],EFFORT.map(e=>[e.name,e.cap>0?`+${e.cap}`:e.cap<0?`${e.cap}`:r('same'),`×${e.tk}`,`×${e.hrs}`])));
  }
}
/* 規則 modal：back 是從其他彈窗打開時，關閉後回到那個彈窗的函式 */
export function showRules(back){
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
