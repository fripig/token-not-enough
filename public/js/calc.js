import {BIG,CATCH,MANUAL_HRS,RESEARCH_DIRECT_TK,RETRY,STACK_HRS,UNFAMILIAR_HRS,FASTLANE_REJECT,HW,MD_P,MD_TK,PC_SPEED,SDD_P,SDD_TK,SEAT,STACKS,TEST_CATCH,VENDORS,cnBlock,effModel,efOf,kt,model,planOf,AI_P,CONF_MANUAL,lv} from './data.js';
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
export const catchRate=(rv,M)=>rv===0?0:Math.min(CATCH.max,CATCH.base+CATCH.per*M.cap+(rv===2?CATCH.strict:0)+TEST_CATCH[lv(S.inv.tests)]);
/* 技術線效果：只看技術線本身的特性，不替各家模型設「誰比較會」的分數 */
export const conventional=is=>(is.stack==='laravel'||is.stack==='rails')&&is.cx<=3; // 框架慣例多
export const STORE_REJECT=.2;                                                       // App Store 退件機率
export const storeReject=()=>S.inv.fastlane?FASTLANE_REJECT:STORE_REJECT;          // 有上架自動化時降低
export function stackGap(is,M){
  if(conventional(is)) return 1;
  if(is.stack==='rust'&&M.cap<4) return -1;                            // borrow checker
  return 0;
}
export const stackHrs=is=>STACK_HRS[is.stack]||1;     // 編譯測試、模擬器、CI 與 terraform
export function stackHint(is){
  if(conventional(is)) return t('hint.conv',{st:STACKS[is.stack].name});
  if(is.stack==='rust') return t('hint.rust',{x:stackHrs(is)});
  if(is.stack==='app') return t('hint.app',{x:stackHrs(is),store:is.store?t('hint.appStore',{p:Math.round(storeReject()*100)}):''});
  if(is.stack==='devops') return t('hint.devops',{x:stackHrs(is)});
  if(is.stack==='sre') return t('hint.sre');
  return '';
}
/* 本地 GPU 一次只能跑一個 agent，跑的時候電腦被吃滿，也不能自己手寫；買了電腦之後手寫不受影響 */
export const localBusy=()=>S.jobs.some(j=>j.b==='local');
export const hasHw=()=>Object.values(S.hw).some(Boolean);
export const manualBlocked=()=>localBusy()&&!hasHw();
/* 要先買電腦才能用的本地模型 */
export const hwBlock=M=>M.hw&&!S.hw[M.hw]?t('why.needHw',{name:HW[M.hw].name}):'';
/* 有顯卡的 PC：本地模型都變快 */
export const localSpeed=v=>v==='local'&&S.hw.pc?PC_SPEED:1;
export const manualHrs=is=>is.cx*MANUAL_HRS*(is.tries?RETRY.hrs:1)*(unfamiliar(is)?UNFAMILIAR_HRS:1)*(confStacks().has(is.stack)?CONF_MANUAL:1);
/* 進階模式的推理強度套在模型上；能力超過工單的 token 折扣看原本的模型 */
/* 成功率階梯：能力差 ≥1、0、−1、−2、更低 */
export const P_STEP=[.95,.8,.5,.25,.1];
/* SDD 套用的等級：選的等級（沒選當 2）和已買的等級取小的 */
export const sddLevel=(req=sel.sdd)=>Math.min(req??2,lv(S.inv.sdd));
export function est(is,v,mid,rv=sel.rv,ef=sel.ef,sd=sel.sdd){
  const M0=model(v,mid), M=effModel(M0,efOf(ef)), raw=M.cap-is.cx, diff=raw+stackGap(is,M);
  const md=lv(S.inv.md[is.stack]), sdd=sddLevel(sd);
  const tk=is.base*M.verb*(is.big&&M.ctx?BIG.tk:1)*(M0.cap-is.cx>=1?.85:1)*REVIEW[rv].tk*(md?MD_TK:1)*SDD_TK[sdd]*(is.research?RESEARCH_DIRECT_TK:1);
  let p=P_STEP[Math.min(4,Math.max(0,1-diff))];
  if(is.big&&M.ctx)p+=BIG.p; if(is.big&&!M.ctx&&M.cap<4)p-=BIG.p;
  p+=MD_P[md]; if(is.cx>=3)p+=SDD_P[sdd]; p+=AI_P*lv(S.inv.ai);
  p=Math.max(.05,Math.min(.97,p));
  const c=catchRate(rv,M);
  return {M,tk,lo:tk*.7,hi:tk*1.3,p,c,pe:(p+(1-p)*c)*(is.store?1-storeReject():1),hrs:is.cx*M.speed*localSpeed(v)*(is.tries?RETRY.hrs:1)*REVIEW[rv].hrs*stackHrs(is)};
}

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
  const cl=costLine(p.b,M,p.v,est(is,p.v,p.m,p.rv,p.ef,p.sdd));
  if((p.b==='sub'||p.b==='seat')&&cl.hi>quotaLeft(p.b,p.v)) return t('why.quota');
  if(p.b==='api'&&cl.hi>S.wallet) return t('why.wallet');
  return '';
}
export function presetFor(is){
  const skip=[];
  for(let i=0;i<S.presets.length;i++){ const r=presetBlock(is,S.presets[i]); if(!r) return {i,skip}; skip.push({i,r}); }
  return {i:-1,skip};
}

/* 整個月都保留，月底可以拿來復盤；開新局時 start() 清空 */
export function log(cls,msg){S.log.unshift({cls,msg:`D${String(S.day).padStart(2,'0')} ${msg}`});}

