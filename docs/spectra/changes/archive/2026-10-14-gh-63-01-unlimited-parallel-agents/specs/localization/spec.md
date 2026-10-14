## MODIFIED Requirements

### Requirement: Language switch

The game header SHALL show one button per registered language, labelled with its display name, with the current language highlighted. The setup modal, both at run start and for the Monday 調整訂閱, SHALL show the same buttons; a click there SHALL apply the same effects, redraw the setup modal in the new language and keep every choice already made in it (work content, mode, freelance, advanced, plans, seat request). Clicking the current language SHALL do nothing (no stored preference). Clicking a language that is not current SHALL set it as the current language, write its id to `localStorage` key `tokgame-lang` (write wrapped in try/catch; a failed write SHALL keep the choice for this page only), set `<html lang>` to the language id, set `document.title` from the dictionary, show only that language's footer and redraw the game screen. The switch SHALL NOT change the game state, SHALL NOT write the save, SHALL NOT send a GA event and SHALL NOT write a log entry. It SHALL be usable at any point of a run, including mid-day with agents running.

#### Scenario: Switching mid-run

- **WHEN** the player is on day 7 in zh-TW with two agents running and clicks English
- **THEN** the header, ticket cards, dispatch panel and buttons redraw in English, `tokgame-lang` is `en`, `<html lang>` is `en`, the save in `tokgame-save` is unchanged, the two agents keep running with unchanged times, and no GA event is sent

#### Scenario: Switching in the setup modal

- **WHEN** the run-start setup modal is open in zh-TW, the player has picked Rust, parallel mode and 接外包, and clicks English in the modal
- **THEN** the modal redraws in English with Rust, parallel mode and 接外包 still selected, `tokgame-lang` is `en`, and no GA event is sent

#### Scenario: Preference survives a reload

- **WHEN** the player switches to English and reloads the page
- **THEN** the resume prompt and the game screen are in English

#### Scenario: Storage blocked

- **WHEN** `localStorage.setItem` throws and the player clicks English
- **THEN** the page switches to English without an error, and a reload picks the language again from the browser language list
