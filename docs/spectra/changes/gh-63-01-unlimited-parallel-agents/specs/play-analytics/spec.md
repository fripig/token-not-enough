## MODIFIED Requirements

### Requirement: Common event parameters

Every event SHALL carry these parameters, read from the run's state at the moment the event is sent. No event SHALL carry a `slots` parameter.

##### Example: parameters for a parallel Laravel + Rust run with advanced mode and outsourcing on day 3

| Parameter | Value |
| --- | --- |
| `game_version` | the value of `GAME_VERSION` (see Game version stamp) |
| `game_mode` | `parallel` (or `serial`) |
| `companies` | the selected stacks joined with `+` in the fixed company order, here `laravel+rust` |
| `advanced` | `true` |
| `outsource` | `true` |
| `day` | `3` |

#### Scenario: Serial run parameters

- **WHEN** the player confirms the opening setup with only Rails selected, serial mode, normal mode and no outsourcing
- **THEN** the `game_start` event carries `game_mode` `serial`, `companies` `rails`, `advanced` `false`, `outsource` `false`, `day` `1`, and no `slots` key

#### Scenario: Parallel run parameters

- **WHEN** the player confirms the opening setup with Laravel and Rust, parallel mode, advanced mode and outsourcing
- **THEN** the `game_start` event carries `game_mode` `parallel`, `companies` `laravel+rust`, `advanced` `true`, `outsource` `true`, and no `slots` key
