## MODIFIED Requirements

### Requirement: Common event parameters

Every event SHALL carry these parameters (`corp_api` added by `corp-api-contracts`), read from the run's state at the moment the event is sent. No event SHALL carry a `slots` parameter.

##### Example: parameters for a parallel Laravel + Rust run with advanced mode, outsourcing and the usage challenge on day 3

| Parameter | Value |
| --- | --- |
| `game_version` | the value of `GAME_VERSION` (see Game version stamp) |
| `game_mode` | `parallel` (or `serial`) |
| `companies` | the selected stacks joined with `+` in the fixed company order, here `laravel+rust` |
| `advanced` | `true` |
| `outsource` | `true` |
| `burn` | `true` |
| `corp_api` | the run's company API contract list joined with `+` in the order anthropic, openai, google, or `none` when empty; here `anthropic+google` |
| `day` | `3` |

#### Scenario: Serial run parameters

- **WHEN** the player confirms the opening setup with only Rails selected, serial mode, normal mode, no outsourcing, no usage challenge and the default contract list
- **THEN** the `game_start` event carries `game_mode` `serial`, `companies` `rails`, `advanced` `false`, `outsource` `false`, `burn` `false`, `corp_api` `anthropic+google`, `day` `1`, and no `slots` key

#### Scenario: Parallel run parameters

- **WHEN** the player confirms the opening setup with Laravel and Rust, parallel mode, advanced mode, outsourcing, the usage challenge and no contracted vendor
- **THEN** the `game_start` event carries `game_mode` `parallel`, `companies` `laravel+rust`, `advanced` `true`, `outsource` `true`, `burn` `true`, `corp_api` `none`, and no `slots` key
