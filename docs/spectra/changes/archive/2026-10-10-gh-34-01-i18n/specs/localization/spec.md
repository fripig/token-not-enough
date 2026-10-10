## Purpose

Lets the game be played in more than one language. Every user-visible game string comes from a per-language dictionary keyed by English semantic ids, with Traditional Chinese (zh-TW) as the default and fallback, so a contributor can add a language by adding one dictionary file.

## ADDED Requirements

### Requirement: Supported languages and registry

The game SHALL support exactly the languages listed in the language registry. This change SHALL register 繁體中文 (`zh-TW`) and English (`en`). Each registry entry SHALL have an id, a display name written in that language (繁體中文, English) and a dictionary. `zh-TW` SHALL be the default and fallback language.

#### Scenario: Two languages registered

- **WHEN** the game loads
- **THEN** the registry holds `zh-TW` with display name 繁體中文 and `en` with display name English, in that order

### Requirement: Language selection on page load

On page load the game SHALL pick the current language in this order: a valid stored preference in `localStorage` key `tokgame-lang` (an id present in the registry); otherwise the first entry of the browser language list whose primary subtag matches a registered language (`zh` matches `zh-TW`, `en` matches `en`); otherwise `en`. Reading `localStorage` SHALL be wrapped in try/catch; a failed read SHALL behave as no stored preference.

##### Example: picking the language

| Stored `tokgame-lang` | Browser languages | Current language |
| --- | --- | --- |
| (none) | `zh-TW` | zh-TW |
| (none) | `zh-CN`, `en` | zh-TW |
| (none) | `en-US` | en |
| (none) | `ja-JP` | en |
| (none) | `ja-JP`, `zh-TW` | zh-TW |
| `en` | `zh-TW` | en |
| `xx` (not registered) | `zh-TW` | zh-TW |

#### Scenario: Browser language decides on first visit

- **WHEN** there is no stored preference and the browser language list is `en-US`
- **THEN** the game screen, modals and log lines written from then on are in English

#### Scenario: Stored preference wins

- **WHEN** `tokgame-lang` is `en` and the browser language list is `zh-TW`
- **THEN** the current language is English

#### Scenario: Unknown stored preference ignored

- **WHEN** `tokgame-lang` is `xx` and the browser language list is `zh-TW`
- **THEN** the current language is 繁體中文

#### Scenario: Node tools stay Chinese

- **WHEN** `tools/check.js` or `tools/sim.js` loads the game modules under Node, whose own `navigator.language` is `en-US`
- **THEN** the current language is zh-TW, and `SIM_N=100 SIM_SEED=101 node tools/sim.js` prints byte-identical output to the output before this change

### Requirement: Language switch

The game header SHALL show one button per registered language, labelled with its display name, with the current language highlighted. The setup modal, both at run start and for the Monday 調整訂閱, SHALL show the same buttons; a click there SHALL apply the same effects, redraw the setup modal in the new language and keep every choice already made in it (work content, mode, slots, freelance, advanced, plans, seat request). Clicking the current language SHALL do nothing (no stored preference). Clicking a language that is not current SHALL set it as the current language, write its id to `localStorage` key `tokgame-lang` (write wrapped in try/catch; a failed write SHALL keep the choice for this page only), set `<html lang>` to the language id, set `document.title` from the dictionary, show only that language's footer and redraw the game screen. The switch SHALL NOT change the game state, SHALL NOT write the save, SHALL NOT send a GA event and SHALL NOT write a log entry. It SHALL be usable at any point of a run, including mid-day with agents running.

#### Scenario: Switching mid-run

- **WHEN** the player is on day 7 in zh-TW with two agents running and clicks English
- **THEN** the header, ticket cards, dispatch panel and buttons redraw in English, `tokgame-lang` is `en`, `<html lang>` is `en`, the save in `tokgame-save` is unchanged, the two agents keep running with unchanged times, and no GA event is sent

#### Scenario: Switching in the setup modal

- **WHEN** the run-start setup modal is open in zh-TW, the player has picked Rust and parallel mode with 4 slots, and clicks English in the modal
- **THEN** the modal redraws in English with Rust, parallel mode and 4 slots still selected, `tokgame-lang` is `en`, and no GA event is sent

#### Scenario: Preference survives a reload

- **WHEN** the player switches to English and reloads the page
- **THEN** the resume prompt and the game screen are in English

#### Scenario: Storage blocked

- **WHEN** `localStorage.setItem` throws and the player clicks English
- **THEN** the page switches to English without an error, and a reload picks the language again from the browser language list

### Requirement: Dictionary lookup

Every user-visible string the game script writes SHALL come from the dictionary of the current language through `t(key, params)`, where `key` is an English semantic id (for example `ui.rules`, `log.dayStart`) and `params` fills `{name}` placeholders. A key missing from the current language SHALL fall back to the zh-TW value; a key missing from zh-TW too SHALL return the key itself. Brand and product names (vendor, agent, model and plan names such as Claude Code, Sonnet, Max 5×) SHALL stay as they are in every language and need no dictionary entry. Money SHALL be shown as `NT$` with the same amounts in every language. GA event names and parameters SHALL NOT be translated.

##### Example: lookup

| Current language | Call | Result |
| --- | --- | --- |
| zh-TW | `t('ui.rules')` | 規則 |
| en | `t('ui.rules')` | Rules |
| en | `t('ui.week', {w: 2})` with zh-TW `第 {w} 週` and en `Week {w}` | Week 2 |
| en | a key that only zh-TW has | the zh-TW text |
| en | `t('no.such.key')` | no.such.key |

#### Scenario: Placeholder filled

- **WHEN** the current language is English and a log line for day 6 is written
- **THEN** the line reads `D06 — Day 6 starts …` with the number filled in and no `{d}` left

#### Scenario: Missing English key falls back

- **WHEN** a key exists only in the zh-TW dictionary and the current language is English
- **THEN** the zh-TW text is shown, not the key and not an empty string

#### Scenario: GA unchanged

- **WHEN** the player dispatches a ticket in English
- **THEN** the `dispatch` event carries the same parameter names and values as the same dispatch in zh-TW

### Requirement: Translated surfaces

The following SHALL be shown in the current language: the game screen (header, quota area, ticket cards, dispatch panel, investment panel, background agent rows), every modal (setup, Monday subscription change, morning report, resume, bad save, month-end, rules), the action log lines written while that language is current, random event texts, investment, conference, hardware, client and work-content names and descriptions, ticket titles generated while that language is current (including research tickets and their split tickets, and the conflict-resolution title prefix), and month-end titles and grades text. The ticket title pools of every language SHALL hold the same number of titles in the same order for each technology line and complexity, so the same random draw picks the corresponding title.

#### Scenario: English ticket titles

- **WHEN** the current language is English and day 2 starts
- **THEN** every new ticket card shows an English title from the English pool of its technology line

#### Scenario: Same draw in both languages

- **WHEN** two runs use the same `Math.random` sequence, one in zh-TW and one in English
- **THEN** each ticket in the English run has the title at the same pool position as the zh-TW run, and every number (complexity, due day, KPI, tokens) is identical

#### Scenario: Rules modal in English

- **WHEN** the current language is English and the player opens the rules modal
- **THEN** all six tabs are in English and the numbers are the same values as in zh-TW

### Requirement: Already-written text keeps its language

Action log entries and ticket titles SHALL be stored as finished strings in the language that was current when they were written. Switching language SHALL NOT re-translate them. The save structure and `SAVE_VER` SHALL NOT change, and a save written in one language SHALL load in any language.

#### Scenario: Log mixed after a switch

- **WHEN** the player plays days 1–3 in zh-TW, switches to English on day 3 and ends the day
- **THEN** the log shows the day 1–3 entries in Chinese and the day 3 end-of-day summary and later entries in English

#### Scenario: Queued ticket keeps its title

- **WHEN** a ticket titled 跑馬燈文字錯字 is in the queue and the player switches to English
- **THEN** that card still shows 跑馬燈文字錯字, while the card's labels and buttons are in English

#### Scenario: Save loads across languages

- **WHEN** a save written on day 5 in zh-TW is loaded with the current language English
- **THEN** the save is accepted, the morning report is shown with its stored text, and the game continues in English

### Requirement: Static page in several languages

public/index.html SHALL keep `<head>` (title, description, Open Graph, Twitter Card, JSON-LD) in Chinese for every language. The footer introduction SHALL be written in the HTML once per registered language, each marked with its language id, and the script SHALL show only the current language's footer and hide the others; every footer SHALL stay in the page source. `document.title` SHALL be set from the dictionary of the current language.

#### Scenario: Crawler rendering in English

- **WHEN** a crawler renders the page with browser language `en-US`
- **THEN** the page source and the rendered DOM both still contain the Chinese footer text (hidden) and the Chinese `<head>`, and the English footer is visible

#### Scenario: Chinese visitor

- **WHEN** a visitor with browser language `zh-TW` opens the page
- **THEN** only the Chinese footer is visible and `document.title` is the Chinese game title

### Requirement: Dictionary consistency checks

`tools/check.js` SHALL fail when: a registered language's dictionary has a key that zh-TW lacks, or (for `en`) lacks a key that zh-TW has; a key used as a string literal in a `t('...')` call in public/js is missing from zh-TW; a ticket title pool differs in length between a registered language and zh-TW; or a game module in public/js other than the dictionary files contains a CJK character outside comments. In this spec a CJK character is any character in U+3000–U+303F (CJK punctuation), U+3400–U+4DBF, U+4E00–U+9FFF (Han ideographs) or U+FF00–U+FFEF (fullwidth forms).

#### Scenario: English dictionary incomplete

- **WHEN** a key is added to `zh-TW.js` but not to `en.js`
- **THEN** `node tools/check.js` exits with a non-zero code and names the missing key

#### Scenario: Chinese text left in code

- **WHEN** a module in public/js still has a string literal `'規則'` outside the dictionary files
- **THEN** `node tools/check.js` exits with a non-zero code and names the module
