## Context

The 工程投資 tab (`invPanel` in public/js/view.js) lists each investment as a row: a header block with the name and description (`INVEST[k].desc`, plus the level 2 description), then a segment of buy buttons. The 國內研討會 row (`confRow`) and the 採購電腦 row (`hwRow`) put each conference and machine inside its own buy button. The rules modal 投資與電腦 tab (`rulesTab('invest')` in public/js/rules.js) has three tables: investments (name, hours, cost, effect, with an extra row for level 2), conferences (name, category, stacks, fee) and machines (name, price, trust, arrival, effect). No page in the game links anywhere today.

Click handling: the main screen delegates clicks on `app` and only acts on `e.target.closest('button')`; the rules modal's `mo.onclick` does the same. An `<a>` outside any button therefore follows its link with no game side effect. Neither handler needs changing.

The user chose (#74): links in both the investment tab and the rules modal; investments, conferences and machines all get links; one URL for every language, kept in data.js rather than the dictionaries.

## Goals / Non-Goals

**Goals:**

- Every investment (including each level 2 that names different tools), conference and machine has at least one reference link to a real, reachable page.
- The links are visible where the player reads about the item: the investment tab and the rules modal.
- Zero effect on game state, saves, GA, logs and simulator output.

**Non-Goals:**

- Links for vendors, models, subscription plans, stacks or clients.
- Per-language URLs (rejected by the user: most official docs are English-only, and two URL sets double the maintenance).
- Link checking in CI or at runtime: URLs were checked by hand when written (see "Link table"); `tools/check` asserts only shape (https, non-empty), not reachability, because the checks run offline.
- Year-specific conference pages: use the stable root of each conference site where one exists, so the link does not go stale next year.

## Decisions

### Reference links live on the data objects as `refs`

Each `INVEST` entry gets `refs: [[label, url], …]`; an `INVEST[k].lv2` gets its own `refs` when its tools differ (only 導入 SDD level 2). Each `CONF` and `HW` entry gets a single `url` string; its link label is the item's displayed name (`C.name` / `H.name`, which is already localized for CYBERSEC, 台灣人工智慧年會, the PC and the Mac), so conferences and machines need no separate label. A shared renderer `refLinks(refs)` in public/js/view.js returns `<a class="ref" href="URL" target="_blank" rel="noopener noreferrer">label ↗</a>` joined with `t('sep.list')`; rules.js imports it. Labels are proper nouns or English page titles (no CJK), so they satisfy the localization check that code contains no Chinese, and they need no dictionary keys.

Alternative considered: put URLs in the dictionaries. Rejected because the user chose one URL for all languages.

### Conference and machine links go on a separate line, not inside the buy buttons

An `<a>` nested in a `<button>` is invalid HTML and the click would also trigger the purchase. The conference and machine rows add, under the row description, one line `參考：<links>` (`ui.inv.refs` = 參考／References) listing each item as `refLinks([[name, url]])`. Investment rows have no such conflict: their links go at the end of the description span in the row header.

### Link table

Checked on 2026-10-18 with curl (HTTP 200 after redirects) unless noted. Where the original URL redirects, the final URL is used, except the MCP site root (it redirects to a dated spec version path, which will change).

| Item | Label (conferences and machines use the item name) | URL |
|---|---|---|
| 寫 CLAUDE.md | CLAUDE.md | https://code.claude.com/docs/en/memory |
| 單元測試 | Unit Test (Martin Fowler) | https://martinfowler.com/bliki/UnitTest.html |
| CI 流水線 | Continuous Integration (Martin Fowler) | https://martinfowler.com/articles/continuousIntegration.html |
| pre-commit／lint hook | pre-commit | https://pre-commit.com/ |
| secret scanning／脫敏 | GitHub secret scanning | https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning |
| 上架自動化（fastlane） | fastlane | https://docs.fastlane.tools/ |
| 監控告警 | Monitoring Distributed Systems (Google SRE) | https://sre.google/sre-book/monitoring-distributed-systems/ |
| 做 skills | Claude Code skills | https://code.claude.com/docs/en/skills |
| 接 MCP 文件 | Model Context Protocol | https://modelcontextprotocol.io/ |
| 導入 SDD Lv1 | Superpowers | https://github.com/obra/superpowers |
| 導入 SDD Lv2 | Spectra; OpenSpec; Spec Kit | https://spectra.5xcamp.us/ ; https://github.com/Fission-AI/OpenSpec ; https://github.com/github/spec-kit |
| 交叉審核工具 | Codex plugin for Claude Code | https://github.com/openai/codex-plugin-cc |
| 提升 agent 能力 | Claude Code best practices | https://code.claude.com/docs/en/best-practices |
| iPlayground | iPlayground | https://iplayground.io/ |
| MOPCON×JSDC | MOPCON×JSDC | https://mopcon.org/ |
| DevOpsDays Taipei | DevOpsDays Taipei | https://devopsdays.tw/ |
| KubeSummit | KubeSummit | https://k8s.ithome.com.tw/ |
| COSCUP | COSCUP | https://coscup.org/ |
| WebConf Taiwan | WebConf Taiwan | https://webconf.tw/ |
| HITCON | HITCON | https://hitcon.org/ (curl gets 403 from bot protection; web search confirmed hitcon.org/2026 is the official site) |
| CYBERSEC 臺灣資安大會 | CYBERSEC | https://cybersec.ithome.com.tw/ |
| 台灣人工智慧年會 | (item name) | https://conf2026.aiacademy.tw/ (no stable root; aiacademy.tw is the organizer, conf<year> subdomains per edition) |
| Hello World Dev Conference | Hello World Dev Conference | https://hwdc.ithome.com.tw/ |
| 有顯卡的 PC（RTX 5090） | GeForce RTX 5090 | https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/ |
| NVIDIA DGX Spark | NVIDIA DGX Spark | https://www.nvidia.com/en-us/products/workstations/dgx-spark/ |
| Mac Studio（512GB） | Mac Studio | https://www.apple.com/mac-studio/ |

The SDD level 2 tool names already shown in the game (`SDD_EG[2]` = Spectra／OpenSpec／Spec Kit) match these three links. The CLAUDE.md row shows one link for all stacks.

### Rules modal placement

- Investment table: put `refLinks(I.refs)` in the effect cell of each investment row, right after the description and before the current-quality line (`invNow`, which starts on its own line), and `refLinks(I.lv2.refs)` to the 導入 SDD Lv2 row (other level 2 rows have no `refs`, so nothing is appended).
- Conference table and machine table: the name cell becomes the link itself, `refLinks([[C.name, C.url]])` / `refLinks([[H.name, H.url]])`.

`rtable` already emits cell strings as HTML, so no escaping change is needed; the URLs and labels are constants.

### Styling

`.ref` links use `var(--accent)` text, no underline until hover, `white-space: nowrap` on each link, and keep the surrounding 12px muted size in the panel. Colours come from existing tokens, so light and dark mode both work; at 400px width the links wrap between items, not inside a label.

## Implementation Contract

**Behavior:**

- In the 工程投資 tab, each investment row's description ends with its link(s), e.g. 單元測試 shows "…抓錯率 +10%… Unit Test (Martin Fowler) ↗". 導入 SDD shows Superpowers after the level 1 text and Spectra, OpenSpec, Spec Kit after the level 2 text.
- The 國內研討會 row shows a line "參考：iPlayground ↗、MOPCON×JSDC ↗、…" covering all ten conferences in `CONF_KEYS` order; the 採購電腦 row shows the three machines in `HW_KEYS` order. In English the line starts with "References:" and uses ", ".
- The rules modal 投資與電腦 tab shows the same links as described under "Rules modal placement".
- Every link opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). Clicking it does not change `S`/`sel`, save, log, or call `track`; like any click it only clears a pending two-step cancel or abandon.

**Interface / data shape:**

- `refs: Array<[label: string, url: string]>` on every `INVEST[k]` (k in `md` and `INV_KEYS`), and on `INVEST.sdd.lv2`. `url: string` on every `CONF[k]` and every `HW[k]`. Every URL starts with `https://`.
- `export const refLinks = refs => string` in public/js/view.js; returns `''` for a missing or empty `refs`.
- `export const refLine = refs => string` in public/js/view.js; wraps `refLinks` in `<span class="refs">` with the `ui.inv.refs` prefix, used for the conference and machine lines.
- Dictionary key `ui.inv.refs` in zh-TW (`參考：`) and en (`References: `).

**Failure modes:** a missing `refs` renders nothing (no "undefined", no empty `參考：` line). Dead links are not detected at runtime.

**Acceptance criteria:**

- New assertions in tools/check/engineering-investments.test.js: every investment and SDD level 2 has at least one `refs` entry with an `https://` URL and a non-empty label, and every conference and machine has an `https://` `url`; the rendered investment tab contains an `<a … target="_blank" rel="noopener noreferrer">` for each URL; the conference and machine reference lines exist; no `<a` appears inside any `<button>` in the investment tab.
- New assertions in tools/check/rules-reference.test.js: the 投資與電腦 tab HTML contains every URL from `INVEST` refs, `INVEST.sdd.lv2` refs, `CONF` and `HW`.
- `node tools/check.js` passes, including localization (no CJK in code; `ui.inv.refs` in both dictionaries) and whats-new (new `gh-74-01` entry).
- `SIM_N=100 SIM_SEED=101 node tools/sim.js` output is byte-identical before and after.
- Manual: open the game locally, 工程投資 tab and rules modal at desktop and 400px width, light and dark; clicking a link opens a new tab and the game state is unchanged.

**Scope boundaries:** in scope are the data constants, the two panel rows' link lines, the investment row descriptions, the rules modal tables, one CSS rule, one dictionary key, the news entry, check assertions and DESIGN.md. Out of scope: the dispatch-panel investment hint line, the investment-ticket dispatch panel, the setup modal, other rules tabs.

## Risks / Trade-offs

- [Links rot, especially year-specific 台灣人工智慧年會] → stable roots are used where they exist; DESIGN.md records the check date so a later pass can re-check. No automated link checker (would need network in checks).
- [Longer panel rows] → links are short labels on one extra line for conferences and machines only; the 400px layout is checked manually.
- [Spectra is a niche tool, its site is a 5xcamp subdomain] → it is the site linked from the tool's own GitHub repo (kaochenlong/spectra-app), so it is the canonical page.
