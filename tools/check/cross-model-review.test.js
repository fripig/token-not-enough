// cross-model-review 的規則檢查：docs/spectra/specs/cross-model-review/spec.md
import {ok,near,section,newRun,ticket,job,withRand,clickApp} from './lib.js';
import {render} from '../../public/js/view.js';
import {CLIENTS} from '../../public/js/data.js';
import * as A from '../../public/js/actions.js';
import {settle} from '../../public/js/actions.js';
import * as C from '../../public/js/calc.js';
import {els,store,resetStore} from '../fake-dom.js';
import {S,sel} from '../../public/js/state.js';
import * as St from '../../public/js/state.js';
import {est,reviewCost,reviewer} from '../../public/js/calc.js';

section("cross-model-review：生效的審核模型",()=>{
  newRun('laravel'); Object.assign(sel,{rv:1,rvv:'anthropic',rvm:'opus',rvb:'corp'});
  ok(reviewer()===null,'沒買交叉審核工具：當同一個');
  S.inv.xreview=1; ok(JSON.stringify(reviewer())==='{"v":"anthropic","m":"opus","b":"corp"}','買了、自審、選 Opus：生效');
  sel.rv=0; ok(reviewer()===null,'不審核：當同一個');
  sel.rv=2; sel.rvv=null; ok(reviewer()===null,'選同一個：null');
});

section("cross-model-review：舊存檔沒有審核欄位",()=>{
  newRun('laravel','parallel'); S.day=3; const tk=ticket('fe',2,{running:true}); S.issues=[tk];
  S.jobs=[job(tk,'anthropic','sonnet','api',{rv:1,left:2,hrs:3})];
  resetStore(); St.saveGame(null);
  const d=JSON.parse(store[St.SAVE_KEY]); delete d.sel.rvv; delete d.sel.rvm; delete d.sel.rvb; for(const j of d.S.jobs){delete j.rvv;delete j.rvm;delete j.rvb;delete j.rtk;}
  resetStore({[St.SAVE_KEY]:JSON.stringify(d)}); const r=St.readSave();
  ok(r&&!r.bad,'舊存檔讀得到');
  St.loadGame(r);
  ok(sel.rvv===null&&sel.rvm===null&&sel.rvb===null,'舊存檔的選擇補成同一個');
  ok(S.jobs.length===1&&S.jobs[0].rvv===null&&S.jobs[0].rtk===0,'舊存檔跑著的 job 當同一個審');
});

section("cross-model-review：抓錯率看審核模型",()=>{
  newRun('laravel'); S.inv.xreview=1; const tk=ticket('fe',4); S.issues=[tk];
  const rate=(v,m,rv)=>Math.round(est(tk,'anthropic','sonnet',rv,1,2,v?{v,m,b:'corp'}:null).c*100);
  for(const [v,m,a,b] of [[null,null,20,40],['anthropic','opus',30,50],['anthropic','fable',40,60],['deepseek','chat',10,30]])
    ok(rate(v,m,1)===a&&rate(v,m,2)===b,`front-end 複雜度 4、Sonnet 寫、${m||'同一個'} 審：自審 ${a}%、嚴格 ${b}%`,`${rate(v,m,1)} ${rate(v,m,2)}`);
  const rs=ticket('rust',3);
  ok(Math.round(est(rs,'anthropic','opus',1,1,2,{v:'anthropic',m:'haiku',b:'corp'}).c*100)===10,'Rust 複雜度 3、Opus 寫、Haiku 審：差距 −10、抓錯 10%');
  S.advanced=true;
  ok(Math.round(est(tk,'anthropic','sonnet',1,2,2,{v:'anthropic',m:'opus',b:'corp'}).c*100)===30,'寫的模型高強度不影響審核模型：30%');
  S.advanced=false;
  const e=est(tk,'anthropic','sonnet',1,1,2,{v:'anthropic',m:'fable',b:'corp'});
  ok(Math.round(e.p*100)===75&&Math.round(e.pe*100)===85,'Sonnet 寫、Fable 審：85%（原 75%）',`${e.p} ${e.pe}`);
});

section("cross-model-review：token、花費與時間",()=>{
  newRun('laravel'); S.inv.xreview=1; const tk=ticket('fe',4); S.issues=[tk];
  const same=est(tk,'anthropic','sonnet',1,1,2,null), x=est(tk,'anthropic','sonnet',1,1,2,{v:'anthropic',m:'opus',b:'corp'});
  ok(near(x.tk*1.3,same.tk),'交叉審核時寫的那段是不審核的 token',`${x.tk} ${same.tk}`);
  ok(near(x.rtk,x.tk*.3*.85),'審核那段 = 寫的那段 × 0.3 × Opus 0.85 ÷ Sonnet 1');
  /* 寫的那段剛好 200k：調 base 讓不審核的 token 是 200 */
  const t2=ticket('fe',4); t2.base*=200/x.tk; const x2=est(t2,'anthropic','sonnet',1,1,2,{v:'anthropic',m:'opus',b:'corp'});
  ok(near(x2.tk,200)&&near(x2.rtk,51)&&near(reviewCost(x2).hi,51*1.3*.9),'寫的那段 200k → 審核 51k、Opus 公司 API 每 1k NT$0.9',`${x2.tk} ${x2.rtk}`);
  ok(near(x2.rtk*.9,45.9)&&near(x2.tk*.45,90),'200k：審核 NT$45.9、寫的 NT$90');
  const rc=reviewCost(x); ok(rc&&near(rc.hi,x.rhi*.9),'審核花費照 Opus 的價格與公司 API');
  ok(near(same.hrs,3.84)&&near(x.hrs,4)&&near(est(tk,'anthropic','sonnet',1,1,2,{v:'anthropic',m:'haiku',b:'corp'}).hrs,3.76),'時間：同一個 3.84h、Opus 審 4.0h、Haiku 審 3.76h',`${same.hrs} ${x.hrs}`);
  const s0=est(tk,'anthropic','sonnet',1,1,2); ok(s0.tk===same.tk&&s0.hrs===same.hrs&&s0.rv===null,'沒買／同一個時數字跟原本一樣');
});

section("cross-model-review：結算、沒審成、稽核",()=>{
  const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
  const xj=(is,extra)=>job(is,'anthropic','sonnet','api',{rv:1,ok:false,caught:true,tk:200,rvv:'anthropic',rvm:'opus',rvb:'corp',rtk:51,...extra});
  /* 抓到錯：修正的 ×1.25 只算寫的那段 */
  newRun('laravel'); S.inv.xreview=1; let tk=ticket('fe',4); S.issues=[tk];
  let w0=S.wallet, c0=S.corp; settle(xj(tk));
  ok(!S.issues.includes(tk)&&near(w0-S.wallet,250*.45)&&near(c0-S.corp,51*.9),'抓到錯：寫的扣 250k、審的扣 51k',`${w0-S.wallet} ${c0-S.corp}`);
  ok(ge.at(-1).p.outcome==='caught'&&ge.at(-1).p.tokens===301,'抓到錯：GA tokens 含審核那段',JSON.stringify(ge.at(-1).p));
  /* 審核額度不夠：當作沒審，寫的那段照常 */
  newRun('laravel'); S.inv.xreview=1; S.subs.anthropic='pro'; S.used.sub.anthropic.d=450-10; tk=ticket('fe',4); S.issues=[tk];
  settle(xj(tk,{rvb:'sub'}));
  ok(S.issues.includes(tk)&&S.log[0].msg.includes('審核沒做完，沒抓到錯誤')&&ge.at(-1).p.outcome==='fail'&&S.used.sub.anthropic.d===450,'審核額度不夠：用掉剩下的額度、失敗、寫審核沒做完、outcome fail',S.log[0].msg);
  /* 審核廠商當機：不中止、不扣審核那段、照常成功 */
  newRun('laravel','parallel'); S.inv.xreview=1; tk=ticket('fe',4,{running:true}); S.issues=[tk];
  const oj=job(tk,'deepseek','chat','api',{rv:1,ok:true,tk:200,left:1,hrs:2,rvv:'anthropic',rvm:'opus',rvb:'corp',rtk:51}); S.jobs=[oj];
  S.outage='anthropic'; ok(A.cancelJobs(j=>j.v===S.outage,'x')===0&&S.jobs.length===1,'審核廠商當機不會中止 job');
  c0=S.corp; S.jobs=[]; tk.running=false; settle(oj);
  ok(!S.issues.includes(tk)&&S.corp===c0,'審核廠商當機：照常成功、公司沒扣審核那段');
  /* 機敏單：寫、審各自走個人付費各擲一次 */
  newRun('laravel'); S.inv.xreview=1;
  const sj=()=>{const is=ticket('fe',2,{sens:true}); S.issues=[is]; return job(is,'anthropic','sonnet','api',{rv:1,ok:true,tk:10,rvv:'deepseek',rvm:'reasoner',rvb:'api',rtk:5});};
  let a0=S.st.audits; withRand([.5,.5],()=>settle(sj())); ok(S.st.audits===a0+1,'機敏單：0.5 不到寫的 35%、到審的 60%，稽核 1 次');
  a0=S.st.audits; withRand([.1,.1],()=>settle(sj())); ok(S.st.audits===a0+2,'機敏單：寫、審各擲一次，稽核 2 次');
  a0=S.st.audits; withRand([0,0],()=>{const is=ticket('fe',2,{sens:true}); S.issues=[is]; settle(job(is,'anthropic','sonnet','corp',{rv:1,ok:true,tk:10,rvv:'anthropic',rvm:'opus',rvb:'corp',rtk:5}));});
  ok(S.st.audits===a0,'機敏單：寫、審都走公司 API 不擲稽核');
  delete globalThis.gtag;
});

section("cross-model-review：本地審核模型占 GPU、算用到電腦",()=>{
  newRun('laravel','parallel'); S.inv.xreview=1; S.hours=8;
  const a=ticket('fe',2,{running:true}), b=ticket('fe',2); S.issues=[a,b];
  S.jobs=[job(a,'anthropic','sonnet','corp',{rv:1,left:3,hrs:3,rvv:'local',rvm:'gemma',rvb:'local',rtk:5})];
  ok(C.localBusy(),'審核模型是本地時 GPU 算忙');
  ok(C.reviewerBlock(b,{v:'local',m:'qwen',b:'local'},'anthropic')==='本地 GPU 忙','本地審核按鈕：本地 GPU 忙');
  Object.assign(sel,{issue:b.id,v:'local',m:'qwen',b:'local',rv:0}); const n=S.jobs.length; A.dispatch();
  ok(S.jobs.length===n,'本地派工被擋');
  const ev=S.issues.find(i=>i.id===b.id); A.evaluate(); ok(!ev.evaluated,'本地評估架構被擋');
  /* 用本地模型審算用到電腦 */
  newRun('laravel','parallel'); S.inv.xreview=1; S.hours=8; S.hw.pc=true; S.hw.spark=true;
  const c=ticket('fe',2); S.issues=[c];
  Object.assign(sel,{issue:c.id,v:'anthropic',m:'sonnet',b:'corp',rv:1,rvv:'local',rvm:'qcnext',rvb:'local'}); A.dispatch();
  ok(S.jobs.length===1&&S.jobs[0].rvb==='local'&&S.hwUsed.pc&&S.hwUsed.spark&&!S.hwUsed.mac,'Qwen3-Coder-Next 審：PC 與 Spark 算用到',JSON.stringify(S.hwUsed));
  ok(C.reviewerBlock(c,{v:'local',m:'qwen',b:'local'},'local')==='寫的是本地模型時只能同一個','寫的是本地時本地審核按鈕停用');
  Object.assign(sel,{rvv:null,rvm:null,rvb:null});
});

section("cross-model-review：派工台的審核模型與審核付費方式",()=>{
  const rowShown=()=>els.app.innerHTML.includes('<label>審核模型</label>');
  for(const [own,rv,want] of [[0,1,false],[1,0,false],[1,1,true],[1,2,true]]){
    newRun('laravel'); S.inv.xreview=own; const tk=ticket('fe',4); S.issues=[tk]; Object.assign(sel,{issue:tk.id,v:'anthropic',m:'sonnet',b:'corp',rv,rvv:null,rvm:null,rvb:null}); render();
    ok(rowShown()===want,`買了 ${own}、審核等級 ${rv}：審核模型那排${want?'出現':'不出現'}`);
  }
  const rvBtns=()=>[...els.app.innerHTML.matchAll(/<button class="mb[^"]*" style="[^"]*" data-rvv="(\w+)" data-rvm="(\w+)"( disabled)?/g)].map(m=>({v:m[1],m:m[2],dis:!!m[3]}));
  newRun('laravel'); S.inv.xreview=1; let tk=ticket('fe',4); S.issues=[tk]; Object.assign(sel,{issue:tk.id,v:'anthropic',m:'sonnet',b:'corp',rv:1}); render();
  let bs=rvBtns(); ok(els.app.innerHTML.includes('data-rvv="">同一個')&&!bs.some(b=>b.v==='anthropic'&&b.m==='sonnet')&&bs.some(b=>b.m==='opus')&&bs.some(b=>b.v==='openai'),'審核模型：先同一個，列出 Opus 與其他廠商，沒有寫的 Sonnet');
  ok(els.app.innerHTML.includes('抓錯 30%'),'Opus 審複雜度 4 的按鈕寫抓錯 30%');
  /* 金融客戶：中國雲端停用、本地 Qwen 可以 */
  newRun('laravel'); S.inv.xreview=1; tk=ticket('fe',4,{client:CLIENTS.find(c=>c.ban==='api')}); S.issues=[tk]; Object.assign(sel,{issue:tk.id,v:'anthropic',m:'sonnet',b:'corp',rv:1}); render();
  bs=rvBtns(); const dis=v=>bs.filter(b=>b.v===v).every(b=>b.dis);
  ok(dis('deepseek')&&dis('zhipu')&&dis('moonshot')&&!bs.find(b=>b.v==='local'&&b.m==='qwen').dis,'金融客戶：DeepSeek、智譜、Kimi 停用，本地 Qwen3.6 35B-A3B 可用');
  /* 審核廠商當機：回到同一個 */
  Object.assign(sel,{rvv:'anthropic',rvm:'opus',rvb:'corp'}); S.outage='anthropic'; Object.assign(sel,{v:'google',m:'pro'}); render();
  ok(sel.rvv===null,'審核模型當機時回到同一個');
  S.outage=null;
  /* 預設付費：有訂閱額度用個人訂閱 */
  newRun('laravel'); S.inv.xreview=1; S.subs.anthropic='max5'; tk=ticket('fe',2); S.issues=[tk]; Object.assign(sel,{issue:tk.id,v:'deepseek',m:'chat',b:'api',rv:1,rvv:null}); render();
  clickApp({rvv:'anthropic',rvm:'opus'});
  ok(sel.rvv==='anthropic'&&sel.rvb==='sub'&&els.app.innerHTML.includes('審核付費方式'),'選 Opus 審：預設個人訂閱、出現審核付費方式',sel.rvb);
  ok(/審核額度<\/label>/.test(els.app.innerHTML),'預估多一行審核花費');
  /* 外包單：審核也不能用公司 API */
  tk.out=true; render();
  ok(/data-rvb="corp" disabled>[^<]*<small>外包不能用公司資源/.test(els.app.innerHTML),'外包單：審核付費方式的公司 API 停用');
  clickApp({rvv:''}); ok(sel.rvv===null&&sel.rvb===null,'點同一個清掉審核模型');
});

section("cross-model-review：方案與警告",()=>{
  const P=(extra)=>({v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:2,...extra});
  /* 方案原因 */
  newRun('laravel'); S.inv.xreview=1; let tk=ticket('fe',2); S.issues=[tk];
  S.outage='anthropic'; ok(C.presetBlock(tk,P({v:'deepseek',m:'chat',b:'api',rvv:'anthropic',rvm:'opus',rvb:'corp'}))==='審核：今日當機','DeepSeek 寫、Opus 審，Anthropic 當機：審核：今日當機');
  S.inv.xreview=0; ok(C.presetBlock(tk,P({rvv:'anthropic',rvm:'opus',rvb:'corp'}))==='今日當機','沒買交叉審核工具：只看寫的模型');
  S.outage=null; S.inv.xreview=1;
  const fin=ticket('fe',2,{client:CLIENTS.find(c=>c.ban==='api')});
  ok(C.presetBlock(fin,P({rvv:'deepseek',rvm:'reasoner',rvb:'api'})).startsWith('審核：'),'金融客戶、DeepSeek Reasoner 審：審核：禁用原因',C.presetBlock(fin,P({rvv:'deepseek',rvm:'reasoner',rvb:'api'})));
  /* 同一家同一種額度：兩段加起來比 */
  S.subs.anthropic='max20'; const pp=P({b:'sub',rvv:'anthropic',rvm:'opus',rvb:'sub'}), e=est(tk,'anthropic','sonnet',1,1,2,C.reviewer(pp));
  const wq=e.hi*1, rq=e.rhi*2; S.used.sub.anthropic.d=9000-(wq+rq*.5);
  ok(C.presetBlock(tk,pp)==='審核：額度不夠','寫的夠、兩段加起來不夠：審核：額度不夠',C.presetBlock(tk,pp));
  S.used.sub.anthropic.d=0; ok(C.presetBlock(tk,pp)==='','額度夠時可以用');
  /* 派工台警告 */
  Object.assign(sel,{issue:tk.id,...pp}); S.used.sub.anthropic.d=9000-(wq+rq*.5); render();
  ok(els.app.innerHTML.includes('審核：剩餘額度可能不夠'),'派工台：審核：額度不夠的警告');
  /* 存成方案、載入、標籤 */
  newRun('laravel'); S.inv.xreview=1; tk=ticket('fe',2); S.issues=[tk];
  Object.assign(sel,{issue:tk.id,v:'anthropic',m:'sonnet',b:'corp',rv:1,rvv:'anthropic',rvm:'opus',rvb:'corp'}); A.savePreset(0); render();
  ok(S.presets[0].rvv==='anthropic'&&S.presets[0].rvm==='opus'&&S.presets[0].rvb==='corp'&&els.app.innerHTML.includes('Opus 審</small>'),'存成方案 A：記住 Opus 審、標籤寫 Opus 審');
  ok(/class="sb sel" data-load="0"/.test(els.app.innerHTML),'目前選擇跟方案 A 一樣：載入 A 亮起來');
  A.loadPreset(1); ok(sel.rvv===null,'載入沒有審核模型的方案 B：回到同一個');
  /* 沒買投資：方案的審核模型當同一個、不擋一鍵派工 */
  S.inv.xreview=0; S.hours=8; S.outage='anthropic';
  S.presets[1]=P({v:'deepseek',m:'chat',b:'api',rvv:'anthropic',rvm:'opus',rvb:'corp'});
  ok(C.presetBlock(tk,S.presets[1])==='','沒買投資：方案 B 的審核模型被忽略');
  S.outage=null; Object.assign(sel,{rvv:null,rvm:null,rvb:null});
});

section("cross-model-review：沒有公司席位、端對端",()=>{
  newRun('laravel'); S.inv.xreview=1; let tk=ticket('fe',2); S.issues=[tk];
  ok(C.presetBlock(tk,{v:'deepseek',m:'chat',b:'api',rv:1,ef:1,sdd:2,rvv:'anthropic',rvm:'opus',rvb:'seat'})==='審核：沒有公司席位','審核走公司席位但沒有席位：審核：沒有公司席位');
  /* 沒買投資：存著的審核模型不影響派工、扣款與紀錄 */
  newRun('laravel'); S.hours=8; tk=ticket('fe',2); S.issues=[tk]; const c0=S.corp;
  Object.assign(sel,{issue:tk.id,v:'anthropic',m:'sonnet',b:'api',rv:1,ef:1,rvv:'anthropic',rvm:'opus',rvb:'corp'});
  A.dispatch(); const l=S.log.find(x=>x.msg.includes('→ 派出'))?.msg||'';
  ok(S.corp===c0&&!l.includes('Opus 審')&&l.includes('・自審｜'),'沒買交叉審核工具：派工照同一個審、公司預算沒動、紀錄不寫審核模型',l);
  /* 沒買投資：一鍵派工用存了審核模型的方案，job 沒有審核模型 */
  newRun('laravel','parallel'); S.hours=8; tk=ticket('fe',2); S.issues=[tk];
  S.presets[1]={v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:2,rvv:'anthropic',rvm:'opus',rvb:'corp'};
  ok(A.quick(tk.id,'quick',1)&&S.jobs.length===1&&S.jobs[0].rvv===null,'沒買投資：一鍵派工方案 B 照同一個審');
  /* 載入方案會還原審核模型 */
  newRun('laravel'); S.inv.xreview=1; S.presets[2]={v:'anthropic',m:'sonnet',b:'corp',rv:2,ef:1,sdd:2,rvv:'google',rvm:'pro',rvb:'corp'};
  Object.assign(sel,{rvv:null,rvm:null,rvb:null}); A.loadPreset(2);
  ok(sel.rvv==='google'&&sel.rvm==='pro'&&sel.rvb==='corp'&&sel.rv===2,'載入方案 C：還原 Gemini Pro 審、公司 API');
  /* 兩段都走個人 API：錢包比兩段加起來 */
  newRun('laravel'); S.inv.xreview=1; tk=ticket('fe',4); S.issues=[tk];
  const pp={v:'anthropic',m:'sonnet',b:'api',rv:1,ef:1,sdd:2,rvv:'anthropic',rvm:'opus',rvb:'api'}, e=est(tk,'anthropic','sonnet',1,1,2,C.reviewer(pp));
  S.wallet=e.hi*.45+reviewCost(e).hi*.5;
  ok(C.presetBlock(tk,pp)==='審核：錢包不夠','寫的付得起、兩段加起來付不起：審核：錢包不夠',C.presetBlock(tk,pp));
  Object.assign(sel,{rvv:null,rvm:null,rvb:null});
});

section("cross-model-review：先扣寫的、修正最後扣、預設付費退回",()=>{
  const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
  /* 同一份訂閱：寫的 250k、審的 100k（Opus 權重 2 → 額度 200k÷2），剩 300k */
  newRun('laravel'); S.inv.xreview=1; S.subs.anthropic='max20'; S.used.sub.anthropic.d=9000-300; let tk=ticket('fe',4); S.issues=[tk];
  settle(job(tk,'anthropic','sonnet','sub',{rv:1,ok:true,tk:250,rvv:'anthropic',rvm:'opus',rvb:'sub',rtk:50}));
  ok(!S.issues.includes(tk)&&ge.at(-1).p.outcome==='success'&&S.used.sub.anthropic.d===9000,'共用訂閱：寫的先扣滿、審核用剩下的、工單完成',JSON.stringify([ge.at(-1).p.outcome,S.used.sub.anthropic.d]));
  /* 修正付不起：寫的走個人 API，扣完寫的那段只剩不夠修正的錢 */
  newRun('laravel'); S.inv.xreview=1; tk=ticket('fe',4); S.issues=[tk]; S.wallet=200*.45+10; const c0=S.st.caught;
  settle(job(tk,'anthropic','sonnet','api',{rv:1,ok:false,caught:true,tk:200,rvv:'anthropic',rvm:'opus',rvb:'corp',rtk:51}));
  ok(S.issues.includes(tk)&&S.wallet<=1e-9&&S.st.caught===c0&&S.log[0].msg.includes('錢包見底，agent 停在一半'),'修正付不起：錢包扣光、失敗、沒算救回',S.log[0].msg);
  delete globalThis.gtag;
  /* 預設付費：Pro 額度不夠、沒有席位 → 公司 API */
  newRun('laravel'); S.inv.xreview=1; S.subs.anthropic='pro'; S.used.sub.anthropic.d=440; tk=ticket('fe',4); S.issues=[tk];
  Object.assign(sel,{issue:tk.id,v:'deepseek',m:'chat',b:'api',rv:1});
  ok(C.rvPrefBill(tk,'anthropic','opus')==='corp','Pro 剩 10k、沒席位：Opus 審預設公司 API');
  tk.sens=true; ok(C.rvPrefBill(tk,'anthropic','opus')==='corp','機敏單沒席位：預設公司 API，不是個人付費');
  /* 外包單、錢包 0、沒訂閱：審核那家沒有能用的付費方式 → 回到同一個 */
  newRun('laravel'); S.inv.xreview=1; S.wallet=0; tk=ticket('fe',2,{out:true}); S.issues=[tk];
  Object.assign(sel,{issue:tk.id,v:'local',m:'qwen',b:'local',rv:1,rvv:'anthropic',rvm:'opus',rvb:'api'}); render();
  ok(sel.rvv===null,'審核那家沒有能用的付費方式：回到同一個');
  Object.assign(sel,{rvv:null,rvm:null,rvb:null});
});
