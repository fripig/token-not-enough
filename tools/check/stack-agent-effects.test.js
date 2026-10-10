// stack-agent-effects 的規則檢查：docs/spectra/specs/stack-agent-effects/spec.md
import {ok,near,section,newRun,ticket} from './lib.js';
import {store} from '../fake-dom.js';
import {BASE,KPI} from '../../public/js/data.js';
import {S,makeIssue,sel} from '../../public/js/state.js';
import {est,manualHrs,stackHint} from '../../public/js/calc.js';
import {makeJob,settle} from '../../public/js/actions.js';

section("2.1 慣例加成與 Rust 效果（spec 範例）",()=>{
  /* 2.1 慣例加成與 Rust 效果（spec 範例） */
  newRun('laravel');
  const pOf=(v,m,is)=>est(is,v,m,0);
  ok(near(pOf('google','flash',ticket('rails',3)).p,.8),'Gemini Flash × 複雜度 3 rails → 80%',pOf('google','flash',ticket('rails',3)).p);
  ok(near(pOf('google','flash',ticket('laravel',4)).p,pOf('google','flash',ticket('fe',4)).p),'複雜度 4 laravel 沒有慣例加成');
  const air=pOf('zhipu','air',ticket('rust',2)), airFe=pOf('zhipu','air',ticket('fe',2));
  ok(near(air.p,.8),'GLM Air × 複雜度 2 rust → 80%',air.p);
  ok(near(air.hrs,airFe.hrs*1.2),'rust 執行時間 ×1.2');
  ok(near(air.tk,airFe.tk),'技術線不影響 token 預估');
  const capModel={2:['google','flash'],3:['zhipu','air'],4:['anthropic','sonnet'],5:['anthropic','opus']};
  for(const [cap,cx,exp] of [[2,2,.5],[3,2,.8],[4,3,.95],[5,5,.8]]){
    const [v,m]=capModel[cap]; ok(near(pOf(v,m,ticket('rust',cx)).p,exp),`Rust 表：能力 ${cap} × 複雜度 ${cx} → ${exp*100}%`);
  }
  ok(near(pOf('anthropic','sonnet',ticket('app',3)).hrs,pOf('anthropic','sonnet',ticket('fe',3)).hrs*1.15),'app 執行時間 ×1.15');
  { const dv=est(ticket('devops',2),'anthropic','sonnet',0,1), fe2=est(ticket('fe',2),'anthropic','sonnet',0,1);
    ok(near(dv.hrs,fe2.hrs*1.25)&&near(dv.p,fe2.p)&&near(dv.tk,fe2.tk),'devops 執行時間 ×1.25，成功率與 token 跟 fe 相同',`${dv.hrs} ${fe2.hrs}`);
    ok(near(manualHrs(ticket('devops',2)),manualHrs(ticket('fe',2))*2),'devops 手寫時數不變（沒選時只有不熟 ×2）'); }
  newRun('devops'); S.day=6;
  const dv2=[...Array(3000)].map(()=>makeIssue(false)).filter(i=>i.stack==='devops'&&i.cx===2);
  ok([...new Set(dv2.map(i=>i.due))].sort().join()==='10,8,9','複雜度 2 devops 工單期限多一天：偏移 1–3 天對應到期 8、9、10，沒有 7',[...new Set(dv2.map(i=>i.due))].join());

  const sOn=est(ticket('app',3,{store:true}),'anthropic','sonnet',0), sOff=est(ticket('app',3),'anthropic','sonnet',0);
  ok(near(sOn.pe,sOff.pe*.8)&&near(sOn.p,sOff.p),'需上架審核：顯示成功率含 20% 退件，原始機率不變');
});

section("5.1 Rust／App 補償：KPI ×1.3、期限 +1 天（上限第 20 天）",()=>{
  /* 5.1 Rust／App 補償：KPI ×1.3、期限 +1 天（上限第 20 天） */
  for(const [st,cx,inc,exp] of [['laravel',3,false,10],['rust',3,false,13],['app',2,false,8],['app',4,true,33],['fe',4,false,16],['devops',3,false,13],['devops',4,true,33],['sre',3,false,10],['sre',4,true,26]]){
    newRun(st==='fe'?'laravel':st); S.day=1;
    const got=[...Array(4000)].map(()=>makeIssue(inc)).filter(i=>i.stack===st&&i.cx===cx);
    ok(got.length>0&&got.every(i=>i.kpi===exp),`KPI：${st} 複雜度 ${cx}${inc?' 事故':''} → ${exp}`,[...new Set(got.map(i=>i.kpi))].join(','));
  }
  // 實際產生的工單：期限與 KPI 都套用補償
  newRun('rust'); S.day=4;
  let rustIs=[...Array(3000)].map(()=>makeIssue(false)).filter(i=>i.stack==='rust'&&i.cx===3);
  ok(rustIs.length&&rustIs.every(i=>i.kpi===13),'產生的複雜度 3 rust 工單 KPI 都是 13');
  ok(rustIs.every(i=>i.due>=4+2+1&&i.due<=4+5+1),'複雜度 3 rust 工單期限多一天（day 4 → 7～10）');
  ok(rustIs.some(i=>i.due===8),'出現 day 4 + 偏移 3 + 1 = 8 的期限');
  newRun('app'); S.day=19;
  const late19=[...Array(2000)].map(()=>makeIssue(false));
  ok(late19.every(i=>i.due<=20),'期限不超過第 20 天');
  ok(late19.filter(i=>i.stack==='app').some(i=>i.due===20),'第 19 天的 app 工單期限被壓到第 20 天');
  newRun('app'); S.day=5;
  ok([...Array(300)].map(()=>makeIssue(true)).every(i=>i.due===5&&i.kpi===33),'App 事故單當天到期、KPI 33');
});

section("派工台提示（Stack effect visibility）",()=>{
  /* 派工台提示（Stack effect visibility） */
  newRun('laravel');
  const hRust=stackHint(ticket('rust',2));
  ok(hRust.includes('×1.2')&&hRust.includes('borrow checker'),'Rust 提示含 ×1.2 與 borrow checker',hRust);
  ok(stackHint(ticket('fe',2))==='','前端工單沒有提示');
  { const hd=stackHint(ticket('devops',2)), hs=stackHint(ticket('sre',2));
    ok(hd.includes('×1.25')&&hd.includes('terraform'),'DevOps 提示含 ×1.25 與 terraform',hd);
    ok(hs.includes('事故'),'SRE 提示提到事故',hs); }
  ok(stackHint(ticket('laravel',4))==='','複雜度 4 的 laravel 工單沒有提示');
  ok(stackHint(ticket('rails',3)).includes('慣例多'),'複雜度 3 的 rails 工單有慣例提示');
  ok(stackHint(ticket('app',3,{store:true})).includes('20%')&&!stackHint(ticket('app',3)).includes('20%'),'只有需上架審核的 app 工單提到 20% 退件');
});

section("2.2 App 上架審核",()=>{
  /* 2.2 App 上架審核 */
  const realRandom=Math.random;
  const runJob=(is,rv,roll)=>{ // 個人 API 付費、強制 agent 成功，再用 roll 決定上架審核
    S.issues=[is]; sel.issue=is.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; sel.rv=rv;
    const j=makeJob(is); j.ok=true; j.caught=false;
    Math.random=()=>roll; const r=settle(j); Math.random=realRandom; return r;
  };
  newRun('app');
  let is=ticket('app',3,{store:true}), r=runJob(is,0,.1);
  ok(!r.ok&&r.rejected&&S.issues.includes(is)&&is.tries===1,'需上架審核的 app 工單被退件後留在佇列、tries 1');
  ok(S.log[0].msg.includes('卡在 App Store 審核被退件'),'紀錄寫出退件原因',S.log[0].msg);
  ok(near(is.base,BASE[3]*.7),'退件套用一般的 0.7 token 折扣');
  is=ticket('app',3,{store:true}); r=runJob(is,2,.1);
  ok(!r.ok&&r.rejected,'嚴格審核也救不回上架退件');
  is=ticket('app',3,{store:false}); r=runJob(is,0,.1);
  ok(r.ok&&!S.issues.includes(is),'沒標上架審核的 app 工單正常完成');
  is=ticket('app',3,{store:true}); r=runJob(is,0,.5);
  ok(r.ok,'上架審核通過時正常完成');
});
