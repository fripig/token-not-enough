## MODIFIED Requirements

### Requirement: Convention bonus for Laravel and Rails

For tickets with stack laravel or rails and complexity 3 or lower, the capability gap used to look up the base success rate and the self-review catch rate SHALL be increased by 10 for every model. Token usage and run time SHALL NOT change.

#### Scenario: Cheap model on conventional ticket

- **WHEN** Gemini Flash (capability 20) is estimated for a complexity 3 rails ticket without review, client restrictions, or big-codebase flag
- **THEN** the shown success rate is 75% instead of 50%

#### Scenario: Bonus does not apply to complex tickets

- **WHEN** Gemini Flash is estimated for a complexity 4 laravel ticket
- **THEN** the shown success rate equals the rate for a fe ticket of the same complexity

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
