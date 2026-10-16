// quota-burn 的規則檢查：docs/spectra/specs/quota-burn/spec.md
import {ok,near,section,newRun,withRand} from './lib.js';
import {BURN_SEAT_VALUE,bestKey} from '../../public/js/data.js';
import {S,sel,loadGame,fresh,issueTitle} from '../../public/js/state.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {monthScore,showEnd,showSetup} from '../../public/js/modals.js';
import {render} from '../../public/js/view.js';
import {burnStat,weekBurn} from '../../public/js/calc.js';
import {charge,endDay,payInv} from '../../public/js/actions.js';
import {model} from '../../public/js/data.js';

/* 不抽隨機事件、不進事故單，只推進到隔天 */
const nextDay=()=>withRand(.99,endDay);

section("quota-burn：照價值加權的使用率（month usage 範例）",()=>{
  newRun('laravel','parallel'); S.subs.anthropic='max5'; S.trust=70;
  S.seatReq={vendor:'openai',day:1};
  const sub=[9000,4500,9000,4500], seat=[0,8000,8000,8000];
  for(let d=1;d<=20;d++){
    if(d%5===0){const w=d/5-1; S.used.sub.anthropic.w=sub[w]; if(S.seats.includes('openai')) S.used.seat.openai.w=seat[w];}
    if(d===6) ok(S.seats.includes('openai')&&near(S.st.burnM,825),'第 6 天週一核准的席位不算進第 1 週',`burnM ${S.st.burnM}`);
    if(d<20) nextDay();
  }
  S.st.corpTk=9000; S.corp=3000;
  const b=burnStat();
  ok(near(b.v,13455,1e-6)&&near(b.m,17775,1e-6),'用掉 NT$13,455／總價值 NT$17,775',`${b.v} / ${b.m}`);
  ok(near(b.pct,13455/17775),'使用率 75.7%',String(b.pct));
});

section("quota-burn：週一改方案從新的一週算",()=>{
  newRun('laravel','parallel'); S.subs.anthropic='max5';
  for(let d=1;d<6;d++) nextDay();
  ok(near(S.st.burnM,825),'第 1 週照 Max 5× 算 NT$825',String(S.st.burnM));
  S.subs.anthropic='max20';
  ok(near(weekBurn().m,6500/4),'週一改成 Max 20× 後這週算 NT$1,625',String(weekBurn().m));
});

section("quota-burn：公司 API 預算",()=>{
  newRun('laravel','parallel');
  S.st.corpTk=1000; S.corp=11000;
  ok(near(burnStat().m,12000)&&near(burnStat().v,1000),'花 NT$1,000、剩 NT$11,000：總價值 NT$12,000');
  S.corp*=.7; ok(near(burnStat().m,8700)&&near(burnStat().v,1000),'預算凍結後總價值變小、用掉的不變',String(burnStat().m));
  payInv({cost:300}); ok(near(burnStat().m,8400)&&near(burnStat().v,1000)&&S.st.corpTk===1000,'買投資花公司預算不算用掉、只讓總價值變小');
  S.st.corpTk=12400; S.corp=-400; ok(near(burnStat().m,12400)&&near(burnStat().v,12400),'透支算滿：NT$12,400 / NT$12,400');
  newRun('laravel','parallel');
  charge('corp','anthropic',model('anthropic','sonnet'),100);
  ok(S.st.corpTk>0&&near(S.st.corpTk+S.corp,12000),'刷公司 API 會記進 corpTk',String(S.st.corpTk));
});

section("quota-burn：一家都沒簽時不算公司 API（gh-70-01）",()=>{
  newRun('laravel','parallel'); S.corpApi=[];
  for(const v in S.subs) S.subs[v]='none';
  S.st.burnV=3300; S.st.burnM=3300; S.st.corpTk=0; S.corp=11000;
  const b=burnStat(); ok(near(b.m,3300)&&near(b.v,3300)&&near(b.pct,1),'沒簽約、預算剩 NT$11,000、訂閱 NT$3,300 用滿：使用率 100%',JSON.stringify(b));
  S.corpApi=['anthropic','google'];
  ok(near(burnStat().m,14300),'有簽約時公司預算照算進總價值',String(burnStat().m));
});

section("quota-burn：個人 API 不算",()=>{
  newRun('laravel','parallel');
  charge('api','anthropic',model('anthropic','opus'),3000);
  const b=burnStat();
  ok(S.st.api>0&&b.v===0&&b.pct===0,'只刷個人 API 時使用率 0',JSON.stringify(b));
});

section("quota-burn：席位價值",()=>{
  newRun('laravel','parallel'); S.seats=['google']; S.used.seat.google.w=5000;
  ok(near(weekBurn().m,BURN_SEAT_VALUE/4)&&near(weekBurn().v,BURN_SEAT_VALUE/8),'席位一週 NT$825，用一半算 NT$412.5');
});

section("quota-burn：舊存檔",()=>{
  newRun('laravel','parallel');
  delete S.burn; delete S.st.burnV; delete S.st.burnM; delete S.st.corpTk;
  loadGame({S,sel,uid:0});
  ok(S.burn===false&&S.st.burnV===0&&S.st.burnM===0&&S.st.corpTk===0,'沒有用量欄位的存檔讀成沒開、累計 0');
});

section("quota-burn：開關",()=>{
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  S.burn=undefined; start();
  ok(S.burn===false&&/class="sb sel" data-burn="0"/.test(els.mo.innerHTML),'用量挑戰預設不挑戰');
  const ids=S.issues.map(i=>i.id+issueTitle(i)).join();
  press({burn:'1'}); ok(/class="sb sel" data-burn="1"/.test(els.mo.innerHTML),'點挑戰用滿後預選');
  press({burn:'0'}); press({burn:'1'});
  ok(S.issues.map(i=>i.id+issueTitle(i)).join()===ids,'切換用量挑戰不重抽第 1 天工單');
  press({act:'confirm'}); ok(S.burn===true,'確認後開啟用量挑戰');
  S.day=20; showEnd(); press({act:'again'});
  ok(S.burn===true&&/class="sb sel" data-burn="1"/.test(els.mo.innerHTML),'再玩一個月沿用挑戰用滿並預選');
  S.burn='yes'; fresh(); ok(S.burn===false,'存的值不是布林時退回不挑戰');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-burn'),'週一調整不顯示用量挑戰');
});

section("quota-burn：沒開時什麼都不變",()=>{
  newRun('laravel','parallel'); S.burn=false; S.kpi=300; S.trust=50; S.st.audits=1; S.st.corpTk=9000; S.corp=3000;
  const r=monthScore(); ok(r.score===3120&&r.burn===0&&r.grade==='C','沒開：總分 3,120、評等 C、沒有加分',JSON.stringify(r));
  showEnd(); ok(!els.mo.innerHTML.includes('用量加分')&&!els.mo.innerHTML.includes('使用率 ×'),'沒開：結算單沒有用量那幾行');
  ok(bestKey()==='tokgame-best-parallel-laravel','沒開：最高分 key 不變');
  render(); ok(!els.app.innerHTML.includes('>用量<'),'沒開：額度區沒有用量那一行');
});

section("quota-burn：用量加分與評等",()=>{
  newRun('laravel','parallel'); S.burn=true; S.kpi=700; S.trust=50; S.st.audits=0;
  S.st.burnV=13455; S.st.burnM=17775; S.st.corpTk=0; S.corp=0;
  const r=monthScore();
  ok(r.burn===3028&&r.score===10228&&r.grade==='A','平行 75.7%：加 3,028、總分 10,228、評等 A',JSON.stringify(r));
  showEnd(); const h=els.mo.innerHTML;
  ok(h.includes('用量挑戰')&&h.includes('NT$13,455 / NT$17,775（76%）')&&h.includes('+3,028')&&h.includes(' + 使用率 × 4,000'),'結算單有用量挑戰、用量加分與公式');
  newRun('laravel','serial'); S.burn=true; S.st.corpTk=0; S.corp=0;
  S.kpi=390; S.trust=0; S.st.audits=0; ok(monthScore().score===3900&&monthScore().grade==='S','單線 3,900 是 S');
  S.kpi=389; S.trust=2.25; ok(monthScore().score===3899&&monthScore().grade==='A','單線 3,899 是 A');
});

section("quota-burn：額度區的用量",()=>{
  newRun('laravel','parallel'); S.burn=true; S.subs.anthropic='max5';
  render(); ok(els.app.innerHTML.includes('用量<span>NT$0 / NT$12,825（0%）</span>'),'第 1 天：用量 NT$0 / NT$12,825（0%）');
});

section("quota-burn：沒有訂閱時照樣提示",()=>{
  newRun('laravel','parallel'); S.burn=true; render();
  ok(els.app.innerHTML.includes('用量<span>NT$0 / NT$12,000（0%）</span>')&&els.app.innerHTML.includes('目前沒有任何訂閱'),'開用量挑戰、沒訂閱時，用量那一行和「沒有任何訂閱」都在');
});
