// whats-new 的規則檢查：docs/spectra/specs/whats-new/spec.md
import {ok,section,newRun,ticket,clickMo} from './lib.js';
import {els} from '../fake-dom.js';
import {boot} from '../../public/js/main.js';
import * as St from '../../public/js/state.js';
import * as I from '../../public/js/i18n.js';
import {NEWS,NEWS_KEY,unseenNews} from '../../public/js/news.js';
import {store,resetStore} from '../fake-dom.js';
import {SAVE_KEY,S} from '../../public/js/state.js';
import {DICT as zh} from '../../public/js/i18n/zh-TW.js';
import {DICT as en} from '../../public/js/i18n/en.js';

section('Update entries：id、日期與兩種語言的文字',()=>{
  const ids=NEWS.map(n=>n.id);
  ok(new Set(ids).size===ids.length,'whats-new：id 不重複',ids.join());
  ok(NEWS.every(n=>/^\d{4}-\d{2}-\d{2}$/.test(n.date)),'whats-new：日期是 YYYY-MM-DD');
  ok(NEWS.every((n,i)=>i===0||n.date<=NEWS[i-1].date),'whats-new：日期由新到舊、不會變新');
  ok(NEWS.length===22&&ids[0]==='gh-66-01'&&ids[21]==='gh-32-01'&&NEWS[21].date==='2026-10-10','whats-new：第一版 22 筆，從 gh-32-01（2026-10-10）到 gh-66-01',`${NEWS.length} ${ids[0]} ${ids.at(-1)}`);
  ok(NEWS_KEY==='tokgame-news','whats-new：看過的記在 tokgame-news');
  const digits=s=>(s.match(/\d+/g)||[]).join(',');
  for(const {id} of NEWS){
    const k=`news.${id}`;
    ok(typeof zh[k]==='string'&&zh[k]&&typeof en[k]==='string'&&en[k],`whats-new：${id} 中英文都有文字`);
    ok(digits(zh[k]||'')===digits(en[k]||''),`whats-new：${id} 中英數字相同`,`${zh[k]} ／ ${en[k]}`);
  }
  ok(['news.title','news.ok','news.more','rules.tab.news'].every(k=>zh[k]&&en[k]),'whats-new：彈窗標題、按鈕與分頁名稱中英都有');
});

section('Seen marker：哪些算沒看過',()=>{
  const ids=a=>a.map(n=>n.id).join();
  const all=ids(NEWS), top=NEWS[0].id;
  const rows=[
    ['什麼都沒有',{},'',top],
    ['只有 tokgame-lang',{'tokgame-lang':'en'},'',top],
    ['有存檔、沒有記錄',{[SAVE_KEY]:'{}'},all,undefined],
    ['有最高分、沒有記錄',{'tokgame-best-parallel-laravel':'9000'},all,undefined],
    ['記錄是第三筆',{[NEWS_KEY]:NEWS[2].id},ids(NEWS.slice(0,2)),NEWS[2].id],
    ['記錄是最新一筆',{[NEWS_KEY]:top},'',top],
    ['記錄不在清單裡',{[NEWS_KEY]:'gh-00-00'},'','gh-00-00'],
  ];
  for(const [name,seed,want,mark] of rows){
    resetStore(seed); const got=ids(unseenNews());
    ok(got===want,`whats-new：${name} → 沒看過的筆數 ${want?want.split(',').length:0}`,got);
    ok(store[NEWS_KEY]===mark,`whats-new：${name} → 載入後的記錄`,store[NEWS_KEY]);
  }
  /* 讀 localStorage 失敗：當沒有、不寫 */
  const ls=globalThis.localStorage; let wrote=false;
  globalThis.localStorage={getItem(){throw new Error('blocked');},setItem(){wrote=true;},get length(){return 0;},key:()=>null};
  let got=null, threw=false; try{got=unseenNews();}catch(e){threw=true;}
  globalThis.localStorage=ls;
  ok(!threw&&got.length===0&&!wrote,'whats-new：讀 localStorage 失敗 → 沒有沒看過的、什麼都不寫');
  resetStore();
});

section("What's-new modal on page load：開頁先看更新，關掉接回原本的彈窗",()=>{
  const SV=SAVE_KEY, top=NEWS[0].id;
  const SETUP='月初：決定這個月怎麼付 token', isNews=()=>els.mo.innerHTML.includes('<h2>最近更新</h2>')&&!els.ov.hidden;
  const rows=()=>(els.mo.innerHTML.match(/<li>/g)||[]).length;
  /* 第 7 天的存檔，回傳原始字串 */
  const save7=()=>{newRun(['laravel','rust'],'parallel'); S.day=7; S.issues=[ticket('laravel',1)];
    resetStore(); St.saveGame({rep:['早上報告第 7 天'],ev:null,monday:false}); const raw=store[SV]; St.fresh(); return raw;};
  /* 老玩家有存檔：列最新 5 筆＋還有 17 筆，知道了之後是第 7 天的繼續彈窗 */
  const raw=save7(); const ev=[]; globalThis.gtag=(k,n)=>ev.push(n); const logN=S.log.length;
  boot();
  ok(isNews()&&rows()===5&&NEWS.slice(0,5).every(n=>els.mo.innerHTML.includes(n.date)&&els.mo.innerHTML.includes(zh[`news.${n.id}`]))&&els.mo.innerHTML.includes('還有 17 筆更新'),'whats-new：有存檔、沒有記錄 → 列最新 5 筆與「還有 17 筆更新」',rows());
  ok(!(NEWS_KEY in store),'whats-new：彈窗開著時還沒寫記錄');
  clickMo({act:'newsok'});
  ok(els.mo.innerHTML.includes('繼續上一局')&&els.mo.innerHTML.includes('第 7 天')&&store[NEWS_KEY]===top,'whats-new：知道了 → 第 7 天的繼續彈窗、記錄是最新一筆');
  ok(ev.length===0&&S.log.length===logN&&store[SV]===raw,'whats-new：開關彈窗不送 GA、不寫紀錄、存檔不變',ev.join());
  /* 看過一次：重新整理直接是繼續彈窗 */
  boot(); ok(!isNews()&&els.mo.innerHTML.includes('繼續上一局'),'whats-new：看過後重新整理不再跳');
  /* 記錄是第三筆、沒有存檔：列兩筆、沒有還有，知道了 → 開局設定 */
  resetStore({[NEWS_KEY]:NEWS[2].id}); boot();
  ok(isNews()&&rows()===2&&!els.mo.innerHTML.includes('newsmore'),'whats-new：記錄是第三筆 → 列兩筆、沒有「還有」',rows());
  clickMo({act:'newsok'}); ok(els.mo.innerHTML.includes(SETUP)&&store[NEWS_KEY]===top,'whats-new：知道了 → 開局設定');
  /* 壞存檔、沒有記錄：先更新，知道了 → 讀不到存檔 */
  resetStore({[SV]:'{"ver":0}'}); boot();
  ok(isNews(),'whats-new：壞存檔、沒有記錄 → 先開最近更新');
  clickMo({act:'newsok'}); ok(els.mo.innerHTML.includes('存檔無法讀取'),'whats-new：知道了 → 讀不到存檔的提示');
  /* 第一次來：直接開局設定、記錄最新一筆 */
  resetStore(); boot();
  ok(!isNews()&&els.mo.innerHTML.includes(SETUP)&&store[NEWS_KEY]===top,'whats-new：第一次來 → 直接開局設定、記成看過最新一筆');
  /* 英文 */
  resetStore({'tokgame-best-serial-laravel':'100'}); I.setLang('en'); boot();
  const CJK=/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;
  ok(els.mo.innerHTML.includes("<h2>What's new</h2>")&&els.mo.innerHTML.includes('Got it')&&els.mo.innerHTML.includes('17 more updates')&&els.mo.innerHTML.includes(NEWS[0].date)&&!CJK.test(els.mo.innerHTML),'whats-new：英文彈窗沒有中文、日期照 YYYY-MM-DD');
  I.setLang('zh-TW'); delete globalThis.gtag; resetStore();
});

section('Resume on page load：知道了之後繼續跟原本一樣',()=>{
  newRun('laravel','parallel'); S.day=4; S.issues=[ticket('laravel',2)];
  resetStore(); St.saveGame({rep:['第 4 天的早上報告'],ev:null,monday:false}); St.fresh();
  boot(); clickMo({act:'newsok'}); clickMo({act:'resume'});
  ok(S.day===4&&els.mo.innerHTML.includes('第 4 天的早上報告')&&!els.ov.hidden,'whats-new：知道了 → 繼續 → 第 4 天與早上報告');
  resetStore();
});
