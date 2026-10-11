## MODIFIED Requirements

### Requirement: Convention bonus for Laravel and Rails

For tickets with stack laravel or rails and complexity 3 or lower, the capability gap used to look up the base success rate SHALL be increased by 10 for every model. Token usage and run time SHALL NOT change.

#### Scenario: Cheap model on conventional ticket

- **WHEN** Gemini Flash (capability 20) is estimated for a complexity 3 rails ticket without review, client restrictions, or big-codebase flag
- **THEN** the shown success rate is 80% instead of 50%

#### Scenario: Bonus does not apply to complex tickets

- **WHEN** Gemini Flash is estimated for a complexity 4 laravel ticket
- **THEN** the shown success rate equals the rate for a fe ticket of the same complexity

### Requirement: Rust compile time and borrow checker

For tickets with stack rust, agent run hours SHALL be multiplied by 1.2, and for models with capability below 40 the capability gap SHALL be decreased by 10.

#### Scenario: Low-capability model on Rust

- **WHEN** GLM Air (capability 30) is estimated for a complexity 2 rust ticket without review
- **THEN** the shown success rate is 80% instead of 95% and the shown hours are 1.2 times the fe-ticket hours

##### Example: Rust effect by capability

| Model capability | Ticket complexity | Base gap | Effective gap | Success |
| ---------------- | ----------------- | -------- | ------------- | ------- |
| 20 | 2 | 0 | -10 | 50% |
| 30 | 2 | 10 | 0 | 80% |
| 40 | 3 | 10 | 10 | 95% |
| 45 | 4 | 5 | 5 | 87.5% |
| 50 | 5 | 0 | 0 | 80% |

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
