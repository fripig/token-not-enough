# Token 撐到月底

繁體中文 | [English](README.en.md)

線上遊玩：https://token-not-enough.youareright.app/

一個 20 個工作天的經營小遊戲：你是工程師，開局選一到兩項工作內容（Laravel 後端、Rails 後端、Rust 基礎設施、App 開發、SRE、DevOps），每天會進來新的工單，你要決定派給哪家 code agent、用哪個模型，以及這筆 token 由誰付錢（個人訂閱、個人 API、公司 API、公司團隊席位，或本地 GPU）。

> 價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。

## 玩法重點

- **工作內容與技術線**：工單大多來自選到的主技術線，也有前端和少量其他技術線的工單；不熟的技術線自己手寫要兩倍時間。Rust 編譯慢、能力不足的模型容易卡在 borrow checker；App 要跑模擬器，部分工單要過上架審核；Laravel、Rails 慣例多，簡單工單便宜模型就夠；SRE 事故單比較多；DevOps 要等 CI 與 terraform。工作內容按鈕標有難度星等。
- **廠商**：Claude Code、Codex CLI、Gemini CLI、DeepSeek、智譜 GLM、Kimi、自架開源模型。
- **付費方式**：個人訂閱有每日／每週額度；個人 API 用多少付多少；公司 API 只能用有簽約的廠商。
- **遊戲模式**：平行模式（開局選同時跑 2–6 個背景 agent，同時跑越多，審 PR 越久、合併衝突機率越高）與單線模式。
- **案主限制**：金融客戶禁止中國雲端模型，政府標案連中國開源權重都不能用。
- **陷阱題**：有些看起來五分鐘能改完的小單，其實牽扯整個架構。可以先花 token 讓 agent 評估架構；踩到了也能找主管重新評估，拿回合理的 KPI 和期限。
- **自我審核**：多花 token 與時間，換取改壞時當場修正、不必整單重做的機會。
- **月底結算**：依 KPI、主管信任與稽核次數給 S～D 等級；錢不算分，只是資源，花錢的方式決定稱號。

## 本機執行

純靜態網頁，沒有建置步驟。遊戲用原生 ES modules 載入，瀏覽器不允許從 `file://` 載入模組，所以要透過本機伺服器開，不能直接雙擊 `index.html`：

```sh
npx serve public
# 或
python3 -m http.server -d public 8000
```

## 規則檢查與平衡模擬

```sh
node tools/check.js   # 把 spec 範例數字逐條斷言（node:test 跑 tools/check/ 下每份 spec 一個檔）
node tools/check.js save-game   # 只跑一份 spec 的檢查
node tools/sim.js     # 兩種模式 × 六種工作內容 × 三種審核等級各跑 100 個月（SIM_N 可調，SIM_TRAP=0 關掉陷阱題，SIM_SLOTS=2..6 指定工作槽數，SIM_SEED=<整數> 固定亂數讓輸出可重現）
```

改數值後兩支都跑一次，確認不會壞、各工作內容沒有明顯失衡。

## 新增語言

遊戲文字都在 `public/js/i18n/` 的字典檔，key 是英文代號。要加一種語言（例如日文 `ja`）：

1. 複製 `public/js/i18n/en.js` 成 `public/js/i18n/ja.js`，只翻譯值，key 不動；`pool.*` 題庫的每個陣列數量與順序要跟原本一樣，`{名稱}` 參數保留，`lang.name` 寫該語言自己的名稱（例如 `日本語`）。
2. 在 `public/js/i18n.js` 的 `LANGS` 加一行：`import {DICT as ja} from './i18n/ja.js';` 與 `{id:'ja',dict:ja}`。
3. 在 `public/index.html` 的 `<footer id="about">` 加一份 `<div data-lang="ja" lang="ja" hidden>…</div>` 頁尾介紹。
4. 跑 `node tools/check.js`，確認全部通過（缺 key、題庫長度不同都會報錯）。

## 部署

推送到 `main` 後，`.github/workflows/pages.yml` 會把 `public/` 部署到 GitHub Pages。
第一次需要到 repo 的 **Settings → Pages → Build and deployment** 把 Source 設成 **GitHub Actions**。

## 專案結構

```
public/
  index.html     # 頁面骨架
  css/style.css  # 樣式（含深色模式）
  js/main.js     # 入口：事件委派、開局
  js/data.js     # 廠商、案主、技術線、方案、投資等資料與工具函式
  js/state.js    # 遊戲狀態與工單產生
  js/calc.js     # 成功率、帳單、額度等計算
  js/actions.js  # 派工、結算、評估、投資、每日事件
  js/view.js     # 畫面重繪
  js/modals.js   # 開局、每日、月底彈窗
  js/rules.js    # 規則 modal
  js/i18n.js     # 多語系：語言註冊表、t()、語言切換
  js/i18n/*.js   # 各語言字典（zh-TW 預設、en）
tools/sim.js     # 平衡模擬器
tools/check.js   # 規則檢查入口
tools/check/     # 各 spec 的規則檢查（<spec>.test.js）與共用的 lib.js
tools/fake-dom.js # 工具共用的假 DOM
tools/seed.js    # 固定亂數（SIM_SEED、CHECK_SEED 共用）
docs/DESIGN.md   # 設計與交接文件（需求來源、規則數值、平衡紀錄、程式碼地圖）
.github/workflows/pages.yml
```
