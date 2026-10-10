// local-hardware 的規則檢查：docs/spectra/specs/local-hardware/spec.md
import {ok,near,section,newRun,ticket} from './lib.js';
import {els,store} from '../fake-dom.js';
import {CLIENTS,model} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S,sel} from '../../public/js/state.js';
import {est,presetBlock} from '../../public/js/calc.js';
import {dispatch,endDay,evalCost,evaluate,manual} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import * as A from '../../public/js/actions.js';
import * as M from '../../public/js/modals.js';
import * as St from '../../public/js/state.js';

section("local-hardware（gh-17-01-local-hardware）：採購電腦",()=>{
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
  /* 跑過夜的本地 agent：隔天開工就算用到（#36） */
  const overnight=(hw,m,act=()=>{})=>{newRun('laravel','parallel'); hw.forEach(k=>S.hw[k]=true); const run=ticket('laravel',3,{running:true}); S.issues.push(run); S.jobs=[{...localJob(run),m,M:model('local',m),left:20,hrs:20}]; S.hours=0; end(); S.trust=60; act(run); S.hours=0; end(); return S.trust;};
  ok(overnight(['pc','spark'],'qcnext')===60,'local-hardware：Qwen3-Coder-Next 跑過夜，隔天 PC、Spark 都算用到');
  ok(overnight(['pc','spark'],'gemma')===58&&els.mo.innerHTML.includes('電腦閒置：NVIDIA DGX Spark 今天沒用到，主管覺得白買了（信任 -2）。'),'local-hardware：Gemma 4 26B A4B 跑過夜，隔天只有 Spark 閒置');
  ok(overnight(['pc'],'gemma',run=>A.cancelJob(run.id))===60,'local-hardware：跑過夜的本地 agent 隔天被中止仍算用到');
  ok(overnight(['pc','mac'],'glm53')===60,'local-hardware：GLM-5.3 跑過夜，隔天 PC、Mac 都算用到');
  {newRun('laravel','parallel'); S.hw.pc=S.hw.spark=true; const run=ticket('laravel',3,{running:true}); S.issues.push(run); S.jobs=[{...localJob(run),m:'qcnext',M:model('local','qcnext'),left:20,hrs:20}]; S.hours=0; end();
  const u=JSON.parse(store[St.SAVE_KEY]).S.hwUsed; ok(S.jobs.length===1&&u.pc&&u.spark&&!u.mac,'local-hardware：開工存檔記下過夜 agent 用到的電腦',JSON.stringify(u));}
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
});
