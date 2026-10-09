# engineering-investments Specification

## Purpose

Lets the player spend working hours and company API budget on engineering investments — CLAUDE.md per stack, tests, skills, MCP docs and spec-driven development — whose effects last until month end. It gives a run a sense of getting stronger and rewards early planning over pure ticket throughput.

## Requirements

### Requirement: Investment purchase

The game SHALL offer these investments, each purchasable once per run (寫 CLAUDE.md once per stack for each of the four company stacks and fe), costing player hours and company API budget:

| Investment | Hours | Company budget |
| --- | --- | --- |
| 寫 CLAUDE.md | 3 | NT$300 |
| 補測試 | 6 | NT$600 |
| 做 skills | 3 | NT$400 |
| 接 MCP 文件 | 3 | NT$400 |
| 導入 SDD | 6 | NT$500 |

A purchase SHALL be refused when already bought, when remaining hours are below the hour cost, or when the company API budget is below the budget cost. A purchase SHALL deduct the budget from the company API budget and count it in the day's company spend and the month's company bill. In parallel mode it SHALL advance the clock by the hour cost (background agents keep running and settle, and the PR review time of an agent that finishes during the investment is added on top, as with every other clock advance); in serial mode it SHALL subtract the hours. It SHALL NOT be blocked by a busy local GPU. Investments SHALL reset at the start of each run.

#### Scenario: Successful purchase

- **WHEN** the player buys 補測試 with 8 hours left and NT$12,000 company budget in serial mode
- **THEN** 2 hours remain, company budget is NT$11,400 and 補測試 shows 已完成

#### Scenario: Refusals

- **WHEN** a purchase is attempted in each case in the table
- **THEN** nothing changes

##### Example: refusal cases

| Case | State |
| --- | --- |
| already bought | 補測試 already bought |
| not enough hours | 5 hours left, buying 導入 SDD |
| not enough budget | company budget NT$200, buying 寫 CLAUDE.md |


<!-- @trace
source: dispatch-presets-and-investments
updated: 2026-10-09
code:
  - public/css/style.css
  - public/js/game.js
  - tools/check.js
  - tools/sim.js
-->

---
### Requirement: CLAUDE.md effect

For a ticket whose stack has CLAUDE.md, agent token estimates SHALL be multiplied by 0.85 and the base success chance SHALL increase by 0.06 before clamping to 0.05–0.97.

#### Scenario: Laravel CLAUDE.md

- **WHEN** CLAUDE.md is bought for laravel and a complexity 4 laravel ticket is estimated with Sonnet without review
- **THEN** tokens are 0.85 × the estimate without the investment and success is 0.86 instead of 0.80

#### Scenario: Other stack unaffected

- **WHEN** CLAUDE.md is bought for laravel and a fe ticket is estimated
- **THEN** the estimate equals the estimate without the investment


<!-- @trace
source: dispatch-presets-and-investments
updated: 2026-10-09
code:
  - public/css/style.css
  - public/js/game.js
  - tools/check.js
  - tools/sim.js
-->

---
### Requirement: Tests effect

With 補測試, the self-review catch rate SHALL increase by 0.10 (capped at 0.95) for review levels above 0, and the merge conflict probability on completion in parallel mode SHALL be halved.

#### Scenario: Catch rate and conflicts

- **WHEN** 補測試 is bought, Sonnet (capability 4) uses 自審, and two other agents are running at completion
- **THEN** catch rate is 0.87 and conflict probability is 0.1


<!-- @trace
source: dispatch-presets-and-investments
updated: 2026-10-09
code:
  - public/css/style.css
  - public/js/game.js
  - tools/check.js
  - tools/sim.js
-->

---
### Requirement: MCP docs effect

With 接 MCP 文件, the architecture evaluation reveal rate SHALL increase by 0.2 (capped at 0.95) and evaluation hours SHALL be halved; evaluation tokens SHALL be unchanged.

#### Scenario: Evaluation with Sonnet

- **WHEN** 接 MCP 文件 is bought and Sonnet evaluates a ticket
- **THEN** reveal rate is 0.95 and evaluation takes 0.2 hours


<!-- @trace
source: dispatch-presets-and-investments
updated: 2026-10-09
code:
  - public/css/style.css
  - public/js/game.js
  - tools/check.js
  - tools/sim.js
-->

---
### Requirement: SDD effect

With 導入 SDD, every agent dispatch token estimate SHALL be multiplied by 1.1; tickets whose complexity used for the run is 3 or higher SHALL gain 0.08 base success before clamping; and an unrevealed trap dispatched to a model whose capability is below its true complexity SHALL stop after 0.15 of the true token and time cost instead of 0.4, with the log stating it was found while writing the spec. Architecture evaluation SHALL NOT be affected.

#### Scenario: Small ticket costs more

- **WHEN** SDD is bought and a complexity 2 ticket is estimated
- **THEN** tokens are 1.1 × the estimate without SDD and success is unchanged

#### Scenario: Large ticket succeeds more

- **WHEN** SDD is bought and a complexity 4 fe ticket is estimated with Sonnet without review
- **THEN** success is 0.88

#### Scenario: Trap stops earlier

- **WHEN** SDD is bought and an unrevealed trap with true complexity 5 is dispatched to DeepSeek Chat
- **THEN** the run uses 0.15 of the true-complexity token and time estimate, fails, and the trap is revealed


<!-- @trace
source: dispatch-presets-and-investments
updated: 2026-10-09
code:
  - public/css/style.css
  - public/js/game.js
  - tools/check.js
  - tools/sim.js
-->

---
### Requirement: Batch dispatch unlocked by skills

With 做 skills, the queue SHALL show a batch dispatch button that one-click dispatches every non-running ticket with shown complexity 2 or lower, in queue order (earliest due first, then higher KPI), using each ticket's first usable preset. It SHALL skip tickets with no usable preset, SHALL stop when no work slot is free or fewer than 0.2 hours remain in parallel mode, and in serial mode SHALL stop when the next ticket's estimated hours exceed remaining hours. It SHALL log one summary line with dispatched and skipped counts. Without 做 skills the button SHALL NOT appear.

#### Scenario: Batch in parallel mode

- **WHEN** skills are bought, 3 slots are free and the queue holds complexity 1, 2, 3 and 2 tickets
- **THEN** the three complexity ≤2 tickets are dispatched and the complexity 3 ticket stays in the queue


<!-- @trace
source: dispatch-presets-and-investments
updated: 2026-10-09
code:
  - public/css/style.css
  - public/js/game.js
  - tools/check.js
  - tools/sim.js
-->

---
### Requirement: Investment panel and summary

The main screen SHALL show an investment panel listing each investment with its hour and budget cost, its effect, and either a buy button or 已完成; 寫 CLAUDE.md SHALL list the selected stacks first (in the fixed order laravel, rails, rust, app), then the unselected company stacks, then fe. The dispatch panel SHALL show a hint line naming investment effects active for the selected ticket. The month-end summary SHALL show the number of investments made. The setup rules list SHALL describe presets and investments in one bullet.

#### Scenario: Month-end summary

- **WHEN** the run ends after buying CLAUDE.md for laravel and 補測試
- **THEN** the summary shows 工程投資 2 項

#### Scenario: CLAUDE.md order with two stacks

- **WHEN** the run's stacks are rails and app
- **THEN** the CLAUDE.md buttons appear in the order rails, app, laravel, rust, fe

<!-- @trace
source: multi-stack-company
updated: 2026-10-09
code:
  - tools/check.js
  - tools/sim.js
  - public/js/game.js
-->