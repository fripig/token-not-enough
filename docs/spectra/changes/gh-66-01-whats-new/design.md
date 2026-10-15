## Context

Page load is decided by `boot()` in public/js/main.js: it runs `initLang()`, reads the save slot with `readSave()`, and opens one of three things — `showResume(d)` for a usable save, `showBadSave()` for an unusable one, or `start()` (fresh run plus `showSetup(false)`) when there is no save. All modals share one overlay (`ov`) and one modal box (`mo`) from public/js/view.js, so only one modal can be on screen at a time, and each modal sets `mo.onclick` itself.

The rules modal already supports "open from another modal, return on close": `showRules(back)` in public/js/rules.js calls `back()` on 關閉. Its tabs come from `RULE_TABS` (six ids, titles from `rules.tab.<id>` in the dictionaries) and `ruleTab` remembers the last tab within a page load.

`localStorage` already holds `tokgame-lang`, `tokgame-save` and `tokgame-best-<mode>[-<companies>]`; every read and write is wrapped in try/catch. `GAME_VERSION` is replaced with the short commit hash on every deploy, so it changes on every push and cannot tell whether a player-visible update happened.

The node tools (`tools/check/*.test.js` through `tools/check/lib.js`, and `tools/sim.js`) import public/js/main.js, which calls `boot()` on load with the fake DOM and an empty fake `localStorage` from tools/fake-dom.js. Several save-game checks reset the store, write a save and call `boot()` again.

Decisions taken with the user in discussion (all chosen from options): show only when there are unseen entries; first-time visitors see nothing; a separate modal before the existing page-load modals; unseen entries only, at most 5; the full list as a seventh rules tab; the first version starts at the English launch on 2026-10-10; a browser with a save or best score but no marker counts as a returning player.

## Goals / Non-Goals

**Goals:**

- A returning player who opens the page after a player-visible update sees, once, a short list of what changed since their last visit, then continues exactly where the page would have taken them.
- Anyone can reread every entry from the rules modal at any time.
- New players are not interrupted.
- Adding an entry when shipping is a two-line edit (one data row, two dictionary strings) that the checks validate.

**Non-Goals:**

- No analytics event for opening or closing the modal; no save field; no execution-log line.
- No red dot or badge on the header; no separate header button (the user chose the rules tab as the entry).
- No entries before 2026-10-10, and no entries for changes players cannot see (deploy moves #59 #61, test refactors #37, measurement-only #52, the float fix #55).
- No automatic generation from git history or Spectra archives; entries are hand-written player copy.
- No translation of dates into localized formats; both languages show `YYYY-MM-DD`.
- No change to any game rule, number, or the fixed-seed simulator output.

## Decisions

### Update entries live in a new news module

A new module public/js/news.js exports the entry array `NEWS`, newest first, each `{id, date}`; the text is the dictionary key `news.<id>` in public/js/i18n/zh-TW.js and public/js/i18n/en.js. It also exports the seen-marker helpers and the modal. Alternatives: putting the array in public/js/data.js (already 180 lines and 17.9KB of game data unrelated to page flow) or keeping text inside the array as `{zh, en}` (breaks the rule that UI text lives in the dictionaries, and the localization checks would not see it). The module follows the module rules in docs/DESIGN.md: top-level declarations only, every declaration exported, no calls at load.

The id is the Spectra change name prefix of the shipped change (`gh-64-01`), so it is unique and traceable; when one entry covers two changes of one issue it uses the later one (`gh-46-02`). Entries are only ever added at the front; removing or reordering entries is not allowed (the seen marker refers to ids).

### Seen marker is the newest seen id

`localStorage` key `tokgame-news` (`NEWS_KEY`) stores the id of the newest entry the player has been shown. Unseen entries are the entries before that id in `NEWS`. A stored id that is not in `NEWS` is treated as "seen everything" so a typo or a future removal never floods the player. Alternative: storing a date — two entries can share a date (most of 2026-10-11), so a date cannot split them.

### Returning players without a marker are detected by save or best score

When `tokgame-news` is absent, the player is returning if `localStorage` has `tokgame-save` or any key starting with `tokgame-best-`; otherwise they are a first-time visitor and the marker is set to `NEWS[0].id` with no modal. `tokgame-lang` is not used: it is written only when the player switched language, so it says little. Enumerating keys uses `localStorage.length` and `localStorage.key(i)` inside the same try/catch; tools/fake-dom.js gains those two members so the node tools can exercise the path.

### What's-new modal runs before the page-load modals

`boot()` becomes: `initLang()`, then compute the page-load continuation (the existing three-way choice wrapped in a function), then `showNews(next)` if there are unseen entries, else `next()`. `showNews` draws the modal into `mo`; 知道了 writes the marker and calls `next()`. Alternative: merging the list into the resume, bad-save and setup modals — rejected by the user (three modals to change, and the setup modal is already long on phones).

### Full list is a seventh rules tab

`RULE_TABS` gains `news` at the end, titled 更新 (`rules.tab.news`); `rulesTab('news')` lists every entry as date plus sentence. The what's-new modal's "more" button (shown only when more than 5 are unseen) writes the marker and calls `showRules(next)` with `ruleTab` set to `news`, so 關閉 continues the page-load flow. Alternative: a header button — rejected for the 400px header, which already holds the language switch and 規則.

## Implementation Contract

**Data shape.** `NEWS` is an array of `{id: string, date: 'YYYY-MM-DD'}`, newest first, ids unique, dates non-increasing. Each id has a non-empty `news.<id>` in both dictionaries. The modal labels use `news.title` (最近更新／What's new), `news.ok` (知道了／Got it), `news.more` (還有 {n} 筆更新／{n} more updates) and `rules.tab.news` (更新／Updates). English text keeps the same digits as the Chinese text, so the existing rules-tab number check passes for the new tab.

**First-version entries** (newest first; the Chinese sentence is the draft, English is written in apply with the same digits):

| id | date | 繁中 |
|---|---|---|
| gh-66-01 | ship date | 開頁會顯示最近更新；規則多了「更新」分頁 |
| gh-65-01 | 2026-10-16 | 開局可以開「用量挑戰」：訂閱、團隊席位、公司 API 用越滿，月底分數越高 |
| gh-64-01 | 2026-10-15 | 平行模式的工程投資變成工單，可以自己做或派 agent，品質看模型能力 |
| gh-63-01 | 2026-10-14 | 平行模式不用再選工作槽數，同時跑幾個 agent 沒有上限 |
| gh-48-01 | 2026-10-11 | 新投資「交叉審核工具」：可以另選模型來審 |
| gh-54-01 | 2026-10-11 | 手機上點工單會自動捲到派工台 |
| gh-53-01 | 2026-10-11 | 平行模式拿掉 Rust／App／DevOps 的 KPI ×1.3，平行 S 門檻改成 9,500 |
| gh-46-03 | 2026-10-11 | 第 11 天起會出現複雜度 6 的工單 |
| gh-45-01 | 2026-10-11 | 評等門檻改成單線、平行各一組 |
| gh-51-01 | 2026-10-11 | 可以找主管退單：公司單信任 −2、不扣 KPI |
| gh-46-02 | 2026-10-11 | 模型能力改成 20–60 的刻度，成功率曲線拉長，投資改成減少失敗 |
| gh-44-01 | 2026-10-11 | 月底不再截期限，結算分開列支出與個人淨收支 |
| gh-43-01 | 2026-10-11 | 週一從不訂閱開新方案，收整個月的月費 |
| gh-42-01 | 2026-10-11 | 早上報告帶前一天下班的總結；付費方式預設先選席位、再選訂閱 |
| gh-41-01 | 2026-10-11 | 派工台先放方案與派出；卡片的一鍵派工改成 A／B／C 三顆 |
| gh-40-01 | 2026-10-11 | 工程投資改成派工台旁邊的分頁 |
| gh-39-01 | 2026-10-11 | 等待、調整訂閱、下班移到畫面底部 |
| gh-38-01 | 2026-10-11 | 切換語言後，佇列裡的工單標題也跟著換 |
| gh-36-01 | 2026-10-10 | 跑過夜的本地 agent 隔天算用到電腦，不再被判閒置 |
| gh-34-01 | 2026-10-10 | 新增英文版，標頭可以切換語言 |
| gh-33-01 | 2026-10-10 | 導入 SDD 分兩級，每張單可以選要不要用 |
| gh-32-01 | 2026-10-10 | 背景 agent 可以中止 |

**Page-load behavior.**

| Storage before load | Unseen | Shown first | Marker after closing |
|---|---|---|---|
| no keys | — | no what's-new modal; the setup modal | `NEWS[0].id` (set on load) |
| `tokgame-lang` only | — | no what's-new modal; the setup modal | `NEWS[0].id` |
| `tokgame-save` (usable), no marker | all 22 | what's-new with 5 newest + "還有 17 筆更新" | `NEWS[0].id` |
| any `tokgame-best-*`, no marker | all | what's-new | `NEWS[0].id` |
| marker = `NEWS[2].id` | 2 | what's-new with 2 entries, no "more" | `NEWS[0].id` |
| marker = `NEWS[0].id` | 0 | the resume, bad-save or setup modal as today | unchanged |
| marker = unknown id | 0 | as today | unchanged |
| `localStorage` read throws | — | as today, no what's-new modal | not written |

After 知道了 (or 關閉 on the rules modal opened from "more") the page shows exactly what it would have shown without this change: `showResume(d)`, `showBadSave()`, or the fresh run with `showSetup(false)`.

**Failure modes.** A failed `localStorage` write leaves the marker unset; the modal then shows again on the next load. This is accepted (it only happens where storage is blocked, and there reads also fail, which suppresses the modal).

**Acceptance.** `node tools/check.js` passes in full, including a new tools/check/whats-new.test.js covering every row of the page-load table and the dictionary rules above; `SIM_N=100 SIM_SEED=101 node tools/sim.js` prints byte-identical output before and after; a browser check at desktop width and 400px shows the modal for a returning player in both languages and the 更新 tab.

**In scope:** public/js/news.js, `boot()`, the rules tab and its closing, dictionary entries, the fake-DOM `length`／`key`, check updates, docs/DESIGN.md (feature section, code map, the "add an entry when shipping" convention).
**Out of scope:** analytics, saves, logs, header badge, game rules.

## Risks / Trade-offs

- [Existing checks call `boot()` with a save in a reset store, so a what's-new modal would appear where they expect the resume or bad-save modal] → tools/check/lib.js gets a helper that seeds `tokgame-news` with `NEWS[0].id`, and the save-game and localization checks that call `boot()` after resetting the store use it; one new check asserts the returning-player path explicitly.
- [Entries are forgotten when shipping] → docs/DESIGN.md states the convention next to the deploy notes, and the whats-new check asserts ids are unique, dates non-increasing and every id has text in both dictionaries, so a half-added entry fails.
- [Five newest entries on 2026-10-11 all share one date] → the modal shows the date on every row; the order within a day is the shipping order from git history (newest commit first).
- [The rules-tab number check compares digits between languages] → English entries keep the same numbers as the Chinese ones (for example 9,500, ×1.3, −2, 20–60).

## Migration Plan

Ship with a normal push to `main`; both deploy jobs publish it. The #66 entry's date is set to the push date in the same commit. Rollback is reverting the commit; a leftover `tokgame-news` key is harmless.

## Open Questions

None.
