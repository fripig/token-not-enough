// work-calendar 的規則檢查：docs/spectra/specs/work-calendar/spec.md
import {ok,near,section,newRun,ticket,withRand,clickMo,job} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import * as dataModule from '../../public/js/data.js';
import {S} from '../../public/js/state.js';
import {quotaLeft} from '../../public/js/calc.js';
import {endDay,settle} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {showSetup} from '../../public/js/modals.js';
import * as C from '../../public/js/calc.js';
import * as M from '../../public/js/modals.js';

section("work-calendar：起始資源",()=>{
  /* work-calendar：起始資源 */
  start();
  ok(S.day===1&&S.hours===8&&S.wallet===8000&&S.corp===12000&&S.trust===70&&S.kpi===0,'work-calendar：新局第 1 天、8h、NT$8,000、NT$12,000、信任 70、KPI 0');
});

section("開局買 Anthropic Pro 與 Kimi 會員",()=>{
  /* 開局買 Anthropic Pro 與 Kimi 會員 */
  clickMo({pv:'anthropic',pp:'pro'}); clickMo({pv:'moonshot',pp:'member'}); clickMo({act:'confirm'});
  ok(S.wallet===7050&&S.st.subFee===950,'work-calendar：開局訂閱 Pro＋會員付 NT$950',[S.wallet,S.st.subFee].join());
});

section("下班換日",()=>{
  /* 下班換日 */
  newRun('laravel'); S.day=3; S.hours=1.5; S.corpDay=200; S.outage='openai';
  S.subs.anthropic='pro'; S.used.sub.anthropic={d:100,w:300};
  withRand(.99,endDay);
  ok(S.day===4&&S.hours===8&&S.corpDay===0&&S.outage===null&&S.used.sub.anthropic.d===0&&S.used.sub.anthropic.w===300,'work-calendar：換日後 8h、今日額度與公司當日花費歸零、當機解除、本週用量保留');
  ok(els.mo.innerHTML.includes('<h2>第 4 天</h2>'),'work-calendar：彈窗標題「第 4 天」');
  newRun('laravel'); S.day=20; withRand(.99,endDay);
  ok(S.day===20&&els.mo.innerHTML.includes('月底結算'),'work-calendar：第 20 天下班打開月底結算');
});

section("週一重置",()=>{
  /* 週一重置 */
  newRun('laravel'); S.day=5; S.subs.anthropic='pro'; S.used.sub.anthropic={d:50,w:500};
  withRand(.99,endDay);
  ok(S.day===6&&S.used.sub.anthropic.w===0,'work-calendar：第 6 天每週用量歸零');
  ok(els.mo.innerHTML.includes('第 6 天・新的一週')&&els.mo.innerHTML.includes('每週額度已重置。今天可以調整訂閱方案。')&&els.mo.innerHTML.includes('data-act="adj"'),'work-calendar：第 6 天彈窗顯示新的一週與調整訂閱');
  render(); ok(els.app.innerHTML.includes('data-act="adjust"'),'work-calendar：週一整天都有調整訂閱按鈕');
  S.day=7; render(); ok(!els.app.innerHTML.includes('data-act="adjust"'),'work-calendar：第 7 天沒有調整訂閱按鈕');
});

section("週一補差價",()=>{
  /* 週一補差價 */
  const adjCost=(day,v,from,to)=>{newRun('laravel'); S.day=day; S.subs[v]=from; showSetup(true); clickMo({pv:v,pp:to}); return M.planCost(true);};
  ok(adjCost(6,'anthropic','pro','max5')===1987.5,'work-calendar：第 6 天 Pro→Max 5× 補 NT$1,987.5');
  ok(adjCost(11,'anthropic','pro','max5')===1325,'work-calendar：第 11 天 Pro→Max 5× 補 NT$1,325');
  ok(adjCost(16,'openai','none','plus')===650,'work-calendar：第 16 天不訂閱→Plus 收全月 NT$650');
  ok(adjCost(16,'openai','none','pro')===6500,'work-calendar：第 16 天不訂閱→Pro 200 收全月 NT$6,500');
  ok(adjCost(6,'moonshot','none','member')===300,'work-calendar：第 6 天不訂閱→Kimi 會員 收全月 NT$300');
  ok(adjCost(16,'openai','plus','pro')===1462.5,'work-calendar：第 16 天 Plus→Pro 200 補 NT$1,462.5');
  ok(els.mo.innerHTML.includes('新訂閱收整個月，升級只補剩下週數的差價，降級不退費。'),'work-calendar：週一彈窗說明新訂閱收全月');
  ok(adjCost(11,'anthropic','max5','pro')===0,'work-calendar：降級不用付錢');
  const w0=S.wallet; clickMo({act:'confirm'}); ok(S.subs.anthropic==='pro'&&S.wallet===w0,'work-calendar：降級立即生效、不退費');
  { newRun('laravel'); S.day=6; S.subs.anthropic='pro'; showSetup(true); clickMo({pv:'anthropic',pp:'none'}); const w1=S.wallet; clickMo({act:'confirm'});
    S.day=11; showSetup(true); clickMo({pv:'anthropic',pp:'pro'});
    ok(S.wallet===w1&&M.planCost(true)===650,'work-calendar：第 6 天退訂 Pro、第 11 天再訂收全月 NT$650'); }
  ok(adjCost(11,'openai','pro','pro500')===4875,'agent-catalog：第 11 天 Pro 200→Pro 500 補 NT$4,875');
  clickMo({act:'confirm'}); ok(S.subs.openai==='pro500'&&dataModule.planOf('openai').day===12500&&dataModule.planOf('openai').week===50000,'agent-catalog：升級 Pro 500 後額度 12,500k／50,000k');
  newRun('laravel'); S.day=6; S.subs.anthropic='pro'; showSetup(true); clickMo({pv:'anthropic',pp:'max20'}); clickMo({act:'close'});
  ok(els.ov.hidden&&S.subs.anthropic==='pro','work-calendar：不改了就關掉、方案不變');
  showSetup(true); ok(els.mo.innerHTML.includes('這次要從個人錢包付'),'work-calendar：調整彈窗顯示要付多少');
});

section("錢包不夠付訂閱（gh-26-01-money-off-score）",()=>{
  /* 錢包不夠付訂閱（gh-26-01-money-off-score） */
  const goOff=()=>/data-act="confirm" disabled/.test(els.mo.innerHTML);
  start(); clickMo({pv:'openai',pp:'pro500'});
  ok(goOff()&&els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'work-calendar：開局只訂 Pro 500（NT$16,250）超過錢包 NT$8,000 → 開始第 1 天停用');
  clickMo({act:'confirm'}); ok(S.wallet===8000&&S.st.subFee===0&&S.subs.openai==='none'&&!els.ov.hidden,'work-calendar：錢不夠時按確認不扣錢、不開局');
  clickMo({pv:'openai',pp:'pro'}); ok(!goOff()&&!els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'work-calendar：改回付得起的方案就能確認');
  newRun('laravel'); S.day=6; S.subs.anthropic='pro'; S.wallet=1000; showSetup(true); clickMo({pv:'anthropic',pp:'max5'});
  ok(goOff()&&els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'work-calendar：第 6 天錢包 NT$1,000 升級 Max 5×（NT$1,987.5）→ 確定調整停用');
  clickMo({act:'close'}); ok(els.ov.hidden&&S.subs.anthropic==='pro'&&S.wallet===1000,'work-calendar：錢不夠時不改了照樣關掉、方案不變');
  newRun('laravel'); S.day=6; S.subs.anthropic='max5'; S.wallet=-350; showSetup(true);
  ok(!goOff()&&!els.mo.innerHTML.includes('錢包不夠付這次的訂閱'),'work-calendar：錢包負數、沒改方案 → 確定調整照樣能按');
  clickMo({pv:'anthropic',pp:'pro'}); ok(!goOff(),'work-calendar：錢包負數也能降級（付 NT$0）');
  clickMo({act:'confirm'}); ok(S.subs.anthropic==='pro'&&S.wallet===-350,'work-calendar：降級生效、不扣錢');
  newRun('laravel'); S.subs.anthropic='max5'; S.used.sub.anthropic={d:0,w:0}; S.wallet=-350; const ts0=ticket('fe',2); S.issues=[ts0];
  const rs0=settle(job(ts0,'anthropic','sonnet','sub',{tk:200}));
  ok(rs0.ok&&near(S.used.sub.anthropic.d,200)&&S.wallet===-350&&C.bills('anthropic',ts0).find(b=>b.id==='sub').ok,'billing-methods：錢包負數時已有的訂閱照樣能用、扣額度不扣錢');
});

section("訂閱額度",()=>{
  /* 訂閱額度 */
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic={d:100,w:1700};
  ok(quotaLeft('sub','anthropic')===100,'work-calendar：每週上限比較緊時剩 100k');
  newRun('laravel'); render(); ok(els.app.innerHTML.includes('目前沒有任何訂閱。只能用 API、公司預算或本地模型。'),'work-calendar：沒有訂閱時的額度區文字');
  S.subs.anthropic='pro'; render(); ok(/Anthropic Pro<span>個人訂閱/.test(els.app.innerHTML),'work-calendar：訂閱的額度方塊標示個人訂閱');
  S.outage='anthropic'; render(); ok(/Anthropic Pro<span>今日當機/.test(els.app.innerHTML),'work-calendar：當機時額度方塊標示今日當機');
});
