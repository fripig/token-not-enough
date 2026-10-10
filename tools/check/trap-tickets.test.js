// trap-tickets 的規則檢查：docs/spectra/specs/trap-tickets/spec.md
import {ok,near,section,newRun,ticket} from './lib.js';
import {els} from '../fake-dom.js';
import {BASE,KPI,STACKS,model,rnd} from '../../public/js/data.js';
import {S,makeIssue,sel} from '../../public/js/state.js';
import {est,quotaLeft} from '../../public/js/calc.js';
import {charge,evaluate,makeJob,manual,rescope,reveal,revealRate,settle} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {showEnd} from '../../public/js/modals.js';

const trapT=(extra={})=>ticket('laravel',1,{trap:true,trueCx:4,trueBase:BASE[4],kpi:3,due:6,revealed:false,evaluated:false,rescoped:false,...extra});
const evalWith=(is,v,m,b,rnd)=>{S.issues=[is]; sel.issue=is.id; sel.v=v; sel.m=m; sel.b=b; const real=Math.random; Math.random=()=>rnd; evaluate(); Math.random=real;};
const card=id=>{const h=els.app.innerHTML; const st=h.indexOf(`data-iss="${id}"`); return h.slice(st,h.indexOf('</button>',st));};
const norm=c=>c.replace(/data-iss="\d+"/,'').replace('iss sel','iss ');

section("trap 1.1 陷阱題產生",()=>{
  /* trap 1.1 陷阱題產生 */
  for(const k of Object.keys(STACKS)) ok(STACKS[k].pool.trap.length>=4,`STACKS.${k}.pool.trap 至少 4 個暗示標題`);
  newRun('laravel'); S.day=10;
  const gen=[...Array(20000)].map(()=>makeIssue(false));
  const small=gen.filter(i=>i.cx<=2), traps=small.filter(i=>i.trap);
  ok(Math.abs(traps.length/small.length-.1)<=.02,'複雜度 1–2 的工單約 10% 是陷阱',traps.length/small.length);
  ok(gen.filter(i=>i.cx>=3).every(i=>!i.trap),'複雜度 ≥3 的工單不是陷阱');
  ok(Math.abs(traps.filter(i=>i.trueCx===4).length/traps.length-.6)<=.05,'陷阱的真實複雜度約 60% 是 4');
  ok(traps.every(i=>i.trueCx>=4&&!i.revealed&&!i.evaluated&&!i.rescoped&&i.trueBase>=BASE[i.trueCx]*.85),'陷阱欄位初始值正確');
  const hinted=traps.filter(i=>STACKS[i.stack].pool.trap.includes(i.title)).length/traps.length;
  ok(Math.abs(hinted-.5)<=.05,'約一半陷阱用暗示標題',hinted);
  ok([...Array(500)].map(()=>makeIssue(true)).every(i=>!i.trap),'事故單不是陷阱');
});

section("trap 2.1 charge 共用扣款",()=>{
  /* trap 2.1 charge 共用扣款 */
  newRun('laravel'); const w0=S.wallet, sonnet=model('anthropic','sonnet');
  let ch=charge('api','anthropic',sonnet,40);
  ok(near(w0-S.wallet,40*.45*S.priceMod.anthropic)&&!ch.short,'charge：40k Sonnet 個人 API 扣 NT$18',w0-S.wallet);
  S.subs.anthropic='pro'; S.used.sub.anthropic.d=0; S.used.sub.anthropic.w=0;
  ch=charge('sub','anthropic',sonnet,1000);
  ok(ch.short&&near(ch.frac,450/1000),'charge：Pro 額度 450k 不夠 1000k 時回報 short 與比例',JSON.stringify(ch));
  ok(quotaLeft('sub','anthropic')===0,'charge：額度不夠時用光剩餘額度');
});

section("trap 2.2 踩到陷阱",()=>{
  /* trap 2.2 踩到陷阱 */
  
  const dispatchTo=(is,v,m,b,rv,rnd)=>{ // serial 模式直接派工；rnd 固定亂數
    S.issues=[is]; sel.issue=is.id; sel.v=v; sel.m=m; sel.b=b; sel.rv=rv;
    const real=Math.random; Math.random=()=>rnd; const j=makeJob(is); const r=settle(j); Math.random=real; return {j,r};
  };
  newRun('laravel');
  let tp=trapT(); const trueEstDs=est({...tp,cx:4,base:BASE[4]},'deepseek','chat',2);
  let {j:tj,r:tr}=dispatchTo(tp,'deepseek','chat','api',2,.5);
  ok(!tr.ok&&tp.revealed&&tp.cx===4&&tp.tries===1&&S.issues.includes(tp),'DeepSeek Chat 踩到陷阱：失敗、曝光為複雜度 4、tries 1');
  ok(S.log.some(l=>l.msg.includes('做到一半發現牽扯整個架構，先停下來')),'紀錄寫出停下來的原因');
  ok(near(tj.tk,trueEstDs.tk*.4),'停下來時花掉真實估計的 0.4 倍 token',tj.tk/trueEstDs.tk);
  ok(near(tp.base,BASE[4])&&tp.kpi===3&&tp.due===6&&tp.shownCx===1,'曝光後 base 用真實值、KPI 與期限不變、記下原估');
  ok(S.st.trapHit===1,'踩到陷阱計數 +1');
  newRun('laravel');
  tp=trapT(); const trueEstSn=est({...tp,cx:4,base:BASE[4]},'anthropic','sonnet',0);
  ({j:tj,r:tr}=dispatchTo(tp,'anthropic','sonnet','api',0,.5));
  ok(tr.ok&&!S.issues.includes(tp)&&near(tj.tk,trueEstSn.tk),'Sonnet 硬做完，token 照真實複雜度 4',tj.tk/trueEstSn.tk);
  ok(S.log.some(l=>l.msg.includes('原來牽扯到架構，硬做完了')),'紀錄寫出硬做完');
  newRun('laravel'); tp=trapT(); S.issues=[tp]; sel.issue=tp.id; const h0=S.hours; manual();
  ok(near(h0-S.hours,2.2)&&tp.revealed&&S.issues.includes(tp)&&tp.kpi===3,'手寫陷阱：花 2.2h 後曝光、留在佇列、KPI 不變');
  ok(S.log[0].msg.includes('手寫到一半發現要動架構'),'紀錄寫出手寫發現');
});

section("trap 2.3 評估架構",()=>{
  /* trap 2.3 評估架構 */
  
  newRun('laravel'); let ev=ticket('laravel',2); let w1=S.wallet, h1v=S.hours;
  evalWith(ev,'anthropic','sonnet','api',.5);
  ok(near(w1-S.wallet,40*.45)&&near(h1v-S.hours,.4)&&ev.evaluated&&!ev.revealed,'Sonnet 個人 API 評估：扣 40k token（NT$18）、花 0.4h、標記已評估');
  const capM={2:['google','flash'],3:['deepseek','chat'],4:['anthropic','sonnet'],5:['anthropic','opus']};
  for(const [cap,rate] of [[2,.65],[3,.8],[4,.95],[5,.95]]){
    const [v,m]=capM[cap]; ok(near(revealRate(model(v,m)),rate),`能力 ${cap} 識破率 ${rate}`);
    newRun('laravel'); let a=trapT(); evalWith(a,v,m,'api',rate-.01); ok(a.revealed&&S.st.trapFound===1,`能力 ${cap}：亂數 ${(rate-.01).toFixed(2)} 時識破`);
    newRun('laravel'); a=trapT(); evalWith(a,v,m,'api',rate+.001); ok(!a.revealed&&a.evaluated,`能力 ${cap}：亂數略高於識破率時沒識破`);
  }
  newRun('laravel'); let miss=trapT(); evalWith(miss,'anthropic','haiku','api',.9);
  ok(!miss.revealed&&miss.evaluated&&miss.cx===1,'沒識破的陷阱：已評估但仍顯示原估複雜度');
  ok(S.log[0].msg.includes('評估完成，看起來沒問題'),'沒識破與一般工單的紀錄相同');
  newRun('laravel'); S.subs.anthropic='pro'; S.used.sub.anthropic.d=440; let sh=trapT(); evalWith(sh,'anthropic','sonnet','sub',.01);
  ok(!sh.evaluated&&!sh.revealed&&S.log[0].msg.includes('額度不夠，評估沒做完'),'額度不夠：評估中斷、不算已評估');
});

section("trap 6.1 評估也有稽核與透支檢查",()=>{
  /* trap 6.1 評估也有稽核與透支檢查 */
  newRun('laravel'); let sv=ticket('laravel',2,{sens:true}); const tr0=S.trust;
  evalWith(sv,'deepseek','chat','api',.5);
  ok(S.trust===tr0-12&&S.st.audits===1,'評估機敏工單（DeepSeek 個人 API、亂數 0.5 < 0.6）：信任 -12、稽核 +1',[S.trust,S.st.audits].join());
  newRun('laravel'); sv=ticket('laravel',2,{sens:true}); evalWith(sv,'anthropic','sonnet','api',.5);
  ok(S.st.audits===0,'評估機敏工單（Sonnet 個人 API、亂數 0.5 ≥ 0.35）：沒被稽核');
  newRun('laravel'); S.corp=5; const tr1=S.trust; evalWith(ticket('laravel',2),'anthropic','opus','corp',.5);
  ok(S.corp===0&&S.trust===tr1-8&&S.log.some(l=>l.msg.includes('公司 API 預算透支')),'評估把公司預算刷到透支：當下歸零、信任 -8、有紀錄',[S.corp,S.trust].join());
});

section("trap 2.4 找主管重新評估（spec 範例表）",()=>{
  /* trap 2.4 找主管重新評估（spec 範例表） */
  for(const [trust,st,tcx,kb,db,ta,ka,da] of [[70,'rust',4,4,6,65,21,8],[50,'laravel',5,3,19,45,24,20],[49,'laravel',4,3,6,46,3,6]]){
    newRun('laravel'); S.trust=trust; const rs=ticket(st,tcx,{trap:true,revealed:true,shownCx:1,trueCx:tcx,kpi:kb,due:db,rescoped:false});
    S.issues=[rs]; sel.issue=rs.id; rescope();
    ok(S.trust===ta&&rs.kpi===ka&&rs.due===da&&rs.rescoped,`重新評估：信任 ${trust} ${st} 真實 ${tcx} → 信任 ${ta}、KPI ${ka}、期限 ${da}`,JSON.stringify([S.trust,rs.kpi,rs.due]));
    const t2=S.trust; rescope(); ok(S.trust===t2,'同一張單不能重新評估第二次');
  }
});

section("trap 3.1 卡片與派工台",()=>{
  /* trap 3.1 卡片與派工台 */
  newRun('laravel'); S.day=1;
  const hid=trapT({id:9001}), normal=ticket('laravel',1,{id:9002,kpi:3,due:6}), shown=trapT({id:9003,revealed:true,shownCx:1,cx:5,trueCx:5}), evd=ticket('laravel',1,{id:9004,evaluated:true});
  S.issues=[hid,normal,shown,evd]; sel.issue=hid.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; render();
  
  
  ok(norm(card(9001))===norm(card(9002)),'沒曝光的陷阱卡片和同複雜度的一般工單長得一樣');
  ok(card(9003).includes('牽一髮動全身・原估 1'),'曝光的陷阱卡片顯示牽一髮動全身・原估 1');
  ok(card(9004).includes('>已評估<')&&!card(9002).includes('已評估'),'已評估的工單顯示已評估');
  ok(els.app.innerHTML.includes('data-act="eval"')&&els.app.innerHTML.includes('先讓 agent 評估架構（40k tokens，0.4h）'),'派工台顯示評估按鈕與成本');
  ok(!els.app.innerHTML.includes('data-act="rescope"'),'沒曝光時不顯示找主管');
  sel.issue=shown.id; render();
  ok(els.app.innerHTML.includes('data-act="rescope"')&&!els.app.innerHTML.includes('data-act="eval"'),'曝光後顯示找主管、不再顯示評估');
  sel.issue=evd.id; render();
  ok(!els.app.innerHTML.includes('data-act="eval"'),'已評估的工單不再顯示評估');
  S.hours=.2; sel.issue=normal.id; render();
  ok(/data-act="eval" disabled/.test(els.app.innerHTML),'剩餘工時不足時評估按鈕停用');
});

section("trap 6.2 經由 reveal() 曝光、沒識破的陷阱畫面",()=>{
  /* trap 6.2 經由 reveal() 曝光、沒識破的陷阱畫面 */
  newRun('laravel'); S.day=1;
  const r5=trapT({id:9101,trueCx:5,trueBase:BASE[5]}); reveal(r5); S.issues=[r5]; sel.issue=null; render();
  ok(r5.cx===5&&r5.kpi===3&&card(9101).includes('title="複雜度 5"')&&card(9101).includes('牽一髮動全身・原估 1'),'reveal() 後卡片顯示複雜度 5、原估 1，KPI 仍是 3');
  const missT=trapT({id:9102,evaluated:true}), evN=ticket('laravel',1,{id:9103,evaluated:true,kpi:3,due:6});
  S.issues=[missT,evN]; sel.issue=null; render();
  ok(norm(card(9102))===norm(card(9103)),'沒識破的陷阱卡片和評估過的一般工單一樣');
  sel.issue=missT.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; render();
  ok(!els.app.innerHTML.includes('data-act="eval"'),'沒識破的陷阱不再顯示評估按鈕');
});

section("trap 3.2 結算計數",()=>{
  /* trap 3.2 結算計數 */
  newRun('laravel'); S.st.trapHit=1; S.st.trapFound=2; S.day=20; showEnd();
  ok(els.mo.innerHTML.includes('<span>踩到陷阱</span><span>1 次</span>')&&els.mo.innerHTML.includes('<span>事先識破</span><span>2 次</span>'),'結算顯示踩到陷阱 1 次、事先識破 2 次');
});
