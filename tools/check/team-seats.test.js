// team-seats 的規則檢查：docs/spectra/specs/team-seats/spec.md
import {ok,section,newRun,ticket} from './lib.js';
import {els} from '../fake-dom.js';
import {KPI,SEAT,VENDORS} from '../../public/js/data.js';
import {GIG_CLIENT,GIG_PAY,S,sel} from '../../public/js/state.js';
import {presetBlock,quotaLeft} from '../../public/js/calc.js';
import {endDay} from '../../public/js/actions.js';
import {dispatchPanel,render} from '../../public/js/view.js';
import {showSetup} from '../../public/js/modals.js';

const seatReview=(seats,vendor,day,trust)=>{newRun('laravel'); S.seats=[...seats]; S.seatReq={vendor,day}; S.day=day+4; S.hours=0; S.trust=trust;
    const rr=Math.random; Math.random=()=>.99; endDay(); Math.random=rr; return els.mo.innerHTML;};

section("團隊席位：OpenAI 也能申請，核准後 Codex 可用公司席位付款",()=>{
  /* 團隊席位：OpenAI 也能申請，核准後 Codex 可用公司席位付款 */
  newRun('laravel'); showSetup(false); ok(els.mo.innerHTML.includes('data-seat="openai"'),'開局可申請 OpenAI 團隊席位');
  S.seats=['openai'];
  const oaiT=ticket('laravel',2); S.issues=[oaiT]; sel.issue=oaiT.id; sel.v='openai'; sel.m=VENDORS.openai.models[1].id; sel.b='seat'; render();
  ok(els.app.innerHTML.includes('data-b="seat"')&&quotaLeft('seat','openai')===SEAT.day,'OpenAI 席位核准後出現公司席位選項、額度 2.5M');
});

section("團隊席位提示：選到別家廠商時提醒席位要選哪家",()=>{
  /* 團隊席位提示：選到別家廠商時提醒席位要選哪家 */
  newRun('laravel'); S.seats=['google'];
  const seatT=ticket('laravel',2); S.issues=[seatT]; sel.issue=seatT.id; sel.v='anthropic'; sel.m='sonnet'; sel.b='api'; render();
  ok(els.app.innerHTML.includes('你有 Google 團隊席位，選 Gemini CLI 的模型才能用公司席位付款。'),'選到 Anthropic 時提示 Google 席位要選 Gemini CLI');
  sel.v='google'; sel.m='pro'; render();
  ok(!els.app.innerHTML.includes('團隊席位，選')&&els.app.innerHTML.includes('data-b="seat"'),'選到 Google 時不提示、出現公司席位選項');
  S.seats=[]; S.seatReq={vendor:'google',day:1}; sel.v='anthropic'; sel.m='sonnet'; render();
  ok(!els.app.innerHTML.includes('團隊席位，選'),'席位還在審核時不提示');
});

section("multi-team-seats：席位審核門檻 55／65／75，依審核當下已核准的席位數",()=>{
  /* multi-team-seats：席位審核門檻 55／65／75，依審核當下已核准的席位數 */
  
  for(const [seats,v,day,trust,okd,need] of [[[],'openai',1,60,true,55],[[],'openai',1,50,false,55],[['openai'],'google',6,64,false,65],[['openai'],'google',6,65,true,65],[['openai','google'],'anthropic',11,74,false,75],[['openai','google'],'anthropic',11,75,true,75]]){
    const mo=seatReview(seats,v,day,trust), name=`第 ${seats.length+1} 個席位、信任 ${trust}`;
    ok(S.seatReq===null,`${name}：審核後沒有待審申請`);
    if(okd) ok(S.seats.length===seats.length+1&&S.seats.at(-1)===v&&mo.includes(`採購通過：公司幫你開了 ${VENDORS[v].name} 團隊席位。`),`${name} → 核准`,JSON.stringify(S.seats));
    else ok(S.seats.length===seats.length&&mo.includes(`採購被退件：主管信任不夠（需要 ${need} 以上）。`),`${name} → 退件、需要 ${need} 以上`,JSON.stringify(S.seats));
  }
  newRun('laravel'); S.seatReq={vendor:'openai',day:1}; S.day=4; S.hours=0; S.trust=90; {const rr=Math.random; Math.random=()=>.99; endDay(); Math.random=rr;}
  ok(S.seatReq?.vendor==='openai'&&S.seats.length===0,'申請後第 5 天還沒審核');
});

section("multi-team-seats：申請選單只列還沒有席位的廠商，並寫出第幾個席位與門檻",()=>{
  /* multi-team-seats：申請選單只列還沒有席位的廠商，並寫出第幾個席位與門檻 */
  const seatOpts=()=>[...els.mo.innerHTML.matchAll(/data-seat="(\w*)"/g)].map(m=>m[1]).join();
  newRun('laravel'); showSetup(false);
  ok(els.mo.innerHTML.includes('向公司申請第 1 個團隊席位（5 天後審核，信任需 55 以上）')&&seatOpts()===',anthropic,openai,google','開局：第 1 個席位、需 55、三家都能選',seatOpts());
  newRun('laravel'); S.seats=['openai']; showSetup(true);
  ok(els.mo.innerHTML.includes('向公司申請第 2 個團隊席位（5 天後審核，信任需 65 以上）')&&seatOpts()===',anthropic,google','已有 OpenAI 席位：第 2 個、需 65、不列 OpenAI',seatOpts());
  S.seatReq={vendor:'google',day:6}; showSetup(true); ok(seatOpts()==='','有申請在審：週一不顯示席位申請');
  S.seatReq=null; S.seats=['anthropic','openai','google']; showSetup(true); ok(seatOpts()==='','三個席位都有：週一不顯示席位申請');
  seatReview(['openai'],'google',1,50); showSetup(true);
  ok(S.day===6&&seatOpts()===',anthropic,google','第 6 天退件後，當天週一調整可再申請，被退的 Google 也列出',seatOpts());
  seatReview([],'openai',1,60); showSetup(true);
  ok(S.day===6&&els.mo.innerHTML.includes('第 2 個團隊席位')&&seatOpts()===',anthropic,google','第 6 天核准後，當天週一調整可申請第 2 個',seatOpts());
});

section("multi-team-seats：開局點 OpenAI 再按開始 → 待審申請、額度區顯示第 6 天有結果",()=>{
  /* multi-team-seats：開局點 OpenAI 再按開始 → 待審申請、額度區顯示第 6 天有結果 */
  newRun('laravel'); showSetup(false);
  {const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}}); press({seat:'openai'}); press({act:'confirm'});}
  ok(JSON.stringify(S.seatReq)==='{"vendor":"openai","day":1}'&&S.seats.length===0,'開局申請 OpenAI：S.seatReq 是 openai／第 1 天',JSON.stringify(S.seatReq));
  ok(els.app.innerHTML.includes('團隊席位採購審核中，預計第 6 天有結果')&&S.log.some(l=>l.msg.includes('提出 OpenAI 團隊席位採購申請')),'開局申請後額度區顯示預計第 6 天有結果、紀錄寫出申請');
});

section("OpenAI 席位、選 Claude Code：不出現公司席位，提示 Codex CLI",()=>{
  /* OpenAI 席位、選 Claude Code：不出現公司席位，提示 Codex CLI */
  newRun('laravel'); S.seats=['openai']; {const t=ticket('laravel',2); S.issues=[t]; sel.issue=t.id;} Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api'}); render();
  ok(!els.app.innerHTML.includes('data-b="seat"')&&els.app.innerHTML.includes('你有 OpenAI 團隊席位，選 Codex CLI 的模型才能用公司席位付款。'),'OpenAI 席位選 Claude Code：沒有公司席位選項、提示 Codex CLI');
});

section("multi-team-seats：每個席位各自付款、各自額度，提示列出所有有席位的 agent",()=>{
  /* multi-team-seats：每個席位各自付款、各自額度，提示列出所有有席位的 agent */
  newRun('laravel'); S.seats=['openai','google']; S.used.seat.openai={d:1000,w:1000};
  const twoT=ticket('laravel',2); S.issues=[twoT]; sel.issue=twoT.id; sel.b='api';
  Object.assign(sel,{v:'openai',m:'std'}); render(); let h=els.app.innerHTML;
  ok(h.includes('data-b="seat"')&&h.includes('剩 1.5M')&&quotaLeft('seat','openai')===1500,'OpenAI 席位用掉 1,000k → Codex 公司席位剩 1.5M');
  Object.assign(sel,{v:'google',m:'pro'}); render(); h=els.app.innerHTML;
  ok(h.includes('data-b="seat"')&&quotaLeft('seat','google')===2500,'Google 席位額度另外算 → Gemini 公司席位剩 2.5M');
  ok(h.indexOf('OpenAI 團隊席位')>=0&&h.indexOf('OpenAI 團隊席位')<h.indexOf('Google 團隊席位'),'額度區：OpenAI 席位方塊在 Google 前面');
  Object.assign(sel,{v:'anthropic',m:'sonnet'}); render();
  ok(els.app.innerHTML.includes('你有 OpenAI、Google 團隊席位，選 Codex CLI、Gemini CLI 的模型才能用公司席位付款。'),'選 Claude Code 時提示列出 Codex CLI 與 Gemini CLI');
  ok(presetBlock(twoT,{v:'openai',m:'std',b:'seat',rv:0})===''&&presetBlock(twoT,{v:'google',m:'pro',b:'seat',rv:0})==='','OpenAI、Google 席位方案都能用');
  ok(presetBlock(twoT,{v:'anthropic',m:'sonnet',b:'seat',rv:0})==='沒有公司席位','沒有 Anthropic 席位 → 沒有公司席位');
  S.seatReq={vendor:'anthropic',day:6}; S.day=6; render();
  ok(els.app.innerHTML.indexOf('Google 團隊席位')<els.app.innerHTML.indexOf('團隊席位採購審核中，預計第 11 天有結果'),'有席位又有申請在審：方塊後面接審核中');
  const gigT=ticket('laravel',2,{out:true,client:GIG_CLIENT,pay:KPI[2]*GIG_PAY}); S.issues=[gigT]; Object.assign(sel,{issue:gigT.id,v:'google',m:'pro',b:'seat'});
  ok(/data-b="seat" disabled>公司席位<small>外包不能用公司資源<\/small>/.test(dispatchPanel())&&sel.b!=='seat','外包單：Google 席位也停用');
});
