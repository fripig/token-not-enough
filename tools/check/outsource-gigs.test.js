// outsource-gigs 的規則檢查：docs/spectra/specs/outsource-gigs/spec.md
import {ok,near,section,newRun,ticket} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {DEFAULT_PRESETS,KPI,STACKS,cnBlock,model} from '../../public/js/data.js';
import {GIG_CLIENT,GIG_PAY,S,addGigs,fresh,makeGig,sel,unfamiliar} from '../../public/js/state.js';
import {est,presetBlock,presetFor} from '../../public/js/calc.js';
import {batch,dispatch,endDay,evaluate,manual,quick,rescope,settle} from '../../public/js/actions.js';
import {dispatchPanel,render} from '../../public/js/view.js';
import {showEnd,showSetup} from '../../public/js/modals.js';
import * as C from '../../public/js/calc.js';
import * as M from '../../public/js/modals.js';

section("outsource-gigs：開關",()=>{
  {
  /* outsource-gigs：開關 */
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  S.outsource=undefined; start();
  ok(S.outsource===false&&/class="sb sel" data-out="0"/.test(els.mo.innerHTML),'外包預設不接，開局預選不接外包');
  press({out:'1'}); ok(/class="sb sel" data-out="1"/.test(els.mo.innerHTML),'點接外包後預選接外包');
  press({act:'confirm'}); ok(S.outsource===true,'確認後開啟外包');
  S.day=20; showEnd(); press({act:'again'});
  ok(S.outsource===true&&/class="sb sel" data-out="1"/.test(els.mo.innerHTML),'再玩一個月沿用接外包並預選');
  S.outsource='yes'; fresh(); ok(S.outsource===false,'存的值是字串 yes 時退回不接外包');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-out'),'週一調整不顯示外包開關');
  }
});

section("outsource-gigs：外包單產生",()=>{
  {
  /* outsource-gigs：外包單產生 */
  const gig=(stack,cx,extra={})=>ticket(stack,cx,{out:true,client:GIG_CLIENT,pay:(extra.kpi??KPI[cx])*GIG_PAY,...extra});
  newRun('laravel'); const G=5000, gc={laravel:0,rails:0,rust:0,app:0,sre:0,devops:0,fe:0}; const gigs=[...Array(G)].map(makeGig);
  gigs.forEach(g=>gc[g.stack]++);
  ok(Object.values(gc).every(c=>Math.abs(c/G-1/7)<=.02),'外包單七條技術線各約 0.143',JSON.stringify(gc));
  ok(gigs.every(g=>g.out&&!g.inc&&!g.sens&&g.client===GIG_CLIENT&&g.pay===g.kpi*250),'外包單不是事故、不機敏、案主是外包案主、報酬 = KPI × 250');
  ok(['rust','sre','devops'].every(k=>gigs.some(g=>g.stack===k)&&gigs.filter(g=>g.stack===k).every(unfamiliar))&&gigs.filter(g=>g.stack==='fe').every(g=>!unfamiliar(g)),'只選 Laravel 時 rust、sre、devops 外包單算不熟、fe 不算');
  S.issues=[gigs.find(g=>g.stack==='rust')]; sel.issue=null; render();
  ok(els.app.innerHTML.includes('<span class="chip unfam">不熟</span>'),'rust 外包單卡片顯示不熟標籤');
  ok(gigs.filter(g=>g.stack==='rust'&&!g.trap).every(g=>g.kpi===Math.round(KPI[g.cx]*1.3)),'rust 外包單有 KPI ×1.3 補償');
  ok(gigs.every(g=>STACKS[g.stack].pool[g.cx].includes(g.title)||STACKS[g.stack].pool.trap?.includes(g.title)||STACKS[g.stack].pool.research.some(e=>e.t===g.title)),'外包單標題來自該技術線的題庫');
  const realRand=Math.random, seen=new Set(); let bad=false;
  newRun('laravel','parallel'); S.outsource=true;
  for(let k=0;k<300;k++){S.day=1;S.hours=0;S.issues=[];S.jobs=[];endDay();const n=S.issues.filter(i=>i.out).length;seen.add(n);if(n>2)bad=true;}
  ok(!bad&&[0,1,2].every(n=>seen.has(n)),'開外包時每天新增 0–2 張外包單，三種張數都有出現',[...seen].join());
  const d1=new Set();
  S.outsource=true; for(let k=0;k<200;k++){start();d1.add(S.issues.filter(i=>i.out).length);}
  ok([...d1].every(n=>n<=2)&&d1.has(1)&&d1.has(2)&&S.issues.filter(i=>!i.out).length===4,'開外包時第 1 天多 0–2 張外包單，公司工單仍是 4 張',[...d1].join());
  const pressOut=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  S.outsource=false; start(); const co4=[...S.issues];
  pressOut({out:'1'}); Math.random=()=>.99; pressOut({act:'confirm'}); Math.random=realRand;
  ok(co4.every(i=>S.issues.includes(i))&&S.issues.filter(i=>i.out).length===2&&S.issues.length===6,'開局只切成接外包：公司工單不重抽，多 2 張外包單');
  showSetup(false); pressOut({out:'0'}); pressOut({act:'confirm'});
  ok(S.issues.length===4&&co4.every(i=>S.issues.includes(i)),'開局再切回不接外包：外包單拿掉，公司工單不變');
  newRun('laravel','parallel'); S.outsource=false; let any=false;
  for(let k=0;k<100;k++){S.day=1;S.hours=0;S.issues=[];S.jobs=[];endDay();if(S.issues.some(i=>i.out))any=true;}
  ok(!any&&addGigs()===0,'沒開外包時不會出現外包單');
  newRun('laravel'); S.cnBan=true; const lg=gig('laravel',2), co=ticket('laravel',2);
  ok(cnBlock(lg,'deepseek',model('deepseek','chat'))===''&&cnBlock(co,'deepseek',model('deepseek','chat'))==='公司政策禁用','全公司禁中國雲端後外包單仍可用 DeepSeek，公司工單不行');
  S.issues=[lg]; sel.issue=null; render();
  ok(!els.app.innerHTML.includes('禁中國雲端')&&els.app.innerHTML.includes('<span class="chip out">外包</span>')&&els.app.innerHTML.includes('<span class="k">NT$1,500</span>'),'外包卡片顯示外包標籤與 NT$1,500，沒有禁中國雲端');
  S.issues=[co]; render(); ok(els.app.innerHTML.includes('禁中國雲端'),'公司工單仍顯示禁中國雲端');
  newRun('laravel'); S.inv.md.rust=true; const rg=gig('rust',3), rc=ticket('rust',3), eg=est(rg,'anthropic','sonnet',0), ec=est(rc,'anthropic','sonnet',0);
  ok(near(eg.tk,ec.tk)&&near(eg.p,ec.p)&&near(eg.hrs,ec.hrs),'工程投資對外包單照常生效（Rust CLAUDE.md）');
  S.issues=[rg]; sel.issue=rg.id; render(); ok(els.app.innerHTML.includes('Rust 有 CLAUDE.md'),'外包單的投資提示寫出 Rust CLAUDE.md');
  }
});

section("outsource-gigs：外包單只能自己付",()=>{
  {
  /* outsource-gigs：外包單只能自己付 */
  const gig=(stack,cx,extra={})=>ticket(stack,cx,{out:true,client:GIG_CLIENT,pay:KPI[cx]*GIG_PAY,...extra});
  newRun('laravel','parallel'); S.hours=8; const g1=gig('laravel',2); S.issues=[g1];
  Object.assign(sel,{issue:g1.id,v:'anthropic',m:'sonnet',b:'corp',rv:0}); let html=dispatchPanel();
  ok(sel.b==='api'&&/data-b="corp" disabled>公司 API<small>外包不能用公司資源<\/small>/.test(html),'外包單：公司 API 停用並寫外包不能用公司資源，選擇改到第一個能用的付費方式',sel.b);
  S.seats=['openai']; Object.assign(sel,{v:'openai',m:'std',b:'seat'}); html=dispatchPanel();
  ok(sel.b!=='seat'&&/data-b="seat" disabled>公司席位<small>外包不能用公司資源<\/small>/.test(html),'外包單：OpenAI 公司席位也停用並寫同樣原因',sel.b);
  S.seats=[];
  S.presets=[{v:'anthropic',m:'sonnet',b:'corp',rv:1},{v:'deepseek',m:'chat',b:'api',rv:1},{v:'anthropic',m:'opus',b:'seat',rv:2}];
  const pf=presetFor(g1);
  ok(pf.i===1&&pf.skip.length===1&&pf.skip[0].r==='外包不能用公司資源','一鍵派工：外包單略過公司 API 方案，改用方案 B',JSON.stringify(pf));
  ok(presetBlock(g1,S.presets[2])==='外包不能用公司資源','公司席位方案對外包單的原因也是外包不能用公司資源');
  render(); {const b0=(els.app.innerHTML.match(new RegExp(`<button class="qk" data-quick="${g1.id}" data-p="0"[^>]*>[\\s\\S]*?</button>`))||[''])[0];
   ok(/ disabled>/.test(b0)&&b0.includes('外包不能用公司資源'),'外包單卡片：方案 A（公司 API）按鈕停用並寫外包不能用公司資源',b0);}
  ok(quick(g1.id)&&S.jobs[0]?.issue===g1&&S.jobs[0].b==='api'&&S.log.some(l=>l.msg.includes('略過 A：外包不能用公司資源')),'一鍵派工紀錄寫出略過方案 A 的原因');
  {const g2=gig('laravel',2); S.issues.push(g2); const nl=S.log.length;
   ok(quick(g2.id,'quick',1)&&S.jobs.at(-1)?.issue===g2&&S.jobs.at(-1).b==='api'&&!S.log.slice(0,S.log.length-nl).some(l=>l.msg.includes('略過')),'外包單按卡片的方案 B 用個人 API 派工、紀錄沒有略過');}
  newRun('laravel','parallel'); S.hours=8; S.inv.skills=true; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'anthropic',m:'sonnet',b:'corp'}));
  const bc=ticket('fe',1,{due:5}), bg=gig('fe',1,{due:5}); S.issues=[bc,bg]; batch();
  ok(bc.running===true&&bg.running!==true&&S.log.some(l=>l.msg.includes('派出 1 張，略過 1 張')),'批次派工：方案都刷公司 API 時派出公司單、略過外包單');
  newRun('laravel','parallel'); S.hours=8; const g2=gig('laravel',2), corp0=S.corp; S.issues=[g2];
  Object.assign(sel,{issue:g2.id,v:'anthropic',m:'sonnet',b:'corp',rv:0}); dispatch();
  ok(S.jobs.length===0&&S.corp===corp0&&!g2.running,'直接用公司 API 派外包單：不建立 job、公司預算不變');
  Object.assign(sel,{issue:g2.id,v:'anthropic',m:'sonnet',b:'corp'}); const h0=S.hours; evaluate();
  ok(!g2.evaluated&&S.corp===corp0&&near(S.hours,h0),'直接用公司 API 評估外包單：什麼都不做');
  newRun('laravel'); S.hours=8; const g3=gig('laravel',2), c0=S.corp; S.issues=[g3];
  Object.assign(sel,{issue:g3.id,v:'anthropic',m:'sonnet',b:'seat',rv:0}); dispatch();
  ok(S.issues.includes(g3)&&S.corp===c0&&near(S.hours,8),'單線模式用公司席位派外包單：什麼都不做');
  newRun('laravel','parallel'); S.hours=8; const cc=ticket('laravel',2); S.issues=[cc];
  Object.assign(sel,{issue:cc.id,v:'anthropic',m:'sonnet',b:'corp',rv:0}); dispatch();
  ok(S.jobs.length===1&&S.jobs[0].b==='corp','公司工單仍可用公司 API');
  newRun('laravel','parallel'); S.hours=8; S.subs.anthropic='max5'; const gs=gig('laravel',2), gl=gig('laravel',2); S.issues=[gs,gl];
  Object.assign(sel,{issue:gs.id,v:'anthropic',m:'sonnet',b:'sub',rv:0}); dispatch();
  Object.assign(sel,{issue:gl.id,v:'local',m:'gemma',b:'local',rv:0}); dispatch();
  ok(S.jobs.length===2&&S.jobs[0].issue===gs&&S.jobs[0].b==='sub'&&S.jobs[1].issue===gl&&S.jobs[1].b==='local','外包單可用個人訂閱與本地 GPU 派工');
  }
});

section("outsource-gigs：報酬、違約金、合併衝突、結算",()=>{
  {
  /* outsource-gigs：報酬、違約金、合併衝突、結算 */
  const realRand=Math.random;
  const gig=(stack,cx,extra={})=>{const kpi=Math.round(KPI[cx]*(stack==='rust'||stack==='app'?1.3:1));return ticket(stack,cx,{out:true,client:GIG_CLIENT,kpi,pay:kpi*GIG_PAY,...extra});};
  const lj=issue=>({v:'local',b:'local',M:model('local','gemma'),issue,left:.1,hrs:1,tk:50,ok:true,caught:false,rv:0,hidden:false,stop:false});
  for(const [st,cx,pay] of [['laravel',1,750],['laravel',2,1500],['rust',2,2000],['fe',4,4000],['laravel',5,6000]]){
    newRun('laravel'); const g=gig(st,cx); S.issues=[g]; const w0=S.wallet,k0=S.kpi,t0=S.trust;
    const r=settle(lj(g));
    ok(r.ok&&g.pay===pay&&S.wallet-w0===pay&&S.kpi===k0&&S.trust===t0&&S.st.outIncome===pay&&S.st.outDone===1&&S.st.done===0&&!S.issues.includes(g),`外包 ${st} 複雜度 ${cx} 完成：錢包 +NT$${pay}，KPI 與信任不變`,`${g.pay} ${S.wallet-w0}`);
  }
  ok(S.log.some(l=>l.msg.includes('外包收入 NT$6,000')),'完成紀錄寫外包收入');
  newRun('laravel'); S.hours=8; const mg=gig('laravel',2); S.issues=[mg]; sel.issue=mg.id; const mw=S.wallet, mk=S.kpi; manual();
  ok(!S.issues.includes(mg)&&S.wallet-mw===1500&&S.kpi===mk,'自己手寫完成外包單：錢包 +NT$1,500，KPI 不變');
  newRun('laravel','parallel'); S.hours=8; const cg=gig('laravel',2); S.issues=[cg];
  Math.random=()=>0; settle(lj(cg),{conflict:1}); Math.random=realRand;
  ok(cg.merge&&cg.out&&cg.pay===1500&&S.issues.includes(cg)&&S.st.outIncome===0,'外包單合併衝突：解決衝突工單仍是外包、報酬 NT$1,500');
  sel.issue=cg.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp'}); render();
  ok(els.app.innerHTML.includes('<span class="chip out">外包</span>')&&els.app.innerHTML.includes('<span class="k">NT$1,500</span>')&&/data-b="corp" disabled>公司 API<small>外包不能用公司資源/.test(els.app.innerHTML),'解決衝突的外包單：卡片顯示外包與 NT$1,500，公司 API 停用');
  const cw=S.wallet, ck=S.kpi; settle(lj(cg),{conflict:1});
  ok(!S.issues.includes(cg)&&S.wallet-cw===1500&&S.kpi===ck,'解決衝突的外包單完成：錢包 +NT$1,500，KPI 不變');
  newRun('laravel'); S.outsource=false; S.hours=0; const lg=gig('laravel',2,{due:S.day}); S.issues=[lg]; S.trust=70;
  const lw=S.wallet, lk=S.kpi; Math.random=()=>.99; endDay(); Math.random=realRand;
  ok(lw-S.wallet===450&&S.kpi===lk&&S.trust===70&&S.st.outPenalty===450&&S.st.outLate===1&&S.st.late===0&&!S.issues.includes(lg),'外包逾期：錢包 −NT$450，KPI 與信任不變，工單移除',`${lw-S.wallet} ${S.trust}`);
  newRun('laravel'); S.outsource=false; S.hours=0; S.wallet=100; const ng=gig('laravel',2,{due:S.day}); S.issues=[ng];
  Math.random=()=>.99; endDay(); Math.random=realRand;
  ok(S.wallet===-350&&!C.bills('anthropic',ticket('fe',1)).find(b=>b.id==='api').ok,'外包逾期違約金可以把錢包扣成負數（NT$100 → −NT$350），之後個人 API 停用',S.wallet);
  newRun('laravel'); const tg=gig('laravel',1,{trap:true,revealed:true,shownCx:1,cx:4,trueCx:4}); S.issues=[tg]; sel.issue=tg.id; S.trust=70;
  ok(!dispatchPanel().includes('找主管重新評估'),'曝光的外包陷阱沒有找主管重新評估按鈕');
  rescope(); ok(S.trust===70&&!tg.rescoped,'外包單呼叫 rescope 不會有效果');
  newRun('laravel'); S.outsource=true; S.day=20;
  S.kpi=300; S.trust=50; Object.assign(S.st,{subFee:3300,api:1000,outIncome:7500,outPenalty:450,outDone:4,outLate:1}); showEnd(); let rc=els.mo.innerHTML;
  ok(rc.includes('<span>你自己掏的錢</span><span>-NT$2,750</span>')&&rc.includes('<span>總分</span><span>3,200</span>'),'結算：你自己掏的錢 -NT$2,750，總分照 KPI 與信任算 3,200');
  ok(rc.includes('<span>外包收入</span><span>NT$7,500</span>')&&rc.includes('<span>外包違約金</span><span>NT$450</span>')&&rc.includes('<span>外包完成</span><span>4 張</span>')&&rc.includes('<span>外包逾期</span><span>1 張</span>'),'結算列出四行外包資訊');
  newRun('laravel'); S.outsource=false; S.day=20; showEnd(); ok(!els.mo.innerHTML.includes('外包收入'),'沒開外包時結算不顯示外包資訊');
  }
});
