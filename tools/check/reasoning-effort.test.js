// reasoning-effort 的規則檢查：docs/spectra/specs/reasoning-effort/spec.md
import {ok,near,section,newRun,ticket} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {BASE,DEFAULT_PRESETS,EFFORT,bestKey,effModel,model} from '../../public/js/data.js';
import {S,fresh,sel} from '../../public/js/state.js';
import {catchRate,costLine,est,presetBlock} from '../../public/js/calc.js';
import {dispatch,evaluate,loadPreset,makeJob,quick,savePreset,trueView} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {showEnd,showSetup} from '../../public/js/modals.js';

section("reasoning-effort：進階模式開關",()=>{
  {
  /* reasoning-effort：進階模式開關 */
  const press=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
  S.advanced=undefined; start();
  ok(S.advanced===false&&/class="sb sel" data-adv="0"/.test(els.mo.innerHTML),'進階模式預設一般，開局預選一般');
  const ids=S.issues.map(i=>i.id+i.title).join();
  press({adv:'1'}); ok(/class="sb sel" data-adv="1"/.test(els.mo.innerHTML),'點進階後預選進階');
  press({act:'confirm'}); ok(S.advanced===true,'確認後開啟進階模式');
  ok(S.issues.map(i=>i.id+i.title).join()===ids,'只切進階模式不重抽第 1 天工單');
  S.day=20; showEnd(); press({act:'again'});
  ok(S.advanced===true&&/class="sb sel" data-adv="1"/.test(els.mo.innerHTML),'再玩一個月沿用進階並預選');
  S.advanced=1; fresh(); ok(S.advanced===false,'存的值是數字 1 時退回一般');
  showSetup(true); ok(!els.mo.innerHTML.includes('data-adv'),'週一調整不顯示進階模式開關');
  newRun('laravel','parallel'); S.advanced=false; const k0=bestKey(); S.advanced=true; ok(bestKey()===k0,'最高分 key 不分一般／進階',k0);
  }
});

section("reasoning-effort：推理強度對模型的影響",()=>{
  {
  /* reasoning-effort：推理強度對模型的影響 */
  const son=model('anthropic','sonnet'), hai=model('google','flash'), opu=model('anthropic','opus');
  ok(effModel(son,1)===son,'中強度回傳原本的模型物件');
  ok(effModel(hai,0).cap===1&&effModel(opu,2).cap===6&&effModel(model('anthropic','fable'),2).cap===7,'Gemini Flash 低強度能力 1、Opus 高強度能力 6、Fable 高強度能力 7');
  const sh=effModel(son,2); ok(sh.price===son.price&&sh.w===son.w&&sh.name==='Sonnet・高強度','高強度不改價格與額度權重，名稱 Sonnet・高強度',sh.name);
  ok(EFFORT.map(f=>[f.cap,f.tk,f.hrs].join('/')).join()==='-1/0.7/0.8,0/1/1,1/1.5/1.4','EFFORT 倍率');
  newRun('laravel'); S.advanced=true; const t44=ticket('laravel',4);
  const [eL,eM,eH]=[0,1,2].map(f=>est(t44,'anthropic','sonnet',0,f));
  ok(near(eL.p,.5)&&near(eM.p,.8)&&near(eH.p,.95),'Sonnet 對複雜度 4 Laravel 單：低 50%、中 80%、高 95%',[eL.p,eM.p,eH.p].join());
  ok(near(eL.tk/eM.tk,.7)&&near(eH.tk/eM.tk,1.5),'token 是中強度的 0.7／1.5 倍',[eL.tk/eM.tk,eH.tk/eM.tk].join());
  ok(near(eL.hrs/eM.hrs,.8)&&near(eH.hrs/eM.hrs,1.4),'時數是中強度的 0.8／1.4 倍（高強度變慢）',[eL.hrs/eM.hrs,eH.hrs/eM.hrs].join());
  ok(near(est(t44,'anthropic','sonnet',1,2).c,catchRate(1,sh))&&est(t44,'anthropic','sonnet',1,2).c>est(t44,'anthropic','sonnet',1,1).c,'自我審核抓錯率用調整後的能力');
  S.advanced=false; const g2=est(t44,'anthropic','sonnet',0,2);
  ok(near(g2.p,eM.p)&&near(g2.tk,eM.tk)&&near(g2.hrs,eM.hrs)&&g2.M===son,'一般模式忽略推理強度');
  /* 高強度硬做陷阱 */
  newRun('laravel'); S.advanced=true; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0,ef:2});
  const tp=ticket('laravel',1,{trap:true,trueCx:5,trueBase:BASE[5],revealed:false,evaluated:false});
  let jb=makeJob(tp); ok(!jb.stop&&jb.M.cap===5,'高強度 Sonnet 對真實複雜度 5 的陷阱不會停下');
  const eT=f=>est(trueView(tp),'anthropic','sonnet',0,f), tv5=trueView(tp);
  ok(tv5.cx===5&&near(eT(2).tk/eT(1).tk,1.5)&&near(eT(2).hrs/eT(1).hrs,1.4)&&near(eT(1).hrs,5*model('anthropic','sonnet').speed),'陷阱照真實複雜度 5 估算，高強度 token ×1.5、時數 ×1.4');
  ok(jb.tk>=eT(2).tk*.7-1e-9&&jb.tk<=eT(2).tk*1.3+1e-9&&jb.hrs>=eT(2).hrs*.8-1e-9&&jb.hrs<=eT(2).hrs*1.2+1e-9,'高強度硬做陷阱的 token 與時數落在高強度估算的隨機範圍內');
  sel.ef=1; jb=makeJob(tp); ok(jb.stop,'中強度 Sonnet 對真實複雜度 5 的陷阱會停下');
  /* 評估架構不受影響 */
  const evalUse=ef=>{newRun('laravel'); S.advanced=true; S.hours=8; const t=ticket('laravel',2); S.issues=[t]; Object.assign(sel,{issue:t.id,v:'anthropic',m:'sonnet',b:'corp',rv:0,ef}); evaluate(); return [S.st.tk.anthropic,S.hours].join();};
  ok(evalUse(2)===evalUse(1),'評估架構的 token 與時間跟推理強度無關');
  /* 紀錄名稱 */
  newRun('laravel'); S.advanced=true; S.hours=8; const tl=ticket('laravel',1); S.issues=[tl]; Object.assign(sel,{issue:tl.id,v:'anthropic',m:'sonnet',b:'corp',rv:0,ef:2}); dispatch();
  ok(S.log.some(l=>l.msg.includes('Sonnet・高強度')),'派工紀錄寫 Sonnet・高強度');
  /* 派工台旋鈕 */
  newRun('laravel'); S.hours=8; const tv=ticket('laravel',2); S.issues=[tv]; sel.issue=tv.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp'});
  S.advanced=false; render(); ok(!els.app.innerHTML.includes('data-ef'),'一般模式沒有推理強度旋鈕');
  S.advanced=true; render(); ok([0,1,2].every(i=>els.app.innerHTML.includes(`data-ef="${i}"`))&&els.app.innerHTML.includes('推理強度'),'進階模式顯示低／中／高');
  }
});

section("reasoning-effort：派工方案存推理強度",()=>{
  {
  /* reasoning-effort：派工方案存推理強度 */
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  ok(DEFAULT_PRESETS.every(p=>p.ef===1),'預設方案都是中強度');
  S.presets[0]={v:'anthropic',m:'sonnet',b:'corp',rv:1}; fresh(); ok(same(S.presets[0],{v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:2}),'沒有推理強度的方案保留並補成中、SDD 補成 2');
  S.presets[0]={v:'anthropic',m:'haiku',b:'sub',rv:0,ef:2,sdd:1}; start(); ok(same(S.presets[0],{v:'anthropic',m:'haiku',b:'sub',rv:0,ef:2,sdd:1}),'再玩一個月沿用高強度、SDD 1 的方案 A');
  S.presets[0]={v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:7}; fresh(); ok(same(S.presets,DEFAULT_PRESETS),'推理強度不合法時三組退回預設');
  newRun('laravel'); S.hours=8; const tp=ticket('laravel',4); S.issues=[tp]; sel.issue=tp.id;
  Object.assign(sel,{v:'google',m:'pro',b:'corp',rv:0,ef:2}); savePreset(1); ok(S.presets[1].ef===2,'存成方案記下推理強度');
  sel.ef=0; loadPreset(1); ok(sel.ef===2,'載入方案帶回推理強度');
  S.advanced=true; render(); ok(/載入方案 B<small>Pro・高強度/.test(els.app.innerHTML),'進階模式的載入按鈕顯示高強度');
  S.advanced=false; render(); ok(!/載入方案 B<small>Pro・高強度/.test(els.app.innerHTML),'一般模式的載入按鈕不顯示強度');
  const pa={v:'anthropic',m:'opus',b:'api',rv:0,ef:2}, hiMid=costLine('api',model('anthropic','opus'),'anthropic',est(tp,'anthropic','opus',0,1)).hi;
  S.wallet=hiMid*1.2;
  S.advanced=false; ok(presetBlock(tp,pa)==='','一般模式下存了高強度的方案照中強度估算');
  S.advanced=true; ok(presetBlock(tp,pa)==='錢包不夠','進階模式下同一個方案照高強度估算，錢包不夠');
  newRun('laravel'); S.advanced=false; S.hours=8; const tq=ticket('laravel',1); S.issues=[tq];
  S.presets=[{v:'anthropic',m:'sonnet',b:'corp',rv:0,ef:2},...DEFAULT_PRESETS.slice(1)].map(p=>({...p}));
  ok(quick(tq.id)&&S.log.some(l=>l.msg.includes('Sonnet'))&&!S.log.some(l=>l.msg.includes('強度')),'一般模式一鍵派工用存了高強度的方案，照中強度派工');
  S.advanced=false;
  }
});
