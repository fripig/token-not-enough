import {APIV,BIG,BILL_LABEL,CATCH,CI_CONFLICT,CLIENTS,CONFLICT,EFFORT,EVAL_HRS,FASTLANE_REJECT,HARD_KPI,HOOK_PR,HW,HW_IDLE,HW_KEYS,HW_REQ_HRS,HW_SETUP_HRS,INC_KPI,INVEST,INV_KEYS,KPI,BASE,LATE_KPI,MANUAL_HRS,MCP_EVAL_HRS,MCP_REVEAL,MONITOR_KPI,MONITOR_LATE,PN,PR_HRS,PR_REVIEWED,RESCOPE,RETRY,REVEAL,SCAN_AUDIT,SDD_TRAP_STOP,SEAT,STACK_HRS,STORE_RATE,UNFAMILIAR_HRS,VENDORS,kt,nt} from './data.js';
import {GIG_LATE,GIG_PAY,START,TRAP_RATE} from './state.js';
import {P_STEP,REVIEW,STORE_REJECT} from './calc.js';
import {AUDIT_ODDS,AUDIT_TRUST,CORP_DAY_LIMIT,CORP_DAY_TRUST,DOUBT_TRUST,EVAL_TK,EVENT_RATE,INC_LATE_TRUST,INC_RAMP,INC_RATE,LATE_TRUST,OVERDRAFT_TRUST,OVERNIGHT_HRS,PACE_KPI,PRAISE_TRUST,RESCOPE_TRUST,REVIEW_LOAD,SLOT_CHOICES,TRAP_STOP} from './actions.js';
import {GRADES,PAR_GRADE,SCORE} from './modals.js';
import {mo,ov} from './view.js';

/* ===== 規則速查：數字一律從遊戲常數插值，改數值時這裡跟著變 ===== */
export const RULE_TABS=[{id:'basic',title:'基本'},{id:'dispatch',title:'派工與成功率'},{id:'billing',title:'付費與稽核'},{id:'tickets',title:'工單與陷阱'},{id:'invest',title:'投資與電腦'},{id:'score',title:'結算'}];
export let ruleTab='basic';
export const pct=x=>`${Math.round(x*1000)/10}%`;
export const rtag=t=>`<span class="rtag">${t}</span>`;
export const rtable=(head,rows)=>`<div class="rtw"><table class="rt"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td data-h="${head[i]}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const rlist=items=>`<ul class="rules">${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
export const rsec=(title,body)=>`<div class="rsec"><h3>${title}</h3>${body}</div>`;
const banText={null:'沒有限制',api:'禁止中國雲端，本地跑的中國權重可以',all:'連本地跑的中國開源權重也禁'};

export function rulesTab(id){
  switch(RULE_TABS.some(t=>t.id===id)?id:'basic'){
  case 'dispatch': return rsec('成功率',`${rtable(['模型能力 − 工單複雜度','成功率'],[['+1 以上',pct(P_STEP[0])],['0',pct(P_STEP[1])],['−1',pct(P_STEP[2])],['−2',pct(P_STEP[3])],['−3 以下',pct(P_STEP[4])]])}
    ${rlist([`大型 codebase：長 context 的模型（Gemini）成功率 +${pct(BIG.p)}、token ×${BIG.tk}；能力 4 以下的其他模型 −${pct(BIG.p)}。`,
      `失敗後重做：token ×${RETRY.tk}、執行時間 ×${RETRY.hrs}。`,
      `${rtag('進階模式')}推理強度會改模型的能力、token 與時間，見「基本」。`])}`)
    +rsec('自我審核',`${rtable(['等級','token','時間','抓錯率'],REVIEW.map((r,i)=>[r.name,`×${r.tk}`,`×${r.hrs}`,i===0?'0':`${CATCH.base} + ${CATCH.per} × 能力${i===2?` + ${CATCH.strict}`:''}，上限 ${pct(CATCH.max)}`]))}
    ${rlist(['抓到錯誤時多花一點 token，工單直接成功；額度用完、時間不夠、陷阱停下來都救不回來。','派工台顯示的成功率已經算進審核。'])}`)
    +rsec('技術線',rlist([
      'Laravel、Rails：複雜度 3 以下的工單，成功率視同簡單一級（框架慣例多）。',
      `Rust：能力 4 以下的模型視同難一級（borrow checker）；執行時間 ×${STACK_HRS.rust}。`,
      `App：執行時間 ×${STACK_HRS.app}；複雜度 2 以上有 ${pct(STORE_RATE)} 要過 App Store 審核，agent 做完仍有 ${pct(STORE_REJECT)} 被退件（有上架自動化 ${pct(FASTLANE_REJECT)}），自我審核救不回來。`,
      `DevOps：要等 CI 與 terraform，執行時間 ×${STACK_HRS.devops}。`,
      `Rust、App、DevOps 的工單期限多 1 天、KPI ×${HARD_KPI}。`,
      'SRE：事故單比較多，見「工單與陷阱」。']))
    +rsec('派工方案與手寫',rlist([
      `存三組方案 ${PN.join('／')}（廠商、模型、付費、審核、推理強度），工單卡片的「一鍵派工」照 ${PN.join('→')} 用第一個能用的方案。`,
      '做了 skills 之後可以批次派工：複雜度 2 以下的工單一次派出。',
      `自己手寫：複雜度 × ${MANUAL_HRS} 小時，沒選的技術線算不熟 ×${UNFAMILIAR_HRS}。本地 GPU 跑 agent 時不能手寫，買了電腦就可以。`]));
  case 'billing': return rsec('付費方式',rlist([
      `<b>${BILL_LABEL.sub}</b>：月費固定，有每日與每週額度，越強的模型吃額度越快；額度不夠時 agent 停在一半，算失敗。`,
      `<b>${BILL_LABEL.seat}</b>：公司付，每個席位每日 ${kt(SEAT.day)}、每週 ${kt(SEAT.week)} 額度。`,
      `<b>${BILL_LABEL.api}</b>：用多少付多少，從個人錢包扣。錢包不能被花成負數：跑到一半錢用光，agent 停在一半、算失敗；錢包 NT$0 以下時不能選。`,
      `<b>${BILL_LABEL.corp}</b>：扣公司預算，只有 ${APIV.filter(v=>VENDORS[v].corp).map(v=>VENDORS[v].name).join('、')} 可以走。單日超過 ${nt(CORP_DAY_LIMIT)} 信任 −${CORP_DAY_TRUST}；透支信任 −${OVERDRAFT_TRUST}。`,
      `<b>${BILL_LABEL.local}</b>：免費但很慢。${rtag('平行模式')}一次只能跑一個 agent。`,
      `${rtag('接外包')}外包單只能用個人訂閱、個人 API 或本地 GPU。`]))
    +rsec('資安稽核',rlist([
      `機敏工單走個人訂閱或個人 API（派工或評估架構都算）：${pct(AUDIT_ODDS.base)} 機率被稽核，中國廠商 ${pct(AUDIT_ODDS.cn)}。被抓到信任 −${AUDIT_TRUST}，結算每次 −${SCORE.audit} 分。`,
      `有 secret scanning 時稽核機率 ×${SCAN_AUDIT}。`]))
    +rsec('團隊席位',rlist([
      `最多 ${SEAT.vendors.length} 個，${SEAT.vendors.map(v=>VENDORS[v].name).join('、')} 每家一個。月初或週一申請，${SEAT.review} 天後審核，同時只能有一個申請。`,
      `第 ${SEAT.trust.map((_,i)=>i+1).join('／')} 個席位的信任門檻 ${SEAT.trust.join('／')}，看審核當天的信任。被退件不扣分，之後的週一可以再申請。`]))
    +rsec('案主',`${rtable(['案主','中國模型'],CLIENTS.map(c=>[c.name,banText[c.ban]]))}${rlist(['隨機事件「全公司暫停中國雲端」之後，所有工單至少禁中國雲端。','外包案主沒有限制，也不受全公司禁令影響。'])}`);
  case 'tickets': return rsec('工單',`${rtable(['複雜度','基準 token','KPI'],BASE.slice(1).map((b,i)=>[i+1,kt(b),KPI[i+1]]))}
    ${rlist([`事故單：第 2 天起每天多 ${pct(INC_RAMP)}，最高 ${pct(INC_RATE)}；複雜度 4、當天到期、KPI ×${INC_KPI}（有監控告警時期限延到隔天、KPI ×${MONITOR_KPI}）。選了 SRE 時每張新工單多擲一次事故。`,
      `逾期：扣 KPI 的 ${pct(LATE_KPI)}、信任 −${LATE_TRUST}（事故單 −${INC_LATE_TRUST}，有監控告警 −${MONITOR_LATE}）。`,
      `沒選的技術線算不熟：自己手寫時數 ×${UNFAMILIAR_HRS}。`])}`)
    +rsec('陷阱題',rlist([
      `顯示複雜度 1–2 的非事故工單有 ${pct(TRAP_RATE)} 是陷阱，真實複雜度 4 或 5，卡片上看不出來。`,
      `派工時能力夠就照真實複雜度硬做完；不夠就燒掉真實用量的 ${pct(TRAP_STOP)} 後停下來（導入 SDD 只燒 ${pct(SDD_TRAP_STOP)}），算失敗。自己手寫會花完時數後曝光。`,
      `評估架構：花 ${EVAL_TK}k × token 倍率、${EVAL_HRS}h × 速度，識破率 ${REVEAL.base} + ${REVEAL.per} × 能力，上限 ${pct(REVEAL.max)}（接 MCP 文件 +${pct(MCP_REVEAL)}、評估時間 ×${MCP_EVAL_HRS}）。`,
      `找主管重新評估（曝光後每張一次）：信任 ≥ ${RESCOPE_TRUST} 時信任 −${RESCOPE.ok}、KPI 照真實複雜度、期限 +${RESCOPE.days} 天；否則信任 −${RESCOPE.no}。`]))
    +rsec(`接外包 ${rtag('接外包')}`,rlist([
      `每天多 0–2 張外包單，報酬 = KPI × ${GIG_PAY}，做完進個人錢包，不加 KPI、不動信任。`,
      `逾期賠報酬的 ${pct(GIG_LATE)}，不扣 KPI 與信任；錢包不夠時照扣，可能變成負數。`]));
  case 'invest': return rsec('工程投資',`${rtable(['投資','工時','公司預算','效果'],['md',...INV_KEYS].map(k=>{const I=INVEST[k];return [`${I.name}${k==='md'?'（每條技術線各一次）':''}`,`${I.hrs}h`,nt(I.cost),I.desc];}))}
    ${rlist(['花自己的工時加公司 API 預算，效果維持到月底。'])}`)
    +rsec('採購電腦',`${rtable(['電腦','價格','信任門檻','到貨','效果'],HW_KEYS.map(k=>{const H=HW[k];return [H.name,H.price,H.trust,`${H.days} 天`,H.desc];}))}
    ${rlist([`走公司採購申請，不扣公司 API 預算。申請花 ${HW_REQ_HRS}h，同時只能一張；到貨當天看信任，夠就裝好（當天少 ${HW_SETUP_HRS}h 架設），不夠就退件、不扣分。`,
      '買了任何一台，本地跑 agent 時還能手寫；本地 GPU 仍然一次只跑一個 agent。',
      `閒置：每台當天沒用到的電腦，下班時信任 −${HW_IDLE}。`])}`);
  case 'score': return rsec('總分',rlist([
      `總分 = KPI × ${SCORE.kpi} + 信任 × ${SCORE.trust} − 稽核次數 × ${SCORE.audit}。`,
      '錢不算分：結算會列出個人花費（訂閱費 + 個人 API + 外包違約金 − 外包收入）與月底錢包餘額，只影響稱號。']))
    +rsec('評等',`${rtable(['評等','單線模式','平行模式'],GRADES.map((t,i)=>['SABC'[i],t,Math.round(t*PAR_GRADE)]).concat([['D','以下','以下']]))}
    ${rlist(['最高分依「模式 × 工作內容」分開記錄。'])}`)
    +rsec('存檔',rlist(['每天開工時自動存一格，重新整理會回到當天早上。','開新局或月底結算會刪掉存檔。']));
  default: return rsec('時間與資源',rlist([
      `一個月 20 個工作天，每週 5 天，每天 ${START.hours} 小時。`,
      `開局：個人錢包 ${nt(START.wallet)}、公司 API 預算 ${nt(START.corp)}、主管信任 ${START.trust}、KPI 0。`,
      '週一重置每週額度，可以調整訂閱：升級只補剩下週數的差價，降級不退費。錢包不夠付這次的訂閱就不能確認；已經訂的方案不受錢包影響。',
      `每天有 ${pct(EVENT_RATE)} 機率發生一件隨機事件：API 降價、廠商當機、預算凍結、額度縮水、流量暴增、主管稱讚或質疑、外包尾款、全公司禁中國雲端。`,
      `主管稱讚或質疑看 KPI 有沒有超過天數 × ${PACE_KPI}：超過信任 +${PRAISE_TRUST}，沒超過信任 −${DOUBT_TRUST}；第 6 天前沒超過只提醒、不扣分。`]))
    +rsec('遊戲模式',rlist([
      '單線模式：一次處理一張，agent 跑多久你就等多久。',
      `${rtag('平行模式')}同時跑 ${SLOT_CHOICES[0]}–${SLOT_CHOICES[SLOT_CHOICES.length-1]} 個 agent（開局選），你的時間花在派工和審 PR。`,
      `${rtag('平行模式')}成功後審 PR：複雜度 × ${PR_HRS} 小時，有自我審核 ×${PR_REVIEWED}、有 pre-commit hook 再 ×${HOOK_PR}；每多一個還在跑的 agent，審 PR 時間 +${pct(REVIEW_LOAD)}。`,
      `${rtag('平行模式')}完成時每個還在跑的 agent 增加 ${pct(CONFLICT)} 合併衝突機率（有 CI 流水線 ×${CI_CONFLICT}）；衝突的單變成「解決衝突」工單，複雜度少一級。`,
      `${rtag('平行模式')}下班沒跑完的 agent 會過夜（推進 ${OVERNIGHT_HRS} 小時），到期沒跑完或廠商當機會被中止。`]))
    +rsec(`推理強度 ${rtag('進階模式')}`,rtable(['強度','能力','token','時間'],EFFORT.map(e=>[e.name,e.cap>0?`+${e.cap}`:e.cap<0?`${e.cap}`:'不變',`×${e.tk}`,`×${e.hrs}`])));
  }
}
/* 規則 modal：back 是從其他彈窗打開時，關閉後回到那個彈窗的函式 */
export function showRules(back){
  const draw=()=>{
    mo.innerHTML=`<h2>遊戲規則</h2>
    <div class="seg rtabs">${RULE_TABS.map(t=>`<button class="sb ${t.id===ruleTab?'sel':''}" data-rtab="${t.id}">${t.title}</button>`).join('')}</div>
    <div class="rbody">${rulesTab(ruleTab)}</div>
    <small class="rnote">價格、額度與模型能力都是遊戲平衡用的虛構數字。各模型的能力、價格與速度看派工台。</small>
    <div class="actions"><button class="btn" data-act="close">關閉</button></div>`;
  };
  draw(); ov.hidden=false;
  mo.onclick=e=>{
    const t=e.target.closest('button'); if(!t) return;
    if(t.dataset.rtab){ruleTab=RULE_TABS.some(x=>x.id===t.dataset.rtab)?t.dataset.rtab:'basic';draw();}
    else if(t.dataset.act==='close'){if(back)back();else ov.hidden=true;}
  };
}
