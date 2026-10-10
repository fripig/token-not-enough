// 規則檢查（非遊戲本體）
// 用法：node tools/check.js（預設固定種子；CHECK_SEED=<整數> 換種子，CHECK_SEED=random 用真亂數）
// 用假的 DOM 載入遊戲模組，把 spec 裡的範例數字逐條斷言；任何一條不符就以非 0 結束。
import {readFileSync,readdirSync} from 'node:fs';
import {els,store,resetStore} from './fake-dom.js';
import './check-seed.js';
import {seedRandom} from './seed.js';
// 先載入入口模組，模組初始化順序才會和瀏覽器一樣（main.js 載入時會呼叫 start()）
import {boot,firstIssues,start} from '../public/js/main.js';
import {BASE,CLIENTS,COMPANIES,DEFAULT_PRESETS,EFFORT,KPI,SEAT,STACKS,VENDORS,bestKey,cnBlock,effModel,h1,kt,model,presetsOf,rnd} from '../public/js/data.js';
import * as dataModule from '../public/js/data.js';
import {GIG_CLIENT,GIG_PAY,S,addGigs,hardStack,fresh,makeGig,makeIssue,nextId,pickStack,sel,unfamiliar} from '../public/js/state.js';
import {catchRate,costLine,storeReject,est,manualHrs,presetBlock,presetFor,quotaLeft,stackHint} from '../public/js/calc.js';
import {EVENTS,advance,intakeIssue,auditOdds,auditRoll,conflictRate,prHrs,batch,canEvaluate,charge,dispatch,endDay,evalCost,evaluate,invCount,invest,loadPreset,makeJob,manual,quick,rescope,reveal,revealRate,savePreset,settle,trueView} from '../public/js/actions.js';
import {dispatchPanel,render} from '../public/js/view.js';
import {monthScore,showEnd,showSetup} from '../public/js/modals.js';
// 核心規則（gh-09-01-core-rules-specs）用命名空間取用，避免和上面的具名 import 重複
import * as A from '../public/js/actions.js';
import * as C from '../public/js/calc.js';
import * as M from '../public/js/modals.js';
// 另一份沒玩過的 state.js：用來測第一次 fresh() 的預設值（主模組的 S 已經被 start() 設過）
import * as St from '../public/js/state.js';
import * as Ru from '../public/js/rules.js';
import * as Vw from '../public/js/view.js';
import * as I from '../public/js/i18n.js';
const pristine=await import('../public/js/state.js?pristine');

let pass=0,fail=0;
/* 字典檔以外的遊戲模組：註解以外不能有中文（gh-34-01-i18n） */
const I18N_DONE=readdirSync(new URL('../public/js/',import.meta.url)).filter(f=>f.endsWith('.js'));
function ok(cond,name,detail=''){if(cond){pass++;}else{fail++;console.log('✗',name,detail);}}
function near(a,b,eps=1e-9){return Math.abs(a-b)<=eps;}
/* 去掉 JS 註解（保留字串、模板字串與 ${} 裡的程式），換行照留；i18n 檢查用 */
function stripComments(src){
  let out='',i=0; const st=[]; // st：'`' 在模板字串裡、數字是 ${} 內的大括號深度
  while(i<src.length){
    const c=src[i],n=src[i+1],top=st[st.length-1];
    if(top==='`'){
      out+=c; if(c==='\\'){out+=n||'';i+=2;continue;}
      if(c==='`')st.pop(); else if(c==='$'&&n==='{'){out+=n;i+=2;st.push(0);continue;}
      i++; continue;
    }
    if(c==="'"||c==='"'){let j=i+1; while(j<src.length&&src[j]!==c&&src[j]!=='\n'){if(src[j]==='\\')j++; j++;} out+=src.slice(i,j+1); i=j+1; continue;}
    if(c==='`'){st.push('`');out+=c;i++;continue;}
    if(c==='/'&&n==='/'){while(i<src.length&&src[i]!=='\n')i++; continue;}
    if(c==='/'&&n==='*'){const e=src.indexOf('*/',i+2); const body=src.slice(i,e<0?src.length:e+2); out+=body.replace(/[^\n]/g,''); i+=body.length; continue;}
    if(typeof top==='number'){if(c==='{')st[st.length-1]++; else if(c==='}'){if(top===0){st.pop();out+=c;i++;continue;} st[st.length-1]--;}}
    out+=c; i++;
  }
  return out;
}

function tests(){
  // 開一局但不經過彈窗：直接設定公司與模式
  const newRun=(company,mode='serial')=>{start();S.companies=[].concat(company);S.mode=mode;S.issues=[];S.jobs=[];sel.rv=0;};
  const ticket=(stack,cx,extra={})=>({id:nextId(),title:'t',cx,base:BASE[cx],inc:false,sens:false,big:false,client:CLIENTS[0],due:20,kpi:KPI[cx],tries:0,stack,store:false,...extra});

  /* 1.1 技術線資料 */
  for(const k of COMPANIES){
    for(const lv of [1,2,3,4,5,'inc']) ok(STACKS[k].pool[lv].length>=3,`STACKS.${k}.pool[${lv}] 至少 3 個標題`);
  }
  for(const lv of [1,2,3,4,5]) ok(STACKS.fe.pool[lv].length>=3,`STACKS.fe.pool[${lv}] 至少 3 個標題`);
  ok(!('POOL' in dataModule),'POOL 已移除');
  newRun('nope'); fresh(); ok(S.companies.join()==='laravel','未知公司退回 laravel');
  newRun('rust'); fresh(); ok(S.companies.join()==='rust','fresh() 保留公司');

  /* 1.2 工單技術線分布 */
  newRun('rails');
  const cnt={};const N=10000;
  for(let i=0;i<N;i++){const is=makeIssue(false);cnt[is.stack]=(cnt[is.stack]||0)+1;}
  ok(Math.abs(cnt.rails/N-.75)<=.02,'rails 佔 0.75±0.02',cnt.rails/N);
  ok(Math.abs(cnt.fe/N-.15)<=.02,'fe 佔 0.15±0.02',cnt.fe/N);
  ok(['laravel','rust','app','sre','devops'].every(k=>Math.abs(cnt[k]/N-.02)<=.008),'其他五條工作內容各約 0.02',JSON.stringify(cnt));
  newRun('app');
  const incs=[...Array(200)].map(()=>makeIssue(true));
  ok(incs.every(i=>i.stack==='app'&&STACKS.app.pool.inc.includes(i.title)),'App 公司的事故單全是 app 技術線');
  const apps=[...Array(5000)].map(()=>makeIssue(false)).filter(i=>i.stack==='app');
  ok(apps.filter(i=>i.cx<2).every(i=>!i.store),'複雜度 1 的 app 工單不需上架審核');
  const big=apps.filter(i=>i.cx>=2), sr=big.filter(i=>i.store).length/big.length;
  ok(Math.abs(sr-.4)<=.04,'複雜度 ≥2 的 app 工單約 40% 需上架審核',sr);
  ok(makeIssue(false).stack!==undefined&&[...Array(500)].map(()=>makeIssue(false)).filter(i=>i.stack!=='app').every(i=>!i.store),'非 app 工單不會有上架審核');

  /* 2.1 慣例加成與 Rust 效果（spec 範例） */
  newRun('laravel');
  const pOf=(v,m,is)=>est(is,v,m,0);
  ok(near(pOf('google','flash',ticket('rails',3)).p,.8),'Gemini Flash × 複雜度 3 rails → 80%',pOf('google','flash',ticket('rails',3)).p);
  ok(near(pOf('google','flash',ticket('laravel',4)).p,pOf('google','flash',ticket('fe',4)).p),'複雜度 4 laravel 沒有慣例加成');
  const air=pOf('zhipu','air',ticket('rust',2)), airFe=pOf('zhipu','air',ticket('fe',2));
  ok(near(air.p,.8),'GLM Air × 複雜度 2 rust → 80%',air.p);
  ok(near(air.hrs,airFe.hrs*1.2),'rust 執行時間 ×1.2');
  ok(near(air.tk,airFe.tk),'技術線不影響 token 預估');
  const capModel={2:['google','flash'],3:['zhipu','air'],4:['anthropic','sonnet'],5:['anthropic','opus']};
  for(const [cap,cx,exp] of [[2,2,.5],[3,2,.8],[4,3,.95],[5,5,.8]]){
    const [v,m]=capModel[cap]; ok(near(pOf(v,m,ticket('rust',cx)).p,exp),`Rust 表：能力 ${cap} × 複雜度 ${cx} → ${exp*100}%`);
  }
  ok(near(pOf('anthropic','sonnet',ticket('app',3)).hrs,pOf('anthropic','sonnet',ticket('fe',3)).hrs*1.15),'app 執行時間 ×1.15');
  { const dv=est(ticket('devops',2),'anthropic','sonnet',0,1), fe2=est(ticket('fe',2),'anthropic','sonnet',0,1);
    ok(near(dv.hrs,fe2.hrs*1.25)&&near(dv.p,fe2.p)&&near(dv.tk,fe2.tk),'devops 執行時間 ×1.25，成功率與 token 跟 fe 相同',`${dv.hrs} ${fe2.hrs}`);
    ok(near(manualHrs(ticket('devops',2)),manualHrs(ticket('fe',2))*2),'devops 手寫時數不變（沒選時只有不熟 ×2）'); }
  newRun('devops'); S.day=6;
  const dv2=[...Array(3000)].map(()=>makeIssue(false)).filter(i=>i.stack==='devops'&&i.cx===2);
  ok([...new Set(dv2.map(i=>i.due))].sort().join()==='10,8,9','複雜度 2 devops 工單期限多一天：偏移 1–3 天對應到期 8、9、10，沒有 7',[...new Set(dv2.map(i=>i.due))].join());

  const sOn=est(ticket('app',3,{store:true}),'anthropic','sonnet',0), sOff=est(ticket('app',3),'anthropic','sonnet',0);
  ok(near(sOn.pe,sOff.pe*.8)&&near(sOn.p,sOff.p),'需上架審核：顯示成功率含 20% 退件，原始機率不變');

  /* 2.3 不熟技術線手寫時間（spec 範例表） */
  for(const [co,st,cx,tries,exp] of [['laravel','laravel',2,0,'4.4'],['laravel','fe',2,0,'4.4'],['laravel','rust',2,0,'8.8'],['app','rails',3,1,'10.6'],['laravel','sre',2,0,'8.8'],[['sre','devops'],'devops',2,0,'4.4']]){
    newRun(co); ok(h1(manualHrs(ticket(st,cx,{tries})))===exp,`手寫：${co} 公司 ${st} 複雜度 ${cx} tries ${tries} → ${exp}h`,h1(manualHrs(ticket(st,cx,{tries}))));
  }

  /* 5.1 Rust／App 補償：KPI ×1.3、期限 +1 天（上限第 20 天） */
  for(const [st,cx,inc,exp] of [['laravel',3,false,10],['rust',3,false,13],['app',2,false,8],['app',4,true,33],['fe',4,false,16],['devops',3,false,13],['devops',4,true,33],['sre',3,false,10],['sre',4,true,26]]){
    newRun(st==='fe'?'laravel':st); S.day=1;
    const got=[...Array(4000)].map(()=>makeIssue(inc)).filter(i=>i.stack===st&&i.cx===cx);
    ok(got.length>0&&got.every(i=>i.kpi===exp),`KPI：${st} 複雜度 ${cx}${inc?' 事故':''} → ${exp}`,[...new Set(got.map(i=>i.kpi))].join(','));
  }
  // 實際產生的工單：期限與 KPI 都套用補償
  newRun('rust'); S.day=4;
  let rustIs=[...Array(3000)].map(()=>makeIssue(false)).filter(i=>i.stack==='rust'&&i.cx===3);
  ok(rustIs.length&&rustIs.every(i=>i.kpi===13),'產生的複雜度 3 rust 工單 KPI 都是 13');
  ok(rustIs.every(i=>i.due>=4+2+1&&i.due<=4+5+1),'複雜度 3 rust 工單期限多一天（day 4 → 7～10）');
  ok(rustIs.some(i=>i.due===8),'出現 day 4 + 偏移 3 + 1 = 8 的期限');
  newRun('app'); S.day=19;
  const late19=[...Array(2000)].map(()=>makeIssue(false));
  ok(late19.every(i=>i.due<=20),'期限不超過第 20 天');
  ok(late19.filter(i=>i.stack==='app').some(i=>i.due===20),'第 19 天的 app 工單期限被壓到第 20 天');
  newRun('app'); S.day=5;
  ok([...Array(300)].map(()=>makeIssue(true)).every(i=>i.due===5&&i.kpi===33),'App 事故單當天到期、KPI 33');

  /* 5.2 公司按鈕的難度標示 */
  newRun('laravel'); showSetup(false);
  ok(COMPANIES.join()==='laravel,rails,rust,app,sre,devops'&&COMPANIES.every(k=>els.mo.innerHTML.includes(`data-company="${k}"`)),'開局有六個工作內容按鈕，照固定順序');
  for(const [k,stars,name] of [['laravel','★','Laravel 後端'],['rails','★','Rails 後端'],['rust','★★★','Rust 基礎設施'],['app','★★','App 開發'],['sre','★★','SRE'],['devops','★★','DevOps']]){
    const btn=els.mo.innerHTML.match(new RegExp(`data-company="${k}"[^>]*>([\\s\\S]*?)</button>`))?.[1]||'';
    ok(btn.includes(`<b>${name}</b>`)&&btn.includes(`難度 ${stars}・`),`${name} 標示難度 ${stars}`,btn);
  }

  /* 派工台提示（Stack effect visibility） */
  newRun('laravel');
  const hRust=stackHint(ticket('rust',2));
  ok(hRust.includes('×1.2')&&hRust.includes('borrow checker'),'Rust 提示含 ×1.2 與 borrow checker',hRust);
  ok(stackHint(ticket('fe',2))==='','前端工單沒有提示');
  { const hd=stackHint(ticket('devops',2)), hs=stackHint(ticket('sre',2));
    ok(hd.includes('×1.25')&&hd.includes('terraform'),'DevOps 提示含 ×1.25 與 terraform',hd);
    ok(hs.includes('事故'),'SRE 提示提到事故',hs); }
  ok(stackHint(ticket('laravel',4))==='','複雜度 4 的 laravel 工單沒有提示');
  ok(stackHint(ticket('rails',3)).includes('慣例多'),'複雜度 3 的 rails 工單有慣例提示');
  ok(stackHint(ticket('app',3,{store:true})).includes('20%')&&!stackHint(ticket('app',3)).includes('20%'),'只有需上架審核的 app 工單提到 20% 退件');

  /* 畫面元素：週一調整不顯示公司、標頭、卡片標籤、手寫按鈕 */
  newRun('laravel'); showSetup(true);
  ok(!els.mo.innerHTML.includes('data-company'),'週一調整訂閱不顯示公司選擇');
  newRun('laravel'); const rt=ticket('rust',2), st=ticket('app',3,{store:true}); S.issues=[rt,st]; sel.issue=rt.id; render();
  ok(els.app.innerHTML.includes('Laravel 後端・工程師'),'標頭顯示工作內容名稱');
  ok(els.app.innerHTML.includes('chip unfam">不熟')&&els.app.innerHTML.includes('chip store">需上架審核'),'卡片顯示不熟與需上架審核標籤');
  ok(els.app.innerHTML.includes('自己手寫（8.8h'),'不熟的 rust 工單手寫按鈕顯示 8.8h');

  /* 2.2 App 上架審核 */
  const realRandom=Math.random;
  const runJob=(is,rv,roll)=>{ // 個人 API 付費、強制 agent 成功，再用 roll 決定上架審核
    S.issues=[is]; sel.issue=is.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; sel.rv=rv;
    const j=makeJob(is); j.ok=true; j.caught=false;
    Math.random=()=>roll; const r=settle(j); Math.random=realRandom; return r;
  };
  newRun('app');
  let is=ticket('app',3,{store:true}), r=runJob(is,0,.1);
  ok(!r.ok&&r.rejected&&S.issues.includes(is)&&is.tries===1,'需上架審核的 app 工單被退件後留在佇列、tries 1');
  ok(S.log[0].msg.includes('卡在 App Store 審核被退件'),'紀錄寫出退件原因',S.log[0].msg);
  ok(near(is.base,BASE[3]*.7),'退件套用一般的 0.7 token 折扣');
  is=ticket('app',3,{store:true}); r=runJob(is,2,.1);
  ok(!r.ok&&r.rejected,'嚴格審核也救不回上架退件');
  is=ticket('app',3,{store:false}); r=runJob(is,0,.1);
  ok(r.ok&&!S.issues.includes(is),'沒標上架審核的 app 工單正常完成');
  is=ticket('app',3,{store:true}); r=runJob(is,0,.5);
  ok(r.ok,'上架審核通過時正常完成');

  /* 3.3 最高分 key */
  const endWith=(company,mode,seed)=>{newRun(company,mode);resetStore(seed);S.day=20;showEnd();return els.mo.innerHTML;};
  let html=endWith('laravel','parallel',{'tokgame-best-parallel':'4200'});
  ok(html.includes('4,200'),'Laravel 沿用舊 key 的最高分（spec：4200 → 4,200）');
  ok(html.includes('月底結算・Laravel 後端'),'結算標題有工作內容名稱');
  ok(!('tokgame-best-parallel-laravel' in store),'沒破紀錄時不寫新 key');
  html=endWith('rails','parallel',{'tokgame-best-parallel':'999999'});
  ok(!html.includes('999,999'),'其他公司不讀舊 key');
  ok('tokgame-best-parallel-rails' in store,'Rails 寫入自己的 key');
  const saved=global.localStorage;
  global.localStorage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}};
  let threw=false; try{html=endWith('app','serial',{});}catch(e){threw=true;}
  global.localStorage=saved;
  ok(!threw&&html.includes('月底結算')&&!html.includes('先前最佳'),'localStorage 失效時結算照常顯示、沒有先前最佳');

  /* trap 1.1 陷阱題產生 */
  for(const k of Object.keys(STACKS)) ok(STACKS[k].pool.trap.length>=4,`STACKS.${k}.pool.trap 至少 4 個暗示標題`);
  newRun('laravel'); S.day=10;
  const gen=[...Array(20000)].map(()=>makeIssue(false));
  const small=gen.filter(i=>i.cx<=2), traps=small.filter(i=>i.trap);
  ok(Math.abs(traps.length/small.length-.1)<=.02,'複雜度 1–2 的工單約 10% 是陷阱',traps.length/small.length);
  ok(gen.filter(i=>i.cx>=3).every(i=>!i.trap),'複雜度 ≥3 的工單不是陷阱');
  ok(Math.abs(traps.filter(i=>i.trueCx===4).length/traps.length-.6)<=.05,'陷阱的真實複雜度約 60% 是 4');
  ok(traps.every(i=>i.trueCx>=4&&!i.revealed&&!i.evaluated&&!i.rescoped&&i.trueBase>=BASE[i.trueCx]*.85),'陷阱欄位初始值正確');
  const hinted=traps.filter(i=>STACKS[i.stack].pool.trap.includes(i.title)).length/traps.length;
  ok(Math.abs(hinted-.5)<=.05,'約一半陷阱用暗示標題',hinted);
  ok([...Array(500)].map(()=>makeIssue(true)).every(i=>!i.trap),'事故單不是陷阱');

  /* research 1.2 研究單產生 */
  const big45=gen.filter(i=>i.cx>=4), rsch=big45.filter(i=>i.research);
  ok(Math.abs(rsch.length/big45.length-.3)<=.03,'複雜度 4–5 的工單約 30% 是研究單',rsch.length/big45.length);
  ok(gen.filter(i=>i.cx<=3).every(i=>!i.research),'複雜度 1–3 的工單不是研究單');
  ok(gen.every(i=>!(i.trap&&i.research)),'陷阱不會是研究單');
  ok(rsch.every(i=>i.parts?.length===2&&i.parts.every(p=>typeof p==='string'&&p)&&STACKS[i.stack].pool.research.some(e=>e.t===i.title&&e.parts[0]===i.parts[0]&&e.parts[1]===i.parts[1])),'研究單的標題與兩張拆單標題來自研究標題池');
  ok([...Array(2000)].map(()=>makeIssue(true)).every(i=>!i.research),'事故單不是研究單');
  St.setResearchRate(0);
  {let draws=0; const R1=Math.random; Math.random=()=>{draws++;return .99;}; S.day=20; try{makeIssue(false);}finally{Math.random=R1;} St.setResearchRate(.3);
   let draws2=0; Math.random=()=>{draws2++;return .99;}; try{makeIssue(false);}finally{Math.random=R1;}
   ok(draws2===draws+1,'研究單比例 0 時不多擲亂數，比例 > 0 時複雜度 4–5 的工單多擲一次',`${draws}/${draws2}`);}
  /* research 1.3 研究標題池 */
  for(const k of Object.keys(STACKS)) ok(STACKS[k].pool.research?.length>=3&&STACKS[k].pool.research.every(e=>e.t&&e.parts?.length===2&&e.parts.every(Boolean)),`STACKS.${k}.pool.research 至少 3 組標題＋兩張拆單標題`);

  /* trap 2.1 charge 共用扣款 */
  newRun('laravel'); const w0=S.wallet, sonnet=model('anthropic','sonnet');
  let ch=charge('api','anthropic',sonnet,40);
  ok(near(w0-S.wallet,40*.45*S.priceMod.anthropic)&&!ch.short,'charge：40k Sonnet 個人 API 扣 NT$18',w0-S.wallet);
  S.subs.anthropic='pro'; S.used.sub.anthropic.d=0; S.used.sub.anthropic.w=0;
  ch=charge('sub','anthropic',sonnet,1000);
  ok(ch.short&&near(ch.frac,450/1000),'charge：Pro 額度 450k 不夠 1000k 時回報 short 與比例',JSON.stringify(ch));
  ok(quotaLeft('sub','anthropic')===0,'charge：額度不夠時用光剩餘額度');

  /* trap 2.2 踩到陷阱 */
  const trapT=(extra={})=>ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4],kpi:3,due:6,revealed:false,evaluated:false,rescoped:false,...extra});
  const dispatchTo=(is,v,m,b,rv,rnd)=>{ // serial 模式直接派工；rnd 固定亂數
    S.issues=[is]; sel.issue=is.id; sel.v=v; sel.m=m; sel.b=b; sel.rv=rv;
    const real=Math.random; Math.random=()=>rnd; const j=makeJob(is); const r=settle(j); Math.random=real; return {j,r};
  };
  newRun('laravel');
  let tp=trapT(); const trueEstDs=est({...tp,cx:4,base:BASE[4]},'deepseek','chat',2);
  let {j:tj,r:tr}=dispatchTo(tp,'deepseek','chat','api',2,.5);
  ok(!tr.ok&&tp.revealed&&tp.cx===4&&tp.tries===1&&S.issues.includes(tp),'DeepSeek Chat 踩到陷阱：失敗、曝光為複雜度 4、tries 1');
  ok(S.log.some(l=>l.msg.includes('做到一半發現牽扯整個架構，先停下來')),'紀錄寫出停下來的原因');
  ok(near(tj.tk,trueEstDs.tk*.4),'停下來時花掉真實估計的 0.4 倍 token',tj.tk/trueEstDs.tk);
  ok(near(tp.base,BASE[4])&&tp.kpi===3&&tp.due===6&&tp.shownCx===1,'曝光後 base 用真實值、KPI 與期限不變、記下原估');
  ok(S.st.trapHit===1,'踩到陷阱計數 +1');
  newRun('laravel');
  tp=trapT(); const trueEstSn=est({...tp,cx:4,base:BASE[4]},'anthropic','sonnet',0);
  ({j:tj,r:tr}=dispatchTo(tp,'anthropic','sonnet','api',0,.5));
  ok(tr.ok&&!S.issues.includes(tp)&&near(tj.tk,trueEstSn.tk),'Sonnet 硬做完，token 照真實複雜度 4',tj.tk/trueEstSn.tk);
  ok(S.log.some(l=>l.msg.includes('原來牽扯到架構，硬做完了')),'紀錄寫出硬做完');
  newRun('laravel'); tp=trapT(); S.issues=[tp]; sel.issue=tp.id; const h0=S.hours; manual();
  ok(near(h0-S.hours,2.2)&&tp.revealed&&S.issues.includes(tp)&&tp.kpi===3,'手寫陷阱：花 2.2h 後曝光、留在佇列、KPI 不變');
  ok(S.log[0].msg.includes('手寫到一半發現要動架構'),'紀錄寫出手寫發現');

  /* 本地 GPU 在跑時不能手寫 */
  newRun('laravel','parallel'); let lt=ticket('laravel',1); S.issues=[lt]; sel.issue=lt.id;
  S.jobs=[{b:'local',left:3}]; let lh=S.hours; manual();
  ok(S.hours===lh&&S.issues.includes(lt)&&S.st.manual===0,'本地 GPU 在跑：手寫不動作');
  ok(/data-act="manual" disabled/.test(dispatchPanel()),'本地 GPU 在跑：手寫按鈕 disabled');
  S.jobs=[{b:'api',left:3}];
  ok(!/data-act="manual" disabled/.test(dispatchPanel()),'雲端 agent 在跑：手寫照常可用');
  sel.v='local'; sel.m='gemma'; sel.b='local'; S.jobs=[{b:'local',left:3}];
  let dp=dispatchPanel();
  ok(/data-act="go" disabled/.test(dp)&&dp.includes('本地 GPU 已經有一個 agent 在跑'),'本地 GPU 在跑：不能再派本地 agent');
  dispatch(); ok(S.jobs.length===1&&S.issues.includes(lt),'本地 GPU 在跑：dispatch() 不動作');
  S.jobs=[{b:'api',left:3}];
  ok(!/data-act="go" disabled/.test(dispatchPanel()),'雲端 agent 在跑：本地照常可派');
  S.jobs=[]; dispatch(); ok(S.jobs.length===1&&S.jobs[0].b==='local','本地 GPU 空著：可以派一個');
  S.jobs=[];

  /* trap 2.3 評估架構 */
  const evalWith=(is,v,m,b,rnd)=>{S.issues=[is]; sel.issue=is.id; sel.v=v; sel.m=m; sel.b=b; const real=Math.random; Math.random=()=>rnd; evaluate(); Math.random=real;};
  newRun('laravel'); let ev=ticket('laravel',2); let w1=S.wallet, h1v=S.hours;
  evalWith(ev,'anthropic','sonnet','api',.5);
  ok(near(w1-S.wallet,40*.45)&&near(h1v-S.hours,.4)&&ev.evaluated&&!ev.revealed,'Sonnet 個人 API 評估：扣 40k token（NT$18）、花 0.4h、標記已評估');
  const capM={2:['google','flash'],3:['deepseek','chat'],4:['anthropic','sonnet'],5:['anthropic','opus']};
  for(const [cap,rate] of [[2,.65],[3,.8],[4,.95],[5,.95]]){
    const [v,m]=capM[cap]; ok(near(revealRate(model(v,m)),rate),`能力 ${cap} 識破率 ${rate}`);
    newRun('laravel'); let a=trapT(); evalWith(a,v,m,'api',rate-.01); ok(a.revealed&&S.st.trapFound===1,`能力 ${cap}：亂數 ${(rate-.01).toFixed(2)} 時識破`);
    newRun('laravel'); a=trapT(); evalWith(a,v,m,'api',rate+.001); ok(!a.revealed&&a.evaluated,`能力 ${cap}：亂數略高於識破率時沒識破`);
  }
  newRun('laravel'); let miss=trapT(); evalWith(miss,'anthropic','haiku','api',.9);
  ok(!miss.revealed&&miss.evaluated&&miss.cx===1,'沒識破的陷阱：已評估但仍顯示原估複雜度');
  ok(S.log[0].msg.includes('評估完成，看起來沒問題'),'沒識破與一般工單的紀錄相同');
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic.d=440; let sh=trapT(); evalWith(sh,'anthropic','sonnet','sub',.01);
  ok(!sh.evaluated&&!sh.revealed&&S.log[0].msg.includes('額度不夠，評估沒做完'),'額度不夠：評估中斷、不算已評估');

  /* trap 6.1 評估也有稽核與透支檢查 */
  newRun('laravel'); let sv=ticket('laravel',2,{sens:true}); const tr0=S.trust;
  evalWith(sv,'deepseek','chat','api',.5);
  ok(S.trust===tr0-12&&S.st.audits===1,'評估機敏工單（DeepSeek 個人 API、亂數 0.5 < 0.6）：信任 -12、稽核 +1',[S.trust,S.st.audits].join());
  newRun('laravel'); sv=ticket('laravel',2,{sens:true}); evalWith(sv,'anthropic','sonnet','api',.5);
  ok(S.st.audits===0,'評估機敏工單（Sonnet 個人 API、亂數 0.5 ≥ 0.35）：沒被稽核');
  newRun('laravel'); S.corp=5; const tr1=S.trust; evalWith(ticket('laravel',2),'anthropic','opus','corp',.5);
  ok(S.corp===0&&S.trust===tr1-8&&S.log.some(l=>l.msg.includes('公司 API 預算透支')),'評估把公司預算刷到透支：當下歸零、信任 -8、有紀錄',[S.corp,S.trust].join());

  /* trap 2.4 找主管重新評估（spec 範例表） */
  for(const [trust,st,tcx,kb,db,ta,ka,da] of [[70,'rust',4,4,6,65,21,8],[50,'laravel',5,3,19,45,24,20],[49,'laravel',4,3,6,46,3,6]]){
    newRun('laravel'); S.trust=trust; const rs=ticket(st,tcx,{trap:true,revealed:true,shownCx:1,trueCx:tcx,kpi:kb,due:db,rescoped:false});
    S.issues=[rs]; sel.issue=rs.id; rescope();
    ok(S.trust===ta&&rs.kpi===ka&&rs.due===da&&rs.rescoped,`重新評估：信任 ${trust} ${st} 真實 ${tcx} → 信任 ${ta}、KPI ${ka}、期限 ${da}`,JSON.stringify([S.trust,rs.kpi,rs.due]));
    const t2=S.trust; rescope(); ok(S.trust===t2,'同一張單不能重新評估第二次');
  }

  /* trap 3.1 卡片與派工台 */
  newRun('laravel'); S.day=1;
  const hid=trapT({id:9001}), normal=ticket('laravel',1,{id:9002,kpi:3,due:6}), shown=trapT({id:9003,revealed:true,shownCx:1,cx:5,trueCx:5}), evd=ticket('laravel',1,{id:9004,evaluated:true});
  S.issues=[hid,normal,shown,evd]; sel.issue=hid.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; render();
  const card=id=>{const h=els.app.innerHTML; const st=h.indexOf(`data-iss="${id}"`); return h.slice(st,h.indexOf('</button>',st));};
  const norm=c=>c.replace(/data-iss="\d+"/,'').replace('iss sel','iss ');
  ok(norm(card(9001))===norm(card(9002)),'沒曝光的陷阱卡片和同複雜度的一般工單長得一樣');
  ok(card(9003).includes('牽一髮動全身・原估 1'),'曝光的陷阱卡片顯示牽一髮動全身・原估 1');
  ok(card(9004).includes('>已評估<')&&!card(9002).includes('已評估'),'已評估的工單顯示已評估');
  ok(els.app.innerHTML.includes('data-act="eval"')&&els.app.innerHTML.includes('先讓 agent 評估架構（40k tokens，0.4h）'),'派工台顯示評估按鈕與成本');
  ok(!els.app.innerHTML.includes('data-act="rescope"'),'沒曝光時不顯示找主管');
  sel.issue=shown.id; render();
  ok(els.app.innerHTML.includes('data-act="rescope"')&&!els.app.innerHTML.includes('data-act="eval"'),'曝光後顯示找主管、不再顯示評估');
  sel.issue=evd.id; render();
  ok(!els.app.innerHTML.includes('data-act="eval"'),'已評估的工單不再顯示評估');
  S.hours=.2; sel.issue=normal.id; render();
  ok(/data-act="eval" disabled/.test(els.app.innerHTML),'剩餘工時不足時評估按鈕停用');

  /* trap 6.2 經由 reveal() 曝光、沒識破的陷阱畫面 */
  newRun('laravel'); S.day=1;
  const r5=trapT({id:9101,trueCx:5,trueBase:BASE[5]}); reveal(r5); S.issues=[r5]; sel.issue=null; render();
  ok(r5.cx===5&&r5.kpi===3&&card(9101).includes('title="複雜度 5"')&&card(9101).includes('牽一髮動全身・原估 1'),'reveal() 後卡片顯示複雜度 5、原估 1，KPI 仍是 3');
  const missT=trapT({id:9102,evaluated:true}), evN=ticket('laravel',1,{id:9103,evaluated:true,kpi:3,due:6});
  S.issues=[missT,evN]; sel.issue=null; render();
  ok(norm(card(9102))===norm(card(9103)),'沒識破的陷阱卡片和評估過的一般工單一樣');
  sel.issue=missT.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; render();
  ok(!els.app.innerHTML.includes('data-act="eval"'),'沒識破的陷阱不再顯示評估按鈕');

  /* trap 3.2 結算計數 */
  newRun('laravel'); S.st.trapHit=1; S.st.trapFound=2; S.day=20; showEnd();
  ok(els.mo.innerHTML.includes('<span>踩到陷阱</span><span>1 次</span>')&&els.mo.innerHTML.includes('<span>事先識破</span><span>2 次</span>'),'結算顯示踩到陷阱 1 次、事先識破 2 次');

  /* parallel-slots：開局選工作槽數 */
  const clickModal=(ds)=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  start(); S.slots=3; fresh(); ok(S.slots===3,'預設 3 個工作槽');
  start(); clickModal({mode:'parallel'});
  ok(els.mo.innerHTML.includes('data-slots="2"')&&els.mo.innerHTML.includes('data-slots="6"')&&!els.mo.innerHTML.includes('data-slots="7"'),'平行模式顯示 2–6 的選項');
  ok(/class="sb sel" data-slots="3"/.test(els.mo.innerHTML),'預設選 3');
  ok(/data-slots="4">同時 4 個 agent<small>審 PR 最多 ×1\.75・衝突最多 30%/.test(els.mo.innerHTML),'4 個工作槽按鈕：審 PR 最多 ×1.75、衝突最多 30%');
  { const pb=els.mo.innerHTML.match(/data-mode="parallel">(.*?)<\/button>/)[1]; ok(pb.includes('審 PR')&&!/token/i.test(pb),'平行模式按鈕講審 PR，不提 token',pb); }
  clickModal({mode:'serial'}); ok(!els.mo.innerHTML.includes('data-slots'),'單線模式不顯示工作槽選項');
  clickModal({mode:'parallel'}); clickModal({slots:'5'}); ok(els.mo.innerHTML.includes('最多 5 個 agent 在背景同時跑'),'模式說明跟著選的數量');
  clickModal({act:'confirm'});
  ok(S.slots===5&&els.app.innerHTML.includes('0 / 5 個工作槽'),'選 5 個：背景 agent 顯示 0 / 5');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-slots'),'週一調整不顯示工作槽選項');
  S.slots=6; start(); ok(/class="sb sel" data-slots="6"/.test(els.mo.innerHTML),'再玩一個月預選上次的 6');
  S.slots=9; fresh(); ok(S.slots===3,'不合法的工作槽數退回 3');

  /* parallel-slots：派工上限、token 加成、結算標題 */
  newRun('laravel','parallel'); S.slots=2; S.hours=8;
  for(let i=0;i<3;i++){const is=ticket('fe',1); S.issues.push(is); sel.issue=is.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; dispatch();}
  ok(S.jobs.length===2,'2 個工作槽時第三張派不出去',S.jobs.length);
  const pend=ticket('fe',1); S.issues.push(pend); sel.issue=pend.id; render();
  ok(/data-act="go" disabled/.test(els.app.innerHTML)&&els.app.innerHTML.includes('工作槽都滿了，先等一個 agent 跑完。'),'工作槽滿了：派工按鈕停用並顯示警告');
  for(const [n,exp] of [[2,1.25],[4,1.75],[6,2.25]]){newRun('laravel','parallel'); S.slots=n; S.jobs=Array(n-1).fill({left:1}); ok(near(A.reviewLoad(),exp),`${n} 個工作槽、其他 ${n-1} 個還在跑 → 審 PR ×${exp}`);}
  newRun('laravel','parallel'); S.slots=4; S.day=20; showEnd();
  ok(els.mo.innerHTML.includes('月底結算・Laravel 後端・平行模式（4 個 agent）'),'結算標題顯示 4 個 agent');
  newRun('laravel','serial'); S.day=20; showEnd(); ok(els.mo.innerHTML.includes('月底結算・Laravel 後端・單線模式</h2>'),'單線模式標題不變');

  /* 團隊席位：OpenAI 也能申請，核准後 Codex 可用公司席位付款 */
  newRun('laravel'); showSetup(false); ok(els.mo.innerHTML.includes('data-seat="openai"'),'開局可申請 OpenAI 團隊席位');
  S.seats=['openai'];
  const oaiT=ticket('laravel',2); S.issues=[oaiT]; sel.issue=oaiT.id; sel.v='openai'; sel.m=VENDORS.openai.models[1].id; sel.b='seat'; render();
  ok(els.app.innerHTML.includes('data-b="seat"')&&quotaLeft('seat','openai')===SEAT.day,'OpenAI 席位核准後出現公司席位選項、額度 2.5M');

  /* 團隊席位提示：選到別家廠商時提醒席位要選哪家 */
  newRun('laravel'); S.seats=['google'];
  const seatT=ticket('laravel',2); S.issues=[seatT]; sel.issue=seatT.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; render();
  ok(els.app.innerHTML.includes('你有 Google 團隊席位，選 Gemini CLI 的模型才能用公司席位付款。'),'選到 Anthropic 時提示 Google 席位要選 Gemini CLI');
  sel.v='google'; sel.m='pro'; render();
  ok(!els.app.innerHTML.includes('團隊席位，選')&&els.app.innerHTML.includes('data-b="seat"'),'選到 Google 時不提示、出現公司席位選項');
  S.seats=[]; S.seatReq={vendor:'google',day:1}; sel.v='anthropic'; sel.m='sonnet'; render();
  ok(!els.app.innerHTML.includes('團隊席位，選'),'席位還在審核時不提示');

  /* multi-team-seats：席位審核門檻 55／65／75，依審核當下已核准的席位數 */
  const seatReview=(seats,vendor,day,trust)=>{newRun('laravel'); S.seats=[...seats]; S.seatReq={vendor,day}; S.day=day+4; S.hours=0; S.trust=trust;
    const rr=Math.random; Math.random=()=>.99; endDay(); Math.random=rr; return els.mo.innerHTML;};
  for(const [seats,v,day,trust,okd,need] of [[[],'openai',1,60,true,55],[[],'openai',1,50,false,55],[['openai'],'google',6,64,false,65],[['openai'],'google',6,65,true,65],[['openai','google'],'anthropic',11,74,false,75],[['openai','google'],'anthropic',11,75,true,75]]){
    const mo=seatReview(seats,v,day,trust), name=`第 ${seats.length+1} 個席位、信任 ${trust}`;
    ok(S.seatReq===null,`${name}：審核後沒有待審申請`);
    if(okd) ok(S.seats.length===seats.length+1&&S.seats.at(-1)===v&&mo.includes(`採購通過：公司幫你開了 ${VENDORS[v].name} 團隊席位。`),`${name} → 核准`,JSON.stringify(S.seats));
    else ok(S.seats.length===seats.length&&mo.includes(`採購被退件：主管信任不夠（需要 ${need} 以上）。`),`${name} → 退件、需要 ${need} 以上`,JSON.stringify(S.seats));
  }
  newRun('laravel'); S.seatReq={vendor:'openai',day:1}; S.day=4; S.hours=0; S.trust=90; {const rr=Math.random; Math.random=()=>.99; endDay(); Math.random=rr;}
  ok(S.seatReq?.vendor==='openai'&&S.seats.length===0,'申請後第 5 天還沒審核');

  /* multi-team-seats：申請選單只列還沒有席位的廠商，並寫出第幾個席位與門檻 */
  const seatOpts=()=>[...els.mo.innerHTML.matchAll(/data-seat="(\w*)"/g)].map(m=>m[1]).join();
  newRun('laravel'); showSetup(false);
  ok(els.mo.innerHTML.includes('向公司申請第 1 個團隊席位（5 天後審核，信任需 55 以上）')&&seatOpts()===',anthropic,openai,google','開局：第 1 個席位、需 55、三家都能選',seatOpts());
  newRun('laravel'); S.seats=['openai']; showSetup(true);
  ok(els.mo.innerHTML.includes('向公司申請第 2 個團隊席位（5 天後審核，信任需 65 以上）')&&seatOpts()===',anthropic,google','已有 OpenAI 席位：第 2 個、需 65、不列 OpenAI',seatOpts());
  S.seatReq={vendor:'google',day:6}; showSetup(true); ok(seatOpts()==='','有申請在審：週一不顯示席位申請');
  S.seatReq=null; S.seats=['anthropic','openai','google']; showSetup(true); ok(seatOpts()==='','三個席位都有：週一不顯示席位申請');
  seatReview(['openai'],'google',1,50); showSetup(true);
  ok(S.day===6&&seatOpts()===',anthropic,google','第 6 天退件後，當天週一調整可再申請，被退的 Google 也列出',seatOpts());
  seatReview([],'openai',1,60); showSetup(true);
  ok(S.day===6&&els.mo.innerHTML.includes('第 2 個團隊席位')&&seatOpts()===',anthropic,google','第 6 天核准後，當天週一調整可申請第 2 個',seatOpts());

  /* multi-team-seats：開局點 OpenAI 再按開始 → 待審申請、額度區顯示第 6 天有結果 */
  newRun('laravel'); showSetup(false);
  {const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}}); press({seat:'openai'}); press({act:'confirm'});}
  ok(JSON.stringify(S.seatReq)==='{"vendor":"openai","day":1}'&&S.seats.length===0,'開局申請 OpenAI：S.seatReq 是 openai／第 1 天',JSON.stringify(S.seatReq));
  ok(els.app.innerHTML.includes('團隊席位採購審核中，預計第 6 天有結果')&&S.log.some(l=>l.msg.includes('提出 OpenAI 團隊席位採購申請')),'開局申請後額度區顯示預計第 6 天有結果、紀錄寫出申請');
  /* OpenAI 席位、選 Claude Code：不出現公司席位，提示 Codex CLI */
  newRun('laravel'); S.seats=['openai']; {const t=ticket('laravel',2); S.issues=[t]; sel.issue=t.id;} Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api'}); render();
  ok(!els.app.innerHTML.includes('data-b="seat"')&&els.app.innerHTML.includes('你有 OpenAI 團隊席位，選 Codex CLI 的模型才能用公司席位付款。'),'OpenAI 席位選 Claude Code：沒有公司席位選項、提示 Codex CLI');

  /* multi-team-seats：每個席位各自付款、各自額度，提示列出所有有席位的 agent */
  newRun('laravel'); S.seats=['openai','google']; S.used.seat.openai={d:1000,w:1000};
  const twoT=ticket('laravel',2); S.issues=[twoT]; sel.issue=twoT.id; sel.b='api';
  Object.assign(sel,{v:'openai',m:'std'}); render(); let h=els.app.innerHTML;
  ok(h.includes('data-b="seat"')&&h.includes('剩 1.5M')&&quotaLeft('seat','openai')===1500,'OpenAI 席位用掉 1,000k → Codex 公司席位剩 1.5M');
  Object.assign(sel,{v:'google',m:'pro'}); render(); h=els.app.innerHTML;
  ok(h.includes('data-b="seat"')&&quotaLeft('seat','google')===2500,'Google 席位額度另外算 → Gemini 公司席位剩 2.5M');
  ok(h.indexOf('OpenAI 團隊席位')>=0&&h.indexOf('OpenAI 團隊席位')<h.indexOf('Google 團隊席位'),'額度區：OpenAI 席位方塊在 Google 前面');
  Object.assign(sel,{v:'anthropic',m:'sonnet'}); render();
  ok(els.app.innerHTML.includes('你有 OpenAI、Google 團隊席位，選 Codex CLI、Gemini CLI 的模型才能用公司席位付款。'),'選 Claude Code 時提示列出 Codex CLI 與 Gemini CLI');
  ok(presetBlock(twoT,{v:'openai',m:'std',b:'seat',rv:0})===''&&presetBlock(twoT,{v:'google',m:'pro',b:'seat',rv:0})==='','OpenAI、Google 席位方案都能用');
  ok(presetBlock(twoT,{v:'anthropic',m:'sonnet',b:'seat',rv:0})==='沒有公司席位','沒有 Anthropic 席位 → 沒有公司席位');
  S.seatReq={vendor:'anthropic',day:6}; S.day=6; render();
  ok(els.app.innerHTML.indexOf('Google 團隊席位')<els.app.innerHTML.indexOf('團隊席位採購審核中，預計第 11 天有結果'),'有席位又有申請在審：方塊後面接審核中');
  const gigT=ticket('laravel',2,{out:true,client:GIG_CLIENT,pay:KPI[2]*GIG_PAY}); S.issues=[gigT]; Object.assign(sel,{issue:gigT.id,v:'google',m:'pro',b:'seat'});
  ok(/data-b="seat" disabled>公司席位<small>外包不能用公司資源<\/small>/.test(dispatchPanel())&&sel.b!=='seat','外包單：Google 席位也停用');

  /* dispatch-presets：預設、沿用、不合法退回 */
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  start(); ok(same(S.presets,DEFAULT_PRESETS),'第一次開局是預設方案',JSON.stringify(S.presets));
  ok(same(S.presets.map(p=>[p.v,p.m,p.b,p.rv].join('/')),['deepseek/chat/api/1','anthropic/sonnet/corp/1','anthropic/opus/corp/2']),'預設 A/B/C 內容');
  S.presets[0]={v:'anthropic',m:'haiku',b:'sub',rv:0}; start();
  ok(same(S.presets[0],{v:'anthropic',m:'haiku',b:'sub',rv:0,ef:1,sdd:2}),'再玩一個月沿用方案 A（沒有推理強度的補成中、沒有 SDD 補成 2）');
  S.presets[1]={v:'anthropic',m:'nope',b:'corp',rv:1}; fresh();
  ok(same(S.presets,DEFAULT_PRESETS),'有不存在的模型時三組都退回預設');
  S.presets[0].rv=0; ok(DEFAULT_PRESETS[0].rv===1,'修改方案不會改到預設值');

  /* 方案能不能用：原因與優先順序 */
  const P=(v,m,b,rv=0)=>({v,m,b,rv});
  const fin=extra=>ticket('fe',2,{client:CLIENTS[2],...extra});
  newRun('laravel');
  const finT=fin(); S.issues=[finT];
  ok(presetBlock(finT,P('deepseek','chat','api'))===cnBlock(finT,'deepseek',model('deepseek','chat'))&&presetBlock(finT,P('deepseek','chat','api'))!=='','金融客戶 × DeepSeek → 禁用原因',presetBlock(finT,P('deepseek','chat','api')));
  S.outage='anthropic'; ok(presetBlock(finT,P('anthropic','sonnet','corp'))==='今日當機','當機 → 今日當機'); S.outage=null;
  ok(presetBlock(finT,P('google','flash','sub'))==='沒有訂閱','沒有 Google 訂閱 → 沒有訂閱',presetBlock(finT,P('google','flash','sub')));
  S.seats=['google']; ok(presetBlock(finT,P('anthropic','sonnet','seat'))==='沒有公司席位','席位是 Google、方案用 Anthropic 席位 → 沒有公司席位'); S.seats=[];
  S.subs.anthropic='pro'; S.used.sub.anthropic={d:1e9,w:1e9}; ok(presetBlock(finT,P('anthropic','opus','sub'))==='額度不夠','訂閱額度不夠 → 額度不夠',presetBlock(finT,P('anthropic','opus','sub')));
  S.wallet=100; ok(presetBlock(ticket('fe',4),P('anthropic','opus','api'))==='錢包不夠','錢包 NT$100、Opus API → 錢包不夠'); S.wallet=8000;
  ok(presetBlock(finT,P('anthropic','sonnet','corp'))==='','都沒問題 → 可用');
  newRun('laravel','parallel'); S.jobs=[{b:'local',left:1,hrs:1,issue:{}}];
  ok(presetBlock(ticket('fe',2),P('local','qwen','local'))==='本地 GPU 忙','平行模式本地 GPU 有人在跑 → 本地 GPU 忙');
  newRun('laravel'); S.outage='deepseek';
  let pf=presetFor(finT); ok(pf.i===1&&pf.skip.length===1&&pf.skip[0].i===0&&pf.skip[0].r==='今日當機','照 A→B→C 用第一個能用的，當機優先於案主禁用',JSON.stringify(pf));
  S.outage=null; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'deepseek',m:'chat',b:'api'}));
  ok(presetFor(finT).i===-1,'三組都不能用 → -1');

  /* 一鍵派工 */
  newRun('laravel'); S.presets=presetsOf(); S.hours=8;
  const f2=fin(); S.issues=[f2]; render();
  ok(els.app.innerHTML.includes('一鍵派工：方案 B')&&els.app.innerHTML.includes('A 不能用：金融客戶禁用'),'金融客戶卡片顯示方案 B 與 A 的原因');
  ok(quick(f2.id)&&sel.v==='anthropic'&&sel.m==='sonnet'&&sel.b==='corp','金融客戶一鍵派工用方案 B');
  ok(S.log.some(l=>l.msg.includes('一鍵派工用方案 B（略過 A：金融客戶禁用）')),'紀錄寫出略過 A 的原因');
  newRun('laravel'); S.hours=8; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'deepseek',m:'chat',b:'api'}));
  const f3=fin(); S.issues=[f3]; render();
  ok(/<button class="qk" disabled><b>沒有可用方案/.test(els.app.innerHTML),'都不能用時按鈕停用、顯示沒有可用方案');
  ok(!quick(f3.id)&&S.issues.includes(f3),'都不能用時一鍵派工不動作');
  newRun('laravel'); S.hours=8; S.presets=presetsOf();
  const sens=ticket('fe',2,{sens:true}); S.issues=[sens]; render();
  ok(els.app.innerHTML.includes('一鍵派工：方案 A')&&els.app.innerHTML.includes('60% 機率被資安稽核'),'機敏工單不跳過個人 API，改顯示稽核風險');
  newRun('laravel','parallel'); S.hours=8; S.slots=2; const fj=()=>({v:'anthropic',M:model('anthropic','sonnet'),b:'api',left:1,hrs:1,issue:{title:'x',due:20}}); S.jobs=[fj(),fj()];
  const full=ticket('fe',2); S.issues=[full]; render();
  ok(new RegExp(`data-quick="${full.id}" disabled`).test(els.app.innerHTML)&&!quick(full.id),'工作槽滿了一鍵派工停用');
  newRun('laravel'); S.hours=.1; const late=ticket('fe',1); S.issues=[late]; ok(!quick(late.id),'不到 0.2h 不能一鍵派工');

  /* 存成／載入方案 */
  newRun('laravel'); S.hours=8; const keep=ticket('fe',2); S.issues=[keep]; sel.issue=keep.id;
  Object.assign(sel,{v:'google',m:'pro',b:'corp',rv:0}); savePreset(1);
  ok(same(S.presets[1],{v:'google',m:'pro',b:'corp',rv:0,ef:1,sdd:2})&&S.issues.includes(keep),'存成方案 B 不會派工');
  Object.assign(sel,{v:'anthropic',m:'haiku',b:'api',rv:2}); loadPreset(1);
  ok(sel.v==='google'&&sel.m==='pro'&&sel.b==='corp'&&sel.rv===0&&sel.issue===keep.id,'載入方案 B 回到 google/pro/corp/0，選取的工單不變');
  render(); ok(els.app.innerHTML.includes('data-save="2"')&&els.app.innerHTML.includes('載入方案 C'),'派工台有存成與載入按鈕');
  loadPreset(2); render(); const eC=est(keep,'anthropic','opus',2);
  ok(els.app.innerHTML.includes(`${kt(eC.lo)}–${kt(eC.hi)}`)&&els.app.innerHTML.includes(`${Math.round(eC.pe*100)}%`),'載入方案 C 後預估改用 Opus＋嚴格審核重算');

  {
  /* engineering-investments：購買與拒絕 */
  const snap=()=>JSON.stringify([S.hours,S.corp,S.inv]);
  newRun('laravel'); S.hours=8;
  ok(invest('tests')&&near(S.hours,4)&&S.corp===11600&&S.st.corp===400&&S.corpDay===400&&S.inv.tests,'單線買單元測試：剩 4h、公司預算 11,600、計入公司帳單');
  render(); ok(/data-inv="tests"\s+disabled><b>單元測試 Lv2<\/b><small>需要去過綜合場/.test(els.app.innerHTML),'買過 Lv1 的單元測試顯示 Lv2 的鎖定原因');
  ok(!els.app.innerHTML.includes('補測試'),'畫面上沒有補測試');
  const invRows=[...els.app.innerHTML.matchAll(/data-inv="(\w+)"(?! data-st)/g)].map(m=>m[1]).join(',');
  ok(invRows==='tests,ci,hook,scan,fastlane,monitor,skills,mcp,sdd,ai','投資面板順序：單元測試、CI、hook、scan、fastlane、監控、skills、MCP、SDD、提升 agent 能力',invRows);
  let before=snap(); ok(!invest('tests')&&snap()===before,'已買過不能再買');
  newRun('laravel'); S.hours=8; ok(invest('monitor')&&near(S.hours,5)&&S.corp===11600&&S.inv.monitor,'單線買監控告警：剩 5h、公司預算 11,600');
  newRun('laravel'); S.hours=5; before=snap(); ok(!invest('sdd')&&snap()===before,'剩 5h 買不了導入 SDD');
  newRun('laravel'); S.corp=200; before=snap(); ok(!invest('md','laravel')&&snap()===before,'公司預算 200 買不了 CLAUDE.md');
  newRun('laravel'); ok(!invest('md','nope')&&!invest('nope'),'不存在的技術線或投資不動作');
  newRun('laravel','parallel'); S.hours=8; const bj={v:'anthropic',b:'local',M:model('local','qwen'),issue:ticket('fe',1),left:1,hrs:1,ok:true,caught:false,tk:10,rv:0};
  bj.v='local'; S.issues=[bj.issue]; bj.issue.running=true; S.jobs=[bj];
  ok(invest('md','rails')&&S.hours<=5+1e-9&&S.hours>=4.5&&S.jobs.length===0,'平行模式投資推進時鐘 3h（加上審 PR）、背景 agent 照跑完；本地 GPU 忙也能投資',S.hours);
  start(); ok(invCount()===0&&!S.inv.md.rails,'新的一局投資歸零');

  /* CLAUDE.md 效果 */
  newRun('laravel'); S.hours=8;
  const l4=ticket('laravel',4), fe4=ticket('fe',4);
  const e0=est(l4,'anthropic','sonnet',0), f0=est(fe4,'anthropic','sonnet',0);
  invest('md','laravel');
  const e1=est(l4,'anthropic','sonnet',0), f1=est(fe4,'anthropic','sonnet',0);
  ok(near(e1.tk,e0.tk*.85)&&near(e0.p,.8)&&near(e1.p,.86),'Laravel CLAUDE.md：token ×0.85、成功率 0.80 → 0.86',`${e0.p} ${e1.p}`);
  ok(near(f1.tk,f0.tk)&&near(f1.p,f0.p),'Laravel CLAUDE.md 不影響 fe 工單');
  sel.issue=l4.id; S.issues=[l4]; render(); ok(els.app.innerHTML.includes('Laravel 有 CLAUDE.md：token ×0.85、成功率 +6%'),'派工台提示生效的投資（數字四捨五入）');

  /* 單元測試與 CI 流水線效果 */
  newRun('laravel','parallel'); S.inv.tests=true;
  ok(near(catchRate(1,model('anthropic','sonnet')),.87)&&catchRate(0,model('anthropic','sonnet'))===0,'單元測試：Sonnet 自審抓錯率 0.77 → 0.87，不審核仍是 0');
  ok(near(catchRate(2,model('anthropic','opus')),.95),'抓錯率上限 0.95');
  const mk=left=>({v:'anthropic',b:'api',M:model('anthropic','sonnet'),issue:ticket('fe',1),left,hrs:5});
  S.jobs=[mk(5),mk(5)];
  ok(near(conflictRate(),.2),'只買單元測試：另外 2 個在跑時合併衝突仍是 0.2',conflictRate());
  S.inv.tests=false; S.inv.ci=true;
  ok(near(conflictRate(),.1)&&near(catchRate(1,model('anthropic','sonnet')),.77),'只買 CI 流水線：合併衝突 0.2 → 0.1，抓錯率不變',conflictRate());
  S.jobs=[];

  /* pre-commit／lint hook 效果 */
  newRun('laravel','parallel');
  ok(near(prHrs(3,0),.6)&&near(prHrs(3,1),.3),'沒有 hook：複雜度 3 審 PR 0.6h／自審 0.3h');
  S.inv.hook=true;
  ok(near(prHrs(3,0),.3)&&near(prHrs(3,1),.15),'有 hook：複雜度 3 審 PR 0.3h／自審 0.15h');
  {
    const realRand=Math.random; S.hours=8;
    const hk=ticket('laravel',3); S.issues=[hk];
    S.jobs=[{v:'anthropic',b:'corp',M:model('anthropic','sonnet'),issue:hk,left:.1,hrs:1,tk:50,ok:true,caught:false,rv:0,hidden:false,stop:false}];
    Math.random=()=>.99; advance(.1); Math.random=realRand;
    ok(near(S.hours,8-.1-.3)&&S.log.some(l=>l.msg.includes('審 PR 花了 0.3h')),'有 hook：平行模式完成時審 PR 只花 0.3h',S.hours);
  }

  /* secret scanning／脫敏效果 */
  newRun('laravel','parallel');
  ok(near(auditOdds('anthropic'),.35)&&near(auditOdds('deepseek'),.6),'沒有 secret scanning：稽核機率 0.35／0.60');
  S.inv.scan=true;
  ok(near(auditOdds('anthropic'),.175)&&near(auditOdds('deepseek'),.3),'有 secret scanning：稽核機率 0.175／0.30');
  {
    S.hours=8; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'anthropic',m:'sonnet',b:'api'}));
    const sn=ticket('laravel',2,{sens:true}); S.issues=[sn]; render();
    ok(els.app.innerHTML.includes('18% 機率被資安稽核'),'一鍵派工的稽核警告顯示減半後的 18%');
    const realRand=Math.random, t0=S.trust;
    Math.random=()=>.2; sel.issue=sn.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0});
    auditRoll(sn,'api','anthropic'); Math.random=realRand;
    ok(S.trust===t0,'有 secret scanning：擲到 0.2 不會被稽核（原本 0.35 會）');
    render(); ok(els.app.innerHTML.includes('有 18% 機率被資安稽核抓到'),'派工台的稽核警告顯示減半後的 18%');
  }

  /* 上架自動化（fastlane）效果 */
  {
    newRun('app'); const fs=ticket('app',3,{store:true}), e0=est(fs,'anthropic','sonnet',1);
    ok(near(e0.pe,(e0.p+(1-e0.p)*e0.c)*.8)&&stackHint(fs).includes('20%'),'沒有 fastlane：顯示成功率 ×0.8、提示 20%');
    S.inv.fastlane=true; const e1=est(fs,'anthropic','sonnet',1);
    ok(near(storeReject(),.1)&&near(e1.pe,(e1.p+(1-e1.p)*e1.c)*.9)&&stackHint(fs).includes('10%'),'有 fastlane：退件 0.1、顯示成功率 ×0.9、提示 10%');
    const realRand=Math.random; S.issues=[fs]; sel.issue=fs.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0});
    const j=makeJob(fs); j.ok=true; j.caught=false; Math.random=()=>.15; const r=settle(j); Math.random=realRand;
    ok(r.ok&&!r.rejected,'有 fastlane：擲到 0.15 不會被退件（原本 0.2 會）');
  }

  /* 監控告警效果 */
  {
    const realRand=Math.random;
    newRun('laravel'); S.day=5; const q=makeIssue(true);
    ok(q.due===5,'沒有監控：第 5 天的事故單當天到期');
    S.day=20; ok(makeIssue(true).due===20,'沒有監控：第 20 天的事故單第 20 天到期'); S.day=5;
    S.inv.monitor=true; const m5=makeIssue(true); S.day=20; const m20=makeIssue(true);
    ok(q.kpi===Math.round(KPI[4]*1.6*(hardStack('laravel')?1.3:1))&&m5.kpi===Math.round(KPI[4]*1.2),'有監控：之後的事故單 KPI 加成 ×1.6 → ×1.2',`${q.kpi} ${m5.kpi}`);
    ok(m5.due===6&&m20.due===20&&q.due===5,'有監控：第 5 天的事故單第 6 天到期、第 20 天仍是 20，已在佇列的不變',`${m5.due} ${m20.due}`);
    const spike=EVENTS.find(f=>String(f).includes('ev.traffic'));
    newRun('laravel'); S.day=6; S.issues=[]; let txt=spike(); ok(txt[1].includes('今天下班前'),'沒有監控：流量暴增寫今天');
    S.inv.monitor=true; S.issues=[]; txt=spike(); ok(txt[1].includes('明天下班前')&&S.issues.every(i=>i.due===S.day+1),'有監控：流量暴增寫明天、事故單隔天到期');
    const lateInc=withMon=>{newRun('laravel'); S.hours=0; S.trust=70; S.inv.monitor=withMon; S.issues=[ticket('laravel',4,{inc:true,due:S.day})];
      Math.random=()=>.99; endDay(); Math.random=realRand; return 70-S.trust;};
    ok(lateInc(false)===8&&lateInc(true)===4,'事故單逾期：沒有監控扣信任 8、有監控扣 4');
    newRun('laravel'); S.day=5; const pre=makeIssue(true); S.inv.monitor=true; S.hours=0; S.trust=70; S.issues=[pre];
    Math.random=()=>.99; endDay(); Math.random=realRand;
    ok(pre.due===5&&S.trust===66&&S.st.late===1,'買監控前進來的事故單：期限仍是當天，逾期只扣信任 4',`${pre.due} ${S.trust}`);
    newRun('laravel'); S.hours=0; S.trust=70; S.inv.monitor=true; S.issues=[ticket('laravel',2,{due:S.day})];
    Math.random=()=>.99; endDay(); Math.random=realRand; ok(S.trust===66,'有監控：一般工單逾期仍扣信任 4',S.trust);
  }

  /* 新投資的派工台提示只在相關工單出現 */
  {
    newRun('laravel'); S.inv.scan=S.inv.fastlane=S.inv.monitor=true;
    const sh=ticket('laravel',2,{sens:true}); S.issues=[sh]; sel.issue=sh.id; render();
    const h=els.app.innerHTML;
    ok(h.includes('secret scanning：個人帳號稽核機率 ×0.5')&&!h.includes('fastlane：')&&!h.includes('監控告警：'),'機敏 laravel 工單只提示 secret scanning');
    const ap=ticket('app',3,{store:true,inc:true}); S.issues=[ap]; sel.issue=ap.id; render();
    ok(els.app.innerHTML.includes('fastlane：退件機率 10%')&&els.app.innerHTML.includes('監控告警：逾期扣信任 4'),'需上架的 app 事故單提示 fastlane 與監控告警');
    S.inv.hook=S.inv.ci=true; render(); ok(!els.app.innerHTML.includes('pre-commit hook：')&&!els.app.innerHTML.includes('CI 流水線：合併'),'單線模式不提示 hook 與 CI');
    S.mode='parallel'; render(); ok(els.app.innerHTML.includes('pre-commit hook：審 PR 時間減半')&&els.app.innerHTML.includes('CI 流水線：合併衝突減半'),'平行模式提示 hook 與 CI');
  }

  /* 合併衝突留下「解決衝突」工單 */
  {
    const realRand=Math.random, son=model('anthropic','sonnet');
    const job=(issue,left=.1)=>({v:'anthropic',b:'corp',M:son,issue,left,hrs:1,tk:50,ok:true,caught:false,rv:0,hidden:false,stop:false});
    const other=()=>job(ticket('fe',1),5);
    newRun('laravel','parallel'); S.hours=8;
    const orig=ticket('laravel',3,{title:'改文章列表排序',due:7}), id0=orig.id, kpi0=S.kpi;
    S.issues=[orig]; S.jobs=[job(orig),other(),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    const ci=S.issues[0];
    ok(S.issues.length===1&&ci.id===id0&&ci.merge&&ci.title==='解決衝突：改文章列表排序'&&ci.cx===2&&ci.due===7&&ci.kpi===KPI[3],'衝突：原單原地變成「解決衝突」工單，複雜度 3 → 2，沿用到期日與 KPI',JSON.stringify(ci));
    ok(S.kpi===kpi0&&S.st.done===0&&S.st.conflicts===1,'衝突：KPI 與完成數不變、衝突數 +1');
    ok(near(S.hours,7.8),'衝突：不花審 PR 時間',S.hours);
    S.day=20; showEnd(); ok(els.mo.innerHTML.includes('<span>合併衝突</span><span>1 次</span>'),'結算顯示合併衝突 1 次'); S.day=1;
    ok(!canEvaluate(ci),'解決衝突工單不能評估架構');
    sel.issue=ci.id; render();
    const html=els.app.innerHTML;
    ok(html.includes('<span class="chip trap">合併衝突</span>'),'卡片顯示合併衝突標籤');
    ok(html.includes('衝突時會留下一張「解決衝突」工單'),'平行提示說明衝突會留下工單');
    ok(!html.includes('評估架構（')&&!html.includes('找主管重新評估'),'解決衝突工單沒有評估架構與找主管重新評估按鈕');
    S.jobs=[job(ci),other(),other(),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    ok(!S.issues.includes(ci)&&S.kpi===kpi0+KPI[3]&&S.st.done===1&&S.st.conflicts===1,'解決衝突工單完成：拿回原單 KPI，3 個在跑也不再衝突');
    newRun('laravel','parallel'); S.hours=8;
    const one=ticket('laravel',1); S.issues=[one]; S.jobs=[job(one),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    ok(one.merge&&one.cx===1,'複雜度 1 的原單衝突後仍是複雜度 1',one.cx);
    newRun('laravel','parallel'); S.hours=8;
    const five=ticket('laravel',5,{big:true,evaluated:true}), three=ticket('laravel',3,{big:true});
    S.issues=[five]; S.jobs=[job(five),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    ok(five.merge&&five.cx===4&&five.big&&!five.evaluated,'複雜度 5 的原單衝突後是 4，保留大型 codebase、清掉已評估',JSON.stringify({cx:five.cx,big:five.big,ev:five.evaluated}));
    S.issues=[three]; S.jobs=[job(three),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    ok(three.merge&&three.cx===2&&!three.big,'新複雜度低於 3 時清掉大型 codebase');
    newRun('laravel','parallel'); S.hours=0;
    const lateOne=ticket('laravel',2,{merge:true,title:'解決衝突：x',due:S.day}), lost0=S.st.kpiLost;
    S.trust=70; S.issues=[lateOne]; Math.random=()=>.99; endDay(); Math.random=realRand; // .99 不會抽到改信任的隨機事件
    ok(S.st.kpiLost-lost0===Math.ceil(KPI[2]*.5)&&S.st.late===1&&S.trust===66,'解決衝突工單到期沒解完照一般逾期扣分（信任 −4）',S.st.kpiLost-lost0);
  }

  /* 接 MCP 文件效果 */
  newRun('laravel'); const son=model('anthropic','sonnet'), hai=model('google','flash');
  const ev0=evalCost(son), hr0=revealRate(hai); S.inv.mcp=true;
  ok(near(revealRate(son),.95)&&near(evalCost(son).hrs,.2)&&near(evalCost(son).tk,ev0.tk),'MCP：Sonnet 識破率 0.95、評估 0.2h、token 不變');
  ok(near(hr0,.65)&&near(revealRate(hai),.85),'MCP：Gemini Flash 識破率 0.65 → 0.85');

  /* 導入 SDD 效果 */
  newRun('laravel'); const c2=ticket('fe',2), c4=ticket('fe',4);
  const s0=est(c2,'anthropic','sonnet',0), ec0=evalCost(son); S.inv.sdd=true; const s1=est(c2,'anthropic','sonnet',0);
  ok(near(s1.tk,s0.tk*1.1)&&near(s1.p,s0.p),'SDD：複雜度 2 token ×1.1、成功率不變');
  ok(near(est(c4,'anthropic','sonnet',0).p,.88),'SDD：複雜度 4 fe × Sonnet → 0.88');
  ok(near(evalCost(son).tk,ec0.tk)&&near(evalCost(son).hrs,ec0.hrs),'SDD 不影響評估架構');
  const sddTrap=ticket('fe',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false});
  S.issues=[sddTrap]; sel.issue=sddTrap.id; Object.assign(sel,{v:'deepseek',m:'chat',b:'api',rv:0});
  const te=est(trueView(sddTrap),'deepseek','chat',0), tj=makeJob(sddTrap);
  ok(tj.stop&&tj.tk>=te.tk*.15*.7-1e-9&&tj.tk<=te.tk*.15*1.3+1e-9&&tj.hrs<=te.hrs*.15*1.2+1e-9,'SDD：陷阱只燒真實估計的 0.15',`${tj.tk/te.tk}`);
  const tr=settle(tj); ok(!tr.ok&&sddTrap.revealed&&S.log.some(l=>l.msg.includes('寫規格時就發現牽扯整個架構')),'SDD：陷阱失敗、曝光，紀錄寫出寫規格時發現');

  /* SDD 兩級：套用的等級 = min(選的, 已買的) */
  {  newRun('laravel'); const fe4=ticket('fe',4), fe2=ticket('fe',2), b4=est(fe4,'anthropic','sonnet',0,1,2), b2=est(fe2,'anthropic','sonnet',0,1,2);
  ok(C.sddLevel(2)===0&&near(b4.p,.80),'SDD 沒買：選 2 也套 0 級，複雜度 4 fe × Sonnet 0.80');
  S.inv.sdd=2;
  ok([[0,.80,1],[1,.88,1.1],[2,.95,1.2]].every(([L,p,k])=>{const e=est(fe4,'anthropic','sonnet',0,1,L);return near(e.p,p)&&near(e.tk,b4.tk*k);}),'SDD 各級：複雜度 4 fe × Sonnet 成功率 0.80／0.88／0.95、token ×1／1.1／1.2');
  ok(near(est(fe2,'anthropic','sonnet',0,1,2).tk,b2.tk*1.2)&&near(est(fe2,'anthropic','sonnet',0,1,2).p,b2.p),'SDD Lv2：複雜度 2 token ×1.2、成功率不變');
  S.inv.sdd=1; ok(C.sddLevel(2)===1&&C.sddLevel(0)===0&&C.sddLevel(undefined)===1,'SDD 只買 Lv1：選 2 套 1、選 0 套 0、沒選當 2');
  S.inv.sdd=2; ok(near(evalCost(son).tk,ec0.tk)&&near(evalCost(son).hrs,ec0.hrs),'SDD Lv2 不影響評估架構');
  for(const [L,f,note] of [[1,.15,'寫規格時就發現牽扯整個架構'],[2,.05,'跑框架流程時就發現牽扯整個架構']]){
    const tp=ticket('fe',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false});
    S.issues=[tp]; Object.assign(sel,{issue:tp.id,v:'deepseek',m:'chat',b:'api',rv:0,sdd:L});
    const e5=est(trueView(tp),'deepseek','chat',0), jj=makeJob(tp);
    ok(jj.stop&&jj.sdd===L&&jj.tk>=e5.tk*f*.7-1e-9&&jj.tk<=e5.tk*f*1.3+1e-9&&jj.hrs<=e5.hrs*f*1.2+1e-9,`SDD Lv${L}：陷阱只燒真實估計的 ${f}`,`${jj.tk/e5.tk}`);
    const rr=settle(jj); ok(!rr.ok&&tp.revealed&&S.log[0].msg.includes(note),`SDD Lv${L}：陷阱失敗、曝光，紀錄寫出「${note}」`,S.log[0].msg);
  }
  {const tp=ticket('fe',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false});
    S.issues=[tp]; Object.assign(sel,{issue:tp.id,sdd:0}); const e5=est(trueView(tp),'deepseek','chat',0), jj=makeJob(tp);
    ok(jj.stop&&jj.sdd===0&&jj.tk>=e5.tk*.4*.7-1e-9&&jj.tk<=e5.tk*.4*1.3+1e-9,'SDD 選不用：陷阱照燒 0.4');
    settle(jj); ok(S.log[0].msg.includes('做到一半發現牽扯整個架構'),'SDD 選不用：陷阱紀錄是做到一半發現');}
  sel.sdd=2;

  /* SDD Lv2 購買：不用研討會、1h、NT$200 */
  {const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
  newRun('laravel'); S.inv.sdd=1; S.hours=8; S.corp=11500;
  ok(invest('sdd')&&near(S.hours,7)&&S.corp===11300&&S.inv.sdd===2&&A.investBlock('sdd')==='已完成','SDD Lv2：8h、NT$11,500 → 7h、NT$11,300，已完成');
  ok(ge.some(e=>e.n==='invest'&&e.p.investment==='sdd2'),'SDD Lv2：GA invest 送 sdd2',JSON.stringify(ge));
  delete globalThis.gtag;}
  newRun('laravel'); S.inv.sdd=1; S.hours=.5; let sddBefore=JSON.stringify(S);
  ok(!invest('sdd')&&JSON.stringify(S)===sddBefore&&A.investBlock('sdd')==='工時不夠','SDD Lv2：剩 0.5h 買不了');
  S.hours=8; render(); ok(!/data-inv="sdd"[^>]*>[\s\S]{0,80}需要去過/.test(els.app.innerHTML)&&A.invLock('sdd',undefined,2)==='','SDD Lv2 按鈕不寫需要去過研討會');}

  /* 批次派工 */
  newRun('laravel','parallel'); S.hours=8; S.slots=3; S.presets=presetsOf(DEFAULT_PRESETS);
  render(); ok(!els.app.innerHTML.includes('data-act="batch"'),'沒做 skills 不顯示批次派工');
  S.inv.skills=true; const bt=[1,2,3,2].map(cx=>ticket('fe',cx,{due:5})); S.issues=[...bt]; render();
  ok(els.app.innerHTML.includes('data-act="batch"'),'做了 skills 顯示批次派工');
  batch();
  ok(S.jobs.length===3&&S.jobs.every(j=>j.issue.cx<=2)&&S.issues.includes(bt[2])&&!bt[2].running,'批次派工：派出三張 ≤2，複雜度 3 留在佇列',S.jobs.length);
  ok(S.log.some(l=>l.msg.includes('批次派工：派出 3 張，略過 0 張')),'批次派工紀錄張數');
  newRun('laravel','parallel'); S.inv.skills=true; S.hours=8; S.slots=2; S.presets=presetsOf(DEFAULT_PRESETS);
  const oA=ticket('fe',1,{due:5,kpi:3}), oB=ticket('fe',2,{due:3,kpi:6}), oC=ticket('fe',1,{due:3,kpi:10}); S.issues=[oA,oB,oC]; batch();
  ok(S.jobs.map(j=>j.issue).join()===[oC,oB].join()&&S.jobs[0].issue===oC&&S.jobs[1].issue===oB&&!oA.running,'批次派工順序：期限早的先，同期限 KPI 高的先（C、B，A 等下一輪）');
  newRun('laravel'); S.inv.skills=true; S.hours=.5; const slow=ticket('fe',2); S.issues=[slow]; batch();
  ok(S.issues.includes(slow)&&near(S.hours,.5),'單線模式工時不夠時批次派工停下來');
  /* 單線批次派工照方案自己的推理強度估工時（不是派工台目前的選擇） */
  newRun('laravel'); S.advanced=true; S.inv.skills=true; sel.ef=1; const hiT=ticket('fe',2); S.issues=[hiT];
  S.presets=presetsOf(DEFAULT_PRESETS).map((p,i)=>i?p:{...p,ef:2}); const midH=est(hiT,'deepseek','chat',1,1).hrs; S.hours=midH*1.2; batch();
  ok(S.issues.includes(hiT)&&!S.log.some(l=>l.msg.startsWith('D01 → 派出'))&&near(S.hours,midH*1.2),'單線批次派工：方案 A 高強度估的工時放不下就停下來（派工台選中強度也一樣）');
  S.advanced=false;
  newRun('laravel','parallel'); S.inv.skills=true; S.hours=8; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'deepseek',m:'chat',b:'api'}));
  const gov=ticket('fe',1,{client:CLIENTS[3]}), okT=ticket('fe',1); S.issues=[gov,okT]; batch();
  ok(gov.running!==true&&okT.running===true&&S.log.some(l=>l.msg.includes('派出 1 張，略過 1 張')),'沒有可用方案的工單被略過');

  /* 投資面板、結算、開局說明 */
  newRun('rails'); render();
  const order=[...els.app.innerHTML.matchAll(/data-inv="md" data-st="(\w+)"/g)].map(m=>m[1]).join(',');
  ok(order==='rails,laravel,rust,app,sre,devops,fe','CLAUDE.md 按鈕：主技術線優先，再其他工作內容，最後 fe',order);
  newRun('laravel'); S.hours=8; invest('md','laravel'); S.hours=8; invest('tests'); S.hours=8; invest('ci'); S.day=20; showEnd();
  ok(els.mo.innerHTML.includes('<span>工程投資</span><span>3 項</span>'),'結算顯示工程投資 3 項（CLAUDE.md＋單元測試＋CI）');
  start(); ok(els.mo.innerHTML.includes('派工方案與工程投資')&&els.mo.innerHTML.includes('監控告警')&&!els.mo.innerHTML.includes('補測試'),'開局說明提到派工方案與工程投資（含新項目，沒有補測試）');

  }
  {
  /* multi-stack-company：狀態、沿用、退回 */
  start(); ok(S.companies.join()==='laravel','預設只選 Laravel');
  S.companies='rust'; fresh(); ok(S.companies.join()==='rust','舊版字串 rust 讀成只選 rust');
  S.companies='sre'; fresh(); ok(S.companies.join()==='sre','字串 sre 讀成只選 sre');
  S.companies=['devops','sre']; fresh(); ok(S.companies.join()==='sre,devops','sre、devops 照固定順序存');
  S.companies=['laravel','rails','rust']; fresh(); ok(S.companies.join()==='laravel','三條退回 Laravel');
  S.companies=['laravel','go']; fresh(); ok(S.companies.join()==='laravel','未知技術線退回 Laravel');
  S.companies=['app','laravel']; fresh(); ok(S.companies.join()==='laravel,app','照固定順序存');
  S.companies=['rust','app']; start(); ok(S.companies.join()==='rust,app'&&/class="sb sel" data-company="rust"/.test(els.mo.innerHTML)&&/class="sb sel" data-company="app"/.test(els.mo.innerHTML),'再玩一個月預選 Rust＋App');

  /* 開局按鈕：照 spec 的 toggle 表 */
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const picked=()=>COMPANIES.filter(k=>new RegExp(`class="sb sel" data-company="${k}"`).test(els.mo.innerHTML)).join();
  start(); S.companies=['laravel']; showSetup(false);
  ok(els.mo.innerHTML.includes('工作內容（可選 1–2 項）'),'標籤寫出工作內容可選 1–2 項');
  press({company:'app'}); ok(picked()==='laravel,app','laravel + 點 app → laravel, app');
  ok(/data-company="rust" disabled/.test(els.mo.innerHTML)&&/data-company="rails" disabled/.test(els.mo.innerHTML),'選滿兩條時其他按鈕停用');
  press({company:'rust'}); ok(picked()==='laravel,app','選滿時點 rust 不變');
  press({company:'laravel'}); ok(picked()==='app','再點 laravel → 只剩 app');
  press({company:'app'}); ok(picked()==='app','最後一條不能取消');
  press({company:'laravel'}); ok(picked()==='laravel,app','先 app 再 laravel → 固定順序 laravel, app');
  ok(els.mo.innerHTML.includes('你是工程師，負責「Laravel 後端＋App 開發」。'),'開局說明用合併的工作內容名稱');
  press({act:'confirm'});
  ok(S.companies.join()==='laravel,app'&&S.issues.length===4,'確認後存成 laravel, app 並重抽第 1 天工單');
  ok(els.app.innerHTML.includes('Laravel 後端＋App 開發・工程師')&&S.log.some(l=>l.msg.includes('Laravel 後端＋App 開發・遊戲模式')),'標頭與紀錄顯示 Laravel 後端＋App 開發');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-company'),'週一調整仍不顯示工作內容');
  /* gh-18-01：SRE、DevOps 的 toggle、固定順序、開局說明 */
  start(); S.companies=['laravel']; showSetup(false);
  press({company:'devops'}); ok(picked()==='laravel,devops','laravel + 點 devops → laravel, devops');
  start(); S.companies=['laravel','app']; showSetup(false);
  ok(/data-company="sre" disabled/.test(els.mo.innerHTML),'選滿兩條時 sre 按鈕停用');
  press({company:'sre'}); ok(picked()==='laravel,app','選滿時點 sre 不變');
  start(); S.companies=['sre']; showSetup(false); press({company:'sre'}); ok(picked()==='sre','只剩 sre 不能取消');
  start(); S.companies=['devops']; showSetup(false); press({company:'app'});
  ok(picked()==='app,devops'&&els.mo.innerHTML.includes('負責「App 開發＋DevOps」'),'先 devops 再 app → 固定順序 app, devops');
  start(); S.companies=['laravel']; showSetup(false); press({company:'sre'});
  ok(els.mo.innerHTML.includes('你是工程師，負責「Laravel 後端＋SRE」。'),'Laravel 後端＋SRE 的開局說明');
  press({act:'confirm'}); ok(S.companies.join()==='laravel,sre'&&els.app.innerHTML.includes('Laravel 後端＋SRE・工程師'),'確認後存成 laravel, sre，標頭顯示 Laravel 後端＋SRE');

  /* 工單分布與不熟 */
  newRun(['laravel','app']); const M2=10000, cnt2={laravel:0,rails:0,rust:0,app:0,sre:0,devops:0,fe:0};
  for(let i=0;i<M2;i++)cnt2[pickStack()]++;
  ok(Math.abs(cnt2.laravel/M2-.375)<=.02&&Math.abs(cnt2.app/M2-.375)<=.02,'雙選：laravel、app 各約 0.375',JSON.stringify(cnt2));
  ok(Math.abs(cnt2.fe/M2-.15)<=.02,'雙選：fe 約 0.15',cnt2.fe/M2);
  ok(['rails','rust','sre','devops'].every(k=>Math.abs(cnt2[k]/M2-.025)<=.008),'雙選：rails、rust、sre、devops 各約 0.025',JSON.stringify(cnt2));
  const incs2=[...Array(1000)].map(()=>makeIssue(true));
  ok(incs2.every(i=>i.stack==='laravel'||i.stack==='app')&&incs2.some(i=>i.stack==='laravel')&&incs2.some(i=>i.stack==='app'),'雙選：事故單只出 laravel 或 app，兩條都有');
  /* gh-18-01：SRE 每張新工單多擲一次事故（spec 表） */
  for(const [cs,day,all,sre] of [[['laravel'],12,.12,0],[['sre'],12,.2256,.2256],[['sre'],2,.0591,.0591],[['laravel','sre'],12,.2256,.1656]]){
    newRun(cs); S.day=day; const T=10000, got=[...Array(T)].map(intakeIssue);
    const a=got.filter(i=>i.inc).length/T, r=got.filter(i=>i.inc&&i.stack==='sre').length/T;
    ok(Math.abs(a-all)<=.01&&Math.abs(r-sre)<=.01,`進件：${cs.join('+')} 第 ${day} 天事故 ${all}、sre 事故 ${sre}`,`${a} ${r}`);
  }
  newRun('laravel'); S.day=8; let sreInc=makeIssue(true,'sre');
  ok(sreInc.cx===4&&sreInc.due===8&&STACKS.sre.pool.inc.includes(sreInc.title)&&sreInc.kpi===26,'SRE 事故單：複雜度 4、當天到期、sre 事故標題、KPI 26',JSON.stringify(sreInc));
  S.inv.monitor=true; sreInc=makeIssue(true,'sre'); ok(sreInc.due===9,'有監控告警時 SRE 事故單隔天到期');
  newRun('sre'); S.day=1; firstIssues(); ok(S.issues.length===4&&S.issues.every(i=>!i.inc),'選 SRE 第 1 天仍是 4 張一般工單');
  newRun(['laravel','rust']);
  ok(h1(manualHrs(ticket('rust',2)))==='4.4'&&!unfamiliar(ticket('rust',2)),'laravel+rust：rust 不算不熟，手寫 4.4h');
  ok(h1(manualHrs(ticket('app',2)))==='8.8'&&unfamiliar(ticket('app',2)),'laravel+rust：app 不熟，手寫 8.8h');

  /* 公司名稱與最高分 key */
  const endPair=(cs,seed)=>{newRun(cs,'parallel');resetStore(seed);S.day=20;S.kpi=900;showEnd();return els.mo.innerHTML;};
  let h2=endPair(['laravel','app'],{'tokgame-best-parallel':'999999'});
  ok(h2.includes('月底結算・Laravel 後端＋App 開發・'),'結算標題顯示 Laravel 後端＋App 開發');
  ok('tokgame-best-parallel-laravel+app' in store&&!h2.includes('999,999'),'雙選寫入 tokgame-best-parallel-laravel+app，不讀舊 key');
  h2=endPair(['laravel'],{'tokgame-best-parallel':'4200'}); ok(h2.includes('4,200'),'只選 Laravel 仍讀舊 key');
  newRun('rails','serial'); ok(bestKey()==='tokgame-best-serial-rails','單選 key 不變');
  newRun(['sre','devops'],'parallel'); ok(bestKey()==='tokgame-best-parallel-sre+devops','SRE＋DevOps 的最高分 key');

  /* 投資按鈕順序 */
  newRun(['rails','app']); render();
  const ord2=[...els.app.innerHTML.matchAll(/data-inv="md" data-st="(\w+)"/g)].map(m=>m[1]).join(',');
  ok(ord2==='rails,app,laravel,rust,sre,devops,fe','rails+app：CLAUDE.md 按鈕順序 rails, app, laravel, rust, sre, devops, fe',ord2);
  newRun(['rust','app']); S.day=20; showEnd(); press({act:'again'});
  ok(S.companies.join()==='rust,app'&&/class="sb sel" data-company="rust"/.test(els.mo.innerHTML)&&/class="sb sel" data-company="app"/.test(els.mo.innerHTML),'結算按「再玩一個月」沿用 Rust＋App 並預選');
  }
  {
  /* outsource-gigs：開關 */
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  S.outsource=undefined; start();
  ok(S.outsource===false&&/class="sb sel" data-out="0"/.test(els.mo.innerHTML),'外包預設不接，開局預選不接外包');
  press({out:'1'}); ok(/class="sb sel" data-out="1"/.test(els.mo.innerHTML),'點接外包後預選接外包');
  press({act:'confirm'}); ok(S.outsource===true,'確認後開啟外包');
  S.day=20; showEnd(); press({act:'again'});
  ok(S.outsource===true&&/class="sb sel" data-out="1"/.test(els.mo.innerHTML),'再玩一個月沿用接外包並預選');
  S.outsource='yes'; fresh(); ok(S.outsource===false,'存的值是字串 yes 時退回不接外包');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-out'),'週一調整不顯示外包開關');
  }
  {
  /* outsource-gigs：外包單產生 */
  const gig=(stack,cx,extra={})=>ticket(stack,cx,{out:true,client:GIG_CLIENT,pay:(extra.kpi??KPI[cx])*GIG_PAY,...extra});
  newRun('laravel'); const G=5000, gc={laravel:0,rails:0,rust:0,app:0,sre:0,devops:0,fe:0}; const gigs=[...Array(G)].map(makeGig);
  gigs.forEach(g=>gc[g.stack]++);
  ok(Object.values(gc).every(c=>Math.abs(c/G-1/7)<=.02),'外包單七條技術線各約 0.143',JSON.stringify(gc));
  ok(gigs.every(g=>g.out&&!g.inc&&!g.sens&&g.client===GIG_CLIENT&&g.pay===g.kpi*250),'外包單不是事故、不機敏、案主是外包案主、報酬 = KPI × 250');
  ok(['rust','sre','devops'].every(k=>gigs.some(g=>g.stack===k)&&gigs.filter(g=>g.stack===k).every(unfamiliar))&&gigs.filter(g=>g.stack==='fe').every(g=>!unfamiliar(g)),'只選 Laravel 時 rust、sre、devops 外包單算不熟、fe 不算');
  S.issues=[gigs.find(g=>g.stack==='rust')]; sel.issue=null; render();
  ok(els.app.innerHTML.includes('<span class="chip unfam">不熟</span>'),'rust 外包單卡片顯示不熟標籤');
  ok(gigs.filter(g=>g.stack==='rust'&&!g.trap).every(g=>g.kpi===Math.round(KPI[g.cx]*1.3)),'rust 外包單有 KPI ×1.3 補償');
  ok(gigs.every(g=>STACKS[g.stack].pool[g.cx].includes(g.title)||STACKS[g.stack].pool.trap?.includes(g.title)||STACKS[g.stack].pool.research.some(e=>e.t===g.title)),'外包單標題來自該技術線的題庫');
  const realRand=Math.random, seen=new Set(); let bad=false;
  newRun('laravel','parallel'); S.outsource=true;
  for(let k=0;k<300;k++){S.day=1;S.hours=0;S.issues=[];S.jobs=[];endDay();const n=S.issues.filter(i=>i.out).length;seen.add(n);if(n>2)bad=true;}
  ok(!bad&&[0,1,2].every(n=>seen.has(n)),'開外包時每天新增 0–2 張外包單，三種張數都有出現',[...seen].join());
  const d1=new Set();
  S.outsource=true; for(let k=0;k<200;k++){start();d1.add(S.issues.filter(i=>i.out).length);}
  ok([...d1].every(n=>n<=2)&&d1.has(1)&&d1.has(2)&&S.issues.filter(i=>!i.out).length===4,'開外包時第 1 天多 0–2 張外包單，公司工單仍是 4 張',[...d1].join());
  const pressOut=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  S.outsource=false; start(); const co4=[...S.issues];
  pressOut({out:'1'}); Math.random=()=>.99; pressOut({act:'confirm'}); Math.random=realRand;
  ok(co4.every(i=>S.issues.includes(i))&&S.issues.filter(i=>i.out).length===2&&S.issues.length===6,'開局只切成接外包：公司工單不重抽，多 2 張外包單');
  showSetup(false); pressOut({out:'0'}); pressOut({act:'confirm'});
  ok(S.issues.length===4&&co4.every(i=>S.issues.includes(i)),'開局再切回不接外包：外包單拿掉，公司工單不變');
  newRun('laravel','parallel'); S.outsource=false; let any=false;
  for(let k=0;k<100;k++){S.day=1;S.hours=0;S.issues=[];S.jobs=[];endDay();if(S.issues.some(i=>i.out))any=true;}
  ok(!any&&addGigs()===0,'沒開外包時不會出現外包單');
  newRun('laravel'); S.cnBan=true; const lg=gig('laravel',2), co=ticket('laravel',2);
  ok(cnBlock(lg,'deepseek',model('deepseek','chat'))===''&&cnBlock(co,'deepseek',model('deepseek','chat'))==='公司政策禁用','全公司禁中國雲端後外包單仍可用 DeepSeek，公司工單不行');
  S.issues=[lg]; sel.issue=null; render();
  ok(!els.app.innerHTML.includes('禁中國雲端')&&els.app.innerHTML.includes('<span class="chip out">外包</span>')&&els.app.innerHTML.includes('<span class="k">NT$1,500</span>'),'外包卡片顯示外包標籤與 NT$1,500，沒有禁中國雲端');
  S.issues=[co]; render(); ok(els.app.innerHTML.includes('禁中國雲端'),'公司工單仍顯示禁中國雲端');
  newRun('laravel'); S.inv.md.rust=true; const rg=gig('rust',3), rc=ticket('rust',3), eg=est(rg,'anthropic','sonnet',0), ec=est(rc,'anthropic','sonnet',0);
  ok(near(eg.tk,ec.tk)&&near(eg.p,ec.p)&&near(eg.hrs,ec.hrs),'工程投資對外包單照常生效（Rust CLAUDE.md）');
  S.issues=[rg]; sel.issue=rg.id; render(); ok(els.app.innerHTML.includes('Rust 有 CLAUDE.md'),'外包單的投資提示寫出 Rust CLAUDE.md');
  }
  {
  /* outsource-gigs：外包單只能自己付 */
  const gig=(stack,cx,extra={})=>ticket(stack,cx,{out:true,client:GIG_CLIENT,pay:KPI[cx]*GIG_PAY,...extra});
  newRun('laravel','parallel'); S.hours=8; const g1=gig('laravel',2); S.issues=[g1];
  Object.assign(sel,{issue:g1.id,v:'anthropic',m:'sonnet',b:'corp',rv:0}); let html=dispatchPanel();
  ok(sel.b==='api'&&/data-b="corp" disabled>公司 API<small>外包不能用公司資源<\/small>/.test(html),'外包單：公司 API 停用並寫外包不能用公司資源，選擇改到第一個能用的付費方式',sel.b);
  S.seats=['openai']; Object.assign(sel,{v:'openai',m:'std',b:'seat'}); html=dispatchPanel();
  ok(sel.b!=='seat'&&/data-b="seat" disabled>公司席位<small>外包不能用公司資源<\/small>/.test(html),'外包單：OpenAI 公司席位也停用並寫同樣原因',sel.b);
  S.seats=[];
  S.presets=[{v:'anthropic',m:'sonnet',b:'corp',rv:1},{v:'deepseek',m:'chat',b:'api',rv:1},{v:'anthropic',m:'opus',b:'seat',rv:2}];
  const pf=presetFor(g1);
  ok(pf.i===1&&pf.skip.length===1&&pf.skip[0].r==='外包不能用公司資源','一鍵派工：外包單略過公司 API 方案，改用方案 B',JSON.stringify(pf));
  ok(presetBlock(g1,S.presets[2])==='外包不能用公司資源','公司席位方案對外包單的原因也是外包不能用公司資源');
  ok(quick(g1.id)&&S.jobs[0]?.issue===g1&&S.jobs[0].b==='api'&&S.log.some(l=>l.msg.includes('略過 A：外包不能用公司資源')),'一鍵派工紀錄寫出略過方案 A 的原因');
  newRun('laravel','parallel'); S.hours=8; S.inv.skills=true; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'anthropic',m:'sonnet',b:'corp'}));
  const bc=ticket('fe',1,{due:5}), bg=gig('fe',1,{due:5}); S.issues=[bc,bg]; batch();
  ok(bc.running===true&&bg.running!==true&&S.log.some(l=>l.msg.includes('派出 1 張，略過 1 張')),'批次派工：方案都刷公司 API 時派出公司單、略過外包單');
  newRun('laravel','parallel'); S.hours=8; const g2=gig('laravel',2), corp0=S.corp; S.issues=[g2];
  Object.assign(sel,{issue:g2.id,v:'anthropic',m:'sonnet',b:'corp',rv:0}); dispatch();
  ok(S.jobs.length===0&&S.corp===corp0&&!g2.running,'直接用公司 API 派外包單：不建立 job、公司預算不變');
  Object.assign(sel,{issue:g2.id,v:'anthropic',m:'sonnet',b:'corp'}); const h0=S.hours; evaluate();
  ok(!g2.evaluated&&S.corp===corp0&&near(S.hours,h0),'直接用公司 API 評估外包單：什麼都不做');
  newRun('laravel'); S.hours=8; const g3=gig('laravel',2), c0=S.corp; S.issues=[g3];
  Object.assign(sel,{issue:g3.id,v:'anthropic',m:'sonnet',b:'seat',rv:0}); dispatch();
  ok(S.issues.includes(g3)&&S.corp===c0&&near(S.hours,8),'單線模式用公司席位派外包單：什麼都不做');
  newRun('laravel','parallel'); S.hours=8; const cc=ticket('laravel',2); S.issues=[cc];
  Object.assign(sel,{issue:cc.id,v:'anthropic',m:'sonnet',b:'corp',rv:0}); dispatch();
  ok(S.jobs.length===1&&S.jobs[0].b==='corp','公司工單仍可用公司 API');
  newRun('laravel','parallel'); S.hours=8; S.subs.anthropic='max5'; const gs=gig('laravel',2), gl=gig('laravel',2); S.issues=[gs,gl];
  Object.assign(sel,{issue:gs.id,v:'anthropic',m:'sonnet',b:'sub',rv:0}); dispatch();
  Object.assign(sel,{issue:gl.id,v:'local',m:'gemma',b:'local',rv:0}); dispatch();
  ok(S.jobs.length===2&&S.jobs[0].issue===gs&&S.jobs[0].b==='sub'&&S.jobs[1].issue===gl&&S.jobs[1].b==='local','外包單可用個人訂閱與本地 GPU 派工');
  }
  {
  /* outsource-gigs：報酬、違約金、合併衝突、結算 */
  const realRand=Math.random;
  const gig=(stack,cx,extra={})=>{const kpi=Math.round(KPI[cx]*(stack==='rust'||stack==='app'?1.3:1));return ticket(stack,cx,{out:true,client:GIG_CLIENT,kpi,pay:kpi*GIG_PAY,...extra});};
  const lj=issue=>({v:'local',b:'local',M:model('local','gemma'),issue,left:.1,hrs:1,tk:50,ok:true,caught:false,rv:0,hidden:false,stop:false});
  for(const [st,cx,pay] of [['laravel',1,750],['laravel',2,1500],['rust',2,2000],['fe',4,4000],['laravel',5,6000]]){
    newRun('laravel'); const g=gig(st,cx); S.issues=[g]; const w0=S.wallet,k0=S.kpi,t0=S.trust;
    const r=settle(lj(g));
    ok(r.ok&&g.pay===pay&&S.wallet-w0===pay&&S.kpi===k0&&S.trust===t0&&S.st.outIncome===pay&&S.st.outDone===1&&S.st.done===0&&!S.issues.includes(g),`外包 ${st} 複雜度 ${cx} 完成：錢包 +NT$${pay}，KPI 與信任不變`,`${g.pay} ${S.wallet-w0}`);
  }
  ok(S.log.some(l=>l.msg.includes('外包收入 NT$6,000')),'完成紀錄寫外包收入');
  newRun('laravel'); S.hours=8; const mg=gig('laravel',2); S.issues=[mg]; sel.issue=mg.id; const mw=S.wallet, mk=S.kpi; manual();
  ok(!S.issues.includes(mg)&&S.wallet-mw===1500&&S.kpi===mk,'自己手寫完成外包單：錢包 +NT$1,500，KPI 不變');
  newRun('laravel','parallel'); S.hours=8; const cg=gig('laravel',2); S.issues=[cg];
  Math.random=()=>0; settle(lj(cg),{conflict:1}); Math.random=realRand;
  ok(cg.merge&&cg.out&&cg.pay===1500&&S.issues.includes(cg)&&S.st.outIncome===0,'外包單合併衝突：解決衝突工單仍是外包、報酬 NT$1,500');
  sel.issue=cg.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp'}); render();
  ok(els.app.innerHTML.includes('<span class="chip out">外包</span>')&&els.app.innerHTML.includes('<span class="k">NT$1,500</span>')&&/data-b="corp" disabled>公司 API<small>外包不能用公司資源/.test(els.app.innerHTML),'解決衝突的外包單：卡片顯示外包與 NT$1,500，公司 API 停用');
  const cw=S.wallet, ck=S.kpi; settle(lj(cg),{conflict:1});
  ok(!S.issues.includes(cg)&&S.wallet-cw===1500&&S.kpi===ck,'解決衝突的外包單完成：錢包 +NT$1,500，KPI 不變');
  newRun('laravel'); S.outsource=false; S.hours=0; const lg=gig('laravel',2,{due:S.day}); S.issues=[lg]; S.trust=70;
  const lw=S.wallet, lk=S.kpi; Math.random=()=>.99; endDay(); Math.random=realRand;
  ok(lw-S.wallet===450&&S.kpi===lk&&S.trust===70&&S.st.outPenalty===450&&S.st.outLate===1&&S.st.late===0&&!S.issues.includes(lg),'外包逾期：錢包 −NT$450，KPI 與信任不變，工單移除',`${lw-S.wallet} ${S.trust}`);
  newRun('laravel'); S.outsource=false; S.hours=0; S.wallet=100; const ng=gig('laravel',2,{due:S.day}); S.issues=[ng];
  Math.random=()=>.99; endDay(); Math.random=realRand;
  ok(S.wallet===-350&&!C.bills('anthropic',ticket('fe',1)).find(b=>b.id==='api').ok,'外包逾期違約金可以把錢包扣成負數（NT$100 → −NT$350），之後個人 API 停用',S.wallet);
  newRun('laravel'); const tg=gig('laravel',1,{trap:true,revealed:true,shownCx:1,cx:4,trueCx:4}); S.issues=[tg]; sel.issue=tg.id; S.trust=70;
  ok(!dispatchPanel().includes('找主管重新評估'),'曝光的外包陷阱沒有找主管重新評估按鈕');
  rescope(); ok(S.trust===70&&!tg.rescoped,'外包單呼叫 rescope 不會有效果');
  newRun('laravel'); S.outsource=true; S.day=20;
  S.kpi=300; S.trust=50; Object.assign(S.st,{subFee:3300,api:1000,outIncome:7500,outPenalty:450,outDone:4,outLate:1}); showEnd(); let rc=els.mo.innerHTML;
  ok(rc.includes('<span>你自己掏的錢</span><span>-NT$2,750</span>')&&rc.includes('<span>總分</span><span>3,200</span>'),'結算：你自己掏的錢 -NT$2,750，總分照 KPI 與信任算 3,200');
  ok(rc.includes('<span>外包收入</span><span>NT$7,500</span>')&&rc.includes('<span>外包違約金</span><span>NT$450</span>')&&rc.includes('<span>外包完成</span><span>4 張</span>')&&rc.includes('<span>外包逾期</span><span>1 張</span>'),'結算列出四行外包資訊');
  newRun('laravel'); S.outsource=false; S.day=20; showEnd(); ok(!els.mo.innerHTML.includes('外包收入'),'沒開外包時結算不顯示外包資訊');
  }

  {
  /* reasoning-effort：進階模式開關 */
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  S.advanced=undefined; start();
  ok(S.advanced===false&&/class="sb sel" data-adv="0"/.test(els.mo.innerHTML),'進階模式預設一般，開局預選一般');
  const ids=S.issues.map(i=>i.id+i.title).join();
  press({adv:'1'}); ok(/class="sb sel" data-adv="1"/.test(els.mo.innerHTML),'點進階後預選進階');
  press({act:'confirm'}); ok(S.advanced===true,'確認後開啟進階模式');
  ok(S.issues.map(i=>i.id+i.title).join()===ids,'只切進階模式不重抽第 1 天工單');
  S.day=20; showEnd(); press({act:'again'});
  ok(S.advanced===true&&/class="sb sel" data-adv="1"/.test(els.mo.innerHTML),'再玩一個月沿用進階並預選');
  S.advanced=1; fresh(); ok(S.advanced===false,'存的值是數字 1 時退回一般');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-adv'),'週一調整不顯示進階模式開關');
  newRun('laravel','parallel'); S.advanced=false; const k0=bestKey(); S.advanced=true; ok(bestKey()===k0,'最高分 key 不分一般／進階',k0);
  }
  {
  /* reasoning-effort：推理強度對模型的影響 */
  const son=model('anthropic','sonnet'), hai=model('google','flash'), opu=model('anthropic','opus');
  ok(effModel(son,1)===son,'中強度回傳原本的模型物件');
  ok(effModel(hai,0).cap===1&&effModel(opu,2).cap===6&&effModel(model('anthropic','fable'),2).cap===7,'Gemini Flash 低強度能力 1、Opus 高強度能力 6、Fable 高強度能力 7');
  const sh=effModel(son,2); ok(sh.price===son.price&&sh.w===son.w&&sh.name==='Sonnet・高強度','高強度不改價格與額度權重，名稱 Sonnet・高強度',sh.name);
  ok(EFFORT.map(f=>[f.cap,f.tk,f.hrs].join('/')).join()==='-1/0.7/0.8,0/1/1,1/1.5/1.4','EFFORT 倍率');
  newRun('laravel'); S.advanced=true; const t44=ticket('laravel',4);
  const [eL,eM,eH]=[0,1,2].map(f=>est(t44,'anthropic','sonnet',0,f));
  ok(near(eL.p,.5)&&near(eM.p,.8)&&near(eH.p,.95),'Sonnet 對複雜度 4 Laravel 單：低 50%、中 80%、高 95%',[eL.p,eM.p,eH.p].join());
  ok(near(eL.tk/eM.tk,.7)&&near(eH.tk/eM.tk,1.5),'token 是中強度的 0.7／1.5 倍',[eL.tk/eM.tk,eH.tk/eM.tk].join());
  ok(near(eL.hrs/eM.hrs,.8)&&near(eH.hrs/eM.hrs,1.4),'時數是中強度的 0.8／1.4 倍（高強度變慢）',[eL.hrs/eM.hrs,eH.hrs/eM.hrs].join());
  ok(near(est(t44,'anthropic','sonnet',1,2).c,catchRate(1,sh))&&est(t44,'anthropic','sonnet',1,2).c>est(t44,'anthropic','sonnet',1,1).c,'自我審核抓錯率用調整後的能力');
  S.advanced=false; const g2=est(t44,'anthropic','sonnet',0,2);
  ok(near(g2.p,eM.p)&&near(g2.tk,eM.tk)&&near(g2.hrs,eM.hrs)&&g2.M===son,'一般模式忽略推理強度');
  /* 高強度硬做陷阱 */
  newRun('laravel'); S.advanced=true; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0,ef:2});
  const tp=ticket('laravel',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false});
  let jb=makeJob(tp); ok(!jb.stop&&jb.M.cap===5,'高強度 Sonnet 對真實複雜度 5 的陷阱不會停下');
  const eT=f=>est(trueView(tp),'anthropic','sonnet',0,f), tv5=trueView(tp);
  ok(tv5.cx===5&&near(eT(2).tk/eT(1).tk,1.5)&&near(eT(2).hrs/eT(1).hrs,1.4)&&near(eT(1).hrs,5*model('anthropic','sonnet').speed),'陷阱照真實複雜度 5 估算，高強度 token ×1.5、時數 ×1.4');
  ok(jb.tk>=eT(2).tk*.7-1e-9&&jb.tk<=eT(2).tk*1.3+1e-9&&jb.hrs>=eT(2).hrs*.8-1e-9&&jb.hrs<=eT(2).hrs*1.2+1e-9,'高強度硬做陷阱的 token 與時數落在高強度估算的隨機範圍內');
  sel.ef=1; jb=makeJob(tp); ok(jb.stop,'中強度 Sonnet 對真實複雜度 5 的陷阱會停下');
  /* 評估架構不受影響 */
  const evalUse=ef=>{newRun('laravel'); S.advanced=true; S.hours=8; const t=ticket('laravel',2); S.issues=[t]; Object.assign(sel,{issue:t.id,v:'anthropic',m:'sonnet',b:'corp',rv:0,ef}); evaluate(); return [S.st.tk.anthropic,S.hours].join();};
  ok(evalUse(2)===evalUse(1),'評估架構的 token 與時間跟推理強度無關');
  /* 紀錄名稱 */
  newRun('laravel'); S.advanced=true; S.hours=8; const tl=ticket('laravel',1); S.issues=[tl]; Object.assign(sel,{issue:tl.id,v:'anthropic',m:'sonnet',b:'corp',rv:0,ef:2}); dispatch();
  ok(S.log.some(l=>l.msg.includes('Sonnet・高強度')),'派工紀錄寫 Sonnet・高強度');
  /* 派工台旋鈕 */
  newRun('laravel'); S.hours=8; const tv=ticket('laravel',2); S.issues=[tv]; sel.issue=tv.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp'});
  S.advanced=false; render(); ok(!els.app.innerHTML.includes('data-ef'),'一般模式沒有推理強度旋鈕');
  S.advanced=true; render(); ok([0,1,2].every(i=>els.app.innerHTML.includes(`data-ef="${i}"`))&&els.app.innerHTML.includes('推理強度'),'進階模式顯示低／中／高');
  }
  {
  /* reasoning-effort：派工方案存推理強度 */
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  ok(DEFAULT_PRESETS.every(p=>p.ef===1),'預設方案都是中強度');
  S.presets[0]={v:'anthropic',m:'sonnet',b:'corp',rv:1}; fresh(); ok(same(S.presets[0],{v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:2}),'沒有推理強度的方案保留並補成中、SDD 補成 2');
  S.presets[0]={v:'anthropic',m:'haiku',b:'sub',rv:0,ef:2,sdd:1}; start(); ok(same(S.presets[0],{v:'anthropic',m:'haiku',b:'sub',rv:0,ef:2,sdd:1}),'再玩一個月沿用高強度、SDD 1 的方案 A');
  S.presets[0]={v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:7}; fresh(); ok(same(S.presets,DEFAULT_PRESETS),'推理強度不合法時三組退回預設');
  newRun('laravel'); S.hours=8; const tp=ticket('laravel',4); S.issues=[tp]; sel.issue=tp.id;
  Object.assign(sel,{v:'google',m:'pro',b:'corp',rv:0,ef:2}); savePreset(1); ok(S.presets[1].ef===2,'存成方案記下推理強度');
  sel.ef=0; loadPreset(1); ok(sel.ef===2,'載入方案帶回推理強度');
  S.advanced=true; render(); ok(/載入方案 B<small>Pro・高強度/.test(els.app.innerHTML),'進階模式的載入按鈕顯示高強度');
  S.advanced=false; render(); ok(!/載入方案 B<small>Pro・高強度/.test(els.app.innerHTML),'一般模式的載入按鈕不顯示強度');
  const pa={v:'anthropic',m:'opus',b:'api',rv:0,ef:2}, hiMid=costLine('api',model('anthropic','opus'),'anthropic',est(tp,'anthropic','opus',0,1)).hi;
  S.wallet=hiMid*1.2;
  S.advanced=false; ok(presetBlock(tp,pa)==='','一般模式下存了高強度的方案照中強度估算');
  S.advanced=true; ok(presetBlock(tp,pa)==='錢包不夠','進階模式下同一個方案照高強度估算，錢包不夠');
  newRun('laravel'); S.advanced=false; S.hours=8; const tq=ticket('laravel',1); S.issues=[tq];
  S.presets=[{v:'anthropic',m:'sonnet',b:'corp',rv:0,ef:2},...DEFAULT_PRESETS.slice(1)].map(p=>({...p}));
  ok(quick(tq.id)&&S.log.some(l=>l.msg.includes('Sonnet'))&&!S.log.some(l=>l.msg.includes('強度')),'一般模式一鍵派工用存了高強度的方案，照中強度派工');
  S.advanced=false;
  }

  {
  /* ===== 派工台的 SDD 選項與派工方案（gh-33-01-sdd-levels） ===== */
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const clickApp=ds=>els.app.on.click({target:{closest:()=>({dataset:ds,disabled:false})}});
  const panel=()=>{render(); return els.app.innerHTML;};
  newRun('laravel'); S.hours=8; const t2=ticket('laravel',2); S.issues=[t2]; sel.issue=t2.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0});
  ok(sel.sdd===2,'新局 SDD 選擇是 2（已買的最高級）');
  let h=panel(); ok(!h.includes('開發流程')&&!h.includes('data-sdd'),'沒買 SDD：派工台沒有開發流程');
  S.inv.sdd=1; h=panel();
  ok(h.includes('開發流程')&&/data-sdd="0"/.test(h)&&/class="sb sel" data-sdd="1"/.test(h)&&!h.includes('data-sdd="2"'),'買了 Lv1：不用、markdown，亮 markdown');
  S.inv.sdd=2; h=panel(); ok(/class="sb sel" data-sdd="2"/.test(h)&&h.includes('框架（Lv2）'),'買了 Lv2：三個按鈕，亮框架');
  ok(/data-sdd="2">框架（Lv2）<small>Spectra／OpenSpec／Spec Kit・token ×1\.2・≥3 成功率 \+15%・陷阱燒 5%/.test(h)&&/data-sdd="1">markdown（Lv1）<small>例如 Superpowers・/.test(h)&&/data-sdd="0">不用<small>陷阱燒 40%/.test(h),'SDD 按鈕寫出實際工具、token、成功率、陷阱燒的比例');
  S.inv.sdd=1; const off0=est(t2,'anthropic','sonnet',0,1,0);
  clickApp({sdd:'0'}); h=panel();
  ok(sel.sdd===0&&/class="sb sel" data-sdd="0"/.test(h)&&!/SDD markdown：/.test(h),'點不用：亮不用，提示不寫 SDD');
  ok(near(est(t2,'anthropic','sonnet',0).tk,off0.tk)&&near(off0.tk,est(t2,'anthropic','sonnet',0,1,0).tk),'點不用：預估 token 等於沒有 SDD');
  S.jobs=[]; const j0=makeJob(t2); ok(j0.sdd===0,'點不用：派出去的 job 套 0 級');
  clickApp({sdd:'1'}); h=panel(); ok(/SDD markdown：token ×1\.1/.test(h),'選 markdown：提示寫 SDD markdown token ×1.1');
  S.inv.sdd=2; h=panel(); ok(sel.sdd===1&&/class="sb sel" data-sdd="1"/.test(h)&&makeJob(t2).sdd===1,'先選 Lv1 再買 Lv2：還是亮 markdown、派工套 1 級');
  sel.sdd=0; start(); S.inv.sdd=1; S.issues=[t2]; sel.issue=t2.id; h=panel(); ok(sel.sdd===2&&/class="sb sel" data-sdd="1"/.test(h),'這局選不用，下一局重設：買 Lv1 後亮 markdown');

  /* 派工方案：預設、存檔、載入、不夠就降級 */
  ok(same(DEFAULT_PRESETS.map(p=>p.sdd),[0,2,2]),'預設方案 SDD：A 不用、B／C 2');
  S.presets[0]={v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:3}; fresh(); ok(same(S.presets,DEFAULT_PRESETS),'方案 SDD 等級 3 不合法：三組退回預設');
  newRun('laravel'); S.hours=8; S.inv.sdd=1; const t3=ticket('laravel',3); S.issues=[t3]; sel.issue=t3.id;
  Object.assign(sel,{v:'google',m:'pro',b:'corp',rv:0,ef:2,sdd:0}); savePreset(1); ok(same(S.presets[1],{v:'google',m:'pro',b:'corp',rv:0,ef:2,sdd:0}),'存成方案 B 記下 SDD 0');
  sel.sdd=2; loadPreset(1); ok(sel.sdd===0,'載入方案 B 帶回 SDD 0');
  S.presets=presetsOf(DEFAULT_PRESETS); h=panel();
  ok(/載入方案 A<small>[^<]*・SDD 不用</.test(h)&&/載入方案 B<small>[^<]*・SDD markdown</.test(h)&&/載入方案 C<small>[^<]*・SDD markdown</.test(h),'買了 Lv1：載入按鈕 A 寫 SDD 不用、B／C 寫 SDD markdown');
  S.inv.sdd=0; h=panel(); ok(!/載入方案 [ABC]<small>[^<]*SDD/.test(h),'沒買 SDD：載入按鈕不寫 SDD');
  S.inv.sdd=1; S.presets=[{v:'deepseek',m:'chat',b:'nope'},{v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:2},DEFAULT_PRESETS[2]].map(p=>({...p}));
  S.presets[0]={...DEFAULT_PRESETS[0],v:'anthropic',m:'sonnet',b:'seat'}; // A 沒有席位不能用
  const r=presetFor(t3); ok(r.i===1,'方案 B 要 SDD 2、只買 Lv1：不略過',JSON.stringify(r));
  ok(presetBlock(t3,S.presets[1])===''&&quick(t3.id)&&S.log.some(l=>l.msg.includes('一鍵派工方案 B')),'一鍵派工用方案 B');
  ok(sel.sdd===2&&S.log.some(l=>/一鍵派工方案 B/.test(l.msg)&&l.msg.includes('SDD markdown')),'方案 B 要 SDD 2：派工套已買的 Lv1（紀錄寫 SDD markdown）');
  S.presets=presetsOf(DEFAULT_PRESETS); sel.sdd=2;

  /* 紀錄與 GA 的 SDD 等級 */
  {const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
  for(const [own,req,want,seg] of [[0,2,'none',''],[1,2,'md','・SDD markdown'],[2,2,'framework','・SDD 框架'],[2,0,'none','']]){
    newRun('laravel','parallel'); S.hours=8; S.slots=3; S.inv.sdd=own; const tx=ticket('laravel',2); S.issues=[tx];
    Object.assign(sel,{issue:tx.id,v:'anthropic',m:'sonnet',b:'corp',rv:1,sdd:req}); ge.length=0; dispatch();
    const d=ge.find(e=>e.n==='dispatch');
    ok(d&&d.p.sdd===want,`play-analytics：買 ${own} 級、選 ${req} → dispatch sdd ${want}`,JSON.stringify(d?.p));
    ok(S.log.some(l=>l.msg.includes(`｜Claude Code / Sonnet・公司 API・自審${seg}｜成功率`)),`action-log：買 ${own} 級、選 ${req} 的派工行選項段落`,S.log.map(l=>l.msg).join('\n'));
    if(own===0) ok(d.p.vendor==='anthropic'&&d.p.model==='sonnet'&&d.p.bill==='corp'&&d.p.review==='self'&&d.p.effort==='mid'&&d.p.via==='panel'&&d.p.preset==='none'&&d.p.cx===2&&d.p.stack==='laravel','play-analytics：派工台派工（沒買 SDD）');
  }
  newRun('laravel'); S.inv.sdd=2; const tf=ticket('laravel',2); S.issues=[tf]; Object.assign(sel,{issue:tf.id,v:'anthropic',m:'sonnet',b:'corp',rv:0,sdd:2});
  ge.length=0; settle(makeJob(tf)); ok(ge.find(e=>e.n==='job_result')?.p.sdd==='framework','play-analytics：套 2 級的 job_result sdd framework');
  ge.length=0; settle({...makeJob(tf),sdd:true}); ok(ge.find(e=>e.n==='job_result')?.p.sdd==='md','play-analytics：舊 job（sdd true）的 job_result sdd md');
  ge.length=0; settle({...makeJob(tf),sdd:false}); ok(ge.find(e=>e.n==='job_result')?.p.sdd==='none','play-analytics：舊 job（sdd false）的 job_result sdd none');
  {const tp=ticket('laravel',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false}); S.issues=[tp]; Object.assign(sel,{issue:tp.id,v:'deepseek',m:'chat',b:'api',rv:0,sdd:0});
   const jj=makeJob(tp); ok(jj.stop,'舊 job 陷阱測試：DeepSeek 碰到真實複雜度 5 的陷阱會停');
   settle({...jj,sdd:true}); ok(S.log[0].msg.includes('寫規格時就發現牽扯整個架構'),'舊 job（sdd true）陷阱停下的紀錄是 Lv1 的',S.log[0].msg);}

  /* 舊存檔：沒有 sel.sdd、job 的 sdd 是布林 */
  newRun('laravel','parallel'); S.inv.sdd=true; const to=ticket('laravel',2,{running:true}); S.issues=[to];
  Object.assign(sel,{issue:to.id,v:'anthropic',m:'sonnet',b:'corp',rv:0});
  S.jobs=[{issue:to,v:'anthropic',m:'sonnet',ef:1,b:'corp',M:model('anthropic','sonnet'),rv:0,tk:100,hrs:3,ok:true,caught:false,left:2,hidden:false,stop:false,sdd:true,research:false}];
  const oldSel={...sel}; delete oldSel.sdd;
  resetStore({[St.SAVE_KEY]:JSON.stringify({ver:St.SAVE_VER,S,sel:oldSel,uid:900,morning:null})});
  const rd=St.readSave(); ok(rd&&!rd.bad,'save-game：沒有 SDD 選擇、job sdd 是布林的舊存檔沒有被丟掉');
  St.loadGame(rd); render();
  ok(St.sel.sdd===2&&/class="sb sel" data-sdd="1"/.test(els.app.innerHTML),'save-game：讀檔後 SDD 選擇補成 2，派工台亮 markdown',St.sel.sdd);
  ge.length=0; settle(S.jobs[0]); ok(ge.find(e=>e.n==='job_result')?.p.sdd==='md','save-game：讀檔後舊 job 結算送 sdd md');
  resetStore(); delete globalThis.gtag;}
  }

  const R0=Math.random;
  /* 依序回傳 seq 裡的值，用完後一直回傳最後一個 */
  const withRand=(seq,f)=>{const a=[].concat(seq);let i=0;Math.random=()=>a[Math.min(i++,a.length-1)];try{return f();}finally{Math.random=R0;}};
  {
  /* ===== 核心規則（gh-09-01-core-rules-specs） ===== */
  const clickMo=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const clickApp=ds=>els.app.on.click({target:{closest:()=>({dataset:ds,disabled:false})}});
  const job=(is,v,m,b,extra={})=>({issue:is,v,b,M:model(v,m),mul:1,rv:0,tk:100,hrs:1,ok:true,caught:false,left:0,hidden:false,stop:false,sdd:false,...extra});

  /* work-calendar：起始資源 */
  start();
  ok(S.day===1&&S.hours===8&&S.wallet===8000&&S.corp===12000&&S.trust===70&&S.kpi===0,'work-calendar：新局第 1 天、8h、NT$8,000、NT$12,000、信任 70、KPI 0');
  /* 開局買 Anthropic Pro 與 Kimi 會員 */
  clickMo({pv:'anthropic',pp:'pro'}); clickMo({pv:'moonshot',pp:'member'}); clickMo({act:'confirm'});
  ok(S.wallet===7050&&S.st.subFee===950,'work-calendar：開局訂閱 Pro＋會員付 NT$950',[S.wallet,S.st.subFee].join());
  /* 下班換日 */
  newRun('laravel'); S.day=3; S.hours=1.5; S.corpDay=200; S.outage='openai';
  S.subs.anthropic='pro'; S.used.sub.anthropic={d:100,w:300};
  withRand(.99,endDay);
  ok(S.day===4&&S.hours===8&&S.corpDay===0&&S.outage===null&&S.used.sub.anthropic.d===0&&S.used.sub.anthropic.w===300,'work-calendar：換日後 8h、今日額度與公司當日花費歸零、當機解除、本週用量保留');
  ok(els.mo.innerHTML.includes('<h2>第 4 天</h2>'),'work-calendar：彈窗標題「第 4 天」');
  newRun('laravel'); S.day=20; withRand(.99,endDay);
  ok(S.day===20&&els.mo.innerHTML.includes('月底結算'),'work-calendar：第 20 天下班打開月底結算');
  /* 週一重置 */
  newRun('laravel'); S.day=5; S.subs.anthropic='pro'; S.used.sub.anthropic={d:50,w:500};
  withRand(.99,endDay);
  ok(S.day===6&&S.used.sub.anthropic.w===0,'work-calendar：第 6 天每週用量歸零');
  ok(els.mo.innerHTML.includes('第 6 天・新的一週')&&els.mo.innerHTML.includes('每週額度已重置。今天可以調整訂閱方案。')&&els.mo.innerHTML.includes('data-act="adj"'),'work-calendar：第 6 天彈窗顯示新的一週與調整訂閱');
  render(); ok(els.app.innerHTML.includes('data-act="adjust"'),'work-calendar：週一整天都有調整訂閱按鈕');
  S.day=7; render(); ok(!els.app.innerHTML.includes('data-act="adjust"'),'work-calendar：第 7 天沒有調整訂閱按鈕');
  /* 週一補差價 */
  const adjCost=(day,v,from,to)=>{newRun('laravel'); S.day=day; S.subs[v]=from; showSetup(true); clickMo({pv:v,pp:to}); return M.planCost(true);};
  ok(adjCost(6,'anthropic','pro','max5')===1987.5,'work-calendar：第 6 天 Pro→Max 5× 補 NT$1,987.5');
  ok(adjCost(11,'anthropic','pro','max5')===1325,'work-calendar：第 11 天 Pro→Max 5× 補 NT$1,325');
  ok(adjCost(16,'openai','none','plus')===162.5,'work-calendar：第 16 天不訂閱→Plus 補 NT$162.5');
  ok(adjCost(11,'anthropic','max5','pro')===0,'work-calendar：降級不用付錢');
  const w0=S.wallet; clickMo({act:'confirm'}); ok(S.subs.anthropic==='pro'&&S.wallet===w0,'work-calendar：降級立即生效、不退費');
  ok(adjCost(11,'openai','pro','pro500')===4875,'agent-catalog：第 11 天 Pro 200→Pro 500 補 NT$4,875');
  clickMo({act:'confirm'}); ok(S.subs.openai==='pro500'&&dataModule.planOf('openai').day===12500&&dataModule.planOf('openai').week===50000,'agent-catalog：升級 Pro 500 後額度 12,500k／50,000k');
  newRun('laravel'); S.day=6; S.subs.anthropic='pro'; showSetup(true); clickMo({pv:'anthropic',pp:'max20'}); clickMo({act:'close'});
  ok(els.ov.hidden&&S.subs.anthropic==='pro','work-calendar：不改了就關掉、方案不變');
  showSetup(true); ok(els.mo.innerHTML.includes('這次要從個人錢包付'),'work-calendar：調整彈窗顯示要付多少');
  /* 錢包不夠付訂閱（gh-26-01-money-off-score） */
  const goOff=()=>/data-act="confirm" disabled/.test(els.mo.innerHTML);
  start(); clickMo({pv:'openai',pp:'pro500'});
  ok(goOff()&&els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'work-calendar：開局只訂 Pro 500（NT$16,250）超過錢包 NT$8,000 → 開始第 1 天停用');
  clickMo({act:'confirm'}); ok(S.wallet===8000&&S.st.subFee===0&&S.subs.openai==='none'&&!els.ov.hidden,'work-calendar：錢不夠時按確認不扣錢、不開局');
  clickMo({pv:'openai',pp:'pro'}); ok(!goOff()&&!els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'work-calendar：改回付得起的方案就能確認');
  newRun('laravel'); S.day=6; S.subs.anthropic='pro'; S.wallet=1000; showSetup(true); clickMo({pv:'anthropic',pp:'max5'});
  ok(goOff()&&els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'work-calendar：第 6 天錢包 NT$1,000 升級 Max 5×（NT$1,987.5）→ 確定調整停用');
  clickMo({act:'close'}); ok(els.ov.hidden&&S.subs.anthropic==='pro'&&S.wallet===1000,'work-calendar：錢不夠時不改了照樣關掉、方案不變');
  newRun('laravel'); S.day=6; S.subs.anthropic='max5'; S.wallet=-350; showSetup(true);
  ok(!goOff()&&!els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'work-calendar：錢包負數、沒改方案 → 確定調整照樣能按');
  clickMo({pv:'anthropic',pp:'pro'}); ok(!goOff(),'work-calendar：錢包負數也能降級（付 NT$0）');
  clickMo({act:'confirm'}); ok(S.subs.anthropic==='pro'&&S.wallet===-350,'work-calendar：降級生效、不扣錢');
  newRun('laravel'); S.subs.anthropic='max5'; S.used.sub.anthropic={d:0,w:0}; S.wallet=-350; const ts0=ticket('fe',2); S.issues=[ts0];
  const rs0=settle(job(ts0,'anthropic','sonnet','sub',{tk:200}));
  ok(rs0.ok&&near(S.used.sub.anthropic.d,200)&&S.wallet===-350&&C.bills('anthropic',ts0).find(b=>b.id==='sub').ok,'billing-methods：錢包負數時已有的訂閱照樣能用、扣額度不扣錢');
  /* 訂閱額度 */
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic={d:100,w:1700};
  ok(quotaLeft('sub','anthropic')===100,'work-calendar：每週上限比較緊時剩 100k');
  newRun('laravel'); render(); ok(els.app.innerHTML.includes('目前沒有任何訂閱。只能用 API、公司預算或本地模型。'),'work-calendar：沒有訂閱時的額度區文字');
  S.subs.anthropic='pro'; render(); ok(/Anthropic Pro<span>個人訂閱/.test(els.app.innerHTML),'work-calendar：訂閱的額度方塊標示個人訂閱');
  S.outage='anthropic'; render(); ok(/Anthropic Pro<span>今日當機/.test(els.app.innerHTML),'work-calendar：當機時額度方塊標示今日當機');

  /* agent-catalog：模型數值表 */
  const MODELS=[
    ['anthropic','haiku',3,.15,.3,.7,.9],['anthropic','sonnet',4,.45,1,.8,1],['anthropic','opus',5,.9,2,1,.85],['anthropic','fable',6,1.8,4,1.2,.85],
    ['openai','mini',3,.15,.3,.7,1],['openai','std',4,.4,1,.8,1.05],['openai','high',5,1.6,3,1,.95],
    ['google','flash',2,.06,.25,.4,1.1],['google','pro',4,.35,1,.9,1],
    ['deepseek','chat',3,.03,1,.7,1.15],['deepseek','reasoner',4,.06,1,1.2,1.5],
    ['zhipu','air',3,.04,.5,.6,1.1],['zhipu','glm',4,.1,1,.9,1.1],['moonshot','k2',4,.12,1,.9,1.2],
    ['local','qwen',3,0,0,1.7,1.3],['local','gemma',3,0,0,1.9,1.25],['local','oss',2,0,0,1.8,1.2],
    ['local','qcnext',4,0,0,1.4,1.2],['local','gemma4',4,0,0,2,1.2],['local','glm53',5,0,0,2.8,1]];
  ok(Object.values(VENDORS).reduce((a,V)=>a+V.models.length,0)===20&&Object.keys(VENDORS).length===7,'agent-catalog：7 家廠商 20 個模型');
  for(const [v,m,cap,price,w,speed,verb] of MODELS){const x=model(v,m); ok(x&&x.cap===cap&&x.price===price&&x.w===w&&x.speed===speed&&x.verb===verb,`agent-catalog：${v}/${m} 數值符合表格`);}
  ok(['flash','pro'].every(m=>model('google',m).ctx)&&MODELS.filter(r=>r[0]!=='google').every(([v,m])=>!model(v,m).ctx),'agent-catalog：只有 Gemini 有 ctx');
  ok(Object.keys(VENDORS).filter(v=>VENDORS[v].cn).join()==='deepseek,zhipu,moonshot'&&model('local','qwen').cn&&!model('local','gemma').cn&&!model('local','oss').cn&&model('local','qcnext').cn&&!model('local','gemma4').cn&&model('local','glm53').cn,'agent-catalog：中國廠商與 Qwen、GLM-5.3 中國權重');
  ok(VENDORS.local.models.map(x=>x.name).join()==='Qwen3.6 35B-A3B,Gemma 4 26B A4B,Gemma 4 E4B,Qwen3-Coder-Next,Gemma 4 31B,GLM-5.3'&&VENDORS.local.models.map(x=>x.hw||'').join()===',,,spark,spark,mac','agent-catalog：本地模型依序是三個基本款再三個電腦解鎖的');
  ok(Object.keys(VENDORS).filter(v=>VENDORS[v].corp).join()==='anthropic,google','agent-catalog：只有 Anthropic、Google 可走公司 API');
  /* 訂閱方案表 */
  const PLANS={anthropic:[['pro',650,450,1800],['max5',3300,2200,9000],['max20',6500,9000,36000]],openai:[['plus',650,500,2000],['pro',6500,8000,30000],['pro500',16250,12500,50000]],google:[['aipro',650,700,2800],['ultra',8000,10000,40000]],zhipu:[['lite',100,1500,6000],['pro',500,6000,24000]],moonshot:[['member',300,1500,6000]]};
  for(const v in PLANS) ok(JSON.stringify(VENDORS[v].plans.filter(p=>p.id!=='none').map(p=>[p.id,p.price,p.day,p.week]))===JSON.stringify(PLANS[v])&&VENDORS[v].plans[0].id==='none',`agent-catalog：${v} 訂閱方案符合表格`);
  ok(VENDORS.deepseek.plans.length===1&&VENDORS.local.plans.length===0,'agent-catalog：DeepSeek 與自架開源沒有訂閱');
  ok(VENDORS.openai.plans.map(p=>p.name).join()==='不訂閱,Plus,Pro 200,Pro 500','agent-catalog：OpenAI 方案名稱依序是不訂閱、Plus、Pro 200、Pro 500');
  /* 10M 以上的 token 數留一位小數，結尾 .0 拿掉 */
  const KT=[[10000,'10M'],[10004,'10M'],[9960,'10M'],[12500,'12.5M'],[10234,'10.2M'],[50000,'50M'],[9940,'9.9M'],[8000,'8.0M'],[450,'450k']];
  ok(KT.every(([k,s])=>kt(k)===s),'agent-catalog：四捨五入後 10M 以上留一位小數、拿掉 .0，以下照舊',KT.map(([k])=>kt(k)).join());
  /* 開局彈窗的 OpenAI 那一列 */
  start(); const oaiBtns=[...els.mo.innerHTML.matchAll(/data-pv="openai" data-pp="[^"]+">([^<]+)<small>([^<]*)<\/small>/g)].map(m=>[m[1],m[2]]);
  ok(oaiBtns.map(b=>b[0]).join()==='不訂閱,Plus,Pro 200,Pro 500'&&!oaiBtns.some(b=>b[0]==='Pro'),'agent-catalog：開局 OpenAI 按鈕依序是不訂閱、Plus、Pro 200、Pro 500',oaiBtns.map(b=>b[0]).join());
  ok(oaiBtns[3]?.[1]==='NT$16,250/月・每日 12.5M','agent-catalog：Pro 500 顯示 NT$16,250/月・每日 12.5M',oaiBtns[3]?.[1]);
  clickMo({pv:'openai',pp:'pro500'});
  ok(els.mo.innerHTML.includes('這次要從個人錢包付</span><b class="num">NT$16,250</b>')&&els.mo.innerHTML.includes('付完剩 <b class="num">-NT$8,250</b>')&&/data-act="confirm" disabled/.test(els.mo.innerHTML)&&els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'agent-catalog：月初只訂 Pro 500 要付 NT$16,250，起始錢包 NT$8,000 付不起、開始第 1 天停用');
  clickMo({act:'confirm'}); ok(S.wallet===8000&&S.st.subFee===0&&S.subs.openai==='none','agent-catalog：付不起時按確認不扣錢、OpenAI 仍不訂閱',[S.wallet,S.st.subFee,S.subs.openai].join());
  start();
  ok(['anthropic','openai','google','zhipu','moonshot'].every(v=>els.mo.innerHTML.includes(`data-pv="${v}" data-pp="none"`))&&!els.mo.innerHTML.includes('data-pv="deepseek"')&&!els.mo.innerHTML.includes('data-pv="local"'),'agent-catalog：開局只列五家訂閱，每家從不訂閱開始');
  /* 派工台選模型 */
  newRun('laravel'); S.hours=8; const tc=ticket('fe',2); S.issues=[tc]; sel.issue=tc.id; Object.assign(sel,{v:'openai',m:'std',b:'api'}); render();
  ok(/data-b="corp" disabled>公司 API<small>公司沒簽約/.test(els.app.innerHTML),'agent-catalog：OpenAI 不能走公司 API');
  {const h=els.app.innerHTML, at=s=>h.indexOf(s), gpt=['<b>Luna</b><span>能力 ●●●○○</span>','<b>Sol</b><span>能力 ●●●●○</span>','<b>Astra</b><span>能力 ●●●●●</span>'];
  ok(gpt.every(s=>at(s)>=0)&&at(gpt[0])<at(gpt[1])&&at(gpt[1])<at(gpt[2])&&!['<b>mini</b>','<b>標準</b>','<b>高推理</b>'].some(s=>h.includes(s)),'agent-catalog：Codex CLI 依序顯示 Luna、Sol、Astra（能力 3／4／5），沒有舊名稱');}
  {const tg=ticket('laravel',2,{client:CLIENTS[3]}); S.issues=[tg]; sel.issue=tg.id; render(); const h=els.app.innerHTML;
  ok(/data-v="openai" data-m="mini" ><b>Luna<\/b><span>能力 ●●●○○<\/span><span class="">\$0\.15\/k/.test(h)&&/data-v="deepseek" data-m="chat" disabled><b>Chat<\/b><span>能力 ●●●○○<\/span><span class="why">政府標案禁用/.test(h),'agent-catalog：政府標案可用 Luna（$0.15/k），DeepSeek Chat 停用');
  S.issues=[tc]; sel.issue=tc.id; render();}
  {const h=els.app.innerHTML, at=s=>h.indexOf(s), cl=[['Haiku','●●●○○','0.15'],['Sonnet','●●●●○','0.45'],['Opus','●●●●●','0.9'],['Fable','●●●●●●','1.8']].map(([n,d,p])=>`<b>${n}</b><span>能力 ${d}</span><span class="">$${p}/k`);
  ok(cl.every(s=>at(s)>=0)&&cl.every((s,i)=>!i||at(cl[i-1])<at(s)),'agent-catalog：Claude Code 依序顯示 Haiku、Sonnet、Opus、Fable（能力 3／4／5／6，$0.15／0.45／0.9／1.8）');}
  ok(els.app.innerHTML.includes('價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。'),'agent-catalog：頁尾保留虛構數字聲明');
  ok(els.app.innerHTML.includes('<b>Gemma 4 26B A4B</b><span>能力 ●●●○○</span><span class="">免費</span>')&&els.app.innerHTML.includes('免費・中國權重'),'agent-catalog：本地模型顯示免費、Qwen 標中國權重');
  ok(!['Qwen Coder 32B','Gemma 27B','gpt-oss'].some(n=>els.app.innerHTML.includes(n)),'agent-catalog：派工台沒有舊的本地模型名稱');
  ok(els.app.innerHTML.includes('派給 Codex CLI'),'agent-catalog：單線模式按鈕寫派給');
  sel.b='api'; clickApp({v:'local',m:'gemma'}); ok(sel.b==='local','agent-catalog：選本地模型切到本地 GPU');
  clickApp({v:'anthropic',m:'sonnet'}); ok(sel.b==='api','agent-catalog：離開本地切回個人 API');
  S.outage='anthropic'; render();
  ok(sel.v==='openai'&&sel.m==='mini','agent-catalog：當機的選擇改到下一家第一個可用模型',sel.v+sel.m);
  ok(['haiku','sonnet','opus','fable'].every(m=>new RegExp(`data-v="anthropic" data-m="${m}" disabled`).test(els.app.innerHTML))&&els.app.innerHTML.includes('<span>今日當機</span>'),'agent-catalog：當機廠商的模型都停用');
  S.outage=null; S.mode='parallel'; render(); ok(els.app.innerHTML.includes('派到背景 Codex CLI'),'agent-catalog：平行模式按鈕寫派到背景');
  S.hours=.1; render(); ok(/data-act="go" disabled/.test(els.app.innerHTML),'agent-catalog：剩不到 0.2h 時派工按鈕停用');

  /* billing-methods：付費選項 */
  {
  newRun('laravel'); const tb=ticket('fe',2), note=(v,id)=>C.bills(v,tb).find(b=>b.id===id);
  ok(C.bills('local',tb).map(b=>b.id).join()==='local'&&C.bills('local',tb)[0].note==='不花 token 錢，但很慢','billing-methods：本地模型只有本地 GPU');
  ok(C.bills('google',tb).map(b=>b.id).join()==='sub,api,corp','billing-methods：沒席位時依序是個人訂閱、個人 API、公司 API');
  ok(!note('google','sub').ok&&note('google','sub').note==='沒有訂閱'&&note('google','api').ok&&note('google','api').note==='自己的信用卡'&&note('google','corp').ok&&note('google','corp').note==='走部門預算','billing-methods：沒訂閱 Google 時的選項與註記');
  S.subs.anthropic='pro'; ok(note('anthropic','sub').ok&&note('anthropic','sub').note==='Pro・剩 450k','billing-methods：有訂閱時顯示剩餘額度');
  ok(!note('openai','corp').ok&&note('openai','corp').note==='公司沒簽約','billing-methods：沒簽約的廠商不能走公司 API');
  S.corp=0; ok(!note('anthropic','corp').ok&&note('anthropic','corp').note==='預算用完','billing-methods：公司預算用完');
  /* 扣款 */
  newRun('laravel');
  charge('api','anthropic',model('anthropic','sonnet'),200); ok(near(S.wallet,8000-90)&&near(S.st.api,90),'billing-methods：200k Sonnet 個人 API 扣 NT$90');
  S.subs.anthropic='max5'; charge('sub','anthropic',model('anthropic','opus'),200); ok(near(S.used.sub.anthropic.d,400)&&near(S.used.sub.anthropic.w,400),'billing-methods：200k Opus（w 2）吃訂閱 400k');
  charge('corp','anthropic',model('anthropic','sonnet'),200); ok(near(S.corp,12000-90)&&near(S.corpDay,90)&&near(S.st.corp,90),'billing-methods：公司 API 扣預算、計入當日與月底帳單');
  ok(charge('local','local',model('local','gemma'),200).spend==='電費','billing-methods：本地 GPU 記為電費');
  S.wallet=10; let cw=charge('api','anthropic',model('anthropic','sonnet'),200); ok(S.wallet===0&&cw.short&&near(cw.frac,10/90),'billing-methods：個人 API 不會把錢包扣成負數，只付剩下的',S.wallet);
  /* 錢包見底（gh-26-01-money-off-score） */
  newRun('laravel'); S.wallet=200; const tb0=ticket('fe',2); S.issues=[tb0]; const api0=S.st.api;
  const rb=settle(job(tb0,'anthropic','sonnet','api',{tk:400/.45,hrs:2}));
  ok(!rb.ok&&S.wallet===0&&near(S.st.api-api0,200)&&near(S.st.tk.anthropic,200/.45)&&near(rb.hrs,1)&&S.issues.includes(tb0)&&tb0.tries===1&&S.log[0].msg.includes('錢包見底，agent 停在一半'),'billing-methods：花費 NT$400、錢包 NT$200 → 付完 200 停在一半、失敗留在佇列',[S.wallet,S.st.api,rb.hrs].join());
  /* 錢包見底：GA 照額度不夠送 quota；自我審核抓到錯誤也救不回來 */
  {const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
  newRun('laravel'); S.wallet=200; const tq0=ticket('fe',2); S.issues=[tq0];
  const rc0=settle(job(tq0,'anthropic','sonnet','api',{tk:400/.45,hrs:2,ok:false,caught:true,rv:1}));
  ok(!rc0.ok&&S.wallet===0&&S.st.caught===0&&S.issues.includes(tq0),'billing-methods：錢包見底時自我審核抓到錯誤也救不回來');
  const jr=ge.find(e=>e.n==='job_result'); ok(jr&&jr.p.outcome==='quota'&&jr.p.bill==='api'&&jr.p.cost===200,'billing-methods：錢包見底 GA job_result 送 outcome quota、cost 200',JSON.stringify(jr?.p));
  delete globalThis.gtag;}
  newRun('laravel'); S.hours=8; S.wallet=5; const te0=ticket('laravel',2); S.issues=[te0]; Object.assign(sel,{issue:te0.id,v:'anthropic',m:'sonnet',b:'api',rv:0}); evaluate();
  ok(S.wallet===0&&!te0.evaluated&&S.log[0].msg.includes('錢包見底，評估沒做完'),'billing-methods：個人 API 評估錢不夠 → 錢包歸零、不算已評估',S.log[0]?.msg);
  /* 錢包不夠只警告、不擋派工 */
  newRun('laravel'); S.hours=8; S.wallet=10; const tw=ticket('fe',1); S.issues=[tw]; sel.issue=tw.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0}); render();
  ok(els.app.innerHTML.includes('錢包可能不夠，跑到一半會停下來。')&&!/data-act="go" disabled/.test(els.app.innerHTML),'billing-methods：錢包不夠只警告、派工按鈕可按');
  for(const w of [0,-350]){S.wallet=w; const nb=C.bills('anthropic',tw).find(b=>b.id==='api'); ok(!nb.ok&&nb.note==='錢包見底','billing-methods：錢包 NT$'+w+' 時個人 API 停用、註記錢包見底'); render(); ok(sel.b!=='api'&&/data-b="api" disabled/.test(els.app.innerHTML),'billing-methods：錢包見底時派工台的個人 API 按鈕停用、自動換掉');}
  S.wallet=1; ok(C.bills('anthropic',tw).find(b=>b.id==='api').ok,'billing-methods：錢包 NT$1 時個人 API 還能用');
  /* 繞過畫面直接呼叫也擋得住（review：模擬器曾在錢包見底時照派個人 API） */
  newRun('laravel','parallel'); S.hours=8; S.wallet=0; const tg0=ticket('fe',2); S.issues=[tg0]; Object.assign(sel,{issue:tg0.id,v:'anthropic',m:'sonnet',b:'api',rv:0});
  A.dispatch(); ok(S.jobs.length===0&&S.hours===8&&S.issues.includes(tg0)&&!tg0.running,'billing-methods：錢包見底時直接呼叫 dispatch() 也不派工');
  A.evaluate(); ok(S.hours===8&&!tg0.evaluated,'billing-methods：錢包見底時直接呼叫 evaluate() 也不評估');
  /* 額度用完 */
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic={d:250,w:250}; const tq=ticket('fe',2); S.issues=[tq];
  const rq=settle(job(tq,'anthropic','sonnet','sub',{tk:400,hrs:2}));
  ok(!rq.ok&&near(S.used.sub.anthropic.d,450)&&near(S.st.tk.anthropic,200)&&near(rq.hrs,1)&&S.issues.includes(tq)&&tq.tries===1&&S.log[0].msg.includes('撞到用量上限，agent 停在一半'),'billing-methods：額度只剩一半時用光剩下的、失敗留在佇列');
  S.used.sub.anthropic={d:440,w:440}; S.hours=8; sel.issue=tq.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'sub',rv:0}); render();
  ok(els.app.innerHTML.includes('剩餘額度可能不夠，跑到一半會被限流。'),'billing-methods：額度可能不夠時警告');
  /* 公司花費上限 */
  newRun('laravel'); S.corp=100; const to=ticket('fe',1); S.issues=[to];
  settle(job(to,'anthropic','opus','corp',{tk:200})); ok(S.corp===0&&S.trust===62&&S.log.some(l=>l.msg.includes('! 公司 API 預算透支，財務來信關切')),'billing-methods：透支時預算歸零、信任 -8');
  newRun('laravel'); S.corpDay=1600; withRand(.99,endDay);
  ok(S.trust===64&&els.mo.innerHTML.includes('今天公司 API 刷了 NT$1,600，主管在 Slack 問你在幹嘛（信任 -6）。'),'billing-methods：單日公司花費超過 NT$1,500 信任 -6');
  newRun('laravel'); S.corpDay=1500; withRand(.99,endDay); ok(S.trust===70,'billing-methods：剛好 NT$1,500 不扣信任');
  /* 資安稽核 */
  ok(auditOdds('anthropic')===.35&&auditOdds('deepseek')===.6,'billing-methods：稽核機率 35%／中國 60%');
  const auditWith=(b,v,m,okFlag=true)=>{newRun('laravel'); const ts=ticket('fe',1,{sens:true}); S.issues=[ts]; withRand(0,()=>settle(job(ts,v,m,b,{ok:okFlag}))); return [S.st.audits,S.trust];};
  ok(auditWith('api','anthropic','sonnet').join()==='1,58','billing-methods：機敏單走個人 API 被稽核、信任 -12');
  ok(auditWith('api','anthropic','sonnet',false).join()==='1,58','billing-methods：失敗的嘗試一樣擲稽核');
  ok(auditWith('corp','anthropic','sonnet').join()==='0,70'&&auditWith('local','local','gemma').join()==='0,70','billing-methods：公司 API 與本地 GPU 不會被稽核');
  S.subs.anthropic='pro'; const tsub=ticket('fe',1,{sens:true}); S.issues=[tsub]; withRand(0,()=>settle(job(tsub,'anthropic','sonnet','sub'))); ok(S.st.audits===1,'billing-methods：個人訂閱也會被稽核');
  const warnFor=(v,m,b)=>{newRun('laravel'); S.hours=8; const ts=ticket('fe',1,{sens:true}); S.issues=[ts]; sel.issue=ts.id; Object.assign(sel,{v,m,b,rv:0}); render(); return els.app.innerHTML;};
  ok(warnFor('anthropic','sonnet','api').includes('機敏工單用個人帳號：有 35% 機率被資安稽核抓到。'),'billing-methods：個人帳號稽核警告');
  ok(warnFor('deepseek','chat','api').includes('機敏工單送到中國雲端：有 60% 機率被資安稽核抓到。'),'billing-methods：中國雲端稽核警告');
  ok(warnFor('anthropic','sonnet','corp').includes('<div class="warnline"></div>'),'billing-methods：公司 API 沒有稽核警告');
  }

  /* client-restrictions：案主分布 */
  {
  newRun('laravel'); const N=10000, cc={};
  for(let i=0;i<N;i++){const n=makeIssue(false).client.name; cc[n]=(cc[n]||0)+1;}
  ok([['內部專案',.42],['新創客戶',.18],['金融客戶',.18],['政府標案',.22]].every(([n,w])=>Math.abs((cc[n]||0)/N-w)<=.02),'client-restrictions：案主比例在 ±0.02 內',JSON.stringify(cc));
  ok([...Array(300)].map(()=>makeIssue(true)).every(i=>i.client.name==='內部專案'),'client-restrictions：事故單都是內部專案');
  /* 禁用規則 */
  const cl=n=>CLIENTS.find(c=>c.name===n), tk=n=>ticket('fe',2,{client:cl(n)}), blk=(is,v,m)=>cnBlock(is,v,model(v,m));
  const fin=tk('金融客戶'), gov=tk('政府標案'), su=tk('新創客戶');
  ok(['deepseek/chat','zhipu/air','moonshot/k2'].every(x=>blk(fin,...x.split('/'))==='金融客戶禁用')&&blk(fin,'local','qwen')==='','client-restrictions：金融客戶禁中國雲端、Qwen 可用');
  ok(['deepseek/reasoner','zhipu/glm','moonshot/k2'].every(x=>blk(gov,...x.split('/'))==='政府標案禁用')&&blk(gov,'local','qwen')==='中國權重禁用'&&blk(gov,'local','gemma')==='','client-restrictions：政府標案連 Qwen 都禁、Gemma 可用');
  ok(blk(su,'deepseek','chat')===''&&blk(su,'local','qwen')==='','client-restrictions：沒有禁令時都能用');
  S.cnBan=true;
  ok(blk(su,'deepseek','chat')==='公司政策禁用'&&blk(su,'local','qwen')==='','client-restrictions：全公司禁令下中國雲端顯示公司政策禁用、Qwen 可用');
  ok(blk(gov,'local','oss')===''&&blk(gov,'local','gemma')==='','client-restrictions：Gemma 4 26B A4B 與 Gemma 4 E4B 永遠不會被禁');
  S.hw.spark=S.hw.mac=true; ok(blk(gov,'local','gemma4')===''&&blk(gov,'local','qcnext')==='中國權重禁用'&&blk(gov,'local','glm53')==='中國權重禁用','client-restrictions：政府標案下 Gemma 4 31B 可用，Qwen3-Coder-Next、GLM-5.3 中國權重禁用'); S.hw.spark=S.hw.mac=false;
  /* 卡片標籤 */
  const card=id=>{const h=els.app.innerHTML; const st=h.indexOf(`data-iss="${id}"`); return h.slice(st,h.indexOf('</button>',st));};
  const inn=tk('內部專案'); S.issues=[inn,gov,fin,su]; render();
  ok(card(inn.id).includes('chip ban">禁中國雲端')&&card(gov.id).includes('chip ban">政府標案・禁中國模型')&&card(fin.id).includes('chip ban">金融客戶・禁中國雲端'),'client-restrictions：全公司禁令下的卡片標籤');
  S.cnBan=false; render();
  ok(card(su.id).includes('<span class="chip">新創客戶</span>')&&card(inn.id).includes('<span class="chip">內部專案</span>'),'client-restrictions：沒有禁令時顯示案主名稱');
  }

  /* ticket-lifecycle：工單產生 */
  {
  newRun('laravel');
  for(const [day,r,cx] of [[1,.25,1],[1,.5,2],[10,.5,3],[20,0,2],[20,.99,5]]){S.day=day; const is=withRand([r,.5],()=>makeIssue(false)); ok(is.cx===cx,`ticket-lifecycle：第 ${day} 天 random ${r} → 複雜度 ${cx}`,is.cx);}
  S.day=5; S.inv.monitor=false; const inc=makeIssue(true);
  ok(inc.cx===4&&inc.kpi===26&&inc.due===5&&inc.inc,'ticket-lifecycle：Laravel 事故單複雜度 4、KPI 26、今天到期');
  S.day=3; const gen=[...Array(6000)].map(()=>makeIssue(false));
  ok(gen.every(i=>i.base>=BASE[i.cx]*.85-1e-9&&i.base<=BASE[i.cx]*1.15+1e-9),'ticket-lifecycle：基準 token 在 BASE ×0.85–1.15');
  const easy=gen.filter(i=>!hardStack(i.stack));
  ok(easy.every(i=>i.kpi===KPI[i.cx]),'ticket-lifecycle：一般工單 KPI 照 KPI 表');
  ok(easy.filter(i=>i.cx<=2).every(i=>i.due>=4&&i.due<=6)&&easy.filter(i=>i.cx>=3).every(i=>i.due>=5&&i.due<=8),'ticket-lifecycle：期限 1–3 天（複雜度 ≤2）或 2–5 天');
  S.day=19; ok([...Array(500)].map(()=>makeIssue(false)).every(i=>i.due<=20),'ticket-lifecycle：期限不超過第 20 天');
  const rate=(a,f)=>a.filter(f).length/a.length;
  ok(Math.abs(rate(gen,i=>i.sens)-.25)<=.03,'ticket-lifecycle：一般工單 25% 機敏',rate(gen,i=>i.sens));
  S.day=3; const incs=[...Array(5000)].map(()=>makeIssue(true));
  ok(Math.abs(rate(incs,i=>i.sens)-.55)<=.03,'ticket-lifecycle：事故單 55% 機敏',rate(incs,i=>i.sens));
  ok(Math.abs(rate(gen.filter(i=>i.cx>=3),i=>i.big)-.45)<=.03&&gen.filter(i=>i.cx<3).every(i=>!i.big),'ticket-lifecycle：複雜度 ≥3 有 45% 是大型 codebase');
  /* 每日進件 */
  start(); ok(S.issues.length===4&&S.issues.every(i=>!i.inc),'ticket-lifecycle：第 1 天 4 張、沒有事故單');
  const intake=mode=>{const ns=[]; let tot=0, incN=0; newRun('laravel',mode);
    for(let i=0;i<600;i++){S.day=4; S.issues=[]; S.jobs=[]; S.cnBan=false; endDay(); const n=+S.log[0].msg.match(/新進 (\d+) 張工單/)[1]; ns.push(n);
      if(!els.mo.innerHTML.includes('class="evt"')){tot+=S.issues.length; incN+=S.issues.filter(x=>x.inc).length;}}
    return {min:Math.min(...ns),max:Math.max(...ns),inc:incN/tot};};
  const ip=intake('parallel'), is_=intake('serial');
  ok(ip.min===3&&ip.max===6&&is_.min===2&&is_.max===4,'ticket-lifecycle：平行每天 3–6 張、單線 2–4 張',JSON.stringify([ip,is_]));
  ok(Math.abs(ip.inc-.12)<=.03&&Math.abs(is_.inc-.12)<=.03,'ticket-lifecycle：新進工單 12% 是事故',[ip.inc,is_.inc].join());
  ok(/— 第 5 天開工，新進 \d+ 張工單 —/.test(S.log[0].msg),'ticket-lifecycle：開工紀錄');
  /* 第一週事故單逐日遞增 */
  for(const [day,r] of [[2,.03],[3,.06],[4,.09],[5,.12],[12,.12],[20,.12]]) ok(near(A.incRate(day),r),`ticket-lifecycle：第 ${day} 天事故機率 ${r}`,A.incRate(day));
  {let tot=0, incN=0; newRun('laravel','parallel');
    while(tot<10000){S.day=1; S.issues=[]; S.jobs=[]; S.cnBan=false; endDay();
      if(!els.mo.innerHTML.includes('class="evt"')){tot+=S.issues.length; incN+=S.issues.filter(x=>x.inc).length;}}
    ok(Math.abs(incN/tot-.03)<=.01,'ticket-lifecycle：第 2 天進件 3% 是事故',incN/tot);}
  /* 佇列排序 */
  newRun('laravel'); const qa=ticket('fe',1,{due:3,kpi:6}), qb=ticket('fe',1,{due:2,kpi:3}), qc=ticket('fe',1,{due:3,kpi:10});
  ok([qa,qb,qc].sort(A.queueOrder).map(i=>i.kpi).join()==='3,10,6','ticket-lifecycle：佇列依期限再依 KPI 排序');
  S.issues=[qa,qb,qc]; render(); ok(els.app.innerHTML.includes('3 張・依到期排序'),'ticket-lifecycle：佇列標題');
  S.issues=[]; render(); ok(els.app.innerHTML.includes('工單清空了。可以提早下班，把工時留給明天。'),'ticket-lifecycle：空佇列文字');
  /* 完成 */
  newRun('laravel'); S.kpi=40; const ti=ticket('laravel',4,{inc:true,kpi:26}); S.issues=[ti];
  settle(job(ti,'anthropic','opus','corp'));
  ok(S.kpi===66&&S.trust===72&&!S.issues.includes(ti)&&S.st.done===1,'ticket-lifecycle：完成事故單 KPI +26、信任 +2');
  S.trust=99; const ti2=ticket('laravel',4,{inc:true,kpi:26}); S.issues=[ti2]; settle(job(ti2,'anthropic','opus','corp')); ok(S.trust===100,'ticket-lifecycle：信任上限 100');
  /* 失敗 */
  newRun('laravel'); const tf=ticket('fe',3); S.issues=[tf]; const hrs0=est(tf,'anthropic','sonnet',0).hrs, mh0=manualHrs(tf);
  settle(job(tf,'anthropic','sonnet','corp',{ok:false}));
  ok(near(tf.base,245)&&tf.tries===1&&S.issues.includes(tf),'ticket-lifecycle：失敗後基準 ×0.7、留在佇列');
  ok(near(est(tf,'anthropic','sonnet',0).hrs,hrs0*.8)&&near(manualHrs(tf),mh0*.8),'ticket-lifecycle：失敗過的工單 agent 與手寫時數 ×0.8');
  render(); ok(els.app.innerHTML.includes('已失敗 1 次'),'ticket-lifecycle：卡片顯示已失敗 1 次');
  /* 自己手寫 */
  newRun('laravel'); S.hours=8; const tm=ticket('laravel',2); S.issues=[tm]; sel.issue=tm.id; manual();
  ok(near(S.hours,8-4.4)&&!S.issues.includes(tm)&&S.st.manual===1&&Object.values(S.st.tk).every(x=>x===0)&&S.kpi===KPI[2],'ticket-lifecycle：手寫複雜度 2 花 4.4h、0 token、完成');
  const hand4=r=>{newRun('laravel'); S.hours=9; const t4=ticket('laravel',4); S.issues=[t4]; sel.issue=t4.id; withRand(r,manual); return t4;};
  const h1t=hand4(.69); ok(!S.issues.includes(h1t),'ticket-lifecycle：手寫複雜度 4 在 70% 內成功');
  const h2t=hand4(.71); ok(S.issues.includes(h2t)&&h2t.tries===1&&near(h2t.base,BASE[4]*.7)&&S.log[0].msg.includes('自己手寫卡關')&&S.st.manual===1,'ticket-lifecycle：手寫複雜度 4 卡關算一次失敗');
  newRun('laravel'); S.hours=4; const tm3=ticket('laravel',2); S.issues=[tm3]; sel.issue=tm3.id; render();
  ok(/data-act="manual" disabled/.test(els.app.innerHTML),'ticket-lifecycle：工時不夠時手寫按鈕停用');
  newRun('laravel','parallel'); S.hours=8; const tp1=ticket('laravel',2), tp2=ticket('fe',5,{due:20}); S.issues=[tp1,tp2];
  S.jobs=[job(tp2,'anthropic','opus','corp',{hrs:10,left:10})]; tp2.running=true; sel.issue=tp1.id; manual();
  ok(near(S.hours,8-4.4)&&near(S.jobs[0].left,10-4.4)&&!S.issues.includes(tp1),'ticket-lifecycle：平行模式手寫推進時鐘、背景 agent 照跑');
  /* 逾期 */
  newRun('laravel'); S.day=5; S.kpi=50; const tl=ticket('laravel',4,{inc:true,kpi:26,due:5}), tn=ticket('fe',2,{kpi:6,due:5}); S.issues=[tl];
  withRand(.99,endDay); ok(S.kpi===37&&S.trust===62&&S.st.late===1&&S.st.kpiLost===13&&els.mo.innerHTML.includes('1 張工單逾期，主管信任 -8。')&&S.log.some(l=>l.msg.includes('⌛ 逾期：')&&l.msg.endsWith('KPI -13｜信任 -8')),'ticket-lifecycle：事故單逾期 KPI -13、信任 -8');
  newRun('laravel'); S.day=5; S.issues=[tn]; withRand(.99,endDay); ok(S.kpi===-3&&S.trust===66&&!S.issues.includes(tn),'ticket-lifecycle：一般工單逾期 KPI 扣一半（無條件進位）、信任 -4');
  newRun('laravel'); S.day=5; const d0=ticket('fe',1,{due:5}), d2=ticket('fe',1,{due:7}); S.issues=[d0,d2]; render();
  ok(els.app.innerHTML.includes('chip due">今天到期')&&els.app.innerHTML.includes('剩 2 天'),'ticket-lifecycle：卡片顯示今天到期與剩 N 天');
  }

  /* dispatch-outcome：成功率表 */
  {
  newRun('laravel');
  for(const [v,m,cx,big,p] of [['anthropic','sonnet',2,false,.95],['anthropic','sonnet',4,false,.8],['google','flash',3,false,.5],['google','flash',4,false,.25],['google','flash',5,false,.1],['google','pro',4,true,.88],['deepseek','chat',3,true,.72],['anthropic','opus',3,true,.95],['anthropic','opus',5,false,.8],['anthropic','fable',5,false,.95]])
    ok(near(est(ticket('fe',cx,{big}),v,m,0).p,p),`dispatch-outcome：${m} × 複雜度 ${cx}${big?'・大型':''} → ${p*100}%`,est(ticket('fe',cx,{big}),v,m,0).p);
  ok(near(est(ticket('fe',5),'local','oss',0).p,.1)&&near(est(ticket('fe',5,{big:true}),'google','flash',0).p,.18)&&near(est(ticket('fe',5,{big:true}),'local','oss',0).p,.05),'dispatch-outcome：成功率下限 5%');
  S.inv.md.fe=true; S.inv.sdd=true; ok(near(est(ticket('fe',2),'anthropic','sonnet',0).p,.97),'dispatch-outcome：成功率上限 97%'); S.inv.md={}; S.inv.sdd=false;
  /* token 預估 */
  newRun('laravel'); S.hours=8; const t2=ticket('fe',2); S.issues=[t2]; sel.issue=t2.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0});
  ok(near(est(t2,'anthropic','sonnet',0).tk,153),'dispatch-outcome：Sonnet 估複雜度 2 為 153k');
  render(); ok(els.app.innerHTML.includes('<b>107k–199k</b>'),'dispatch-outcome：派工台顯示 107k–199k');
  ok(near(est(ticket('fe',4),'anthropic','haiku',0).tk,495),'dispatch-outcome：Haiku 估複雜度 4 為 495k（沒有折扣）');
  ok(near(est(ticket('fe',4,{big:true}),'google','pro',0).tk,550*.7),'dispatch-outcome：大型 codebase 對 ctx 模型 token ×0.7');
  ok(['laravel','rails','rust','app','fe'].every(st=>near(est(ticket(st,3),'anthropic','sonnet',0).tk,est(ticket('fe',3),'anthropic','sonnet',0).tk)),'dispatch-outcome：技術線不影響 token');
  ok(near(est(t2,'anthropic','sonnet',0).hrs,1.6),'dispatch-outcome：Sonnet 複雜度 2 要 1.6h');
  const jobs=[...Array(500)].map(()=>makeJob(t2)), e2=est(t2,'anthropic','sonnet',0);
  ok(jobs.every(j=>j.tk>=e2.tk*.7-1e-9&&j.tk<=e2.tk*1.3+1e-9&&j.hrs>=e2.hrs*.8-1e-9&&j.hrs<=e2.hrs*1.2+1e-9),'dispatch-outcome：實際 token 在 0.7–1.3 倍、時數在 0.8–1.2 倍');
  /* 費用列 */
  const cl=(b,v,m)=>costLine(b,model(v,m),v,est(t2,v,m,0));
  ok(near(cl('api','anthropic','sonnet').hi,e2.hi*.45)&&cl('api','anthropic','sonnet').t==='自付'&&cl('corp','anthropic','sonnet').t==='公司付'&&cl('local','local','gemma').hi===0,'dispatch-outcome：費用列依付費方式');
  ok(near(cl('sub','anthropic','opus').hi,est(t2,'anthropic','opus',0).hi*2)&&cl('sub','anthropic','opus').t==='額度','dispatch-outcome：訂閱的費用列是額度 × w');
  /* 單線跑到下班 */
  newRun('laravel'); S.hours=2; const t5=ticket('fe',5); S.issues=[t5]; sel.issue=t5.id; Object.assign(sel,{v:'anthropic',m:'opus',b:'corp',rv:0}); render();
  ok(els.app.innerHTML.includes('今天剩的工時可能不夠跑完。'),'dispatch-outcome：單線工時可能不夠的警告');
  withRand(.5,dispatch);
  ok(S.hours===0&&near(S.st.tk.anthropic,722.5*.4)&&near(S.st.corp,722.5*.4*.9)&&t5.tries===1&&S.log[0].msg.includes('跑到下班還沒結束'),'dispatch-outcome：單線跑到下班扣掉同比例 token、失敗',[S.hours,S.st.tk.anthropic].join());
  /* 一般失敗 */
  newRun('laravel'); const tfl=ticket('fe',2); S.issues=[tfl]; settle(job(tfl,'anthropic','sonnet','corp',{ok:false,tk:80}));
  ok(S.log[0].msg.includes('測試沒過，改壞了')&&near(S.st.tk.anthropic,80)&&near(S.st.byBill.corp,80),'dispatch-outcome：失敗紀錄與 token 照算');
  /* 顯示 */
  const panel=(st,cx,v,m,b,rv=0,extra={},mode='serial')=>{newRun('laravel',mode); S.hours=8; const t=ticket(st,cx,extra); S.issues=[t]; sel.issue=t.id; Object.assign(sel,{v,m,b,rv}); render(); return els.app.innerHTML;};
  ok(panel('fe',3,'deepseek','chat','api',0,{big:true}).includes('class="meh">72%'),'dispatch-outcome：72% 是黃色');
  ok(panel('fe',2,'anthropic','sonnet','corp').includes('class="good">95%'),'dispatch-outcome：95% 是綠色');
  ok(panel('fe',4,'google','flash','corp').includes('class="bad">25%'),'dispatch-outcome：25% 是紅色');
  ok(!panel('fe',2,'anthropic','sonnet','corp').includes('（原')&&panel('fe',2,'anthropic','sonnet','corp',1).includes('成功率（原 95%）'),'dispatch-outcome：有審核才顯示原始成功率');
  ok(panel('fe',2,'anthropic','sonnet','corp').includes('<label>工時</label>')&&panel('fe',2,'anthropic','sonnet','corp',0,{},'parallel').includes('<label>執行時間</label>'),'dispatch-outcome：單線寫工時、平行寫執行時間');
  /* 警告優先順序 */
  const warn=h=>h.match(/<div class="warnline">([^<]*)<\/div>/)[1];
  const wq=(sens,hours)=>{newRun('laravel'); S.hours=hours; S.subs.anthropic='pro'; S.used.sub.anthropic={d:445,w:445}; const t=ticket('fe',3,{sens}); S.issues=[t]; sel.issue=t.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'sub',rv:0}); render(); return warn(els.app.innerHTML);};
  ok(wq(true,8).startsWith('機敏工單用個人帳號')&&wq(false,1).startsWith('剩餘額度可能不夠'),'dispatch-outcome：機敏先於額度、額度先於工時');
  newRun('laravel','parallel'); S.slots=2; S.hours=1; const tz=ticket('fe',5,{due:S.day}); S.issues=[tz]; sel.issue=tz.id; Object.assign(sel,{v:'anthropic',m:'opus',b:'corp',rv:0}); render();
  ok(warn(els.app.innerHTML)==='這張今天到期，但下班前跑不完，會逾期。','dispatch-outcome：今天到期跑不完先於跑過夜');
  S.jobs=[job(ticket('fe',1),'anthropic','haiku','corp',{left:5,hrs:5}),job(ticket('fe',1),'anthropic','haiku','corp',{left:5,hrs:5})]; render();
  ok(warn(els.app.innerHTML)==='工作槽都滿了，先等一個 agent 跑完。','dispatch-outcome：工作槽滿先於到期');
  tz.due=S.day+2; S.jobs=[]; render(); ok(warn(els.app.innerHTML)==='今天跑不完，agent 會跑過夜，明早才有結果。','dispatch-outcome：跑過夜警告');
  }

  /* self-review：審核等級與抓錯率 */
  {
  newRun('laravel');
  ok(JSON.stringify(C.REVIEW.map(r=>[r.name,r.tk,r.hrs]))===JSON.stringify([['不審核',1,1],['自審',1.3,1.2],['嚴格審核',1.6,1.35]]),'self-review：三種審核的 token 與時間倍率');
  for(const [v,m,c1,c2] of [['google','flash',.61,.81],['deepseek','chat',.69,.89],['anthropic','sonnet',.77,.95],['anthropic','opus',.85,.95],['anthropic','fable',.93,.95]])
    ok(near(catchRate(1,model(v,m)),c1)&&near(catchRate(2,model(v,m)),c2)&&catchRate(0,model(v,m))===0,`self-review：${m} 抓錯率 ${c1*100}%／${c2*100}%`);
  const tr=ticket('fe',4); S.hours=8; S.issues=[tr]; sel.issue=tr.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:1}); render();
  ok(els.app.innerHTML.includes('token ×1.3・抓錯 77%')&&els.app.innerHTML.includes('token ×1.6・抓錯 95%')&&els.app.innerHTML.includes('改壞就整單重做'),'self-review：審核按鈕顯示倍率與抓錯率');
  ok(els.app.innerHTML.includes('class="good">95%')&&els.app.innerHTML.includes('成功率（原 80%）'),'self-review：Sonnet 自審複雜度 4 顯示 95%（原 80%）');
  ok(near(est(tr,'anthropic','sonnet',1).pe,.8+.2*.77),'self-review：顯示的成功率 = p + (1 − p) × 抓錯率');
  pristine.fresh(); ok(pristine.sel.rv===1,'self-review：第一次開局預設自審');
  sel.rv=2; fresh(); ok(sel.rv===2,'self-review：審核等級跨局保留'); sel.rv=1;
  /* 抓到錯誤 */
  newRun('laravel'); const tc=ticket('fe',2); S.issues=[tc];
  settle(job(tc,'anthropic','sonnet','api',{ok:false,caught:true,rv:1,tk:200}));
  ok(!S.issues.includes(tc)&&near(S.st.api,250*.45)&&near(S.st.tk.anthropic,250)&&S.st.caught===1&&S.log.some(l=>l.msg.includes('自審抓到錯誤並當場修正，省掉整單重做')),'self-review：抓到錯誤時成功、token ×1.25');
  newRun('laravel'); const tn=ticket('fe',2); S.issues=[tn]; settle(job(tn,'anthropic','sonnet','corp',{ok:false,caught:false,rv:2}));
  ok(S.issues.includes(tn)&&S.log[0].msg.includes('審核沒抓到，上線後測試才爆'),'self-review：沒抓到的紀錄');
  /* 救不了的情況 */
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic={d:400,w:400}; const tq=ticket('fe',2); S.issues=[tq];
  settle(job(tq,'anthropic','sonnet','sub',{ok:false,caught:true,rv:2,tk:200}));
  ok(S.issues.includes(tq)&&S.log[0].msg.includes('撞到用量上限，agent 停在一半')&&S.st.caught===0,'self-review：嚴格審核救不了額度用完');
  const tt=ticket('fe',2); S.issues=[tt]; const rt=settle(job(tt,'anthropic','sonnet','corp',{ok:false,caught:true,rv:1}),{frac:.5,fail:true,note:'跑到下班還沒結束'});
  ok(!rt.ok&&S.issues.includes(tt)&&S.st.caught===0,'self-review：救不了跑到下班');
  const ts=ticket('app',2,{store:true}); S.issues=[ts]; const rs=withRand(0,()=>settle(job(ts,'anthropic','sonnet','corp',{ok:false,caught:true,rv:1})));
  ok(!rs.ok&&rs.rejected&&S.issues.includes(ts),'self-review：抓到錯誤後仍可能被 App Store 退件');
  }

  /* game-modes：模式選擇 */
  {
  S.slots=3; start(); S.mode='parallel'; showSetup(false);
  ok(/class="sb sel" data-mode="parallel"/.test(els.mo.innerHTML)&&els.mo.innerHTML.includes('data-mode="serial"'),'game-modes：開局可選平行或單線，選中平行');
  clickMo({act:'confirm'}); ok(S.log.some(l=>l.msg.includes('遊戲模式：平行（同時 3 個 agent）')),'game-modes：開局紀錄寫平行與工作槽數');
  pristine.fresh(); ok(pristine.S.mode==='parallel','game-modes：第一次開局預設平行模式');
  S.mode='serial'; fresh(); ok(S.mode==='serial','game-modes：模式跨局保留');
  start(); clickMo({act:'confirm'}); ok(S.log.some(l=>l.msg.endsWith('遊戲模式：單線')),'game-modes：開局紀錄寫單線');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-mode'),'game-modes：週一調整不能換模式');
  /* 單線 */
  newRun('laravel'); S.hours=8; const ts=ticket('fe',2); S.issues=[ts]; sel.issue=ts.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0});
  withRand(.5,dispatch); ok(near(S.hours,6.4)&&!S.issues.includes(ts)&&S.log[0].msg.startsWith('D01 ✓'),'game-modes：單線派工當場結算、扣 1.6h');
  render(); ok(els.app.innerHTML.includes('今日剩餘工時')&&els.app.innerHTML.includes('6.4<small style="font-size:13px"> / 8h')&&!els.app.innerHTML.includes('data-act="wait1"')&&!els.app.innerHTML.includes('背景 agent'),'game-modes：單線顯示剩餘工時、沒有等待按鈕與背景 agent');
  /* 平行時鐘 */
  newRun('laravel','parallel'); S.slots=3; S.hours=8; const tp=ticket('fe',2), tq=ticket('fe',3); S.issues=[tp,tq]; sel.issue=tp.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0});
  withRand(.5,dispatch); ok(near(S.hours,7.8)&&A.clock(8-S.hours)==='9:12'&&S.jobs.length===1&&tp.running,'game-modes：派到背景花 0.2h、時鐘 9:12');
  render(); ok(els.app.innerHTML.includes('9:12')&&els.app.innerHTML.includes('背景 agent 1 / 3')&&!els.app.innerHTML.includes(`data-iss="${tp.id}"`),'game-modes：平行顯示時鐘、背景 agent 數，跑的工單不在佇列');
  A.wait(false); ok(near(S.hours,6.8),'game-modes：等 1 小時');
  A.wait(true); ok(!S.jobs.length&&!S.issues.includes(tp),'game-modes：等到下一個 agent 完成');
  render(); ok(/data-act="waitn" disabled/.test(els.app.innerHTML),'game-modes：沒有 agent 時不能等下一個');
  /* 平行加成 */
  S.jobs=[job(tq,'anthropic','haiku','corp',{left:5,hrs:5}),job(tq,'anthropic','haiku','corp',{left:5,hrs:5})];
  ok(near(est(tq,'anthropic','sonnet',0).tk,BASE[3]*.85),'dispatch-outcome：兩個在跑時 token 不變');
  { const t180=ticket('fe',2); t180.base=180; const two=est(t180,'anthropic','sonnet',0).tk; const jb=S.jobs; S.jobs=[]; const zero=est(t180,'anthropic','sonnet',0).tk; S.jobs=jb; ok(near(two,153)&&near(zero,153),'dispatch-outcome：Sonnet 複雜度 2 base 180k，0 個或 2 個在跑都是 153k',[zero,two]); }
  sel.issue=tq.id; render(); ok(els.app.innerHTML.includes('<label>預估 tokens</label>')&&els.app.innerHTML.includes('平行切換成本：已有 2 個 agent 在跑')&&els.app.innerHTML.includes('×1.50'),'game-modes：派工台標籤沒有倍率，提示審 PR ×1.50');
  /* 審 PR */
  newRun('laravel','parallel'); S.hours=8; const tr=ticket('fe',4); S.issues=[tr]; S.jobs=[job(tr,'anthropic','opus','corp',{rv:1,left:.1,hrs:.1})];
  advance(.1); ok(near(S.hours,7.5)&&S.log.some(l=>l.msg.includes('審 PR 花了 0.4h')),'game-modes：自審複雜度 4 成功後審 PR 0.4h');
  const tr2=ticket('fe',4); S.issues=[tr2]; S.jobs=[job(tr2,'anthropic','opus','corp',{rv:0,left:.1,hrs:.1})]; advance(.1); ok(near(S.hours,7.5-.1-.8),'game-modes：不審核時審 PR 0.8h');
  /* 審 PR 切換成本：其他還在跑的 agent 越多越久 */
  for(const [others,rv,hook,cx,exp] of [[0,0,false,3,.6],[1,0,false,3,.75],[2,0,false,2,.6],[5,0,false,4,1.8],[2,1,true,4,.3]]){
    newRun('laravel','parallel'); S.inv.hook=hook; S.jobs=Array(others).fill({left:9}); ok(near(prHrs(cx,rv),exp),`game-modes：其他 ${others} 個在跑、${rv?'自審':'不審核'}${hook?'＋hook':''}、複雜度 ${cx} → 審 PR ${exp}h`,prHrs(cx,rv));
  }
  { newRun('laravel','parallel'); S.hours=8; const a=ticket('fe',2), b=ticket('fe',2), c=ticket('fe',2); S.issues=[a,b,c];
    S.jobs=[job(a,'anthropic','opus','corp',{left:.1,hrs:.1}),job(b,'anthropic','opus','corp',{left:.1,hrs:.1}),job(c,'anthropic','opus','corp',{left:5,hrs:5})];
    /* 固定亂數：不讓合併衝突（每個還在跑的 agent 10%）把其中一張變成解決衝突工單 */
    {const rr=Math.random; Math.random=()=>.99; advance(.1); Math.random=rr;} const n=S.log.filter(l=>l.msg.includes('審 PR 花了 0.5h')).length; ok(n===2&&near(S.hours,8-.1-1),'game-modes：兩個同時做完、一個還在跑 → 各審 PR 0.5h（×1.25）',[n,S.hours]); }
  newRun('laravel','parallel'); S.hours=8;
  const tr3=ticket('fe',4); S.issues=[tr3]; const h3=S.hours; S.jobs=[job(tr3,'anthropic','opus','corp',{ok:false,left:.1,hrs:.1})]; advance(.1); ok(near(S.hours,h3-.1),'game-modes：失敗不用審 PR');
  /* 過夜與中止 */
  newRun('laravel','parallel'); S.day=3; S.hours=0; const to=ticket('fe',3,{due:6}); S.issues=[to]; S.jobs=[job(to,'anthropic','opus','corp',{left:3.5,hrs:5})]; to.running=true;
  withRand(.99,endDay); ok(S.jobs.length===1&&near(S.jobs[0].left,.5)&&els.mo.innerHTML.includes('1 個 agent 跑了一整晚，一早會陸續有結果。'),'game-modes：過夜扣 3h');
  newRun('laravel','parallel'); S.day=3; S.hours=0; const to2=ticket('fe',3,{due:6}); S.issues=[to2]; S.jobs=[job(to2,'anthropic','opus','corp',{left:2,hrs:5})]; withRand(.99,endDay); ok(near(S.jobs[0].left,.05),'game-modes：過夜後至少剩 0.05h');
  newRun('laravel','parallel'); S.day=3; S.hours=0; const tdue=ticket('fe',3,{due:3,kpi:10}); S.issues=[tdue]; S.jobs=[job(tdue,'anthropic','opus','corp',{left:4,hrs:4,tk:100})]; tdue.running=true;
  withRand(.99,endDay);
  ok(!S.jobs.length&&near(S.st.tk.anthropic,5)&&S.st.late===1&&S.log.some(l=>l.msg.includes('到期還沒跑完，只好中止'))&&els.mo.innerHTML.includes('1 個背景 agent 跑到截止還沒完成，被你中止了。'),'game-modes：到期的背景 agent 被中止、至少算 5% token、工單逾期');
  newRun('laravel','parallel'); S.hours=3; const t17=ticket('fe',3,{due:9}); S.issues=[t17]; S.jobs=[job(t17,'anthropic','opus','corp',{left:8,hrs:8})]; withRand(.99,endDay);
  ok(near(S.jobs[0].left,8-3-3),'game-modes：下班前先跑到 17:00 再過夜');
  /* 本地 GPU */
  newRun('laravel','parallel'); S.hours=8; const tl=ticket('fe',5,{due:9}), tg=ticket('fe',2); S.issues=[tl,tg]; S.jobs=[job(tl,'local','qwen','local',{left:5,hrs:5})]; tl.running=true;
  sel.issue=tg.id; Object.assign(sel,{v:'local',m:'gemma',b:'local',rv:0}); render();
  ok(/data-act="go" disabled/.test(els.app.innerHTML)&&els.app.innerHTML.includes('本地 GPU 已經有一個 agent 在跑，等它跑完才能再派。')&&els.app.innerHTML.includes('本地 GPU 跑 agent 中，電腦卡到沒辦法手寫'),'game-modes：本地 GPU 忙時不能派本地、不能手寫');
  const nJobs=S.jobs.length; dispatch(); manual(); ok(S.jobs.length===nJobs&&S.issues.includes(tg)&&S.st.manual===0,'game-modes：本地 GPU 忙時派工與手寫都不動作');
  Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp'}); render(); ok(!/data-act="go" disabled/.test(els.app.innerHTML),'game-modes：本地 GPU 忙時仍可派雲端 agent');
  }

  /* random-events：每天 55% 抽一個 */
  {
  newRun('laravel'); let evDays=0; const N=10000;
  for(let i=0;i<N;i++){S.day=2; S.issues=[]; S.cnBan=false; endDay(); if(els.mo.innerHTML.includes('class="evt"'))evDays++;}
  ok(Math.abs(evDays/N-.55)<=.02,'random-events：有事件的天數約 55%',evDays/N);
  ok(EVENTS.length===8,'random-events：共 8 種事件');
  /* 當機事件經過 endDay：中止該廠商的背景 agent */
  newRun('laravel','parallel'); S.day=3; S.hours=0; const ta=ticket('fe',3,{due:9}), tb=ticket('fe',3,{due:9}); S.issues=[ta,tb];
  S.jobs=[job(ta,'anthropic','opus','corp',{left:5,hrs:5}),job(tb,'anthropic','sonnet','corp',{left:5,hrs:5})];
  withRand([0,.13,0,.99],endDay);
  ok(S.outage==='anthropic'&&!S.jobs.length&&S.log.filter(l=>l.msg.includes('廠商當機，session 斷了')).length===2&&els.mo.innerHTML.includes('2 個跑在 Anthropic 的 agent 因為當機斷線。'),'random-events：當機中止該廠商的 agent');
  ok(els.mo.innerHTML.includes('<div class="evt"><b>Anthropic 服務大當機</b>'),'random-events：彈窗顯示事件標題');
  /* 各事件效果 */
  ok(dataModule.APIV.join()==='anthropic,openai,google,deepseek,zhipu,moonshot'&&dataModule.SUBV.join()==='anthropic,openai,google,zhipu,moonshot','random-events：降價與當機不抽自架開源，縮水只抽訂閱廠商');
  newRun('laravel');
  let ev=withRand(0,EVENTS[0]); ok(ev[0]==='Anthropic 新模型上架，API 降價 30%'&&near(S.priceMod.anthropic,.7),'random-events：降價 30%');
  withRand(0,EVENTS[0]); ok(near(S.priceMod.anthropic,.49),'random-events：降價可以疊加');
  ev=withRand(.5,EVENTS[1]); ok(S.outage==='deepseek'&&ev[0]==='DeepSeek 服務大當機','random-events：當機一天');
  S.day=7; ev=EVENTS[2](); ok(ev[0]==='主管在週會上提醒'&&!S.cnBan,'random-events：第 8 天前不會禁中國雲端');
  S.day=8; ev=EVENTS[2](); ok(ev[0]==='主管宣布：全公司暫停把程式碼送到中國雲端模型'&&S.cnBan,'random-events：第 8 天起可能禁中國雲端');
  ev=EVENTS[2](); ok(ev[0]==='主管在週會上提醒'&&S.cnBan,'random-events：已經禁了就只是提醒');
  {const spike=EVENTS.find(f=>String(f).includes('ev.traffic'));
    newRun('laravel'); S.day=5; S.issues=[ticket('fe',1),ticket('fe',2),ticket('fe',3)]; let sp=spike();
    ok(sp[0]==='新聞流量比平常高一點'&&S.issues.length===3,'random-events：第 6 天前流量暴增沒有效果',sp[0]);
    S.day=6; sp=spike(); ok(sp[0]==='大新聞爆發，流量暴增'&&S.issues.length===5&&S.issues.slice(3).every(i=>i.inc),'random-events：第 6 天起流量暴增加兩張事故單',sp[0]);}
  S.corp=10000; ev=EVENTS[3](); ok(ev[0]==='年度預算凍結'&&near(S.corp,7000),'random-events：預算凍結 -30%');
  S.subs.anthropic='pro'; S.used.sub.anthropic={d:0,w:0}; ev=withRand(0,EVENTS[4]); ok(ev[0]==='Anthropic 調整訂閱用量政策'&&near(S.capMod.anthropic,.8)&&near(quotaLeft('sub','anthropic'),360),'random-events：訂閱額度縮水 20%');
  S.issues=[]; ev=EVENTS[5](); ok(ev[0]==='大新聞爆發，流量暴增'&&S.issues.length===2&&S.issues.every(i=>i.inc),'random-events：流量暴增進兩張事故單');
  /* 主管事件（gh-24-01-slow-progress-event）：KPI 要超過 天數 × 7；第 6 天前沒達標只提醒 */
  S.day=5; S.kpi=40; S.trust=70; ev=EVENTS[6]();
  ok(ev[0]==='主管在週會上點名稱讚'&&ev[1]==='「KPI 已經 40，超過 35，AI 工具用得很有效率。」信任 +6。'&&S.trust===76,'random-events：第 5 天 KPI 40 主管稱讚 +6',ev.join('｜'));
  S.day=5; S.kpi=35; S.trust=70; ev=EVENTS[6]();
  ok(ev[0]==='主管在週會上提醒進度'&&ev[1]==='「KPI 目前 35。第一週先熟悉工具，之後 KPI 要超過天數 × 7。」沒有其他變化。'&&S.trust===70,'random-events：第 5 天 KPI 35 只提醒不扣分',ev.join('｜'));
  S.day=6; S.kpi=42; S.trust=70; ev=EVENTS[6]();
  ok(ev[0]==='主管問進度怎麼這麼慢'&&ev[1]==='「KPI 才 42，要超過 42 才跟得上進度。」信任 -4。'&&S.trust===66,'random-events：第 6 天 KPI 42 主管質疑 -4',ev.join('｜'));
  for(const [day,kpi,t0,title,t1] of [[2,0,70,'主管在週會上提醒進度',70],[2,15,70,'主管在週會上點名稱讚',76],[5,35,70,'主管在週會上提醒進度',70],[6,43,98,'主管在週會上點名稱讚',100],[6,42,70,'主管問進度怎麼這麼慢',66],[7,0,2,'主管問進度怎麼這麼慢',0]]){
    S.day=day; S.kpi=kpi; S.trust=t0; ev=EVENTS[6](); ok(ev[0]===title&&S.trust===t1,`random-events：第 ${day} 天 KPI ${kpi} 信任 ${t0} → ${title}、信任 ${t1}`,`${ev[0]} ${S.trust}`);}
  ok(!Object.values(I.LANGS[0].dict).some(v=>typeof v==='string'&&v.includes('不是有買 AI')),'random-events：事件文字不再有「不是有買 AI」');
  S.wallet=1000; ev=EVENTS[7](); ok(ev[0]==='外包案尾款入帳'&&S.wallet===2500,'random-events：尾款 +NT$1,500');
  }

  /* month-end-scoring：總分、評等、稱號、結算單 */
  {
  const endRun=(mode,set)=>{newRun('laravel',mode); resetStore(); S.day=20; set(); showEnd(); const h=els.mo.innerHTML;
    return {h,score:+h.match(/<span>總分<\/span><span>([\d,-]+)<\/span>/)[1].replace(/,/g,''),grade:h.match(/<span class="g">(\w)<\/span>/)[1],title:h.match(/<div class="gt"><b>([^<]+)<\/b>/)[1]};};
  const base=()=>{S.kpi=300; S.trust=50; S.st.subFee=2000; S.st.audits=1;};
  let r=endRun('serial',base); ok(r.score===3120,'month-end-scoring：KPI 300、信任 50、花 NT$2,000、稽核 1 次 → 3,120',r.score);
  r=endRun('serial',()=>{base(); S.st.subFee=16250;}); ok(r.score===3120,'month-end-scoring：只訂 Pro 500 花 NT$16,250，總分一樣 3,120',r.score);
  r=endRun('serial',()=>{base(); S.st.subFee=0; S.st.api=50000;}); ok(r.score===3120,'month-end-scoring：花 NT$50,000 也不影響總分',r.score);
  ok(monthScore().score===r.score&&monthScore().grade===r.grade&&monthScore().self===50000,'month-end-scoring：結算單用 monthScore()，self 是你自己掏的錢',[monthScore().score,monthScore().self].join());
  r=endRun('serial',()=>{S.kpi=0; S.trust=0; S.st.outIncome=3000; S.st.outPenalty=1000; S.st.api=500;}); ok(r.score===0&&r.h.includes('<span>你自己掏的錢</span><span>-NT$1,500</span>'),'month-end-scoring：外包收入不加分，你自己掏的錢 = 訂閱 + API + 外包違約金 − 外包收入',r.score);
  ok(r.h.includes('總分 = KPI × 10 + 信任 × 4 − 稽核次數 × 80')&&!r.h.includes('省下的個人預算'),'month-end-scoring：結算單寫出新公式');
  r=endRun('serial',()=>{base(); S.wallet=5430;}); ok(r.h.includes('<span>月底錢包餘額</span><span>NT$5,430</span>')&&r.score===3120,'month-end-scoring：結算單列出月底錢包餘額，不影響總分');
  /* 評等門檻 */
  /* 個位數用信任補（信任 × 4），才能測到 4,099 這種 spec 例子的確切值 */
  const gradeAt=(mode,score)=>endRun(mode,()=>{S.kpi=Math.floor(score/10); S.trust=score%10/4;}).grade;
  ok([[4300,'S'],[4299,'A'],[3300,'A'],[2500,'B'],[1700,'C'],[1699,'D']].every(([s,g])=>gradeAt('serial',s)===g),'month-end-scoring：單線門檻 4,300／3,300／2,500／1,700');
  ok([[6880,'S'],[6879,'A'],[5280,'A'],[4000,'B'],[2720,'C'],[2719,'D']].every(([s,g])=>gradeAt('parallel',s)===g),'month-end-scoring：平行門檻 ×1.6（6,880／5,280／4,000／2,720）');
  ok(endRun('serial',base).grade==='B'&&endRun('parallel',base).grade==='C','month-end-scoring：3,120 分單線 B、平行 C');
  /* 稱號 */
  const titleOf=set=>endRun('serial',()=>{S.kpi=120; S.trust=0; set();}).title;
  ok(titleOf(()=>{})==='還在摸索的開發者','month-end-scoring：預設稱號');
  ok(endRun('serial',()=>{S.kpi=1000; S.st.audits=2;}).title==='資安部門的常客','month-end-scoring：稽核 2 次優先於 S 評等');
  ok(titleOf(()=>{S.st.api=7001;})==='自費養 AI 的勇者','month-end-scoring：自費超過 NT$7,000');
  ok(titleOf(()=>{S.st.corp=10501;})==='公司帳單上的頭號人物','month-end-scoring：公司帳單超過 NT$10,500');
  ok(titleOf(()=>{S.st.tk.deepseek=41; S.st.tk.anthropic=59;})==='對岸模型省錢達人'&&titleOf(()=>{S.st.tk.deepseek=40; S.st.tk.anthropic=60;})==='還在摸索的開發者','month-end-scoring：中國模型超過 40%');
  ok(titleOf(()=>{S.st.tk.local=41; S.st.tk.anthropic=59;})==='地端信仰者','month-end-scoring：本地超過 40%');
  ok(titleOf(()=>{S.st.manual=13;})==='手工藝工程師'&&titleOf(()=>{S.st.manual=12;})==='還在摸索的開發者','month-end-scoring：手寫超過 12 次');
  ok(endRun('serial',()=>{S.kpi=400; S.trust=0;}).title==='Token 精算師','month-end-scoring：A 評等是 Token 精算師');
  ok(titleOf(()=>{S.st.api=7001; S.st.corp=10501; S.st.manual=13;})==='自費養 AI 的勇者','month-end-scoring：稱號照順序取第一個符合的');
  /* 結算單 */
  r=endRun('serial',()=>{S.st.subFee=650; S.st.api=120; S.st.corp=3000; S.st.done=12; S.st.late=2; S.st.kpiLost=8; S.st.manual=3; S.st.caught=4; S.st.audits=1; S.trust=55; S.kpi=90; S.st.tk.anthropic=100; S.st.tk.deepseek=300;});
  ok(['個人訂閱月費</span><span>NT$650','個人 API 帳單</span><span>NT$120','你自己掏的錢</span><span>NT$770','公司 API 帳單</span><span>NT$3,000','Anthropic</span><span>100k tokens・25%','DeepSeek</span><span>300k tokens・75%','完成工單</span><span>12 張','逾期工單</span><span>2 張（KPI -8）','自己手寫</span><span>3 次','審核救回</span><span>4 張','資安稽核</span><span>1 次','主管信任</span><span>55','<span>KPI</span><span>90']
    .every(x=>r.h.includes(x)),'month-end-scoring：結算單列出核心項目');
  ok(!r.h.includes('先前最佳')&&endRun('serial',()=>{}).h.includes('沒有用到任何 agent'),'month-end-scoring：沒有最佳分時不顯示、沒用 agent 時的文字');
  newRun('laravel'); resetStore({[bestKey()]:'5000'}); S.day=20; showEnd(); ok(els.mo.innerHTML.includes('<span>先前最佳</span><span>5,000</span>'),'month-end-scoring：有最佳分時顯示先前最佳');
  /* 按鈕 */
  els.app.attrs.length=0; clickMo({act:'close'}); ok(els.ov.hidden&&els.app.attrs.some(([s,k])=>s==='[data-act="end"]'&&k==='disabled'),'month-end-scoring：看看紀錄關掉結算並停用下班按鈕');
  S.mode='serial'; S.day=20; showEnd(); clickMo({act:'again'}); ok(S.day===1&&S.mode==='serial'&&els.mo.innerHTML.includes('月初：決定這個月怎麼付 token')&&/class="sb sel" data-mode="serial"/.test(els.mo.innerHTML),'month-end-scoring：再玩一個月開新局、沿用選擇');
  resetStore();
  }
  }
  {
  /* ===== GA 遊戲事件（gh-10-01-play-analytics） ===== */
  const clickMo=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const ev=[]; globalThis.gtag=(kind,name,p)=>ev.push({kind,name,p});
  const names=()=>ev.map(e=>e.name).join();
  /* 開局參數：單線 Rails（存著 5 個工作槽也送 1） */
  newRun('rails','parallel'); S.slots=5; S.advanced=false; S.outsource=false; showSetup(false); clickMo({mode:'serial'}); ev.length=0; clickMo({act:'confirm'});
  ok(names()==='game_start,subscription,day_reached'&&ev.every(e=>e.kind==='event'&&e.p.day===1),'play-analytics：開局確認送 game_start、subscription、第 1 天 day_reached',names());
  ok(ev[1].p.vendor==='none'&&ev[1].p.plan==='none','play-analytics：沒有訂閱時送一筆 vendor none、plan none',JSON.stringify(ev[1].p));
  const p0=ev[0].p;
  ok(p0.game_version==='dev'&&p0.game_mode==='serial'&&p0.companies==='rails'&&p0.slots===1&&p0.advanced===false&&p0.outsource===false,'play-analytics：單線 Rails 的共同參數',JSON.stringify(p0));
  /* 開局參數：平行 Laravel＋Rust、4 個工作槽、進階、接外包 */
  newRun('laravel','parallel'); S.slots=3; S.advanced=false; S.outsource=false; showSetup(false);
  clickMo({company:'rust'}); clickMo({slots:'4'}); clickMo({out:'1'}); clickMo({adv:'1'}); ev.length=0; clickMo({act:'confirm'});
  const p1=ev[0]?.p||{};
  ok(ev[0]?.name==='game_start'&&p1.game_mode==='parallel'&&p1.companies==='laravel+rust'&&p1.slots===4&&p1.advanced===true&&p1.outsource===true,'play-analytics：平行雙選的共同參數',JSON.stringify(p1));
  /* 整個月：第 1–20 天各一次 day_reached，第 20 天結束送 game_end，不送第 21 天 */
  for(let i=0;i<20;i++)endDay();
  const days=ev.filter(e=>e.name==='day_reached').map(e=>e.p.day).join();
  ok(days===Array.from({length:20},(_,i)=>i+1).join(),'play-analytics：第 1–20 天各送一次 day_reached',days);
  ok(ev.filter(e=>e.name==='game_end').length===1&&ev.at(-1).name==='game_end'&&ev.at(-1).p.day===20,'play-analytics：月底送一次 game_end');
  /* gh-18-01：識別子不變，SRE＋DevOps 送 sre+devops */
  newRun('sre','parallel'); showSetup(false); clickMo({company:'devops'}); ev.length=0; clickMo({act:'confirm'});
  ok(ev[0]?.name==='game_start'&&ev[0].p.companies==='sre+devops','play-analytics：SRE＋DevOps 的 companies 是 sre+devops',JSON.stringify(ev[0]?.p));
  /* 週一調整訂閱沒改就不送事件 */
  newRun('laravel'); S.day=6; showSetup(true); ev.length=0; clickMo({act:'confirm'}); showSetup(true); clickMo({act:'close'});
  ok(ev.length===0,'play-analytics：週一調整訂閱沒改、或關掉都不送事件',names());
  /* 開局訂閱：Claude Max 5×＋GLM Lite，依 SUBV 順序每家一筆 */
  const subEv=()=>ev.filter(e=>e.name==='subscription').map(e=>`${e.p.vendor}:${e.p.plan}@${e.p.day}`).join();
  newRun('laravel'); showSetup(false); clickMo({pv:'anthropic',pp:'max5'}); clickMo({pv:'zhipu',pp:'lite'}); ev.length=0; clickMo({act:'confirm'});
  ok(names()==='game_start,subscription,subscription,day_reached'&&subEv()==='anthropic:max5@1,zhipu:lite@1','play-analytics：開局每家有訂閱的送一筆 subscription',names()+' '+subEv());
  /* 週一改方案：只送有改的那幾家，取消送 none */
  S.day=6; showSetup(true); clickMo({pv:'anthropic',pp:'max20'}); clickMo({pv:'zhipu',pp:'none'}); ev.length=0; clickMo({act:'confirm'});
  ok(names()==='subscription,subscription'&&subEv()==='anthropic:max20@6,zhipu:none@6','play-analytics：週一只送改過的訂閱',subEv());
  /* game_end 帶 score 與 grade */
  newRun('laravel','serial'); S.kpi=300; S.trust=70; S.day=20; ev.length=0; showEnd();
  ok(ev.length===1&&ev[0].name==='game_end'&&ev[0].p.score===3280&&ev[0].p.grade==='B'&&ev[0].p.day===20,'play-analytics：game_end 帶 score 3280、grade B',JSON.stringify(ev[0]?.p));
  /* gtag 會丟例外：遊戲照常開局 */
  globalThis.gtag=()=>{throw new Error('blocked');};
  let threw=false; try{newRun('laravel'); showSetup(false); clickMo({act:'confirm'});}catch(e){threw=true;}
  ok(!threw&&S.day===1,'play-analytics：gtag 丟例外時照常開局');
  /* 沒有 gtag：整個月跑完不出錯、結算照開 */
  delete globalThis.gtag; threw=false;
  try{newRun('laravel'); showSetup(false); clickMo({act:'confirm'}); for(let i=0;i<20;i++)endDay();}catch(e){threw=true;}
  ok(!threw&&els.mo.innerHTML.includes('月底結算'),'play-analytics：沒有 gtag 時整個月照常跑完');
  /* 版本：repo 裡是 dev，部署 workflow 換成短 commit hash，沒換到就失敗 */
  const wf=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
  ok(dataModule.GAME_VERSION==='dev','play-analytics：repo 裡的 GAME_VERSION 是 dev');
  ok(wf.includes(`sed -i "s/export const GAME_VERSION='dev';/export const GAME_VERSION='\${GITHUB_SHA::7}';/" public/js/data.js`)&&wf.includes(`grep -q "GAME_VERSION='\${GITHUB_SHA::7}'" public/js/data.js`)&&wf.indexOf('Stamp game version')<wf.indexOf('upload-pages-artifact'),'play-analytics：部署前把版本換成短 commit hash 並檢查');
  }

  /* ===== 派工與結果事件（gh-14-01-choice-analytics） ===== */
  {
  const ev=[]; globalThis.gtag=(kind,name,p)=>ev.push({name,p});
  const of=n=>ev.filter(e=>e.name===n);
  /* 手動派工：平行、Laravel 複雜度 2、Sonnet、公司 API、自審 */
  newRun('laravel','parallel'); S.slots=3; const d1=ticket('laravel',2); S.issues=[d1];
  Object.assign(sel,{issue:d1.id,v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1}); ev.length=0; dispatch();
  const dp=of('dispatch')[0]?.p||{};
  ok(of('dispatch').length===1&&dp.vendor==='anthropic'&&dp.model==='sonnet'&&dp.bill==='corp'&&dp.review==='self'&&dp.effort==='mid'&&dp.via==='panel'&&dp.preset==='none'&&dp.cx===2&&dp.stack==='laravel'&&dp.incident===false&&dp.sensitive===false&&dp.gig===false&&dp.merge===false&&dp.day===S.day,'choice-analytics：派工按鈕送 dispatch 與選擇參數',JSON.stringify(dp));
  /* 一鍵派工：方案 A */
  newRun('laravel','parallel'); const q1=ticket('laravel',1); S.issues=[q1]; ev.length=0; quick(q1.id);
  const qp=of('dispatch')[0]?.p||{}, A0=S.presets[0];
  ok(of('dispatch').length===1&&qp.via==='quick'&&qp.preset==='A'&&qp.vendor===A0.v&&qp.model===A0.m&&qp.bill===A0.b&&qp.review===['none','self','strict'][A0.rv],'choice-analytics：一鍵派工送 via quick、preset A',JSON.stringify(qp));
  /* 批次派工：兩張都送 via batch */
  newRun('laravel','parallel'); S.slots=3; S.inv.skills=true; S.issues=[ticket('laravel',1),ticket('laravel',2)]; ev.length=0; batch();
  ok(of('dispatch').length===2&&of('dispatch').every(e=>e.p.via==='batch'),'choice-analytics：批次派工每張送 via batch',JSON.stringify(of('dispatch').map(e=>e.p.via)));
  /* 被拒絕的派工不送 */
  newRun('laravel','parallel'); const g0=ticket('laravel',1,{out:true}); S.issues=[g0];
  Object.assign(sel,{issue:g0.id,v:'anthropic',m:'sonnet',b:'corp',rv:0}); ev.length=0; dispatch();
  ok(ev.length===0,'choice-analytics：外包單選公司 API 派工不送 dispatch',ev.map(e=>e.name).join());
  /* 單線：dispatch 在 job_result 前面 */
  newRun('laravel','serial'); const s1=ticket('laravel',1); S.issues=[s1]; S.hours=8;
  Object.assign(sel,{issue:s1.id,v:'anthropic',m:'opus',b:'api',rv:0,ef:1}); ev.length=0; dispatch();
  ok(ev.map(e=>e.name).join()==='dispatch,job_result','choice-analytics：單線先送 dispatch 再送 job_result',ev.map(e=>e.name).join());
  /* 結果：照優先順序 */
  const job=(x={})=>{const is=ticket('laravel',2); S.issues.push(is); return {issue:is,v:'anthropic',m:'opus',ef:1,b:'api',M:model('anthropic','opus'),rv:1,tk:100,hrs:2,ok:true,caught:false,left:0,hidden:false,stop:false,sdd:false,...x};};
  const res=(j,o)=>{ev.length=0; settle(j,o); return of('job_result')[0]?.p||{};};
  newRun('laravel','serial');
  ok(res(job(),{fail:true}).outcome==='aborted','choice-analytics：單線跑不完 → aborted');
  ok(res(job(),{fail:true,cancel:true}).outcome==='cancelled','abort-agent：玩家中止 → cancelled');
  S.subs.anthropic='pro'; S.used.sub.anthropic.d=450; ok(res(job({b:'sub'}),{fail:true,cancel:true}).outcome==='cancelled','abort-agent：玩家中止時額度不夠仍是 cancelled');
  newRun('laravel','parallel'); {const j=job({left:1}); j.issue.running=true; S.jobs=[j]; ev.length=0; A.cancelJobs(()=>true,'到期還沒跑完，只好中止');
   ok(of('job_result')[0]?.p.outcome==='aborted','abort-agent：到期中止仍是 aborted');}
  newRun('laravel','serial');
  S.subs.anthropic='pro'; S.used.sub.anthropic.d=450; ok(res(job({b:'sub'})).outcome==='quota','choice-analytics：額度不夠 → quota');
  ok(res(job({ok:false,caught:true})).outcome==='caught','choice-analytics：審核抓到 → caught');
  const rs=res(job());
  ok(rs.outcome==='success'&&rs.tokens===100&&rs.cost===90&&rs.hours===2&&rs.vendor==='anthropic'&&rs.model==='opus'&&rs.bill==='api'&&rs.review==='self'&&rs.effort==='mid'&&rs.cx===2&&rs.stack==='laravel'&&rs.gig===false,'choice-analytics：成功 → success，Opus 100k 花 NT$90',JSON.stringify(rs));
  ok(res(job({ok:false,stop:true})).outcome==='trap_stop','choice-analytics：陷阱停下 → trap_stop');
  ok(res(job({ok:false})).outcome==='fail','choice-analytics：失敗沒抓到 → fail');
  /* 手寫：單線 Laravel 複雜度 1 */
  newRun('laravel','serial'); S.hours=8; const m1=ticket('laravel',1); S.issues=[m1]; sel.issue=m1.id; ev.length=0; manual();
  const mp=of('manual_fix')[0]?.p||{};
  ok(ev.length===1&&mp.cx===1&&mp.stack==='laravel'&&mp.unfamiliar===false&&mp.gig===false&&mp.outcome==='success'&&mp.hours>0,'choice-analytics：手寫成功送 manual_fix',JSON.stringify(mp));
  S.hours=0; const m2=ticket('laravel',1); S.issues=[m2]; sel.issue=m2.id; ev.length=0; manual();
  ok(ev.length===0,'choice-analytics：工時不夠手寫不送事件');
  /* 評估架構識破陷阱 */
  newRun('laravel','serial'); S.hours=8; const e1=ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4]}); S.issues=[e1];
  Object.assign(sel,{issue:e1.id,v:'anthropic',m:'opus',b:'api'}); ev.length=0;
  {const rr=Math.random; Math.random=()=>0; evaluate(); Math.random=rr;}
  const ep=of('evaluate')[0]?.p||{};
  ok(ev.length===1&&ep.outcome==='found'&&ep.cx===1&&ep.vendor==='anthropic'&&ep.model==='opus'&&ep.bill==='api'&&ep.stack==='laravel','choice-analytics：評估識破陷阱送 evaluate found、cx 送原估 1',JSON.stringify(ep));
  /* 找主管重新評估 */
  for(const [trust,want] of [[70,'approved'],[40,'refused']]){
    newRun('laravel','serial'); S.trust=trust; const r1=ticket('laravel',4,{revealed:true,trap:true,shownCx:1}); S.issues=[r1]; sel.issue=r1.id; ev.length=0; rescope();
    ok(ev.length===1&&ev[0].name==='rescope'&&ev[0].p.outcome===want&&ev[0].p.cx===4,`choice-analytics：信任 ${trust} 找主管 → ${want}`,JSON.stringify(ev[0]?.p));
  }
  /* 工程投資：第二次買不送 */
  newRun('laravel','serial'); S.hours=8; ev.length=0; invest('md','rust'); invest('md','rust');
  ok(ev.length===1&&ev[0].name==='invest'&&ev[0].p.investment==='md'&&ev[0].p.stack==='rust','choice-analytics：買 Rust CLAUDE.md 送一次 invest',JSON.stringify(ev.map(e=>e.p)));
  ev.length=0; invest('tests'); ok(ev[0]?.p.investment==='tests'&&ev[0]?.p.stack==='none','choice-analytics：非 CLAUDE.md 投資 stack 送 none');
  {const rr=Math.random; Math.random=()=>0;
    ok(res(job(),{conflict:1}).outcome==='conflict','choice-analytics：合併衝突 → conflict');
    const sj=job(); sj.issue.store=true; ok(res(sj).outcome==='rejected','choice-analytics：上架被退 → rejected');
    Math.random=rr;}
  /* 工作槽滿、本地 GPU 忙：派工不送 */
  newRun('laravel','parallel'); S.slots=2; const fz=ticket('laravel',1); S.issues=[fz]; S.jobs=[{left:5},{left:5}];
  Object.assign(sel,{issue:fz.id,v:'anthropic',m:'sonnet',b:'api',rv:0}); ev.length=0; dispatch();
  ok(ev.length===0,'choice-analytics：工作槽滿不送 dispatch');
  newRun('laravel','parallel'); const lz=ticket('laravel',1); S.issues=[lz]; S.jobs=[{b:'local',left:5,issue:ticket('fe',1)}];
  Object.assign(sel,{issue:lz.id,v:'local',m:'gemma',b:'local',rv:0}); ev.length=0; dispatch();
  ok(ev.length===0,'choice-analytics：本地 GPU 忙不送 dispatch');
  /* 手寫：陷阱與失敗 */
  newRun('laravel','serial'); S.hours=8; const mt=ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4]}); S.issues=[mt]; sel.issue=mt.id; ev.length=0; manual();
  ok(of('manual_fix')[0]?.p.outcome==='trap'&&of('manual_fix')[0]?.p.cx===1,'choice-analytics：手寫踩到陷阱 → trap，cx 送原估');
  S.hours=99; const mf=ticket('laravel',4); S.issues=[mf]; sel.issue=mf.id; ev.length=0;
  {const rr=Math.random; Math.random=()=>.99; manual(); Math.random=rr;}
  ok(of('manual_fix')[0]?.p.outcome==='fail','choice-analytics：手寫卡關 → fail');
  /* 評估：沒陷阱 clear、額度不夠 quota */
  newRun('laravel','serial'); S.hours=8; const ec=ticket('laravel',1); S.issues=[ec]; Object.assign(sel,{issue:ec.id,v:'anthropic',m:'opus',b:'api'}); ev.length=0; evaluate();
  ok(of('evaluate')[0]?.p.outcome==='clear','choice-analytics：評估沒發現陷阱 → clear');
  S.subs.anthropic='pro'; S.used.sub.anthropic.d=450; const eq=ticket('laravel',1); S.issues=[eq]; Object.assign(sel,{issue:eq.id,v:'anthropic',m:'opus',b:'sub'}); ev.length=0; evaluate();
  ok(of('evaluate')[0]?.p.outcome==='quota','choice-analytics：評估額度不夠 → quota');
  const old=job(); delete old.m; delete old.ef; const ro=res(old);
  ok(ro.model==='unknown'&&ro.effort==='mid','choice-analytics：舊存檔的 job 送 model unknown、effort mid',JSON.stringify(ro));
  delete globalThis.gtag;
  }

  /* ===== save-game（gh-11-01-save-game） ===== */
  {
  const SV=St.SAVE_KEY;
  /* 平行模式第 4 天、一個 agent 跑著的局面，存檔後回傳原始字串 */
  const savedRun=()=>{newRun(['laravel','rust'],'parallel'); S.slots=4; S.day=4; const t=ticket('laravel',2,{running:true}), q=ticket('rails',1);
    S.issues=[t,q]; S.jobs=[{issue:t,v:'anthropic',b:'api',M:model('anthropic','sonnet'),mul:1,rv:1,tk:100,hrs:3,ok:true,caught:false,left:2,hidden:false,stop:false,sdd:false}];
    resetStore(); St.saveGame({rep:['早上報告'],ev:['事件標題','事件內容'],monday:false}); return store[SV];};
  const raw=savedRun(), base=JSON.parse(raw);
  const withSave=v=>{resetStore({[SV]:typeof v==='string'?v:JSON.stringify(v)});};
  /* 版本與損壞情況（Saves across save structure versions） */
  const cases=[
    ['同版本、內容正常',base,true],
    ['版本少 1',{...base,ver:St.SAVE_VER-1},false],
    ['GAME_VERSION 不同但結構版本相同',{...base,game_version:'abc1234'},true],
    ['不是 JSON','{oops',false],
    ['job 的工單不在佇列',{...base,S:{...base.S,issues:base.S.issues.slice(1)}},false],
    ['第 21 天',{...base,S:{...base.S,day:21}},false],
  ];
  for(const [name,v,usable] of cases){
    withSave(v); const before=S, r=St.readSave();
    ok(usable?(r&&!r.bad&&r.S.day===4):(r?.bad===true&&!(SV in store)),`save-game：${name} → ${usable?'可讀、保留':'提示讀不到、刪掉'}`,JSON.stringify(r)?.slice(0,80));
    if(usable) ok(SV in store,`save-game：${name} 存檔保留`);
    ok(S===before,`save-game：${name} 檢查時不動目前狀態`);
  }
  /* 讀不到 localStorage：當成沒有存檔 */
  const gi=localStorage.getItem; localStorage.getItem=()=>{throw new Error('denied');};
  ok(St.readSave()===null,'save-game：getItem 丟例外時當成沒有存檔');
  let threwLoad=false; try{boot();}catch(e){threwLoad=true;}
  ok(!threwLoad&&els.mo.innerHTML.includes('月初：決定這個月怎麼付 token')&&!els.ov.hidden,'save-game：getItem 丟例外時開頁照常開局設定');
  localStorage.getItem=gi;
  /* 存檔只有這五個欄位，不帶 GAME_VERSION */
  ok(Object.keys(base).join()==='ver,S,sel,uid,morning','save-game：存檔欄位只有 ver,S,sel,uid,morning',Object.keys(base).join());
  resetStore(); ok(St.readSave()===null,'save-game：沒有存檔回 null');
  /* 讀檔後 job 的工單和佇列是同一個物件 */
  withSave(base); St.loadGame(St.readSave());
  ok(S.day===4&&S.jobs.length===1&&S.jobs[0].issue===S.issues.find(i=>i.id===S.jobs[0].issue.id)&&S.jobs[0].issue.running===true,'save-game：讀檔後 job.issue 就是佇列裡同 id 的工單');
  ok(St.uid===base.uid&&sel.rv===base.sel.rv,'save-game：讀檔還原 uid 與 sel');
  }
  /* Day-start save */
  {
  const SV=St.SAVE_KEY, saved=()=>JSON.parse(store[SV]);
  const clickMo=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  resetStore(); newRun('laravel','parallel'); showSetup(false); clickMo({act:'confirm'});
  ok(SV in store&&saved().S.day===1&&saved().morning===null,'save-game：開局確認後存第 1 天、morning 是 null');
  S.day=3; endDay();
  const d4=saved();
  ok(d4.S.day===4&&d4.S.issues.map(i=>i.id).join()===S.issues.map(i=>i.id).join()&&Array.isArray(d4.morning.rep)&&typeof d4.morning.monday==='boolean','save-game：換到第 4 天存當天早上的佇列與報告');
  const is=S.issues.find(i=>!i.out); sel.issue=is.id; sel.v='deepseek'; sel.m='chat'; sel.b='api'; dispatch();
  ok(S.jobs.length===1&&saved().S.jobs.length===d4.S.jobs.length&&store[SV]===JSON.stringify(d4),'save-game：派工後存檔不變');
  /* 週一調整訂閱不存 */
  S.day=6; const before=store[SV]; showSetup(true); clickMo({act:'confirm'});
  ok(store[SV]===before,'save-game：週一調整訂閱確認不存檔');
  /* 寫入失敗：照常換日 */
  const si=localStorage.setItem; localStorage.setItem=()=>{throw new Error('quota');};
  let threw=false; try{S.day=4; endDay();}catch(e){threw=true;}
  localStorage.setItem=si;
  ok(!threw&&els.mo.innerHTML.includes('第 5 天')&&!els.ov.hidden,'save-game：setItem 丟例外時照常開早上報告');
  }
  /* Save lifetime */
  {
  const SV=St.SAVE_KEY;
  resetStore(); newRun('laravel','serial'); S.day=19; endDay(); ok(SV in store,'save-game：第 20 天早上有存檔');
  endDay(); ok(els.mo.innerHTML.includes('月底結算')&&!(SV in store),'save-game：月底結算後存檔被刪掉');
  St.saveGame(); ok(SV in store,'save-game：（前置）有存檔');
  els.mo.onclick({target:{closest:()=>({dataset:{act:'again'}})}});
  ok(!(SV in store)&&S.day===1,'save-game：再玩一個月清掉存檔');
  /* 讀檔的局照常記最高分 */
  newRun('rails','serial'); S.day=20; S.kpi=500; resetStore({[bestKey()]:'1000'}); St.saveGame();
  St.loadGame(St.readSave()); showEnd();
  ok(+store[bestKey()]>1000,'save-game：讀檔的局破紀錄時寫入最高分',store[bestKey()]);
  }
  /* Resume on page load */
  {
  const SV=St.SAVE_KEY;
  const clickMo=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const ev=[]; globalThis.gtag=(kind,name,p)=>ev.push(name);
  /* 平行第 7 天、Laravel＋Rust、4 個 agent，一個 agent 過夜 */
  newRun(['laravel','rust'],'parallel'); S.slots=4; S.day=7; const t2=ticket('rust',3,{running:true}); S.issues=[t2,ticket('laravel',1)];
  S.jobs=[{issue:t2,v:'anthropic',b:'api',M:model('anthropic','sonnet'),mul:1,rv:1,tk:100,hrs:3,ok:true,caught:false,left:2,hidden:false,stop:false,sdd:false}];
  resetStore(); St.saveGame({rep:['2 個 agent 跑了一整晚'],ev:['事件標題','事件內容'],monday:false}); fresh();
  ev.length=0; boot();
  ok(els.mo.innerHTML.includes('繼續上一局')&&els.mo.innerHTML.includes(`第 7 天・${dataModule.companyName(['laravel','rust'])}・平行（同時 4 個 agent）`)&&!els.ov.hidden,'save-game：開頁有存檔時顯示繼續彈窗與第 7 天・公司・平行（同時 4 個 agent）');
  clickMo({act:'resume'});
  ok(S.day===7&&S.jobs.length===1&&S.jobs[0].issue===S.issues.find(i=>i.id===t2.id)&&els.app.innerHTML.includes(t2.title),'save-game：繼續後第 7 天、過夜 agent 還在、job 的工單就是佇列裡那張');
  ok(els.mo.innerHTML.includes('第 7 天')&&els.mo.innerHTML.includes('2 個 agent 跑了一整晚')&&els.mo.innerHTML.includes('事件標題')&&!els.ov.hidden,'save-game：繼續後打開存下來的早上報告');
  ok(ev.length===0,'save-game：繼續不送 GA 事件',ev.join());
  ok(SV in store,'save-game：繼續後存檔保留');
  /* 第 1 天的存檔：繼續後沒有彈窗 */
  newRun('laravel','serial'); St.saveGame(); fresh(); boot(); clickMo({act:'resume'});
  ok(S.day===1&&els.ov.hidden,'save-game：繼續第 1 天的存檔後沒有彈窗');
  /* 開新局：刪掉存檔、開開局設定 */
  newRun('laravel','serial'); S.day=5; St.saveGame({rep:[],ev:null,monday:false}); boot(); clickMo({act:'new'});
  ok(!(SV in store)&&els.mo.innerHTML.includes('月初：決定這個月怎麼付 token')&&S.day===1,'save-game：選開新局刪掉存檔並開開局設定');
  /* 沒有存檔：直接開局設定 */
  resetStore(); boot();
  ok(els.mo.innerHTML.includes('月初：決定這個月怎麼付 token')&&!els.ov.hidden,'save-game：沒有存檔時開頁直接開局設定');
  /* 壞存檔：提示，按鈕開局設定 */
  resetStore({[SV]:'{"ver":0}'}); boot();
  ok(els.mo.innerHTML.includes('存檔無法讀取')&&!(SV in store),'save-game：壞存檔顯示讀不到並刪掉');
  clickMo({act:'new'}); ok(els.mo.innerHTML.includes('月初：決定這個月怎麼付 token'),'save-game：讀不到提示的按鈕開開局設定');
  delete globalThis.gtag;
  }
  /* local-hardware（gh-17-01-local-hardware）：採購電腦 */
  {
  const H=dataModule.HW, rr=Math.random, quiet=f=>{Math.random=()=>.99; try{f();}finally{Math.random=rr;}};
  const end=()=>quiet(()=>endDay());
  ok(dataModule.HW_KEYS.join()==='pc,spark,mac'&&[H.pc.trust,H.spark.trust,H.mac.trust].join()==='55,60,70'&&[H.pc.days,H.spark.days,H.mac.days].join()==='2,3,3'&&H.pc.price==='約 NT$12 萬'&&H.spark.price==='約 NT$13 萬'&&H.mac.price==='約 NT$30 萬','local-hardware：三台電腦的門檻、天數與價格文字');
  /* 申請 */
  const ev=[]; globalThis.gtag=(kind,name,p)=>ev.push({name,p});
  newRun('laravel'); ev.length=0;
  ok(A.requestHw('spark')&&near(S.hours,7)&&S.corp===12000&&S.corpDay===0&&S.st.corp===0,'local-hardware：第 1 天申請 Spark 花 1h、不動公司預算');
  render(); ok(els.app.innerHTML.includes('採購 NVIDIA DGX Spark 審核中，預計第 4 天到貨'),'local-hardware：額度區顯示審核中與預計到貨日');
  ok(!A.requestHw('mac')&&S.hwReq.k==='spark','local-hardware：審核中不能再申請');
  ok(ev.length===1&&ev[0].name==='invest'&&ev[0].p.investment==='spark'&&ev[0].p.stack==='none','play-analytics：申請電腦送一筆 invest（spark、none），被擋的不送',JSON.stringify(ev));
  delete globalThis.gtag;
  for(const [name,setup,k,why] of [['已到貨',()=>{S.hw.pc=true;},'pc','已到貨'],['審核中',()=>{S.hwReq={k:'spark',day:1};},'mac','採購審核中'],['工時不夠',()=>{S.hours=.5;},'pc','工時不夠'],['來不及到貨',()=>{S.day=18;},'spark','來不及到貨']]){
    newRun('laravel'); setup(); const h0=S.hours, r0=S.hwReq;
    render(); const btn=els.app.innerHTML.match(new RegExp(`data-hw="${k}"[^>]*>.*?</button>`))?.[0]||'';
    ok(!A.requestHw(k)&&S.hours===h0&&S.hwReq===r0&&btn.includes('disabled')&&btn.includes(why),`local-hardware：${name}時不能申請、按鈕顯示 ${why}`,btn);
  }
  newRun('laravel'); S.day=18; ok(A.requestHw('pc')&&S.hwReq.day===18,'local-hardware：第 18 天還能申請 PC（第 20 天到貨）');
  render(); ok(els.app.innerHTML.includes('預計第 20 天到貨'),'local-hardware：第 18 天申請 PC 預計第 20 天到貨');
  /* 到貨 */
  for(const [trust,okd] of [[59,false],[60,true]]){
    newRun('laravel'); S.hwReq={k:'spark',day:1}; S.day=3; S.hours=0; S.trust=trust; end();
    if(okd) ok(S.day===4&&S.hw.spark&&near(S.hours,7)&&S.hwReq===null&&S.trust===60&&els.mo.innerHTML.includes('採購到貨：NVIDIA DGX Spark 架好了（架設花了 1 小時）。'),'local-hardware：信任 60 時 Spark 到貨、當天剩 7h');
    else ok(S.day===4&&!S.hw.spark&&S.hours===8&&S.hwReq===null&&S.trust===59&&els.mo.innerHTML.includes('採購被退件：主管信任不夠（需要 60 以上）。'),'local-hardware：信任 59 時退件、不扣信任、8h');
  }
  newRun('laravel','parallel'); S.hwReq={k:'pc',day:1}; S.day=2; S.hours=0; end();
  ok(S.day===3&&S.hw.pc&&A.clock(8-S.hours)==='10:00','local-hardware：平行模式到貨當天 10:00 開工');
  render(); ok(!/data-hw="spark"[^>]*disabled/.test(els.app.innerHTML)&&!/data-hw="mac"[^>]*disabled/.test(els.app.innerHTML),'local-hardware：PC 到貨當天就能申請 Spark、Mac');
  /* PC 加速 */
  newRun('laravel'); const g2=ticket('laravel',2);
  const e0=est(g2,'local','gemma',0), son0=est(g2,'anthropic','sonnet',0), ev0=evalCost(model('local','gemma'),'local');
  S.hw.pc=true;
  ok(near(e0.hrs,3.8)&&near(est(g2,'local','gemma',0).hrs,2.66)&&near(est(g2,'local','gemma',0).tk,e0.tk)&&near(est(g2,'local','gemma',0).p,e0.p),'local-hardware：Gemma 4 26B A4B 複雜度 2 從 3.8h 變 2.66h，token 與成功率不變');
  ok(JSON.stringify(est(g2,'anthropic','sonnet',0))===JSON.stringify(son0),'local-hardware：PC 不影響雲端模型');
  ok(near(evalCost(model('local','gemma'),'local').hrs,ev0.hrs*.7),'local-hardware：PC 也讓本地評估架構變快');
  S.issues=[g2]; sel.issue=g2.id; Object.assign(sel,{v:'local',m:'gemma',b:'local'}); render();
  ok(els.app.innerHTML.includes('顯卡 PC：本地執行時間 ×0.7'),'local-hardware：派工台提示 PC 加速');
  /* 解鎖的模型 */
  newRun('laravel'); const lt=ticket('laravel',2); S.issues=[lt]; sel.issue=lt.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api'}); render();
  {const h=els.app.innerHTML; ok(/data-m="qcnext" disabled>.*?需要 NVIDIA DGX Spark/.test(h)&&/data-m="gemma4" disabled>.*?需要 NVIDIA DGX Spark/.test(h)&&/data-m="glm53" disabled>.*?需要 Mac Studio（512GB）/.test(h),'local-hardware：沒買電腦時解鎖模型停用並寫需要哪台');}
  Object.assign(sel,{v:'local',m:'gemma4',b:'local'}); render();
  ok(sel.v==='anthropic'&&sel.m==='haiku'&&sel.b!=='local','agent-catalog：選到沒解鎖的模型時換成目錄第一個能用的',`${sel.v}/${sel.m}/${sel.b}`);
  Object.assign(sel,{v:'local',m:'gemma4',b:'local'}); const n0=S.st.tk.local, iss0=S.issues.length; dispatch(); evaluate();
  ok(S.issues.length===iss0&&S.st.tk.local===n0&&!lt.evaluated&&near(S.hours,8),'local-hardware：沒解鎖的模型派工、評估都不動作');
  S.hw.spark=S.hw.mac=true; const gv=ticket('laravel',2,{client:CLIENTS[3]}); S.issues=[gv]; sel.issue=gv.id; Object.assign(sel,{v:'local',m:'gemma4',b:'local'}); render();
  {const h=els.app.innerHTML; ok(/data-m="gemma4" ><b>Gemma 4 31B<\/b><span>能力 ●●●●○<\/span><span class="">免費/.test(h)&&/data-m="qcnext" disabled>.*?中國權重禁用/.test(h)&&/data-m="glm53" disabled>.*?中國權重禁用/.test(h),'local-hardware：政府標案可用 Gemma 4 31B，Qwen3-Coder-Next 與 GLM-5.3 中國權重禁用');}
  {newRun('laravel'); const t=ticket('laravel',2), tg=ticket('laravel',2,{client:CLIENTS[3]});
  ok(presetBlock(t,{v:'local',m:'gemma4',b:'local',rv:0,ef:1})==='需要 NVIDIA DGX Spark','dispatch-presets：沒有 Spark 時 local/gemma4 → 需要 NVIDIA DGX Spark');
  S.hw.mac=true; ok(presetBlock(tg,{v:'local',m:'glm53',b:'local',rv:0,ef:1})==='中國權重禁用','dispatch-presets：政府標案有 Mac 時 local/glm53 → 中國權重禁用');
  ok(dataModule.validPreset({v:'local',m:'gemma4',b:'local',rv:0}),'local-hardware：存了解鎖模型的方案是合法方案');}
  /* 手寫不再卡住 */
  const localJob=is=>({issue:is,v:'local',m:'gemma',b:'local',M:model('local','gemma'),rv:0,ef:1,tk:100,hrs:6,ok:true,caught:false,left:6,hidden:false,stop:false,sdd:false});
  for(const pc of [false,true]){
    newRun('laravel','parallel'); const run=ticket('laravel',3,{running:true}), mt=ticket('fe',1); S.issues=[run,mt]; S.jobs=[localJob(run)]; S.hw.pc=pc;
    sel.issue=mt.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api'}); render(); const btn=els.app.innerHTML.match(/data-act="manual"[^>]*>[^<]*/)[0];
    const m0=S.st.manual; manual();
    if(pc) ok(S.st.manual===m0+1&&!btn.includes('disabled'),'local-hardware：有 PC 時本地 agent 在跑也能手寫',btn);
    if(pc){Object.assign(sel,{v:'local',m:'gemma',b:'local'}); const t3=ticket('fe',1); S.issues.push(t3); sel.issue=t3.id; render(); ok(/data-act="go" disabled/.test(els.app.innerHTML)&&/data-act="manual" >/.test(els.app.innerHTML),'game-modes：只有 PC 時能手寫，但本地派工仍停用');}
    else ok(S.st.manual===m0&&btn.includes('disabled')&&btn.includes('本地 GPU 跑 agent 中，電腦卡到沒辦法手寫'),'ticket-lifecycle：沒買電腦時本地 agent 在跑不能手寫',btn);
  }
  newRun('laravel','parallel'); {const run=ticket('laravel',3,{running:true}), t2=ticket('fe',1); S.issues=[run,t2]; S.jobs=[localJob(run)]; S.hw.pc=S.hw.spark=S.hw.mac=true;
  sel.issue=t2.id; Object.assign(sel,{v:'local',m:'gemma4',b:'local'}); dispatch();
  ok(S.jobs.length===1&&!t2.running,'local-hardware：三台都買了，本地還是一次只跑一個 agent');}
  /* 閒置扣信任 */
  const idleDay=(hw,act,trust=60,mode='serial')=>{newRun('laravel',mode); hw.forEach(k=>S.hw[k]=true); S.trust=trust; act(); S.hours=0; end(); return S.trust;};
  const send=m=>()=>quiet(()=>{const t=ticket('fe',1); S.issues.push(t); sel.issue=t.id; Object.assign(sel,{v:'local',m,b:'local',rv:0}); dispatch();});
  ok(idleDay(['pc','spark'],send('gemma'))===58&&els.mo.innerHTML.includes('電腦閒置：NVIDIA DGX Spark 今天沒用到，主管覺得白買了（信任 -2）。'),'local-hardware：PC＋Spark 只派 Gemma 4 26B A4B → Spark 閒置 -2');
  ok(idleDay(['pc','spark'],send('gemma4'))===60,'local-hardware：派 Gemma 4 31B 兩台都算用到');
  ok(idleDay(['pc','spark'],send('qcnext'))===60,'local-hardware：派 Qwen3-Coder-Next 兩台都算用到');
  ok(idleDay(['pc','spark'],()=>{})===56,'local-hardware：PC＋Spark 都沒用 -4');
  ok(idleDay(['pc','spark','mac'],()=>{},1)===0,'local-hardware：閒置扣到 0 為止');
  ok(idleDay(['pc'],()=>{const run=ticket('laravel',3,{running:true}), t=ticket('fe',1); S.issues.push(run,t); S.jobs=[localJob(run)]; S.jobs[0].left=20; sel.issue=t.id; Object.assign(sel,{v:'local',m:'gemma',b:'local'}); dispatch();},60,'parallel')===58,'local-hardware：被擋下的本地派工不算用到');
  newRun('laravel'); S.hwReq={k:'spark',day:1}; S.day=3; S.hours=0; end(); S.hours=0; end();
  ok(S.day===5&&S.trust===68&&els.mo.innerHTML.includes('電腦閒置：NVIDIA DGX Spark'),'local-hardware：到貨當天沒用就扣 2');
  newRun('laravel'); S.hw.pc=S.hw.spark=true; S.day=5; send('gemma4')(); S.hours=0; end();
  ok(S.trust===70&&Object.values(S.hwUsed).every(x=>!x)&&Object.values(JSON.parse(store[St.SAVE_KEY]).S.hwUsed).every(x=>!x),'local-hardware：第 5 天有用不扣，開工時使用紀錄清空、存檔也是空的');
  S.hours=0; end(); ok(S.trust===66,'local-hardware：第 6 天沒用 PC、Spark 各扣 2');
  /* 舊存檔 */
  newRun('laravel'); S.day=5; St.saveGame({rep:[],ev:null,monday:false});
  {const d=JSON.parse(store[St.SAVE_KEY]); delete d.S.hw; delete d.S.hwReq; delete d.S.hwUsed; store[St.SAVE_KEY]=JSON.stringify(d);}
  {const d=St.readSave(); ok(d&&!d.bad,'local-hardware：沒有電腦欄位的舊存檔讀得到'); St.loadGame(d);
  ok(S.day===5&&Object.values(S.hw).every(x=>!x)&&S.hwReq===null&&Object.values(S.hwUsed).every(x=>!x)&&dataModule.HW_KEYS.every(k=>A.hwReqBlock(k)===''),'local-hardware：舊存檔當作沒買電腦、每台都能申請');}
  }

  /* rules-reference（gh-20-01-rules-modal） */
  {
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const tabIds=()=>[...els.mo.innerHTML.matchAll(/data-rtab="(\w+)"/g)].map(m=>m[1]);
  const selTab=()=>els.mo.innerHTML.match(/class="sb sel" data-rtab="(\w+)"/)?.[1];
  newRun('laravel'); els.ov.hidden=true; Ru.showRules();
  ok(els.mo.innerHTML.includes('<h2>遊戲規則</h2>')&&tabIds().join()==='basic,dispatch,billing,tickets,invest,score'&&selTab()==='basic'&&!els.ov.hidden,'rules-reference：第一次打開有六個分頁、選中基本');
  ok(Ru.RULE_TABS.map(t=>t.title).join()==='基本,派工與成功率,付費與稽核,工單與陷阱,投資與電腦,結算','rules-reference：分頁標題與順序');
  for(const t of Ru.RULE_TABS){press({rtab:t.id}); ok(selTab()===t.id&&els.mo.innerHTML.includes(Ru.rulesTab(t.id)),`rules-reference：點 ${t.title} 會選中並顯示內容`);}
  press({rtab:'score'}); ok(els.mo.innerHTML.includes('總分 = KPI ×'),'rules-reference：結算分頁顯示總分公式');
  /* gh-26-01-money-off-score：錢不算分、錢包用光就停、外包 KPI × 250、起始錢包 */
  ok(Ru.rulesTab('score').includes('總分 = KPI × 10 + 信任 × 4 − 稽核次數 × 80。')&&Ru.rulesTab('score').includes('錢不算分')&&!Ru.rulesTab('score').includes('÷'),'rules-reference：結算分頁寫新公式、錢不算分');
  ok(Ru.rulesTab('basic').includes('個人錢包 NT$8,000')&&Ru.rulesTab('basic').includes('錢包不夠付這次的訂閱就不能確認'),'rules-reference：基本分頁寫起始錢包 NT$8,000 與訂閱要付得起');
  ok(Ru.rulesTab('billing').includes('agent 停在一半')&&Ru.rulesTab('billing').includes('錢包 NT$0 以下時不能選'),'rules-reference：付費分頁寫錢包見底的規則');
  ok(Ru.rulesTab('tickets').includes('報酬 = KPI × 250')&&Ru.rulesTab('tickets').includes('可能變成負數'),'rules-reference：工單分頁寫外包報酬與違約金可扣成負數');
  press({rtab:'invest'}); press({act:'close'}); ok(els.ov.hidden,'rules-reference：從標頭打開，關閉後隱藏彈窗');
  Ru.showRules(); ok(selTab()==='invest','rules-reference：同一次開頁記住上次的分頁');
  ok(Ru.rulesTab('nope')===Ru.rulesTab('basic'),'rules-reference：未知分頁退回基本');
  ok(Ru.rulesTab('basic').includes('天數 × 7')&&Ru.rulesTab('basic').includes('第 6 天前'),'rules-reference：基本分頁說明主管事件的 KPI 門檻與第一週只提醒');
  press({rtab:'nope'}); ok(selTab()==='basic','rules-reference：點到未知分頁 id 時選中基本');
  press({act:'close'});
  }

  {
  const plain=id=>Ru.rulesTab(id).replace(/ data-h="[^"]*"/g,''); // 窄螢幕卡片用的欄名屬性不影響比對
  const sc=plain('score'), bi=plain('billing'), iv=plain('invest'), D=dataModule;
  ok(M.GRADES.join()==='4300,3300,2500,1700'&&M.PAR_GRADE===1.6&&M.GRADES.every(t=>sc.includes(`<td>${t}</td>`)&&sc.includes(`<td>${Math.round(t*M.PAR_GRADE)}</td>`))&&sc.includes('<td>6880</td>'),'rules-reference：結算分頁列出單線與平行模式的評等門檻');
  ok(['kpi','trust','audit'].every(k=>sc.includes(`× ${M.SCORE[k]}`)),'rules-reference：結算分頁的總分權重來自 SCORE');
  ok(plain('tickets').includes(`評估時間 ×${D.MCP_EVAL_HRS}`),'rules-reference：MCP 評估時間倍率來自常數');
  ok(bi.includes(D.nt(A.CORP_DAY_LIMIT))&&bi.includes(`信任 −${A.AUDIT_TRUST}`)&&bi.includes(SEAT.trust.join('／')),'rules-reference：付費分頁的公司單日上限、稽核扣分、席位門檻來自常數');
  ok(['md',...D.INV_KEYS].every(k=>{const I=D.INVEST[k];return iv.includes(I.name)&&iv.includes(`<td>${I.hrs}h</td>`)&&iv.includes(`<td>${D.nt(I.cost)}</td>`)&&iv.includes(I.desc);}),'rules-reference：投資分頁列出每項投資的工時、預算與效果');
  ok(D.HW_KEYS.every(k=>{const H=D.HW[k];return iv.includes(H.name)&&iv.includes(`<td>${H.trust}</td>`)&&iv.includes(H.price);}),'rules-reference：投資分頁列出每台電腦的價格與信任門檻');
  ok(plain('dispatch').includes(`<td>${Math.round(C.P_STEP[1]*100)}%</td>`)&&plain('tickets').includes(`<td>${KPI[5]}</td>`),'rules-reference：成功率表與 KPI 表來自常數');
  }

  {
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const clickApp=ds=>els.app.on.click({target:{closest:()=>({dataset:ds,disabled:false})}});
  newRun('laravel'); render(); ok(els.app.innerHTML.includes('data-act="rules"'),'rules-reference：標頭有規則按鈕');
  St.saveGame(null); const snap=JSON.stringify(S), save=store[St.SAVE_KEY]; els.ov.hidden=true;
  clickApp({act:'rules'}); ok(!els.ov.hidden&&els.mo.innerHTML.includes('遊戲規則'),'rules-reference：點標頭規則按鈕打開規則');
  press({rtab:'billing'}); press({act:'close'});
  ok(els.ov.hidden&&JSON.stringify(S)===snap&&store[St.SAVE_KEY]===save,'rules-reference：開關規則不改狀態、不寫存檔');
  M.showDay(['測試'],null,false); ok(!els.mo.innerHTML.includes('data-act="rules"'),'rules-reference：早上報告沒有規則入口');
  S.day=20; showEnd(); ok(!els.mo.innerHTML.includes('data-act="rules"'),'rules-reference：月底結算沒有規則入口');
  }

  {
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  newRun('laravel','parallel'); S.outsource=false; showSetup(false);
  ok(els.mo.innerHTML.includes('看完整規則')&&els.mo.innerHTML.includes('data-act="rules"'),'rules-reference：開局彈窗有看完整規則');
  press({out:'1'}); press({mode:'serial'}); press({act:'rules'});
  ok(els.mo.innerHTML.includes('遊戲規則')&&!els.mo.innerHTML.includes('data-out'),'rules-reference：從開局彈窗打開規則');
  press({rtab:'tickets'}); press({act:'close'});
  ok(!els.ov.hidden&&/class="sb sel" data-out="1"/.test(els.mo.innerHTML)&&/class="sb sel" data-mode="serial"/.test(els.mo.innerHTML),'rules-reference：關閉規則回到開局彈窗、接外包與單線模式仍選著');
  press({act:'confirm'}); ok(S.outsource===true&&S.mode==='serial'&&els.ov.hidden,'rules-reference：回到開局彈窗後開始第 1 天照選擇開局');
  showSetup(true); ok(els.mo.innerHTML.includes('看完整規則'),'rules-reference：週一調整訂閱也有看完整規則');
  press({act:'rules'}); press({act:'close'}); ok(!els.ov.hidden&&els.mo.innerHTML.includes('週一：調整訂閱'),'rules-reference：關閉規則回到調整訂閱');
  press({act:'close'});
  }

  /* 執行紀錄（gh-25-01-log-history） */
  {
  newRun('laravel'); S.log=[]; for(let i=0;i<120;i++) C.log('dim',`entry ${i}`);
  ok(S.log.length===120&&S.log[119].msg.endsWith('entry 0'),'action-log：超過 80 筆仍保留第一筆',S.log.length);
  start(); ok(!S.log.some(l=>l.msg.includes('entry ')),'action-log：開新局清空紀錄');
  const pick=(v,m,b,rv=0)=>Object.assign(sel,{v,m,b,rv,ef:1});
  const line=s=>S.log.find(l=>l.msg.includes(s))?.msg||'';
  /* 派工決策 */
  newRun('laravel','parallel'); S.day=3; S.hours=8; S.presets=DEFAULT_PRESETS.map(p=>({...p})); S.outage='deepseek';
  const d1=ticket('laravel',2,{due:4,title:'修正標籤頁分頁'}); S.issues=[d1];
  const pe1=Math.round(est(d1,'anthropic','sonnet',1,1).pe*100);
  quick(d1.id); const l1=line('→ 派出 修正標籤頁分頁');
  ok(new RegExp(`^D03 → 派出 修正標籤頁分頁（複雜度 2・第 4 天到期）｜Claude Code / Sonnet・公司 API・自審｜成功率 ${pe1}%｜一鍵派工方案 B｜預計 [\\d.]+h$`).test(l1),'action-log：平行一鍵派工記下完整決策',l1);
  newRun('laravel'); S.day=2; S.hours=8; const d2=ticket('fe',1,{due:2}); S.issues=[d2]; pick('anthropic','sonnet','api'); sel.issue=d2.id;
  withRand(.5,()=>dispatch());
  ok(S.log[1].msg.startsWith('D02 → 派出 t（複雜度 1・今天到期）｜Claude Code / Sonnet・個人 API・不審核｜成功率 ')&&S.log[1].msg.includes('｜派工台｜')&&S.log[0].msg.startsWith('D02 ✓ t'),'action-log：單線派出那行在結果前面',S.log[1].msg);
  newRun('laravel','parallel'); S.hours=8; S.inv.skills=true; S.presets=DEFAULT_PRESETS.map(p=>({...p})); S.issues=[ticket('laravel',1)];
  batch(); ok(line('→ 派出').includes('｜批次派工方案 A｜'),'action-log：批次派工寫出方案',line('→ 派出'));
  newRun('laravel','parallel'); S.day=3; S.slots=6; S.hours=8; pick('anthropic','sonnet','api');
  const tg=[[ticket('laravel',3,{due:3,inc:true}),'（複雜度 3・今天到期・事故）'],[ticket('laravel',2,{due:9,sens:true}),'（複雜度 2・第 9 天到期・機敏）'],[ticket('laravel',1,{due:5,out:true,pay:400}),'（複雜度 1・第 5 天到期・外包）']];
  for(const [is,want] of tg){S.issues.push(is); sel.issue=is.id; dispatch(); ok(S.log.some(l=>l.msg.includes(`→ 派出 t${want}｜`)),`action-log：標籤 ${want}`,line('→ 派出'));}
  newRun('laravel','parallel'); S.hours=8; pick('deepseek','chat','api');
  const tp=ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4]}); S.issues=[tp]; sel.issue=tp.id;
  const peT=Math.round(est(tp,'deepseek','chat',0,1).pe*100); dispatch();
  ok(line('→ 派出 t（複雜度 1・').includes(`成功率 ${peT}%`)&&peT>=90,'action-log：沒曝光的陷阱記顯示的複雜度與成功率',line('→ 派出'));
  /* 結果與評估寫付費方式 */
  newRun('laravel'); S.hours=8; const fx=ticket('laravel',2); S.issues=[fx]; pick('deepseek','chat','api'); sel.issue=fx.id;
  withRand(.99,()=>dispatch());
  ok(S.log[0].msg.includes('Claude Code 接 DeepSeek API / Chat・個人 API｜')&&S.log[0].msg.includes('測試沒過，改壞了'),'action-log：失敗那行寫付費方式',S.log[0].msg);
  newRun('laravel'); S.hours=8; const ev1=ticket('laravel',2); S.issues=[ev1]; pick('anthropic','opus','corp'); sel.issue=ev1.id;
  evaluate();
  ok(S.log[0].msg.includes('｜評估｜Claude Code / Opus・公司 API｜評估完成，看起來沒問題'),'action-log：評估那行寫模型與付費方式',S.log[0].msg);
  newRun('laravel'); S.hours=8; const okx=ticket('laravel',1); S.issues=[okx]; pick('anthropic','sonnet','corp',1); sel.issue=okx.id;
  withRand(0,()=>dispatch());
  ok(S.log[0].msg.includes('✓ t｜Claude Code / Sonnet・公司 API・自審｜'),'action-log：成功那行寫付費方式與審核',S.log[0].msg);
  /* 等待 */
  newRun('laravel','parallel'); S.hours=7; A.wait(false);
  ok(S.log[0].msg.endsWith('· 等待 1.0h（10:00→11:00）'),'action-log：10:00 等 1 小時',S.log[0].msg);
  S.hours=.5; A.wait(false); ok(S.log[0].msg.endsWith('· 等待 0.5h（16:30→17:00）'),'action-log：16:30 等待到 17:00 為止',S.log[0].msg);
  const n0=S.log.length; A.wait(false); ok(S.log.length===n0,'action-log：沒有時間可等就不寫紀錄');
  newRun('laravel','parallel'); S.hours=8; pick('anthropic','sonnet','corp'); const wj=ticket('laravel',1); S.issues=[wj]; sel.issue=wj.id; withRand(0,()=>dispatch());
  withRand(.99,()=>A.wait(true)); const wi=S.log.findIndex(l=>l.msg.includes('· 等到下一個 agent 完成')), ri=S.log.findIndex(l=>l.msg.includes('✓ t'));
  ok(wi>ri&&ri>=0,'action-log：等待那行比等待期間的結果舊',S.log.slice(0,4).map(l=>l.msg).join(' / '));
  /* 隨機事件、新的一週、逾期總數 */
  newRun('laravel'); S.day=6; S.kpi=0; withRand([0,.8,.5],endDay);
  ok(S.log.some(l=>l.msg==='D07 ◆ 主管問進度怎麼這麼慢｜「KPI 才 0，要超過 49 才跟得上進度。」信任 -4。'),'action-log：隨機事件寫進紀錄',line('◆'));
  newRun('laravel'); S.day=5; withRand(.99,endDay); ok(/^D06 — 第 6 天開工・新的一週，每週額度重置，新進 \d+ 張工單(，外包 \d+ 張)? —$/.test(S.log[0].msg),'action-log：第 6 天開工寫新的一週',S.log[0].msg);
  newRun('laravel'); S.day=6; withRand(.99,endDay); ok(!S.log[0].msg.includes('新的一週'),'action-log：第 7 天不寫新的一週');
  newRun('laravel'); S.day=4; S.issues=[ticket('laravel',2,{due:4}),ticket('laravel',3,{due:4,inc:true,kpi:13})]; withRand(.99,endDay);
  ok(els.mo.innerHTML.includes('2 張工單逾期，主管信任 -12。'),'ticket-lifecycle：早上報告寫逾期扣信任總數');
  newRun('laravel'); S.day=4; S.inv.monitor=true; S.issues=[ticket('laravel',3,{due:4,inc:true,kpi:13})]; withRand(.99,endDay);
  ok(S.log.some(l=>l.msg.includes('⌛ 逾期：')&&l.msg.endsWith('｜信任 -4'))&&els.mo.innerHTML.includes('1 張工單逾期，主管信任 -4。'),'action-log：有監控告警時事故逾期寫信任 -4');
  /* 下班總結 */
  newRun('laravel'); S.day=3; S.dayStart={kpi:37,trust:70,wallet:7360,corp:11310}; Object.assign(S,{kpi:61,trust:62,wallet:7240,corp:10900,corpDay:0}); withRand(.99,endDay);
  ok(line('═ 第 3 天下班')==='D03 ═ 第 3 天下班｜KPI +24（61）｜信任 -8（62）｜錢包 -NT$120（NT$7,240）｜公司 -NT$410（NT$10,900）','action-log：下班總結的格式與差值',line('═'));
  ok(S.dayStart.kpi===S.kpi&&S.dayStart.wallet===S.wallet,'action-log：換日後重設當天基準');
  newRun('laravel'); S.day=20; withRand(.99,endDay); ok(line('═ 第 20 天下班').startsWith('D20 ')&&els.mo.innerHTML.includes('再玩一個月'),'action-log：第 20 天下班也有總結、之後開結算');
  newRun('laravel'); S.day=7; S.wallet=5000; withRand([0,.9,.5],endDay);
  ok(line('◆ 外包案尾款入帳')&&A.daySummary().includes('｜錢包 +NT$1,500（NT$6,500）｜'),'action-log：早上的事件算進新的一天',A.daySummary());
  newRun('laravel'); S.dayStart=St.daySnap(); ok(A.daySummary().endsWith('KPI ±0（0）｜信任 ±0（70）｜錢包 ±NT$0（NT$8,000）｜公司 ±NT$0（NT$12,000）'),'action-log：沒有變化寫 ±0',A.daySummary());
  {const raw=JSON.parse(JSON.stringify(S)); delete raw.dayStart; raw.day=5; raw.kpi=40; St.loadGame({S:raw,sel:{...sel},uid:9});
   ok(S.dayStart&&A.daySummary()==='═ 第 5 天下班｜KPI ±0（40）｜信任 ±0（70）｜錢包 ±NT$0（NT$8,000）｜公司 ±NT$0（NT$12,000）','action-log：舊存檔沒有基準時用讀檔當下的數值',A.daySummary());}
  start(); const p0=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}}); p0({pv:'anthropic',pp:'pro'}); p0({act:'confirm'});
  ok(S.wallet<8000&&S.dayStart.wallet===S.wallet,'action-log：第 1 天基準在開局確認、扣完訂閱費之後',[S.wallet,S.dayStart.wallet].join());
  S.day=6; S.dayStart.wallet=1; showSetup(true); p0({act:'confirm'}); ok(S.dayStart.wallet===1,'action-log：週一調整訂閱不重設基準');
  }

  /* ===== 研究單（gh-21-01-research-split-tickets） ===== */
  {const R0=Math.random, rand=(seq,f)=>{const a=[].concat(seq);let i=0;Math.random=()=>a[Math.min(i++,a.length-1)];try{return f();}finally{Math.random=R0;}};
   const rt=(stack,cx,extra={})=>ticket(stack,cx,{research:true,parts:['拆單一','拆單二'],title:'研究單',...extra});
  /* research 2.1 直接派工 token ×4 */
  {newRun('laravel'); const tr=rt('fe',4,{base:550}), tn=ticket('fe',4,{base:550});
   const er=est(tr,'anthropic','sonnet',0,1), en=est(tn,'anthropic','sonnet',0,1);
   ok(near(er.tk,2200)&&near(en.tk,550)&&er.p===en.p&&near(er.hrs,en.hrs),'research：Sonnet 估前端複雜度 4 研究單 2,200k，成功率與時數不變',er.tk);
   S.presets=[{v:'anthropic',m:'sonnet',b:'api',rv:0,ef:1},...S.presets.slice(1)]; S.wallet=en.hi*.45*S.priceMod.anthropic+1;
   ok(presetBlock(tn,S.presets[0])===''&&presetBlock(tr,S.presets[0])==='錢包不夠','research：錢包夠 1 倍、不夠 4 倍時方案 A 被略過（錢包不夠）');}
  const rjob=(is,x={})=>({issue:is,v:'anthropic',m:'sonnet',ef:1,b:'corp',M:model('anthropic','sonnet'),rv:0,tk:100,hrs:1,ok:true,caught:false,left:0,hidden:false,stop:false,sdd:false,...x});
  /* research 2.4 合併衝突留下的單不是研究單 */
  {newRun('laravel','parallel'); const tr=rt('laravel',4); S.issues=[tr]; rand(0,()=>settle(rjob(tr),{conflict:1}));
   ok(tr.merge&&tr.title.startsWith('解決衝突：')&&!tr.research&&tr.cx===3,'research：直接派工的研究單合併衝突後，解決衝突單不是研究單');}
  /* research 2.2 拆單 */
  {const sp=(is)=>{newRun('laravel'); S.issues=[is]; return A.splitResearch(is).map(p=>[p.cx,is.out?p.pay:p.kpi]);};
   const rows=[[rt('laravel',4,{kpi:16}),[[2,6],[3,10]]],[rt('laravel',5,{kpi:24}),[[3,12],[3,12]]],[rt('rust',4,{kpi:21}),[[2,8],[3,13]]],[rt('laravel',4,{kpi:16,out:true,pay:1280}),[[2,512],[3,768]]]];
   for(const [is,want] of rows) ok(JSON.stringify(sp(is))===JSON.stringify(want),`research：${is.stack} 複雜度 ${is.cx}${is.out?' 外包':''} 拆成 ${JSON.stringify(want)}`,JSON.stringify(sp(is)));
   newRun('laravel'); const fin=CLIENTS.find(c=>c.ban==='api'), x=ticket('fe',1), y=ticket('fe',2), tr=rt('laravel',4,{sens:true,big:true,client:fin,due:9,tries:2,store:true});
   S.issues=[x,tr,y]; sel.issue=tr.id; const [a,b]=A.splitResearch(tr);
   ok(S.issues.length===4&&S.issues[0]===x&&S.issues[1]===a&&S.issues[2]===b&&S.issues[3]===y&&!S.issues.includes(tr),'research：兩張拆單放在原單的位置');
   ok(a.id!==tr.id&&b.id!==tr.id&&a.id!==b.id&&sel.issue===a.id,'research：拆單是新編號，派工台選第一張');
   ok(a.title==='拆單一'&&b.title==='拆單二','research：拆單標題來自研究標題池的兩張拆單');
   ok([a,b].every(p=>p.sens&&p.client===fin&&p.due===9&&p.store&&p.stack==='laravel'&&!p.research&&!p.trap&&!p.inc&&!p.merge&&!p.evaluated&&!p.revealed&&p.tries===0&&p.trueCx===p.cx&&p.base>=BASE[p.cx]*.85&&p.base<=BASE[p.cx]*1.15),'research：拆單沿用機敏、案主、期限、上架審核，沒有陷阱與失敗次數');
   ok(!a.big&&b.big,'research：只有複雜度 ≥3 的拆單保留大型 codebase');}
  /* research 2.3 agent 研究與自己研究 */
  {const pick3=(is,v,m,b)=>{S.issues=[is]; Object.assign(sel,{issue:is.id,v,m,b,rv:0,ef:1});};
   newRun('laravel'); let tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); const w0=S.wallet;
   ok(A.researchCost(model('anthropic','sonnet'),'anthropic').tk===40,'research：Sonnet 研究 40k tokens');
   A.research('agent');
   ok(near(w0-S.wallet,18)&&near(S.hours,7.6)&&S.issues.length===2&&!S.issues.includes(tr),'research：Sonnet 個人 API 研究扣 NT$18、0.4h、拆成兩張',`${w0-S.wallet} ${S.hours}`);
   newRun('laravel'); S.subs.anthropic='pro'; tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','sub'); const L=quotaLeft('sub','anthropic'); S.used.sub.anthropic.d+=L-30; S.used.sub.anthropic.w+=L-30;
   A.research('agent');
   ok(near(quotaLeft('sub','anthropic'),0)&&S.issues.length===1&&S.issues[0]===tr&&tr.research&&S.log[0].msg.includes('額度不夠，研究沒做完'),'research：額度只剩 30k 時研究沒做完、不拆單',S.log[0]?.msg);
   newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); S.wallet=5; A.research('agent');
   ok(S.wallet===0&&S.issues.length===1&&S.issues[0]===tr&&tr.research&&S.log[0].msg.includes('錢包見底，研究沒做完'),'research：個人 API 錢包只剩 NT$5 時研究沒做完、不拆單（gh-26-01）',S.log[0]?.msg);
   newRun('laravel'); tr=rt('laravel',4,{out:true,pay:1280,client:GIG_CLIENT}); pick3(tr,'anthropic','sonnet','corp'); const snap=JSON.stringify([S.corp,S.hours,S.issues.length]);
   const ev=[]; globalThis.gtag=(k,n,p)=>ev.push(n); A.research('agent'); delete globalThis.gtag;
   ok(JSON.stringify([S.corp,S.hours,S.issues.length])===snap&&tr.research&&!ev.length,'research：外包研究單選公司 API 時不動作、不送事件');
   for(const [st,h] of [['laravel',1.5],['rust',3],['fe',1.5]]){newRun('laravel'); tr=rt(st,4); pick3(tr,'anthropic','sonnet','api'); A.research('self'); ok(near(S.hours,8-h)&&S.issues.length===2,`research：Laravel 自己研究 ${st} 研究單花 ${h}h`,S.hours);}
   newRun('laravel'); S.hours=1; tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('self'); ok(S.hours===1&&S.issues[0]===tr&&tr.research,'research：剩 1h 時不能自己研究');
   newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); ok(!canEvaluate(tr),'research：研究單不能評估架構');
   const h0=S.hours; evaluate(); ok(S.hours===h0&&!tr.evaluated,'research：在研究單上評估架構不動作');
   newRun('laravel','parallel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('agent'); ok(near(S.hours,7.6)&&S.issues.length===2&&!tr.running,'research：平行模式研究推進時鐘 0.4h');
   newRun('laravel'); tr=rt('laravel',4,{sens:true}); pick3(tr,'deepseek','chat','api'); rand(0,()=>A.research('agent')); ok(S.st.audits===1&&S.trust===58,'research：機敏研究單走個人 API 要擲資安稽核');
  /* research 2.3 被擋下的研究：什麼都不變、不送事件 */
   {const ev=[]; globalThis.gtag=(k,n)=>ev.push(n);
    const refused=(name,setup,via='agent',mode='serial')=>{newRun('laravel',mode); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); setup(tr); ev.length=0;
      const snap=JSON.stringify([S.hours,S.wallet,S.corp,S.trust,S.issues.map(i=>i.id),S.jobs.length]);
      ok(A.researchBlock(tr,via)!=='','research：'+name+'時 researchBlock 回傳原因',A.researchBlock(tr,via)); A.research(via);
      ok(JSON.stringify([S.hours,S.wallet,S.corp,S.trust,S.issues.map(i=>i.id),S.jobs.length])===snap&&tr.research&&!ev.includes('research'),'research：'+name+'時研究不動作、不送事件');};
    refused('廠商當天當機',()=>{S.outage='anthropic';});
    refused('案主禁用模型',t=>{t.client=CLIENTS.find(c=>c.ban==='api'); Object.assign(sel,{v:'deepseek',m:'chat'});});
    refused('模型需要沒買的電腦',()=>{Object.assign(sel,{v:'local',m:'glm53',b:'local'});});
    refused('本地 GPU 忙',()=>{Object.assign(sel,{v:'local',m:'qwen',b:'local'}); S.jobs=[rjob(ticket('fe',1),{b:'local',v:'local',M:model('local','qwen'),left:3})];},'agent','parallel');
    refused('工時不夠 agent 研究',()=>{S.hours=.3;});
    refused('本地 GPU 卡住不能手寫時自己研究',()=>{S.jobs=[rjob(ticket('fe',1),{b:'local',v:'local',M:model('local','qwen'),left:3})];},'self','parallel');
    refused('研究單正在跑',t=>{t.running=true;});
    newRun('laravel'); tr=rt('laravel',4); tr.running=true; ok(A.researchBlock(tr,'agent')==='這張單正在跑'&&A.researchBlock(ticket('fe',4),'agent')==='不是研究單','research：正在跑與不是研究單回傳不同原因');
    delete globalThis.gtag;}
   newRun('laravel'); S.corp=5; tr=rt('laravel',4); pick3(tr,'anthropic','opus','corp'); A.research('agent');
   ok(S.corp===0&&S.trust===62&&S.issues.length===2&&S.log.some(l=>l.msg.includes('公司 API 預算透支')),'research：研究刷公司 API 透支時信任 -8、預算歸零',`${S.corp} ${S.trust}`);
   newRun('laravel','parallel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('self'); ok(near(S.hours,6.5)&&S.issues.length===2&&!tr.running,'research：平行模式自己研究推進時鐘 1.5h');
  /* research 拆單逾期：同一張原單信任只扣一次 */
   {const lateRun=origs=>{newRun('laravel'); S.day=9; S.kpi=50; S.issues=[]; for(const o of origs){S.issues.push(o); A.splitResearch(o);} rand(.99,endDay);};
    lateRun([rt('laravel',4,{kpi:16,due:9})]);
    ok(S.trust===66&&S.kpi===42&&S.st.late===2&&els.mo.innerHTML.includes('2 張工單逾期，主管信任 -4。')&&S.log.some(l=>l.msg.includes('⌛ 逾期：拆單二｜KPI -5｜信任 -0')),'research：同一張研究單拆出的兩張都逾期時信任只扣 4、KPI 各扣一半',`${S.trust} ${S.kpi}`);
    lateRun([rt('laravel',4,{kpi:16,due:9}),rt('laravel',5,{kpi:24,due:9})]);
    ok(S.trust===62&&S.st.late===4,'research：兩張不同研究單的拆單都逾期時各扣一次（-8）',`${S.trust}`);
    ok(A.splitResearch.length===1&&(()=>{newRun('laravel'); const o=rt('laravel',4); S.issues=[o]; return A.splitResearch(o).every(p=>p.from===o.id);})(),'research：拆單記住原單 id');}
  /* research 3.1 卡片與派工台 */
   newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); render(); const h=els.app.innerHTML;
   ok(h.includes('<span class="chip rsch">需研究</span>')&&h.includes('直接派工 token ×4（先研究可拆成兩張小單）'),'research：研究單卡片顯示需研究與 ×4 提示');
   ok(h.includes('先讓 agent 研究拆單（40k tokens，0.4h）')&&h.includes('自己研究拆單（1.5h，0 token）')&&!h.includes('先讓 agent 評估架構'),'research：派工台顯示兩個研究按鈕、沒有評估架構');
   S.issues=[ticket('laravel',4)]; sel.issue=S.issues[0].id; render(); ok(!els.app.innerHTML.includes('需研究')&&!els.app.innerHTML.includes('研究拆單'),'research：一般工單沒有研究標示與按鈕');
   newRun('laravel'); tr=rt('laravel',4); S.hours=1; pick3(tr,'anthropic','sonnet','api'); render(); ok(/data-act="selfresearch" disabled/.test(els.app.innerHTML)&&!/data-act="research" disabled/.test(els.app.innerHTML),'research：工時不夠自己研究時按鈕停用，agent 研究照常');
   const clk=ds=>els.app.on.click({target:{closest:()=>({dataset:ds,disabled:false})}});
   newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); clk({act:'selfresearch'}); ok(S.issues.length===2&&!S.issues.includes(tr),'research：按自己研究拆單會拆單');}
  /* research 3.2 GA 事件與紀錄 */
  {const ev=[]; globalThis.gtag=(k,n,p)=>ev.push({n,p}); const pick3=(is,v,m,b)=>{S.issues=[is]; Object.assign(sel,{issue:is.id,v,m,b,rv:0,ef:1});};
   newRun('laravel'); let tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); rand(.5,dispatch);
   const d=ev.find(e=>e.n==='dispatch'), jr=ev.find(e=>e.n==='job_result');
   ok(d?.p.research===true&&jr?.p.research===true,'research：直接派工研究單時 dispatch 與 job_result 的 research 是 true');
   ok(S.log.some(l=>l.msg.includes('→ 派出 研究單（複雜度 4・第 20 天到期・需研究）')),'research：派工紀錄的標籤有需研究');
   ev.length=0; newRun('laravel'); const tn=ticket('laravel',2); pick3(tn,'anthropic','sonnet','api'); rand(.5,dispatch);
   ok(ev.find(e=>e.n==='dispatch')?.p.research===false&&ev.find(e=>e.n==='job_result')?.p.research===false,'research：一般工單的 research 是 false');
   ev.length=0; newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('self');
   const r=ev.filter(e=>e.n==='research');
   ok(r.length===1&&r[0].p.via==='self'&&r[0].p.vendor==='none'&&r[0].p.model==='none'&&r[0].p.bill==='none'&&r[0].p.cx===4&&r[0].p.stack==='laravel'&&r[0].p.gig===false&&r[0].p.outcome==='split','research：自己研究送一筆 research 事件（self、none、split）',JSON.stringify(r[0]?.p));
   ok(/^D01 ✂ 研究單｜自己研究｜拆成「拆單一」（複雜度 2）＋「拆單二」（複雜度 3）｜1\.5h$/.test(S.log[0].msg),'research：自己研究的紀錄',S.log[0].msg);
   ev.length=0; newRun('laravel'); tr=rt('laravel',5); pick3(tr,'anthropic','sonnet','api'); A.research('agent');
   ok(ev.filter(e=>e.n==='research').length===1&&ev.find(e=>e.n==='research').p.via==='agent'&&ev.find(e=>e.n==='research').p.model==='sonnet'&&ev.find(e=>e.n==='research').p.bill==='api','research：agent 研究送 research 事件（agent、sonnet、api）');
   ok(/^D01 ✂ 研究單｜研究｜Claude Code \/ Sonnet・個人 API｜拆成「拆單一」（複雜度 3）＋「拆單二」（複雜度 3）｜40k tokens｜NT\$18｜0\.4h$/.test(S.log[0].msg),'research：agent 研究的紀錄',S.log[0].msg);
   ev.length=0; newRun('laravel'); S.subs.anthropic='pro'; tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','sub'); const L=quotaLeft('sub','anthropic'); S.used.sub.anthropic.d+=L-30; S.used.sub.anthropic.w+=L-30; A.research('agent');
   ok(ev.find(e=>e.n==='research')?.p.outcome==='quota'&&/^D01 ✗ 研究單｜研究｜Claude Code \/ Sonnet・個人訂閱｜額度不夠，研究沒做完｜額度 30k$/.test(S.log[0].msg),'research：額度不夠時 outcome 是 quota',S.log[0].msg);
   ev.length=0; newRun('laravel'); S.hours=1; tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('self'); ok(!ev.length,'research：被擋下的研究不送事件');
   delete globalThis.gtag;}
  /* research 3.3 規則 modal */
  {const t=Ru.rulesTab('tickets');
   ok(['研究單','30%','token ×4','40k × token 倍率','0.5h × 速度','花 1.5h','複雜度 4 → 2＋3','複雜度 5 → 3＋3'].every(x=>t.includes(x)),'research：工單與陷阱分頁說明研究單的比例、倍率、研究代價與拆法');}
  /* research 1.4 舊存檔沒有研究欄位 */
  {newRun('laravel'); S.day=5; const old=ticket('laravel',4); delete old.research; S.issues=[old,ticket('fe',2)]; resetStore(); St.saveGame(null);
   const raw=JSON.parse(store[St.SAVE_KEY]); raw.S.issues.forEach(i=>{delete i.research;delete i.parts;}); resetStore({[St.SAVE_KEY]:JSON.stringify(raw)});
   const r=St.readSave(); ok(St.SAVE_VER===1&&r&&!r.bad,'research：沒有研究欄位的舊存檔可以讀，SAVE_VER 仍是 1');
   St.loadGame(r); sel.issue=S.issues[0].id; render();
   ok(S.day===5&&!els.app.innerHTML.includes('需研究')&&!els.app.innerHTML.includes('研究拆單')&&est(S.issues[0],'anthropic','sonnet',0,1).tk===est(ticket('laravel',4,{base:S.issues[0].base}),'anthropic','sonnet',0,1).tk,'research：舊存檔的工單照一般工單處理');
   newRun('laravel'); S.day=3; S.issues=[rt('laravel',4)]; resetStore(); St.saveGame(null); St.loadGame(St.readSave());
   ok(S.issues[0].research&&S.issues[0].parts.join()==='拆單一,拆單二','research：研究單存檔讀檔後保留研究標記與拆單標題');}
  }
  /* 工程投資面板收合（gh-22-02-invest-panel-collapse） */
  {
  const FK='tokgame-invfold', clickApp=ds=>els.app.on.click({target:{closest:()=>({dataset:ds})}});
  const panel=()=>{const h=els.app.innerHTML, i=h.indexOf('data-act="invfold"'); return i<0?'':h.slice(i,h.indexOf('</section>',i));};
  const open=()=>panel().includes('aria-expanded="true"')&&panel().includes('▾ 工程投資')&&panel().includes('data-inv=')&&panel().includes('data-hw=');
  const shut=()=>panel().includes('aria-expanded="false"')&&panel().includes('▸ 工程投資')&&!panel().includes('data-inv=')&&!panel().includes('data-hw=');
  newRun('laravel'); resetStore(); Vw.resetInvFold(); invest('tests'); invest('ci'); render();
  ok(open(),'invest-panel-collapse：沒有偏好時展開，列出投資與採購電腦');
  clickApp({act:'invfold'});
  ok(shut()&&panel().includes('已做 2 項')&&!panel().includes('效果維持到月底')&&store[FK]==='1','invest-panel-collapse：點標題收合，只留已做 N 項、存 1',panel());
  clickApp({act:'invfold'});
  ok(open()&&store[FK]==='0','invest-panel-collapse：再點一次展開、存 0');
  {const g0=globalThis.gtag, ev=[]; globalThis.gtag=(...a)=>ev.push(a); clickApp({act:'invfold'}); clickApp({act:'invfold'}); globalThis.gtag=g0;
   ok(ev.length===0,'invest-panel-collapse：切換不送 GA 事件',JSON.stringify(ev));}
  ok(/<h2><button class="fold" data-act="invfold"/.test(els.app.innerHTML),'invest-panel-collapse：標題仍是 h2，切換按鈕在裡面');
  for(const [v,want] of [[null,'true'],['1','false'],['0','true']]){
    resetStore(v===null?{}:{[FK]:v}); Vw.resetInvFold(); render();
    ok(panel().includes(`aria-expanded="${want}"`),`invest-panel-collapse：存的值 ${v??'沒有'} → aria-expanded ${want}`);
  }
  {const ls=global.localStorage; let threw=false, a=false, b=false;
   global.localStorage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
   try{Vw.resetInvFold(); render(); a=open(); clickApp({act:'invfold'}); b=shut();}catch(e){threw=true;}
   global.localStorage=ls;
   ok(!threw&&a&&b,'invest-panel-collapse：localStorage 失效時先展開、點了仍能收合',[threw,a,b].join());}
  resetStore(); Vw.resetInvFold(); newRun('laravel'); render(); St.saveGame(); const s1=store[St.SAVE_KEY], log1=S.log.length;
  clickApp({act:'invfold'}); St.saveGame();
  ok(s1&&store[St.SAVE_KEY]===s1&&S.log.length===log1,'invest-panel-collapse：收合不改存檔內容、不寫紀錄');
  start(); ok(shut(),'invest-panel-collapse：開新局維持收合');
  Vw.resetInvFold(); render(); ok(shut(),'invest-panel-collapse：重新整理後照存的值收合');
  resetStore(); Vw.resetInvFold();
  }
  /* 國內研討會（gh-22-01-domestic-conference） */
  {
  /* 舊存檔：投資是 true／false、沒有研討會欄位 */
  newRun('laravel'); const raw=JSON.parse(JSON.stringify(S));
  raw.inv={md:{laravel:true},tests:true,ci:false,hook:false,scan:false,fastlane:false,monitor:false,skills:false,mcp:false,sdd:false};
  delete raw.conf; delete raw.st.confFee; raw.day=4;
  resetStore({[St.SAVE_KEY]:JSON.stringify({ver:St.SAVE_VER,S:raw,sel:{...sel},uid:50,morning:{rep:[],ev:null,monday:false}})});
  const rd=St.readSave(); ok(rd&&!rd.bad,'domestic-conference：舊存檔（布林投資）沒有被丟掉');
  St.loadGame(rd);
  ok(S.inv.tests===1&&S.inv.md.laravel===1&&S.inv.ci===0&&S.inv.ai===0&&S.st.confFee===0&&S.conf.req===null&&S.conf.went.length===0,'domestic-conference：舊存檔的投資轉成等級、補上研討會欄位',JSON.stringify([S.inv,S.conf]));
  ok(near(catchRate(1,model('anthropic','sonnet')),.87),'domestic-conference：讀檔後單元測試 Lv1 的自審抓錯率 0.87');
  resetStore();
  /* 報名 */
  const D=dataModule, gaEv=[], g0=globalThis.gtag; globalThis.gtag=(k,name,p)=>gaEv.push({name,p});
  newRun('laravel'); S.day=3; S.wallet=8000; S.trust=70; const h0=S.hours; gaEv.length=0;
  ok(A.registerConf('webconf')&&S.wallet===8000-D.CONF.webconf.fee&&S.hours===h0&&S.trust===70&&S.st.confFee===D.CONF.webconf.fee&&A.confBlock('webconf')==='已報名・週末出席','domestic-conference：週三報名 WebConf，扣錢包、不花工時、不動信任');
  ok(gaEv.length===1&&gaEv[0].name==='invest'&&gaEv[0].p.investment==='conf_webconf'&&gaEv[0].p.stack==='none','domestic-conference：報名送 invest conf_webconf',JSON.stringify(gaEv));
  ok(S.log[0].msg.endsWith(`★ 報名研討會：WebConf Taiwan｜自費 NT$${D.CONF.webconf.fee.toLocaleString('en-US')}｜週末出席`),'domestic-conference：報名紀錄格式',S.log[0].msg);
  const refuse=(name,setup,key)=>{newRun('laravel'); S.wallet=8000; setup(); const snap=JSON.stringify([S.wallet,S.hours,S.conf,S.st.confFee]); gaEv.length=0;
    ok(!A.registerConf(key)&&JSON.stringify([S.wallet,S.hours,S.conf,S.st.confFee])===snap&&gaEv.length===0,`domestic-conference：${name}時不能報名`);};
  refuse('第 16 天',()=>{S.day=16;},'coscup');
  refuse('已報名別場',()=>{S.day=2; A.registerConf('hitcon'); S.day=4;},'coscup');
  refuse('已參加',()=>{S.day=8; S.conf.went=['coscup'];},'coscup');
  refuse('錢包不夠',()=>{S.day=3; S.wallet=1000;},'kubesummit');
  /* 出席 */
  newRun('laravel'); S.day=5; S.trust=70; A.registerConf('hitcon'); const w5=[S.wallet,S.corp,S.kpi,S.trust]; gaEv.length=0; withRand(.99,endDay);
  ok(S.day===6&&S.conf.went.join()==='hitcon'&&S.conf.req===null&&JSON.stringify([S.wallet,S.corp,S.kpi,S.trust])===JSON.stringify(w5),'domestic-conference：第 5 天報名 HITCON，第 6 天算去過，數值不變');
  ok(els.mo.innerHTML.includes('週末參加了 HITCON')&&els.mo.innerHTML.includes('secret scanning／脫敏 Lv2 開放')&&els.mo.innerHTML.includes('提升 agent 能力 Lv1 開放')&&S.log.some(l=>l.msg.includes('★ 週末參加了 HITCON')),'domestic-conference：早上報告與紀錄寫出開放了什麼',els.mo.innerHTML.slice(0,400));
  ok(!gaEv.some(e=>e.name==='invest'),'domestic-conference：出席不送 GA');
  newRun('laravel'); S.day=15; A.registerConf('coscup'); withRand(.99,endDay);
  ok(S.day===16&&S.conf.went.join()==='coscup'&&els.mo.innerHTML.includes('Rails、Rust 自己手寫 ×0.8（Rails、Rust 不再算不熟）'),'domestic-conference：第 15 天報名，第 16 天出席',els.mo.innerHTML.slice(0,300));
  newRun('laravel'); S.day=3; A.registerConf('coscup'); withRand(.99,endDay);
  ok(S.day===4&&S.conf.req==='coscup'&&S.conf.went.length===0,'domestic-conference：不是週一不處理報名');
  /* 技術線場：手寫加快、不再算不熟 */
  for(const [cos,went,st,cx,tries,hrs] of [['laravel',[],'laravel',2,0,4.4],['laravel',[],'rust',2,0,8.8],['laravel',['coscup'],'rust',2,0,3.52],['laravel',['webconf'],'laravel',2,0,3.52],['laravel',['hitcon'],'rust',2,0,8.8],['app',['coscup'],'rails',3,1,3*2.2*.8*.8],['laravel',['webconf'],'fe',2,0,3.52]]){
    newRun(cos); S.conf.went=[...went]; const t=ticket(st,cx,{tries});
    ok(near(manualHrs(t),hrs,1e-6),`domestic-conference：${cos} 去過 ${went.join()||'沒有'}，${st} 複雜度 ${cx} 手寫 ${hrs}h`,manualHrs(t));
  }
  newRun('laravel'); S.conf.went=['coscup']; {const rt=ticket('rust',2); S.issues=[rt]; sel.issue=rt.id; render();
   ok(!unfamiliar(rt)&&!els.app.innerHTML.includes('chip unfam')&&els.app.innerHTML.includes('3.5h'),'domestic-conference：去過 COSCUP，rust 單不顯示不熟、手寫按鈕 3.5h');}
  newRun('laravel'); S.conf.went=['webconf']; S.hours=8; {const lt=ticket('laravel',2); S.issues=[lt]; sel.issue=lt.id; manual();
   ok(near(S.hours,8-3.52,1e-6)&&!S.issues.includes(lt),'domestic-conference：去過 WebConf 手寫 laravel 複雜度 2 用 3.52h 並完成',S.hours);}
  /* Lv2 購買 */
  newRun('laravel'); S.hours=8; S.corp=12000; gaEv.length=0;
  ok(invest('tests')&&near(S.hours,4)&&S.corp===11600&&A.investBlock('tests')==='需要去過綜合場'&&gaEv.at(-1).p.investment==='tests','domestic-conference：買單元測試 Lv1，之後顯示 Lv2 的鎖定原因');
  const ref=(name,setup,k,st,want,why)=>{newRun('laravel'); setup(); const snap=JSON.stringify([S.hours,S.corp,S.inv]);
    ok(A.investBlock(k,st,want)===why&&!invest(k,st,want)&&JSON.stringify([S.hours,S.corp,S.inv])===snap,`domestic-conference：${name}時不能買（${why}）`,A.investBlock(k,st,want));};
  ref('監控告警已買',()=>{S.inv.monitor=1;},'monitor',undefined,undefined,'已完成');
  ref('單元測試 Lv2 沒去過綜合場',()=>{S.inv.tests=1;},'tests',undefined,undefined,'需要去過綜合場');
  ref('secret scanning 沒買 Lv1 就買 Lv2',()=>{S.conf.went=['hitcon'];},'scan',undefined,2,'需要先買 Lv1');
  ref('工時 5h 買 SDD',()=>{S.hours=5;},'sdd',undefined,undefined,'工時不夠');
  ref('公司預算 NT$200 買 CLAUDE.md',()=>{S.corp=200;},'md','laravel',undefined,'公司預算不夠');
  ref('CLAUDE.md Lv2 沒去過涵蓋的技術線場',()=>{S.inv.md.rust=1; S.conf.went=['webconf'];},'md','rust',undefined,'需要去過涵蓋 Rust 的技術線場');
  newRun('laravel'); S.inv.tests=1; S.conf.went=['hwdc']; S.hours=8; S.corp=11600; gaEv.length=0;
  ok(invest('tests')&&near(S.hours,7)&&S.corp===11400&&S.inv.tests===2&&A.investBlock('tests')==='已完成'&&gaEv.at(-1).p.investment==='tests2','domestic-conference：去過 HWDC 買單元測試 Lv2');
  newRun('laravel'); S.conf.went=['coscup']; S.hours=8; gaEv.length=0; invest('md','rust'); invest('md','rust');
  ok(S.inv.md.rust===2&&gaEv.map(e=>e.p.investment+'/'+e.p.stack).join()==='md/rust,md2/rust','domestic-conference：CLAUDE.md Lv1、Lv2 的 GA',JSON.stringify(gaEv.map(e=>e.p)));
  /* Lv2 效果 */
  {newRun('laravel'); const t4=ticket('laravel',4), e0=est(t4,'anthropic','sonnet',0); S.inv.md.laravel=2; const e2=est(t4,'anthropic','sonnet',0);
   ok(near(e2.p,.95)&&near(e2.tk,e0.tk*.85),'domestic-conference：CLAUDE.md Lv2 成功率 0.95、token ×0.85',[e2.p,e2.tk/e0.tk].join());}
  newRun('laravel'); S.inv.tests=2; ok(near(catchRate(1,model('anthropic','sonnet')),.95),'domestic-conference：單元測試 Lv2 自審抓錯率到上限 0.95');
  ok(near(catchRate(1,model('google','flash')),.81),'domestic-conference：單元測試 Lv2 讓 Gemini Flash 自審抓錯率 0.81');
  for(const [l,a,d] of [[1,.175,.30],[2,.0875,.15]]){newRun('laravel'); S.inv.scan=l; ok(near(auditOdds('anthropic'),a)&&near(auditOdds('deepseek'),d),`domestic-conference：secret scanning Lv${l} 稽核機率 ${a}／${d}`);}
  newRun('laravel','parallel'); S.inv.skills=2; S.hours=8; S.slots=4; S.presets=presetsOf(DEFAULT_PRESETS);
  {const b2=[1,3,4,2].map(cx=>ticket('fe',cx,{due:5})); S.issues=[...b2]; batch();
   ok(S.jobs.length===3&&S.jobs.every(j=>j.issue.cx<=3)&&!b2[2].running&&S.issues.includes(b2[2]),'domestic-conference：skills Lv2 批次派工到複雜度 3，複雜度 4 留著',S.jobs.map(j=>j.issue.cx).join());}
  newRun('laravel'); S.inv.skills=1; render(); ok(els.app.innerHTML.includes('批次派工（複雜度 ≤2）'),'domestic-conference：skills Lv1 批次派工按鈕寫 ≤2');
  S.inv.skills=2; render(); ok(els.app.innerHTML.includes('批次派工（複雜度 ≤3）'),'domestic-conference：skills Lv2 批次派工按鈕寫 ≤3');
  /* 提升 agent 能力 */
  newRun('laravel'); S.conf.went=['coscup','hitcon']; S.inv.ai=2;
  ok(near(est(ticket('fe',4),'anthropic','sonnet',0).p,.96),'domestic-conference：agent 能力 Lv2，複雜度 4 前端單 Sonnet 成功率 0.96');
  newRun('laravel'); S.conf.went=['coscup']; S.hours=8; gaEv.length=0;
  ok(invest('ai')&&S.inv.ai===1&&gaEv.at(-1).p.investment==='ai1'&&A.investBlock('ai')==='需要去過 2 場研討會'&&!invest('ai')&&S.inv.ai===1,'domestic-conference：去過 1 場只能買到 Lv1');
  {newRun('laravel'); const son=model('anthropic','sonnet'), t=ticket('rust',2), r0=revealRate(son), m0=manualHrs(t); S.inv.ai=3;
   ok(near(revealRate(son),r0)&&near(manualHrs(t),m0),'domestic-conference：agent 能力不影響評估架構與手寫');}
  /* GA：投資、Lv2 與 agent 能力、報名 */
  newRun('laravel'); S.hours=8; gaEv.length=0; invest('md','rust'); invest('md','rust');
  ok(gaEv.filter(e=>e.name==='invest').map(e=>e.p.investment+'/'+e.p.stack).join()==='md/rust','play-analytics：CLAUDE.md Rust 只送一次，沒去過研討會再買不送');
  newRun('laravel'); S.hours=8; S.conf.went=['coscup']; S.inv.md.rust=1; gaEv.length=0; invest('md','rust'); invest('ai');
  ok(gaEv.filter(e=>e.name==='invest').map(e=>e.p.investment+'/'+e.p.stack).join()==='md2/rust,ai1/none','play-analytics：Lv2 送 md2、agent 能力送 ai1',JSON.stringify(gaEv.map(e=>e.p)));
  newRun('laravel'); S.day=5; gaEv.length=0; A.registerConf('hitcon'); A.registerConf('coscup'); withRand(.99,endDay);
  ok(gaEv.filter(e=>e.name==='invest').map(e=>e.p.investment).join()==='conf_hitcon','play-analytics：報名送 conf_hitcon，同週再報與週一出席都不送',JSON.stringify(gaEv.filter(e=>e.name==='invest')));
  /* 個人花費與結算 */
  newRun('laravel'); Object.assign(S,{kpi:300,trust:50}); Object.assign(S.st,{subFee:2000,api:0,outPenalty:0,outIncome:0,audits:1,confFee:0});
  {const m0=monthScore(); S.st.confFee=3000; const m=monthScore();
   ok(m0.self===2000&&m.self===5000&&m.score===m0.score&&m.score===3120,'month-end-scoring：報名費 3,000 算進你自己掏的錢（2,000 → 5,000），總分不變 3,120',JSON.stringify([m0,m]));}
  newRun('laravel'); S.day=5; A.registerConf('coscup'); withRand(.99,endDay); S.day=10; A.registerConf('hitcon'); withRand(.99,endDay); S.day=20; showEnd();
  ok(S.conf.went.join()==='coscup,hitcon'&&els.mo.innerHTML.includes('<span>研討會</span><span>2 場</span>')&&els.mo.innerHTML.includes('<span>研討會報名費</span><span>NT$6,000</span>'),'month-end-scoring：去過 COSCUP 與 HITCON，結算顯示研討會 2 場、報名費 NT$6,000',S.st.confFee);
  newRun('laravel'); S.day=20; showEnd(); ok(!els.mo.innerHTML.includes('研討會'),'month-end-scoring：沒報名不顯示研討會兩行');
  /* 投資面板 */
  newRun('laravel'); S.inv.md.laravel=1; S.inv.tests=2; S.inv.ci=1; ok(invCount()===4,'engineering-investments：CLAUDE.md、單元測試 Lv1＋Lv2、CI 算 4 項');
  S.day=20; showEnd(); ok(els.mo.innerHTML.includes('<span>工程投資</span><span>4 項</span>'),'engineering-investments：結算顯示工程投資 4 項');
  newRun('laravel'); S.hours=8; invest('monitor'); Vw.resetInvFold(); resetStore(); render();
  ok(/data-inv="monitor"\s+disabled><b>監控告警<\/b><small>已完成/.test(els.app.innerHTML),'engineering-investments：買過監控告警的按鈕顯示已完成');
  newRun(['rails','app']); Vw.resetInvFold(); resetStore(); render();
  {const order=[...els.app.innerHTML.matchAll(/data-inv="md" data-st="(\w+)"/g)].map(m=>m[1]).join();
   ok(order==='rails,app,laravel,rust,sre,devops,fe','engineering-investments：CLAUDE.md 按鈕順序 rails、app、laravel、rust、sre、devops、fe',order);}
  {const n=(els.app.innerHTML.match(/data-conf="/g)||[]).length; ok(n===10&&els.app.innerHTML.includes('國內研討會（週末自費）'),'domestic-conference：面板有十個研討會按鈕',n);}
  newRun('laravel'); S.day=2; render(); gaEv.length=0; els.app.on.click({target:{closest:()=>({dataset:{conf:'taiwanai'}})}});
  ok(S.conf.req==='taiwanai'&&els.app.innerHTML.includes('已報名・週末出席')&&els.app.innerHTML.includes('這週已報名其他場'),'domestic-conference：點研討會按鈕報名，其他場顯示已報名其他場');
  newRun('laravel'); S.inv.md.laravel=2; S.inv.ai=1; {const t=ticket('laravel',3); S.issues=[t]; sel.issue=t.id; render();
   ok(els.app.innerHTML.includes('成功率 +15%')&&els.app.innerHTML.includes('提升 agent 能力 Lv1：成功率 +8%'),'domestic-conference：派工台提示 Lv2 數值與 agent 能力');}
  /* 規則 modal */
  {const h=Ru.rulesTab('invest'), D2=dataModule;
   ok(D2.CONF_KEYS.every(k=>h.includes(D2.CONF[k].name)&&h.includes(`NT$${D2.CONF[k].fee.toLocaleString('en-US')}`))&&h.includes('×0.8')&&h.includes('+8%')&&h.includes('單元測試 Lv2')&&h.includes('×0.25')&&h.includes('≤3')&&h.includes('+15%')&&h.includes('+20%'),'rules-reference：投資與電腦列出十場研討會、手寫 0.8、Lv2 與 agent 能力 8%');
   ok(/導入 SDD Lv2<\/td><td[^>]*>1h<\/td><td[^>]*>NT\$200<\/td><td[^>]*>[^<]*Spectra／OpenSpec／Spec Kit[^<]*token ×1\.2[^<]*\+15%[^<]*5%/.test(h)&&/導入 SDD<\/td><td[^>]*>6h<\/td><td[^>]*>NT\$500<\/td><td[^>]*>[^<]*markdown[^<]*token ×1\.1[^<]*\+8%/.test(h)&&h.includes('導入 SDD Lv2 不用研討會'),'rules-reference：投資與電腦列出 SDD 兩級、Lv2 1h NT$200 不用研討會',h.match(/導入 SDD[^]*?<\/tr>/g)?.join(' | '));
   const hd=Ru.rulesTab('dispatch'), ht=Ru.rulesTab('tickets');
   ok(hd.includes('開發流程')&&hd.includes('每張單選 SDD')&&hd.includes('已買的最高級'),'rules-reference：派工與成功率寫出每張單選 SDD 與方案降級');
   ok(ht.includes('40%')&&ht.includes('markdown 只燒 15%')&&ht.includes('框架 只燒 5%'),'rules-reference：工單與陷阱寫出 SDD 各級陷阱燒的比例');
   ok(Ru.rulesTab('score').includes('研討會報名費'),'rules-reference：個人花費包含研討會報名費');}
  globalThis.gtag=g0;
  }
  /* ===== 玩家中止背景 agent（gh-32-01-abort-agent） ===== */
  {
  const run=(is,x={})=>{S.issues.push(is); is.running=true; const j={issue:is,v:'anthropic',m:'opus',ef:1,b:'api',M:model('anthropic','opus'),rv:0,tk:200,hrs:4,left:3,ok:true,caught:false,hidden:false,stop:false,sdd:false,...x}; S.jobs.push(j); return j;};
  /* 11:00 中止 Opus 個人 API、200k／4h、還剩 3h */
  newRun('laravel','parallel'); S.hours=6; S.wallet=8000;
  const c1=ticket('laravel',2); run(c1); const tk0=S.st.tk.anthropic;
  A.cancelJob(c1.id);
  ok(near(S.st.tk.anthropic-tk0,50)&&near(S.wallet,7955)&&S.hours===6,'abort-agent：已跑 1/4 扣 50k、錢包 -NT$45、時鐘不動',`${S.st.tk.anthropic-tk0} ${S.wallet} ${S.hours}`);
  ok(!S.jobs.length&&S.issues.includes(c1)&&!c1.running,'abort-agent：agent 移出工作槽、工單回到佇列');
  ok(S.log[0].cls==='warn'&&S.log[0].msg.endsWith('⏹ 中止 t｜Claude Code / Opus・個人 API｜燒掉 50k｜NT$45｜1.0h'),'abort-agent：紀錄寫中止那行',S.log[0].msg);
  /* 剛派出去就中止：至少 5% */
  newRun('laravel','parallel'); const c2=ticket('laravel',2); run(c2,{left:4}); const tk1=S.st.tk.anthropic;
  A.cancelJob(c2.id); ok(near(S.st.tk.anthropic-tk1,10),'abort-agent：剛派就中止扣 10k（5%）',S.st.tk.anthropic-tk1);
  /* 工單原樣：tries、base 不變 */
  newRun('laravel','parallel'); const c3=ticket('laravel',3,{base:120}); run(c3);
  A.cancelJob(c3.id); ok(c3.tries===0&&c3.base===120&&c3.cx===3,'abort-agent：tries 0、base 120k 不變',`${c3.tries} ${c3.base}`);
  /* 隱藏陷阱不曝光 */
  newRun('laravel','parallel'); const c4=ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4]}); run(c4,{hidden:true,stop:true}); const th=S.st.trapHit;
  A.cancelJob(c4.id); ok(c4.cx===1&&!c4.revealed&&S.st.trapHit===th,'abort-agent：隱藏陷阱不曝光、不算踩到');
  /* 本地 GPU 立刻釋放 */
  newRun('laravel','parallel'); const c5=ticket('laravel',2); run(c5,{v:'local',m:'qwen',b:'local',M:model('local','qwen')});
  const busy=C.localBusy(); A.cancelJob(c5.id); ok(busy&&!C.localBusy(),'abort-agent：中止 Qwen 後本地 GPU 釋放');
  /* 機敏單走個人 API 照擲稽核 */
  newRun('laravel','parallel'); S.trust=70; const c6=ticket('laravel',2,{sens:true}); run(c6);
  {const rr=Math.random; Math.random=()=>0; A.cancelJob(c6.id); Math.random=rr;}
  ok(S.trust===58,'abort-agent：機敏單中止照擲稽核（信任 -12）',S.trust);
  /* 不動作：單線、找不到的編號 */
  newRun('laravel','serial'); const c7=ticket('laravel',2); run(c7); const n7=S.log.length;
  A.cancelJob(c7.id); ok(S.jobs.length===1&&S.log.length===n7,'abort-agent：單線模式不能中止');
  newRun('laravel','parallel'); const c8=ticket('laravel',2); run(c8); const n8=S.log.length, w8=S.wallet;
  A.cancelJob(-1); ok(S.jobs.length===1&&S.log.length===n8&&S.wallet===w8,'abort-agent：找不到的編號不動作');
  {const tab=Ru.RULE_TABS.map(t=>Ru.rulesTab(t.id)).find(h=>h.includes('背景 agent 可以自己中止'))||'';
   ok(tab.includes('中止')&&tab.includes('5%')&&tab.includes('不算失敗'),'abort-agent：規則 modal 說明玩家中止與至少 5%');}
  /* 到期中止照舊算失敗 */
  A.cancelJobs(()=>true,'到期還沒跑完，只好中止'); ok(c8.tries===1,'abort-agent：到期中止仍然 tries +1',c8.tries);
  /* 兩段式按鈕（點擊走 main.js 的事件委派） */
  {const click=b=>els.app.on.click({target:{closest:()=>b}}), btn=id=>({dataset:{cancel:String(id)},disabled:false});
   newRun('laravel','parallel'); S.hours=6; const u1=ticket('laravel',2); run(u1); Vw.armCancel(null); render();
   ok(els.app.innerHTML.includes(`data-cancel="${u1.id}">中止</button>`),'abort-agent：背景 agent 列有中止按鈕');
   click(btn(u1.id));
   ok(S.jobs.length===1&&els.app.innerHTML.includes(`data-cancel="${u1.id}">確定中止？</button>`),'abort-agent：第一次點只變成確定中止？、agent 照跑');
   click(btn(u1.id));
   ok(!S.jobs.length&&S.issues.includes(u1)&&!u1.running&&!els.app.innerHTML.includes('data-cancel'),'abort-agent：再點一次就中止，工單回到佇列');
   const u2=ticket('laravel',2); run(u2,{left:3.5,hrs:4}); render(); click(btn(u2.id));
   click({dataset:{act:'wait1'},disabled:false});
   ok(S.jobs.length===1&&els.app.innerHTML.includes(`data-cancel="${u2.id}">中止</button>`),'abort-agent：待確認時點等 1 小時就恢復中止、agent 照跑');
   click(btn(u2.id)); click(null);
   ok(Vw.cancelArm===null&&S.jobs.length===1&&els.app.innerHTML.includes(`data-cancel="${u2.id}">中止</button>`),'abort-agent：點非按鈕的地方也恢復');
   newRun('laravel','serial'); const u3=ticket('laravel',2); S.issues=[u3]; render();
   ok(!els.app.innerHTML.includes('data-cancel'),'abort-agent：單線模式沒有中止按鈕');}
  /* 陷阱曝光前照顯示的複雜度顯示時間（review 發現真實時數會洩漏陷阱） */
  {const row=id=>{const h=els.app.innerHTML, a=h.indexOf(`data-cancel="${id}"`), st=h.lastIndexOf('<div class="job"',a); return h.slice(st,h.indexOf('</div></div>',a)+12);};
   const bar=r=>parseFloat(r.match(/width:([\d.]+)%/)?.[1]);
   newRun('laravel','parallel'); Vw.armCancel(null);
   const p1=ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4]}); run(p1,{hrs:4,shownHrs:1,left:3.8}); S.hours=7.8; render();
   ok(row(p1.id).includes('10:00 完成')&&near(bar(row(p1.id)),20,1e-6),'shown-estimate：陷阱 9:12 時顯示 10:00 完成、進度 20%',row(p1.id));
   p1.running=true; S.jobs[0].left=2.5; S.hours=6.5; render();
   ok(row(p1.id).includes('超過預估，還在跑')&&bar(row(p1.id))===100,'shown-estimate：10:30 超過預估，還在跑、進度條滿',row(p1.id));
   newRun('laravel','parallel'); const p2=ticket('laravel',2); run(p2,{hrs:2,shownHrs:2,left:1.8}); S.hours=7.8; render();
   ok(row(p2.id).includes('11:00 完成'),'shown-estimate：一般工單 11:00 完成',row(p2.id));
   newRun('laravel','parallel'); const p3=ticket('laravel',2); run(p3,{hrs:2,left:1.5}); S.hours=8; render();
   ok(row(p3.id).includes('10:30 完成')&&near(bar(row(p3.id)),25,1e-6),'shown-estimate：舊存檔沒有 shownHrs 時用真實時數',row(p3.id));
   /* makeJob 與派工紀錄 */
   newRun('laravel','parallel'); Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0,ef:1});
   const p4=ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4]}); const j4=makeJob(p4);
   const sh=est(p4,'anthropic','sonnet').hrs, tr=est(trueView(p4),'anthropic','sonnet').hrs;
   ok(near(j4.shownHrs/j4.hrs,sh/tr,1e-9)&&j4.hrs>j4.shownHrs*2,'shown-estimate：陷阱 job 的 shownHrs 照顯示的複雜度、同一個隨機倍率',`${j4.shownHrs} ${j4.hrs}`);
   const p5=ticket('laravel',2);
   {const j5=makeJob(p5); ok(j5.shownHrs===j5.hrs,'shown-estimate：一般工單 shownHrs 等於 hrs');}
   S.issues=[p4]; sel.issue=p4.id; S.hours=8; dispatch(); const j6=S.jobs[0], dl=S.log.find(l=>l.msg.includes('→ 派出'));
   ok(dl.msg.endsWith(`預計 ${h1(j6.shownHrs)}h`)&&h1(j6.shownHrs)!==h1(j6.hrs),'shown-estimate：派工紀錄的預計時數用 shownHrs',dl.msg);}
  }

  /* 多語系（gh-34-01-i18n） */
  {
   ok(I.LANGS.map(l=>l.id).join()==='zh-TW,en'&&I.LANGS.map(l=>l.dict['lang.name']).join()==='繁體中文,English','i18n：註冊 zh-TW（繁體中文）與 en（English），順序固定');
   ok(I.lang==='zh-TW','i18n：node 工具載入後是 zh-TW（fake-dom 固定 navigator）',I.lang);
   const pk=[[null,['zh-TW'],'zh-TW'],[null,['zh-CN','en'],'zh-TW'],[null,['en-US'],'en'],[null,['ja-JP'],'en'],[null,['ja-JP','zh-TW'],'zh-TW'],['en',['zh-TW'],'en'],['xx',['zh-TW'],'zh-TW']];
   for(const [st,list,want] of pk) ok(I.pickLang(st,list)===want,`i18n：pickLang(${st}, ${list}) → ${want}`,I.pickLang(st,list));
   /* initLang 讀 localStorage 與 navigator；測完還原成 zh-TW */
   const nav=globalThis.navigator;
   globalThis.navigator={language:'en-US',languages:['en-US']}; resetStore(); I.initLang();
   ok(I.lang==='en','i18n：沒有偏好、瀏覽器 en-US → en',I.lang);
   resetStore({[I.LANG_KEY]:'en'}); globalThis.navigator={language:'zh-TW',languages:['zh-TW']}; I.initLang();
   ok(I.lang==='en','i18n：存的偏好 en 勝過瀏覽器 zh-TW',I.lang);
   resetStore({[I.LANG_KEY]:'xx'}); I.initLang();
   ok(I.lang==='zh-TW','i18n：不認得的偏好被忽略',I.lang);
   ok(globalThis.document.documentElement.lang==='zh-TW'&&globalThis.document.title===I.LANGS[0].dict['page.title'],'i18n：applyLang 設定 <html lang> 與分頁標題');
   globalThis.navigator=nav; resetStore(); I.initLang();
   /* 查字典：測試用 key 只加在載入的物件上，測完刪掉 */
   const zh=I.LANGS[0].dict, en=I.LANGS[1].dict;
   zh['test.rules']='規則'; en['test.rules']='Rules'; zh['test.day']='— 第 {d} 天開工 —'; en['test.day']='— Day {d} starts —'; zh['test.only']='只有中文';
   const look=id=>{I.setLang(id);};
   look('zh-TW'); ok(I.t('test.rules')==='規則','i18n：zh-TW t(test.rules) → 規則');
   look('en'); ok(I.t('test.rules')==='Rules','i18n：en t(test.rules) → Rules');
   ok(I.t('test.day',{d:6})==='— Day 6 starts —','i18n：en 參數填入 {d}',I.t('test.day',{d:6}));
   ok(I.t('test.only')==='只有中文','i18n：en 缺 key 退回 zh-TW');
   ok(I.t('no.such.key')==='no.such.key','i18n：兩邊都沒有就回傳 key');
   ok(I.t('ui.rules')==='Rules'&&I.t('ui.week',{w:2})==='Week 2','i18n：en t(ui.rules) → Rules、t(ui.week,{w:2}) → Week 2');
   newRun('laravel'); S.day=6; C.log('dim',I.t('test.day',{d:S.day}));
   ok(S.log[0].msg==='D06 — Day 6 starts —'&&!S.log[0].msg.includes('{'),'i18n：紀錄填好數字、沒有留下 {d}',S.log[0].msg);
   delete zh['test.rules']; delete en['test.rules']; delete zh['test.day']; delete en['test.day']; delete zh['test.only'];
   look('zh-TW'); resetStore();
  }

  /* 字典一致性：key 集合、程式裡寫死的 key、題庫長度 */
  {
   const zh=I.LANGS[0].dict, zk=new Set(Object.keys(zh));
   /* 回傳各語言字典和 zh-TW 對不上的地方（多的 key、en 缺的 key、題庫長度不同） */
   const dictProblems=langs=>{const z=langs[0].dict, k0=new Set(Object.keys(z)), out=[];
     for(const L of langs.slice(1)){
       for(const k of Object.keys(L.dict)) if(!k0.has(k)) out.push(`${L.id} 多了 ${k}`);
       if(L.id==='en') for(const k of k0) if(!(k in L.dict)) out.push(`en 缺 ${k}`);
       for(const k of Object.keys(L.dict)) if(k.startsWith('pool.')&&(!Array.isArray(L.dict[k])||L.dict[k].length!==(z[k]||[]).length)) out.push(`${L.id} 題庫長度不同 ${k}`);
     }
     return out;};
   const dp=dictProblems(I.LANGS);
   ok(!dp.length,'i18n 字典：各語言 key 與題庫長度都和 zh-TW 一致',dp.join(', '));
   /* 失敗的情況也要擋得下來：zh-TW 多一個 key、題庫少一條（記憶體裡的複本，不動檔案） */
   {const extraZh=[{id:'zh-TW',dict:{...zh,'tmp.only':'x'}},...I.LANGS.slice(1)];
    ok(dictProblems(extraZh).includes('en 缺 tmp.only'),'i18n 字典：en 少了 zh-TW 的 key 會被抓到');
    const en=I.LANGS[1].dict, shortPool=[I.LANGS[0],{id:'en',dict:{...en,'pool.laravel.1':en['pool.laravel.1'].slice(1)}}];
    ok(dictProblems(shortPool).includes('en 題庫長度不同 pool.laravel.1'),'i18n 字典：題庫長度不同會被抓到');}
   const dir=new URL('../public/js/',import.meta.url), used=[];
   for(const f of readdirSync(dir).filter(f=>f.endsWith('.js'))){
     const src=stripComments(readFileSync(new URL(f,dir),'utf8'));
     for(const m of src.matchAll(/(?<![\w.$])tl?\('([^']+)'/g)) if(!zk.has(m[1])) used.push(`${f}: ${m[1]}`);
   }
   ok(!used.length,'i18n 字典：程式裡寫死的 t()/tl() key 都在 zh-TW',used.join(', '));
   /* 搬完字串的模組：註解以外不能有中文（CJK 標點、漢字、全形字） */
   const CJK=/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;
   const cjkLines=src=>stripComments(src).split('\n').map((l,n)=>CJK.test(l)?n+1:0).filter(Boolean);
   for(const f of I18N_DONE){
     const bad=cjkLines(readFileSync(new URL(f,dir),'utf8'));
     ok(!bad.length,`i18n：${f} 註解以外沒有中文`,`第 ${bad.slice(0,8).join(', ')} 行`);
   }
   /* 失敗的情況：字面值裡的中文會被抓到，註解裡的不算 */
   ok(cjkLines("// 註解\nconst a=1;\nconst b='規則';").join()==='3'&&!cjkLines('/* 規則 */ const x=`a${1}b`; // 中文').length,'i18n：程式碼裡的中文字面值會被抓到，註解不算');
   /* 英文模式的遊戲畫面 */
   newRun('laravel','parallel'); S.issues=[makeIssue(false)]; sel.issue=S.issues[0].id; I.setLang('en'); render();
   ok(/<button class="btn ghost rbtn" data-act="rules">Rules<\/button>/.test(els.app.innerHTML),'i18n：英文模式標頭的規則按鈕是 Rules');
   I.setLang('zh-TW'); resetStore();
   /* 英文模式逐一觸發隨機事件（亂數固定 0：廠商是 Anthropic），標題與內容沒有中文、沒有剩下的 {} */
   {const rnd0=Math.random; I.setLang('en'); const seen=[];
    for(const day of [3,9]) for(const mon of [false,true]) for(let k=0;k<EVENTS.length;k++){
      newRun('laravel'); S.day=day; S.kpi=day===3?0:500; S.inv.monitor=mon; Math.random=()=>0; let e; try{e=EVENTS[k]();}finally{Math.random=rnd0;}
      seen.push(e.join(' '));
      ok(!CJK.test(e.join(''))&&!/[{}]/.test(e.join('')),`i18n：英文事件 ${k}（第 ${day} 天${mon?'、有監控':''}）`,e.join(' / '));
    }
    I.setLang('zh-TW');}
   /* 資料欄位跟著語言：工作內容名稱、電腦說明帶入常數 */
   I.setLang('en');
   ok(dataModule.companyName(['laravel','rust'])==='Laravel backend + Rust infrastructure','i18n：英文工作內容名稱用 + 串起來',dataModule.companyName(['laravel','rust']));
   ok(dataModule.HW.pc.desc.includes(String(dataModule.PC_SPEED))&&!CJK.test(dataModule.HW.pc.desc),'i18n：英文電腦說明帶入 PC_SPEED',dataModule.HW.pc.desc);
   const texts=[...Object.values(dataModule.INVEST).flatMap(v=>[v.name,v.desc,v.lv2?.desc||'']),...Object.values(dataModule.HW).flatMap(v=>[v.name,v.price,v.desc]),...Object.values(dataModule.CONF).map(v=>v.name),...Object.values(dataModule.CONF_CATS),...dataModule.CLIENTS.map(c=>c.name),St.GIG_CLIENT.name,...Object.values(dataModule.BILL_LABEL),...dataModule.EFFORT.map(e=>e.name),...[0,1,2].map(i=>dataModule.SDD_NAME[i]+dataModule.SDD_EG[i]),...Object.values(STACKS).flatMap(v=>[v.name,v.company,v.desc]),...Object.values(VENDORS).flatMap(v=>[v.name,v.agent,...v.plans.map(p=>p.name),...v.models.map(m=>m.name)]),...C.REVIEW.map(r=>r.name)];
   const zhLeft=texts.filter(x=>CJK.test(x));
   ok(!zhLeft.length,'i18n：英文模式的資料欄位沒有中文',zhLeft.join(' / '));
   I.setLang('zh-TW');
   ok(dataModule.companyName(['laravel','rust'])==='Laravel 後端＋Rust 基礎設施','i18n：繁中工作內容名稱不變');
   /* 題庫照位置抽：同一組亂數，中英兩局每張工單的題庫位置與數字都一樣 */
   {const rnd0=Math.random;
    const flat=k=>dataModule.POOL_KEYS.flatMap(n=>STACKS[k].pool[n].map(x=>typeof x==='string'?x:x.t));
    const gen=lang=>{I.setLang(lang); seedRandom(7); newRun(['laravel','rust']); S.day=12; const out=[...Array(200)].map(()=>makeIssue(false)); return out.map(i=>({...i,pos:flat(i.stack).indexOf(i.title)}));};
    const zhI=gen('zh-TW'), enI=gen('en'); Math.random=rnd0;
    const num=i=>JSON.stringify([i.stack,i.cx,i.due,i.kpi,i.base,i.trap,i.trueCx,i.research,i.sens,i.big,i.store,i.client.ban,i.pos]);
    ok(zhI.every(i=>i.pos>=0)&&enI.every(i=>i.pos>=0),'i18n：每張工單的標題都在自己語言的題庫裡');
    ok(zhI.every((i,n)=>num(i)===num(enI[n])),'i18n：同一組亂數，中英兩局的題庫位置與數字都相同');
    ok(enI.every(i=>!CJK.test(i.title)&&(!i.parts||i.parts.every(p=>!CJK.test(p)))),'i18n：英文工單標題（含研究單拆單）沒有中文');
    I.setLang('zh-TW');}
   /* 英文整局：單線、平行各玩完 20 天，畫面、彈窗、紀錄都沒有中文 */
   for(const mode of ['serial','parallel']){
    const rnd0=Math.random; seedRandom(11); I.setLang('en'); newRun(['laravel','app'],mode); S.outsource=true;
    const bad=[], chk=(where,h)=>{const html=h.replace(/<div class="lang"[\s\S]*?<\/div>/,''); /* 語言按鈕用各自的語言寫，不算 */ if(CJK.test(html))bad.push(`${where}: ${html.replace(/<[^>]+>/g,' ').match(/.{0,30}[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef].{0,30}/)[0]}`);};
    showSetup(false); chk('setup',els.mo.innerHTML); showSetup(true); chk('setup-adj',els.mo.innerHTML);
    let guard=0;
    while(guard++<40){
      invest('tests'); invest('md','laravel');
      for(const is of S.issues.filter(i=>!i.running).slice(0,4)){
        sel.issue=is.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:is.out?'api':'corp',rv:1});
        if(is.research&&guard%2) A.research('self'); else if(guard%3===0&&C.manualHrs(is)<=S.hours&&!C.manualBlocked()) manual(); else if(guard%4===1&&A.canEvaluate(is)) evaluate(); else dispatch();
      }
      if(mode==='parallel') A.wait(false);
      render(); chk('render',els.app.innerHTML);
      if(S.day>=20){ endDay(); chk('end',els.mo.innerHTML); break; }
      endDay(); chk('day',els.mo.innerHTML);
    }
    ok(S.day===20&&els.mo.innerHTML.includes('Month-end report'),`i18n：英文整局（${mode}）玩到月底結算`,S.day);
    M.showResume({S:{day:5,companies:['laravel'],mode,slots:3}}); chk('resume',els.mo.innerHTML);
    M.showBadSave(); chk('badsave',els.mo.innerHTML);
    for(const l of S.log) chk('log',l.msg);
    Math.random=rnd0;
    ok(!bad.length,`i18n：英文整局（${mode}）畫面、彈窗、紀錄沒有中文`,bad.slice(0,6).join(' ／ '));
    ok(S.log.length>50,`i18n：英文整局（${mode}）有寫紀錄`,S.log.length);
    I.setLang('zh-TW');
   }
   /* 規則 modal 英文：每個分頁沒有中文，數字跟繁中版一樣 */
   {const nums=h=>(h.replace(/<[^>]+>/g,' ').match(/\d+(\.\d+)?/g)||[]).sort().join(',');
    for(const tb of Ru.RULE_TABS){
      /* 電腦價格換了單位（12 萬 → 120,000），不比 */
      const noPrice=h=>dataModule.HW_KEYS.reduce((x,k)=>x.split(dataModule.HW[k].price).join(''),h);
      I.setLang('zh-TW'); const zhH=noPrice(Ru.rulesTab(tb.id)); I.setLang('en'); const enH=noPrice(Ru.rulesTab(tb.id));
      ok(!CJK.test(enH),`i18n：規則「${tb.id}」英文沒有中文`,(enH.replace(/<[^>]+>/g,' ').match(/.{0,30}[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef].{0,30}/)||[''])[0]);
      ok(nums(zhH)===nums(enH),`i18n：規則「${tb.id}」中英數字相同`,`${nums(zhH)} ／ ${nums(enH)}`);
    }
    Ru.showRules(); ok(!CJK.test(els.mo.innerHTML)&&els.mo.innerHTML.includes('Game rules'),'i18n：英文規則 modal 標題與分頁');
    I.setLang('zh-TW');}
   /* 語言切換（標頭按鈕） */
   {const clickLang=id=>els.app.on.click({target:{closest:()=>({dataset:{lang:id},disabled:false})}});
    const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
    /* 點目前的語言：什麼都不做、不存偏好 */
    I.setLang('zh-TW'); resetStore(); newRun('laravel'); clickLang('zh-TW');
    ok(I.lang==='zh-TW'&&!(I.LANG_KEY in store),'i18n：點目前的語言不存偏好');
    /* 遊戲中途切換：狀態、存檔不變，不送 GA、不寫紀錄，兩個 agent 照跑 */
    resetStore(); I.setLang('zh-TW'); resetStore(); newRun('laravel','parallel'); S.day=7; S.issues=[makeIssue(false),makeIssue(false),makeIssue(false)];
    for(const is of S.issues.slice(0,2)){sel.issue=is.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0}); dispatch();}
    /* 案主名稱是跟著語言的標籤，比狀態時用 id */
    const snap=()=>JSON.stringify(S,(k,v)=>k==='client'&&v?.id?v.id:v);
    St.saveGame(null); const save0=store['tokgame-save'], s0=snap(), n0=ge.length;
    render(); ok(/data-lang="en"/.test(els.app.innerHTML)&&/class="on" data-lang="zh-TW"/.test(els.app.innerHTML),'i18n：標頭有每個語言的按鈕，目前語言亮起來');
    clickLang('en');
    ok(I.lang==='en'&&store[I.LANG_KEY]==='en'&&globalThis.document.documentElement.lang==='en','i18n：切到英文，偏好存進 tokgame-lang、<html lang> 是 en');
    ok(els.app.innerHTML.includes('Ticket queue')&&els.app.innerHTML.includes('Background agents'),'i18n：切換後畫面重畫成英文');
        ok(snap()===s0&&store['tokgame-save']===save0&&ge.length===n0&&S.jobs.length===2,'i18n：切換不改狀態、不寫存檔、不送 GA、不寫紀錄，agent 照跑');
    /* 重新整理：偏好保留，繼續上一局的提示也是英文 */
    boot(); ok(I.lang==='en'&&els.mo.innerHTML.includes('Continue your last game?'),'i18n：重新整理後沿用英文（含繼續上一局）');
    /* localStorage 寫不進去：還是切得過去，重新整理再看瀏覽器語言 */
    I.setLang('zh-TW'); resetStore(); const set0=globalThis.localStorage.setItem; globalThis.localStorage.setItem=()=>{throw new Error('blocked');};
    let threw=false; try{clickLang('en');}catch(e){threw=true;}
    globalThis.localStorage.setItem=set0;
    ok(!threw&&I.lang==='en'&&!(I.LANG_KEY in store),'i18n：localStorage 擋住時照樣切到英文、不報錯');
    I.initLang(); ok(I.lang==='zh-TW','i18n：擋住時重新整理照瀏覽器語言（zh-TW）');
    /* 已經寫的紀錄與工單標題維持原本的語言 */
    resetStore(); I.setLang('zh-TW'); newRun('laravel'); firstIssues(); const t0=S.issues[0].title, first=S.log[S.log.length-1].msg;
    clickLang('en'); render();
    ok(CJK.test(t0)&&els.app.innerHTML.includes(t0)&&els.app.innerHTML.includes('Ticket queue'),'i18n：佇列裡的工單維持中文標題，卡片標籤是英文');
    endDay(); const msgs=S.log.map(l=>l.msg);
    ok(msgs.includes(first)&&CJK.test(first)&&msgs.some(m=>m.includes('Day 1 done'))&&msgs.some(m=>m.includes('Day 2 starts')),'i18n：切換後舊紀錄維持中文、新紀錄是英文');
    /* 中文寫的存檔用英文讀 */
    resetStore(); I.setLang('zh-TW'); newRun('laravel'); S.day=4; endDay(); const rep=(JSON.parse(store['tokgame-save']).morning||{}).rep||[];
    I.setLang('en'); const d=St.readSave();
    ok(d&&!d.bad&&d.S.day===5,'i18n：中文存檔在英文模式下讀得到',JSON.stringify(d&&{bad:d.bad,day:d.S?.day}));
    M.showResume(d); els.mo.onclick({target:{closest:()=>({dataset:{act:'resume'}})}});
    ok(els.app.innerHTML.includes('Ticket queue')&&els.mo.innerHTML.includes('Start working')&&rep.every(x=>els.mo.innerHTML.includes(x)),'i18n：讀檔後畫面英文，早上報告照存的內容');
    /* 開局視窗也能換語言，已選的項目保留 */
    I.setLang('zh-TW'); resetStore(); start(); const g0=ge.length;
    const clickMo=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
    clickMo({company:'rust'}); clickMo({company:'laravel'}); clickMo({mode:'parallel'}); clickMo({slots:'4'});
    ok(/class="on" data-lang="zh-TW"/.test(els.mo.innerHTML),'i18n：開局視窗有語言按鈕');
    clickMo({lang:'en'});
    const mh=els.mo.innerHTML;
    ok(mh.includes('Start of the month')&&/sel" data-company="rust"/.test(mh)&&/sel" data-mode="parallel"/.test(mh)&&/sel" data-slots="4"/.test(mh)&&!/sel" data-company="laravel"/.test(mh),'i18n：開局視窗切到英文，Rust、平行、4 個 agent 保留');
    ok(store[I.LANG_KEY]==='en'&&ge.length===g0&&els.app.innerHTML.includes('Ticket queue'),'i18n：開局視窗切換存偏好、不送 GA、背後畫面也換');
    showSetup(true); clickMo({lang:'zh-TW'}); ok(els.mo.innerHTML.includes('週一：調整訂閱'),'i18n：週一調整訂閱也能切回繁中');
    delete globalThis.gtag; I.setLang('zh-TW'); resetStore();}
   /* 頁尾：只顯示目前語言那份，其他的留著但隱藏 */
   {const fb=lg=>els.about.blocks.find(b=>b.dataset.lang===lg);
    I.setLang('en'); ok(fb('en').hidden===false&&fb('zh-TW').hidden===true&&els.about.blocks.length===2,'i18n：英文時只顯示英文頁尾，中文頁尾還在但隱藏');
    I.setLang('zh-TW'); ok(fb('zh-TW').hidden===false&&fb('en').hidden===true,'i18n：繁中時只顯示中文頁尾');
    resetStore();}
   /* GA：同一張單用中文和英文派工，送出的事件一模一樣 */
   {const rnd0=Math.random, runGa=lg=>{const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p}); I.setLang(lg); seedRandom(5); newRun('laravel'); S.issues=[makeIssue(false)];
      sel.issue=S.issues[0].id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:1}); dispatch(); delete globalThis.gtag; return JSON.stringify(ge);};
    const gz=runGa('zh-TW'), gn=runGa('en'); Math.random=rnd0;
    ok(gz===gn&&gz.includes('"dispatch"')&&gz.includes('"job_result"'),'i18n：中英派工送出的 GA 事件與參數相同',`${gz.slice(0,160)} ／ ${gn.slice(0,160)}`);
    I.setLang('zh-TW'); resetStore();}
   /* 開局說明：錢不算分 */
   ok(I.LANGS[0].dict['ui.setup.r.late'].includes('錢不算分')&&!I.LANGS[0].dict['ui.setup.r.late'].includes('花了多少錢')&&I.LANGS[1].dict['ui.setup.r.late'].includes('money does not score'),'開局說明：月底結算看 KPI、信任與稽核，錢不算分');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if(fail) process.exitCode=1;
}

tests();
