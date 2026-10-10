// client-restrictions 的規則檢查：docs/spectra/specs/client-restrictions/spec.md
import {ok,section,newRun,ticket} from './lib.js';
import {els} from '../fake-dom.js';
import {CLIENTS,cnBlock,model} from '../../public/js/data.js';
import {S,makeIssue} from '../../public/js/state.js';
import {render} from '../../public/js/view.js';

section("client-restrictions：案主分布",()=>{
  /* client-restrictions：案主分布 */
  {
  newRun('laravel'); const N=10000, cc={};
  for(let i=0;i<N;i++){const n=makeIssue(false).client.name; cc[n]=(cc[n]||0)+1;}
  ok([['內部專案',.42],['新創客戶',.18],['金融客戶',.18],['政府標案',.22]].every(([n,w])=>Math.abs((cc[n]||0)/N-w)<=.02),'client-restrictions：案主比例在 ±0.02 內',JSON.stringify(cc));
  ok([...Array(300)].map(()=>makeIssue(true)).every(i=>i.client.name==='內部專案'),'client-restrictions：事故單都是內部專案');
  /* 禁用規則 */
  const cl=n=>CLIENTS.find(c=>c.name===n), tk=n=>ticket('fe',2,{client:cl(n)}), blk=(is,v,m)=>cnBlock(is,v,model(v,m));
  const fin=tk('金融客戶'), gov=tk('政府標案'), su=tk('新創客戶');
  ok(['deepseek/chat','zhipu/air','moonshot/k2'].every(x=>blk(fin,...x.split('/'))==='金融客戶禁用')&&blk(fin,'local','qwen')==='','client-restrictions：金融客戶禁中國雲端、Qwen 可用');
  ok(['deepseek/reasoner','zhipu/glm','moonshot/k2'].every(x=>blk(gov,...x.split('/'))==='政府標案禁用')&&blk(gov,'local','qwen')==='中國權重禁用'&&blk(gov,'local','gemma')==='','client-restrictions：政府標案連 Qwen 都禁、Gemma 可用');
  ok(blk(su,'deepseek','chat')===''&&blk(su,'local','qwen')==='','client-restrictions：沒有禁令時都能用');
  S.cnBan=true;
  ok(blk(su,'deepseek','chat')==='公司政策禁用'&&blk(su,'local','qwen')==='','client-restrictions：全公司禁令下中國雲端顯示公司政策禁用、Qwen 可用');
  ok(blk(gov,'local','oss')===''&&blk(gov,'local','gemma')==='','client-restrictions：Gemma 4 26B A4B 與 Gemma 4 E4B 永遠不會被禁');
  S.hw.spark=S.hw.mac=true; ok(blk(gov,'local','gemma4')===''&&blk(gov,'local','qcnext')==='中國權重禁用'&&blk(gov,'local','glm53')==='中國權重禁用','client-restrictions：政府標案下 Gemma 4 31B 可用，Qwen3-Coder-Next、GLM-5.3 中國權重禁用'); S.hw.spark=S.hw.mac=false;
  /* 卡片標籤 */
  const card=id=>{const h=els.app.innerHTML; const st=h.indexOf(`data-iss="${id}"`); return h.slice(st,h.indexOf('</button>',st));};
  const inn=tk('內部專案'); S.issues=[inn,gov,fin,su]; render();
  ok(card(inn.id).includes('chip ban">禁中國雲端')&&card(gov.id).includes('chip ban">政府標案・禁中國模型')&&card(fin.id).includes('chip ban">金融客戶・禁中國雲端'),'client-restrictions：全公司禁令下的卡片標籤');
  S.cnBan=false; render();
  ok(card(su.id).includes('<span class="chip">新創客戶</span>')&&card(inn.id).includes('<span class="chip">內部專案</span>'),'client-restrictions：沒有禁令時顯示案主名稱');
  }
});
