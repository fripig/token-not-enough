## Context

The game is a static ES-module app with no build step (`public/js/*.js`, eight modules). All UI text is Traditional Chinese written inline: template strings in `render()` (public/js/view.js), modal builders in public/js/modals.js, rules tabs in public/js/rules.js, `log()` calls and `EVENTS` in public/js/actions.js, and display fields on data objects in public/js/data.js (`STACKS[k].company/desc/pool`, `INVEST[k].name/desc`, `HW[k].name/price/desc`, `CLIENTS`, plan name 不訂閱, conference names). Some data descriptions interpolate constants at module load, for example `HW.pc.desc` uses `` `×${PC_SPEED}` ``. Issue #34 measured about 850 Chinese string literals in public/js.

Facts that shape the design:

- Game logic never compares a Chinese string (searched public/js for `===`/`!==` against CJK literals: none) and `track()` never sends Chinese (searched `track(` calls), so replacing literals with lookups cannot change rules or GA.
- `makeIssue()` in public/js/state.js picks a title with `pick(STACKS[stack].pool[...])`, and `pick` is `a[rnd(a.length)]`; the random draw depends only on the array length.
- Ticket titles (`is.title`), log entries (`S.log[].msg`) and the morning report (`morning.rep`) are stored as finished strings in the save.
- Node 24 (v24.21.0 on this machine) defines `globalThis.navigator` with `language` = `en-US`; `tools/fake-dom.js` defines `document`, `localStorage` and three elements, and no `navigator`, `document.documentElement` or footer.
- `tools/check.js` has 1,257 lines containing Chinese, most of them expected UI text.
- Module rules from docs/DESIGN.md: every top-level declaration is exported; top level only declares (circular imports are allowed); `main.js` calls `boot()` once.

Decisions from the 2026-10-10 discussion (chosen by the user): zh-TW and English; browser language on first visit plus a manual switch; one URL; old log entries keep their language; ticket pools translated literally; `<head>` stays Chinese, footer and `<html lang>` follow the language; one change with batched tasks and the switch enabled last; English semantic keys so others can add a language by pull request; both footers in index.html and the script shows one.

## Goals / Non-Goals

**Goals:**

- `t(key, params)` with English semantic keys, one flat dictionary file per language, zh-TW default and fallback.
- English covers every surface listed in the spec's Translated surfaces requirement.
- zh-TW output is unchanged: `tools/check.js` passes with its Chinese assertions, fixed-seed simulator output is byte-identical.
- Adding a language is documented and needs a dictionary file, a registry line and a footer section, nothing else.

**Non-Goals:**

- Separate URLs per language, `hreflang`, a translated `<head>`, OG image or sitemap.
- Re-translating stored log entries, ticket titles or the stored morning report; changing `SAVE_VER`.
- Translating GA parameters, `localStorage` keys, data ids or brand/product names.
- Currency conversion or locale number formats (`kt()`, `nt()` stay as they are).
- Simplified Chinese or any third language.
- Translating `tools/sim.js` output or `docs/`.
- Plural rules or ICU message syntax.

## Decisions

### English semantic keys in flat per-language dictionaries

Each language is one module `public/js/i18n/<id>.js` exporting `DICT`, a flat object whose keys are dotted English ids (`header.rules`, `meter.wallet`, `log.dispatch`, `invest.md.name`, `event.outage.title`, `pool.laravel.1`). Flat keys make "same key set" a one-line check and keep pull-request diffs line-per-key. Alternative: Chinese source text as the key (smaller diff, code stays readable in Chinese) — rejected by the user because contributors adding a language would have to key on Chinese text. Alternative: nested objects — rejected, harder to diff and to compare key sets.

### Values: strings with `{name}` placeholders, arrays for pools

A value is a string; `{name}` is replaced by `params.name` (missing param leaves the placeholder visible so check.js can catch it). Ticket pools are arrays of strings; research pools are arrays of `{t, parts:[a, b]}`. Text that used to interpolate constants at load (`HW.pc.desc`, investment descriptions) becomes a placeholder string and the call site passes the constant, so the dictionary has no imports and the rules modal keeps reading numbers from the constants. Sentences that vary by condition get one key per variant rather than in-string logic.

### Registry and current language live in public/js/i18n.js

`i18n.js` exports `LANGS` (ordered `[{id:'zh-TW', dict}, {id:'en', dict}]`, dictionaries imported statically; the display name is each dictionary's own `lang.name` key, so i18n.js holds no CJK text), `lang` (current id, starts `'zh-TW'`, reassigned only inside this module), `t(key, params)`, `tl(key)` (array lookup for pools, falls back to the whole zh-TW array), `pickLang(stored, browserList)` (pure, implements the spec's selection table), `initLang()` (reads `tokgame-lang` and `navigator.languages`/`navigator.language`, calls `applyLang`) and `setLang(id)` (stores the preference, calls `applyLang`). `applyLang` sets `document.documentElement.lang`, `document.title` and footer visibility, each guarded so a missing element is skipped. `initLang()` is called at the start of `boot()` in main.js, not at module top level.

### Pools move into the dictionaries, picked by position

`STACKS[k].pool` is removed from data.js; `makeIssue()` calls `pick(tl('pool.<stack>.<cx|inc|trap>'))` and `pick(tl('pool.<stack>.research'))`. Because every language's pool has the zh-TW length (checked by check.js), the same `Math.random` value picks the same position, so the draw sequence and every number are identical across languages and fixed-seed output stays the same.

### Footer: both languages in index.html

`<footer class="about">` holds one `<div data-lang="zh-TW" lang="zh-Hant">` and one `<div data-lang="en" lang="en">`; `applyLang` sets `hidden` on every block whose `data-lang` is not current. The Chinese footer stays in the page source for crawlers that render with `en-US`. Cost: a contributor adds a footer block too, documented in README.md.

### Language switch in the header

The header gets a small segmented control: one `<button data-lang="<id>">` per `LANGS` entry, current one highlighted, rendered by `render()` from `LANGS`. main.js's delegated click handler calls `setLang(id)` then `render()`. It uses existing button styles and CSS tokens, fits the 400px header, works in both themes. During migration it stays hidden behind a constant `LANG_SWITCH = false` in i18n.js, flipped in the last task.

### Language switch also in the setup modal

The run-start setup modal opens over the header, so a player whose browser language is Chinese but who reads English could only reach the switch after starting day 1. `showSetup` renders the same `langSwitch()` markup under its title; its own click handler (`mo.onclick`, which already handles `data-*` buttons for the draft) calls `setLang` and then redraws with the existing `draw()`, so `draft` is untouched, and also calls `render()` so the game screen behind the modal follows. Alternative: only the header — rejected by the user after the first local check.

### Setup introduction states that money does not score

The setup introduction's last line still said the month-end score counts your own spending, outdated since `gh-26-01-money-off-score`. The `ui.setup.r.late` value changes in both dictionaries; no logic changes. It is in this change because the text was already being moved and translated.

### Tools pin zh-TW

`tools/fake-dom.js` defines `globalThis.navigator` with `language: 'zh-TW'`, `languages: ['zh-TW']` via `Object.defineProperty` (Node's own is a getter), plus stubs for `document.documentElement` and `document.title`. check.js tests detection through `pickLang()` and through `initLang()` after temporarily replacing the navigator stub, and restores zh-TW afterwards.

### Extraction in expand → migrate → contract batches

Expand: add `i18n.js`, empty-ish dictionaries and tool pins, nothing uses them yet. Migrate: one task per area moves its Chinese into `zh-TW.js`, writes `en.js`, replaces literals with `t()`; after each batch `node tools/check.js` exits 0 and the fixed-seed simulator diff is empty. Contract: turn on the "no CJK in code" check, then enable the switch. Each batch is shippable on its own because zh-TW output never changes and the switch is hidden.

## Implementation Contract

**Behavior.** A visitor whose browser language is not Chinese sees the game in English on first visit; anyone can switch language in the header at any time; the choice is remembered in `tokgame-lang`. A zh-TW player sees exactly what they see today, plus the language buttons.

**Interface / data shape.**

- `public/js/i18n.js`: `LANGS`, `lang`, `LANG_KEY = 'tokgame-lang'`, `LANG_SWITCH`, `t(key, params?) → string`, `tl(key) → array`, `pickLang(stored, list) → id`, `initLang()`, `setLang(id)`, `applyLang()`.
- `public/js/i18n/zh-TW.js`, `public/js/i18n/en.js`: `export const DICT = { 'dotted.key': 'text {param}', 'pool.<stack>.<n>': [...] }`.
- Header and setup-modal markup: `button[data-lang]` per language (same `langSwitch()` output).
- Footer markup: `footer.about > [data-lang]` blocks.

**Failure modes.** Missing key in current language → zh-TW text; missing in zh-TW → the key text itself (visible, caught by check.js). `localStorage` read or write throws → treated as no preference / kept for this page only. Missing `document.documentElement`, `document.title` support or footer (Node tools) → silently skipped. Unknown stored id → ignored.

**Acceptance criteria.**

- `node tools/check.js` exits 0, including new assertions for every spec scenario that can run under the fake DOM: the selection table via `pickLang`, lookup/fallback/placeholder table, switch side effects (stored key, no save write, no GA, no log entry, state untouched), mixed log after a switch, queued title kept, save loaded in English, same-draw titles by pool position, and the dictionary consistency rules.
- `SIM_N=100 SIM_SEED=101 node tools/sim.js` and `SIM_INVEST=1 SIM_N=100 SIM_SEED=101 node tools/sim.js` print byte-identical output to the baseline taken before the first code change.
- Manual: `python3 -m http.server -d public 8000`, play several days in English at 400px width in light and dark themes, open every modal and all six rules tabs, switch language mid-day; check that the page source still contains the Chinese footer.

**Scope boundaries.** In scope: everything in public/js and the footer, `document.title`, `<html lang>` in public/index.html, header CSS for the switch, tools/fake-dom.js, tools/check.js, README.md, docs/DESIGN.md. Out of scope: the Non-Goals list, `tools/sim.js` output text, existing specs' requirement text.

## Risks / Trade-offs

- [Risk] English text overflows buttons or the header at 400px → Mitigation: the manual check above per batch that touches layout; shorten English labels rather than change layout.
- [Risk] A Chinese string is missed and shows up in English mode → Mitigation: the contract-phase "no CJK in code outside comments" check in tools/check.js.
- [Risk] Literal translation of Taiwan-specific ticket subjects reads oddly to English players → accepted by the user (literal translation chosen); keep subjects, adjust wording only.
- [Risk] Moving strings shifts `Math.random` usage → Mitigation: only literals move, pools keep length; fixed-seed diff after every batch.
- [Trade-off] Code readers no longer see the Chinese text inline; they read the key and open `zh-TW.js`. Chosen for contributor friendliness.
- [Trade-off] A mid-run switch leaves the log and queued titles mixed; chosen to avoid a save format change.
