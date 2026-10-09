## ADDED Requirements

### Requirement: DevOps pipeline time

For tickets with stack devops, agent run hours SHALL be multiplied by 1.25 (waiting for CI and terraform plan/apply). Success rate and token usage SHALL NOT change. Hand-writing hours SHALL NOT change.

#### Scenario: DevOps run hours

- **WHEN** Sonnet without review and at medium effort is estimated for a complexity 2 devops ticket and for a complexity 2 fe ticket, both with no previous tries
- **THEN** the devops hours are 1.25 times the fe hours and the success rate and token range are equal

## MODIFIED Requirements

### Requirement: Harder stack compensation

Non-incident tickets with stack rust, app or devops SHALL get a due date one day later than other tickets of the same complexity, capped at day 20. Tickets with stack rust, app or devops SHALL have their KPI reward multiplied by 1.3, applied together with the incident multiplier 1.6 and rounded to an integer. Tickets with stack sre SHALL NOT get this compensation.

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
| devops | 3 | no | 13 |
| devops | 4 | yes | 33 |
| sre | 3 | no | 10 |
| sre | 4 | yes | 26 |

#### Scenario: Deadline cap

- **WHEN** a non-incident app ticket is created on day 19 with a base due offset of 2 days
- **THEN** its due day is 20

#### Scenario: DevOps deadline

- **WHEN** a non-incident complexity 2 devops ticket is created on day 6 with a base due offset of 1 day
- **THEN** its due day is 8

---
### Requirement: Stack effect visibility

Every ticket card SHALL show its stack name. When the selected ticket's stack has an active effect, the dispatch panel SHALL show a hint line describing it, and the shown success rate, token range, and hours SHALL already include the effect; for store-flagged tickets the shown success rate SHALL include the 0.2 store-review rejection. A devops ticket's hint SHALL name the CI and terraform wait and the ×1.25 run time. An sre ticket's hint SHALL say that selecting SRE brings more incident tickets.

#### Scenario: Rust hint in dispatch panel

- **WHEN** the player selects a rust ticket
- **THEN** the dispatch panel shows a hint naming the slower compile loop and the borrow-checker penalty for models below capability 4

#### Scenario: DevOps and SRE hints

- **WHEN** the player selects a devops ticket, then an sre ticket
- **THEN** the devops hint contains ×1.25 and terraform, and the sre hint contains 事故

#### Scenario: No hint for front-end

- **WHEN** the player selects a fe ticket
- **THEN** no stack hint line is shown
