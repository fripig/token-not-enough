## MODIFIED Requirements

### Requirement: Dispatch event

Each time an agent is started on a ticket, the game SHALL send one `dispatch` event with `vendor`, `model` (model id), `bill` (`sub`, `seat`, `api`, `corp` or `local`), `review` (`none`, `self` or `strict`), `effort` (`low`, `mid` or `high`; always `mid` outside advanced mode), `sdd` (the applied SDD level: `none` for 0, `md` for 1, `framework` for 2; `none` while SDD is not owned), `rv_vendor`, `rv_model` and `rv_bill` (the effective reviewer's vendor, model id and billing, see `cross-model-review`; each `same` when the effective reviewer is 同一個, including while 交叉審核工具 is not owned or the review level is 不審核), `via` (`panel` for the 派工 button, `quick` for 一鍵派工, `batch` for 批次派工), `preset` (`A`, `B` or `C` for quick and batch, `none` for panel), and the ticket's `cx` (complexity shown at dispatch), `stack`, `incident`, `sensitive`, `gig` (outsourced ticket), `merge` (merge-conflict ticket) and `research` (research ticket dispatched without research). In serial mode it SHALL be sent before the job's `job_result`. A dispatch that is refused (no free slot, local GPU busy, company billing on an outsourced ticket, no usable preset) SHALL NOT send it.

#### Scenario: Panel dispatch

- **WHEN** in parallel mode with SDD not owned the player selects a complexity-2 Laravel ticket, picks Claude Sonnet, 公司 API, 自審 and presses 派工
- **THEN** one `dispatch` event is sent with `vendor` `anthropic`, `model` `sonnet`, `bill` `corp`, `review` `self`, `effort` `mid`, `sdd` `none`, `via` `panel`, `preset` `none`, `cx` 2, `stack` `laravel`

#### Scenario: Quick dispatch

- **WHEN** the player presses 一鍵派工 on a ticket and preset A is usable
- **THEN** one `dispatch` event is sent with `via` `quick`, `preset` `A` and preset A's vendor, model, billing and review

#### Scenario: Batch dispatch

- **WHEN** the player with skills presses 批次派工 and two tickets are dispatched
- **THEN** two `dispatch` events are sent, both with `via` `batch`

#### Scenario: Refused dispatch

- **WHEN** the player presses 派工 on an outsourced ticket with 公司 API selected
- **THEN** no `dispatch` event is sent

#### Scenario: Direct dispatch of a research ticket

- **WHEN** the player dispatches a research ticket without researching it
- **THEN** its `dispatch` event has `research` `true`; a normal ticket's has `research` `false`

#### Scenario: SDD level on the dispatch

- **WHEN** the player dispatches from the dispatch panel in each state of the table
- **THEN** the `dispatch` event's `sdd` is as listed

##### Example: sdd value

| Owned SDD level | Requested level | sdd |
| --- | --- | --- |
| 0 | 2 | `none` |
| 1 | 2 | `md` |
| 2 | 2 | `framework` |
| 2 | 0 | `none` |

#### Scenario: Reviewer on the dispatch

- **WHEN** 交叉審核工具 is owned and the player dispatches Sonnet on 公司 API with 自審 reviewed by Opus on 個人訂閱, then dispatches another ticket with 同一個
- **THEN** the first `dispatch` event has `rv_vendor` `anthropic`, `rv_model` `opus`, `rv_bill` `sub`, and the second has `same` for all three

---
### Requirement: Dispatch result event

Each time a dispatched job is settled, the game SHALL send one `job_result` event with the job's `vendor`, `model`, `bill`, `review`, `effort` and `sdd` (the SDD level applied when it was dispatched, with the same values as the `dispatch` event), `rv_vendor`, `rv_model` and `rv_bill` (with the same values as the `dispatch` event), the ticket's `cx` (after any trap reveal), `stack`, `gig` and `research`, `tokens` (tokens used in thousands including the review part, rounded to an integer), `cost` (NT$ charged to the wallet or company API for the writer and review parts together, rounded to an integer; 0 for subscription, seat and local billing), `hours` (rounded to one decimal) and `outcome`. `outcome` SHALL be the first that applies: `cancelled` (the player cancelled the background agent, or it was stopped when day 20 ended with its ticket due after day 20, see `game-modes`), `aborted` (settled as forced failure: serial run out of hours, cancelled at day end because its ticket is due, or by an outage), `quota` (subscription or seat quota ran out), `conflict` (merge conflict), `rejected` (App Store rejection), `caught` (the review caught the error and the ticket is done), `success`, `trap_stop` (a hidden trap stopped the agent), `fail`. A job saved before this change without a reviewer SHALL report `same` for `rv_vendor`, `rv_model` and `rv_bill`. A job saved before this change without a model id or effort SHALL report `model` `unknown` and `effort` `mid`. A job saved before this change with a boolean SDD record SHALL report `sdd` `md` for `true` and `none` for `false`.

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

#### Scenario: Review part in tokens and cost

- **WHEN** a successful job written by Sonnet on 個人 API used 200k tokens and its review by Opus on 公司 API used 51k tokens, with no price modifier
- **THEN** its `job_result` has `tokens` 251, `cost` 136 and `rv_bill` `corp`
