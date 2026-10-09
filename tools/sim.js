// 平衡模擬器（非遊戲本體）
// 用法：node tools/sim.js [public/js/game.js | 單檔 .html]
// 讀入遊戲腳本，用假的 DOM 跑自動玩家：兩種模式 × 四家公司 × 三種審核等級各跑 N 個月（預設 100，可用 SIM_N 調整），
// 印出抽樣結果，最後每個模式 × 公司印一行平均分、對照同模式 Laravel 的差距與評等分布。
// SIM_TRAP=<比例> 可覆寫陷阱題比例（例如 SIM_TRAP=0 關掉陷阱）；SIM_SLOTS=2..6 指定平行模式工作槽數。
// SIM_INVEST=1 讓自動玩家做工程投資：每天開工時依序買 CLAUDE.md（每條主技術線）、補測試、導入 SDD 裡下一項付得起的。
// SIM_COMBOS=1 改跑六種雙選組合（另跑單選 Laravel 當對照）。
const el=()=>({innerHTML:'',hidden:true,addEventListener(){},querySelector(){return null},onclick:null});
const els={app:el(),ov:el(),mo:el()};
global.document={getElementById:id=>els[id]};
global.localStorage={getItem(){return null},setItem(){}};
const file=process.argv[2]||require('path').join(__dirname,'..','public','js','game.js');
const raw=require('fs').readFileSync(file,'utf8');
let src=file.endsWith('.html')?raw.match(/<script>([\s\S]*)<\/script>/)[1]:raw;
// SIM_TRAP=0 關掉陷阱題，用來和有陷阱時比較
if(process.env.SIM_TRAP!==undefined){
  const rate=Number(process.env.SIM_TRAP), next=src.replace(/const TRAP_RATE=[\d.]+;/,`const TRAP_RATE=${rate};`);
  if(process.env.SIM_TRAP.trim()===''||!Number.isFinite(rate)){ console.error(`SIM_TRAP 必須是數字，收到「${process.env.SIM_TRAP}」`); process.exit(1); }
  if(next===src){ console.error('SIM_TRAP：找不到 const TRAP_RATE=…; 這行，沒辦法覆寫陷阱比例'); process.exit(1); }
  src=next;
}
const N=+process.env.SIM_N||100;
const INV=process.env.SIM_INVEST==='1';
const COMBOS=process.env.SIM_COMBOS==='1';
// SIM_SLOTS=2..6 指定平行模式的工作槽數（預設 3）
const SLOTS=process.env.SIM_SLOTS===undefined?3:Number(process.env.SIM_SLOTS);
if(![2,3,4,5,6].includes(SLOTS)){ console.error(`SIM_SLOTS 必須是 2–6 的整數，收到「${process.env.SIM_SLOTS}」`); process.exit(1); }

function sim(){
  const sum={};
  for(const mode of ['parallel','serial']){
    const runs=typeof COMPANIES==='undefined'?['laravel']:COMBOS?['laravel',...COMPANIES.flatMap((a,i)=>COMPANIES.slice(i+1).map(b=>a+'+'+b))]:COMPANIES;
    for(const company of runs){
      for(let g=0;g<N*3;g++){
        start(); if(typeof firstIssues==='function'){S.companies=company.split('+');firstIssues();}
        S.mode=mode; if(mode==='parallel')S.slots=SLOTS; S.subs.anthropic='max5'; S.wallet-=3300; S.st.subFee+=3300;
        let guard=0;
        while(S.day<=20&&guard++<2000){
          if(INV&&typeof invest==='function'){
            const next=[...S.companies.map(k=>['md',k]),['tests'],['sdd']].find(([k,st])=>!(k==='md'?S.inv.md[st]:S.inv[k]));
            if(next) invest(...next);
          }
          let acted=true;
          while(acted){acted=false;
            const free=S.issues.filter(i=>!i.running);
            if(free.length&&S.hours>.3&&(!PAR()||S.jobs.length<S.slots)){
              sel.issue=free[0].id; sel.rv=g%3;
              const dsOk=!cnBlock(free[0],'deepseek',model('deepseek','chat'));
              sel.v=dsOk?'deepseek':'anthropic'; sel.m=dsOk?'chat':'sonnet'; dispatchPanel();
              if(dsOk)sel.b='api'; else sel.b=quotaLeft('sub','anthropic')>300?'sub':'corp';
              if(sel.b==='corp'&&S.corp<=0) sel.b='api';
              const before=S.hours; dispatch(); acted=S.hours!==before||PAR();
              if(!PAR()&&S.hours===before)acted=false;
            } else if(PAR()&&S.jobs.length&&S.hours>0){ wait(true); acted=true; }
          }
          const d=S.day; endDay(); if(d===20)break;
        }
        const html=els.mo.innerHTML;
        const grade=html.match(/class="g">(.)/)?.[1];
        const score=+html.match(/總分<\/span><span>(-?[\d,]+)/)[1].replace(/,/g,'');
        const k=mode+' '+company; sum[k]??={n:0,tot:0,g:{}};
        sum[k].n++; sum[k].tot+=score; sum[k].g[grade]=(sum[k].g[grade]||0)+1;
        if(g<3){const self=S.st.subFee+S.st.api;console.log(mode,company,'rv',g%3,'caught',S.st.caught,'cnBan',S.cnBan,'ds',Math.round(S.st.tk.deepseek),'ant',Math.round(S.st.tk.anthropic),'kpi',S.kpi,'done',S.st.done,'late',S.st.late,'trust',Math.round(S.trust),'self',Math.round(self),'corp',Math.round(S.st.corp),'conf',S.st.conflicts,'grade',grade);}
      }
    }
  }
  console.log('\n=== 平均分（對照同模式的 Laravel）===');
  for(const k in sum){
    const mode=k.split(' ')[0], m=sum[k].tot/sum[k].n, base=sum[mode+' laravel'].tot/sum[mode+' laravel'].n;
    console.log(k.padEnd(22),'mean',String(Math.round(m)).padStart(6),'vs laravel',((m/base-1)*100).toFixed(1).padStart(6)+'%','grades','SABCD'.split('').map(x=>x+':'+(sum[k].g[x]||0)).join(' '));
  }
}

eval(src+'\n;('+sim.toString()+')();');
