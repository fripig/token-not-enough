// 規則檢查的共用載入與 helper（非遊戲本體）
// 每個 tools/check/<spec>.test.js 第一行 import 這個檔：先裝假 DOM、設種子，再載入遊戲入口，順序和瀏覽器一樣。
// node:test 讓每個檔各自開一個 process，所以每個檔都從剛載入的遊戲、同一個 CHECK_SEED 開始。
import {test} from 'node:test';
import '../fake-dom.js';
import '../check-seed.js';
// main.js 載入時會呼叫 boot()／start()
import '../../public/js/main.js';
// 另一份沒玩過的 state.js：用來測第一次 fresh() 的預設值（主模組的 S 已經被 start() 設過）
export const pristine=await import('../../public/js/state.js?pristine');

let fails=null, count=0;
/* 一條斷言：不符時印出 ✗ 並記下來，區段照樣跑完 */
export function ok(cond,name,detail=''){
  if(!fails) throw new Error(`ok() 只能在 section() 裡呼叫：${name}`);
  count++;
  if(!cond){fails.push(name);console.log('✗',name,detail);}
}
export function near(a,b,eps=1e-9){return Math.abs(a-b)<=eps;}
/* 一個區段是一個 node:test 測試：裡面有任何一條 ok() 不符，跑完後這個測試失敗並列出不符的斷言 */
export function section(name,fn){
  test(name,async t=>{
    fails=[]; count=0;
    try{ await fn(); }
    finally{
      const bad=fails; fails=null;
      t.diagnostic(`${count-bad.length}/${count} 條斷言通過`);
      if(bad.length) throw new Error(`${bad.length} 條斷言不符：\n${bad.join('\n')}`);
    }
  });
}
/* 去掉 JS 註解（保留字串、模板字串與 ${} 裡的程式），換行照留；i18n 檢查用 */
export function stripComments(src){
  let out='',i=0; const st=[]; // st：'`' 在模板字串裡、數字是 ${} 內的大括號深度
  while(i<src.length){
    const c=src[i],n=src[i+1],top=st[st.length-1];
    if(top==='`'){
      out+=c; if(c==='\\'){out+=n||'';i+=2;continue;}
      if(c==='`')st.pop(); else if(c==='$'&&n==='{'){out+=n;i+=2;st.push(0);continue;}
      i++; continue;
    }
    if(c==="'"||c==='"'){let j=i+1; while(j<src.length&&src[j]!==c&&src[j]!=='\n'){if(src[j]==='\\')j++; j++;} out+=src.slice(i,j+1); i=j+1; continue;}
    if(c==='`'){st.push('`');out+=c;i++;continue;}
    if(c==='/'&&n==='/'){while(i<src.length&&src[i]!=='\n')i++; continue;}
    if(c==='/'&&n==='*'){const e=src.indexOf('*/',i+2); const body=src.slice(i,e<0?src.length:e+2); out+=body.replace(/[^\n]/g,''); i+=body.length; continue;}
    if(typeof top==='number'){if(c==='{')st[st.length-1]++; else if(c==='}'){if(top===0){st.pop();out+=c;i++;continue;} st[st.length-1]--;}}
    out+=c; i++;
  }
  return out;
}
