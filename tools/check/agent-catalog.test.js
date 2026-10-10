// agent-catalog 的規則檢查：docs/spectra/specs/agent-catalog/spec.md
import {ok,section,newRun,ticket,clickMo,clickApp} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {CLIENTS,VENDORS,kt,model} from '../../public/js/data.js';
import {S,sel} from '../../public/js/state.js';
import {render} from '../../public/js/view.js';

section("agent-catalog：模型數值表",()=>{
  /* agent-catalog：模型數值表 */
  const MODELS=[
    ['anthropic','haiku',3,.15,.3,.7,.9],['anthropic','sonnet',4,.45,1,.8,1],['anthropic','opus',5,.9,2,1,.85],['anthropic','fable',6,1.8,4,1.2,.85],
    ['openai','mini',3,.15,.3,.7,1],['openai','std',4,.4,1,.8,1.05],['openai','high',5,1.6,3,1,.95],
    ['google','flash',2,.06,.25,.4,1.1],['google','pro',4,.35,1,.9,1],
    ['deepseek','chat',3,.03,1,.7,1.15],['deepseek','reasoner',4,.06,1,1.2,1.5],
    ['zhipu','air',3,.04,.5,.6,1.1],['zhipu','glm',4,.1,1,.9,1.1],['moonshot','k2',4,.12,1,.9,1.2],
    ['local','qwen',3,0,0,1.7,1.3],['local','gemma',3,0,0,1.9,1.25],['local','oss',2,0,0,1.8,1.2],
    ['local','qcnext',4,0,0,1.4,1.2],['local','gemma4',4,0,0,2,1.2],['local','glm53',5,0,0,2.8,1]];
  ok(Object.values(VENDORS).reduce((a,V)=>a+V.models.length,0)===20&&Object.keys(VENDORS).length===7,'agent-catalog：7 家廠商 20 個模型');
  for(const [v,m,cap,price,w,speed,verb] of MODELS){const x=model(v,m); ok(x&&x.cap===cap&&x.price===price&&x.w===w&&x.speed===speed&&x.verb===verb,`agent-catalog：${v}/${m} 數值符合表格`);}
  ok(['flash','pro'].every(m=>model('google',m).ctx)&&MODELS.filter(r=>r[0]!=='google').every(([v,m])=>!model(v,m).ctx),'agent-catalog：只有 Gemini 有 ctx');
  ok(Object.keys(VENDORS).filter(v=>VENDORS[v].cn).join()==='deepseek,zhipu,moonshot'&&model('local','qwen').cn&&!model('local','gemma').cn&&!model('local','oss').cn&&model('local','qcnext').cn&&!model('local','gemma4').cn&&model('local','glm53').cn,'agent-catalog：中國廠商與 Qwen、GLM-5.3 中國權重');
  ok(VENDORS.local.models.map(x=>x.name).join()==='Qwen3.6 35B-A3B,Gemma 4 26B A4B,Gemma 4 E4B,Qwen3-Coder-Next,Gemma 4 31B,GLM-5.3'&&VENDORS.local.models.map(x=>x.hw||'').join()===',,,spark,spark,mac','agent-catalog：本地模型依序是三個基本款再三個電腦解鎖的');
  ok(Object.keys(VENDORS).filter(v=>VENDORS[v].corp).join()==='anthropic,google','agent-catalog：只有 Anthropic、Google 可走公司 API');
});

section("訂閱方案表",()=>{
  /* 訂閱方案表 */
  const PLANS={anthropic:[['pro',650,450,1800],['max5',3300,2200,9000],['max20',6500,9000,36000]],openai:[['plus',650,500,2000],['pro',6500,8000,30000],['pro500',16250,12500,50000]],google:[['aipro',650,700,2800],['ultra',8000,10000,40000]],zhipu:[['lite',100,1500,6000],['pro',500,6000,24000]],moonshot:[['member',300,1500,6000]]};
  for(const v in PLANS) ok(JSON.stringify(VENDORS[v].plans.filter(p=>p.id!=='none').map(p=>[p.id,p.price,p.day,p.week]))===JSON.stringify(PLANS[v])&&VENDORS[v].plans[0].id==='none',`agent-catalog：${v} 訂閱方案符合表格`);
  ok(VENDORS.deepseek.plans.length===1&&VENDORS.local.plans.length===0,'agent-catalog：DeepSeek 與自架開源沒有訂閱');
  ok(VENDORS.openai.plans.map(p=>p.name).join()==='不訂閱,Plus,Pro 200,Pro 500','agent-catalog：OpenAI 方案名稱依序是不訂閱、Plus、Pro 200、Pro 500');
});

section("10M 以上的 token 數留一位小數，結尾 .0 拿掉",()=>{
  /* 10M 以上的 token 數留一位小數，結尾 .0 拿掉 */
  const KT=[[10000,'10M'],[10004,'10M'],[9960,'10M'],[12500,'12.5M'],[10234,'10.2M'],[50000,'50M'],[9940,'9.9M'],[8000,'8.0M'],[450,'450k']];
  ok(KT.every(([k,s])=>kt(k)===s),'agent-catalog：四捨五入後 10M 以上留一位小數、拿掉 .0，以下照舊',KT.map(([k])=>kt(k)).join());
});

section("開局彈窗的 OpenAI 那一列",()=>{
  /* 開局彈窗的 OpenAI 那一列 */
  start(); const oaiBtns=[...els.mo.innerHTML.matchAll(/data-pv="openai" data-pp="[^"]+">([^<]+)<small>([^<]*)<\/small>/g)].map(m=>[m[1],m[2]]);
  ok(oaiBtns.map(b=>b[0]).join()==='不訂閱,Plus,Pro 200,Pro 500'&&!oaiBtns.some(b=>b[0]==='Pro'),'agent-catalog：開局 OpenAI 按鈕依序是不訂閱、Plus、Pro 200、Pro 500',oaiBtns.map(b=>b[0]).join());
  ok(oaiBtns[3]?.[1]==='NT$16,250/月・每日 12.5M','agent-catalog：Pro 500 顯示 NT$16,250/月・每日 12.5M',oaiBtns[3]?.[1]);
  clickMo({pv:'openai',pp:'pro500'});
  ok(els.mo.innerHTML.includes('這次要從個人錢包付</span><b class="num">NT$16,250</b>')&&els.mo.innerHTML.includes('付完剩 <b class="num">-NT$8,250</b>')&&/data-act="confirm" disabled/.test(els.mo.innerHTML)&&els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'agent-catalog：月初只訂 Pro 500 要付 NT$16,250，起始錢包 NT$8,000 付不起、開始第 1 天停用');
  clickMo({act:'confirm'}); ok(S.wallet===8000&&S.st.subFee===0&&S.subs.openai==='none','agent-catalog：付不起時按確認不扣錢、OpenAI 仍不訂閱',[S.wallet,S.st.subFee,S.subs.openai].join());
  start();
  ok(['anthropic','openai','google','zhipu','moonshot'].every(v=>els.mo.innerHTML.includes(`data-pv="${v}" data-pp="none"`))&&!els.mo.innerHTML.includes('data-pv="deepseek"')&&!els.mo.innerHTML.includes('data-pv="local"'),'agent-catalog：開局只列五家訂閱，每家從不訂閱開始');
});

section("派工台選模型",()=>{
  /* 派工台選模型 */
  newRun('laravel'); S.hours=8; const tc=ticket('fe',2); S.issues=[tc]; sel.issue=tc.id; Object.assign(sel,{v:'openai',m:'std',b:'api'}); render();
  ok(/data-b="corp" disabled>公司 API<small>公司沒簽約/.test(els.app.innerHTML),'agent-catalog：OpenAI 不能走公司 API');
  {const h=els.app.innerHTML, at=s=>h.indexOf(s), gpt=['<b>Luna</b><span>能力 ●●●○○</span>','<b>Sol</b><span>能力 ●●●●○</span>','<b>Astra</b><span>能力 ●●●●●</span>'];
  ok(gpt.every(s=>at(s)>=0)&&at(gpt[0])<at(gpt[1])&&at(gpt[1])<at(gpt[2])&&!['<b>mini</b>','<b>標準</b>','<b>高推理</b>'].some(s=>h.includes(s)),'agent-catalog：Codex CLI 依序顯示 Luna、Sol、Astra（能力 3／4／5），沒有舊名稱');}
  {const tg=ticket('laravel',2,{client:CLIENTS[3]}); S.issues=[tg]; sel.issue=tg.id; render(); const h=els.app.innerHTML;
  ok(/data-v="openai" data-m="mini" ><b>Luna<\/b><span>能力 ●●●○○<\/span><span class="">\$0\.15\/k/.test(h)&&/data-v="deepseek" data-m="chat" disabled><b>Chat<\/b><span>能力 ●●●○○<\/span><span class="why">政府標案禁用/.test(h),'agent-catalog：政府標案可用 Luna（$0.15/k），DeepSeek Chat 停用');
  S.issues=[tc]; sel.issue=tc.id; render();}
  {const h=els.app.innerHTML, at=s=>h.indexOf(s), cl=[['Haiku','●●●○○','0.15'],['Sonnet','●●●●○','0.45'],['Opus','●●●●●','0.9'],['Fable','●●●●●●','1.8']].map(([n,d,p])=>`<b>${n}</b><span>能力 ${d}</span><span class="">$${p}/k`);
  ok(cl.every(s=>at(s)>=0)&&cl.every((s,i)=>!i||at(cl[i-1])<at(s)),'agent-catalog：Claude Code 依序顯示 Haiku、Sonnet、Opus、Fable（能力 3／4／5／6，$0.15／0.45／0.9／1.8）');}
  ok(els.app.innerHTML.includes('價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。'),'agent-catalog：頁尾保留虛構數字聲明');
  ok(els.app.innerHTML.includes('<b>Gemma 4 26B A4B</b><span>能力 ●●●○○</span><span class="">免費</span>')&&els.app.innerHTML.includes('免費・中國權重'),'agent-catalog：本地模型顯示免費、Qwen 標中國權重');
  ok(!['Qwen Coder 32B','Gemma 27B','gpt-oss'].some(n=>els.app.innerHTML.includes(n)),'agent-catalog：派工台沒有舊的本地模型名稱');
  ok(els.app.innerHTML.includes('派給 Codex CLI'),'agent-catalog：單線模式按鈕寫派給');
  sel.b='api'; clickApp({v:'local',m:'gemma'}); ok(sel.b==='local','agent-catalog：選本地模型切到本地 GPU');
  clickApp({v:'anthropic',m:'sonnet'}); ok(sel.b==='api','agent-catalog：離開本地切回個人 API');
  S.outage='anthropic'; render();
  ok(sel.v==='openai'&&sel.m==='mini','agent-catalog：當機的選擇改到下一家第一個可用模型',sel.v+sel.m);
  ok(['haiku','sonnet','opus','fable'].every(m=>new RegExp(`data-v="anthropic" data-m="${m}" disabled`).test(els.app.innerHTML))&&els.app.innerHTML.includes('<span>今日當機</span>'),'agent-catalog：當機廠商的模型都停用');
  S.outage=null; S.mode='parallel'; render(); ok(els.app.innerHTML.includes('派到背景 Codex CLI'),'agent-catalog：平行模式按鈕寫派到背景');
  S.hours=.1; render(); ok(/data-act="go" disabled/.test(els.app.innerHTML),'agent-catalog：剩不到 0.2h 時派工按鈕停用');
});
