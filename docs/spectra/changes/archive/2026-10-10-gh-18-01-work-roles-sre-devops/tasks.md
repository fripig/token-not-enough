## 1. 工作內容選單與新技術線資料

- [x] 1.1 Company selection at run start（design: UI text only; display names come from `STACKS[k].company`）：public/js/data.js 的 `STACKS` 名稱改成 Laravel 後端、Rails 後端、Rust 基礎設施、App 開發，新增 `sre`（SRE，level 2）與 `devops`（DevOps，level 2）兩筆，`COMPANIES` 變成 laravel, rails, rust, app, sre, devops；public/js/modals.js 的 `showSetup` 標籤改成「工作內容（可選 1–2 項）」，開局說明改成「你是工程師，負責「<names>」。」，註解裡的「公司」改成工作內容；識別子（`S.companies`、`data-company`、GA `companies`、`bestKey`、`SAVE_VER`）不動。Verify：tools/check.js 新增或更新斷言——六個按鈕與難度表（scenario "Difficulty labels"）、toggle 表、App 開發＋DevOps 固定順序、字串 sre 讀成只選 sre、Laravel 後端＋SRE 的開局說明、SRE＋DevOps 的 GA `companies` 為 sre+devops 與 best key；`node tools/check.js` 結束碼 0。
- [x] 1.2 Title pools（design: Title pools）：sre 與 devops 的 `pool` 各有複雜度 1–5 每級至少 3 個標題、`trap` 至少 4 個、`inc` 至少 3 個，題材照 design（sre：監控、告警、SLO、容量、on-call；devops：CI/CD、IaC、容器），語氣跟既有技術線一樣具體、短，繁體中文台灣用語。Verify：tools/check.js 既有的 `for(const k of COMPANIES)` 標題數量斷言與 trap 斷言涵蓋 sre、devops 並通過。[after: 1.1]

## 2. 工單產生與技術線效果

- [x] 2.1 Ticket stack distribution 與 SRE incidents via a second roll：`pickStack` 的 10% 平分給沒選的五條工作內容（由 `COMPANIES` 推得，不用改公式）；public/js/actions.js `endDay` 的每日進件在第一次事故擲骰沒中、且 `S.companies` 含 sre 時，再擲一次 `incRate(S.day)`，中了就 `makeIssue(true,'sre')`；第 1 天開局與流量暴增事件不擲第二次。Verify：tools/check.js 更新 Rails 單選與 Laravel＋App 的分布斷言（其他五條各約 2%、雙選時另外四條各約 2.5%），新增 scenario "SRE doubles the incident roll" 的四列表格（10,000 張、±0.01）與 "SRE incident tickets"（複雜度 4、當天到期、標題來自 sre inc 池），斷言在改動前失敗、改動後通過。[after: 1.2]
- [x] 2.2 DevOps pipeline time 與 Harder stack compensation（design: DevOps reuses the Rust/App pattern）：public/js/calc.js `stackHrs` 對 devops 回傳 1.25；public/js/state.js `hardStack` 加入 devops，所以非事故期限 +1、KPI ×1.3（找主管重新評估也用這個）；sre 沒有補償。Verify：tools/check.js 新增 devops 與 fe 同複雜度的時數比 1.25、成功率與 token 相同，KPI 表加 devops 3→13、devops 4 事故→33、sre 3→10、sre 4 事故→26，以及第 6 天 devops 期限 8；`node tools/check.js` 結束碼 0。[after: 1.1]
- [x] 2.3 Stack effect visibility（design: Hints）：`stackHint` 對 devops 顯示含「terraform」「×1.25」的提示，對 sre 顯示含「事故」的提示，fe 仍然沒有提示。Verify：tools/check.js 新增 scenario "DevOps and SRE hints" 的斷言並通過。[after: 2.2]
- [x] 2.4 Unfamiliar stack hand-writing cost 與 Best score per mode and company：不熟判定與最高分 key 不改程式，但補上新例子。Verify：tools/check.js 加 laravel 選、sre 單 2 → 8.8h、sre＋devops 選、devops 單 2 → 4.4h，以及 sre+devops 的 best key 斷言；通過。[after: 1.1]
- [x] 2.5 Outsourced ticket generation：`GIG_STACKS` 由 `COMPANIES` 推得，外包單從七條技術線平均抽。Verify：tools/check.js 的 Stack spread 斷言改成七條各約 14.3%，rust、sre、devops 在 Laravel 單選時都顯示不熟；通過。[after: 1.1]

## 3. 模擬、頁面文字與文件

- [x] 3.1 tools/sim.js 跑六條工作內容、`SIM_COMBOS=1` 跑 15 種雙選；跑 `SIM_N=100 node tools/sim.js` 兩次，記錄平行與單線模式 SRE、DevOps 相對 Laravel 的差距。Balance acceptance：平行模式 SRE、DevOps 兩次都在 ±25% 內；超出時先回報使用者，不自行調數值。Verify：兩次輸出的數字寫進 docs/DESIGN.md。[after: 2.1, 2.2]
- [x] 3.2 公開頁與文件：public/index.html 的 footer 介紹改成「開局選一到兩項工作內容（Laravel 後端、Rails 後端、Rust 基礎設施、App 開發、SRE、DevOps）」與「開局選工作內容」，public/sitemap.xml 的 `lastmod` 改成當天；docs/DESIGN.md 的「公司與技術線」改成工作內容並補 SRE、DevOps 的效果表列、需求清單加第 22 條（使用者原文「把公司選項改成工作內容 且加上 sre跟devops」，指向 Spectra change `gh-18-01-work-roles-sre-devops`，#18）。Verify：`grep -n "工作內容" public/index.html docs/DESIGN.md` 有結果，`node tools/check.js` 結束碼 0，`spectra validate gh-18-01-work-roles-sre-devops` 通過。[after: 3.1]
