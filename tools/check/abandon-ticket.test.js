// abandon-ticket 的規則檢查：docs/spectra/specs/abandon-ticket/spec.md
import {ok,section,newRun,ticket,clickApp,job} from './lib.js';
import {els} from '../fake-dom.js';
import {render} from '../../public/js/view.js';
import {showEnd} from '../../public/js/modals.js';
import * as St from '../../public/js/state.js';
import {S,sel} from '../../public/js/state.js';
import {ABANDON_TRUST,abandon,canAbandon,cancelJob} from '../../public/js/actions.js';
import {setLang} from '../../public/js/i18n.js';

const ev=[]; globalThis.gtag=(kind,name,p)=>ev.push({kind,name,p});
const one=(is,extra={})=>{S.issues=[is]; sel.issue=is.id; ev.length=0; Object.assign(S,extra); abandon(is.id);};

section("abandon-ticket：能退哪些單",()=>{
  newRun('laravel'); const inc=ticket('laravel',4,{inc:true}); S.trust=70; one(inc);
  ok(S.issues.length===1&&S.trust===70&&ev.length===0&&!canAbandon(inc),'事故單不能退、不送事件');
  newRun('laravel','parallel'); const run=ticket('laravel',2,{running:true}); S.trust=70; one(run);
  ok(S.issues.length===1&&S.trust===70&&ev.length===0,'跑著 agent 的單不能退');
  /* 中止之後就能退 */
  newRun('laravel','parallel'); const rj=ticket('laravel',2,{running:true}); S.issues=[rj]; S.jobs=[{...job(rj,'deepseek','chat','api'),hrs:2,left:1}]; S.trust=70;
  abandon(rj.id); ok(S.issues.includes(rj),'中止前退不掉');
  cancelJob(rj.id); abandon(rj.id); ok(!S.issues.includes(rj)&&S.jobs.length===0&&S.trust===68,'用中止停掉後就能退，信任 −2',`${S.trust}/${S.issues.length}`);
  newRun('laravel'); const mg=ticket('laravel',2,{merge:true});
  S.issues=[mg]; ok(canAbandon(mg),'合併衝突單可以退');
  sel.issue=mg.id; render(); ok(els.app.innerHTML.includes(`data-abandon="${mg.id}"`),'合併衝突單的派工台有退單按鈕');
  ok(!canAbandon(ticket('laravel',2)),'不在佇列裡的單不能退');
});

section("abandon-ticket：退單的代價",()=>{
  newRun('laravel'); const a=ticket('laravel',3,{kpi:10}); S.kpi=40; one(a,{trust:70});
  ok(S.issues.length===0&&S.trust===68&&S.kpi===40&&S.st.abandoned===1&&sel.issue===null,'公司單：信任 70→68、KPI 不變、退單 1 張、派工台清空',`${S.trust}/${S.kpi}/${S.st.abandoned}`);
  ok(S.st.late===0&&S.st.kpiLost===0&&S.st.outLate===0,'退單不算逾期');
  ok(ABANDON_TRUST===2,'ABANDON_TRUST 是 2');
  newRun('laravel'); one(ticket('laravel',2),{trust:1});
  ok(S.trust===0,'信任 1 退單後是 0（不低於 0）');
  newRun('laravel'); const g=ticket('laravel',3,{out:true,pay:2500}); const p0=S.st.outPenalty; one(g,{trust:70,wallet:100});
  ok(S.wallet===-650&&S.st.outPenalty-p0===750&&S.trust===70&&S.st.outLate===0,'外包單：錢包 NT$100 → −NT$650、違約金 +750、信任不變',`${S.wallet}/${S.st.outPenalty}`);
  newRun('laravel'); const tr=ticket('laravel',1,{trap:true,trueCx:5,revealed:false}); one(tr);
  ok(!tr.revealed&&S.st.trapHit===0&&ev[0]?.p.cx===1,'隱藏陷阱退掉不曝光、不算踩到，事件送顯示的複雜度',JSON.stringify(ev[0]?.p));
  newRun('laravel'); const r1=ticket('laravel',2,{from:9}), r2=ticket('laravel',3,{from:9}); S.issues=[r1,r2]; S.trust=70; abandon(r1.id); abandon(r2.id);
  ok(S.trust===66&&S.st.abandoned===2,'研究拆出的兩張各扣 2：70→66',S.trust);
});

section("abandon-ticket：紀錄與舊存檔",()=>{
  newRun('laravel'); S.day=7; one(ticket('laravel',2,{title:'修正登入頁跳轉'}));
  ok(S.log[0].msg==='D07 ✕ 退單 修正登入頁跳轉（複雜度 2）｜信任 -2','公司單紀錄行',S.log[0].msg);
  newRun('laravel'); S.day=7; one(ticket('laravel',3,{title:'外包官網',out:true,pay:2500}));
  ok(S.log[0].msg==='D07 ✕ 退單 外包官網（複雜度 3・外包）｜違約金 NT$750','外包單紀錄行',S.log[0].msg);
  setLang('en'); newRun('laravel'); S.day=7; one(ticket('laravel',2,{title:'fix'}));
  ok(S.log[0].msg==='D07 ✕ Handed back fix (Complexity 2) | trust -2','英文紀錄行',S.log[0].msg); setLang('zh-TW');
  newRun('laravel'); delete S.st.abandoned; St.loadGame({S,sel,uid:St.uid});
  ok(S.st.abandoned===0,'舊存檔沒有退單數，讀檔補 0');
});

section("abandon-ticket：派工台兩段式按鈕",()=>{
  newRun('laravel'); const a=ticket('laravel',3), g=ticket('laravel',3,{out:true,pay:2500}), inc=ticket('laravel',4,{inc:true});
  S.issues=[a,g,inc]; S.trust=70; sel.issue=a.id; render();
  ok(els.app.innerHTML.includes(`data-abandon="${a.id}">找主管退單（信任 −2）</button>`),'公司單按鈕寫「找主管退單（信任 −2）」');
  sel.issue=g.id; render(); ok(els.app.innerHTML.includes(`data-abandon="${g.id}">找主管退單（違約金 NT$750）</button>`),'外包單按鈕寫違約金 NT$750');
  sel.issue=inc.id; render(); ok(!els.app.innerHTML.includes('data-abandon='),'事故單沒有退單按鈕');
  sel.issue=a.id; render(); clickApp({abandon:String(a.id)});
  ok(S.issues.includes(a)&&els.app.innerHTML.includes('確定退單？')&&S.trust===70,'第一次按只變成「確定退單？」，還沒退');
  clickApp({iss:String(g.id)}); sel.issue=a.id; render();
  ok(S.issues.includes(a)&&!els.app.innerHTML.includes('確定退單？')&&els.app.innerHTML.includes('找主管退單（信任 −2）'),'點別處恢復成原本的按鈕');
  clickApp({abandon:String(a.id)}); clickApp({abandon:String(a.id)});
  ok(!S.issues.includes(a)&&S.trust===68&&S.st.abandoned===1,'按兩次退單一次',`${S.trust}/${S.st.abandoned}`);
});

section("abandon-ticket：結算的退單列",()=>{
  newRun('laravel'); S.issues=[1,2,3].map(()=>ticket('laravel',2)); S.issues.slice().forEach(i=>abandon(i.id)); S.day=20; showEnd();
  const h=els.mo.innerHTML;
  ok(/<span>逾期工單<\/span><span>[^<]*<\/span><\/div>\s*<div><span>退單<\/span><span>3 張<\/span>/.test(h),'結算在逾期工單下一列寫「退單 3 張」');
  newRun('laravel'); delete S.st.abandoned; St.loadGame({S,sel,uid:St.uid}); S.day=20; showEnd();
  ok(els.mo.innerHTML.includes('<span>退單</span><span>0 張</span>'),'舊存檔結算寫「退單 0 張」');
});
