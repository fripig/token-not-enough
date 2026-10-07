// 平衡模擬器（非遊戲本體）
const el=()=>({innerHTML:'',hidden:true,addEventListener(){},querySelector(){return null},onclick:null});
const els={app:el(),ov:el(),mo:el()};
global.document={getElementById:id=>els[id]};
global.localStorage={getItem(){return null},setItem(){}};
// 用法：node tools/sim.js [public/js/game.js | 單檔 .html]
// 讀入遊戲腳本，用假的 DOM 跑自動玩家，兩種模式 × 三種審核等級各跑 200 個月，印出抽樣結果。
const file=process.argv[2]||require('path').join(__dirname,'..','public','js','game.js');
const raw=require('fs').readFileSync(file,'utf8');
const src=file.endsWith('.html')?raw.match(/<script>([\s\S]*)<\/script>/)[1]:raw;
eval(src+`
for(const mode of ['parallel','serial']){
 for(let g=0;g<200;g++){
  start(); S.mode=mode; S.subs.anthropic='max5'; S.wallet-=3300; S.st.subFee+=3300;
  let guard=0;
  while(S.day<=20&&guard++<2000){
    let acted=true;
    while(acted){acted=false;
      const free=S.issues.filter(i=>!i.running);
      if(free.length&&S.hours>.3&&(!PAR()||S.jobs.length<S.slots)){
        sel.issue=free[0].id; sel.rv=g%3; const dsOk=!cnBlock(free[0],'deepseek',model('deepseek','chat')); sel.v=dsOk?'deepseek':'anthropic'; sel.m=dsOk?'chat':'sonnet'; dispatchPanel(); if(dsOk)sel.b='api'; else sel.b=quotaLeft('sub','anthropic')>300?'sub':'corp'; if(sel.b==='corp'&&S.corp<=0) sel.b='api';
        const before=S.hours; dispatch(); acted=S.hours!==before||PAR();
        if(!PAR()&&S.hours===before)acted=false;
      } else if(PAR()&&S.jobs.length&&S.hours>0){ wait(true); acted=true; }
    }
    const d=S.day; endDay(); if(d===20)break;
  }
  if(g<3||g===199){const self=S.st.subFee+S.st.api;console.log(mode,'rv',g%3,'caught',S.st.caught,'cnBan',S.cnBan,'ds',Math.round(S.st.tk.deepseek),'ant',Math.round(S.st.tk.anthropic),'kpi',S.kpi,'done',S.st.done,'late',S.st.late,'trust',Math.round(S.trust),'self',Math.round(self),'corp',Math.round(S.st.corp),'conf',S.st.conflicts, 'grade', els.mo.innerHTML.match(/class="g">(.)/)?.[1]);}
 }
}`);
