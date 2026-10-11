# stack-agent-effects Specification

## Purpose

Defines how a ticket's tech stack changes an agent's success rate, run time, and post-run outcome using properties of the stack itself, and how the player sees those effects before dispatching. It deliberately avoids per-vendor skill ratings.

## Requirements

### Requirement: Convention bonus for Laravel and Rails

For tickets with stack laravel or rails and complexity 3 or lower, the capability gap used to look up the base success rate and the self-review catch rate SHALL be increased by 10 for every model. Token usage and run time SHALL NOT change.

#### Scenario: Cheap model on conventional ticket

- **WHEN** Gemini Flash (capability 20) is estimated for a complexity 3 rails ticket without review, client restrictions, or big-codebase flag
- **THEN** the shown success rate is 75% instead of 50%

#### Scenario: Bonus does not apply to complex tickets

- **WHEN** Gemini Flash is estimated for a complexity 4 laravel ticket
- **THEN** the shown success rate equals the rate for a fe ticket of the same complexity

---
### Requirement: Rust compile time and borrow checker

For tickets with stack rust, agent run hours SHALL be multiplied by 1.2, and for models with capability below 40 the capability gap used for the success rate and the self-review catch rate SHALL be decreased by 10.

#### Scenario: Low-capability model on Rust

- **WHEN** GLM Air (capability 30) is estimated for a complexity 2 rust ticket without review
- **THEN** the shown success rate is 75% instead of 88% and the shown hours are 1.2 times the fe-ticket hours

##### Example: Rust effect by capability

| Model capability | Ticket complexity | Base gap | Effective gap | Success |
| ---------------- | ----------------- | -------- | ------------- | ------- |
| 20 | 2 | 0 | -10 | 50% |
| 30 | 2 | 10 | 0 | 75% |
| 40 | 3 | 10 | 10 | 88% |
| 45 | 4 | 5 | 5 | 81.5% |
| 50 | 5 | 0 | 0 | 75% |

---
### Requirement: App simulator time and store review

For tickets with stack app, agent run hours SHALL be multiplied by 1.15. App tickets with complexity 2 or higher SHALL be flagged for store review with probability 0.4, and flagged tickets SHALL show a 需上架審核 chip. When a flagged ticket's agent run would otherwise succeed, it SHALL fail with probability 0.2 with the log note 卡在 App Store 審核被退件; self-review SHALL NOT prevent this failure.

#### Scenario: Store review rejection

- **WHEN** a flagged app ticket's agent run succeeds and the store-review roll fails
- **THEN** the ticket stays in the queue with one more failed try and the log shows 卡在 App Store 審核被退件

#### Scenario: Unflagged app ticket

- **WHEN** an app ticket without the store flag succeeds
- **THEN** it completes normally with no store-review roll

---
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

---
### Requirement: Stack effect visibility

Every ticket card SHALL show its stack name. When the selected ticket's stack has an active effect, the dispatch panel SHALL show a hint line describing it, and the shown success rate, token range, and hours SHALL already include the effect; for store-flagged tickets the shown success rate SHALL include the 0.2 store-review rejection. A devops ticket's hint SHALL name the CI and terraform wait and the ×1.25 run time. An sre ticket's hint SHALL say that selecting SRE brings more incident tickets.

#### Scenario: Rust hint in dispatch panel

- **WHEN** the player selects a rust ticket
- **THEN** the dispatch panel shows a hint naming the slower compile loop and the borrow-checker penalty for models below capability 40

#### Scenario: DevOps and SRE hints

- **WHEN** the player selects a devops ticket, then an sre ticket
- **THEN** the devops hint contains ×1.25 and terraform, and the sre hint contains 事故

#### Scenario: No hint for front-end

- **WHEN** the player selects a fe ticket
- **THEN** no stack hint line is shown

---
### Requirement: DevOps pipeline time

For tickets with stack devops, agent run hours SHALL be multiplied by 1.25 (waiting for CI and terraform plan/apply). Success rate and token usage SHALL NOT change. Hand-writing hours SHALL NOT change.

#### Scenario: DevOps run hours

- **WHEN** Sonnet without review and at medium effort is estimated for a complexity 2 devops ticket and for a complexity 2 fe ticket, both with no previous tries
- **THEN** the devops hours are 1.25 times the fe hours and the success rate and token range are equal

<!-- @trace
source: gh-18-01-work-roles-sre-devops
updated: 2026-10-10
code:
  - public/js/data.js
  - public/js/calc.js
  - public/js/actions.js
  - public/js/state.js
  - public/js/modals.js
-->
