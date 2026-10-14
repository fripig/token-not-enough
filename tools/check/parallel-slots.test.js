// parallel-slots 的規則檢查：docs/spectra/specs/parallel-slots/spec.md
import {ok,near,section,newRun,ticket,job} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {KPI,model} from '../../public/js/data.js';
import {S,fresh,sel} from '../../public/js/state.js';
import {advance,canEvaluate,dispatch,endDay} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {est} from '../../public/js/calc.js';
import {showEnd,showSetup} from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import * as M from '../../public/js/modals.js';

section("parallel-slots：開局沒有工作槽數",()=>{
  /* #63：拿掉工作槽數設定，兩種模式、週一調整都不顯示 */
  const clickModal=(ds)=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  start(); fresh(); ok(!('slots' in S),'新的一局 S 沒有 slots');
  start(); clickModal({mode:'parallel'}); ok(!els.mo.innerHTML.includes('data-slots'),'平行模式不顯示工作槽選項');
  { const pb=els.mo.innerHTML.match(/data-mode="parallel">(.*?)<\/button>/)[1]; ok(pb.includes('審 PR')&&pb.includes('沒有上限')&&!/token/i.test(pb),'平行模式按鈕講審 PR、沒有上限，不提 token',pb); }
  clickModal({mode:'serial'}); ok(!els.mo.innerHTML.includes('data-slots'),'單線模式不顯示工作槽選項');
  clickModal({mode:'parallel'}); clickModal({act:'confirm'}); ok(S.mode==='parallel'&&!('slots' in S),'確認平行模式後 S 仍沒有 slots');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-slots'),'週一調整不顯示工作槽選項');
});

section("parallel-slots：同時跑沒有上限、審 PR 倍率、結算標題",()=>{
  /* #63：沒有工作槽數，第 7 個照派，代價看實際在跑的數量 */
  newRun('laravel','parallel'); S.hours=2; S.jobs=Array.from({length:6},()=>job(ticket('fe',1),'anthropic','haiku','corp',{left:5,hrs:5}));
  {const is=ticket('fe',1); S.issues.push(is); sel.issue=is.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='corp'; dispatch();}
  ok(S.jobs.length===7&&near(S.hours,1.8),'已有 6 個在跑、剩 2h：第 7 張照派，時鐘走 0.2h',[S.jobs.length,S.hours].join());
  const pend=ticket('fe',1); S.issues.push(pend); sel.issue=pend.id; render();
  ok(!/data-act="go" disabled/.test(els.app.innerHTML),'7 個在跑時派工按鈕仍可按');
  for(const [n,exp] of [[1,1.25],[5,2.25],[9,3.25]]){newRun('laravel','parallel'); S.jobs=Array(n).fill({left:1}); ok(near(A.reviewLoad(),exp),`其他 ${n} 個還在跑 → 審 PR ×${exp}（線性、沒有上限）`);}
  {newRun('laravel','parallel'); const tk=ticket('laravel',3), t0=est(tk,'anthropic','sonnet',1).tk;
   S.jobs=Array.from({length:7},()=>job(ticket('fe',1),'anthropic','haiku','corp',{left:5,hrs:5}));
   ok(est(tk,'anthropic','sonnet',1).tk===t0,'派工的 token 不受在跑數量影響（0 個與 7 個在跑相同）',[t0,est(tk,'anthropic','sonnet',1).tk].join());}
  newRun('laravel','parallel'); S.day=20; showEnd(); ok(els.mo.innerHTML.includes('月底結算・Laravel 後端・平行模式</h2>'),'結算標題寫平行模式、沒有 agent 數');
  newRun('laravel','serial'); S.day=20; showEnd(); ok(els.mo.innerHTML.includes('月底結算・Laravel 後端・單線模式</h2>'),'單線模式標題不變');
});

section("合併衝突留下「解決衝突」工單",()=>{
  /* 合併衝突留下「解決衝突」工單 */
  {
    const realRand=Math.random, son=model('anthropic','sonnet');
    const job=(issue,left=.1)=>({v:'anthropic',b:'corp',M:son,issue,left,hrs:1,tk:50,ok:true,caught:false,rv:0,hidden:false,stop:false});
    const other=()=>job(ticket('fe',1),5);
    newRun('laravel','parallel'); S.hours=8;
    const orig=ticket('laravel',3,{title:'改文章列表排序',due:7}), id0=orig.id, kpi0=S.kpi;
    S.issues=[orig]; S.jobs=[job(orig),other(),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    const ci=S.issues[0];
    ok(S.issues.length===1&&ci.id===id0&&ci.merge&&ci.title==='解決衝突：改文章列表排序'&&ci.cx===2&&ci.due===7&&ci.kpi===KPI[3],'衝突：原單原地變成「解決衝突」工單，複雜度 3 → 2，沿用到期日與 KPI',JSON.stringify(ci));
    ok(S.kpi===kpi0&&S.st.done===0&&S.st.conflicts===1,'衝突：KPI 與完成數不變、衝突數 +1');
    ok(near(S.hours,7.8),'衝突：不花審 PR 時間',S.hours);
    S.day=20; showEnd(); ok(els.mo.innerHTML.includes('<span>合併衝突</span><span>1 次</span>'),'結算顯示合併衝突 1 次'); S.day=1;
    ok(!canEvaluate(ci),'解決衝突工單不能評估架構');
    sel.issue=ci.id; render();
    const html=els.app.innerHTML;
    ok(html.includes('<span class="chip trap">合併衝突</span>'),'卡片顯示合併衝突標籤');
    ok(html.includes('衝突時會留下一張「解決衝突」工單'),'平行提示說明衝突會留下工單');
    ok(!html.includes('評估架構（')&&!html.includes('找主管重新評估'),'解決衝突工單沒有評估架構與找主管重新評估按鈕');
    S.jobs=[job(ci),other(),other(),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    ok(!S.issues.includes(ci)&&S.kpi===kpi0+KPI[3]&&S.st.done===1&&S.st.conflicts===1,'解決衝突工單完成：拿回原單 KPI，3 個在跑也不再衝突');
    newRun('laravel','parallel'); S.hours=8;
    const one=ticket('laravel',1); S.issues=[one]; S.jobs=[job(one),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    ok(one.merge&&one.cx===1,'複雜度 1 的原單衝突後仍是複雜度 1',one.cx);
    newRun('laravel','parallel'); S.hours=8;
    const five=ticket('laravel',5,{big:true,evaluated:true}), three=ticket('laravel',3,{big:true});
    S.issues=[five]; S.jobs=[job(five),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    ok(five.merge&&five.cx===4&&five.big&&!five.evaluated,'複雜度 5 的原單衝突後是 4，保留大型 codebase、清掉已評估',JSON.stringify({cx:five.cx,big:five.big,ev:five.evaluated}));
    S.issues=[three]; S.jobs=[job(three),other()];
    Math.random=()=>0; advance(.2); Math.random=realRand;
    ok(three.merge&&three.cx===2&&!three.big,'新複雜度低於 3 時清掉大型 codebase');
    newRun('laravel','parallel'); S.hours=0;
    const lateOne=ticket('laravel',2,{merge:true,title:'解決衝突：x',due:S.day}), lost0=S.st.kpiLost;
    S.trust=70; S.issues=[lateOne]; Math.random=()=>.99; endDay(); Math.random=realRand; // .99 不會抽到改信任的隨機事件
    ok(S.st.kpiLost-lost0===Math.ceil(KPI[2]*.5)&&S.st.late===1&&S.trust===66,'解決衝突工單到期沒解完照一般逾期扣分（信任 −4）',S.st.kpiLost-lost0);
  }
});

section("合併衝突機率上限",()=>{
  /* 每個其他還在跑的 agent +0.1，CI 減半，最多 CONFLICT_MAX（減半之後才套） */
  for(const [n,ci,exp] of [[2,false,.2],[5,false,.5],[9,false,.9],[12,false,.9],[12,true,.6],[20,true,.9]]){
    newRun('laravel','parallel'); S.inv.ci=ci; S.jobs=Array(n).fill({left:1});
    ok(near(A.conflictRate(),exp),`其他 ${n} 個在跑${ci?'、有 CI':''} → 衝突 ${exp}`,A.conflictRate());
  }
});
