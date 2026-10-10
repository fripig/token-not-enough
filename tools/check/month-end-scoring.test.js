// month-end-scoring 的規則檢查：docs/spectra/specs/month-end-scoring/spec.md
import {ok,section,newRun,clickMo} from './lib.js';
import {els,resetStore} from '../fake-dom.js';
import {bestKey} from '../../public/js/data.js';
import {S} from '../../public/js/state.js';
import {monthScore,showEnd} from '../../public/js/modals.js';

section("month-end-scoring：總分、評等、稱號、結算單",()=>{
  /* month-end-scoring：總分、評等、稱號、結算單 */
  {
  const endRun=(mode,set)=>{newRun('laravel',mode); resetStore(); S.day=20; set(); showEnd(); const h=els.mo.innerHTML;
    return {h,score:+h.match(/<span>總分<\/span><span>([\d,-]+)<\/span>/)[1].replace(/,/g,''),grade:h.match(/<span class="g">(\w)<\/span>/)[1],title:h.match(/<div class="gt"><b>([^<]+)<\/b>/)[1]};};
  const base=()=>{S.kpi=300; S.trust=50; S.st.subFee=2000; S.st.audits=1;};
  let r=endRun('serial',base); ok(r.score===3120,'month-end-scoring：KPI 300、信任 50、花 NT$2,000、稽核 1 次 → 3,120',r.score);
  r=endRun('serial',()=>{base(); S.st.subFee=16250;}); ok(r.score===3120,'month-end-scoring：只訂 Pro 500 花 NT$16,250，總分一樣 3,120',r.score);
  r=endRun('serial',()=>{base(); S.st.subFee=0; S.st.api=50000;}); ok(r.score===3120,'month-end-scoring：花 NT$50,000 也不影響總分',r.score);
  ok(monthScore().score===r.score&&monthScore().grade===r.grade&&monthScore().self===50000,'month-end-scoring：結算單用 monthScore()，self 是你自己掏的錢',[monthScore().score,monthScore().self].join());
  r=endRun('serial',()=>{S.kpi=0; S.trust=0; S.st.outIncome=3000; S.st.outPenalty=1000; S.st.api=500;}); ok(r.score===0&&r.h.includes('<span>你自己掏的錢</span><span>-NT$1,500</span>'),'month-end-scoring：外包收入不加分，你自己掏的錢 = 訂閱 + API + 外包違約金 − 外包收入',r.score);
  ok(r.h.includes('總分 = KPI × 10 + 信任 × 4 − 稽核次數 × 80')&&!r.h.includes('省下的個人預算'),'month-end-scoring：結算單寫出新公式');
  r=endRun('serial',()=>{base(); S.wallet=5430;}); ok(r.h.includes('<span>月底錢包餘額</span><span>NT$5,430</span>')&&r.score===3120,'month-end-scoring：結算單列出月底錢包餘額，不影響總分');
  /* 評等門檻 */
  /* 個位數用信任補（信任 × 4），才能測到 4,099 這種 spec 例子的確切值 */
  const gradeAt=(mode,score)=>endRun(mode,()=>{S.kpi=Math.floor(score/10); S.trust=score%10/4;}).grade;
  ok([[4300,'S'],[4299,'A'],[3300,'A'],[2500,'B'],[1700,'C'],[1699,'D']].every(([s,g])=>gradeAt('serial',s)===g),'month-end-scoring：單線門檻 4,300／3,300／2,500／1,700');
  ok([[6880,'S'],[6879,'A'],[5280,'A'],[4000,'B'],[2720,'C'],[2719,'D']].every(([s,g])=>gradeAt('parallel',s)===g),'month-end-scoring：平行門檻 ×1.6（6,880／5,280／4,000／2,720）');
  ok(endRun('serial',base).grade==='B'&&endRun('parallel',base).grade==='C','month-end-scoring：3,120 分單線 B、平行 C');
  /* 稱號 */
  const titleOf=set=>endRun('serial',()=>{S.kpi=120; S.trust=0; set();}).title;
  ok(titleOf(()=>{})==='還在摸索的開發者','month-end-scoring：預設稱號');
  ok(endRun('serial',()=>{S.kpi=1000; S.st.audits=2;}).title==='資安部門的常客','month-end-scoring：稽核 2 次優先於 S 評等');
  ok(titleOf(()=>{S.st.api=7001;})==='自費養 AI 的勇者','month-end-scoring：自費超過 NT$7,000');
  ok(titleOf(()=>{S.st.corp=10501;})==='公司帳單上的頭號人物','month-end-scoring：公司帳單超過 NT$10,500');
  ok(titleOf(()=>{S.st.tk.deepseek=41; S.st.tk.anthropic=59;})==='對岸模型省錢達人'&&titleOf(()=>{S.st.tk.deepseek=40; S.st.tk.anthropic=60;})==='還在摸索的開發者','month-end-scoring：中國模型超過 40%');
  ok(titleOf(()=>{S.st.tk.local=41; S.st.tk.anthropic=59;})==='地端信仰者','month-end-scoring：本地超過 40%');
  ok(titleOf(()=>{S.st.manual=13;})==='手工藝工程師'&&titleOf(()=>{S.st.manual=12;})==='還在摸索的開發者','month-end-scoring：手寫超過 12 次');
  ok(endRun('serial',()=>{S.kpi=400; S.trust=0;}).title==='Token 精算師','month-end-scoring：A 評等是 Token 精算師');
  ok(titleOf(()=>{S.st.api=7001; S.st.corp=10501; S.st.manual=13;})==='自費養 AI 的勇者','month-end-scoring：稱號照順序取第一個符合的');
  /* 結算單 */
  r=endRun('serial',()=>{S.st.subFee=650; S.st.api=120; S.st.corp=3000; S.st.done=12; S.st.late=2; S.st.kpiLost=8; S.st.manual=3; S.st.caught=4; S.st.audits=1; S.trust=55; S.kpi=90; S.st.tk.anthropic=100; S.st.tk.deepseek=300;});
  ok(['個人訂閱月費</span><span>NT$650','個人 API 帳單</span><span>NT$120','你自己掏的錢</span><span>NT$770','公司 API 帳單</span><span>NT$3,000','Anthropic</span><span>100k tokens・25%','DeepSeek</span><span>300k tokens・75%','完成工單</span><span>12 張','逾期工單</span><span>2 張（KPI -8）','自己手寫</span><span>3 次','審核救回</span><span>4 張','資安稽核</span><span>1 次','主管信任</span><span>55','<span>KPI</span><span>90']
    .every(x=>r.h.includes(x)),'month-end-scoring：結算單列出核心項目');
  ok(!r.h.includes('先前最佳')&&endRun('serial',()=>{}).h.includes('沒有用到任何 agent'),'month-end-scoring：沒有最佳分時不顯示、沒用 agent 時的文字');
  newRun('laravel'); resetStore({[bestKey()]:'5000'}); S.day=20; showEnd(); ok(els.mo.innerHTML.includes('<span>先前最佳</span><span>5,000</span>'),'month-end-scoring：有最佳分時顯示先前最佳');
  /* 按鈕 */
  els.app.attrs.length=0; clickMo({act:'close'}); ok(els.ov.hidden&&els.app.attrs.some(([s,k])=>s==='[data-act="end"]'&&k==='disabled'),'month-end-scoring：看看紀錄關掉結算並停用下班按鈕');
  S.mode='serial'; S.day=20; showEnd(); clickMo({act:'again'}); ok(S.day===1&&S.mode==='serial'&&els.mo.innerHTML.includes('月初：決定這個月怎麼付 token')&&/class="sb sel" data-mode="serial"/.test(els.mo.innerHTML),'month-end-scoring：再玩一個月開新局、沿用選擇');
  resetStore();
  }
});
