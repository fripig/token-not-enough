## Why

Issue #34: 「如果要加入多語系 應該就要引入框架了吧」. The user chose not to bring in a framework: a small in-house dictionary module, no build step. The game is Traditional Chinese only today (about 850 Chinese string literals across all eight modules in public/js, plus the footer of public/index.html), so players who do not read Chinese cannot play. The user asked for English semantic keys and one dictionary file per language so that other people can add a language with a pull request.

## What Changes

- New module `public/js/i18n.js`: a language registry, the current language, `t(key, params)` with `{name}` placeholders, fallback to zh-TW for a missing key, language detection and a setter that re-renders.
- One dictionary file per language under `public/js/i18n/`: `zh-TW.js` (every current Chinese string, moved out of the code) and `en.js` (English). Keys are English semantic ids such as `header.rules` or `log.dayStart`. Adding a language = one new dictionary file, one registry line and one footer section in public/index.html.
- Supported languages: 繁體中文 (zh-TW, default and fallback) and English (en). First visit picks by `navigator.language`: `zh*` → zh-TW, anything else → en. A language switch in the game header changes it at any time; the choice is kept in `localStorage` (`tokgame-lang`), not in the save, not sent to GA.
- Every user-visible game string goes through `t()`: game screen, modals, rules modal, action log lines, morning report, events, investments, conferences, hardware, vendor and plan labels, month-end titles, and the ticket title pools. Ticket pools are translated literally (same subjects, same order and count per language).
- Text already written stays in the language it was written in: action log entries and ticket titles already in the queue are stored as finished strings and are not re-translated after a switch. Save structure and `SAVE_VER` are unchanged.
- public/index.html: `<head>` (title, description, Open Graph, JSON-LD), `sitemap.xml` and the OG image stay Chinese. The footer introduction is written in the HTML once per language (Chinese and English), and the script shows only the current language's footer, so the Chinese footer stays in the page source whatever language a crawler renders with (Googlebot usually renders with `en-US`). `document.title` and `<html lang>` follow the current language.
- Money stays `NT$` with the same amounts in every language; GA event names and parameters are not translated.
- `tools/fake-dom.js` pins the language to zh-TW (Node 24 has its own `navigator.language` = `en-US`), so `tools/check.js` and `tools/sim.js` output stays Chinese and fixed-seed simulator output stays byte-identical. `tools/check.js` adds dictionary checks (same key set, same pool lengths, every literal `t()` key exists).
- The language switch is added hidden and only shown after every batch of strings is extracted and translated. It appears in the game header and in the setup modal (run start and Monday 調整訂閱), because the run-start setup modal covers the header; switching there redraws the modal and keeps the choices made so far (added 2026-10-10 after the first local check, chosen by the user).
- Copy fix chosen by the user during this change: the last line of the setup introduction said the month-end score counts how much of your own money you spent, which is outdated since `gh-26-01-money-off-score` (#26); both dictionaries now say the score uses KPI, trust and security audits and money does not score.
- `README.md` gets a short "add a language" section; `docs/DESIGN.md` records the decisions and replaces 「介面文字一律繁體中文」 with "zh-TW is the default language; every UI string goes through the dictionaries".

## Non-Goals (optional)

See design.md.

## Capabilities

### New Capabilities

- `localization`: language registry and detection, the language switch and its stored preference, `t()` lookup with parameters and zh-TW fallback, which surfaces are translated, the rule that already-written log entries and ticket titles keep their language, and the static-page behaviour.

### Modified Capabilities

(none)

## Impact

- Affected specs: new `localization`. No existing requirement changes: log, save, GA and rules-modal behaviour stay as specified (the rules modal and log keep their content, only through the dictionary).
- Affected code: public/js/i18n.js (new), public/js/i18n/zh-TW.js (new), public/js/i18n/en.js (new), public/js/main.js, public/js/data.js, public/js/state.js, public/js/calc.js, public/js/actions.js, public/js/view.js, public/js/modals.js, public/js/rules.js, public/index.html, public/css/style.css, tools/fake-dom.js, tools/check.js, README.md, docs/DESIGN.md.
- Refactor check (2026-10-10, measured with wc and awk on the modules this change touches; lines over 200 chars in the last column):

  | Module | Lines | Bytes | Long lines |
  |---|---|---|---|
  | actions.js | 476 | 34,068 | 13 |
  | data.js | 213 | 25,044 | 16 |
  | view.js | 190 | 20,486 | 28 |
  | modals.js | 199 | 17,095 | 18 |
  | rules.js | 120 | 15,773 | 25 |
  | state.js | 125 | 7,531 | 3 |
  | calc.js | 100 | 6,813 | 2 |
  | main.js | 58 | 2,930 | 0 |

  Conclusion: no framework (user's choice); local reorganisation only — the new `i18n.js` module and dictionary files come first in tasks. Moving Chinese text out makes the code modules smaller.
