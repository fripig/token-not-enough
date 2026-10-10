// 給 tools/check.js、tools/sim.js 用的假 DOM：要在載入遊戲模組之前 import
/* 記下事件處理器與 querySelector 後的 setAttribute，check.js 用來模擬點擊、確認按鈕被停用 */
const el=()=>({innerHTML:'',hidden:true,on:{},attrs:[],addEventListener(t,f){this.on[t]=f;},querySelector(s){const o=this;return {setAttribute(k,v){o.attrs.push([s,k,v]);}};},setAttribute(){},onclick:null});
/* 頁尾：每種語言一個 [data-lang] 區塊，跟 index.html 一樣預設只顯示繁中（applyLang 的檢查用） */
const footer=[{dataset:{lang:'zh-TW'},hidden:false},{dataset:{lang:'en'},hidden:true}];
export const els={app:el(),ov:el(),mo:el(),about:{blocks:footer,querySelectorAll:s=>s==='[data-lang]'?footer:[]}};
export const store={};
/* 換掉整個 localStorage 內容（check.js 用來模擬已存的最高分） */
export const resetStore=(seed={})=>{for(const k in store)delete store[k];Object.assign(store,seed);};
globalThis.document={getElementById:id=>els[id],documentElement:{lang:''},title:''};
/* node 自帶 navigator.language（Node 24 是 en-US）；固定成繁中，check.js、sim.js 的輸出才不會變成英文 */
Object.defineProperty(globalThis,'navigator',{value:{language:'zh-TW',languages:['zh-TW']},configurable:true,writable:true});
globalThis.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
