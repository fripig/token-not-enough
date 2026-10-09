// 規則檢查（非遊戲本體）
// 用法：node tools/check.js
// 用假的 DOM 載入遊戲模組，把 spec 裡的範例數字逐條斷言；任何一條不符就以非 0 結束。
import {els,store,resetStore} from './fake-dom.js';
// 先載入入口模組，模組初始化順序才會和瀏覽器一樣（main.js 載入時會呼叫 start()）
import {start} from '../public/js/main.js';
import {BASE,CLIENTS,COMPANIES,DEFAULT_PRESETS,EFFORT,KPI,SEAT,STACKS,VENDORS,bestKey,cnBlock,effModel,h1,kt,model,presetsOf,rnd} from '../public/js/data.js';
import * as dataModule from '../public/js/data.js';
import {GIG_CLIENT,GIG_PAY,S,addGigs,hardStack,fresh,makeGig,makeIssue,nextId,pickStack,sel,unfamiliar} from '../public/js/state.js';
import {catchRate,costLine,storeReject,est,manualHrs,presetBlock,presetFor,quotaLeft,stackHint} from '../public/js/calc.js';
import {EVENTS,advance,auditOdds,auditRoll,conflictRate,prHrs,batch,canEvaluate,charge,dispatch,endDay,evalCost,evaluate,invCount,invest,loadPreset,makeJob,manual,parMul,quick,rescope,reveal,revealRate,savePreset,settle,trueView} from '../public/js/actions.js';
import {dispatchPanel,render} from '../public/js/view.js';
import {showEnd,showSetup} from '../public/js/modals.js';

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
  for(const [n,exp] of [[2,1.15],[4,1.45],[6,1.75]]){newRun('laravel','parallel'); S.slots=n; S.jobs=Array(n-1).fill({left:1}); ok(near(parMul(),exp),`${n} 個工作槽、已有 ${n-1} 個在跑 → token ×${exp}`);}
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
    newRun('laravel'); S.issues=[]; let txt=spike(); ok(txt[1].includes('今天下班前'),'沒有監控：流量暴增寫今天');
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

  console.log(`\n${pass} passed, ${fail} failed`);
  if(fail) process.exitCode=1;
}

tests();
