// play-analytics 的規則檢查：docs/spectra/specs/play-analytics/spec.md
import {ok,section,newRun,ticket} from './lib.js';
import {readFileSync} from 'node:fs';
import {els} from '../fake-dom.js';
import {BASE,model} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S,sel} from '../../public/js/state.js';
import {batch,dispatch,endDay,evaluate,invest,manual,quick,rescope,settle} from '../../public/js/actions.js';
import {showEnd,showSetup} from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import * as M from '../../public/js/modals.js';

section("GA 遊戲事件（gh-10-01-play-analytics）",()=>{
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
  const wf=readFileSync(new URL('../../.github/workflows/pages.yml',import.meta.url),'utf8');
  ok(dataModule.GAME_VERSION==='dev','play-analytics：repo 裡的 GAME_VERSION 是 dev');
  ok(wf.includes(`sed -i "s/export const GAME_VERSION='dev';/export const GAME_VERSION='\${GITHUB_SHA::7}';/" public/js/data.js`)&&wf.includes(`grep -q "GAME_VERSION='\${GITHUB_SHA::7}'" public/js/data.js`)&&wf.indexOf('Stamp game version')<wf.indexOf('upload-pages-artifact'),'play-analytics：部署前把版本換成短 commit hash 並檢查');
  }
});

section("派工與結果事件（gh-14-01-choice-analytics）",()=>{
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
});
