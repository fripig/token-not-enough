## MODIFIED Requirements

### Requirement: Harder stack compensation

Non-incident tickets with stack rust, app or devops SHALL get a due date one day later than other tickets of the same complexity, without a cap at day 20, in both modes. In serial mode, tickets with stack rust, app or devops SHALL have their KPI reward multiplied by 1.3, applied together with the incident multiplier 1.6 and rounded to an integer. In parallel mode these tickets SHALL NOT get the KPI multiplier. The same mode rule SHALL apply to the KPI set by 找主管重新評估 and, through the KPI, to outsourcing pay. Tickets with stack sre SHALL NOT get this compensation. When the setup dialog is confirmed, every queued ticket's KPI and outsourcing pay SHALL match the confirmed mode, without drawing random numbers.

#### Scenario: Rust ticket reward and deadline

- **WHEN** a non-incident complexity 3 rust ticket is created on day 4 in serial mode and its base due offset is 3 days
- **THEN** its due day is 8 and its KPI reward is 13

#### Scenario: Rust ticket in parallel mode

- **WHEN** a non-incident complexity 3 rust ticket is created on day 4 in parallel mode and its base due offset is 3 days
- **THEN** its due day is 8 and its KPI reward is 10

##### Example: KPI rewards by stack

| Stack | Complexity | Incident | KPI (serial) | KPI (parallel) |
| ----- | ---------- | -------- | ------------ | -------------- |
| laravel | 3 | no | 10 | 10 |
| rust | 3 | no | 13 | 10 |
| app | 2 | no | 8 | 6 |
| app | 4 | yes | 33 | 26 |
| fe | 4 | no | 16 | 16 |
| devops | 3 | no | 13 | 10 |
| devops | 4 | yes | 33 | 26 |
| sre | 3 | no | 10 | 10 |
| sre | 4 | yes | 26 | 26 |

#### Scenario: Rescope in parallel mode

- **WHEN** a revealed trap on stack rust with true complexity 4 is rescoped with trust 50 or more in parallel mode
- **THEN** its KPI becomes 16, and in serial mode it becomes 21

#### Scenario: Outsourcing pay in parallel mode

- **WHEN** a complexity 2 rust gig is created in parallel mode
- **THEN** its KPI is 6 and its pay is NT$1,500, while in serial mode its KPI is 8 and its pay is NT$2,000

#### Scenario: Mode switched at setup

- **WHEN** day-1 tickets were generated while the setup dialog showed serial mode, the player switches to parallel mode without changing the work content, and confirms
- **THEN** each queued rust, app or devops ticket has KPI `KPI[complexity]` without ×1.3, each such gig's pay is that KPI × 250, and the ticket titles, complexities and due dates are unchanged

#### Scenario: Deadline past the month end

- **WHEN** a non-incident app ticket is created on day 19 with a base due offset of 2 days
- **THEN** its due day is 22

#### Scenario: DevOps deadline

- **WHEN** a non-incident complexity 2 devops ticket is created on day 6 with a base due offset of 1 day
- **THEN** its due day is 8
