// 平衡模擬器（非遊戲本體）
// 用法：node tools/sim.js
// 載入遊戲模組，用假的 DOM 跑自動玩家：兩種模式 × 六種工作內容 × 三種審核等級各跑 N 個月（預設 100，可用 SIM_N 調整），
// 印出抽樣結果，最後每個模式 × 工作內容印一行平均分、對照同模式 Laravel 的差距與評等分布。
// SIM_TRAP=<比例> 可覆寫陷阱題比例（例如 SIM_TRAP=0 關掉陷阱）；SIM_SLOTS=2..6 指定平行模式工作槽數。
// SIM_INVEST=1 讓自動玩家做工程投資：每天開工時依序買 CLAUDE.md（每條主技術線）、單元測試、CI 流水線與 pre-commit hook（只在平行模式）、導入 SDD 裡下一項付得起的。
// SIM_INVEST=2 再加買上架自動化（有選 App 才買）、監控告警、secret scanning，量新投資的效果；SIM_INV_EXTRA=monitor,scan 之類可只加買指定的幾項（fastlane、monitor、scan），拿來逐項量。
// SIM_CONF=1 讓自動玩家去國內研討會（要搭配 SIM_INVEST）：第 1、6、11 天報名第一個付得起的場次（涵蓋第一條主技術線的技術線場、台灣人工智慧年會、HWDC、HITCON、其他），
// 每天先買開放了的 Lv2（已買 Lv1 的 CLAUDE.md、單元測試、secret scanning、做 skills）和下一級提升 agent 能力，再買 SIM_INVEST 的投資。
// SIM_SDD2=1（要搭配 SIM_INVEST）讓自動玩家在 SIM_INVEST 的投資都買完、已有導入 SDD Lv1 之後，買 SDD 框架（Lv2）。
// SIM_SDD_PICK=1 讓自動玩家每張單選 SDD：顯示複雜度 ≤2 選不用，其他選已買的最高級。沒開時自動玩家不動 SDD 選擇（一律已買的最高級）。
// SIM_OUTSOURCE=1 開啟接外包：外包單一律走個人 API（能用 DeepSeek 就用，否則 Sonnet）。
// SIM_EFFORT=1 開啟進階模式：每張單看選到模型的原始能力減顯示複雜度，≤ −1 用高強度、≥ 2 用低強度、其他用中。
// SIM_SEATS=1..3 量團隊席位的上限：在第 6、11、16 天依序直接給 Anthropic、OpenAI、Google 席位（不經申請與信任審核，當作信任一直夠），給到指定個數；
// 有席位時公司工單刷第一個今日席位額度還超過 300k 的廠商，用它能力 4 的模型（Sonnet、Codex Sol、Gemini Pro），外包單照舊走個人 API。
// SIM_LUNA=1 讓自動玩家在 DeepSeek 被禁、又沒用席位時改派 Codex Luna（個人 API），不派 Sonnet，量 Luna 的影響（預設的自動玩家只有 Anthropic 當機被自動改派時才會用到 Luna，不會派 Astra）。
// SIM_HAIKU=1 讓自動玩家在 DeepSeek 被禁、又沒用席位時改派 Claude Haiku 不派 Sonnet，付費方式照 Sonnet 的規則（訂閱額度夠用訂閱，否則公司 API），量 Haiku 的影響。
// SIM_HW=1 讓自動玩家採購電腦（照真實的信任審核）：每天開工時沒有待審申請、且信任已達門檻，就依序申請 DGX Spark、PC、Mac Studio；DeepSeek 被禁、又沒用席位時，本地 GPU 有空（或單線模式）就改派解鎖的本地模型：
// 複雜度 ≥4 且案主允許時用 GLM-5.3，否則 Qwen3-Coder-Next，政府標案用 Gemma 4 31B；跑不完（單線超過今天工時、平行今天到期跑不完）的模型略過，沒有能用的才照舊。買了沒用照樣每台每天扣信任。
// SIM_SUB=pro200|pro500 讓自動玩家改訂 OpenAI 的 Pro 200 或 Pro 500（不訂 Anthropic Max 5×，照價付月費）：OpenAI 沒當機、今日訂閱額度還超過 300k 時，
// 每張單（公司與外包）都派 Codex Sol 走個人訂閱；額度不夠才照舊（能用 DeepSeek 就用，否則 Sonnet，沒有 Anthropic 訂閱所以走公司 API）。
// SIM_UPGRADE=1 讓自動玩家存錢升級：第 6、11、16 天（週一）開工時，錢包付得起差價又能留 NT$1,500 給個人 API，就把 OpenAI 升到 Pro 500，否則 Pro 200（照剩餘週數補差價）；
// 有 OpenAI 訂閱後照 SIM_SUB 的派法（今日額度還超過 300k 就派 Codex Sol 走個人訂閱）。量「接外包→存錢→升級」這條路，和 SIM_OUTSOURCE=1 一起用。
// SIM_UPGRADE=2 同上，但升到 Pro 500 之後就不再接外包單（放著逾期只賠錢、不扣分）。
// SIM_RESEARCH_RATE=<比例> 可覆寫研究單比例（例如 SIM_RESEARCH_RATE=0 關掉研究單，亂數序列和沒有研究單時一樣）。
// SIM_RESEARCH=agent|self 讓自動玩家遇到研究單時先研究再派工：agent 用它本來要派的廠商、模型與付費方式研究，self 自己研究；不能研究（例如工時不夠）時照舊直接派工。預設的自動玩家一律直接派工。
// SIM_COMBOS=1 改跑十五種雙選組合（另跑單選 Laravel 當對照）。
// SIM_SEED=<整數> 用固定種子取代 Math.random，同一個種子每次輸出都一樣（重構時拿來比對行為有沒有變）。
// SIM_LOG=1 每種模式額外印出月底執行紀錄的筆數（平均、最多）與存檔 JSON 的字元數（平均、最多），量紀錄整月保留後的大小。
import {els} from './fake-dom.js';
import './sim-seed.js';
// 先載入入口模組，模組初始化順序才會和瀏覽器一樣（main.js 載入時會呼叫 start()）
import {firstIssues,start} from '../public/js/main.js';
import {COMPANIES,HW,HW_KEYS,SEAT,VENDORS,cnBlock,model,CONF,CONF_KEYS,CONF_LAST_DAY} from '../public/js/data.js';
import {START,S,sel,setResearchRate,setTrapRate} from '../public/js/state.js';
import {est,hwBlock,localBusy,quotaLeft} from '../public/js/calc.js';
import {PAR,dispatch,endDay,invest,requestHw,research,researchBlock,wait,confBlock,invLevel,investBlock,registerConf} from '../public/js/actions.js';
import {dispatchPanel} from '../public/js/view.js';
// 自動玩家不記最高分（和改成模組前一樣）
globalThis.localStorage={getItem(){return null},setItem(){}};

const TRAP=process.env.SIM_TRAP===undefined?undefined:Number(process.env.SIM_TRAP);
if(TRAP!==undefined&&(process.env.SIM_TRAP.trim()===''||!Number.isFinite(TRAP))){ console.error(`SIM_TRAP 必須是數字，收到「${process.env.SIM_TRAP}」`); process.exit(1); }
const RRATE=process.env.SIM_RESEARCH_RATE===undefined?undefined:Number(process.env.SIM_RESEARCH_RATE);
if(RRATE!==undefined&&(process.env.SIM_RESEARCH_RATE.trim()===''||!Number.isFinite(RRATE)||RRATE<0||RRATE>1)){ console.error(`SIM_RESEARCH_RATE 必須是 0–1 的數字，收到「${process.env.SIM_RESEARCH_RATE}」`); process.exit(1); }
const RSCH=process.env.SIM_RESEARCH;
if(RSCH!==undefined&&!['agent','self'].includes(RSCH)){ console.error(`SIM_RESEARCH 只能是 agent 或 self，收到「${RSCH}」`); process.exit(1); }
const N=+process.env.SIM_N||100;
const INV=['1','2'].includes(process.env.SIM_INVEST)?+process.env.SIM_INVEST:0;
const EXTRA=(process.env.SIM_INV_EXTRA||'fastlane,monitor,scan').split(',');
if(!EXTRA.every(k=>['fastlane','monitor','scan'].includes(k))){ console.error(`SIM_INV_EXTRA 只能是 fastlane、monitor、scan，收到「${process.env.SIM_INV_EXTRA}」`); process.exit(1); }
const CONFSIM=process.env.SIM_CONF==='1';
const SDD2=process.env.SIM_SDD2==='1', SDD_PICK=process.env.SIM_SDD_PICK==='1';
if(CONFSIM&&!INV){ console.error('SIM_CONF 要搭配 SIM_INVEST=1 或 2'); process.exit(1); }
if(SDD2&&!INV){ console.error('SIM_SDD2 要搭配 SIM_INVEST=1 或 2'); process.exit(1); }
const COMBOS=process.env.SIM_COMBOS==='1';
const OUT=process.env.SIM_OUTSOURCE==='1';
const EFF=process.env.SIM_EFFORT==='1';
const LUNA=process.env.SIM_LUNA==='1';
const HAIKU=process.env.SIM_HAIKU==='1';
const HWSIM=process.env.SIM_HW==='1', HW_ORDER=['spark','pc','mac'];
/* SIM_HW：這張單能用的解鎖本地模型（沒有就回傳 undefined） */
const hwModel=is=>{
  if(PAR()&&localBusy()) return;
  /* 跑不完會被中止：單線模式超過今天剩的工時、平行模式今天到期又跑不完，都不派 */
  const ok=m=>{const M=model('local',m), h=est(is,'local',m,sel.rv).hrs;return !hwBlock(M)&&!cnBlock(is,'local',M)&&(PAR()?!(is.due<=S.day&&h+.2>S.hours):h<=S.hours);};
  return [...(is.cx>=4?['glm53']:[]),'qcnext','gemma4'].find(ok);
};
// SIM_SLOTS=2..6 指定平行模式的工作槽數（預設 3）
const SLOTS=process.env.SIM_SLOTS===undefined?3:Number(process.env.SIM_SLOTS);
if(![2,3,4,5,6].includes(SLOTS)){ console.error(`SIM_SLOTS 必須是 2–6 的整數，收到「${process.env.SIM_SLOTS}」`); process.exit(1); }
// SIM_SEATS=1..3 給幾個團隊席位（預設 0 = 不給）
const SEATS=process.env.SIM_SEATS===undefined?0:Number(process.env.SIM_SEATS);
if(![0,1,2,3].includes(SEATS)||(process.env.SIM_SEATS!==undefined&&!['1','2','3'].includes(process.env.SIM_SEATS.trim()))){ console.error(`SIM_SEATS 必須是 1–3 的整數，收到「${process.env.SIM_SEATS}」`); process.exit(1); }
const SEAT_DAYS=[6,11,16], SEAT_MODEL={anthropic:'sonnet',openai:'std',google:'pro'};
// SIM_SUB=pro200|pro500 改訂 OpenAI 方案（Pro 200 的方案 id 是 pro）
const SUB={pro200:'pro',pro500:'pro500'}[process.env.SIM_SUB];
if(process.env.SIM_SUB!==undefined&&!SUB){ console.error(`SIM_SUB 只能是 pro200 或 pro500，收到「${process.env.SIM_SUB}」`); process.exit(1); }
const SUB_PRICE=SUB&&VENDORS.openai.plans.find(p=>p.id===SUB).price;
if(SUB_PRICE>START.wallet){ console.error(`SIM_SUB=${process.env.SIM_SUB} 的月費 ${SUB_PRICE} 超過起始錢包 ${START.wallet}，開局付不起`); process.exit(1); }

// SIM_UPGRADE=1 週一存錢升級 OpenAI（留 UPG_RESERVE 給個人 API）
const UPG=process.env.SIM_UPGRADE==='1'||process.env.SIM_UPGRADE==='2', UPG_STOP=process.env.SIM_UPGRADE==='2', UPG_DAYS=[6,11,16], UPG_RESERVE=1500;
const oaiPrice=id=>VENDORS.openai.plans.find(p=>p.id===id).price;

const LOG=process.env.SIM_LOG==='1', logs={};

function sim(){
  if(TRAP!==undefined) setTrapRate(TRAP);
  if(RRATE!==undefined) setResearchRate(RRATE);
  const sum={};
  for(const mode of ['parallel','serial']){
    const runs=COMBOS?['laravel',...COMPANIES.flatMap((a,i)=>COMPANIES.slice(i+1).map(b=>a+'+'+b))]:COMPANIES;
    for(const company of runs){
      for(let g=0;g<N*3;g++){
        start(); S.companies=company.split('+'); S.outsource=OUT; S.advanced=EFF; firstIssues();
        S.mode=mode; if(mode==='parallel')S.slots=SLOTS;
        if(SUB){ S.subs.openai=SUB; S.wallet-=SUB_PRICE; S.st.subFee+=SUB_PRICE; }
        else{ S.subs.anthropic='max5'; S.wallet-=3300; S.st.subFee+=3300; }
        let guard=0;
        while(S.day<=20&&guard++<2000){
          const skip=new Set();
          if(UPG&&UPG_DAYS.includes(S.day)){
            const wl=4-Math.floor((S.day-1)/5), cur=oaiPrice(S.subs.openai);
            const up=['pro500','pro'].find(id=>oaiPrice(id)>cur&&(oaiPrice(id)-cur)*wl/4<=S.wallet-UPG_RESERVE);
            if(up){const c=(oaiPrice(up)-cur)*wl/4; S.subs.openai=up; S.wallet-=c; S.st.subFee+=c;}
          }
          const sk=SEAT_DAYS.indexOf(S.day); if(sk>=0&&sk<SEATS&&!S.seats.includes(SEAT.vendors[sk])) S.seats.push(SEAT.vendors[sk]);
          if(HWSIM&&!S.hwReq){const k=HW_ORDER.find(k=>!S.hw[k]); if(k&&S.trust>=HW[k].trust) requestHw(k);}
          if(CONFSIM){
            if((S.day-1)%5===0&&S.day<=CONF_LAST_DAY&&!S.conf.req){
              const pri=[...CONF_KEYS.filter(k=>CONF[k].cat==='stack'&&CONF[k].stacks.includes(S.companies[0])),'taiwanai','hwdc','hitcon',...CONF_KEYS];
              const k=pri.find(k=>!confBlock(k)); if(k) registerConf(k);
            }
            const up=[...S.companies.map(st=>['md',st]),['tests'],['scan'],['skills']].filter(([k,st])=>invLevel(k,st)===1).concat([['ai']]).find(([k,st])=>!investBlock(k,st));
            if(up) invest(...up);
          }
          if(INV){
            const list=[...S.companies.map(k=>['md',k]),['tests'],...(PAR()?[['ci'],['hook']]:[]),['sdd'],
              ...(INV===2?EXTRA.filter(k=>k!=='fastlane'||S.companies.includes('app')).map(k=>[k]):[])];
            const next=list.find(([k,st])=>!(k==='md'?S.inv.md[st]:S.inv[k]));
            if(next) invest(...next);
            else if(SDD2&&invLevel('sdd')===1&&!investBlock('sdd')) invest('sdd');
          }
          let acted=true;
          while(acted){acted=false;
            const free=S.issues.filter(i=>!i.running&&!skip.has(i.id)&&!(UPG_STOP&&i.out&&S.subs.openai==='pro500'));
            if(free.length&&S.hours>.3&&(!PAR()||S.jobs.length<S.slots)){
              sel.issue=free[0].id; sel.rv=g%3;
              if(SDD_PICK) sel.sdd=free[0].cx<=2?0:2;
              const dsOk=!cnBlock(free[0],'deepseek',model('deepseek','chat'));
              const seatV=SEATS&&!free[0].out?S.seats.find(v=>quotaLeft('seat',v)>300):undefined;
              const alt=LUNA?['openai','mini']:['anthropic',HAIKU?'haiku':'sonnet'];
              const subOk=(SUB||UPG&&S.subs.openai!=='none')&&S.outage!=='openai'&&quotaLeft('sub','openai')>300;
              const hm=HWSIM&&!subOk&&!seatV&&!dsOk?hwModel(free[0]):undefined;
              if(subOk){ sel.v='openai'; sel.m='std'; }
              else{ sel.v=seatV||(dsOk?'deepseek':hm?'local':alt[0]); sel.m=seatV?SEAT_MODEL[seatV]:dsOk?'chat':hm||alt[1]; }
              dispatchPanel();
              if(EFF){const gap=model(sel.v,sel.m).cap-free[0].cx; sel.ef=gap<=-1?2:gap>=2?0:1;}
              if(subOk)sel.b='sub'; else if(hm)sel.b='local'; else if(seatV)sel.b='seat'; else if(dsOk||free[0].out||LUNA)sel.b='api'; else sel.b=quotaLeft('sub','anthropic')>300?'sub':'corp';
              if(sel.b==='corp'&&S.corp<=0) sel.b='api';
              /* 錢包見底時個人 API 不能用：改走 Anthropic 訂閱或公司 API（外包單不能用公司），都不行就派本地 Gemma */
              if(sel.b==='api'&&S.wallet<=0){
                const fb=quotaLeft('sub','anthropic')>300?'sub':S.corp>0&&!free[0].out?'corp':'';
                if(fb){ sel.v='anthropic'; sel.m=HAIKU?'haiku':'sonnet'; sel.b=fb; }
                else{ sel.v='local'; sel.m='gemma'; sel.b='local'; }
              }
              /* SIM_RESEARCH：研究單先研究，拆出來的單下一輪照順序派 */
              if(RSCH&&free[0].research&&!researchBlock(free[0],RSCH)){ research(RSCH); acted=true; continue; }
              const before=S.hours, n0=S.jobs.length; dispatch(); acted=S.hours!==before||PAR();
              if(!PAR()&&S.hours===before)acted=false;
              /* 平行模式派不出去（付費方式不能用、本地 GPU 忙）的單今天略過，換下一張 */
              if(PAR()&&S.jobs.length===n0&&S.hours===before) skip.add(free[0].id);
            } else if(PAR()&&S.jobs.length&&S.hours>0){ wait(true); acted=true; }
          }
          const d=S.day; endDay(); if(d===20)break;
        }
        const html=els.mo.innerHTML;
        const grade=html.match(/class="g">(.)/)?.[1];
        const score=+html.match(/總分<\/span><span>(-?[\d,]+)/)[1].replace(/,/g,'');
        const k=mode+' '+company; sum[k]??={n:0,tot:0,g:{}};
        sum[k].n++; sum[k].tot+=score; sum[k].g[grade]=(sum[k].g[grade]||0)+1;
        if(LOG)(logs[mode]??=[]).push([S.log.length,JSON.stringify({S,sel}).length]);
        if(g<3){const self=S.st.subFee+S.st.api;console.log(mode,company,'rv',g%3,'caught',S.st.caught,'cnBan',S.cnBan,'ds',Math.round(S.st.tk.deepseek),'ant',Math.round(S.st.tk.anthropic),'kpi',S.kpi,'done',S.st.done,'late',S.st.late,'trust',Math.round(S.trust),'self',Math.round(self),'corp',Math.round(S.st.corp),'conf',S.st.conflicts,'out',S.st.outDone+'/'+S.st.outLate,'outIncome',S.st.outIncome,...(LUNA||SUB||UPG?['oai',Math.round(S.st.tk.openai)]:[]),...(HWSIM?['hw',HW_KEYS.filter(k=>S.hw[k]).join('+')||'none','local',Math.round(S.st.tk.local)]:[]),...(SEATS?['seats',S.seats.join('+'),'oai',Math.round(S.st.tk.openai),'goog',Math.round(S.st.tk.google)]:[]),'grade',grade);}
      }
    }
  }
  console.log('\n=== 平均分（對照同模式的 Laravel）===');
  for(const k in sum){
    const mode=k.split(' ')[0], m=sum[k].tot/sum[k].n, base=sum[mode+' laravel'].tot/sum[mode+' laravel'].n;
    console.log(k.padEnd(22),'mean',String(Math.round(m)).padStart(6),'vs laravel',((m/base-1)*100).toFixed(1).padStart(6)+'%','grades','SABCD'.split('').map(x=>x+':'+(sum[k].g[x]||0)).join(' '));
  }
  if(LOG){
    console.log('\n=== 月底執行紀錄（SIM_LOG）===');
    for(const mode in logs){const r=logs[mode], avg=i=>Math.round(r.reduce((t,x)=>t+x[i],0)/r.length), max=i=>Math.max(...r.map(x=>x[i]));
      console.log(mode.padEnd(9),'局數',r.length,'紀錄筆數 平均',avg(0),'最多',max(0),'存檔字元 平均',avg(1),'最多',max(1));}
  }
}

sim();
