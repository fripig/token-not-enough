// ticket-lifecycle 的規則檢查：docs/spectra/specs/ticket-lifecycle/spec.md
import {ok,near,section,newRun,ticket,withRand,job} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {BASE,KPI} from '../../public/js/data.js';
import {S,hardStack,makeIssue,sel} from '../../public/js/state.js';
import {est,manualHrs} from '../../public/js/calc.js';
import {dispatch,endDay,manual,settle} from '../../public/js/actions.js';
import {dispatchPanel,render} from '../../public/js/view.js';
import * as A from '../../public/js/actions.js';

section("本地 GPU 在跑時不能手寫",()=>{
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
});

section("ticket-lifecycle：工單產生",()=>{
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
});
