// 規則檢查的共用載入與 helper（非遊戲本體）
// 每個 tools/check/<spec>.test.js 第一行 import 這個檔：先裝假 DOM、設種子，再載入遊戲入口，順序和瀏覽器一樣。
// node:test 讓每個檔各自開一個 process，所以每個檔都從剛載入的遊戲、同一個 CHECK_SEED 開始。
import {test} from 'node:test';
import {els} from '../fake-dom.js';
import '../check-seed.js';
// main.js 載入時會呼叫 boot()／start()
import {start} from '../../public/js/main.js';
import {BASE,CLIENTS,KPI,model} from '../../public/js/data.js';
import {S,nextId,sel} from '../../public/js/state.js';
// 另一份沒玩過的 state.js：用來測第一次 fresh() 的預設值（主模組的 S 已經被 start() 設過）
export const pristine=await import('../../public/js/state.js?pristine');
// 設好種子的 Math.random；暫時換掉亂數的測試用它還原
const R0=Math.random;

// 開一局但不經過彈窗：直接設定公司與模式
export const newRun=(company,mode='serial')=>{start();S.companies=[].concat(company);S.mode=mode;S.issues=[];S.jobs=[];sel.rv=0;};
export const ticket=(stack,cx,extra={})=>({id:nextId(),title:'t',cx,base:BASE[cx],inc:false,sens:false,big:false,client:CLIENTS[0],due:20,kpi:KPI[cx],tries:0,stack,store:false,...extra});
/* 依序回傳 seq 裡的值，用完後一直回傳最後一個 */
export const withRand=(seq,f)=>{const a=[].concat(seq);let i=0;Math.random=()=>a[Math.min(i++,a.length-1)];try{return f();}finally{Math.random=R0;}};
/* 模擬點彈窗、主畫面上帶 data-* 的按鈕（走 main.js 的事件委派） */
export const clickMo=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
export const clickApp=ds=>els.app.on.click({target:{closest:()=>({dataset:ds,disabled:false})}});
/* 不經過 makeJob 直接組一個 job，給 settle 用 */
export const job=(is,v,m,b,extra={})=>({issue:is,v,b,M:model(v,m),mul:1,rv:0,tk:100,hrs:1,ok:true,caught:false,left:0,hidden:false,stop:false,sdd:false,...extra});

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
    fails=[]; count=0; let err=null;
    try{ await fn(); }catch(e){ err=e; }
    const bad=fails; fails=null;
    t.diagnostic(`${count-bad.length}/${count} 條斷言通過`);
    // 區段中途丟出例外時保留原本的錯誤（常是搬移後少了前一段的準備），已不符的斷言附在訊息後面
    if(err){ if(bad.length&&err instanceof Error) err.message+=`\n（之前另有 ${bad.length} 條斷言不符：${bad.join('、')}）`; throw err; }
    if(bad.length) throw new Error(`${bad.length} 條斷言不符：\n${bad.join('\n')}`);
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
