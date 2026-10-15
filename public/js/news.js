import {SAVE_KEY} from './state.js';
import {mo,ov} from './view.js';
import {t} from './i18n.js';
import {showRules} from './rules.js';

/* ===== 最近更新（gh-66-01-whats-new）=====
   玩家看得到的更新，新的在前；文字在字典的 news.<id>。id 是上線那個 change 的名稱前綴。
   只能在最前面加，不能刪也不能調順序：tokgame-news 記的是看過的最新一筆 id。 */
export const NEWS=[
  {id:'gh-66-01',date:'2026-10-16'},
  {id:'gh-65-01',date:'2026-10-16'},
  {id:'gh-64-01',date:'2026-10-15'},
  {id:'gh-63-01',date:'2026-10-14'},
  {id:'gh-48-01',date:'2026-10-11'},
  {id:'gh-54-01',date:'2026-10-11'},
  {id:'gh-53-01',date:'2026-10-11'},
  {id:'gh-46-03',date:'2026-10-11'},
  {id:'gh-45-01',date:'2026-10-11'},
  {id:'gh-51-01',date:'2026-10-11'},
  {id:'gh-46-02',date:'2026-10-11'},
  {id:'gh-44-01',date:'2026-10-11'},
  {id:'gh-43-01',date:'2026-10-11'},
  {id:'gh-42-01',date:'2026-10-11'},
  {id:'gh-41-01',date:'2026-10-11'},
  {id:'gh-40-01',date:'2026-10-11'},
  {id:'gh-39-01',date:'2026-10-11'},
  {id:'gh-38-01',date:'2026-10-11'},
  {id:'gh-36-01',date:'2026-10-10'},
  {id:'gh-34-01',date:'2026-10-10'},
  {id:'gh-33-01',date:'2026-10-10'},
  {id:'gh-32-01',date:'2026-10-10'},
];
export const NEWS_KEY='tokgame-news';
/* 有這些 key 就算上線前來過的老玩家：存檔或任何一個最高分 */
export const BEST_PREFIX='tokgame-best-';
/* 沒看過的更新（新的在前）。沒有記錄時：老玩家全部沒看過；第一次來的直接記成看過最新一筆、不顯示。
   記錄的 id 不在清單裡就當全部看過；讀 localStorage 失敗也當沒有、什麼都不寫 */
export function unseenNews(){
  try{
    const seen=localStorage.getItem(NEWS_KEY);
    if(seen===null){
      let back=localStorage.getItem(SAVE_KEY)!==null;
      for(let i=0;!back&&i<localStorage.length;i++) back=String(localStorage.key(i)).startsWith(BEST_PREFIX);
      if(!back){localStorage.setItem(NEWS_KEY,NEWS[0].id); return [];}
      return NEWS.slice();
    }
    const i=NEWS.findIndex(n=>n.id===seen);
    return i<0?[]:NEWS.slice(0,i);
  }catch(e){return [];}
}
export function markNewsSeen(){try{localStorage.setItem(NEWS_KEY,NEWS[0].id);}catch(e){}}
/* 開頁彈窗最多列幾筆，超過的用「還有 N 筆更新」 */
export const NEWS_MAX=5;
/* 一筆一行：日期（各語言都是 YYYY-MM-DD）＋目前語言的一句話；規則的「更新」分頁也用 */
export const newsList=list=>`<ul class="rules news">${list.map(n=>`<li><span class="ndate">${n.date}</span> ${t(`news.${n.id}`)}</li>`).join('')}</ul>`;
/* 開頁的最近更新彈窗：next 是沒有這個彈窗時本來要開的（繼續、壞檔或開局） */
export function showNews(list,next){
  const more=list.length-NEWS_MAX;
  mo.innerHTML=`<h2>${t('news.title')}</h2>
  ${newsList(list.slice(0,NEWS_MAX))}
  <div class="actions"><button class="btn primary" data-act="newsok">${t('news.ok')}</button>${more>0?`<button class="btn ghost" data-act="newsmore">${t('news.more',{n:more})}</button>`:''}</div>`;
  ov.hidden=false;
  mo.onclick=e=>{const bt=e.target.closest('button');if(!bt)return;
    if(bt.dataset.act==='newsok'){markNewsSeen();next();}
    /* 規則的「更新」分頁，關閉後一樣接回原本要開的彈窗 */
    if(bt.dataset.act==='newsmore'){markNewsSeen();showRules(next,'news');}};
}
