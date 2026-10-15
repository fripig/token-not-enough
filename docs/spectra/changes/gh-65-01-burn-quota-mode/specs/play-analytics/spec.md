## MODIFIED Requirements

### Requirement: Common event parameters

Every event SHALL carry these parameters, read from the run's state at the moment the event is sent. No event SHALL carry a `slots` parameter.

##### Example: parameters for a parallel Laravel + Rust run with advanced mode, outsourcing and the usage challenge on day 3

| Parameter | Value |
| --- | --- |
| `game_version` | the value of `GAME_VERSION` (see Game version stamp) |
| `game_mode` | `parallel` (or `serial`) |
| `companies` | the selected stacks joined with `+` in the fixed company order, here `laravel+rust` |
| `advanced` | `true` |
| `outsource` | `true` |
| `burn` | `true` |
| `day` | `3` |

#### Scenario: Serial run parameters

- **WHEN** the player confirms the opening setup with only Rails selected, serial mode, normal mode, no outsourcing and no usage challenge
- **THEN** the `game_start` event carries `game_mode` `serial`, `companies` `rails`, `advanced` `false`, `outsource` `false`, `burn` `false`, `day` `1`, and no `slots` key

#### Scenario: Parallel run parameters

- **WHEN** the player confirms the opening setup with Laravel and Rust, parallel mode, advanced mode, outsourcing and the usage challenge
- **THEN** the `game_start` event carries `game_mode` `parallel`, `companies` `laravel+rust`, `advanced` `true`, `outsource` `true`, `burn` `true`, and no `slots` key

---
### Requirement: Game end

When the month-end receipt opens, the game SHALL send `game_end` with the common parameters plus `score` (the receipt's total score) and `grade` (S, A, B, C or D, as shown on the receipt). When the usage challenge is on it SHALL also carry `burn_pct`, the month usage as a rounded integer percent (0–100); when it is off `burn_pct` SHALL NOT be sent.

#### Scenario: Month end

- **WHEN** a serial run reaches the month-end receipt with KPI 300, trust 70, no personal spending and no audits
- **THEN** `game_end` is sent once with `day` 20, `score` 3280 and `grade` A, and no `burn_pct` key

#### Scenario: Month end with usage challenge

- **WHEN** a parallel run with the usage challenge on reaches the month-end receipt with usage 75.7%
- **THEN** `game_end` carries `burn` `true` and `burn_pct` 76
