## MODIFIED Requirements

### Requirement: Harder stack compensation

Non-incident tickets with stack rust, app or devops SHALL get a due date one day later than other tickets of the same complexity, without a cap at day 20. Tickets with stack rust, app or devops SHALL have their KPI reward multiplied by 1.3, applied together with the incident multiplier 1.6 and rounded to an integer. Tickets with stack sre SHALL NOT get this compensation.

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

#### Scenario: Deadline past the month end

- **WHEN** a non-incident app ticket is created on day 19 with a base due offset of 2 days
- **THEN** its due day is 22

#### Scenario: DevOps deadline

- **WHEN** a non-incident complexity 2 devops ticket is created on day 6 with a base due offset of 1 day
- **THEN** its due day is 8
