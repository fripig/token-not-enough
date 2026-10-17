## 1. 改字

- [x] 1 Company selection at run start：兩份字典的 `stack.none.desc`、`ui.setup.workHintNone` 改成 proposal 的新文字（佔位符 `{six}`、`{fe}`、`{x}` 不變），`news.gh-69-01` 把「前端以外」的說法改成「六條主技術線」、數字不變。驗證：tools/check/company-tech-stack.test.js 斷言舊說明與舊提示行（中、英）的三條改成 spec 的新全文，`grep -rn "前端以外\|but frontend" public/js` 沒有結果，`node tools/check.js company-tech-stack localization whats-new` 通過。

## 2. 文件與全部檢查

- [x] 2 docs/DESIGN.md「全端打雜」段落的說明句與需求紀錄第 56 條改成新說法，需求紀錄加一條 #72。驗證：`node tools/check.js` 以 0 結束、全部斷言通過。[after: 1]
