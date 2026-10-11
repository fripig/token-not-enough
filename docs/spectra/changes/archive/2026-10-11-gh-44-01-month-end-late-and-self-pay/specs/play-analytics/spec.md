## MODIFIED Requirements

### Requirement: Dispatch result event

Each time a dispatched job is settled, the game SHALL send one `job_result` event with the job's `vendor`, `model`, `bill`, `review`, `effort` and `sdd` (the SDD level applied when it was dispatched, with the same values as the `dispatch` event), the ticket's `cx` (after any trap reveal), `stack`, `gig` and `research`, `tokens` (tokens used in thousands, rounded to an integer), `cost` (NT$ charged to the wallet or company API, rounded to an integer; 0 for subscription, seat and local billing), `hours` (rounded to one decimal) and `outcome`. `outcome` SHALL be the first that applies: `cancelled` (the player cancelled the background agent, or it was stopped when day 20 ended with its ticket due after day 20, see `game-modes`), `aborted` (settled as forced failure: serial run out of hours, cancelled at day end because its ticket is due, or by an outage), `quota` (subscription or seat quota ran out), `conflict` (merge conflict), `rejected` (App Store rejection), `caught` (the review caught the error and the ticket is done), `success`, `trap_stop` (a hidden trap stopped the agent), `fail`. A job saved before this change without a model id or effort SHALL report `model` `unknown` and `effort` `mid`. A job saved before this change with a boolean SDD record SHALL report `sdd` `md` for `true` and `none` for `false`.

#### Scenario: Outcomes

- **WHEN** jobs are settled in the following situations
- **THEN** each sends one `job_result` with the listed `outcome`

##### Example: outcome per situation

| Situation | outcome |
| --- | --- |
| player cancelled a background agent | `cancelled` |
| player cancelled a background agent whose quota ran short on the charge | `cancelled` |
| background agent stopped when day 20 ended, ticket due on day 22 | `cancelled` |
| serial job longer than the hours left | `aborted` |
| background agent cancelled at day end because its ticket is due | `aborted` |
| subscription quota smaller than the job's tokens | `quota` |
| job rolled a failure and the review caught it | `caught` |
| job succeeded with no conflict or rejection | `success` |
| hidden trap with true complexity above the model's capability | `trap_stop` |
| job rolled a failure and the review did not catch it | `fail` |

#### Scenario: Cost and tokens

- **WHEN** a successful job on 個人 API on Claude Opus (NT$0.9 per 1k tokens, no price modifier) used 100k tokens
- **THEN** its `job_result` has `tokens` 100 and `cost` 90

#### Scenario: Research flag on the result

- **WHEN** a directly dispatched research ticket's job is settled
- **THEN** its `job_result` has `research` `true`

#### Scenario: SDD level on the result

- **WHEN** a job dispatched with applied SDD level 2 is settled, and a running job saved with SDD `true` is settled after loading
- **THEN** the first `job_result` has `sdd` `framework` and the second `sdd` `md`
