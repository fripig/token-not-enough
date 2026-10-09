# play-analytics Specification

## Purpose

Records how far players get in a month and with which settings, by sending Google Analytics events at game start, at the start of each day and at month end. The data tells the maintainer where players stop playing and which setups they choose.

## Requirements

### Requirement: Event delivery

The game SHALL send each analytics event as `gtag('event', <name>, <parameters>)`. When no global `gtag` function exists (local server without the tag, node tools, blocked by the browser), sending an event SHALL do nothing. An exception thrown while sending SHALL be caught so the game continues normally.

#### Scenario: No gtag

- **WHEN** no global `gtag` function exists and a run is started, played through day 20 and ended
- **THEN** no error is thrown and the month-end receipt opens

#### Scenario: gtag throws

- **WHEN** the global `gtag` throws on every call and the player confirms the opening setup
- **THEN** no error is thrown and the run starts on day 1


<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
### Requirement: Common event parameters

Every event SHALL carry these parameters, read from the run's state at the moment the event is sent:

##### Example: parameters for a parallel Laravel + Rust run with 4 slots, advanced mode and outsourcing on day 3

| Parameter | Value |
| --- | --- |
| `game_version` | the value of `GAME_VERSION` (see Game version stamp) |
| `game_mode` | `parallel` (or `serial`) |
| `companies` | the selected stacks joined with `+` in the fixed company order, here `laravel+rust` |
| `slots` | `4`; always `1` in serial mode |
| `advanced` | `true` |
| `outsource` | `true` |
| `day` | `3` |

#### Scenario: Serial run parameters

- **WHEN** the player confirms the opening setup with only Rails selected, serial mode, 5 slots stored, normal mode and no outsourcing
- **THEN** the `game_start` event carries `game_mode` `serial`, `companies` `rails`, `slots` `1`, `advanced` `false`, `outsource` `false`, `day` `1`

#### Scenario: Parallel run parameters

- **WHEN** the player confirms the opening setup with Laravel and Rust, parallel mode, 4 slots, advanced mode and outsourcing
- **THEN** the `game_start` event carries `game_mode` `parallel`, `companies` `laravel+rust`, `slots` `4`, `advanced` `true`, `outsource` `true`


<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
### Requirement: Game start

When the player confirms the opening setup modal (開始第 1 天), the game SHALL send `game_start` and then `day_reached` with `day` 1, after the run's settings from the modal are applied. Confirming or closing the weekly 調整訂閱 modal SHALL NOT send any event. Starting a new month with 再玩一個月 SHALL send the events again when its opening setup is confirmed.

#### Scenario: Opening confirm

- **WHEN** the player confirms the opening setup
- **THEN** exactly two events are sent, `game_start` then `day_reached`, both with `day` 1

#### Scenario: Weekly adjustment

- **WHEN** the player confirms the weekly 調整訂閱 modal on day 6
- **THEN** no event is sent


<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
### Requirement: Day reached

Each time a day ends and the next day starts (days 2–20), the game SHALL send one `day_reached` event with `day` set to the new day, after the day's new tickets are added and before the day summary opens. Ending day 20 SHALL NOT send `day_reached`.

#### Scenario: Full month

- **WHEN** the player confirms the opening setup and ends the day 20 times
- **THEN** `day_reached` is sent once for each day 1 through 20, in order, and no `day_reached` has `day` 21


<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
### Requirement: Game end

When the month-end receipt opens, the game SHALL send `game_end` with the common parameters plus `score` (the receipt's total score) and `grade` (S, A, B, C or D, as shown on the receipt).

#### Scenario: Month end

- **WHEN** a serial run reaches the month-end receipt with KPI 300, trust 70, no personal spending and no audits
- **THEN** `game_end` is sent once with `day` 20, `score` 4280 and `grade` A


<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
### Requirement: Game version stamp

`public/js/data.js` SHALL define `GAME_VERSION` as `'dev'` in the repository. The GitHub Pages workflow SHALL replace it with the first 7 characters of the deployed commit hash before uploading `public/`, and SHALL fail the deployment when the replacement did not happen.

#### Scenario: Repository value

- **WHEN** the game modules are loaded from the repository
- **THEN** `GAME_VERSION` is `dev` and every event carries `game_version` `dev`

#### Scenario: Deploy stamp

- **WHEN** the deploy workflow runs for commit `aa66a04…`
- **THEN** the published `js/data.js` defines `GAME_VERSION` as `aa66a04`

<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->