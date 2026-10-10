// dispatch-outcome 的規則檢查：docs/spectra/specs/dispatch-outcome/spec.md
import {ok,near,section,newRun,ticket,withRand,job} from './lib.js';
import {els} from '../fake-dom.js';
import {model} from '../../public/js/data.js';
import {S,sel} from '../../public/js/state.js';
import {costLine,est} from '../../public/js/calc.js';
import {dispatch,makeJob,settle} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';

section("dispatch-outcome：成功率表",()=>{
  /* dispatch-outcome：成功率表 */
  {
  newRun('laravel');
  for(const [v,m,cx,big,p] of [['anthropic','sonnet',2,false,.95],['anthropic','sonnet',4,false,.8],['google','flash',3,false,.5],['google','flash',4,false,.25],['google','flash',5,false,.1],['google','pro',4,true,.88],['deepseek','chat',3,true,.72],['anthropic','opus',3,true,.95],['anthropic','opus',5,false,.8],['anthropic','fable',5,false,.95]])
    ok(near(est(ticket('fe',cx,{big}),v,m,0).p,p),`dispatch-outcome：${m} × 複雜度 ${cx}${big?'・大型':''} → ${p*100}%`,est(ticket('fe',cx,{big}),v,m,0).p);
  ok(near(est(ticket('fe',5),'local','oss',0).p,.1)&&near(est(ticket('fe',5,{big:true}),'google','flash',0).p,.18)&&near(est(ticket('fe',5,{big:true}),'local','oss',0).p,.05),'dispatch-outcome：成功率下限 5%');
  S.inv.md.fe=true; S.inv.sdd=true; ok(near(est(ticket('fe',2),'anthropic','sonnet',0).p,.97),'dispatch-outcome：成功率上限 97%'); S.inv.md={}; S.inv.sdd=false;
  /* token 預估 */
  newRun('laravel'); S.hours=8; const t2=ticket('fe',2); S.issues=[t2]; sel.issue=t2.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0});
  ok(near(est(t2,'anthropic','sonnet',0).tk,153),'dispatch-outcome：Sonnet 估複雜度 2 為 153k');
  render(); ok(els.app.innerHTML.includes('<b>107k–199k</b>'),'dispatch-outcome：派工台顯示 107k–199k');
  ok(near(est(ticket('fe',4),'anthropic','haiku',0).tk,495),'dispatch-outcome：Haiku 估複雜度 4 為 495k（沒有折扣）');
  ok(near(est(ticket('fe',4,{big:true}),'google','pro',0).tk,550*.7),'dispatch-outcome：大型 codebase 對 ctx 模型 token ×0.7');
  ok(['laravel','rails','rust','app','fe'].every(st=>near(est(ticket(st,3),'anthropic','sonnet',0).tk,est(ticket('fe',3),'anthropic','sonnet',0).tk)),'dispatch-outcome：技術線不影響 token');
  ok(near(est(t2,'anthropic','sonnet',0).hrs,1.6),'dispatch-outcome：Sonnet 複雜度 2 要 1.6h');
  const jobs=[...Array(500)].map(()=>makeJob(t2)), e2=est(t2,'anthropic','sonnet',0);
  ok(jobs.every(j=>j.tk>=e2.tk*.7-1e-9&&j.tk<=e2.tk*1.3+1e-9&&j.hrs>=e2.hrs*.8-1e-9&&j.hrs<=e2.hrs*1.2+1e-9),'dispatch-outcome：實際 token 在 0.7–1.3 倍、時數在 0.8–1.2 倍');
  /* 費用列 */
  const cl=(b,v,m)=>costLine(b,model(v,m),v,est(t2,v,m,0));
  ok(near(cl('api','anthropic','sonnet').hi,e2.hi*.45)&&cl('api','anthropic','sonnet').t==='自付'&&cl('corp','anthropic','sonnet').t==='公司付'&&cl('local','local','gemma').hi===0,'dispatch-outcome：費用列依付費方式');
  ok(near(cl('sub','anthropic','opus').hi,est(t2,'anthropic','opus',0).hi*2)&&cl('sub','anthropic','opus').t==='額度','dispatch-outcome：訂閱的費用列是額度 × w');
  /* 單線跑到下班 */
  newRun('laravel'); S.hours=2; const t5=ticket('fe',5); S.issues=[t5]; sel.issue=t5.id; Object.assign(sel,{v:'anthropic',m:'opus',b:'corp',rv:0}); render();
  ok(els.app.innerHTML.includes('今天剩的工時可能不夠跑完。'),'dispatch-outcome：單線工時可能不夠的警告');
  withRand(.5,dispatch);
  ok(S.hours===0&&near(S.st.tk.anthropic,722.5*.4)&&near(S.st.corp,722.5*.4*.9)&&t5.tries===1&&S.log[0].msg.includes('跑到下班還沒結束'),'dispatch-outcome：單線跑到下班扣掉同比例 token、失敗',[S.hours,S.st.tk.anthropic].join());
  /* 一般失敗 */
  newRun('laravel'); const tfl=ticket('fe',2); S.issues=[tfl]; settle(job(tfl,'anthropic','sonnet','corp',{ok:false,tk:80}));
  ok(S.log[0].msg.includes('測試沒過，改壞了')&&near(S.st.tk.anthropic,80)&&near(S.st.byBill.corp,80),'dispatch-outcome：失敗紀錄與 token 照算');
  /* 顯示 */
  const panel=(st,cx,v,m,b,rv=0,extra={},mode='serial')=>{newRun('laravel',mode); S.hours=8; const t=ticket(st,cx,extra); S.issues=[t]; sel.issue=t.id; Object.assign(sel,{v,m,b,rv}); render(); return els.app.innerHTML;};
  ok(panel('fe',3,'deepseek','chat','api',0,{big:true}).includes('class="meh">72%'),'dispatch-outcome：72% 是黃色');
  ok(panel('fe',2,'anthropic','sonnet','corp').includes('class="good">95%'),'dispatch-outcome：95% 是綠色');
  ok(panel('fe',4,'google','flash','corp').includes('class="bad">25%'),'dispatch-outcome：25% 是紅色');
  ok(!panel('fe',2,'anthropic','sonnet','corp').includes('（原')&&panel('fe',2,'anthropic','sonnet','corp',1).includes('成功率（原 95%）'),'dispatch-outcome：有審核才顯示原始成功率');
  ok(panel('fe',2,'anthropic','sonnet','corp').includes('<label>工時</label>')&&panel('fe',2,'anthropic','sonnet','corp',0,{},'parallel').includes('<label>執行時間</label>'),'dispatch-outcome：單線寫工時、平行寫執行時間');
  /* 警告優先順序 */
  const warn=h=>h.match(/<div class="warnline">([^<]*)<\/div>/)[1];
  const wq=(sens,hours)=>{newRun('laravel'); S.hours=hours; S.subs.anthropic='pro'; S.used.sub.anthropic={d:445,w:445}; const t=ticket('fe',3,{sens}); S.issues=[t]; sel.issue=t.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'sub',rv:0}); render(); return warn(els.app.innerHTML);};
  ok(wq(true,8).startsWith('機敏工單用個人帳號')&&wq(false,1).startsWith('剩餘額度可能不夠'),'dispatch-outcome：機敏先於額度、額度先於工時');
  newRun('laravel','parallel'); S.slots=2; S.hours=1; const tz=ticket('fe',5,{due:S.day}); S.issues=[tz]; sel.issue=tz.id; Object.assign(sel,{v:'anthropic',m:'opus',b:'corp',rv:0}); render();
  ok(warn(els.app.innerHTML)==='這張今天到期，但下班前跑不完，會逾期。','dispatch-outcome：今天到期跑不完先於跑過夜');
  S.jobs=[job(ticket('fe',1),'anthropic','haiku','corp',{left:5,hrs:5}),job(ticket('fe',1),'anthropic','haiku','corp',{left:5,hrs:5})]; render();
  ok(warn(els.app.innerHTML)==='工作槽都滿了，先等一個 agent 跑完。','dispatch-outcome：工作槽滿先於到期');
  tz.due=S.day+2; S.jobs=[]; render(); ok(warn(els.app.innerHTML)==='今天跑不完，agent 會跑過夜，明早才有結果。','dispatch-outcome：跑過夜警告');
  }
});
