# Token 撐到月底

一個 20 個工作天的經營小遊戲：你是全端工程師，開局選一家公司（Laravel 新聞站、Rails SaaS、Rust 基礎設施、App 團隊），每天會進來新的工單，你要決定派給哪家 code agent、用哪個模型，以及這筆 token 由誰付錢（個人訂閱、個人 API、公司 API、公司團隊席位，或本地 GPU）。

> 價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。

## 玩法重點

- **公司與技術線**：工單大多來自公司的主技術線，也有前端和少量其他技術線的工單；不熟的技術線自己手寫要兩倍時間。Rust 編譯慢、能力不足的模型容易卡在 borrow checker；App 要跑模擬器，部分工單要過上架審核；Laravel、Rails 慣例多，簡單工單便宜模型就夠。公司按鈕標有難度星等。
- **廠商**：Claude Code、Codex CLI、Gemini CLI、DeepSeek、智譜 GLM、Kimi、自架開源模型。
- **付費方式**：個人訂閱有每日／每週額度；個人 API 用多少付多少；公司 API 只能用有簽約的廠商。
- **遊戲模式**：平行模式（開局選同時跑 2–6 個背景 agent，開越多 token 用量加成與合併衝突機率越高）與單線模式。
- **案主限制**：金融客戶禁止中國雲端模型，政府標案連中國開源權重都不能用。
- **陷阱題**：有些看起來五分鐘能改完的小單，其實牽扯整個架構。可以先花 token 讓 agent 評估架構；踩到了也能找主管重新評估，拿回合理的 KPI 和期限。
- **自我審核**：多花 token 與時間，換取改壞時當場修正、不必整單重做的機會。
- **月底結算**：依 KPI、主管信任、自掏腰包的金額與稽核次數給 S～D 等級和稱號。

## 本機執行

純靜態網頁，沒有建置步驟。遊戲用原生 ES modules 載入，瀏覽器不允許從 `file://` 載入模組，所以要透過本機伺服器開，不能直接雙擊 `index.html`：

```sh
npx serve public
# 或
python3 -m http.server -d public 8000
```

## 規則檢查與平衡模擬

```sh
node tools/check.js   # 把 spec 範例數字逐條斷言
node tools/sim.js     # 兩種模式 × 四家公司 × 三種審核等級各跑 100 個月（SIM_N 可調，SIM_TRAP=0 關掉陷阱題，SIM_SLOTS=2..6 指定工作槽數，SIM_SEED=<整數> 固定亂數讓輸出可重現）
```

改數值後兩支都跑一次，確認不會壞、各公司沒有明顯失衡。

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
tools/sim.js     # 平衡模擬器
tools/check.js   # 規則檢查
tools/fake-dom.js # 工具共用的假 DOM
tools/seed.js    # SIM_SEED 固定亂數
docs/DESIGN.md   # 設計與交接文件（需求來源、規則數值、平衡紀錄、程式碼地圖）
.github/workflows/pages.yml
```
