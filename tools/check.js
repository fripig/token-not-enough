// 規則檢查（非遊戲本體）
// 用法：node tools/check.js
// 用假的 DOM 載入遊戲模組，把 spec 裡的範例數字逐條斷言；任何一條不符就以非 0 結束。
import {readFileSync} from 'node:fs';
import {els,store,resetStore} from './fake-dom.js';
// 先載入入口模組，模組初始化順序才會和瀏覽器一樣（main.js 載入時會呼叫 start()）
import {boot,start} from '../public/js/main.js';
import {BASE,CLIENTS,COMPANIES,DEFAULT_PRESETS,EFFORT,KPI,SEAT,STACKS,VENDORS,bestKey,cnBlock,effModel,h1,kt,model,presetsOf,rnd} from '../public/js/data.js';
import * as dataModule from '../public/js/data.js';
import {GIG_CLIENT,GIG_PAY,S,addGigs,hardStack,fresh,makeGig,makeIssue,nextId,pickStack,sel,unfamiliar} from '../public/js/state.js';
import {catchRate,costLine,storeReject,est,manualHrs,presetBlock,presetFor,quotaLeft,stackHint} from '../public/js/calc.js';
import {EVENTS,advance,auditOdds,auditRoll,conflictRate,prHrs,batch,canEvaluate,charge,dispatch,endDay,evalCost,evaluate,invCount,invest,loadPreset,makeJob,manual,quick,rescope,reveal,revealRate,savePreset,settle,trueView} from '../public/js/actions.js';
import {dispatchPanel,render} from '../public/js/view.js';
import {showEnd,showSetup} from '../public/js/modals.js';
// 核心規則（gh-09-01-core-rules-specs）用命名空間取用，避免和上面的具名 import 重複
import * as A from '../public/js/actions.js';
import * as C from '../public/js/calc.js';
import * as M from '../public/js/modals.js';
// 另一份沒玩過的 state.js：用來測第一次 fresh() 的預設值（主模組的 S 已經被 start() 設過）
import * as St from '../public/js/state.js';
const pristine=await import('../public/js/state.js?pristine');

let pass=0,fail=0;
function ok(cond,name,detail=''){if(cond){pass++;}else{fail++;console.log('✗',name,detail);}}
function near(a,b,eps=1e-9){return Math.abs(a-b)<=eps;}

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
  ok(['laravel','rust','app'].every(k=>cnt[k]>0),'其他三條技術線都有出現',JSON.stringify(cnt));
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
  ok(near(pOf('anthropic','haiku',ticket('rails',3)).p,.8),'Haiku × 複雜度 3 rails → 80%',pOf('anthropic','haiku',ticket('rails',3)).p);
  ok(near(pOf('anthropic','haiku',ticket('laravel',4)).p,pOf('anthropic','haiku',ticket('fe',4)).p),'複雜度 4 laravel 沒有慣例加成');
  const air=pOf('zhipu','air',ticket('rust',2)), airFe=pOf('zhipu','air',ticket('fe',2));
  ok(near(air.p,.8),'GLM Air × 複雜度 2 rust → 80%',air.p);
  ok(near(air.hrs,airFe.hrs*1.2),'rust 執行時間 ×1.2');
  ok(near(air.tk,airFe.tk),'技術線不影響 token 預估');
  const capModel={2:['anthropic','haiku'],3:['zhipu','air'],4:['anthropic','sonnet'],5:['anthropic','opus']};
  for(const [cap,cx,exp] of [[2,2,.5],[3,2,.8],[4,3,.95],[5,5,.8]]){
    const [v,m]=capModel[cap]; ok(near(pOf(v,m,ticket('rust',cx)).p,exp),`Rust 表：能力 ${cap} × 複雜度 ${cx} → ${exp*100}%`);
  }
  ok(near(pOf('anthropic','sonnet',ticket('app',3)).hrs,pOf('anthropic','sonnet',ticket('fe',3)).hrs*1.15),'app 執行時間 ×1.15');

  const sOn=est(ticket('app',3,{store:true}),'anthropic','sonnet',0), sOff=est(ticket('app',3),'anthropic','sonnet',0);
  ok(near(sOn.pe,sOff.pe*.8)&&near(sOn.p,sOff.p),'需上架審核：顯示成功率含 20% 退件，原始機率不變');

  /* 2.3 不熟技術線手寫時間（spec 範例表） */
  for(const [co,st,cx,tries,exp] of [['laravel','laravel',2,0,'4.4'],['laravel','fe',2,0,'4.4'],['laravel','rust',2,0,'8.8'],['app','rails',3,1,'10.6']]){
    newRun(co); ok(h1(manualHrs(ticket(st,cx,{tries})))===exp,`手寫：${co} 公司 ${st} 複雜度 ${cx} tries ${tries} → ${exp}h`,h1(manualHrs(ticket(st,cx,{tries}))));
  }

  /* 5.1 Rust／App 補償：KPI ×1.3、期限 +1 天（上限第 20 天） */
  for(const [st,cx,inc,exp] of [['laravel',3,false,10],['rust',3,false,13],['app',2,false,8],['app',4,true,33],['fe',4,false,16]]){
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
  for(const [k,stars] of [['laravel','★'],['rails','★'],['app','★★'],['rust','★★★']]){
    const btn=els.mo.innerHTML.match(new RegExp(`data-company="${k}"[^>]*>([\\s\\S]*?)</button>`))?.[1]||'';
    ok(btn.includes(`難度 ${stars}・`),`${STACKS[k].company} 標示難度 ${stars}`,btn);
  }

  /* 派工台提示（Stack effect visibility） */
  newRun('laravel');
  const hRust=stackHint(ticket('rust',2));
  ok(hRust.includes('×1.2')&&hRust.includes('borrow checker'),'Rust 提示含 ×1.2 與 borrow checker',hRust);
  ok(stackHint(ticket('fe',2))==='','前端工單沒有提示');
  ok(stackHint(ticket('laravel',4))==='','複雜度 4 的 laravel 工單沒有提示');
  ok(stackHint(ticket('rails',3)).includes('慣例多'),'複雜度 3 的 rails 工單有慣例提示');
  ok(stackHint(ticket('app',3,{store:true})).includes('20%')&&!stackHint(ticket('app',3)).includes('20%'),'只有需上架審核的 app 工單提到 20% 退件');

  /* 畫面元素：週一調整不顯示公司、標頭、卡片標籤、手寫按鈕 */
  newRun('laravel'); showSetup(true);
  ok(!els.mo.innerHTML.includes('data-company'),'週一調整訂閱不顯示公司選擇');
  newRun('laravel'); const rt=ticket('rust',2), st=ticket('app',3,{store:true}); S.issues=[rt,st]; sel.issue=rt.id; render();
  ok(els.app.innerHTML.includes('Laravel 新聞站・全端工程師'),'標頭顯示公司名稱');
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
  ok(html.includes('月底結算・Laravel 新聞站'),'結算標題有公司名稱');
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
  const capM={2:['anthropic','haiku'],3:['deepseek','chat'],4:['anthropic','sonnet'],5:['anthropic','opus']};
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
  ok(els.mo.innerHTML.includes('月底結算・Laravel 新聞站・平行模式（4 個 agent）'),'結算標題顯示 4 個 agent');
  newRun('laravel','serial'); S.day=20; showEnd(); ok(els.mo.innerHTML.includes('月底結算・Laravel 新聞站・單線模式</h2>'),'單線模式標題不變');

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
  ok(same(S.presets[0],{v:'anthropic',m:'haiku',b:'sub',rv:0,ef:1}),'再玩一個月沿用方案 A（沒有推理強度的補成中）');
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
  ok(same(S.presets[1],{v:'google',m:'pro',b:'corp',rv:0,ef:1})&&S.issues.includes(keep),'存成方案 B 不會派工');
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
  render(); ok(/data-inv="tests"\s+disabled><b>單元測試<\/b><small>已完成/.test(els.app.innerHTML),'買過的投資顯示已完成');
  ok(!els.app.innerHTML.includes('補測試'),'畫面上沒有補測試');
  const invRows=[...els.app.innerHTML.matchAll(/data-inv="(\w+)"(?! data-st)/g)].map(m=>m[1]).join(',');
  ok(invRows==='tests,ci,hook,scan,fastlane,monitor,skills,mcp,sdd','投資面板順序：單元測試、CI、hook、scan、fastlane、監控、skills、MCP、SDD',invRows);
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
    const spike=EVENTS.find(f=>String(f).includes('流量暴增'));
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
    ok(h.includes('secret scanning：個人帳號稽核機率減半')&&!h.includes('fastlane：')&&!h.includes('監控告警：'),'機敏 laravel 工單只提示 secret scanning');
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
  newRun('laravel'); const son=model('anthropic','sonnet'), hai=model('anthropic','haiku');
  const ev0=evalCost(son), hr0=revealRate(hai); S.inv.mcp=true;
  ok(near(revealRate(son),.95)&&near(evalCost(son).hrs,.2)&&near(evalCost(son).tk,ev0.tk),'MCP：Sonnet 識破率 0.95、評估 0.2h、token 不變');
  ok(near(hr0,.65)&&near(revealRate(hai),.85),'MCP：Haiku 識破率 0.65 → 0.85');

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
  newRun('laravel','parallel'); S.inv.skills=true; S.hours=8; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'deepseek',m:'chat',b:'api'}));
  const gov=ticket('fe',1,{client:CLIENTS[3]}), okT=ticket('fe',1); S.issues=[gov,okT]; batch();
  ok(gov.running!==true&&okT.running===true&&S.log.some(l=>l.msg.includes('派出 1 張，略過 1 張')),'沒有可用方案的工單被略過');

  /* 投資面板、結算、開局說明 */
  newRun('rails'); render();
  const order=[...els.app.innerHTML.matchAll(/data-inv="md" data-st="(\w+)"/g)].map(m=>m[1]).join(',');
  ok(order==='rails,laravel,rust,app,fe','CLAUDE.md 按鈕：主技術線優先，再其他公司，最後 fe',order);
  newRun('laravel'); S.hours=8; invest('md','laravel'); S.hours=8; invest('tests'); S.hours=8; invest('ci'); S.day=20; showEnd();
  ok(els.mo.innerHTML.includes('<span>工程投資</span><span>3 項</span>'),'結算顯示工程投資 3 項（CLAUDE.md＋單元測試＋CI）');
  start(); ok(els.mo.innerHTML.includes('派工方案與工程投資')&&els.mo.innerHTML.includes('監控告警')&&!els.mo.innerHTML.includes('補測試'),'開局說明提到派工方案與工程投資（含新項目，沒有補測試）');

  }
  {
  /* multi-stack-company：狀態、沿用、退回 */
  start(); ok(S.companies.join()==='laravel','預設只選 Laravel');
  S.companies='rust'; fresh(); ok(S.companies.join()==='rust','舊版字串 rust 讀成只選 rust');
  S.companies=['laravel','rails','rust']; fresh(); ok(S.companies.join()==='laravel','三條退回 Laravel');
  S.companies=['laravel','go']; fresh(); ok(S.companies.join()==='laravel','未知技術線退回 Laravel');
  S.companies=['app','laravel']; fresh(); ok(S.companies.join()==='laravel,app','照固定順序存');
  S.companies=['rust','app']; start(); ok(S.companies.join()==='rust,app'&&/class="sb sel" data-company="rust"/.test(els.mo.innerHTML)&&/class="sb sel" data-company="app"/.test(els.mo.innerHTML),'再玩一個月預選 Rust＋App');

  /* 開局按鈕：照 spec 的 toggle 表 */
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const picked=()=>COMPANIES.filter(k=>new RegExp(`class="sb sel" data-company="${k}"`).test(els.mo.innerHTML)).join();
  start(); S.companies=['laravel']; showSetup(false);
  ok(els.mo.innerHTML.includes('公司（可選 1–2 條主技術線）'),'標籤寫出可選 1–2 條');
  press({company:'app'}); ok(picked()==='laravel,app','laravel + 點 app → laravel, app');
  ok(/data-company="rust" disabled/.test(els.mo.innerHTML)&&/data-company="rails" disabled/.test(els.mo.innerHTML),'選滿兩條時其他按鈕停用');
  press({company:'rust'}); ok(picked()==='laravel,app','選滿時點 rust 不變');
  press({company:'laravel'}); ok(picked()==='app','再點 laravel → 只剩 app');
  press({company:'app'}); ok(picked()==='app','最後一條不能取消');
  press({company:'laravel'}); ok(picked()==='laravel,app','先 app 再 laravel → 固定順序 laravel, app');
  ok(els.mo.innerHTML.includes('任職於「Laravel 新聞站＋App 團隊」'),'開局說明用合併的公司名稱');
  press({act:'confirm'});
  ok(S.companies.join()==='laravel,app'&&S.issues.length===4,'確認後存成 laravel, app 並重抽第 1 天工單');
  ok(els.app.innerHTML.includes('Laravel 新聞站＋App 團隊・全端工程師')&&S.log.some(l=>l.msg.includes('Laravel 新聞站＋App 團隊・遊戲模式')),'標頭與紀錄顯示 Laravel 新聞站＋App 團隊');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-company'),'週一調整仍不顯示公司');

  /* 工單分布與不熟 */
  newRun(['laravel','app']); const M2=10000, cnt2={laravel:0,rails:0,rust:0,app:0,fe:0};
  for(let i=0;i<M2;i++)cnt2[pickStack()]++;
  ok(Math.abs(cnt2.laravel/M2-.375)<=.02&&Math.abs(cnt2.app/M2-.375)<=.02,'雙選：laravel、app 各約 0.375',JSON.stringify(cnt2));
  ok(Math.abs(cnt2.fe/M2-.15)<=.02,'雙選：fe 約 0.15',cnt2.fe/M2);
  ok(Math.abs(cnt2.rails/M2-.05)<=.01&&Math.abs(cnt2.rust/M2-.05)<=.01,'雙選：rails、rust 各約 0.05',`${cnt2.rails/M2} ${cnt2.rust/M2}`);
  const incs2=[...Array(1000)].map(()=>makeIssue(true));
  ok(incs2.every(i=>i.stack==='laravel'||i.stack==='app')&&incs2.some(i=>i.stack==='laravel')&&incs2.some(i=>i.stack==='app'),'雙選：事故單只出 laravel 或 app，兩條都有');
  newRun(['laravel','rust']);
  ok(h1(manualHrs(ticket('rust',2)))==='4.4'&&!unfamiliar(ticket('rust',2)),'laravel+rust：rust 不算不熟，手寫 4.4h');
  ok(h1(manualHrs(ticket('app',2)))==='8.8'&&unfamiliar(ticket('app',2)),'laravel+rust：app 不熟，手寫 8.8h');

  /* 公司名稱與最高分 key */
  const endPair=(cs,seed)=>{newRun(cs,'parallel');resetStore(seed);S.day=20;S.kpi=900;showEnd();return els.mo.innerHTML;};
  let h2=endPair(['laravel','app'],{'tokgame-best-parallel':'999999'});
  ok(h2.includes('月底結算・Laravel 新聞站＋App 團隊・'),'結算標題顯示 Laravel 新聞站＋App 團隊');
  ok('tokgame-best-parallel-laravel+app' in store&&!h2.includes('999,999'),'雙選寫入 tokgame-best-parallel-laravel+app，不讀舊 key');
  h2=endPair(['laravel'],{'tokgame-best-parallel':'4200'}); ok(h2.includes('4,200'),'只選 Laravel 仍讀舊 key');
  newRun('rails','serial'); ok(bestKey()==='tokgame-best-serial-rails','單選 key 不變');

  /* 投資按鈕順序 */
  newRun(['rails','app']); render();
  const ord2=[...els.app.innerHTML.matchAll(/data-inv="md" data-st="(\w+)"/g)].map(m=>m[1]).join(',');
  ok(ord2==='rails,app,laravel,rust,fe','rails+app：CLAUDE.md 按鈕順序 rails, app, laravel, rust, fe',ord2);
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
  newRun('laravel'); const G=5000, gc={laravel:0,rails:0,rust:0,app:0,fe:0}; const gigs=[...Array(G)].map(makeGig);
  gigs.forEach(g=>gc[g.stack]++);
  ok(Object.values(gc).every(c=>Math.abs(c/G-.2)<=.02),'外包單五條技術線各約 0.2',JSON.stringify(gc));
  ok(gigs.every(g=>g.out&&!g.inc&&!g.sens&&g.client===GIG_CLIENT&&g.pay===g.kpi*80),'外包單不是事故、不機敏、案主是外包案主、報酬 = KPI × 80');
  ok(gigs.filter(g=>g.stack==='rust').every(unfamiliar)&&gigs.filter(g=>g.stack==='fe').every(g=>!unfamiliar(g)),'只選 Laravel 時 rust 外包單算不熟、fe 不算');
  S.issues=[gigs.find(g=>g.stack==='rust')]; sel.issue=null; render();
  ok(els.app.innerHTML.includes('<span class="chip unfam">不熟</span>'),'rust 外包單卡片顯示不熟標籤');
  ok(gigs.filter(g=>g.stack==='rust'&&!g.trap).every(g=>g.kpi===Math.round(KPI[g.cx]*1.3)),'rust 外包單有 KPI ×1.3 補償');
  ok(gigs.every(g=>STACKS[g.stack].pool[g.cx].includes(g.title)||STACKS[g.stack].pool.trap?.includes(g.title)),'外包單標題來自該技術線的題庫');
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
  ok(!els.app.innerHTML.includes('禁中國雲端')&&els.app.innerHTML.includes('<span class="chip out">外包</span>')&&els.app.innerHTML.includes('<span class="k">NT$480</span>'),'外包卡片顯示外包標籤與 NT$480，沒有禁中國雲端');
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
  for(const [st,cx,pay] of [['laravel',2,480],['rust',2,640],['fe',4,1280]]){
    newRun('laravel'); const g=gig(st,cx); S.issues=[g]; const w0=S.wallet,k0=S.kpi,t0=S.trust;
    const r=settle(lj(g));
    ok(r.ok&&g.pay===pay&&S.wallet-w0===pay&&S.kpi===k0&&S.trust===t0&&S.st.outIncome===pay&&S.st.outDone===1&&S.st.done===0&&!S.issues.includes(g),`外包 ${st} 複雜度 ${cx} 完成：錢包 +NT$${pay}，KPI 與信任不變`,`${g.pay} ${S.wallet-w0}`);
  }
  ok(S.log.some(l=>l.msg.includes('外包收入 NT$1,280')),'完成紀錄寫外包收入');
  newRun('laravel'); S.hours=8; const mg=gig('laravel',2); S.issues=[mg]; sel.issue=mg.id; const mw=S.wallet, mk=S.kpi; manual();
  ok(!S.issues.includes(mg)&&S.wallet-mw===480&&S.kpi===mk,'自己手寫完成外包單：錢包 +NT$480，KPI 不變');
  newRun('laravel','parallel'); S.hours=8; const cg=gig('laravel',2); S.issues=[cg];
  Math.random=()=>0; settle(lj(cg),{conflict:1}); Math.random=realRand;
  ok(cg.merge&&cg.out&&cg.pay===480&&S.issues.includes(cg)&&S.st.outIncome===0,'外包單合併衝突：解決衝突工單仍是外包、報酬 NT$480');
  sel.issue=cg.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp'}); render();
  ok(els.app.innerHTML.includes('<span class="chip out">外包</span>')&&els.app.innerHTML.includes('<span class="k">NT$480</span>')&&/data-b="corp" disabled>公司 API<small>外包不能用公司資源/.test(els.app.innerHTML),'解決衝突的外包單：卡片顯示外包與 NT$480，公司 API 停用');
  const cw=S.wallet, ck=S.kpi; settle(lj(cg),{conflict:1});
  ok(!S.issues.includes(cg)&&S.wallet-cw===480&&S.kpi===ck,'解決衝突的外包單完成：錢包 +NT$480，KPI 不變');
  newRun('laravel'); S.outsource=false; S.hours=0; const lg=gig('laravel',2,{due:S.day}); S.issues=[lg]; S.trust=70;
  const lw=S.wallet, lk=S.kpi; Math.random=()=>.99; endDay(); Math.random=realRand;
  ok(lw-S.wallet===144&&S.kpi===lk&&S.trust===70&&S.st.outPenalty===144&&S.st.outLate===1&&S.st.late===0&&!S.issues.includes(lg),'外包逾期：錢包 −NT$144，KPI 與信任不變，工單移除',`${lw-S.wallet} ${S.trust}`);
  newRun('laravel'); const tg=gig('laravel',1,{trap:true,revealed:true,shownCx:1,cx:4,trueCx:4}); S.issues=[tg]; sel.issue=tg.id; S.trust=70;
  ok(!dispatchPanel().includes('找主管重新評估'),'曝光的外包陷阱沒有找主管重新評估按鈕');
  rescope(); ok(S.trust===70&&!tg.rescoped,'外包單呼叫 rescope 不會有效果');
  newRun('laravel'); S.outsource=true; S.day=20;
  Object.assign(S.st,{subFee:3300,api:1000,outIncome:2400,outPenalty:144,outDone:4,outLate:1}); showEnd(); let rc=els.mo.innerHTML;
  ok(rc.includes('<span>你自己掏的錢</span><span>NT$2,044</span>'),'結算：你自己掏的錢 NT$2,044');
  ok(rc.includes('<span>外包收入</span><span>NT$2,400</span>')&&rc.includes('<span>外包違約金</span><span>NT$144</span>')&&rc.includes('<span>外包完成</span><span>4 張</span>')&&rc.includes('<span>外包逾期</span><span>1 張</span>'),'結算列出四行外包資訊');
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
  const son=model('anthropic','sonnet'), hai=model('anthropic','haiku'), opu=model('anthropic','opus');
  ok(effModel(son,1)===son,'中強度回傳原本的模型物件');
  ok(effModel(hai,0).cap===1&&effModel(opu,2).cap===6,'Haiku 低強度能力 1、Opus 高強度能力 6');
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
  S.presets[0]={v:'anthropic',m:'sonnet',b:'corp',rv:1}; fresh(); ok(same(S.presets[0],{v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1}),'沒有推理強度的方案保留並補成中');
  S.presets[0]={v:'anthropic',m:'haiku',b:'sub',rv:0,ef:2}; start(); ok(same(S.presets[0],{v:'anthropic',m:'haiku',b:'sub',rv:0,ef:2}),'再玩一個月沿用高強度方案 A');
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
  /* ===== 核心規則（gh-09-01-core-rules-specs） ===== */
  const R0=Math.random;
  /* 依序回傳 seq 裡的值，用完後一直回傳最後一個 */
  const withRand=(seq,f)=>{const a=[].concat(seq);let i=0;Math.random=()=>a[Math.min(i++,a.length-1)];try{return f();}finally{Math.random=R0;}};
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
  newRun('laravel'); S.day=6; S.subs.anthropic='pro'; showSetup(true); clickMo({pv:'anthropic',pp:'max20'}); clickMo({act:'close'});
  ok(els.ov.hidden&&S.subs.anthropic==='pro','work-calendar：不改了就關掉、方案不變');
  showSetup(true); ok(els.mo.innerHTML.includes('這次要從個人錢包付'),'work-calendar：調整彈窗顯示要付多少');
  /* 訂閱額度 */
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic={d:100,w:1700};
  ok(quotaLeft('sub','anthropic')===100,'work-calendar：每週上限比較緊時剩 100k');
  newRun('laravel'); render(); ok(els.app.innerHTML.includes('目前沒有任何訂閱。只能用 API、公司預算或本地模型。'),'work-calendar：沒有訂閱時的額度區文字');
  S.subs.anthropic='pro'; render(); ok(/Anthropic Pro<span>個人訂閱/.test(els.app.innerHTML),'work-calendar：訂閱的額度方塊標示個人訂閱');
  S.outage='anthropic'; render(); ok(/Anthropic Pro<span>今日當機/.test(els.app.innerHTML),'work-calendar：當機時額度方塊標示今日當機');

  /* agent-catalog：模型數值表 */
  const MODELS=[
    ['anthropic','haiku',2,.12,.3,.5,.9],['anthropic','sonnet',4,.45,1,.8,1],['anthropic','opus',5,1.5,3,1,.85],
    ['openai','mini',2,.1,.3,.5,1],['openai','std',4,.4,1,.8,1.05],['openai','high',5,.4,1,1.4,1.8],
    ['google','flash',2,.06,.25,.4,1.1],['google','pro',4,.35,1,.9,1],
    ['deepseek','chat',3,.03,1,.7,1.15],['deepseek','reasoner',4,.06,1,1.2,1.5],
    ['zhipu','air',3,.04,.5,.6,1.1],['zhipu','glm',4,.1,1,.9,1.1],['moonshot','k2',4,.12,1,.9,1.2],
    ['local','qwen',3,0,0,2.1,1.3],['local','gemma',3,0,0,2.4,1.25],['local','oss',2,0,0,1.8,1.2]];
  ok(Object.values(VENDORS).reduce((a,V)=>a+V.models.length,0)===16&&Object.keys(VENDORS).length===7,'agent-catalog：7 家廠商 16 個模型');
  for(const [v,m,cap,price,w,speed,verb] of MODELS){const x=model(v,m); ok(x&&x.cap===cap&&x.price===price&&x.w===w&&x.speed===speed&&x.verb===verb,`agent-catalog：${v}/${m} 數值符合表格`);}
  ok(['flash','pro'].every(m=>model('google',m).ctx)&&MODELS.filter(r=>r[0]!=='google').every(([v,m])=>!model(v,m).ctx),'agent-catalog：只有 Gemini 有 ctx');
  ok(Object.keys(VENDORS).filter(v=>VENDORS[v].cn).join()==='deepseek,zhipu,moonshot'&&model('local','qwen').cn&&!model('local','gemma').cn&&!model('local','oss').cn,'agent-catalog：中國廠商與 Qwen 中國權重');
  ok(Object.keys(VENDORS).filter(v=>VENDORS[v].corp).join()==='anthropic,google','agent-catalog：只有 Anthropic、Google 可走公司 API');
  /* 訂閱方案表 */
  const PLANS={anthropic:[['pro',650,450,1800],['max5',3300,2200,9000],['max20',6500,9000,36000]],openai:[['plus',650,500,2000],['pro',6500,8000,30000]],google:[['aipro',650,700,2800],['ultra',8000,10000,40000]],zhipu:[['lite',100,1500,6000],['pro',500,6000,24000]],moonshot:[['member',300,1500,6000]]};
  for(const v in PLANS) ok(JSON.stringify(VENDORS[v].plans.filter(p=>p.id!=='none').map(p=>[p.id,p.price,p.day,p.week]))===JSON.stringify(PLANS[v])&&VENDORS[v].plans[0].id==='none',`agent-catalog：${v} 訂閱方案符合表格`);
  ok(VENDORS.deepseek.plans.length===1&&VENDORS.local.plans.length===0,'agent-catalog：DeepSeek 與自架開源沒有訂閱');
  start();
  ok(['anthropic','openai','google','zhipu','moonshot'].every(v=>els.mo.innerHTML.includes(`data-pv="${v}" data-pp="none"`))&&!els.mo.innerHTML.includes('data-pv="deepseek"')&&!els.mo.innerHTML.includes('data-pv="local"'),'agent-catalog：開局只列五家訂閱，每家從不訂閱開始');
  /* 派工台選模型 */
  newRun('laravel'); S.hours=8; const tc=ticket('fe',2); S.issues=[tc]; sel.issue=tc.id; Object.assign(sel,{v:'openai',m:'std',b:'api'}); render();
  ok(/data-b="corp" disabled>公司 API<small>公司沒簽約/.test(els.app.innerHTML),'agent-catalog：OpenAI 不能走公司 API');
  ok(els.app.innerHTML.includes('價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。'),'agent-catalog：頁尾保留虛構數字聲明');
  ok(els.app.innerHTML.includes('<b>Gemma 27B</b><span>能力 ●●●○○</span><span class="">免費</span>')&&els.app.innerHTML.includes('免費・中國權重'),'agent-catalog：本地模型顯示免費、Qwen 標中國權重');
  ok(els.app.innerHTML.includes('派給 Codex CLI'),'agent-catalog：單線模式按鈕寫派給');
  sel.b='api'; clickApp({v:'local',m:'gemma'}); ok(sel.b==='local','agent-catalog：選本地模型切到本地 GPU');
  clickApp({v:'anthropic',m:'sonnet'}); ok(sel.b==='api','agent-catalog：離開本地切回個人 API');
  S.outage='anthropic'; render();
  ok(sel.v==='openai'&&sel.m==='mini','agent-catalog：當機的選擇改到下一家第一個可用模型',sel.v+sel.m);
  ok(['haiku','sonnet','opus'].every(m=>new RegExp(`data-v="anthropic" data-m="${m}" disabled`).test(els.app.innerHTML))&&els.app.innerHTML.includes('<span>今日當機</span>'),'agent-catalog：當機廠商的模型都停用');
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
  S.subs.anthropic='max5'; charge('sub','anthropic',model('anthropic','opus'),200); ok(near(S.used.sub.anthropic.d,600)&&near(S.used.sub.anthropic.w,600),'billing-methods：200k Opus 吃訂閱 600k');
  charge('corp','anthropic',model('anthropic','sonnet'),200); ok(near(S.corp,12000-90)&&near(S.corpDay,90)&&near(S.st.corp,90),'billing-methods：公司 API 扣預算、計入當日與月底帳單');
  ok(charge('local','local',model('local','gemma'),200).spend==='電費','billing-methods：本地 GPU 記為電費');
  S.wallet=10; charge('api','anthropic',model('anthropic','sonnet'),200); ok(near(S.wallet,-80),'billing-methods：錢包可以變負的');
  /* 錢包不夠只警告、不擋派工 */
  newRun('laravel'); S.hours=8; S.wallet=10; const tw=ticket('fe',1); S.issues=[tw]; sel.issue=tw.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0}); render();
  ok(els.app.innerHTML.includes('錢包可能不夠付這一筆。')&&!/data-act="go" disabled/.test(els.app.innerHTML),'billing-methods：錢包不夠只警告、派工按鈕可按');
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
  ok(blk(gov,'local','oss')===''&&blk(gov,'local','gemma')==='','client-restrictions：Gemma 與 gpt-oss 永遠不會被禁');
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
  withRand(.99,endDay); ok(S.kpi===37&&S.trust===62&&S.st.late===1&&S.st.kpiLost===13&&els.mo.innerHTML.includes('1 張工單逾期，主管信任下降。')&&S.log.some(l=>l.msg.includes('⌛ 逾期：')),'ticket-lifecycle：事故單逾期 KPI -13、信任 -8');
  newRun('laravel'); S.day=5; S.issues=[tn]; withRand(.99,endDay); ok(S.kpi===-3&&S.trust===66&&!S.issues.includes(tn),'ticket-lifecycle：一般工單逾期 KPI 扣一半（無條件進位）、信任 -4');
  newRun('laravel'); S.day=5; const d0=ticket('fe',1,{due:5}), d2=ticket('fe',1,{due:7}); S.issues=[d0,d2]; render();
  ok(els.app.innerHTML.includes('chip due">今天到期')&&els.app.innerHTML.includes('剩 2 天'),'ticket-lifecycle：卡片顯示今天到期與剩 N 天');
  }

  /* dispatch-outcome：成功率表 */
  {
  newRun('laravel');
  for(const [v,m,cx,big,p] of [['anthropic','sonnet',2,false,.95],['anthropic','sonnet',4,false,.8],['anthropic','haiku',3,false,.5],['anthropic','haiku',4,false,.25],['anthropic','haiku',5,false,.1],['google','pro',4,true,.88],['deepseek','chat',3,true,.72],['anthropic','opus',3,true,.95]])
    ok(near(est(ticket('fe',cx,{big}),v,m,0).p,p),`dispatch-outcome：${m} × 複雜度 ${cx}${big?'・大型':''} → ${p*100}%`,est(ticket('fe',cx,{big}),v,m,0).p);
  ok(near(est(ticket('fe',5),'anthropic','haiku',0).p,.1)&&near(est(ticket('fe',5,{big:true}),'google','flash',0).p,.18)&&near(est(ticket('fe',5,{big:true}),'anthropic','haiku',0).p,.05),'dispatch-outcome：成功率下限 5%');
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
  ok(near(cl('sub','anthropic','opus').hi,est(t2,'anthropic','opus',0).hi*3)&&cl('sub','anthropic','opus').t==='額度','dispatch-outcome：訂閱的費用列是額度 × w');
  /* 單線跑到下班 */
  newRun('laravel'); S.hours=2; const t5=ticket('fe',5); S.issues=[t5]; sel.issue=t5.id; Object.assign(sel,{v:'anthropic',m:'opus',b:'corp',rv:0}); render();
  ok(els.app.innerHTML.includes('今天剩的工時可能不夠跑完。'),'dispatch-outcome：單線工時可能不夠的警告');
  withRand(.5,dispatch);
  ok(S.hours===0&&near(S.st.tk.anthropic,722.5*.4)&&near(S.st.corp,722.5*.4*1.5)&&t5.tries===1&&S.log[0].msg.includes('跑到下班還沒結束'),'dispatch-outcome：單線跑到下班扣掉同比例 token、失敗',[S.hours,S.st.tk.anthropic].join());
  /* 一般失敗 */
  newRun('laravel'); const tfl=ticket('fe',2); S.issues=[tfl]; settle(job(tfl,'anthropic','sonnet','corp',{ok:false,tk:80}));
  ok(S.log[0].msg.includes('測試沒過，改壞了')&&near(S.st.tk.anthropic,80)&&near(S.st.byBill.corp,80),'dispatch-outcome：失敗紀錄與 token 照算');
  /* 顯示 */
  const panel=(st,cx,v,m,b,rv=0,extra={},mode='serial')=>{newRun('laravel',mode); S.hours=8; const t=ticket(st,cx,extra); S.issues=[t]; sel.issue=t.id; Object.assign(sel,{v,m,b,rv}); render(); return els.app.innerHTML;};
  ok(panel('fe',3,'deepseek','chat','api',0,{big:true}).includes('class="meh">72%'),'dispatch-outcome：72% 是黃色');
  ok(panel('fe',2,'anthropic','sonnet','corp').includes('class="good">95%'),'dispatch-outcome：95% 是綠色');
  ok(panel('fe',4,'anthropic','haiku','corp').includes('class="bad">25%'),'dispatch-outcome：25% 是紅色');
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
  for(const [v,m,c1,c2] of [['anthropic','haiku',.61,.81],['deepseek','chat',.69,.89],['anthropic','sonnet',.77,.95],['anthropic','opus',.85,.95]])
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
    advance(.1); const n=S.log.filter(l=>l.msg.includes('審 PR 花了 0.5h')).length; ok(n===2&&near(S.hours,8-.1-1),'game-modes：兩個同時做完、一個還在跑 → 各審 PR 0.5h（×1.25）',[n,S.hours]); }
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
  {const spike=EVENTS.find(f=>String(f).includes('流量暴增'));
    newRun('laravel'); S.day=5; S.issues=[ticket('fe',1),ticket('fe',2),ticket('fe',3)]; let sp=spike();
    ok(sp[0]==='新聞流量比平常高一點'&&S.issues.length===3,'random-events：第 6 天前流量暴增沒有效果',sp[0]);
    S.day=6; sp=spike(); ok(sp[0]==='大新聞爆發，流量暴增'&&S.issues.length===5&&S.issues.slice(3).every(i=>i.inc),'random-events：第 6 天起流量暴增加兩張事故單',sp[0]);}
  S.corp=10000; ev=EVENTS[3](); ok(ev[0]==='年度預算凍結'&&near(S.corp,7000),'random-events：預算凍結 -30%');
  S.subs.anthropic='pro'; S.used.sub.anthropic={d:0,w:0}; ev=withRand(0,EVENTS[4]); ok(ev[0]==='Anthropic 調整訂閱用量政策'&&near(S.capMod.anthropic,.8)&&near(quotaLeft('sub','anthropic'),360),'random-events：訂閱額度縮水 20%');
  S.issues=[]; ev=EVENTS[5](); ok(ev[0]==='大新聞爆發，流量暴增'&&S.issues.length===2&&S.issues.every(i=>i.inc),'random-events：流量暴增進兩張事故單');
  S.day=5; S.kpi=40; S.trust=70; ev=EVENTS[6](); ok(ev[0]==='主管在週會上點名稱讚'&&S.trust===76,'random-events：KPI 40 > 35 時主管稱讚 +6');
  S.kpi=35; S.trust=70; ev=EVENTS[6](); ok(ev[0]==='主管問進度怎麼這麼慢'&&S.trust===66,'random-events：KPI 35 時主管質疑 -4');
  S.kpi=40; S.trust=98; EVENTS[6](); ok(S.trust===100,'random-events：稱讚後信任上限 100');
  S.kpi=0; S.trust=2; EVENTS[6](); ok(S.trust===0,'random-events：質疑後信任下限 0');
  S.wallet=1000; ev=EVENTS[7](); ok(ev[0]==='外包案尾款入帳'&&S.wallet===2500,'random-events：尾款 +NT$1,500');
  }

  /* month-end-scoring：總分、評等、稱號、結算單 */
  {
  const endRun=(mode,set)=>{newRun('laravel',mode); resetStore(); S.day=20; set(); showEnd(); const h=els.mo.innerHTML;
    return {h,score:+h.match(/<span>總分<\/span><span>([\d,-]+)<\/span>/)[1].replace(/,/g,''),grade:h.match(/<span class="g">(\w)<\/span>/)[1],title:h.match(/<div class="gt"><b>([^<]+)<\/b>/)[1]};};
  const base=()=>{S.kpi=300; S.trust=50; S.st.subFee=2000; S.st.audits=1;};
  let r=endRun('serial',base); ok(r.score===3870&&r.grade==='A','month-end-scoring：3,870 分在單線是 A',r.score+r.grade);
  r=endRun('parallel',base); ok(r.score===3870&&r.grade==='C','month-end-scoring：3,870 分在平行是 C',r.score+r.grade);
  r=endRun('serial',()=>{base(); S.st.subFee=0; S.st.api=50000;}); ok(r.score===3000+200-500-80,'month-end-scoring：個人花費項下限 −500',r.score);
  r=endRun('serial',()=>{S.kpi=0; S.trust=0; S.st.outIncome=3000; S.st.outPenalty=1000; S.st.api=500;}); ok(r.score===Math.round((8000-(500+1000-3000))/8),'month-end-scoring：個人花費 = 訂閱 + API + 外包違約金 − 外包收入',r.score);
  ok(r.h.includes('總分 = KPI × 10 + 信任 × 4 + 省下的個人預算 ÷ 8 − 稽核次數 × 80'),'month-end-scoring：結算單寫出公式');
  /* 評等門檻 */
  const gradeAt=(mode,score)=>endRun(mode,()=>{S.trust=0; S.st.subFee=8000; S.kpi=score/10;}).grade;
  ok([[4600,'S'],[4590,'A'],[3800,'A'],[3000,'B'],[2200,'C'],[2190,'D']].every(([s,g])=>gradeAt('serial',s)===g),'month-end-scoring：單線門檻 4,600／3,800／3,000／2,200');
  ok([[7360,'S'],[7350,'A'],[6080,'A'],[4800,'B'],[3520,'C'],[3510,'D']].every(([s,g])=>gradeAt('parallel',s)===g),'month-end-scoring：平行門檻 ×1.6');
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
  ok(names()==='game_start,day_reached'&&ev.every(e=>e.kind==='event'&&e.p.day===1),'play-analytics：開局確認送 game_start 再送第 1 天 day_reached',names());
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
  /* 週一調整訂閱不送事件 */
  newRun('laravel'); S.day=6; showSetup(true); ev.length=0; clickMo({act:'confirm'}); showSetup(true); clickMo({act:'close'});
  ok(ev.length===0,'play-analytics：週一調整訂閱不送事件',names());
  /* game_end 帶 score 與 grade */
  newRun('laravel','serial'); S.kpi=300; S.trust=70; S.day=20; ev.length=0; showEnd();
  ok(ev.length===1&&ev[0].name==='game_end'&&ev[0].p.score===4280&&ev[0].p.grade==='A'&&ev[0].p.day===20,'play-analytics：game_end 帶 score 4280、grade A',JSON.stringify(ev[0]?.p));
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
  console.log(`\n${pass} passed, ${fail} failed`);
  if(fail) process.exitCode=1;
}

tests();
