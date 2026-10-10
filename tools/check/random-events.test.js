// random-events 的規則檢查：docs/spectra/specs/random-events/spec.md
import {ok,near,section,newRun,ticket,withRand,job} from './lib.js';
import {els} from '../fake-dom.js';
import {KPI} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S} from '../../public/js/state.js';
import {quotaLeft} from '../../public/js/calc.js';
import {EVENTS,endDay} from '../../public/js/actions.js';
import * as I from '../../public/js/i18n.js';

section("random-events：每天 55% 抽一個",()=>{
  /* random-events：每天 55% 抽一個 */
  {
  newRun('laravel'); let evDays=0; const N=10000;
  for(let i=0;i<N;i++){S.day=2; S.issues=[]; S.cnBan=false; endDay(); if(els.mo.innerHTML.includes('class="evt"'))evDays++;}
  ok(Math.abs(evDays/N-.55)<=.02,'random-events：有事件的天數約 55%',evDays/N);
  ok(EVENTS.length===8,'random-events：共 8 種事件');
  /* 當機事件經過 endDay：中止該廠商的背景 agent */
  newRun('laravel','parallel'); S.day=3; S.hours=0; const ta=ticket('fe',3,{due:9}), tb=ticket('fe',3,{due:9}); S.issues=[ta,tb];
  S.jobs=[job(ta,'anthropic','opus','corp',{left:5,hrs:5}),job(tb,'anthropic','sonnet','corp',{left:5,hrs:5})];
  withRand([0,.13,0,.99],endDay);
  ok(S.outage==='anthropic'&&!S.jobs.length&&S.log.filter(l=>l.msg.includes('廠商當機，session 斷了')).length===2&&els.mo.innerHTML.includes('2 個跑在 Anthropic 的 agent 因為當機斷線。'),'random-events：當機中止該廠商的 agent');
  ok(els.mo.innerHTML.includes('<div class="evt"><b>Anthropic 服務大當機</b>'),'random-events：彈窗顯示事件標題');
  /* 各事件效果 */
  ok(dataModule.APIV.join()==='anthropic,openai,google,deepseek,zhipu,moonshot'&&dataModule.SUBV.join()==='anthropic,openai,google,zhipu,moonshot','random-events：降價與當機不抽自架開源，縮水只抽訂閱廠商');
  newRun('laravel');
  let ev=withRand(0,EVENTS[0]); ok(ev[0]==='Anthropic 新模型上架，API 降價 30%'&&near(S.priceMod.anthropic,.7),'random-events：降價 30%');
  withRand(0,EVENTS[0]); ok(near(S.priceMod.anthropic,.49),'random-events：降價可以疊加');
  ev=withRand(.5,EVENTS[1]); ok(S.outage==='deepseek'&&ev[0]==='DeepSeek 服務大當機','random-events：當機一天');
  S.day=7; ev=EVENTS[2](); ok(ev[0]==='主管在週會上提醒'&&!S.cnBan,'random-events：第 8 天前不會禁中國雲端');
  S.day=8; ev=EVENTS[2](); ok(ev[0]==='主管宣布：全公司暫停把程式碼送到中國雲端模型'&&S.cnBan,'random-events：第 8 天起可能禁中國雲端');
  ev=EVENTS[2](); ok(ev[0]==='主管在週會上提醒'&&S.cnBan,'random-events：已經禁了就只是提醒');
  {const spike=EVENTS.find(f=>String(f).includes('ev.traffic'));
    newRun('laravel'); S.day=5; S.issues=[ticket('fe',1),ticket('fe',2),ticket('fe',3)]; let sp=spike();
    ok(sp[0]==='新聞流量比平常高一點'&&S.issues.length===3,'random-events：第 6 天前流量暴增沒有效果',sp[0]);
    S.day=6; sp=spike(); ok(sp[0]==='大新聞爆發，流量暴增'&&S.issues.length===5&&S.issues.slice(3).every(i=>i.inc),'random-events：第 6 天起流量暴增加兩張事故單',sp[0]);}
  S.corp=10000; ev=EVENTS[3](); ok(ev[0]==='年度預算凍結'&&near(S.corp,7000),'random-events：預算凍結 -30%');
  S.subs.anthropic='pro'; S.used.sub.anthropic={d:0,w:0}; ev=withRand(0,EVENTS[4]); ok(ev[0]==='Anthropic 調整訂閱用量政策'&&near(S.capMod.anthropic,.8)&&near(quotaLeft('sub','anthropic'),360),'random-events：訂閱額度縮水 20%');
  S.issues=[]; ev=EVENTS[5](); ok(ev[0]==='大新聞爆發，流量暴增'&&S.issues.length===2&&S.issues.every(i=>i.inc),'random-events：流量暴增進兩張事故單');
  /* 主管事件（gh-24-01-slow-progress-event）：KPI 要超過 天數 × 7；第 6 天前沒達標只提醒 */
  S.day=5; S.kpi=40; S.trust=70; ev=EVENTS[6]();
  ok(ev[0]==='主管在週會上點名稱讚'&&ev[1]==='「KPI 已經 40，超過 35，AI 工具用得很有效率。」信任 +6。'&&S.trust===76,'random-events：第 5 天 KPI 40 主管稱讚 +6',ev.join('｜'));
  S.day=5; S.kpi=35; S.trust=70; ev=EVENTS[6]();
  ok(ev[0]==='主管在週會上提醒進度'&&ev[1]==='「KPI 目前 35。第一週先熟悉工具，之後 KPI 要超過天數 × 7。」沒有其他變化。'&&S.trust===70,'random-events：第 5 天 KPI 35 只提醒不扣分',ev.join('｜'));
  S.day=6; S.kpi=42; S.trust=70; ev=EVENTS[6]();
  ok(ev[0]==='主管問進度怎麼這麼慢'&&ev[1]==='「KPI 才 42，要超過 42 才跟得上進度。」信任 -4。'&&S.trust===66,'random-events：第 6 天 KPI 42 主管質疑 -4',ev.join('｜'));
  for(const [day,kpi,t0,title,t1] of [[2,0,70,'主管在週會上提醒進度',70],[2,15,70,'主管在週會上點名稱讚',76],[5,35,70,'主管在週會上提醒進度',70],[6,43,98,'主管在週會上點名稱讚',100],[6,42,70,'主管問進度怎麼這麼慢',66],[7,0,2,'主管問進度怎麼這麼慢',0]]){
    S.day=day; S.kpi=kpi; S.trust=t0; ev=EVENTS[6](); ok(ev[0]===title&&S.trust===t1,`random-events：第 ${day} 天 KPI ${kpi} 信任 ${t0} → ${title}、信任 ${t1}`,`${ev[0]} ${S.trust}`);}
  ok(!Object.values(I.LANGS[0].dict).some(v=>typeof v==='string'&&v.includes('不是有買 AI')),'random-events：事件文字不再有「不是有買 AI」');
  S.wallet=1000; ev=EVENTS[7](); ok(ev[0]==='外包案尾款入帳'&&S.wallet===2500,'random-events：尾款 +NT$1,500');
  }
});
