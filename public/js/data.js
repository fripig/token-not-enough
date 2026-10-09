import {S} from './state.js';

/* ===== 資料（數字為遊戲平衡用，非實際報價） ===== */
/* 遊戲版本：部署時 .github/workflows/pages.yml 把 'dev' 換成短 commit hash，本機與 node 工具維持 dev */
export const GAME_VERSION='dev';
export const VENDORS={
  anthropic:{name:'Anthropic',agent:'Claude Code',vc:'--anth',corp:true,
    plans:[{id:'none',name:'不訂閱',price:0},{id:'pro',name:'Pro',price:650,day:450,week:1800},{id:'max5',name:'Max 5×',price:3300,day:2200,week:9000},{id:'max20',name:'Max 20×',price:6500,day:9000,week:36000}],
    models:[{id:'haiku',name:'Haiku',cap:3,price:.15,w:.3,speed:.7,verb:.9},{id:'sonnet',name:'Sonnet',cap:4,price:.45,w:1,speed:.8,verb:1},{id:'opus',name:'Opus',cap:5,price:.9,w:2,speed:1,verb:.85},{id:'fable',name:'Fable',cap:6,price:1.8,w:4,speed:1.2,verb:.85}]},
  openai:{name:'OpenAI',agent:'Codex CLI',vc:'--oai',corp:false,
    plans:[{id:'none',name:'不訂閱',price:0},{id:'plus',name:'Plus',price:650,day:500,week:2000},{id:'pro',name:'Pro 200',price:6500,day:8000,week:30000},{id:'pro500',name:'Pro 500',price:16250,day:12500,week:50000}],
    models:[{id:'mini',name:'Luna',cap:3,price:.15,w:.3,speed:.7,verb:1},{id:'std',name:'Sol',cap:4,price:.4,w:1,speed:.8,verb:1.05},{id:'high',name:'Astra',cap:5,price:1.6,w:3,speed:1,verb:.95}]},
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
    /* 基本款不用買電腦；id 沿用舊名，存檔、派工方案與 GA 不受影響。hw 標記要先買哪台電腦（見 HW） */
    models:[{id:'qwen',name:'Qwen3.6 35B-A3B',cap:3,price:0,w:0,speed:1.7,verb:1.3,cn:true},{id:'gemma',name:'Gemma 4 26B A4B',cap:3,price:0,w:0,speed:1.9,verb:1.25},{id:'oss',name:'Gemma 4 E4B',cap:2,price:0,w:0,speed:1.8,verb:1.2},
      {id:'qcnext',name:'Qwen3-Coder-Next',cap:4,price:0,w:0,speed:1.4,verb:1.2,cn:true,hw:'spark'},{id:'gemma4',name:'Gemma 4 31B',cap:4,price:0,w:0,speed:2,verb:1.2,hw:'spark'},{id:'glm53',name:'GLM-5.3',cap:5,price:0,w:0,speed:2.8,verb:1,cn:true,hw:'mac'}]}
};
export const SUBV=Object.keys(VENDORS).filter(v=>VENDORS[v].plans.length>1);
export const APIV=Object.keys(VENDORS).filter(v=>v!=='local');
export const objOf=(keys,f)=>Object.fromEntries(keys.map(k=>[k,f(k)]));
/* 案主：ban='api' 禁止資料送往中國雲端；ban='all' 連中國開源權重也不能用 */
export const CLIENTS=[{name:'內部專案',ban:null,w:.42},{name:'新創客戶',ban:null,w:.18},{name:'金融客戶',ban:'api',w:.18},{name:'政府標案',ban:'all',w:.22}];
export function pickClient(){let r=Math.random();for(const c of CLIENTS){if((r-=c.w)<0)return c;}return CLIENTS[0];}
/* 全公司禁中國雲端只管公司的程式碼，外包單只看案主 */
export function banOf(is){const b=is.client.ban; return b==='all'?'all':(b||(S.cnBan&&!is.out))?'api':null;}
export function cnBlock(is,v,M){
  const b=banOf(is); if(!b) return '';
  if(VENDORS[v].cn) return is.client.ban?`${is.client.name}禁用`:'公司政策禁用';
  if(b==='all'&&M.cn) return '中國權重禁用';
  return '';
}
export const SEAT={day:2500,week:10000,name:'公司團隊席位',vendors:['anthropic','openai','google'],trust:[55,65,75],review:5};
export const BASE=[0,60,180,350,550,850];
export const KPI=[0,3,6,10,16,24];
/* 技術線：前六個是可選的工作內容（主技術線），fe 是每種工作內容都會有的前端工單 */
export const STACKS={
  laravel:{name:'Laravel',company:'Laravel 後端',level:1,desc:'框架慣例多，簡單工單便宜模型就夠用。',pool:{
    1:['跑馬燈文字錯字','RSS 日期時區差 8 小時','按鈕 hover 顏色不對','後台列表少一個排序欄位','修正 404 頁的返回連結','Footer 年份寫死成去年'],
    2:['文章 API 補 og:image 欄位','補齊標籤服務的單元測試','表單驗證訊息中文化','排程任務加上重試機制','搜尋結果分頁錯亂','後台匯入 CSV 編碼錯誤'],
    3:['文章列表 N+1 查詢拖慢 3 秒','播放器元件重構成 Composition API','Queue worker 記憶體洩漏','多語系 hreflang 全面修正','匯出報表改成非同步','圖片上傳改走 S3 預簽網址'],
    4:['Laravel 大版本升級','CKEditor 換成 Tiptap 的內容轉換','CDN 快取失效策略重寫','權限系統改成角色＋政策','CI 流程從零改成容器化部署'],
    5:['舊資料庫拆分遷移','從單體拆出搜尋服務','整站改 SSR 還要保住 SEO'],
    trap:['文章網址只要改一下格式','順便把作者欄位改成可以多選','時區改成跟著使用者設定，應該很快','後台列表加一個「全部匯出」按鈕就好'],
    inc:['正式站 502：worker 不停重啟','WAF 誤擋編輯後台','首頁快取被打穿，RDS CPU 99%','排程重複發送推播']}},
  rails:{name:'Rails',company:'Rails 後端',level:1,desc:'Convention over configuration，簡單工單便宜模型就夠用。',pool:{
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
  app:{name:'App',company:'App 開發',level:2,desc:'要跑模擬器所以比較慢；部分工單要過 App Store 審核。',pool:{
    1:['設定頁版本號沒更新','深色模式下按鈕文字看不到','推播文案錯字','啟動畫面 logo 被裁切'],
    2:['補上下拉重新整理','列表頁加上空狀態畫面','登入頁支援密碼自動填入','補齊 ViewModel 的單元測試','iPad 橫向排版跑掉'],
    3:['離線時文章快取同步','推播點開要導到正確頁面','圖片列表捲動卡頓','Android 13 通知權限流程','App 內購買恢復購買失敗'],
    4:['React Native 大版本升級','登入改用 Sign in with Apple','改成 Jetpack Compose 重寫主畫面','導入 deep link 與 universal link'],
    5:['iOS 與 Android 共用核心改成 Kotlin Multiplatform','整個 App 改成離線優先架構','從 WebView 包殼改成原生 App'],
    trap:['登入狀態只要改成多帳號切換','順便支援橫向模式','字體大小跟著系統設定，應該很快','底部選單加一個分頁就好'],
    inc:['新版上架後啟動就閃退','推播憑證過期，全部收不到通知','API 改版讓舊版 App 全部登不進去','付款頁在特定機型白畫面']}},
  sre:{name:'SRE',company:'SRE',level:2,desc:'選了 SRE 事故單比較多，常常當天就要處理完。',pool:{
    1:['告警訊息少了服務名稱','值班表下週排錯人','狀態頁連結指到舊網址','Grafana 面板時區顯示 UTC'],
    2:['告警門檻太敏感半夜一直叫','補上 SLO 儀表板','慢查詢 log 接進集中式日誌','健康檢查端點補上相依服務狀態','值班手冊補上重啟步驟'],
    3:['資料庫連線數容量規劃','告警改成依錯誤預算燒速觸發','備份還原演練自動化','分散式追蹤接上所有服務','Redis 記憶體用量預估與擴容'],
    4:['監控從自架 Prometheus 搬到託管服務','導入混沌工程演練','多可用區容錯切換','全站限流與熔斷策略'],
    5:['單一區域改成多區域主備','建立完整的錯誤預算政策與發版閘門','整個值班與事故流程重新設計'],
    trap:['只要把告警閾值調高一點','順便把 log 保存期限拉長','健康檢查加一個資料庫檢查，應該很快','Pod 加一個 readiness probe 就好'],
    inc:['磁碟滿了 log 寫不進去','憑證過期，全站 HTTPS 失效','DNS 設定被改壞，服務全斷','資料庫主節點掛掉沒有自動切換']}},
  devops:{name:'DevOps',company:'DevOps',level:2,desc:'要等 CI 與 terraform，執行時間比較長。',pool:{
    1:['CI 徽章連結失效','Dockerfile 註解過期','部署通知少了版本號','.gitignore 漏掉建置產物'],
    2:['CI 快取失效每次都重抓套件','映像檔改用多階段建置','PR 自動加上預覽環境連結','部署腳本補上回滾指令','排程清理舊的映像檔'],
    3:['Terraform state 拆成模組','CI 改成平行跑測試','秘密改用 Secrets Manager 注入','staging 環境改成依分支自動建立','建置時間從 20 分鐘壓到 8 分鐘'],
    4:['Kubernetes 大版本升級','部署改成 GitOps（Argo CD）','CI 從 Jenkins 搬到 GitHub Actions','導入藍綠部署'],
    5:['整套基礎設施改寫成 IaC','單一叢集拆成多叢集','自建內部開發者平台'],
    trap:['只要在 pipeline 多加一個步驟','順便把 Node 版本升上去','環境變數改一下名稱，應該很快','Terraform 改一個參數就好'],
    inc:['部署 pipeline 卡住，全部門無法上線','Runner 額度用完，CI 全部排隊','映像檔倉庫認證過期，部署全失敗','Terraform apply 誤刪正式環境安全群組']}},
  fe:{name:'前端',company:'前端',desc:'',pool:{
    1:['首頁 banner 在手機版被切掉','表單 placeholder 顏色太淡','favicon 換新版','行事曆元件週日顯示錯位'],
    2:['補上 loading skeleton','表格欄位支援排序','把 moment 換成 date-fns','元件補 Storybook 範例','圖片改成 lazy load'],
    3:['首頁 LCP 從 4 秒壓到 2 秒','共用元件庫改用 design token','表單狀態管理改成 Pinia','無障礙檢查修到 AA 等級','打包體積砍掉一半'],
    4:['Vue 2 升級到 Vue 3','Webpack 換成 Vite','整站導入 TypeScript','前端錯誤監控與 source map 上傳'],
    5:['舊後台改寫成 SPA','導入微前端拆分各團隊頁面','設計系統全面改版'],
    trap:['表單只要多一個欄位','順便讓整站支援深色模式','日期顯示改成跟著語系，應該很快','把這個彈窗改成可以拖拉，改一下就好'],
    inc:[]}}
};
export const COMPANIES=['laravel','rails','rust','app','sre','devops'];
/* 主技術線可選 1–2 條，固定照 COMPANIES 的順序存；舊版存的單一字串視為只選一條 */
export function normCompanies(c){
  const a=typeof c==='string'?[c]:c;
  const ok=Array.isArray(a)&&a.length>=1&&a.length<=2&&new Set(a).size===a.length&&a.every(k=>COMPANIES.includes(k));
  return ok?COMPANIES.filter(k=>a.includes(k)):['laravel'];
}
export const companyName=(cs=S.companies)=>cs.map(k=>STACKS[k].company).join('＋');
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
export const EFFORT=[{id:'low',name:'低',cap:-1,tk:.7,hrs:.8},{id:'mid',name:'中',cap:0,tk:1,hrs:1},{id:'high',name:'高',cap:1,tk:1.5,hrs:1.4}];
export function effModel(M,ef){
  if(ef===1) return M; const E=EFFORT[ef];
  return {...M,cap:Math.max(1,M.cap+E.cap),verb:M.verb*E.tk,speed:M.speed*E.hrs,name:`${M.name}・${E.name}強度`};
}
export const efOf=ef=>S.advanced&&EFFORT[ef]?ef:1;
export const planOf=v=>VENDORS[v].plans.find(p=>p.id===S.subs[v])||{id:'none',price:0,day:0,week:0};

/* 派工方案：三組常用的廠商／模型／付費方式／審核等級／推理強度，一鍵派工照 A→B→C 用第一個能用的 */
export const PN=['A','B','C'];
export const DEFAULT_PRESETS=[{v:'deepseek',m:'chat',b:'api',rv:1,ef:1},{v:'anthropic',m:'sonnet',b:'corp',rv:1,ef:1},{v:'anthropic',m:'opus',b:'corp',rv:2,ef:1}];
export const BILL_LABEL={sub:'個人訂閱',seat:'公司席位',api:'個人 API',corp:'公司 API',local:'本地 GPU'};
export const validPreset=p=>!!(p&&VENDORS[p.v]&&model(p.v,p.m)&&BILL_LABEL[p.b]&&(p.v==='local')===(p.b==='local')&&[0,1,2].includes(p.rv)&&(p.ef===undefined||[0,1,2].includes(p.ef)));
export const presetsOf=ps=>(Array.isArray(ps)&&ps.length===3&&ps.every(validPreset)?ps:DEFAULT_PRESETS).map(p=>({...p,ef:p.ef??1}));

/* 工程投資：花工時和公司預算，效果維持到月底 */
export const INVEST={
  md:{name:'寫 CLAUDE.md',hrs:3,cost:300,desc:'這條技術線的工單 token ×0.85、成功率 +6%'},
  tests:{name:'單元測試',hrs:4,cost:400,desc:'自我審核抓錯率 +10%'},
  ci:{name:'CI 流水線',hrs:3,cost:300,desc:'平行模式合併衝突機率減半'},
  hook:{name:'pre-commit／lint hook',hrs:2,cost:200,desc:'平行模式審 PR 時間減半（單線模式沒有審 PR 時間）'},
  scan:{name:'secret scanning／脫敏',hrs:3,cost:300,desc:'機敏工單用個人帳號時，被資安稽核的機率減半'},
  fastlane:{name:'上架自動化（fastlane）',hrs:3,cost:400,desc:'App Store 退件機率 20% → 10%'},
  monitor:{name:'監控告警',hrs:3,cost:400,desc:'之後的事故單提早告警：期限延到隔天，但 KPI 加成 ×1.6 → ×1.2；事故單逾期扣信任 8 → 4'},
  skills:{name:'做 skills',hrs:3,cost:400,desc:'解鎖批次派工：一次派出所有複雜度 ≤2 的工單'},
  mcp:{name:'接 MCP 文件',hrs:3,cost:400,desc:'評估架構識破率 +20%、評估時間減半'},
  sdd:{name:'導入 SDD',hrs:6,cost:500,desc:'先寫規格再派工：每次派工 token ×1.1；複雜度 3 以上成功率 +8%；陷阱在寫規格時就會發現，只燒 15%'},
};
/* CLAUDE.md 以外的投資，面板照這個順序 */
export const INV_KEYS=['tests','ci','hook','scan','fastlane','monitor','skills','mcp','sdd'];
export const MD_TK=.85, MD_P=.06, TEST_CATCH=.1, MCP_REVEAL=.2, MCP_EVAL_HRS=.5, SDD_TK=1.1, SDD_P=.08, SDD_TRAP_STOP=.15;
export const HOOK_PR=.5, SCAN_AUDIT=.5, FASTLANE_REJECT=.1, MONITOR_LATE=4, MONITOR_KPI=1.2;
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
/* 採購電腦：走公司採購申請，不扣公司 API 預算；到貨當天看信任決定核不核准 */
export const PC_SPEED=.7, HW_REQ_HRS=1, HW_SETUP_HRS=1, HW_IDLE=2;
export const HW={
  pc:{name:'有顯卡的 PC（RTX 5090）',price:'約 NT$12 萬',trust:55,days:2,desc:`本地模型執行時間 ×${PC_SPEED}`},
  spark:{name:'NVIDIA DGX Spark',price:'約 NT$13 萬',trust:60,days:3,desc:'解鎖 Qwen3-Coder-Next 與 Gemma 4 31B（能力 4，Gemma 政府標案可用）'},
  mac:{name:'Mac Studio（512GB）',price:'約 NT$30 萬',trust:70,days:3,desc:'解鎖 GLM-5.3（能力 5，很慢，中國權重）'},
};
export const HW_KEYS=Object.keys(HW);
