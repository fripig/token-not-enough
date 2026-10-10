// billing-methods 的規則檢查：docs/spectra/specs/billing-methods/spec.md
import {ok,near,section,newRun,ticket,withRand,job,clickApp,clickMo} from './lib.js';
import {els} from '../fake-dom.js';
import {model} from '../../public/js/data.js';
import {S,sel} from '../../public/js/state.js';
import {auditOdds,charge,endDay,evaluate,settle} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {showSetup} from '../../public/js/modals.js';
import {GIG_CLIENT} from '../../public/js/state.js';
import * as A from '../../public/js/actions.js';
import * as C from '../../public/js/calc.js';

section("billing-methods：付費選項",()=>{
  /* billing-methods：付費選項 */
  {
  newRun('laravel'); const tb=ticket('fe',2), note=(v,id)=>C.bills(v,tb).find(b=>b.id===id);
  ok(C.bills('local',tb).map(b=>b.id).join()==='local'&&C.bills('local',tb)[0].note==='不花 token 錢，但很慢','billing-methods：本地模型只有本地 GPU');
  ok(C.bills('google',tb).map(b=>b.id).join()==='sub,api,corp','billing-methods：沒席位時依序是個人訂閱、個人 API、公司 API');
  ok(!note('google','sub').ok&&note('google','sub').note==='沒有訂閱'&&note('google','api').ok&&note('google','api').note==='自己的信用卡'&&note('google','corp').ok&&note('google','corp').note==='走部門預算','billing-methods：沒訂閱 Google 時的選項與註記');
  S.subs.anthropic='pro'; ok(note('anthropic','sub').ok&&note('anthropic','sub').note==='Pro・剩 450k','billing-methods：有訂閱時顯示剩餘額度');
  ok(!note('openai','corp').ok&&note('openai','corp').note==='公司沒簽約','billing-methods：沒簽約的廠商不能走公司 API');
  S.corp=0; ok(!note('anthropic','corp').ok&&note('anthropic','corp').note==='預算用完','billing-methods：公司預算用完');
  /* 扣款 */
  newRun('laravel');
  charge('api','anthropic',model('anthropic','sonnet'),200); ok(near(S.wallet,8000-90)&&near(S.st.api,90),'billing-methods：200k Sonnet 個人 API 扣 NT$90');
  S.subs.anthropic='max5'; charge('sub','anthropic',model('anthropic','opus'),200); ok(near(S.used.sub.anthropic.d,400)&&near(S.used.sub.anthropic.w,400),'billing-methods：200k Opus（w 2）吃訂閱 400k');
  charge('corp','anthropic',model('anthropic','sonnet'),200); ok(near(S.corp,12000-90)&&near(S.corpDay,90)&&near(S.st.corp,90),'billing-methods：公司 API 扣預算、計入當日與月底帳單');
  ok(charge('local','local',model('local','gemma'),200).spend==='電費','billing-methods：本地 GPU 記為電費');
  S.wallet=10; let cw=charge('api','anthropic',model('anthropic','sonnet'),200); ok(S.wallet===0&&cw.short&&near(cw.frac,10/90),'billing-methods：個人 API 不會把錢包扣成負數，只付剩下的',S.wallet);
  /* 錢包見底（gh-26-01-money-off-score） */
  newRun('laravel'); S.wallet=200; const tb0=ticket('fe',2); S.issues=[tb0]; const api0=S.st.api;
  const rb=settle(job(tb0,'anthropic','sonnet','api',{tk:400/.45,hrs:2}));
  ok(!rb.ok&&S.wallet===0&&near(S.st.api-api0,200)&&near(S.st.tk.anthropic,200/.45)&&near(rb.hrs,1)&&S.issues.includes(tb0)&&tb0.tries===1&&S.log[0].msg.includes('錢包見底，agent 停在一半'),'billing-methods：花費 NT$400、錢包 NT$200 → 付完 200 停在一半、失敗留在佇列',[S.wallet,S.st.api,rb.hrs].join());
  /* 錢包見底：GA 照額度不夠送 quota；自我審核抓到錯誤也救不回來 */
  {const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
  newRun('laravel'); S.wallet=200; const tq0=ticket('fe',2); S.issues=[tq0];
  const rc0=settle(job(tq0,'anthropic','sonnet','api',{tk:400/.45,hrs:2,ok:false,caught:true,rv:1}));
  ok(!rc0.ok&&S.wallet===0&&S.st.caught===0&&S.issues.includes(tq0),'billing-methods：錢包見底時自我審核抓到錯誤也救不回來');
  const jr=ge.find(e=>e.n==='job_result'); ok(jr&&jr.p.outcome==='quota'&&jr.p.bill==='api'&&jr.p.cost===200,'billing-methods：錢包見底 GA job_result 送 outcome quota、cost 200',JSON.stringify(jr?.p));
  delete globalThis.gtag;}
  newRun('laravel'); S.hours=8; S.wallet=5; const te0=ticket('laravel',2); S.issues=[te0]; Object.assign(sel,{issue:te0.id,v:'anthropic',m:'sonnet',b:'api',rv:0}); evaluate();
  ok(S.wallet===0&&!te0.evaluated&&S.log[0].msg.includes('錢包見底，評估沒做完'),'billing-methods：個人 API 評估錢不夠 → 錢包歸零、不算已評估',S.log[0]?.msg);
  /* 錢包不夠只警告、不擋派工 */
  newRun('laravel'); S.hours=8; S.wallet=10; const tw=ticket('fe',1); S.issues=[tw]; sel.issue=tw.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0}); render();
  ok(els.app.innerHTML.includes('錢包可能不夠，跑到一半會停下來。')&&!/data-act="go" disabled/.test(els.app.innerHTML),'billing-methods：錢包不夠只警告、派工按鈕可按');
  for(const w of [0,-350]){S.wallet=w; const nb=C.bills('anthropic',tw).find(b=>b.id==='api'); ok(!nb.ok&&nb.note==='錢包見底','billing-methods：錢包 NT$'+w+' 時個人 API 停用、註記錢包見底'); render(); ok(sel.b!=='api'&&/data-b="api" disabled/.test(els.app.innerHTML),'billing-methods：錢包見底時派工台的個人 API 按鈕停用、自動換掉');}
  S.wallet=1; ok(C.bills('anthropic',tw).find(b=>b.id==='api').ok,'billing-methods：錢包 NT$1 時個人 API 還能用');
  /* 繞過畫面直接呼叫也擋得住（review：模擬器曾在錢包見底時照派個人 API） */
  newRun('laravel','parallel'); S.hours=8; S.wallet=0; const tg0=ticket('fe',2); S.issues=[tg0]; Object.assign(sel,{issue:tg0.id,v:'anthropic',m:'sonnet',b:'api',rv:0});
  A.dispatch(); ok(S.jobs.length===0&&S.hours===8&&S.issues.includes(tg0)&&!tg0.running,'billing-methods：錢包見底時直接呼叫 dispatch() 也不派工');
  A.evaluate(); ok(S.hours===8&&!tg0.evaluated,'billing-methods：錢包見底時直接呼叫 evaluate() 也不評估');
  /* 額度用完 */
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic={d:250,w:250}; const tq=ticket('fe',2); S.issues=[tq];
  const rq=settle(job(tq,'anthropic','sonnet','sub',{tk:400,hrs:2}));
  ok(!rq.ok&&near(S.used.sub.anthropic.d,450)&&near(S.st.tk.anthropic,200)&&near(rq.hrs,1)&&S.issues.includes(tq)&&tq.tries===1&&S.log[0].msg.includes('撞到用量上限，agent 停在一半'),'billing-methods：額度只剩一半時用光剩下的、失敗留在佇列');
  S.used.sub.anthropic={d:440,w:440}; S.hours=8; sel.issue=tq.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'sub',rv:0}); render();
  ok(els.app.innerHTML.includes('剩餘額度可能不夠，跑到一半會被限流。'),'billing-methods：額度可能不夠時警告');
  /* 公司花費上限 */
  newRun('laravel'); S.corp=100; const to=ticket('fe',1); S.issues=[to];
  settle(job(to,'anthropic','opus','corp',{tk:200})); ok(S.corp===0&&S.trust===62&&S.log.some(l=>l.msg.includes('! 公司 API 預算透支，財務來信關切')),'billing-methods：透支時預算歸零、信任 -8');
  newRun('laravel'); S.corpDay=1600; withRand(.99,endDay);
  ok(S.trust===64&&els.mo.innerHTML.includes('今天公司 API 刷了 NT$1,600，主管在 Slack 問你在幹嘛（信任 -6）。'),'billing-methods：單日公司花費超過 NT$1,500 信任 -6');
  newRun('laravel'); S.corpDay=1500; withRand(.99,endDay); ok(S.trust===70,'billing-methods：剛好 NT$1,500 不扣信任');
  /* 資安稽核 */
  ok(auditOdds('anthropic')===.35&&auditOdds('deepseek')===.6,'billing-methods：稽核機率 35%／中國 60%');
  const auditWith=(b,v,m,okFlag=true)=>{newRun('laravel'); const ts=ticket('fe',1,{sens:true}); S.issues=[ts]; withRand(0,()=>settle(job(ts,v,m,b,{ok:okFlag}))); return [S.st.audits,S.trust];};
  ok(auditWith('api','anthropic','sonnet').join()==='1,58','billing-methods：機敏單走個人 API 被稽核、信任 -12');
  ok(auditWith('api','anthropic','sonnet',false).join()==='1,58','billing-methods：失敗的嘗試一樣擲稽核');
  ok(auditWith('corp','anthropic','sonnet').join()==='0,70'&&auditWith('local','local','gemma').join()==='0,70','billing-methods：公司 API 與本地 GPU 不會被稽核');
  S.subs.anthropic='pro'; const tsub=ticket('fe',1,{sens:true}); S.issues=[tsub]; withRand(0,()=>settle(job(tsub,'anthropic','sonnet','sub'))); ok(S.st.audits===1,'billing-methods：個人訂閱也會被稽核');
  const warnFor=(v,m,b)=>{newRun('laravel'); S.hours=8; const ts=ticket('fe',1,{sens:true}); S.issues=[ts]; sel.issue=ts.id; Object.assign(sel,{v,m,b,rv:0}); render(); return els.app.innerHTML;};
  ok(warnFor('anthropic','sonnet','api').includes('機敏工單用個人帳號：有 35% 機率被資安稽核抓到。'),'billing-methods：個人帳號稽核警告');
  ok(warnFor('deepseek','chat','api').includes('機敏工單送到中國雲端：有 60% 機率被資安稽核抓到。'),'billing-methods：中國雲端稽核警告');
  ok(warnFor('anthropic','sonnet','corp').includes('<div class="warnline"></div>'),'billing-methods：公司 API 沒有稽核警告');
  }
});

section("billing-methods：換廠商時預設先選席位、再選訂閱",()=>{
  const setup=(o={})=>{newRun('laravel'); S.hours=8; const is=ticket('fe',2,o.tk||{}); S.issues=[is]; sel.issue=is.id; Object.assign(sel,{v:'google',m:'pro',b:o.b||'corp',rv:0}); if(o.plan)S.subs.anthropic='pro'; if(o.seat)S.seats=['anthropic']; render(); return is;};
  setup({plan:true}); clickApp({v:'anthropic',m:'sonnet'});
  ok(sel.b==='sub','有 Anthropic Pro 訂閱、從 Gemini Pro 換到 Sonnet → 個人訂閱',sel.b);
  setup({plan:true,seat:true}); clickApp({v:'anthropic',m:'sonnet'});
  ok(sel.b==='seat','有 Anthropic 席位也有訂閱 → 公司席位',sel.b);
  setup({}); clickApp({v:'anthropic',m:'sonnet'});
  ok(sel.b==='corp','沒有訂閱也沒有席位 → 維持公司 API',sel.b);
  setup({plan:true}); clickApp({v:'anthropic',m:'sonnet'}); sel.b='api'; render(); clickApp({v:'anthropic',m:'opus'});
  ok(sel.b==='api','同一家換模型維持玩家選的個人 API',sel.b);
  setup({plan:true}); S.used.sub.anthropic={d:445,w:445}; clickApp({v:'anthropic',m:'sonnet'});
  ok(sel.b==='corp','訂閱額度不夠這張單的預估 → 維持公司 API',sel.b);
  setup({seat:true,b:'api',tk:{out:true,client:GIG_CLIENT,pay:1000}}); clickApp({v:'anthropic',m:'sonnet'});
  ok(sel.b==='api','外包單不會因為有席位改成公司席位',sel.b);
  setup({plan:true,tk:{sens:true}}); clickApp({v:'anthropic',m:'sonnet'});
  ok(sel.b==='corp','機敏單有訂閱沒席位 → 維持公司 API，不自動換成個人訂閱',sel.b);
  setup({plan:true,seat:true,tk:{sens:true}}); clickApp({v:'anthropic',m:'sonnet'});
  ok(sel.b==='seat','機敏單有席位 → 公司席位',sel.b);
  newRun('laravel'); showSetup(false); clickMo({pv:'anthropic',pp:'pro'}); clickMo({act:'confirm'});
  ok(S.subs.anthropic==='pro'&&sel.v==='anthropic'&&sel.b==='sub','開局訂了 Anthropic、預設 Sonnet → 第 1 天就是個人訂閱',`${S.subs.anthropic} ${sel.v} ${sel.b}`);
});
