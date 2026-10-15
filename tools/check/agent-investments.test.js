// agent-investments 的規則檢查：docs/spectra/specs/agent-investments/spec.md
import {ok,near,section,newRun,ticket,clickApp,clickMo} from './lib.js';
import * as Ru from '../../public/js/rules.js';
import * as M from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import {issueTitle,sel} from '../../public/js/state.js';
import * as C from '../../public/js/calc.js';
import {BASE} from '../../public/js/data.js';
import {store,resetStore} from '../fake-dom.js';
import {INV_CX,invQuality,model,effModel} from '../../public/js/data.js';
import {S} from '../../public/js/state.js';
import * as St from '../../public/js/state.js';
import {invQ,setInvQ,mdP,mdTk,scanMul,ciMul,skillsLv,monOn,sddStop,testCatch} from '../../public/js/calc.js';
import {els} from '../fake-dom.js';
import {render} from '../../public/js/view.js';
import {conflictRate} from '../../public/js/actions.js';

section('agent-investments：品質看能力差距',()=>{
  const q=(v,m,ef=1)=>invQuality(effModel(model(v,m),ef).cap,INV_CX.sdd[0]);
  ok(INV_CX.sdd[0]===5,'導入 SDD Lv1 複雜度 5');
  ok(q('anthropic','opus')===1,'Opus 做 SDD Lv1：100%');
  ok(near(q('anthropic','sonnet'),.6),'Sonnet：60%');
  ok(near(q('deepseek','chat'),.3),'DeepSeek Chat：30%');
  ok(near(q('google','flash'),.1),'Gemini Flash：10%');
  ok(q('anthropic','sonnet',2)===1,'Sonnet 高強度（50）：100%');
  ok(near(invQuality(45,5),.8),'能力 45：80%');
  ok(near(invQuality(5,5),.1),'差距 −45 截在 10%');
});

section('agent-investments：舊存檔的等級都當 100%',()=>{
  newRun('laravel','parallel'); S.inv.md.laravel=2; delete S.invQ;
  resetStore(); St.saveGame(null); St.loadGame(St.readSave());
  ok(S.invQ&&invQ('md','laravel',1)===1&&invQ('md','laravel',2)===1,'沒有品質的舊存檔讀成 100%');
});

section('agent-investments：效果照品質內插',()=>{
  newRun('laravel','parallel');
  S.inv.md.laravel=1; setInvQ('md','laravel',1,.6);
  ok(near(mdP('laravel'),.036),'CLAUDE.md Lv1 60%：失敗少 3.6%',mdP('laravel'));
  ok(near(mdTk('laravel'),.91),'CLAUDE.md Lv1 60%：token ×0.91',mdTk('laravel'));
  S.inv.md.laravel=2; setInvQ('md','laravel',1,1); setInvQ('md','laravel',2,.6);
  ok(near(mdP('laravel'),.114),'CLAUDE.md Lv1 100%、Lv2 60%：失敗少 11.4%',mdP('laravel'));
  ok(near(mdTk('laravel'),.85),'Lv2 不再改 token 倍率');
  S.inv.scan=1; setInvQ('scan',null,1,.6); ok(near(scanMul(),.7),'secret scanning 60%：稽核 ×0.7',scanMul());
  S.inv.ci=1; setInvQ('ci',null,1,.3); ok(near(ciMul(),.85),'CI 30%：衝突 ×0.85',ciMul());
  S.jobs=[{},{}]; ok(near(conflictRate(),.1*2*.85),'合併衝突機率用內插後的倍率');S.jobs=[];
  S.inv.tests=1; setInvQ('tests',null,1,.5); ok(near(testCatch(),.05),'單元測試 50%：抓錯率 +5%');
  S.inv.sdd=1; setInvQ('sdd',null,1,.6); ok(near(sddStop(1),.4-.25*.6),'SDD 60%：陷阱燒 0.25',sddStop(1)); ok(sddStop(0)===.4,'SDD 不用：陷阱燒 0.4');
  newRun('laravel','parallel');
  ok(mdP('laravel')===0&&mdTk('laravel')===1&&scanMul()===1&&ciMul()===1,'沒買：效果是 V[0]');
});

section('agent-investments：開關類要品質 60%',()=>{
  newRun('laravel','parallel'); S.hours=8;
  S.inv.skills=1; setInvQ('skills',null,1,.3); render();
  ok(skillsLv()===0&&!els.app.innerHTML.includes('data-act="batch"'),'skills 30%：沒有批次派工按鈕');
  setInvQ('skills',null,1,.6); render();
  ok(skillsLv()===1&&els.app.innerHTML.includes('data-act="batch"'),'skills 60%：有批次派工按鈕，上限複雜度 2');
  S.inv.skills=2; setInvQ('skills',null,2,.3); ok(skillsLv()===1,'skills Lv2 30%：照 Lv1 的上限');
  S.inv.monitor=1; setInvQ('monitor',null,1,.59); ok(!monOn(),'監控告警 59%：不生效');
  setInvQ('monitor',null,1,.6); ok(monOn(),'監控告警 60%：生效');
});

section('agent-investments：舊存檔的 CLAUDE.md Lv2 失敗少 15%',()=>{
  newRun('laravel','parallel'); S.inv.md.laravel=2; delete S.invQ;
  resetStore(); St.saveGame(null); St.loadGame(St.readSave());
  ok(mdP('laravel')===.15,'讀檔後失敗少 15%');
});

section('agent-investments：開投資工單',()=>{
  newRun('laravel','parallel'); S.hours=8; const corp=S.corp;
  clickApp({inv:'md',st:'laravel'});
  const tk=S.issues.filter(i=>i.inv);
  ok(tk.length===1&&tk[0].inv.k==='md'&&tk[0].inv.st==='laravel'&&tk[0].inv.L===1,'按 CLAUDE.md（laravel）：佇列多一張投資工單');
  ok(S.hours===8&&S.corp===corp&&!S.inv.md.laravel,'開工單不花時間、不花預算、還沒買到');
  ok(/CLAUDE\.md/.test(issueTitle(tk[0]))&&issueTitle(tk[0]).includes('Laravel'),'標題寫 CLAUDE.md 與 laravel',issueTitle(tk[0]));
  ok(tk[0].cx===4&&tk[0].kpi===0&&tk[0].due===null&&tk[0].client.id==='internal','複雜度 4、沒有 KPI、沒有到期、內部專案');
  render(); ok(/data-inv="md" data-st="laravel"\s+disabled><b>[^<]+<\/b><small>已開工單/.test(els.app.innerHTML),'按鈕寫已開工單並停用');
  clickApp({inv:'md',st:'laravel'}); ok(S.issues.filter(i=>i.inv).length===1,'已開工單時再按不會多開');
  /* 鎖住的等級 */
  S.inv.tests=1; ok(!A.openInvTicket('tests')&&/需要去過綜合場/.test(A.invTicketBlock('tests')),'單元測試 Lv2 沒去綜合場：不能開工單');
  /* 不是寫東西的投資照舊直接買 */
  const h=S.hours, c=S.corp; clickApp({inv:'xreview'});
  ok(S.inv.xreview===1&&near(S.hours,h-2)&&S.corp===c-200,'交叉審核工具照舊直接買：花 2h、NT$200');
  /* 單線模式不開工單 */
  newRun('laravel','serial'); S.hours=8; clickApp({inv:'tests'});
  ok(!S.issues.some(i=>i.inv)&&S.inv.tests===1&&near(S.hours,4),'單線模式按單元測試照舊直接買');
});

section('agent-investments：投資工單不會逾期、排在最後、批次派工略過',()=>{
  newRun('laravel','parallel'); S.day=20; S.hours=8;
  A.openInvTicket('ci');
  const tr=S.trust, kpi=S.kpi; A.endDay();
  ok(S.trust===tr&&S.kpi===kpi&&S.st.late===0,'第 20 天下班：投資工單不算逾期、不扣分');
  newRun('laravel','parallel'); S.day=3; S.hours=8;
  A.openInvTicket('ci'); A.openInvTicket('hook'); A.endDay();
  ok(S.issues.filter(i=>i.inv).length===2,'下班後投資工單還在佇列');
  newRun('laravel','parallel'); S.hours=8; S.inv.skills=1;
  A.openInvTicket('md','laravel'); const n=ticket('laravel',2,{due:2}); S.issues.push(n);
  ok([...S.issues].sort(A.queueOrder)[1].inv,'投資工單排在一般工單後面');
  A.batch();
  ok(S.jobs.length===1&&S.jobs[0].issue===n&&S.issues.some(i=>i.inv&&!i.running),'批次派工派出一般工單、略過投資工單');
  ok(!A.canEvaluate(S.issues.find(i=>i.inv)),'投資工單不能評估架構');
});

section('agent-investments：投資工單自己做',()=>{
  newRun('laravel','parallel'); S.hours=8; S.corp=12000;
  A.openInvTicket('tests'); const is=S.issues.find(i=>i.inv); sel.issue=is.id; render();
  const h=els.app.innerHTML;
  ok(h.includes('data-act="invself"')&&!h.includes('data-rv="1"')&&!h.includes('data-sdd=')&&!h.includes('data-act="eval"'),'投資工單的派工台：有自己做，沒有審核、SDD、評估');
  ok(h.includes('預計品質')&&!h.includes('成功率'),'預估寫預計品質，不寫成功率');
  ok(!/data-iss="\d+">[\s\S]{0,400}今天到期/.test(h.slice(h.indexOf(`data-iss="${is.id}"`)-20,h.indexOf(`data-iss="${is.id}"`)+600)),'卡片沒有到期標籤');
  clickApp({act:'invself'});
  ok(near(S.hours,4)&&S.corp===11600&&S.inv.tests===1&&invQ('tests',null,1)===1&&!S.issues.includes(is),'自己做：9:00→13:00、公司 NT$11,600、單元測試 Lv1 品質 100%、工單拿掉');
  newRun('laravel','parallel'); S.hours=8; S.corp=200;
  A.openInvTicket('md','laravel'); const m=S.issues.find(i=>i.inv); sel.issue=m.id;
  ok(!A.invSelf(m.id)&&S.issues.includes(m)&&!S.inv.md.laravel&&S.corp===200,'預算 NT$200 自己做 CLAUDE.md：不動作，工單留著');
});

section('agent-investments：派 agent 做投資',()=>{
  newRun('laravel','parallel'); S.hours=8; S.corp=12000; S.trust=70;
  A.openInvTicket('md','laravel'); const is=S.issues.find(i=>i.inv);
  Object.assign(sel,{issue:is.id,v:'anthropic',m:'sonnet',b:'corp',ef:1});
  const e=C.est(is,'anthropic','sonnet');
  ok(near(e.tk,550)&&near(e.hrs,3.2)&&e.q===1,'Sonnet 做 CLAUDE.md：550k、3.2h、品質 100%',JSON.stringify([e.tk,e.hrs,e.q]));
  A.dispatch();
  ok(S.jobs.length===1&&S.jobs[0].inv&&is.running,'派出：投資 job 在跑');
  A.wait(true);
  ok(near(S.corp,12000-247.5)&&S.inv.md.laravel===1&&invQ('md','laravel',1)===1&&!S.issues.includes(is),'跑完：公司預算扣 NT$247.5、CLAUDE.md Lv1 品質 100%、工單拿掉',S.corp);
  ok(near(S.hours,8-3.2),'跑完不加審 PR 時間（派工的 0.2h 跟 agent 同時跑）',S.hours);
  /* 算同時在跑的 agent */
  newRun('laravel','parallel'); S.hours=8;
  A.openInvTicket('sdd'); const iv=S.issues.find(i=>i.inv); Object.assign(sel,{issue:iv.id,v:'anthropic',m:'opus',b:'corp',ef:1}); A.dispatch();
  ok(near(A.prHrs(2,0),2*.2*1.25),'一個投資 job 在跑時：複雜度 2 不審核的 PR 0.5h');
  /* 一鍵派工忽略方案的審核與 SDD */
  newRun('laravel','parallel'); S.hours=8; S.inv.sdd=2;
  S.presets[2]={v:'anthropic',m:'opus',b:'corp',rv:2,ef:1,sdd:2};
  A.openInvTicket('ci'); const ci=S.issues.find(i=>i.inv);
  ok(A.quick(ci.id,'quick',2),'按 C：派出');
  const j=S.jobs[0]; ok(j&&j.inv&&j.rv===0&&near(j.tk,BASE[3]*.85),'用 Opus、公司 API，token 是 BASE[3] × 0.85、沒有審核',j&&j.tk);
  /* 品質與重做 */
  newRun('laravel','parallel'); S.hours=8; S.inv.md.laravel=1; setInvQ('md','laravel',1,.6);
  A.applyInv({k:'md',st:'laravel',L:1},.3); ok(near(invQ('md','laravel',1),.6),'重做 30%：維持 60%');
  A.applyInv({k:'md',st:'laravel',L:1},1); ok(invQ('md','laravel',1)===1,'重做 100%：變 100%');
});

section('agent-investments：付不出來、中止、當機、月底、過夜、取消投資',()=>{
  const go=(k,st,v,m,b)=>{A.openInvTicket(k,st);const is=S.issues.find(i=>i.inv&&i.inv.k===k);Object.assign(sel,{issue:is.id,v,m,b,ef:1});A.dispatch();return is;};
  /* 錢包見底 */
  newRun('laravel','parallel'); S.hours=8; S.wallet=10;
  const w=go('sdd',null,'anthropic','sonnet','api'); A.wait(true);
  ok(S.wallet===0&&!S.inv.sdd&&S.issues.includes(w)&&!w.running,'個人 API 錢不夠：付掉 NT$10、錢包 0、沒買到、工單回佇列',S.wallet);
  ok(S.log[0].msg.includes('錢包見底'),'紀錄寫錢包見底');
  /* 玩家中止 */
  newRun('laravel','parallel'); S.hours=8; S.corp=12000;
  const c=go('md','laravel','anthropic','sonnet','corp'); A.cancelJob(c.id);
  ok(!S.jobs.length&&S.issues.includes(c)&&!c.running&&!S.inv.md.laravel&&S.corp<12000,'中止：照已跑比例扣、工單回佇列、沒買到');
  /* 當機 */
  newRun('laravel','parallel'); S.hours=8; S.day=3;
  const o=go('ci',null,'anthropic','opus','corp');
  A.cancelJobs(j=>j.v==='anthropic','當機');
  ok(!S.jobs.length&&S.issues.includes(o)&&!S.inv.ci,'當機中止：工單回佇列');
  /* 過夜 */
  newRun('laravel','parallel'); S.hours=1; S.day=3;
  const n=go('sdd',null,'anthropic','opus','corp'); A.endDay();
  ok(S.jobs.length===1&&S.jobs[0].issue===n,'下班時還在跑的投資 job 跑過夜');
  /* 月底收工 */
  newRun('laravel','parallel'); S.hours=1; S.day=20;
  go('sdd',null,'anthropic','opus','corp'); A.endDay();
  ok(!S.jobs.length&&!S.inv.sdd,'第 20 天下班還在跑：月底收工、沒買到');
  /* 取消投資 */
  newRun('laravel','parallel'); S.hours=8; S.trust=70;
  A.openInvTicket('hook'); const h=S.issues.find(i=>i.inv); sel.issue=h.id; render();
  ok(els.app.innerHTML.includes(`data-abandon="${h.id}">取消投資`),'派工台的退單按鈕寫取消投資');
  clickApp({abandon:String(h.id)}); clickApp({abandon:String(h.id)});
  ok(!S.issues.includes(h)&&S.trust===70&&S.st.abandoned===0,'確定取消：工單拿掉、信任 70、退單數不變');
});

section('agent-investments：重做',()=>{
  newRun('laravel','parallel'); S.hours=8; S.inv.tests=1; setInvQ('tests',null,1,.6); render();
  ok(/data-invredo="tests"[^>]*><b>單元測試 Lv1<\/b><small>重做（品質 60%）/.test(els.app.innerHTML),'單元測試 Lv1 60%：有重做按鈕');
  clickApp({invredo:'tests'});
  const r=S.issues.find(i=>i.inv); ok(r&&r.inv.k==='tests'&&r.inv.L===1,'按重做：開一張單元測試 Lv1 的投資工單');
  render(); ok(!els.app.innerHTML.includes('data-invredo="tests"'),'工單開著時重做按鈕不見');
  sel.issue=r.id; ok(A.invSelf(r.id)&&invQ('tests',null,1)===1&&S.inv.tests===1,'自己重做：品質 100%、等級不變');
  render(); ok(!els.app.innerHTML.includes('data-invredo'),'品質 100% 後沒有重做按鈕');
});

section('agent-investments：存檔保留投資工單與跑過夜的投資 job',()=>{
  newRun('laravel','parallel'); S.hours=1; S.day=3; S.corp=12000;
  A.openInvTicket('ci'); A.openInvTicket('sdd'); const is=S.issues.find(i=>i.inv&&i.inv.k==='sdd');
  Object.assign(sel,{issue:is.id,v:'anthropic',m:'opus',b:'corp',ef:1}); A.dispatch();
  S.inv.md.laravel=1; setInvQ('md','laravel',1,.6);
  A.endDay(); const left=S.jobs[0]?.left;
  resetStore(); St.saveGame(null); St.loadGame(St.readSave());
  ok(S.jobs.length===1&&S.jobs[0].inv&&near(S.jobs[0].left,left)&&S.issues.includes(S.jobs[0].issue),'讀檔後投資 job 還在跑、剩餘時間一樣、跟佇列裡的工單是同一個');
  ok(S.issues.some(i=>i.inv&&i.inv.k==='ci'&&!i.running),'佇列裡沒派的投資工單還在');
  ok(near(invQ('md','laravel',1),.6),'品質跟著存檔');
  S.hours=8; A.wait(true);
  ok(S.inv.sdd===1&&!S.issues.some(i=>i.inv&&i.inv.k==='sdd'),'讀檔後跑完照樣套上等級');
});

section('agent-investments：規則 modal 顯示打折後的效果',()=>{
  const inv=()=>Ru.rulesTab('invest');
  newRun('laravel','parallel'); S.inv.tests=1;
  ok(!inv().includes('目前（品質'),'品質都是 100%：不多寫目前那行');
  S.inv.md.laravel=1; setInvQ('md','laravel',1,.6); S.inv.ci=1; setInvQ('ci',null,1,.3); S.inv.skills=1; setInvQ('skills',null,1,.3);
  const h=inv();
  ok(h.includes('目前（品質 Lv1 60%）：Laravel token ×0.91、失敗少 3.6%'),'CLAUDE.md 60%：寫打折後的 token 與失敗少');
  ok(h.includes('目前（品質 Lv1 30%）：合併衝突 ×0.85'),'CI 30%：合併衝突 ×0.85');
  ok(h.includes('目前（品質 Lv1 30%）：品質未達 60%，沒有生效'),'skills 30%：沒有生效');
});

section('agent-investments：畫面數字、紀錄、到期張數、一起跑的審 PR、SDD 按鈕',()=>{
  newRun('laravel','parallel'); S.hours=8; S.corp=12000;
  A.openInvTicket('md','laravel'); const is=S.issues.find(i=>i.inv);
  Object.assign(sel,{issue:is.id,v:'anthropic',m:'sonnet',b:'corp',ef:1}); render();
  const h=els.app.innerHTML;
  ok(h.includes('<b>550k</b>')&&h.includes('<b>3.2h</b>')&&/預計品質<\/label><b[^>]*>100%/.test(h),'派工台顯示 550k、3.2h、預計品質 100%');
  A.dispatch();
  ok(/派出投資工單 寫 CLAUDE\.md Lv1（Laravel）（複雜度 4）｜.*Sonnet・公司 API｜預計品質 100%｜派工台｜預計 3\.2h/.test(S.log[0].msg),'派出紀錄寫預計品質與預計時數',S.log[0].msg);
  /* 一般工單在投資 job 還在跑時完成：審 PR 倍率算一個其他 agent */
  const tk=ticket('fe',2,{due:5}); S.issues.push(tk);
  Object.assign(sel,{issue:tk.id,v:'deepseek',m:'chat',b:'api',rv:0,ef:1,sdd:0});
  const r0=Math.random; Math.random=()=>.5;
  try{ A.dispatch(); const j=S.jobs.find(x=>x.issue===tk); j.left=.1; const before=S.hours; A.wait(true);
    ok(S.jobs.length===1&&S.jobs[0].inv&&near(before-S.hours,.1+.5),'工單先跑完：審 PR 0.5h（2 × 0.2 × 1.25）',before-S.hours); }
  finally{ Math.random=r0; }
  A.wait(true);
  ok(/★ 投資完成 寫 CLAUDE\.md Lv1（Laravel）｜.*｜品質 100%｜燒掉 550k｜公司 NT\$248｜3\.2h/.test(S.log[0].msg),'完成紀錄寫品質、token、花費、時數',S.log[0].msg);
  /* 每日彈窗的到期張數不算投資工單 */
  newRun('laravel','parallel'); S.day=3; A.openInvTicket('ci'); M.showDay([],null,false);
  ok(els.mo.innerHTML.includes('其中 0 張今天到期'),'早上報告的今天到期張數不含投資工單');
  /* 當機中止寫原因 */
  newRun('laravel','parallel'); S.hours=8; A.openInvTicket('hook'); const hk=S.issues.find(i=>i.inv);
  Object.assign(sel,{issue:hk.id,v:'anthropic',m:'opus',b:'corp',ef:1}); A.dispatch(); A.cancelJobs(j=>j.v==='anthropic','廠商當機');
  ok(S.log[0].msg.includes('廠商當機')&&S.issues.includes(hk),'當機中止：紀錄寫原因、工單回佇列',S.log[0].msg);
  /* SDD 按鈕顯示打折後的值 */
  newRun('laravel','parallel'); S.inv.sdd=1; setInvQ('sdd',null,1,.6); const n=ticket('laravel',3); S.issues.push(n); sel.issue=n.id; render();
  ok(/data-sdd="1"[^>]*>[^<]*<small>[^<]*≥3 失敗少 5%・陷阱燒 25%/.test(els.app.innerHTML),'SDD Lv1 60%：按鈕寫失敗少 5%、陷阱燒 25%');
});
