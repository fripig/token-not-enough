## Why

The engineering investments, domestic conferences and machine purchases are named after real tools, events and products (CLAUDE.md, pre-commit, fastlane, MCP, Superpowers, Spec Kit, HITCON, DGX Spark…), but the game never says where to learn more about them. The user asked (#74) for each description to link to a real reference page, so a player who wonders "what is secret scanning / SDD / KubeSummit" can open the real thing.

## What Changes

- Every engineering investment (寫 CLAUDE.md, 單元測試, CI 流水線, pre-commit／lint hook, secret scanning／脫敏, 上架自動化（fastlane）, 監控告警, 做 skills, 接 MCP 文件, 導入 SDD with its level 2 framework links, 交叉審核工具, 提升 agent 能力), every domestic conference and every machine in 採購電腦 gets one or more reference links (label + https URL), stored as constants in `public/js/data.js`. The same URL is used for every language; labels are proper nouns or English titles, so nothing goes into the dictionaries except the short UI word that introduces conference and machine links.
- The 工程投資 tab shows the links: each investment row ends its description with the links (`label ↗`); the 國內研討會 and 採購電腦 rows get one extra line listing each conference's or machine's link (links cannot sit inside the buy buttons, because an `<a>` inside a `<button>` is invalid HTML).
- The rules modal 投資與電腦 tab shows the same links: the investment table's effect column (level 2 rows too), the conference table's name column and the machine table's name column.
- Links open in a new tab with `target="_blank" rel="noopener noreferrer"`; clicking one changes no game state, sends no GA event and writes no log line.
- A 最近更新 entry `gh-74-01` is added when it ships.

## Non-Goals (optional)

(Recorded in design.md.)

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `engineering-investments`: the investment panel shows reference links for every investment, conference and machine.
- `rules-reference`: the 投資與電腦 tab shows the same reference links.

## Impact

- Affected specs: engineering-investments, rules-reference
- Affected code: public/js/data.js (reference link constants on INVEST, CONF, HW), public/js/view.js (invPanel, confRow, hwRow), public/js/rules.js (invest tab tables), public/css/style.css (link style inside the panel), public/js/i18n/zh-TW.js and public/js/i18n/en.js (one label key, news entry), public/js/news.js (NEWS entry), tools/check/engineering-investments.test.js and tools/check/rules-reference.test.js (assertions), docs/DESIGN.md (requirement log and code map).
- No save, GA, balance or random-number changes: fixed-seed simulator output must stay byte-identical.
- Refactor check (2026-10-18, modules this change touches): data.js 193 lines／18.9KB (11 lines over 200 chars), view.js 295／30.0KB (40), rules.js 157／12.6KB (10). Conclusion: no refactor needed.
