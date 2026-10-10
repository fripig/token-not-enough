// action-log 的規則檢查：docs/spectra/specs/action-log/spec.md
import {ok,section,newRun,ticket,withRand} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {BASE,DEFAULT_PRESETS} from '../../public/js/data.js';
import {S,sel} from '../../public/js/state.js';
import {est} from '../../public/js/calc.js';
import {batch,dispatch,endDay,evaluate,quick} from '../../public/js/actions.js';
import {showSetup} from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import * as C from '../../public/js/calc.js';
import * as St from '../../public/js/state.js';

section("執行紀錄（gh-25-01-log-history）",()=>{
  /* 執行紀錄（gh-25-01-log-history） */
  {
  newRun('laravel'); S.log=[]; for(let i=0;i<120;i++) C.log('dim',`entry ${i}`);
  ok(S.log.length===120&&S.log[119].msg.endsWith('entry 0'),'action-log：超過 80 筆仍保留第一筆',S.log.length);
  start(); ok(!S.log.some(l=>l.msg.includes('entry ')),'action-log：開新局清空紀錄');
  const pick=(v,m,b,rv=0)=>Object.assign(sel,{v,m,b,rv,ef:1});
  const line=s=>S.log.find(l=>l.msg.includes(s))?.msg||'';
  /* 派工決策 */
  newRun('laravel','parallel'); S.day=3; S.hours=8; S.presets=DEFAULT_PRESETS.map(p=>({...p})); S.outage='deepseek';
  const d1=ticket('laravel',2,{due:4,title:'修正標籤頁分頁'}); S.issues=[d1];
  const pe1=Math.round(est(d1,'anthropic','sonnet',1,1).pe*100);
  quick(d1.id); const l1=line('→ 派出 修正標籤頁分頁');
  ok(new RegExp(`^D03 → 派出 修正標籤頁分頁（複雜度 2・第 4 天到期）｜Claude Code / Sonnet・公司 API・自審｜成功率 ${pe1}%｜一鍵派工方案 B｜預計 [\\d.]+h$`).test(l1),'action-log：平行一鍵派工記下完整決策',l1);
  newRun('laravel'); S.day=2; S.hours=8; const d2=ticket('fe',1,{due:2}); S.issues=[d2]; pick('anthropic','sonnet','api'); sel.issue=d2.id;
  withRand(.5,()=>dispatch());
  ok(S.log[1].msg.startsWith('D02 → 派出 t（複雜度 1・今天到期）｜Claude Code / Sonnet・個人 API・不審核｜成功率 ')&&S.log[1].msg.includes('｜派工台｜')&&S.log[0].msg.startsWith('D02 ✓ t'),'action-log：單線派出那行在結果前面',S.log[1].msg);
  newRun('laravel','parallel'); S.hours=8; S.inv.skills=true; S.presets=DEFAULT_PRESETS.map(p=>({...p})); S.issues=[ticket('laravel',1)];
  batch(); ok(line('→ 派出').includes('｜批次派工方案 A｜'),'action-log：批次派工寫出方案',line('→ 派出'));
  newRun('laravel','parallel'); S.day=3; S.slots=6; S.hours=8; pick('anthropic','sonnet','api');
  const tg=[[ticket('laravel',3,{due:3,inc:true}),'（複雜度 3・今天到期・事故）'],[ticket('laravel',2,{due:9,sens:true}),'（複雜度 2・第 9 天到期・機敏）'],[ticket('laravel',1,{due:5,out:true,pay:400}),'（複雜度 1・第 5 天到期・外包）']];
  for(const [is,want] of tg){S.issues.push(is); sel.issue=is.id; dispatch(); ok(S.log.some(l=>l.msg.includes(`→ 派出 t${want}｜`)),`action-log：標籤 ${want}`,line('→ 派出'));}
  newRun('laravel','parallel'); S.hours=8; pick('deepseek','chat','api');
  const tp=ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4]}); S.issues=[tp]; sel.issue=tp.id;
  const peT=Math.round(est(tp,'deepseek','chat',0,1).pe*100); dispatch();
  ok(line('→ 派出 t（複雜度 1・').includes(`成功率 ${peT}%`)&&peT>=90,'action-log：沒曝光的陷阱記顯示的複雜度與成功率',line('→ 派出'));
  /* 結果與評估寫付費方式 */
  newRun('laravel'); S.hours=8; const fx=ticket('laravel',2); S.issues=[fx]; pick('deepseek','chat','api'); sel.issue=fx.id;
  withRand(.99,()=>dispatch());
  ok(S.log[0].msg.includes('Claude Code 接 DeepSeek API / Chat・個人 API｜')&&S.log[0].msg.includes('測試沒過，改壞了'),'action-log：失敗那行寫付費方式',S.log[0].msg);
  newRun('laravel'); S.hours=8; const ev1=ticket('laravel',2); S.issues=[ev1]; pick('anthropic','opus','corp'); sel.issue=ev1.id;
  evaluate();
  ok(S.log[0].msg.includes('｜評估｜Claude Code / Opus・公司 API｜評估完成，看起來沒問題'),'action-log：評估那行寫模型與付費方式',S.log[0].msg);
  newRun('laravel'); S.hours=8; const okx=ticket('laravel',1); S.issues=[okx]; pick('anthropic','sonnet','corp',1); sel.issue=okx.id;
  withRand(0,()=>dispatch());
  ok(S.log[0].msg.includes('✓ t｜Claude Code / Sonnet・公司 API・自審｜'),'action-log：成功那行寫付費方式與審核',S.log[0].msg);
  /* 等待 */
  newRun('laravel','parallel'); S.hours=7; A.wait(false);
  ok(S.log[0].msg.endsWith('· 等待 1.0h（10:00→11:00）'),'action-log：10:00 等 1 小時',S.log[0].msg);
  S.hours=.5; A.wait(false); ok(S.log[0].msg.endsWith('· 等待 0.5h（16:30→17:00）'),'action-log：16:30 等待到 17:00 為止',S.log[0].msg);
  const n0=S.log.length; A.wait(false); ok(S.log.length===n0,'action-log：沒有時間可等就不寫紀錄');
  newRun('laravel','parallel'); S.hours=8; pick('anthropic','sonnet','corp'); const wj=ticket('laravel',1); S.issues=[wj]; sel.issue=wj.id; withRand(0,()=>dispatch());
  withRand(.99,()=>A.wait(true)); const wi=S.log.findIndex(l=>l.msg.includes('· 等到下一個 agent 完成')), ri=S.log.findIndex(l=>l.msg.includes('✓ t'));
  ok(wi>ri&&ri>=0,'action-log：等待那行比等待期間的結果舊',S.log.slice(0,4).map(l=>l.msg).join(' / '));
  /* 隨機事件、新的一週、逾期總數 */
  newRun('laravel'); S.day=6; S.kpi=0; withRand([0,.8,.5],endDay);
  ok(S.log.some(l=>l.msg==='D07 ◆ 主管問進度怎麼這麼慢｜「KPI 才 0，要超過 49 才跟得上進度。」信任 -4。'),'action-log：隨機事件寫進紀錄',line('◆'));
  newRun('laravel'); S.day=5; withRand(.99,endDay); ok(/^D06 — 第 6 天開工・新的一週，每週額度重置，新進 \d+ 張工單(，外包 \d+ 張)? —$/.test(S.log[0].msg),'action-log：第 6 天開工寫新的一週',S.log[0].msg);
  newRun('laravel'); S.day=6; withRand(.99,endDay); ok(!S.log[0].msg.includes('新的一週'),'action-log：第 7 天不寫新的一週');
  newRun('laravel'); S.day=4; S.issues=[ticket('laravel',2,{due:4}),ticket('laravel',3,{due:4,inc:true,kpi:13})]; withRand(.99,endDay);
  ok(els.mo.innerHTML.includes('2 張工單逾期，主管信任 -12。'),'ticket-lifecycle：早上報告寫逾期扣信任總數');
  newRun('laravel'); S.day=4; S.inv.monitor=true; S.issues=[ticket('laravel',3,{due:4,inc:true,kpi:13})]; withRand(.99,endDay);
  ok(S.log.some(l=>l.msg.includes('⌛ 逾期：')&&l.msg.endsWith('｜信任 -4'))&&els.mo.innerHTML.includes('1 張工單逾期，主管信任 -4。'),'action-log：有監控告警時事故逾期寫信任 -4');
  /* 下班總結 */
  newRun('laravel'); S.day=3; S.dayStart={kpi:37,trust:70,wallet:7360,corp:11310}; Object.assign(S,{kpi:61,trust:62,wallet:7240,corp:10900,corpDay:0}); withRand(.99,endDay);
  ok(line('═ 第 3 天下班')==='D03 ═ 第 3 天下班｜KPI +24（61）｜信任 -8（62）｜錢包 -NT$120（NT$7,240）｜公司 -NT$410（NT$10,900）','action-log：下班總結的格式與差值',line('═'));
  {const h=els.mo.innerHTML, c=(lab,cls,d,v)=>h.includes(`<div class="dsc"><label>${lab}</label><b class="${cls}">${d}</b><span>${v}</span></div>`);
   ok(h.includes('<div class="daysum">')&&h.includes('第 3 天下班')&&c('KPI','ok','+24','61')&&c('信任','bad','-8','62')&&c('錢包','','-NT$120','NT$7,240')&&c('公司','','-NT$410','NT$10,900'),'action-log：早上報告最上面有第 3 天下班的四格：KPI +24（61）、信任 -8（62，扣分樣式）、錢包、公司',h.slice(0,600));}
  ok(S.dayStart.kpi===S.kpi&&S.dayStart.wallet===S.wallet,'action-log：換日後重設當天基準');
  newRun('laravel'); S.day=20; withRand(.99,endDay); ok(line('═ 第 20 天下班').startsWith('D20 ')&&els.mo.innerHTML.includes('再玩一個月'),'action-log：第 20 天下班也有總結、之後開結算');
  newRun('laravel'); S.day=7; S.wallet=5000; withRand([0,.9,.5],endDay);
  ok(line('◆ 外包案尾款入帳')&&A.daySummary().includes('｜錢包 +NT$1,500（NT$6,500）｜'),'action-log：早上的事件算進新的一天',A.daySummary());
  newRun('laravel'); S.dayStart=St.daySnap(); ok(A.daySummary().endsWith('KPI ±0（0）｜信任 ±0（70）｜錢包 ±NT$0（NT$8,000）｜公司 ±NT$0（NT$12,000）'),'action-log：沒有變化寫 ±0',A.daySummary());
  {const raw=JSON.parse(JSON.stringify(S)); delete raw.dayStart; raw.day=5; raw.kpi=40; St.loadGame({S:raw,sel:{...sel},uid:9});
   ok(S.dayStart&&A.daySummary()==='═ 第 5 天下班｜KPI ±0（40）｜信任 ±0（70）｜錢包 ±NT$0（NT$8,000）｜公司 ±NT$0（NT$12,000）','action-log：舊存檔沒有基準時用讀檔當下的數值',A.daySummary());}
  start(); const p0=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}}); p0({pv:'anthropic',pp:'pro'}); p0({act:'confirm'});
  ok(S.wallet<8000&&S.dayStart.wallet===S.wallet,'action-log：第 1 天基準在開局確認、扣完訂閱費之後',[S.wallet,S.dayStart.wallet].join());
  S.day=6; S.dayStart.wallet=1; showSetup(true); p0({act:'confirm'}); ok(S.dayStart.wallet===1,'action-log：週一調整訂閱不重設基準');
  }
});
