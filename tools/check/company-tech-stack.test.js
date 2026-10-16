// company-tech-stack 的規則檢查：docs/spectra/specs/company-tech-stack/spec.md
import {ok,section,pristine,newRun,ticket,withRand} from './lib.js';
import {els,store,resetStore} from '../fake-dom.js';
import {firstIssues,start} from '../../public/js/main.js';
import {COMPANIES,STACKS,bestKey,h1,STACK_PICK,STACK_FE} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S,fresh,makeIssue,pickStack,sel,unfamiliar} from '../../public/js/state.js';
import {manualHrs} from '../../public/js/calc.js';
import {intakeIssue} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {setLang} from '../../public/js/i18n.js';
import {DICT as zh} from '../../public/js/i18n/zh-TW.js';
import {DICT as en} from '../../public/js/i18n/en.js';
import {showEnd,showSetup} from '../../public/js/modals.js';

section("1.1 技術線資料",()=>{
  /* 1.1 技術線資料 */
  for(const k of COMPANIES){
    for(const lv of [1,2,3,4,5,'inc']) ok(STACKS[k].pool[lv].length>=3,`STACKS.${k}.pool[${lv}] 至少 3 個標題`);
  }
  for(const lv of [1,2,3,4,5]) ok(STACKS.fe.pool[lv].length>=3,`STACKS.fe.pool[${lv}] 至少 3 個標題`);
  ok(!('POOL' in dataModule),'POOL 已移除');
  newRun('nope'); fresh(); ok(S.companies.join()==='laravel','未知公司退回 laravel');
  newRun('rust'); fresh(); ok(S.companies.join()==='rust','fresh() 保留公司');
});

section("1.2 工單技術線分布",()=>{
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
});

section("2.3 不熟技術線手寫時間（spec 範例表）",()=>{
  /* 2.3 不熟技術線手寫時間（spec 範例表） */
  for(const [co,st,cx,tries,exp] of [['laravel','laravel',2,0,'4.4'],['laravel','fe',2,0,'4.4'],['laravel','rust',2,0,'8.8'],['app','rails',3,1,'10.6'],['laravel','sre',2,0,'8.8'],[['sre','devops'],'devops',2,0,'4.4']]){
    newRun(co); ok(h1(manualHrs(ticket(st,cx,{tries})))===exp,`手寫：${co} 公司 ${st} 複雜度 ${cx} tries ${tries} → ${exp}h`,h1(manualHrs(ticket(st,cx,{tries}))));
  }
});

section("5.2 公司按鈕的難度標示",()=>{
  /* 5.2 公司按鈕的難度標示 */
  newRun('laravel'); showSetup(false);
  ok(COMPANIES.join()==='laravel,rails,rust,app,sre,devops'&&COMPANIES.every(k=>els.mo.innerHTML.includes(`data-company="${k}"`)),'開局有六個工作內容按鈕，照固定順序');
  for(const [k,stars,name] of [['laravel','★','Laravel 後端'],['rails','★','Rails 後端'],['rust','★★★','Rust 基礎設施'],['app','★★','App 開發'],['sre','★★','SRE'],['devops','★★','DevOps']]){
    const btn=els.mo.innerHTML.match(new RegExp(`data-company="${k}"[^>]*>([\\s\\S]*?)</button>`))?.[1]||'';
    ok(btn.includes(`<b>${name}</b>`)&&btn.includes(`難度 ${stars}・`),`${name} 標示難度 ${stars}`,btn);
  }
});

section("畫面元素：週一調整不顯示公司、標頭、卡片標籤、手寫按鈕",()=>{
  /* 畫面元素：週一調整不顯示公司、標頭、卡片標籤、手寫按鈕 */
  newRun('laravel'); showSetup(true);
  ok(!els.mo.innerHTML.includes('data-company'),'週一調整訂閱不顯示公司選擇');
  newRun('laravel'); const rt=ticket('rust',2), st=ticket('app',3,{store:true}); S.issues=[rt,st]; sel.issue=rt.id; render();
  ok(els.app.innerHTML.includes('Laravel 後端・工程師'),'標頭顯示工作內容名稱');
  ok(els.app.innerHTML.includes('chip unfam">不熟')&&els.app.innerHTML.includes('chip store">需上架審核'),'卡片顯示不熟與需上架審核標籤');
  ok(els.app.innerHTML.includes('自己手寫（8.8h'),'不熟的 rust 工單手寫按鈕顯示 8.8h');
});

section("3.3 最高分 key",()=>{
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
});

section("multi-stack-company：狀態、沿用、退回",()=>{
  {
  /* multi-stack-company：狀態、沿用、退回 */
  // 第一次開局的預設值：用沒開過局的 state.js（主模組的 start() 會沿用上一局的選擇）
  pristine.fresh(); ok(pristine.S.companies.join()==='laravel','預設只選 Laravel');
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
  ok(els.mo.innerHTML.includes('<label>熟悉的工作內容（可選 1–2 項，或全端打雜）</label>'),'標籤寫出熟悉的工作內容可選 1–2 項，或全端打雜');
  { const h=els.mo.innerHTML, hint='所有技術線都會進工單：選的佔 75%、前端 15%、其他 10%。沒選的算不熟，手寫要 ×2。';
    const iL=h.indexOf('熟悉的工作內容（可選 1–2 項，或全端打雜）'), iH=h.indexOf(`<p class="hint">${hint}</p>`), iB=h.indexOf('data-company=');
    ok(iL>=0&&iH>iL&&iB>iH,'提示行在標籤之後、第一顆工作內容按鈕之前',`${iL} ${iH} ${iB}`);
    ok([zh,en].every(D=>['{pick}','{fe}','{other}','{x}'].every(p=>D['ui.setup.workHint'].includes(p))),'提示行的數字從常數插值，字典不寫死');
    setLang('en'); showSetup(false); const he=els.mo.innerHTML; setLang('zh-TW');
    ok(he.includes('<label>Stacks you know (pick 1–2, or Jack of all trades)</label>')&&he.includes('<p class="hint">Every stack sends tickets: 75% to your picks, 15% frontend, 10% the rest. Stacks you did not pick are unfamiliar; hand-writing takes ×2.</p>'),'英文標籤與提示行');
    showSetup(false); }
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
  /* 用量挑戰：key 多 -burn，不讀沒開時的最高分與舊 key */
  newRun(['laravel'],'parallel'); S.burn=true; resetStore({'tokgame-best-parallel':'4200','tokgame-best-parallel-laravel':'5000'}); S.day=20; S.kpi=900; showEnd(); h2=els.mo.innerHTML;
  ok(!h2.includes('先前最佳')&&'tokgame-best-parallel-laravel-burn' in store,'用量挑戰寫入 tokgame-best-parallel-laravel-burn，不讀一般與舊 key');
  S.burn=false;
  newRun(['sre','devops'],'parallel'); ok(bestKey()==='tokgame-best-parallel-sre+devops','SRE＋DevOps 的最高分 key');

  /* 投資按鈕順序 */
  newRun(['rails','app']); render();
  const ord2=[...els.app.innerHTML.matchAll(/data-inv="md" data-st="(\w+)"/g)].map(m=>m[1]).join(',');
  ok(ord2==='rails,app,laravel,rust,sre,devops,fe','rails+app：CLAUDE.md 按鈕順序 rails, app, laravel, rust, sre, devops, fe',ord2);
  newRun(['rust','app']); S.day=20; showEnd(); press({act:'again'});
  ok(S.companies.join()==='rust,app'&&/class="sb sel" data-company="rust"/.test(els.mo.innerHTML)&&/class="sb sel" data-company="app"/.test(els.mo.innerHTML),'結算按「再玩一個月」沿用 Rust＋App 並預選');
  }
});

section("gh-69-01 全端打雜：工單分布、事故單、不熟",()=>{
  /* 一般工單：fe 約 15%，六條線各約 14.17%，沒有 undefined */
  newRun([]); const N=10000, cnt={laravel:0,rails:0,rust:0,app:0,sre:0,devops:0,fe:0}; let bad=0;
  for(let i=0;i<N;i++){const s=pickStack(); if(s in cnt)cnt[s]++; else bad++;}
  ok(bad===0,'全端打雜：每張一般工單都有技術線',bad);
  ok(Math.abs(cnt.fe/N-.15)<=.02,'全端打雜：fe 約 0.15',cnt.fe/N);
  ok(COMPANIES.every(k=>Math.abs(cnt[k]/N-.85/6)<=.015),'全端打雜：六條線各約 0.1417',JSON.stringify(cnt));
  /* 亂數次數跟有選時一樣：一次 Math.random 加一次 pick（fe 那支沒有 pick） */
  const calls=(cs,r)=>{newRun(cs); let n=0; withRand([r,.5],()=>{const f=Math.random; Math.random=()=>{n++;return f();}; pickStack();}); return n;};
  const fe=STACK_PICK+STACK_FE/2, line=.99;
  ok(calls([],STACK_FE/2)===calls(['laravel'],fe)&&calls([],STACK_FE/2)===1,'全端打雜：抽到前端那支 pickStack 用 1 次亂數，跟選一條時抽到前端相同',`${calls([],STACK_FE/2)} ${calls(['laravel'],fe)}`);
  ok(calls([],line)===calls(['laravel'],line)&&calls([],line)===2,'全端打雜：抽到六條線那支 pickStack 用 2 次亂數，跟選一條時相同',`${calls([],line)} ${calls(['laravel'],line)}`);
  /* 事故單：六條線都會出、都不是 fe */
  newRun([]); const incs=[...Array(1000)].map(()=>makeIssue(true));
  ok(incs.every(i=>COMPANIES.includes(i.stack))&&COMPANIES.every(k=>incs.some(i=>i.stack===k)),'全端打雜：1,000 張事故單都在六條線上、六條都有');
  /* 第 12 天進件：沒有 SRE 第二擲，事故 0.12、其中 sre 約 0.02 */
  newRun([]); S.day=12; const T=10000, got=[...Array(T)].map(intakeIssue);
  const a=got.filter(i=>i.inc).length/T, r=got.filter(i=>i.inc&&i.stack==='sre').length/T;
  ok(Math.abs(a-.12)<=.01&&Math.abs(r-.02)<=.01,'進件：全端打雜第 12 天事故 0.12、sre 事故 0.02',`${a} ${r}`);
  /* 前端以外都不熟，手寫 ×2 */
  newRun([]);
  ok(COMPANIES.every(k=>unfamiliar(ticket(k,2))&&h1(manualHrs(ticket(k,2)))==='8.8'),'全端打雜：六條線都不熟，複雜度 2 手寫 8.8h');
  ok(!unfamiliar(ticket('fe',2))&&h1(manualHrs(ticket('fe',2)))==='4.4','全端打雜：前端不算不熟，手寫 4.4h');
});

section("gh-69-01 全端打雜：存法、名稱、最高分 key",()=>{
  /* normCompanies：空陣列合法，其他不合法照舊退回 Laravel */
  for(const [v,exp] of [[[],''],['rust','rust'],[['laravel','rails','rust'],'laravel'],[['go'],'laravel'],['','laravel'],[null,'laravel']]){
    S.companies=v; fresh(); ok(S.companies.join()===exp,`存的工作內容 ${JSON.stringify(v)} → ${exp||'全端打雜（空）'}`,S.companies.join());
  }
  newRun([]); ok(dataModule.companyName()==='全端打雜'&&dataModule.companyName([])==='全端打雜','全端打雜的名稱');
  setLang('en'); ok(dataModule.companyName([])==='Jack of all trades','英文名稱 Jack of all trades'); setLang('zh-TW');
  render(); ok(els.app.innerHTML.includes('全端打雜・工程師'),'標頭顯示全端打雜');
  newRun([],'serial'); ok(bestKey()==='tokgame-best-serial-none','全端打雜的最高分 key 是 tokgame-best-serial-none');
  S.burn=true; ok(bestKey()==='tokgame-best-serial-none-burn','開用量挑戰是 tokgame-best-serial-none-burn'); S.burn=false;
  const endNone=(burn,seed)=>{newRun([],'serial');S.burn=burn;resetStore(seed);S.day=20;S.kpi=900;showEnd();return els.mo.innerHTML;};
  let h=endNone(false,{'tokgame-best-serial':'999999'});
  ok(h.includes('月底結算・全端打雜・')&&'tokgame-best-serial-none' in store&&!h.includes('999,999'),'全端打雜月底寫入 -none、不讀舊 key、結算標題寫全端打雜');
  endNone(true,{}); ok('tokgame-best-serial-none-burn' in store,'全端打雜開用量挑戰寫入 -none-burn'); S.burn=false;
});

section("gh-69-01 全端打雜：開局按鈕、提示行、說明句",()=>{
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const picked=()=>[...COMPANIES,'none'].filter(k=>new RegExp(`class="sb sel" data-company="${k}"`).test(els.mo.innerHTML)).join();
  const btn=k=>els.mo.innerHTML.match(new RegExp(`<button[^>]*data-company="${k}"[^>]*>([\\s\\S]*?)</button>`))?.[0]||'';
  start(); S.companies=['laravel']; showSetup(false);
  { const b=btn('none'), i6=els.mo.innerHTML.indexOf('data-company="devops"'), i7=els.mo.innerHTML.indexOf('data-company="none"');
    ok(b.includes('<b>全端打雜</b>')&&b.includes('難度 ★★★★・什麼都接，前端以外都不熟。')&&i7>i6,'第七顆按鈕：全端打雜、難度 ★★★★、說明，排在 DevOps 後面',b); }
  S.companies=[]; showSetup(false);
  ok(COMPANIES.every(k=>!/disabled/.test(btn(k))),'全端打雜時六條線的按鈕都沒有停用',COMPANIES.filter(k=>/disabled/.test(btn(k))).join());
  /* spec 的 toggle 表（含全端打雜三列） */
  for(const [before,click,after] of [[['laravel'],'devops','laravel,devops'],[['laravel','app'],'sre','laravel,app'],[['laravel','app'],'laravel','app'],[['sre'],'sre','sre'],[['laravel','app'],'none','none'],[[],'rust','rust'],[[],'none','none']]){
    start(); S.companies=before; showSetup(false);
    if(click==='none'&&before.length===2) ok(!/data-company="none"[^>]*disabled/.test(btn('none')),'選滿兩條時全端打雜仍可按');
    press({company:click}); ok(picked()===after,`toggle：${before.join(',')||'全端打雜'} 點 ${click} → ${after}`,picked());
  }
  /* 全端打雜狀態的提示行、說明句；確認後重抽第 1 天工單 */
  start(); S.companies=['laravel']; showSetup(false);
  press({company:'none'});
  ok(els.mo.innerHTML.includes('<p class="hint">沒有熟悉的技術線：工單 85% 平分給六條線、前端 15%，前端以外手寫都要 ×2。</p>'),'全端打雜的提示行');
  ok(els.mo.innerHTML.includes('你是工程師，負責「全端打雜」。'),'全端打雜的開局說明');
  ok([zh,en].every(D=>['{six}','{fe}','{x}'].every(p=>D['ui.setup.workHintNone'].includes(p))),'全端打雜提示行的數字從常數插值');
  setLang('en'); showSetup(false); press({company:'none'}); const he=els.mo.innerHTML; setLang('zh-TW');
  ok(he.includes('<p class="hint">No familiar stack: 85% of tickets are split over the six stacks, 15% frontend; hand-writing anything but frontend takes ×2.</p>')&&he.includes('<b>Jack of all trades</b>')&&he.includes('Take anything; every stack but frontend is unfamiliar.'),'英文的全端打雜按鈕與提示行');
  start(); S.companies=['laravel']; showSetup(false); const iss0=S.issues[0]; press({company:'none'}); press({act:'confirm'});
  ok(S.companies.length===0&&S.issues.length===4&&S.issues[0]!==iss0,'確認全端打雜後存成空陣列並重抽第 1 天工單');
  ok(els.app.innerHTML.includes('全端打雜・工程師')&&S.log.some(l=>l.msg.includes('全端打雜・遊戲模式')),'標頭與開局紀錄寫全端打雜');
  showSetup(false); press({company:'rails'}); press({act:'confirm'}); ok(S.companies.join()==='rails','從全端打雜換回 Rails 後重存');
});
