## Purpose

Defines how a ticket's tech stack changes an agent's success rate, run time, and post-run outcome using properties of the stack itself, and how the player sees those effects before dispatching. It deliberately avoids per-vendor skill ratings.

## ADDED Requirements

### Requirement: Convention bonus for Laravel and Rails

For tickets with stack laravel or rails and complexity 3 or lower, the capability gap used to look up the base success rate SHALL be increased by 1 for every model. Token usage and run time SHALL NOT change.

#### Scenario: Cheap model on conventional ticket

- **WHEN** Haiku (capability 2) is estimated for a complexity 3 rails ticket without review, client restrictions, or big-codebase flag
- **THEN** the shown success rate is 80% instead of 50%

#### Scenario: Bonus does not apply to complex tickets

- **WHEN** Haiku is estimated for a complexity 4 laravel ticket
- **THEN** the shown success rate equals the rate for a fe ticket of the same complexity

### Requirement: Rust compile time and borrow checker

For tickets with stack rust, agent run hours SHALL be multiplied by 1.2, and for models with capability below 4 the capability gap SHALL be decreased by 1.

#### Scenario: Low-capability model on Rust

- **WHEN** GLM Air (capability 3) is estimated for a complexity 2 rust ticket without review
- **THEN** the shown success rate is 80% instead of 95% and the shown hours are 1.2 times the fe-ticket hours

##### Example: Rust effect by capability

| Model capability | Ticket complexity | Base gap | Effective gap | Success |
| ---------------- | ----------------- | -------- | ------------- | ------- |
| 2 | 2 | 0 | -1 | 50% |
| 3 | 2 | 1 | 0 | 80% |
| 4 | 3 | 1 | 1 | 95% |
| 5 | 5 | 0 | 0 | 80% |

### Requirement: App simulator time and store review

For tickets with stack app, agent run hours SHALL be multiplied by 1.15. App tickets with complexity 2 or higher SHALL be flagged for store review with probability 0.4, and flagged tickets SHALL show a 需上架審核 chip. When a flagged ticket's agent run would otherwise succeed, it SHALL fail with probability 0.2 with the log note 卡在 App Store 審核被退件; self-review SHALL NOT prevent this failure.

#### Scenario: Store review rejection

- **WHEN** a flagged app ticket's agent run succeeds and the store-review roll fails
- **THEN** the ticket stays in the queue with one more failed try and the log shows 卡在 App Store 審核被退件

#### Scenario: Unflagged app ticket

- **WHEN** an app ticket without the store flag succeeds
- **THEN** it completes normally with no store-review roll

### Requirement: Harder stack compensation

Non-incident tickets with stack rust or app SHALL get a due date one day later than other tickets of the same complexity, capped at day 20. Tickets with stack rust or app SHALL have their KPI reward multiplied by 1.3, applied together with the incident multiplier 1.6 and rounded to an integer.

#### Scenario: Rust ticket reward and deadline

- **WHEN** a non-incident complexity 3 rust ticket is created on day 4 and its base due offset is 3 days
- **THEN** its due day is 8 and its KPI reward is 13

##### Example: KPI rewards by stack

| Stack | Complexity | Incident | KPI |
| ----- | ---------- | -------- | --- |
| laravel | 3 | no | 10 |
| rust | 3 | no | 13 |
| app | 2 | no | 8 |
| app | 4 | yes | 33 |
| fe | 4 | no | 16 |

#### Scenario: Deadline cap

- **WHEN** a non-incident app ticket is created on day 19 with a base due offset of 2 days
- **THEN** its due day is 20

### Requirement: Stack effect visibility

Every ticket card SHALL show its stack name. When the selected ticket's stack has an active effect, the dispatch panel SHALL show a hint line describing it, and the shown success rate, token range, and hours SHALL already include the effect; for store-flagged tickets the shown success rate SHALL include the 0.2 store-review rejection.

#### Scenario: Rust hint in dispatch panel

- **WHEN** the player selects a rust ticket
- **THEN** the dispatch panel shows a hint naming the slower compile loop and the borrow-checker penalty for models below capability 4

#### Scenario: No hint for front-end

- **WHEN** the player selects a fe ticket
- **THEN** no stack hint line is shown
