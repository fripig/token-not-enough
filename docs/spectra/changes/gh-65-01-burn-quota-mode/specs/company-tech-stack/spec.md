## MODIFIED Requirements

### Requirement: Best score per mode and company

The month-end best score SHALL be stored and read per mode and selection under the key tokgame-best-<mode>-<stacks>, where <stacks> is the selected stack keys in the fixed order joined with +; a single selection therefore keeps the key tokgame-best-<mode>-<stack>. When the usage challenge toggle is on, the key SHALL be suffixed with -burn (tokgame-best-<mode>-<stacks>-burn). When that key has no value, the toggle is off and the selection is laravel alone, the legacy key tokgame-best-<mode> SHALL be read as the previous best. Storage failures SHALL NOT interrupt the game.

#### Scenario: Legacy Laravel best is kept

- **WHEN** localStorage holds tokgame-best-parallel = 4200 and no tokgame-best-parallel-laravel, and a Laravel-only parallel run ends
- **THEN** the receipt shows 4,200 as the previous best

#### Scenario: Pair key

- **WHEN** a Laravel 後端＋App 開發 parallel run ends with a new best
- **THEN** the score is written under tokgame-best-parallel-laravel+app and the legacy key is not read

#### Scenario: Usage challenge key

- **WHEN** a Laravel-only parallel run with the usage challenge on ends, and localStorage holds tokgame-best-parallel = 4200 and tokgame-best-parallel-laravel = 5000
- **THEN** no previous best is shown and the score is written under tokgame-best-parallel-laravel-burn

#### Scenario: Storage unavailable

- **WHEN** localStorage access throws at month end
- **THEN** the receipt renders without a previous-best line and no error is thrown
