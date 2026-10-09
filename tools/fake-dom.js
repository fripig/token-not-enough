// 給 tools/check.js、tools/sim.js 用的假 DOM：要在載入遊戲模組之前 import
const el=()=>({innerHTML:'',hidden:true,addEventListener(){},querySelector(){return null},setAttribute(){},onclick:null});
export const els={app:el(),ov:el(),mo:el()};
export const store={};
/* 換掉整個 localStorage 內容（check.js 用來模擬已存的最高分） */
export const resetStore=(seed={})=>{for(const k in store)delete store[k];Object.assign(store,seed);};
globalThis.document={getElementById:id=>els[id]};
globalThis.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}};
