# company-tech-stack Specification

## Purpose

Lets the player choose a company with a primary tech stack at the start of a run, which shapes the mix of incoming tickets and how costly unfamiliar tickets are to write by hand. It widens the game beyond a single Laravel backend role.

## Requirements

### Requirement: Company selection at run start

The opening setup modal SHALL present four companies — Laravel 新聞站, Rails SaaS, Rust 基礎設施, App 團隊 — each labelled with its difficulty (Laravel 新聞站 and Rails SaaS 難度 ★, App 團隊 難度 ★★, Rust 基礎設施 難度 ★★★), as toggles under the label 公司（可選 1–2 條主技術線）. The player SHALL be able to select one or two companies: clicking an unselected company SHALL add it when fewer than two are selected; when two are selected the unselected companies SHALL be disabled; clicking a selected company SHALL remove it unless it is the only one selected. The run SHALL store the selected stacks in the fixed order laravel, rails, rust, app. The default selection SHALL be Laravel 新聞站 alone. The company name shown in the header, the intro text, the day-1 log line and the month-end title SHALL be the selected company names joined with ＋ in that fixed order. The selection SHALL persist to the next run started with 再玩一個月; a stored single-stack value SHALL be read as a one-stack selection, and any invalid stored value SHALL fall back to Laravel 新聞站 alone. The weekly subscription adjustment modal SHALL NOT offer a company change.

#### Scenario: Player picks a company

- **WHEN** the player keeps only Rails SaaS selected in the opening modal and starts day 1
- **THEN** the run's stacks are rails and the header and month-end receipt show the Rails SaaS company name

#### Scenario: Player picks two companies

- **WHEN** the player selects App 團隊 in addition to the default Laravel 新聞站 and starts day 1
- **THEN** the run's stacks are laravel and app and the header shows Laravel 新聞站＋App 團隊

#### Scenario: Selection limits

- **WHEN** the selection changes as in the table
- **THEN** the resulting selection matches

##### Example: toggle behaviour

| Selected before | Click | Selected after | Notes |
| --- | --- | --- | --- |
| laravel | app | laravel, app | add second |
| laravel, app | rust | laravel, app | rust button disabled |
| laravel, app | laravel | app | remove one |
| app | app | app | cannot remove the last |

#### Scenario: Fixed order

- **WHEN** the player clicks App 團隊 then Laravel 新聞站 starting from an App-only selection
- **THEN** the stored stacks are laravel then app and the name reads Laravel 新聞站＋App 團隊

#### Scenario: Difficulty labels

- **WHEN** the opening modal is shown
- **THEN** the Rust 基礎設施 button shows 難度 ★★★ and the Laravel 新聞站 button shows 難度 ★

#### Scenario: Selection persists across replay

- **WHEN** the player finishes a month as Rust 基礎設施＋App 團隊 and clicks 再玩一個月
- **THEN** the opening modal preselects Rust 基礎設施 and App 團隊

#### Scenario: Legacy and invalid stored values

- **WHEN** the stored selection is the string rust, or is an array of three stacks, or names an unknown stack
- **THEN** the selection becomes rust alone for the string and Laravel 新聞站 alone for the other two cases

#### Scenario: Weekly adjustment hides the picker

- **WHEN** the weekly 調整訂閱 modal opens on a Monday
- **THEN** no company picker is shown


<!-- @trace
source: multi-stack-company
updated: 2026-10-09
code:
  - tools/check.js
  - tools/sim.js
  - public/js/game.js
-->

---
### Requirement: Ticket stack distribution

Every ticket SHALL carry exactly one stack from laravel, rails, rust, app, fe. Non-incident company tickets SHALL be assigned a selected stack with probability 0.75 (uniformly among the selected stacks), fe with probability 0.15, and an unselected company stack with probability 0.10 (uniformly among the unselected company stacks). Incident tickets SHALL use a selected stack chosen uniformly. Outsourced tickets SHALL use the uniform stack rule of the outsource-gigs capability instead. Each ticket's title SHALL come from its stack's title pool at the ticket's complexity level.

#### Scenario: Incident uses a selected stack

- **WHEN** a traffic-spike event creates incident tickets during an App 團隊 run
- **THEN** both incident tickets have stack app and titles from the app incident pool

#### Scenario: Long-run distribution with one stack

- **WHEN** 10,000 non-incident company tickets are generated for a Rails SaaS run
- **THEN** about 75% are rails, about 15% are fe, and the remaining tickets are spread across laravel, rust, and app

#### Scenario: Long-run distribution with two stacks

- **WHEN** 10,000 non-incident company tickets are generated for a Laravel 新聞站＋App 團隊 run
- **THEN** laravel and app are each about 37.5%, fe about 15%, and rails and rust each about 5%

#### Scenario: Incidents with two stacks

- **WHEN** 1,000 incident tickets are generated for a Laravel 新聞站＋App 團隊 run
- **THEN** every incident ticket's stack is laravel or app and both appear


<!-- @trace
source: outsource-gigs
updated: 2026-10-09
code:
  - public/js/state.js
  - public/css/style.css
  - public/js/data.js
  - public/js/modals.js
  - tools/check.js
  - docs/DESIGN.md
  - tools/sim.js
  - public/js/main.js
  - public/js/actions.js
  - public/js/calc.js
  - public/js/view.js
-->

---
### Requirement: Unfamiliar stack hand-writing cost

A ticket SHALL be unfamiliar when its stack is neither a selected stack nor fe. Writing an unfamiliar ticket by hand SHALL take twice the normal manual hours, and the manual button SHALL show the doubled hours. Ticket cards for unfamiliar tickets SHALL show a 不熟 chip.

#### Scenario: Manual hours doubled

- **WHEN** a Laravel 新聞站 player selects a complexity 2 rust ticket with no previous tries
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


<!-- @trace
source: multi-stack-company
updated: 2026-10-09
code:
  - tools/check.js
  - tools/sim.js
  - public/js/game.js
-->

---
### Requirement: Best score per mode and company

The month-end best score SHALL be stored and read per mode and selection under the key tokgame-best-<mode>-<stacks>, where <stacks> is the selected stack keys in the fixed order joined with +; a single selection therefore keeps the key tokgame-best-<mode>-<stack>. When that key has no value and the selection is laravel alone, the legacy key tokgame-best-<mode> SHALL be read as the previous best. Storage failures SHALL NOT interrupt the game.

#### Scenario: Legacy Laravel best is kept

- **WHEN** localStorage holds tokgame-best-parallel = 4200 and no tokgame-best-parallel-laravel, and a Laravel-only parallel run ends
- **THEN** the receipt shows 4,200 as the previous best

#### Scenario: Pair key

- **WHEN** a Laravel 新聞站＋App 團隊 parallel run ends with a new best
- **THEN** the score is written under tokgame-best-parallel-laravel+app and the legacy key is not read

#### Scenario: Storage unavailable

- **WHEN** localStorage access throws at month end
- **THEN** the receipt renders without a previous-best line and no error is thrown

<!-- @trace
source: multi-stack-company
updated: 2026-10-09
code:
  - tools/check.js
  - tools/sim.js
  - public/js/game.js
-->