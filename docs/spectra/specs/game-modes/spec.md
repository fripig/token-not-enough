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
  - tools/check/game-modes.test.js
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
  - tools/check/game-modes.test.js
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
  - tools/check/game-modes.test.js
  - tools/fake-dom.js
-->

---
### Requirement: Reviewing pull requests

In parallel mode, when a background agent succeeds or its ticket is rejected by store review, the player SHALL spend complexity × 0.2 hours reviewing the PR, halved when the dispatch used any self-review level (pre-commit hook effect in `engineering-investments`), then multiplied by the review load 1 + 0.25 × the number of other agents still running at that moment. Agents that finish in the same clock step SHALL NOT count as still running. The time SHALL be added to the clock advance in progress and logged as ↳ 審 PR 花了 Xh. Serial mode SHALL have no PR review time. While agents are running, the dispatch panel SHALL explain that each running agent makes the next PR review longer (showing the current load as ×<load>) and adds merge-conflict chance, and the 平行模式 button in the opening modal SHALL describe the longer PR reviews and likelier conflicts without mentioning tokens.

#### Scenario: PR review with self-review

- **WHEN** a 自審 agent finishes a complexity-4 ticket successfully in parallel mode with no other agent running
- **THEN** 0.4 hours of PR review are added to the clock

#### Scenario: PR review with other agents running

- **WHEN** an agent without review finishes a complexity-2 ticket successfully while 2 other agents are still running
- **THEN** 0.6 hours of PR review are added to the clock (2 × 0.2 × 1.5)

##### Example: review load

| Other agents still running | Review level | Hook | Complexity | PR review hours |
| --- | --- | --- | --- | --- |
| 0 | 不審核 | no | 3 | 0.6 |
| 1 | 不審核 | no | 3 | 0.75 |
| 5 | 不審核 | no | 4 | 1.8 |
| 2 | 自審 | yes | 4 | 0.3 |


<!-- @trace
source: gh-12-01-parallel-review-load
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/calc.js
  - public/js/view.js
  - public/js/actions.js
  - public/js/modals.js
  - tools/check/game-modes.test.js
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
  - tools/check/game-modes.test.js
  - tools/fake-dom.js
-->

---
### Requirement: Single local GPU

In parallel mode only one local-model agent SHALL run at a time. While it runs, dispatching another local agent and evaluating with a local model SHALL be unavailable. Hand-writing SHALL also be unavailable unless a machine is installed (see `local-hardware`); while unavailable the hand-write button SHALL read 本地 GPU 跑 agent 中，電腦卡到沒辦法手寫. Serial mode SHALL have no such limit.

#### Scenario: GPU busy

- **WHEN** a Qwen agent is running in parallel mode and the player selects Gemma 4 26B A4B
- **THEN** the dispatch button is disabled and the panel warns 本地 GPU 已經有一個 agent 在跑，等它跑完才能再派。

#### Scenario: Machine frees hand-writing

- **WHEN** a Qwen agent is running in parallel mode and the PC is installed
- **THEN** the hand-write button is enabled while local dispatch stays disabled

<!-- @trace
source: gh-17-01-local-hardware
updated: 2026-10-10
code:
  - public/sitemap.xml
  - docs/DESIGN.md
  - public/js/actions.js
  - tools/sim.js
  - public/js/view.js
  - public/index.html
  - tools/check/game-modes.test.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: Player cancels a background agent

In parallel mode every row of the 背景 agent list SHALL have a cancel button. The button SHALL read 中止; clicking it SHALL arm it and change it to 確定中止？; clicking the armed button SHALL cancel that agent; any other click while a button is armed SHALL disarm it and restore 中止 without cancelling. The game SHALL NOT use browser dialogs for this. Serial mode SHALL have no cancel button.

Cancelling SHALL remove the agent from its slot at once and SHALL NOT advance the clock. It SHALL charge the agent's tokens times its fraction completed, at least 5%, through the agent's billing method under the usual charging rules (a subscription or seat quota or a wallet that runs short charges only what is left). The ticket SHALL return to the queue unchanged: its complexity, base tokens, attempt count, due date, KPI and trap state SHALL stay as they were before the dispatch, and a hidden trap SHALL stay hidden. A cancelled local-model agent SHALL stop counting as the running local agent (see Requirement: Single local GPU). The security audit roll for sensitive tickets on personal billing and the company overdraft check SHALL apply as for any settled agent. The game SHALL log one warn line `⏹ 中止 <title>｜<agent> / <model name>・<billing>｜燒掉 <tokens>｜<spend>｜<hours>h`, where the model name includes the effort suffix as defined in `reasoning-effort`.

Day-end and outage cancellation (see Requirement: Overnight runs and cancellation) SHALL keep their behavior.

#### Scenario: Two-step button

- **WHEN** in parallel mode the player clicks 中止 on a running agent's row
- **THEN** the agent keeps running and that button reads 確定中止？
- **WHEN** the player then clicks 確定中止？ on the same row
- **THEN** the agent is gone from the 背景 agent list and its ticket is back in the queue

#### Scenario: Other click disarms

- **WHEN** a cancel button is armed and the player clicks 等 1 小時
- **THEN** the button reads 中止 again and the agent is still running after the wait unless it finished

#### Scenario: Charge for the part already run

- **WHEN** at 11:00 the player cancels a Claude Code / Opus agent billed to 個人 API (NT$0.9 per 1k tokens, no price modifier) whose job is 200k tokens over 4 hours and has 3 hours left
- **THEN** 50k tokens are charged, the wallet drops by NT$45, the clock still reads 11:00 and the log line reads `⏹ 中止 <title>｜Claude Code / Opus・個人 API｜燒掉 50k｜NT$45｜1.0h`

#### Scenario: Cancel right after dispatch

- **WHEN** the player cancels an agent whose job is 200k tokens immediately after dispatching it
- **THEN** 10k tokens are charged

#### Scenario: Ticket unchanged

- **WHEN** a ticket with attempt count 0 and base tokens 120k is dispatched and the player cancels the agent
- **THEN** the ticket in the queue has attempt count 0 and base tokens 120k

#### Scenario: Hidden trap stays hidden

- **WHEN** the player cancels the agent of an unrevealed trap shown as complexity 1
- **THEN** the ticket still shows complexity 1, is not marked 牽一髮動全身, and the 踩到陷阱 count does not change

#### Scenario: Local GPU freed

- **WHEN** a Qwen agent is running in parallel mode and the player cancels it
- **THEN** a local model can be dispatched right away

#### Scenario: Serial mode

- **WHEN** the game is in serial mode
- **THEN** no cancel button is shown

<!-- @trace
source: gh-32-01-abort-agent
updated: 2026-10-10
code:
  - public/index.html
  - public/css/style.css
-->