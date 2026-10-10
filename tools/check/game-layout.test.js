// game-layout 的規則檢查：docs/spectra/specs/game-layout/spec.md
import {ok,section,newRun,ticket,clickApp} from './lib.js';
import {readFileSync} from 'node:fs';
import {els,store} from '../fake-dom.js';
import {S,sel,saveGame,SAVE_KEY} from '../../public/js/state.js';
import {log} from '../../public/js/calc.js';
import {start} from '../../public/js/main.js';
import {dispatch,invest,endDay} from '../../public/js/actions.js';
import {render,dispatchPanel} from '../../public/js/view.js';

/* 主畫面切成「動作列之前」與「動作列」兩段 */
const split=()=>{const h=els.app.innerHTML, i=h.indexOf('<div class="dock">');return {before:i<0?h:h.slice(0,i), dock:i<0?'':h.slice(i)};};
const acts=['wait1','waitn','adjust','end'];

section('game-layout：下班與等待按鈕在畫面底部的動作列',()=>{
  newRun('laravel','parallel'); render();
  const {before,dock}=split();
  ok(dock!==''&&els.app.innerHTML.trimEnd().endsWith('</div></div>')&&dock.split('<div class="dock">').length===2&&!dock.includes('<section'),'game-layout：動作列是主畫面最後一個元素');
  ok(dock.includes('第 1 天')&&dock.includes('9:00'),'game-layout：平行模式動作列寫出第 1 天與 9:00',dock.slice(0,200));
  ok(acts.every(a=>dock.includes(`data-act="${a}"`)),'game-layout：平行模式第 1 天動作列有等 1 小時、等下一個、調整訂閱、下班');
  ok(/data-act="waitn" disabled/.test(dock),'game-layout：沒有 agent 在跑時「等到下一個完成」停用');
  ok(dock.includes('下班，結束第 1 天'),'game-layout：下班按鈕寫第 1 天');
  ok(acts.every(a=>!before.includes(`data-act="${a}"`)),'game-layout：執行紀錄區沒有這些按鈕');

  newRun('laravel'); S.day=2; S.hours=6.4; render();
  const s=split();
  ok(s.dock.includes('第 2 天')&&s.dock.includes('6.4h'),'game-layout：單線模式動作列寫出第 2 天與 6.4h');
  ok(!s.dock.includes('data-act="wait1"')&&!s.dock.includes('data-act="waitn"')&&!s.dock.includes('data-act="adjust"')&&s.dock.includes('下班，結束第 2 天'),'game-layout：單線第 2 天沒有等待與調整訂閱，有第 2 天的下班');

  newRun('laravel','parallel'); render(); clickApp({act:'end'});
  ok(S.day===2,'game-layout：點動作列的下班會結束這一天',`day=${S.day}`);
});

section('game-layout：派工台沒選工單時顯示剛剛的紀錄',()=>{
  const recent=()=>{const h=dispatchPanel(), i=h.indexOf('<div class="recent">');return i<0?[]:[...h.slice(i).matchAll(/<p class="(\w*)">([^<]*)<\/p>/g)].map(m=>[m[1],m[2]]);};
  newRun('laravel','parallel'); S.log=[]; sel.issue=null;
  ok(recent().length===0&&dispatchPanel().includes('先從工單佇列選一張'),'game-layout：紀錄是空的時只有提示');
  log('dim','一'); log('ok','二');
  const r2=recent();
  ok(r2.length===2&&r2[0][0]==='ok'&&r2[0][1].endsWith('二')&&r2[1][0]==='dim'&&r2[1][1].endsWith('一'),'game-layout：2 筆紀錄全部顯示、新的在上、帶原本的顏色',JSON.stringify(r2));
  for(const m of ['三','四','五','六','七'])log('bad',m);
  const r7=recent();
  ok(r7.length===3&&r7.map(x=>x[1].slice(-1)).join('')==='七六五','game-layout：7 筆紀錄只顯示最新 3 筆',JSON.stringify(r7));

  const qt=ticket('fe',1); S.issues=[qt]; sel.issue=qt.id;
  ok(!dispatchPanel().includes('class="recent"')&&dispatchPanel().includes('data-act="go"'),'game-layout：選了工單時換成派工控制、沒有「剛剛」');
  newRun('laravel','parallel'); S.hours=8; const is=ticket('fe',1); S.issues=[is]; sel.issue=is.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0}); dispatch();
  const rd=recent();
  ok(sel.issue===null,'game-layout：派工後不自動選下一張');
  ok(rd.length>0&&rd[0][1]===S.log[0].msg&&S.log[0].msg.includes('派出'),'game-layout：派工後派工台第一筆是那張單的派工紀錄',JSON.stringify(rd[0]));
});

const css=readFileSync(new URL('../../public/css/style.css',import.meta.url),'utf8').replace(/\s+/g,'');
section('game-layout：深色模式的彈窗遮罩讓畫面變暗',()=>{
  const root=css.match(/^[\s\S]*?:root\{([^}]*)\}/)?.[1]||'';
  ok(root.includes('--scrim:color-mix(insrgb,#17212B45%,transparent)'),'game-layout：淺色主題 --scrim 維持原本的 ink 45%');
  const dark=[...css.matchAll(/(?:prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\)|:root\[data-theme="dark"\])\{([^}]*)\}/g)].map(m=>m[1]);
  ok(dark.length===2&&dark.every(b=>b.includes('--scrim:rgb(000/.6)')),'game-layout：兩個深色區塊的 --scrim 都是黑色 60%',`${dark.length}`);
  ok(/\.ov\{[^}]*background:var\(--scrim\)/.test(css),'game-layout：彈窗遮罩用 --scrim');
});

section('game-layout：選項按鈕文字靠左',()=>{
  ok(/(^|\})\.sb\{[^}]*text-align:left/.test(css),'game-layout：.sb 設 text-align:left');
  ok(/\.dock\{[^}]*position:sticky/.test(css)&&/\.dock\{[^}]*bottom:0/.test(css),'game-layout：動作列 sticky 在底部');
});

section('game-layout：派工台與工程投資是同一欄的兩個分頁',()=>{
  const h=()=>els.app.innerHTML;
  const panelHidden=id=>new RegExp(`data-tabpanel="${id}"[^>]*hidden`).test(h());
  const active=()=>(h().match(/aria-selected="true"[^>]*data-tab="(\w+)"|data-tab="(\w+)"[^>]*aria-selected="true"/)||[]).slice(1).find(Boolean);
  newRun('laravel','parallel'); S.hours=8; const is=ticket('fe',1); S.issues=[is]; render();
  ok((h().match(/role="tablist"/g)||[]).length===1&&h().includes('data-tab="dispatch"')&&h().includes('data-tab="invest"'),'game-layout：有一組分頁，派工台與工程投資');
  ok(active()==='dispatch'&&!panelHidden('dispatch')&&panelHidden('invest'),'game-layout：預設在派工台，投資分頁藏起來',active());
  ok(!h().includes('data-act="invfold"'),'game-layout：沒有投資面板收合按鈕');
  clickApp({tab:'invest'});
  ok(active()==='invest'&&panelHidden('dispatch')&&!panelHidden('invest'),'game-layout：點工程投資分頁切過去');
  clickApp({inv:'tests'});
  ok(active()==='invest'&&/data-tab="invest"[^>]*>[^<]*<small>已做 1 項<\/small>/.test(h()),'game-layout：買了投資留在投資分頁，標籤寫已做 1 項');
  S.day=2; clickApp({conf:'coscup'}); ok(active()==='invest'&&S.conf.req==='coscup','game-layout：報名研討會留在投資分頁');
  S.trust=70; clickApp({hw:'pc'}); ok(active()==='invest'&&S.hwReq?.k==='pc','game-layout：申請採購電腦留在投資分頁');
  clickApp({iss:is.id});
  ok(active()==='dispatch'&&sel.issue===is.id&&!panelHidden('dispatch'),'game-layout：在投資分頁點工單切回派工台並選好那張');
  clickApp({tab:'invest'}); endDay();
  ok(active()==='dispatch','game-layout：換日回到派工台');
  clickApp({tab:'invest'}); start();
  ok(active()==='dispatch','game-layout：開新局回到派工台');
  newRun('laravel'); render(); saveGame(null); const snap=JSON.stringify(S), sv=store[SAVE_KEY], n=S.log.length, g0=globalThis.gtag, ev=[]; globalThis.gtag=(...a)=>ev.push(a);
  clickApp({tab:'invest'}); clickApp({tab:'dispatch'}); clickApp({tab:'invest'}); saveGame(null); globalThis.gtag=g0;
  ok(JSON.stringify(S)===snap&&store[SAVE_KEY]===sv&&S.log.length===n&&ev.length===0,'game-layout：切分頁不改狀態、存檔、紀錄，不送 GA');
});
