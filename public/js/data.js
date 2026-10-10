import {S} from './state.js';
import {t,tl} from './i18n.js';

/* ===== 資料（數字為遊戲平衡用，非實際報價） ===== */
/* 遊戲版本：部署時 .github/workflows/pages.yml 把 'dev' 換成短 commit hash，本機與 node 工具維持 dev */
export const GAME_VERSION='dev';
export const VENDORS={
  anthropic:{name:'Anthropic',agent:'Claude Code',vc:'--anth',corp:true,
    plans:[{id:'none',get name(){return t('plan.none');},price:0},{id:'pro',name:'Pro',price:650,day:450,week:1800},{id:'max5',name:'Max 5×',price:3300,day:2200,week:9000},{id:'max20',name:'Max 20×',price:6500,day:9000,week:36000}],
    models:[{id:'haiku',name:'Haiku',cap:3,price:.15,w:.3,speed:.7,verb:.9},{id:'sonnet',name:'Sonnet',cap:4,price:.45,w:1,speed:.8,verb:1},{id:'opus',name:'Opus',cap:5,price:.9,w:2,speed:1,verb:.85},{id:'fable',name:'Fable',cap:6,price:1.8,w:4,speed:1.2,verb:.85}]},
  openai:{name:'OpenAI',agent:'Codex CLI',vc:'--oai',corp:false,
    plans:[{id:'none',get name(){return t('plan.none');},price:0},{id:'plus',name:'Plus',price:650,day:500,week:2000},{id:'pro',name:'Pro 200',price:6500,day:8000,week:30000},{id:'pro500',name:'Pro 500',price:16250,day:12500,week:50000}],
    models:[{id:'mini',name:'Luna',cap:3,price:.15,w:.3,speed:.7,verb:1},{id:'std',name:'Sol',cap:4,price:.4,w:1,speed:.8,verb:1.05},{id:'high',name:'Astra',cap:5,price:1.6,w:3,speed:1,verb:.95}]},
  google:{name:'Google',agent:'Gemini CLI',vc:'--goog',corp:true,
    plans:[{id:'none',get name(){return t('plan.none');},price:0},{id:'aipro',name:'AI Pro',price:650,day:700,week:2800},{id:'ultra',name:'Ultra',price:8000,day:10000,week:40000}],
    models:[{id:'flash',name:'Flash',cap:2,price:.06,w:.25,speed:.4,verb:1.1,ctx:true},{id:'pro',name:'Pro',cap:4,price:.35,w:1,speed:.9,verb:1,ctx:true}]},
  deepseek:{name:'DeepSeek',get agent(){return t('agent.deepseek');},vc:'--dsk',corp:false,cn:true,
    plans:[{id:'none',get name(){return t('plan.none');},price:0}],
    models:[{id:'chat',name:'Chat',cap:3,price:.03,w:1,speed:.7,verb:1.15},{id:'reasoner',name:'Reasoner',cap:4,price:.06,w:1,speed:1.2,verb:1.5}]},
  zhipu:{get name(){return t('vendor.zhipu');},get agent(){return t('agent.zhipu');},vc:'--glm',corp:false,cn:true,
    plans:[{id:'none',get name(){return t('plan.none');},price:0},{id:'lite',name:'Lite',price:100,day:1500,week:6000},{id:'pro',name:'Pro',price:500,day:6000,week:24000}],
    models:[{id:'air',name:'GLM Air',cap:3,price:.04,w:.5,speed:.6,verb:1.1},{id:'glm',name:'GLM',cap:4,price:.1,w:1,speed:.9,verb:1.1}]},
  moonshot:{name:'Kimi',agent:'Kimi CLI',vc:'--kimi',corp:false,cn:true,
    plans:[{id:'none',get name(){return t('plan.none');},price:0},{id:'member',get name(){return t('plan.member');},price:300,day:1500,week:6000}],
    models:[{id:'k2',name:'K2',cap:4,price:.12,w:1,speed:.9,verb:1.2}]},
  local:{get name(){return t('vendor.local');},get agent(){return t('agent.local');},vc:'--local',corp:false,plans:[],
    /* 基本款不用買電腦；id 沿用舊名，存檔、派工方案與 GA 不受影響。hw 標記要先買哪台電腦（見 HW） */
    models:[{id:'qwen',name:'Qwen3.6 35B-A3B',cap:3,price:0,w:0,speed:1.7,verb:1.3,cn:true},{id:'gemma',name:'Gemma 4 26B A4B',cap:3,price:0,w:0,speed:1.9,verb:1.25},{id:'oss',name:'Gemma 4 E4B',cap:2,price:0,w:0,speed:1.8,verb:1.2},
      {id:'qcnext',name:'Qwen3-Coder-Next',cap:4,price:0,w:0,speed:1.4,verb:1.2,cn:true,hw:'spark'},{id:'gemma4',name:'Gemma 4 31B',cap:4,price:0,w:0,speed:2,verb:1.2,hw:'spark'},{id:'glm53',name:'GLM-5.3',cap:5,price:0,w:0,speed:2.8,verb:1,cn:true,hw:'mac'}]}
};
export const SUBV=Object.keys(VENDORS).filter(v=>VENDORS[v].plans.length>1);
export const APIV=Object.keys(VENDORS).filter(v=>v!=='local');
export const objOf=(keys,f)=>Object.fromEntries(keys.map(k=>[k,f(k)]));
/* 案主：ban='api' 禁止資料送往中國雲端；ban='all' 連中國開源權重也不能用 */
/* id 給字典用；存檔裡的工單 client 是存檔當下的名稱字串 */
export const CLIENTS=[{id:'internal',get name(){return t('client.internal');},ban:null,w:.42},{id:'startup',get name(){return t('client.startup');},ban:null,w:.18},{id:'finance',get name(){return t('client.finance');},ban:'api',w:.18},{id:'gov',get name(){return t('client.gov');},ban:'all',w:.22}];
export function pickClient(){let r=Math.random();for(const c of CLIENTS){if((r-=c.w)<0)return c;}return CLIENTS[0];}
/* 全公司禁中國雲端只管公司的程式碼，外包單只看案主 */
export function banOf(is){const b=is.client.ban; return b==='all'?'all':(b||(S.cnBan&&!is.out))?'api':null;}
export function cnBlock(is,v,M){
  const b=banOf(is); if(!b) return '';
  if(VENDORS[v].cn) return is.client.ban?t('why.clientBan',{c:is.client.name}):t('why.policyBan');
  if(b==='all'&&M.cn) return t('why.cnWeightsBan');
  return '';
}
export const SEAT={day:2500,week:10000,get name(){return t('seat.name');},vendors:['anthropic','openai','google'],trust:[55,65,75],review:5};
export const BASE=[0,60,180,350,550,850];
export const KPI=[0,3,6,10,16,24];
/* 技術線：前六個是可選的工作內容（主技術線），fe 是每種工作內容都會有的前端工單 */
/* 工單題庫在字典（pool.<技術線>.<1–5|trap|research|inc>），各語言數量與順序相同，同一個亂數抽到對應的標題 */
export const POOL_KEYS=['1','2','3','4','5','trap','research','inc'];
export const poolOf=k=>Object.fromEntries(POOL_KEYS.map(n=>[n,tl(`pool.${k}.${n}`)]));
export const STACKS={
  laravel:{name:'Laravel',get company(){return t('stack.laravel.company');},level:1,get desc(){return t('stack.laravel.desc');},get pool(){return poolOf('laravel');}},
  rails:{name:'Rails',get company(){return t('stack.rails.company');},level:1,get desc(){return t('stack.rails.desc');},get pool(){return poolOf('rails');}},
  rust:{name:'Rust',get company(){return t('stack.rust.company');},level:3,get desc(){return t('stack.rust.desc');},get pool(){return poolOf('rust');}},
  app:{name:'App',get company(){return t('stack.app.company');},level:2,get desc(){return t('stack.app.desc');},get pool(){return poolOf('app');}},
  sre:{name:'SRE',get company(){return t('stack.sre.company');},level:2,get desc(){return t('stack.sre.desc');},get pool(){return poolOf('sre');}},
  devops:{name:'DevOps',get company(){return t('stack.devops.company');},level:2,get desc(){return t('stack.devops.desc');},get pool(){return poolOf('devops');}},
  fe:{get name(){return t('stack.fe.name');},get company(){return t('stack.fe.name');},desc:'',get pool(){return poolOf('fe');}}
};
export const COMPANIES=['laravel','rails','rust','app','sre','devops'];
/* 主技術線可選 1–2 條，固定照 COMPANIES 的順序存；舊版存的單一字串視為只選一條 */
export function normCompanies(c){
  const a=typeof c==='string'?[c]:c;
  const ok=Array.isArray(a)&&a.length>=1&&a.length<=2&&new Set(a).size===a.length&&a.every(k=>COMPANIES.includes(k));
  return ok?COMPANIES.filter(k=>a.includes(k)):['laravel'];
}
export const companyName=(cs=S.companies)=>cs.map(k=>STACKS[k].company).join(t('company.join'));
export const bestKey=()=>`tokgame-best-${S.mode}-${S.companies.join('+')}`;

/* ===== 工具 ===== */
export const R=(a,b)=>a+Math.random()*(b-a);
export const rnd=n=>Math.floor(Math.random()*n);
export const pick=a=>a[rnd(a.length)];
export const nt=n=>(n<0?'-':'')+'NT$'+Math.round(Math.abs(n)).toLocaleString('en-US');
export const kt=k=>{if(k<1000)return Math.round(k)+'k'; const m=(k/1000).toFixed(1); return (+m>=10?m.replace(/\.0$/,''):m)+'M';}; // 留一位小數；四捨五入後 10M 以上結尾 .0 拿掉
export const h1=x=>(Math.round(x*10)/10).toFixed(1);
export const vc=v=>`var(${VENDORS[v].vc})`;
export const model=(v,m)=>VENDORS[v].models.find(x=>x.id===m);
/* 推理強度（進階模式）：套在選到的模型上，越強越貴也越慢；中＝原本的模型 */
export const EFFORT=[{id:'low',get name(){return t('effort.low');},cap:-1,tk:.7,hrs:.8},{id:'mid',get name(){return t('effort.mid');},cap:0,tk:1,hrs:1},{id:'high',get name(){return t('effort.high');},cap:1,tk:1.5,hrs:1.4}];
export function effModel(M,ef){
  if(ef===1) return M; const E=EFFORT[ef];
  return {...M,cap:Math.max(1,M.cap+E.cap),verb:M.verb*E.tk,speed:M.speed*E.hrs,name:t('effort.model',{m:M.name,e:E.name})};
}
export const efOf=ef=>S.advanced&&EFFORT[ef]?ef:1;
export const planOf=v=>VENDORS[v].plans.find(p=>p.id===S.subs[v])||{id:'none',price:0,day:0,week:0};

/* 派工方案：三組常用的廠商／模型／付費方式／審核等級／推理強度，一鍵派工照 A→B→C 用第一個能用的 */
export const PN=['A','B','C'];
export const DEFAULT_PRESETS=[{v:'deepseek',m:'chat',b:'api',rv:1,ef:1,sdd:0},{v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1,sdd:2},{v:'anthropic',m:'opus',b:'corp',rv:2,ef:1,sdd:2}];
export const BILL_LABEL={get sub(){return t('bill.sub');},get seat(){return t('bill.seat');},get api(){return t('bill.api');},get corp(){return t('bill.corp');},get local(){return t('bill.local');}};
export const validPreset=p=>!!(p&&VENDORS[p.v]&&model(p.v,p.m)&&BILL_LABEL[p.b]&&(p.v==='local')===(p.b==='local')&&[0,1,2].includes(p.rv)&&(p.ef===undefined||[0,1,2].includes(p.ef))&&(p.sdd===undefined||[0,1,2].includes(p.sdd)));
/* 舊方案沒有推理強度補成中、沒有 SDD 等級補成 2（用已買的最高級） */
export const presetsOf=ps=>(Array.isArray(ps)&&ps.length===3&&ps.every(validPreset)?ps:DEFAULT_PRESETS).map(p=>({...p,ef:p.ef??1,sdd:p.sdd??2}));

/* 導入 SDD 依套用的等級查表（0 不用、1 markdown、2 框架）；陷阱停下的比例在 0 級時用 TRAP_STOP */
export const SDD_TK=[1,1.1,1.2], SDD_P=[0,.08,.15], SDD_TRAP_STOP=[0,.15,.05];
/* 名稱與工具例子依目前語言（只用索引取值） */
export const SDD_NAME={get 0(){return t('sdd.name0');},get 1(){return t('sdd.name1');},get 2(){return t('sdd.name2');}};
/* 各級的實際工具，派工台、紀錄、規則都寫出來 */
export const SDD_EG={0:'',get 1(){return t('sdd.eg1');},get 2(){return t('sdd.eg2');}};
export const sddDesc=L=>t('sdd.desc',{tk:SDD_TK[L],p:Math.round(SDD_P[L]*100),stop:Math.round(SDD_TRAP_STOP[L]*100)});

/* 工程投資：花工時和公司預算，效果維持到月底 */
export const INVEST={
  md:{get name(){return t('invest.md.name');},hrs:3,cost:300,get desc(){return t('invest.md.desc');},lv2:{hrs:1,cost:200,get desc(){return t('invest.md.lv2');}}},
  tests:{get name(){return t('invest.tests.name');},hrs:4,cost:400,get desc(){return t('invest.tests.desc');},lv2:{hrs:1,cost:200,get desc(){return t('invest.tests.lv2');}}},
  ci:{get name(){return t('invest.ci.name');},hrs:3,cost:300,get desc(){return t('invest.ci.desc');}},
  hook:{get name(){return t('invest.hook.name');},hrs:2,cost:200,get desc(){return t('invest.hook.desc');}},
  scan:{get name(){return t('invest.scan.name');},hrs:3,cost:300,get desc(){return t('invest.scan.desc');},lv2:{hrs:1,cost:200,get desc(){return t('invest.scan.lv2');}}},
  fastlane:{get name(){return t('invest.fastlane.name');},hrs:3,cost:400,get desc(){return t('invest.fastlane.desc');}},
  monitor:{get name(){return t('invest.monitor.name');},hrs:3,cost:400,get desc(){return t('invest.monitor.desc');}},
  skills:{get name(){return t('invest.skills.name');},hrs:3,cost:400,get desc(){return t('invest.skills.desc');},lv2:{hrs:1,cost:200,get desc(){return t('invest.skills.lv2');}}},
  mcp:{get name(){return t('invest.mcp.name');},hrs:3,cost:400,get desc(){return t('invest.mcp.desc');}},
  sdd:{get name(){return t('invest.sdd.name');},hrs:6,cost:500,get desc(){return t('invest.sdd.desc',{eg:SDD_EG[1],d:sddDesc(1)});},lv2:{hrs:1,cost:200,get desc(){return t('invest.sdd.lv2',{eg:SDD_EG[2],d:sddDesc(2)});}}},
  ai:{get name(){return t('invest.ai.name');},hrs:1,cost:200,get desc(){return t('invest.ai.desc');}},
};
/* CLAUDE.md 以外的投資，面板照這個順序 */
export const INV_KEYS=['tests','ci','hook','scan','fastlane','monitor','skills','mcp','sdd','ai'];
/* 有 Lv2 的投資：數值依等級查表（0 沒買、1、2） */
export const MD_TK=.85, MD_P=[0,.06,.15], TEST_CATCH=[0,.1,.2], MCP_REVEAL=.2, MCP_EVAL_HRS=.5;
export const HOOK_PR=.5, SCAN_AUDIT=[1,.5,.25], SKILLS_CX=[0,2,3], FASTLANE_REJECT=.1, MONITOR_LATE=4, MONITOR_KPI=1.2;
/* 國內研討會：週末自費參加。票價是 2026-10-10 查到的一般票，查不到的用往年或估計（見 DESIGN.md） */
export const CONF_CATS={get stack(){return t('confcat.stack');},get sec(){return t('confcat.sec');},get ai(){return t('confcat.ai');},get gen(){return t('confcat.gen');}};
export const CONF={
  iplayground:{name:'iPlayground',cat:'stack',stacks:['app'],fee:4000},
  mopcon:{name:'MOPCON×JSDC',cat:'stack',stacks:['app','fe'],fee:699},
  devopsdays:{name:'DevOpsDays Taipei',cat:'stack',stacks:['sre','devops'],fee:3500},
  kubesummit:{name:'KubeSummit',cat:'stack',stacks:['sre','devops'],fee:3000},
  coscup:{name:'COSCUP',cat:'stack',stacks:['rails','rust'],fee:0},
  webconf:{name:'WebConf Taiwan',cat:'stack',stacks:['laravel','fe'],fee:4200},
  hitcon:{name:'HITCON',cat:'sec',stacks:[],fee:6000},
  cybersec:{get name(){return t('conf.cybersec');},cat:'sec',stacks:[],fee:0},
  taiwanai:{get name(){return t('conf.taiwanai');},cat:'ai',stacks:[],fee:2500},
  hwdc:{name:'Hello World Dev Conference',cat:'gen',stacks:[],fee:3600},
};
export const CONF_KEYS=Object.keys(CONF);
export const CONF_LV2={sec:'scan',ai:'skills',gen:'tests'};             // 技術線場開放 CLAUDE.md Lv2，其他類別開放這幾項
export const CONF_LAST_DAY=15, CONF_MANUAL=.8, AI_P=.08, AI_MAX=3;  // 第 15 天後不能報名、技術線場手寫倍率、agent 能力每級成功率與最高級
/* 投資等級：舊存檔與舊寫法的 true 算 1 級 */
export const lv=x=>x===true?1:(x|0);
/* 規則係數（規則 modal 也讀這些） */
export const CATCH={base:.45,per:.08,strict:.2,max:.95};          // 自我審核抓錯率 = base + per × 能力（嚴格 +strict）
export const REVEAL={base:.35,per:.15,max:.95};                     // 評估架構識破率
export const BIG={p:.08,tk:.7};                                     // 大型 codebase：成功率 ±p、ctx 模型 token ×tk
export const RETRY={tk:.7,hrs:.8};                                  // 失敗後重做的 token 與時間折扣
export const MANUAL_HRS=2.2, UNFAMILIAR_HRS=2;                      // 手寫每單位複雜度的時數、不熟的倍率
export const STACK_HRS={rust:1.2,app:1.15,devops:1.25};             // 技術線執行時間倍率
export const STORE_RATE=.4, INC_KPI=1.6, HARD_KPI=1.3, LATE_KPI=.5; // 需上架審核比例、事故 KPI、難線 KPI、逾期扣 KPI 比例
export const CONFLICT=.1, CI_CONFLICT=.5, PR_HRS=.2, PR_REVIEWED=.5, EVAL_HRS=.5; // 每個還在跑的 agent 衝突機率與 CI 倍率、審 PR 每單位複雜度時數與自審倍率、評估時數
export const RESCOPE={ok:5,no:3,days:2};                            // 找主管：同意與拒絕各扣多少信任、延幾天
/* 研究單：直接派工 token 倍率；agent 研究的 token（× 模型 token 倍率）與時數（× 模型速度）；自己研究的時數；拆成哪兩個複雜度 */
export const RESEARCH_DIRECT_TK=4, RESEARCH_TK=40, RESEARCH_HRS=.5, RESEARCH_SELF_HRS=1.5;
export const RESEARCH_SPLIT={4:[2,3],5:[3,3]};
/* 採購電腦：走公司採購申請，不扣公司 API 預算；到貨當天看信任決定核不核准 */
export const PC_SPEED=.7, HW_REQ_HRS=1, HW_SETUP_HRS=1, HW_IDLE=2;
export const HW={
  pc:{get name(){return t('hw.pc.name');},get price(){return t('hw.pc.price');},trust:55,days:2,get desc(){return t('hw.pc.desc',{x:PC_SPEED});}},
  spark:{name:'NVIDIA DGX Spark',get price(){return t('hw.spark.price');},trust:60,days:3,get desc(){return t('hw.spark.desc');}},
  mac:{get name(){return t('hw.mac.name');},get price(){return t('hw.mac.price');},trust:70,days:3,get desc(){return t('hw.mac.desc');}},
};
export const HW_KEYS=Object.keys(HW);
