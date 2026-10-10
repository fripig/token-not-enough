// research-tickets 的規則檢查：docs/spectra/specs/research-tickets/spec.md
import {ok,near,section,newRun,ticket} from './lib.js';
import {els,store,resetStore} from '../fake-dom.js';
import {BASE,CLIENTS,STACKS,model} from '../../public/js/data.js';
import {GIG_CLIENT,S,makeIssue,sel} from '../../public/js/state.js';
import {est,presetBlock,quotaLeft} from '../../public/js/calc.js';
import {canEvaluate,dispatch,endDay,evaluate,settle} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import * as A from '../../public/js/actions.js';
import * as M from '../../public/js/modals.js';
import * as St from '../../public/js/state.js';
import * as Ru from '../../public/js/rules.js';

section("research 1.2 研究單產生",()=>{
  /* research 1.2 研究單產生 */
  // 原本沿用 trap 1.1 產生的工單；拆檔後自己用同樣的設定產生一份
  newRun('laravel'); S.day=10;
  const gen=[...Array(20000)].map(()=>makeIssue(false));
  const big45=gen.filter(i=>i.cx>=4), rsch=big45.filter(i=>i.research);
  ok(Math.abs(rsch.length/big45.length-.3)<=.03,'複雜度 4–5 的工單約 30% 是研究單',rsch.length/big45.length);
  ok(gen.filter(i=>i.cx<=3).every(i=>!i.research),'複雜度 1–3 的工單不是研究單');
  ok(gen.every(i=>!(i.trap&&i.research)),'陷阱不會是研究單');
  ok(rsch.every(i=>i.parts?.length===2&&i.parts.every(p=>typeof p==='string'&&p)&&STACKS[i.stack].pool.research.some(e=>e.t===i.title&&e.parts[0]===i.parts[0]&&e.parts[1]===i.parts[1])),'研究單的標題與兩張拆單標題來自研究標題池');
  ok([...Array(2000)].map(()=>makeIssue(true)).every(i=>!i.research),'事故單不是研究單');
  St.setResearchRate(0);
  {let draws=0; const R1=Math.random; Math.random=()=>{draws++;return .99;}; S.day=20; try{makeIssue(false);}finally{Math.random=R1;} St.setResearchRate(.3);
   let draws2=0; Math.random=()=>{draws2++;return .99;}; try{makeIssue(false);}finally{Math.random=R1;}
   ok(draws2===draws+1,'研究單比例 0 時不多擲亂數，比例 > 0 時複雜度 4–5 的工單多擲一次',`${draws}/${draws2}`);}
});

section("research 1.3 研究標題池",()=>{
  /* research 1.3 研究標題池 */
  for(const k of Object.keys(STACKS)) ok(STACKS[k].pool.research?.length>=3&&STACKS[k].pool.research.every(e=>e.t&&e.parts?.length===2&&e.parts.every(Boolean)),`STACKS.${k}.pool.research 至少 3 組標題＋兩張拆單標題`);
});

section("研究單（gh-21-01-research-split-tickets）",()=>{
  /* ===== 研究單（gh-21-01-research-split-tickets） ===== */
  {const R0=Math.random, rand=(seq,f)=>{const a=[].concat(seq);let i=0;Math.random=()=>a[Math.min(i++,a.length-1)];try{return f();}finally{Math.random=R0;}};
   const rt=(stack,cx,extra={})=>ticket(stack,cx,{research:true,parts:['拆單一','拆單二'],title:'研究單',...extra});
  /* research 2.1 直接派工 token ×4 */
  {newRun('laravel'); const tr=rt('fe',4,{base:550}), tn=ticket('fe',4,{base:550});
   const er=est(tr,'anthropic','sonnet',0,1), en=est(tn,'anthropic','sonnet',0,1);
   ok(near(er.tk,2200)&&near(en.tk,550)&&er.p===en.p&&near(er.hrs,en.hrs),'research：Sonnet 估前端複雜度 4 研究單 2,200k，成功率與時數不變',er.tk);
   S.presets=[{v:'anthropic',m:'sonnet',b:'api',rv:0,ef:1},...S.presets.slice(1)]; S.wallet=en.hi*.45*S.priceMod.anthropic+1;
   ok(presetBlock(tn,S.presets[0])===''&&presetBlock(tr,S.presets[0])==='錢包不夠','research：錢包夠 1 倍、不夠 4 倍時方案 A 被略過（錢包不夠）');}
  const rjob=(is,x={})=>({issue:is,v:'anthropic',m:'sonnet',ef:1,b:'corp',M:model('anthropic','sonnet'),rv:0,tk:100,hrs:1,ok:true,caught:false,left:0,hidden:false,stop:false,sdd:false,...x});
  /* research 2.4 合併衝突留下的單不是研究單 */
  {newRun('laravel','parallel'); const tr=rt('laravel',4); S.issues=[tr]; rand(0,()=>settle(rjob(tr),{conflict:1}));
   ok(tr.merge&&tr.title.startsWith('解決衝突：')&&!tr.research&&tr.cx===3,'research：直接派工的研究單合併衝突後，解決衝突單不是研究單');}
  /* research 2.2 拆單 */
  {const sp=(is)=>{newRun('laravel'); S.issues=[is]; return A.splitResearch(is).map(p=>[p.cx,is.out?p.pay:p.kpi]);};
   const rows=[[rt('laravel',4,{kpi:16}),[[2,6],[3,10]]],[rt('laravel',5,{kpi:24}),[[3,12],[3,12]]],[rt('rust',4,{kpi:21}),[[2,8],[3,13]]],[rt('laravel',4,{kpi:16,out:true,pay:1280}),[[2,512],[3,768]]]];
   for(const [is,want] of rows) ok(JSON.stringify(sp(is))===JSON.stringify(want),`research：${is.stack} 複雜度 ${is.cx}${is.out?' 外包':''} 拆成 ${JSON.stringify(want)}`,JSON.stringify(sp(is)));
   newRun('laravel'); const fin=CLIENTS.find(c=>c.ban==='api'), x=ticket('fe',1), y=ticket('fe',2), tr=rt('laravel',4,{sens:true,big:true,client:fin,due:9,tries:2,store:true});
   S.issues=[x,tr,y]; sel.issue=tr.id; const [a,b]=A.splitResearch(tr);
   ok(S.issues.length===4&&S.issues[0]===x&&S.issues[1]===a&&S.issues[2]===b&&S.issues[3]===y&&!S.issues.includes(tr),'research：兩張拆單放在原單的位置');
   ok(a.id!==tr.id&&b.id!==tr.id&&a.id!==b.id&&sel.issue===a.id,'research：拆單是新編號，派工台選第一張');
   ok(a.title==='拆單一'&&b.title==='拆單二','research：拆單標題來自研究標題池的兩張拆單');
   ok([a,b].every(p=>p.sens&&p.client===fin&&p.due===9&&p.store&&p.stack==='laravel'&&!p.research&&!p.trap&&!p.inc&&!p.merge&&!p.evaluated&&!p.revealed&&p.tries===0&&p.trueCx===p.cx&&p.base>=BASE[p.cx]*.85&&p.base<=BASE[p.cx]*1.15),'research：拆單沿用機敏、案主、期限、上架審核，沒有陷阱與失敗次數');
   ok(!a.big&&b.big,'research：只有複雜度 ≥3 的拆單保留大型 codebase');}
  /* research 2.3 agent 研究與自己研究 */
  {const pick3=(is,v,m,b)=>{S.issues=[is]; Object.assign(sel,{issue:is.id,v,m,b,rv:0,ef:1});};
   newRun('laravel'); let tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); const w0=S.wallet;
   ok(A.researchCost(model('anthropic','sonnet'),'anthropic').tk===40,'research：Sonnet 研究 40k tokens');
   A.research('agent');
   ok(near(w0-S.wallet,18)&&near(S.hours,7.6)&&S.issues.length===2&&!S.issues.includes(tr),'research：Sonnet 個人 API 研究扣 NT$18、0.4h、拆成兩張',`${w0-S.wallet} ${S.hours}`);
   newRun('laravel'); S.subs.anthropic='pro'; tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','sub'); const L=quotaLeft('sub','anthropic'); S.used.sub.anthropic.d+=L-30; S.used.sub.anthropic.w+=L-30;
   A.research('agent');
   ok(near(quotaLeft('sub','anthropic'),0)&&S.issues.length===1&&S.issues[0]===tr&&tr.research&&S.log[0].msg.includes('額度不夠，研究沒做完'),'research：額度只剩 30k 時研究沒做完、不拆單',S.log[0]?.msg);
   newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); S.wallet=5; A.research('agent');
   ok(S.wallet===0&&S.issues.length===1&&S.issues[0]===tr&&tr.research&&S.log[0].msg.includes('錢包見底，研究沒做完'),'research：個人 API 錢包只剩 NT$5 時研究沒做完、不拆單（gh-26-01）',S.log[0]?.msg);
   newRun('laravel'); tr=rt('laravel',4,{out:true,pay:1280,client:GIG_CLIENT}); pick3(tr,'anthropic','sonnet','corp'); const snap=JSON.stringify([S.corp,S.hours,S.issues.length]);
   const ev=[]; globalThis.gtag=(k,n,p)=>ev.push(n); A.research('agent'); delete globalThis.gtag;
   ok(JSON.stringify([S.corp,S.hours,S.issues.length])===snap&&tr.research&&!ev.length,'research：外包研究單選公司 API 時不動作、不送事件');
   for(const [st,h] of [['laravel',1.5],['rust',3],['fe',1.5]]){newRun('laravel'); tr=rt(st,4); pick3(tr,'anthropic','sonnet','api'); A.research('self'); ok(near(S.hours,8-h)&&S.issues.length===2,`research：Laravel 自己研究 ${st} 研究單花 ${h}h`,S.hours);}
   newRun('laravel'); S.hours=1; tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('self'); ok(S.hours===1&&S.issues[0]===tr&&tr.research,'research：剩 1h 時不能自己研究');
   newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); ok(!canEvaluate(tr),'research：研究單不能評估架構');
   const h0=S.hours; evaluate(); ok(S.hours===h0&&!tr.evaluated,'research：在研究單上評估架構不動作');
   newRun('laravel','parallel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('agent'); ok(near(S.hours,7.6)&&S.issues.length===2&&!tr.running,'research：平行模式研究推進時鐘 0.4h');
   newRun('laravel'); tr=rt('laravel',4,{sens:true}); pick3(tr,'deepseek','chat','api'); rand(0,()=>A.research('agent')); ok(S.st.audits===1&&S.trust===58,'research：機敏研究單走個人 API 要擲資安稽核');
  /* research 2.3 被擋下的研究：什麼都不變、不送事件 */
   {const ev=[]; globalThis.gtag=(k,n)=>ev.push(n);
    const refused=(name,setup,via='agent',mode='serial')=>{newRun('laravel',mode); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); setup(tr); ev.length=0;
      const snap=JSON.stringify([S.hours,S.wallet,S.corp,S.trust,S.issues.map(i=>i.id),S.jobs.length]);
      ok(A.researchBlock(tr,via)!=='','research：'+name+'時 researchBlock 回傳原因',A.researchBlock(tr,via)); A.research(via);
      ok(JSON.stringify([S.hours,S.wallet,S.corp,S.trust,S.issues.map(i=>i.id),S.jobs.length])===snap&&tr.research&&!ev.includes('research'),'research：'+name+'時研究不動作、不送事件');};
    refused('廠商當天當機',()=>{S.outage='anthropic';});
    refused('案主禁用模型',t=>{t.client=CLIENTS.find(c=>c.ban==='api'); Object.assign(sel,{v:'deepseek',m:'chat'});});
    refused('模型需要沒買的電腦',()=>{Object.assign(sel,{v:'local',m:'glm53',b:'local'});});
    refused('本地 GPU 忙',()=>{Object.assign(sel,{v:'local',m:'qwen',b:'local'}); S.jobs=[rjob(ticket('fe',1),{b:'local',v:'local',M:model('local','qwen'),left:3})];},'agent','parallel');
    refused('工時不夠 agent 研究',()=>{S.hours=.3;});
    refused('本地 GPU 卡住不能手寫時自己研究',()=>{S.jobs=[rjob(ticket('fe',1),{b:'local',v:'local',M:model('local','qwen'),left:3})];},'self','parallel');
    refused('研究單正在跑',t=>{t.running=true;});
    newRun('laravel'); tr=rt('laravel',4); tr.running=true; ok(A.researchBlock(tr,'agent')==='這張單正在跑'&&A.researchBlock(ticket('fe',4),'agent')==='不是研究單','research：正在跑與不是研究單回傳不同原因');
    delete globalThis.gtag;}
   newRun('laravel'); S.corp=5; tr=rt('laravel',4); pick3(tr,'anthropic','opus','corp'); A.research('agent');
   ok(S.corp===0&&S.trust===62&&S.issues.length===2&&S.log.some(l=>l.msg.includes('公司 API 預算透支')),'research：研究刷公司 API 透支時信任 -8、預算歸零',`${S.corp} ${S.trust}`);
   newRun('laravel','parallel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('self'); ok(near(S.hours,6.5)&&S.issues.length===2&&!tr.running,'research：平行模式自己研究推進時鐘 1.5h');
  /* research 拆單逾期：同一張原單信任只扣一次 */
   {const lateRun=origs=>{newRun('laravel'); S.day=9; S.kpi=50; S.issues=[]; for(const o of origs){S.issues.push(o); A.splitResearch(o);} rand(.99,endDay);};
    lateRun([rt('laravel',4,{kpi:16,due:9})]);
    ok(S.trust===66&&S.kpi===42&&S.st.late===2&&els.mo.innerHTML.includes('2 張工單逾期，主管信任 -4。')&&S.log.some(l=>l.msg.includes('⌛ 逾期：拆單二｜KPI -5｜信任 -0')),'research：同一張研究單拆出的兩張都逾期時信任只扣 4、KPI 各扣一半',`${S.trust} ${S.kpi}`);
    lateRun([rt('laravel',4,{kpi:16,due:9}),rt('laravel',5,{kpi:24,due:9})]);
    ok(S.trust===62&&S.st.late===4,'research：兩張不同研究單的拆單都逾期時各扣一次（-8）',`${S.trust}`);
    ok(A.splitResearch.length===1&&(()=>{newRun('laravel'); const o=rt('laravel',4); S.issues=[o]; return A.splitResearch(o).every(p=>p.from===o.id);})(),'research：拆單記住原單 id');}
  /* research 3.1 卡片與派工台 */
   newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); render(); const h=els.app.innerHTML;
   ok(h.includes('<span class="chip rsch">需研究</span>')&&h.includes('直接派工 token ×4（先研究可拆成兩張小單）'),'research：研究單卡片顯示需研究與 ×4 提示');
   ok(h.includes('先讓 agent 研究拆單（40k tokens，0.4h）')&&h.includes('自己研究拆單（1.5h，0 token）')&&!h.includes('先讓 agent 評估架構'),'research：派工台顯示兩個研究按鈕、沒有評估架構');
   S.issues=[ticket('laravel',4)]; sel.issue=S.issues[0].id; render(); ok(!els.app.innerHTML.includes('需研究')&&!els.app.innerHTML.includes('研究拆單'),'research：一般工單沒有研究標示與按鈕');
   newRun('laravel'); tr=rt('laravel',4); S.hours=1; pick3(tr,'anthropic','sonnet','api'); render(); ok(/data-act="selfresearch" disabled/.test(els.app.innerHTML)&&!/data-act="research" disabled/.test(els.app.innerHTML),'research：工時不夠自己研究時按鈕停用，agent 研究照常');
   const clk=ds=>els.app.on.click({target:{closest:()=>({dataset:ds,disabled:false})}});
   newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); clk({act:'selfresearch'}); ok(S.issues.length===2&&!S.issues.includes(tr),'research：按自己研究拆單會拆單');}
  /* research 3.2 GA 事件與紀錄 */
  {const ev=[]; globalThis.gtag=(k,n,p)=>ev.push({n,p}); const pick3=(is,v,m,b)=>{S.issues=[is]; Object.assign(sel,{issue:is.id,v,m,b,rv:0,ef:1});};
   newRun('laravel'); let tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); rand(.5,dispatch);
   const d=ev.find(e=>e.n==='dispatch'), jr=ev.find(e=>e.n==='job_result');
   ok(d?.p.research===true&&jr?.p.research===true,'research：直接派工研究單時 dispatch 與 job_result 的 research 是 true');
   ok(S.log.some(l=>l.msg.includes('→ 派出 研究單（複雜度 4・第 20 天到期・需研究）')),'research：派工紀錄的標籤有需研究');
   ev.length=0; newRun('laravel'); const tn=ticket('laravel',2); pick3(tn,'anthropic','sonnet','api'); rand(.5,dispatch);
   ok(ev.find(e=>e.n==='dispatch')?.p.research===false&&ev.find(e=>e.n==='job_result')?.p.research===false,'research：一般工單的 research 是 false');
   ev.length=0; newRun('laravel'); tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('self');
   const r=ev.filter(e=>e.n==='research');
   ok(r.length===1&&r[0].p.via==='self'&&r[0].p.vendor==='none'&&r[0].p.model==='none'&&r[0].p.bill==='none'&&r[0].p.cx===4&&r[0].p.stack==='laravel'&&r[0].p.gig===false&&r[0].p.outcome==='split','research：自己研究送一筆 research 事件（self、none、split）',JSON.stringify(r[0]?.p));
   ok(/^D01 ✂ 研究單｜自己研究｜拆成「拆單一」（複雜度 2）＋「拆單二」（複雜度 3）｜1\.5h$/.test(S.log[0].msg),'research：自己研究的紀錄',S.log[0].msg);
   ev.length=0; newRun('laravel'); tr=rt('laravel',5); pick3(tr,'anthropic','sonnet','api'); A.research('agent');
   ok(ev.filter(e=>e.n==='research').length===1&&ev.find(e=>e.n==='research').p.via==='agent'&&ev.find(e=>e.n==='research').p.model==='sonnet'&&ev.find(e=>e.n==='research').p.bill==='api','research：agent 研究送 research 事件（agent、sonnet、api）');
   ok(/^D01 ✂ 研究單｜研究｜Claude Code \/ Sonnet・個人 API｜拆成「拆單一」（複雜度 3）＋「拆單二」（複雜度 3）｜40k tokens｜NT\$18｜0\.4h$/.test(S.log[0].msg),'research：agent 研究的紀錄',S.log[0].msg);
   ev.length=0; newRun('laravel'); S.subs.anthropic='pro'; tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','sub'); const L=quotaLeft('sub','anthropic'); S.used.sub.anthropic.d+=L-30; S.used.sub.anthropic.w+=L-30; A.research('agent');
   ok(ev.find(e=>e.n==='research')?.p.outcome==='quota'&&/^D01 ✗ 研究單｜研究｜Claude Code \/ Sonnet・個人訂閱｜額度不夠，研究沒做完｜額度 30k$/.test(S.log[0].msg),'research：額度不夠時 outcome 是 quota',S.log[0].msg);
   ev.length=0; newRun('laravel'); S.hours=1; tr=rt('laravel',4); pick3(tr,'anthropic','sonnet','api'); A.research('self'); ok(!ev.length,'research：被擋下的研究不送事件');
   delete globalThis.gtag;}
  /* research 3.3 規則 modal */
  {const t=Ru.rulesTab('tickets');
   ok(['研究單','30%','token ×4','40k × token 倍率','0.5h × 速度','花 1.5h','複雜度 4 → 2＋3','複雜度 5 → 3＋3'].every(x=>t.includes(x)),'research：工單與陷阱分頁說明研究單的比例、倍率、研究代價與拆法');}
  /* research 1.4 舊存檔沒有研究欄位 */
  {newRun('laravel'); S.day=5; const old=ticket('laravel',4); delete old.research; S.issues=[old,ticket('fe',2)]; resetStore(); St.saveGame(null);
   const raw=JSON.parse(store[St.SAVE_KEY]); raw.S.issues.forEach(i=>{delete i.research;delete i.parts;}); resetStore({[St.SAVE_KEY]:JSON.stringify(raw)});
   const r=St.readSave(); ok(St.SAVE_VER===1&&r&&!r.bad,'research：沒有研究欄位的舊存檔可以讀，SAVE_VER 仍是 1');
   St.loadGame(r); sel.issue=S.issues[0].id; render();
   ok(S.day===5&&!els.app.innerHTML.includes('需研究')&&!els.app.innerHTML.includes('研究拆單')&&est(S.issues[0],'anthropic','sonnet',0,1).tk===est(ticket('laravel',4,{base:S.issues[0].base}),'anthropic','sonnet',0,1).tk,'research：舊存檔的工單照一般工單處理');
   newRun('laravel'); S.day=3; S.issues=[rt('laravel',4)]; resetStore(); St.saveGame(null); St.loadGame(St.readSave());
   ok(S.issues[0].research&&S.issues[0].parts.join()==='拆單一,拆單二','research：研究單存檔讀檔後保留研究標記與拆單標題');}
  }
});
