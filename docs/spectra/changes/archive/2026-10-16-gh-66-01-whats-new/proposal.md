## Why

Issue #66. The game ships player-visible changes almost every day (more than 20 since English went live on 2026-10-10), but a returning player has no way to learn what changed: rules, numbers and buttons move under them without notice. The user asked to collect the recent updates and show them when the page opens (「整理更新在打開網頁時顯示最近更新功能」).

## What Changes

- A **what's-new list** of player-visible updates, newest first. Each entry has a fixed id, a ship date and one sentence in 繁體中文 and English. The first version covers every player-visible change from the English launch (2026-10-10, #32 #33 #34 #36) up to and including this change, 22 entries (including #65, the usage challenge, which shipped on 2026-10-16 while this change was in progress).
- On page load, after the language is chosen and before the resume, bad-save or setup modal, a **what's-new modal** opens when the player has unseen entries. It lists the unseen entries, newest first, at most 5; when more are unseen it says how many more and offers a button that opens the full list. Closing it (知道了) continues to the modal the page would have shown without it.
- "Seen" is remembered in `localStorage` key `tokgame-news` as the id of the newest entry seen, written when the modal is closed or the full list is opened from it.
- A first-time visitor sees no modal; their marker is set to the newest entry. A browser with no marker but with a save (`tokgame-save`) or any best score (`tokgame-best-*`) counts as a player from before this change and sees the modal.
- The rules modal gets a seventh tab 更新 listing every entry. The what's-new modal's "more" button opens the rules modal on that tab; closing it continues the page-load flow.
- No analytics event, no save field, no log line; `SAVE_VER` stays. Game rules and numbers are unchanged.
- From now on each player-visible change adds an entry when it ships; docs/DESIGN.md records the convention.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `whats-new`: the update list, the page-load what's-new modal, the seen marker and first-visit handling.

### Modified Capabilities

- `rules-reference`: a seventh tab 更新; the what's-new modal becomes an entry point to the rules modal; closing the rules modal opened from it continues the page-load flow.
- `save-game`: on page load the resume or bad-save modal (and the opening setup when no save exists) opens after the what's-new modal when that modal is shown.

## Impact

- Affected specs: new `whats-new`; modified `rules-reference`, `save-game`.
- Affected code: public/js/main.js (`boot()` page-load flow), a new module public/js/news.js (entries, seen marker, what's-new modal), public/js/rules.js (`RULE_TABS`, tab content, closing), public/js/i18n/zh-TW.js and public/js/i18n/en.js (entry text and modal labels), public/css/style.css if the list needs styling.
- Checks: tools/check/whats-new.test.js (new), tools/check/rules-reference.test.js (seven tabs), tools/check/save-game.test.js and any other test that calls `boot()` with a save in storage (they must seed the seen marker or close the new modal).
- Docs: docs/DESIGN.md (feature, code map, the "add an entry when shipping" convention).
- Refactor check (2026-10-16, modules this change touches): main.js 68 lines／4.1KB／3 lines over 200 chars; modals.js 208／15.7KB／9; rules.js 147／11.7KB／10. Conclusion: no framework or build step; the new behavior goes in its own small module.
