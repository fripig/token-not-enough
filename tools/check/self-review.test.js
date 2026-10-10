// self-review 的規則檢查：docs/spectra/specs/self-review/spec.md
import {ok,near,section,pristine,newRun,ticket,withRand,job} from './lib.js';
import {els,store} from '../fake-dom.js';
import {model} from '../../public/js/data.js';
import {S,fresh,sel} from '../../public/js/state.js';
import {catchRate,est} from '../../public/js/calc.js';
import {settle} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import * as C from '../../public/js/calc.js';

section("self-review：審核等級與抓錯率",()=>{
  /* self-review：審核等級與抓錯率 */
  {
  newRun('laravel');
  ok(JSON.stringify(C.REVIEW.map(r=>[r.name,r.tk,r.hrs]))===JSON.stringify([['不審核',1,1],['自審',1.3,1.2],['嚴格審核',1.6,1.35]]),'self-review：三種審核的 token 與時間倍率');
  for(const [v,m,c1,c2] of [['google','flash',.61,.81],['deepseek','chat',.69,.89],['anthropic','sonnet',.77,.95],['anthropic','opus',.85,.95],['anthropic','fable',.93,.95]])
    ok(near(catchRate(1,model(v,m)),c1)&&near(catchRate(2,model(v,m)),c2)&&catchRate(0,model(v,m))===0,`self-review：${m} 抓錯率 ${c1*100}%／${c2*100}%`);
  const tr=ticket('fe',4); S.hours=8; S.issues=[tr]; sel.issue=tr.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:1}); render();
  ok(els.app.innerHTML.includes('token ×1.3・抓錯 77%')&&els.app.innerHTML.includes('token ×1.6・抓錯 95%')&&els.app.innerHTML.includes('改壞就整單重做'),'self-review：審核按鈕顯示倍率與抓錯率');
  ok(els.app.innerHTML.includes('class="good">95%')&&els.app.innerHTML.includes('成功率（原 80%）'),'self-review：Sonnet 自審複雜度 4 顯示 95%（原 80%）');
  ok(near(est(tr,'anthropic','sonnet',1).pe,.8+.2*.77),'self-review：顯示的成功率 = p + (1 − p) × 抓錯率');
  pristine.fresh(); ok(pristine.sel.rv===1,'self-review：第一次開局預設自審');
  sel.rv=2; fresh(); ok(sel.rv===2,'self-review：審核等級跨局保留'); sel.rv=1;
  /* 抓到錯誤 */
  newRun('laravel'); const tc=ticket('fe',2); S.issues=[tc];
  settle(job(tc,'anthropic','sonnet','api',{ok:false,caught:true,rv:1,tk:200}));
  ok(!S.issues.includes(tc)&&near(S.st.api,250*.45)&&near(S.st.tk.anthropic,250)&&S.st.caught===1&&S.log.some(l=>l.msg.includes('自審抓到錯誤並當場修正，省掉整單重做')),'self-review：抓到錯誤時成功、token ×1.25');
  newRun('laravel'); const tn=ticket('fe',2); S.issues=[tn]; settle(job(tn,'anthropic','sonnet','corp',{ok:false,caught:false,rv:2}));
  ok(S.issues.includes(tn)&&S.log[0].msg.includes('審核沒抓到，上線後測試才爆'),'self-review：沒抓到的紀錄');
  /* 救不了的情況 */
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic={d:400,w:400}; const tq=ticket('fe',2); S.issues=[tq];
  settle(job(tq,'anthropic','sonnet','sub',{ok:false,caught:true,rv:2,tk:200}));
  ok(S.issues.includes(tq)&&S.log[0].msg.includes('撞到用量上限，agent 停在一半')&&S.st.caught===0,'self-review：嚴格審核救不了額度用完');
  const tt=ticket('fe',2); S.issues=[tt]; const rt=settle(job(tt,'anthropic','sonnet','corp',{ok:false,caught:true,rv:1}),{frac:.5,fail:true,note:'跑到下班還沒結束'});
  ok(!rt.ok&&S.issues.includes(tt)&&S.st.caught===0,'self-review：救不了跑到下班');
  const ts=ticket('app',2,{store:true}); S.issues=[ts]; const rs=withRand(0,()=>settle(job(ts,'anthropic','sonnet','corp',{ok:false,caught:true,rv:1})));
  ok(!rs.ok&&rs.rejected&&S.issues.includes(ts),'self-review：抓到錯誤後仍可能被 App Store 退件');
  }
});
