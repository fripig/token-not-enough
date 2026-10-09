import {APIV,BASE,BILL_LABEL,COMPANIES,INVEST,KPI,MCP_REVEAL,MD_P,MD_TK,PN,R,SDD_P,SDD_TK,SDD_TRAP_STOP,STACKS,SUBV,TEST_CATCH,VENDORS,h1,kt,model,nt,pick,rnd} from './data.js';
import {S,hardStack,makeIssue,sel} from './state.js';
import {REVIEW,STORE_REJECT,est,localBusy,log,manualHrs,presetFor,quotaLeft,useQuota} from './calc.js';
import {render} from './view.js';
import {showDay,showEnd} from './modals.js';

/* ===== 動作 ===== */
export const PAR=()=>S.mode==='parallel';
export const queueOrder=(a,b)=>a.due-b.due||b.kpi-a.kpi;
export const SLOT_CHOICES=[2,3,4,5,6];
export const clock=el=>{const m=Math.round((9+el)*60);return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
/* 平行加成：同時在跑的 agent 越多，重複載入 context 與協調的 token 越多 */
export const parMul=()=>PAR()?1+.15*S.jobs.length:1;
/* 還沒曝光的陷阱題照真實複雜度跑；模型能力不夠就做到一半停下來 */
export const TRAP_STOP=.4;
export const hiddenTrap=is=>is.trap&&!is.revealed;
export const trueView=is=>hiddenTrap(is)?{...is,cx:is.trueCx,base:is.trueBase}:is;
export function reveal(is){ if(!hiddenTrap(is)) return; is.shownCx=is.cx; is.cx=is.trueCx; is.base=is.trueBase; is.revealed=true; }
export function makeJob(is){
  const hidden=hiddenTrap(is), e=est(trueView(is),sel.v,sel.m);
  const stop=hidden&&e.M.cap<is.trueCx, f=stop?(S.inv.sdd?SDD_TRAP_STOP:TRAP_STOP):1;
  const ok=!stop&&Math.random()<e.p;
  return {issue:is,v:sel.v,b:sel.b,M:e.M,mul:parMul(),rv:sel.rv,tk:e.tk*f*R(.7,1.3),hrs:e.hrs*f*R(.8,1.2),ok,caught:!stop&&!ok&&Math.random()<e.c,left:0,hidden,stop,sdd:S.inv.sdd};
}
export function dispatch(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is) return;
  const j=makeJob(is);
  if(PAR()){
    if(S.jobs.length>=S.slots||(j.b==='local'&&localBusy())) return;
    j.left=j.hrs; is.running=true; S.jobs.push(j); sel.issue=null;
    log('dim',`→ 派出 ${is.title}｜${VENDORS[j.v].agent} / ${j.M.name}｜預計 ${h1(j.hrs)}h`);
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
export function quick(id){
  const is=S.issues.find(i=>i.id===id); if(!is||is.running||!canQuick()) return false;
  const {i,skip}=presetFor(is); if(i<0) return false;
  Object.assign(sel,S.presets[i],{issue:id});
  if(skip.length) log('dim',`· 一鍵派工用方案 ${PN[i]}（略過 ${skip.map(s=>`${PN[s.i]}：${s.r}`).join('、')}）`);
  dispatch(); return true;
}
export const loadPreset=i=>Object.assign(sel,S.presets[i]);
export function savePreset(i){
  S.presets[i]={v:sel.v,m:sel.m,b:sel.b,rv:sel.rv};
  log('dim',`· 存成方案 ${PN[i]}：${VENDORS[sel.v].agent} / ${model(sel.v,sel.m).name}・${BILL_LABEL[sel.b]}・${REVIEW[sel.rv].name}`);
}
/* 平行模式：推進時鐘，背景 agent 跑完就結算，成功的要花時間審 PR */
/* 合併衝突機率：每個還在跑的 agent +10%，補測試減半 */
export const conflictRate=()=>.1*S.jobs.length*(S.inv.tests?.5:1);
export function advance(dt){
  while(dt>1e-9&&S.hours>1e-9){
    const next=S.jobs.length?Math.min(...S.jobs.map(j=>j.left)):Infinity;
    const step=Math.min(dt,next,S.hours);
    S.jobs.forEach(j=>j.left-=step); S.hours-=step; dt-=step;
    const fin=S.jobs.filter(j=>j.left<=1e-9); S.jobs=S.jobs.filter(j=>j.left>1e-9);
    for(const j of fin){
      j.issue.running=false;
      const r=settle(j,{conflict:conflictRate()});
      if(r.ok||r.rejected){const rv=j.issue.cx*.2*(j.rv?.5:1);dt+=rv;log('dim',`  ↳ 審 PR 花了 ${h1(rv)}h`);}
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
  if(b==='api'){ const c=tk*M.price*S.priceMod[v]; S.wallet-=c; S.st.api+=c; return {spend:nt(c),short:false,frac:1}; }
  if(b==='corp'){ const c=tk*M.price*S.priceMod[v]; S.corp-=c; S.corpDay+=c; S.st.corp+=c; return {spend:'公司 '+nt(c),short:false,frac:1}; }
  return {spend:'電費',short:false,frac:1};
}
/* 機敏程式碼送進個人帳號的稽核風險；派工與評估共用 */
export const auditRisk=(is,b)=>is.sens&&(b==='sub'||b==='api');
export const auditOdds=v=>VENDORS[v].cn?.6:.35;
export function auditRoll(is,b,v){
  if(auditRisk(is,b)&&Math.random()<auditOdds(v)){
    S.trust=Math.max(0,S.trust-12); S.st.audits++;
    log('warn',`! 資安稽核：機敏程式碼送進${VENDORS[v].cn?'中國雲端模型':'個人帳號'}被抓到，主管信任 -12`);
  }
}
export function checkOverdraft(){ if(S.corp<0){ log('warn','! 公司 API 預算透支，財務來信關切'); S.trust=Math.max(0,S.trust-8); S.corp=0; } }
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
  if(ok&&is.store&&Math.random()<STORE_REJECT){ok=false;rejected=true;note='卡在 App Store 審核被退件';}
  S.st.tk[v]+=tk; S.st.byBill[b]+=tk;
  const who=`${VENDORS[v].agent} / ${M.name}`;
  if(ok){
    S.issues=S.issues.filter(i=>i!==is); S.kpi+=is.kpi; S.st.done++;
    if(is.inc) S.trust=Math.min(100,S.trust+2);
    if(fixed)S.st.caught++;
    log('ok',`✓ ${is.title}｜${who}${j.rv?`・${REVIEW[j.rv].name}`:''}｜${kt(tk)} tokens｜${spend}｜${h1(hrs)}h｜KPI +${is.kpi}`);
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
    is.tries++; is.base*=j.stop?1:.7;
    log('bad',`✗ ${is.title}｜${who}｜${note||'測試沒過，改壞了'}｜燒掉 ${kt(tk)}｜${spend}｜${h1(hrs)}h`);
  }
  auditRoll(is,b,v); checkOverdraft();
  return {ok,hrs,rejected};
}
export function wait(next){
  if(next){ if(!S.jobs.length) return; advance(Math.min(...S.jobs.map(j=>j.left))); }
  else advance(1);
  render();
}
export function manual(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is) return;
  const hrs=manualHrs(is);
  if(hrs>S.hours||localBusy()) return;
  if(PAR()){ is.running=true; advance(hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=hrs;
  S.st.manual++;
  if(hiddenTrap(is)){ reveal(is); S.st.trapHit++; log('bad',`✗ ${is.title}｜手寫到一半發現要動架構｜${h1(hrs)}h｜原估複雜度 ${is.shownCx}，實際 ${is.cx}`); render(); return; }
  const ok=is.cx<=3||Math.random()<.7;
  if(ok){S.issues=S.issues.filter(i=>i!==is);S.kpi+=is.kpi;S.st.done++;sel.issue=null;log('ok',`✓ ${is.title}｜自己手寫｜0 tokens｜${h1(hrs)}h｜KPI +${is.kpi}`);}
  else{is.tries++;is.base*=.7;log('bad',`✗ ${is.title}｜自己手寫卡關｜${h1(hrs)}h`);}
  render();
}

/* 評估架構：先花少量 token 讓 agent 讀架構，模型越強越容易識破陷阱 */
export const EVAL_TK=40;
export const canEvaluate=is=>!is.inc&&!is.merge&&!is.evaluated&&!is.revealed;
export const evalCost=M=>({tk:EVAL_TK*M.verb,hrs:.5*M.speed*(S.inv.mcp?.5:1)});
export const revealRate=M=>Math.min(.95,.35+.15*M.cap+(S.inv.mcp?MCP_REVEAL:0));
export function evaluate(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||!canEvaluate(is)) return;
  const M=model(sel.v,sel.m), {tk,hrs}=evalCost(M);
  if(hrs>S.hours||(sel.b==='local'&&localBusy())) return;
  if(PAR()){ is.running=true; advance(hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=hrs;
  const ch=charge(sel.b,sel.v,M,tk), used=tk*ch.frac;
  S.st.tk[sel.v]+=used; S.st.byBill[sel.b]+=used;
  if(ch.short){ log('bad',`✗ ${is.title}｜評估｜額度不夠，評估沒做完｜${ch.spend}`); render(); return; }
  is.evaluated=true;
  if(is.trap&&Math.random()<revealRate(M)){ reveal(is); S.st.trapFound++; log('ok',`★ ${is.title}｜評估發現牽扯架構：原估複雜度 ${is.shownCx}，實際 ${is.cx}｜${kt(tk)} tokens｜${ch.spend}｜${h1(hrs)}h`); }
  else log('dim',`· ${is.title}｜評估完成，看起來沒問題｜${kt(tk)} tokens｜${ch.spend}｜${h1(hrs)}h`);
  auditRoll(is,sel.b,sel.v); checkOverdraft();
  render();
}
/* 陷阱曝光後可以找主管重新評估一次：信任夠就調 KPI、延期限 */
export const RESCOPE_TRUST=50;
export function rescope(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||!is.revealed||is.rescoped) return;
  is.rescoped=true;
  if(S.trust>=RESCOPE_TRUST){
    S.trust-=5; is.kpi=Math.round(KPI[is.cx]*(hardStack(is.stack)?1.3:1)); is.due=Math.min(20,is.due+2);
    log('ok',`★ ${is.title}｜主管同意重新評估：KPI 改成 +${is.kpi}，期限延到第 ${is.due} 天｜信任 -5`);
  } else { S.trust=Math.max(0,S.trust-3); log('warn',`! ${is.title}｜主管：不是說很簡單嗎？｜信任 -3`); }
  render();
}

/* 工程投資：花自己的工時和公司預算，平行模式下背景 agent 照樣跑 */
export const invCount=()=>Object.keys(S.inv.md).length+['tests','skills','mcp','sdd'].filter(k=>S.inv[k]).length;
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
  if(PAR()) advance(I.hrs); else S.hours-=I.hrs;
  log('ok',`★ 工程投資：${I.name}${k==='md'?`（${STACKS[st].name}）`:''}｜${h1(I.hrs)}h｜公司 ${nt(I.cost)}`);
  return true;
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
    if(quick(is.id)) n++; else skip++;
  }
  log('dim',`· 批次派工：派出 ${n} 張，略過 ${skip} 張`);
}
export const INV_STACKS=()=>[...S.companies,...COMPANIES.filter(k=>!S.companies.includes(k)),'fe'];
export function invHint(is){
  const out=[];
  if(S.inv.md[is.stack]) out.push(`${STACKS[is.stack].name} 有 CLAUDE.md：token ×${MD_TK}、成功率 +${Math.round(MD_P*100)}%`);
  if(S.inv.sdd) out.push(`SDD：token ×${SDD_TK}${is.cx>=3?`、成功率 +${Math.round(SDD_P*100)}%`:''}`);
  if(S.inv.tests) out.push(`有測試：抓錯率 +${Math.round(TEST_CATCH*100)}%、合併衝突減半`);
  if(S.inv.mcp) out.push(`MCP 文件：識破率 +${Math.round(MCP_REVEAL*100)}%、評估時間減半`);
  return out.length?`工程投資：${out.join('；')}。`:'';
}

export const EVENTS=[
  ()=>{const v=pick(APIV);S.priceMod[v]*=.7;return [`${VENDORS[v].name} 新模型上架，API 降價 30%`,'接下來整個月這家的 API 都比較便宜。'];},
  ()=>{const v=pick(APIV);S.outage=v;return [`${VENDORS[v].name} 服務大當機`,`今天 ${VENDORS[v].agent} 全部不能用，不管你付的是哪種錢。`];},
  ()=>{if(S.cnBan||S.day<8)return ['主管在週會上提醒','「用 AI 前先看清楚案主合約。」沒有其他變化。'];if(0)return ['資安部門發布新版 AI 使用規範','內容跟上次一樣，大家已讀不回。'];S.cnBan=true;return ['主管宣布：全公司暫停把程式碼送到中國雲端模型','從今天起所有工單都不能用 DeepSeek、GLM、Kimi 的雲端服務，本地跑的開源權重不受影響。'];},
  ()=>{S.corp*=.7;return ['年度預算凍結','公司 API 剩餘預算砍 30%。'];},
  ()=>{const v=pick(SUBV);S.capMod[v]*=.8;return [`${VENDORS[v].name} 調整訂閱用量政策`,'這家訂閱的每日與每週額度縮水 20%。'];},
  ()=>{S.issues.push(makeIssue(true));S.issues.push(makeIssue(true));return ['大新聞爆發，流量暴增','一次進來兩張事故單，今天下班前要處理。'];},
  ()=>{const g=S.kpi>S.day*7;S.trust=Math.max(0,Math.min(100,S.trust+(g?6:-4)));return g?['主管在週會上點名稱讚','「AI 工具用得很有效率。」信任 +6。']:['主管問進度怎麼這麼慢','「不是有買 AI 嗎？」信任 -4。'];},
  ()=>{S.wallet+=1500;return ['外包案尾款入帳','個人錢包 +NT$1,500，可以拿來養 token。'];},
];

export function endDay(){
  const rep=[];
  if(PAR()&&S.jobs.length) advance(S.hours);
  const killed=cancelJobs(j=>j.issue.due<=S.day,'到期還沒跑完，只好中止');
  if(killed) rep.push(`${killed} 個背景 agent 跑到截止還沒完成，被你中止了。`);
  const late=S.issues.filter(i=>i.due<=S.day);
  late.forEach(i=>{const pen=Math.ceil(i.kpi*.5);S.kpi-=pen;S.st.kpiLost+=pen;S.trust=Math.max(0,S.trust-(i.inc?8:4));S.st.late++;log('bad',`⌛ 逾期：${i.title}｜KPI -${pen}`);});
  S.issues=S.issues.filter(i=>i.due>S.day);
  if(late.length) rep.push(`${late.length} 張工單逾期，主管信任下降。`);
  if(S.corpDay>1500){S.trust=Math.max(0,S.trust-6);rep.push(`今天公司 API 刷了 ${nt(S.corpDay)}，主管在 Slack 問你在幹嘛（信任 -6）。`);log('warn',`! 公司單日花費 ${nt(S.corpDay)} 太高，信任 -6`);}
  if(S.day>=20){render();return showEnd();}
  S.day++; S.hours=8; S.corpDay=0; S.outage=null;
  for(const k of ['sub','seat'])for(const v in S.used[k])S.used[k][v].d=0;
  const monday=(S.day-1)%5===0;
  if(monday)for(const k of ['sub','seat'])for(const v in S.used[k])S.used[k][v].w=0;
  if(S.seat.status==='pending'&&S.day>=S.seat.day+5){
    if(S.trust>=55){S.seat.status='approved';rep.push(`採購通過：公司幫你開了 ${VENDORS[S.seat.vendor].name} 團隊席位。`);log('ok',`★ ${VENDORS[S.seat.vendor].name} 團隊席位核准`);}
    else{S.seat.status='rejected';rep.push('採購被退件：主管信任不夠（需要 55 以上）。');log('bad','✗ 團隊席位申請被退件');}
  }
  let ev=null; if(Math.random()<.55) ev=pick(EVENTS)();
  if(S.outage){const n=cancelJobs(j=>j.v===S.outage,'廠商當機，session 斷了');if(n)rep.push(`${n} 個跑在 ${VENDORS[S.outage].name} 的 agent 因為當機斷線。`);}
  if(S.jobs.length){ S.jobs.forEach(j=>j.left=Math.max(.05,j.left-3)); rep.push(`${S.jobs.length} 個 agent 跑了一整晚，一早會陸續有結果。`); }
  const n=PAR()?3+rnd(4):2+rnd(3); for(let i=0;i<n;i++)S.issues.push(makeIssue(Math.random()<.12));
  log('dim',`— 第 ${S.day} 天開工，新進 ${n} 張工單 —`);
  sel.issue=null;
  render(); showDay(rep,ev,monday);
}

