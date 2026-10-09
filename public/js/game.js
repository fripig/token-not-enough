/* ===== 資料（數字為遊戲平衡用，非實際報價） ===== */
const VENDORS={
  anthropic:{name:'Anthropic',agent:'Claude Code',vc:'--anth',corp:true,
    plans:[{id:'none',name:'不訂閱',price:0},{id:'pro',name:'Pro',price:650,day:450,week:1800},{id:'max5',name:'Max 5×',price:3300,day:2200,week:9000},{id:'max20',name:'Max 20×',price:6500,day:9000,week:36000}],
    models:[{id:'haiku',name:'Haiku',cap:2,price:.12,w:.3,speed:.5,verb:.9},{id:'sonnet',name:'Sonnet',cap:4,price:.45,w:1,speed:.8,verb:1},{id:'opus',name:'Opus',cap:5,price:1.5,w:3,speed:1,verb:.85}]},
  openai:{name:'OpenAI',agent:'Codex CLI',vc:'--oai',corp:false,
    plans:[{id:'none',name:'不訂閱',price:0},{id:'plus',name:'Plus',price:650,day:500,week:2000},{id:'pro',name:'Pro',price:6500,day:8000,week:30000}],
    models:[{id:'mini',name:'mini',cap:2,price:.1,w:.3,speed:.5,verb:1},{id:'std',name:'標準',cap:4,price:.4,w:1,speed:.8,verb:1.05},{id:'high',name:'高推理',cap:5,price:.4,w:1,speed:1.4,verb:1.8}]},
  google:{name:'Google',agent:'Gemini CLI',vc:'--goog',corp:true,
    plans:[{id:'none',name:'不訂閱',price:0},{id:'aipro',name:'AI Pro',price:650,day:700,week:2800},{id:'ultra',name:'Ultra',price:8000,day:10000,week:40000}],
    models:[{id:'flash',name:'Flash',cap:2,price:.06,w:.25,speed:.4,verb:1.1,ctx:true},{id:'pro',name:'Pro',cap:4,price:.35,w:1,speed:.9,verb:1,ctx:true}]},
  deepseek:{name:'DeepSeek',agent:'Claude Code 接 DeepSeek API',vc:'--dsk',corp:false,cn:true,
    plans:[{id:'none',name:'不訂閱',price:0}],
    models:[{id:'chat',name:'Chat',cap:3,price:.03,w:1,speed:.7,verb:1.15},{id:'reasoner',name:'Reasoner',cap:4,price:.06,w:1,speed:1.2,verb:1.5}]},
  zhipu:{name:'智譜 GLM',agent:'Claude Code＋GLM Coding Plan',vc:'--glm',corp:false,cn:true,
    plans:[{id:'none',name:'不訂閱',price:0},{id:'lite',name:'Lite',price:100,day:1500,week:6000},{id:'pro',name:'Pro',price:500,day:6000,week:24000}],
    models:[{id:'air',name:'GLM Air',cap:3,price:.04,w:.5,speed:.6,verb:1.1},{id:'glm',name:'GLM',cap:4,price:.1,w:1,speed:.9,verb:1.1}]},
  moonshot:{name:'Kimi',agent:'Kimi CLI',vc:'--kimi',corp:false,cn:true,
    plans:[{id:'none',name:'不訂閱',price:0},{id:'member',name:'會員',price:300,day:1500,week:6000}],
    models:[{id:'k2',name:'K2',cap:4,price:.12,w:1,speed:.9,verb:1.2}]},
  local:{name:'自架開源',agent:'OpenCode＋本地 GPU',vc:'--local',corp:false,plans:[],
    models:[{id:'qwen',name:'Qwen Coder 32B',cap:3,price:0,w:0,speed:2.1,verb:1.3,cn:true},{id:'gemma',name:'Gemma 27B',cap:3,price:0,w:0,speed:2.4,verb:1.25},{id:'oss',name:'gpt-oss 20B',cap:2,price:0,w:0,speed:1.8,verb:1.2}]}
};
const SUBV=Object.keys(VENDORS).filter(v=>VENDORS[v].plans.length>1);
const APIV=Object.keys(VENDORS).filter(v=>v!=='local');
const objOf=(keys,f)=>Object.fromEntries(keys.map(k=>[k,f(k)]));
/* 案主：ban='api' 禁止資料送往中國雲端；ban='all' 連中國開源權重也不能用 */
const CLIENTS=[{name:'內部專案',ban:null,w:.42},{name:'新創客戶',ban:null,w:.18},{name:'金融客戶',ban:'api',w:.18},{name:'政府標案',ban:'all',w:.22}];
function pickClient(){let r=Math.random();for(const c of CLIENTS){if((r-=c.w)<0)return c;}return CLIENTS[0];}
function banOf(is){const b=is.client.ban; return b==='all'?'all':(b||S.cnBan)?'api':null;}
function cnBlock(is,v,M){
  const b=banOf(is); if(!b) return '';
  if(VENDORS[v].cn) return is.client.ban?`${is.client.name}禁用`:'公司政策禁用';
  if(b==='all'&&M.cn) return '中國權重禁用';
  return '';
}
const SEAT={day:2500,week:10000,name:'公司團隊席位',vendors:['anthropic','openai','google']};
const BASE=[0,60,180,350,550,850];
const KPI=[0,3,6,10,16,24];
/* 技術線：前四個是可選的公司（主技術線），fe 是每家公司都會有的前端工單 */
const STACKS={
  laravel:{name:'Laravel',company:'Laravel 新聞站',level:1,desc:'框架慣例多，簡單工單便宜模型就夠用。',pool:{
    1:['跑馬燈文字錯字','RSS 日期時區差 8 小時','按鈕 hover 顏色不對','後台列表少一個排序欄位','修正 404 頁的返回連結','Footer 年份寫死成去年'],
    2:['文章 API 補 og:image 欄位','補齊標籤服務的單元測試','表單驗證訊息中文化','排程任務加上重試機制','搜尋結果分頁錯亂','後台匯入 CSV 編碼錯誤'],
    3:['文章列表 N+1 查詢拖慢 3 秒','播放器元件重構成 Composition API','Queue worker 記憶體洩漏','多語系 hreflang 全面修正','匯出報表改成非同步','圖片上傳改走 S3 預簽網址'],
    4:['Laravel 大版本升級','CKEditor 換成 Tiptap 的內容轉換','CDN 快取失效策略重寫','權限系統改成角色＋政策','CI 流程從零改成容器化部署'],
    5:['舊資料庫拆分遷移','從單體拆出搜尋服務','整站改 SSR 還要保住 SEO'],
    trap:['文章網址只要改一下格式','順便把作者欄位改成可以多選','時區改成跟著使用者設定，應該很快','後台列表加一個「全部匯出」按鈕就好'],
    inc:['正式站 502：worker 不停重啟','WAF 誤擋編輯後台','首頁快取被打穿，RDS CPU 99%','排程重複發送推播']}},
  rails:{name:'Rails',company:'Rails SaaS',level:1,desc:'Convention over configuration，簡單工單便宜模型就夠用。',pool:{
    1:['帳單 Email 主旨少了公司名稱','後台 flash 訊息沒有翻譯','價目表頁連結指到舊方案','註冊頁密碼提示文字錯誤'],
    2:['Devise 登入加上 rate limit','補齊訂閱模型的 RSpec','Sidekiq 失敗任務加通知','CSV 匯出漏掉時區轉換','API 回應改用 serializer 統一格式'],
    3:['Dashboard 頁 N+1 拖慢到 4 秒','多租戶資料改用 scope 隔離','Stripe webhook 冪等處理','Active Storage 改傳到 S3 直傳','把 callbacks 抽成 service object'],
    4:['Rails 大版本升級','Webpacker 換成 importmap','權限從 CanCanCan 換成 Pundit','背景任務從 Sidekiq 搬到 Solid Queue'],
    5:['單一資料庫拆成多租戶分庫','計費系統改成用量計價','把報表模組拆成獨立服務'],
    trap:['帳號只要改成可以屬於多個組織','順便讓方案支援按月或按年切換','User 加一個軟刪除，應該改一行就好','金額欄位從整數改成小數，很快吧'],
    inc:['Sidekiq 佇列塞爆，帳單沒寄出','部署後 migration 鎖表','Stripe webhook 重複扣款','Puma worker 記憶體爆掉不停重啟']}},
  rust:{name:'Rust',company:'Rust 基礎設施',level:3,desc:'編譯測試比較慢；能力不足的模型容易卡在 borrow checker。',pool:{
    1:['CLI --help 說明打錯字','log 等級預設改成 info','README 範例指令過期','錯誤訊息補上檔案路徑'],
    2:['設定檔解析補 serde 預設值','補齊 parser 的單元測試','clippy 警告全部清掉','metrics 補一個延遲直方圖','CLI 加上 --dry-run 選項'],
    3:['async handler 裡的鎖造成延遲尖峰','把 unwrap 全面改成錯誤型別','連線池改用 tokio 版本','跨平台路徑處理在 Windows 壞掉','大檔案改成串流處理避免吃光記憶體'],
    4:['tokio 大版本升級','自訂 trait 物件改成泛型消除 dyn','gRPC 服務從 tonic 舊版遷移','加上 graceful shutdown 與重試'],
    5:['把 C 函式庫的 FFI 包成安全介面','單機服務改成分散式共識','核心路徑改寫成 lock-free'],
    trap:['這個 struct 只要多存一個 reference','順便把同步函式改成 async','設定改成可以熱重載，應該很快','錯誤型別統一一下，改幾行就好'],
    inc:['proxy 在高流量下 panic 重啟','記憶體洩漏讓節點被 OOM kill','憑證輪替後 TLS 握手全失敗','新版 binary 在 ARM 機器啟動就 segfault']}},
  app:{name:'App',company:'App 團隊',level:2,desc:'要跑模擬器所以比較慢；部分工單要過 App Store 審核。',pool:{
    1:['設定頁版本號沒更新','深色模式下按鈕文字看不到','推播文案錯字','啟動畫面 logo 被裁切'],
    2:['補上下拉重新整理','列表頁加上空狀態畫面','登入頁支援密碼自動填入','補齊 ViewModel 的單元測試','iPad 橫向排版跑掉'],
    3:['離線時文章快取同步','推播點開要導到正確頁面','圖片列表捲動卡頓','Android 13 通知權限流程','App 內購買恢復購買失敗'],
    4:['React Native 大版本升級','登入改用 Sign in with Apple','改成 Jetpack Compose 重寫主畫面','導入 deep link 與 universal link'],
    5:['iOS 與 Android 共用核心改成 Kotlin Multiplatform','整個 App 改成離線優先架構','從 WebView 包殼改成原生 App'],
    trap:['登入狀態只要改成多帳號切換','順便支援橫向模式','字體大小跟著系統設定，應該很快','底部選單加一個分頁就好'],
    inc:['新版上架後啟動就閃退','推播憑證過期，全部收不到通知','API 改版讓舊版 App 全部登不進去','付款頁在特定機型白畫面']}},
  fe:{name:'前端',company:'前端',desc:'',pool:{
    1:['首頁 banner 在手機版被切掉','表單 placeholder 顏色太淡','favicon 換新版','行事曆元件週日顯示錯位'],
    2:['補上 loading skeleton','表格欄位支援排序','把 moment 換成 date-fns','元件補 Storybook 範例','圖片改成 lazy load'],
    3:['首頁 LCP 從 4 秒壓到 2 秒','共用元件庫改用 design token','表單狀態管理改成 Pinia','無障礙檢查修到 AA 等級','打包體積砍掉一半'],
    4:['Vue 2 升級到 Vue 3','Webpack 換成 Vite','整站導入 TypeScript','前端錯誤監控與 source map 上傳'],
    5:['舊後台改寫成 SPA','導入微前端拆分各團隊頁面','設計系統全面改版'],
    trap:['表單只要多一個欄位','順便讓整站支援深色模式','日期顯示改成跟著語系，應該很快','把這個彈窗改成可以拖拉，改一下就好'],
    inc:[]}}
};
const COMPANIES=['laravel','rails','rust','app'];
/* 主技術線可選 1–2 條，固定照 COMPANIES 的順序存；舊版存的單一字串視為只選一條 */
function normCompanies(c){
  const a=typeof c==='string'?[c]:c;
  const ok=Array.isArray(a)&&a.length>=1&&a.length<=2&&new Set(a).size===a.length&&a.every(k=>COMPANIES.includes(k));
  return ok?COMPANIES.filter(k=>a.includes(k)):['laravel'];
}
const companyName=(cs=S.companies)=>cs.map(k=>STACKS[k].company).join('＋');
const bestKey=()=>`tokgame-best-${S.mode}-${S.companies.join('+')}`;

/* ===== 工具 ===== */
const R=(a,b)=>a+Math.random()*(b-a);
const rnd=n=>Math.floor(Math.random()*n);
const pick=a=>a[rnd(a.length)];
const nt=n=>(n<0?'-':'')+'NT$'+Math.round(Math.abs(n)).toLocaleString('en-US');
const kt=k=>k>=1000?(k/1000).toFixed(k>=10000?0:1)+'M':Math.round(k)+'k';
const h1=x=>(Math.round(x*10)/10).toFixed(1);
const vc=v=>`var(${VENDORS[v].vc})`;
const model=(v,m)=>VENDORS[v].models.find(x=>x.id===m);
const planOf=v=>VENDORS[v].plans.find(p=>p.id===S.subs[v])||{id:'none',price:0,day:0,week:0};

/* 派工方案：三組常用的廠商／模型／付費方式／審核等級，一鍵派工照 A→B→C 用第一個能用的 */
const PN=['A','B','C'];
const DEFAULT_PRESETS=[{v:'deepseek',m:'chat',b:'api',rv:1},{v:'anthropic',m:'sonnet',b:'corp',rv:1},{v:'anthropic',m:'opus',b:'corp',rv:2}];
const BILL_LABEL={sub:'個人訂閱',seat:'公司席位',api:'個人 API',corp:'公司 API',local:'本地 GPU'};
const validPreset=p=>!!(p&&VENDORS[p.v]&&model(p.v,p.m)&&BILL_LABEL[p.b]&&(p.v==='local')===(p.b==='local')&&[0,1,2].includes(p.rv));
const presetsOf=ps=>(Array.isArray(ps)&&ps.length===3&&ps.every(validPreset)?ps:DEFAULT_PRESETS).map(p=>({...p}));

/* 工程投資：花工時和公司預算，效果維持到月底 */
const INVEST={
  md:{name:'寫 CLAUDE.md',hrs:3,cost:300,desc:'這條技術線的工單 token ×0.85、成功率 +6%'},
  tests:{name:'補測試',hrs:6,cost:600,desc:'自我審核抓錯率 +10%、合併衝突機率減半'},
  skills:{name:'做 skills',hrs:3,cost:400,desc:'解鎖批次派工：一次派出所有複雜度 ≤2 的工單'},
  mcp:{name:'接 MCP 文件',hrs:3,cost:400,desc:'評估架構識破率 +20%、評估時間減半'},
  sdd:{name:'導入 SDD',hrs:6,cost:500,desc:'先寫規格再派工：每次派工 token ×1.1；複雜度 3 以上成功率 +8%；陷阱在寫規格時就會發現，只燒 15%'},
};
const MD_TK=.85, MD_P=.06, TEST_CATCH=.1, MCP_REVEAL=.2, SDD_TK=1.1, SDD_P=.08, SDD_TRAP_STOP=.15;

/* ===== 狀態 ===== */
let S, sel, uid=0;
/* 工單編號：其他模組只能透過這兩個函式改 */
const nextId=()=>++uid;
const resetIds=()=>{uid=0;};
function fresh(){
  uid=0;
  S={day:1,hours:8,wallet:8000,corp:12000,trust:70,kpi:0,mode:S?.mode||'parallel',companies:normCompanies(S?.companies),slots:SLOT_CHOICES.includes(S?.slots)?S.slots:3,presets:presetsOf(S?.presets),jobs:[],
    inv:{md:{},tests:false,skills:false,mcp:false,sdd:false},
    subs:objOf(APIV,()=>'none'),
    used:{sub:objOf(APIV,()=>({d:0,w:0})),seat:objOf(SEAT.vendors,()=>({d:0,w:0}))},
    capMod:objOf(APIV,()=>1),priceMod:objOf(Object.keys(VENDORS),()=>1),cnBan:false,
    seat:{vendor:null,status:'none',day:0},
    outage:null,corpDay:0,issues:[],log:[],
    st:{subFee:0,api:0,corp:0,done:0,late:0,audits:0,manual:0,conflicts:0,caught:0,tk:objOf(Object.keys(VENDORS),()=>0),byBill:{sub:0,seat:0,api:0,corp:0,local:0},kpiLost:0,trapHit:0,trapFound:0}};
  sel={issue:null,v:'anthropic',m:'sonnet',b:'api',rv:sel?.rv??1};
}

/* 一般工單：75% 平分給選到的主技術線、15% 前端、10% 平分給沒選的技術線 */
function pickStack(){
  const r=Math.random();
  if(r<.75) return pick(S.companies);
  if(r<.9) return 'fe';
  return pick(COMPANIES.filter(k=>!S.companies.includes(k)));
}
/* 陷阱題：看起來是小單（複雜度 1–2），其實牽扯架構（真實複雜度 4–5） */
let TRAP_RATE=.1;
/* 模擬器用來調整陷阱比例 */
const setTrapRate=r=>{TRAP_RATE=r;};
/* Rust、App 比較慢：期限多一天、KPI ×1.3 作為補償 */
const hardStack=st=>st==='rust'||st==='app';
const unfamiliar=is=>!S.companies.includes(is.stack)&&is.stack!=='fe';
function makeIssue(inc){
  let cx;
  if(inc) cx=4; else { const r=Math.random()+S.day/20*.38; cx=r<.28?1:r<.6?2:r<.9?3:r<1.12?4:5; }
  const base=BASE[cx]*R(.85,1.15);
  let due=inc?S.day:S.day+(cx<=2?1+rnd(3):2+rnd(4));
  const stack=inc?pick(S.companies):pickStack();
  const trap=!inc&&cx<=2&&Math.random()<TRAP_RATE, trueCx=Math.random()<.6?4:5;
  const title=trap&&Math.random()<.5?pick(STACKS[stack].pool.trap):pick(STACKS[stack].pool[inc?'inc':cx]);
  return {id:nextId(),title,cx,base,inc:!!inc,stack,
    trap,trueCx:trap?trueCx:cx,trueBase:trap?BASE[trueCx]*R(.85,1.15):base,revealed:false,evaluated:false,rescoped:false,merge:false,
    store:stack==='app'&&cx>=2&&Math.random()<.4,
    sens:Math.random()<(inc?.55:.25),big:cx>=3&&Math.random()<.45,
    client:inc?CLIENTS[0]:pickClient(),
    due:Math.min(20,due+(!inc&&hardStack(stack)?1:0)),kpi:Math.round(KPI[cx]*(inc?1.6:1)*(hardStack(stack)?1.3:1)),tries:0};
}

/* ===== 計算 ===== */
function quotaLeft(kind,v){
  const p=kind==='seat'?SEAT:planOf(v); const u=S.used[kind][v]; if(!u) return 0;
  const cm=kind==='seat'?1:S.capMod[v];
  return Math.max(0,Math.min(p.day*cm-u.d,p.week*cm-u.w));
}
function useQuota(kind,v,x){const u=S.used[kind][v];u.d+=x;u.w+=x;}

/* 自我審核：多花 token 與時間，agent 改壞時有機會當場抓到並修正，避免整單重做 */
const REVIEW=[{name:'不審核',tk:1,hrs:1},{name:'自審',tk:1.3,hrs:1.2},{name:'嚴格審核',tk:1.6,hrs:1.35}];
const catchRate=(rv,M)=>rv===0?0:Math.min(.95,.45+.08*M.cap+(rv===2?.2:0)+(S.inv.tests?TEST_CATCH:0));
/* 技術線效果：只看技術線本身的特性，不替各家模型設「誰比較會」的分數 */
const conventional=is=>(is.stack==='laravel'||is.stack==='rails')&&is.cx<=3; // 框架慣例多
const STORE_REJECT=.2;                                                       // App Store 退件機率
function stackGap(is,M){
  if(conventional(is)) return 1;
  if(is.stack==='rust'&&M.cap<4) return -1;                            // borrow checker
  return 0;
}
const stackHrs=is=>is.stack==='rust'?1.2:is.stack==='app'?1.15:1;     // 編譯測試、模擬器
function stackHint(is){
  if(conventional(is)) return `${STACKS[is.stack].name} 慣例多：複雜度 3 以下的工單，成功率視同簡單一級。`;
  if(is.stack==='rust') return `Rust：編譯測試比較慢，執行時間 ×${stackHrs(is)}；能力 4 以下的模型容易卡在 borrow checker，成功率視同難一級。`;
  if(is.stack==='app') return `App：要跑模擬器，執行時間 ×${stackHrs(is)}${is.store?`；這張要過 App Store 審核，agent 做完仍有 ${STORE_REJECT*100}% 機率被退件，自我審核救不回來`:''}。`;
  return '';
}
/* 本地 GPU 一次只能跑一個 agent，跑的時候電腦被吃滿，也不能自己手寫 */
const localBusy=()=>S.jobs.some(j=>j.b==='local');
const manualHrs=is=>is.cx*2.2*(is.tries?.8:1)*(unfamiliar(is)?2:1);
function est(is,v,mid,rv=sel.rv){
  const M=model(v,mid), raw=M.cap-is.cx, diff=raw+stackGap(is,M);
  const md=!!S.inv.md[is.stack], sdd=S.inv.sdd;
  const tk=is.base*M.verb*(is.big&&M.ctx?.7:1)*(raw>=1?.85:1)*parMul()*REVIEW[rv].tk*(md?MD_TK:1)*(sdd?SDD_TK:1);
  let p=diff>=1?.95:diff===0?.8:diff===-1?.5:diff===-2?.25:.1;
  if(is.big&&M.ctx)p+=.08; if(is.big&&!M.ctx&&M.cap<4)p-=.08;
  if(md)p+=MD_P; if(sdd&&is.cx>=3)p+=SDD_P;
  p=Math.max(.05,Math.min(.97,p));
  const c=catchRate(rv,M);
  return {M,tk,lo:tk*.7,hi:tk*1.3,p,c,pe:(p+(1-p)*c)*(is.store?1-STORE_REJECT:1),hrs:is.cx*M.speed*(is.tries?.8:1)*REVIEW[rv].hrs*stackHrs(is)};
}

function bills(v){
  if(v==='local') return [{id:'local',label:'本地 GPU',note:'不花 token 錢，但很慢',ok:true}];
  const V=VENDORS[v], pl=planOf(v), out=[];
  out.push({id:'sub',label:'個人訂閱',note:pl.id==='none'?'沒有訂閱':`${pl.name}・剩 ${kt(quotaLeft('sub',v))}`,ok:pl.id!=='none'});
  if(S.seat.status==='approved'&&S.seat.vendor===v) out.push({id:'seat',label:'公司席位',note:`剩 ${kt(quotaLeft('seat',v))}`,ok:true});
  out.push({id:'api',label:'個人 API',note:'自己的信用卡',ok:true});
  out.push({id:'corp',label:'公司 API',note:!V.corp?'公司沒簽約':S.corp<=0?'預算用完':'走部門預算',ok:V.corp&&S.corp>0});
  return out;
}
function costLine(b,M,v,e){
  if(b==='sub'||b==='seat') return {t:'額度',lo:e.lo*M.w,hi:e.hi*M.w,unit:'q'};
  if(b==='local') return {t:'花費',lo:0,hi:0,unit:'$'};
  const pm=S.priceMod[v]; return {t:b==='corp'?'公司付':'自付',lo:e.lo*M.price*pm,hi:e.hi*M.price*pm,unit:'$'};
}

/* 派工方案對這張工單能不能用；不能用時回傳原因（工作槽與工時不算方案的問題） */
function presetBlock(is,p){
  const M=model(p.v,p.m);
  if(S.outage===p.v) return '今日當機';
  const why=cnBlock(is,p.v,M); if(why) return why;
  if(p.b==='seat'&&!(S.seat.status==='approved'&&S.seat.vendor===p.v)) return '沒有公司席位';
  const bl=bills(p.v).find(b=>b.id===p.b); if(!bl) return '不能用這種付費方式'; if(!bl.ok) return bl.note;
  if(p.b==='local'&&PAR()&&localBusy()) return '本地 GPU 忙';
  const cl=costLine(p.b,M,p.v,est(is,p.v,p.m,p.rv));
  if((p.b==='sub'||p.b==='seat')&&cl.hi>quotaLeft(p.b,p.v)) return '額度不夠';
  if(p.b==='api'&&cl.hi>S.wallet) return '錢包不夠';
  return '';
}
function presetFor(is){
  const skip=[];
  for(let i=0;i<S.presets.length;i++){ const r=presetBlock(is,S.presets[i]); if(!r) return {i,skip}; skip.push({i,r}); }
  return {i:-1,skip};
}

function log(cls,msg){S.log.unshift({cls,msg:`D${String(S.day).padStart(2,'0')} ${msg}`}); if(S.log.length>80)S.log.pop();}

/* ===== 動作 ===== */
const PAR=()=>S.mode==='parallel';
const queueOrder=(a,b)=>a.due-b.due||b.kpi-a.kpi;
const SLOT_CHOICES=[2,3,4,5,6];
const clock=el=>{const m=Math.round((9+el)*60);return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
/* 平行加成：同時在跑的 agent 越多，重複載入 context 與協調的 token 越多 */
const parMul=()=>PAR()?1+.15*S.jobs.length:1;
/* 還沒曝光的陷阱題照真實複雜度跑；模型能力不夠就做到一半停下來 */
const TRAP_STOP=.4;
const hiddenTrap=is=>is.trap&&!is.revealed;
const trueView=is=>hiddenTrap(is)?{...is,cx:is.trueCx,base:is.trueBase}:is;
function reveal(is){ if(!hiddenTrap(is)) return; is.shownCx=is.cx; is.cx=is.trueCx; is.base=is.trueBase; is.revealed=true; }
function makeJob(is){
  const hidden=hiddenTrap(is), e=est(trueView(is),sel.v,sel.m);
  const stop=hidden&&e.M.cap<is.trueCx, f=stop?(S.inv.sdd?SDD_TRAP_STOP:TRAP_STOP):1;
  const ok=!stop&&Math.random()<e.p;
  return {issue:is,v:sel.v,b:sel.b,M:e.M,mul:parMul(),rv:sel.rv,tk:e.tk*f*R(.7,1.3),hrs:e.hrs*f*R(.8,1.2),ok,caught:!stop&&!ok&&Math.random()<e.c,left:0,hidden,stop,sdd:S.inv.sdd};
}
function dispatch(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is) return;
  const j=makeJob(is);
  if(PAR()){
    if(S.jobs.length>=S.slots||(j.b==='local'&&localBusy())) return;
    j.left=j.hrs; is.running=true; S.jobs.push(j); sel.issue=null;
    log('dim',`→ 派出 ${is.title}｜${VENDORS[j.v].agent} / ${j.M.name}｜預計 ${h1(j.hrs)}h`);
    advance(.2); render(); return;
  }
  let frac=1,note='';
  if(j.hrs>S.hours){frac=S.hours/j.hrs;note='跑到下班還沒結束';}
  const r=settle(j,{frac,note,fail:frac<1});
  S.hours=Math.max(0,S.hours-r.hrs);
  render();
}
/* 一鍵派工：用第一個能用的派工方案，照派工台的流程派出去 */
const canQuick=()=>S.hours>=.2&&(!PAR()||S.jobs.length<S.slots);
function quick(id){
  const is=S.issues.find(i=>i.id===id); if(!is||is.running||!canQuick()) return false;
  const {i,skip}=presetFor(is); if(i<0) return false;
  Object.assign(sel,S.presets[i],{issue:id});
  if(skip.length) log('dim',`· 一鍵派工用方案 ${PN[i]}（略過 ${skip.map(s=>`${PN[s.i]}：${s.r}`).join('、')}）`);
  dispatch(); return true;
}
const loadPreset=i=>Object.assign(sel,S.presets[i]);
function savePreset(i){
  S.presets[i]={v:sel.v,m:sel.m,b:sel.b,rv:sel.rv};
  log('dim',`· 存成方案 ${PN[i]}：${VENDORS[sel.v].agent} / ${model(sel.v,sel.m).name}・${BILL_LABEL[sel.b]}・${REVIEW[sel.rv].name}`);
}
/* 平行模式：推進時鐘，背景 agent 跑完就結算，成功的要花時間審 PR */
function advance(dt){
  while(dt>1e-9&&S.hours>1e-9){
    const next=S.jobs.length?Math.min(...S.jobs.map(j=>j.left)):Infinity;
    const step=Math.min(dt,next,S.hours);
    S.jobs.forEach(j=>j.left-=step); S.hours-=step; dt-=step;
    const fin=S.jobs.filter(j=>j.left<=1e-9); S.jobs=S.jobs.filter(j=>j.left>1e-9);
    for(const j of fin){
      j.issue.running=false;
      const r=settle(j,{conflict:.1*S.jobs.length*(S.inv.tests?.5:1)});
      if(r.ok||r.rejected){const rv=j.issue.cx*.2*(j.rv?.5:1);dt+=rv;log('dim',`  ↳ 審 PR 花了 ${h1(rv)}h`);}
    }
  }
  S.hours=Math.max(0,S.hours);
}
function cancelJobs(pred,note){
  const out=S.jobs.filter(pred); S.jobs=S.jobs.filter(j=>!pred(j));
  out.forEach(j=>{j.issue.running=false;settle(j,{frac:Math.max(.05,1-j.left/j.hrs),fail:true,note});});
  return out.length;
}
/* 扣款：派工與評估共用。訂閱／席位額度不夠時只扣剩下的，回傳 short 與實際完成比例 frac */
function charge(b,v,M,tk){
  if(b==='sub'||b==='seat'){
    const need=tk*M.w, left=quotaLeft(b,v);
    if(need>left){ useQuota(b,v,left); return {spend:`額度 ${kt(left)}`,short:true,frac:need>0?left/need:0}; }
    useQuota(b,v,need); return {spend:`額度 ${kt(need)}`,short:false,frac:1};
  }
  if(b==='api'){ const c=tk*M.price*S.priceMod[v]; S.wallet-=c; S.st.api+=c; return {spend:nt(c),short:false,frac:1}; }
  if(b==='corp'){ const c=tk*M.price*S.priceMod[v]; S.corp-=c; S.corpDay+=c; S.st.corp+=c; return {spend:'公司 '+nt(c),short:false,frac:1}; }
  return {spend:'電費',short:false,frac:1};
}
/* 機敏程式碼送進個人帳號的稽核風險；派工與評估共用 */
const auditRisk=(is,b)=>is.sens&&(b==='sub'||b==='api');
const auditOdds=v=>VENDORS[v].cn?.6:.35;
function auditRoll(is,b,v){
  if(auditRisk(is,b)&&Math.random()<auditOdds(v)){
    S.trust=Math.max(0,S.trust-12); S.st.audits++;
    log('warn',`! 資安稽核：機敏程式碼送進${VENDORS[v].cn?'中國雲端模型':'個人帳號'}被抓到，主管信任 -12`);
  }
}
function checkOverdraft(){ if(S.corp<0){ log('warn','! 公司 API 預算透支，財務來信關切'); S.trust=Math.max(0,S.trust-8); S.corp=0; } }
function settle(j,o={}){
  const is=j.issue,v=j.v,b=j.b,M=j.M,frac=o.frac??1;
  if(j.hidden&&hiddenTrap(is)){ reveal(is); S.st.trapHit++; }
  let tk=j.tk*frac, hrs=j.hrs*frac, ok=j.ok&&!o.fail, note=o.note||'', spend='', conflict=false, fixed=false, rejected=false;
  if(!j.ok&&j.caught&&!o.fail){tk*=1.25;ok=true;fixed=true;}
  if(!j.ok&&!j.caught&&j.rv&&!o.fail) note='審核沒抓到，上線後測試才爆';
  if(j.stop&&!o.fail) note=j.sdd?'寫規格時就發現牽扯整個架構，先停下來':'做到一半發現牽扯整個架構，先停下來';
  const ch=charge(b,v,M,tk); spend=ch.spend;
  if(ch.short){ tk*=ch.frac; hrs=Math.max(.3,hrs*Math.max(.3,ch.frac)); ok=false; note='撞到用量上限，agent 停在一半'; }
  /* 解決衝突工單本身不會再衝突 */
  if(ok&&!is.merge&&o.conflict&&Math.random()<o.conflict){ok=false;conflict=true;}
  /* App 上架審核在 agent 做完之後才發生，自我審核救不回來 */
  if(ok&&is.store&&Math.random()<STORE_REJECT){ok=false;rejected=true;note='卡在 App Store 審核被退件';}
  S.st.tk[v]+=tk; S.st.byBill[b]+=tk;
  const who=`${VENDORS[v].agent} / ${M.name}`;
  if(ok){
    S.issues=S.issues.filter(i=>i!==is); S.kpi+=is.kpi; S.st.done++;
    if(is.inc) S.trust=Math.min(100,S.trust+2);
    if(fixed)S.st.caught++;
    log('ok',`✓ ${is.title}｜${who}${j.rv?`・${REVIEW[j.rv].name}`:''}｜${kt(tk)} tokens｜${spend}｜${h1(hrs)}h｜KPI +${is.kpi}`);
    if(fixed)log('ok',`  ↳ ${REVIEW[j.rv].name}抓到錯誤並當場修正，省掉整單重做`);
    if(j.hidden)log('warn',`  ↳ 原來牽扯到架構，硬做完了（原估複雜度 ${is.shownCx}，實際 ${is.cx}）`);
    if(sel.issue===is.id) sel.issue=null;
  } else if(conflict){
    /* 合併衝突：原單原地變成「解決衝突」工單，KPI 等它完成才拿 */
    S.st.conflicts++; if(fixed)S.st.caught++;
    const title=is.title, cx=Math.max(1,is.cx-1);
    Object.assign(is,{merge:true,title:`解決衝突：${title}`,cx,base:BASE[cx]*R(.85,1.15),trap:false,revealed:false,evaluated:false,big:is.big&&cx>=3,tries:0});
    log('warn',`⚡ ${title}｜${who}｜和其他 agent 的改動合併衝突，留下「解決衝突」工單（複雜度 ${cx}）｜燒掉 ${kt(tk)}｜${spend}｜${h1(hrs)}h`);
  } else {
    is.tries++; is.base*=j.stop?1:.7;
    log('bad',`✗ ${is.title}｜${who}｜${note||'測試沒過，改壞了'}｜燒掉 ${kt(tk)}｜${spend}｜${h1(hrs)}h`);
  }
  auditRoll(is,b,v); checkOverdraft();
  return {ok,hrs,rejected};
}
function wait(next){
  if(next){ if(!S.jobs.length) return; advance(Math.min(...S.jobs.map(j=>j.left))); }
  else advance(1);
  render();
}
function manual(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is) return;
  const hrs=manualHrs(is);
  if(hrs>S.hours||localBusy()) return;
  if(PAR()){ is.running=true; advance(hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=hrs;
  S.st.manual++;
  if(hiddenTrap(is)){ reveal(is); S.st.trapHit++; log('bad',`✗ ${is.title}｜手寫到一半發現要動架構｜${h1(hrs)}h｜原估複雜度 ${is.shownCx}，實際 ${is.cx}`); render(); return; }
  const ok=is.cx<=3||Math.random()<.7;
  if(ok){S.issues=S.issues.filter(i=>i!==is);S.kpi+=is.kpi;S.st.done++;sel.issue=null;log('ok',`✓ ${is.title}｜自己手寫｜0 tokens｜${h1(hrs)}h｜KPI +${is.kpi}`);}
  else{is.tries++;is.base*=.7;log('bad',`✗ ${is.title}｜自己手寫卡關｜${h1(hrs)}h`);}
  render();
}

/* 評估架構：先花少量 token 讓 agent 讀架構，模型越強越容易識破陷阱 */
const EVAL_TK=40;
const canEvaluate=is=>!is.inc&&!is.merge&&!is.evaluated&&!is.revealed;
const evalCost=M=>({tk:EVAL_TK*M.verb,hrs:.5*M.speed*(S.inv.mcp?.5:1)});
const revealRate=M=>Math.min(.95,.35+.15*M.cap+(S.inv.mcp?MCP_REVEAL:0));
function evaluate(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||!canEvaluate(is)) return;
  const M=model(sel.v,sel.m), {tk,hrs}=evalCost(M);
  if(hrs>S.hours||(sel.b==='local'&&localBusy())) return;
  if(PAR()){ is.running=true; advance(hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=hrs;
  const ch=charge(sel.b,sel.v,M,tk), used=tk*ch.frac;
  S.st.tk[sel.v]+=used; S.st.byBill[sel.b]+=used;
  if(ch.short){ log('bad',`✗ ${is.title}｜評估｜額度不夠，評估沒做完｜${ch.spend}`); render(); return; }
  is.evaluated=true;
  if(is.trap&&Math.random()<revealRate(M)){ reveal(is); S.st.trapFound++; log('ok',`★ ${is.title}｜評估發現牽扯架構：原估複雜度 ${is.shownCx}，實際 ${is.cx}｜${kt(tk)} tokens｜${ch.spend}｜${h1(hrs)}h`); }
  else log('dim',`· ${is.title}｜評估完成，看起來沒問題｜${kt(tk)} tokens｜${ch.spend}｜${h1(hrs)}h`);
  auditRoll(is,sel.b,sel.v); checkOverdraft();
  render();
}
/* 陷阱曝光後可以找主管重新評估一次：信任夠就調 KPI、延期限 */
const RESCOPE_TRUST=50;
function rescope(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is||!is.revealed||is.rescoped) return;
  is.rescoped=true;
  if(S.trust>=RESCOPE_TRUST){
    S.trust-=5; is.kpi=Math.round(KPI[is.cx]*(hardStack(is.stack)?1.3:1)); is.due=Math.min(20,is.due+2);
    log('ok',`★ ${is.title}｜主管同意重新評估：KPI 改成 +${is.kpi}，期限延到第 ${is.due} 天｜信任 -5`);
  } else { S.trust=Math.max(0,S.trust-3); log('warn',`! ${is.title}｜主管：不是說很簡單嗎？｜信任 -3`); }
  render();
}

/* 工程投資：花自己的工時和公司預算，平行模式下背景 agent 照樣跑 */
const invCount=()=>Object.keys(S.inv.md).length+['tests','skills','mcp','sdd'].filter(k=>S.inv[k]).length;
function investBlock(k,st){
  const I=INVEST[k];
  if(k==='md'?S.inv.md[st]:S.inv[k]) return '已完成';
  if(S.hours<I.hrs-1e-9) return '工時不夠';
  if(S.corp<I.cost) return '公司預算不夠';
  return '';
}
function invest(k,st){
  if(!INVEST[k]||(k==='md'&&!STACKS[st])||investBlock(k,st)) return false;
  const I=INVEST[k];
  S.corp-=I.cost; S.corpDay+=I.cost; S.st.corp+=I.cost;
  if(k==='md') S.inv.md[st]=true; else S.inv[k]=true;
  if(PAR()) advance(I.hrs); else S.hours-=I.hrs;
  log('ok',`★ 工程投資：${I.name}${k==='md'?`（${STACKS[st].name}）`:''}｜${h1(I.hrs)}h｜公司 ${nt(I.cost)}`);
  return true;
}
/* 做 skills 之後：一次派出所有複雜度 ≤2 的工單 */
function batch(){
  if(!S.inv.skills) return;
  let n=0,skip=0;
  for(const is of S.issues.filter(i=>!i.running&&i.cx<=2).sort(queueOrder)){
    if(!canQuick()) break;
    const {i}=presetFor(is);
    if(i<0){skip++;continue;}
    if(!PAR()){const p=S.presets[i]; if(est(is,p.v,p.m,p.rv).hrs>S.hours) break;}
    if(quick(is.id)) n++; else skip++;
  }
  log('dim',`· 批次派工：派出 ${n} 張，略過 ${skip} 張`);
}
const INV_STACKS=()=>[...S.companies,...COMPANIES.filter(k=>!S.companies.includes(k)),'fe'];
function invHint(is){
  const out=[];
  if(S.inv.md[is.stack]) out.push(`${STACKS[is.stack].name} 有 CLAUDE.md：token ×${MD_TK}、成功率 +${Math.round(MD_P*100)}%`);
  if(S.inv.sdd) out.push(`SDD：token ×${SDD_TK}${is.cx>=3?`、成功率 +${Math.round(SDD_P*100)}%`:''}`);
  if(S.inv.tests) out.push(`有測試：抓錯率 +${Math.round(TEST_CATCH*100)}%、合併衝突減半`);
  if(S.inv.mcp) out.push(`MCP 文件：識破率 +${Math.round(MCP_REVEAL*100)}%、評估時間減半`);
  return out.length?`工程投資：${out.join('；')}。`:'';
}

const EVENTS=[
  ()=>{const v=pick(APIV);S.priceMod[v]*=.7;return [`${VENDORS[v].name} 新模型上架，API 降價 30%`,'接下來整個月這家的 API 都比較便宜。'];},
  ()=>{const v=pick(APIV);S.outage=v;return [`${VENDORS[v].name} 服務大當機`,`今天 ${VENDORS[v].agent} 全部不能用，不管你付的是哪種錢。`];},
  ()=>{if(S.cnBan||S.day<8)return ['主管在週會上提醒','「用 AI 前先看清楚案主合約。」沒有其他變化。'];if(0)return ['資安部門發布新版 AI 使用規範','內容跟上次一樣，大家已讀不回。'];S.cnBan=true;return ['主管宣布：全公司暫停把程式碼送到中國雲端模型','從今天起所有工單都不能用 DeepSeek、GLM、Kimi 的雲端服務，本地跑的開源權重不受影響。'];},
  ()=>{S.corp*=.7;return ['年度預算凍結','公司 API 剩餘預算砍 30%。'];},
  ()=>{const v=pick(SUBV);S.capMod[v]*=.8;return [`${VENDORS[v].name} 調整訂閱用量政策`,'這家訂閱的每日與每週額度縮水 20%。'];},
  ()=>{S.issues.push(makeIssue(true));S.issues.push(makeIssue(true));return ['大新聞爆發，流量暴增','一次進來兩張事故單，今天下班前要處理。'];},
  ()=>{const g=S.kpi>S.day*7;S.trust=Math.max(0,Math.min(100,S.trust+(g?6:-4)));return g?['主管在週會上點名稱讚','「AI 工具用得很有效率。」信任 +6。']:['主管問進度怎麼這麼慢','「不是有買 AI 嗎？」信任 -4。'];},
  ()=>{S.wallet+=1500;return ['外包案尾款入帳','個人錢包 +NT$1,500，可以拿來養 token。'];},
];

function endDay(){
  const rep=[];
  if(PAR()&&S.jobs.length) advance(S.hours);
  const killed=cancelJobs(j=>j.issue.due<=S.day,'到期還沒跑完，只好中止');
  if(killed) rep.push(`${killed} 個背景 agent 跑到截止還沒完成，被你中止了。`);
  const late=S.issues.filter(i=>i.due<=S.day);
  late.forEach(i=>{const pen=Math.ceil(i.kpi*.5);S.kpi-=pen;S.st.kpiLost+=pen;S.trust=Math.max(0,S.trust-(i.inc?8:4));S.st.late++;log('bad',`⌛ 逾期：${i.title}｜KPI -${pen}`);});
  S.issues=S.issues.filter(i=>i.due>S.day);
  if(late.length) rep.push(`${late.length} 張工單逾期，主管信任下降。`);
  if(S.corpDay>1500){S.trust=Math.max(0,S.trust-6);rep.push(`今天公司 API 刷了 ${nt(S.corpDay)}，主管在 Slack 問你在幹嘛（信任 -6）。`);log('warn',`! 公司單日花費 ${nt(S.corpDay)} 太高，信任 -6`);}
  if(S.day>=20){render();return showEnd();}
  S.day++; S.hours=8; S.corpDay=0; S.outage=null;
  for(const k of ['sub','seat'])for(const v in S.used[k])S.used[k][v].d=0;
  const monday=(S.day-1)%5===0;
  if(monday)for(const k of ['sub','seat'])for(const v in S.used[k])S.used[k][v].w=0;
  if(S.seat.status==='pending'&&S.day>=S.seat.day+5){
    if(S.trust>=55){S.seat.status='approved';rep.push(`採購通過：公司幫你開了 ${VENDORS[S.seat.vendor].name} 團隊席位。`);log('ok',`★ ${VENDORS[S.seat.vendor].name} 團隊席位核准`);}
    else{S.seat.status='rejected';rep.push('採購被退件：主管信任不夠（需要 55 以上）。');log('bad','✗ 團隊席位申請被退件');}
  }
  let ev=null; if(Math.random()<.55) ev=pick(EVENTS)();
  if(S.outage){const n=cancelJobs(j=>j.v===S.outage,'廠商當機，session 斷了');if(n)rep.push(`${n} 個跑在 ${VENDORS[S.outage].name} 的 agent 因為當機斷線。`);}
  if(S.jobs.length){ S.jobs.forEach(j=>j.left=Math.max(.05,j.left-3)); rep.push(`${S.jobs.length} 個 agent 跑了一整晚，一早會陸續有結果。`); }
  const n=PAR()?3+rnd(4):2+rnd(3); for(let i=0;i<n;i++)S.issues.push(makeIssue(Math.random()<.12));
  log('dim',`— 第 ${S.day} 天開工，新進 ${n} 張工單 —`);
  sel.issue=null;
  render(); showDay(rep,ev,monday);
}

/* ===== 畫面 ===== */
const app=document.getElementById('app'), ov=document.getElementById('ov'), mo=document.getElementById('mo');

function render(){
  const weekOf=d=>Math.ceil(d/5);
  let cal='';
  for(let w=1;w<=4;w++){let c='';for(let d=(w-1)*5+1;d<=w*5;d++)c+=`<span class="d ${d<S.day?'past':d===S.day?'now':''}">${d}</span>`;cal+=`<div class="wk"><b>第 ${w} 週</b><div>${c}</div></div>`;}

  const meters=`
  <div class="meters">
    ${PAR()?`<div class="m"><label>現在時間</label><span class="v">${clock(8-S.hours)}<small style="font-size:13px"> / 17:00</small></span><div class="bar"><i style="width:${S.hours/8*100}%"></i></div><span class="s">背景 agent ${S.jobs.length} / ${S.slots}</span></div>`
    :`<div class="m"><label>今日剩餘工時</label><span class="v">${h1(S.hours)}<small style="font-size:13px"> / 8h</small></span><div class="bar"><i style="width:${S.hours/8*100}%"></i></div></div>`}
    <div class="m"><label>個人錢包</label><span class="v ${S.wallet<0?'neg':''}">${nt(S.wallet)}</span><span class="s">訂閱費 ${nt(S.st.subFee)}・API ${nt(S.st.api)}</span></div>
    <div class="m"><label>公司 API 預算</label><span class="v">${nt(S.corp)}</span><span class="s">今日已刷 ${nt(S.corpDay)}</span></div>
    <div class="m"><label>主管信任</label><span class="v ${S.trust<40?'neg':''}">${Math.round(S.trust)}</span><div class="bar"><i style="width:${S.trust}%;background:${S.trust<40?'var(--bad)':'var(--ok)'}"></i></div></div>
    <div class="m"><label>KPI</label><span class="v">${S.kpi}</span><span class="s">完成 ${S.st.done}・逾期 ${S.st.late}</span></div>
  </div>`;

  let qs='';
  for(const v of SUBV){
    const p=planOf(v);
    if(p.id==='none'){continue;}
    const u=S.used.sub[v], cm=S.capMod[v], dl=Math.max(0,p.day*cm-u.d), wl=Math.max(0,p.week*cm-u.w);
    qs+=qbox(`${VENDORS[v].name} ${p.name}`,S.outage===v?'今日當機':'個人訂閱',dl,p.day*cm,wl,p.week*cm);
  }
  if(S.seat.status==='approved'){const u=S.used.seat[S.seat.vendor];qs+=qbox(`${VENDORS[S.seat.vendor].name} 團隊席位`,'公司付費',Math.max(0,SEAT.day-u.d),SEAT.day,Math.max(0,SEAT.week-u.w),SEAT.week);}
  else if(S.seat.status==='pending') qs+=`<div class="q none">團隊席位採購審核中，預計第 ${S.seat.day+5} 天有結果</div>`;
  if(!qs) qs=`<div class="q none">目前沒有任何訂閱。只能用 API、公司預算或本地模型。</div>`;

  const jobsHtml=!PAR()?'':`<div class="ph" style="margin-top:6px"><h2>背景 agent</h2><span>${S.jobs.length} / ${S.slots} 個工作槽</span></div>
    <div class="jobs">${S.jobs.map(j=>{const pr=Math.max(0,1-j.left/j.hrs);const lbl=BILL_LABEL[j.b];
      return `<div class="job" style="--vc:${vc(j.v)}"><div class="jt"><b>${j.issue.title}</b><span class="num">${clock(8-S.hours+j.left)} 完成</span></div>
      <div class="jm">${VENDORS[j.v].agent} / ${j.M.name}・${lbl}${j.issue.due<=S.day?'・<span style="color:var(--bad)">今天到期</span>':''}</div>
      <div class="bar"><i style="width:${pr*100}%;background:var(--vc)"></i></div></div>`;}).join('')
      ||'<div class="empty" style="padding:14px">沒有 agent 在跑。派出去的工作會在這裡同時進行。</div>'}</div>`;
  const list=S.issues.filter(i=>!i.running).sort(queueOrder).map(i=>{
    const left=i.due-S.day;
    return `<div class="issw"><button class="iss ${sel.issue===i.id?'sel':''}" data-iss="${i.id}">
      <span class="t">${i.title}</span><span class="k">+${i.kpi}</span>
      <span class="meta"><span class="pips" title="複雜度 ${i.cx}">${[1,2,3,4,5].map(n=>`<i class="${n<=i.cx?'on':''}"></i>`).join('')}</span>
      <span class="num">~${kt(i.base)} tokens</span>
      <span class="chip stack">${STACKS[i.stack].name}</span>${unfamiliar(i)?'<span class="chip unfam">不熟</span>':''}${i.merge?'<span class="chip trap">合併衝突</span>':''}${i.store?'<span class="chip store">需上架審核</span>':''}${i.revealed?`<span class="chip trap">牽一髮動全身・原估 ${i.shownCx}</span>`:i.evaluated?'<span class="chip">已評估</span>':''}
      ${i.inc?'<span class="chip inc">事故</span>':''}${i.sens?'<span class="chip sens">機敏</span>':''}${i.big?'<span class="chip big">大型 codebase</span>':''}${i.client.ban?`<span class="chip ban">${i.client.name}・${i.client.ban==='all'?'禁中國模型':'禁中國雲端'}</span>`:S.cnBan?'<span class="chip ban">禁中國雲端</span>':`<span class="chip">${i.client.name}</span>`}
      <span class="chip ${left<=0?'due':''}">${left<=0?'今天到期':`剩 ${left} 天`}</span>${i.tries?`<span class="chip">已失敗 ${i.tries} 次</span>`:''}</span>
    </button>${quickBtn(i)}</div>`;}).join('') || `<div class="empty">工單清空了。可以提早下班，把工時留給明天。</div>`;

  app.innerHTML=`
  <header class="top">
    <div class="brand"><h1><span class="tk">Token</span> 撐到月底</h1><p>${companyName()}・全端工程師・20 個工作天，有限的錢和額度，把工單做完。</p></div>
    <div class="cal">${cal}</div>
  </header>
  ${meters}
  <div class="quotas">${qs}</div>
  <div class="main">
    <section class="panel"><div class="ph"><h2>工單佇列</h2><span>${S.issues.filter(i=>!i.running).length} 張・依到期排序</span></div>${S.inv.skills?`<button class="btn ghost" data-act="batch" ${canQuick()?'':'disabled'}>批次派工（複雜度 ≤2）</button>`:''}<div class="issues">${list}</div>${jobsHtml}</section>
    <section class="panel">${dispatchPanel()}</section>
  </div>
  ${invPanel()}
  <section class="panel">
    <div class="foot"><div class="ph"><h2>執行紀錄</h2></div>
      <div class="actions">${PAR()?`<button class="btn ghost" data-act="wait1" ${S.hours<=0?'disabled':''}>等 1 小時</button><button class="btn ghost" data-act="waitn" ${!S.jobs.length||S.hours<=0?'disabled':''}>等到下一個 agent 完成</button>`:''}${((S.day-1)%5===0)?'<button class="btn ghost" data-act="adjust">調整訂閱</button>':''}<button class="btn" data-act="end">下班，結束第 ${S.day} 天</button></div></div>
    <div class="log">${S.log.map(l=>`<p class="${l.cls}">${l.msg}</p>`).join('')||'<p class="dim">還沒有紀錄。點左邊一張工單開始派工。</p>'}</div>
    <small style="color:var(--muted);font-size:12px">價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。</small>
  </section>`;
}
/* 工單卡片上的一鍵派工按鈕：顯示會用哪個方案、前面的方案為什麼不能用 */
function quickBtn(is){
  const {i,skip}=presetFor(is);
  if(i<0) return `<button class="qk" disabled><b>沒有可用方案</b>${skip.length?`<span class="why">${PN[skip[0].i]} 不能用：${skip[0].r}</span>`:''}</button>`;
  const p=S.presets[i], risk=auditRisk(is,p.b);
  return `<button class="qk" data-quick="${is.id}" ${canQuick()?'':'disabled'}><b>一鍵派工：方案 ${PN[i]}</b><span>${VENDORS[p.v].agent} / ${model(p.v,p.m).name}・${BILL_LABEL[p.b]}</span>${skip.length?`<span class="why">${PN[skip[0].i]} 不能用：${skip[0].r}</span>`:''}${risk?`<span class="why">機敏工單用個人帳號：${Math.round(auditOdds(p.v)*100)}% 機率被資安稽核</span>`:''}</button>`;
}
function invPanel(){
  const btn=(k,st)=>{const I=INVEST[k], why=investBlock(k,st);
    return `<button class="sb" data-inv="${k}" ${st?`data-st="${st}"`:''} ${why?'disabled':''}><b>${k==='md'?STACKS[st].name:I.name}</b><small>${why||`${I.hrs}h・公司 ${nt(I.cost)}`}</small></button>`;};
  const row=(k,body)=>`<div class="inv"><div><b>${INVEST[k].name}</b><span>${INVEST[k].desc}${k==='md'?`・每條技術線 ${INVEST.md.hrs}h、公司 ${nt(INVEST.md.cost)}`:''}</span></div><div class="seg">${body}</div></div>`;
  return `<section class="panel"><div class="ph"><h2>工程投資</h2><span>效果維持到月底・已做 ${invCount()} 項</span></div>
    <div class="invs">${row('md',INV_STACKS().map(st=>btn('md',st)).join(''))}${['tests','skills','mcp','sdd'].map(k=>row(k,btn(k))).join('')}</div></section>`;
}
function qbox(name,sub,dl,dc,wl,wc){
  const dp=dc?dl/dc*100:0, wp=wc?wl/wc*100:0;
  return `<div class="q"><div class="nm">${name}<span>${sub}</span></div>
    <label>今日</label><div><div class="bar"><i class="${dp<20?'lo':''}" style="width:${dp}%"></i></div><span class="num" style="font-size:11px;color:var(--muted)">${kt(dl)} / ${kt(dc)}</span></div>
    <label>本週</label><div><div class="bar"><i class="${wp<20?'lo':''}" style="width:${wp}%"></i></div><span class="num" style="font-size:11px;color:var(--muted)">${kt(wl)} / ${kt(wc)}</span></div></div>`;
}

function dispatchPanel(){
  const is=S.issues.find(i=>i.id===sel.issue);
  if(!is) return `<div class="ph"><h2>派工台</h2></div><div class="empty">先從工單佇列選一張。<br>每張單可以挑一家 agent、一個模型，再決定這筆 token 誰來付。</div>`;
  // ensure billing valid
  const avail=(v,M)=>S.outage!==v&&!cnBlock(is,v,M);
  if(!avail(sel.v,model(sel.v,sel.m))){for(const v in VENDORS){const M=VENDORS[v].models.find(M=>avail(v,M));if(M){sel.v=v;sel.m=M.id;break;}}if(sel.v==='local')sel.b='local';else if(sel.b==='local')sel.b='api';}
  let bl=bills(sel.v); if(!bl.find(b=>b.id===sel.b&&b.ok)){const f=bl.find(b=>b.ok);sel.b=f?f.id:bl[0].id;}
  const rows=Object.keys(VENDORS).map(v=>{
    const V=VENDORS[v], down=S.outage===v;
    return `<div class="vrow" style="--vc:${vc(v)}"><div class="vn"><b>${V.name}</b><span>${down?'今日當機':V.agent}</span>${V.cn?'<span class="cn">中國廠商</span>':''}</div>
      <div class="mods">${V.models.map(M=>{const why=cnBlock(is,v,M);return `<button class="mb ${sel.v===v&&sel.m===M.id?'sel':''}" data-v="${v}" data-m="${M.id}" ${down||why?'disabled':''}><b>${M.name}</b><span>能力 ${'●'.repeat(M.cap)}${'○'.repeat(5-M.cap)}</span><span class="${why?'why':''}">${why||(M.price?`$${M.price}/k`:'免費')}${!why&&M.cn?'・中國權重':''}</span></button>`;}).join('')}</div></div>`;
  }).join('');
  const e=est(is,sel.v,sel.m), M=e.M, cl=costLine(sel.b,M,sel.v,e);
  const segs=bl.map(b=>`<button class="sb ${sel.b===b.id?'sel':''}" data-b="${b.id}" ${b.ok?'':'disabled'}>${b.label}<small>${b.note}</small></button>`).join('');
  const pc=e.pe>=.8?'good':e.pe>=.5?'meh':'bad';
  let warn='';
  if(S.outage===sel.v) warn='這家今天當機，換一家吧。';
  else if(sel.b==='local'&&localBusy()) warn='本地 GPU 已經有一個 agent 在跑，等它跑完才能再派。';
  else if(is.sens&&VENDORS[sel.v].cn) warn=`機敏工單送到中國雲端：有 ${Math.round(auditOdds(sel.v)*100)}% 機率被資安稽核抓到。`;
  else if(is.sens&&(sel.b==='sub'||sel.b==='api')) warn=`機敏工單用個人帳號：有 ${Math.round(auditOdds(sel.v)*100)}% 機率被資安稽核抓到。`;
  else if((sel.b==='sub'||sel.b==='seat')&&cl.hi>quotaLeft(sel.b,sel.v)) warn='剩餘額度可能不夠，跑到一半會被限流。';
  else if(PAR()&&S.jobs.length>=S.slots) warn='工作槽都滿了，先等一個 agent 跑完。';
  else if(PAR()&&is.due<=S.day&&e.hrs+.2>S.hours) warn='這張今天到期，但下班前跑不完，會逾期。';
  else if(PAR()&&e.hrs+.2>S.hours) warn='今天跑不完，agent 會跑過夜，明早才有結果。';
  else if(!PAR()&&e.hrs*1.2>S.hours) warn='今天剩的工時可能不夠跑完。';
  else if(sel.b==='api'&&cl.hi>S.wallet) warn='錢包可能不夠付這一筆。';
  const mh=manualHrs(is), ec=evalCost(model(sel.v,sel.m));
  const blocked=S.outage===sel.v||!!cnBlock(is,sel.v,model(sel.v,sel.m))||(sel.b==='local'&&localBusy());
  return `<div class="ph"><h2>派工台</h2><span>${is.title}</span></div>
  <div class="sec"><label>選 AGENT 與模型</label>${rows}</div>
  <div class="sec"><label>誰付這筆 TOKEN</label><div class="seg">${segs}</div>${S.seat.status==='approved'&&S.seat.vendor!==sel.v?`<p class="hint">你有 ${VENDORS[S.seat.vendor].name} 團隊席位，選 ${VENDORS[S.seat.vendor].agent} 的模型才能用公司席位付款。</p>`:''}</div>
  <div class="sec"><label>自我審核</label><div class="seg">${REVIEW.map((r,i)=>`<button class="sb ${sel.rv===i?'sel':''}" data-rv="${i}">${r.name}<small>${i?`token ×${r.tk}・抓錯 ${Math.round(catchRate(i,M)*100)}%`:'改壞就整單重做'}</small></button>`).join('')}</div></div>
  <div class="sec"><label>派工方案</label><div class="seg">${S.presets.map((p,i)=>`<button class="sb" data-load="${i}">載入方案 ${PN[i]}<small>${model(p.v,p.m).name}・${BILL_LABEL[p.b]}・${REVIEW[p.rv].name}</small></button>`).join('')}</div>
    <div class="seg">${PN.map((n,i)=>`<button class="sb" data-save="${i}">存成方案 ${n}<small>用上面的選擇</small></button>`).join('')}</div></div>
  <div class="est">
    <div><label>預估 tokens${parMul()>1?` ×${parMul().toFixed(2)}`:''}</label><b>${kt(e.lo)}–${kt(e.hi)}</b></div>
    <div><label>${cl.t}</label><b>${cl.unit==='q'?`${kt(cl.lo)}–${kt(cl.hi)}`:cl.hi?`${nt(cl.lo)}–${nt(cl.hi)}`:'NT$0'}</b></div>
    <div><label>成功率${sel.rv||is.store?`（原 ${Math.round(e.p*100)}%）`:''}</label><b class="${pc}">${Math.round(e.pe*100)}%</b></div>
    <div><label>${PAR()?'執行時間':'工時'}</label><b>${h1(e.hrs)}h</b></div>
  </div>
  ${stackHint(is)?`<p class="hint">${stackHint(is)}</p>`:''}
  ${invHint(is)?`<p class="hint">${invHint(is)}</p>`:''}
  ${PAR()&&S.jobs.length?`<p class="hint">平行加成：已有 ${S.jobs.length} 個 agent 在跑，這張的 token 用量 ×${parMul().toFixed(2)}；完成時每多一個同時在跑的 agent，合併衝突機率 +10%；衝突時會留下一張「解決衝突」工單，KPI 等它完成才拿。</p>`:''}
  <div class="warnline">${warn}</div>
  <div class="actions">
    <button class="btn primary" data-act="go" ${blocked||S.hours<.2||(PAR()&&S.jobs.length>=S.slots)?'disabled':''}>${PAR()?'派到背景':'派給'} ${VENDORS[sel.v].agent}</button>
    <button class="btn ghost" data-act="manual" ${mh>S.hours||localBusy()?'disabled':''}>${localBusy()?'本地 GPU 跑 agent 中，電腦卡到沒辦法手寫':`自己手寫（${h1(mh)}h，0 token）`}</button>
    ${canEvaluate(is)?`<button class="btn ghost" data-act="eval" ${blocked||ec.hrs>S.hours?'disabled':''}>先讓 agent 評估架構（${kt(ec.tk)} tokens，${h1(ec.hrs)}h）</button>`:''}
    ${is.revealed&&!is.rescoped?`<button class="btn ghost" data-act="rescope">找主管重新評估</button>`:''}
  </div>`;
}

/* ===== 彈窗 ===== */
let draft=null;
function planPicker(adjust){
  const rows=SUBV.map(v=>{
    const V=VENDORS[v];
    return `<div class="pv" style="--vc:${vc(v)}"><b>${V.name}・${V.agent}</b><div class="seg">${V.plans.map(p=>`<button class="sb ${draft.subs[v]===p.id?'sel':''}" data-pv="${v}" data-pp="${p.id}">${p.name}<small>${p.price?`${nt(p.price)}/月・每日 ${kt(p.day)}`:'只用 API'}</small></button>`).join('')}</div></div>`;
  }).join('');
  const canSeat=!adjust||S.seat.status==='none'||S.seat.status==='rejected';
  const seat=canSeat?`<div class="pv" style="--vc:var(--accent)"><b>向公司申請團隊席位（5 天後審核，信任需 55 以上）</b><div class="seg">
    ${[['','不申請'],...SEAT.vendors.map(v=>[v,VENDORS[v].name])].map(([v,n])=>`<button class="sb ${draft.seat===v?'sel':''}" data-seat="${v}">${n}<small>${v?'公司付・每日 2.5M 額度':'自己想辦法'}</small></button>`).join('')}</div></div>`:'';
  const cost=planCost(adjust);
  return `${rows}${seat}<div class="sum"><span>這次要從個人錢包付</span><b class="num">${nt(cost)}</b><span>付完剩 <b class="num">${nt(S.wallet-cost)}</b></span></div>`;
}
function planCost(adjust){
  let c=0; const wl=adjust?4-Math.floor((S.day-1)/5):4;
  for(const v of SUBV){
    const np=VENDORS[v].plans.find(p=>p.id===draft.subs[v]).price, op=adjust?planOf(v).price:0;
    c+=Math.max(0,np-op)*wl/4;
  }
  return c;
}
/* 開局的公司按鈕：選滿兩條不能再加、最後一條不能取消，結果照固定順序 */
function toggleCompany(cs,k){
  if(cs.includes(k)) return cs.length>1?cs.filter(x=>x!==k):cs;
  return cs.length<2?COMPANIES.filter(x=>x===k||cs.includes(x)):cs;
}
function showSetup(adjust){
  draft={subs:{...S.subs},seat:'',mode:S.mode,companies:[...S.companies],slots:S.slots};
  const draw=()=>{
    mo.innerHTML=`<h2>${adjust?'週一：調整訂閱':'月初：決定這個月怎麼付 token'}</h2>
    ${adjust?`<p class="lead">升級只補剩下週數的差價，降級不退費。</p>`:`<p class="lead">你是全端工程師，任職於「${companyName(draft.companies)}」。接下來 20 個工作天，每天都會有新工單進來。你有 ${nt(S.wallet)} 的個人 AI 預算，部門另外有 ${nt(S.corp)} 的公司 API 預算。</p>
    <ul class="rules">
      <li><b>個人訂閱</b>月費固定，有每日與每週額度，越強的模型吃額度越快。額度用完 agent 會停在一半。</li>
      <li><b>個人 API</b> 用多少付多少，沒有上限，錢從你口袋出。</li>
      <li><b>公司 API</b> 不花你的錢，但只能用公司簽約的廠商，單日刷太兇主管會不高興。</li>
      <li>標著「機敏」的工單送進個人帳號，有機率被資安稽核抓到；送到中國雲端機率更高。</li>
      <li><b>自我審核</b>讓 agent 寫完再自己檢查一輪：token 和時間會加成，但改壞時有機會當場修好，不用整單重做。能力越強的模型越會抓錯。</li>
      <li><b>中國模型</b>（DeepSeek、GLM、Kimi）便宜又夠用，但每張工單有案主：金融客戶禁止資料送往中國雲端，政府標案連本地跑的中國開源權重（Qwen）都不能用。</li>
      <li><b>技術線</b>：可以選 1–2 條主技術線，大部分工單平分給它們，也會有前端工單和少量其他技術線的工單。沒選的技術線算不熟，自己手寫要花兩倍時間。</li>
      <li><b>派工方案與工程投資</b>：存三組常用組合，工單卡片上一鍵派工；花工時和公司預算寫 CLAUDE.md、補測試、做 skills、接 MCP 文件、導入 SDD，越早做越划算。</li>
      <li>工單逾期扣 KPI 和信任。月底結算看 KPI、信任，還有你自己花了多少錢。</li>
    </ul>
    <div class="sec"><label>公司（可選 1–2 條主技術線）</label><div class="modes">
      ${COMPANIES.map(k=>{const on=draft.companies.includes(k);return `<button class="sb ${on?'sel':''}" data-company="${k}" ${!on&&draft.companies.length>=2?'disabled':''}><b>${STACKS[k].company}</b><small>難度 ${'★'.repeat(STACKS[k].level)}・${STACKS[k].desc}</small></button>`;}).join('')}
    </div></div>
    <div class="sec"><label>遊戲模式</label><div class="modes">
      <button class="sb ${draft.mode==='parallel'?'sel':''}" data-mode="parallel"><b>平行模式</b><small>最多 ${draft.slots} 個 agent 在背景同時跑，你的時間花在派工和審 PR。同時跑越多，token 用量加成越高，也越容易合併衝突。跑不完的會過夜。</small></button>
      <button class="sb ${draft.mode==='serial'?'sel':''}" data-mode="serial"><b>單線模式</b><small>一次只處理一張，agent 跑多久你就等多久。比較單純，適合先熟悉付費方式的取捨。</small></button>
    </div></div>
    ${draft.mode==='parallel'?`<div class="sec"><label>同時跑幾個 agent</label><div class="seg">${SLOT_CHOICES.map(n=>`<button class="sb ${draft.slots===n?'sel':''}" data-slots="${n}">同時 ${n} 個 agent<small>token 最多 ×${(1+.15*(n-1)).toFixed(2)}・衝突最多 ${Math.round(10*(n-1))}%</small></button>`).join('')}</div></div>`:''}`}
    <div class="plans">${planPicker(adjust)}</div>
    <div class="actions"><button class="btn primary" data-act="confirm">${adjust?'確定調整':'開始第 1 天'}</button>${adjust?'<button class="btn ghost" data-act="close">不改了</button>':''}</div>`;
  };
  draw(); ov.hidden=false;
  mo.onclick=ev=>{
    const t=ev.target.closest('button'); if(!t) return;
    if(t.dataset.pv){draft.subs[t.dataset.pv]=t.dataset.pp;draw();}
    else if(t.dataset.seat!==undefined){draft.seat=t.dataset.seat;draw();}
    else if(t.dataset.mode){draft.mode=t.dataset.mode;draw();}
    else if(t.dataset.company){draft.companies=toggleCompany(draft.companies,t.dataset.company);draw();}
    else if(t.dataset.slots){draft.slots=+t.dataset.slots;draw();}
    else if(t.dataset.act==='close'){ov.hidden=true;}
    else if(t.dataset.act==='confirm'){
      const c=planCost(adjust); S.wallet-=c; S.st.subFee+=c;
      if(!adjust){
        if(draft.companies.join()!==S.companies.join()){S.companies=draft.companies;firstIssues();}
        S.mode=draft.mode; S.slots=draft.slots; log('dim',`· ${companyName()}・遊戲模式：${PAR()?`平行（同時 ${S.slots} 個 agent）`:'單線'}`);
      }
      for(const v in draft.subs) if(draft.subs[v]!==S.subs[v]){ S.subs[v]=draft.subs[v]; }
      if(draft.seat){S.seat={vendor:draft.seat,status:'pending',day:S.day};log('dim',`· 提出 ${VENDORS[draft.seat].name} 團隊席位採購申請`);}
      const names=SUBV.filter(v=>S.subs[v]!=='none').map(v=>`${VENDORS[v].name} ${planOf(v).name}`);
      log('dim',`· 訂閱：${names.join('、')||'無'}${c?`（付 ${nt(c)}）`:''}`);
      ov.hidden=true; render();
    }
  };
}
function showDay(rep,ev,monday){
  mo.innerHTML=`<h2>第 ${S.day} 天${monday?'・新的一週':''}</h2>
  ${monday?'<p class="lead">每週額度已重置。今天可以調整訂閱方案。</p>':''}
  ${ev?`<div class="evt"><b>${ev[0]}</b>${ev[1]}</div>`:''}
  ${rep.length?`<ul class="rules">${rep.map(r=>`<li>${r}</li>`).join('')}</ul>`:''}
  <p class="lead">佇列裡有 ${S.issues.length} 張工單，其中 ${S.issues.filter(i=>i.due<=S.day).length} 張今天到期。</p>
  <div class="actions"><button class="btn primary" data-act="close">開工</button>${monday?'<button class="btn ghost" data-act="adj">調整訂閱</button>':''}</div>`;
  ov.hidden=false;
  mo.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.act==='close')ov.hidden=true;if(t.dataset.act==='adj')showSetup(true);};
}
function showEnd(){
  const self=S.st.subFee+S.st.api;
  const score=Math.round(S.kpi*10+S.trust*4+Math.max(-4000,8000-self)/8-S.st.audits*80);
  const gm=PAR()?1.6:1; const g=score>=4600*gm?'S':score>=3800*gm?'A':score>=3000*gm?'B':score>=2200*gm?'C':'D';
  const tot=Object.values(S.st.tk).reduce((a,b)=>a+b,0)||1;
  let title,desc;
  if(S.st.audits>=2){title='資安部門的常客';desc='機敏程式碼進了個人帳號太多次。'}
  else if(self>7000){title='自費養 AI 的勇者';desc='公司的 KPI，你的信用卡。'}
  else if(S.st.corp>10500){title='公司帳單上的頭號人物';desc='財務記住你的名字了。'}
  else if(['deepseek','zhipu','moonshot'].reduce((a,v)=>a+S.st.tk[v],0)/tot>.4){title='對岸模型省錢達人';desc='帳單很漂亮，但每張單都要先看案主是誰。'}
  else if(S.st.tk.local/tot>.4){title='地端信仰者';desc='慢一點沒關係，資料不出門。'}
  else if(S.st.manual>12){title='手工藝工程師';desc='Token 省下來了，工時也燒掉了。'}
  else if(g==='S'||g==='A'){title='Token 精算師';desc='每一個 token 都花在刀口上。'}
  else {title='還在摸索的開發者';desc='下個月再調整組合試試。'}
  /* 最高分依模式與公司分開記錄；Laravel 沿用改版前的舊 key */
  let best=0; const bk=bestKey();
  try{best=+localStorage.getItem(bk)||(S.companies.join()==='laravel'?+localStorage.getItem('tokgame-best-'+S.mode)||0:0); if(score>best)localStorage.setItem(bk,score);}catch(e){}
  const vendorLines=Object.keys(S.st.tk).filter(v=>S.st.tk[v]>0).map(v=>`<div><span>${VENDORS[v].name}</span><span>${kt(S.st.tk[v])} tokens・${Math.round(S.st.tk[v]/tot*100)}%</span></div>`).join('')||'<div><span>沒有用到任何 agent</span><span>—</span></div>';
  mo.innerHTML=`<h2>月底結算・${companyName()}・${PAR()?`平行模式（${S.slots} 個 agent）`:'單線模式'}</h2>
  <div class="grade"><span class="g">${g}</span><div class="gt"><b>${title}</b><span>${desc}</span></div></div>
  <div class="rc">
    <div><span>個人訂閱月費</span><span>${nt(S.st.subFee)}</span></div>
    <div><span>個人 API 帳單</span><span>${nt(S.st.api)}</span></div>
    <div class="tot"><span>你自己掏的錢</span><span>${nt(self)}</span></div>
    <div><span>公司 API 帳單</span><span>${nt(S.st.corp)}</span></div>
    <hr>${vendorLines}<hr>
    <div><span>完成工單</span><span>${S.st.done} 張</span></div>
    <div><span>逾期工單</span><span>${S.st.late} 張（KPI -${S.st.kpiLost}）</span></div>
    <div><span>自己手寫</span><span>${S.st.manual} 次</span></div>
    <div><span>審核救回</span><span>${S.st.caught} 張</span></div>
    <div><span>踩到陷阱</span><span>${S.st.trapHit} 次</span></div>
    <div><span>事先識破</span><span>${S.st.trapFound} 次</span></div>
    <div><span>工程投資</span><span>${invCount()} 項</span></div>
    ${PAR()?`<div><span>合併衝突</span><span>${S.st.conflicts} 次</span></div>`:''}
    <div><span>資安稽核</span><span>${S.st.audits} 次</span></div>
    <div><span>主管信任</span><span>${Math.round(S.trust)}</span></div>
    <div><span>KPI</span><span>${S.kpi}</span></div>
    <hr><div class="tot"><span>總分</span><span>${score.toLocaleString('en-US')}</span></div>
    ${best?`<div><span>先前最佳</span><span>${best.toLocaleString('en-US')}</span></div>`:''}
  </div>
  <p class="lead">總分 = KPI × 10 + 信任 × 4 + 省下的個人預算 ÷ 8 − 稽核次數 × 80</p>
  <div class="actions"><button class="btn primary" data-act="again">再玩一個月</button><button class="btn ghost" data-act="close">看看紀錄</button></div>`;
  ov.hidden=false;
  mo.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.act==='again')start();if(t.dataset.act==='close'){ov.hidden=true;app.querySelector('[data-act="end"]')?.setAttribute('disabled','');}};
}

/* ===== 事件 ===== */
app.addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t||t.disabled) return;
  if(t.dataset.iss){sel.issue=+t.dataset.iss;render();}
  else if(t.dataset.v){sel.v=t.dataset.v;sel.m=t.dataset.m;if(sel.v==='local')sel.b='local';else if(sel.b==='local')sel.b='api';render();}
  else if(t.dataset.b){sel.b=t.dataset.b;render();}
  else if(t.dataset.rv){sel.rv=+t.dataset.rv;render();}
  else if(t.dataset.quick)quick(+t.dataset.quick);
  else if(t.dataset.inv){invest(t.dataset.inv,t.dataset.st);render();}
  else if(t.dataset.act==='batch'){batch();render();}
  else if(t.dataset.load){loadPreset(+t.dataset.load);render();}
  else if(t.dataset.save){savePreset(+t.dataset.save);render();}
  else if(t.dataset.act==='go')dispatch();
  else if(t.dataset.act==='manual')manual();
  else if(t.dataset.act==='eval')evaluate();
  else if(t.dataset.act==='rescope')rescope();
  else if(t.dataset.act==='end')endDay();
  else if(t.dataset.act==='wait1')wait(false);
  else if(t.dataset.act==='waitn')wait(true);
  else if(t.dataset.act==='adjust')showSetup(true);
});

/* 第 1 天的工單依公司產生；開局換公司時重抽 */
function firstIssues(){
  resetIds(); S.issues=[]; S.log=[];
  for(let i=0;i<4;i++)S.issues.push(makeIssue(false));
  log('dim','— 第 1 天開工，新進 4 張工單 —');
}
function start(){
  fresh(); firstIssues();
  render(); showSetup(false);
}
start();
