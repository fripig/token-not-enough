import {BIG,CATCH,MANUAL_HRS,RESEARCH_DIRECT_TK,RETRY,STACK_HRS,UNFAMILIAR_HRS,FASTLANE_REJECT,HW,MD_P,MD_TK,PC_SPEED,SDD_P,SDD_TK,SEAT,STACKS,TEST_CATCH,VENDORS,CAP_SCALE,WEAK_CAP,P_TOP,cnBlock,effModel,efOf,kt,model,planOf,AI_P,CONF_MANUAL,lv} from './data.js';
import {S,sel,unfamiliar,confStacks} from './state.js';
import {PAR} from './actions.js';
import {t} from './i18n.js';

/* ===== 計算 ===== */
export function quotaLeft(kind,v){
  const p=kind==='seat'?SEAT:planOf(v); const u=S.used[kind][v]; if(!u) return 0;
  const cm=kind==='seat'?1:S.capMod[v];
  return Math.max(0,Math.min(p.day*cm-u.d,p.week*cm-u.w));
}
export function useQuota(kind,v,x){const u=S.used[kind][v];u.d+=x;u.w+=x;}

/* 自我審核：多花 token 與時間，agent 改壞時有機會當場抓到並修正，避免整單重做 */
export const REVIEW=[{get name(){return t('review.0');},tk:1,hrs:1},{get name(){return t('review.1');},tk:1.3,hrs:1.2},{get name(){return t('review.2');},tk:1.6,hrs:1.35}];
/* 抓錯率看跟成功率同一個能力差距：模型做不到的單，也比較抓不到自己的錯 */
export const catchRate=(rv,gap)=>rv===0?0:Math.min(CATCH.max,Math.max(0,CATCH.base+CATCH.per*gap/CAP_SCALE+(rv===2?CATCH.strict:0)+TEST_CATCH[lv(S.inv.tests)]));
/* 技術線效果：只看技術線本身的特性，不替各家模型設「誰比較會」的分數 */
export const conventional=is=>(is.stack==='laravel'||is.stack==='rails')&&is.cx<=3; // 框架慣例多
export const STORE_REJECT=.2;                                                       // App Store 退件機率
export const storeReject=()=>S.inv.fastlane?FASTLANE_REJECT:STORE_REJECT;          // 有上架自動化時降低
export function stackGap(is,M){
  if(conventional(is)) return CAP_SCALE;
  if(is.stack==='rust'&&M.cap<WEAK_CAP) return -CAP_SCALE;                            // borrow checker
  return 0;
}
export const stackHrs=is=>STACK_HRS[is.stack]||1;     // 編譯測試、模擬器、CI 與 terraform
export function stackHint(is){
  if(conventional(is)) return t('hint.conv',{st:STACKS[is.stack].name});
  if(is.stack==='rust') return t('hint.rust',{x:stackHrs(is),w:WEAK_CAP});
  if(is.stack==='app') return t('hint.app',{x:stackHrs(is),store:is.store?t('hint.appStore',{p:Math.round(storeReject()*100)}):''});
  if(is.stack==='devops') return t('hint.devops',{x:stackHrs(is)});
  if(is.stack==='sre') return t('hint.sre');
  return '';
}
/* 本地 GPU 一次只能跑一個 agent，跑的時候電腦被吃滿，也不能自己手寫；買了電腦之後手寫不受影響 */
export const localBusy=()=>S.jobs.some(j=>j.b==='local'||j.rvb==='local');
export const hasHw=()=>Object.values(S.hw).some(Boolean);
export const manualBlocked=()=>localBusy()&&!hasHw();
/* 要先買電腦才能用的本地模型 */
export const hwBlock=M=>M.hw&&!S.hw[M.hw]?t('why.needHw',{name:HW[M.hw].name}):'';
/* 有顯卡的 PC：本地模型都變快 */
export const localSpeed=v=>v==='local'&&S.hw.pc?PC_SPEED:1;
export const manualHrs=is=>is.cx*MANUAL_HRS*(is.tries?RETRY.hrs:1)*(unfamiliar(is)?UNFAMILIAR_HRS:1)*(confStacks().has(is.stack)?CONF_MANUAL:1);
/* 進階模式的推理強度套在模型上；能力超過工單的 token 折扣看原本的模型 */
/* 成功率錨點：能力差 +20、+10、0、−10、−20、−30（能力 ×10 的刻度），中間線性內插、兩端截平 */
export const P_STEP=[.95,.88,.75,.5,.25,.1];
export function pStep(gap){
  const x=Math.min(P_STEP.length-1,Math.max(0,(P_TOP-gap)/CAP_SCALE)), i=Math.floor(x);
  return i>=P_STEP.length-1?P_STEP[i]:P_STEP[i]+(P_STEP[i+1]-P_STEP[i])*(x-i);
}
/* 大型 codebase：長 context 的模型能力差距 +BIG.gap，能力低於 WEAK_CAP 的其他模型 −BIG.gap */
export const bigGap=(is,M)=>!is.big?0:M.ctx?BIG.gap:M.cap<WEAK_CAP?-BIG.gap:0;
/* SDD 套用的等級：選的等級（沒選當 2）和已買的等級取小的 */
export const sddLevel=(req=sel.sdd)=>Math.min(req??2,lv(S.inv.sdd));
/* 交叉審核：實際生效的審核模型。沒買交叉審核工具、不審核或選同一個時回傳 null（照原本同一個模型審） */
export const reviewer=(o=sel)=>!lv(S.inv.xreview)||!o.rv||o.rvv==null?null:{v:o.rvv,m:o.rvm,b:o.rvb};
export function est(is,v,mid,rv=sel.rv,ef=sel.ef,sd=sel.sdd,rr=reviewer({...sel,rv})){
  const M0=model(v,mid), M=effModel(M0,efOf(ef)), raw=M.cap-is.cx*CAP_SCALE, diff=raw+stackGap(is,M)+bigGap(is,M);
  const md=lv(S.inv.md[is.stack]), sdd=sddLevel(sd);
  /* 交叉審核時寫的那段照不審核算，審核那段另外算 */
  const rw=rr?0:rv;
  const tk=is.base*M.verb*(is.big&&M.ctx?BIG.tk:1)*(M0.cap-is.cx*CAP_SCALE>=CAP_SCALE?.85:1)*REVIEW[rw].tk*(md?MD_TK:1)*SDD_TK[sdd]*(is.research?RESEARCH_DIRECT_TK:1);
  /* 投資把剩下的失敗打折，不直接加百分點 */
  const f=(1-pStep(diff))*(1-MD_P[md])*(is.cx>=3?1-SDD_P[sdd]:1)*(1-AI_P)**lv(S.inv.ai);
  const p=Math.max(.05,Math.min(.97,1-f));
  let c=catchRate(rv,diff), R=null, rtk=0, rhrs=0;
  if(rr){
    /* 審核模型一律中強度；抓錯率看審核模型的能力差距，token 與時間照審核模型算 */
    R=model(rr.v,rr.m); c=catchRate(rv,R.cap-is.cx*CAP_SCALE+stackGap(is,R)+bigGap(is,R));
    rtk=tk*(REVIEW[rv].tk-1)*R.verb/M.verb;
    rhrs=is.cx*R.speed*localSpeed(rr.v)*(is.tries?RETRY.hrs:1)*stackHrs(is)*(REVIEW[rv].hrs-1);
  }
  return {M,tk,lo:tk*.7,hi:tk*1.3,p,c,pe:(p+(1-p)*c)*(is.store?1-storeReject():1),hrs:is.cx*M.speed*localSpeed(v)*(is.tries?RETRY.hrs:1)*REVIEW[rw].hrs*stackHrs(is)+rhrs,rv:rr,R,rtk,rlo:rtk*.7,rhi:rtk*1.3};
}
/* 審核模型按鈕能不能選（付費方式另外看）：當機、案主禁用、沒買電腦、寫的是本地、本地 GPU 忙；wv 是寫的模型的廠商 */
export function rvModelBlock(is,v,M,wv=sel.v){
  if(S.outage===v) return t('ui.q.down');
  const why=cnBlock(is,v,M)||hwBlock(M); if(why) return why;
  if(v==='local'&&wv==='local') return t('why.rvLocal');
  if(v==='local'&&PAR()&&localBusy()) return t('why.localBusy');
  return '';
}
/* 審核模型對這張工單能不能用（含付費方式）；不能用時回傳原因 */
export function reviewerBlock(is,rr,wv){
  if(!rr) return '';
  const why=rvModelBlock(is,rr.v,model(rr.v,rr.m),wv); if(why) return why;
  if(rr.b==='seat'&&!S.seats.includes(rr.v)) return t('why.noSeat');
  const bl=bills(rr.v,is).find(b=>b.id===rr.b); if(!bl) return t('why.bill'); if(!bl.ok) return bl.note;
  return '';
}
/* 額度夠的席位或訂閱（機敏單只看席位，個人訂閱會被稽核）；need(k) 是這種付費方式要用的額度 */
export function quotaBill(v,is,need){
  const bl=bills(v,is);
  for(const k of is?.sens?['seat']:['seat','sub']){
    if(!bl.find(b=>b.id===k&&b.ok)) continue;
    const q=quotaLeft(k,v); if(q>0&&q>=need(k)) return k;
  }
  return null;
}
/* 換審核模型時的預設付費：額度夠的席位或訂閱，否則公司 API、個人 API，都不行才用第一個能用的 */
export function rvPrefBill(is,v,m){
  if(v==='local') return 'local';
  const k=quotaBill(v,is,k=>is?reviewCost(est(is,sel.v,sel.m,sel.rv,sel.ef,sel.sdd,{v,m,b:k})).hi:0); if(k) return k;
  const bl=bills(v,is);
  return (['corp','api'].map(id=>bl.find(b=>b.id===id&&b.ok)).find(Boolean)||bl.find(b=>b.ok)||bl[0]).id;
}
/* 審核那段的花費（額度或錢），沒有交叉審核時 null */
export const reviewCost=e=>e.rv?costLine(e.rv.b,e.R,e.rv.v,{lo:e.rlo,hi:e.rhi}):null;

/* 外包單只能自己付：公司 API 與公司席位都不能用 */
export const GIG_NOTE=()=>t('why.gig');
export const gigBlocked=(is,b)=>!!is?.out&&(b==='corp'||b==='seat');
export function bills(v,is){
  if(v==='local') return [{id:'local',label:t('bill.local'),note:t('bill.localNote'),ok:true}];
  const V=VENDORS[v], pl=planOf(v), out=[];
  out.push({id:'sub',label:t('bill.sub'),note:pl.id==='none'?t('bill.noPlan'):t('bill.planLeft',{plan:pl.name,n:kt(quotaLeft('sub',v))}),ok:pl.id!=='none'});
  if(S.seats.includes(v)) out.push({id:'seat',label:t('bill.seat'),note:t('bill.left',{n:kt(quotaLeft('seat',v))}),ok:true});
  out.push(S.wallet>0?{id:'api',label:t('bill.api'),note:t('bill.card'),ok:true}:{id:'api',label:t('bill.api'),note:t('why.walletEmpty'),ok:false});
  out.push({id:'corp',label:t('bill.corp'),note:!V.corp?t('bill.noContract'):S.corp<=0?t('bill.budgetOut'):t('bill.dept'),ok:V.corp&&S.corp>0});
  return out.map(b=>gigBlocked(is,b.id)?{...b,note:GIG_NOTE(),ok:false}:b);
}
/* 換廠商時的預設付費：有席位且額度夠用席位，否則有訂閱且額度夠用訂閱，都不行回傳 null（維持原本）；機敏單不自動換成個人訂閱（會被稽核） */
export function prefBill(v,is,m){
  if(v==='local') return null;
  const M=model(v,m);
  return quotaBill(v,is,k=>is?costLine(k,M,v,est(is,v,m)).hi:0);
}
export function costLine(b,M,v,e){
  if(b==='sub'||b==='seat') return {t:t('cost.quota'),lo:e.lo*M.w,hi:e.hi*M.w,unit:'q'};
  if(b==='local') return {t:t('cost.spend'),lo:0,hi:0,unit:'$'};
  const pm=S.priceMod[v]; return {t:t(b==='corp'?'cost.corp':'cost.self'),lo:e.lo*M.price*pm,hi:e.hi*M.price*pm,unit:'$'};
}

/* 派工方案對這張工單能不能用；不能用時回傳原因（工作槽與工時不算方案的問題） */
export function presetBlock(is,p){
  const M=model(p.v,p.m);
  if(S.outage===p.v) return t('ui.q.down');
  const why=cnBlock(is,p.v,M)||hwBlock(M); if(why) return why;
  if(gigBlocked(is,p.b)) return GIG_NOTE();
  if(p.b==='seat'&&!S.seats.includes(p.v)) return t('why.noSeat');
  const bl=bills(p.v,is).find(b=>b.id===p.b); if(!bl) return t('why.bill'); if(!bl.ok) return bl.note;
  if(p.b==='local'&&PAR()&&localBusy()) return t('why.localBusy');
  const rr=reviewer(p), e=est(is,p.v,p.m,p.rv,p.ef,p.sdd,rr), cl=costLine(p.b,M,p.v,e);
  if((p.b==='sub'||p.b==='seat')&&cl.hi>quotaLeft(p.b,p.v)) return t('why.quota');
  if(p.b==='api'&&cl.hi>S.wallet) return t('why.wallet');
  /* 交叉審核：審核模型照同樣的順序檢查，原因前面加「審核：」；同一家同一種額度時兩段加起來比 */
  if(!rr) return '';
  const rw=reviewerBlock(is,rr,p.v); if(rw) return t('why.rv',{w:rw});
  const rc=reviewCost(e), share=rr.v===p.v&&rr.b===p.b;
  if((rr.b==='sub'||rr.b==='seat')&&rc.hi+(share?cl.hi:0)>quotaLeft(rr.b,rr.v)) return t('why.rv',{w:t('why.quota')});
  if(rr.b==='api'&&rc.hi+(p.b==='api'?cl.hi:0)>S.wallet) return t('why.rv',{w:t('why.wallet')});
  return '';
}
export function presetFor(is){
  const skip=[];
  for(let i=0;i<S.presets.length;i++){ const r=presetBlock(is,S.presets[i]); if(!r) return {i,skip}; skip.push({i,r}); }
  return {i:-1,skip};
}

/* 整個月都保留，月底可以拿來復盤；開新局時 start() 清空 */
export function log(cls,msg){S.log.unshift({cls,msg:`D${String(S.day).padStart(2,'0')} ${msg}`});}

