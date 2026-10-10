# engineering-investments Specification

## Purpose

Lets the player spend working hours and company API budget on engineering investments — CLAUDE.md per stack, tests, skills, MCP docs and spec-driven development — whose effects last until month end. It gives a run a sense of getting stronger and rewards early planning over pure ticket throughput.

## Requirements

### Requirement: Investment purchase

The game SHALL offer these investments, each purchasable once per run (寫 CLAUDE.md once per stack for each of the four company stacks and fe), costing player hours and company API budget:

| Investment | Hours | Company budget |
| --- | --- | --- |
| 寫 CLAUDE.md | 3 | NT$300 |
| 單元測試 | 4 | NT$400 |
| CI 流水線 | 3 | NT$300 |
| pre-commit／lint hook | 2 | NT$200 |
| secret scanning／脫敏 | 3 | NT$300 |
| 上架自動化（fastlane） | 3 | NT$400 |
| 監控告警 | 3 | NT$400 |
| 做 skills | 3 | NT$400 |
| 接 MCP 文件 | 3 | NT$400 |
| 導入 SDD | 6 | NT$500 |

The hours and budget in this table are the initial values; the implementation SHALL keep this table in sync with any value changed by simulator tuning. A purchase SHALL be refused when already bought, when remaining hours are below the hour cost, or when the company API budget is below the budget cost. A purchase SHALL deduct the budget from the company API budget and count it in the day's company spend and the month's company bill. In parallel mode it SHALL advance the clock by the hour cost (background agents keep running and settle, and the PR review time of an agent that finishes during the investment is added on top, as with every other clock advance); in serial mode it SHALL subtract the hours. It SHALL NOT be blocked by a busy local GPU. Investments SHALL reset at the start of each run. The investment 補測試 SHALL NOT exist.

#### Scenario: Successful purchase

- **WHEN** the player buys 單元測試 with 8 hours left and NT$12,000 company budget in serial mode
- **THEN** 4 hours remain, company budget is NT$11,600 and 單元測試 shows 已完成

#### Scenario: Refusals

- **WHEN** a purchase is attempted in each case in the table
- **THEN** nothing changes

##### Example: refusal cases

| Case | State |
| --- | --- |
| already bought | 單元測試 already bought |
| not enough hours | 5 hours left, buying 導入 SDD |
| not enough budget | company budget NT$200, buying 寫 CLAUDE.md |

#### Scenario: New investment purchase

- **WHEN** the player buys 監控告警 with 8 hours left and NT$12,000 company budget in serial mode
- **THEN** 5 hours remain, company budget is NT$11,600 and 監控告警 shows 已完成


<!-- @trace
source: gh-08-01-more-investments
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/state.js
  - public/js/actions.js
  - public/js/view.js
  - tools/sim.js
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/modals.js
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

With 單元測試, the self-review catch rate SHALL increase by 0.10 (capped at 0.95) for review levels above 0. 單元測試 SHALL NOT change the merge conflict probability.

#### Scenario: Catch rate only

- **WHEN** 單元測試 is bought and CI 流水線 is not, Sonnet (capability 4) uses 自審, and two other agents are running at completion
- **THEN** catch rate is 0.87 and conflict probability is 0.2


<!-- @trace
source: gh-08-01-more-investments
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/state.js
  - public/js/actions.js
  - public/js/view.js
  - tools/sim.js
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/modals.js
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

The main screen SHALL show an investment panel listing each investment with its hour and budget cost, its effect, and either a buy button or 已完成; 寫 CLAUDE.md SHALL list the selected stacks first (in the fixed order laravel, rails, rust, app), then the unselected company stacks, then fe. The other investments SHALL be listed in the order 單元測試, CI 流水線, pre-commit／lint hook, secret scanning／脫敏, 上架自動化（fastlane）, 監控告警, 做 skills, 接 MCP 文件, 導入 SDD. The dispatch panel SHALL show a hint line naming investment effects active for the selected ticket. The month-end summary SHALL show the number of investments made. The setup rules list SHALL describe presets and investments in one bullet.

#### Scenario: Month-end summary

- **WHEN** the run ends after buying CLAUDE.md for laravel, 單元測試 and CI 流水線
- **THEN** the summary shows 工程投資 3 項

#### Scenario: CLAUDE.md order with two stacks

- **WHEN** the run's stacks are rails and app
- **THEN** the CLAUDE.md buttons appear in the order rails, app, laravel, rust, fe

#### Scenario: Hint lines follow the ticket

- **WHEN** secret scanning, fastlane and 監控告警 are bought and the selected ticket is a sensitive laravel ticket that is not an incident and needs no store review
- **THEN** the hint line names secret scanning and does not name fastlane or 監控告警


<!-- @trace
source: gh-08-01-more-investments
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/state.js
  - public/js/actions.js
  - public/js/view.js
  - tools/sim.js
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/modals.js
-->

---
### Requirement: CI pipeline effect

With CI 流水線, the merge conflict probability on completion in parallel mode SHALL be halved. CI 流水線 SHALL NOT change the self-review catch rate.

#### Scenario: Conflicts halved

- **WHEN** CI 流水線 is bought and two other agents are running when an agent completes
- **THEN** conflict probability is 0.1


<!-- @trace
source: gh-08-01-more-investments
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/state.js
  - public/js/actions.js
  - public/js/view.js
  - tools/sim.js
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/modals.js
-->

---
### Requirement: Pre-commit hook effect

With pre-commit／lint hook, the PR review hours charged when an agent finishes in parallel mode SHALL be multiplied by 0.5, on top of the halving for self-review levels above 0 and the review load for other running agents (see `game-modes`). The investment description SHALL state that it only works in parallel mode.

#### Scenario: PR review time

- **WHEN** the hook is bought and a complexity 3 ticket finishes successfully in parallel mode with no other agent running
- **THEN** PR review takes the hours in the table

##### Example: review hours

| Review level | Without hook | With hook |
| --- | --- | --- |
| 不審核 | 0.6 | 0.3 |
| 自審 | 0.3 | 0.15 |


<!-- @trace
source: gh-12-01-parallel-review-load
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/calc.js
  - public/js/view.js
  - public/js/actions.js
  - public/js/modals.js
  - tools/check.js
-->

---
### Requirement: Secret scanning effect

With secret scanning／脫敏, the security audit probability for a sensitive ticket dispatched or evaluated with personal subscription or personal API SHALL be halved: 0.30 for Chinese vendors and 0.175 for other vendors. The dispatch panel warning and the quick-dispatch warning SHALL show the halved percentage. Audit risk for company API, team seats and local SHALL remain zero.

#### Scenario: Halved odds

- **WHEN** secret scanning is bought and a sensitive ticket is dispatched with personal API
- **THEN** audit odds are 0.175 for Claude Code and 0.30 for DeepSeek


<!-- @trace
source: gh-08-01-more-investments
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/state.js
  - public/js/actions.js
  - public/js/view.js
  - tools/sim.js
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/modals.js
-->

---
### Requirement: Fastlane effect

With 上架自動化（fastlane）, the App Store rejection probability after a successful agent run on a store-review ticket SHALL be 0.1 instead of 0.2. The success rate shown in the dispatch panel and the App stack hint text SHALL use the same probability.

#### Scenario: Shown success with fastlane

- **WHEN** fastlane is bought and a store-review app ticket has raw success p and catch rate c
- **THEN** the shown success is (p + (1 − p) × c) × 0.9 and the hint says 10%


<!-- @trace
source: gh-08-01-more-investments
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/state.js
  - public/js/actions.js
  - public/js/view.js
  - tools/sim.js
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/modals.js
-->

---
### Requirement: Monitoring effect

With 監控告警, an incident ticket created after the purchase SHALL be due the day after it is created, capped at day 20, and its KPI SHALL use an incident multiplier of 1.2 instead of 1.6 (the stack multiplier still applies); incidents already in the queue SHALL keep their due day and KPI. While 監控告警 is owned, each overdue incident ticket SHALL reduce trust by 4 instead of 8; overdue non-incident tickets SHALL still reduce trust by 4, and KPI loss SHALL be unchanged. The 流量暴增 event text SHALL say the incidents are due tomorrow when 監控告警 is owned.

#### Scenario: Deadline and penalty

- **WHEN** 監控告警 is bought and incidents are created on the days in the table
- **THEN** they are due as shown, a complexity 4 laravel incident created after the purchase has KPI round(KPI[4] × 1.2), and an incident that becomes overdue reduces trust by 4

##### Example: incident due day

| Created on day | Due day without monitoring | Due day with monitoring |
| --- | --- | --- |
| 5 | 5 | 6 |
| 20 | 20 | 20 |

#### Scenario: Queued incident keeps deadline

- **WHEN** an incident due today is in the queue and 監控告警 is bought later that day
- **THEN** the incident is still due today, and if it becomes overdue trust drops by 4

<!-- @trace
source: gh-08-01-more-investments
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/state.js
  - public/js/actions.js
  - public/js/view.js
  - tools/sim.js
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/modals.js
-->

---
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
