// game-modes 的規則檢查：docs/spectra/specs/game-modes/spec.md
import {ok,near,section,pristine,newRun,ticket,withRand,clickMo,job} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {BASE,h1,model} from '../../public/js/data.js';
import {S,fresh,sel} from '../../public/js/state.js';
import {est} from '../../public/js/calc.js';
import {advance,prHrs,dispatch,endDay,makeJob,manual,trueView} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {showSetup} from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import * as C from '../../public/js/calc.js';
import * as M from '../../public/js/modals.js';
import * as Ru from '../../public/js/rules.js';
import * as Vw from '../../public/js/view.js';

section("game-modes：模式選擇",()=>{
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
});

section("玩家中止背景 agent（gh-32-01-abort-agent）",()=>{
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
});
