import {MD_P,MD_TK,SDD_P,SDD_TK,SEAT,STACKS,TEST_CATCH,VENDORS,cnBlock,kt,model,planOf} from './data.js';
import {S,sel,unfamiliar} from './state.js';
import {PAR,parMul} from './actions.js';

/* ===== 計算 ===== */
export function quotaLeft(kind,v){
  const p=kind==='seat'?SEAT:planOf(v); const u=S.used[kind][v]; if(!u) return 0;
  const cm=kind==='seat'?1:S.capMod[v];
  return Math.max(0,Math.min(p.day*cm-u.d,p.week*cm-u.w));
}
export function useQuota(kind,v,x){const u=S.used[kind][v];u.d+=x;u.w+=x;}

/* 自我審核：多花 token 與時間，agent 改壞時有機會當場抓到並修正，避免整單重做 */
export const REVIEW=[{name:'不審核',tk:1,hrs:1},{name:'自審',tk:1.3,hrs:1.2},{name:'嚴格審核',tk:1.6,hrs:1.35}];
export const catchRate=(rv,M)=>rv===0?0:Math.min(.95,.45+.08*M.cap+(rv===2?.2:0)+(S.inv.tests?TEST_CATCH:0));
/* 技術線效果：只看技術線本身的特性，不替各家模型設「誰比較會」的分數 */
export const conventional=is=>(is.stack==='laravel'||is.stack==='rails')&&is.cx<=3; // 框架慣例多
export const STORE_REJECT=.2;                                                       // App Store 退件機率
export function stackGap(is,M){
  if(conventional(is)) return 1;
  if(is.stack==='rust'&&M.cap<4) return -1;                            // borrow checker
  return 0;
}
export const stackHrs=is=>is.stack==='rust'?1.2:is.stack==='app'?1.15:1;     // 編譯測試、模擬器
export function stackHint(is){
  if(conventional(is)) return `${STACKS[is.stack].name} 慣例多：複雜度 3 以下的工單，成功率視同簡單一級。`;
  if(is.stack==='rust') return `Rust：編譯測試比較慢，執行時間 ×${stackHrs(is)}；能力 4 以下的模型容易卡在 borrow checker，成功率視同難一級。`;
  if(is.stack==='app') return `App：要跑模擬器，執行時間 ×${stackHrs(is)}${is.store?`；這張要過 App Store 審核，agent 做完仍有 ${STORE_REJECT*100}% 機率被退件，自我審核救不回來`:''}。`;
  return '';
}
/* 本地 GPU 一次只能跑一個 agent，跑的時候電腦被吃滿，也不能自己手寫 */
export const localBusy=()=>S.jobs.some(j=>j.b==='local');
export const manualHrs=is=>is.cx*2.2*(is.tries?.8:1)*(unfamiliar(is)?2:1);
export function est(is,v,mid,rv=sel.rv){
  const M=model(v,mid), raw=M.cap-is.cx, diff=raw+stackGap(is,M);
  const md=!!S.inv.md[is.stack], sdd=S.inv.sdd;
  const tk=is.base*M.verb*(is.big&&M.ctx?.7:1)*(raw>=1?.85:1)*parMul()*REVIEW[rv].tk*(md?MD_TK:1)*(sdd?SDD_TK:1);
  let p=diff>=1?.95:diff===0?.8:diff===-1?.5:diff===-2?.25:.1;
  if(is.big&&M.ctx)p+=.08; if(is.big&&!M.ctx&&M.cap<4)p-=.08;
  if(md)p+=MD_P; if(sdd&&is.cx>=3)p+=SDD_P;
  p=Math.max(.05,Math.min(.97,p));
  const c=catchRate(rv,M);
  return {M,tk,lo:tk*.7,hi:tk*1.3,p,c,pe:(p+(1-p)*c)*(is.store?1-STORE_REJECT:1),hrs:is.cx*M.speed*(is.tries?.8:1)*REVIEW[rv].hrs*stackHrs(is)};
}

export function bills(v){
  if(v==='local') return [{id:'local',label:'本地 GPU',note:'不花 token 錢，但很慢',ok:true}];
  const V=VENDORS[v], pl=planOf(v), out=[];
  out.push({id:'sub',label:'個人訂閱',note:pl.id==='none'?'沒有訂閱':`${pl.name}・剩 ${kt(quotaLeft('sub',v))}`,ok:pl.id!=='none'});
  if(S.seat.status==='approved'&&S.seat.vendor===v) out.push({id:'seat',label:'公司席位',note:`剩 ${kt(quotaLeft('seat',v))}`,ok:true});
  out.push({id:'api',label:'個人 API',note:'自己的信用卡',ok:true});
  out.push({id:'corp',label:'公司 API',note:!V.corp?'公司沒簽約':S.corp<=0?'預算用完':'走部門預算',ok:V.corp&&S.corp>0});
  return out;
}
export function costLine(b,M,v,e){
  if(b==='sub'||b==='seat') return {t:'額度',lo:e.lo*M.w,hi:e.hi*M.w,unit:'q'};
  if(b==='local') return {t:'花費',lo:0,hi:0,unit:'$'};
  const pm=S.priceMod[v]; return {t:b==='corp'?'公司付':'自付',lo:e.lo*M.price*pm,hi:e.hi*M.price*pm,unit:'$'};
}

/* 派工方案對這張工單能不能用；不能用時回傳原因（工作槽與工時不算方案的問題） */
export function presetBlock(is,p){
  const M=model(p.v,p.m);
  if(S.outage===p.v) return '今日當機';
  const why=cnBlock(is,p.v,M); if(why) return why;
  if(p.b==='seat'&&!(S.seat.status==='approved'&&S.seat.vendor===p.v)) return '沒有公司席位';
  const bl=bills(p.v).find(b=>b.id===p.b); if(!bl) return '不能用這種付費方式'; if(!bl.ok) return bl.note;
  if(p.b==='local'&&PAR()&&localBusy()) return '本地 GPU 忙';
  const cl=costLine(p.b,M,p.v,est(is,p.v,p.m,p.rv));
  if((p.b==='sub'||p.b==='seat')&&cl.hi>quotaLeft(p.b,p.v)) return '額度不夠';
  if(p.b==='api'&&cl.hi>S.wallet) return '錢包不夠';
  return '';
}
export function presetFor(is){
  const skip=[];
  for(let i=0;i<S.presets.length;i++){ const r=presetBlock(is,S.presets[i]); if(!r) return {i,skip}; skip.push({i,r}); }
  return {i:-1,skip};
}

export function log(cls,msg){S.log.unshift({cls,msg:`D${String(S.day).padStart(2,'0')} ${msg}`}); if(S.log.length>80)S.log.pop();}

