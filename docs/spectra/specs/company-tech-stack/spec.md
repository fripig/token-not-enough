# company-tech-stack Specification

## Purpose

Lets the player choose a company with a primary tech stack at the start of a run, which shapes the mix of incoming tickets and how costly unfamiliar tickets are to write by hand. It widens the game beyond a single Laravel backend role.

## Requirements

### Requirement: Company selection at run start

The opening setup modal SHALL present six work contents — Laravel 後端, Rails 後端, Rust 基礎設施, App 開發, SRE, DevOps — each labelled with its difficulty (Laravel 後端 and Rails 後端 難度 ★, App 開發, SRE and DevOps 難度 ★★, Rust 基礎設施 難度 ★★★), as toggles under the label 工作內容（可選 1–2 項）. The player SHALL be able to select one or two work contents: clicking an unselected option SHALL add it when fewer than two are selected; when two are selected the unselected options SHALL be disabled; clicking a selected option SHALL remove it unless it is the only one selected. The run SHALL store the selected stacks in the fixed order laravel, rails, rust, app, sre, devops. The default selection SHALL be Laravel 後端 alone. The intro text SHALL read 你是工程師，負責「<names>」。 followed by the existing budget sentence. The name shown in the header, the intro text, the day-1 log line, the resume modal and the month-end title SHALL be the selected work-content names joined with ＋ in that fixed order. The selection SHALL persist to the next run started with 再玩一個月; a stored single-stack value SHALL be read as a one-stack selection, and any invalid stored value SHALL fall back to Laravel 後端 alone. The weekly subscription adjustment modal SHALL NOT offer a work-content change. Stored identifiers (the run's stack list, GA's companies parameter, best-score keys and the save format) SHALL keep their existing names and values.

#### Scenario: Player picks a work content

- **WHEN** the player keeps only Rails 後端 selected in the opening modal and starts day 1
- **THEN** the run's stacks are rails and the header and month-end receipt show Rails 後端

#### Scenario: Player picks two work contents

- **WHEN** the player selects SRE in addition to the default Laravel 後端 and starts day 1
- **THEN** the run's stacks are laravel and sre, the header shows Laravel 後端＋SRE and the intro reads 你是工程師，負責「Laravel 後端＋SRE」。

#### Scenario: Selection limits

- **WHEN** the selection changes as in the table
- **THEN** the resulting selection matches

##### Example: toggle behaviour

| Selected before | Click | Selected after | Notes |
| --- | --- | --- | --- |
| laravel | devops | laravel, devops | add second |
| laravel, app | sre | laravel, app | sre button disabled |
| laravel, app | laravel | app | remove one |
| sre | sre | sre | cannot remove the last |

#### Scenario: Fixed order

- **WHEN** the player clicks DevOps then App 開發 starting from a DevOps-only selection
- **THEN** the stored stacks are app then devops and the name reads App 開發＋DevOps

#### Scenario: Difficulty labels

- **WHEN** the opening modal is shown
- **THEN** the label reads 工作內容（可選 1–2 項） and the buttons show the difficulties in the table

##### Example: difficulty per option

| Option | Difficulty |
| --- | --- |
| Laravel 後端 | ★ |
| Rails 後端 | ★ |
| Rust 基礎設施 | ★★★ |
| App 開發 | ★★ |
| SRE | ★★ |
| DevOps | ★★ |

#### Scenario: Selection persists across replay

- **WHEN** the player finishes a month as Rust 基礎設施＋App 開發 and clicks 再玩一個月
- **THEN** the opening modal preselects Rust 基礎設施 and App 開發

#### Scenario: Legacy and invalid stored values

- **WHEN** the stored selection is the string rust, or the string sre, or is an array of three stacks, or names an unknown stack
- **THEN** the selection becomes rust alone, sre alone, and Laravel 後端 alone for the last two cases

#### Scenario: Weekly adjustment hides the picker

- **WHEN** the weekly 調整訂閱 modal opens on a Monday
- **THEN** no work-content picker is shown

#### Scenario: Identifiers unchanged

- **WHEN** a run with SRE＋DevOps selected sends game_start
- **THEN** the companies parameter is sre+devops and the best-score key at month end is tokgame-best-<mode>-sre+devops


<!-- @trace
source: gh-18-01-work-roles-sre-devops
updated: 2026-10-10
code:
  - public/js/data.js
  - public/js/calc.js
  - public/js/actions.js
  - public/js/state.js
  - public/js/modals.js
-->

---
### Requirement: Ticket stack distribution

Every ticket SHALL carry exactly one stack from laravel, rails, rust, app, sre, devops, fe. Non-incident company tickets SHALL be assigned a selected stack with probability 0.75 (uniformly among the selected stacks), fe with probability 0.15, and an unselected work-content stack with probability 0.10 (uniformly among the unselected work-content stacks). Incident tickets SHALL use a selected stack chosen uniformly. When sre is selected, each company ticket of a later day's intake that did not become an incident SHALL roll the day's incident probability a second time, and on a hit SHALL instead be an incident ticket with stack sre; runs without sre SHALL NOT make this second roll. Day 1 SHALL still start with 4 non-incident tickets, and the traffic-spike event SHALL NOT make the second roll. Outsourced tickets SHALL use the uniform stack rule of the outsource-gigs capability instead. Each ticket's title SHALL come from its stack's title pool at the ticket's complexity level, and the sre and devops pools SHALL each hold at least 3 titles per complexity 1–5, at least 4 trap titles and at least 3 incident titles.

#### Scenario: Incident uses a selected stack

- **WHEN** a traffic-spike event creates incident tickets during an App 開發 run
- **THEN** both incident tickets have stack app and titles from the app incident pool

#### Scenario: Long-run distribution with one stack

- **WHEN** 10,000 non-incident company tickets are generated for a Rails 後端 run
- **THEN** about 75% are rails, about 15% are fe, and laravel, rust, app, sre and devops are each about 2%

#### Scenario: Long-run distribution with two stacks

- **WHEN** 10,000 non-incident company tickets are generated for a Laravel 後端＋App 開發 run
- **THEN** laravel and app are each about 37.5%, fe about 15%, and rails, rust, sre and devops each about 2.5%

#### Scenario: Incidents with two stacks

- **WHEN** 1,000 incident tickets are generated for a Laravel 後端＋App 開發 run
- **THEN** every incident ticket's stack is laravel or app and both appear

#### Scenario: SRE doubles the incident roll

- **WHEN** 10,000 tickets are generated by the day intake for the runs in the table
- **THEN** the incident shares are within ±0.01 of the table

##### Example: incident share by selection and day

| Selected | Day | All incidents | sre incidents |
| --- | --- | --- | --- |
| laravel | 12 | 0.12 | 0 |
| sre | 12 | 0.2256 | 0.2256 |
| sre | 2 | 0.0591 | 0.0591 |
| laravel, sre | 12 | 0.2256 | 0.1656 |

#### Scenario: SRE incident tickets

- **WHEN** an sre incident ticket is created by the second roll on day 8
- **THEN** it is complexity 4, due day 8 (day 9 with 監控告警), its title comes from the sre incident pool and it follows every other incident rule


<!-- @trace
source: gh-18-01-work-roles-sre-devops
updated: 2026-10-10
code:
  - public/js/data.js
  - public/js/calc.js
  - public/js/actions.js
  - public/js/state.js
  - public/js/modals.js
-->

---
### Requirement: Unfamiliar stack hand-writing cost

A ticket SHALL be unfamiliar when its stack is neither a selected stack nor fe. Writing an unfamiliar ticket by hand SHALL take twice the normal manual hours, and the manual button SHALL show the doubled hours. Ticket cards for unfamiliar tickets SHALL show a 不熟 chip.

#### Scenario: Manual hours doubled

- **WHEN** a Laravel 後端 player selects a complexity 2 rust ticket with no previous tries
- **THEN** the manual button shows 8.8h and the card shows the 不熟 chip

##### Example: manual hours by familiarity

| Selected stacks | Ticket stack | Complexity | Tries | Manual hours |
| ------- | ------------ | ---------- | ----- | ------------ |
| laravel | laravel | 2 | 0 | 4.4h |
| laravel | fe | 2 | 0 | 4.4h |
| laravel | rust | 2 | 0 | 8.8h |
| app | rails | 3 | 1 | 10.6h |
| laravel, rust | rust | 2 | 0 | 4.4h |
| laravel, rust | app | 2 | 0 | 8.8h |
| laravel | sre | 2 | 0 | 8.8h |
| sre, devops | devops | 2 | 0 | 4.4h |


<!-- @trace
source: gh-18-01-work-roles-sre-devops
updated: 2026-10-10
code:
  - public/js/data.js
  - public/js/calc.js
  - public/js/actions.js
  - public/js/state.js
  - public/js/modals.js
-->

---
### Requirement: Best score per mode and company

The month-end best score SHALL be stored and read per mode and selection under the key tokgame-best-<mode>-<stacks>, where <stacks> is the selected stack keys in the fixed order joined with +; a single selection therefore keeps the key tokgame-best-<mode>-<stack>. When that key has no value and the selection is laravel alone, the legacy key tokgame-best-<mode> SHALL be read as the previous best. Storage failures SHALL NOT interrupt the game.

#### Scenario: Legacy Laravel best is kept

- **WHEN** localStorage holds tokgame-best-parallel = 4200 and no tokgame-best-parallel-laravel, and a Laravel-only parallel run ends
- **THEN** the receipt shows 4,200 as the previous best

#### Scenario: Pair key

- **WHEN** a Laravel 後端＋App 開發 parallel run ends with a new best
- **THEN** the score is written under tokgame-best-parallel-laravel+app and the legacy key is not read

#### Scenario: Storage unavailable

- **WHEN** localStorage access throws at month end
- **THEN** the receipt renders without a previous-best line and no error is thrown

<!-- @trace
source: gh-18-01-work-roles-sre-devops
updated: 2026-10-10
code:
  - public/js/data.js
  - public/js/calc.js
  - public/js/actions.js
  - public/js/state.js
  - public/js/modals.js
-->