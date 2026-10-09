# Token 撐到月底

設計與交接文件，也是 Claude Code 接手開發時讀的規則來源（根目錄 `CLAUDE.md` 會引入這份）。這個專案是在 claude.ai 的一段對話裡做出來的，下面整理那段對話的需求原文、每一輪的設計決定、遊戲規則與數值，以及程式碼地圖。

## 專案是什麼

純靜態網頁遊戲：玩家扮演一位全端工程師，開局選一家公司（Laravel、Rails、Rust、App 四條主技術線），在 20 個工作天內用有限的錢和額度，把每天進來的工單交給不同廠商的 code agent 處理。核心是 token 預算的取捨：選哪家、哪個模型、誰付錢（個人訂閱／個人 API／公司 API／公司團隊席位／本地 GPU）、要不要審核，還要顧到案主合約和資安稽核。

原本是 claude.ai Artifact 上的單一 `index.html`（原檔封存在 `docs/token-game.zip`），搬進 repo 時拆成 HTML、CSS、JS 三個檔案，之後的改版都記在下面。目前的檔案：

- `public/index.html`：頁面骨架。`<head>` 有含關鍵字的 `<title>`、canonical、`theme-color`、Open Graph／Twitter Card、JSON-LD（`VideoGame`）、favicon 與 manifest；`#app` 裡只有載入中的佔位，`start()` 第一次 `render()` 會換掉。遊戲介紹與怎麼玩放在 `#app` 外面的 `<footer class="about">`，一直留在頁面上，Googlebot 執行 JS 後也索引得到。分享圖是 `public/img/og.png`（1200×630），圖示是 `public/favicon.ico`、`public/apple-touch-icon.png`、`public/img/icon-192.png`／`icon-512.png`；另有 `robots.txt`、`sitemap.xml`、`manifest.webmanifest`。改遊戲名稱或介紹時一起更新這些地方（`sitemap.xml` 的 `lastmod` 在介紹內容改動時更新）。
- `public/css/style.css`：樣式。開頭補了 `body{margin:0}`、`[hidden]{display:none!important}`，原本由 Artifact 外殼提供；少了後者 `.ov` 的 `display:flex` 會蓋過 `hidden`，彈窗關不掉。
- `public/js/*.js`：遊戲本體，拆成七個原生 ES modules（見「程式碼地圖」），由 `public/index.html` 以 `<script type="module" src="js/main.js">` 載入；無建置步驟、遊戲邏輯沒有外部 JS 相依。瀏覽器不允許從 `file://` 載入模組，一定要用本機伺服器開。頁面另外從 Google Fonts 載字型，並在 `public/index.html` 載入 Google Analytics（gtag.js）做流量統計。遊戲事件由 `state.js` 的 `track()` 送出（沒有 `gtag` 時不動作，node 工具不受影響）：`game_start`（開局確認，週一調整不送）、`day_reached`（開局送第 1 天，之後每天開工送一次）、`game_end`（月底結算，多帶 `score`、`grade`）。每個事件都帶 `game_version`（`data.js` 的 `GAME_VERSION`，部署時 `pages.yml` 把 `'dev'` 換成短 commit hash，sed 沒換到就讓部署失敗）、`game_mode`、`companies`（如 `laravel+rust`）、`slots`（單線為 1）、`advanced`、`outsource`、`day`。看玩家玩到第幾天：GA4 依 `day` 統計 `day_reached` 的使用者數；`day`、`game_mode` 等參數要先在 GA 管理後台註冊成事件範圍的自訂維度才看得到。事件規則以 `docs/spectra/specs/play-analytics/` 為準（Spectra change `gh-10-01-play-analytics`），`tools/check.js` 有對應斷言。訂閱與解決工單的選擇另外送（Spectra change `gh-14-01-choice-analytics`，#14）：`subscription`（開局每家有訂閱的送一筆 `vendor`、`plan`，都沒有送一筆 `none`；週一只送有改的那幾家，開局順序是 `game_start`→`subscription`→`day_reached`）、`dispatch`（agent 開跑時：`vendor`、`model`、`bill`、`review`、`effort`、`via`＝panel／quick／batch、`preset`、工單的 `cx`、`stack`、`incident`、`sensitive`、`gig`、`merge`）、`job_result`（`settle` 時：同樣的選擇參數加 `cx`、`stack`、`gig`、`outcome`＝aborted／quota／conflict／rejected／caught／success／trap_stop／fail、`tokens`（k）、`cost`（NT$）、`hours`）、`manual_fix`（`outcome`＝success／fail／trap、`unfamiliar`、`hours`）、`evaluate`（`cx` 送評估前看到的原估，Spectra change `gh-15-01-evaluate-shown-cx`；`outcome`＝found／clear／quota）、`rescope`（approved／refused）、`invest`（`investment`、`stack`）。被擋下的動作不送。GA 後台要把 `vendor`、`plan`、`model`、`bill`、`review`、`effort`、`via`、`preset`、`cx`、`stack`、`incident`、`sensitive`、`gig`、`merge`、`outcome`、`unfamiliar`、`investment` 註冊成事件範圍自訂維度，`tokens`、`cost`、`hours` 註冊成自訂指標。本機用 `python3 -m http.server -d public 8000` 開。
- `tools/sim.js`：平衡模擬器。`node tools/sim.js` 會 import 遊戲模組，用假 DOM（`tools/fake-dom.js`）跑自動玩家（兩種模式 × 四家公司 × 三種審核等級，每組預設 100 局，`SIM_N=60` 可調；`SIM_TRAP=0` 可關掉陷阱題做對照，`SIM_SLOTS=2..6` 指定平行模式工作槽數，`SIM_INVEST=1` 讓自動玩家做工程投資（`SIM_INVEST=2` 再加買三項新投資，`SIM_INV_EXTRA=monitor,scan` 之類可只加買指定幾項），`SIM_COMBOS=1` 改跑六種雙選組合，`SIM_OUTSOURCE=1` 開啟接外包（外包單一律走個人 API），`SIM_EFFORT=1` 開啟進階模式並讓自動玩家挑推理強度，`SIM_SEATS=1..3` 在第 6、11、16 天直接給團隊席位（量上限用，不經信任審核）並讓自動玩家優先刷席位，`SIM_SEED=<整數>` 用固定種子取代 `Math.random`、輸出可逐字重現，由 `tools/seed.js` 在遊戲模組載入前裝好），印出抽樣與每個「模式 × 公司」的平均分、對照同模式 Laravel 的差距和評等分布。改數值後跑一次確認不會壞、沒有明顯失衡。
- `tools/check.js`：規則檢查。`node tools/check.js` 把 spec 裡的範例數字逐條斷言（技術線分布、成功率、時間倍率、手寫時數、上架審核、KPI 補償、最高分 key、難度標示、接外包、GA 遊戲事件、存檔，以及十份核心規則 spec 的情境），任何一條不符就以非 0 結束。改規則時同步更新。

部署：push 到 `main` 後 `.github/workflows/pages.yml` 把 `public/` 發佈到 https://token-not-enough.youareright.app/ 。只有 `public/` 會公開。自訂網域設在 repo 的 Pages 設定（用 Actions 部署時 `CNAME` 檔不會生效），DNS 是 Cloudflare 上 `youareright.app` 的 CNAME `token-not-enough` → `fripig.github.io`（DNS only），舊網址 `fripig.github.io/token-not-enough/` 會轉址過來。

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
   → 開局選 2–6 個工作槽，不加新代價，用模擬器量測。設計紀錄在 Spectra change `parallel-slots`。
12. 「工作類別可以改成多選嗎」→ 開局公司（主技術線）可選 1–2 條，選到的平分 75% 工單。設計紀錄在 Spectra change `multi-stack-company`。
   同時提出「可以加上外包類別 token只能自己出」：決定另開 change，做成開局可勾選的類別、只能用個人付費、做完給錢不給 KPI、逾期扣錢不扣信任；是否佔用 1–2 條名額待提案時確認。
   → 做成獨立的「接外包」開關，不佔名額。設計紀錄在 Spectra change `outsource-gigs`。
11. 「目前玩得有點痛苦 能有何機制能增加趣味但是又符合遊戲精神呢」（痛點：每張單都要重選一輪、整局只有越來越緊）、「投入ＳＤＤ也放上去」
   → 派工方案（一鍵派工）＋工程投資（CLAUDE.md、補測試、skills、MCP 文件、SDD）。設計紀錄在 Spectra change `dispatch-presets-and-investments`。
13. 「新增可選的進階模式 可以選擇更細的model」、「推里強度也會導致工作變慢」
   → 開局可勾選「進階模式」，派工台多一個推理強度（低／中／高）旋鈕，模型清單不變；高強度能力 +1 但 token 變多、工作變慢。最高分不分開。設計紀錄在 Spectra change `reasoning-effort`。
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

介面文字一律繁體中文（台灣用語）。Laravel 線的工單以新聞網站後台的日常工作為題材，其他技術線的工單也維持同樣「具體、短」的語氣。

## 遊戲規則與數值

所有價格、額度、能力值都是遊戲平衡用的虛構數字，不是各家真實方案；頁面底部有聲明，保留它。

2026-10-09 拿掉平行 token 加成之前量的平衡表（技術線、陷阱、雙選、外包、推理強度、工程投資、席位、合併衝突）都是在有 token 加成時量的；拿掉後平行模式平均分差在 ±2% 內，舊表照留、沒有重測。

v1 核心規則的需求以 `docs/spectra/specs/` 下這十份 spec 為準（Spectra change `gh-09-01-core-rules-specs`）：`work-calendar`（時間與資源、週一調整訂閱）、`agent-catalog`（廠商與模型、派工台選模型）、`billing-methods`（付費方式、透支、資安稽核）、`client-restrictions`（案主與中國模型限制）、`ticket-lifecycle`（工單產生、完成、失敗、手寫、逾期）、`dispatch-outcome`（成功率、token、時間、結算）、`self-review`（自我審核）、`game-modes`（單線／平行模式）、`random-events`（隨機事件）、`month-end-scoring`（結算與評等）。後來加入的功能各有自己的 spec，核心公式裡跟它們有關的係數只寫「見某某 spec」，同一條規則只在一份 spec 定義。這份文件保留數字與設計脈絡，spec 定義行為；改核心規則時用 Spectra change 的 delta spec 一起改，並更新 `tools/check.js` 裡對應的斷言。

### 時間與資源
- 20 個工作天，每週 5 天。週一重置每週額度，且可調整訂閱（升級只補剩餘週數差價，降級不退）。
- 每天 8 小時（平行模式顯示成 9:00–17:00 時鐘）。
- 起始：個人錢包 NT$8,000、公司 API 預算 NT$12,000、主管信任 70、KPI 0。

### 廠商與模型（`VENDORS`）
每個模型有 `cap` 能力 1–5、`price` 每 1k token 的 NT$、`w` 吃訂閱額度的權重、`speed` 每單位複雜度的小時數、`verb` token 用量倍率；`ctx:true` 對「大型 codebase」工單有加成；`cn:true` 標記中國開源權重。

| 廠商 key | 名稱 / agent | 公司可走 API | 中國 | 模型 |
|---|---|---|---|---|
| anthropic | Claude Code | 是 | | Haiku 3、Sonnet 4、Opus 5、Fable 6 |
| openai | Codex CLI | 否 | | Luna 3、Sol 4、Astra 5 |
| google | Gemini CLI | 是 | | Flash 2、Pro 4（皆 ctx） |
| deepseek | Claude Code 接 DeepSeek API | 否 | 是 | Chat 3、Reasoner 4，無訂閱 |
| zhipu | Claude Code＋GLM Coding Plan | 否 | 是 | GLM Air 3、GLM 4 |
| moonshot | Kimi CLI | 否 | 是 | K2 4 |
| local | OpenCode＋本地 GPU | — | Qwen 是 | Qwen Coder 32B 3（cn 權重）、Gemma 27B 3（比 Qwen 慢，政府標案可用）、gpt-oss 20B 2 |

- OpenAI 的模型照 GPT-6 家族命名，名稱不帶「GPT-6」，id 沿用 `mini`／`std`／`high`（存檔、派工方案、GA 的 `model` 都送 id）。實際的價格比例 Luna : Sol : Astra 約 1 : 20 : 100（第三方轉述的官方價，每百萬輸入 token $0.10／$2／$10），遊戲裡刻意壓縮：Luna 能力 3，但比 DeepSeek Chat 貴（0.15 對 0.03）、一樣慢（0.7），賣點是沒有案主禁它；Astra 跟 Opus 同型（貴、`w` 3、不特別慢）。原本的最高階模型是照推理模式設的（跟中階同價、慢、token ×1.8），跟進階模式的推理強度重複，改成 Astra 後拿掉。

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
- Anthropic 的模型照 Claude 5 家族：Claude API 的官方價（每百萬輸入 token）Haiku 5.5 $0.10、Sonnet 5.5 $2、Opus 5.5 $4、Fable 5.1 $10，跟 GPT-6 的 Luna、Sol、Astra 同價位。遊戲裡 Haiku 跟 Luna 同一套（能力 3、0.15、速度 0.7，`w` 0.3、token 倍率 0.9 照舊）；Opus 0.9、`w` 2（Sonnet 的 2 倍）；Fable（id `fable`）能力 6、1.8、`w` 4、速度 1.2、token 倍率 0.85，是唯一能力 6 的模型（高強度到 7），複雜度 5 的工單成功率 95%（Opus 80%）。能力條畫實心點到能力值、空心點補到 5 格，所以 Fable 顯示 6 顆實心點。spec 例子原本拿 Haiku 當能力 2 的模型，改用 Gemini Flash。

  Haiku 實測（2026-10-10，`SIM_N=100`，每格 300 局，跑兩次；`SIM_HAIKU=1`＝DeepSeek 被禁、又沒用席位時改派 Haiku 不派 Sonnet，付費方式照 Sonnet 的規則，相對同一份程式碼的預設自動玩家）：

  | 模式 | Laravel | Rails | Rust | App |
  |---|---|---|---|---|
  | 平行 | +2.4% / +2.9% | +5.0% / +4.1% | −5.3% / −4.6% | +4.4% / +1.7% |
  | 單線 | +0.3% / −0.8% | −3.8% / +0.6% | −30.7% / −28.0% | −3.0% / +2.6% |

  跟派 Sonnet 大致打平，Rust 因為 borrow checker 對能力 <4 扣分而明顯較差；平行模式沒有一格兩次都超過 +5%，沒有調。Haiku 權重只有 0.3，多半在 Anthropic 訂閱額度內用完。Opus 降價、Fable 都沒有自動玩家會派，沒有量。
- 訂閱方案在各廠商的 `plans`，有 `day`/`week` 額度（單位 k token × 模型 `w`）。
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
- 複雜度 1–5，越後期越難；`BASE[cx]` 為基準 token，`KPI[cx]` 為獎勵。
- 屬性：技術線 `stack`、事故（當天到期、KPI ×1.6）、機敏、大型 codebase、案主、到期日、上架審核 `store`。
- 逾期：扣 KPI 一半、信任 −4（事故 −8，有監控告警時 −4）。
- 每日進件：第 1 天 4 張一般工單；之後每張新工單是事故單的機率 `incRate(day) = min(INC_RATE, INC_RAMP × (day − 1))`（`INC_RATE = 0.12`、`INC_RAMP = 0.03`），也就是第 2 天 3%、第 3 天 6%、第 4 天 9%，第 5 天起 12%。讓玩家第一週有時間存預算、買監控告警；少掉的事故單不在後面補回。

  實測（2026-10-09，`SIM_N=100`，每格 300 局，跑兩次；改動前一律 12%、流量暴增不限天數）：平行 Laravel 8,376／8,289 → 8,417／8,150（−0.6%）、Rails −0.9%、Rust +0.1%、App −0.2%，都在雜訊內；單線 Laravel 2,720／2,830 → 2,930／2,934（+5.7%）、Rails +3.2%、Rust +9.0%、App +3.3%。不設目標、沒有調數值，照實記錄。

### 公司與技術線（`STACKS`、`COMPANIES`、`pickStack`）
- 開局在 `showSetup` 選 1–2 家公司（主技術線），存在 `S.companies`，固定照 laravel、rails、rust、app 的順序（`normCompanies`；跨 `fresh()` 保留；舊版存的單一字串視為只選一條；不合法退回 `['laravel']`）。選滿兩條時其他按鈕停用，最後一條不能取消（`toggleCompany`）。週一調整訂閱時不能換公司。開局換選擇會用 `firstIssues()` 重抽第 1 天的工單。公司名稱用 `companyName()` 以「＋」串起來（標頭、開局說明、紀錄、結算標題）。
- 一般工單：75% 平分給選到的主技術線、15% 前端（`fe`）、10% 平分給沒選的公司技術線。事故單從選到的主技術線平均抽。
- 不熟的技術線（沒選到也不是 `fe`）：自己手寫時數 ×2（`manualHrs`），卡片顯示「不熟」。
- 技術線效果只看技術線本身的特性（`stackGap`、`stackHrs`），不替各家模型設「誰比較會 Rust」的分數：

| 技術線 | 成功率 | 執行時間 | 其他 |
|---|---|---|---|
| laravel、rails | 複雜度 ≤3 時能力差 +1（框架慣例） | — | — |
| rust | 能力 <4 的模型能力差 −1（borrow checker） | ×1.2 | 期限 +1 天、KPI ×1.3 |
| app | — | ×1.15 | 期限 +1 天、KPI ×1.3；複雜度 ≥2 的工單 40% 需上架審核，agent 成功後仍有 20% 被退件（有上架自動化 10%），自我審核救不回來 |
| fe | — | — | — |

- token 用量不受技術線影響。派工台顯示的成功率已含技術線效果（需上架審核的工單 ×0.8），並在下方顯示技術線提示（`stackHint`）。
- 公司按鈕的難度標示（`STACKS[k].level`）：Laravel、Rails ★，App ★★，Rust ★★★。雙選不另外標組合難度。

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
- 派工時（`makeJob`）沒曝光的陷阱照真實複雜度擲骰：模型能力 ≥ 真實複雜度就硬做完（token、時間、成功率都按真實值，紀錄「原來牽扯到架構，硬做完了」）；能力不夠就花 `TRAP_STOP = 0.4` 倍的真實 token 與時間後停下來、算失敗、tries +1，自我審核救不了。
- 自己手寫沒曝光的陷阱：花掉顯示複雜度的手寫時數後曝光，工單留在佇列。
- 曝光（`reveal`）：`shownCx` 記原估，`cx`／`base` 換成真實值，卡片顯示「牽一髮動全身・原估 N」。之後的預估與技術線效果都用真實複雜度。
- 評估架構（`evaluate`）：非事故、未評估、未曝光的工單可用。花 `EVAL_TK × M.verb`（40k × token 用量倍率）token，走 `charge` 扣款，加上 `0.5h × M.speed` 工時（平行模式會推進時鐘）。識破率 `min(0.95, 0.35 + 0.15 × cap)`。沒識破和一般工單一樣顯示「已評估」。額度不夠時中斷、不算已評估。評估時 agent 一樣會讀程式碼，所以機敏工單走個人訂閱或個人 API 時，和派工一樣要擲資安稽核（`auditRoll`）；刷公司 API 造成的透支也當下處罰（`checkOverdraft`）。
- 找主管重新評估（`rescope`）：曝光後每張一次。信任 ≥ `RESCOPE_TRUST`（50）：信任 −5、KPI 改成 `KPI[真實複雜度]`（含技術線 ×1.3）、期限 +2 天（上限第 20 天）；否則信任 −3、其他不變。
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

### 成功率（`est`）
依 `cap - cx`（再加技術線的能力差修正）：≥1 → 95%、0 → 80%、−1 → 50%、−2 → 25%、更低 10%；大型 codebase 對 ctx 模型 +8%、對弱模型 −8%。失敗後重做的 token 與時間會打折。

### 付費方式（`bills`、`settle`）
- 個人訂閱／公司席位：扣額度，額度不夠時 agent 停在一半（失敗）。
- 個人 API：扣個人錢包。
- 公司 API：扣公司預算；單日超過 NT$1,500 信任 −6；透支信任 −8。
- 本地：免費但很慢。平行模式下本地 GPU 一次只能跑一個 agent（`localBusy`），跑的期間（含過夜）不能再派本地、不能用本地評估架構，也不能自己手寫（電腦被吃滿）。單線模式不受影響。
- 機敏工單走個人訂閱或個人 API：35% 被稽核（信任 −12），中國廠商 60%；有 secret scanning 時減半（17.5%／30%）。
- 外包單不能用公司 API 和公司席位（見「接外包」）。

### 案主與中國模型限制（`CLIENTS`、`banOf`、`cnBlock`）
- 內部專案、新創客戶：無限制。外包單的「外包案主」也無限制，而且不受全公司禁令影響。
- 金融客戶（`ban:'api'`）：禁止中國雲端，本地 Qwen 可用。
- 政府標案（`ban:'all'`）：連中國開源權重也禁。
- 事件「全公司暫停中國雲端」（第 8 天後才會觸發）設 `S.cnBan`，之後所有工單至少等同 `'api'`。
- 被禁的模型按鈕 disabled 並顯示原因；選取中的模型被禁時自動切到第一個可用的。

### 平行模式（`S.mode==='parallel'`）
- 工作槽數開局選 2–6 個（`SLOT_CHOICES`，預設 3，存在 `S.slots`，跨 `fresh()` 保留，不合法退回 3；週一不能改）。派工花 0.2h，agent 在背景跑；「等 1 小時」「等到下一個完成」推進時鐘（`advance`）。
- 每個 agent 各自有 context，同時跑幾個都不影響單張的 token 用量（2026-10-09 前有 `parMul() = 1 + 0.15 × 正在跑的數量` 的 token 加成，`gh-12-01-parallel-review-load` 拿掉）。
- 完成時合併衝突機率 = 0.1 × 其他還在跑的數量（CI 流水線減半）。衝突不算失敗：原單原地變成「解決衝突：<原標題>」工單（`merge:true`），複雜度 max(1, 原複雜度 − 1)、基準 token 照新複雜度重抽，技術線、案主、機敏、事故、到期日、KPI、上架審核照舊；那次派工的 token 照扣，不花審 PR 時間。玩家可以重新選怎麼解（任何派工方式或自己手寫），KPI 等它完成才拿，到期沒解完照一般逾期扣分。解決衝突工單不會再衝突、不是陷阱、不能評估架構或找主管重新評估，卡片顯示「合併衝突」。設計紀錄在 Spectra change `merge-conflict-resolve`。
  實測（2026-10-09，`SIM_N=100`，每格 300 局，兩次平均；改動前是「衝突算失敗、重做 token ×0.4」）：Laravel 8,176 → 8,465（+3.5%）、Rails 8,167 → 8,449（+3.5%）、Rust 7,903 → 8,425（+6.6%）、App 8,438 → 8,962（+6.2%）。門檻是 ±15%，沒有調數值；工作槽數表沒有重測。
- 成功後要審 PR：`cx × 0.2` 小時（有審核時減半，有 pre-commit hook 再減半），再乘上切換成本 `reviewLoad() = 1 + REVIEW_LOAD × 其他還在跑的數量`（`REVIEW_LOAD = 0.25`；同一步一起做完的不算還在跑；`prHrs`）。派工台提示照當下在跑的數量預告倍率，開局工作槽按鈕顯示「審 PR 最多 ×」。
  實測（2026-10-09，`SIM_N=100`，每格 300 局，跑兩次）：平行 Laravel 8,404／8,382 → 8,403／8,397、Rails 8,372／8,453 → 8,300／8,330、Rust 8,292／8,311 → 8,270／8,414、App 8,958／8,967 → 8,906／8,787，都在 ±2% 內（目標 ±10%），0.25 沒有調。單線模式不受影響。自動玩家能用就派 DeepSeek Chat、不能用才派 Sonnet，token 加成對它的分數本來就影響不大，所以這組數字不代表重度使用 Opus 的玩家。
- 下班時跑到 17:00，剩下的過夜（剩餘時間 −3h）；到期沒跑完或廠商當機會被中止，已用 token 照算。
- 每天新工單 3–6 張（單線 2–4），評等門檻 ×1.6。結算標題顯示「平行模式（N 個 agent）」。最高分不分工作槽數。
- 工作槽數沒有額外代價，取捨只靠審 PR 切換成本與合併衝突。實測（2026-10-09 審 PR 切換成本上線後，`SIM_SLOTS=N SIM_N=100`，每格 300 局，平行模式平均分）：

| 公司 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|
| Laravel | 6,435 | 8,373 | 8,914 | 9,157 | 9,310 |
| Rails | 6,493 | 8,332 | 8,992 | 9,141 | 9,121 |
| Rust | 5,882 | 8,407 | 9,366 | 9,594 | 9,739 |
| App | 6,340 | 8,931 | 9,744 | 10,018 | 10,246 |

  越多越好，4 個以後增幅只剩約 0–3%，6 個是微幅最佳解，評等門檻沒有跟著調；和 token 加成時期的量測（同一天同程式碼基準：Laravel 6,602／8,431／9,030／9,260／9,248）差在雜訊內，切換成本沒有讓多開變成明顯虧本。如果要讓多開有明顯代價，可以再調高 `REVIEW_LOAD` 或讓評等門檻隨工作槽調整。

### 派工方案（`S.presets`、`presetBlock`、`presetFor`、`quick`）
- 三組方案 A／B／C，各存廠商、模型、付費方式、審核等級、推理強度（`ef`，0／1／2）。預設三組都是中強度；舊方案沒有 `ef` 時補成中，`ef` 不是 0–2 就三組退回預設。一般模式下方案存的強度不生效；進階模式下強度不是中的方案，載入按鈕標籤會顯示「高強度／低強度」。預設 A：DeepSeek Chat＋個人 API＋自審；B：Sonnet＋公司 API＋自審；C：Opus＋公司 API＋嚴格審核。跨 `fresh()` 保留，有任何一組不合法就三組都退回預設（`presetsOf`）。不存 localStorage。
- 派工台可「載入方案」（`loadPreset`）與「存成方案」（`savePreset`）。
- 工單卡片下方的「一鍵派工」照 A→B→C 用第一個能用的方案。不能用的原因依序：今日當機、案主禁用（`cnBlock` 文字）、付費方式不能用（帳單註記，或「沒有公司席位」）、本地 GPU 忙、額度不夠（預估上限 × w 超過剩餘額度）、錢包不夠（預估上限超過錢包）。卡片顯示第一個被略過的方案和原因，紀錄寫出所有略過的方案。工作槽滿或剩不到 0.2h 時停用；三組都不能用時顯示「沒有可用方案」。
- 機敏工單不會因為個人付費而跳過方案，卡片改顯示稽核機率。

### 工程投資（`INVEST`、`invest`、`investBlock`、`batch`、`invHint`）
花自己的工時加公司 API 預算（計入當日公司花費與月底公司帳單），效果維持到月底，每局歸零。平行模式下投資會推進時鐘，背景 agent 照跑（期間有 agent 完成時，審 PR 的時間另外加上去）；本地 GPU 忙也能投資。

| 投資 | 工時 | 公司預算 | 效果 |
|---|---|---|---|
| 寫 CLAUDE.md（每條技術線各一次，含前端） | 3h | NT$300 | 該技術線 token ×0.85（`MD_TK`）、成功率 +0.06（`MD_P`） |
| 單元測試 | 4h | NT$400 | 自我審核抓錯率 +0.10（`TEST_CATCH`，上限 0.95） |
| CI 流水線 | 3h | NT$300 | 平行模式合併衝突機率減半 |
| pre-commit／lint hook | 2h | NT$200 | 平行模式審 PR 時間 ×0.5（`HOOK_PR`），和自我審核的減半疊加；單線模式沒有審 PR 時間 |
| secret scanning／脫敏 | 3h | NT$300 | 機敏工單走個人訂閱或個人 API 時，稽核機率 ×0.5（`SCAN_AUDIT`），派工與評估架構都算 |
| 上架自動化（fastlane） | 3h | NT$400 | App Store 退件機率 0.2 → 0.1（`FASTLANE_REJECT`、`storeReject`），派工台成功率與提示一起改 |
| 監控告警 | 3h | NT$400 | 之後產生的事故單期限延到隔天（上限第 20 天），KPI 的事故加成 ×1.6 → ×1.2（`MONITOR_KPI`）；已在佇列的事故單不變。事故單逾期扣信任 8 → 4（`MONITOR_LATE`，逾期當下判斷，買之前進來的也算） |
| 做 skills | 3h | NT$400 | 解鎖「批次派工」：依佇列順序把顯示複雜度 ≤2 的工單一鍵派出，沒有可用方案的略過 |
| 接 MCP 文件 | 3h | NT$400 | 評估架構識破率 +0.2（`MCP_REVEAL`，上限 0.95）、評估時間減半 |
| 導入 SDD | 6h | NT$500 | 每次派工 token ×1.1（`SDD_TK`）；真實複雜度 ≥3 成功率 +0.08（`SDD_P`）；能力不夠的隱藏陷阱只燒 0.15（`SDD_TRAP_STOP`），紀錄寫「寫規格時就發現」。不影響評估架構 |

成功率加成在 clamp 到 0.05–0.97 之前加上。面板順序照 `INV_KEYS`。派工台會用一行提示列出對這張工單生效的投資（CI、hook 只在平行模式，secret scanning 只在機敏單，fastlane 只在需上架審核的單，監控告警只在事故單）。補測試在 `gh-08-01-more-investments` 拆成單元測試（沿用 `S.inv.tests`）與 CI 流水線（`S.inv.ci`）。結算多一行「工程投資 N 項」。

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

### 接外包（`S.outsource`、`makeGig`、`addGigs`、`GIG_PAY`、`GIG_LATE`、`gigBlocked`、`reward`）
- 開局彈窗有「不接外包／接外包」（`data-out`），不佔主技術線名額，預設不接，跨 `fresh()` 保留，不是布林值就退回不接；週一調整不顯示。開局只切這個開關時不重抽公司工單，只加上或拿掉第 1 天的外包單。
- 開了之後第 1 天和之後每天額外 0–2 張外包單（`addGigs`）。外包單（`out:true`）的技術線從 laravel、rails、rust、app、fe 平均抽，沒選的非前端技術線一樣算不熟；不會是事故、不機敏，可能是陷阱；案主是「外包案主」（沒有禁令），全公司禁中國雲端也不管它，卡片不顯示「禁中國雲端」。複雜度、期限、Rust／App 補償、上架審核照一般規則。
- 只能自己付：公司 API 和公司席位（任何一家）停用並顯示「外包不能用公司資源」（`GIG_NOTE`），一鍵派工、批次派工會略過刷公司錢的方案；`dispatch()`、`evaluate()` 遇到這種付費方式直接不動作。
- 報酬 = KPI × `GIG_PAY`（80）。完成（agent 或自己手寫，都走 `reward`）時錢進個人錢包、記入 `S.st.outIncome`，不加 KPI、不動信任。逾期賠報酬的 `GIG_LATE`（30%，四捨五入），不扣 KPI 與信任，不算進一般逾期張數。
- 合併衝突留下的「解決衝突」單仍是外包單，報酬不變。工程投資照常生效。不能找主管重新評估。
- 卡片顯示「外包」標籤，KPI 位置改顯示報酬。結算的個人花費 = 訂閱費 + 個人 API + 外包違約金 − 外包收入；開外包時多四行：外包收入、外包違約金、外包完成、外包逾期。

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

目標是平行模式 −5%～+15%。報酬 100 時平行有兩格超過 +15%，使用者選了 80，每日張數沒調。總分公式對「8000 − 個人花費」只設下限、沒有上限，外包收入會直接加分，所以靠 `GIG_PAY` 控制。單線模式的自動玩家照佇列順序硬接外包單，排擠公司工單，所以全部變差；單線不設目標，照實記錄。

### 推理強度（進階模式，`S.advanced`、`sel.ef`、`EFFORT`、`effModel`、`efOf`）
- 開局彈窗有「一般／進階」（`data-adv`），預設一般，跨 `fresh()` 保留，不是布林值就退回一般；週一調整不顯示；只切這個開關不重抽第 1 天工單。最高分 key 不分一般／進階。
- 進階模式下派工台在自我審核下方多一排「推理強度」（`data-ef`），選擇存在 `sel.ef`，跨 `fresh()` 保留。一般模式不顯示，`efOf()` 一律當中強度。
- `effModel(M, ef)` 把強度套在選到的模型上，`est` 用調整後的模型算成功率、抓錯率、token 與時數，派工、陷阱硬做判斷、扣款與紀錄名稱都跟著走：

| 強度 | 能力 | token | 執行時間 |
|---|---|---|---|
| 低 | −1（下限 1） | ×0.7 | ×0.8（變快） |
| 中 | 原本的模型 | ×1 | ×1 |
| 高 | +1（不設上限，Opus 會到 6） | ×1.5 | ×1.4（變慢） |

- 每 1k token 價格與訂閱權重 `w` 不變。強度不是中時，紀錄的模型名稱寫成「Sonnet・高強度」。
- `est` 裡「能力高於複雜度時 token ×0.85」的折扣看原本模型的能力，所以高強度的 token 剛好是中強度的 1.5 倍。
- 評估架構（`evalCost`、`revealRate`）與自己手寫不受強度影響。

平衡實測（2026-10-09，`SIM_N=100`，每格 300 局，跑兩次；`SIM_EFFORT=1` 平均分 ÷ 預設平均分，減 1）。自動玩家依選到模型的原始能力減顯示複雜度挑強度：≤ −1 用高、≥ 2 用低，其他用中。

| 公司 | 平行 | 單線 |
|---|---|---|
| Laravel | −0.0% / +1.5% | −12.9% / −10.3% |
| Rails | −1.4% / −2.9% | −12.9% / −15.0% |
| Rust | +5.7% / +7.8% | +5.0% / +0.8% |
| App | −2.6% / −1.3% | −9.6% / −11.4% |

目標是平行模式 −5%～+15%，第一版倍率就落在範圍內，沒有調。單線模式完全受工時限制，高強度變慢反而虧（Rust 例外，因為 borrow checker 對能力 <4 的扣分被高強度補回來），不設目標，照實記錄。

### 自我審核（`REVIEW`、`catchRate`）
| 等級 | token | 時間 | 抓錯率 |
|---|---|---|---|
| 不審核 | ×1.0 | ×1.0 | 0 |
| 自審 | ×1.3 | ×1.2 | `0.45 + 0.08 × cap` |
| 嚴格審核 | ×1.6 | ×1.35 | 自審 +0.2，上限 0.95 |

- 是否失敗、是否被抓到在 `makeJob` 派工當下就擲骰決定。
- 抓到：多花 25% token、工單直接成功、`S.st.caught++`。
- 審核救不了額度用盡、時間不夠；審核抓到錯誤之後仍可能合併衝突，照樣留下解決衝突工單。
- 畫面顯示的成功率是 `pe = p + (1-p) × c`，並附原始機率。

### 隨機事件（`EVENTS`，每天 55% 機率抽一個）
API 降價 30%、廠商當機一天、公司預算凍結 −30%、訂閱額度縮水 20%、流量暴增（兩張事故單；第 6 天前抽到只顯示「新聞流量比平常高一點」，沒有效果，理由見「工單」的每日進件）、主管稱讚或質疑、外包尾款 +NT$1,500、全公司禁中國雲端。

### 結算（`showEnd`）
總分 = KPI × 10 + 信任 × 4 + (8000 − 個人花費) ÷ 8（下限 −4000 ÷ 8）− 稽核次數 × 80。個人花費 = 訂閱費 + 個人 API + 外包違約金 − 外包收入。
評等 S/A/B/C/D 門檻 4600/3800/3000/2200（平行模式 ×1.6）。最高分依「模式 × 選到的技術線」存在 `localStorage` 的 `tokgame-best-<mode>-<a>+<b>`（`bestKey()`；單選就是原本的 `tokgame-best-<mode>-<company>`）；只選 Laravel 且沒有新 key 時沿用改版前的 `tokgame-best-<mode>`。稱號依花費結構判定（資安常客、自費勇者、公司帳單頭號人物、對岸模型省錢達人、地端信仰者、手工藝工程師、Token 精算師）。

### 存檔（`SAVE_KEY`、`SAVE_VER`、`saveGame`、`readSave`、`loadGame`、`clearSave`、`boot`）
規則以 `docs/spectra/specs/save-game/` 為準。
- 只存一格，`localStorage` 的 `tokgame-save`，內容是 `{ver, S, sel, uid, morning}`。`morning` 是當天早上報告彈窗的內容（`showDay` 的 `rep`、`ev`、`monday`），第 1 天是 `null`；隨機事件的文字不在紀錄裡，所以要一起存。
- 只在兩個時間點存：開局確認（開始第 1 天）之後、`endDay` 換到新的一天之後（開早上報告之前）。白天的動作、週一調整訂閱都不存，所以重新整理會回到當天早上，可以重骰當天，這是使用者選的。第 20 天下班直接結算、不存。
- 開頁由 `main.js` 的 `boot()` 決定：有能用的存檔開 `showResume`（第 N 天・公司・模式，繼續／開新局），存檔不能用就刪掉並開 `showBadSave`，都沒有就 `start()`。繼續會把 `S`、`sel`、`uid` 換成存檔的，第 2 天以後再開一次早上報告，不送 GA 事件。
- `start()`（開新局、再玩一個月）和 `showEnd` 都會刪掉存檔。讀檔的局照常記最高分。
- 能用的條件：JSON 解析得了、`ver === SAVE_VER`、第 1–20 天、`issues`／`jobs`／`companies`／`log` 是陣列、`uid` 是非負整數、`morning` 是 `null` 或有 `rep` 陣列、每個跑著的 job 的工單都在佇列裡。跑著的 job 和佇列裡的工單是同一個物件，`readSave` 會依 id 重新接上。
- **`SAVE_VER` 是存檔結構版本，跟 `GAME_VERSION` 無關**：只改數值不用動；`S`、`sel`、工單或 job 的欄位改到舊存檔讀進來會出錯時（新增沒有預設值的欄位、改名、改意義），`SAVE_VER` 要加 1，舊存檔就會被丟掉並提示。

## 程式碼地圖（`public/js/`）

| 模組 | 內容 |
|---|---|
| `main.js` | 入口：`app` 上的事件委派（用 `data-*` 屬性分派）、開局，載入時呼叫一次 `boot()`：`firstIssues`、`start`、`boot` |
| `data.js` | 資料與工具函式，沒有狀態：`GAME_VERSION`、`VENDORS`、`SUBV`、`APIV`、`objOf`、`CLIENTS`、`pickClient`、`banOf`、`cnBlock`、`SEAT`、`BASE`、`KPI`、`STACKS`、`COMPANIES`、`normCompanies`、`companyName`、`bestKey`、`rnd`、`kt`、`h1`、`vc`、`model`、`EFFORT`、`effModel`、`efOf`、`planOf`、`PN`、`DEFAULT_PRESETS`、`BILL_LABEL`、`validPreset`、`presetsOf`、`INVEST`、`MD_TK`、`MD_P`、`TEST_CATCH`、`MCP_REVEAL`、`SDD_TK`、`SDD_P`、`SDD_TRAP_STOP`、`INV_KEYS`、`HOOK_PR`、`SCAN_AUDIT`、`FASTLANE_REJECT`、`MONITOR_LATE`、`MONITOR_KPI` |
| `state.js` | `S`（全部遊戲狀態，`fresh()` 初始化）、`sel`（派工台目前選擇）、工單編號、陷阱比例、工單產生、GA 事件、存檔：`S`、`sel`、`uid`、`nextId`、`resetIds`、`fresh`、`track`、`SAVE_KEY`、`SAVE_VER`、`saveGame`、`clearSave`、`readSave`、`loadGame`、`pickStack`、`TRAP_RATE`、`setTrapRate`、`hardStack`、`unfamiliar`、`makeIssue`、`GIG_PAY`、`GIG_LATE`、`GIG_STACKS`、`GIG_CLIENT`、`makeGig`、`addGigs` |
| `calc.js` | 計算（`est(is, v, mid, rv, ef)` 會套推理強度）：`quotaLeft`、`useQuota`、`REVIEW`、`catchRate`、`conventional`、`STORE_REJECT`、`storeReject`、`stackGap`、`stackHrs`、`stackHint`、`localBusy`、`manualHrs`、`est`、`GIG_NOTE`、`gigBlocked`、`bills`（`bills(v, is)`，傳工單才會套外包限制）、`costLine`、`presetBlock`、`presetFor`、`log` |
| `actions.js` | 動作（`settle` 是結算與成敗的地方；`charge` 是派工與評估共用的扣款）：`PAR`、`queueOrder`、`SLOT_CHOICES`、`clock`、`TRAP_STOP`、`hiddenTrap`、`trueView`、`reveal`、`makeJob`、`RV_ID`、`jobChoice`、`dispatch`、`canQuick`、`quick`、`loadPreset`、`savePreset`、`conflictRate`、`REVIEW_LOAD`、`reviewLoad`、`prHrs`、`advance`、`cancelJobs`、`charge`、`auditRisk`、`auditOdds`、`auditRoll`、`checkOverdraft`、`reward`、`settle`、`wait`、`manual`、`EVAL_TK`、`canEvaluate`、`evalCost`、`revealRate`、`evaluate`、`RESCOPE_TRUST`、`rescope`、`invCount`、`investBlock`、`invest`、`batch`、`INV_STACKS`、`invHint`、`EVENTS`、`INC_RATE`、`INC_RAMP`、`incRate`、`endDay` |
| `view.js` | 畫面（`render` 整頁重繪成字串）與 DOM 節點 `app`／`ov`／`mo`：`app`、`ov`、`mo`、`render`、`quickBtn`、`invPanel`、`qbox`、`dispatchPanel` |
| `modals.js` | 彈窗（`showSetup` 含公司與模式選擇）與開局草稿 `draft`：`draft`、`planPicker`、`planCost`、`toggleCompany`、`showSetup`、`showDay`、`showResume`、`showBadSave`、`showEnd` |

模組規則：
- 每個頂層宣告都 `export`，各模組用到別的模組的名稱就具名 import。模組間允許循環 import，所以頂層只能宣告，不能在載入時呼叫別的模組的函式（`main.js` 最後的 `boot()` 除外）。
- `S`、`sel`、工單編號、`TRAP_RATE` 只有 `state.js` 能重新指定，其他模組用 `nextId()`／`resetIds()`／`setTrapRate()`；`draft` 只在 `modals.js` 裡改。改屬性（`S.day++`）不受限。
- `tools/check.js`、`tools/sim.js` 要先 import `tools/fake-dom.js`（sim 還要 `tools/seed.js`），再 import `public/js/main.js`，順序和瀏覽器一樣。

慣例：
- 畫面每次都整個重繪（`render()`），沒有框架。新增 UI 時沿用 `data-*` 加事件委派。
- 所有顏色走 CSS token（`:root` 加兩個深色區塊），淺色、深色都要顧；廠商色是 `--anth`、`--oai`、`--goog`、`--dsk`、`--glm`、`--kimi`、`--local`。
- 需要支援 400px 手機寬度。
- 新增廠商只要在 `VENDORS` 加一筆並補一個顏色 token；`S.subs`、`S.used`、統計都由 key 自動產生。
- 新增技術線：在 `STACKS` 加一筆（每個複雜度至少 3 個標題，含 `inc`），要當公司就加進 `COMPANIES` 並給 `level`；有特殊效果時改 `stackGap`／`stackHrs`／`stackHint`，再跑 `tools/check.js` 與 `tools/sim.js`。

## 已知狀況與可做的下一步

- 平行模式下「嚴格審核＋便宜的中國模型」明顯偏強。可以考慮讓嚴格審核佔用工作槽，或加重時間成本。
- `tools/sim.js` 的自動玩家很粗糙，不理會稽核和信任，所以模擬結果裡信任常常歸零。它只適合拿來確認不會壞、看大致趨勢；需要時可以改寫成更聰明的策略。
- 全部工程投資都買時（`SIM_INVEST=2`），平行模式 Rust、App 約 +21%～+27%，超過 +3%～+15%，使用者接受。拿 S 的比例約 98%，如果之後覺得平行模式評等失去意義，可以考慮評等門檻隨投資數調整。
- 多團隊席位只量了上限（見「時間與資源」的席位實測）：平行模式 −4.3%～+6.0%，在目標內；單線模式 +14.6%～+50.0%。第 2、3 個席位對這個自動玩家幾乎沒有額外效果，重度使用 Opus 的玩家還沒量。照真實規則（要顧信任）的增幅也沒量，因為自動玩家不顧信任。
- 單線模式下 Rust、App 公司明顯較難（見上方平衡實測），目前用難度星等交代；如果要拉近，可以考慮單線模式下這兩家每天少一張工單。
- 可能的擴充：Cursor／Copilot 這類多模型訂閱、prompt caching 折扣、用 Sonnet 寫再用 Opus 審的交叉審核、多人比分、更多技術線（例如 Go、Python 資料管線）。

## 框架重構評估

使用者的決定：等遊戲功能完整後，再判斷要不要導入前端框架或建置步驟。在那之前沿用現在的寫法（`render()` 整頁重繪成字串、`data-*` 事件委派、無建置步驟）。

到時候看這些訊號（記錄當下的實際數字再判斷）：
- `public/js/game.js` 的大小：加入技術線後約 580 行、加入陷阱題後約 645 行（2026-10-07 量測）、加入派工方案與工程投資後 776 行（2026-10-09 量測）、加入雙選公司與 OpenAI 席位後 791 行／62.8KB（2026-10-09 量測，平均每行約 79 字元，46 行超過 200 字元，行數低估了實際份量）。2026-10-09 依 Spectra change `split-game-modules` 拆成七個 ES modules（main 39, data 122, state 51, calc 81, actions 263, view 143, modals 139 行，共 838 行，含 import 行）；之後看最大的單一模組（目前 `actions.js`）。超過約 1,000 行、或常常要跨很遠的區塊改同一個功能時，拆模組的價值會浮現。
- `render()` 整頁重繪的成本：目前畫面量很小，沒有可察覺的延遲。如果加入動畫、拖拉或大量列表後出現卡頓或輸入框失焦，才是換成元件化渲染的理由。
- 狀態相關的 bug：`S`／`sel` 是全域可變物件。如果開始出現「畫面跟狀態不同步」「某個動作忘了 `render()`」這類 bug，代表需要更明確的狀態管理。
- 測試需求：目前用 `tools/check.js` 以假 DOM 驗規則就夠。若需要測 UI 互動、或規則檢查越來越難寫，就是導入測試框架與模組化的時機。
- 部署限制：GitHub Pages 只服務 `public/`；導入建置步驟時要改成在 workflow 裡 build 再上傳產物。
