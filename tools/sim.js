// 平衡模擬器（非遊戲本體）
// 用法：node tools/sim.js
// 載入遊戲模組，用假的 DOM 跑自動玩家：兩種模式 × 四家公司 × 三種審核等級各跑 N 個月（預設 100，可用 SIM_N 調整），
// 印出抽樣結果，最後每個模式 × 公司印一行平均分、對照同模式 Laravel 的差距與評等分布。
// SIM_TRAP=<比例> 可覆寫陷阱題比例（例如 SIM_TRAP=0 關掉陷阱）；SIM_SLOTS=2..6 指定平行模式工作槽數。
// SIM_INVEST=1 讓自動玩家做工程投資：每天開工時依序買 CLAUDE.md（每條主技術線）、單元測試、CI 流水線與 pre-commit hook（只在平行模式）、導入 SDD 裡下一項付得起的。
// SIM_INVEST=2 再加買上架自動化（有選 App 才買）、監控告警、secret scanning，量新投資的效果；SIM_INV_EXTRA=monitor,scan 之類可只加買指定的幾項（fastlane、monitor、scan），拿來逐項量。
// SIM_OUTSOURCE=1 開啟接外包：外包單一律走個人 API（能用 DeepSeek 就用，否則 Sonnet）。
// SIM_EFFORT=1 開啟進階模式：每張單看選到模型的原始能力減顯示複雜度，≤ −1 用高強度、≥ 2 用低強度、其他用中。
// SIM_SEATS=1..3 量團隊席位的上限：在第 6、11、16 天依序直接給 Anthropic、OpenAI、Google 席位（不經申請與信任審核，當作信任一直夠），給到指定個數；
// 有席位時公司工單刷第一個今日席位額度還超過 300k 的廠商，用它能力 4 的模型（Sonnet、Codex 標準、Gemini Pro），外包單照舊走個人 API。
// SIM_COMBOS=1 改跑六種雙選組合（另跑單選 Laravel 當對照）。
// SIM_SEED=<整數> 用固定種子取代 Math.random，同一個種子每次輸出都一樣（重構時拿來比對行為有沒有變）。
import {els} from './fake-dom.js';
import './seed.js';
// 先載入入口模組，模組初始化順序才會和瀏覽器一樣（main.js 載入時會呼叫 start()）
import {firstIssues,start} from '../public/js/main.js';
import {COMPANIES,SEAT,cnBlock,model} from '../public/js/data.js';
import {S,sel,setTrapRate} from '../public/js/state.js';
import {quotaLeft} from '../public/js/calc.js';
import {PAR,dispatch,endDay,invest,wait} from '../public/js/actions.js';
import {dispatchPanel} from '../public/js/view.js';
// 自動玩家不記最高分（和改成模組前一樣）
globalThis.localStorage={getItem(){return null},setItem(){}};

const TRAP=process.env.SIM_TRAP===undefined?undefined:Number(process.env.SIM_TRAP);
if(TRAP!==undefined&&(process.env.SIM_TRAP.trim()===''||!Number.isFinite(TRAP))){ console.error(`SIM_TRAP 必須是數字，收到「${process.env.SIM_TRAP}」`); process.exit(1); }
const N=+process.env.SIM_N||100;
const INV=['1','2'].includes(process.env.SIM_INVEST)?+process.env.SIM_INVEST:0;
const EXTRA=(process.env.SIM_INV_EXTRA||'fastlane,monitor,scan').split(',');
if(!EXTRA.every(k=>['fastlane','monitor','scan'].includes(k))){ console.error(`SIM_INV_EXTRA 只能是 fastlane、monitor、scan，收到「${process.env.SIM_INV_EXTRA}」`); process.exit(1); }
const COMBOS=process.env.SIM_COMBOS==='1';
const OUT=process.env.SIM_OUTSOURCE==='1';
const EFF=process.env.SIM_EFFORT==='1';
// SIM_SLOTS=2..6 指定平行模式的工作槽數（預設 3）
const SLOTS=process.env.SIM_SLOTS===undefined?3:Number(process.env.SIM_SLOTS);
if(![2,3,4,5,6].includes(SLOTS)){ console.error(`SIM_SLOTS 必須是 2–6 的整數，收到「${process.env.SIM_SLOTS}」`); process.exit(1); }
// SIM_SEATS=1..3 給幾個團隊席位（預設 0 = 不給）
const SEATS=process.env.SIM_SEATS===undefined?0:Number(process.env.SIM_SEATS);
if(![0,1,2,3].includes(SEATS)||(process.env.SIM_SEATS!==undefined&&!['1','2','3'].includes(process.env.SIM_SEATS.trim()))){ console.error(`SIM_SEATS 必須是 1–3 的整數，收到「${process.env.SIM_SEATS}」`); process.exit(1); }
const SEAT_DAYS=[6,11,16], SEAT_MODEL={anthropic:'sonnet',openai:'std',google:'pro'};

function sim(){
  if(TRAP!==undefined) setTrapRate(TRAP);
  const sum={};
  for(const mode of ['parallel','serial']){
    const runs=COMBOS?['laravel',...COMPANIES.flatMap((a,i)=>COMPANIES.slice(i+1).map(b=>a+'+'+b))]:COMPANIES;
    for(const company of runs){
      for(let g=0;g<N*3;g++){
        start(); S.companies=company.split('+'); S.outsource=OUT; S.advanced=EFF; firstIssues();
        S.mode=mode; if(mode==='parallel')S.slots=SLOTS; S.subs.anthropic='max5'; S.wallet-=3300; S.st.subFee+=3300;
        let guard=0;
        while(S.day<=20&&guard++<2000){
          const sk=SEAT_DAYS.indexOf(S.day); if(sk>=0&&sk<SEATS&&!S.seats.includes(SEAT.vendors[sk])) S.seats.push(SEAT.vendors[sk]);
          if(INV){
            const list=[...S.companies.map(k=>['md',k]),['tests'],...(PAR()?[['ci'],['hook']]:[]),['sdd'],
              ...(INV===2?EXTRA.filter(k=>k!=='fastlane'||S.companies.includes('app')).map(k=>[k]):[])];
            const next=list.find(([k,st])=>!(k==='md'?S.inv.md[st]:S.inv[k]));
            if(next) invest(...next);
          }
          let acted=true;
          while(acted){acted=false;
            const free=S.issues.filter(i=>!i.running);
            if(free.length&&S.hours>.3&&(!PAR()||S.jobs.length<S.slots)){
              sel.issue=free[0].id; sel.rv=g%3;
              const dsOk=!cnBlock(free[0],'deepseek',model('deepseek','chat'));
              const seatV=SEATS&&!free[0].out?S.seats.find(v=>quotaLeft('seat',v)>300):undefined;
              sel.v=seatV||(dsOk?'deepseek':'anthropic'); sel.m=seatV?SEAT_MODEL[seatV]:dsOk?'chat':'sonnet'; dispatchPanel();
              if(EFF){const gap=model(sel.v,sel.m).cap-free[0].cx; sel.ef=gap<=-1?2:gap>=2?0:1;}
              if(seatV)sel.b='seat'; else if(dsOk||free[0].out)sel.b='api'; else sel.b=quotaLeft('sub','anthropic')>300?'sub':'corp';
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
        if(g<3){const self=S.st.subFee+S.st.api;console.log(mode,company,'rv',g%3,'caught',S.st.caught,'cnBan',S.cnBan,'ds',Math.round(S.st.tk.deepseek),'ant',Math.round(S.st.tk.anthropic),'kpi',S.kpi,'done',S.st.done,'late',S.st.late,'trust',Math.round(S.trust),'self',Math.round(self),'corp',Math.round(S.st.corp),'conf',S.st.conflicts,'out',S.st.outDone+'/'+S.st.outLate,'outIncome',S.st.outIncome,...(SEATS?['seats',S.seats.join('+'),'oai',Math.round(S.st.tk.openai),'goog',Math.round(S.st.tk.google)]:[]),'grade',grade);}
      }
    }
  }
  console.log('\n=== 平均分（對照同模式的 Laravel）===');
  for(const k in sum){
    const mode=k.split(' ')[0], m=sum[k].tot/sum[k].n, base=sum[mode+' laravel'].tot/sum[mode+' laravel'].n;
    console.log(k.padEnd(22),'mean',String(Math.round(m)).padStart(6),'vs laravel',((m/base-1)*100).toFixed(1).padStart(6)+'%','grades','SABCD'.split('').map(x=>x+':'+(sum[k].g[x]||0)).join(' '));
  }
}

sim();
