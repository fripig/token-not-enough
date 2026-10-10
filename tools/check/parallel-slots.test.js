// parallel-slots 的規則檢查：docs/spectra/specs/parallel-slots/spec.md
import {ok,near,section,newRun,ticket} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {KPI,model} from '../../public/js/data.js';
import {S,fresh,sel} from '../../public/js/state.js';
import {advance,canEvaluate,dispatch,endDay} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {showEnd,showSetup} from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import * as M from '../../public/js/modals.js';

section("parallel-slots：開局選工作槽數",()=>{
  /* parallel-slots：開局選工作槽數 */
  const clickModal=(ds)=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  start(); S.slots=3; fresh(); ok(S.slots===3,'預設 3 個工作槽');
  start(); clickModal({mode:'parallel'});
  ok(els.mo.innerHTML.includes('data-slots="2"')&&els.mo.innerHTML.includes('data-slots="6"')&&!els.mo.innerHTML.includes('data-slots="7"'),'平行模式顯示 2–6 的選項');
  ok(/class="sb sel" data-slots="3"/.test(els.mo.innerHTML),'預設選 3');
  ok(/data-slots="4">同時 4 個 agent<small>審 PR 最多 ×1\.75・衝突最多 30%/.test(els.mo.innerHTML),'4 個工作槽按鈕：審 PR 最多 ×1.75、衝突最多 30%');
  { const pb=els.mo.innerHTML.match(/data-mode="parallel">(.*?)<\/button>/)[1]; ok(pb.includes('審 PR')&&!/token/i.test(pb),'平行模式按鈕講審 PR，不提 token',pb); }
  clickModal({mode:'serial'}); ok(!els.mo.innerHTML.includes('data-slots'),'單線模式不顯示工作槽選項');
  clickModal({mode:'parallel'}); clickModal({slots:'5'}); ok(els.mo.innerHTML.includes('最多 5 個 agent 在背景同時跑'),'模式說明跟著選的數量');
  clickModal({act:'confirm'});
  ok(S.slots===5&&els.app.innerHTML.includes('0 / 5 個工作槽'),'選 5 個：背景 agent 顯示 0 / 5');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-slots'),'週一調整不顯示工作槽選項');
  S.slots=6; start(); ok(/class="sb sel" data-slots="6"/.test(els.mo.innerHTML),'再玩一個月預選上次的 6');
  S.slots=9; fresh(); ok(S.slots===3,'不合法的工作槽數退回 3');
});

section("parallel-slots：派工上限、token 加成、結算標題",()=>{
  /* parallel-slots：派工上限、token 加成、結算標題 */
  newRun('laravel','parallel'); S.slots=2; S.hours=8;
  for(let i=0;i<3;i++){const is=ticket('fe',1); S.issues.push(is); sel.issue=is.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; dispatch();}
  ok(S.jobs.length===2,'2 個工作槽時第三張派不出去',S.jobs.length);
  const pend=ticket('fe',1); S.issues.push(pend); sel.issue=pend.id; render();
  ok(/data-act="go" disabled/.test(els.app.innerHTML)&&els.app.innerHTML.includes('工作槽都滿了，先等一個 agent 跑完。'),'工作槽滿了：派工按鈕停用並顯示警告');
  for(const [n,exp] of [[2,1.25],[4,1.75],[6,2.25]]){newRun('laravel','parallel'); S.slots=n; S.jobs=Array(n-1).fill({left:1}); ok(near(A.reviewLoad(),exp),`${n} 個工作槽、其他 ${n-1} 個還在跑 → 審 PR ×${exp}`);}
  newRun('laravel','parallel'); S.slots=4; S.day=20; showEnd();
  ok(els.mo.innerHTML.includes('月底結算・Laravel 後端・平行模式（4 個 agent）'),'結算標題顯示 4 個 agent');
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
