// 規則檢查（非遊戲本體）
// 用法：node tools/check.js [public/js/game.js]
// 用假的 DOM 載入遊戲腳本，把 spec 裡的範例數字逐條斷言；任何一條不符就以非 0 結束。
const el=()=>({innerHTML:'',hidden:true,addEventListener(){},querySelector(){return null},setAttribute(){},onclick:null});
const els={app:el(),ov:el(),mo:el()};
global.document={getElementById:id=>els[id]};
let store={};
global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}};
const file=process.argv[2]||require('path').join(__dirname,'..','public','js','game.js');
const src=require('fs').readFileSync(file,'utf8');

let pass=0,fail=0;
function ok(cond,name,detail=''){if(cond){pass++;}else{fail++;console.log('✗',name,detail);}}
function near(a,b,eps=1e-9){return Math.abs(a-b)<=eps;}

function tests(){
  // 開一局但不經過彈窗：直接設定公司與模式
  const newRun=(company,mode='serial')=>{start();S.company=company;S.mode=mode;S.issues=[];S.jobs=[];sel.rv=0;};
  const ticket=(stack,cx,extra={})=>({id:++uid,title:'t',cx,base:BASE[cx],inc:false,sens:false,big:false,client:CLIENTS[0],due:20,kpi:KPI[cx],tries:0,stack,store:false,...extra});

  /* 1.1 技術線資料 */
  for(const k of COMPANIES){
    for(const lv of [1,2,3,4,5,'inc']) ok(STACKS[k].pool[lv].length>=3,`STACKS.${k}.pool[${lv}] 至少 3 個標題`);
  }
  for(const lv of [1,2,3,4,5]) ok(STACKS.fe.pool[lv].length>=3,`STACKS.fe.pool[${lv}] 至少 3 個標題`);
  ok(typeof POOL==='undefined','POOL 已移除');
  newRun('nope'); fresh(); ok(S.company==='laravel','未知公司退回 laravel');
  newRun('rust'); fresh(); ok(S.company==='rust','fresh() 保留公司');

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
    const btn=els.mo.innerHTML.match(new RegExp(`data-company="${k}">([\\s\\S]*?)</button>`))?.[1]||'';
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
  const endWith=(company,mode,seed)=>{newRun(company,mode);store={...seed};S.day=20;showEnd();return els.mo.innerHTML;};
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

  console.log(`\n${pass} passed, ${fail} failed`);
  if(fail) process.exitCode=1;
}

eval(src+'\n;('+tests.toString()+')();');
