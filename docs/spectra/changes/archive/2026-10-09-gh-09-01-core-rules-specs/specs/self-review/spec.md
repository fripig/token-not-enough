## Purpose

Lets the player pay extra tokens and time to have the agent check its own work, so a bad change can be caught and fixed on the spot instead of failing the whole ticket.

## ADDED Requirements

### Requirement: Review levels

The dispatch panel SHALL offer three review levels: 不審核 (tokens ×1, time ×1, catch rate 0, note 改壞就整單重做), 自審 (tokens ×1.3, time ×1.2) and 嚴格審核 (tokens ×1.6, time ×1.35). The catch rate SHALL be 0.45 + 0.08 × capability for 自審 and that plus 0.2 for 嚴格審核, plus the tests bonus (see `engineering-investments`), capped at 0.95. Each reviewed level SHALL show `token ×<multiplier>・抓錯 <rate>%`. The chosen level SHALL be kept across runs, default 自審.

#### Scenario: Catch rates

##### Example: no investments

| Model | 自審 | 嚴格審核 |
| --- | --- | --- |
| Haiku (2) | 61% | 81% |
| DeepSeek Chat (3) | 69% | 89% |
| Sonnet (4) | 77% | 95% |
| Opus (5) | 85% | 95% |

### Requirement: Catching a failure

Whether a failed attempt is caught SHALL be rolled against the catch rate when it is dispatched. A caught failure SHALL become a success with tokens × 1.25, SHALL add 1 to the rescued count, and SHALL log `<level>抓到錯誤並當場修正，省掉整單重做`. A reviewed failure that is not caught SHALL log 審核沒抓到，上線後測試才爆. Review SHALL NOT rescue quota exhaustion, a serial run out of time, a cancelled background run, a trap stop, or a store rejection; a caught attempt can still hit a merge conflict.

#### Scenario: Caught failure costs more tokens

- **WHEN** a 自審 attempt with 200k tokens fails and is caught
- **THEN** the ticket completes, 250k tokens are charged, and the rescued count rises by 1

#### Scenario: Quota still stops a reviewed agent

- **WHEN** a 嚴格審核 subscription attempt runs out of quota
- **THEN** the attempt fails with 撞到用量上限，agent 停在一半

### Requirement: Effective success rate

The success rate shown SHALL be (p + (1 − p) × catch rate), multiplied by (1 − store rejection rate) for a store-review ticket, where p is the raw success rate.

#### Scenario: Sonnet with self-review

- **WHEN** Sonnet with 自審 is selected for a front-end complexity-4 ticket
- **THEN** the panel shows 95% with （原 80%）
