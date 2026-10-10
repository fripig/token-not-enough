// save-game 的規則檢查：docs/spectra/specs/save-game/spec.md
import {ok,section,newRun,ticket,job} from './lib.js';
import {els,store,resetStore} from '../fake-dom.js';
import {boot,start} from '../../public/js/main.js';
import {bestKey,model} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S,fresh,sel} from '../../public/js/state.js';
import {dispatch,endDay} from '../../public/js/actions.js';
import {showEnd,showSetup} from '../../public/js/modals.js';
import * as M from '../../public/js/modals.js';
import * as St from '../../public/js/state.js';

section("save-game（gh-11-01-save-game）",()=>{
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
});

section("Day-start save",()=>{
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
});

section("Save lifetime",()=>{
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
});

section("Resume on page load",()=>{
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
});
