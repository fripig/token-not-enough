## 0. 基準

- [x] 0 改動前先存一份固定種子模擬輸出當基準：`SIM_N=100 SIM_SEED=101 node tools/sim.js` 的輸出存進 scratchpad。驗證：檔案存在、非空。

## 1. 從開局彈窗開規則時顯示正在勾的合約

- [x] 1 Contract list in rules and log：`rulesTab(id, corp)`（public/js/rules.js）多一個選用的合約清單參數，付費分頁公司 API 那行用 `corp ?? S.corpApi`；`showRules(back, tab, corp)` 每次重畫（含切分頁）都把 `corp` 傳下去；`showSetup`（public/js/modals.js）的規則按鈕改成 `showRules(back, undefined, normCorp(draft.corpApi))`。標頭（public/js/main.js）與最近更新（public/js/news.js）的呼叫不動，照舊讀 `S.corpApi`。驗證：tools/check/corp-api-contracts.test.js 新增一段，照 delta spec 的四個情境斷言——確認清單是 Anthropic＋Google 時在開局彈窗改成只勾 OpenAI、按規則、切到付費分頁，公司 API 那行有 OpenAI、沒有 Anthropic 和 Google；三家都不勾時寫「這局公司沒有簽任何廠商」；關掉規則回到開局彈窗時 OpenAI 仍是勾選、`S.corpApi` 仍是 Anthropic＋Google；之後不帶參數呼叫 `showRules()` 的付費分頁寫 Anthropic、Google。`node tools/check.js corp-api-contracts rules-reference localization` 通過。[after: 0]

## 2. 文件與全部檢查

- [x] 2 docs/DESIGN.md「公司 API 合約」那段補一句：從開局彈窗開規則時付費分頁顯示正在勾的合約（#71）；需求紀錄加一條 #71（使用者選了方案 A、不加最近更新）。驗證：`node tools/check.js` 以 0 結束全部通過；任務 0 的模擬指令重跑後跟基準 `diff` 沒有差異。[after: 1]
