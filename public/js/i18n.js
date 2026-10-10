import {DICT as zhTW} from './i18n/zh-TW.js';
import {DICT as en} from './i18n/en.js';

/* ===== 多語系 =====
   每種語言一個字典檔（public/js/i18n/<id>.js，export DICT），key 是英文語意代號；
   第一個是預設語言，也是缺 key 時的退回語言。新增語言：加字典檔、在 LANGS 加一行、在 index.html 加一份頁尾。 */
export const LANGS=[{id:'zh-TW',dict:zhTW},{id:'en',dict:en}];
export const LANG_KEY='tokgame-lang';
/* 標頭與開局視窗的語言切換按鈕；關掉就只能靠瀏覽器語言與存的偏好 */
export const LANG_SWITCH=true;
export let lang=LANGS[0].id;

export const dictOf=id=>(LANGS.find(l=>l.id===id)||LANGS[0]).dict;
/* t('key', {name}) 把 {name} 換成參數；目前語言沒有這個 key 就用預設語言，再沒有就回傳 key 本身 */
export function t(key,params){
  let s=dictOf(lang)[key];
  if(typeof s!=='string') s=LANGS[0].dict[key];
  if(typeof s!=='string') return key;
  return params?s.replace(/\{(\w+)\}/g,(m,k)=>k in params?String(params[k]):m):s;
}
/* 陣列（工單題庫）；目前語言沒有就用預設語言整份 */
export function tl(key){
  const a=dictOf(lang)[key];
  return Array.isArray(a)?a:(LANGS[0].dict[key]||[]);
}
/* 存的偏好有註冊就用；否則照瀏覽器語言清單比主標籤（zh-CN 也算 zh-TW）；都沒有就英文 */
export function pickLang(stored,list){
  if(LANGS.some(l=>l.id===stored)) return stored;
  const pri=s=>String(s).toLowerCase().split('-')[0];
  for(const b of list||[]){const hit=LANGS.find(l=>pri(l.id)===pri(b)); if(hit) return hit.id;}
  return LANGS.some(l=>l.id==='en')?'en':LANGS[0].id;
}
/* 開頁時呼叫一次（boot()），不在模組載入時讀 navigator */
export function initLang(){
  let stored=null; try{stored=localStorage.getItem(LANG_KEY);}catch(e){}
  const nav=typeof navigator==='undefined'?null:navigator;
  const list=nav?(nav.languages&&nav.languages.length?nav.languages:[nav.language]):[];
  lang=pickLang(stored,list); applyLang();
}
export function setLang(id){
  if(!LANGS.some(l=>l.id===id)||id===lang) return;  // 點目前的語言不算選擇，不存偏好
  lang=id; try{localStorage.setItem(LANG_KEY,id);}catch(e){}
  applyLang();
}
/* <html lang>、分頁標題、頁尾只顯示目前語言那份；找不到元素（node 工具）就略過 */
export function applyLang(){
  if(typeof document==='undefined') return;
  if(document.documentElement) document.documentElement.lang=lang;
  document.title=t('page.title');
  const f=document.getElementById&&document.getElementById('about');
  if(f&&f.querySelectorAll) f.querySelectorAll('[data-lang]').forEach(el=>{el.hidden=el.dataset.lang!==lang;});
}
