// dispatch-presets 的規則檢查：docs/spectra/specs/dispatch-presets/spec.md
import {ok,section,newRun,ticket} from './lib.js';
import {els} from '../fake-dom.js';
import {start} from '../../public/js/main.js';
import {CLIENTS,DEFAULT_PRESETS,cnBlock,kt,model,presetsOf} from '../../public/js/data.js';
import {S,fresh,sel} from '../../public/js/state.js';
import {est,presetBlock,presetFor} from '../../public/js/calc.js';
import {dispatch,loadPreset,quick,savePreset} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import * as M from '../../public/js/modals.js';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fin=extra=>ticket('fe',2,{client:CLIENTS[2],...extra});

section("dispatch-presets：預設、沿用、不合法退回",()=>{
  /* dispatch-presets：預設、沿用、不合法退回 */
  
  start(); ok(same(S.presets,DEFAULT_PRESETS),'第一次開局是預設方案',JSON.stringify(S.presets));
  ok(same(S.presets.map(p=>[p.v,p.m,p.b,p.rv].join('/')),['deepseek/chat/api/1','anthropic/sonnet/corp/1','anthropic/opus/corp/2']),'預設 A/B/C 內容');
  S.presets[0]={v:'anthropic',m:'haiku',b:'sub',rv:0}; start();
  ok(same(S.presets[0],{v:'anthropic',m:'haiku',b:'sub',rv:0,ef:1,sdd:2}),'再玩一個月沿用方案 A（沒有推理強度的補成中、沒有 SDD 補成 2）');
  S.presets[1]={v:'anthropic',m:'nope',b:'corp',rv:1}; fresh();
  ok(same(S.presets,DEFAULT_PRESETS),'有不存在的模型時三組都退回預設');
  S.presets[0].rv=0; ok(DEFAULT_PRESETS[0].rv===1,'修改方案不會改到預設值');
});

section("方案能不能用：原因與優先順序",()=>{
  /* 方案能不能用：原因與優先順序 */
  const P=(v,m,b,rv=0)=>({v,m,b,rv});
  
  newRun('laravel');
  const finT=fin(); S.issues=[finT];
  ok(presetBlock(finT,P('deepseek','chat','api'))===cnBlock(finT,'deepseek',model('deepseek','chat'))&&presetBlock(finT,P('deepseek','chat','api'))!=='','金融客戶 × DeepSeek → 禁用原因',presetBlock(finT,P('deepseek','chat','api')));
  S.outage='anthropic'; ok(presetBlock(finT,P('anthropic','sonnet','corp'))==='今日當機','當機 → 今日當機'); S.outage=null;
  ok(presetBlock(finT,P('google','flash','sub'))==='沒有訂閱','沒有 Google 訂閱 → 沒有訂閱',presetBlock(finT,P('google','flash','sub')));
  S.seats=['google']; ok(presetBlock(finT,P('anthropic','sonnet','seat'))==='沒有公司席位','席位是 Google、方案用 Anthropic 席位 → 沒有公司席位'); S.seats=[];
  S.subs.anthropic='pro'; S.used.sub.anthropic={d:1e9,w:1e9}; ok(presetBlock(finT,P('anthropic','opus','sub'))==='額度不夠','訂閱額度不夠 → 額度不夠',presetBlock(finT,P('anthropic','opus','sub')));
  S.wallet=100; ok(presetBlock(ticket('fe',4),P('anthropic','opus','api'))==='錢包不夠','錢包 NT$100、Opus API → 錢包不夠'); S.wallet=8000;
  ok(presetBlock(finT,P('anthropic','sonnet','corp'))==='','都沒問題 → 可用');
  newRun('laravel','parallel'); S.jobs=[{b:'local',left:1,hrs:1,issue:{}}];
  ok(presetBlock(ticket('fe',2),P('local','qwen','local'))==='本地 GPU 忙','平行模式本地 GPU 有人在跑 → 本地 GPU 忙');
  newRun('laravel'); S.outage='deepseek';
  let pf=presetFor(finT); ok(pf.i===1&&pf.skip.length===1&&pf.skip[0].i===0&&pf.skip[0].r==='今日當機','照 A→B→C 用第一個能用的，當機優先於案主禁用',JSON.stringify(pf));
  S.outage=null; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'deepseek',m:'chat',b:'api'}));
  ok(presetFor(finT).i===-1,'三組都不能用 → -1');
});

section("一鍵派工",()=>{
  /* 一鍵派工 */
  newRun('laravel'); S.presets=presetsOf(); S.hours=8;
  const f2=fin(); S.issues=[f2]; render();
  ok(els.app.innerHTML.includes('一鍵派工：方案 B')&&els.app.innerHTML.includes('A 不能用：金融客戶禁用'),'金融客戶卡片顯示方案 B 與 A 的原因');
  ok(quick(f2.id)&&sel.v==='anthropic'&&sel.m==='sonnet'&&sel.b==='corp','金融客戶一鍵派工用方案 B');
  ok(S.log.some(l=>l.msg.includes('一鍵派工用方案 B（略過 A：金融客戶禁用）')),'紀錄寫出略過 A 的原因');
  newRun('laravel'); S.hours=8; S.presets=DEFAULT_PRESETS.map(p=>({...p,v:'deepseek',m:'chat',b:'api'}));
  const f3=fin(); S.issues=[f3]; render();
  ok(/<button class="qk" disabled><b>沒有可用方案/.test(els.app.innerHTML),'都不能用時按鈕停用、顯示沒有可用方案');
  ok(!quick(f3.id)&&S.issues.includes(f3),'都不能用時一鍵派工不動作');
  newRun('laravel'); S.hours=8; S.presets=presetsOf();
  const sens=ticket('fe',2,{sens:true}); S.issues=[sens]; render();
  ok(els.app.innerHTML.includes('一鍵派工：方案 A')&&els.app.innerHTML.includes('60% 機率被資安稽核'),'機敏工單不跳過個人 API，改顯示稽核風險');
  newRun('laravel','parallel'); S.hours=8; S.slots=2; const fj=()=>({v:'anthropic',M:model('anthropic','sonnet'),b:'api',left:1,hrs:1,issue:{title:'x',due:20}}); S.jobs=[fj(),fj()];
  const full=ticket('fe',2); S.issues=[full]; render();
  ok(new RegExp(`data-quick="${full.id}" disabled`).test(els.app.innerHTML)&&!quick(full.id),'工作槽滿了一鍵派工停用');
  newRun('laravel'); S.hours=.1; const late=ticket('fe',1); S.issues=[late]; ok(!quick(late.id),'不到 0.2h 不能一鍵派工');
});

section("存成／載入方案",()=>{
  /* 存成／載入方案 */
  newRun('laravel'); S.hours=8; const keep=ticket('fe',2); S.issues=[keep]; sel.issue=keep.id;
  Object.assign(sel,{v:'google',m:'pro',b:'corp',rv:0}); savePreset(1);
  ok(same(S.presets[1],{v:'google',m:'pro',b:'corp',rv:0,ef:1,sdd:2})&&S.issues.includes(keep),'存成方案 B 不會派工');
  Object.assign(sel,{v:'anthropic',m:'haiku',b:'api',rv:2}); loadPreset(1);
  ok(sel.v==='google'&&sel.m==='pro'&&sel.b==='corp'&&sel.rv===0&&sel.issue===keep.id,'載入方案 B 回到 google/pro/corp/0，選取的工單不變');
  render(); ok(els.app.innerHTML.includes('data-save="2"')&&els.app.innerHTML.includes('載入方案 C'),'派工台有存成與載入按鈕');
  loadPreset(2); render(); const eC=est(keep,'anthropic','opus',2);
  ok(els.app.innerHTML.includes(`${kt(eC.lo)}–${kt(eC.hi)}`)&&els.app.innerHTML.includes(`${Math.round(eC.pe*100)}%`),'載入方案 C 後預估改用 Opus＋嚴格審核重算');
});
