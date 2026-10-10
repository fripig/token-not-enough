## MODIFIED Requirements

### Requirement: Writing it by hand

自己手寫 SHALL cost complexity × 2.2 hours, × 0.8 after a failed try, × 2 for an unfamiliar stack (see `company-tech-stack`), × 0.8 for a stack covered by an attended 技術線場 conference (see `engineering-investments`), and 0 tokens. It SHALL be disabled when the hours exceed the time left, or when the local GPU is busy and no machine is installed (see `local-hardware`). Complexity 1–3 SHALL always succeed; complexity 4–5 SHALL succeed with probability 70% and otherwise count a failed try with the log 自己手寫卡關. Every hand-writing attempt SHALL add 1 to the hand-written count. In serial mode the hours SHALL be deducted directly; in parallel mode the clock SHALL advance by those hours while background agents keep running.

#### Scenario: Hand-written complexity 2

- **WHEN** the player hand-writes a complexity-2 ticket of a chosen stack with 8 hours left in serial mode
- **THEN** 4.4 hours are used, the ticket completes, and no tokens are spent

#### Scenario: Hand-written after a conference

- **WHEN** a Laravel 後端 player who attended WebConf Taiwan hand-writes a complexity-2 laravel ticket with 8 hours left in serial mode
- **THEN** 3.52 hours are used and the ticket completes

#### Scenario: Busy local GPU without a machine

- **WHEN** in parallel mode a local agent is running and no machine is installed
- **THEN** the hand-writing button is disabled and reads 本地 GPU 跑 agent 中，電腦卡到沒辦法手寫
