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
    models:[{id:'qwen',name:'Qwen Coder 32B',cap:3,price:0,w:0,speed:2.1,verb:1.3,cn:true},{id:'oss',name:'gpt-oss 20B',cap:2,price:0,w:0,speed:1.8,verb:1.2}]}
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
const SEAT={day:2500,week:10000,name:'公司團隊席位'};
const BASE=[0,60,180,350,550,850];
const KPI=[0,3,6,10,16,24];
const POOL={
  1:['跑馬燈文字錯字','RSS 日期時區差 8 小時','按鈕 hover 顏色不對','後台列表少一個排序欄位','修正 404 頁的返回連結','Footer 年份寫死成去年'],
  2:['文章 API 補 og:image 欄位','補齊標籤服務的單元測試','表單驗證訊息中文化','排程任務加上重試機制','搜尋結果分頁錯亂','後台匯入 CSV 編碼錯誤'],
  3:['文章列表 N+1 查詢拖慢 3 秒','播放器元件重構成 Composition API','Queue worker 記憶體洩漏','多語系 hreflang 全面修正','匯出報表改成非同步','圖片上傳改走 S3 預簽網址'],
  4:['Laravel 大版本升級','CKEditor 換成 Tiptap 的內容轉換','CDN 快取失效策略重寫','權限系統改成角色＋政策','CI 流程從零改成容器化部署'],
  5:['舊資料庫拆分遷移','從單體拆出搜尋服務','整站改 SSR 還要保住 SEO'],
  inc:['正式站 502：worker 不停重啟','WAF 誤擋編輯後台','首頁快取被打穿，RDS CPU 99%','排程重複發送推播']
};

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

/* ===== 狀態 ===== */
let S, sel, uid=0;
function fresh(){
  uid=0;
  S={day:1,hours:8,wallet:8000,corp:12000,trust:70,kpi:0,mode:S?.mode||'parallel',jobs:[],slots:3,
    subs:objOf(APIV,()=>'none'),
    used:{sub:objOf(APIV,()=>({d:0,w:0})),seat:{anthropic:{d:0,w:0},google:{d:0,w:0}}},
    capMod:objOf(APIV,()=>1),priceMod:objOf(Object.keys(VENDORS),()=>1),cnBan:false,
    seat:{vendor:null,status:'none',day:0},
    outage:null,corpDay:0,issues:[],log:[],
    st:{subFee:0,api:0,corp:0,done:0,late:0,audits:0,manual:0,conflicts:0,caught:0,tk:objOf(Object.keys(VENDORS),()=>0),byBill:{sub:0,seat:0,api:0,corp:0,local:0},kpiLost:0}};
  sel={issue:null,v:'anthropic',m:'sonnet',b:'api',rv:sel?.rv??1};
}

function makeIssue(inc){
  let cx;
  if(inc) cx=4; else { const r=Math.random()+S.day/20*.38; cx=r<.28?1:r<.6?2:r<.9?3:r<1.12?4:5; }
  const base=BASE[cx]*R(.85,1.15);
  let due=inc?S.day:S.day+(cx<=2?1+rnd(3):2+rnd(4));
  return {id:++uid,title:inc?pick(POOL.inc):pick(POOL[cx]),cx,base,inc:!!inc,
    sens:Math.random()<(inc?.55:.25),big:cx>=3&&Math.random()<.45,
    client:inc?CLIENTS[0]:pickClient(),
    due:Math.min(20,due),kpi:Math.round(KPI[cx]*(inc?1.6:1)),tries:0};
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
const catchRate=(rv,M)=>rv===0?0:Math.min(.95,.45+.08*M.cap+(rv===2?.2:0));
function est(is,v,mid,rv=sel.rv){
  const M=model(v,mid), diff=M.cap-is.cx;
  const tk=is.base*M.verb*(is.big&&M.ctx?.7:1)*(diff>=1?.85:1)*parMul()*REVIEW[rv].tk;
  let p=diff>=1?.95:diff===0?.8:diff===-1?.5:diff===-2?.25:.1;
  if(is.big&&M.ctx)p+=.08; if(is.big&&!M.ctx&&M.cap<4)p-=.08;
  p=Math.max(.05,Math.min(.97,p));
  const c=catchRate(rv,M);
  return {M,tk,lo:tk*.7,hi:tk*1.3,p,c,pe:p+(1-p)*c,hrs:is.cx*M.speed*(is.tries?.8:1)*REVIEW[rv].hrs};
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

function log(cls,msg){S.log.unshift({cls,msg:`D${String(S.day).padStart(2,'0')} ${msg}`}); if(S.log.length>80)S.log.pop();}

/* ===== 動作 ===== */
const PAR=()=>S.mode==='parallel';
const clock=el=>{const m=Math.round((9+el)*60);return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
/* 平行加成：同時在跑的 agent 越多，重複載入 context 與協調的 token 越多 */
const parMul=()=>PAR()?1+.15*S.jobs.length:1;
function makeJob(is){
  const e=est(is,sel.v,sel.m);
  const ok=Math.random()<e.p;
  return {issue:is,v:sel.v,b:sel.b,M:e.M,mul:parMul(),rv:sel.rv,tk:e.tk*R(.7,1.3),hrs:e.hrs*R(.8,1.2),ok,caught:!ok&&Math.random()<e.c,left:0};
}
function dispatch(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is) return;
  const j=makeJob(is);
  if(PAR()){
    if(S.jobs.length>=S.slots) return;
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
/* 平行模式：推進時鐘，背景 agent 跑完就結算，成功的要花時間審 PR */
function advance(dt){
  while(dt>1e-9&&S.hours>1e-9){
    const next=S.jobs.length?Math.min(...S.jobs.map(j=>j.left)):Infinity;
    const step=Math.min(dt,next,S.hours);
    S.jobs.forEach(j=>j.left-=step); S.hours-=step; dt-=step;
    const fin=S.jobs.filter(j=>j.left<=1e-9); S.jobs=S.jobs.filter(j=>j.left>1e-9);
    for(const j of fin){
      j.issue.running=false;
      const r=settle(j,{conflict:.1*S.jobs.length});
      if(r.ok){const rv=j.issue.cx*.2*(j.rv?.5:1);dt+=rv;log('dim',`  ↳ 審 PR 花了 ${h1(rv)}h`);}
    }
  }
  S.hours=Math.max(0,S.hours);
}
function cancelJobs(pred,note){
  const out=S.jobs.filter(pred); S.jobs=S.jobs.filter(j=>!pred(j));
  out.forEach(j=>{j.issue.running=false;settle(j,{frac:Math.max(.05,1-j.left/j.hrs),fail:true,note});});
  return out.length;
}
function settle(j,o={}){
  const is=j.issue,v=j.v,b=j.b,M=j.M,frac=o.frac??1;
  let tk=j.tk*frac, hrs=j.hrs*frac, ok=j.ok&&!o.fail, note=o.note||'', spend='', conflict=false, fixed=false;
  if(!j.ok&&j.caught&&!o.fail){tk*=1.25;ok=true;fixed=true;}
  if(!j.ok&&!j.caught&&j.rv&&!o.fail) note='審核沒抓到，上線後測試才爆';
  if(b==='sub'||b==='seat'){
    const need=tk*M.w, left=quotaLeft(b,v);
    if(need>left){ const f=need>0?left/need:0; tk*=f; hrs=Math.max(.3,hrs*Math.max(.3,f)); ok=false; note='撞到用量上限，agent 停在一半'; useQuota(b,v,left); spend=`額度 ${kt(left)}`; }
    else { useQuota(b,v,need); spend=`額度 ${kt(need)}`; }
  } else if(b==='api'){ const c=tk*M.price*S.priceMod[v]; S.wallet-=c; S.st.api+=c; spend=nt(c); }
  else if(b==='corp'){ const c=tk*M.price*S.priceMod[v]; S.corp-=c; S.corpDay+=c; S.st.corp+=c; spend='公司 '+nt(c); }
  else spend='電費';
  if(ok&&o.conflict&&Math.random()<o.conflict){ok=false;conflict=true;note='和其他 agent 的改動合併衝突';}
  S.st.tk[v]+=tk; S.st.byBill[b]+=tk;
  const who=`${VENDORS[v].agent} / ${M.name}`;
  if(ok){
    S.issues=S.issues.filter(i=>i!==is); S.kpi+=is.kpi; S.st.done++;
    if(is.inc) S.trust=Math.min(100,S.trust+2);
    if(fixed)S.st.caught++;
    log('ok',`✓ ${is.title}｜${who}${j.rv?`・${REVIEW[j.rv].name}`:''}｜${kt(tk)} tokens｜${spend}｜${h1(hrs)}h｜KPI +${is.kpi}`);
    if(fixed)log('ok',`  ↳ ${REVIEW[j.rv].name}抓到錯誤並當場修正，省掉整單重做`);
    if(sel.issue===is.id) sel.issue=null;
  } else {
    is.tries++; is.base*=conflict?.4:.7; if(conflict)S.st.conflicts++;
    log('bad',`✗ ${is.title}｜${who}｜${note||'測試沒過，改壞了'}｜燒掉 ${kt(tk)}｜${spend}｜${h1(hrs)}h`);
  }
  if(is.sens&&(b==='sub'||b==='api')&&Math.random()<(VENDORS[v].cn?.6:.35)){
    S.trust=Math.max(0,S.trust-12); S.st.audits++;
    log('warn',`! 資安稽核：機敏程式碼送進${VENDORS[v].cn?'中國雲端模型':'個人帳號'}被抓到，主管信任 -12`);
  }
  if(S.corp<0){ log('warn','! 公司 API 預算透支，財務來信關切'); S.trust=Math.max(0,S.trust-8); S.corp=0; }
  return {ok,hrs};
}
function wait(next){
  if(next){ if(!S.jobs.length) return; advance(Math.min(...S.jobs.map(j=>j.left))); }
  else advance(1);
  render();
}
function manual(){
  const is=S.issues.find(i=>i.id===sel.issue); if(!is) return;
  const hrs=is.cx*2.2*(is.tries?.8:1);
  if(hrs>S.hours) return;
  if(PAR()){ is.running=true; advance(hrs); is.running=false; if(!S.issues.includes(is)){render();return;} }
  else S.hours-=hrs;
  S.st.manual++;
  const ok=is.cx<=3||Math.random()<.7;
  if(ok){S.issues=S.issues.filter(i=>i!==is);S.kpi+=is.kpi;S.st.done++;sel.issue=null;log('ok',`✓ ${is.title}｜自己手寫｜0 tokens｜${h1(hrs)}h｜KPI +${is.kpi}`);}
  else{is.tries++;is.base*=.7;log('bad',`✗ ${is.title}｜自己手寫卡關｜${h1(hrs)}h`);}
  render();
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
    <div class="jobs">${S.jobs.map(j=>{const pr=Math.max(0,1-j.left/j.hrs);const lbl={sub:'個人訂閱',seat:'公司席位',api:'個人 API',corp:'公司 API',local:'本地 GPU'}[j.b];
      return `<div class="job" style="--vc:${vc(j.v)}"><div class="jt"><b>${j.issue.title}</b><span class="num">${clock(8-S.hours+j.left)} 完成</span></div>
      <div class="jm">${VENDORS[j.v].agent} / ${j.M.name}・${lbl}${j.issue.due<=S.day?'・<span style="color:var(--bad)">今天到期</span>':''}</div>
      <div class="bar"><i style="width:${pr*100}%;background:var(--vc)"></i></div></div>`;}).join('')
      ||'<div class="empty" style="padding:14px">沒有 agent 在跑。派出去的工作會在這裡同時進行。</div>'}</div>`;
  const list=S.issues.filter(i=>!i.running).slice().sort((a,b)=>a.due-b.due||b.kpi-a.kpi).map(i=>{
    const left=i.due-S.day;
    return `<button class="iss ${sel.issue===i.id?'sel':''}" data-iss="${i.id}">
      <span class="t">${i.title}</span><span class="k">+${i.kpi}</span>
      <span class="meta"><span class="pips" title="複雜度 ${i.cx}">${[1,2,3,4,5].map(n=>`<i class="${n<=i.cx?'on':''}"></i>`).join('')}</span>
      <span class="num">~${kt(i.base)} tokens</span>
      ${i.inc?'<span class="chip inc">事故</span>':''}${i.sens?'<span class="chip sens">機敏</span>':''}${i.big?'<span class="chip big">大型 codebase</span>':''}${i.client.ban?`<span class="chip ban">${i.client.name}・${i.client.ban==='all'?'禁中國模型':'禁中國雲端'}</span>`:S.cnBan?'<span class="chip ban">禁中國雲端</span>':`<span class="chip">${i.client.name}</span>`}
      <span class="chip ${left<=0?'due':''}">${left<=0?'今天到期':`剩 ${left} 天`}</span>${i.tries?`<span class="chip">已失敗 ${i.tries} 次</span>`:''}</span>
    </button>`;}).join('') || `<div class="empty">工單清空了。可以提早下班，把工時留給明天。</div>`;

  app.innerHTML=`
  <header class="top">
    <div class="brand"><h1><span class="tk">Token</span> 撐到月底</h1><p>20 個工作天，有限的錢和額度，把工單做完。</p></div>
    <div class="cal">${cal}</div>
  </header>
  ${meters}
  <div class="quotas">${qs}</div>
  <div class="main">
    <section class="panel"><div class="ph"><h2>工單佇列</h2><span>${S.issues.filter(i=>!i.running).length} 張・依到期排序</span></div><div class="issues">${list}</div>${jobsHtml}</section>
    <section class="panel">${dispatchPanel()}</section>
  </div>
  <section class="panel">
    <div class="foot"><div class="ph"><h2>執行紀錄</h2></div>
      <div class="actions">${PAR()?`<button class="btn ghost" data-act="wait1" ${S.hours<=0?'disabled':''}>等 1 小時</button><button class="btn ghost" data-act="waitn" ${!S.jobs.length||S.hours<=0?'disabled':''}>等到下一個 agent 完成</button>`:''}${((S.day-1)%5===0)?'<button class="btn ghost" data-act="adjust">調整訂閱</button>':''}<button class="btn" data-act="end">下班，結束第 ${S.day} 天</button></div></div>
    <div class="log">${S.log.map(l=>`<p class="${l.cls}">${l.msg}</p>`).join('')||'<p class="dim">還沒有紀錄。點左邊一張工單開始派工。</p>'}</div>
    <small style="color:var(--muted);font-size:12px">價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。</small>
  </section>`;
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
  else if(is.sens&&VENDORS[sel.v].cn) warn='機敏工單送到中國雲端：有 60% 機率被資安稽核抓到。';
  else if(is.sens&&(sel.b==='sub'||sel.b==='api')) warn='機敏工單用個人帳號：有 35% 機率被資安稽核抓到。';
  else if((sel.b==='sub'||sel.b==='seat')&&cl.hi>quotaLeft(sel.b,sel.v)) warn='剩餘額度可能不夠，跑到一半會被限流。';
  else if(PAR()&&S.jobs.length>=S.slots) warn='工作槽都滿了，先等一個 agent 跑完。';
  else if(PAR()&&is.due<=S.day&&e.hrs+.2>S.hours) warn='這張今天到期，但下班前跑不完，會逾期。';
  else if(PAR()&&e.hrs+.2>S.hours) warn='今天跑不完，agent 會跑過夜，明早才有結果。';
  else if(!PAR()&&e.hrs*1.2>S.hours) warn='今天剩的工時可能不夠跑完。';
  else if(sel.b==='api'&&cl.hi>S.wallet) warn='錢包可能不夠付這一筆。';
  const mh=is.cx*2.2*(is.tries?.8:1);
  return `<div class="ph"><h2>派工台</h2><span>${is.title}</span></div>
  <div class="sec"><label>選 AGENT 與模型</label>${rows}</div>
  <div class="sec"><label>誰付這筆 TOKEN</label><div class="seg">${segs}</div></div>
  <div class="sec"><label>自我審核</label><div class="seg">${REVIEW.map((r,i)=>`<button class="sb ${sel.rv===i?'sel':''}" data-rv="${i}">${r.name}<small>${i?`token ×${r.tk}・抓錯 ${Math.round(catchRate(i,M)*100)}%`:'改壞就整單重做'}</small></button>`).join('')}</div></div>
  <div class="est">
    <div><label>預估 tokens${parMul()>1?` ×${parMul().toFixed(2)}`:''}</label><b>${kt(e.lo)}–${kt(e.hi)}</b></div>
    <div><label>${cl.t}</label><b>${cl.unit==='q'?`${kt(cl.lo)}–${kt(cl.hi)}`:cl.hi?`${nt(cl.lo)}–${nt(cl.hi)}`:'NT$0'}</b></div>
    <div><label>成功率${sel.rv?`（原 ${Math.round(e.p*100)}%）`:''}</label><b class="${pc}">${Math.round(e.pe*100)}%</b></div>
    <div><label>${PAR()?'執行時間':'工時'}</label><b>${h1(e.hrs)}h</b></div>
  </div>
  ${PAR()&&S.jobs.length?`<p class="hint">平行加成：已有 ${S.jobs.length} 個 agent 在跑，這張的 token 用量 ×${parMul().toFixed(2)}；完成時每多一個同時在跑的 agent，合併衝突機率 +10%。</p>`:''}
  <div class="warnline">${warn}</div>
  <div class="actions">
    <button class="btn primary" data-act="go" ${S.outage===sel.v||!!cnBlock(is,sel.v,model(sel.v,sel.m))||S.hours<.2||(PAR()&&S.jobs.length>=S.slots)?'disabled':''}>${PAR()?'派到背景':'派給'} ${VENDORS[sel.v].agent}</button>
    <button class="btn ghost" data-act="manual" ${mh>S.hours?'disabled':''}>自己手寫（${h1(mh)}h，0 token）</button>
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
    ${[['','不申請'],['anthropic','Anthropic'],['google','Google']].map(([v,n])=>`<button class="sb ${draft.seat===v?'sel':''}" data-seat="${v}">${n}<small>${v?'公司付・每日 2.5M 額度':'自己想辦法'}</small></button>`).join('')}</div></div>`:'';
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
function showSetup(adjust){
  draft={subs:{...S.subs},seat:'',mode:S.mode};
  const draw=()=>{
    mo.innerHTML=`<h2>${adjust?'週一：調整訂閱':'月初：決定這個月怎麼付 token'}</h2>
    ${adjust?`<p class="lead">升級只補剩下週數的差價，降級不退費。</p>`:`<p class="lead">你是一個 Laravel 團隊的工程師。接下來 20 個工作天，每天都會有新工單進來。你有 ${nt(S.wallet)} 的個人 AI 預算，部門另外有 ${nt(S.corp)} 的公司 API 預算。</p>
    <ul class="rules">
      <li><b>個人訂閱</b>月費固定，有每日與每週額度，越強的模型吃額度越快。額度用完 agent 會停在一半。</li>
      <li><b>個人 API</b> 用多少付多少，沒有上限，錢從你口袋出。</li>
      <li><b>公司 API</b> 不花你的錢，但只能用公司簽約的廠商，單日刷太兇主管會不高興。</li>
      <li>標著「機敏」的工單送進個人帳號，有機率被資安稽核抓到；送到中國雲端機率更高。</li>
      <li><b>自我審核</b>讓 agent 寫完再自己檢查一輪：token 和時間會加成，但改壞時有機會當場修好，不用整單重做。能力越強的模型越會抓錯。</li>
      <li><b>中國模型</b>（DeepSeek、GLM、Kimi）便宜又夠用，但每張工單有案主：金融客戶禁止資料送往中國雲端，政府標案連本地跑的中國開源權重（Qwen）都不能用。</li>
      <li>工單逾期扣 KPI 和信任。月底結算看 KPI、信任，還有你自己花了多少錢。</li>
    </ul>
    <div class="sec"><label>遊戲模式</label><div class="modes">
      <button class="sb ${draft.mode==='parallel'?'sel':''}" data-mode="parallel"><b>平行模式</b><small>最多 3 個 agent 在背景同時跑，你的時間花在派工和審 PR。同時跑越多，token 用量加成越高，也越容易合併衝突。跑不完的會過夜。</small></button>
      <button class="sb ${draft.mode==='serial'?'sel':''}" data-mode="serial"><b>單線模式</b><small>一次只處理一張，agent 跑多久你就等多久。比較單純，適合先熟悉付費方式的取捨。</small></button>
    </div></div>`}
    <div class="plans">${planPicker(adjust)}</div>
    <div class="actions"><button class="btn primary" data-act="confirm">${adjust?'確定調整':'開始第 1 天'}</button>${adjust?'<button class="btn ghost" data-act="close">不改了</button>':''}</div>`;
  };
  draw(); ov.hidden=false;
  mo.onclick=ev=>{
    const t=ev.target.closest('button'); if(!t) return;
    if(t.dataset.pv){draft.subs[t.dataset.pv]=t.dataset.pp;draw();}
    else if(t.dataset.seat!==undefined){draft.seat=t.dataset.seat;draw();}
    else if(t.dataset.mode){draft.mode=t.dataset.mode;draw();}
    else if(t.dataset.act==='close'){ov.hidden=true;}
    else if(t.dataset.act==='confirm'){
      const c=planCost(adjust); S.wallet-=c; S.st.subFee+=c;
      if(!adjust){S.mode=draft.mode;log('dim',`· 遊戲模式：${PAR()?'平行':'單線'}`);}
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
  let best=0; const bk='tokgame-best-'+S.mode; try{best=+localStorage.getItem(bk)||0; if(score>best)localStorage.setItem(bk,score);}catch(e){}
  const vendorLines=Object.keys(S.st.tk).filter(v=>S.st.tk[v]>0).map(v=>`<div><span>${VENDORS[v].name}</span><span>${kt(S.st.tk[v])} tokens・${Math.round(S.st.tk[v]/tot*100)}%</span></div>`).join('')||'<div><span>沒有用到任何 agent</span><span>—</span></div>';
  mo.innerHTML=`<h2>月底結算・${PAR()?'平行模式':'單線模式'}</h2>
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
  else if(t.dataset.act==='go')dispatch();
  else if(t.dataset.act==='manual')manual();
  else if(t.dataset.act==='end')endDay();
  else if(t.dataset.act==='wait1')wait(false);
  else if(t.dataset.act==='waitn')wait(true);
  else if(t.dataset.act==='adjust')showSetup(true);
});

function start(){
  fresh();
  for(let i=0;i<4;i++)S.issues.push(makeIssue(false));
  log('dim','— 第 1 天開工，新進 4 張工單 —');
  render(); showSetup(false);
}
start();
