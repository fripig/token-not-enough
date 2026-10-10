// company-tech-stack 的規則檢查：docs/spectra/specs/company-tech-stack/spec.md
import {ok,section,pristine,newRun,ticket} from './lib.js';
import {els,store,resetStore} from '../fake-dom.js';
import {firstIssues,start} from '../../public/js/main.js';
import {COMPANIES,STACKS,bestKey,h1} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S,fresh,makeIssue,pickStack,sel,unfamiliar} from '../../public/js/state.js';
import {manualHrs} from '../../public/js/calc.js';
import {intakeIssue} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
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
});
