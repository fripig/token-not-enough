## 0. 基準

- [x] 0 改動前先存一份固定種子模擬輸出當基準：`SIM_N=100 SIM_SEED=101 node tools/sim.js` 與 `SIM_N=100 SIM_SEED=101 SIM_XREVIEW=1 SIM_INVEST=1 node tools/sim.js` 的輸出存進 scratchpad。驗證：兩個檔案都存在、非空。

## 1. 稽核紀錄寫出工單與付費方式

- [x] 1 Security audit on sensitive tickets、Audit for a personally billed reviewer：`auditRoll`（public/js/actions.js）多收一個「誰付的錢」的文字參數，稽核紀錄改成 `! 資安稽核：<title>｜<who>｜…，主管信任 -12`；派工結算用 job 的模型（含推理強度）、交叉審核那一擲用審核模型並在前面加「審核 」、評估架構與 agent 研究用不含強度的模型。兩份字典的 `log.audit`、`log.auditCn` 改成帶 `{title}`、`{who}`，新增審核前綴的 key；不多呼叫 `Math.random`。驗證：tools/check/billing-methods.test.js 新增斷言「機敏單 Opus・個人訂閱 被稽核時最新一行等於 spec 的全文」與「中國雲端稽核行含 `Claude Code 接 DeepSeek API / Chat・個人 API`」，tools/check/cross-model-review.test.js 新增「審核被稽核的行含 `審核 Claude Code / Opus・個人 API`」，`node tools/check.js billing-methods cross-model-review localization` 通過。

## 2. 研究與評估紀錄標出機敏

- [x] 2 Billing method on result and evaluation lines、Research log lines：機敏單的評估架構紀錄（`log.evalFound`、`log.evalClear`、`log.evalShort`）與研究紀錄（`log.split`、`log.researchShort`）裡的原單標題寫成 `<title>（機敏）`（英文 `<title> (sensitive)`），拆出來的兩張標題不加；非機敏單不變。新增字典 key 放標記文字。驗證：tools/check/action-log.test.js 新增「機敏單評估沒發現問題的行含 `<title>（機敏）｜評估｜`」與「非機敏單評估行不含（機敏）」，tools/check/research-tickets.test.js 新增「機敏研究單用 Opus・個人訂閱研究被稽核：研究行含 `（機敏）｜研究｜Claude Code / Opus・個人訂閱`、稽核行含同一個標題」，`node tools/check.js action-log research-tickets localization` 通過。[after: 1]

## 3. 最近更新、文件與全部檢查

- [x] 3 玩家看得到的改動：public/js/news.js 的 `NEWS` 最前面加 `{id:'gh-73-01',date:<push 到 main 那天>}`，兩份字典各加一句 `news.gh-73-01`（中英數字相同）；docs/DESIGN.md 執行紀錄表加稽核那行的格式、需求紀錄加一條 #73。驗證：`node tools/check.js` 以 0 結束全部通過；任務 0 的兩組模擬指令重跑後跟基準 `diff` 沒有差異。[after: 2]
