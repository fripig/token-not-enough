# game-modes Specification

## Purpose

Offers two ways to work: serial mode, where the player waits for one agent at a time, and parallel mode, where several agents run in the background on a working-day clock while the player dispatches and reviews.

## Requirements

### Requirement: Mode selection

The opening modal SHALL offer 平行模式 and 單線模式, default 平行模式. The choice SHALL be kept across runs and SHALL NOT be offered in the Monday adjustment. Confirming SHALL log `· <company>・遊戲模式：平行（同時 N 個 agent）` or `· <company>・遊戲模式：單線`. Slot count is defined in `parallel-slots`.

#### Scenario: Default mode

- **WHEN** the first run starts
- **THEN** 平行模式 is selected


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Serial mode

In serial mode a dispatched agent SHALL settle at once and its hours SHALL be deducted from the day's remaining hours. The header meter SHALL show 今日剩餘工時 with `<hours> / 8h`. Wait buttons and the background agent panel SHALL NOT be shown.

#### Scenario: Serial dispatch takes time

- **WHEN** a serial agent runs 1.6 hours with 8 hours left
- **THEN** the result is logged immediately and 6.4 hours remain


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Parallel clock and background agents

In parallel mode the header meter SHALL show 現在時間 as a clock from 9:00 to 17:00 (9:00 plus hours used) and `背景 agent <running> / <slots>`. Dispatching SHALL cost 0.2 hours of the clock and start the agent in the background; the ticket SHALL leave the visible queue while it runs. 等 1 小時 SHALL advance the clock by one hour, and 等到下一個 agent 完成 SHALL advance it to the next completion (disabled with no running agent). Any action that spends the player's time (hand-writing, evaluation, investment) SHALL advance the same clock, and agents that finish meanwhile SHALL settle at that moment.

#### Scenario: Clock after a dispatch

- **WHEN** the player dispatches one agent at 9:00 in parallel mode
- **THEN** the clock reads 9:12 and one background agent is running


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Parallel token multiplier

In parallel mode the token estimate of a new dispatch SHALL be multiplied by 1 + 0.15 × the number of agents already running. The estimate label SHALL show ×<multiplier> when it exceeds 1, and the panel SHALL explain the multiplier while agents are running.

#### Scenario: Two agents running

- **WHEN** two agents are running and a third is estimated
- **THEN** its tokens are multiplied by 1.30


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Reviewing pull requests

In parallel mode, when a background agent succeeds or its ticket is rejected by store review, the player SHALL spend complexity × 0.2 hours reviewing the PR, halved when the dispatch used any self-review level (pre-commit hook effect in `engineering-investments`). The time SHALL be added to the clock advance in progress and logged as ↳ 審 PR 花了 Xh. Serial mode SHALL have no PR review time.

#### Scenario: PR review with self-review

- **WHEN** a 自審 agent finishes a complexity-4 ticket successfully in parallel mode
- **THEN** 0.4 hours of PR review are added to the clock


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Overnight runs and cancellation

When a parallel day ends, the clock SHALL first run to 17:00. Agents whose ticket is due on or before today SHALL then be cancelled: they fail with tokens charged for the fraction completed (at least 5%), with the note 到期還沒跑完，只好中止. If the next day starts with a vendor outage, that vendor's agents SHALL be cancelled the same way with 廠商當機，session 斷了. Every remaining agent SHALL have 3 hours taken off its remaining time (at least 0.05 hours left), and the day summary SHALL report `<n> 個 agent 跑了一整晚，一早會陸續有結果。`.

#### Scenario: Agent finishes overnight

- **WHEN** an agent with 3.5 hours left is still running when a day ends and its ticket is not due
- **THEN** it has 0.5 hours left at 9:00 the next day

#### Scenario: Due ticket cancelled

- **WHEN** an agent working on a ticket due today is still running at 17:00
- **THEN** it is cancelled, the ticket becomes overdue, and the summary reports 1 個背景 agent 跑到截止還沒完成，被你中止了。


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Single local GPU

In parallel mode only one local-model agent SHALL run at a time. While it runs, dispatching another local agent, evaluating with a local model, and hand-writing SHALL be unavailable; the hand-write button SHALL read 本地 GPU 跑 agent 中，電腦卡到沒辦法手寫. Serial mode SHALL have no such limit.

#### Scenario: GPU busy

- **WHEN** a Qwen agent is running in parallel mode and the player selects Gemma 27B
- **THEN** the dispatch button is disabled and the panel warns 本地 GPU 已經有一個 agent 在跑，等它跑完才能再派。

<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->