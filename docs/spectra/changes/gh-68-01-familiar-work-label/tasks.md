## 1. 常數與標題

- [x] 1.1 `pickStack`（public/js/state.js）改用 public/js/data.js 新增的具名常數 `STACK_PICK`（0.75）與 `STACK_FE`（0.15），數值不變。驗證：`SIM_N=100 SIM_SEED=101 node tools/sim.js` 輸出跟改動前逐字相同（先存改動前的輸出再 diff），`node tools/check.js company-tech-stack` 通過。
- [x] 1.2 Company selection at run start：開局彈窗（`showSetup`，public/js/modals.js）的工作內容標題改成 zh-TW「熟悉的工作內容（可選 1–2 項）」、en「Stacks you know (pick 1–2)」，標題下、按鈕前加一行 `.hint`，文字是新 key `ui.setup.workHint`，百分比由 `STACK_PICK`、`STACK_FE`、`1 − 兩者` 插值，倍率由 `UNFAMILIAR_HRS` 插值；兩份字典各加這個 key。驗證：tools/check/company-tech-stack.test.js 原本斷言「工作內容（可選 1–2 項）」的那條改成新標題，並新增斷言：zh-TW 彈窗 HTML 裡標題在提示行之前、提示行在第一個 `data-company` 按鈕之前，且提示行等於 spec 的中文全文；切到 en 時標題與提示行等於 spec 的英文全文。`node tools/check.js company-tech-stack localization` 通過。[after: 1.1]

## 2. 上線紀錄與文件

- [x] 2.1 `NEWS`（public/js/news.js）最前面加 `{id:'gh-68-01', date:<push 到 main 的日期>}`，兩份字典各加 `news.gh-68-01`（說明開局改寫成熟悉的工作內容、所有技術線都會進工單），中英數字相同。驗證：`node tools/check.js whats-new localization` 通過。[after: 1.2]
- [x] 2.2 docs/DESIGN.md 的「工作內容與技術線」寫明開局標題改成「熟悉的工作內容」與提示行、需求紀錄加一條 #68，`data.js` 的程式碼地圖補 `STACK_PICK`、`STACK_FE`。驗證：內容檢查，`grep -n "STACK_PICK" docs/DESIGN.md` 有結果。[after: 2.1]
- [x] 2.3 全部檢查通過。驗證：`node tools/check.js` 以 0 結束並印出全部斷言通過的輸出。[after: 2.2]
