## ADDED Requirements

### Requirement: Investment reference links

Every engineering investment (寫 CLAUDE.md and each investment in `INV_KEYS`) SHALL carry at least one reference link to a real page about the tool or practice, as a label and an `https://` URL; 導入 SDD level 2 SHALL carry its own links (Spectra, OpenSpec, Spec Kit). Every domestic conference and every machine in 採購電腦 SHALL carry one `https://` URL. The same URL SHALL be used in every language.

The 工程投資 tab SHALL show each investment's links at the end of its row description, and 導入 SDD's level 2 links after its level 2 text. The 國內研討會 row and the 採購電腦 row SHALL each show one extra line, introduced by 參考：, linking every conference (in `CONF_KEYS` order) or machine (in `HW_KEYS` order) by its displayed name. No link SHALL be placed inside a button.

Every link SHALL open in a new tab with `target="_blank"` and `rel="noopener noreferrer"` and SHALL show `↗` after its label. Following a link SHALL NOT change game state, the save slot, the action log, or send a GA event.

#### Scenario: Investment row shows its link

- **WHEN** the player opens the 工程投資 tab
- **THEN** the 單元測試 row description ends with a link labelled Unit Test (Martin Fowler) to https://martinfowler.com/bliki/UnitTest.html that opens in a new tab

#### Scenario: SDD shows level 1 and level 2 links

- **WHEN** the player opens the 工程投資 tab
- **THEN** the 導入 SDD row links Superpowers after the level 1 text and Spectra, OpenSpec and Spec Kit after the level 2 text

#### Scenario: Conference and machine links sit outside the buttons

- **WHEN** the player opens the 工程投資 tab
- **THEN** the 國內研討會 row shows a 參考： line with ten links in `CONF_KEYS` order, the 採購電腦 row shows a 參考： line with three links in `HW_KEYS` order, and no `<a>` element appears inside any `<button>` in the tab

#### Scenario: English uses the same URLs

- **WHEN** the language is English and the player opens the 工程投資 tab
- **THEN** the conference and machine lines start with References: and every URL is the same as in 繁體中文

#### Scenario: Clicking a link changes nothing

- **WHEN** the player clicks the pre-commit link
- **THEN** a new tab opens to https://pre-commit.com/ and the game screen, state and log are unchanged
