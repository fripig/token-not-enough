## 1. 基準與資料

- [x] 1.1 在改動前用 `SIM_SEED=42 SIM_N=20 node tools/sim.js` 存一份基準輸出到 scratchpad，作為「一般模式行為不變」的比對依據。驗證：檔案存在且含每個「模式 × 公司」的平均分。
- [x] 1.2 依 design「Effort as a model transform, not new models」在 public/js/data.js 加入 `EFFORT`、`effModel(M, ef)`、`efOf(ef)`：中強度回傳原物件，低強度能力 −1（下限 1）、token ×0.7、時間 ×0.8，高強度能力 +1（依「Capability above 5 is allowed」不設上限）、token ×1.5、時間 ×1.4，名稱加「・低強度／・高強度」，price 與 w 不變。驗證：`node tools/check.js` 新增的斷言（Haiku 低強度能力 1、Opus 高強度能力 6、中強度回傳同一個物件）通過。 [after: 1.1]

## 2. 狀態與開局開關

- [x] 2.1 依 design「Run state」實作 Advanced mode toggle：`S.advanced` 由 `fresh()` 保留 `=== true`、否則 false；`sel.ef` 跨 `fresh()` 保留、預設 1；開局彈窗在外包區塊下方加「進階模式」一般／進階按鈕（`data-adv`），只切這個開關不重抽第 1 天工單；週一彈窗不顯示；`bestKey()` 不變。驗證：`node tools/check.js` 斷言非布林值退回 false、切換開關前後第 1 天工單 id 與標題相同、`bestKey()` 與開關無關；本機開 `python3 -m http.server -d public 8000` 目視確認彈窗兩個按鈕可切換。 [after: 1.2]

## 3. 派工效果

- [x] 3.1 實作 Effort effect on the agent：`est` 新增第五個參數 `ef = sel.ef`，用 `effModel(model(v, mid), efOf(ef))` 計算，讓成功率、`catchRate`、`makeJob` 的陷阱硬做判斷、`settle` 的扣款與紀錄名稱都吃到調整後的模型；評估架構與手寫不受影響。驗證：`node tools/check.js` 斷言 spec 範例（Sonnet 對複雜度 4 Laravel 單：低 50%、中 80%、高 95%，token 與時數比例 0.7／1／1.5、0.8／1／1.4）、一般模式下任何 `ef` 的 `est` 結果與 `ef=1` 相同、高強度 Sonnet 對真實複雜度 5 的陷阱不停下、`evalCost`／`revealRate` 與強度無關。 [after: 2.1]
- [x] 3.2 實作 Reasoning effort selector：進階模式下派工台在自我審核下方顯示「推理強度」三個按鈕（`data-ef="0|1|2"`，各附能力／token／時間提示），點選更新 `sel.ef` 並重繪；一般模式不顯示。審核按鈕上的抓錯率改用調整後的模型。驗證：本機開遊戲，一般模式看不到旋鈕；進階模式切換低／中／高時成功率、token 範圍與預估時數跟著變；400px 寬度不破版、深淺色都看得清楚。 [after: 3.1]

## 4. 派工方案

- [x] 4.1 依 design「Presets」與 dispatch-presets spec 的 Preset storage and defaults：preset 加 `ef`，`validPreset` 接受缺少 `ef`，`presetsOf` 把缺少的補成 1，`DEFAULT_PRESETS` 全部 `ef: 1`；`presetBlock` 把 `p.ef` 傳給 `est`。驗證：`node tools/check.js` 斷言沒有 `ef` 的方案保留並補成 1、一般模式下存了 `ef: 2` 的方案估算與 `ef: 1` 相同。 [after: 3.1]
- [x] 4.2 實作 Saving and loading presets in the dispatch panel 的強度部分：`savePreset` 存 `sel.ef`、`loadPreset` 帶回強度、存檔紀錄寫出強度；進階模式下強度不是中的方案，載入按鈕標籤顯示「高強度／低強度」。驗證：`node tools/check.js` 斷言存成方案後 `S.presets[i].ef === sel.ef`、載入後 `sel.ef` 等於方案值；本機目視載入按鈕標籤。 [after: 4.1, 3.2]

## 5. 工具、平衡與文件

- [x] 5.1 `tools/sim.js` 加 `SIM_EFFORT=1`：設 `S.advanced = true`，每張單依選到模型的原始能力減顯示複雜度，≤ −1 用高、≥ 2 用低、其他用中；檔頭說明一起更新。驗證：不設 `SIM_EFFORT` 時 `SIM_SEED=42 SIM_N=20 node tools/sim.js` 的輸出與 1.1 的基準逐字相同（`diff` 無差異）；`SIM_EFFORT=1 SIM_N=20 node tools/sim.js` 跑完不報錯。 [after: 4.2]
- [x] 5.2 平衡量測：`SIM_N=100` 預設與 `SIM_EFFORT=1` 各跑兩次，算平行模式四家公司「進階 ÷ 一般 − 1」，目標 −5%～+15%；超出時只調低／高強度的 `tk` 與 `hrs`（能力 ±1 不動），調整後同步更新 design 與 spec 的倍率並重跑 `node tools/check.js`。單線模式只記錄。驗證：兩次實測數字都落在目標內，記在 docs/DESIGN.md。 [after: 5.1]
- [x] 5.3 更新 docs/DESIGN.md：需求清單加入這次的使用者原文、遊戲規則加「推理強度（進階模式）」一節（倍率、能力上下限、不影響評估與手寫、方案存強度、最高分不分開）、平衡實測表、程式碼地圖補上 `EFFORT`、`effModel`、`efOf`，`tools/sim.js` 說明加 `SIM_EFFORT`。驗證：內容審閱，文件中的倍率與 public/js/data.js 的 `EFFORT` 一致。 [after: 5.2]
