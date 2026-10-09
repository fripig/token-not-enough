import {APIV,BASE,GAME_VERSION,CLIENTS,COMPANIES,HW_KEYS,INV_KEYS,KPI,MONITOR_KPI,R,SEAT,STACKS,VENDORS,normCompanies,objOf,pick,pickClient,presetsOf,rnd} from './data.js';
import {SLOT_CHOICES} from './actions.js';

/* ===== 狀態 ===== */
export let S, sel, uid=0;
/* 工單編號：其他模組只能透過這兩個函式改 */
export const nextId=()=>++uid;
export const resetIds=()=>{uid=0;};
export function fresh(){
  uid=0;
  S={day:1,hours:8,wallet:8000,corp:12000,trust:70,kpi:0,mode:S?.mode||'parallel',companies:normCompanies(S?.companies),slots:SLOT_CHOICES.includes(S?.slots)?S.slots:3,outsource:S?.outsource===true,advanced:S?.advanced===true,presets:presetsOf(S?.presets),jobs:[],
    inv:{md:{},...objOf(INV_KEYS,()=>false)},
    subs:objOf(APIV,()=>'none'),
    used:{sub:objOf(APIV,()=>({d:0,w:0})),seat:objOf(SEAT.vendors,()=>({d:0,w:0}))},
    capMod:objOf(APIV,()=>1),priceMod:objOf(Object.keys(VENDORS),()=>1),cnBan:false,
    seats:[],seatReq:null,
    hw:objOf(HW_KEYS,()=>false),hwReq:null,hwUsed:objOf(HW_KEYS,()=>false),
    outage:null,corpDay:0,issues:[],log:[],
    st:{subFee:0,api:0,corp:0,done:0,late:0,audits:0,manual:0,conflicts:0,caught:0,tk:objOf(Object.keys(VENDORS),()=>0),byBill:{sub:0,seat:0,api:0,corp:0,local:0},kpiLost:0,trapHit:0,trapFound:0,outIncome:0,outPenalty:0,outDone:0,outLate:0}};
  sel={issue:null,v:'anthropic',m:'sonnet',b:'api',rv:sel?.rv??1,ef:sel?.ef??1};
}

/* GA 事件：每個事件都帶這局的設定，方便分組看玩到第幾天；沒載入 gtag（本機、node 工具、被擋）時不動作 */
export function track(name,extra={}){
  try{
    if(typeof gtag!=='function') return;
    gtag('event',name,{game_version:GAME_VERSION,game_mode:S.mode,companies:S.companies.join('+'),slots:S.mode==='parallel'?S.slots:1,advanced:S.advanced,outsource:S.outsource,day:S.day,...extra});
  }catch(e){}
}

/* 存檔：每天開工時存一格。S、sel、工單或 job 的結構改到舊存檔不能用時，SAVE_VER 要加 1 */
export const SAVE_KEY='tokgame-save', SAVE_VER=1;
export function saveGame(morning=null){
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({ver:SAVE_VER,S,sel,uid,morning}));}catch(e){}
}
export function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}
/* 沒有存檔回 null；存檔不能用就刪掉並回 {bad:true}；檢查時不動到目前的 S、sel、uid */
export function readSave(){
  let raw=null; try{raw=localStorage.getItem(SAVE_KEY);}catch(e){return null;}
  if(raw==null) return null;
  try{
    const d=JSON.parse(raw), s=d?.S, ok=d&&d.ver===SAVE_VER&&s&&typeof s==='object'&&Number.isInteger(s.day)&&s.day>=1&&s.day<=20
      &&['issues','jobs','companies','log'].every(k=>Array.isArray(s[k]))&&d.sel&&typeof d.sel==='object'&&Number.isInteger(d.uid)&&d.uid>=0
      &&(d.morning===null||(d.morning&&typeof d.morning==='object'&&Array.isArray(d.morning.rep)));
    if(!ok) throw 0;
    /* 跑著的 job 和佇列裡的工單是同一個物件，讀回來要重新接上 */
    for(const j of s.jobs){const is=s.issues.find(i=>i.id===j?.issue?.id); if(!is) throw 0; j.issue=is;}
    return {S:s,sel:d.sel,uid:d.uid,morning:d.morning};
  }catch(e){clearSave(); return {bad:true};}
}
/* 採購電腦之前的存檔沒有這三個欄位：當作沒買、沒申請、今天還沒用 */
export function loadGame(d){
  S=d.S; sel=d.sel; uid=d.uid;
  S.hw??=objOf(HW_KEYS,()=>false); S.hwReq??=null; S.hwUsed??=objOf(HW_KEYS,()=>false);
}

/* 一般工單：75% 平分給選到的主技術線、15% 前端、10% 平分給沒選的技術線 */
export function pickStack(){
  const r=Math.random();
  if(r<.75) return pick(S.companies);
  if(r<.9) return 'fe';
  return pick(COMPANIES.filter(k=>!S.companies.includes(k)));
}
/* 陷阱題：看起來是小單（複雜度 1–2），其實牽扯架構（真實複雜度 4–5） */
export let TRAP_RATE=.1;
/* 模擬器用來調整陷阱比例 */
export const setTrapRate=r=>{TRAP_RATE=r;};
/* Rust、App、DevOps 比較慢：期限多一天、KPI ×1.3 作為補償 */
export const hardStack=st=>st==='rust'||st==='app'||st==='devops';
export const unfamiliar=is=>!S.companies.includes(is.stack)&&is.stack!=='fe';
export function makeIssue(inc,st){
  let cx;
  if(inc) cx=4; else { const r=Math.random()+S.day/20*.38; cx=r<.28?1:r<.6?2:r<.9?3:r<1.12?4:5; }
  const base=BASE[cx]*R(.85,1.15);
  let due=inc?Math.min(20,S.day+(S.inv.monitor?1:0)):S.day+(cx<=2?1+rnd(3):2+rnd(4));
  const stack=st||(inc?pick(S.companies):pickStack());
  const trap=!inc&&cx<=2&&Math.random()<TRAP_RATE, trueCx=Math.random()<.6?4:5;
  const title=trap&&Math.random()<.5?pick(STACKS[stack].pool.trap):pick(STACKS[stack].pool[inc?'inc':cx]);
  return {id:nextId(),title,cx,base,inc:!!inc,stack,
    trap,trueCx:trap?trueCx:cx,trueBase:trap?BASE[trueCx]*R(.85,1.15):base,revealed:false,evaluated:false,rescoped:false,merge:false,
    store:stack==='app'&&cx>=2&&Math.random()<.4,
    sens:Math.random()<(inc?.55:.25),big:cx>=3&&Math.random()<.45,
    client:inc?CLIENTS[0]:pickClient(),
    due:Math.min(20,due+(!inc&&hardStack(stack)?1:0)),kpi:Math.round(KPI[cx]*(inc?(S.inv.monitor?MONITOR_KPI:1.6):1)*(hardStack(stack)?1.3:1)),tries:0};
}


/* 外包單：每種工作內容加前端平均抽，只能自己付 token，做完拿現金（KPI × GIG_PAY）不拿 KPI */
export const GIG_PAY=80, GIG_LATE=.3, GIG_STACKS=[...COMPANIES,'fe'];
export const GIG_CLIENT={name:'外包案主',ban:null};
export function makeGig(){
  const is=makeIssue(false,pick(GIG_STACKS));
  return Object.assign(is,{out:true,sens:false,client:GIG_CLIENT,pay:is.kpi*GIG_PAY});
}
/* 開了外包時每天多 0–2 張，回傳張數 */
export function addGigs(){
  const n=S.outsource?rnd(3):0;
  for(let i=0;i<n;i++)S.issues.push(makeGig());
  return n;
}
