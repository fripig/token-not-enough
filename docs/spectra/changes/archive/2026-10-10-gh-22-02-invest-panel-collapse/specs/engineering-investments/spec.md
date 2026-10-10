## ADDED Requirements

### Requirement: Investment panel collapse

The investment panel title SHALL stay a level-2 heading whose text is a toggle button that collapses and expands the whole panel body: the 寫 CLAUDE.md row, the other investments and the 採購電腦 row. While collapsed, the panel SHALL show only the title and 已做 N 項, where N is the same investment count the expanded panel shows; no investment or hardware button SHALL be rendered. While expanded, the panel SHALL show the same rows and text as without this requirement, with the title acting as the toggle. The title SHALL show ▾ when expanded and ▸ when collapsed, and the toggle button SHALL carry `aria-expanded` matching the state.

The state SHALL be a per-browser display preference stored in `localStorage` under the key `tokgame-invfold` (`1` for collapsed, `0` for expanded). With no stored value the panel SHALL be expanded. The stored state SHALL apply after a page reload and in new runs. Every read and write of the key SHALL be wrapped so that an unavailable or throwing `localStorage` never breaks rendering: the panel SHALL then start expanded and the toggle SHALL still switch the state for the current page.

The state SHALL NOT be stored in the game state or the save, SHALL NOT send a GA event and SHALL NOT write an action log line. Toggling SHALL NOT change hours, budgets, investments or any other game value.

#### Scenario: Collapse and expand

- **WHEN** the panel is expanded with two investments bought and the player clicks the panel title
- **THEN** the panel shows only the title with ▸ and 已做 2 項, no investment buttons are rendered, `aria-expanded` is false and `tokgame-invfold` is `1`; clicking the title again shows every row with ▾, `aria-expanded` is true and `tokgame-invfold` is `0`

#### Scenario: Default and remembered state

- **WHEN** the page renders the main screen
- **THEN** the panel state follows the stored key

##### Example: initial state

| Stored `tokgame-invfold` | Panel on render |
| --- | --- |
| absent | expanded |
| `1` | collapsed |
| `0` | expanded |

#### Scenario: Storage unavailable

- **WHEN** `localStorage` throws on every read and write and the player clicks the panel title
- **THEN** the main screen renders with the panel expanded before the click and collapsed after it, and no error is thrown

#### Scenario: Not part of the run

- **WHEN** the panel is collapsed and the game is saved at the start of a day
- **THEN** the save contents are identical to the save written with the panel expanded, and starting a new run keeps the panel collapsed
