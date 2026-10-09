// 給 tools/check.js、tools/sim.js 用的假 DOM：要在載入遊戲模組之前 import
/* 記下事件處理器與 querySelector 後的 setAttribute，check.js 用來模擬點擊、確認按鈕被停用 */
const el=()=>({innerHTML:'',hidden:true,on:{},attrs:[],addEventListener(t,f){this.on[t]=f;},querySelector(s){const o=this;return {setAttribute(k,v){o.attrs.push([s,k,v]);}};},setAttribute(){},onclick:null});
export const els={app:el(),ov:el(),mo:el()};
export const store={};
/* 換掉整個 localStorage 內容（check.js 用來模擬已存的最高分） */
export const resetStore=(seed={})=>{for(const k in store)delete store[k];Object.assign(store,seed);};
globalThis.document={getElementById:id=>els[id]};
globalThis.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
