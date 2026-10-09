## 1. 規則數字改成具名常數

- [x] 1.1 Rule numbers come from game constants（design: Numbers are read from named constants, inline literals are lifted）：先跑 `SIM_SEED=1 SIM_N=5 node tools/sim.js > <scratchpad>/sim-before.txt` 存基準；再把 design 表格列的字面值抽成具名 export 常數，值不變——public/js/calc.js `P_STEP`（`est` 的成功率階梯）、public/js/actions.js `AUDIT_ODDS`、`AUDIT_TRUST`、`OVERDRAFT_TRUST`、`CORP_DAY_LIMIT`、`CORP_DAY_TRUST`、`LATE_TRUST`、`INC_LATE_TRUST`（`auditOdds`、`auditRoll`、`checkOverdraft`、`endDay` 改用它們）、public/js/modals.js `SCORE`、`GRADES`、`PAR_GRADE`（`showEnd` 改用）、public/js/state.js `START`（`fresh()` 的起始錢包、公司預算、信任改用）。Verify：同一指令的輸出與 sim-before.txt 用 `diff` 比對沒有差異；`node tools/check.js` 結束碼 0。

## 2. 規則 modal

- [x] 2.1 Rules tabs（design: Rules content lives in a new module rules.js、Tabs and their content、Selected tab is remembered for the page session）：新增 public/js/rules.js，export `RULE_TABS`（基本、派工與成功率、付費與稽核、工單與陷阱、投資與電腦、結算，id 依序 basic／dispatch／billing／tickets／invest／score）、`rulesTab(id)`（未知 id 退回 basic）與 `showRules(back)`。modal 標題「遊戲規則」，分頁按鈕 `data-rtab`，選中的加 `sel`，有 `data-act="close"` 的關閉按鈕；內容照 design 各分頁清單，數字一律從常數插值（含 1.1 新增的常數、`INVEST[k].desc`、`HW[k].desc`），只對平行模式、進階模式、接外包的條目加標籤；記住上次分頁只存在模組變數。public/css/style.css 補分頁列樣式（沿用 `.seg`／`.sb` 與既有 token，淺色深色都看得清楚、400px 寬不產生橫向捲動）。Verify：tools/check.js 新增斷言——第一次 `showRules()` 有六個 `data-rtab` 依序且 basic 選中；用 `els.mo.onclick` 點每個分頁都會選中；選 invest 後關閉再開仍是 invest；未知 id 回 basic；`node tools/check.js` 結束碼 0。[after: 1.1]
- [x] 2.2 Rule numbers come from game constants 的內容斷言：tools/check.js 斷言結算分頁含每個 `GRADES` 值與 `GRADES[i]*PAR_GRADE`（4600／7360 等）與 `SCORE` 的權重；付費與稽核分頁含 `nt(CORP_DAY_LIMIT)`、`AUDIT_TRUST`；投資與電腦分頁含 md 與每個 `INV_KEYS` 的 `INVEST[k].name`、`hrs`、`cost`，以及每個 `HW[k].name`、`trust`。Verify：暫時把 `GRADES[0]` 改成 4601 時斷言失敗、改回後通過；`node tools/check.js` 結束碼 0。[after: 2.1]

## 3. 入口與關閉

- [x] 3.1 Rules entry points（design: Header button placement）：public/js/view.js 的 `render()` 標頭在日曆後面加「規則」按鈕 `data-act="rules"`，public/js/main.js 的 `app` 點擊委派遇到它呼叫 `showRules()`；早上報告、繼續上一局、存檔無法讀取、月底結算彈窗不加入口。Verify：tools/check.js 斷言 `render()` 後 `els.app.innerHTML` 含 `data-act="rules"`，`showDay` 與 `showEnd` 的 HTML 不含它；從 header 開啟後點關閉 `els.ov.hidden===true` 且 `S` 的 JSON 不變、`localStorage['tokgame-save']` 不變；`node tools/check.js` 結束碼 0。[after: 2.1]
- [x] 3.2 Closing returns to the opening context（design: Returning to the setup modal by redrawing）：public/js/modals.js 的 `showSetup` 在簡短規則清單後面（調整訂閱時在 lead 句後面）加「看完整規則」按鈕 `data-act="rules"`；把它的 `mo.onclick` 處理器改成具名函式，點這顆按鈕時呼叫 `showRules(back)`，`back` 重新 `draw()` 並重新掛上處理器，`draft` 不重設。Verify：tools/check.js 斷言 `showSetup(false)` 後點 `data-out="1"` 與 `data-mode="serial"`、點規則、點關閉 → `els.ov.hidden===false`、HTML 中接外包與單線模式仍是 `sel`，再點 `confirm` 後 `S.outsource===true`、`S.mode==='serial'`；`showSetup(true)` 也有這顆按鈕；`node tools/check.js` 結束碼 0。[after: 3.1]

## 4. 文件與本機確認

- [x] 4.1 docs/DESIGN.md：需求清單加第 23 條（使用者原文「新增規則modal 方便遊玩過程打開檢閱」，指向 Spectra change `gh-20-01-rules-modal`，#20）；程式碼地圖加 `rules.js` 一列並在 calc／actions／modals／state 列補上新常數；「慣例」加一句改規則時要同步改 public/js/rules.js 的文字。Verify：`grep -n "rules.js" docs/DESIGN.md` 有結果；`spectra validate gh-20-01-rules-modal` 通過。[after: 3.2]
- [x] 4.2 本機實際操作：`python3 -m http.server -d public 8000` 開頁，用瀏覽器確認標頭按鈕、六個分頁、從開局彈窗開規則再關閉回到開局彈窗且選擇保留、400px 寬與深色模式都正常，console 沒有錯誤。Verify：截圖或 console 讀取結果附在回報裡。[after: 4.1]
