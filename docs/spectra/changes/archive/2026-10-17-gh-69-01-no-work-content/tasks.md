## 0. 前置

- [x] 0.1 確認 gh-68-01-familiar-work-label（#68）已 apply 並 archive：`docs/spectra/specs/company-tech-stack/spec.md` 的 `Company selection at run start` 寫著「熟悉的工作內容（可選 1–2 項）」與提示行、`public/js/data.js` 有 `STACK_PICK`、`STACK_FE`。若 archive 後的文字跟本 change 的 delta 不同，先用 `/spectra-ingest` 對齊再往下。驗證：`grep -n "STACK_FE" public/js/data.js` 有結果、`spectra validate gh-69-01-no-work-content` 通過。另存改動前輸出：`SIM_N=100 SIM_SEED=101 node tools/sim.js > <scratchpad>/sim-before.txt`。

## 1. 空選擇的規則

- [x] 1.1 Ticket stack distribution（設計：Empty list, not a sentinel stack；Distribution: fe keeps 15%, six stacks share the rest；Incidents spread over all six stacks）：`pickStack` 在 `S.companies` 為空時以 `STACK_FE` 機率回 fe、否則從 `COMPANIES` 平均抽，每張單的亂數次數跟有選時相同；`makeIssue` 的事故單在空選擇時從 `COMPANIES` 平均抽。驗證：tools/check/company-tech-stack.test.js 新增斷言——空選擇 10,000 張一般單 fe ≈15%、六條各 ≈14.17%、沒有 undefined 技術線；1,000 張事故單都在六條線且六條都出現；第 12 天進件事故比例 ≈0.12、sre 事故 ≈0.02（spec 表格）。`node tools/check.js company-tech-stack` 通過。[after: 0.1]
- [x] 1.2 Company selection at run start、Best score per mode and company、Common event parameters（設計：Display name and code `none`）：`normCompanies([])` 回 `[]`（其他不合法值仍退回 `['laravel']`）；`companyName([])` 回字典 `stack.none.company`（全端打雜／Jack of all trades）；`bestKey()` 與 `track` 的 `companies` 在空選擇時用 `none`。驗證：新增斷言——`normCompanies` 對 `[]`、`'rust'`、三條、未知值的結果照 spec 的 legacy 表；空選擇的最高分 key 為 `tokgame-best-serial-none`、開用量挑戰為 `-none-burn`；GA `game_start` 的 `companies` 為 `none`（tools/check/play-analytics.test.js）；`companies` 為 `[]` 的存檔 `readSave` 能讀、`showResume` 顯示全端打雜。`node tools/check.js company-tech-stack play-analytics save-game` 通過。[after: 1.1]

## 2. 開局畫面

- [x] 2.1 Company selection at run start（畫面；設計：Seventh button, mutually exclusive）：`showSetup` 在六顆按鈕後加第七顆 `data-company="none"` 全端打雜（難度 ★★★★、說明 `stack.none.desc`），`draft.companies` 為空時亮起；選滿兩條時它仍可按；`toggleCompany` 照 spec 的 toggle 表（含三列全端打雜）；標題 `ui.setup.work` 改成「熟悉的工作內容（可選 1–2 項，或全端打雜）」／「Stacks you know (pick 1–2, or Jack of all trades)」；空選擇時提示行改用 `ui.setup.workHintNone`（85% 由 `1 − STACK_FE`、15% 由 `STACK_FE`、×2 由 `UNFAMILIAR_HRS` 插值）；開局說明寫「負責「全端打雜」」。兩份字典加 `stack.none.company`、`stack.none.desc`、`ui.setup.workHintNone`。驗證：新增斷言——toggle 表每一列、按鈕星等、標題、空選擇的提示行與說明句中英全文；切換全端打雜與某條線時第 1 天工單重抽。`node tools/check.js company-tech-stack localization` 通過；本機 `python3 -m http.server -d public 8000` 用 400px 寬確認第七顆按鈕與四顆星不破版（截圖或描述記在 issue）。[after: 1.2]

## 3. 模擬與量測

- [x] 3.1 `tools/sim.js` 加 `SIM_NONE=1`：在每個模式的工作內容清單後多跑一組 `none`（`S.companies=[]`），平均分那行對照同模式 Laravel；投資自動玩家在這組不買 CLAUDE.md、研討會選第一個付得起的。不開時輸出不變。驗證：`SIM_N=100 SIM_SEED=101 node tools/sim.js` 與 0.1 存的 sim-before.txt `diff` 無差異；`SIM_NONE=1 SIM_N=20 SIM_SEED=101 node tools/sim.js` 印出 none 那兩行、不報錯。[after: 2.1]
- [x] 3.2 量測並記錄（設計：No compensation, measure first）：`SIM_NONE=1 SIM_N=100` 種子 101、202 各跑一次（預設與 `SIM_INVEST=1`），把兩種模式 none 相對 Laravel 的差距、評等分布寫進 docs/DESIGN.md 新段落「全端打雜」，不設目標、不調數值；差距若讓 ★★★★ 看起來不合理，在 issue #69 回報、用 AskUserQuestion 問要不要另開補償，不在這個 change 調。驗證：DESIGN.md 有該段落與四組數字。[after: 3.1]

## 4. 收尾

- [x] 4.1 `NEWS` 最前面加 `{id:'gh-69-01', date:<push 到 main 的日期>}`，兩份字典各加 `news.gh-69-01`（中英數字相同）；docs/DESIGN.md 的需求紀錄加一條 #69、「工作內容與技術線」寫全端打雜規則、程式碼地圖不需新名稱。驗證：`node tools/check.js whats-new localization` 通過。[after: 3.2]
- [x] 4.2 全部檢查。驗證：`node tools/check.js` 以 0 結束並印出全部斷言通過。[after: 4.1]
