// rules-reference 的規則檢查：docs/spectra/specs/rules-reference/spec.md
import {ok,section,newRun} from './lib.js';
import {els,store} from '../fake-dom.js';
import {KPI,SEAT} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S} from '../../public/js/state.js';
import {render} from '../../public/js/view.js';
import {showEnd,showSetup} from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import * as C from '../../public/js/calc.js';
import * as M from '../../public/js/modals.js';
import * as St from '../../public/js/state.js';
import * as Ru from '../../public/js/rules.js';
import {setLang} from '../../public/js/i18n.js';
import * as I from '../../public/js/i18n.js';

section("rules-reference（gh-20-01-rules-modal）",()=>{
  /* rules-reference（gh-20-01-rules-modal） */
  {
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const tabIds=()=>[...els.mo.innerHTML.matchAll(/data-rtab="(\w+)"/g)].map(m=>m[1]);
  const selTab=()=>els.mo.innerHTML.match(/class="sb sel" data-rtab="(\w+)"/)?.[1];
  newRun('laravel'); els.ov.hidden=true; Ru.showRules();
  ok(els.mo.innerHTML.includes('<h2>遊戲規則</h2>')&&tabIds().join()==='basic,dispatch,billing,tickets,invest,score'&&selTab()==='basic'&&!els.ov.hidden,'rules-reference：第一次打開有六個分頁、選中基本');
  ok(Ru.RULE_TABS.map(t=>t.title).join()==='基本,派工與成功率,付費與稽核,工單與陷阱,投資與電腦,結算','rules-reference：分頁標題與順序');
  for(const t of Ru.RULE_TABS){press({rtab:t.id}); ok(selTab()===t.id&&els.mo.innerHTML.includes(Ru.rulesTab(t.id)),`rules-reference：點 ${t.title} 會選中並顯示內容`);}
  press({rtab:'score'}); ok(els.mo.innerHTML.includes('總分 = KPI ×'),'rules-reference：結算分頁顯示總分公式');
  /* gh-26-01-money-off-score：錢不算分、錢包用光就停、外包 KPI × 250、起始錢包 */
  ok(Ru.rulesTab('score').includes('總分 = KPI × 10 + 信任 × 4 − 稽核次數 × 80。')&&Ru.rulesTab('score').includes('錢不算分')&&!Ru.rulesTab('score').includes('÷'),'rules-reference：結算分頁寫新公式、錢不算分');
  ok(Ru.rulesTab('basic').includes('個人錢包 NT$8,000')&&Ru.rulesTab('basic').includes('錢包不夠付這次的訂閱就不能確認'),'rules-reference：基本分頁寫起始錢包 NT$8,000 與訂閱要付得起');
  ok(Ru.rulesTab('billing').includes('agent 停在一半')&&Ru.rulesTab('billing').includes('錢包 NT$0 以下時不能選'),'rules-reference：付費分頁寫錢包見底的規則');
  ok(Ru.rulesTab('tickets').includes('報酬 = KPI × 250')&&Ru.rulesTab('tickets').includes('可能變成負數'),'rules-reference：工單分頁寫外包報酬與違約金可扣成負數');
  press({rtab:'invest'}); press({act:'close'}); ok(els.ov.hidden,'rules-reference：從標頭打開，關閉後隱藏彈窗');
  Ru.showRules(); ok(selTab()==='invest','rules-reference：同一次開頁記住上次的分頁');
  ok(Ru.rulesTab('dispatch').includes('Rust、App、DevOps 的工單期限多 1 天；單線模式另有 KPI ×1.3（平行模式沒有）'),'rules-reference：派工分頁寫難線 KPI ×1.3 只在單線模式（gh-53）');
  ok(Ru.rulesTab('nope')===Ru.rulesTab('basic'),'rules-reference：未知分頁退回基本');
  ok(Ru.rulesTab('basic').includes('天數 × 7')&&Ru.rulesTab('basic').includes('第 6 天前'),'rules-reference：基本分頁說明主管事件的 KPI 門檻與第一週只提醒');
  press({rtab:'nope'}); ok(selTab()==='basic','rules-reference：點到未知分頁 id 時選中基本');
  press({act:'close'});
  }

  {
  const plain=id=>Ru.rulesTab(id).replace(/ data-h="[^"]*"/g,''); // 窄螢幕卡片用的欄名屬性不影響比對
  const sc=plain('score'), bi=plain('billing'), iv=plain('invest'), D=dataModule;
  ok(M.GRADES.serial.join()==='3800,2400,1400,500'&&M.GRADES.parallel.join()==='9500,5280,4000,2720'&&M.PAR_GRADE===undefined&&[...M.GRADES.serial,...M.GRADES.parallel].every(t=>sc.includes(`<td>${t}</td>`))&&/<td>S<\/td><td>3800<\/td><td>9500<\/td>/.test(sc),'rules-reference：結算分頁從 GRADES 列出單線與平行模式各自的評等門檻');
  ok(['kpi','trust','audit'].every(k=>sc.includes(`× ${M.SCORE[k]}`)),'rules-reference：結算分頁的總分權重來自 SCORE');
  ok(plain('tickets').includes(`評估時間 ×${D.MCP_EVAL_HRS}`),'rules-reference：MCP 評估時間倍率來自常數');
  ok(plain('tickets').includes(`<td>6</td><td>1.2M</td><td>${KPI[6]}</td>`)&&plain('tickets').includes(`第 ${St.SIX_DAY} 天起，抽到複雜度 5 的非事故工單有 ${Ru.pct(St.SIX_RATE)} 變成複雜度 6`),'rules-reference：複雜度表有第 6 列、第 11 天起 25% 來自常數',plain('tickets').slice(0,600));
  ok(plain('tickets').includes(`信任 −${A.ABANDON_TRUST}、不扣 KPI`)&&plain('tickets').includes(`報酬的 ${Ru.pct(St.GIG_LATE)} 違約金`)&&plain('tickets').includes('事故單、跑著 agent 的單（先中止）不能退'),'rules-reference：退單的代價來自 ABANDON_TRUST 與 GIG_LATE');
  ok(bi.includes(D.nt(A.CORP_DAY_LIMIT))&&bi.includes(`信任 −${A.AUDIT_TRUST}`)&&bi.includes(SEAT.trust.join('／')),'rules-reference：付費分頁的公司單日上限、稽核扣分、席位門檻來自常數');
  ok(['md',...D.INV_KEYS].every(k=>{const I=D.INVEST[k];return iv.includes(I.name)&&iv.includes(`<td>${I.hrs}h</td>`)&&iv.includes(`<td>${D.nt(I.cost)}</td>`)&&iv.includes(I.desc);}),'rules-reference：投資分頁列出每項投資的工時、預算與效果');
  ok(D.HW_KEYS.every(k=>{const H=D.HW[k];return iv.includes(H.name)&&iv.includes(`<td>${H.trust}</td>`)&&iv.includes(H.price);}),'rules-reference：投資分頁列出每台電腦的價格與信任門檻');
  ok(plain('dispatch').includes(`<td>${Math.round(C.P_STEP[1]*100)}%</td>`)&&plain('tickets').includes(`<td>${KPI[5]}</td>`),'rules-reference：成功率表與 KPI 表來自常數');
  {const dp=plain('dispatch'), tk=plain('tickets'); const rows=[...dp.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].slice(0,6).map(m=>m[1]+'='+m[2]).join();
  ok(rows==='+20 以上=95%,+10=88%,0=75%,−10=50%,−20=25%,−30 以下=10%','rules-reference：成功率表六列，從 +20 以上到 −30 以下',rows);
  ok(dp.includes(`差 +${D.CAP_SCALE/2} 是 ${Ru.pct(C.pStep(D.CAP_SCALE/2))}`)&&dp.includes('81.5%')&&dp.includes(`× 能力差距 ÷ ${D.CAP_SCALE}`)&&dp.includes('下限 0')&&tk.includes(`× 能力 ÷ ${D.CAP_SCALE}`)&&dp.includes(`能力低於 ${D.WEAK_CAP}`)&&dp.includes(`能力差距 +${D.BIG.gap}`)&&dp.includes('失敗少 15%，變成 78.8%'),'rules-reference：內插例子（+5 → 81.5%）、抓錯率寫能力差距、大型 codebase ±5、失敗打折的例子',dp.slice(0,600));
  setLang('en'); {const de=plain('dispatch'), ie=plain('invest'); ok(de.includes('15% fewer failures becomes 78.8%')&&de.includes('skill gap +5')&&de.includes('× skill gap ÷ 10')&&ie.includes('every dispatch 5% fewer failures'),'rules-reference：英文規則也寫失敗打折、能力差距 ±5、抓錯率看能力差距',de.slice(0,500));} setLang('zh-TW');}
  }

  {
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  const clickApp=ds=>els.app.on.click({target:{closest:()=>({dataset:ds,disabled:false})}});
  newRun('laravel'); render(); ok(els.app.innerHTML.includes('data-act="rules"'),'rules-reference：標頭有規則按鈕');
  St.saveGame(null); const snap=JSON.stringify(S), save=store[St.SAVE_KEY]; els.ov.hidden=true;
  clickApp({act:'rules'}); ok(!els.ov.hidden&&els.mo.innerHTML.includes('遊戲規則'),'rules-reference：點標頭規則按鈕打開規則');
  press({rtab:'billing'}); press({act:'close'});
  ok(els.ov.hidden&&JSON.stringify(S)===snap&&store[St.SAVE_KEY]===save,'rules-reference：開關規則不改狀態、不寫存檔');
  M.showDay(['測試'],null,false); ok(!els.mo.innerHTML.includes('data-act="rules"'),'rules-reference：早上報告沒有規則入口');
  S.day=20; showEnd(); ok(!els.mo.innerHTML.includes('data-act="rules"'),'rules-reference：月底結算沒有規則入口');
  }

  {
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  newRun('laravel','parallel'); S.outsource=false; showSetup(false);
  ok(els.mo.innerHTML.includes('看完整規則')&&els.mo.innerHTML.includes('data-act="rules"'),'rules-reference：開局彈窗有看完整規則');
  press({out:'1'}); press({mode:'serial'}); press({act:'rules'});
  ok(els.mo.innerHTML.includes('遊戲規則')&&!els.mo.innerHTML.includes('data-out'),'rules-reference：從開局彈窗打開規則');
  press({rtab:'tickets'}); press({act:'close'});
  ok(!els.ov.hidden&&/class="sb sel" data-out="1"/.test(els.mo.innerHTML)&&/class="sb sel" data-mode="serial"/.test(els.mo.innerHTML),'rules-reference：關閉規則回到開局彈窗、接外包與單線模式仍選著');
  press({act:'confirm'}); ok(S.outsource===true&&S.mode==='serial'&&els.ov.hidden,'rules-reference：回到開局彈窗後開始第 1 天照選擇開局');
  showSetup(true); ok(els.mo.innerHTML.includes('看完整規則'),'rules-reference：週一調整訂閱也有看完整規則');
  press({act:'rules'}); press({act:'close'}); ok(!els.ov.hidden&&els.mo.innerHTML.includes('週一：調整訂閱'),'rules-reference：關閉規則回到調整訂閱');
  press({act:'close'});
  }
});

section("rules-reference：交叉審核工具（gh-48-01-cross-model-review）",()=>{
  const txt=Ru.rulesTab('dispatch');
  ok(txt.includes('交叉審核工具（2h、公司 NT$200）')&&txt.includes('× 0.3（嚴格 0.6）')&&txt.includes('× 0.2（嚴格 0.35）')&&txt.includes('再擲一次稽核'),'規則：交叉審核那段寫出工時、預算、倍率與稽核',txt.slice(txt.indexOf('交叉審核工具'),txt.indexOf('交叉審核工具')+120));
  const h0=dataModule.INVEST.xreview.hrs; dataModule.INVEST.xreview.hrs=3;
  ok(Ru.rulesTab('dispatch').includes('交叉審核工具（3h'),'改工時常數，規則跟著寫 3h');
  dataModule.INVEST.xreview.hrs=h0;
});
