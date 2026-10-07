# Token 撐到月底

一個 20 個工作天的經營小遊戲：每天會進來新的工單，你要決定派給哪家 code agent、用哪個模型，以及這筆 token 由誰付錢（個人訂閱、個人 API、公司 API、公司團隊席位，或本地 GPU）。

> 價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。

## 玩法重點

- **廠商**：Claude Code、Codex CLI、Gemini CLI、DeepSeek、智譜 GLM、Kimi、自架開源模型。
- **付費方式**：個人訂閱有每日／每週額度；個人 API 用多少付多少；公司 API 只能用有簽約的廠商。
- **遊戲模式**：平行模式（最多 3 個背景 agent，token 用量與合併衝突機率加成）與單線模式。
- **案主限制**：金融客戶禁止中國雲端模型，政府標案連中國開源權重都不能用。
- **自我審核**：多花 token 與時間，換取改壞時當場修正、不必整單重做的機會。
- **月底結算**：依 KPI、主管信任、自掏腰包的金額與稽核次數給 S～D 等級和稱號。

## 本機執行

純靜態網頁，沒有建置步驟：

```sh
npx serve public
# 或
python3 -m http.server -d public 8000
```

## 平衡模擬

```sh
node tools/sim.js
```

用自動玩家把兩種模式 × 三種審核等級各跑 200 個月，改數值後確認不會壞。

## 部署

推送到 `main` 後，`.github/workflows/pages.yml` 會把 `public/` 部署到 GitHub Pages。
第一次需要到 repo 的 **Settings → Pages → Build and deployment** 把 Source 設成 **GitHub Actions**。

## 專案結構

```
public/
  index.html     # 頁面骨架
  css/style.css  # 樣式（含深色模式）
  js/game.js     # 遊戲資料、規則與畫面
tools/sim.js     # 平衡模擬器
docs/CLAUDE.md   # 開發交接文件（需求來源、規則數值、程式碼地圖）
.github/workflows/pages.yml
```
