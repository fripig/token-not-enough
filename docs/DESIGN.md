# Token 撐到月底

設計與交接文件，也是 Claude Code 接手開發時讀的規則來源（根目錄 `CLAUDE.md` 會引入這份）。這個專案是在 claude.ai 的一段對話裡做出來的，下面整理那段對話的需求原文、每一輪的設計決定、遊戲規則與數值，以及程式碼地圖。

## 專案是什麼

純靜態網頁遊戲：玩家扮演一位工程師，開局選一到兩項工作內容（Laravel 後端、Rails 後端、Rust 基礎設施、App 開發、SRE、DevOps 六條主技術線），或選全端打雜，在 20 個工作天內用有限的錢和額度，把每天進來的工單交給不同廠商的 code agent 處理。核心是 token 預算的取捨：選哪家、哪個模型、誰付錢（個人訂閱／個人 API／公司 API／公司團隊席位／本地 GPU）、要不要審核，還要顧到案主合約和資安稽核。

原本是 claude.ai Artifact 上的單一 `index.html`（原檔封存在 `docs/token-game.zip`），搬進 repo 時拆成 HTML、CSS、JS 三個檔案，之後的改版都記在下面。目前的檔案：

- `public/index.html`：頁面骨架。`<head>` 有含關鍵字的 `<title>`、canonical、`theme-color`、Open Graph／Twitter Card、JSON-LD（`VideoGame`）、favicon 與 manifest；`#app` 裡只有載入中的佔位，`start()` 第一次 `render()` 會換掉。遊戲介紹、怎麼玩與 GitHub 專案連結放在 `#app` 外面的 `<footer class="about">`，一直留在頁面上，Googlebot 執行 JS 後也索引得到。分享圖是 `public/img/og.png`（1200×630），圖示是 `public/favicon.ico`、`public/apple-touch-icon.png`、`public/img/icon-192.png`／`icon-512.png`；另有 `robots.txt`、`sitemap.xml`、`manifest.webmanifest`。改遊戲名稱或介紹時一起更新這些地方（`sitemap.xml` 的 `lastmod` 在介紹內容改動時更新）。
- `public/css/style.css`：樣式。開頭補了 `body{margin:0}`、`[hidden]{display:none!important}`，原本由 Artifact 外殼提供；少了後者 `.ov` 的 `display:flex` 會蓋過 `hidden`，彈窗關不掉。
- `public/js/*.js`：遊戲本體，拆成十個原生 ES modules 加上 `public/js/i18n/` 的字典檔（見「程式碼地圖」），由 `public/index.html` 以 `<script type="module" src="js/main.js">` 載入；無建置步驟、遊戲邏輯沒有外部 JS 相依。瀏覽器不允許從 `file://` 載入模組，一定要用本機伺服器開。頁面另外從 Google Fonts 載字型，並在 `public/index.html` 載入 Google Analytics（gtag.js）做流量統計。遊戲事件由 `state.js` 的 `track()` 送出（沒有 `gtag` 時不動作，node 工具不受影響）：`game_start`（開局確認，週一調整不送）、`day_reached`（開局送第 1 天，之後每天開工送一次）、`game_end`（月底結算，多帶 `score`、`grade`，開了用量挑戰再帶 `burn_pct`）。每個事件都帶 `game_version`（`data.js` 的 `GAME_VERSION`，部署時 `pages.yml` 的兩個 job（GitHub Pages、Cloudflare Pages）各自把 `'dev'` 換成短 commit hash，sed 沒換到就讓那個 job 失敗）、`game_mode`、`companies`（如 `laravel+rust`，全端打雜送 `none`）、`advanced`、`outsource`、`burn`（用量挑戰開關，Spectra change `gh-65-01-burn-quota-mode`）、`corp_api`（這局簽了公司 API 合約的廠商，照 anthropic、openai、google 的順序用 `+` 串起來，一家都沒簽送 `none`，Spectra change `gh-70-01-corp-api-contracts`）、`day`。看玩家玩到第幾天：GA4 依 `day` 統計 `day_reached` 的使用者數；`day`、`game_mode` 等參數要先在 GA 管理後台註冊成事件範圍的自訂維度才看得到。事件規則以 `docs/spectra/specs/play-analytics/` 為準（Spectra change `gh-10-01-play-analytics`），`tools/check/play-analytics.test.js` 有對應斷言。訂閱與解決工單的選擇另外送（Spectra change `gh-14-01-choice-analytics`，#14）：`subscription`（開局每家有訂閱的送一筆 `vendor`、`plan`，都沒有送一筆 `none`；週一只送有改的那幾家，開局順序是 `game_start`→`subscription`→`day_reached`）、`dispatch`（agent 開跑時：`vendor`、`model`、`bill`、`review`、`effort`、`sdd`（套用的 SDD 等級：`none`／`md`／`framework`，Spectra change `gh-33-01-sdd-levels`）、`rv_vendor`、`rv_model`、`rv_bill`（交叉審核的審核模型，同一個送 `same`，Spectra change `gh-48-01-cross-model-review`）、`via`＝panel／quick／batch、`preset`、工單的 `cx`、`stack`、`incident`、`sensitive`、`gig`、`merge`、`research`（研究單直接派工））、`job_result`（`settle` 時：同樣的選擇參數加 `cx`、`stack`、`gig`、`research`、`outcome`＝cancelled（玩家中止，Spectra change `gh-32-01-abort-agent`）／aborted（到期、當機、單線跑不完）／quota／conflict／rejected／caught／success／trap_stop／fail、`tokens`（k，含審核那段）、`cost`（NT$，含審核那段）、`hours`）、`manual_fix`（`outcome`＝success／fail／trap、`unfamiliar`、`hours`）、`evaluate`（`cx` 送評估前看到的原估，Spectra change `gh-15-01-evaluate-shown-cx`；`outcome`＝found／clear／quota）、`rescope`（approved／refused）、`abandon`（找主管退單，Spectra change `gh-51-01-abandon-ticket`：`cx`（顯示的複雜度，不洩漏隱藏陷阱）、`stack`、`gig`、`merge`、`research`）、`research`（研究單先研究，Spectra change `gh-21-01-research-split-tickets`：`via`＝agent／self、`vendor`、`model`、`bill`（自己研究三個都送 `none`）、`cx`、`stack`、`gig`、`outcome`＝split／quota）、`invest`（`investment`、`stack`、`via`＝self／agent、`quality`（套上的品質，整數百分比；自己做、直接買、採購申請、研討會報名都是 100）、`vendor`、`model`、`bill`（派 agent 做的投資工單才有值，其他送 `none`），Spectra change `gh-64-01-agent-investments`；平行模式的投資工單在等級套上時才送（派 agent 做的是驗收時，#67），開單、派出、跑完待驗收、中止、付不出來都不送，投資工單也不送 `dispatch`／`job_result`；申請採購電腦也送，`investment` 是 `pc`／`spark`／`mac`；Lv2 送 `md2`／`tests2`／`scan2`／`skills2`／`sdd2`，提升 agent 能力送 `ai1`–`ai3`，報名研討會送 `conf_<場次>`，週一出席不送）。被擋下的動作不送。GA 後台要把 `vendor`、`plan`、`model`、`bill`、`review`、`rv_vendor`、`rv_model`、`rv_bill`、`effort`、`sdd`、`via`、`preset`、`cx`、`stack`、`incident`、`sensitive`、`gig`、`merge`、`research`、`outcome`、`unfamiliar`、`investment`、`burn`、`corp_api` 註冊成事件範圍自訂維度，`tokens`、`cost`、`hours`、`quality`、`burn_pct` 註冊成自訂指標。本機用 `python3 -m http.server -d public 8000` 開。
- `tools/sim.js`：平衡模擬器。`node tools/sim.js` 會 import 遊戲模組，用假 DOM（`tools/fake-dom.js`）跑自動玩家（兩種模式 × 六種工作內容 × 三種審核等級，每組預設 100 局，`SIM_N=60` 可調；`SIM_TRAP=0` 可關掉陷阱題做對照，`SIM_SLOTS=2..6` 指定平行模式自動玩家自己最多同時跑幾個 agent（預設 3，遊戲本身沒有上限，`SIM_SLOTS=0` 能派就派，#63），`SIM_INVEST=1` 讓自動玩家做工程投資（`SIM_INVEST=2` 再加買三項新投資，`SIM_INV_EXTRA=monitor,scan` 之類可只加買指定幾項），`SIM_COMBOS=1` 改跑十五種雙選組合，`SIM_OUTSOURCE=1` 開啟接外包（外包單一律走個人 API），`SIM_EFFORT=1` 開啟進階模式並讓自動玩家挑推理強度，`SIM_SEATS=1..3` 在第 6、11、16 天直接給團隊席位（量上限用，不經信任審核）並讓自動玩家優先刷席位，`SIM_HW=1` 讓自動玩家照真實信任審核採購電腦（信任達門檻才申請，DeepSeek 被禁時改派解鎖的本地模型），`SIM_SUB=pro200|pro500` 讓自動玩家改訂 OpenAI Pro 200／Pro 500（不訂 Max 5×），OpenAI 沒當機、今日額度還超過 300k 時每張單都派 Codex Sol 走個人訂閱，否則照舊派工（方案月費超過起始錢包時直接報錯，所以 `pro500` 不能用），`SIM_UPGRADE=1` 讓自動玩家第 6、11、16 天照錢包（留 NT$1,500 給個人 API）把 OpenAI 升到 Pro 500 或 Pro 200（照遊戲的 `subCost` 收費：從不訂閱開新方案收全月）、之後照 `SIM_SUB` 的派法用 Codex Sol，`SIM_UPGRADE=2` 再加上升到 Pro 500 後不接外包單（和 `SIM_OUTSOURCE=1` 一起量外包），`SIM_SEED=<整數>` 用固定種子取代 `Math.random`、輸出可逐字重現，由 `tools/sim-seed.js` 在遊戲模組載入前裝好（只有模擬器讀 `SIM_SEED`），`SIM_LOG=1` 另外印出每種模式月底執行紀錄的筆數與存檔 JSON 字元數，`SIM_SIX_RATE=<0–1>` 覆寫複雜度 6 的比例（`0` 時亂數序列跟沒有複雜度 6 時一樣，#50），`SIM_ABANDON=1` 讓自動玩家下班前把今天到期、沒在跑的公司單找主管退掉（#51），`SIM_BURN=1` 開用量挑戰並在平均分那幾行多印使用率（整體、訂閱＋席位、公司 API）與席位佔總價值的比例，另印各模式總分與用量加分的中位數，`SIM_BURN=2` 再換成燒額度的自動玩家（訂閱、席位有額度就派 Opus／Astra／Gemini Pro 自審，公司 API 照「剩下的預算 ÷ 剩下的天數」與單日上限分給 Opus，都不行照預設派法，#65），`SIM_CONF=1`（要搭配 `SIM_INVEST`）讓自動玩家在第 1、6、11 天報名第一個付得起的國內研討會（涵蓋第一條主技術線的技術線場、台灣人工智慧年會、HWDC、HITCON、其他），每天先買開放的 Lv2 與下一級提升 agent 能力，`SIM_SDD2=1`（要搭配 `SIM_INVEST`）讓自動玩家投資都買完後買 SDD 框架 Lv2，`SIM_XREVIEW=1`（要搭配 `SIM_INVEST`）讓它投資都買完後買交叉審核工具，之後寫的模型做不到這張單（能力差距 ≤ −10）又有審核時改用 Opus 審（付費照席位、訂閱，否則公司 API、個人 API），`SIM_SDD_PICK=1` 讓它顯示複雜度 ≤2 的單選 SDD 不用、其他選已買的最高級，`SIM_RESEARCH_RATE=0` 可關掉研究單（亂數序列和沒有研究單時一樣），`SIM_RESEARCH=agent|self` 讓自動玩家遇到研究單先研究（agent 用它本來要派的模型與付費方式，self 自己研究），預設一律直接派工），印出抽樣與每個「模式 × 工作內容」的平均分、對照同模式 Laravel 的差距和評等分布。改數值後跑一次確認不會壞、沒有明顯失衡。
- `tools/check.js`、`tools/check/`：規則檢查。`node tools/check.js` 把 spec 裡的範例數字逐條斷言（技術線分布、成功率、時間倍率、手寫時數、上架審核、KPI 補償、最高分 key、難度標示、接外包、GA 遊戲事件、存檔、研究單、畫面版面，以及十份核心規則 spec 的情境），任何一條不符就以非 0 結束。改規則時同步更新。斷言照 spec 分檔：`tools/check/<spec>.test.js`，`<spec>` 是 `docs/spectra/specs/` 下的目錄名稱（33 份 spec 各一個檔），用 Node 內建的 `node:test` 跑，不用 `package.json`、不裝套件。`tools/check.js` 只是入口：先檢查 `CHECK_SEED`，再用 `node --test` 跑全部的檔；帶 spec 名稱只跑那幾份（`node tools/check.js save-game trap-tickets`），名稱打錯以 1 結束並列出可用的名稱；也可以直接 `node --test tools/check/save-game.test.js`。每個檔第一行 import `tools/check/lib.js`，它依序載入假 DOM、`tools/check-seed.js`、遊戲入口，並提供 `ok(條件, 名稱, 細節)`、`near`、`section(名稱, fn)` 與跨 spec 共用的 helper（`newRun`、`ticket`、`withRand`、`clickMo`、`clickApp`、`job`、沒開過局的 `pristine` state）；只有一份 spec 用到的 helper 留在那個檔。一個 `section()` 是一個 node:test 測試，裡面有斷言不符時照樣跑完、印出 `✗ 名稱 細節`，最後這個測試失敗並列出不符的斷言；通過時印出「N/N 條斷言通過」。新增斷言時放進那條規則所屬 spec 的檔，不要讓一段依賴前一段留下的遊戲狀態或變數。node:test 讓每個檔各自開一個 process，所以每個檔都從剛載入的遊戲開始，用同一個種子設定亂數；檔案之間不互相影響，增減或改名檔案不會改到別的檔抽到的亂數。約 20 條比例斷言的容差只有 2.5～4 個標準差，用真亂數時規則對了也會偶爾失敗（2026-10-10 跑 40 輪失敗 2 輪），所以預設用固定種子 `CHECK_SEED_DEFAULT`（29，和 `SIM_SEED` 同一個 mulberry32，函式是 `tools/seed.js` 的 `seedRandom`；檢查不讀 `SIM_SEED`），每次結果都一樣。`CHECK_SEED=<整數>` 換種子（每個檔都用這個種子），`CHECK_SEED=random` 用真的 `Math.random` 找邊緣的斷言，其他值以 1 結束。之後的改動讓固定種子每次都失敗在某條比例斷言上時，先用 `CHECK_SEED=random` 或幾個別的種子確認規則沒錯，再調那條斷言或換預設種子，並寫下原因（Spectra change `gh-29-01-check-flaky-stats`，#29）。拆檔（Spectra change `gh-37-01-split-check-js`，#37）前是一個 2,527 行的 `tools/check.js`，所有斷言共用一串亂數，插一段就可能讓不相干的比例斷言失敗。拆檔後 1,307 條斷言名稱跟拆檔前完全相同（當成可重複的集合比對），固定種子全過；`CHECK_SEED=random` 跑 10 輪有 1 輪失敗在拆檔前就知道的邊緣斷言「進件：sre 第 12 天事故 0.2256」（1 萬張工單、容差 ±0.01 約 2.4 個標準差，抽到 0.2374），其他 9 輪全過，沒有調任何容差或預設種子；兩條原本靠前一段狀態的斷言改成自己準備（research 1.2 自己產生工單，「預設只選 Laravel」改用 `pristine` 驗第一次開局的預設值）。跑一次約 42.6 秒（拆檔前 51.9 秒，2026-10-10 量測），時間幾乎都花在 `random-events`（單獨跑 43.8 秒，大部分是逐日 `endDay` 的迴圈）。

部署：push 到 `main` 後 `.github/workflows/pages.yml` 跑兩個互不相依的 job，同一份蓋好版號的 `public/` 發佈到兩個地方（Spectra change `gh-59-01-cloudflare-pages`，#59）。只有 `public/` 會公開。

- `cloudflare` job → Cloudflare Pages 專案 `token-not-enough`（`cloudflare/wrangler-action` 跑 `pages deploy public`），https://token-not-enough.youareright.app/ （主網址）。主網址與 `token-not-enough-2.youareright.app` 都是 Pages 的自訂網域，DNS 是 Cloudflare 上 `youareright.app` 的 CNAME → `token-not-enough.pages.dev`（Proxied）；也可以從 `token-not-enough.pages.dev` 連。要 repo secrets `CLOUDFLARE_API_TOKEN`（只給 Account → Cloudflare Pages → Edit）與 `CLOUDFLARE_ACCOUNT_ID`。
- `deploy` job → GitHub Pages，https://fripig.github.io/token-not-enough/ （備用網址，repo 的 Pages 設定沒有自訂網域）。兩個 job 互不影響，一邊失敗另一邊照常發佈。

主網址原本是 GitHub Pages（CNAME → `fripig.github.io`，DNS only），Cloudflare 那份只在 `-2` 網址，因為有人回報連不上主網址（#59，2026-10-13 從開發機連 8 次都正常、沒重現）。2026-10-14 使用者選了把主網址整個搬到 Cloudflare Pages、GitHub Pages 退成備用（#61，推翻 #59「不搬主網域」）。兩份檔案完全相同：canonical、Open Graph、JSON-LD、`robots.txt`、`sitemap.xml` 都指向主網址，搜尋引擎把其他網址當成主網址的副本；GA 是同一個 property，用頁面的 hostname 分辨。

`youareright.app` zone 的 Browser Cache TTL 會把 Pages 的 `max-age=0` 蓋成 4 小時，部署後玩家可能拿到新舊混用的模組（#60）。所以 zone 有一條 Cache Rule「Pages respect origin TTL」（hostname 是主網址與 `-2`，Browser TTL 選 Respect origin），兩個網址的 JS 都是 `cache-control: public, max-age=0, must-revalidate`。新增 Pages 自訂網域時要一起加進這條規則。wrangler 登入（OAuth）只有 Pages 寫入與 zone 唯讀，DNS 與 Cache Rules 要在 Dashboard 改。

用 wrangler 4.150 建 Pages 專案（`wrangler pages project create`）時，指令會被轉到 Workers 而失敗，要加 `--force` 才會建出 Pages 專案；專案建好後 `pages deploy` 不受影響。

Artifact 時期的限制仍值得沿用：不用 `alert/confirm/prompt`、`localStorage` 要包 try/catch。

## 對話中的需求（依時間順序，使用者原文）

1. 「幫我做一個網頁遊戲 可以選用各家的code agent 來處理工作上的issue 但是只有有限的token可以用 要從使用哪家的哪個model 要用訂閱制 還是api 還是公司出錢 設計遊戲」
   → 做出 v1：單線派工、四家廠商、四種付費方式、20 天月結。
2. 「工作應該可以平行處理一次只能選一個不大合理」「不過可以作為遊戲模式的選項」
   → 加入「平行模式」（預設）與「單線模式」，開局選擇。
3. 「消耗的Token可能加成」
   → 原本解讀為：平行時同時跑的 agent 越多，token 用量越高（重複載入 context、協調成本）。
   2026-10-09 使用者修正：「平行模式 不同工作間會加成其實不大合理」（每個 agent 各自有 context）。拿掉 token 加成，改成同時跑越多、審 PR 越久（切換成本）。設計紀錄在 Spectra change `gh-12-01-parallel-review-load`（#12）。
4. 「加上中國模型 但是可能會因為案主不能用中國模型不能使用」
   → 加入 DeepSeek、智譜 GLM、Kimi，以及本地 Qwen 權重；每張工單有案主，案主決定能否用中國模型。
5. 「另外加上工單自審核功能 可加成Token消耗但是避免錯誤整單重做」
   → 派工時可選不審核／自審／嚴格審核。
6. 「我要讓claude code繼續開發」→ 本文件。
7. 「我主要是想擴充issue類型跟不限定後端角色的參與程度 甚至技術線也可以擴充到RUST或者ruby on rails ,或者app開發維護」
   → 開局選公司（主技術線），工單分技術線，技術線只用本身的特性影響 agent（不替各家模型虛構誰比較會）。設計紀錄在 Spectra change `tech-stack-companies`。
8. 「開始寫成完整遊戲後 可以判斷是否要引入框架重構」→ 見下方「框架重構評估」。
9. 「加入陷阱題 那種看起來改很快 但其實會牽扯到很多基本架構的東西 手動預估30分鐘 但做下去才知道要花一整天看架構的東西」
   → 陷阱題、付費評估架構、找主管重新評估。設計紀錄在 Spectra change `trap-tickets`。
10. 「平行模式最大agent數量可以自選」
   → 開局選 2–6 個工作槽，不加新代價，用模擬器量測。設計紀錄在 Spectra change `parallel-slots`（#63 拿掉工作槽數，見第 49 條）。
12. 「工作類別可以改成多選嗎」→ 開局公司（主技術線）可選 1–2 條，選到的平分 75% 工單。設計紀錄在 Spectra change `multi-stack-company`。
   同時提出「可以加上外包類別 token只能自己出」：決定另開 change，做成開局可勾選的類別、只能用個人付費、做完給錢不給 KPI、逾期扣錢不扣信任；是否佔用 1–2 條名額待提案時確認。
   → 做成獨立的「接外包」開關，不佔名額。設計紀錄在 Spectra change `outsource-gigs`。
11. 「目前玩得有點痛苦 能有何機制能增加趣味但是又符合遊戲精神呢」（痛點：每張單都要重選一輪、整局只有越來越緊）、「投入ＳＤＤ也放上去」
   → 派工方案（一鍵派工）＋工程投資（CLAUDE.md、補測試、skills、MCP 文件、SDD）。設計紀錄在 Spectra change `dispatch-presets-and-investments`。
13. 「新增可選的進階模式 可以選擇更細的model」、「推里強度也會導致工作變慢」
   → 開局可勾選「進階模式」，派工台多一個推理強度（低／中／高）旋鈕，模型清單不變；高強度能力 +1（#46 之後的刻度是 +10）但 token 變多、工作變慢。最高分不分開。設計紀錄在 Spectra change `reasoning-effort`。
14. 「公司團隊席位應該可以多申請 如果信任度夠高可以申請第二個第三個」
   → 每家廠商最多一個、最多三個席位，門檻 55／65／75，一次只審一個。設計紀錄在 Spectra change `gh-06-01-multi-team-seats`；平衡量測另開 #7。
15. 「工程投資可以細化或者增加項目」、「有事故時信任度降低的程度要減小」
   → 補測試拆成單元測試與 CI 流水線，新增 pre-commit／lint hook、secret scanning／脫敏、上架自動化（fastlane）、監控告警；事故扣信任減半做成監控告警的效果。設計紀錄在 Spectra change `gh-08-01-more-investments`。
16. 「開卡做存檔功能」
   → 每天開工時自動存一格，開頁問要不要繼續。使用者選了開工時存（允許重骰當天）、只存一格、結構版本不同就丟、讀檔的局照常記最高分。設計紀錄在 Spectra change `gh-11-01-save-game`。
17. 「平行模式 不同工作間會加成其實不大合理」
   → 見第 3 條：拿掉平行 token 加成，改成審 PR 的切換成本。使用者在「改成審 PR 切換成本／同廠商共用速率限制／直接拿掉」裡選了第一個。
18. 「目前很常遇到還沒準備好就突然出現緊急任務 花了資源下去以後還是失敗 而且還沒時間重試就被扣信任了」、「降低第一週的出現機率 理論上有做足夠的事前準備應該會比較能接受一點」
   → 事故單機率第 1 週逐日遞增，流量暴增事件第 6 天起才生效，少掉的不在後面補回（三項都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-13-01-incident-ramp-up`（#13）。
19. 「遊戲執行的時候也把訂閱哪些模型送到ga」、「我的目的是要知道訂閱的分布 跟中間解決issue時的選擇 可能要分多個事件來記錄」
   → 每家訂閱一個 `subscription` 事件（開局、週一有改才送），派工、派工結果、手寫、評估架構、找主管、工程投資各一種事件（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-14-01-choice-analytics`（#14）。
20. 「openai的model沒有細分到model 名稱是為何」、「換成家族名，開卡處理 主要目標是 gpt6」、「能力也要對應」、「cluade model也有新版」、「Haiku 5.5 才是對比luna吧」
   → OpenAI 三個模型改名為 GPT-6 家族名 Luna／Sol／Astra（不帶版號，id 不動），數值照實際定位調整（使用者選「照比例但壓縮」，第一次量測後再選「能力 3，調慢加價再量」）。設計紀錄在 Spectra change `gh-16-01-gpt6-model-names`（#16）。
   → Claude 照 Claude 5 家族調整：Haiku 跟 Luna 同一套（能力 3、0.15、速度 0.7），Opus 降到 Sonnet 的 2 倍價，新增能力 6 的 Fable（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-16-02-claude-5-models`（#16）。
21. 「投資可以買電腦 有顯卡的pc mac 或者 nvidai spark 買了以後地端不會卡手寫 另外也能跑更高等級的模型」、「金額可能要相對調整 現在的金額太不現實了」、「買了沒用每天降信任」、「是否有更強力的本地model可以選擇」、「寫程式還是要用 gemma吧 用gpt-oss沒有新資料」、「基本款也順便改」
   → 工程投資面板加「採購電腦」：三台可全買、效果疊加，走公司採購申請（不扣 API 預算、信任審核），買了本地跑 agent 時能手寫、本地仍一次一個，閒置每台每天信任 −2；Spark 解鎖 Qwen3-Coder-Next 與 Gemma 4 31B、Mac 解鎖 GLM-5.3；基本款本地模型換成 Qwen3.6 35B-A3B、Gemma 4 26B A4B、Gemma 4 E4B 並把 MoE 調快（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-17-01-local-hardware`（#17）。
22. 「把公司選項改成工作內容 且加上 sre跟devops」
   → 開局「公司」改成「工作內容」，只改介面文字（`S.companies`、GA 的 `companies`、最高分 key、存檔都不動）；新增 SRE（選了時每張新工單多擲一次事故）與 DevOps（等 CI 與 terraform，執行時間 ×1.25，期限 +1 天、KPI ×1.3），都是 ★★，維持可選 1–2 條（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-18-01-work-roles-sre-devops`（#18）。
23. 「新增規則modal 方便遊玩過程打開檢閱」
   → 標頭右上常駐「規則」按鈕，開局與週一調整訂閱彈窗有「看完整規則」（從那裡打開時關閉會回到原彈窗、選擇保留）；六個分頁速查（基本、派工與成功率、付費與稽核、工單與陷阱、投資與電腦、結算），倍率、機率、代價、扣分都從遊戲常數插值，原本寫死在程式裡的這類數字抽成具名常數、數值不變（固定種子模擬前後輸出逐字相同）。複雜度門檻、20 個工作天這類結構性數字照文字寫（都是使用者從選項裡選的：分頁速查、標頭＋開局彈窗）。設計紀錄在 Spectra change `gh-20-01-rules-modal`（#20）。
24. 「openai訂閱制新增 500美元的等級」、「把花費上限提到一萬五會不會好一點」
   → OpenAI 訂閱新增 Pro 500（NT$16,250／月，每日 12,500k、每週 50,000k，Plus 的 25 倍），原本的 Pro 改名 Pro 200（id `pro`、價格與額度不動）；不做 Pro 100 與 Astra Ultrafast。按鈕上的 12,500k 原本會四捨五入成「13M」，改成 10M 以上的 token 數留一位小數（12.5M）。月底總分的個人花費下限量了 12k／15k／20k，從 NT$12,000 提到 NT$20,000，讓 Pro 500 的月費全部算進分數（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-19-01-openai-pro-500`（#19）。
25. 「執行紀錄看不到 對話關掉就沒了」（回報 #24 時找不到第 1 天下班扣信任的原因）、「且所做的決策都詳細記錄」、「到時候可以用紀錄復盤」、「乾脆加入播放功能」
   → 彈窗裡的訊息補進現有的執行紀錄（不另做每日報告畫面），紀錄整個月都保留（拿掉 80 筆上限）；派工記完整決策（含單線模式、派工台看到的成功率、一鍵／批次用了哪個方案），結果與評估寫付費方式，記等待、隨機事件、逾期扣多少信任、新的一週，每天下班一行總結（都是使用者從選項裡選的）。播放功能選了「紀錄逐筆播放」（不做完整重播整局），另開 change `gh-27-01-log-replay`（#27）。設計紀錄在 Spectra change `gh-25-01-log-history`（#25）。
26. 「我沒額外買電腦就因為沒用ＡＩ被扣信任度」（#24，新局、沒申請採購、第 1 天下班就被扣）
   → 重現（目前版本各 1,000 局）沒有觸發電腦閒置扣分，最可能是第 2 天早上的事件「主管問進度怎麼這麼慢／「不是有買 AI 嗎？」信任 -4」：「買 AI」被讀成採購電腦，也沒寫出扣分是因為 KPI 沒超過天數 × 7。事件文字改成寫出目前 KPI 與門檻、拿掉「買 AI」，第 1 週（第 6 天前）沒達標只提醒不扣分，後面不補（都是使用者從選項裡選的）。change 原名 `gh-24-01-hw-idle-without-purchase`，根因確認後改名。設計紀錄在 Spectra change `gh-24-01-slow-progress-event`（#24）。
27. 「投資順便加上收合功能 有點佔位子了」（#22，討論國內研討會時提出）
   → 點「工程投資」標題收合或展開整個面板，收合時只留「已做 N 項」；沒存過偏好時展開，之後記住上次的選擇（`localStorage` 的 `tokgame-invfold`，重新整理、開新局都沿用，不進存檔、不送 GA、不寫紀錄）。使用者選了整個面板收合（不做「已買的自動收起」）、另開 change（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-22-02-invest-panel-collapse`（#22）。（2026-10-11 #40 改成派工台旁邊的分頁，收合功能拿掉，見第 37 條。）
28. 「我打算新增一種工作類型 直接進行會大幅消耗token 但是如果先進行研究就會拆成兩個比較小的工作」
   → 研究單：卡片明牌標示、研究一定拆成兩張；可以叫 agent 研究，也可以自己研究；複雜度 4 拆成 2＋3、5 拆成 3＋3，KPI 總和不變；直接派工只罰 token（都是使用者從選項裡選的）。初版直接派工 ×2.5、agent 研究 80k／1h、自己研究 3h，量測後先研究反而比直接派工差，使用者選了 ×4 加上研究變便宜（40k／0.5h、自己 1.5h）。設計紀錄在 Spectra change `gh-21-01-research-split-tickets`（#21）。
29. 「外包案子的錢應該要多一點 目前看起來很寒酸」、「錢跟kpi拆開好了 不然感覺只會導致讓玩家不敢花錢」、「因為有新增研討會自費選項 但是一個月內是鐵定回不了本的 但是又對能力有實際差異 所以想把錢跟kpi脫鉤」、「錢不夠應該不影響已有的訂閱」
   → 月底總分拿掉個人花費（錢只是資源）、錢包用光就停（個人 API 停在一半、錢包 NT$0 以下不能選、付不起的訂閱不能確認，已有的訂閱不受影響）、月底餘額只顯示、外包報酬 KPI × 80 → × 250、評等門檻重訂成 4300/3300/2500/1700（都是使用者從選項裡選的；門檻照模擬量測定）。起始錢包原本選了調高到 NT$20,000 讓開局訂得起 Pro 500，量測後訂最貴方案變成最佳解、外包變虛，使用者改回 NT$8,000。change 原名 `gh-26-01-gig-pay-raise`，discuss 後範圍變大改名。設計紀錄在 Spectra change `gh-26-01-money-off-score`（#26）。
30. 「投資新增國內研討會」、「研討會也能提高agent能力 當作去學怎麼用ＡＩ」、「改成參加研討會以後 可以投資更高等級的能力」（#22）
   → 工程投資加「國內研討會」：十場分四類（技術線場、資安場、AI 場、綜合場），平日報名、週末出席、下週一生效，自費、不花工時、不看信任（花一整天工時一定會害工單逾期，所以改成週末）；技術線場讓涵蓋的技術線手寫 ×0.8、不再算不熟；各類開放一項現有投資的 Lv2（CLAUDE.md、單元測試、secret scanning、做 skills），另加三級的「提升 agent 能力」。使用者問要不要導入策略模式：量了投資效果的判斷 28 處、各改不同公式，結論是不做，改成投資狀態用等級數字、數值按等級查表。平衡兩輪調整後仍低於目標，使用者選擇採用第二輪、接受未達標（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-22-01-domestic-conference`（#22）。
31. 「派出去的agent可以中止 避免派錯模型就沒救了」（#32）
   → 平行模式背景 agent 每一列加兩段式「中止」→「確定中止？」（不用 `confirm`，點別處就恢復）；照已跑比例扣 token、錢、額度（至少 5%，`CANCEL_MIN`，跟到期中止同一條公式），不花時間；工單原樣回佇列，不算失敗、沒有重做折扣、隱藏陷阱不曝光（使用者選的：照搬到期中止會變成「派便宜模型馬上中止」換 7 折，或用 5% token 驗陷阱、比評估架構便宜）；機敏單照擲稽核、透支照算；本地 GPU 立刻釋放；紀錄寫 `⏹ 中止`，GA `job_result` 的 `outcome` 送 `cancelled`（到期、當機仍是 `aborted`）。單線模式派工當下跑完，沒有中止。review 發現陷阱的真實時數會從預計時間洩漏、配上中止可以便宜驗陷阱，使用者選了陷阱曝光前一律顯示照顯示複雜度估的時間（`shownHrs`，見「陷阱題」）。自動玩家不中止，`SIM_N=100 SIM_SEED=101` 輸出改動前後逐字相同。設計紀錄在 Spectra change `gh-32-01-abort-agent`（#32）。
32. 「sdd也新增高等級 第一級是使用markdown紀錄文件例如sUPERPOWER 第二級是使用spectra openspec speckit等框架」、「SDD應該做成選項 可以選擇不用」、「SDD TDD 單元測試 ＣＩＣＤ都弄成可選項」（#33）
   → 導入 SDD 分兩級：Lv1 就是原本的效果（markdown 規格，例如 Superpowers），舊存檔的 `true` 讀成 Lv1；Lv2 是 SDD 框架（Spectra／OpenSpec／Spec Kit），「更重但更準」：token ×1.2、複雜度 ≥3 成功率 +15%、陷阱只燒 5%；Lv2 不用研討會，先買 Lv1 就能買。派工台自我審核下面新增「開發流程」區塊，每張單選 SDD 不用／Lv1／Lv2（只列已買的），每局預設已買的最高級；派工方案記住 SDD，沒買到那級就降到已買的最高級、不略過方案，預設 A 不用、B／C 最高級（都是使用者從選項裡選的）。Lv2 初版 4h／NT$400，平行模式量到 −3.4%～+0.2%，使用者選了跟其他 Lv2 同價的 1h／NT$200，接受平行未達標。單元測試、新投資 TDD、CI 做成可選項（每次使用有代價）拆到 `gh-33-02`。設計紀錄在 Spectra change `gh-33-01-sdd-levels`（#33）。
33. 「如果要加入多語系 應該就要引入框架了吧」、「用英文代號做key 方便別人送pr加語言」（#34）
   → 不導入框架，自製字典模組 `public/js/i18n.js` 加上每種語言一個字典檔（`public/js/i18n/zh-TW.js`、`en.js`），程式裡寫 `t('英文語意 key', {參數})`。繁中＋英文；第一次開頁看瀏覽器語言（`zh*` → 繁中，其他 → 英文），標頭可隨時切換，偏好存 `localStorage` 的 `tokgame-lang`，同一個網址。執行紀錄與佇列裡已產生的工單標題維持寫入當下的語言，不重翻，存檔結構與 `SAVE_VER` 不動。工單題庫直譯、題材不變，各語言數量與順序相同。`<head>`、sitemap、OG 圖維持中文；頁尾在 `index.html` 放中英兩份、JS 只顯示目前語言那份（Googlebot 多半用 `en-US` 渲染，中文頁尾仍在原始碼裡）。金額維持 `NT$`、GA 參數不翻。一個 change、分批搬字串，全部搬完才打開切換按鈕（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-34-01-i18n`（#34）。
34. 「但其實是任務跑隔天沒辦法給新任務」（#36，回報第 14 天 PC 與 Spark 被判閒置扣信任 −4）
   → 平行模式本地 GPU 一次只跑一個 agent，前一天派的本地 agent 跑過夜時，隔天沒辦法再派本地，電腦卻被算成閒置。改成開工時把還在跑的本地 agent 記成用到那台電腦：不設時數門檻、之後中止不撤回、不加紀錄行（都是使用者從選項裡選的）。`local-hardware` spec 原本把「過夜 agent 占著 GPU、本地派工被擋」列成 −2 的例子，一起改掉。固定種子模擬改動前後輸出逐字相同（預設自動玩家不派本地模型）。設計紀錄在 Spectra change `gh-36-01-hw-idle-overnight-job`（#36）。
35. 「切換語言後，佇列裡已經有的工單還是中文」（#38，切到英文後只有新工單是英文）
   → 字典沒有漏翻，是 `makeIssue` 把標題寫成字串、localization spec 規定不重翻。使用者選了工單標題跟著目前語言重翻、執行紀錄維持寫入當下的語言、舊存檔沒有新欄位的照舊顯示原字串。工單多存題庫位置 `src`，顯示時用 `issueTitle()` 查目前語言的字典；抽位置的亂數呼叫跟原本一樣，固定種子模擬輸出改動前後逐字相同，`SAVE_VER` 沒加。設計紀錄在 Spectra change `gh-38-01-untranslated-tickets`（#38）。
36. 「uiux是否有值得修改的地方」、「照你建議先做」（#39）
   → 在瀏覽器玩第 1 天找出的問題裡先修四項：「等 1 小時」「等到下一個 agent 完成」「調整訂閱」「下班」原本在執行紀錄標題列、排在 1,141px 高的投資面板下面（手機在 4,276px），改成畫面底部的動作列（`dayDock`，`position:sticky; bottom:0`，左邊寫第幾天與時間，400px 寬時按鈕排一列，平常三顆、高 87px，英文星期一四顆、高 102px）；派工、手寫後選取清掉、派工台縮成空白提示，改成空白時在提示下面顯示最新 3 筆紀錄（「剛剛」，`DP_RECENT`），不自動選下一張（避免連點把下一張用同樣設定派出去）；深色模式彈窗遮罩原本用淺色的 `--ink`、反而讓畫面變白，改用 `--scrim` token（深色是黑色 60%）；選項按鈕 `.sb` 文字靠左。手機點工單自動捲到派工台、派工台預估列黏底、開局彈窗精簡、早上報告帶下班總結、付費方式預設這次不做（早上報告與付費方式預設在 #42 做了，手機自動捲動在 #54 做了，見第 47 條）。設計紀錄在 Spectra change `gh-39-01-play-flow-ui`（#39），規則以 `docs/spectra/specs/game-layout/` 為準。
37. 「工程投資應該可以用Tab的形式 跟派工台放在一起」（#40）
   → 右欄改成「派工台／工程投資」兩個分頁，投資分頁標籤寫「已做 N 項」，頁面總高（第 1 天）從 2,852px 降到 1,753px。使用者選了：在投資分頁點工單自動切回派工台、拿掉投資面板收合（`tokgame-invfold`）由分頁取代、分頁不記住（載入、開新局、換日都回派工台）。兩個分頁都會產生、沒選到的用 `hidden` 藏起來，所以檢查主畫面 HTML 的既有斷言不用切分頁。設計紀錄在 Spectra change `gh-40-01-dispatch-invest-tabs`（#40）。
38. 「把派工方案的載入跟最後決策移到上方 有機會直接套用 不用卷到最下面」、「一鍵派工直接給ＡＢＣ三個選項的按鈕」（#41）
   → 派工台改成先放載入方案、預估、警告與派出按鈕，下面才是細調與存成方案（桌機選了工單後派出按鈕底部在 606px，不用捲動）；目前選擇跟方案一樣時那組載入按鈕亮起來。卡片的一鍵派工改成 A／B／C 三顆，不能用的停用並寫原因、機敏單個人付費的寫稽核機率，按哪顆用哪組、不往下找；批次派工照舊用 A→B→C 第一個能用的（三項都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-41-01-preset-first-dispatch`（#41）。
39. 「早上報告帶下班總結、付費方式預設改成訂閱 這兩個先做」（#42，#39 UI 檢視列的兩項）
   → 早上報告最上面加前一天下班的四格（KPI、信任、錢包、公司，差值與現值），跟紀錄的下班那行同一組數字，存在 `morning.sum`；派工台換廠商與第 1 天開工時，付費方式先選公司席位、再選個人訂閱（額度要夠這張單的預估），都不行才維持原本（兩項都是使用者從選項裡選的）。固定種子模擬改動前後輸出逐字相同。設計紀錄在 Spectra change `gh-42-01-morning-summary-sub-default`（#42）。
40. 「多選了 openai pro 200方案 卻只多付一千多」（#43，第 16 天把 OpenAI 從不訂閱改成 Pro 200 只付 NT$1,625）
   → 不是 bug：週一的規則是照剩餘週數補差價（6,500 × 1/4）。使用者在「維持按週比例／新訂閱收全月／一律收全月差價」裡選了新訂閱收全月：週一某家從不訂閱改成付費方案收整個月的月費，已有付費方案升級仍照剩餘週數補差價，降級不退、開局不變（`subCost`）。模擬器的 `SIM_UPGRADE` 改用同一個函式；預設與 `SIM_INVEST=1` 的固定種子輸出改動前後逐字相同。設計紀錄在 Spectra change `gh-43-01-new-sub-full-month`（#43）。
41. #44 回報（平行 6 槽、Laravel＋DevOps、接外包玩完一整局）：第 20 天下班 5 張公司單、4 張外包單算逾期，其中好幾張是第 18–20 天才進來、本來第 21 天以後才到期的單；結算的「你自己掏的錢」顯示約 −NT$51,864。
   → 到期日不再截到第 20 天（一般單、Rust／App／DevOps 的 +1 天、監控告警事故單、找主管重新評估的 +2 天），卡片照寫真實到期日，第 20 天下班只有到期日 ≤ 20 的單算逾期；「你自己掏的錢」只算支出，接外包時另列「個人淨收支」＝外包收入 − 支出，自費稱號看支出（都是使用者從選項裡選的）。discuss 時發現拿掉上限後第 20 天還在跑、工單第 20 天以後才到期的 agent 不會被扣款，使用者選了照玩家中止扣款（紀錄寫「⏹ 月底收工」、GA `cancelled`、算進公司單日上限）。設計紀錄在 Spectra change `gh-44-01-month-end-late-and-self-pay`（#44）。

42. 「目前 model 能力有直接定義成功率嗎」、「我也想拉高上限 所以可能要順便把整體成功率往下調一點」（#46，Fable 能力 6 已經對所有工單 95%，再強的模型沒有差別）
   → 拆成三個 change：`gh-46-01-model-capability-scale` 先把能力改成 ×10 整數（20–60）、成功率在錨點之間線性內插，現有模型數值完全不變；`gh-46-02-success-curve` 再拉長成功率曲線（差距 +20 才 95%）、把投資與大型 codebase 加成改成「減少失敗」，用模擬器量；`gh-46-03-complexity-six-tickets` 新增複雜度 6 的工單。-01 使用者選了：推理強度維持 ±10（細分之後再說）、能力條改成點數加數字（●●●●◐ 45）、門檻類規則（Rust、大型 codebase、陷阱硬做）維持一刀切。五組固定種子模擬（`SIM_N=100 SIM_SEED=101` 加上不開、`SIM_INVEST=1`、`SIM_EFFORT=1`、`SIM_HW=1`、`SIM_INVEST=1 SIM_CONF=1`）改動前後輸出逐字相同。設計紀錄在 Spectra change `gh-46-01-model-capability-scale`（#46）。
   → -02 使用者選了：抓錯率改看能力差距（模型做不到的單也抓不到自己的錯）、一次做對的機率保留 97% 上限、大型 codebase 改成能力差距 ±5、驗收看派工台顯示的成功率（#45 那局的配置下 Opus 複雜度 5 在 85%–92%、Fable 高 5 點以上、簡單的單 ≥95%）。討論時另開 #48（用更高等級模型審核）。分數掉多少只量、照實記錄，評等門檻交給 #45。設計紀錄在 Spectra change `gh-46-02-success-curve`（#46）。

43. 「是否要加入放棄工單功能 不然做跟不做都可能降低信任度」（#51，在 #50 複雜度 6 propose 時提出：複雜度 6 會多出「明知做不到」的單）
   → 派工台加「找主管退單」：公司單信任 −2、不扣 KPI（逾期是 −4 加扣 KPI 一半）；事故單不能退；外包單照付逾期違約金 30%、不扣信任；跑著 agent 的單要先中止才能退；按鈕兩段式「找主管退單（信任 −2）」→「確定退單？」，點別處恢復；另開卡排在 #50 前面做（都是使用者從選項裡選的）。合併衝突單、研究拆出的單、陷阱都能退，隱藏陷阱不曝光、研究拆出的兩張各扣 −2。設計紀錄在 Spectra change `gh-51-01-abandon-ticket`（#51）。
44. #45 回報（平行 6 槽、Max 20× 全派 Opus＋自審、OpenAI 席位派 Astra、投資全買，月底總分約 12,900，平行 S 門檻 6,880 的近兩倍）：評等失去意義。
   → 在 `gh-46-02-success-curve`（成功率曲線拉長）之後重訂評等門檻：平行 S 只留給強玩法（強玩法模擬的中位數 10,700）、平行 A–D 不動、單線門檻往下調回 gh-46-02 之前的分布、兩種模式的門檻各存一組（拿掉「平行 = 單線 × 1.6」）。量測時發現 Rust／App／DevOps 的 KPI ×1.3 讓強玩法拿 S 的比例差很多，另開 #53；高價訂閱與外包收入的代價另開 #52；#51 的退單讓單線分數高很多，使用者選擇單線門檻不跟著改（都是使用者從選項裡選的）。跟 gh-46-02 一起上線。設計紀錄在 Spectra change `gh-45-01-kpi-balance`（#45）。

45. 「新增複雜度 6 的工單 第 11 天起從原本的複雜度 5 分一部分出去 少量」（#50，從 #46 拆出來；Fable 能力 60 對所有複雜度 5 的單都已經到頂）
   → 第 11 天起，抽到複雜度 5 的非事故單有 25%（`SIX_RATE`）變成複雜度 6；KPI 34、token 基準 1,200k；可以是研究單（30%），研究後拆成 3＋4；單線、平行都出（都是使用者從選項裡選的）。#51 的找主管退單先上線，做不到的複雜度 6 可以退。事故單仍是 4，陷阱真實複雜度仍是 4–5。設計紀錄在 Spectra change `gh-46-03-complexity-six-tickets`（#50）。

46. #53（從 #45 拆出來）：Rust、App、DevOps 的 KPI ×1.3 是補單線模式比較慢，平行模式強玩法本來就做得完，變成純加分，強玩法拿 S 的比例 Rust 85%、App 82%、DevOps 84%，Laravel、Rails 14%。
   → 平行模式拿掉 KPI ×1.3（單線保留，期限 +1 天兩種模式都保留），不選 ×1.15、不分線設定；平行 S 門檻照 #45 的定義（強玩法中位數）重量，10,700 → 9,500。外包報酬跟著工單 KPI 走，找主管重新評估照目前的模式算；第 1 天的工單在開局確認前就產生，確認時模式改了就重算 KPI 與外包報酬（不抽亂數）。預設自動玩家平行 Rust 掉到約 −33%、超出 ±25% 的目標，使用者接受，當成派弱模型做 Rust 的代價（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-53-01-parallel-hard-stack-kpi`（#53）。
47. 「派工方案按鈕也放到FOOTER的按鈕上合理嗎」（#54）
   → 討論後不放：卡片下面已經有一鍵 A／B／C，底部動作列放的是整天的控制（等待、調整訂閱、下班），手機上動作列已經 87–102px 高。實際的痛點是手機上點工單後派工台在整串工單下面，改做自動捲動：畫面寬度 ≤860px（一欄版面，`NARROW_MQ`，跟 `.main` 改成一欄的 CSS 斷點同一個）時點工單卡片，選好、切到派工台後平滑捲到分頁列（`scrollToDispatch`，`.tabbed` 上方留 8px），減少動態效果時直接跳過去；在投資分頁點工單也捲；桌機兩欄不捲；一鍵 A／B／C、批次派工、分頁標籤、派工台按鈕都不捲；派出、手寫之後不捲回工單列表（都是使用者從選項裡選的）。瀏覽器沒有 `matchMedia` 或 `scrollIntoView` 時（node 工具）什麼都不做。設計紀錄在 Spectra change `gh-54-01-mobile-scroll-to-dispatch`（#54），規則以 `docs/spectra/specs/game-layout/` 為準。
48. 「用更高等級的模型審」（#48，#46 討論 gh-46-02 成功率曲線時提出：抓錯率改看能力差距後，模型做不到的單也抓不到自己的錯）
   → 新增工程投資「交叉審核工具」（2h、公司 NT$200，不用研討會）。買了之後自審或嚴格審核時，派工台多一排「審核模型」（預設同一個），選了別的模型再多一排「審核付費方式」（預設照 `prefBill` 的規則：席位、訂閱額度夠就用，否則第一個能用的）。抓錯率公式不變，能力差距改看審核模型（一律中強度，可以挑比較弱的模型便宜審）；token 拆成兩段，審核那段照審核模型的價格與付費方式另外付；審核那段付不出來或廠商當機就當作沒審、寫的那段照常；機敏單寫、審各自走個人付費時各擲一次稽核；派工方案記住審核模型，沒買投資時當同一個、買了但用不了時那顆一鍵派工停用；#48 排在 #47（單元測試、CI 可選）前面（都是使用者從選項裡選的）。平衡量測沒達標（平行 −2.9%～+4.8%），使用者選擇接受、照實記錄（見「自我審核」）。設計紀錄在 Spectra change `gh-48-01-cross-model-review`（#48），規則以 `docs/spectra/specs/cross-model-review/` 為準。
49. 「平行模式的 同時跑幾個 agent 是同時跑幾個agent會影響 還是開局選完就固定」、「是否可以關閉數量設定 只留平行數量的影響就好」（#63）
   → 拿掉開局的工作槽數（2–6），同時跑幾個沒有上限，代價只看實際在跑的數量（審 PR 切換成本、合併衝突）。合併衝突機率加上限 `CONFLICT_MAX` 0.9（CI 減半之後才套，同時跑 6 個以內碰不到，數字不變）；審 PR 倍率維持線性；GA 不再送 `slots`；舊存檔的 `slots` 讀檔時忽略、`SAVE_VER` 沒加；`SIM_SLOTS` 改成自動玩家自己的上限，`0` 是不限。平衡目標是不設上限的強玩法對 6 個 agent 每格不超過 +5%，超過才調 `REVIEW_LOAD` 或衝突係數（都是使用者從選項裡選的）；量到最多 +1.4%，數值沒調。`parallel-slots` spec 的目錄名稱沒改。設計紀錄在 Spectra change `gh-63-01-unlimited-parallel-agents`（#63）。

50. 「平行模式工程投資也可以平行處理 算是工單 低階模型執行增加的能力會降低 可以使用高模型取得該有的輔助」、「按了投資就產生一個相應的工單會不會比較好」（#64）
   → 平行模式下「寫東西的投資」（CLAUDE.md、單元測試、CI、hook、secret scanning、fastlane、監控告警、skills、MCP 文件、SDD，含 Lv2）按了會在佇列開一張投資工單，自己做（原本的工時與公司預算、品質 100%）或派 agent（只付 token、不扣原本的公司預算、不會失敗）；品質看模型能力與投資複雜度的差距，效果照品質打折，開關類效果品質要 60%；品質不到 100% 可以重做、取較高的；投資工單沒有到期、可以取消、派工台不套審核與 SDD、算同時在跑的 agent；單線模式照舊直接買；交叉審核工具、提升 agent 能力、研討會、採購電腦不變（都是使用者從選項裡選的；「投資變成佇列裡的工單」是使用者自己提的，取代原本「投資分頁另外選模型」的做法）。設計紀錄在 Spectra change `gh-64-01-agent-investments`（#64），規則以 `docs/spectra/specs/agent-investments/` 為準。

51. 「新增模式 想辦法把訂閱制 或者公司提供的token在一個月內用完」、「用的越滿越高分」、「這樣是否要增加工單數量」（#65）
   → 開局開關「用量挑戰」（不挑戰／挑戰用滿），單線、平行都能開：月底總分加上 使用率 × 用量加分（平行 4,000、單線 500）。使用率照價值加權，算個人訂閱、團隊席位、公司 API 預算，不算個人 API；評等門檻與最高分 key 另一組；公司單日上限、透支照扣；工單量不改（都是使用者從選項裡選的）。量到單線最會燒的玩法也只把 Max 5× 用到 79%–89%，使用者選了單線不加工單（卡在工時）。用量加分初值 2,000 時燒滿對平行不划算（−8.2%～+21.3%），使用者改成 4,000。設計紀錄在 Spectra change `gh-65-01-burn-quota-mode`（#65），規則以 `docs/spectra/specs/quota-burn/` 為準。
52. 「整理更新在打開網頁時顯示最近更新功能」（#66）
   → 老玩家開頁時先用彈窗列出上次之後沒看過的更新（最多 5 筆，超過寫「還有 N 筆更新」，按了打開規則 modal 新增的「更新」分頁），按「知道了」再接回原本的繼續／壞檔／開局彈窗；第一次來的玩家不跳、直接記成看過；沒有記錄但有存檔或最高分的算上線前就來過；第一版從 10-10 英文版上線（#32 #33 #34 #36）收到 #66，含同一天上線的 #65 共 22 筆（都是使用者從選項裡選的）。設計紀錄在 Spectra change `gh-66-01-whats-new`（#66），規則以 `docs/spectra/specs/whats-new/` 為準。
53. 「工程投資可以變工單以後 變成第一天就能把所有東西投資完 好像有點太強」（#67）
   → 照常數算（沒實跑）：Lv1 十項在 Max 20× 派 Opus 約 7.9M 額度、最長 5h，第 1 天下班前全部拿滿；自己做要 33h。使用者在「加驗收工時／一次只跑一張／照付公司預算／隔天才生效」裡選了加驗收工時：agent 做好的投資工單標「待驗收」，花自己做那一級工時的一半（`ACCEPT_HRS`）驗收才生效，不花錢；Lv1 十項驗收合計 16.5h。不做成像審 PR 那樣自動扣時間，因為 17:00 以後才跑完的 job 時間會被吃掉、等於免費驗收。設計紀錄在 Spectra change `gh-67-01-inv-acceptance-hours`（#67），規則以 `docs/spectra/specs/agent-investments/` 為準。
54. 「那應該要把工作內容顯示為熟悉的工作內容 不然會以為是只出現這兩類工作」（#68）
   → 開局標題改成「熟悉的工作內容（可選 1–2 項）」，下面加一行提示：所有技術線都會進工單（選的 75%、前端 15%、其他 10%），沒選的算不熟、手寫 ×2（使用者選了「標題＋一行小字」）。比例抽成具名常數 `STACK_PICK`、`STACK_FE`，數值不變，固定種子模擬輸出改動前後逐字相同。設計紀錄在 Spectra change `gh-68-01-familiar-work-label`（#68）。
55. 「為何當初設計openai公司不能用api」、「改成一開始的設定項好了 讓玩家可以設定成自己上班的樣態」（#70）
   → 查不到當初不給 OpenAI 公司 API 的理由（v1 就寫死）。改成開局設定「公司 API 合約」：Anthropic、OpenAI、Google 三顆按鈕各自勾選，預設 Anthropic＋Google（就是原本的行為），可以一家都不勾；中國廠商與本地模型照舊不能走公司 API；團隊席位不受影響、三家照舊都能申請；最高分與評等門檻不分開，GA 多送 `corp_api`（都是使用者從選項裡選的）。一家都沒簽時用量挑戰不算公司 API 那塊、規則與開局紀錄寫出簽約名單、舊存檔讀成 Anthropic＋Google 是提案時照預設補的。公司出錢派 OpenAI（例如整天刷 Codex Sol）沒有量過平衡。設計紀錄在 Spectra change `gh-70-01-corp-api-contracts`（#70），規則以 `docs/spectra/specs/corp-api-contracts/` 為準。

56. 「延伸討論 其實可以都不選？」、「開新卡，先 discuss」（#69，從 #68 延伸）
   → 開局多一顆第七顆按鈕「全端打雜」（★★★★，跟六條線互斥），存成空的 `S.companies`：工單 15% 前端、85% 平分六條線，事故單平分六條線、沒有 SRE 第二擲，前端以外都不熟；最高分 key 與 GA 用 `none`；不補償，用 `SIM_NONE=1` 量完照實記錄（都是使用者從選項裡選的：第七顆按鈕、不補償先量）。量到平行 −11%～−15%、單線 −28%～−38%（相對 Laravel），跟 ★★ 的 App、DevOps 差不多。設計紀錄在 Spectra change `gh-69-01-no-work-content`（#69），規則以 `docs/spectra/specs/company-tech-stack/` 為準。
介面預設語言是繁體中文（台灣用語），所有介面文字都放在字典（見「多語系」），程式碼裡註解以外不能有中文。Laravel 線的工單以新聞網站後台的日常工作為題材，其他技術線的工單也維持同樣「具體、短」的語氣。

## 遊戲規則與數值

所有價格、額度、能力值都是遊戲平衡用的虛構數字，不是各家真實方案；頁面底部有聲明，保留它。

能力在 2026-10-11（#46）改成 ×10 的刻度。這一天之前的平衡實測與需求紀錄寫的能力是舊刻度（舊的 3 就是現在的 30、「能力 <4」就是現在的「<40」），數字本身沒有因為換刻度而改變。

2026-10-09 拿掉平行 token 加成之前量的平衡表（技術線、陷阱、雙選、外包、推理強度、工程投資、席位、合併衝突）都是在有 token 加成時量的；拿掉後平行模式平均分差在 ±2% 內，舊表照留、沒有重測。

v1 核心規則的需求以 `docs/spectra/specs/` 下這十份 spec 為準（Spectra change `gh-09-01-core-rules-specs`）：`work-calendar`（時間與資源、週一調整訂閱）、`agent-catalog`（廠商與模型、派工台選模型）、`billing-methods`（付費方式、透支、資安稽核）、`client-restrictions`（案主與中國模型限制）、`ticket-lifecycle`（工單產生、完成、失敗、手寫、逾期）、`dispatch-outcome`（成功率、token、時間、結算）、`self-review`（自我審核）、`game-modes`（單線／平行模式）、`random-events`（隨機事件）、`month-end-scoring`（結算與評等）。後來加入的功能各有自己的 spec，核心公式裡跟它們有關的係數只寫「見某某 spec」，同一條規則只在一份 spec 定義。這份文件保留數字與設計脈絡，spec 定義行為；改核心規則時用 Spectra change 的 delta spec 一起改，並更新 `tools/check/<spec>.test.js` 裡對應的斷言。

### 時間與資源
- 20 個工作天，每週 5 天。週一重置每週額度，且可調整訂閱：從不訂閱開新方案收整個月（`subCost`，#43），已有付費方案升級只補剩餘週數差價，降級不退。所以開局訂 Plus、第 16 天再升 Pro 200（NT$650＋1,462.5）仍比第 16 天直接開 Pro 200（NT$6,500）便宜，使用者知道後選的就是這個做法。
- 每天 8 小時（平行模式顯示成 9:00–17:00 時鐘）。
- 起始：個人錢包 NT$8,000、公司 API 預算 NT$12,000、主管信任 70、KPI 0。

### 廠商與模型（`VENDORS`）
每個模型有 `cap` 能力（×10 的整數，目前 20–60，之後的新模型可以填 45、55 這種中間值；跟工單複雜度比時複雜度 × `CAP_SCALE` 10，#46）、`price` 每 1k token 的 NT$、`w` 吃訂閱額度的權重、`speed` 每單位複雜度的小時數、`verb` token 用量倍率；`ctx:true` 對「大型 codebase」工單有加成；`cn:true` 標記中國開源權重。

| 廠商 key | 名稱 / agent | 公司 API 合約（開局選） | 中國 | 模型 |
|---|---|---|---|---|
| anthropic | Claude Code | 可選，預設有 | | Haiku 30、Sonnet 40、Opus 50、Fable 60 |
| openai | Codex CLI | 可選，預設沒有 | | Luna 30、Sol 40、Astra 50 |
| google | Gemini CLI | 可選，預設有 | | Flash 20、Pro 40（皆 ctx） |
| deepseek | Claude Code 接 DeepSeek API | 否 | 是 | Chat 30、Reasoner 40，無訂閱 |
| zhipu | Claude Code＋GLM Coding Plan | 否 | 是 | GLM Air 30、GLM 40 |
| moonshot | Kimi CLI | 否 | 是 | K2 40 |
| local | OpenCode＋本地 GPU | — | Qwen、GLM 是 | 基本款：Qwen3.6 35B-A3B 30（cn 權重）、Gemma 4 26B A4B 30（比 Qwen 慢，政府標案可用）、Gemma 4 E4B 20；買電腦解鎖：Qwen3-Coder-Next 40（cn，Spark）、Gemma 4 31B 40（Spark）、GLM-5.3 50（cn，Mac） |

- OpenAI 的模型照 GPT-6 家族命名，名稱不帶「GPT-6」，id 沿用 `mini`／`std`／`high`（存檔、派工方案、GA 的 `model` 都送 id）。實際的價格比例 Luna : Sol : Astra 約 1 : 20 : 100（第三方轉述的官方價，每百萬輸入 token $0.10／$2／$10），遊戲裡刻意壓縮：Luna 能力 30，但比 DeepSeek Chat 貴（0.15 對 0.03）、一樣慢（0.7），賣點是沒有案主禁它；Astra 跟 Opus 同型（貴、`w` 3、不特別慢）。原本的最高階模型是照推理模式設的（跟中階同價、慢、token ×1.8），跟進階模式的推理強度重複，改成 Astra 後拿掉。

  Luna 實測（2026-10-10，`SIM_N=100`，每格 300 局，跑兩次；`SIM_LUNA=1`＝DeepSeek 被禁、又沒用席位時改派 Luna（個人 API）不派 Sonnet，相對同一份程式碼的預設自動玩家）。預設自動玩家只有在 Anthropic 當機、派工台自動改到下一家第一個模型時才會派到 Luna，不會派 Astra，所以預設跑法幾乎量不到這次改動；開 `SIM_LUNA=1` 時遇到 OpenAI 當機則會改派 Haiku。Astra 沒有量。

  | 模式 × 公司 | 舊 mini（能力 2、0.1、速度 0.5） | Luna 初版（3、0.08、0.5） | Luna 採用（3、0.15、0.7） |
  |---|---|---|---|
  | 平行 Laravel | −6.9% / −6.8% | +7.0% / +6.1% | −4.2% / −6.2% |
  | 平行 Rails | −7.9% / −6.1% | +3.0% / +5.9% | −5.9% / −4.9% |
  | 平行 Rust | −12.4% / −14.1% | +1.0% / +1.2% | −13.3% / −11.8% |
  | 平行 App | −5.3% / −5.0% | +8.4% / +10.3% | −2.8% / −4.9% |
  | 單線 Laravel | +11.3% / +5.6% | +40.7% / +31.9% | −12.2% / −5.7% |
  | 單線 Rails | +7.6% / +15.3% | +33.2% / +39.8% | −8.8% / −6.9% |
  | 單線 Rust | −2.4% / −0.8% | +34.9% / +44.6% | −36.0% / −40.7% |
  | 單線 App | +7.9% / +20.7% | +55.3% / +62.0% | −9.0% / −13.9% |

  初版讓「被禁就改派 Luna」變成明顯最佳解（又快又便宜），使用者選擇保留能力 3、調慢加價。採用版比派 Sonnet 差一些，是可選但不壓倒的替代；Rust 因為 borrow checker 對能力 <4 扣分而差最多。
- Anthropic 的模型照 Claude 5 家族：Claude API 的官方價（每百萬輸入 token）Haiku 5.5 $0.10、Sonnet 5.5 $2、Opus 5.5 $4、Fable 5.1 $10，跟 GPT-6 的 Luna、Sol、Astra 同價位。遊戲裡 Haiku 跟 Luna 同一套（能力 30、0.15、速度 0.7，`w` 0.3、token 倍率 0.9 照舊）；Opus 0.9、`w` 2（Sonnet 的 2 倍）；Fable（id `fable`）能力 60、1.8、`w` 4、速度 1.2、token 倍率 0.85，是唯一能力 60 的模型（高強度到 70），複雜度 5 的工單成功率 95%（Opus 80%）。能力條（`capBar`）每 10 畫一顆實心點、多 5 畫半顆 ◐、空心點補到 5 格，後面寫數字，所以 Fable 顯示「●●●●●● 60」、能力 45 會顯示「●●●●◐ 45」。spec 例子原本拿 Haiku 當能力 2 的模型，改用 Gemini Flash。

  Haiku 實測（2026-10-10，`SIM_N=100`，每格 300 局，跑兩次；`SIM_HAIKU=1`＝DeepSeek 被禁、又沒用席位時改派 Haiku 不派 Sonnet，付費方式照 Sonnet 的規則，相對同一份程式碼的預設自動玩家）：

  | 模式 | Laravel | Rails | Rust | App |
  |---|---|---|---|---|
  | 平行 | +2.4% / +2.9% | +5.0% / +4.1% | −5.3% / −4.6% | +4.4% / +1.7% |
  | 單線 | +0.3% / −0.8% | −3.8% / +0.6% | −30.7% / −28.0% | −3.0% / +2.6% |

  跟派 Sonnet 大致打平，Rust 因為 borrow checker 對能力 <4 扣分而明顯較差；平行模式沒有一格兩次都超過 +5%，沒有調。Haiku 權重只有 0.3，多半在 Anthropic 訂閱額度內用完。Opus 降價、Fable 都沒有自動玩家會派，沒有量。
- 訂閱方案在各廠商的 `plans`，有 `day`/`week` 額度（單位 k token × 模型 `w`）。OpenAI 照 2026-10-10 網路搜尋到的 Pro 100／Pro 200／Pro 500 命名（第三方轉述 OpenAI 2026-09-29 DevDay，沒有對照官方頁面）：Plus、Pro 200（id `pro`）、Pro 500（id `pro500`，NT$16,250，跟 Plus、Pro 200 一樣是美元價 ×32.5；額度 12,500k／50,000k，Plus 的 25 倍）。真實的 Pro 200 額度從約 20 倍砍到 10 倍 Plus，遊戲沒跟（8,000k／30,000k 照舊）。token 數用 `kt()` 顯示：1M 以下寫 k，1M 以上四捨五入到一位小數（8.0M、9.9M），四捨五入後到 10M 以上就拿掉結尾的 .0（9,960k 與 10,000k 都是 10M、12,500k 是 12.5M）。
- 團隊席位 `SEAT`：最多三個，Anthropic、OpenAI、Google（`SEAT.vendors`）每家最多一個。月初或週一申請，5 天後審核，同時只能有一個申請在審（`S.seatReq`）。核准的廠商依序存在 `S.seats`。第 1／2／3 個席位的信任門檻是 55／65／75（`SEAT.trust`），看審核當天已經核准幾個席位、當天的信任。退件不扣分，之後的週一可以再申請，被退的廠商也能再選。審核在週一調整訂閱之前跑，所以審核當天的週一就能送下一個申請，最快第 6、11、16 天各拿到一個。申請選單只列還沒有席位的廠商，標題寫「第 N 個團隊席位，信任需 X 以上」。每個席位各自有每日 2.5M／每週 10M 的額度，額度區每個席位一個方塊。

席位上限實測（2026-10-09，`SIM_SEATS=N SIM_N=100`，每格 300 局，跑兩次；開席位平均分 ÷ 同一輪不開席位，減 1）。自動玩家的信任幾乎都在第 11 天前歸零，照真實規則量不到東西，所以模擬器在第 6、11、16 天依序直接給 Anthropic、OpenAI、Google 席位（當作信任一直夠），自動玩家把公司工單刷到第一個今日額度還超過 300k 的席位，用該家能力 4 的模型（Sonnet、Codex Sol、Gemini Pro）；外包單照舊走個人 API。

| 模式 × 公司 | 1 個席位 | 2 個席位 | 3 個席位 |
|---|---|---|---|
| 平行 Laravel | −0.7% / −0.8% | −0.8% / −2.2% | −2.1% / −1.1% |
| 平行 Rails | −2.4% / −0.8% | −1.0% / −1.0% | −1.9% / −0.6% |
| 平行 Rust | +1.1% / +5.0% | +2.9% / +5.5% | +6.0% / +5.3% |
| 平行 App | −4.3% / −2.7% | −3.0% / −1.4% | −2.6% / −0.9% |
| 單線 Laravel | +17.0% / +22.9% | +15.7% / +23.4% | +17.1% / +21.9% |
| 單線 Rails | +19.5% / +17.0% | +20.8% / +15.6% | +21.9% / +14.6% |
| 單線 Rust | +47.7% / +44.0% | +39.5% / +49.8% | +47.9% / +50.0% |
| 單線 App | +28.9% / +21.5% | +27.7% / +16.8% | +25.2% / +24.4% |

平行模式全部落在 −5%～+15%，沒有調數值。第 2、3 個席位幾乎沒有額外增幅：這個自動玩家每天用不完第一個席位的 2.5M，後面的席位很少輪到，所以這是它的上限，重度使用者（例如全刷 Opus）可能更高。單線模式的增幅主要來自把 DeepSeek Chat（能力 3）換成能力 4 的模型、失敗變少；單線不設目標，照實記錄。

### 工單（`makeIssue`）
- 複雜度 1–6，越後期越難；`BASE[cx]` 為基準 token（60／180／350／550／850／1,200k），`KPI[cx]` 為獎勵（3／6／10／16／24／34）。
- 複雜度 6（`SIX_RATE = 0.25`、`SIX_DAY = 11`，#50）：第 11 天起，抽到複雜度 5 的非事故單再擲一次，25% 變成 6。這一擲排在 `makeIssue` 研究單之前、其他亂數之後，沿用已抽的 token 倍率（`base × BASE[6] / BASE[5]`）與標題位置（`i % 3`，題庫組 `'6'`），不多擲；`SIM_SIX_RATE=0` 時不擲，固定種子輸出跟加入複雜度 6 之前逐字相同。卡片畫 `max(5, cx)` 格。以 gh-46-02 曲線算（未量）：Fable 75%、Opus 50%、Sonnet 25%（投資與審核前）；手寫要 13.2h，一天做不完（複雜度 5 的 11h 也是）。

  實測（2026-10-11，`SIM_N=100`，每格 300 局；預設 25% 相對同一份程式碼的 `SIM_SIX_RATE=0`；一局幾張用 scratchpad 腳本只跑進件、Laravel、400 局量）：平行一局約 1.78 張、單線約 1.11 張。平行預設 −4.8%～+0.7%（種子 101）、−4.6%～−1.3%（202），`SIM_INVEST=1` −3.8%～−0.4%／−3.2%～−0.5%；強玩法（`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`，種子 101）+0.1%～+1.2%，平行拿 S 50.1% → 52.6%。單線雜訊大（−48.8%～+8.5%，Rust、SRE、DevOps 掉最多，單線總分本來就低），不設目標。平行沒有一格掉超過 5%，數值沒調。
- 屬性：技術線 `stack`、事故（當天到期、KPI ×1.6）、機敏、大型 codebase、案主、到期日、上架審核 `store`。
- 期限不截到第 20 天，月底產生的單可能第 21 天以後才到期，卡片照寫真實到期日（#44）。
- 逾期：扣 KPI 一半、信任 −4（事故 −8，有監控告警時 −4）。第 20 天下班只有到期日 ≤ 20 的單算逾期，第 20 天以後才到期的沒做完也不罰、不算逾期張數（外包單同樣不賠違約金）。
- 找主管退單（`abandon`、`canAbandon`、`ABANDON_TRUST`，#51，規則以 `docs/spectra/specs/abandon-ticket/` 為準）：佇列裡沒在跑 agent、不是事故的單可以退，派工台按鈕兩段式確認（`abandonArm`，不進存檔）。公司單信任 −2（不低於 0）、不扣 KPI；外包單照付報酬的 30%（`GIG_LATE`）違約金、不扣信任。退單不算逾期，結算多一行「退單 N 張」（`S.st.abandoned`，舊存檔讀檔補 0，`SAVE_VER` 沒加），紀錄寫 `✕ 退單 <標題>（複雜度 N）｜信任 -2`。

  實測（2026-10-11，`SIM_N=100 SIM_SEED=101`，每格 300 局；含還沒上線的 gh-46-02 成功率曲線；`SIM_ABANDON=1` 相對同一份程式碼的預設自動玩家）：平行 +0.3%～+1.4%（`SIM_INVEST=1` 時 +0.1%～+0.2%）；單線 Laravel +36.6%、Rails +35.1%、Rust +230.8%、App +74.5%、SRE +34.5%、DevOps +72.4%（`SIM_INVEST=1` 時 +33.0%～+142.3%）。單線的自動玩家抽樣每局有 3–15 張逾期，退掉就少扣一半 KPI，單線總分本來就低（Rust 約 458），所以百分比很大；平行模式幾乎沒有逾期，差在雜訊內。沒有調數值，不設目標，照實記錄。不開 `SIM_ABANDON` 時預設與 `SIM_INVEST=1` 的固定種子輸出改動前後逐字相同。
- 每日進件：第 1 天 4 張一般工單；之後每張新工單（`intakeIssue`）是事故單的機率 `incRate(day) = min(INC_RATE, INC_RAMP × (day − 1))`（`INC_RATE = 0.12`、`INC_RAMP = 0.03`），也就是第 2 天 3%、第 3 天 6%、第 4 天 9%，第 5 天起 12%。讓玩家第一週有時間存預算、買監控告警；少掉的事故單不在後面補回。選了 SRE 時，沒中事故的新工單再擲一次 `incRate(day)`，中了就是 SRE 事故單（第 5 天起單選 SRE 約 22.6%、Laravel＋SRE 約 6% laravel＋16.6% sre），流量暴增事件不多擲。

  實測（2026-10-09，`SIM_N=100`，每格 300 局，跑兩次；改動前一律 12%、流量暴增不限天數）：平行 Laravel 8,376／8,289 → 8,417／8,150（−0.6%）、Rails −0.9%、Rust +0.1%、App −0.2%，都在雜訊內；單線 Laravel 2,720／2,830 → 2,930／2,934（+5.7%）、Rails +3.2%、Rust +9.0%、App +3.3%。不設目標、沒有調數值，照實記錄。

### 工作內容與技術線（`STACKS`、`COMPANIES`、`pickStack`）
- 開局在 `showSetup` 的「熟悉的工作內容（可選 1–2 項，或全端打雜）」選 1–2 項或全端打雜（主技術線；程式識別子沿用 companies，畫面上叫工作內容；#68 前標題是「工作內容（可選 1–2 項）」，玩家會以為只出這兩類單），標題下一行提示寫出所有技術線都會進工單與比例、不熟手寫 ×2（`ui.setup.workHint`，數字從 `STACK_PICK`、`STACK_FE`、`UNFAMILIAR_HRS` 插值），存在 `S.companies`，固定照 laravel、rails、rust、app、sre、devops 的順序（`normCompanies`；跨 `fresh()` 保留；舊版存的單一字串視為只選一條；空陣列是全端打雜；不合法退回 `['laravel']`）。選滿兩條時其他按鈕停用，最後一條不能取消（`toggleCompany`）。週一調整訂閱時不能換工作內容。開局換選擇會用 `firstIssues()` 重抽第 1 天的工單。名稱（`STACKS[k].company`：Laravel 後端、Rails 後端、Rust 基礎設施、App 開發、SRE、DevOps）用 `companyName()` 以「＋」串起來（標頭、開局說明「你是工程師，負責「…」」、紀錄、結算標題）。
- 一般工單：75%（`STACK_PICK`）平分給選到的主技術線、15%（`STACK_FE`）前端（`fe`）、剩下的 10% 平分給沒選的工作內容技術線（單選時其他五條各約 2%）。事故單從選到的主技術線平均抽；SRE 另見「工單」的每日進件。
- 不熟的技術線（沒選到也不是 `fe`）：自己手寫時數 ×2（`manualHrs`），卡片顯示「不熟」。
- 技術線效果只看技術線本身的特性（`stackGap`、`stackHrs`），不替各家模型設「誰比較會 Rust」的分數：

| 技術線 | 成功率 | 執行時間 | 其他 |
|---|---|---|---|
| laravel、rails | 複雜度 ≤3 時能力差 +10（框架慣例） | — | — |
| rust | 能力 <40（`WEAK_CAP`）的模型能力差 −10（borrow checker） | ×1.2 | 期限 +1 天；單線模式 KPI ×1.3 |
| app | — | ×1.15 | 期限 +1 天；單線模式 KPI ×1.3；複雜度 ≥2 的工單 40% 需上架審核，agent 成功後仍有 20% 被退件（有上架自動化 10%），自我審核救不回來 |
| sre | — | — | 選了 SRE 時每張新工單多擲一次事故（見「工單」） |
| devops | — | ×1.25（等 CI 與 terraform） | 期限 +1 天；單線模式 KPI ×1.3 |
| fe | — | — | — |

- 難線 KPI 補償只在單線模式（`hardKpi()`，#53）：平行模式的 Rust、App、DevOps 工單、找主管重新評估、外包報酬都不乘 ×1.3，期限 +1 天兩種模式都給。開局確認時模式改了，`modeKpi()` 照確認的模式重算佇列裡第 1 天工單的 KPI 與外包報酬；模擬器在產生第 1 天工單前先設模式。
- token 用量不受技術線影響。派工台顯示的成功率已含技術線效果（需上架審核的工單 ×0.8），並在下方顯示技術線提示（`stackHint`）。
- 工作內容按鈕的難度標示（`STACKS[k].level`）：Laravel、Rails ★，App、SRE、DevOps ★★，Rust ★★★，全端打雜 ★★★★（`NONE_LEVEL`，在 `modals.js`）。雙選不另外標組合難度。

全端打雜（#69，Spectra change `gh-69-01-no-work-content`）：
- 開局六顆按鈕後面的第七顆「全端打雜」（`data-company="none"`，說明「什麼都接，前端以外都不熟。」），跟六條線互斥：按它清空其他選擇；全端打雜時按某條線就換成那條；再按一次全端打雜不變；選滿兩條時它仍可按（`toggleCompany(cs,'none')` 回 `[]`）。標題改成「熟悉的工作內容（可選 1–2 項，或全端打雜）」，選它時提示行換成 `ui.setup.workHintNone`（85% 由 `1 − STACK_FE`、15% 由 `STACK_FE`、×2 由 `UNFAMILIAR_HRS` 插值）。
- 存成 `S.companies = []`，不加 sentinel 技術線：`unfamiliar`（前端以外都不熟）、`intakeIssue`（沒有 SRE 第二擲）、`INV_STACKS`（六條線再前端）本來就對空陣列算對。`normCompanies([])` 回 `[]`，其他不合法值照舊退回 Laravel。
- 一般工單 15% 前端、85% 平分給六條線（各約 14.17%，`pickStack`，亂數次數跟有選時一樣）；事故單從六條線平均抽。
- 名稱 `companyName([])` 是字典的 `stack.none.company`（全端打雜／Jack of all trades）；最高分 key 是 `tokgame-best-<mode>-none`（開用量挑戰 `-none-burn`），GA 的 `companies` 送 `none`。存檔的 `companies` 可以是空陣列，`SAVE_VER` 沒加。
- 不補償：KPI、期限、預算、評等門檻都跟有選時一樣（使用者選的「不補償，先量」）。

量測（2026-10-17，`SIM_NONE=1 SIM_N=100`，每格 300 局，`SIM_SEED=101`／`202`；相對同模式單選 Laravel 的平均分；`SIM_NONE=1` 在工作內容清單後多跑一組 `S.companies=[]`，投資的自動玩家在這組不買 CLAUDE.md、研討會照優先順序選付得起的）：

| 模式 | 預設 | `SIM_INVEST=1` |
|---|---|---|
| 平行 | −11.9% / −14.6% | −12.8% / −11.4% |
| 單線 | −37.9% / −31.6% | −27.6% / −32.2% |

評等（300 局，S/A/B/C/D）：平行預設 0/150/106/36/8、0/154/103/36/7；平行 `SIM_INVEST=1` 0/248/43/7/2、0/258/35/7/0；單線預設 2/20/82/99/97、4/33/78/103/82；單線 `SIM_INVEST=1` 2/35/87/100/76、1/26/94/92/87。同一次執行裡 Rust 平行 −32.9% / −34.4%、單線 −77.8% / −77.4%，App、DevOps 平行 −10.9%～−17.6%、單線 −34.2%～−43.6%，所以對這個自動玩家，全端打雜跟 ★★ 的 App、DevOps 差不多，比 ★★★ 的 Rust 容易。原因推測（沒有拆開量）：自動玩家很少自己手寫，不熟 ×2 幾乎沒影響到它；差距主要來自 Rust 只佔約 14%，borrow checker 的扣分攤薄了。手寫比較多的真人玩家會更痛。不設目標、數值沒調；回報後使用者選擇維持 ★★★★，當作警告。改動前後 `SIM_N=100 SIM_SEED=101`（不開 `SIM_NONE`）輸出逐字相同。

SRE、DevOps 實測（2026-10-10，`SIM_N=100`，每格 300 局，跑兩次；相對同模式 Laravel 的平均分）：

| 模式 | SRE | DevOps |
|---|---|---|
| 平行 | −2.0% / −2.3% | +7.8% / +8.6% |
| 單線 | −9.2% / −8.6% | −32.1% / −32.7% |

平行模式在目標 ±25% 內，數值沒調。單線模式 DevOps 跟 App（−28%）差不多，SRE 介於 Laravel 與 App 之間，不設目標。雙選組合沒有重測（下面那張表只有原本四條的組合）。

雙選組合實測（2026-10-09，`SIM_COMBOS=1 SIM_N=100`，每格 300 局，跑兩次；相對同模式單選 Laravel 的平均分）：

| 組合 | 平行（兩次） | 單線（兩次） |
|---|---|---|
| Laravel＋Rails | +0.9% / −0.5% | −0.2% / +0.5% |
| Laravel＋Rust | +0.5% / −1.3% | −19.1% / −24.2% |
| Laravel＋App | +2.3% / +2.1% | −15.6% / −14.0% |
| Rails＋Rust | −2.3% / −0.0% | −24.8% / −22.0% |
| Rails＋App | +1.6% / +1.8% | −13.5% / −17.6% |
| Rust＋App | +0.9% / +0.6% | −34.9% / −35.5% |

平行模式全部在 ±3% 內（目標 ±25%）。單線模式有 Rust 或 App 的組合介於單選 Laravel 與單選 Rust／App 之間，不設目標。


平衡實測（`node tools/sim.js`，2026-10-07，每組 300 局；自動玩家很粗糙，只看量級。每次跑會差約 ±5 個百分點，小於這個幅度的變化不要當成退步）：

| 模式 | Rails | Rust | App |
|---|---|---|---|
| 平行 | −0.1% | −2.8% | +3.7% |
| 單線 | +2.9% | −42.5% | −28.2% |

數字是相對同模式 Laravel 的平均分（2026-10-07 加入陷阱題後重測，`TRAP_RATE=0.10`）。平行模式的目標是 ±25% 以內；單線模式完全受時間限制，剩下的差距保留成難度，用星等標示。時間倍率原本是 ×1.4／×1.3，實測單線差到 −67%／−58%，才改成現在的數值並加上期限與 KPI 補償。

### 陷阱題（`TRAP_RATE`、`hiddenTrap`、`trueView`、`reveal`、`evaluate`、`rescope`）
- 非事故、複雜度顯示 1–2 的工單有 `TRAP_RATE = 0.10` 機率是陷阱，真實複雜度 4（60%）或 5（40%），存在 `trueCx`、`trueBase`。KPI 與期限照顯示的複雜度算。
- 一半的陷阱用 `STACKS[k].pool.trap` 的暗示標題（「只要改一行」「順便」「應該很快」），另一半用一般標題，卡片上看不出差別。
- 派工時（`makeJob`）沒曝光的陷阱照真實複雜度擲骰：模型能力 ≥ 真實複雜度 × 10 就硬做完（一刀切，能力 45 碰到真實複雜度 5 仍會停下）（token、時間、成功率都按真實值，紀錄「原來牽扯到架構，硬做完了」）；能力不夠就花 `TRAP_STOP = 0.4` 倍的真實 token 與時間後停下來、算失敗、tries +1，自我審核救不了。
- 自己手寫沒曝光的陷阱：花掉顯示複雜度的手寫時數後曝光，工單留在佇列。
- 曝光（`reveal`）：`shownCx` 記原估，`cx`／`base` 換成真實值，卡片顯示「牽一髮動全身・原估 N」。之後的預估與技術線效果都用真實複雜度。
- 跑著的陷阱看不出真實時間：job 另存 `shownHrs`（派工台照顯示的複雜度估的時數 × 跟 `hrs` 同一個隨機倍率，不多擲亂數；一般工單等於 `hrs`），派工紀錄的「預計」、背景 agent 列的完成時間與進度條都用它，超過了還沒跑完就顯示「超過預估，還在跑」；實際執行時間照真實值。舊存檔的 job 沒有 `shownHrs` 時用 `hrs`。這是 `gh-32-01-abort-agent` 的 `/spectra-review` 抓到的：原本顯示真實時數，複雜度 1 的陷阱派出去就顯示好幾倍的預計時間，加上可以中止，就變成比評估架構便宜的驗陷阱方式；使用者選了隱藏真實時間。
- 評估架構（`evaluate`）：非事故、未評估、未曝光的工單可用。花 `EVAL_TK × M.verb`（40k × token 用量倍率）token，走 `charge` 扣款，加上 `0.5h × M.speed` 工時（平行模式會推進時鐘）。識破率 `min(0.95, 0.35 + 0.15 × cap ÷ 10)`。沒識破和一般工單一樣顯示「已評估」。額度不夠時中斷、不算已評估。評估時 agent 一樣會讀程式碼，所以機敏工單走個人訂閱或個人 API 時，和派工一樣要擲資安稽核（`auditRoll`）；刷公司 API 造成的透支也當下處罰（`checkOverdraft`）。
- 找主管重新評估（`rescope`）：曝光後每張一次。信任 ≥ `RESCOPE_TRUST`（50）：信任 −5、KPI 改成 `KPI[真實複雜度]`（單線模式含技術線 ×1.3，#53）、期限 +2 天（不設上限，#44 前截到第 20 天）；否則信任 −3、其他不變。
- 陷阱曝光時不重算「大型 codebase」與「需上架審核」標記（這兩個是用顯示的複雜度產生的），所以曝光的陷阱不會有大型 codebase 加減成，App 線的陷阱也不會被上架退件。這是刻意的：陷阱已經夠痛，平衡數字也是照這個行為量的。
- 結算多兩行：踩到陷阱（`S.st.trapHit`，派工或手寫曝光）、事先識破（`S.st.trapFound`，評估曝光）。

平衡實測（`SIM_N=100`，每組 300 局；有陷阱時平均分 ÷ `SIM_TRAP=0` 的平均分）：

| 公司 | 平行 | 單線 |
|---|---|---|
| Laravel | 98.0% | 87.2% |
| Rails | 97.4% | 89.3% |
| Rust | 95.6% | 74.3% |
| App | 95.0% | 80.9% |

目標是平行模式 ≥ 85%；單線模式不設門檻，差距保留成難度。自動玩家從不評估、固定派能力 3 的模型，所以陷阱每次都踩到停，是最壞情況。另一個「每張小單都先評估、曝光後改派 Opus」的自動玩家反而更低（平行 88–91%），代表全部評估不是最強策略，挑標題可疑的評估才划算。比例原本是 0.15，單線 Rust 掉到 69%，改成 0.10。

### 研究單（`RESEARCH_RATE`、`RESEARCH_DIRECT_TK`、`research`、`splitResearch`）
規則以 `docs/spectra/specs/research-tickets/` 為準。
- 非事故、複雜度 4–6 的工單有 `RESEARCH_RATE = 0.3` 機率是研究單（`research:true`），外包單也算；陷阱只出在複雜度 1–2，不會重疊。研究單從 `STACKS[k].pool.research` 抽標題，每筆是 `{t, parts:[a, b]}`，七條技術線（含前端）各 3 筆。這一擲排在 `makeIssue` 所有既有亂數之後，比例 0 時不擲，所以 `SIM_RESEARCH_RATE=0` 的固定種子輸出跟加入研究單之前逐字相同。
- 卡片顯示「需研究」和「直接派工 token ×4（先研究可拆成兩張小單）」。直接派工 token ×`RESEARCH_DIRECT_TK`（4），成功率與時間不變；一鍵派工的額度、錢包檢查用的是乘過的預估。
- 讓 agent 研究：`RESEARCH_TK × M.verb`（40k × token 用量倍率）token、`RESEARCH_HRS × M.speed`（0.5h × 速度，有顯卡 PC 時本地 ×0.7）工時，扣款、資安稽核、透支、本地 GPU 忙、外包不能用公司資源都照評估架構；推理強度不影響。額度不夠時研究沒做完、不拆單。
- 自己研究：`RESEARCH_SELF_HRS`（1.5h），不熟的技術線 ×2，不花 token；不能手寫時也不能自己研究。
- 研究完一定拆單（`splitResearch`）：原單換成兩張新編號的單、放在原位置、派工台選第一張。複雜度 4 → 2＋3、5 → 3＋3、6 → 3＋4（`RESEARCH_SPLIT`，#50），KPI（外包報酬）照複雜度比例分、總和不變；期限、技術線、案主、機敏、外包、上架審核照舊，大型 codebase 只留在複雜度 ≥3 的那張；拆單不是陷阱、不能再拆。拆單記住原單 id（`from`），兩張同一天都逾期時信任只扣一次（第二張紀錄寫「信任 -0」），KPI 各扣一半、逾期張數算兩張；這是 `/spectra-review` 抓到「拆了反而多扣信任」後，使用者選的。
- 研究單不能評估架構；直接派工後合併衝突留下的解決衝突單不算研究單。舊存檔的工單沒有 `research` 欄位，照一般工單處理，`SAVE_VER` 沒加。

平衡實測（2026-10-10，`SIM_N=100`，每格 300 局，`SIM_SEED=101`、`202` 各跑一次；「沒研究單」是 `SIM_RESEARCH_RATE=0`，「直接派工」是預設自動玩家，「agent 研究」「自己研究」是 `SIM_RESEARCH=agent`／`self`）。採用的數值：

| 模式 × 工作內容 | 直接派工 vs 沒研究單 | agent 研究 vs 沒研究單 | 自己研究 vs 沒研究單 | agent 研究 vs 直接派工 |
|---|---|---|---|---|
| 平行 laravel | -5.3% / -2.5% | -1.8% / -1.3% | -5.3% / -2.9% | +3.6% / +1.2% |
| 平行 rails | -1.6% / -4.4% | -1.5% / -1.1% | -3.9% / -4.7% | +0.1% / +3.5% |
| 平行 rust | -4.5% / -3.2% | -1.1% / -1.8% | -1.8% / -6.0% | +3.6% / +1.5% |
| 平行 app | -3.5% / -4.7% | -2.1% / -1.3% | -4.7% / -6.7% | +1.4% / +3.5% |
| 平行 sre | -4.5% / -3.4% | -2.5% / -2.8% | -5.5% / -6.3% | +2.1% / +0.7% |
| 平行 devops | -3.3% / -3.3% | -1.4% / -1.3% | -4.4% / -4.2% | +2.0% / +2.0% |
| 單線 laravel | -10.2% / -6.2% | -0.5% / -2.9% | -7.9% / -7.1% | +10.8% / +3.6% |
| 單線 rails | -4.7% / -6.0% | -0.5% / +1.2% | -4.1% / -5.8% | +4.4% / +7.6% |
| 單線 rust | -20.6% / -9.4% | -7.8% / +1.5% | -13.0% / -10.6% | +16.2% / +12.0% |
| 單線 app | -9.2% / -16.6% | -2.7% / -5.4% | -12.7% / -10.3% | +7.1% / +13.4% |
| 單線 sre | -2.8% / -8.5% | +5.1% / -3.8% | -7.0% / -9.0% | +8.1% / +5.1% |
| 單線 devops | -10.1% / -10.2% | +1.4% / -0.9% | -11.2% / -4.3% | +12.8% / +10.4% |

目標是平行模式 agent 研究和沒研究單差在 −5%～+5%，而且多數格子比直接派工好。初版（直接派工 ×2.5、agent 研究 80k／1h、自己研究 3h）在平行模式 agent 研究對直接派工是 −3.3%～+2.0%、多數是負的，自己研究對沒研究單 −9%～−12%：預設自動玩家幾乎都派 DeepSeek Chat（每 1k NT$0.03），token ×2.5 只多幾十塊，研究卻要多花工時。種子 101 量了三種變體：只改 ×4（agent 對直接派工 −0.0%～+3.8%，自己研究仍 −10% 左右）、只讓研究變便宜（−1.2%～+2.0%）、兩個都改（+0.1%～+3.6%），使用者選了兩個都改。單線模式不設目標，照實記錄。

### 成功率（`est`）
能力差 = `cap − cx × CAP_SCALE`，再加技術線的能力差修正（`stackGap`）與大型 codebase（`bigGap`：ctx 模型 +5、能力 <40 的非 ctx 模型 −5，`BIG.gap`），用 `pStep()` 查錨點 +20 → 95%、+10 → 88%、0 → 75%、−10 → 50%、−20 → 25%、−30 → 10%（`P_STEP`，從 `P_TOP` = +20 開始），中間線性內插、兩端截平，例如差 +5 是 81.5%、−15 是 37.5%。投資加成是把剩下的失敗打折（`1 − (1 − p) × (1 − MD_P) × (1 − SDD_P) × (1 − AI_P)^級`，SDD 只在複雜度 ≥3），再 clamp 到 5%–97%；所以實際上最高約 96.9%（差距 +20 以上、三項全買），97% 碰不到。失敗後重做的 token 與時間會打折。

`gh-46-02-success-curve`（#46）之前是錨點 +10 → 95%、0 → 80%…，投資直接加百分點，大型 codebase ±8%；#45 回報投資全買、自審時 Opus 與 Fable 對複雜度 5 都顯示 99.85%。改成現在的寫法後（同一個配置）：Opus 90.7%、Fable 96.3%、Sonnet 做複雜度 2 的 Laravel 單 98.9%。

改動前後實測（2026-10-11，`SIM_N=100 SIM_SEED=101`，每格 300 局，同一個種子比；評等比例是同一模式六條工作內容合計 1,800 局）：

| 模式 × 工作內容 | 預設 | `SIM_INVEST=1` |
|---|---|---|
| 平行 Laravel | 7,852 → 6,398（−18.5%） | 8,558 → 7,492（−12.5%） |
| 平行 Rails | 7,887 → 6,280（−20.4%） | 8,535 → 7,382（−13.5%） |
| 平行 Rust | 8,149 → 5,395（−33.8%） | 9,310 → 7,188（−22.8%） |
| 平行 App | 8,524 → 6,709（−21.3%） | 9,562 → 7,893（−17.5%） |
| 平行 SRE | 7,757 → 5,574（−28.1%） | 8,695 → 6,964（−19.9%） |
| 平行 DevOps | 8,594 → 6,811（−20.7%） | 9,660 → 8,169（−15.4%） |
| 單線 Laravel | 2,595 → 1,570（−39.5%） | 2,435 → 1,657（−32.0%） |
| 單線 Rails | 2,670 → 1,607（−39.8%） | 2,454 → 1,609（−34.4%） |
| 單線 Rust | 1,730 → 458（−73.5%） | 1,846 → 678（−63.3%） |
| 單線 App | 2,205 → 1,113（−49.5%） | 1,831 → 1,109（−39.4%） |
| 單線 SRE | 2,263 → 1,152（−49.1%） | 2,043 → 1,036（−49.3%） |
| 單線 DevOps | 2,077 → 1,175（−43.4%） | 1,785 → 950（−46.8%） |

評等比例：平行預設 S 77.3% → 31.8%、A 16.9% → 44.9%、B 4.2% → 17.1%、C 1.3% → 5.0%、D 0.2% → 1.3%；平行 `SIM_INVEST=1` S 94.2% → 68.9%、A 5.5% → 27.6%；單線預設 D 26.4% → 67.4%；單線 `SIM_INVEST=1` D 33.2% → 69.3%。預設自動玩家幾乎都派 DeepSeek Chat（能力 30），差距比以前低一格，又沒有自審撐著，所以掉最多；Rust 再被 borrow checker 扣一格。平行模式 Rust 相對 Laravel 從 +3.8% 變成 −15.7%（目標 ±25% 內）。這個 change 不調數值，評等門檻與 KPI 交給 #45（`gh-45-01-kpi-balance`）照這組數字處理。

### 付費方式（`bills`、`settle`）
- 個人訂閱／公司席位：扣額度，額度不夠時 agent 停在一半（失敗）。
- 派工台預設付費（`prefBill`，#42）：換到別家廠商（點別家的模型）和第 1 天開工時，那家有公司席位、可用且額度夠這張單的預估就選公司席位，否則有個人訂閱且額度夠就選個人訂閱，都不行維持原本的付費方式；機敏單只會自動選席位、不會自動換成個人訂閱（review 提出、使用者選的，個人付費會被稽核）。同一家換模型、換工單、載入方案、週一調整都不套用。外包單用不了席位，所以不會被改成公司席位。
- 個人 API：扣個人錢包，不會扣成負數：錢不夠時付完剩下的錢、agent 停在一半（失敗，紀錄「錢包見底，agent 停在一半」，GA `job_result` 的 `outcome` 跟額度不夠一樣是 `quota`）；評估架構錢不夠時中斷、不算已評估。錢包 NT$0 以下時個人 API 停用（註記「錢包見底」）。只有外包違約金能把錢包扣成負數。`dispatch()`、`evaluate()` 先用 `billOk()` 確認目前選的付費方式能用（同派工台按鈕），繞過畫面直接呼叫也擋得住。模擬器的自動玩家碰到錢包見底時，改走 Anthropic 訂閱、公司 API（外包單不行），都不行就派本地 Gemma；平行模式派不出去的單當天略過。
- 訂閱：開局與週一這次要付的錢大於 0 又超過錢包時不能確認（`planShort`，顯示「錢包不夠付這次的訂閱」）；沒改、降級（付 NT$0）照樣能按，已有的訂閱不受錢包影響。
- 公司 API：扣公司預算；單日超過 NT$1,500 信任 −6；透支信任 −8。只有這局簽了合約的廠商能用（`corpOk`），沒簽的寫「公司沒簽約」。
- 公司 API 合約（`S.corpApi`、`CORP_VENDORS`、`CORP_DEFAULT`、`normCorp`，#70，規則以 `docs/spectra/specs/corp-api-contracts/` 為準）：開局彈窗在外包之後、進階模式之前有「公司 API 合約」，Anthropic、OpenAI、Google 三顆按鈕（`data-corp`）各自切換，小字寫走部門預算／公司沒簽約；預設 Anthropic＋Google，可以一家都不勾，固定照 anthropic、openai、google 的順序存，跨 `fresh()` 保留，不是三家裡不重複的陣列就退回預設；週一調整不顯示；只切這個不重抽第 1 天工單。只管公司 API：團隊席位、最高分 key、評等門檻都不看它。一家都沒簽時用量挑戰不算公司 API 那塊（預算只能買投資）。規則 modal 付費分頁寫出簽約名單（都沒簽寫「這局公司沒有簽任何廠商」），開局紀錄行尾寫「・公司 API：…／無」。存檔多 `S.corpApi`，舊存檔讀成 Anthropic＋Google，`SAVE_VER` 沒加。不勾 Anthropic 時預設派工方案 B、C（Anthropic＋公司 API）那兩顆一鍵派工會停用並寫原因。公司出錢派 OpenAI 沒有量過平衡；預設合約就是原本的行為，固定種子模擬輸出改動前後逐字相同。
- 本地：免費但很慢。平行模式下本地 GPU 一次只能跑一個 agent（`localBusy`），跑的期間（含過夜）不能再派本地、不能用本地評估架構，也不能自己手寫（電腦被吃滿；買了任何一台電腦就能手寫，見「採購電腦」）。單線模式不受影響。
- 機敏工單走個人訂閱或個人 API：35% 被稽核（信任 −12），中國廠商 60%；有 secret scanning 時減半（17.5%／30%）。
- 外包單不能用公司 API 和公司席位（見「接外包」）。

### 案主與中國模型限制（`CLIENTS`、`banOf`、`cnBlock`）
- 內部專案、新創客戶：無限制。外包單的「外包案主」也無限制，而且不受全公司禁令影響。
- 金融客戶（`ban:'api'`）：禁止中國雲端，本地 Qwen 可用。
- 政府標案（`ban:'all'`）：連中國開源權重也禁。
- 事件「全公司暫停中國雲端」（第 8 天後才會觸發）設 `S.cnBan`，之後所有工單至少等同 `'api'`。
- 被禁的模型按鈕 disabled 並顯示原因；選取中的模型被禁時自動切到第一個可用的。

### 平行模式（`S.mode==='parallel'`）
- 同時跑幾個 agent 沒有上限（#63 前是開局選 2–6 個工作槽），標頭寫「背景 agent N」、背景 agent 列寫「N 個在跑」。派工花 0.2h，agent 在背景跑；「等 1 小時」「等到下一個完成」推進時鐘（`advance`）。推進後剩 ≤1e-9 小時（浮點殘值）時直接歸零，時鐘停在 17:00、兩顆等待按鈕停用（#55）。
- 每個 agent 各自有 context，同時跑幾個都不影響單張的 token 用量（2026-10-09 前有 `parMul() = 1 + 0.15 × 正在跑的數量` 的 token 加成，`gh-12-01-parallel-review-load` 拿掉）。
- 完成時合併衝突機率 = 0.1 × 其他還在跑的數量（CI 流水線減半），最多 0.9（`CONFLICT_MAX`，減半之後才套；#63 加的，6 個以內碰不到）。衝突不算失敗：原單原地變成「解決衝突：<原標題>」工單（`merge:true`），複雜度 max(1, 原複雜度 − 1)、基準 token 照新複雜度重抽，技術線、案主、機敏、事故、到期日、KPI、上架審核照舊；那次派工的 token 照扣，不花審 PR 時間。玩家可以重新選怎麼解（任何派工方式或自己手寫），KPI 等它完成才拿，到期沒解完照一般逾期扣分。解決衝突工單不會再衝突、不是陷阱、不能評估架構或找主管重新評估，卡片顯示「合併衝突」。設計紀錄在 Spectra change `merge-conflict-resolve`。
  實測（2026-10-09，`SIM_N=100`，每格 300 局，兩次平均；改動前是「衝突算失敗、重做 token ×0.4」）：Laravel 8,176 → 8,465（+3.5%）、Rails 8,167 → 8,449（+3.5%）、Rust 7,903 → 8,425（+6.6%）、App 8,438 → 8,962（+6.2%）。門檻是 ±15%，沒有調數值；工作槽數表沒有重測。
- 成功後要審 PR：`cx × 0.2` 小時（有審核時減半，有 pre-commit hook 再減半），再乘上切換成本 `reviewLoad() = 1 + REVIEW_LOAD × 其他還在跑的數量`（`REVIEW_LOAD = 0.25`；同一步一起做完的不算還在跑；`prHrs`）。派工台提示照當下在跑的數量預告倍率與衝突上限。
  實測（2026-10-09，`SIM_N=100`，每格 300 局，跑兩次）：平行 Laravel 8,404／8,382 → 8,403／8,397、Rails 8,372／8,453 → 8,300／8,330、Rust 8,292／8,311 → 8,270／8,414、App 8,958／8,967 → 8,906／8,787，都在 ±2% 內（目標 ±10%），0.25 沒有調。單線模式不受影響。自動玩家能用就派 DeepSeek Chat、不能用才派 Sonnet，token 加成對它的分數本來就影響不大，所以這組數字不代表重度使用 Opus 的玩家。
- 下班時跑到 17:00，剩下的過夜（剩餘時間 −3h）；到期沒跑完或廠商當機會被中止，已用 token 照算。第 20 天下班還在跑的（工單第 20 天以後才到期）照玩家中止處理：照已跑比例扣（至少 5%）、不算失敗、陷阱不曝光，紀錄寫 `⏹ 月底收工`，GA 送 `cancelled`；排在公司單日上限檢查之前，所以算進當天的公司花費；第 20 天派一張下班前跑不完的單時，派工台提示改寫「今天是月底，下班前跑不完會月底收工…」，不寫跑過夜（#44）。
- 玩家可以中止背景 agent（`cancelJob`，按鈕兩段式，待確認的單存在 `view.js` 的 `cancelArm`、不進存檔）：照已跑比例扣（至少 `CANCEL_MIN` 5%，`cancelFrac`），不花時間；`settle` 帶 `cancel:true` 時不曝光陷阱、`tries` 不加、`base` 不打折，紀錄寫 `⏹ 中止 <標題>｜<agent> / <模型>・<付費>｜燒掉 N｜<花費>｜Nh`。到期與當機中止（`cancelJobs`）照舊算失敗。
- 每天新工單 3–6 張（單線 2–4），評等門檻另成一組（見「結算」）。結算標題顯示「平行模式」（#63 前帶 agent 數）。
- 同時跑幾個沒有額外代價，取捨只靠審 PR 切換成本與合併衝突。下表是 #63 之前開局選工作槽數時的實測（2026-10-09 審 PR 切換成本上線後，`SIM_SLOTS=N SIM_N=100`，每格 300 局，平行模式平均分）：

| 公司 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|
| Laravel | 6,435 | 8,373 | 8,914 | 9,157 | 9,310 |
| Rails | 6,493 | 8,332 | 8,992 | 9,141 | 9,121 |
| Rust | 5,882 | 8,407 | 9,366 | 9,594 | 9,739 |
| App | 6,340 | 8,931 | 9,744 | 10,018 | 10,246 |

  越多越好，4 個以後增幅只剩約 0–3%，6 個是微幅最佳解，評等門檻沒有跟著調；和 token 加成時期的量測（同一天同程式碼基準：Laravel 6,602／8,431／9,030／9,260／9,248）差在雜訊內，切換成本沒有讓多開變成明顯虧本。如果要讓多開有明顯代價，可以再調高 `REVIEW_LOAD`。

  拿掉上限後實測（#63，2026-10-14，`SIM_N=100`，每格 300 局，種子 101／202；強玩法是 `SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`，`SIM_SLOTS=0`（能派就派）相對 `SIM_SLOTS=6`；預設自動玩家是 `SIM_SLOTS=0` 相對預設 3 個）：

| 工作內容 | 強玩法 | 預設自動玩家 |
|---|---|---|
| Laravel | +0.8% / +1.4% | +20.5% / +17.7% |
| Rails | +0.4% / +0.0% | +18.7% / +17.2% |
| Rust | +0.3% / −0.9% | +25.4% / +24.9% |
| App | +0.8% / −0.8% | +24.1% / +23.4% |
| SRE | +0.9% / +0.8% | +28.8% / +23.9% |
| DevOps | +0.7% / −0.8% | +20.3% / +25.4% |

  強玩法 12 格都在目標 +5% 內，平行拿 S 從 915 → 970 局（種子 101）、950 → 960 局（202，1,800 局中），數值與平行 S 門檻 9,500 都沒調。預設自動玩家不設目標：它派的多半是又快又便宜的 DeepSeek Chat，從 3 個放到不限多出 +17%～+29%，比以前開到 6 個的增幅大；強玩法本來就跑 6 個、多開只多約 1%。改動前後三組固定種子輸出（`SIM_SEED=101` 預設、`SIM_INVEST=1`、`SIM_SLOTS=6` 強玩法）逐字相同。

### 派工方案（`S.presets`、`presetBlock`、`presetFor`、`quick`）
- 三組方案 A／B／C，各存廠商、模型、付費方式、審核等級、推理強度（`ef`，0／1／2）、SDD 等級（`sdd`，0 不用／1 markdown／2 框架；套用時取已買等級的較小值，沒買到就降級、不略過方案；舊方案沒有 `sdd` 補成 2，不是 0–2 就三組退回預設）。預設三組都是中強度；舊方案沒有 `ef` 時補成中，`ef` 不是 0–2 就三組退回預設。一般模式下方案存的強度不生效；進階模式下強度不是中的方案，載入按鈕標籤會顯示「高強度／低強度」。預設 A：DeepSeek Chat＋個人 API＋自審＋SDD 不用；B：Sonnet＋公司 API＋自審＋SDD 2；C：Opus＋公司 API＋嚴格審核＋SDD 2。買了 SDD 之後載入按鈕標籤寫「SDD 不用／markdown／框架」。跨 `fresh()` 保留，有任何一組不合法就三組都退回預設（`presetsOf`）。不存 localStorage。
- 派工台可「載入方案」（`loadPreset`）與「存成方案」（`savePreset`）。派工台先放決策（#41）：工單標題 → 載入方案 A／B／C → 預估 → 提示 → 警告 → 派出／手寫等按鈕，下面才是「細調」（agent 與模型、付費方式、審核、推理強度、SDD），最後是存成方案。目前選擇跟某組方案一樣時（廠商、模型、付費、審核、套用的 SDD，進階模式再比強度），那組的載入按鈕亮起來（`presetIs`）。
- 工單卡片下方的「一鍵派工」是 A／B／C 三顆按鈕（#41），每顆寫方案的模型與付費方式；按哪顆就用哪個方案（`quick(id, via, pi)`），不往下找、紀錄不寫略過。方案不能用時那顆停用並寫原因，原因依序：今日當機、案主禁用（`cnBlock` 文字）、付費方式不能用（帳單註記，或「沒有公司席位」）、本地 GPU 忙、額度不夠（預估上限 × w 超過剩餘額度）、錢包不夠（預估上限超過錢包）。剩不到 0.2h 時三顆都停用（#63 前工作槽滿也停用）。批次派工（`batch`，不帶 `pi`）照舊 A→B→C 用第一個能用的方案，紀錄寫出略過的方案。
- 機敏工單不會因為個人付費而停用方案，那顆按鈕改寫稽核機率（「稽核 60%」）。

### 工程投資（`INVEST`、`invest`、`investBlock`、`batch`、`invHint`）
花自己的工時加公司 API 預算（計入當日公司花費與月底公司帳單），效果維持到月底，每局歸零。工程投資是派工台旁邊的分頁（`tabPanel`，見 `game-layout` spec）：分頁標籤寫「已做 N 項」，在投資分頁點工單會切回派工台，載入、開新局、換日都回派工台，選哪頁不進存檔、不存 localStorage。原本的收合功能（`tokgame-invfold`）在 #40 拿掉。平行模式下投資會推進時鐘，背景 agent 照跑（期間有 agent 完成時，審 PR 的時間另外加上去）；本地 GPU 忙也能投資。

| 投資 | 工時 | 公司預算 | 效果 |
|---|---|---|---|
| 寫 CLAUDE.md（每條技術線各一次，含前端） | 3h | NT$300 | 該技術線 token ×0.85（`MD_TK`）、失敗少 6%（`MD_P`，見「成功率」） |
| 單元測試 | 4h | NT$400 | 自我審核抓錯率 +0.10（`TEST_CATCH`，上限 0.95） |
| CI 流水線 | 3h | NT$300 | 平行模式合併衝突機率減半 |
| pre-commit／lint hook | 2h | NT$200 | 平行模式審 PR 時間 ×0.5（`HOOK_PR`），和自我審核的減半疊加；單線模式沒有審 PR 時間 |
| secret scanning／脫敏 | 3h | NT$300 | 機敏工單走個人訂閱或個人 API 時，稽核機率 ×0.5（`SCAN_AUDIT`），派工與評估架構都算 |
| 上架自動化（fastlane） | 3h | NT$400 | App Store 退件機率 0.2 → 0.1（`FASTLANE_REJECT`、`storeReject`），派工台成功率與提示一起改 |
| 監控告警 | 3h | NT$400 | 之後產生的事故單期限延到隔天（第 20 天的事故單第 21 天到期、不會逾期），KPI 的事故加成 ×1.6 → ×1.2（`MONITOR_KPI`）；已在佇列的事故單不變。事故單逾期扣信任 8 → 4（`MONITOR_LATE`，逾期當下判斷，買之前進來的也算） |
| 做 skills | 3h | NT$400 | 解鎖「批次派工」：依佇列順序把顯示複雜度 ≤2 的工單一鍵派出，沒有可用方案的略過 |
| 接 MCP 文件 | 3h | NT$400 | 評估架構識破率 +0.2（`MCP_REVEAL`，上限 0.95）、評估時間減半 |
| 導入 SDD（Lv1 markdown，例如 Superpowers） | 6h | NT$500 | 套用 Lv1 的派工 token ×1.1（`SDD_TK[1]`）；真實複雜度 ≥3 失敗少 8%（`SDD_P[1]`）；能力不夠的隱藏陷阱只燒 0.15（`SDD_TRAP_STOP[1]`），紀錄寫「寫規格時就發現」。不影響評估架構、研究、手寫 |
| 導入 SDD Lv2（框架：Spectra／OpenSpec／Spec Kit） | 1h | NT$200 | 不用研討會。套用 Lv2 的派工 token ×1.2、≥3 失敗少 15%、陷阱只燒 0.05，紀錄寫「跑框架流程時就發現」 |
| 交叉審核工具（#48） | 2h | NT$200 | 不用研討會、只有一級。自審或嚴格審核時可以另選審核模型與付費方式，見「自我審核」的交叉審核 |

成功率加成是把剩下的失敗打折（`gh-46-02-success-curve` 之前是直接加百分點），在 clamp 到 0.05–0.97 之前算。CLAUDE.md、單元測試、secret scanning、做 skills、導入 SDD 有 Lv2，投資狀態存等級數字（0 沒買、1、2；`lv()` 把舊存檔的 `true` 讀成 1），數值按等級查表，規則見下方「國內研討會」。面板順序照 `INV_KEYS`。派工台會用一行提示列出對這張工單生效的投資（CI、hook 只在平行模式，secret scanning 只在機敏單，fastlane 只在需上架審核的單，監控告警只在事故單）。補測試在 `gh-08-01-more-investments` 拆成單元測試（沿用 `S.inv.tests`）與 CI 流水線（`S.inv.ci`）。結算多一行「工程投資 N 項」。

SDD 是每張單選的（`gh-33-01-sdd-levels`，#33）：買了之後派工台自我審核下面（進階模式在推理強度下面）多一個「開發流程」區塊，SDD 一排 不用／markdown（Lv1）／框架（Lv2），只列已買的等級。`sel.sdd` 存選的等級（0–2），套用的等級是 `sddLevel()` = min(選的, 已買的)；`fresh()` 每局重設成 2，不碰這排就跟原本一樣「買了就每張都用」。選不用時沒有任何 SDD 效果，陷阱照燒 0.4（`TRAP_STOP`）。job 的 `sdd` 存套用的等級（舊存檔是布林，`lv()` 讀）；派工紀錄在審核等級後面寫「・SDD markdown／框架」；派工台的 SDD 按鈕、投資紀錄、規則 modal 都寫出各級的實際工具（`SDD_EG`：Lv1 例如 Superpowers、Lv2 Spectra／OpenSpec／Spec Kit）；舊存檔沒有 `sel.sdd` 時 `loadGame` 補成 2，`SAVE_VER` 沒加。

SDD Lv2 平衡實測（2026-10-10，`SIM_N=100`，每格 300 局，`SIM_SEED=101`／`202`；相對同一份程式碼的 `SIM_INVEST=1`）。`SIM_SDD2=1` 讓自動玩家投資都買完後買 Lv2；`SIM_SDD_PICK=1` 讓它顯示複雜度 ≤2 選不用、其他選最高級。初版 Lv2 4h／NT$400 時平行 −3.4%～+0.2%（單線 −12.4%～+16.5%），採用的 1h／NT$200：

| 模式 × 工作內容 | `SIM_SDD2` | `SIM_SDD2`＋`SIM_SDD_PICK` |
|---|---|---|
| 平行 Laravel | −0.3% / −0.3% | +2.2% / −1.0% |
| 平行 Rails | +1.7% / +0.3% | +1.9% / +1.6% |
| 平行 Rust | +2.3% / −1.2% | +1.9% / −1.0% |
| 平行 App | +1.5% / −0.1% | +1.0% / −1.5% |
| 平行 SRE | +0.5% / −0.1% | −0.9% / +0.3% |
| 平行 DevOps | +1.6% / +0.9% | +1.2% / +0.2% |
| 單線 Laravel | +5.3% / +3.0% | +4.6% / −1.9% |
| 單線 Rails | +1.9% / +4.1% | +3.1% / +2.0% |
| 單線 Rust | +6.3% / +18.3% | +3.0% / +10.0% |
| 單線 App | +19.4% / +11.1% | +25.7% / +3.4% |
| 單線 SRE | +9.6% / +17.5% | +8.6% / +11.5% |
| 單線 DevOps | +16.5% / +9.9% | +9.5% / +2.7% |

目標是平行模式 +3%～+15%，沒達到：這個自動玩家平行模式九成以上已經拿 S，成功率再加分數漲得少（研討會也是這樣）。使用者選擇採用 1h／NT$200、接受未達標。小單選不用對自動玩家沒有好處，因為陷阱只出在顯示複雜度 1–2 的單，選不用就少了陷阱保護。沒開新開關時兩組固定種子輸出（`SIM_SEED=101`、`SIM_INVEST=1 SIM_SEED=101`）改動前後逐字相同。

平衡實測（2026-10-09，`SIM_N=100`，每格 300 局；投資玩家平均分 ÷ 不投資玩家平均分）。`SIM_INVEST=1` 的自動玩家每天開工時買下一項付得起的：主技術線 CLAUDE.md、補測試、導入 SDD（共 15h，第 1–3 天買完）；它不評估也不批次派工，所以 MCP 和 skills 沒有量到。

| 公司 | 平行 | 單線 |
|---|---|---|
| Laravel | +4.9% / +7.4% | −11.6% / −13.6% |
| Rails | +7.7% / +6.5% | −8.7% / −5.8% |
| Rust | +12.2% / +12.6% | +0.9% / −4.7% |
| App | +6.7% / +11.1% | −5.9% / −9.9% |

每格是兩次獨立實測，同一組數值兩次之間會差到約 4 個百分點。目標是平行模式 +3%～+15%。調整過程：初版 CLAUDE.md +0.08、補測試 +0.15、SDD +0.10 時 Rust +17.9%；降 SDD、降 CLAUDE.md 後 Rust 仍在 14–15.5% 徘徊。逐項單獨量測才發現 Rust 的增幅主要來自補測試（只買 CLAUDE.md +6.7%、只買補測試 +13.2%、只買 SDD +7.1%）：Rust 單常失敗，抓錯率加成救回最多。最後把補測試的抓錯率加成降到 +0.10。平行模式拿 S 的比例從約 72% 升到約 88%，沒有超過兩倍，評等門檻不調。單線模式完全受工時限制，自動玩家投資大多反而虧，沒有設目標，照實記錄。上表是拆分補測試之前的量測。

拆分與新增投資後重測（2026-10-09，`SIM_N=100`，每格 300 局，跑兩次，各自和同一份程式碼的不投資玩家比）。`SIM_INVEST=1` 改成買主技術線 CLAUDE.md、單元測試、CI 流水線與 pre-commit hook（只在平行模式）、導入 SDD；`SIM_INVEST=2` 再加買上架自動化（有選 App 才買）、監控告警、secret scanning。

| 公司 | 平行 INVEST=1 | 單線 INVEST=1 | 平行 INVEST=2 | 單線 INVEST=2 |
|---|---|---|---|---|
| Laravel | +7.8% / +5.8% | −6.0% / −6.3% | +9.9% / +11.6% | +5.9% / +4.4% |
| Rails | +6.8% / +7.1% | −7.2% / −3.8% | +13.0% / +9.5% | −0.5% / +3.7% |
| Rust | +12.3% / +14.8% | +6.5% / −5.5% | +21.3% / +26.6% | +17.2% / +8.1% |
| App | +8.7% / +10.5% | −9.7% / −5.4% | +22.0% / +21.9% | +13.5% / +7.4% |

平行模式拿 S 的比例：不投資約 78%、INVEST=1 約 93%、INVEST=2 約 98%。調整過程：監控告警第一版只有「期限 +1 天」，全買的玩家平行 +18%～+33%；逐項量（`SIM_INV_EXTRA`，在 INVEST=1 之上單獨加買）發現幾乎都來自期限延長，fastlane 約 +0～1%、secret scanning 約 +1～5%。把監控告警調到 6h／NT$800 幾乎沒差（平行模式投資時背景 agent 照跑，工時壓不住），使用者選擇削弱延期事故單的獎勵：KPI 事故加成 ×1.6 → ×1.2（試過 ×1.0，Rust／App 仍在 +16.5%～+21%）。目標仍是平行模式 +3%～+15%，套在 INVEST=1。最後 INVEST=1 在目標內；INVEST=2 的 Laravel、Rails 在目標內，Rust、App 超出，使用者接受並照實記錄：難的公司從工程投資拿到比較多回報。單線模式不設目標。

### 國內研討會（`CONF`、`registerConf`、`confBlock`、`attendConf`、`confStacks`、`invLevel`、`invLock`）
規則以 `docs/spectra/specs/engineering-investments/` 為準。研討會是「去學東西」：自費週末去，回來才能把幾項投資升到 Lv2，並解鎖「提升 agent 能力」。

| 研討會 | 類別 | 涵蓋技術線 | 報名費 | 依據（2026-10-10 查） |
|---|---|---|---|---|
| iPlayground | 技術線場 | App | NT$4,000 | 2026 KKTIX 一般票 |
| MOPCON×JSDC | 技術線場 | App、前端 | NT$699 | 2026 KKTIX 一般票 |
| DevOpsDays Taipei | 技術線場 | SRE、DevOps | NT$3,500 | 估計（查不到 2026 票價） |
| KubeSummit | 技術線場 | SRE、DevOps | NT$3,000 | 2025 預售票（查不到 2026） |
| COSCUP | 技術線場（Ruby Taiwan 議程軌） | Rails、Rust | NT$0 | 免費、免報名 |
| WebConf Taiwan | 技術線場 | Laravel、前端 | NT$4,200 | 2024 一般票（2026 未公布） |
| HITCON | 資安場 | — | NT$6,000 | 2026 KKTIX 一般票 |
| CYBERSEC 臺灣資安大會 | 資安場 | — | NT$0 | 2026 線上報名免費 |
| 台灣人工智慧年會 | AI 場 | — | NT$2,500 | 估計（查不到 2026 票價） |
| Hello World Dev Conference | 綜合場 | — | NT$3,600 | 2026 早鳥票（一般票查不到） |

- 報名：第 1–15 天（`CONF_LAST_DAY`）的平日，從錢包扣報名費、記入 `S.st.confFee`（算進「你自己掏的錢」；錢不算分，只影響稱號），不花工時、不看信任、本地 GPU 忙也能報。同時只能有一張報名（`S.conf.req`），每場只能去一次（`S.conf.went`），一個月最多 3 場。真實日期不管。
- 出席：換到週一（第 6、11、16 天）時，在席位與採購審核之後、隨機事件之前把報名移進 `S.conf.went`，早上報告與紀錄寫「週末參加了 <名稱>：…」與開放了什麼；不改任何數值、不送 GA。
- 技術線場：涵蓋的技術線自己手寫 ×0.8（`CONF_MANUAL`），沒選的也不再算不熟（`unfamiliar`）。其他類別沒有立即效果。
- Lv2（要先買 Lv1，各 1h、公司 NT$200）：技術線場開放涵蓋技術線的 CLAUDE.md Lv2（失敗少 6% → 15%，`MD_P`）；綜合場開放單元測試 Lv2（抓錯率 +10% → +20%，`TEST_CATCH`）；資安場開放 secret scanning Lv2（稽核機率 ×0.5 → ×0.25，`SCAN_AUDIT`）；AI 場開放做 skills Lv2（批次派工複雜度 ≤2 → ≤3，`SKILLS_CX`）。同類第二場只多算場數。
- 提升 agent 能力（`INVEST.ai`，在 `INV_KEYS` 最後）：去過 N 場才能買第 N 級，每級 1h、公司 NT$200，所有派工失敗少 5%（`AI_P`，`gh-46-02-success-curve` 前是成功率 +8%；最多 `AI_MAX` 3 級）；不影響評估架構與手寫。
- 結算多兩行：研討會 N 場、研討會報名費（有報名過才顯示）。投資面板的「已做 N 項」每一級算一項。
- 存檔多 `S.conf`、`S.inv.ai`、`S.st.confFee`；舊存檔由 `loadGame` 補預設值並把投資的 `true`／`false` 轉成等級，`SAVE_VER` 沒加。

平衡實測（2026-10-10，`SIM_INVEST=1 SIM_CONF=1` 平均分 ÷ 同一份程式碼的 `SIM_INVEST=1`，減 1）。拆解（`SIM_N=30`，種子 101，初版數值）：報名費全部歸零時平行 −3.2%～−6.4%；升級不花工時與預算時 −5.8%～+0.1%；兩個都歸零才 +1.2%～+4.5%。自動玩家平行模式本來就九成以上拿 S，成功率再加分數漲得少，報名費卻直接扣分（每 NT$8 扣 1 分）。調整過程：

| 版本 | 平行（種子 101／202） |
|---|---|
| 初版：Lv2／agent 能力各 3h、NT$400，agent +3%、CLAUDE.md Lv2 +10%、單元測試 Lv2 +15% | −6.7%～−13.2%（`SIM_N=100`） |
| 第一輪：1h、NT$200，agent +5%、CLAUDE.md Lv2 +12% | −6.2%～−0.2%（`SIM_N=30`） |
| 第二輪（採用）：再改成 agent +8%、CLAUDE.md Lv2 +15%、單元測試 Lv2 +20% | 見下表（`SIM_N=100`） |

| 模式 | Laravel | Rails | Rust | App | SRE | DevOps |
|---|---|---|---|---|---|---|
| 平行 | −3.3% / −3.8% | −1.8% / −3.3% | +1.1% / +1.3% | −2.5% / −0.5% | −3.7% / −2.5% | −3.8% / −4.4% |
| 單線 | −11.4% / −17.5% | −9.8% / −10.4% | −16.2% / −17.5% | −23.0% / −14.7% | −19.2% / −14.8% | −25.1% / −33.2% |

上面三張表是錢還算分時（`gh-26-01-money-off-score` 合併前）量的。合併後重量（2026-10-10，`SIM_N=100`，每格 300 局，同一份程式碼的 `SIM_INVEST=1` 為基準）：

| 模式 | Laravel | Rails | Rust | App | SRE | DevOps |
|---|---|---|---|---|---|---|
| 平行 | −4.8% / −5.3% | +0.7% / +1.8% | +4.0% / +3.3% | −5.6% / −3.2% | −8.2% / −9.9% | −4.8% / −7.0% |
| 單線 | +5.8% / +2.0% | +6.8% / +6.0% | +8.4% / +18.8% | +20.4% / +9.5% | +6.1% / +6.4% | +1.3% / −1.7% |

報名費不再扣分，但錢包用光就停，花在報名費的錢就少了能刷個人 API 的錢，所以平行模式仍大約打平；單線模式從虧轉成小賺（升級讓失敗變少，比工時成本划算）。

目標是平行模式 +3%～+15%，沒達到。調兩輪後使用者選擇採用第二輪、接受未達標：票價維持真實、自費，研討會在分數上大約打平，是給想升級的玩家的選項。單線模式完全受工時限制，升級要花工時，所以虧；單線不設目標。沒開 `SIM_CONF` 的三組固定種子輸出（`SIM_SEED=101`、`202`、`SIM_INVEST=1 SIM_SEED=101`）改動前後逐字相同。


### 投資工單（平行模式，`INV_CX`、`INV_Q`、`INV_ON`、`invQuality`、`openInvTicket`、`invTicketBlock`、`dispatchInv`、`settleInv`、`applyInv`、`invSelf`、`invVal`、`invOn`）
規則以 `docs/spectra/specs/agent-investments/` 為準（#64）。
- 平行模式按寫東西的投資（`INV_CX` 裡的十項，含 Lv2）時，`main.js` 改呼叫 `openInvTicket`：佇列多一張 `inv:{k, st, L}` 的工單，不花錢、不花時間、不送 GA。拒絕原因（`invTicketBlock`）跟購買一樣但不看工時與預算，同一級已開工單時寫「已開工單」。`invest()` 本身沒改，單線模式、模擬器、規則檢查直接呼叫它照舊當場買下。
- 投資工單的欄位：複雜度 `INV_CX[k][L-1]`、`base = BASE[cx]`、`kpi` 0、`due` null、內部專案、技術線是 CLAUDE.md 那條或 `fe`（只是顯示）。`due` 是 null，而 JS 的 `null <= day` 是 true，所以所有比到期日的地方改用 `dueBy(i, d)`（`state.js`）；`queueOrder` 把投資工單排在最後，批次派工、評估架構略過。
- 自己做（`invSelf`）：Lv 比已有高就呼叫 `invest(k, st, L)`，同一級是重做，付那一級的工時與預算；品質設成 100%、工單拿掉。
- 派 agent（`dispatchInv`、`est` 遇到投資工單改走 `invEst`）：token `BASE[cx] × M.verb`、時間 `cx × M.speed × localSpeed`，`M` 是套過推理強度的模型，不擲亂數；付費方式跟一般派工一樣（不擲稽核），派工台與一鍵派工不套審核、SDD、交叉審核。job 算在 `S.jobs` 裡，所以會拉高其他工單的審 PR 倍率與合併衝突機率；跑完由 `settle` 轉給 `settleInv`：付不出來或中止（玩家、當機、月底收工）時工單回佇列、不套等級，付清時工單留在佇列標「待驗收」（`is.acc = {q, v, m, b}`），不審 PR、不衝突。
- 驗收（`ACCEPT_HRS`、`acceptHrs`、`acceptBlock`、`acceptInv`，#67）：待驗收的工單在派工台只有「驗收（Nh，不花錢）」與取消投資，卡片有「待驗收」標籤、沒有一鍵派工。驗收花自己做那一級工時 × `ACCEPT_HRS`（0.5；Lv1 是 1–3h、十項合計 16.5h，Lv2 是 0.5h），工時不夠時停用寫「工時不夠」；不花錢、不看本地 GPU；按下去 `applyInv` 套上等級或把重做的品質取較高的、送 GA `invest`（參數跟之前跑完時送的一樣），再用 `advance()` 推進時鐘（背景 agent 照跑）。待驗收時取消投資，已付的 token 不退。舊存檔的投資工單沒有 `acc`，照沒驗收的處理，`SAVE_VER` 沒加。
- 品質（`invQuality`）：能力差距 0 以上 100%，−10 是 60%，−20 是 30%，−30 以下 10%（`INV_Q`，中間線性內插）。存在 `S.invQ`（`md` 依技術線，每項一個陣列，第 l 級在 l−1），沒記錄就是 100%，舊存檔不用補、`SAVE_VER` 沒加。
- 效果（`invVal`）：`V[0] + Σ (V[l] − V[l−1]) × q_l`，品質全部 100% 時直接回 `V[L]`，固定種子模擬輸出不變。打折的有 CLAUDE.md（token 倍率、失敗少）、單元測試、CI、hook、secret scanning、fastlane、MCP（識破率、評估時間）、SDD（失敗少、陷阱燒掉比例）；SDD 的 token 倍率不打折。skills 批次派工與監控告警是開關，該級品質 ≥ `INV_ON`（60%）才算（`skillsLv`、`monOn`）。
- 派工台提示與規則 modal 都顯示打折後的效果：規則 modal 投資表裡已買、有一級品質不到 100% 的投資，效果欄多一行「目前（品質 Lv1 60%）：…」（`rules.js` 的 `invNow`），品質全部 100% 時不多寫。
- 品質不到 100% 時投資分頁多一顆「重做（品質 N%）」（`data-invredo`），開同一級的投資工單。派工台的退單按鈕在投資工單上寫「取消投資」，不扣分、不算退單、不送事件。
- 初值的複雜度：hook 2；CI、secret scanning、fastlane、MCP 文件 3；CLAUDE.md、單元測試、監控告警、skills 4；SDD 5；各項 Lv2 5。Sonnet（40）做 4 以下拿滿、5 拿 60%，Opus（50）全部拿滿，DeepSeek Chat（30）做 4 拿 60%、5 拿 30%。

平衡實測（2026-10-15，`SIM_N=100`，每格 300 局，`SIM_SEED=101`／`202`；相對同一份程式碼的 `SIM_INVEST=1`，也就是同樣的投資全部自己做）。`SIM_INVAGENT=1` 派能力夠的模型（複雜度 5 用 Opus、其他用 Sonnet，付費照派工台預設），`SIM_INVAGENT=cheap` 一律派 DeepSeek Chat 個人 API：

| 工作內容 | `SIM_INVAGENT=1` | `SIM_INVAGENT=cheap` |
|---|---|---|
| 平行 Laravel | +4.2% / +6.0% | −2.5% / −1.6% |
| 平行 Rails | +6.4% / +5.1% | −0.1% / −0.5% |
| 平行 Rust | +4.3% / +4.9% | −7.9% / −6.1% |
| 平行 App | +6.6% / +2.7% | −1.7% / −1.6% |
| 平行 SRE | +6.7% / +7.4% | −1.6% / −0.6% |
| 平行 DevOps | +7.0% / +4.9% | −0.7% / −2.6% |

目標是能力夠的模型在平行模式 0%～+10%，12 格都在範圍內，`INV_CX`、`INV_Q` 沒調。派 DeepSeek Chat 便宜但品質只有 30%–60%，比自己做略差，不設目標。單線模式不會開投資工單，同一次執行裡單線的數字也變了（−7.4%～+3.5%），是因為平行那段用掉的亂數不同、後面單線抽到的不一樣，不是規則改變；沒開 `SIM_INVAGENT` 時三組固定種子輸出（預設、`SIM_INVEST=1`、強玩法）改動前後逐字相同。

加驗收工時之後重量（#67，2026-10-16，`SIM_N=100`，每格 300 局，`SIM_SEED=101`／`202`；同樣相對同一份程式碼的 `SIM_INVEST=1`；自動玩家每天開工先驗收做好的投資工單、工時夠才驗）：

| 工作內容 | `SIM_INVAGENT=1` | `SIM_INVAGENT=cheap` | 改動前 `SIM_INVAGENT=1`（種子 101） |
|---|---|---|---|
| 平行 Laravel | −0.6% / +1.6% | −4.6% / −5.0% | +4.2% |
| 平行 Rails | +3.3% / +0.5% | −1.3% / −4.3% | +6.4% |
| 平行 Rust | −2.4% / +4.1% | −9.9% / −9.2% | +4.3% |
| 平行 App | +1.6% / +1.7% | −5.3% / −7.7% | +6.6% |
| 平行 SRE | −0.8% / −2.5% | −10.5% / −7.6% | +6.7% |
| 平行 DevOps | +1.2% / +0.0% | −5.4% / −5.0% | +7.0% |

目標是 `SIM_INVAGENT=1` 在 −5%～+10%，12 格都在範圍內，`ACCEPT_HRS` 沒調。驗收吃掉了大約 3–7 個百分點，派能力夠的模型做投資大約跟自己做打平；派 DeepSeek Chat 比自己做差得更多，不設目標。這個自動玩家一天只派一項投資，量不到「第 1 天全部派出」的玩法，那個情況由 `tools/check/agent-investments.test.js` 的斷言檢查（Lv1 十項驗收 16.5h，一天放不下）。沒開 `SIM_INVAGENT` 時三組固定種子輸出（預設、`SIM_INVEST=1`、強玩法）改動前後逐字相同。

### 接外包（`S.outsource`、`makeGig`、`addGigs`、`GIG_PAY`、`GIG_LATE`、`gigBlocked`、`reward`）
- 開局彈窗有「不接外包／接外包」（`data-out`），不佔主技術線名額，預設不接，跨 `fresh()` 保留，不是布林值就退回不接；週一調整不顯示。開局只切這個開關時不重抽公司工單，只加上或拿掉第 1 天的外包單。
- 開了之後第 1 天和之後每天額外 0–2 張外包單（`addGigs`）。外包單（`out:true`）的技術線從 laravel、rails、rust、app、fe 平均抽，沒選的非前端技術線一樣算不熟；不會是事故、不機敏，可能是陷阱；案主是「外包案主」（沒有禁令），全公司禁中國雲端也不管它，卡片不顯示「禁中國雲端」。複雜度、期限、Rust／App 補償、上架審核照一般規則。
- 只能自己付：公司 API 和公司席位（任何一家）停用並顯示「外包不能用公司資源」（`GIG_NOTE`），一鍵派工、批次派工會略過刷公司錢的方案；`dispatch()`、`evaluate()` 遇到這種付費方式直接不動作。
- 報酬 = KPI × `GIG_PAY`（250；複雜度 1–5 依序 NT$750／1,500／2,500／4,000／6,000，單線模式下 Rust、App、DevOps 再 ×1.3，平行模式不乘，#53）。完成（agent 或自己手寫，都走 `reward`）時錢進個人錢包、記入 `S.st.outIncome`，不加 KPI、不動信任。逾期賠報酬的 `GIG_LATE`（30%，四捨五入），不扣 KPI 與信任，不算進一般逾期張數；錢包不夠時照扣、可以變成負數。
- 合併衝突留下的「解決衝突」單仍是外包單，報酬不變。工程投資照常生效。不能找主管重新評估。
- 卡片顯示「外包」標籤，KPI 位置改顯示報酬。結算的個人花費（你自己掏的錢）= 訂閱費 + 個人 API + 外包違約金 + 研討會報名費，不扣外包收入、不會是負數，只顯示、不算分；開外包時多五行：外包收入、外包違約金、個人淨收支（外包收入 − 你自己掏的錢，帶正負號，例如 +NT$51,614）、外包完成、外包逾期（#44 前個人花費扣掉外包收入，外包賺得多會變成負數）。

平衡實測（2026-10-09，`SIM_N=100`，每格 300 局，跑兩次；開外包平均分 ÷ 不開，減 1）：

| 模式 × 公司 | `GIG_PAY=100` | `GIG_PAY=80`（採用） |
|---|---|---|
| 平行 Laravel | +14.8% / +18.4% | +11.3% / +11.3% |
| 平行 Rails | +16.3% / +14.0% | +10.5% / +9.1% |
| 平行 Rust | +10.6% / +10.3% | +6.4% / +4.9% |
| 平行 App | +10.9% / +7.4% | +5.5% / +2.5% |
| 單線 Laravel | −19.9% / −22.1% | −30.3% / −28.3% |
| 單線 Rails | −25.1% / −24.3% | −29.8% / −29.6% |
| 單線 Rust | −37.2% / −41.9% | −44.6% / −51.7% |
| 單線 App | −37.0% / −35.9% | −40.9% / −44.5% |

目標是平行模式 −5%～+15%。報酬 100 時平行有兩格超過 +15%，使用者選了 80，每日張數沒調。當時總分公式對「8000 − 個人花費」只設下限、沒有上限，外包收入會直接加分，所以靠 `GIG_PAY` 控制。上表是錢還算分時（`gh-26-01-money-off-score` 之前）量的。單線模式的自動玩家照佇列順序硬接外包單，排擠公司工單，所以全部變差；單線不設目標，照實記錄。

錢不算分之後重測（2026-10-10，`SIM_N=100`，每格 300 局，`SIM_SEED=101`、`202` 各跑一次；`GIG_PAY=250`；含研究單的 `main` 5717748 合併後量；模擬器錢包見底時改走 Anthropic 訂閱、公司 API 或本地 Gemma，見「付費方式」）。外包收入只能拿來花，所以照舊的自動玩家（不會花外包賺的錢、每張外包單都接）量到的只有外包的時間成本。模擬器加了 `SIM_UPGRADE`：週一照錢包升級 OpenAI，`=2` 再加上升到 Pro 500 就不接外包。每格是開外包平均分 ÷ 不開，同一種升級策略比，減 1：

| 模式 × 工作內容 | 改動前（錢算分） | 舊自動玩家 | `SIM_UPGRADE=1` | `SIM_UPGRADE=2`（採用的目標） |
|---|---|---|---|---|
| 平行 Laravel | +12.0% / +8.4% | −15.3% / −14.1% | −6.5% / −5.8% | +6.9% / +5.9% |
| 平行 Rails | +7.0% / +11.3% | −15.8% / −14.7% | −5.0% / −7.2% | +6.2% / +6.2% |
| 平行 Rust | +6.6% / +7.8% | −18.0% / −16.4% | −5.4% / −7.5% | +11.7% / +10.2% |
| 平行 App | +3.2% / +4.0% | −17.3% / −18.8% | −10.7% / −12.2% | +6.4% / +3.9% |
| 平行 SRE | +7.3% / +5.5% | −18.5% / −18.1% | −7.0% / −8.7% | +8.2% / +6.8% |
| 平行 DevOps | +3.6% / +2.2% | −16.7% / −18.2% | −9.4% / −11.1% | +5.3% / +4.2% |
| 單線 | −22%～−57% | −71%～−116% | −64%～−90% | −21%～−39% |

外包一個月約賺 NT$4～6 萬，最多只花得掉 Pro 500，所以錢夠了還一直接，只會排擠公司工單；錢不算分後放著外包單逾期只賠錢、不扣分。`SIM_UPGRADE=2` 在目標內，數值沒調。只升級不接外包（`SIM_UPGRADE=1`）相對預設自動玩家：平行 +6.2%～+13.6%、單線 +5.7%～+47.5%；`SIM_UPGRADE=2`＋外包相對預設：平行 +12.4%～+25.5%、單線 −32.9%～+5.5%。

週一新訂閱改收全月（#43）後重量 `SIM_UPGRADE=2 SIM_OUTSOURCE=1`（2026-10-11，`SIM_N=100`，每格 300 局，`SIM_SEED=101`、`202`；自動玩家第 6、11、16 天從不訂閱開 OpenAI，所以每次都付全月，留 NT$1,500 的條件也照新價格判斷）。升級次數模擬器沒有印出，沒有量：

| 模式 × 工作內容 | 改動前 | 改動後 | 差距 |
|---|---|---|---|
| 平行 Laravel | 8,641／8,586 | 8,482／8,558 | −1.8% / −0.3% |
| 平行 Rails | 8,562／8,664 | 8,490／8,602 | −0.8% / −0.7% |
| 平行 Rust | 9,541／9,550 | 9,324／9,368 | −2.3% / −1.9% |
| 平行 App | 9,171／9,190 | 9,026／9,007 | −1.6% / −2.0% |
| 平行 SRE | 8,674／8,681 | 8,606／8,546 | −0.8% / −1.6% |
| 平行 DevOps | 9,355／9,365 | 9,165／9,274 | −2.0% / −1.0% |
| 單線 Laravel | 1,840／1,823 | 1,722／1,710 | −6.4% / −6.2% |
| 單線 Rails | 1,848／1,821 | 1,582／1,671 | −14.4% / −8.2% |
| 單線 Rust | 941／931 | 710／699 | −24.5% / −24.9% |
| 單線 App | 953／1,026 | 882／855 | −7.5% / −16.7% |
| 單線 SRE | 1,385／1,410 | 1,256／1,262 | −9.3% / −10.5% |
| 單線 DevOps | 865／957 | 839／659 | −3.0% / −31.1% |

平行模式少 0.3%～2.3%；單線少比較多，因為單線外包收入少，付全月後升級得比較晚或升不到 Pro 500。不設目標、數值沒調，照實記錄。

成功率曲線拉長（gh-46-02）之後重量，看高價訂閱加外包收入是不是沒有代價（Spectra change `gh-52-01-sub-outsource-cost`，#52；2026-10-11，`main` 6088902，`SIM_N=100`，每格 300 局，`SIM_SEED=101`／`202`）。「只接外包」是 `SIM_OUTSOURCE=1`，「外包升級」是 `SIM_UPGRADE=2 SIM_OUTSOURCE=1`，「只升級」是 `SIM_UPGRADE=1`（不接外包，起始錢包付完 Max 5× 後幾乎付不起升級）；最後一欄是強玩法（`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1`）開局訂 Pro 200 → 改成外包升級的平均分，只有種子 101（種子 202 的這組模擬卡住，見「已知狀況」）：

| 模式 × 工作內容 | 只接外包 vs 預設 | 外包升級 vs 預設 | 外包升級 vs 只升級 | 強玩法加外包升級（種子 101） |
|---|---|---|---|---|
| 平行 Laravel | −19.9% / −20.1% | +24.0% / +19.5% | +18.0% / +20.3% | 9,633 → 9,437（−2.0%） |
| 平行 Rails | −18.8% / −20.5% | +23.0% / +20.8% | +20.4% / +21.5% | 9,609 → 9,481（−1.3%） |
| 平行 Rust | −20.8% / −24.3% | +51.1% / +53.9% | +46.6% / +55.1% | 9,464 → 9,212（−2.7%） |
| 平行 App | −18.6% / −19.8% | +23.0% / +20.4% | +20.6% / +16.8% | 9,185 → 8,959（−2.5%） |
| 平行 SRE | −26.5% / −27.5% | +30.3% / +24.9% | +27.2% / +26.8% | 9,879 → 9,597（−2.9%） |
| 平行 DevOps | −22.1% / −20.1% | +19.9% / +22.7% | +22.6% / +21.2% | 9,405 → 9,163（−2.6%） |
| 單線 Laravel | −75.3% / −80.4% | −16.7% / −16.8% | −15.3% / −17.4% | 2,209 → 872（−60.5%） |
| 單線 Rails | −87.4% / −80.4% | −15.6% / −15.7% | −15.6% / −9.1% | 2,282 → 1,040（−54.4%） |
| 單線 Rust | −189.9% / −257.8% | −11.7% / +110.4% | +2.2% / +115.1% | 1,803 → 670（−62.8%） |
| 單線 App | −87.3% / −89.7% | −30.0% / −30.0% | −29.8% / −19.3% | 1,746 → 588（−66.3%） |
| 單線 SRE | −140.7% / −135.0% | −27.7% / −28.0% | −24.6% / −28.5% | 1,920 → 536（−72.1%） |
| 單線 DevOps | −102.4% / −99.9% | −37.5% / −24.1% | −40.0% / −31.6% | 1,568 → 486（−69.0%） |

只接外包是虧的：錢不算分，外包單只會排擠公司工單。外包升級比預設高，好處來自外包的錢買到 OpenAI 訂閱、整天派 Codex Sol（能力 40），不是外包本身。強玩法本來就開局訂 Pro 200，改走外包升級反而少 1.3%～2.9%，平行拿 S 從 915 局降到 792 局（1,800 局中），沒有衝破平行 S 門檻（9,500，就是照這個強玩法訂的）。單線 Rust 種子 202 的 +110.4%（對預設）與 +115.1%（對只升級）是基準只有 230、225 分的雜訊。結論是高價訂閱加外包收入有代價，使用者選擇不調數值（訂閱額度、`GIG_PAY` 都不動），照實記錄。

### 推理強度（進階模式，`S.advanced`、`sel.ef`、`EFFORT`、`effModel`、`efOf`）
- 開局彈窗有「一般／進階」（`data-adv`），預設一般，跨 `fresh()` 保留，不是布林值就退回一般；週一調整不顯示；只切這個開關不重抽第 1 天工單。最高分 key 不分一般／進階。
- 進階模式下派工台在自我審核下方多一排「推理強度」（`data-ef`），選擇存在 `sel.ef`，跨 `fresh()` 保留。一般模式不顯示，`efOf()` 一律當中強度。
- `effModel(M, ef)` 把強度套在選到的模型上，`est` 用調整後的模型算成功率、抓錯率、token 與時數，派工、陷阱硬做判斷、扣款與紀錄名稱都跟著走：

| 強度 | 能力 | token | 執行時間 |
|---|---|---|---|
| 低 | −10（下限 10） | ×0.7 | ×0.8（變快） |
| 中 | 原本的模型 | ×1 | ×1 |
| 高 | +10（不設上限，Opus 會到 60） | ×1.5 | ×1.4（變慢） |

- 每 1k token 價格與訂閱權重 `w` 不變。強度不是中時，紀錄的模型名稱寫成「Sonnet・高強度」。
- `est` 裡「能力高於複雜度時 token ×0.85」的折扣看原本模型的能力，所以高強度的 token 剛好是中強度的 1.5 倍。
- 評估架構（`evalCost`、`revealRate`）與自己手寫不受強度影響。

平衡實測（2026-10-09，`SIM_N=100`，每格 300 局，跑兩次；`SIM_EFFORT=1` 平均分 ÷ 預設平均分，減 1）。自動玩家依選到模型的原始能力減顯示複雜度挑強度：≤ −1 用高、≥ 2 用低，其他用中（#46 之後是 ≤ −10、≥ 20）。

| 公司 | 平行 | 單線 |
|---|---|---|
| Laravel | −0.0% / +1.5% | −12.9% / −10.3% |
| Rails | −1.4% / −2.9% | −12.9% / −15.0% |
| Rust | +5.7% / +7.8% | +5.0% / +0.8% |
| App | −2.6% / −1.3% | −9.6% / −11.4% |

目標是平行模式 −5%～+15%，第一版倍率就落在範圍內，沒有調。單線模式完全受工時限制，高強度變慢反而虧（Rust 例外，因為 borrow checker 對能力 <4 的扣分被高強度補回來），不設目標，照實記錄。

### 採購電腦（`HW`、`requestHw`、`hwReqBlock`、`hwBlock`、`useHw`、`hwRow`）
規則以 `docs/spectra/specs/local-hardware/` 為準。遊戲裡的錢是真實量級（Claude Pro NT$650），真實電腦買不起，所以走公司採購申請：按鈕只用文字顯示真實價格，不扣公司 API 預算，靠信任審核。

| 電腦 | 價格文字 | 信任門檻 | 到貨 | 效果 |
|---|---|---|---|---|
| 有顯卡的 PC（RTX 5090） | 約 NT$12 萬 | 55 | 2 天 | 本地模型執行時間 ×0.7（`PC_SPEED`，評估架構也算） |
| NVIDIA DGX Spark | 約 NT$13 萬 | 60 | 3 天 | 解鎖 Qwen3-Coder-Next（能力 40、速度 1.4、cn）與 Gemma 4 31B（能力 40、速度 2.0、政府標案可用） |
| Mac Studio（512GB） | 約 NT$30 萬 | 70 | 3 天 | 解鎖 GLM-5.3（能力 50、速度 2.8、cn） |

- 申請花 1h（`HW_REQ_HRS`），同時只能一張（`S.hwReq`），到貨日超過第 20 天不能申請。到貨當天早上（團隊席位審核之後）看當天信任：夠就裝好（`S.hw`），當天少 1h 架設（`HW_SETUP_HRS`，平行模式 10:00 開工）；不夠就退件、不扣分、可再申請。
- 買了任何一台，本地跑 agent 時還能手寫（`manualBlocked`）；本地 GPU 仍然一次只跑一個 agent。
- 閒置：每天下班（第 20 天在結算前）每台當天沒用到的電腦信任 −2（`HW_IDLE`）。PC 看當天有沒有本地派工或本地評估，Spark 看 Qwen3-Coder-Next 或 Gemma 4 31B，Mac 看 GLM-5.3；被擋下的動作不算。使用紀錄 `S.hwUsed` 每天開工清空，接著把跑過夜、一早還在跑的本地 agent 照派工的對應記成用到（過夜後至少剩 0.05h，所以隔天一定還占著 GPU；不看當天跑多久，之後被中止也不撤回），開工存檔存的是補記後的紀錄（Spectra change `gh-36-01-hw-idle-overnight-job`，#36）。
- 沒解鎖的模型按鈕停用並寫「需要 <電腦>」；派工方案存了這種模型時一鍵派工略過。存檔沒有電腦欄位時 `loadGame` 補預設值，`SAVE_VER` 沒加。
- 模型選擇依 2026-10-10 的網路搜尋：Spark（128GB）放得下 Qwen3-Coder-Next（80B MoE）與 Gemma 4 31B，GLM-5.3（744B）只有 512GB 的 Mac Studio 放得下。強的開源權重幾乎都是中國的，Gemma 4 31B 是 Spark 上給政府標案用的非中國選項（原本是 gpt-oss 120B，使用者指出 gpt-oss 沒有新資料而換掉）。基本款也換成新一代，id 沿用 `qwen`／`gemma`／`oss`，兩個 MoE 速度調快約 20%（2.1→1.7、2.4→1.9）。預設自動玩家不派本地模型，固定種子比對改動前後輸出逐字相同。

平衡實測（2026-10-10，`SIM_N=100`，每格 300 局，跑兩次；`SIM_HW=1` 平均分 ÷ 同一份程式碼的預設平均分，減 1）。調整過程：第一版自動玩家不看信任就申請，信任歸零後一直被退、白花工時，平行模式 −3.6%～−5.5%；改成信任達門檻才申請後平行 −1.9%～+0.6%、單線 −23%～−37%；code review 指出它會把單線放不下的工單（例如複雜度 4 用 GLM-5.3 要 11.2h）硬派給本地模型、必定跑不完，改成跑不完的模型略過（單線超過今天工時、平行今天到期又跑不完）之後：

| 模式 × 公司 | 兩次 |
|---|---|
| 平行 Laravel | −1.2% / −0.8% |
| 平行 Rails | −0.7% / −0.2% |
| 平行 Rust | +1.0% / −2.4% |
| 平行 App | −1.4% / −1.2% |
| 單線 Laravel | −11.7% / −13.7% |
| 單線 Rails | −14.6% / −14.9% |
| 單線 Rust | −17.1% / −23.6% |
| 單線 App | −15.4% / −10.8% |

目標是平行模式 +3%～+15%，沒達到，使用者選擇接受、數值不調。自動玩家的信任通常第 11 天前就歸零，抽樣多半只買到 Spark 或什麼都沒買，Mac 幾乎沒買到，所以 GLM-5.3（免費能力 5）會不會太強沒有量到。單線模式完全受工時限制，本地模型比 Sonnet 慢很多，又用不到「跑 agent 時能手寫」，所以還是虧；單線不設目標。

### 自我審核（`REVIEW`、`catchRate`）
| 等級 | token | 時間 | 抓錯率 |
|---|---|---|---|
| 不審核 | ×1.0 | ×1.0 | 0 |
| 自審 | ×1.3 | ×1.2 | `0.2 + 0.1 × 能力差距 ÷ 10`（`CATCH`，能力差距跟成功率同一個，含技術線與大型 codebase 修正），下限 0 |
| 嚴格審核 | ×1.6 | ×1.35 | 自審 +0.2，上限 0.95 |

抓錯率看能力差距（`gh-46-02-success-curve`，之前是 `0.45 + 0.08 × 能力 ÷ 10`，跟工單無關）：模型做不到的單，也比較抓不到自己的錯。例如差距 0（Sonnet 做複雜度 4）自審 20%、嚴格 40%；差距 +20 自審 40%、嚴格 60%；差距 −20 自審 0%。單元測試再加 0.1／0.2。

- 是否失敗、是否被抓到在 `makeJob` 派工當下就擲骰決定。
- 抓到：多花 25% token、工單直接成功、`S.st.caught++`。
- 審核救不了額度用盡、時間不夠；審核抓到錯誤之後仍可能合併衝突，照樣留下解決衝突工單。
- 畫面顯示的成功率是 `pe = p + (1-p) × c`，並附原始機率。

交叉審核（`gh-48-01-cross-model-review`，#48，`reviewer`、`reviewerBlock`、`reviewCost`、`rvPrefBill`）：買了「交叉審核工具」、選了自審或嚴格審核時，可以另選審核模型（`sel.rvv`／`rvm`／`rvb`，`null` 是同一個）。
- 抓錯率照上面的公式，能力差距改用審核模型（中強度）的，含它自己的技術線與大型 codebase 修正。例如 Sonnet 寫 front-end 複雜度 4：同一個 20%、Opus 審 30%、Fable 審 40%、DeepSeek Chat 審 10%（自審）。
- token：寫的那段照不審核算；審核那段 = 寫的那段 × 0.3（嚴格 0.6）× 審核模型 `verb` ÷ 寫的模型 `verb`，照審核模型的價格、訂閱權重與付費方式扣；抓到錯的 ×1.25 只算寫的那段。時間多 複雜度 × 審核模型速度 × 0.2（嚴格 0.35）（含重做、技術線、PC 倍率）。選同一個時跟原本完全一樣。
- 結算時先扣寫的那段（不含修正），再扣審核那段：審核廠商今天當機、或額度／錢包不夠，就當作沒審（抓到的錯不算，紀錄「審核沒做完，沒抓到錯誤」），寫的那段照常結算、不會停在一半。寫的那段停在一半時審核那段不扣、不擲稽核。審核有做成又抓到錯時，修正的 25% 最後才對寫的付費方式扣，扣不到就當作沒修好、GA 送 `quota`（`/spectra-review` 抓到原本先扣審核會在共用額度或錢包時害寫的停在一半，使用者選了這個順序）。換審核模型時的預設付費是額度夠的席位或訂閱（跟寫的同一家、同一種額度時看兩段加起來），否則公司 API、個人 API；那家完全沒有能用的付費方式就回到同一個。審核那段算進公司單日上限與透支；機敏單審核走個人付費時再擲一次稽核。
- 本地模型審也占本地 GPU、算用到電腦；寫的是本地模型時只能同一個。
- 平衡實測（2026-10-11，`SIM_N=100`，每格 300 局；`SIM_XREVIEW=1 SIM_INVEST=1` 相對同一份程式碼的 `SIM_INVEST=1`，種子 101／202）。第一版自動玩家只要寫的模型能力低於 Opus 就叫 Opus 審，平行 −2.8%～−10.7%：它多半派 DeepSeek 寫簡單的單，抓到錯每局只多約 1.4 次，Opus 審核卻吃掉 Anthropic 訂閱額度與公司預算（停在一半 +1.35 次、透支 +0.6 次，KPI 781 → 733）。使用者選了改成只在寫的模型做不到（能力差距 ≤ −10）時才審，量到平行 −5.7%～+1.3%。之後照兩輪 `/spectra-review` 改了扣款順序（寫的先扣、寫的停在一半時審核不扣）與審核的預設付費（模擬器改用遊戲的 `rvPrefBill`），再量（下表）：

| 模式 | Laravel | Rails | Rust | App | SRE | DevOps |
|---|---|---|---|---|---|---|
| 平行 | −2.9% / −1.4% | +0.9% / −1.5% | +4.8% / +4.7% | −0.5% / −0.7% | −1.9% / −0.2% | +2.8% / +0.5% |
| 單線 | +0.1% / −10.4% | −0.8% / +4.2% | +26.0% / +26.6% | −2.0% / −8.2% | −6.9% / −21.4% | +1.4% / +3.0% |

  目標是平行模式 +3%～+15%，沒達到；使用者選擇接受、數值不調：交叉審核是花錢買安心的情境工具，對這個信任月底幾乎歸零、公司預算吃緊的自動玩家大約打平偏虧。沒開 `SIM_XREVIEW` 時三組固定種子輸出（`SIM_SEED=101`、`SIM_INVEST=1` 種子 101 與 202）改動前後逐字相同。

### 隨機事件（`EVENTS`，每天 55% 機率抽一個）
API 降價 30%、廠商當機一天、公司預算凍結 −30%、訂閱額度縮水 20%、流量暴增（兩張事故單；第 6 天前抽到只顯示「新聞流量比平常高一點」，沒有效果，理由見「工單」的每日進件）、主管稱讚或質疑（見下）、外包尾款 +NT$1,500、全公司禁中國雲端。

主管事件（`PACE_KPI`、`PRAISE_TRUST`、`DOUBT_TRUST`）看 KPI 有沒有超過「當天天數 × 7」（嚴格大於）：
- 超過：「主管在週會上點名稱讚」，「KPI 已經 40，超過 35，AI 工具用得很有效率。」信任 +6（上限 100）。
- 沒超過、第 6 天起：「主管問進度怎麼這麼慢」，「KPI 才 42，要超過 42 才跟得上進度。」信任 −4（下限 0）。
- 沒超過、第 6 天前：「主管在週會上提醒進度」，「KPI 目前 0。第一週先熟悉工具，之後 KPI 要超過天數 × 7。」沒有其他變化。理由和流量暴增一樣，讓第 1 週有時間熟悉；少扣的不在後面補。

舊文字「不是有買 AI 嗎？」會被讀成沒買電腦也被扣（#24），所以文字一定要寫出 KPI 和門檻。

實測（2026-10-10，`SIM_N=100`，每格 300 局，`SIM_SEED=101`、`202` 各跑一次）：改動前後輸出逐行相同。種子 101 的 3,600 局裡第 2–5 天抽到主管事件 993 次，957 次已經達標，只有 36 次落到「只提醒」；那幾局的信任後來也歸零，少扣的 4 分被下限吃掉。自動玩家第 1 週進度遠超過門檻，量不到這次改動，受影響的是第 1 週進度慢的真人玩家。沒有調數值。

### 用量挑戰（`S.burn`、`BURN_PTS`、`BURN_SEAT_VALUE`、`weekBurn`、`burnStat`）
規則以 `docs/spectra/specs/quota-burn/` 為準（#65）。
- 開局彈窗「用量挑戰」（`data-burn`），預設不挑戰，跨 `fresh()` 保留，不是布林值就退回不挑戰；週一調整不顯示；只切這個開關不重抽第 1 天工單。
- 價值：個人訂閱每週是那週方案月費 ÷ 4（不訂閱 0），團隊席位每週 `BURN_SEAT_VALUE` ÷ 4（NT$3,300，比照 Max 5×，估計值：席位週額度 10,000k 接近 Max 5× 的 9,000k），用掉的是 價值 × min(1, 週用量 ÷ (週額度 × `capMod`))。所有方案與席位都是 每日額度 × 5 > 每週額度，所以看週額度就夠。公司 API 的總價值是花在 token 的錢（`S.st.corpTk`，只有 `charge` 的 `corp` 分支會加）加上剩下的預算，透支算用滿；買投資（`payInv`）與預算凍結讓總價值變小、不算用掉。
- 結算時機：`endDay` 在週一把週額度歸零前，把剛結束那週的訂閱與席位加進 `S.st.burnV`／`burnM`（席位審核排在歸零之後，所以週一核准的席位從新的一週算；週一調整訂閱的彈窗在 `endDay` 之後，所以那週照舊方案算）。第 4 週沒有歸零，`burnStat()` 把這週當作現在結束一起算；額度區那一行「用量 NT$X / NT$Y（N%）」用同一個函式。不呼叫 `Math.random`，固定種子模擬輸出跟加入前逐字相同。
- 分數：開了才加 `round(BURN_PTS[mode] × 使用率)`，評等用 `GRADES.burnSerial` 3,900／2,500／1,500／600、`GRADES.burnParallel` 12,300／7,880／6,600／5,320；最高分 key 多 `-burn`，開著時不讀舊的 `tokgame-best-<mode>`。存檔多 `S.burn`、`S.st.burnV`、`burnM`、`corpTk`，舊存檔讀成沒開、累計 0，`SAVE_VER` 沒加。

量測（2026-10-16，`SIM_N=100`，每格 300 局，`SIM_SEED=101`／`202`）。訂閱＋席位使用率，`SIM_BURN=2`：

| 玩法 | 平行 | 單線 |
|---|---|---|
| Max 5×（預設訂閱） | 98.8%–99.2% | 78.9%–89.2% |
| Pro 200（`SIM_SUB=pro200`） | 91.5%–95.0% | 48.6%–59.5% |
| 強玩法（`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`） | 87.2%–88.9% | 41.3%–51.4% |

整體使用率（含公司 API）：預設派法（`SIM_BURN=1`）平行 60%–68%、單線 21%–29%；`SIM_BURN=2` 平行 96.7%–98.6%、單線 38%–52%。目標是最會燒的玩法能把 Max 5× 用到 90% 以上，平行做到、單線沒做到；單線卡在工時，使用者選了不加工單。

燒滿對不燒（`SIM_BURN=2` 平均分 ÷ 同一種玩法的 `SIM_BURN=1`，減 1；平行）：

| 工作內容 | 加分 2,000，預設 | 加分 4,000，預設 | 加分 4,000，強玩法 |
|---|---|---|---|
| Laravel | −3.1% | +4.6% / +5.7% | +7.9% / +8.2% |
| Rails | −4.5% | +3.2% / +3.3% | +7.2% / +7.0% |
| Rust | +21.3% | +28.8% / +29.1% | +5.8% / +6.3% |
| App | +2.3% | +11.3% / +9.3% | +8.0% / +5.3% |
| SRE | −8.2% | +1.5% / +1.2% | +6.7% / +7.2% |
| DevOps | −2.8% | +5.8% / +12.4% | +7.9% / +7.7% |

（加分 2,000 那欄只有種子 101。）目標是平行 +5%～+20%：強玩法都在範圍內；預設自動玩家 Rust 超過（它不燒時幾乎都派 DeepSeek Chat，Rust 被 borrow checker 扣分，改派 Opus 反而做得比較好）、Laravel／Rails／SRE 偏低，使用者接受。單線燒額度會排擠工單（`SIM_BURN=2` 單線比 `SIM_BURN=1`：Laravel、Rails、App、SRE、DevOps 掉 24.6%–48.5%；Rust +43.7%／+122%，基準只有 485／338 分），加分只有 500，照實記錄：單線開挑戰不划算。

評等門檻照規則算：平行 S＝強玩法 `SIM_BURN=2` 六條工作內容 1,800 局總分中位數（12,320／12,334）取整到百；平行 A–D 與單線各級＝一般門檻＋預設自動玩家 `SIM_BURN=1` 的用量加分中位數（平行 2,677／2,540 → 2,600，單線 108／108 → 100）。

### 結算（`showEnd`、`monthScore`）
總分（`monthScore()`）= KPI × 10 + 信任 × 4 − 稽核次數 × 80。錢不算分（`gh-26-01-money-off-score`，#26）：個人花費（你自己掏的錢）= 訂閱費 + 個人 API + 外包違約金 + 研討會報名費（不扣外包收入，#44），和月底錢包餘額一起列在結算單上，只用來判定稱號；開外包時另列個人淨收支 = 外包收入 − 個人花費（`monthScore()` 的 `net`）。原本總分多一項 (8000 − 個人花費) ÷ 8（下限 −12000 ÷ 8，`SPEND_FLOOR` NT$20,000），讓玩家不敢花錢：自費的研討會一個月內賺不回 KPI，外包收入又直接加分、只能靠低報酬控制強度。

開了用量挑戰時總分另加用量加分、評等用另一組門檻（見「用量挑戰」）。評等門檻兩種模式各一組（`GRADES.serial`、`GRADES.parallel`，S、A、B、C，低於 C 是 D）：單線 3,800／2,400／1,400／500，平行 9,500／5,280／4,000／2,720（`gh-45-01-kpi-balance`，#45；平行 S 在 `gh-53-01-parallel-hard-stack-kpi` 從 10,700 改成 9,500，#53）。

- 平行 S 是強玩法的中位數：`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`（6 槽、投資全買、去研討會、訂 Pro 200 全派 Codex Sol）六條工作內容合計 1,800 局的中位數，取整到百。#45 在 gh-46-02 之後量到種子 101 是 10,700、202 是 10,703；#53 拿掉平行模式的難線 KPI ×1.3 後重量（2026-10-11，加入複雜度 6 之後的程式，改動前是 10,811／10,768）是 9,525／9,558，所以改成 9,500。它派的是能力 40 的 Codex Sol，不是 #45 回報那局的 Opus。平行 A–D 照舊（以前是單線 × 1.6）。
- 單線門檻用比例對齊：gh-46-02 之前（ff72868）的預設自動玩家在舊門檻各評等的比例，在 gh-46-02 之後的分數上找相同比例的分數，取整到百。
- 合併 gh-46-02、#51（退單）之後重量（2026-10-11，`SIM_N=100 SIM_SEED=101`，每模式 1,800 局）：

| 玩法 | S | A | B | C | D |
|---|---|---|---|---|---|
| 平行，強玩法 | 50.1% | 49.9% | 0% | 0% | 0% |
| 平行，預設自動玩家（3 槽） | 0% | 76.7% | 17.1% | 5.0% | 1.3% |
| 單線，預設自動玩家 | 1.1% | 13.7% | 27.4% | 30.6% | 27.1% |
| 單線，gh-46-02 之前（舊門檻） | 1.1% | 13.7% | 28.3% | 30.4% | 26.4% |
| 單線，預設自動玩家＋`SIM_ABANDON=1` | 1.8% | 26.6% | 42.9% | 23.6% | 6.2% |

- #45 量到強玩法拿 S 依工作內容差很多：Laravel、Rails 14%，SRE 23%，Rust 85%、App 82%、DevOps 84%（Rust、App、DevOps 的 KPI ×1.3 在平行模式變成純加分），另開 #53。
- #53 平行模式拿掉 ×1.3、S 改 9,500 之後重量（2026-10-11，`SIM_N=100`，每格 300 局，種子 101／202）。強玩法平行相對 Laravel：Rails −0.2%／+1.4%、Rust −1.7%／−0.4%、App −4.6%／−2.8%、SRE +2.6%／+3.3%、DevOps −2.4%／−0.9%（改動前種子 101：Rust +22.7%、App +19.1%、DevOps +21.8%）。強玩法拿 S（300 局）：

| 種子 | Laravel | Rails | Rust | App | SRE | DevOps | 合計 |
|---|---|---|---|---|---|---|---|
| 101 | 169 | 158 | 145 | 109 | 198 | 136 | 50.8% |
| 202 | 161 | 177 | 157 | 121 | 189 | 145 | 52.8% |

  預設自動玩家平行相對 Laravel：Rust −32.9%／−34.4%、App −16.6%／−17.6%、DevOps −10.9%／−16.9%（改動前種子 101：−13.8%、+6.1%、+12.7%），Rust 超出 ±25% 的目標，使用者接受（它幾乎都派能力 30 的 DeepSeek Chat，Rust 被 borrow checker 扣分，平行模式不再用 KPI 補）。預設自動玩家平行評等：S 0%／0.1%、A 52.6%／53.7%、B 30.6%／29.8%、C 12.6%／12.1%、D 4.3%／4.3%（改動前種子 101：A 72.8%、B 19.4%、C 6.0%、D 1.7%），掉的幾乎都在 Rust、App、DevOps，A–D 門檻沒調。單線兩種玩法的平均分跟改動前逐格相同。
- 會退單時單線分數高很多（`SIM_ABANDON=1` 拿 D 從 27% 降到 6%），使用者選擇單線門檻照不退單的玩法訂：會用退單的玩家評等比較好是合理的回報，退單在單線是不是太強算 #51 的平衡問題。

以下是 #45 之前的門檻紀錄：評等門檻 S/A/B/C/D 4300/3300/2500/1700（平行模式 ×1.6：6880/5280/4000/2720）。草稿是舊門檻 4600/3800/3000/2200 各減 500（改動前預設自動玩家的個人花費約 NT$3,400–4,200，花費項約 +475～+575 分），目標是預設自動玩家每個模式各評等的比例跟改動前差 5 個百分點以內（`SIM_N=100`，每格 300 局，`SIM_SEED=101`、`202`）。在 af2b04b 上草稿就達標（最多平行 S +4.0），合併含研究單的 `main`（5717748）後平行 S 多 5.4～6.2 點；S 試了 4,200（最多 +4.4）和 4,300（各評等都在 ±2.9 內），採用 4,300。採用後對照改動前（模擬器修好錢包見底的派法後重量）：平行 S 69.3% → 70.7%、A 17.3% → 19.3%、B 8.4% → 6.8%、C 3.2% → 2.1%、D 1.7% → 1.2%（種子 202：S 69.8% → 70.3%、A 16.7% → 20.6%）；單線各評等差都在 ±3.4 內。量門檻時用 scratchpad 的小腳本在載入模擬器前改 `GRADES` 陣列，同一個種子下輸出跟 `tools/sim.js` 逐字相同。

月底不再截期限之後重量（#44，2026-10-11，`SIM_N=100 SIM_SEED=101`，每格 300 局，同一個種子改動前後比；評等比例是同一模式六條工作內容合計 1,800 局）。改動前第 18–20 天進來的單幾乎都被截成第 20 天到期、月底一起算逾期，拿掉之後少扣的 KPI 與信任直接回到分數：

| 模式 × 工作內容 | 預設 | `SIM_OUTSOURCE=1` |
|---|---|---|
| 平行 Laravel | 7,552 → 7,852（+4.0%） | 6,396 → 6,842（+7.0%） |
| 平行 Rails | 7,587 → 7,887（+4.0%） | 6,387 → 6,824（+6.8%） |
| 平行 Rust | 7,600 → 8,149（+7.2%） | 6,231 → 6,982（+12.1%） |
| 平行 App | 7,990 → 8,524（+6.7%） | 6,608 → 7,297（+10.4%） |
| 平行 SRE | 7,521 → 7,757（+3.1%） | 6,132 → 6,463（+5.4%） |
| 平行 DevOps | 8,069 → 8,594（+6.5%） | 6,721 → 7,445（+10.8%） |
| 單線 Laravel | 2,108 → 2,595（+23.1%） | 610 → 1,154 |
| 單線 Rails | 2,191 → 2,670（+21.9%） | 570 → 1,127 |
| 單線 Rust | 892 → 1,730（+93.9%） | −138 → 743 |
| 單線 App | 1,421 → 2,205（+55.2%） | 148 → 1,040 |
| 單線 SRE | 1,893 → 2,263（+19.5%） | 3 → 471 |
| 單線 DevOps | 1,254 → 2,077（+65.6%） | 109 → 991 |

評等比例：平行預設 S 70.7% → 77.3%（+6.6）、A 19.3% → 16.9%、B 6.8% → 4.2%、C 2.1% → 1.3%、D 1.2% → 0.2%；平行開外包 S 47.5% → 57.9%（+10.4）、D 5.6% → 1.7%；單線預設 D 51.2% → 26.4%（A +9.1、B +11.4）；單線開外包 D 94.5% → 80.6%。平行 S 的變動超過 change 設的 5 個百分點，回報後使用者選擇接受、這個 change 不調門檻，交給 #45（KPI 與評等重調）照這組數字處理。只量了種子 101。

錢不算分後，`SIM_SUB=pro200` 相對預設自動玩家：平行 +14.8%～+29.3%（同一個基準改動前 +10.0%～+26.3%，每格多 0.8～5.9 點）、單線 +19.6%～+101.3%（改動前 +0.5%～+36.5%，每格多 13.7～64.8 點）。單線差距變大不是 Pro 200 變強（它的單線平均分其實降了，例如 Laravel 2,797 → 2,574），而是 NT$6,500 月費以前要扣約 375 分、現在不扣；單線總分本來就低（預設 Rust 約 900），同樣幾百分換算成百分比很大。這是錢不算分的預期效果，單線不設目標，使用者選擇照實記錄、不調。起始錢包一度調到 NT$20,000（開局訂得起 Pro 500），`SIM_SUB=pro500` 平行從 −4%～+12% 變成 +15%～+32%，訂錢包付得起的最貴方案變成沒有代價的最佳解，使用者改回 NT$8,000；Pro 500 開局付不起，只能週一升級。

上面 +14.8%～+29.3% 是 2026-10-10、gh-46-02 之前量的。成功率曲線拉長之後重量（#52，2026-10-11，`main` 6088902，`SIM_N=100`，每格 300 局，`SIM_SEED=101`／`202`），`SIM_SUB=pro200` 相對預設自動玩家：平行 +26.4%～+44.4%（Rust +72.4% / +73.7%），單線 +42.6%～+96.3%（Rust +435.5% / +694.8%，基準只有 230～375 分）。差距變大的原因沒有拆開量，推測是能力 30 與 40 的差距在新曲線下扣得比較多（見「已知狀況」）；數值沒調。

以下是錢還算分時的下限實測，留作紀錄：

下限實測（2026-10-10，`SIM_N=100`，每格 300 局，`SIM_SEED=101`、`202` 各跑一次；`SIM_FLOOR` 只重算分數，同一個種子在不同下限下是同一批局）。改動前在 scratchpad 量的預設自動玩家個人花費中位數約 NT$3.7k–4.4k，沒有一局超過 NT$12,000；開 `SIM_LUNA=1` 時平行模式約 4% 超過 NT$12,000、沒有超過 NT$15,000。實測結果：預設自動玩家（訂 Max 5×）與 `SIM_SUB=pro200` 三個下限的平均分逐格相同（個人花費都沒超過 NT$12,000）。`SIM_SUB=pro500` 相對預設自動玩家：

| 模式 × 工作內容 | 12k | 15k | 20k（採用） |
|---|---|---|---|
| 平行 Laravel | +2.5% / +4.0% | −2.1% / −0.6% | −4.0% / −2.5% |
| 平行 Rails | +4.2% / +3.5% | −0.3% / −1.1% | −2.2% / −3.0% |
| 平行 Rust | +18.3% / +18.7% | +13.8% / +14.1% | +11.9% / +12.2% |
| 平行 App | +6.1% / +4.4% | +1.9% / +0.2% | +0.1% / −1.6% |
| 平行 SRE | +6.9% / +6.3% | +2.3% / +1.7% | +0.4% / −0.2% |
| 平行 DevOps | +5.1% / +6.2% | +0.9% / +2.0% | −0.9% / +0.2% |
| 單線 Laravel | −28.5% / −28.2% | −41.6% / −41.1% | −47.0% / −46.5% |
| 單線 Rails | −25.4% / −25.8% | −38.6% / −38.9% | −44.2% / −44.3% |
| 單線 Rust | −23.3% / −21.7% | −43.7% / −43.1% | −52.3% / −52.1% |
| 單線 App | −39.1% / −43.0% | −56.7% / −60.7% | −64.1% / −68.0% |
| 單線 SRE | −23.7% / −30.8% | −39.1% / −45.4% | −45.5% / −51.4% |
| 單線 DevOps | −37.4% / −44.2% | −56.3% / −63.3% | −64.2% / −71.3% |

Pro 500 每一格都比 Pro 200 差（平行 12k 時 −5.2%～−8.3%、20k 時 −10.3%～−14.1%；單線 −24%～−70%），沒有任何平行格兩次都比 Pro 200 高超過 +5%。這個自動玩家只派 Codex Sol（`w` 1），一個月約用 54M、每天不到 3M，連 Pro 200 的每日 8M 都用不完，所以量到的只是多付的月費；每天會超過 8M 的重度 Astra 玩家沒有量。

`SIM_SUB=pro200` 相對預設自動玩家（三個下限相同）：平行 Laravel +11.5% / +12.1%、Rails +12.2% / +12.8%、Rust +25.1% / +25.2%、App +13.9% / +12.7%、SRE +15.1% / +14.7%、DevOps +13.2% / +13.7%；單線 Laravel −2.1% / −3.7%、Rails +0.6% / −2.1%、Rust +12.6% / +19.7%、App −6.8% / −14.7%、SRE +7.6% / −1.7%、DevOps −8.5% / −5.8%。這是改動前就有的狀況（Pro 200 數值沒動），沒有調。
最高分依「模式 × 選到的技術線」存在 `localStorage` 的 `tokgame-best-<mode>-<a>+<b>`（`bestKey()`；單選就是原本的 `tokgame-best-<mode>-<company>`）；只選 Laravel 且沒有新 key 時沿用改版前的 `tokgame-best-<mode>`。稱號依花費結構判定（資安常客、自費勇者、公司帳單頭號人物、對岸模型省錢達人、地端信仰者、手工藝工程師、Token 精算師）。

### 執行紀錄（`log`、`daySummary`、`daySnap`、`S.dayStart`）
規則以 `docs/spectra/specs/action-log/` 為準。目的是月底能只看紀錄復盤整個月：每個決定當下看到什麼、信任和錢是怎麼動的。
- `log()` 把 `{cls, msg}` 加在 `S.log` 最前面（新的在上），訊息前面自動加 `Dnn`。整個月都保留、沒有筆數上限，`start()` 開新局時清空；跟著存檔走。結算畫面的「看看紀錄」關掉結算就能看。
- 各種紀錄行：

| 時機 | 格式 |
|---|---|
| 派工（兩種模式） | `→ 派出 <標題>（複雜度 N・第 N 天到期／今天到期・事故・機敏・外包）｜<agent> / <模型>・<付費>・<審核>｜成功率 N%｜派工台／一鍵派工方案 X／批次派工方案 X｜預計 Nh`；成功率是派工台顯示的（沒曝光的陷阱照顯示的複雜度），單線模式寫在結果那行之前 |
| 結果 | 成功、失敗、合併衝突都寫 `<agent> / <模型>・<付費>`，成功時再接審核等級 |
| 評估架構 | `<標題>｜評估｜<agent> / <模型>・<付費>｜…`（模型名稱不含推理強度，評估本來就不受強度影響） |
| 等待（平行模式） | `· 等待 1.0h（10:00→11:00）`、`· 等到下一個 agent 完成 …`；時數是實際經過的（含期間審 PR），排在等待期間產生的紀錄之前；沒有時間可等就不寫 |
| 隨機事件 | `◆ <標題>｜<內容>`，和早上報告同一段文字 |
| 逾期 | `⌛ 逾期：<標題>｜KPI -N｜信任 -N`；信任寫規則扣的數字（4、事故 8、有監控告警 4），信任已經歸零時實際扣得比較少，看下班總結；早上報告寫「N 張工單逾期，主管信任 -總數。」 |
| 開工 | 第 6、11、16 天寫「— 第 N 天開工・新的一週，每週額度重置，新進 …」 |
| 下班 | `═ 第 N 天下班｜KPI +24（61）｜信任 -8（62）｜錢包 -NT$120（NT$7,240）｜公司 -NT$410（NT$10,900）`，沒變化寫 `±0` |

- 下班總結的基準 `S.dayStart = {kpi, trust, wallet, corp}`（`daySnap()`）：第 1 天在開局確認、扣完訂閱費後取（週一調整訂閱不重取）；之後在 `endDay` 換日之後、席位／採購審核、隨機事件、新工單之前取，所以早上的事件算進新的一天。總結寫在所有下班扣分之後、第 20 天結算之前（`daySummary()`）。
- 隔天早上報告最上面有前一天下班的四格（#42）：KPI、信任、錢包、公司，各寫差值與現值，跟下班那行同一組數字（`daySum()` 算一次，`daySummary()` 寫紀錄、`showDay` 畫四格）；KPI、信任漲是綠色、跌是紅色，錢不上色。四格存在存檔的 `morning.sum`。
- 早上報告的順序照發生順序寫：席位、採購結果 → 隨機事件 → 開工那行（畫面上新的在上，開工那行在最上面）。
- 紀錄不會呼叫 `Math.random`，固定種子模擬改動前後輸出逐字相同。
- 量測（2026-10-10，`SIM_LOG=1 SIM_N=20`，每種模式 360 局，月底）：平行模式平均 501 筆、最多 624 筆，存檔 JSON 平均 45,455 字元、最多 59,412；單線模式平均 217 筆、最多 258 筆，22,716／27,320 字元。自動玩家很少評估、一鍵派工，真人可能更多，但離 localStorage 約 5M 字元的上限還很遠。
- 播放（結算後逐筆播放紀錄、旁邊顯示數字與曲線）另開 `gh-27-01-log-replay`（#27），還沒做。

### 存檔（`SAVE_KEY`、`SAVE_VER`、`saveGame`、`readSave`、`loadGame`、`clearSave`、`boot`）
規則以 `docs/spectra/specs/save-game/` 為準。
- 只存一格，`localStorage` 的 `tokgame-save`，內容是 `{ver, S, sel, uid, morning}`。`morning` 是當天早上報告彈窗的內容（`showDay` 的 `rep`、`ev`、`monday`），第 1 天是 `null`；讀檔時要原樣重開早上報告，所以要一起存（隨機事件現在也會寫進執行紀錄，但報告彈窗仍讀 `morning`）。 `morning.sum` 是前一天下班的四格（#42 加的，舊存檔沒有就不顯示，`SAVE_VER` 沒加）。
- 只在兩個時間點存：開局確認（開始第 1 天）之後、`endDay` 換到新的一天之後（開早上報告之前）。白天的動作、週一調整訂閱都不存，所以重新整理會回到當天早上，可以重骰當天，這是使用者選的。第 20 天下班直接結算、不存。
- 開頁由 `main.js` 的 `boot()` 決定（有沒看過的更新時，這些彈窗在最近更新彈窗關掉之後才開，見「最近更新」）：有能用的存檔開 `showResume`（第 N 天・公司・模式，繼續／開新局），存檔不能用就刪掉並開 `showBadSave`，都沒有就 `start()`。繼續會把 `S`、`sel`、`uid` 換成存檔的，第 2 天以後再開一次早上報告，不送 GA 事件。
- `start()`（開新局、再玩一個月）和 `showEnd` 都會刪掉存檔。讀檔的局照常記最高分。
- 能用的條件：JSON 解析得了、`ver === SAVE_VER`、第 1–20 天、`issues`／`jobs`／`companies`／`log` 是陣列、`uid` 是非負整數、`morning` 是 `null` 或有 `rep` 陣列、每個跑著的 job 的工單都在佇列裡。跑著的 job 和佇列裡的工單是同一個物件，`readSave` 會依 id 重新接上。沒有 `S.dayStart`（下班總結的基準）的舊存檔由 `loadGame` 用讀檔當下的數值補上，`SAVE_VER` 沒加。
- **`SAVE_VER` 是存檔結構版本，跟 `GAME_VERSION` 無關**：只改數值不用動；`S`、`sel`、工單或 job 的欄位改到舊存檔讀進來會出錯時（新增沒有預設值的欄位、改名、改意義），`SAVE_VER` 要加 1，舊存檔就會被丟掉並提示。

### 多語系（`i18n.js`、`LANGS`、`t`、`tl`、`initLang`、`setLang`、`applyLang`）
規則以 `docs/spectra/specs/localization/` 為準。
- 字典：每種語言一個檔案 `public/js/i18n/<id>.js`，`export const DICT={...}`，平的物件、key 是英文語意代號（`ui.*` 畫面、`log.*` 紀錄、`rep.*` 早上報告、`ev.*` 隨機事件、`why.*` 不能用的原因、`hint.*` 派工台提示、`bill.*`、`invest.*`、`hw.*`、`stack.*`、`client.*`、`rules.*` 規則 modal、`end.*` 結算、`pool.<技術線>.<1–6|trap|research|inc>` 工單題庫）。`zh-TW` 是預設語言，也是缺 key 時的退回語言；兩邊都沒有就顯示 key。語言名稱是各字典的 `lang.name`（用該語言自己寫）。
- `t(key, {參數})` 把 `{名稱}` 換成參數；`tl(key)` 取陣列（題庫）。分隔符號也在字典（`sep` 是「・」／「 · 」、`sep.list` 是「、」／「, 」、`sep.semi`、`company.join`）。
- 資料物件的顯示欄位（`STACKS` 的 `company`／`desc`／`pool`、`INVEST`、`HW`、`CLIENTS`、`BILL_LABEL`、`EFFORT`、`REVIEW`、`SDD_NAME`、`SDD_EG`、`CONF_CATS`、`RULE_TABS`、方案 `none`、部分廠商與 agent 名稱）改成 getter，讀的時候照目前語言，呼叫的地方不用改。品牌與模型名稱（Claude Code、Sonnet、Max 5×）不翻。`CLIENTS` 加了 `id`；存檔裡工單的 `client` 是存檔當下的名稱字串。
- 題庫：`STACKS[k].pool` 是 getter（`poolOf(k)`），從字典組出 `POOL_KEYS` 那八組；`pick` 只看長度，各語言長度相同，所以同一個亂數抽到對應位置的標題，數字完全一樣。
- 語言決定（`initLang`，`boot()` 第一行）：`tokgame-lang` 存的是註冊過的語言就用它，否則照 `navigator.languages` 的主標籤找（`zh-CN` 也算 `zh-TW`），都沒有用英文。讀寫 `localStorage` 都包 try/catch。
- 切換（標頭 `button[data-lang]`，`LANG_SWITCH`）：`setLang` 存偏好、`applyLang` 設 `<html lang>`、`document.title`（`page.title`）、只顯示 `#about` 裡目前語言的 `[data-lang]` 區塊，再 `render()`。不改遊戲狀態、不存檔、不送 GA、不寫紀錄。開著的彈窗不會重畫，下次打開才換語言。
- 已經寫下的字不重翻：`S.log`、存檔的 `morning.rep` 都是寫入當下的字串，切換後新舊混在一起。
- 工單標題跟著目前語言（`gh-38-01-untranslated-tickets`，#38）：`makeIssue` 在工單上記下題庫位置 `src = {k, g, i}`（技術線、題庫組別 `1`–`5`／`trap`／`research`／`inc`、第幾個），研究單拆出來的兩張多 `p`（0／1）；`issueTitle(is)` 照目前語言查字典，合併衝突單加上目前語言的前綴。卡片、背景 agent 列、派工台標題和之後寫的紀錄行都用它，不要直接讀 `title`。`title`（研究單的 `parts`）照舊存寫入當下的字串，沒有 `src` 的舊存檔或位置查不到時顯示它。題庫只能在最後面加標題，調整既有標題的順序會讓存檔裡工單的標題跟著變（數字不受影響）。
- `index.html` 的 `<head>`、`sitemap.xml`、OG 圖只有中文。
- node 工具：Node 24 自帶 `navigator.language`＝`en-US`，`tools/fake-dom.js` 把它固定成 `zh-TW`，`check.js`、`sim.js` 的輸出維持中文，固定種子模擬輸出跟加入多語系之前逐字相同。
- `tools/check/localization.test.js` 的多語系檢查：各語言 key 集合與 `zh-TW` 相同（`en` 要完整）、題庫長度相同、程式裡寫死的 `t()`／`tl()` key 都在 `zh-TW`、`public/js/*.js` 註解以外沒有中文（CJK 標點、漢字、全形字），另外用英文玩完單線與平行各一整局，畫面、彈窗、紀錄沒有中文；規則 modal 每個分頁中英數字相同（電腦價格換單位不比）。
- 新增語言：見 README 的「新增語言」。

### 最近更新（`news.js`、`NEWS`、`NEWS_KEY`、`unseenNews`、`markNewsSeen`、`showNews`、`newsList`）
規則以 `docs/spectra/specs/whats-new/` 為準（#66）。
- `NEWS` 是玩家看得到的更新，新的在前，每筆 `{id, date}`；文字是兩份字典的 `news.<id>`，英文的數字要跟中文一樣（規則分頁的中英數字檢查也會比）。日期兩種語言都寫 `YYYY-MM-DD`。id 是上線那個 change 的名稱前綴（`gh-64-01`），一筆涵蓋同一張卡兩個 change 時用後面那個（`gh-46-02`）。
- 只能在最前面加，不能刪也不能調順序：`localStorage` 的 `tokgame-news` 記的是看過的最新一筆 id，清單裡在它前面的就是沒看過的；記錄的 id 不在清單裡當全部看過。
- 沒有 `tokgame-news` 時：有存檔（`tokgame-save`）或任何 `tokgame-best-*` 算上線前就來過，全部沒看過；都沒有是第一次來，直接記成看過最新一筆、不跳。`tokgame-lang` 不算（只有切過語言才有）。讀 `localStorage` 失敗就不跳、不寫。
- `boot()` 先算沒看過的（要在 `readSave()` 之前，壞存檔會被刪掉），有的話開 `showNews`：最多列 `NEWS_MAX`（5）筆，超過的寫「還有 N 筆更新」。「知道了」寫記錄、接回原本要開的彈窗；「還有 N 筆更新」寫記錄、用 `showRules(next, 'news')` 打開規則的「更新」分頁，關閉後一樣接回原本的彈窗。
- 不送 GA、不進存檔、不寫執行紀錄，`SAVE_VER` 沒加，固定種子模擬輸出不變（node 工具開頁時假 `localStorage` 是空的，算第一次來）。
- node 工具：`tools/fake-dom.js` 的假 `localStorage` 多了 `length`、`key(i)`；只想測繼續／壞檔／開局的檢查用 `tools/check/lib.js` 的 `bootSeen()`（先記成看過再 `boot()`）。
- **每個玩家看得到的改動上線時，在 `NEWS` 最前面加一筆、兩份字典各加一句 `news.<id>`**，日期寫 push 到 `main` 的那天；`tools/check/whats-new.test.js` 會擋下 id 重複、日期變新、缺字典或中英數字不同。部署、測試、量測這類玩家看不到的改動不加。

## 程式碼地圖（`public/js/`）

| 模組 | 內容 |
|---|---|
| `main.js` | 入口：`app` 上的事件委派（用 `data-*` 屬性分派）、開局，載入時呼叫一次 `boot()`：`firstIssues`、`start`、`boot` |
| `data.js` | 資料與工具函式，沒有狀態（顯示欄位是讀字典的 getter）：`GAME_VERSION`、`CAP_SCALE`、`WEAK_CAP`、`P_TOP`、`POOL_KEYS`、`poolOf`、`VENDORS`、`SUBV`、`APIV`、`objOf`、`CLIENTS`、`pickClient`、`banOf`、`cnBlock`、`SEAT`、`BASE`、`KPI`、`STACKS`、`COMPANIES`、`normCompanies`、`companyName`、`bestKey`、`rnd`、`kt`、`h1`、`vc`、`model`、`EFFORT`、`effModel`、`efOf`、`planOf`、`PN`、`DEFAULT_PRESETS`、`BILL_LABEL`、`validPreset`、`validReviewer`、`presetsOf`、`STACK_PICK`、`STACK_FE`（一般工單分給選到的技術線、前端的比例）、`INVEST`、`MD_TK`、`MD_P`、`TEST_CATCH`、`MCP_REVEAL`、`SDD_TK`、`SDD_P`、`SDD_TRAP_STOP`、`SDD_NAME`、`SDD_EG`、`sddDesc`、`INV_KEYS`、`HOOK_PR`、`SCAN_AUDIT`、`FASTLANE_REJECT`、`MONITOR_LATE`、`MONITOR_KPI`、`HW`、`HW_KEYS`、`PC_SPEED`、`HW_REQ_HRS`、`HW_SETUP_HRS`、`HW_IDLE`；規則係數 `CATCH`、`REVEAL`、`BIG`、`RETRY`、`MANUAL_HRS`、`UNFAMILIAR_HRS`、`STACK_HRS`、`STORE_RATE`、`INC_KPI`、`HARD_KPI`、`LATE_KPI`、`CONFLICT`、`CONFLICT_MAX`、`CI_CONFLICT`、`PR_HRS`、`PR_REVIEWED`、`EVAL_HRS`、`MCP_EVAL_HRS`、`RESCOPE`、`RESEARCH_DIRECT_TK`、`RESEARCH_TK`、`RESEARCH_HRS`、`RESEARCH_SELF_HRS`、`RESEARCH_SPLIT`（`SEAT.review` 是席位審核天數）、`lv`、`SKILLS_CX`、`CONF_CATS`、`CONF`、`CONF_KEYS`、`CONF_LV2`、`CONF_LAST_DAY`、`CONF_MANUAL`、`BURN_PTS`、`BURN_SEAT_VALUE`（用量挑戰）、`CORP_VENDORS`、`CORP_DEFAULT`、`normCorp`（公司 API 合約）、`AI_P`、`AI_MAX`、`INV_CX`、`INV_Q`、`INV_ON`、`invCx`、`invQuality`（投資工單的複雜度與品質）、`ACCEPT_HRS`（驗收工時倍數） |
| `state.js` | `S`（全部遊戲狀態，`fresh()` 初始化）、`sel`（派工台目前選擇）、工單編號、陷阱比例、工單產生、GA 事件、存檔：`S`、`sel`、`uid`、`nextId`、`resetIds`、`fresh`、`track`、`SAVE_KEY`、`SAVE_VER`、`saveGame`、`clearSave`、`readSave`、`loadGame`、`daySnap`、`pickStack`、`TRAP_RATE`、`setTrapRate`、`RESEARCH_RATE`、`setResearchRate`、`SIX_RATE`、`SIX_DAY`、`setSixRate`、`hardStack`、`hardKpi`、`unfamiliar`、`makeIssue`、`issueTitle`、`GIG_PAY`、`GIG_LATE`、`GIG_STACKS`、`GIG_CLIENT`、`makeGig`、`modeKpi`、`addGigs`、`START`（起始錢包、公司預算、信任、每日工時）、`confStacks`、`confCat`、`confCount`、`dueBy`（到期日 ≤ d，投資工單沒有到期日）、`invTitle` |
| `calc.js` | 計算（`est(is, v, mid, rv, ef, sd, rr)` 會套推理強度、SDD 等級與審核模型 `rr`）：`reviewer`（生效的審核模型）、`reviewerBlock`、`reviewCost`、`rvPrefBill`、`pStep`（成功率錨點內插，起點 `P_TOP` 在 `data.js`）、`bigGap`（大型 codebase 的能力差距）、`sddLevel`、`quotaLeft`、`useQuota`、`REVIEW`、`catchRate`、`conventional`、`STORE_REJECT`、`storeReject`、`stackGap`、`stackHrs`、`stackHint`、`localBusy`、`hasHw`、`manualBlocked`、`hwBlock`、`localSpeed`、`manualHrs`、`est`、`GIG_NOTE`、`gigBlocked`、`bills`（`bills(v, is)`，傳工單才會套外包限制）、`costLine`、`presetBlock`、`presetFor`、`prefBill`、`log`、`P_STEP`（成功率階梯）、`invQ`、`setInvQ`（投資各級品質）、`invVal`、`invOn`（效果照品質內插、開關門檻）、`mdTk`、`mdP`、`testCatch`、`ciMul`、`hookMul`、`scanMul`、`mcpReveal`、`mcpEvalHrs`、`sddP`、`sddStop`、`monOn`、`skillsLv`、`invEst`（投資工單的預估）、`corpOk`（這局有簽公司 API 合約的廠商）、`weekBurn`、`burnStat`（用量挑戰的使用率） |
| `actions.js` | 動作（`settle` 是結算與成敗的地方；`charge` 是派工與評估共用的扣款）：`PAR`、`queueOrder`、`clock`、`TRAP_STOP`、`TRAP_NOTE`、`hiddenTrap`、`trueView`、`reveal`、`makeJob`、`RV_ID`、`SDD_ID`、`jobChoice`、`rvSeg`、`NO_RV`、`billOk`、`dispatch`、`canQuick`、`quick`、`loadPreset`、`savePreset`、`conflictRate`、`REVIEW_LOAD`、`reviewLoad`、`prHrs`、`advance`、`cancelJobs`、`CANCEL_MIN`、`cancelFrac`、`cancelJob`、`charge`、`auditRisk`、`auditOdds`、`auditRoll`、`checkOverdraft`、`reward`、`settle`、`wait`、`manual`、`EVAL_TK`、`canEvaluate`、`evalCost`、`revealRate`、`evaluate`、`RESCOPE_TRUST`、`rescope`、`ABANDON_TRUST`、`canAbandon`、`abandon`、`researchCost`、`selfResearchHrs`、`researchBlock`、`splitResearch`、`research`、`invCount`、`investBlock`、`invest`、`hwReqBlock`、`requestHw`、`useHw`、`batch`、`INV_STACKS`、`invHint`、`EVENTS`、`INC_RATE`、`INC_RAMP`、`incRate`、`intakeIssue`、`daySum`、`sumDelta`、`daySummary`、`dayStartLine`、`endDay`、`who`、`ev`、`AUDIT_ODDS`、`AUDIT_TRUST`、`OVERDRAFT_TRUST`、`CORP_DAY_LIMIT`、`CORP_DAY_TRUST`、`LATE_TRUST`、`INC_LATE_TRUST`、`EVENT_RATE`、`OVERNIGHT_HRS`、`PACE_KPI`、`PRAISE_TRUST`、`DOUBT_TRUST`、`invLevel`、`invMax`、`invCost`、`invLock`、`confBlock`、`registerConf`、`attendConf`、`isInvTicket`、`invTicketOpen`、`invTicketBlock`、`openInvTicket`、`dispatchInv`、`applyInv`、`settleInv`、`INV_SELF`、`invKey`、`lvCost`、`payInv`、`invSelf`、`invSelfBlock`（投資工單）、`acceptHrs`、`acceptBlock`、`acceptInv`（驗收，#67） |
| `view.js` | 畫面（`render` 整頁重繪成字串）與 DOM 節點 `app`／`ov`／`mo`：`app`、`ov`、`mo`、`render`、`cancelArm`、`armCancel`、`cancelBtn`、`rvModelBlock`、`fixReviewer`、`reviewerRows`（交叉審核的兩排）、`quickBtn`、`sddRow`、`invPanel`、`tab`、`setTab`、`tabPanel`（派工台／工程投資分頁）、`hwRow`、`qbox`、`logLines`（執行紀錄與「剛剛」共用的紀錄行）、`DP_RECENT`、`presetIs`、`dispatchPanel`、`confRow`、`langSwitch`、`capBar`（能力條）、`dayDock`（畫面底部的動作列：等待、調整訂閱、下班）、`abandonArm`、`armAbandon`、`abandonBtn`（退單的兩段式按鈕）、`NARROW_MQ`、`scrollToDispatch`（一欄版面點工單後捲到派工台）、`invDispatch`（投資工單的派工台）、`invAccept`（待驗收的派工台） |
| `modals.js` | 彈窗（`showSetup` 含公司與模式選擇）與開局草稿 `draft`：`draft`、`planPicker`、`planCost`、`toggleCompany`、`showSetup`、`showDay`、`showResume`、`showBadSave`、`planShort`、`monthScore`、`showEnd`、`SCORE`、`GRADES`、`PAR_GRADE` |
| `rules.js` | 規則 modal（`showRules(back, tab)`，`back` 是關閉後回到原彈窗的函式、`tab` 是直接打開的分頁）與七個分頁的內容（`rulesTab(id)`，`news` 是最近更新的完整紀錄），數字全部從其他模組的常數插值：`RULE_TABS`、`ruleTab`（只在這個模組改）、`x1`、`pct`、`rtag`、`rtable`、`rlist`、`rsec`、`rulesTab`、`showRules` |

| `news.js` | 最近更新：`NEWS`（更新清單）、`NEWS_KEY`、`BEST_PREFIX`、`unseenNews`、`markNewsSeen`、`NEWS_MAX`、`newsList`、`showNews`（開頁彈窗） |
| `i18n.js` | 多語系：`LANGS`（語言註冊表）、`LANG_KEY`、`LANG_SWITCH`、`lang`、`dictOf`、`t`、`tl`、`pickLang`、`initLang`、`setLang`、`applyLang` |
| `i18n/zh-TW.js`、`i18n/en.js` | 字典（`DICT`），只有資料、不 import 任何模組 |

模組規則：
- 每個頂層宣告都 `export`，各模組用到別的模組的名稱就具名 import。模組間允許循環 import，所以頂層只能宣告，不能在載入時呼叫別的模組的函式（`main.js` 最後的 `boot()` 除外）。
- `S`、`sel`、工單編號、`TRAP_RATE` 只有 `state.js` 能重新指定，其他模組用 `nextId()`／`resetIds()`／`setTrapRate()`；`draft` 只在 `modals.js` 裡改。改屬性（`S.day++`）不受限。
- `lang` 只有 `i18n.js` 能重新指定，其他模組用 `setLang()`；`initLang()` 只在 `boot()` 呼叫，不在模組載入時讀 `navigator`。
- `tools/sim.js` 要先 import `tools/fake-dom.js` 與 `tools/sim-seed.js`，`tools/check/lib.js` 要先 import `tools/fake-dom.js` 與 `tools/check-seed.js`，再 import `public/js/main.js`，順序和瀏覽器一樣；`tools/check/*.test.js` 第一行 import `./lib.js`。

慣例：
- 玩家看得到的改動上線時，在 `public/js/news.js` 的 `NEWS` 最前面加一筆、兩份字典各加一句 `news.<id>`（見「最近更新」）。
- 新增或修改介面文字：在 `public/js/i18n/zh-TW.js` 與 `en.js` 加同一個 key，程式裡用 `t()`；`tools/check/localization.test.js` 會擋下缺的 key 與程式碼裡的中文（`node tools/check.js` 會跑到）。
- 畫面每次都整個重繪（`render()`），沒有框架。新增 UI 時沿用 `data-*` 加事件委派。
- 所有顏色走 CSS token（`:root` 加兩個深色區塊），淺色、深色都要顧；廠商色是 `--anth`、`--oai`、`--goog`、`--dsk`、`--glm`、`--kimi`、`--local`；彈窗遮罩是 `--scrim`（不要用 `--ink` 調透明度，深色模式的 `--ink` 是淺色）。
- 每天都要按的控制（等待、調整訂閱、下班）放在畫面底部的動作列 `dayDock`，不要放回會被面板推到很下面的區塊。
- 需要支援 400px 手機寬度。
- 改規則或數值時一起看 `public/js/rules.js`：數字是插值的會自動跟著變，但規則的文字說明要手動改；新增的倍率、機率、代價、扣分要做成具名常數，再讓規則 modal 讀它。
- 新增廠商只要在 `VENDORS` 加一筆並補一個顏色 token；`S.subs`、`S.used`、統計都由 key 自動產生。
- 新增技術線：在 `STACKS` 加一筆（每個複雜度至少 3 個標題，含 `inc`），要當公司就加進 `COMPANIES` 並給 `level`；有特殊效果時改 `stackGap`／`stackHrs`／`stackHint`，再跑 `tools/check.js` 與 `tools/sim.js`。

## 已知狀況與可做的下一步

- 平行模式下「嚴格審核＋便宜的中國模型」明顯偏強。可以考慮加重嚴格審核的時間成本（#63 之後沒有工作槽可佔）。
- `tools/sim.js` 的自動玩家很粗糙，不理會稽核和信任，所以模擬結果裡信任常常歸零。它只適合拿來確認不會壞、看大致趨勢；需要時可以改寫成更聰明的策略。
- 全部工程投資都買時（`SIM_INVEST=2`），平行模式 Rust、App 約 +21%～+27%，超過 +3%～+15%，使用者接受。拿 S 的比例當時約 98%；#45 把平行 S 改成強玩法的中位數（10,700）之後，強玩法約一半拿 S，Rust／App／DevOps 比 Laravel／Rails 容易拿很多；#53 拿掉平行模式的難線 KPI ×1.3、S 改成 9,500 後，各工作內容拿 S 在 36%–66% 之間（App 最低、SRE 最高）。
- 多團隊席位只量了上限（見「時間與資源」的席位實測）：平行模式 −4.3%～+6.0%，在目標內；單線模式 +14.6%～+50.0%。第 2、3 個席位對這個自動玩家幾乎沒有額外效果，重度使用 Opus 的玩家還沒量。照真實規則（要顧信任）的增幅也沒量，因為自動玩家不顧信任。
- 單線模式下 Rust、App 公司明顯較難（見上方平衡實測），目前用難度星等交代；如果要拉近，可以考慮單線模式下這兩家每天少一張工單。
- 訂 OpenAI Pro 200 全派 Codex Sol 的自動玩家，平行模式比預設（Max 5×、DeepSeek 優先）高 +11%～+25%（見「結算」的下限實測），錢不算分後平行 +15%～+29%、單線 +20%～+101%（2026-10-10），gh-46-02 拉長成功率曲線後平行 +26.4%～+44.4%、Rust +72.4% / +73.7%，單線 +42.6%～+96.3%、Rust +435.5% / +694.8%（2026-10-11，#52）。沒有拆開量原因；推測和團隊席位實測一樣，是把能用就派的 DeepSeek Chat（能力 30）換成能力 40 的模型、失敗變少（新曲線下差 10 點能力扣得更多），而 Pro 200 每日 8M 的額度夠這個自動玩家整天用。要確認可以加一組整天派另一個能力 40 模型的對照（例如 Max 20× 全派 Sonnet），差距接近就是模型能力、不是 Pro 200 的額度；這個推測沒有影響任何決定。#52 量過高價訂閱加外包收入，結論是有代價、不調（見「接外包」）。如果要拉近，可以考慮降低 Pro 200 的額度（真實世界已從約 20 倍砍到 10 倍 Plus）。
- 錢不算分後，外包只在玩家需要錢（升級訂閱、研討會）時划算；錢夠了還一直接會排擠公司工單（見「接外包」的重測）。
- （已修，#55）`SIM_N=100 SIM_SEED=202 SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_UPGRADE=2 SIM_OUTSOURCE=1 node tools/sim.js` 原本印到平行 Rails 的樣本之後就卡住（2026-10-11 #52 量測時發現）。根因在遊戲：`advance()` 的迴圈把剩 ≤1e-9 小時當成下班，結尾卻只擋負數，留下浮點殘值（那局是第 66 局第 5 天的 `S.hours = 4.996e-16`）；時鐘顯示 17:00，「等 1 小時」「等到下一個 agent 完成」卻還能按、按了不推進，`tools/sim.js` 看 `S.hours>0` 一直呼叫 `wait(true)` 就出不來。`advance()` 改成把 ≤1e-9 的殘值歸零（Spectra change `gh-55-01-sim-hang-strong-outsource`），模擬器沒加防護；修好後這組指令約 2 分鐘跑完，三組種子 101 的固定種子輸出（預設、`SIM_INVEST=1`、同一組強玩法外包升級）改動前後逐字相同。
- 可能的擴充：Cursor／Copilot 這類多模型訂閱、prompt caching 折扣、多人比分、更多技術線（例如 Go、Python 資料管線）。

## 框架重構評估

使用者的決定：等遊戲功能完整後，再判斷要不要導入前端框架或建置步驟。在那之前沿用現在的寫法（`render()` 整頁重繪成字串、`data-*` 事件委派、無建置步驟）。

**每次評估新任務都要判斷一次要不要重構**（2026-10-10 使用者要求）。開新 issue、`/spectra-discuss`、`/spectra-propose` 或直接動手做一個新功能之前：
1. 量下面的訊號（`wc -l`、`wc -c`、超過 200 字元的行數，看這次會改到的模組），對照上一筆量測。
2. 判斷這個任務要不要先重構，結論只有三種：不用（照現在寫法做）、先做局部整理（例如把這次要改的功能從 `actions.js` 抽成自己的模組，另開 change 或列在 tasks 最前面）、該導入框架或建置步驟（停下來用 AskUserQuestion 問使用者，不自行決定）。
3. 把量到的數字與結論寫進 proposal（Spectra change）或 issue 內文，一兩行就好；需要重構時也在下面的量測紀錄補一筆。

訊號（記錄當下的實際數字再判斷）：
- 程式大小（原本是單檔 `public/js/game.js`）：加入技術線後約 580 行、加入陷阱題後約 645 行（2026-10-07 量測）、加入派工方案與工程投資後 776 行（2026-10-09 量測）、加入雙選公司與 OpenAI 席位後 791 行／62.8KB（2026-10-09 量測，平均每行約 79 字元，46 行超過 200 字元，行數低估了實際份量）。2026-10-09 依 Spectra change `split-game-modules` 拆成七個 ES modules（main 39, data 122, state 51, calc 81, actions 263, view 143, modals 139 行，共 838 行，含 import 行）；之後看最大的單一模組（目前 `actions.js`）。加入採購電腦後（2026-10-10 量測）共 1,052 行／83.6KB：actions 331 行／22.3KB、view 151 行／16.3KB（21 行超過 200 字元）、modals 181 行／15.6KB（17 行）、data 149 行／15.5KB、state 100、calc 93、main 47。加入規則 modal 後（2026-10-10 量測）共 1,208 行／101.8KB，新增 rules 104 行／12.0KB，actions 341、modals 188、data 175、view 152；規則內容放自己的模組，沒有塞進 modals.js。執行紀錄補齊（`gh-25-01-log-history`）開工前量測（2026-10-10）：actions 341 行／23.3KB（10 行超過 200 字元）、modals 188／16.3KB（17）、view 152／16.4KB（21）、calc 97、state 102，結論不用先重構；這次只改 actions、calc、state、modals，view 沒動。多語系（`gh-34-01-i18n`）完成後量測（2026-10-10）：actions 483 行／31.6KB（5 行超過 200 字元）、view 194／19.9KB（30）、modals 196／14.7KB（9）、data 164／16.0KB（9，題庫搬進字典後少約 50 行）、rules 125／9.2KB（7）、state 126、calc 101、main 61、i18n 52；字典 `zh-TW.js` 700 行／51.0KB、`en.js` 700 行／54.8KB。結論沒有變：不用導入框架。單一模組超過約 1,000 行、或常常要跨很遠的區塊改同一個功能時，拆模組的價值會浮現。
- `render()` 整頁重繪的成本：目前畫面量很小，沒有可察覺的延遲。如果加入動畫、拖拉或大量列表後出現卡頓或輸入框失焦，才是換成元件化渲染的理由。
- 狀態相關的 bug：`S`／`sel` 是全域可變物件。如果開始出現「畫面跟狀態不同步」「某個動作忘了 `render()`」這類 bug，代表需要更明確的狀態管理。
- 測試需求：用假 DOM 驗規則。規則檢查在 2026-10-10 長到單檔 2,527 行（一天從 1,527 行長上來、單日改 36 次），「越來越難寫」的訊號出現，依 Spectra change `gh-37-01-split-check-js`（#37）照 spec 拆成 `tools/check/<spec>.test.js` 並導入 Node 內建的 `node:test`（每個檔各自一個 process、不用裝套件）；vitest 評估過，多的是 watch、UI、coverage，要多 `package.json` 與 `npm install`，使用者沒選。若之後需要測 UI 互動、watch 或 coverage，再評估換成 vitest。
- 部署限制：GitHub Pages 與 Cloudflare Pages 都只發佈 `public/`；導入建置步驟時要改成在 workflow 裡 build 一次，兩個 job 都上傳產物。
