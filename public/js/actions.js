import {MCP_EVAL_HRS,CI_CONFLICT,PR_REVIEWED,CONFLICT,EVAL_HRS,LATE_KPI,PR_HRS,RESCOPE,RETRY,REVEAL,HARD_KPI,APIV,BASE,BILL_LABEL,COMPANIES,EFFORT,FASTLANE_REJECT,HOOK_PR,HW,PC_SPEED,HW_IDLE,HW_KEYS,HW_REQ_HRS,HW_SETUP_HRS,INVEST,INV_KEYS,KPI,MCP_REVEAL,MONITOR_LATE,MD_P,MD_TK,PN,R,SCAN_AUDIT,SDD_P,SDD_TK,SDD_TRAP_STOP,SEAT,STACKS,SUBV,TEST_CATCH,VENDORS,effModel,efOf,h1,kt,model,nt,objOf,pick,rnd} from './data.js';
import {GIG_LATE,START,S,addGigs,daySnap,hardStack,makeIssue,saveGame,sel,track,unfamiliar} from './state.js';
import {REVIEW,est,gigBlocked,hwBlock,localBusy,localSpeed,log,manualBlocked,manualHrs,presetFor,quotaLeft,storeReject,useQuota} from './calc.js';
import {render} from './view.js';
import {showDay,showEnd} from './modals.js';

/* ===== 動作 ===== */
export const PAR=()=>S.mode==='parallel';
export const queueOrder=(a,b)=>a.due-b.due||b.kpi-a.kpi;
export const SLOT_CHOICES=[2,3,4,5,6];
export const clock=el=>{const m=Math.round((9+el)*60);return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
/* 還沒曝光的陷阱題照真實複雜度跑；模型能力不夠就做到一半停下來 */
export const TRAP_STOP=.4;
export const hiddenTrap=is=>is.trap&&!is.revealed;
export const trueView=is=>hiddenTrap(is)?{...is,cx:is.trueCx,base:is.trueBase}:is;
export function reveal(is){ if(!hiddenTrap(is)) return; is.shownCx=is.cx; is.cx=is.trueCx; is.base=is.trueBase; is.revealed=true; }
export function makeJob(is){
  const hidden=hiddenTrap(is), e=est(trueView(is),sel.v,sel.m);
  const stop=hidden&&e.M.cap<is.trueCx, f=stop?(S.inv.sdd?SDD_TRAP_STOP:TRAP_STOP):1;
  const ok=!stop&&Math.random()<e.p;
  return {issue:is,v:sel.v,m:sel.m,ef:efOf(sel.ef),b:sel.b,M:e.M,rv:sel.rv,tk:e.tk*f*R(.7,1.3),hrs:e.hrs*f*R(.8,1.2),ok,caught:!stop&&!ok&&Math.random()<e.c,left:0,hidden,stop,sdd:S.inv.sdd};
}
/* GA：派工與結果共用的選擇參數；舊存檔的 job 沒有 m、ef */
export const RV_ID=['none','self','strict'];
export const jobChoice=j=>({vendor:j.v,model:j.m??'unknown',bill:j.b,review:RV_ID[j.rv],effort:EFFORT[j.ef??1].id});
/* via：panel（派工按鈕）、quick（一鍵派工）、batch（批次派工）；preset 是方案字母 */
export function dispatch(via='panel',preset='none'){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||gigBlocked(is,sel.b)||hwBlock(model(sel.v,sel.m))) return;
  const pe=est(is,sel.v,sel.m).pe, j=makeJob(is);
  if(PAR()&&(S.jobs.length>=S.slots||(j.b==='local'&&localBusy()))) return;
  useHw(j.v,j.m);
  track('dispatch',{...jobChoice(j),via,preset,cx:is.cx,stack:is.stack,incident:!!is.inc,sensitive:!!is.sens,gig:!!is.out,merge:!!is.merge});
  /* 復盤用：記下派工當下看到的條件（成功率是派工台顯示的，陷阱照顯示的複雜度） */
  const tags=[`複雜度 ${is.cx}`,is.due<=S.day?'今天到期':`第 ${is.due} 天到期`,...(is.inc?['事故']:[]),...(is.sens?['機敏']:[]),...(is.out?['外包']:[])].join('・');
  const how=via==='quick'?`一鍵派工方案 ${preset}`:via==='batch'?`批次派工方案 ${preset}`:'派工台';
  log('dim',`→ 派出 ${is.title}（${tags}）｜${VENDORS[j.v].agent} / ${j.M.name}・${BILL_LABEL[j.b]}・${REVIEW[j.rv].name}｜成功率 ${Math.round(pe*100)}%｜${how}｜預計 ${h1(j.hrs)}h`);
  if(PAR()){
    j.left=j.hrs; is.running=true; S.jobs.push(j); sel.issue=null;
    advance(.2); render(); return;
  }
  let frac=1,note='';
  if(j.hrs>S.hours){frac=S.hours/j.hrs;note='跑到下班還沒結束';}
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
  if(skip.length) log('dim',`· 一鍵派工用方案 ${PN[i]}（略過 ${skip.map(s=>`${PN[s.i]}：${s.r}`).join('、')}）`);
  dispatch(via,PN[i]); return true;
}
export const loadPreset=i=>Object.assign(sel,S.presets[i]);
export function savePreset(i){
  S.presets[i]={v:sel.v,m:sel.m,b:sel.b,rv:sel.rv,ef:sel.ef};
  log('dim',`· 存成方案 ${PN[i]}：${VENDORS[sel.v].agent} / ${effModel(model(sel.v,sel.m),efOf(sel.ef)).name}・${BILL_LABEL[sel.b]}・${REVIEW[sel.rv].name}`);
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
      if(r.ok||r.rejected){const rv=prHrs(j.issue.cx,j.rv);dt+=rv;log('dim',`  ↳ 審 PR 花了 ${h1(rv)}h`);}
    }
  }
  S.hours=Math.max(0,S.hours);
}
export function cancelJobs(pred,note){
  const out=S.jobs.filter(pred); S.jobs=S.jobs.filter(j=>!pred(j));
  out.forEach(j=>{j.issue.running=false;settle(j,{frac:Math.max(.05,1-j.left/j.hrs),fail:true,note});});
  return out.length;
}
/* 扣款：派工與評估共用。訂閱／席位額度不夠時只扣剩下的，回傳 short 與實際完成比例 frac */
export function charge(b,v,M,tk){
  if(b==='sub'||b==='seat'){
    const need=tk*M.w, left=quotaLeft(b,v);
    if(need>left){ useQuota(b,v,left); return {spend:`額度 ${kt(left)}`,short:true,frac:need>0?left/need:0}; }
    useQuota(b,v,need); return {spend:`額度 ${kt(need)}`,short:false,frac:1};
  }
  if(b==='api'){ const c=tk*M.price*S.priceMod[v]; S.wallet-=c; S.st.api+=c; return {spend:nt(c),short:false,frac:1,cost:c}; }
  if(b==='corp'){ const c=tk*M.price*S.priceMod[v]; S.corp-=c; S.corpDay+=c; S.st.corp+=c; return {spend:'公司 '+nt(c),short:false,frac:1,cost:c}; }
  return {spend:'電費',short:false,frac:1};
}
/* 機敏程式碼送進個人帳號的稽核風險；派工與評估共用 */
export const auditRisk=(is,b)=>is.sens&&(b==='sub'||b==='api');
/* 資安稽核、公司帳單、逾期的信任扣分 */
export const AUDIT_ODDS={base:.35,cn:.6}, AUDIT_TRUST=12, OVERDRAFT_TRUST=8, CORP_DAY_LIMIT=1500, CORP_DAY_TRUST=6, LATE_TRUST=4, INC_LATE_TRUST=8;
export const auditOdds=v=>(VENDORS[v].cn?AUDIT_ODDS.cn:AUDIT_ODDS.base)*(S.inv.scan?SCAN_AUDIT:1);
export function auditRoll(is,b,v){
  if(auditRisk(is,b)&&Math.random()<auditOdds(v)){
    S.trust=Math.max(0,S.trust-AUDIT_TRUST); S.st.audits++;
    log('warn',`! 資安稽核：機敏程式碼送進${VENDORS[v].cn?'中國雲端模型':'個人帳號'}被抓到，主管信任 -${AUDIT_TRUST}`);
  }
}
export function checkOverdraft(){ if(S.corp<0){ log('warn','! 公司 API 預算透支，財務來信關切'); S.trust=Math.max(0,S.trust-OVERDRAFT_TRUST); S.corp=0; } }
/* 完成工單的獎勵：外包單拿現金不拿 KPI；回傳紀錄用的文字 */
export function reward(is){
  if(is.out){S.wallet+=is.pay;S.st.outIncome+=is.pay;S.st.outDone++;return `外包收入 ${nt(is.pay)}`;}
  S.kpi+=is.kpi;S.st.done++;return `KPI +${is.kpi}`;
}
export function settle(j,o={}){
  const is=j.issue,v=j.v,b=j.b,M=j.M,frac=o.frac??1;
  if(j.hidden&&hiddenTrap(is)){ reveal(is); S.st.trapHit++; }
  let tk=j.tk*frac, hrs=j.hrs*frac, ok=j.ok&&!o.fail, note=o.note||'', spend='', conflict=false, fixed=false, rejected=false;
  if(!j.ok&&j.caught&&!o.fail){tk*=1.25;ok=true;fixed=true;}
  if(!j.ok&&!j.caught&&j.rv&&!o.fail) note='審核沒抓到，上線後測試才爆';
  if(j.stop&&!o.fail) note=j.sdd?'寫規格時就發現牽扯整個架構，先停下來':'做到一半發現牽扯整個架構，先停下來';
  const ch=charge(b,v,M,tk); spend=ch.spend;
  if(ch.short){ tk*=ch.frac; hrs=Math.max(.3,hrs*Math.max(.3,ch.frac)); ok=false; note='撞到用量上限，agent 停在一半'; }
  /* 解決衝突工單本身不會再衝突 */
  if(ok&&!is.merge&&o.conflict&&Math.random()<o.conflict){ok=false;conflict=true;}
  /* App 上架審核在 agent 做完之後才發生，自我審核救不回來 */
  if(ok&&is.store&&Math.random()<storeReject()){ok=false;rejected=true;note='卡在 App Store 審核被退件';}
  S.st.tk[v]+=tk; S.st.byBill[b]+=tk;
  const outcome=o.fail?'aborted':ch.short?'quota':conflict?'conflict':rejected?'rejected':ok?(fixed?'caught':'success'):j.stop?'trap_stop':'fail';
  track('job_result',{...jobChoice(j),cx:is.cx,stack:is.stack,gig:!!is.out,outcome,tokens:Math.round(tk),cost:Math.round(ch.cost||0),hours:Math.round(hrs*10)/10});
  const who=`${VENDORS[v].agent} / ${M.name}・${BILL_LABEL[b]}`;
  if(ok){
    S.issues=S.issues.filter(i=>i!==is); const rw=reward(is);
    if(is.inc) S.trust=Math.min(100,S.trust+2);
    if(fixed)S.st.caught++;
    log('ok',`✓ ${is.title}｜${who}${j.rv?`・${REVIEW[j.rv].name}`:''}｜${kt(tk)} tokens｜${spend}｜${h1(hrs)}h｜${rw}`);
    if(fixed)log('ok',`  ↳ ${REVIEW[j.rv].name}抓到錯誤並當場修正，省掉整單重做`);
    if(j.hidden)log('warn',`  ↳ 原來牽扯到架構，硬做完了（原估複雜度 ${is.shownCx}，實際 ${is.cx}）`);
    if(sel.issue===is.id) sel.issue=null;
  } else if(conflict){
    /* 合併衝突：原單原地變成「解決衝突」工單，KPI 等它完成才拿 */
    S.st.conflicts++; if(fixed)S.st.caught++;
    const title=is.title, cx=Math.max(1,is.cx-1);
    Object.assign(is,{merge:true,title:`解決衝突：${title}`,cx,base:BASE[cx]*R(.85,1.15),trap:false,revealed:false,evaluated:false,big:is.big&&cx>=3,tries:0});
    log('warn',`⚡ ${title}｜${who}｜和其他 agent 的改動合併衝突，留下「解決衝突」工單（複雜度 ${cx}）｜燒掉 ${kt(tk)}｜${spend}｜${h1(hrs)}h`);
  } else {
    is.tries++; is.base*=j.stop?1:RETRY.tk;
    log('bad',`✗ ${is.title}｜${who}｜${note||'測試沒過，改壞了'}｜燒掉 ${kt(tk)}｜${spend}｜${h1(hrs)}h`);
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
  if(dt>1e-9){ log('dim',`· ${next?'等到下一個 agent 完成':'等待'} ${h1(dt)}h（${clock(el)}→${clock(el+dt)}）`); S.log.splice(S.log.length-n0-1,0,S.log.shift()); }
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
  if(hiddenTrap(is)){ reveal(is); S.st.trapHit++; fix('trap'); log('bad',`✗ ${is.title}｜手寫到一半發現要動架構｜${h1(hrs)}h｜原估複雜度 ${is.shownCx}，實際 ${is.cx}`); render(); return; }
  const ok=is.cx<=3||Math.random()<.7;
  fix(ok?'success':'fail');
  if(ok){S.issues=S.issues.filter(i=>i!==is);const rw=reward(is);sel.issue=null;log('ok',`✓ ${is.title}｜自己手寫｜0 tokens｜${h1(hrs)}h｜${rw}`);}
  else{is.tries++;is.base*=RETRY.tk;log('bad',`✗ ${is.title}｜自己手寫卡關｜${h1(hrs)}h`);}
  render();
}

/* 評估架構：先花少量 token 讓 agent 讀架構，模型越強越容易識破陷阱 */
export const EVAL_TK=40;
export const canEvaluate=is=>!is.inc&&!is.merge&&!is.evaluated&&!is.revealed;
export const evalCost=(M,v=sel.v)=>({tk:EVAL_TK*M.verb,hrs:EVAL_HRS*M.speed*localSpeed(v)*(S.inv.mcp?MCP_EVAL_HRS:1)});
export const revealRate=M=>Math.min(REVEAL.max,REVEAL.base+REVEAL.per*M.cap+(S.inv.mcp?MCP_REVEAL:0));
export function evaluate(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||!canEvaluate(is)||gigBlocked(is,sel.b)) return;
  const M=model(sel.v,sel.m), {tk,hrs}=evalCost(M,sel.v), cx=is.cx; if(hwBlock(M)) return;
  if(hrs>S.hours||(sel.b==='local'&&localBusy())) return;
  if(PAR()){ is.running=true; advance(hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=hrs;
  const ch=charge(sel.b,sel.v,M,tk), used=tk*ch.frac; useHw(sel.v,sel.m);
  S.st.tk[sel.v]+=used; S.st.byBill[sel.b]+=used;
  const evt=outcome=>track('evaluate',{vendor:sel.v,model:sel.m,bill:sel.b,cx,stack:is.stack,gig:!!is.out,outcome});
  const ew=`評估｜${VENDORS[sel.v].agent} / ${M.name}・${BILL_LABEL[sel.b]}`;
  if(ch.short){ evt('quota'); log('bad',`✗ ${is.title}｜${ew}｜額度不夠，評估沒做完｜${ch.spend}`); render(); return; }
  is.evaluated=true;
  if(is.trap&&Math.random()<revealRate(M)){ reveal(is); evt('found'); S.st.trapFound++; log('ok',`★ ${is.title}｜${ew}｜發現牽扯架構：原估複雜度 ${is.shownCx}，實際 ${is.cx}｜${kt(tk)} tokens｜${ch.spend}｜${h1(hrs)}h`); }
  else{ evt('clear'); log('dim',`· ${is.title}｜${ew}｜評估完成，看起來沒問題｜${kt(tk)} tokens｜${ch.spend}｜${h1(hrs)}h`); }
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
    log('ok',`★ ${is.title}｜主管同意重新評估：KPI 改成 +${is.kpi}，期限延到第 ${is.due} 天｜信任 -${RESCOPE.ok}`);
  } else { S.trust=Math.max(0,S.trust-RESCOPE.no); log('warn',`! ${is.title}｜主管：不是說很簡單嗎？｜信任 -${RESCOPE.no}`); }
  render();
}

/* 工程投資：花自己的工時和公司預算，平行模式下背景 agent 照樣跑 */
export const invCount=()=>Object.keys(S.inv.md).length+INV_KEYS.filter(k=>S.inv[k]).length;
export function investBlock(k,st){
  const I=INVEST[k];
  if(k==='md'?S.inv.md[st]:S.inv[k]) return '已完成';
  if(S.hours<I.hrs-1e-9) return '工時不夠';
  if(S.corp<I.cost) return '公司預算不夠';
  return '';
}
export function invest(k,st){
  if(!INVEST[k]||(k==='md'&&!STACKS[st])||investBlock(k,st)) return false;
  const I=INVEST[k];
  S.corp-=I.cost; S.corpDay+=I.cost; S.st.corp+=I.cost;
  if(k==='md') S.inv.md[st]=true; else S.inv[k]=true;
  track('invest',{investment:k,stack:k==='md'?st:'none'});
  if(PAR()) advance(I.hrs); else S.hours-=I.hrs;
  log('ok',`★ 工程投資：${I.name}${k==='md'?`（${STACKS[st].name}）`:''}｜${h1(I.hrs)}h｜公司 ${nt(I.cost)}`);
  return true;
}
/* 採購電腦：一次只能一張申請，不扣公司 API 預算；到貨日不能超過第 20 天 */
export function hwReqBlock(k){
  if(S.hw[k]) return '已到貨';
  if(S.hwReq) return '採購審核中';
  if(S.hours<HW_REQ_HRS-1e-9) return '工時不夠';
  if(S.day+HW[k].days>20) return '來不及到貨';
  return '';
}
export function requestHw(k){
  if(!HW[k]||hwReqBlock(k)) return false;
  S.hwReq={k,day:S.day};
  track('invest',{investment:k,stack:'none'});
  if(PAR()) advance(HW_REQ_HRS); else S.hours-=HW_REQ_HRS;
  log('dim',`· 提出採購申請：${HW[k].name}（${HW[k].price}）｜${h1(HW_REQ_HRS)}h｜預計第 ${S.day+HW[k].days} 天到貨`);
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
  for(const is of S.issues.filter(i=>!i.running&&i.cx<=2).sort(queueOrder)){
    if(!canQuick()) break;
    const {i}=presetFor(is);
    if(i<0){skip++;continue;}
    if(!PAR()){const p=S.presets[i]; if(est(is,p.v,p.m,p.rv).hrs>S.hours) break;}
    if(quick(is.id,'batch')) n++; else skip++;
  }
  log('dim',`· 批次派工：派出 ${n} 張，略過 ${skip} 張`);
}
export const INV_STACKS=()=>[...S.companies,...COMPANIES.filter(k=>!S.companies.includes(k)),'fe'];
export function invHint(is){
  const out=[];
  if(S.inv.md[is.stack]) out.push(`${STACKS[is.stack].name} 有 CLAUDE.md：token ×${MD_TK}、成功率 +${Math.round(MD_P*100)}%`);
  if(S.inv.sdd) out.push(`SDD：token ×${SDD_TK}${is.cx>=3?`、成功率 +${Math.round(SDD_P*100)}%`:''}`);
  if(S.inv.tests) out.push(`單元測試：抓錯率 +${Math.round(TEST_CATCH*100)}%`);
  if(S.inv.ci&&PAR()) out.push('CI 流水線：合併衝突減半');
  if(S.inv.hook&&PAR()) out.push('pre-commit hook：審 PR 時間減半');
  if(S.inv.scan&&is.sens) out.push('secret scanning：個人帳號稽核機率減半');
  if(S.inv.fastlane&&is.store) out.push(`fastlane：退件機率 ${Math.round(FASTLANE_REJECT*100)}%`);
  if(S.inv.monitor&&is.inc) out.push(`監控告警：逾期扣信任 ${MONITOR_LATE}`);
  if(S.inv.mcp) out.push(`MCP 文件：識破率 +${Math.round(MCP_REVEAL*100)}%、評估時間減半`);
  if(S.hw.pc&&sel.v==='local') out.push(`顯卡 PC：本地執行時間 ×${PC_SPEED}`);
  return out.length?`工程投資：${out.join('；')}。`:'';
}

/* 每天抽隨機事件的機率；下班沒跑完的 agent 過夜推進的時數 */
export const EVENT_RATE=.55, OVERNIGHT_HRS=3;
/* 主管事件：KPI 要超過 天數 × PACE_KPI，稱讚 +PRAISE_TRUST、質疑 -DOUBT_TRUST；第 6 天前沒達標只提醒 */
export const PACE_KPI=7, PRAISE_TRUST=6, DOUBT_TRUST=4;
export const EVENTS=[
  ()=>{const v=pick(APIV);S.priceMod[v]*=.7;return [`${VENDORS[v].name} 新模型上架，API 降價 30%`,'接下來整個月這家的 API 都比較便宜。'];},
  ()=>{const v=pick(APIV);S.outage=v;return [`${VENDORS[v].name} 服務大當機`,`今天 ${VENDORS[v].agent} 全部不能用，不管你付的是哪種錢。`];},
  ()=>{if(S.cnBan||S.day<8)return ['主管在週會上提醒','「用 AI 前先看清楚案主合約。」沒有其他變化。'];if(0)return ['資安部門發布新版 AI 使用規範','內容跟上次一樣，大家已讀不回。'];S.cnBan=true;return ['主管宣布：全公司暫停把程式碼送到中國雲端模型','從今天起所有工單都不能用 DeepSeek、GLM、Kimi 的雲端服務，本地跑的開源權重不受影響。'];},
  ()=>{S.corp*=.7;return ['年度預算凍結','公司 API 剩餘預算砍 30%。'];},
  ()=>{const v=pick(SUBV);S.capMod[v]*=.8;return [`${VENDORS[v].name} 調整訂閱用量政策`,'這家訂閱的每日與每週額度縮水 20%。'];},
  ()=>{if(S.day<6)return ['新聞流量比平常高一點','監控曲線抖了一下，系統還撐得住。沒有其他變化。'];S.issues.push(makeIssue(true));S.issues.push(makeIssue(true));return ['大新聞爆發，流量暴增',`一次進來兩張事故單，${S.inv.monitor?'監控提早告警，明天':'今天'}下班前要處理。`];},
  ()=>{const need=S.day*PACE_KPI;
    if(S.kpi>need){S.trust=Math.min(100,S.trust+PRAISE_TRUST);return ['主管在週會上點名稱讚',`「KPI 已經 ${S.kpi}，超過 ${need}，AI 工具用得很有效率。」信任 +${PRAISE_TRUST}。`];}
    if(S.day<6)return ['主管在週會上提醒進度',`「KPI 目前 ${S.kpi}。第一週先熟悉工具，之後 KPI 要超過天數 × ${PACE_KPI}。」沒有其他變化。`];
    S.trust=Math.max(0,S.trust-DOUBT_TRUST);return ['主管問進度怎麼這麼慢',`「KPI 才 ${S.kpi}，要超過 ${need} 才跟得上進度。」信任 -${DOUBT_TRUST}。`];},
  ()=>{S.wallet+=1500;return ['外包案尾款入帳','個人錢包 +NT$1,500，可以拿來養 token。'];},
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
  const n=(k,lab)=>{const d=Math.round(S[k]-b[k]);return `${lab} ${sg(d)}${Math.abs(d)}（${Math.round(S[k])}）`;};
  const m=(k,lab)=>{const d=Math.round(S[k]-b[k]);return `${lab} ${sg(d)}${nt(Math.abs(d))}（${nt(S[k])}）`;};
  return `═ 第 ${S.day} 天下班｜${n('kpi','KPI')}｜${n('trust','信任')}｜${m('wallet','錢包')}｜${m('corp','公司')}`;
}
export function endDay(){
  const rep=[];
  if(PAR()&&S.jobs.length) advance(S.hours);
  const killed=cancelJobs(j=>j.issue.due<=S.day,'到期還沒跑完，只好中止');
  if(killed) rep.push(`${killed} 個背景 agent 跑到截止還沒完成，被你中止了。`);
  const gigLate=S.issues.filter(i=>i.out&&i.due<=S.day);
  /* 外包逾期：賠違約金，不扣 KPI 和信任 */
  gigLate.forEach(i=>{const pen=Math.round(i.pay*GIG_LATE);S.wallet-=pen;S.st.outPenalty+=pen;S.st.outLate++;log('bad',`⌛ 外包逾期：${i.title}｜違約金 ${nt(pen)}`);});
  if(gigLate.length) rep.push(`${gigLate.length} 張外包單逾期，賠了 ${nt(gigLate.reduce((a,i)=>a+Math.round(i.pay*GIG_LATE),0))} 違約金。`);
  const late=S.issues.filter(i=>!i.out&&i.due<=S.day);
  let lateTrust=0;
  late.forEach(i=>{const pen=Math.ceil(i.kpi*LATE_KPI), t=i.inc?(S.inv.monitor?MONITOR_LATE:INC_LATE_TRUST):LATE_TRUST;S.kpi-=pen;S.st.kpiLost+=pen;S.trust=Math.max(0,S.trust-t);lateTrust+=t;S.st.late++;log('bad',`⌛ 逾期：${i.title}｜KPI -${pen}｜信任 -${t}`);});
  S.issues=S.issues.filter(i=>i.due>S.day);
  if(late.length) rep.push(`${late.length} 張工單逾期，主管信任 -${lateTrust}。`);
  if(S.corpDay>CORP_DAY_LIMIT){S.trust=Math.max(0,S.trust-CORP_DAY_TRUST);rep.push(`今天公司 API 刷了 ${nt(S.corpDay)}，主管在 Slack 問你在幹嘛（信任 -${CORP_DAY_TRUST}）。`);log('warn',`! 公司單日花費 ${nt(S.corpDay)} 太高，信任 -${CORP_DAY_TRUST}`);}
  /* 買了電腦沒用：每台每天信任 -2 */
  const idle=HW_KEYS.filter(k=>S.hw[k]&&!S.hwUsed[k]);
  if(idle.length){const n=HW_IDLE*idle.length;S.trust=Math.max(0,S.trust-n);const msg=`電腦閒置：${idle.map(k=>HW[k].name).join('、')} 今天沒用到，主管覺得白買了（信任 -${n}）。`;rep.push(msg);log('warn',`! ${msg}`);}
  log('dim',daySummary());
  if(S.day>=20){render();return showEnd();}
  S.day++; S.hours=START.hours; S.corpDay=0; S.outage=null; S.dayStart=daySnap();
  for(const k of ['sub','seat'])for(const v in S.used[k])S.used[k][v].d=0;
  const monday=(S.day-1)%5===0;
  if(monday)for(const k of ['sub','seat'])for(const v in S.used[k])S.used[k][v].w=0;
  if(S.seatReq&&S.day>=S.seatReq.day+SEAT.review){
    const sv=S.seatReq.vendor, need=SEAT.trust[S.seats.length]; S.seatReq=null;
    if(S.trust>=need){S.seats.push(sv);rep.push(`採購通過：公司幫你開了 ${VENDORS[sv].name} 團隊席位。`);log('ok',`★ ${VENDORS[sv].name} 團隊席位核准`);}
    else{rep.push(`採購被退件：主管信任不夠（需要 ${need} 以上）。`);log('bad','✗ 團隊席位申請被退件');}
  }
  S.hwUsed=objOf(HW_KEYS,()=>false);
  if(S.hwReq&&S.day>=S.hwReq.day+HW[S.hwReq.k].days){
    const k=S.hwReq.k, H=HW[k]; S.hwReq=null;
    if(S.trust>=H.trust){S.hw[k]=true;S.hours-=HW_SETUP_HRS;rep.push(`採購到貨：${H.name} 架好了（架設花了 ${HW_SETUP_HRS} 小時）。`);log('ok',`★ ${H.name} 到貨，架設 ${h1(HW_SETUP_HRS)}h`);}
    else{rep.push(`採購被退件：主管信任不夠（需要 ${H.trust} 以上）。`);log('bad',`✗ ${H.name} 採購申請被退件`);}
  }
  let ev=null; if(Math.random()<EVENT_RATE) ev=pick(EVENTS)();
  if(ev) log('dim',`◆ ${ev[0]}｜${ev[1]}`);
  if(S.outage){const n=cancelJobs(j=>j.v===S.outage,'廠商當機，session 斷了');if(n)rep.push(`${n} 個跑在 ${VENDORS[S.outage].name} 的 agent 因為當機斷線。`);}
  if(S.jobs.length){ S.jobs.forEach(j=>j.left=Math.max(.05,j.left-OVERNIGHT_HRS)); rep.push(`${S.jobs.length} 個 agent 跑了一整晚，一早會陸續有結果。`); }
  const n=PAR()?3+rnd(4):2+rnd(3); for(let i=0;i<n;i++)S.issues.push(intakeIssue());
  const g=addGigs();
  log('dim',`— 第 ${S.day} 天開工${monday?'・新的一週，每週額度重置':''}，新進 ${n} 張工單${g?`，外包 ${g} 張`:''} —`);
  sel.issue=null;
  track('day_reached');
  saveGame({rep,ev,monday});
  render(); showDay(rep,ev,monday);
}

