# company-tech-stack Specification

## Purpose

Lets the player choose a company with a primary tech stack at the start of a run, which shapes the mix of incoming tickets and how costly unfamiliar tickets are to write by hand. It widens the game beyond a single Laravel backend role.

## Requirements

### Requirement: Company selection at run start

The opening setup modal SHALL present six work contents — Laravel 後端, Rails 後端, Rust 基礎設施, App 開發, SRE, DevOps — each labelled with its difficulty (Laravel 後端 and Rails 後端 難度 ★, App 開發, SRE and DevOps 難度 ★★, Rust 基礎設施 難度 ★★★), followed by a seventh option 全端打雜 (English: Jack of all trades) labelled 難度 ★★★★ with the description 什麼都接，前端以外都不熟 (English: Take anything; every stack but frontend is unfamiliar), as toggles under the label 熟悉的工作內容（可選 1–2 項，或全端打雜） (English: Stacks you know (pick 1–2, or Jack of all trades)). Directly under the label and before the toggles, the modal SHALL show one hint line stating that every stack sends tickets and giving the shares and the unfamiliar cost: 所有技術線都會進工單：選的佔 75%、前端 15%、其他 10%。沒選的算不熟，手寫要 ×2。 (English: Every stack sends tickets: 75% to your picks, 15% frontend, 10% the rest. Stacks you did not pick are unfamiliar; hand-writing takes ×2.). The three percentages SHALL come from the same named constants the ticket stack distribution uses (the selected share, the fe share, and the remainder), and the ×2 SHALL come from the unfamiliar hand-writing multiplier, so the hint changes when those values change. While 全端打雜 is selected the hint SHALL instead read 沒有熟悉的技術線：工單 85% 平分給六條線、前端 15%，前端以外手寫都要 ×2。 (English: No familiar stack: 85% of tickets are split over the six stacks, 15% frontend; hand-writing anything but frontend takes ×2.), with 85% from one minus the fe share, 15% from the fe share and ×2 from the unfamiliar multiplier. The player SHALL be able to select one or two work contents, or 全端打雜 alone: clicking an unselected work content SHALL add it when fewer than two are selected, and SHALL replace 全端打雜 when 全端打雜 is selected; when two are selected the unselected work contents SHALL be disabled while 全端打雜 stays enabled; clicking a selected work content SHALL remove it unless it is the only one selected; clicking 全端打雜 SHALL clear every work content and select 全端打雜, and clicking it while selected SHALL change nothing. 全端打雜 SHALL be stored as an empty stack list. The run SHALL store the selected stacks in the fixed order laravel, rails, rust, app, sre, devops. The default selection SHALL be Laravel 後端 alone. The intro text SHALL read 你是工程師，負責「<names>」。 followed by the existing budget sentence. The name shown in the header, the intro text, the day-1 log line, the resume modal and the month-end title SHALL be the selected work-content names joined with ＋ in that fixed order, or 全端打雜 (English: Jack of all trades) for an empty list. The selection SHALL persist to the next run started with 再玩一個月; a stored single-stack value SHALL be read as a one-stack selection, a stored empty list SHALL be read as 全端打雜, and any other invalid stored value SHALL fall back to Laravel 後端 alone. A saved run whose stack list is empty SHALL resume as 全端打雜. The weekly subscription adjustment modal SHALL NOT offer a work-content change. Stored identifiers (the run's stack list, GA's companies parameter, best-score keys and the save format) SHALL keep their existing names and values.

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
| laravel, app | 全端打雜 | (empty) | 全端打雜 stays enabled at two; clears both |
| (empty) | rust | rust | replaces 全端打雜 |
| (empty) | 全端打雜 | (empty) | no change |

#### Scenario: Fixed order

- **WHEN** the player clicks DevOps then App 開發 starting from a DevOps-only selection
- **THEN** the stored stacks are app then devops and the name reads App 開發＋DevOps

#### Scenario: Difficulty labels

- **WHEN** the opening modal is shown
- **THEN** the label reads 熟悉的工作內容（可選 1–2 項，或全端打雜） and the buttons show the difficulties in the table

##### Example: difficulty per option

| Option | Difficulty |
| --- | --- |
| Laravel 後端 | ★ |
| Rails 後端 | ★ |
| Rust 基礎設施 | ★★★ |
| App 開發 | ★★ |
| SRE | ★★ |
| DevOps | ★★ |
| 全端打雜 | ★★★★ |

#### Scenario: Hint line under the label

- **WHEN** the opening modal is shown in zh-TW
- **THEN** the line 所有技術線都會進工單：選的佔 75%、前端 15%、其他 10%。沒選的算不熟，手寫要 ×2。 appears after the label 熟悉的工作內容（可選 1–2 項，或全端打雜） and before the first work-content button

#### Scenario: Hint line in English

- **WHEN** the opening modal is shown in English
- **THEN** the label reads Stacks you know (pick 1–2, or Jack of all trades) and the hint reads Every stack sends tickets: 75% to your picks, 15% frontend, 10% the rest. Stacks you did not pick are unfamiliar; hand-writing takes ×2.

#### Scenario: Player picks 全端打雜

- **WHEN** the player clicks 全端打雜 in the opening modal and starts day 1
- **THEN** the run's stack list is empty, the intro reads 你是工程師，負責「全端打雜」。, the header shows 全端打雜 and the hint reads 沒有熟悉的技術線：工單 85% 平分給六條線、前端 15%，前端以外手寫都要 ×2。

#### Scenario: Selection persists across replay

- **WHEN** the player finishes a month as Rust 基礎設施＋App 開發 and clicks 再玩一個月
- **THEN** the opening modal preselects Rust 基礎設施 and App 開發

#### Scenario: Legacy and invalid stored values

- **WHEN** the stored selection is the string rust, or the string sre, or an empty array, or is an array of three stacks, or names an unknown stack
- **THEN** the selection becomes rust alone, sre alone, 全端打雜, and Laravel 後端 alone for the last two cases

#### Scenario: Weekly adjustment hides the picker

- **WHEN** the weekly 調整訂閱 modal opens on a Monday
- **THEN** no work-content picker is shown

#### Scenario: Identifiers unchanged

- **WHEN** a run with SRE＋DevOps selected sends game_start
- **THEN** the companies parameter is sre+devops and the best-score key at month end is tokgame-best-<mode>-sre+devops; a 全端打雜 run sends companies none and uses tokgame-best-<mode>-none

---
### Requirement: Ticket stack distribution

Every ticket SHALL carry exactly one stack from laravel, rails, rust, app, sre, devops, fe. Non-incident company tickets SHALL be assigned a selected stack with probability 0.75 (uniformly among the selected stacks), fe with probability 0.15, and an unselected work-content stack with probability 0.10 (uniformly among the unselected work-content stacks). With an empty selection (全端打雜), non-incident company tickets SHALL be fe with probability 0.15 and otherwise one of the six work-content stacks chosen uniformly, using the same number of random draws per ticket as a run with a selection. Incident tickets SHALL use a selected stack chosen uniformly, or one of the six work-content stacks chosen uniformly when the selection is empty. When sre is selected, each company ticket of a later day's intake that did not become an incident SHALL roll the day's incident probability a second time, and on a hit SHALL instead be an incident ticket with stack sre; runs without sre SHALL NOT make this second roll. Day 1 SHALL still start with 4 non-incident tickets, and the traffic-spike event SHALL NOT make the second roll. Outsourced tickets SHALL use the uniform stack rule of the outsource-gigs capability instead. Each ticket's title SHALL come from its stack's title pool at the ticket's complexity level, and the sre and devops pools SHALL each hold at least 3 titles per complexity 1–5, at least 4 trap titles and at least 3 incident titles.

#### Scenario: Incident uses a selected stack

- **WHEN** a traffic-spike event creates incident tickets during an App 開發 run
- **THEN** both incident tickets have stack app and titles from the app incident pool

#### Scenario: Long-run distribution with one stack

- **WHEN** 10,000 non-incident company tickets are generated for a Rails 後端 run
- **THEN** about 75% are rails, about 15% are fe, and laravel, rust, app, sre and devops are each about 2%

#### Scenario: Long-run distribution with two stacks

- **WHEN** 10,000 non-incident company tickets are generated for a Laravel 後端＋App 開發 run
- **THEN** laravel and app are each about 37.5%, fe about 15%, and rails, rust, sre and devops each about 2.5%

#### Scenario: Long-run distribution with no stack

- **WHEN** 10,000 non-incident company tickets are generated for a 全端打雜 run
- **THEN** about 15% are fe, laravel, rails, rust, app, sre and devops are each about 14.17%, and every ticket has a stack

#### Scenario: Incidents with no stack

- **WHEN** 1,000 incident tickets are generated for a 全端打雜 run
- **THEN** every incident ticket's stack is one of laravel, rails, rust, app, sre, devops and all six appear

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
| (empty) | 12 | 0.12 | 0.02 |

#### Scenario: SRE incident tickets

- **WHEN** an sre incident ticket is created by the second roll on day 8
- **THEN** it is complexity 4, due day 8 (day 9 with 監控告警), its title comes from the sre incident pool and it follows every other incident rule

---
### Requirement: Unfamiliar stack hand-writing cost

A ticket SHALL be unfamiliar when its stack is neither a selected stack, nor fe, nor a stack covered by an attended 技術線場 conference (see `engineering-investments`). Writing an unfamiliar ticket by hand SHALL take twice the normal manual hours, and the manual button SHALL show the doubled hours. Ticket cards for unfamiliar tickets SHALL show a 不熟 chip.

#### Scenario: Manual hours doubled

- **WHEN** a Laravel 後端 player selects a complexity 2 rust ticket with no previous tries
- **THEN** the manual button shows 8.8h and the card shows the 不熟 chip

##### Example: manual hours by familiarity

| Selected stacks | Attended conference | Ticket stack | Complexity | Tries | Manual hours |
| ------- | ------- | ------------ | ---------- | ----- | ------------ |
| laravel | none | laravel | 2 | 0 | 4.4h |
| laravel | none | fe | 2 | 0 | 4.4h |
| laravel | none | rust | 2 | 0 | 8.8h |
| app | none | rails | 3 | 1 | 10.6h |
| laravel, rust | none | rust | 2 | 0 | 4.4h |
| laravel, rust | none | app | 2 | 0 | 8.8h |
| laravel | none | sre | 2 | 0 | 8.8h |
| sre, devops | none | devops | 2 | 0 | 4.4h |
| laravel | COSCUP | rust | 2 | 0 | 3.5h |
| laravel | WebConf Taiwan | laravel | 2 | 0 | 3.5h |
| laravel | HITCON | rust | 2 | 0 | 8.8h |

---
### Requirement: Best score per mode and company

The month-end best score SHALL be stored and read per mode and selection under the key tokgame-best-<mode>-<stacks>, where <stacks> is the selected stack keys in the fixed order joined with +; a single selection therefore keeps the key tokgame-best-<mode>-<stack>, and an empty selection (全端打雜) uses <stacks> = none. When the usage challenge toggle is on, the key SHALL be suffixed with -burn (tokgame-best-<mode>-<stacks>-burn). When that key has no value, the toggle is off and the selection is laravel alone, the legacy key tokgame-best-<mode> SHALL be read as the previous best. Storage failures SHALL NOT interrupt the game.

#### Scenario: Legacy Laravel best is kept

- **WHEN** localStorage holds tokgame-best-parallel = 4200 and no tokgame-best-parallel-laravel, and a Laravel-only parallel run ends
- **THEN** the receipt shows 4,200 as the previous best

#### Scenario: Pair key

- **WHEN** a Laravel 後端＋App 開發 parallel run ends with a new best
- **THEN** the score is written under tokgame-best-parallel-laravel+app and the legacy key is not read

#### Scenario: Usage challenge key

- **WHEN** a Laravel-only parallel run with the usage challenge on ends, and localStorage holds tokgame-best-parallel = 4200 and tokgame-best-parallel-laravel = 5000
- **THEN** no previous best is shown and the score is written under tokgame-best-parallel-laravel-burn

#### Scenario: 全端打雜 key

- **WHEN** a 全端打雜 serial run ends with a new best, once with the usage challenge off and once on
- **THEN** the scores are written under tokgame-best-serial-none and tokgame-best-serial-none-burn, and the legacy key is not read

#### Scenario: Storage unavailable

- **WHEN** localStorage access throws at month end
- **THEN** the receipt renders without a previous-best line and no error is thrown
