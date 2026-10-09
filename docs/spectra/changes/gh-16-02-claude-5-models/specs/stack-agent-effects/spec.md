## MODIFIED Requirements

### Requirement: Convention bonus for Laravel and Rails

For tickets with stack laravel or rails and complexity 3 or lower, the capability gap used to look up the base success rate SHALL be increased by 1 for every model. Token usage and run time SHALL NOT change.

#### Scenario: Cheap model on conventional ticket

- **WHEN** Gemini Flash (capability 2) is estimated for a complexity 3 rails ticket without review, client restrictions, or big-codebase flag
- **THEN** the shown success rate is 80% instead of 50%

#### Scenario: Bonus does not apply to complex tickets

- **WHEN** Gemini Flash is estimated for a complexity 4 laravel ticket
- **THEN** the shown success rate equals the rate for a fe ticket of the same complexity
