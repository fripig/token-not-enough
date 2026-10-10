# parallel-slots Specification

## Purpose

Lets the player choose how many background agents run at once in parallel mode, turning the PR review load and merge-conflict trade-off of running agents concurrently into a decision made at the start of each run.

## Requirements

### Requirement: Slot count selection

When parallel mode is selected in the opening setup modal, the modal SHALL offer slot counts 2, 3, 4, 5 and 6 with 3 selected by default, and confirming SHALL set the run's slot count. Each slot button SHALL show the maximum PR review load 審 PR 最多 ×<1 + 0.25 × (n − 1), two decimals> and the maximum conflict chance 衝突最多 <10 × (n − 1)>%. The picker SHALL NOT appear for serial mode or in the weekly subscription adjustment modal. The slot count SHALL persist to the next run started with 再玩一個月, and an invalid stored value SHALL fall back to 3.

#### Scenario: Pick five slots

- **WHEN** the player selects parallel mode and 5 slots, then starts day 1
- **THEN** the background-agent list shows 0 / 5

#### Scenario: Serial mode hides the picker

- **WHEN** the player selects serial mode in the opening modal
- **THEN** no slot buttons are shown

#### Scenario: Replay keeps the count

- **WHEN** a parallel run with 6 slots ends and the player clicks 再玩一個月
- **THEN** the opening modal preselects 6 slots

#### Scenario: Slot button labels

- **WHEN** the opening modal shows the 4-slot button
- **THEN** it shows 審 PR 最多 ×1.75 and 衝突最多 30%


<!-- @trace
source: gh-12-01-parallel-review-load
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/calc.js
  - public/js/view.js
  - public/js/actions.js
  - public/js/modals.js
  - tools/check/parallel-slots.test.js
-->

---
### Requirement: Slot limit on dispatch

In parallel mode the player SHALL NOT be able to have more background agents running than the chosen slot count; the dispatch button SHALL be disabled and the warning 工作槽都滿了，先等一個 agent 跑完。 SHALL be shown when all slots are busy. PR review load and merge-conflict chance SHALL keep their per-running-agent formulas. A dispatch's tokens SHALL NOT depend on the number of running agents.

#### Scenario: Two slots fill up

- **WHEN** the run has 2 slots and 2 agents are running
- **THEN** a third dispatch is refused and the dispatch button is disabled

##### Example: maximum PR review load by slot count

| Slots | Other agents still running at most | PR review load |
| ----- | ---------------------------------- | -------------- |
| 2 | 1 | 1.25 |
| 4 | 3 | 1.75 |
| 6 | 5 | 2.25 |


<!-- @trace
source: gh-12-01-parallel-review-load
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/calc.js
  - public/js/view.js
  - public/js/actions.js
  - public/js/modals.js
  - tools/check/parallel-slots.test.js
-->

---
### Requirement: Slot count on the receipt

The month-end receipt title for a parallel run SHALL include the slot count.

#### Scenario: Receipt title

- **WHEN** a Laravel 新聞站 parallel run with 4 slots ends
- **THEN** the receipt title is 月底結算・Laravel 新聞站・平行模式（4 個 agent）

---
### Requirement: Merge conflicts leave a conflict ticket

In parallel mode, when a background job finishes and the merge-conflict chance (0.1 per other running agent, halved with 補測試) is rolled on a job that would otherwise succeed, the ticket SHALL NOT complete and SHALL NOT be treated as a failed attempt. It SHALL stay in the queue as a conflict ticket titled 解決衝突：<original title>, with complexity max(1, original complexity − 1), base tokens for that complexity, and the original's tech stack, client, sensitivity, incident flag, due date, KPI and App Store review flag. The job's tokens SHALL be charged as usual, no PR review time SHALL be spent, and the receipt's conflict count SHALL increase by 1.

A conflict ticket SHALL be resolvable with any dispatch method or by hand under the normal ticket rules; completing it SHALL add the inherited KPI and the done count. A conflict ticket SHALL NOT roll a merge conflict, SHALL NOT be a trap, and SHALL NOT offer 評估架構 or 找主管重新評估. A conflict ticket still open on its due date SHALL receive the normal overdue penalty.

#### Scenario: Conflict on a successful job

- **WHEN** a successful Laravel cx 3 job finishes with 2 other agents running and the conflict roll hits
- **THEN** the queue holds 解決衝突：<title> with complexity 2 and the original due date and KPI, KPI and done count are unchanged, and the receipt shows 合併衝突 1 次

##### Example: conflict ticket complexity

| Original complexity | Conflict ticket complexity |
| ------------------- | -------------------------- |
| 1 | 1 |
| 3 | 2 |
| 5 | 4 |

#### Scenario: Resolving the conflict ticket

- **WHEN** the player dispatches the conflict ticket with any model and it succeeds while 3 other agents are running
- **THEN** no conflict is rolled, the ticket leaves the queue, and the original KPI is added

#### Scenario: No evaluate or rescope on a conflict ticket

- **WHEN** the player selects a conflict ticket
- **THEN** the dispatch panel offers no 評估架構 and no 找主管重新評估 button

#### Scenario: Conflict ticket goes overdue

- **WHEN** a conflict ticket is still in the queue at the end of its due day
- **THEN** half its KPI is deducted and trust drops by 4 (8 for an incident)

<!-- @trace
source: merge-conflict-resolve
updated: 2026-10-09
code:
  - public/js/game.js
  - tools/check/parallel-slots.test.js
-->