## MODIFIED Requirements

### Requirement: Mode selection

The opening modal SHALL offer 平行模式 and 單線模式, default 平行模式. The choice SHALL be kept across runs and SHALL NOT be offered in the Monday adjustment. Confirming SHALL log `· <company>・遊戲模式：平行` or `· <company>・遊戲模式：單線`. Parallel mode has no slot count; running agents are defined in `parallel-slots`.

#### Scenario: Default mode

- **WHEN** the first run starts
- **THEN** 平行模式 is selected

#### Scenario: Setup log line

- **WHEN** the player confirms the opening setup with Laravel 後端 and parallel mode
- **THEN** the log has the line `· Laravel 後端・遊戲模式：平行` with no agent count

### Requirement: Parallel clock and background agents

In parallel mode the header meter SHALL show 現在時間 as a clock from 9:00 to 17:00 (9:00 plus hours used) and `背景 agent <running>`, and the background-agent list heading SHALL show `<running> 個在跑`, neither with a slot count. Dispatching SHALL cost 0.2 hours of the clock and start the agent in the background; the ticket SHALL leave the visible queue while it runs. 等 1 小時 SHALL advance the clock by one hour, and 等到下一個 agent 完成 SHALL advance it to the next completion (disabled with no running agent). Any action that spends the player's time (hand-writing, evaluation, investment) SHALL advance the same clock, and agents that finish meanwhile SHALL settle at that moment. When advancing the clock leaves at most 1e-9 hours of the day (a floating-point residue), the hours left SHALL become exactly 0, so the clock reads 17:00 and both 等 1 小時 and 等到下一個 agent 完成 SHALL be disabled until the day ends.

#### Scenario: Clock after a dispatch

- **WHEN** the player dispatches one agent at 9:00 in parallel mode
- **THEN** the clock reads 9:12, one background agent is running and the header shows 背景 agent 1

#### Scenario: Residue at the end of the day

- **WHEN** a parallel-mode day has agents running and the clock is advanced so that the hours left would be a positive residue of at most 1e-9
- **THEN** the hours left are exactly 0, the agents' remaining times do not change further, and the dock renders both wait buttons disabled while the end day button stays enabled

##### Example: residue from the simulator hang

- **GIVEN** a parallel-mode day with 3 running agents whose remaining times are all above 1 hour and 1 + 5e-16 hours left
- **WHEN** the player waits 1 hour
- **THEN** the hours left are 0 (not 5e-16), and 等 1 小時 and 等到下一個 agent 完成 are disabled
