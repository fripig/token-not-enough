## ADDED Requirements

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
