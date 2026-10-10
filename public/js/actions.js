import {RESEARCH_HRS,RESEARCH_SELF_HRS,RESEARCH_SPLIT,RESEARCH_TK,UNFAMILIAR_HRS,cnBlock,MCP_EVAL_HRS,CI_CONFLICT,PR_REVIEWED,CONFLICT,EVAL_HRS,LATE_KPI,PR_HRS,RESCOPE,RETRY,REVEAL,HARD_KPI,APIV,BASE,BILL_LABEL,COMPANIES,EFFORT,FASTLANE_REJECT,HOOK_PR,HW,PC_SPEED,HW_IDLE,HW_KEYS,HW_REQ_HRS,HW_SETUP_HRS,INVEST,INV_KEYS,KPI,MCP_REVEAL,MONITOR_LATE,MD_P,MD_TK,PN,R,SCAN_AUDIT,SDD_EG,SDD_NAME,SDD_P,SDD_TK,SDD_TRAP_STOP,SEAT,STACKS,SUBV,TEST_CATCH,VENDORS,effModel,efOf,h1,kt,model,nt,objOf,pick,rnd,AI_MAX,AI_P,CONF,CONF_CATS,CONF_LAST_DAY,CONF_LV2,CONF_MANUAL,SKILLS_CX,lv} from './data.js';
import {GIG_LATE,START,S,addGigs,nextId,daySnap,hardStack,makeIssue,saveGame,sel,track,unfamiliar,confCat,confCount,confStacks,issueTitle} from './state.js';
import {REVIEW,sddLevel,bills,est,hwBlock,localBusy,localSpeed,log,manualBlocked,manualHrs,presetFor,quotaLeft,storeReject,useQuota,gigBlocked} from './calc.js';
import {render} from './view.js';
import {showDay,showEnd} from './modals.js';
import {t} from './i18n.js';

/* ===== 動作 ===== */
export const PAR=()=>S.mode==='parallel';
export const queueOrder=(a,b)=>a.due-b.due||b.kpi-a.kpi;
export const SLOT_CHOICES=[2,3,4,5,6];
export const clock=el=>{const m=Math.round((9+el)*60);return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
/* 還沒曝光的陷阱題照真實複雜度跑；模型能力不夠就做到一半停下來 */
export const TRAP_STOP=.4;
/* 陷阱停下來的紀錄，依套用的 SDD 等級 */
export const TRAP_NOTE=['log.trapNote0','log.trapNote1','log.trapNote2'];
export const hiddenTrap=is=>is.trap&&!is.revealed;
export const trueView=is=>hiddenTrap(is)?{...is,cx:is.trueCx,base:is.trueBase}:is;
export function reveal(is){ if(!hiddenTrap(is)) return; is.shownCx=is.cx; is.cx=is.trueCx; is.base=is.trueBase; is.revealed=true; }
export function makeJob(is){
  const hidden=hiddenTrap(is), e=est(trueView(is),sel.v,sel.m);
  const sdd=sddLevel(), stop=hidden&&e.M.cap<is.trueCx, f=stop?(sdd?SDD_TRAP_STOP[sdd]:TRAP_STOP):1;
  const ok=!stop&&Math.random()<e.p, tk=e.tk*f*R(.7,1.3), n=R(.8,1.2);
  /* shownHrs：畫面與紀錄看到的預估，陷阱曝光前照顯示的複雜度算，才不會從時間看出陷阱；實際跑 hrs */
  return {issue:is,v:sel.v,m:sel.m,ef:efOf(sel.ef),b:sel.b,M:e.M,rv:sel.rv,tk,hrs:e.hrs*f*n,shownHrs:(hidden?est(is,sel.v,sel.m).hrs:e.hrs*f)*n,ok,caught:!stop&&!ok&&Math.random()<e.c,left:0,hidden,stop,sdd,research:!!is.research};
}
/* GA：派工與結果共用的選擇參數；舊存檔的 job 沒有 m、ef，sdd 是布林 */
export const RV_ID=['none','self','strict'];
export const SDD_ID=['none','md','framework'];
export const jobChoice=j=>({vendor:j.v,model:j.m??'unknown',bill:j.b,review:RV_ID[j.rv],effort:EFFORT[j.ef??1].id,sdd:SDD_ID[lv(j.sdd)]});
/* 目前選的付費方式能不能用（錢包見底、沒訂閱、外包不能用公司資源等，同派工台的按鈕） */
/* 紀錄裡的「agent / 模型・付費方式」 */
export const who=(v,M,b)=>t('log.who',{agent:VENDORS[v].agent,model:M.name,bill:BILL_LABEL[b]});
export const billOk=is=>bills(sel.v,is).some(b=>b.id===sel.b&&b.ok);
/* via：panel（派工按鈕）、quick（一鍵派工）、batch（批次派工）；preset 是方案字母 */
export function dispatch(via='panel',preset='none'){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||!billOk(is)||hwBlock(model(sel.v,sel.m))) return;
  const pe=est(is,sel.v,sel.m).pe, j=makeJob(is);
  if(PAR()&&(S.jobs.length>=S.slots||(j.b==='local'&&localBusy()))) return;
  useHw(j.v,j.m);
  track('dispatch',{...jobChoice(j),via,preset,cx:is.cx,stack:is.stack,incident:!!is.inc,sensitive:!!is.sens,gig:!!is.out,merge:!!is.merge,research:!!is.research});
  /* 復盤用：記下派工當下看到的條件（成功率是派工台顯示的，陷阱照顯示的複雜度） */
  const sp=t('sep'), tags=[t('ui.card.cx',{cx:is.cx}),is.due<=S.day?t('ui.dueToday'):t('log.dueOn',{d:is.due}),...(is.inc?[t('ui.chip.inc')]:[]),...(is.sens?[t('ui.chip.sens')]:[]),...(is.out?[t('ui.chip.gig')]:[]),...(is.research?[t('ui.chip.research')]:[])].join(sp);
  const how=via==='quick'?t('log.via.quick',{p:preset}):via==='batch'?t('log.via.batch',{p:preset}):t('log.via.panel');
  log('dim',t('log.dispatch',{title:issueTitle(is),tags,who:who(j.v,j.M,j.b),opts:`${sp}${REVIEW[j.rv].name}${j.sdd?`${sp}SDD ${SDD_NAME[j.sdd]}`:''}`,p:Math.round(pe*100),how,h:h1(j.shownHrs)}));
  if(PAR()){
    j.left=j.hrs; is.running=true; S.jobs.push(j); sel.issue=null;
    advance(.2); render(); return;
  }
  let frac=1,note='';
  if(j.hrs>S.hours){frac=S.hours/j.hrs;note=t('log.note.eod');}
  const r=settle(j,{frac,note,fail:frac<1});
  S.hours=Math.max(0,S.hours-r.hrs);
  render();
}
/* 一鍵派工：用第一個能用的派工方案，照派工台的流程派出去 */
export const canQuick=()=>S.hours>=.2&&(!PAR()||S.jobs.length<S.slots);
export function quick(id,via='quick'){
  const is=S.issues.find(i=>i.id===id); if(!is||is.running||!canQuick()) return false;
  const {i,skip}=presetFor(is); if(i<0) return false;
  Object.assign(sel,S.presets[i],{issue:id});
  if(skip.length) log('dim',t('log.quickSkip',{p:PN[i],list:skip.map(s=>t('log.skipItem',{p:PN[s.i],r:s.r})).join(t('sep.list'))}));
  dispatch(via,PN[i]); return true;
}
export const loadPreset=i=>Object.assign(sel,S.presets[i]);
export function savePreset(i){
  S.presets[i]={v:sel.v,m:sel.m,b:sel.b,rv:sel.rv,ef:sel.ef,sdd:sel.sdd??2};
  log('dim',t('log.savePreset',{p:PN[i],who:who(sel.v,effModel(model(sel.v,sel.m),efOf(sel.ef)),sel.b),rv:REVIEW[sel.rv].name}));
}
/* 平行模式：推進時鐘，背景 agent 跑完就結算，成功的要花時間審 PR */
/* 合併衝突機率：每個還在跑的 agent +10%，CI 流水線減半 */
export const conflictRate=()=>CONFLICT*S.jobs.length*(S.inv.ci?CI_CONFLICT:1);
/* 審 PR 時數：有自我審核減半，有 pre-commit hook 再減半；其他還在跑的 agent 越多，切換成本越高 */
export const REVIEW_LOAD=.25;
export const reviewLoad=()=>1+REVIEW_LOAD*S.jobs.length;
export const prHrs=(cx,rv)=>cx*PR_HRS*(rv?PR_REVIEWED:1)*(S.inv.hook?HOOK_PR:1)*reviewLoad();
export function advance(dt){
  while(dt>1e-9&&S.hours>1e-9){
    const next=S.jobs.length?Math.min(...S.jobs.map(j=>j.left)):Infinity;
    const step=Math.min(dt,next,S.hours);
    S.jobs.forEach(j=>j.left-=step); S.hours-=step; dt-=step;
    const fin=S.jobs.filter(j=>j.left<=1e-9); S.jobs=S.jobs.filter(j=>j.left>1e-9);
    for(const j of fin){
      j.issue.running=false;
      const r=settle(j,{conflict:conflictRate()});
      if(r.ok||r.rejected){const rv=prHrs(j.issue.cx,j.rv);dt+=rv;log('dim',t('log.prReview',{h:h1(rv)}));}
    }
  }
  S.hours=Math.max(0,S.hours);
}
/* 中止的 agent 照已跑比例扣 token，至少 5% */
export const CANCEL_MIN=.05;
export const cancelFrac=j=>Math.max(CANCEL_MIN,1-j.left/j.hrs);
export function cancelJobs(pred,note){
  const out=S.jobs.filter(pred); S.jobs=S.jobs.filter(j=>!pred(j));
  out.forEach(j=>{j.issue.running=false;settle(j,{frac:cancelFrac(j),fail:true,note});});
  return out.length;
}
/* 玩家中止背景 agent：只付已跑的部分，工單原樣回佇列（不算失敗、沒有重做折扣、陷阱不曝光），不花時間 */
export function cancelJob(id){
  const j=PAR()&&S.jobs.find(x=>x.issue.id===id); if(!j) return;
  S.jobs=S.jobs.filter(x=>x!==j); j.issue.running=false;
  settle(j,{frac:cancelFrac(j),fail:true,cancel:true});
}
/* 扣款：派工與評估共用。訂閱／席位額度或個人錢包不夠時只扣剩下的，回傳 short 與實際完成比例 frac；個人 API 不會把錢包扣成負數 */
export function charge(b,v,M,tk){
  if(b==='sub'||b==='seat'){
    const need=tk*M.w, left=quotaLeft(b,v);
    if(need>left){ useQuota(b,v,left); return {spend:t('log.spend.quota',{n:kt(left)}),short:true,frac:need>0?left/need:0}; }
    useQuota(b,v,need); return {spend:t('log.spend.quota',{n:kt(need)}),short:false,frac:1};
  }
  if(b==='api'){ const c=tk*M.price*S.priceMod[v], paid=Math.min(c,Math.max(0,S.wallet)); S.wallet-=paid; S.st.api+=paid; return {spend:nt(paid),short:paid<c,frac:c>0?paid/c:1,cost:paid}; }
  if(b==='corp'){ const c=tk*M.price*S.priceMod[v]; S.corp-=c; S.corpDay+=c; S.st.corp+=c; return {spend:t('log.spend.corp',{c:nt(c)}),short:false,frac:1,cost:c}; }
  return {spend:t('log.spend.power'),short:false,frac:1};
}
/* 機敏程式碼送進個人帳號的稽核風險；派工與評估共用 */
export const auditRisk=(is,b)=>is.sens&&(b==='sub'||b==='api');
/* 資安稽核、公司帳單、逾期的信任扣分 */
export const AUDIT_ODDS={base:.35,cn:.6}, AUDIT_TRUST=12, OVERDRAFT_TRUST=8, CORP_DAY_LIMIT=1500, CORP_DAY_TRUST=6, LATE_TRUST=4, INC_LATE_TRUST=8;
export const auditOdds=v=>(VENDORS[v].cn?AUDIT_ODDS.cn:AUDIT_ODDS.base)*SCAN_AUDIT[lv(S.inv.scan)];
export function auditRoll(is,b,v){
  if(auditRisk(is,b)&&Math.random()<auditOdds(v)){
    S.trust=Math.max(0,S.trust-AUDIT_TRUST); S.st.audits++;
    log('warn',t(VENDORS[v].cn?'log.auditCn':'log.audit',{n:AUDIT_TRUST}));
  }
}
export function checkOverdraft(){ if(S.corp<0){ log('warn',t('log.overdraft')); S.trust=Math.max(0,S.trust-OVERDRAFT_TRUST); S.corp=0; } }
/* 完成工單的獎勵：外包單拿現金不拿 KPI；回傳紀錄用的文字 */
export function reward(is){
  if(is.out){S.wallet+=is.pay;S.st.outIncome+=is.pay;S.st.outDone++;return t('log.reward.gig',{n:nt(is.pay)});}
  S.kpi+=is.kpi;S.st.done++;return `KPI +${is.kpi}`;
}
export function settle(j,o={}){
  const is=j.issue,v=j.v,b=j.b,M=j.M,frac=o.frac??1;
  if(!o.cancel&&j.hidden&&hiddenTrap(is)){ reveal(is); S.st.trapHit++; }
  let tk=j.tk*frac, hrs=j.hrs*frac, ok=j.ok&&!o.fail, note=o.note||'', spend='', conflict=false, fixed=false, rejected=false;
  if(!j.ok&&j.caught&&!o.fail){tk*=1.25;ok=true;fixed=true;}
  if(!j.ok&&!j.caught&&j.rv&&!o.fail) note=t('log.note.missed');
  if(j.stop&&!o.fail) note=t(TRAP_NOTE[lv(j.sdd)]);
  const ch=charge(b,v,M,tk); spend=ch.spend;
  if(ch.short){ tk*=ch.frac; hrs=Math.max(.3,hrs*Math.max(.3,ch.frac)); ok=false; note=t(b==='api'?'log.note.wallet':'log.note.quota'); }
  /* 解決衝突工單本身不會再衝突 */
  if(ok&&!is.merge&&o.conflict&&Math.random()<o.conflict){ok=false;conflict=true;}
  /* App 上架審核在 agent 做完之後才發生，自我審核救不回來 */
  if(ok&&is.store&&Math.random()<storeReject()){ok=false;rejected=true;note=t('log.note.store');}
  S.st.tk[v]+=tk; S.st.byBill[b]+=tk;
  const outcome=o.cancel?'cancelled':o.fail?'aborted':ch.short?'quota':conflict?'conflict':rejected?'rejected':ok?(fixed?'caught':'success'):j.stop?'trap_stop':'fail';
  track('job_result',{...jobChoice(j),cx:is.cx,stack:is.stack,gig:!!is.out,research:!!j.research,outcome,tokens:Math.round(tk),cost:Math.round(ch.cost||0),hours:Math.round(hrs*10)/10});
  const w=who(v,M,b), sp=t('sep');
  if(ok){
    S.issues=S.issues.filter(i=>i!==is); const rw=reward(is);
    if(is.inc) S.trust=Math.min(100,S.trust+2);
    if(fixed)S.st.caught++;
    log('ok',t('log.ok',{title:issueTitle(is),who:w+(j.rv?sp+REVIEW[j.rv].name:''),tk:kt(tk),spend,h:h1(hrs),rw}));
    if(fixed)log('ok',t('log.fixed',{rv:REVIEW[j.rv].name}));
    if(j.hidden)log('warn',t('log.trapForced',{a:is.shownCx,b:is.cx}));
    if(sel.issue===is.id) sel.issue=null;
  } else if(conflict){
    /* 合併衝突：原單原地變成「解決衝突」工單，KPI 等它完成才拿 */
    S.st.conflicts++; if(fixed)S.st.caught++;
    const title=issueTitle(is), cx=Math.max(1,is.cx-1);
    Object.assign(is,{merge:true,title:t('ui.mergeTitle',{title}),cx,base:BASE[cx]*R(.85,1.15),trap:false,revealed:false,evaluated:false,research:false,big:is.big&&cx>=3,tries:0});
    log('warn',t('log.conflict',{title,who:w,cx,tk:kt(tk),spend,h:h1(hrs)}));
  } else if(o.cancel){
    log('warn',t('log.cancel',{title:issueTitle(is),who:w,tk:kt(tk),spend,h:h1(hrs)}));
  } else {
    is.tries++; is.base*=j.stop?1:RETRY.tk;
    log('bad',t('log.fail',{title:issueTitle(is),who:w,note:note||t('log.note.fail'),tk:kt(tk),spend,h:h1(hrs)}));
  }
  auditRoll(is,b,v); checkOverdraft();
  return {ok,hrs,rejected};
}
export function wait(next){
  if(next&&!S.jobs.length) return;
  const n0=S.log.length, el=START.hours-S.hours;
  advance(next?Math.min(...S.jobs.map(j=>j.left)):1);
  /* 等待那行照實際經過的時間（含期間審 PR）寫，排在等待期間產生的紀錄之前 */
  const dt=START.hours-S.hours-el;
  if(dt>1e-9){ log('dim',t(next?'log.waitNext':'log.wait',{h:h1(dt),a:clock(el),b:clock(el+dt)})); S.log.splice(S.log.length-n0-1,0,S.log.shift()); }
  render();
}
export function manual(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is) return;
  const hrs=manualHrs(is), cx=is.cx;
  if(hrs>S.hours||manualBlocked()) return;
  const fix=outcome=>track('manual_fix',{cx,stack:is.stack,unfamiliar:unfamiliar(is),gig:!!is.out,outcome,hours:Math.round(hrs*10)/10});
  if(PAR()){ is.running=true; advance(hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=hrs;
  S.st.manual++;
  if(hiddenTrap(is)){ reveal(is); S.st.trapHit++; fix('trap'); log('bad',t('log.manualTrap',{title:issueTitle(is),h:h1(hrs),a:is.shownCx,b:is.cx})); render(); return; }
  const ok=is.cx<=3||Math.random()<.7;
  fix(ok?'success':'fail');
  if(ok){S.issues=S.issues.filter(i=>i!==is);const rw=reward(is);sel.issue=null;log('ok',t('log.manualOk',{title:issueTitle(is),h:h1(hrs),rw}));}
  else{is.tries++;is.base*=RETRY.tk;log('bad',t('log.manualFail',{title:issueTitle(is),h:h1(hrs)}));}
  render();
}

/* 評估架構：先花少量 token 讓 agent 讀架構，模型越強越容易識破陷阱 */
export const EVAL_TK=40;
export const canEvaluate=is=>!is.inc&&!is.merge&&!is.research&&!is.evaluated&&!is.revealed;
export const evalCost=(M,v=sel.v)=>({tk:EVAL_TK*M.verb,hrs:EVAL_HRS*M.speed*localSpeed(v)*(S.inv.mcp?MCP_EVAL_HRS:1)});
export const revealRate=M=>Math.min(REVEAL.max,REVEAL.base+REVEAL.per*M.cap+(S.inv.mcp?MCP_REVEAL:0));
export function evaluate(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||!canEvaluate(is)||!billOk(is)) return;
  const M=model(sel.v,sel.m), {tk,hrs}=evalCost(M,sel.v), cx=is.cx; if(hwBlock(M)) return;
  if(hrs>S.hours||(sel.b==='local'&&localBusy())) return;
  if(PAR()){ is.running=true; advance(hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=hrs;
  const ch=charge(sel.b,sel.v,M,tk), used=tk*ch.frac; useHw(sel.v,sel.m);
  S.st.tk[sel.v]+=used; S.st.byBill[sel.b]+=used;
  const evt=outcome=>track('evaluate',{vendor:sel.v,model:sel.m,bill:sel.b,cx,stack:is.stack,gig:!!is.out,outcome});
  const ew=t('log.evalWho',{who:who(sel.v,M,sel.b)});
  if(ch.short){ evt('quota'); log('bad',t('log.evalShort',{title:issueTitle(is),ew,why:t(sel.b==='api'?'why.walletEmpty':'why.quota'),spend:ch.spend})); render(); return; }
  is.evaluated=true;
  if(is.trap&&Math.random()<revealRate(M)){ reveal(is); evt('found'); S.st.trapFound++; log('ok',t('log.evalFound',{title:issueTitle(is),ew,a:is.shownCx,b:is.cx,tk:kt(tk),spend:ch.spend,h:h1(hrs)})); }
  else{ evt('clear'); log('dim',t('log.evalClear',{title:issueTitle(is),ew,tk:kt(tk),spend:ch.spend,h:h1(hrs)})); }
  auditRoll(is,sel.b,sel.v); checkOverdraft();
  render();
}
/* 陷阱曝光後可以找主管重新評估一次：信任夠就調 KPI、延期限 */
export const RESCOPE_TRUST=50;
export function rescope(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||is.out||!is.revealed||is.rescoped) return;
  is.rescoped=true;
  track('rescope',{cx:is.cx,stack:is.stack,outcome:S.trust>=RESCOPE_TRUST?'approved':'refused'});
  if(S.trust>=RESCOPE_TRUST){
    S.trust-=RESCOPE.ok; is.kpi=Math.round(KPI[is.cx]*(hardStack(is.stack)?HARD_KPI:1)); is.due=Math.min(20,is.due+RESCOPE.days);
    log('ok',t('log.rescopeOk',{title:issueTitle(is),kpi:is.kpi,d:is.due,n:RESCOPE.ok}));
  } else { S.trust=Math.max(0,S.trust-RESCOPE.no); log('warn',t('log.rescopeNo',{title:issueTitle(is),n:RESCOPE.no})); }
  render();
}

/* 研究單：先研究（叫 agent 或自己來）就拆成兩張小單；agent 研究的扣款與稽核照評估架構 */
export const researchCost=(M,v=sel.v)=>({tk:RESEARCH_TK*M.verb,hrs:RESEARCH_HRS*M.speed*localSpeed(v)});
export const selfResearchHrs=is=>RESEARCH_SELF_HRS*(unfamiliar(is)?UNFAMILIAR_HRS:1);
/* 研究不能做的原因（派工台按鈕與動作共用）；可以做時回傳空字串 */
export function researchBlock(is,via){
  if(!is?.research) return t('why.notResearch');
  if(is.running) return t('why.running');
  if(via==='self') return manualBlocked()?t('why.localRunning'):selfResearchHrs(is)>S.hours?t('why.hours'):'';
  const M=model(sel.v,sel.m);
  if(S.outage===sel.v) return t('ui.q.down');
  const why=cnBlock(is,sel.v,M)||hwBlock(M); if(why) return why;
  const bl=bills(sel.v,is).find(b=>b.id===sel.b); if(!bl?.ok) return bl?.note||t('why.bill');
  if(sel.b==='local'&&localBusy()) return t('why.localBusy');
  return researchCost(M,sel.v).hrs>S.hours?t('why.hours'):'';
}
/* 研究完成：原單換成兩張比較小的單，KPI（外包報酬）照複雜度比例分、總和不變，期限與案主等照舊 */
export function splitResearch(is){
  const at=S.issues.indexOf(is); if(at<0) return [];
  const [c1,c2]=RESEARCH_SPLIT[is.cx], T=c1+c2, k1=Math.round(is.kpi*c1/T), p1=is.out?Math.round(is.pay*c1/T):0;
  const part=(c,title,kpi,pay)=>{const base=BASE[c]*R(.85,1.15);
    return {id:nextId(),title,cx:c,base,inc:false,stack:is.stack,trap:false,trueCx:c,trueBase:base,revealed:false,evaluated:false,rescoped:false,merge:false,research:false,
      store:is.store,sens:is.sens,big:is.big&&c>=3,client:is.client,due:is.due,kpi,tries:0,from:is.id,...(is.out?{out:true,pay}:{})};};
  const src=p=>is.src?{src:{...is.src,p}}:{};
  const parts=[Object.assign(part(c1,is.parts[0],k1,p1),src(0)),Object.assign(part(c2,is.parts[1],is.kpi-k1,is.out?is.pay-p1:0),src(1))];
  S.issues.splice(at,1,...parts); sel.issue=parts[0].id;
  return parts;
}
export function research(via){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||researchBlock(is,via)) return;
  const agent=via==='agent', M=model(sel.v,sel.m), cost=agent?researchCost(M,sel.v):{tk:0,hrs:selfResearchHrs(is)}, cx=is.cx;
  if(PAR()){ is.running=true; advance(cost.hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=cost.hrs;
  const evt=outcome=>track('research',{via,vendor:agent?sel.v:'none',model:agent?sel.m:'none',bill:agent?sel.b:'none',cx,stack:is.stack,gig:!!is.out,outcome});
  const rw=agent?t('log.researchWho',{who:who(sel.v,M,sel.b)}):t('log.researchSelf');
  let ch=null;
  if(agent){
    ch=charge(sel.b,sel.v,M,cost.tk); const used=cost.tk*ch.frac; useHw(sel.v,sel.m);
    S.st.tk[sel.v]+=used; S.st.byBill[sel.b]+=used;
    if(ch.short){ evt('quota'); log('bad',t('log.researchShort',{title:issueTitle(is),rw,why:t(sel.b==='api'?'why.walletEmpty':'why.quota'),spend:ch.spend})); render(); return; }
  }
  const title=issueTitle(is), [a,b]=splitResearch(is);
  evt('split');
  log('ok',t('log.split',{title,rw,a:issueTitle(a),ca:a.cx,b:issueTitle(b),cb:b.cx,cost:agent?t('log.splitCost',{tk:kt(cost.tk),spend:ch.spend}):'',h:h1(cost.hrs)}));
  if(agent){ auditRoll(is,sel.b,sel.v); checkOverdraft(); }
  render();
}

/* 工程投資：花自己的工時和公司預算，平行模式下背景 agent 照樣跑 */
export const invCount=()=>Object.values(S.inv.md).reduce((n,x)=>n+lv(x),0)+INV_KEYS.reduce((n,k)=>n+lv(S.inv[k]),0);
/* 投資等級：目前幾級、最高幾級、下一級的工時與預算、下一級要先去過哪種研討會 */
export const invLevel=(k,st)=>lv(k==='md'?S.inv.md[st]:S.inv[k]);
export const invMax=k=>k==='ai'?AI_MAX:INVEST[k].lv2?2:1;
export const invCost=(k,st)=>invLevel(k,st)>=1&&INVEST[k].lv2?INVEST[k].lv2:INVEST[k];
export function invLock(k,st,L){
  if(k==='ai') return confCount()>=L?'':t('why.needConfs',{n:L});
  if(L<2||k==='sdd') return '';  // SDD 框架不用研討會
  if(k==='md') return confStacks().has(st)?'':t('why.needStackConf',{st:STACKS[st].name});
  const cat=Object.keys(CONF_LV2).find(c=>CONF_LV2[c]===k);
  return confCat(cat)?'':t('why.needCat',{cat:CONF_CATS[cat]});
}
/* want 是想買的等級，沒給就買下一級 */
export function investBlock(k,st,want){
  const cur=invLevel(k,st), L=want??cur+1, I=invCost(k,st);
  if(cur>=invMax(k)||L<=cur) return t('why.done');
  if(L>cur+1) return t('why.needLv',{n:cur+1});
  const lock=invLock(k,st,L); if(lock) return lock;
  if(S.hours<I.hrs-1e-9) return t('why.hours');
  if(S.corp<I.cost) return t('why.corp');
  return '';
}
export function invest(k,st,want){
  if(!INVEST[k]||(k==='md'&&!STACKS[st])||investBlock(k,st,want)) return false;
  const I=invCost(k,st), L=invLevel(k,st)+1, name=INVEST[k].name+(invMax(k)>1?` Lv${L}`:'');
  S.corp-=I.cost; S.corpDay+=I.cost; S.st.corp+=I.cost;
  if(k==='md') S.inv.md[st]=L; else S.inv[k]=L;
  track('invest',{investment:k==='ai'?`ai${L}`:L>=2?`${k}2`:k,stack:k==='md'?st:'none'});
  if(PAR()) advance(I.hrs); else S.hours-=I.hrs;
  log('ok',t('log.invest',{name,extra:k==='md'?t('log.paren',{x:STACKS[st].name}):k==='sdd'?t('log.paren',{x:SDD_EG[L]}):'',h:h1(I.hrs),cost:nt(I.cost)}));
  return true;
}
/* 國內研討會：平日報名、自費、不花工時、不看信任；週末出席，下週一生效 */
export function confBlock(k){
  if(S.conf.went.includes(k)) return t('why.attended');
  if(S.conf.req===k) return t('why.registered');
  if(S.day>CONF_LAST_DAY) return t('why.confClosed',{d:CONF_LAST_DAY});
  if(S.conf.req) return t('why.confWeek');
  if(S.wallet<CONF[k].fee) return t('why.wallet');
  return '';
}
export function registerConf(k){
  if(!CONF[k]||confBlock(k)) return false;
  const C=CONF[k];
  S.wallet-=C.fee; S.st.confFee+=C.fee; S.conf.req=k;
  track('invest',{investment:'conf_'+k,stack:'none'});
  log('ok',t('log.conf',{name:C.name,fee:nt(C.fee)}));
  return true;
}
/* 出席：記成去過，回傳寫進早上報告的這場開放了什麼 */
export function attendConf(){
  const k=S.conf.req, C=CONF[k], cov=confStacks(), first=C.cat!=='stack'&&!confCat(C.cat);
  const ls=t('sep.list'), fresh=C.stacks.filter(st=>!cov.has(st)), names=fresh.map(st=>STACKS[st].name).join(ls);
  S.conf.req=null; S.conf.went.push(k);
  const got=[];
  const unf=fresh.filter(st=>st!=='fe'&&!S.companies.includes(st)).map(st=>STACKS[st].name).join(ls);
  if(fresh.length) got.push(t('rep.confManual',{names,x:CONF_MANUAL,unf:unf?t('rep.confUnf',{unf}):''}));
  if(fresh.length) got.push(t('rep.confMd',{names}));
  if(first) got.push(t('rep.confLv2',{name:INVEST[CONF_LV2[C.cat]].name}));
  if(confCount()<=AI_MAX) got.push(t('rep.confAi',{name:INVEST.ai.name,n:confCount()}));
  return t('rep.conf',{name:C.name,got:got.length?got.join(ls):t('rep.confNone')});
}
/* 採購電腦：一次只能一張申請，不扣公司 API 預算；到貨日不能超過第 20 天 */
export function hwReqBlock(k){
  if(S.hw[k]) return t('why.arrived');
  if(S.hwReq) return t('why.hwPending');
  if(S.hours<HW_REQ_HRS-1e-9) return t('why.hours');
  if(S.day+HW[k].days>20) return t('why.tooLate');
  return '';
}
export function requestHw(k){
  if(!HW[k]||hwReqBlock(k)) return false;
  S.hwReq={k,day:S.day};
  track('invest',{investment:k,stack:'none'});
  if(PAR()) advance(HW_REQ_HRS); else S.hours-=HW_REQ_HRS;
  log('dim',t('log.hwReq',{name:HW[k].name,price:HW[k].price,h:h1(HW_REQ_HRS),d:S.day+HW[k].days}));
  return true;
}
/* 今天用到哪台電腦：本地模型都算 PC，解鎖的模型算對應那台 */
export function useHw(v,m){
  if(v!=='local') return;
  S.hwUsed.pc=true; const h=model(v,m).hw; if(h) S.hwUsed[h]=true;
}
/* 做 skills 之後：一次派出所有複雜度 ≤2 的工單 */
export function batch(){
  if(!S.inv.skills) return;
  let n=0,skip=0;
  for(const is of S.issues.filter(i=>!i.running&&i.cx<=SKILLS_CX[lv(S.inv.skills)]).sort(queueOrder)){
    if(!canQuick()) break;
    const {i}=presetFor(is);
    if(i<0){skip++;continue;}
    if(!PAR()){const p=S.presets[i]; if(est(is,p.v,p.m,p.rv,p.ef,p.sdd).hrs>S.hours) break;}
    if(quick(is.id,'batch')) n++; else skip++;
  }
  log('dim',t('log.batch',{n,skip}));
}
export const INV_STACKS=()=>[...S.companies,...COMPANIES.filter(k=>!S.companies.includes(k)),'fe'];
export function invHint(is){
  const out=[];
  if(S.inv.md[is.stack]) out.push(t('hint.md',{st:STACKS[is.stack].name,tk:MD_TK,p:Math.round(MD_P[lv(S.inv.md[is.stack])]*100)}));
  const sd=sddLevel(); if(sd) out.push(t('hint.sdd',{name:SDD_NAME[sd],tk:SDD_TK[sd],p:is.cx>=3?t('hint.sddP',{p:Math.round(SDD_P[sd]*100)}):''}));
  if(S.inv.tests) out.push(t('hint.tests',{p:Math.round(TEST_CATCH[lv(S.inv.tests)]*100)}));
  if(S.inv.ci&&PAR()) out.push(t('hint.ci'));
  if(S.inv.hook&&PAR()) out.push(t('hint.hook'));
  if(S.inv.scan&&is.sens) out.push(t('hint.scan',{x:SCAN_AUDIT[lv(S.inv.scan)]}));
  if(S.inv.fastlane&&is.store) out.push(t('hint.fastlane',{p:Math.round(FASTLANE_REJECT*100)}));
  if(S.inv.monitor&&is.inc) out.push(t('hint.monitor',{n:MONITOR_LATE}));
  if(S.inv.ai) out.push(t('hint.ai',{n:lv(S.inv.ai),p:Math.round(AI_P*lv(S.inv.ai)*100)}));
  if(S.inv.mcp) out.push(t('hint.mcp',{p:Math.round(MCP_REVEAL*100)}));
  if(S.hw.pc&&sel.v==='local') out.push(t('hint.pc',{x:PC_SPEED}));
  return out.length?t('hint.invest',{list:out.join(t('sep.semi'))}):'';
}

/* 每天抽隨機事件的機率；下班沒跑完的 agent 過夜推進的時數 */
export const EVENT_RATE=.55, OVERNIGHT_HRS=3;
/* 主管事件：KPI 要超過 天數 × PACE_KPI，稱讚 +PRAISE_TRUST、質疑 -DOUBT_TRUST；第 6 天前沒達標只提醒 */
export const PACE_KPI=7, PRAISE_TRUST=6, DOUBT_TRUST=4;
/* 事件的標題與內容：字典裡的 ev.<名稱>.t 與 ev.<名稱>.b */
export const ev=(k,p)=>[t(`ev.${k}.t`,p),t(`ev.${k}.b`,p)];
export const EVENTS=[
  ()=>{const v=pick(APIV);S.priceMod[v]*=.7;return ev('price',{v:VENDORS[v].name});},
  ()=>{const v=pick(APIV);S.outage=v;return ev('outage',{v:VENDORS[v].name,agent:VENDORS[v].agent});},
  ()=>{if(S.cnBan||S.day<8)return ev('remind');if(0)return ev('policy');S.cnBan=true;return ev('cnBan');},
  ()=>{S.corp*=.7;return ev('freeze');},
  ()=>{const v=pick(SUBV);S.capMod[v]*=.8;return ev('quota',{v:VENDORS[v].name});},
  ()=>{if(S.day<6)return ev('trafficLow');S.issues.push(makeIssue(true));S.issues.push(makeIssue(true));return [t('ev.traffic.t'),t(S.inv.monitor?'ev.traffic.monitor':'ev.traffic.today')];},
  ()=>{const need=S.day*PACE_KPI;
    if(S.kpi>need){S.trust=Math.min(100,S.trust+PRAISE_TRUST);return ev('praise',{kpi:S.kpi,need,n:PRAISE_TRUST});}
    if(S.day<6)return ev('paceRemind',{kpi:S.kpi,x:PACE_KPI});
    S.trust=Math.max(0,S.trust-DOUBT_TRUST);return ev('doubt',{kpi:S.kpi,need,n:DOUBT_TRUST});},
  ()=>{S.wallet+=1500;return ev('tip');},
];

/* 事故單機率逐日遞增：第 2 天 3%、第 3 天 6%、第 4 天 9%，第 5 天起 12% */
export const INC_RATE=.12, INC_RAMP=.03;
export const incRate=day=>Math.min(INC_RATE,INC_RAMP*(day-1));
/* 每日進件的一張工單；選了 SRE 時沒中事故的再擲一次，中了就是 SRE 事故單 */
export function intakeIssue(){
  if(Math.random()<incRate(S.day)) return makeIssue(true);
  if(S.companies.includes('sre')&&Math.random()<incRate(S.day)) return makeIssue(true,'sre');
  return makeIssue(false);
}

/* 下班總結：KPI、信任、錢包、公司預算的當天變化（目前值）；沒有變化寫 ±0 */
export function daySummary(){
  const b=S.dayStart||daySnap(), sg=d=>d>0?'+':d<0?'-':'±';
  const n=(k,lab)=>{const d=Math.round(S[k]-b[k]);return t('log.sumItem',{lab,d:`${sg(d)}${Math.abs(d)}`,cur:Math.round(S[k])});};
  const m=(k,lab)=>{const d=Math.round(S[k]-b[k]);return t('log.sumItem',{lab,d:`${sg(d)}${nt(Math.abs(d))}`,cur:nt(S[k])});};
  return t('log.daySum',{d:S.day,kpi:n('kpi','KPI'),trust:n('trust',t('log.lab.trust')),wallet:m('wallet',t('log.lab.wallet')),corp:m('corp',t('log.lab.corp'))});
}
/* 開工那行（第 1 天在 main.js 的 firstIssues） */
export const dayStartLine=(d,monday,n,g)=>t('log.dayStart',{d,week:monday?t('log.newWeek'):'',n,gig:g?t('log.dayGigs',{g}):''});
export function endDay(){
  const rep=[];
  if(PAR()&&S.jobs.length) advance(S.hours);
  const killed=cancelJobs(j=>j.issue.due<=S.day,t('log.note.expired'));
  if(killed) rep.push(t('rep.killed',{n:killed}));
  const gigLate=S.issues.filter(i=>i.out&&i.due<=S.day);
  /* 外包逾期：賠違約金，不扣 KPI 和信任 */
  gigLate.forEach(i=>{const pen=Math.round(i.pay*GIG_LATE);S.wallet-=pen;S.st.outPenalty+=pen;S.st.outLate++;log('bad',t('log.gigLate',{title:issueTitle(i),pen:nt(pen)}));});
  if(gigLate.length) rep.push(t('rep.gigLate',{n:gigLate.length,pen:nt(gigLate.reduce((a,i)=>a+Math.round(i.pay*GIG_LATE),0))}));
  const late=S.issues.filter(i=>!i.out&&i.due<=S.day);
  let lateTrust=0;
  /* 研究拆出來的兩張單算同一張原單：都逾期時信任只扣一次 */
  const lateFrom=new Set();
  late.forEach(i=>{const pen=Math.ceil(i.kpi*LATE_KPI), tr=i.from&&lateFrom.has(i.from)?0:i.inc?(S.inv.monitor?MONITOR_LATE:INC_LATE_TRUST):LATE_TRUST; if(i.from)lateFrom.add(i.from);S.kpi-=pen;S.st.kpiLost+=pen;S.trust=Math.max(0,S.trust-tr);lateTrust+=tr;S.st.late++;log('bad',t('log.late',{title:issueTitle(i),pen,tr}));});
  S.issues=S.issues.filter(i=>i.due>S.day);
  if(late.length) rep.push(t('rep.late',{n:late.length,tr:lateTrust}));
  if(S.corpDay>CORP_DAY_LIMIT){S.trust=Math.max(0,S.trust-CORP_DAY_TRUST);rep.push(t('rep.corpDay',{c:nt(S.corpDay),n:CORP_DAY_TRUST}));log('warn',t('log.corpDay',{c:nt(S.corpDay),n:CORP_DAY_TRUST}));}
  /* 買了電腦沒用：每台每天信任 -2 */
  const idle=HW_KEYS.filter(k=>S.hw[k]&&!S.hwUsed[k]);
  if(idle.length){const n=HW_IDLE*idle.length;S.trust=Math.max(0,S.trust-n);const msg=t('rep.hwIdle',{names:idle.map(k=>HW[k].name).join(t('sep.list')),n});rep.push(msg);log('warn',`! ${msg}`);}
  log('dim',daySummary());
  if(S.day>=20){render();return showEnd();}
  S.day++; S.hours=START.hours; S.corpDay=0; S.outage=null; S.dayStart=daySnap();
  for(const k of ['sub','seat'])for(const v in S.used[k])S.used[k][v].d=0;
  const monday=(S.day-1)%5===0;
  if(monday)for(const k of ['sub','seat'])for(const v in S.used[k])S.used[k][v].w=0;
  if(S.seatReq&&S.day>=S.seatReq.day+SEAT.review){
    const sv=S.seatReq.vendor, need=SEAT.trust[S.seats.length]; S.seatReq=null;
    if(S.trust>=need){S.seats.push(sv);rep.push(t('rep.seatOk',{v:VENDORS[sv].name}));log('ok',t('log.seatOk',{v:VENDORS[sv].name}));}
    else{rep.push(t('rep.rejected',{n:need}));log('bad',t('log.seatNo'));}
  }
  S.hwUsed=objOf(HW_KEYS,()=>false);
  if(S.hwReq&&S.day>=S.hwReq.day+HW[S.hwReq.k].days){
    const k=S.hwReq.k, H=HW[k]; S.hwReq=null;
    if(S.trust>=H.trust){S.hw[k]=true;S.hours-=HW_SETUP_HRS;rep.push(t('rep.hwOk',{name:H.name,h:HW_SETUP_HRS}));log('ok',t('log.hwOk',{name:H.name,h:h1(HW_SETUP_HRS)}));}
    else{rep.push(t('rep.rejected',{n:H.trust}));log('bad',t('log.hwNo',{name:H.name}));}
  }
  /* 週末參加研討會：下週一早上生效 */
  if(monday&&S.conf.req){const msg=attendConf();rep.push(msg);log('ok',`★ ${msg}`);}
  let e=null; if(Math.random()<EVENT_RATE) e=pick(EVENTS)();
  if(e) log('dim',t('log.event',{t:e[0],b:e[1]}));
  if(S.outage){const n=cancelJobs(j=>j.v===S.outage,t('log.note.outage'));if(n)rep.push(t('rep.outage',{n,v:VENDORS[S.outage].name}));}
  if(S.jobs.length){ S.jobs.forEach(j=>j.left=Math.max(.05,j.left-OVERNIGHT_HRS)); rep.push(t('rep.overnight',{n:S.jobs.length})); }
  /* 跑過夜的本地 agent 一早還占著 GPU，今天算用到那台電腦 */
  S.jobs.forEach(j=>{if(j.b==='local')useHw(j.v,j.m);});
  const n=PAR()?3+rnd(4):2+rnd(3); for(let i=0;i<n;i++)S.issues.push(intakeIssue());
  const g=addGigs();
  log('dim',dayStartLine(S.day,monday,n,g));
  sel.issue=null;
  track('day_reached');
  saveGame({rep,ev:e,monday});
  render(); showDay(rep,e,monday);
}

