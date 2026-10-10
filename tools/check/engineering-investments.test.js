// engineering-investments 的規則檢查：docs/spectra/specs/engineering-investments/spec.md
import {ok,near,section,newRun,ticket,withRand,job} from './lib.js';
import {els,store,resetStore} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {BASE,CLIENTS,DEFAULT_PRESETS,KPI,model,presetsOf} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S,hardStack,fresh,makeIssue,sel,unfamiliar} from '../../public/js/state.js';
import {catchRate,storeReject,est,manualHrs,presetBlock,presetFor,stackHint} from '../../public/js/calc.js';
import {EVENTS,advance,auditOdds,auditRoll,conflictRate,prHrs,batch,dispatch,endDay,evalCost,invCount,invest,loadPreset,makeJob,manual,quick,revealRate,savePreset,settle,trueView} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {monthScore,showEnd} from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import * as C from '../../public/js/calc.js';
import * as M from '../../public/js/modals.js';
import * as St from '../../public/js/state.js';
import * as Ru from '../../public/js/rules.js';
import * as Vw from '../../public/js/view.js';

const son=model('anthropic','sonnet'), hai=model('google','flash');

section("engineering-investments：購買與拒絕",()=>{
  /* engineering-investments：購買與拒絕 */
  const snap=()=>JSON.stringify([S.hours,S.corp,S.inv]);
  newRun('laravel'); S.hours=8;
  ok(invest('tests')&&near(S.hours,4)&&S.corp===11600&&S.st.corp===400&&S.corpDay===400&&S.inv.tests,'單線買單元測試：剩 4h、公司預算 11,600、計入公司帳單');
  render(); ok(/data-inv="tests"\s+disabled><b>單元測試 Lv2<\/b><small>需要去過綜合場/.test(els.app.innerHTML),'買過 Lv1 的單元測試顯示 Lv2 的鎖定原因');
  ok(!els.app.innerHTML.includes('補測試'),'畫面上沒有補測試');
  const invRows=[...els.app.innerHTML.matchAll(/data-inv="(\w+)"(?! data-st)/g)].map(m=>m[1]).join(',');
  ok(invRows==='tests,ci,hook,scan,fastlane,monitor,skills,mcp,sdd,ai','投資面板順序：單元測試、CI、hook、scan、fastlane、監控、skills、MCP、SDD、提升 agent 能力',invRows);
  let before=snap(); ok(!invest('tests')&&snap()===before,'已買過不能再買');
  newRun('laravel'); S.hours=8; ok(invest('monitor')&&near(S.hours,5)&&S.corp===11600&&S.inv.monitor,'單線買監控告警：剩 5h、公司預算 11,600');
  newRun('laravel'); S.hours=5; before=snap(); ok(!invest('sdd')&&snap()===before,'剩 5h 買不了導入 SDD');
  newRun('laravel'); S.corp=200; before=snap(); ok(!invest('md','laravel')&&snap()===before,'公司預算 200 買不了 CLAUDE.md');
  newRun('laravel'); ok(!invest('md','nope')&&!invest('nope'),'不存在的技術線或投資不動作');
  newRun('laravel','parallel'); S.hours=8; const bj={v:'anthropic',b:'local',M:model('local','qwen'),issue:ticket('fe',1),left:1,hrs:1,ok:true,caught:false,tk:10,rv:0};
  bj.v='local'; S.issues=[bj.issue]; bj.issue.running=true; S.jobs=[bj];
  ok(invest('md','rails')&&S.hours<=5+1e-9&&S.hours>=4.5&&S.jobs.length===0,'平行模式投資推進時鐘 3h（加上審 PR）、背景 agent 照跑完；本地 GPU 忙也能投資',S.hours);
  start(); ok(invCount()===0&&!S.inv.md.rails,'新的一局投資歸零');
});

section("CLAUDE.md 效果",()=>{
  /* CLAUDE.md 效果 */
  newRun('laravel'); S.hours=8;
  const l4=ticket('laravel',4), fe4=ticket('fe',4);
  const e0=est(l4,'anthropic','sonnet',0), f0=est(fe4,'anthropic','sonnet',0);
  invest('md','laravel');
  const e1=est(l4,'anthropic','sonnet',0), f1=est(fe4,'anthropic','sonnet',0);
  ok(near(e1.tk,e0.tk*.85)&&near(e0.p,.8)&&near(e1.p,.86),'Laravel CLAUDE.md：token ×0.85、成功率 0.80 → 0.86',`${e0.p} ${e1.p}`);
  ok(near(f1.tk,f0.tk)&&near(f1.p,f0.p),'Laravel CLAUDE.md 不影響 fe 工單');
  sel.issue=l4.id; S.issues=[l4]; render(); ok(els.app.innerHTML.includes('Laravel 有 CLAUDE.md：token ×0.85、成功率 +6%'),'派工台提示生效的投資（數字四捨五入）');
});

section("單元測試與 CI 流水線效果",()=>{
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
});

section("pre-commit／lint hook 效果",()=>{
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
});

section("secret scanning／脫敏效果",()=>{
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
});

section("上架自動化（fastlane）效果",()=>{
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
});

section("監控告警效果",()=>{
  /* 監控告警效果 */
  {
    const realRand=Math.random;
    newRun('laravel'); S.day=5; const q=makeIssue(true);
    ok(q.due===5,'沒有監控：第 5 天的事故單當天到期');
    S.day=20; ok(makeIssue(true).due===20,'沒有監控：第 20 天的事故單第 20 天到期'); S.day=5;
    S.inv.monitor=true; const m5=makeIssue(true); S.day=20; const m20=makeIssue(true);
    ok(q.kpi===Math.round(KPI[4]*1.6*(hardStack('laravel')?1.3:1))&&m5.kpi===Math.round(KPI[4]*1.2),'有監控：之後的事故單 KPI 加成 ×1.6 → ×1.2',`${q.kpi} ${m5.kpi}`);
    ok(m5.due===6&&m20.due===20&&q.due===5,'有監控：第 5 天的事故單第 6 天到期、第 20 天仍是 20，已在佇列的不變',`${m5.due} ${m20.due}`);
    const spike=EVENTS.find(f=>String(f).includes('ev.traffic'));
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
});

section("新投資的派工台提示只在相關工單出現",()=>{
  /* 新投資的派工台提示只在相關工單出現 */
  {
    newRun('laravel'); S.inv.scan=S.inv.fastlane=S.inv.monitor=true;
    const sh=ticket('laravel',2,{sens:true}); S.issues=[sh]; sel.issue=sh.id; render();
    const h=els.app.innerHTML;
    ok(h.includes('secret scanning：個人帳號稽核機率 ×0.5')&&!h.includes('fastlane：')&&!h.includes('監控告警：'),'機敏 laravel 工單只提示 secret scanning');
    const ap=ticket('app',3,{store:true,inc:true}); S.issues=[ap]; sel.issue=ap.id; render();
    ok(els.app.innerHTML.includes('fastlane：退件機率 10%')&&els.app.innerHTML.includes('監控告警：逾期扣信任 4'),'需上架的 app 事故單提示 fastlane 與監控告警');
    S.inv.hook=S.inv.ci=true; render(); ok(!els.app.innerHTML.includes('pre-commit hook：')&&!els.app.innerHTML.includes('CI 流水線：合併'),'單線模式不提示 hook 與 CI');
    S.mode='parallel'; render(); ok(els.app.innerHTML.includes('pre-commit hook：審 PR 時間減半')&&els.app.innerHTML.includes('CI 流水線：合併衝突減半'),'平行模式提示 hook 與 CI');
  }
});

section("接 MCP 文件效果",()=>{
  /* 接 MCP 文件效果 */
  newRun('laravel'); 
  const ev0=evalCost(son), hr0=revealRate(hai); S.inv.mcp=true;
  ok(near(revealRate(son),.95)&&near(evalCost(son).hrs,.2)&&near(evalCost(son).tk,ev0.tk),'MCP：Sonnet 識破率 0.95、評估 0.2h、token 不變');
  ok(near(hr0,.65)&&near(revealRate(hai),.85),'MCP：Gemini Flash 識破率 0.65 → 0.85');
});

section("導入 SDD 效果",()=>{
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

  /* SDD 兩級：套用的等級 = min(選的, 已買的) */
  {  newRun('laravel'); const fe4=ticket('fe',4), fe2=ticket('fe',2), b4=est(fe4,'anthropic','sonnet',0,1,2), b2=est(fe2,'anthropic','sonnet',0,1,2);
  ok(C.sddLevel(2)===0&&near(b4.p,.80),'SDD 沒買：選 2 也套 0 級，複雜度 4 fe × Sonnet 0.80');
  S.inv.sdd=2;
  ok([[0,.80,1],[1,.88,1.1],[2,.95,1.2]].every(([L,p,k])=>{const e=est(fe4,'anthropic','sonnet',0,1,L);return near(e.p,p)&&near(e.tk,b4.tk*k);}),'SDD 各級：複雜度 4 fe × Sonnet 成功率 0.80／0.88／0.95、token ×1／1.1／1.2');
  ok(near(est(fe2,'anthropic','sonnet',0,1,2).tk,b2.tk*1.2)&&near(est(fe2,'anthropic','sonnet',0,1,2).p,b2.p),'SDD Lv2：複雜度 2 token ×1.2、成功率不變');
  S.inv.sdd=1; ok(C.sddLevel(2)===1&&C.sddLevel(0)===0&&C.sddLevel(undefined)===1,'SDD 只買 Lv1：選 2 套 1、選 0 套 0、沒選當 2');
  S.inv.sdd=2; ok(near(evalCost(son).tk,ec0.tk)&&near(evalCost(son).hrs,ec0.hrs),'SDD Lv2 不影響評估架構');
  for(const [L,f,note] of [[1,.15,'寫規格時就發現牽扯整個架構'],[2,.05,'跑框架流程時就發現牽扯整個架構']]){
    const tp=ticket('fe',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false});
    S.issues=[tp]; Object.assign(sel,{issue:tp.id,v:'deepseek',m:'chat',b:'api',rv:0,sdd:L});
    const e5=est(trueView(tp),'deepseek','chat',0), jj=makeJob(tp);
    ok(jj.stop&&jj.sdd===L&&jj.tk>=e5.tk*f*.7-1e-9&&jj.tk<=e5.tk*f*1.3+1e-9&&jj.hrs<=e5.hrs*f*1.2+1e-9,`SDD Lv${L}：陷阱只燒真實估計的 ${f}`,`${jj.tk/e5.tk}`);
    const rr=settle(jj); ok(!rr.ok&&tp.revealed&&S.log[0].msg.includes(note),`SDD Lv${L}：陷阱失敗、曝光，紀錄寫出「${note}」`,S.log[0].msg);
  }
  {const tp=ticket('fe',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false});
    S.issues=[tp]; Object.assign(sel,{issue:tp.id,sdd:0}); const e5=est(trueView(tp),'deepseek','chat',0), jj=makeJob(tp);
    ok(jj.stop&&jj.sdd===0&&jj.tk>=e5.tk*.4*.7-1e-9&&jj.tk<=e5.tk*.4*1.3+1e-9,'SDD 選不用：陷阱照燒 0.4');
    settle(jj); ok(S.log[0].msg.includes('做到一半發現牽扯整個架構'),'SDD 選不用：陷阱紀錄是做到一半發現');}
  sel.sdd=2;

  /* SDD Lv2 購買：不用研討會、1h、NT$200 */
  {const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
  newRun('laravel'); S.inv.sdd=1; S.hours=8; S.corp=11500;
  ok(invest('sdd')&&near(S.hours,7)&&S.corp===11300&&S.inv.sdd===2&&A.investBlock('sdd')==='已完成','SDD Lv2：8h、NT$11,500 → 7h、NT$11,300，已完成');
  ok(ge.some(e=>e.n==='invest'&&e.p.investment==='sdd2'),'SDD Lv2：GA invest 送 sdd2',JSON.stringify(ge));
  delete globalThis.gtag;}
  newRun('laravel'); S.inv.sdd=1; S.hours=.5; let sddBefore=JSON.stringify(S);
  ok(!invest('sdd')&&JSON.stringify(S)===sddBefore&&A.investBlock('sdd')==='工時不夠','SDD Lv2：剩 0.5h 買不了');
  S.hours=8; render(); ok(!/data-inv="sdd"[^>]*>[\s\S]{0,80}需要去過/.test(els.app.innerHTML)&&A.invLock('sdd',undefined,2)==='','SDD Lv2 按鈕不寫需要去過研討會');}
});

section("批次派工",()=>{
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
});

section("單線批次派工照方案自己的推理強度估工時（不是派工台目前的選擇）",()=>{
  /* 單線批次派工照方案自己的推理強度估工時（不是派工台目前的選擇） */
  newRun('laravel'); S.advanced=true; S.inv.skills=true; sel.ef=1; const hiT=ticket('fe',2); S.issues=[hiT];
  S.presets=presetsOf(DEFAULT_PRESETS).map((p,i)=>i?p:{...p,ef:2}); const midH=est(hiT,'deepseek','chat',1,1).hrs; S.hours=midH*1.2; batch();
  ok(S.issues.includes(hiT)&&!S.log.some(l=>l.msg.startsWith('D01 → 派出'))&&near(S.hours,midH*1.2),'單線批次派工：方案 A 高強度估的工時放不下就停下來（派工台選中強度也一樣）');
  S.advanced=false;
  newRun('laravel','parallel'); S.inv.skills=true; S.hours=8; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'deepseek',m:'chat',b:'api'}));
  const gov=ticket('fe',1,{client:CLIENTS[3]}), okT=ticket('fe',1); S.issues=[gov,okT]; batch();
  ok(gov.running!==true&&okT.running===true&&S.log.some(l=>l.msg.includes('派出 1 張，略過 1 張')),'沒有可用方案的工單被略過');
});

section("投資面板、結算、開局說明",()=>{
  /* 投資面板、結算、開局說明 */
  newRun('rails'); render();
  const order=[...els.app.innerHTML.matchAll(/data-inv="md" data-st="(\w+)"/g)].map(m=>m[1]).join(',');
  ok(order==='rails,laravel,rust,app,sre,devops,fe','CLAUDE.md 按鈕：主技術線優先，再其他工作內容，最後 fe',order);
  newRun('laravel'); S.hours=8; invest('md','laravel'); S.hours=8; invest('tests'); S.hours=8; invest('ci'); S.day=20; showEnd();
  ok(els.mo.innerHTML.includes('<span>工程投資</span><span>3 項</span>'),'結算顯示工程投資 3 項（CLAUDE.md＋單元測試＋CI）');
  start(); ok(els.mo.innerHTML.includes('派工方案與工程投資')&&els.mo.innerHTML.includes('監控告警')&&!els.mo.innerHTML.includes('補測試'),'開局說明提到派工方案與工程投資（含新項目，沒有補測試）');
});

section("派工台的 SDD 選項與派工方案（gh-33-01-sdd-levels）",()=>{
  {
  /* ===== 派工台的 SDD 選項與派工方案（gh-33-01-sdd-levels） ===== */
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const clickApp=ds=>els.app.on.click({target:{closest:()=>({dataset:ds,disabled:false})}});
  const panel=()=>{render(); return els.app.innerHTML;};
  newRun('laravel'); S.hours=8; const t2=ticket('laravel',2); S.issues=[t2]; sel.issue=t2.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0});
  ok(sel.sdd===2,'新局 SDD 選擇是 2（已買的最高級）');
  let h=panel(); ok(!h.includes('開發流程')&&!h.includes('data-sdd'),'沒買 SDD：派工台沒有開發流程');
  S.inv.sdd=1; h=panel();
  ok(h.includes('開發流程')&&/data-sdd="0"/.test(h)&&/class="sb sel" data-sdd="1"/.test(h)&&!h.includes('data-sdd="2"'),'買了 Lv1：不用、markdown，亮 markdown');
  S.inv.sdd=2; h=panel(); ok(/class="sb sel" data-sdd="2"/.test(h)&&h.includes('框架（Lv2）'),'買了 Lv2：三個按鈕，亮框架');
  ok(/data-sdd="2">框架（Lv2）<small>Spectra／OpenSpec／Spec Kit・token ×1\.2・≥3 成功率 \+15%・陷阱燒 5%/.test(h)&&/data-sdd="1">markdown（Lv1）<small>例如 Superpowers・/.test(h)&&/data-sdd="0">不用<small>陷阱燒 40%/.test(h),'SDD 按鈕寫出實際工具、token、成功率、陷阱燒的比例');
  S.inv.sdd=1; const off0=est(t2,'anthropic','sonnet',0,1,0);
  clickApp({sdd:'0'}); h=panel();
  ok(sel.sdd===0&&/class="sb sel" data-sdd="0"/.test(h)&&!/SDD markdown：/.test(h),'點不用：亮不用，提示不寫 SDD');
  ok(near(est(t2,'anthropic','sonnet',0).tk,off0.tk)&&near(off0.tk,est(t2,'anthropic','sonnet',0,1,0).tk),'點不用：預估 token 等於沒有 SDD');
  S.jobs=[]; const j0=makeJob(t2); ok(j0.sdd===0,'點不用：派出去的 job 套 0 級');
  clickApp({sdd:'1'}); h=panel(); ok(/SDD markdown：token ×1\.1/.test(h),'選 markdown：提示寫 SDD markdown token ×1.1');
  S.inv.sdd=2; h=panel(); ok(sel.sdd===1&&/class="sb sel" data-sdd="1"/.test(h)&&makeJob(t2).sdd===1,'先選 Lv1 再買 Lv2：還是亮 markdown、派工套 1 級');
  sel.sdd=0; start(); S.inv.sdd=1; S.issues=[t2]; sel.issue=t2.id; h=panel(); ok(sel.sdd===2&&/class="sb sel" data-sdd="1"/.test(h),'這局選不用，下一局重設：買 Lv1 後亮 markdown');

  /* 派工方案：預設、存檔、載入、不夠就降級 */
  ok(same(DEFAULT_PRESETS.map(p=>p.sdd),[0,2,2]),'預設方案 SDD：A 不用、B／C 2');
  S.presets[0]={v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:3}; fresh(); ok(same(S.presets,DEFAULT_PRESETS),'方案 SDD 等級 3 不合法：三組退回預設');
  newRun('laravel'); S.hours=8; S.inv.sdd=1; const t3=ticket('laravel',3); S.issues=[t3]; sel.issue=t3.id;
  Object.assign(sel,{v:'google',m:'pro',b:'corp',rv:0,ef:2,sdd:0}); savePreset(1); ok(same(S.presets[1],{v:'google',m:'pro',b:'corp',rv:0,ef:2,sdd:0}),'存成方案 B 記下 SDD 0');
  sel.sdd=2; loadPreset(1); ok(sel.sdd===0,'載入方案 B 帶回 SDD 0');
  S.presets=presetsOf(DEFAULT_PRESETS); h=panel();
  ok(/載入方案 A<small>[^<]*・SDD 不用</.test(h)&&/載入方案 B<small>[^<]*・SDD markdown</.test(h)&&/載入方案 C<small>[^<]*・SDD markdown</.test(h),'買了 Lv1：載入按鈕 A 寫 SDD 不用、B／C 寫 SDD markdown');
  S.inv.sdd=0; h=panel(); ok(!/載入方案 [ABC]<small>[^<]*SDD/.test(h),'沒買 SDD：載入按鈕不寫 SDD');
  S.inv.sdd=1; S.presets=[{v:'deepseek',m:'chat',b:'nope'},{v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:2},DEFAULT_PRESETS[2]].map(p=>({...p}));
  S.presets[0]={...DEFAULT_PRESETS[0],v:'anthropic',m:'sonnet',b:'seat'}; // A 沒有席位不能用
  const r=presetFor(t3); ok(r.i===1,'方案 B 要 SDD 2、只買 Lv1：不略過',JSON.stringify(r));
  ok(presetBlock(t3,S.presets[1])===''&&quick(t3.id)&&S.log.some(l=>l.msg.includes('一鍵派工方案 B')),'一鍵派工用方案 B');
  ok(sel.sdd===2&&S.log.some(l=>/一鍵派工方案 B/.test(l.msg)&&l.msg.includes('SDD markdown')),'方案 B 要 SDD 2：派工套已買的 Lv1（紀錄寫 SDD markdown）');
  S.presets=presetsOf(DEFAULT_PRESETS); sel.sdd=2;

  /* 紀錄與 GA 的 SDD 等級 */
  {const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
  for(const [own,req,want,seg] of [[0,2,'none',''],[1,2,'md','・SDD markdown'],[2,2,'framework','・SDD 框架'],[2,0,'none','']]){
    newRun('laravel','parallel'); S.hours=8; S.slots=3; S.inv.sdd=own; const tx=ticket('laravel',2); S.issues=[tx];
    Object.assign(sel,{issue:tx.id,v:'anthropic',m:'sonnet',b:'corp',rv:1,sdd:req}); ge.length=0; dispatch();
    const d=ge.find(e=>e.n==='dispatch');
    ok(d&&d.p.sdd===want,`play-analytics：買 ${own} 級、選 ${req} → dispatch sdd ${want}`,JSON.stringify(d?.p));
    ok(S.log.some(l=>l.msg.includes(`｜Claude Code / Sonnet・公司 API・自審${seg}｜成功率`)),`action-log：買 ${own} 級、選 ${req} 的派工行選項段落`,S.log.map(l=>l.msg).join('\n'));
    if(own===0) ok(d.p.vendor==='anthropic'&&d.p.model==='sonnet'&&d.p.bill==='corp'&&d.p.review==='self'&&d.p.effort==='mid'&&d.p.via==='panel'&&d.p.preset==='none'&&d.p.cx===2&&d.p.stack==='laravel','play-analytics：派工台派工（沒買 SDD）');
  }
  newRun('laravel'); S.inv.sdd=2; const tf=ticket('laravel',2); S.issues=[tf]; Object.assign(sel,{issue:tf.id,v:'anthropic',m:'sonnet',b:'corp',rv:0,sdd:2});
  ge.length=0; settle(makeJob(tf)); ok(ge.find(e=>e.n==='job_result')?.p.sdd==='framework','play-analytics：套 2 級的 job_result sdd framework');
  ge.length=0; settle({...makeJob(tf),sdd:true}); ok(ge.find(e=>e.n==='job_result')?.p.sdd==='md','play-analytics：舊 job（sdd true）的 job_result sdd md');
  ge.length=0; settle({...makeJob(tf),sdd:false}); ok(ge.find(e=>e.n==='job_result')?.p.sdd==='none','play-analytics：舊 job（sdd false）的 job_result sdd none');
  {const tp=ticket('laravel',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false}); S.issues=[tp]; Object.assign(sel,{issue:tp.id,v:'deepseek',m:'chat',b:'api',rv:0,sdd:0});
   const jj=makeJob(tp); ok(jj.stop,'舊 job 陷阱測試：DeepSeek 碰到真實複雜度 5 的陷阱會停');
   settle({...jj,sdd:true}); ok(S.log[0].msg.includes('寫規格時就發現牽扯整個架構'),'舊 job（sdd true）陷阱停下的紀錄是 Lv1 的',S.log[0].msg);}

  /* 舊存檔：沒有 sel.sdd、job 的 sdd 是布林 */
  newRun('laravel','parallel'); S.inv.sdd=true; const to=ticket('laravel',2,{running:true}); S.issues=[to];
  Object.assign(sel,{issue:to.id,v:'anthropic',m:'sonnet',b:'corp',rv:0});
  S.jobs=[{issue:to,v:'anthropic',m:'sonnet',ef:1,b:'corp',M:model('anthropic','sonnet'),rv:0,tk:100,hrs:3,ok:true,caught:false,left:2,hidden:false,stop:false,sdd:true,research:false}];
  const oldSel={...sel}; delete oldSel.sdd;
  resetStore({[St.SAVE_KEY]:JSON.stringify({ver:St.SAVE_VER,S,sel:oldSel,uid:900,morning:null})});
  const rd=St.readSave(); ok(rd&&!rd.bad,'save-game：沒有 SDD 選擇、job sdd 是布林的舊存檔沒有被丟掉');
  St.loadGame(rd); render();
  ok(St.sel.sdd===2&&/class="sb sel" data-sdd="1"/.test(els.app.innerHTML),'save-game：讀檔後 SDD 選擇補成 2，派工台亮 markdown',St.sel.sdd);
  ge.length=0; settle(S.jobs[0]); ok(ge.find(e=>e.n==='job_result')?.p.sdd==='md','save-game：讀檔後舊 job 結算送 sdd md');
  resetStore(); delete globalThis.gtag;}
  }
});

section("工程投資面板收合（gh-22-02-invest-panel-collapse）",()=>{
  /* 工程投資面板收合（gh-22-02-invest-panel-collapse） */
  {
  const FK='tokgame-invfold', clickApp=ds=>els.app.on.click({target:{closest:()=>({dataset:ds})}});
  const panel=()=>{const h=els.app.innerHTML, i=h.indexOf('data-act="invfold"'); return i<0?'':h.slice(i,h.indexOf('</section>',i));};
  const open=()=>panel().includes('aria-expanded="true"')&&panel().includes('▾ 工程投資')&&panel().includes('data-inv=')&&panel().includes('data-hw=');
  const shut=()=>panel().includes('aria-expanded="false"')&&panel().includes('▸ 工程投資')&&!panel().includes('data-inv=')&&!panel().includes('data-hw=');
  newRun('laravel'); resetStore(); Vw.resetInvFold(); invest('tests'); invest('ci'); render();
  ok(open(),'invest-panel-collapse：沒有偏好時展開，列出投資與採購電腦');
  clickApp({act:'invfold'});
  ok(shut()&&panel().includes('已做 2 項')&&!panel().includes('效果維持到月底')&&store[FK]==='1','invest-panel-collapse：點標題收合，只留已做 N 項、存 1',panel());
  clickApp({act:'invfold'});
  ok(open()&&store[FK]==='0','invest-panel-collapse：再點一次展開、存 0');
  {const g0=globalThis.gtag, ev=[]; globalThis.gtag=(...a)=>ev.push(a); clickApp({act:'invfold'}); clickApp({act:'invfold'}); globalThis.gtag=g0;
   ok(ev.length===0,'invest-panel-collapse：切換不送 GA 事件',JSON.stringify(ev));}
  ok(/<h2><button class="fold" data-act="invfold"/.test(els.app.innerHTML),'invest-panel-collapse：標題仍是 h2，切換按鈕在裡面');
  for(const [v,want] of [[null,'true'],['1','false'],['0','true']]){
    resetStore(v===null?{}:{[FK]:v}); Vw.resetInvFold(); render();
    ok(panel().includes(`aria-expanded="${want}"`),`invest-panel-collapse：存的值 ${v??'沒有'} → aria-expanded ${want}`);
  }
  {const ls=global.localStorage; let threw=false, a=false, b=false;
   global.localStorage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
   try{Vw.resetInvFold(); render(); a=open(); clickApp({act:'invfold'}); b=shut();}catch(e){threw=true;}
   global.localStorage=ls;
   ok(!threw&&a&&b,'invest-panel-collapse：localStorage 失效時先展開、點了仍能收合',[threw,a,b].join());}
  resetStore(); Vw.resetInvFold(); newRun('laravel'); render(); St.saveGame(); const s1=store[St.SAVE_KEY], log1=S.log.length;
  clickApp({act:'invfold'}); St.saveGame();
  ok(s1&&store[St.SAVE_KEY]===s1&&S.log.length===log1,'invest-panel-collapse：收合不改存檔內容、不寫紀錄');
  start(); ok(shut(),'invest-panel-collapse：開新局維持收合');
  Vw.resetInvFold(); render(); ok(shut(),'invest-panel-collapse：重新整理後照存的值收合');
  resetStore(); Vw.resetInvFold();
  }
});

section("國內研討會（gh-22-01-domestic-conference）",()=>{
  /* 國內研討會（gh-22-01-domestic-conference） */
  {
  /* 舊存檔：投資是 true／false、沒有研討會欄位 */
  newRun('laravel'); const raw=JSON.parse(JSON.stringify(S));
  raw.inv={md:{laravel:true},tests:true,ci:false,hook:false,scan:false,fastlane:false,monitor:false,skills:false,mcp:false,sdd:false};
  delete raw.conf; delete raw.st.confFee; raw.day=4;
  resetStore({[St.SAVE_KEY]:JSON.stringify({ver:St.SAVE_VER,S:raw,sel:{...sel},uid:50,morning:{rep:[],ev:null,monday:false}})});
  const rd=St.readSave(); ok(rd&&!rd.bad,'domestic-conference：舊存檔（布林投資）沒有被丟掉');
  St.loadGame(rd);
  ok(S.inv.tests===1&&S.inv.md.laravel===1&&S.inv.ci===0&&S.inv.ai===0&&S.st.confFee===0&&S.conf.req===null&&S.conf.went.length===0,'domestic-conference：舊存檔的投資轉成等級、補上研討會欄位',JSON.stringify([S.inv,S.conf]));
  ok(near(catchRate(1,model('anthropic','sonnet')),.87),'domestic-conference：讀檔後單元測試 Lv1 的自審抓錯率 0.87');
  resetStore();
  /* 報名 */
  const D=dataModule, gaEv=[], g0=globalThis.gtag; globalThis.gtag=(k,name,p)=>gaEv.push({name,p});
  newRun('laravel'); S.day=3; S.wallet=8000; S.trust=70; const h0=S.hours; gaEv.length=0;
  ok(A.registerConf('webconf')&&S.wallet===8000-D.CONF.webconf.fee&&S.hours===h0&&S.trust===70&&S.st.confFee===D.CONF.webconf.fee&&A.confBlock('webconf')==='已報名・週末出席','domestic-conference：週三報名 WebConf，扣錢包、不花工時、不動信任');
  ok(gaEv.length===1&&gaEv[0].name==='invest'&&gaEv[0].p.investment==='conf_webconf'&&gaEv[0].p.stack==='none','domestic-conference：報名送 invest conf_webconf',JSON.stringify(gaEv));
  ok(S.log[0].msg.endsWith(`★ 報名研討會：WebConf Taiwan｜自費 NT$${D.CONF.webconf.fee.toLocaleString('en-US')}｜週末出席`),'domestic-conference：報名紀錄格式',S.log[0].msg);
  const refuse=(name,setup,key)=>{newRun('laravel'); S.wallet=8000; setup(); const snap=JSON.stringify([S.wallet,S.hours,S.conf,S.st.confFee]); gaEv.length=0;
    ok(!A.registerConf(key)&&JSON.stringify([S.wallet,S.hours,S.conf,S.st.confFee])===snap&&gaEv.length===0,`domestic-conference：${name}時不能報名`);};
  refuse('第 16 天',()=>{S.day=16;},'coscup');
  refuse('已報名別場',()=>{S.day=2; A.registerConf('hitcon'); S.day=4;},'coscup');
  refuse('已參加',()=>{S.day=8; S.conf.went=['coscup'];},'coscup');
  refuse('錢包不夠',()=>{S.day=3; S.wallet=1000;},'kubesummit');
  /* 出席 */
  newRun('laravel'); S.day=5; S.trust=70; A.registerConf('hitcon'); const w5=[S.wallet,S.corp,S.kpi,S.trust]; gaEv.length=0; withRand(.99,endDay);
  ok(S.day===6&&S.conf.went.join()==='hitcon'&&S.conf.req===null&&JSON.stringify([S.wallet,S.corp,S.kpi,S.trust])===JSON.stringify(w5),'domestic-conference：第 5 天報名 HITCON，第 6 天算去過，數值不變');
  ok(els.mo.innerHTML.includes('週末參加了 HITCON')&&els.mo.innerHTML.includes('secret scanning／脫敏 Lv2 開放')&&els.mo.innerHTML.includes('提升 agent 能力 Lv1 開放')&&S.log.some(l=>l.msg.includes('★ 週末參加了 HITCON')),'domestic-conference：早上報告與紀錄寫出開放了什麼',els.mo.innerHTML.slice(0,400));
  ok(!gaEv.some(e=>e.name==='invest'),'domestic-conference：出席不送 GA');
  newRun('laravel'); S.day=15; A.registerConf('coscup'); withRand(.99,endDay);
  ok(S.day===16&&S.conf.went.join()==='coscup'&&els.mo.innerHTML.includes('Rails、Rust 自己手寫 ×0.8（Rails、Rust 不再算不熟）'),'domestic-conference：第 15 天報名，第 16 天出席',els.mo.innerHTML.slice(0,300));
  newRun('laravel'); S.day=3; A.registerConf('coscup'); withRand(.99,endDay);
  ok(S.day===4&&S.conf.req==='coscup'&&S.conf.went.length===0,'domestic-conference：不是週一不處理報名');
  /* 技術線場：手寫加快、不再算不熟 */
  for(const [cos,went,st,cx,tries,hrs] of [['laravel',[],'laravel',2,0,4.4],['laravel',[],'rust',2,0,8.8],['laravel',['coscup'],'rust',2,0,3.52],['laravel',['webconf'],'laravel',2,0,3.52],['laravel',['hitcon'],'rust',2,0,8.8],['app',['coscup'],'rails',3,1,3*2.2*.8*.8],['laravel',['webconf'],'fe',2,0,3.52]]){
    newRun(cos); S.conf.went=[...went]; const t=ticket(st,cx,{tries});
    ok(near(manualHrs(t),hrs,1e-6),`domestic-conference：${cos} 去過 ${went.join()||'沒有'}，${st} 複雜度 ${cx} 手寫 ${hrs}h`,manualHrs(t));
  }
  newRun('laravel'); S.conf.went=['coscup']; {const rt=ticket('rust',2); S.issues=[rt]; sel.issue=rt.id; render();
   ok(!unfamiliar(rt)&&!els.app.innerHTML.includes('chip unfam')&&els.app.innerHTML.includes('3.5h'),'domestic-conference：去過 COSCUP，rust 單不顯示不熟、手寫按鈕 3.5h');}
  newRun('laravel'); S.conf.went=['webconf']; S.hours=8; {const lt=ticket('laravel',2); S.issues=[lt]; sel.issue=lt.id; manual();
   ok(near(S.hours,8-3.52,1e-6)&&!S.issues.includes(lt),'domestic-conference：去過 WebConf 手寫 laravel 複雜度 2 用 3.52h 並完成',S.hours);}
  /* Lv2 購買 */
  newRun('laravel'); S.hours=8; S.corp=12000; gaEv.length=0;
  ok(invest('tests')&&near(S.hours,4)&&S.corp===11600&&A.investBlock('tests')==='需要去過綜合場'&&gaEv.at(-1).p.investment==='tests','domestic-conference：買單元測試 Lv1，之後顯示 Lv2 的鎖定原因');
  const ref=(name,setup,k,st,want,why)=>{newRun('laravel'); setup(); const snap=JSON.stringify([S.hours,S.corp,S.inv]);
    ok(A.investBlock(k,st,want)===why&&!invest(k,st,want)&&JSON.stringify([S.hours,S.corp,S.inv])===snap,`domestic-conference：${name}時不能買（${why}）`,A.investBlock(k,st,want));};
  ref('監控告警已買',()=>{S.inv.monitor=1;},'monitor',undefined,undefined,'已完成');
  ref('單元測試 Lv2 沒去過綜合場',()=>{S.inv.tests=1;},'tests',undefined,undefined,'需要去過綜合場');
  ref('secret scanning 沒買 Lv1 就買 Lv2',()=>{S.conf.went=['hitcon'];},'scan',undefined,2,'需要先買 Lv1');
  ref('工時 5h 買 SDD',()=>{S.hours=5;},'sdd',undefined,undefined,'工時不夠');
  ref('公司預算 NT$200 買 CLAUDE.md',()=>{S.corp=200;},'md','laravel',undefined,'公司預算不夠');
  ref('CLAUDE.md Lv2 沒去過涵蓋的技術線場',()=>{S.inv.md.rust=1; S.conf.went=['webconf'];},'md','rust',undefined,'需要去過涵蓋 Rust 的技術線場');
  newRun('laravel'); S.inv.tests=1; S.conf.went=['hwdc']; S.hours=8; S.corp=11600; gaEv.length=0;
  ok(invest('tests')&&near(S.hours,7)&&S.corp===11400&&S.inv.tests===2&&A.investBlock('tests')==='已完成'&&gaEv.at(-1).p.investment==='tests2','domestic-conference：去過 HWDC 買單元測試 Lv2');
  newRun('laravel'); S.conf.went=['coscup']; S.hours=8; gaEv.length=0; invest('md','rust'); invest('md','rust');
  ok(S.inv.md.rust===2&&gaEv.map(e=>e.p.investment+'/'+e.p.stack).join()==='md/rust,md2/rust','domestic-conference：CLAUDE.md Lv1、Lv2 的 GA',JSON.stringify(gaEv.map(e=>e.p)));
  /* Lv2 效果 */
  {newRun('laravel'); const t4=ticket('laravel',4), e0=est(t4,'anthropic','sonnet',0); S.inv.md.laravel=2; const e2=est(t4,'anthropic','sonnet',0);
   ok(near(e2.p,.95)&&near(e2.tk,e0.tk*.85),'domestic-conference：CLAUDE.md Lv2 成功率 0.95、token ×0.85',[e2.p,e2.tk/e0.tk].join());}
  newRun('laravel'); S.inv.tests=2; ok(near(catchRate(1,model('anthropic','sonnet')),.95),'domestic-conference：單元測試 Lv2 自審抓錯率到上限 0.95');
  ok(near(catchRate(1,model('google','flash')),.81),'domestic-conference：單元測試 Lv2 讓 Gemini Flash 自審抓錯率 0.81');
  for(const [l,a,d] of [[1,.175,.30],[2,.0875,.15]]){newRun('laravel'); S.inv.scan=l; ok(near(auditOdds('anthropic'),a)&&near(auditOdds('deepseek'),d),`domestic-conference：secret scanning Lv${l} 稽核機率 ${a}／${d}`);}
  newRun('laravel','parallel'); S.inv.skills=2; S.hours=8; S.slots=4; S.presets=presetsOf(DEFAULT_PRESETS);
  {const b2=[1,3,4,2].map(cx=>ticket('fe',cx,{due:5})); S.issues=[...b2]; batch();
   ok(S.jobs.length===3&&S.jobs.every(j=>j.issue.cx<=3)&&!b2[2].running&&S.issues.includes(b2[2]),'domestic-conference：skills Lv2 批次派工到複雜度 3，複雜度 4 留著',S.jobs.map(j=>j.issue.cx).join());}
  newRun('laravel'); S.inv.skills=1; render(); ok(els.app.innerHTML.includes('批次派工（複雜度 ≤2）'),'domestic-conference：skills Lv1 批次派工按鈕寫 ≤2');
  S.inv.skills=2; render(); ok(els.app.innerHTML.includes('批次派工（複雜度 ≤3）'),'domestic-conference：skills Lv2 批次派工按鈕寫 ≤3');
  /* 提升 agent 能力 */
  newRun('laravel'); S.conf.went=['coscup','hitcon']; S.inv.ai=2;
  ok(near(est(ticket('fe',4),'anthropic','sonnet',0).p,.96),'domestic-conference：agent 能力 Lv2，複雜度 4 前端單 Sonnet 成功率 0.96');
  newRun('laravel'); S.conf.went=['coscup']; S.hours=8; gaEv.length=0;
  ok(invest('ai')&&S.inv.ai===1&&gaEv.at(-1).p.investment==='ai1'&&A.investBlock('ai')==='需要去過 2 場研討會'&&!invest('ai')&&S.inv.ai===1,'domestic-conference：去過 1 場只能買到 Lv1');
  {newRun('laravel'); const son=model('anthropic','sonnet'), t=ticket('rust',2), r0=revealRate(son), m0=manualHrs(t); S.inv.ai=3;
   ok(near(revealRate(son),r0)&&near(manualHrs(t),m0),'domestic-conference：agent 能力不影響評估架構與手寫');}
  /* GA：投資、Lv2 與 agent 能力、報名 */
  newRun('laravel'); S.hours=8; gaEv.length=0; invest('md','rust'); invest('md','rust');
  ok(gaEv.filter(e=>e.name==='invest').map(e=>e.p.investment+'/'+e.p.stack).join()==='md/rust','play-analytics：CLAUDE.md Rust 只送一次，沒去過研討會再買不送');
  newRun('laravel'); S.hours=8; S.conf.went=['coscup']; S.inv.md.rust=1; gaEv.length=0; invest('md','rust'); invest('ai');
  ok(gaEv.filter(e=>e.name==='invest').map(e=>e.p.investment+'/'+e.p.stack).join()==='md2/rust,ai1/none','play-analytics：Lv2 送 md2、agent 能力送 ai1',JSON.stringify(gaEv.map(e=>e.p)));
  newRun('laravel'); S.day=5; gaEv.length=0; A.registerConf('hitcon'); A.registerConf('coscup'); withRand(.99,endDay);
  ok(gaEv.filter(e=>e.name==='invest').map(e=>e.p.investment).join()==='conf_hitcon','play-analytics：報名送 conf_hitcon，同週再報與週一出席都不送',JSON.stringify(gaEv.filter(e=>e.name==='invest')));
  /* 個人花費與結算 */
  newRun('laravel'); Object.assign(S,{kpi:300,trust:50}); Object.assign(S.st,{subFee:2000,api:0,outPenalty:0,outIncome:0,audits:1,confFee:0});
  {const m0=monthScore(); S.st.confFee=3000; const m=monthScore();
   ok(m0.self===2000&&m.self===5000&&m.score===m0.score&&m.score===3120,'month-end-scoring：報名費 3,000 算進你自己掏的錢（2,000 → 5,000），總分不變 3,120',JSON.stringify([m0,m]));}
  newRun('laravel'); S.day=5; A.registerConf('coscup'); withRand(.99,endDay); S.day=10; A.registerConf('hitcon'); withRand(.99,endDay); S.day=20; showEnd();
  ok(S.conf.went.join()==='coscup,hitcon'&&els.mo.innerHTML.includes('<span>研討會</span><span>2 場</span>')&&els.mo.innerHTML.includes('<span>研討會報名費</span><span>NT$6,000</span>'),'month-end-scoring：去過 COSCUP 與 HITCON，結算顯示研討會 2 場、報名費 NT$6,000',S.st.confFee);
  newRun('laravel'); S.day=20; showEnd(); ok(!els.mo.innerHTML.includes('研討會'),'month-end-scoring：沒報名不顯示研討會兩行');
  /* 投資面板 */
  newRun('laravel'); S.inv.md.laravel=1; S.inv.tests=2; S.inv.ci=1; ok(invCount()===4,'engineering-investments：CLAUDE.md、單元測試 Lv1＋Lv2、CI 算 4 項');
  S.day=20; showEnd(); ok(els.mo.innerHTML.includes('<span>工程投資</span><span>4 項</span>'),'engineering-investments：結算顯示工程投資 4 項');
  newRun('laravel'); S.hours=8; invest('monitor'); Vw.resetInvFold(); resetStore(); render();
  ok(/data-inv="monitor"\s+disabled><b>監控告警<\/b><small>已完成/.test(els.app.innerHTML),'engineering-investments：買過監控告警的按鈕顯示已完成');
  newRun(['rails','app']); Vw.resetInvFold(); resetStore(); render();
  {const order=[...els.app.innerHTML.matchAll(/data-inv="md" data-st="(\w+)"/g)].map(m=>m[1]).join();
   ok(order==='rails,app,laravel,rust,sre,devops,fe','engineering-investments：CLAUDE.md 按鈕順序 rails、app、laravel、rust、sre、devops、fe',order);}
  {const n=(els.app.innerHTML.match(/data-conf="/g)||[]).length; ok(n===10&&els.app.innerHTML.includes('國內研討會（週末自費）'),'domestic-conference：面板有十個研討會按鈕',n);}
  newRun('laravel'); S.day=2; render(); gaEv.length=0; els.app.on.click({target:{closest:()=>({dataset:{conf:'taiwanai'}})}});
  ok(S.conf.req==='taiwanai'&&els.app.innerHTML.includes('已報名・週末出席')&&els.app.innerHTML.includes('這週已報名其他場'),'domestic-conference：點研討會按鈕報名，其他場顯示已報名其他場');
  newRun('laravel'); S.inv.md.laravel=2; S.inv.ai=1; {const t=ticket('laravel',3); S.issues=[t]; sel.issue=t.id; render();
   ok(els.app.innerHTML.includes('成功率 +15%')&&els.app.innerHTML.includes('提升 agent 能力 Lv1：成功率 +8%'),'domestic-conference：派工台提示 Lv2 數值與 agent 能力');}
  /* 規則 modal */
  {const h=Ru.rulesTab('invest'), D2=dataModule;
   ok(D2.CONF_KEYS.every(k=>h.includes(D2.CONF[k].name)&&h.includes(`NT$${D2.CONF[k].fee.toLocaleString('en-US')}`))&&h.includes('×0.8')&&h.includes('+8%')&&h.includes('單元測試 Lv2')&&h.includes('×0.25')&&h.includes('≤3')&&h.includes('+15%')&&h.includes('+20%'),'rules-reference：投資與電腦列出十場研討會、手寫 0.8、Lv2 與 agent 能力 8%');
   ok(/導入 SDD Lv2<\/td><td[^>]*>1h<\/td><td[^>]*>NT\$200<\/td><td[^>]*>[^<]*Spectra／OpenSpec／Spec Kit[^<]*token ×1\.2[^<]*\+15%[^<]*5%/.test(h)&&/導入 SDD<\/td><td[^>]*>6h<\/td><td[^>]*>NT\$500<\/td><td[^>]*>[^<]*markdown[^<]*token ×1\.1[^<]*\+8%/.test(h)&&h.includes('導入 SDD Lv2 不用研討會'),'rules-reference：投資與電腦列出 SDD 兩級、Lv2 1h NT$200 不用研討會',h.match(/導入 SDD[^]*?<\/tr>/g)?.join(' | '));
   const hd=Ru.rulesTab('dispatch'), ht=Ru.rulesTab('tickets');
   ok(hd.includes('開發流程')&&hd.includes('每張單選 SDD')&&hd.includes('已買的最高級'),'rules-reference：派工與成功率寫出每張單選 SDD 與方案降級');
   ok(ht.includes('40%')&&ht.includes('markdown 只燒 15%')&&ht.includes('框架 只燒 5%'),'rules-reference：工單與陷阱寫出 SDD 各級陷阱燒的比例');
   ok(Ru.rulesTab('score').includes('研討會報名費'),'rules-reference：個人花費包含研討會報名費');}
  globalThis.gtag=g0;
  }
});
