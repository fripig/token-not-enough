## MODIFIED Requirements

### Requirement: Game start

When the player confirms the opening setup modal (開始第 1 天), the game SHALL send `game_start`, then the opening `subscription` events (see Subscription events), then `day_reached` with `day` 1, after the run's settings and subscriptions from the modal are applied. Confirming the weekly 調整訂閱 modal SHALL send only the `subscription` events for changed plans, and closing it SHALL NOT send any event. Starting a new month with 再玩一個月 SHALL send the events again when its opening setup is confirmed.

#### Scenario: Opening confirm

- **WHEN** the player confirms the opening setup with Claude Max 5× and no other subscription
- **THEN** exactly three events are sent, `game_start`, `subscription`, then `day_reached`, all with `day` 1

#### Scenario: Weekly adjustment without changes

- **WHEN** the player confirms the weekly 調整訂閱 modal on day 6 without changing any plan, or closes it
- **THEN** no event is sent

## ADDED Requirements

### Requirement: Subscription events

At the opening confirm the game SHALL send one `subscription` event for each vendor whose plan is not `none`, in `SUBV` order, with `vendor` (vendor key) and `plan` (plan id). When no vendor is subscribed it SHALL send one `subscription` event with `vendor` `none` and `plan` `none`. At the weekly confirm it SHALL send one `subscription` event for each vendor whose plan differs from before the modal, with the new plan id (`none` when cancelled).

#### Scenario: Opening subscriptions

- **WHEN** the player confirms the opening setup with Claude Max 5× and GLM Lite
- **THEN** two `subscription` events are sent: `vendor` `anthropic` `plan` `max5`, then `vendor` `zhipu` `plan` `lite`

#### Scenario: No subscription

- **WHEN** the player confirms the opening setup with every plan at 不訂閱
- **THEN** one `subscription` event is sent with `vendor` `none` and `plan` `none`

#### Scenario: Monday change

- **WHEN** on day 6 the player holding Claude Max 5× and GLM Lite changes Claude to Max 20×, cancels GLM and confirms
- **THEN** two `subscription` events are sent with `day` 6: `anthropic` `max20` and `zhipu` `none`

### Requirement: Dispatch event

Each time an agent is started on a ticket, the game SHALL send one `dispatch` event with `vendor`, `model` (model id), `bill` (`sub`, `seat`, `api`, `corp` or `local`), `review` (`none`, `self` or `strict`), `effort` (`low`, `mid` or `high`; always `mid` outside advanced mode), `via` (`panel` for the 派工 button, `quick` for 一鍵派工, `batch` for 批次派工), `preset` (`A`, `B` or `C` for quick and batch, `none` for panel), and the ticket's `cx` (complexity shown at dispatch), `stack`, `incident`, `sensitive`, `gig` (outsourced ticket) and `merge` (merge-conflict ticket). In serial mode it SHALL be sent before the job's `job_result`. A dispatch that is refused (no free slot, local GPU busy, company billing on an outsourced ticket, no usable preset) SHALL NOT send it.

#### Scenario: Panel dispatch

- **WHEN** in parallel mode the player selects a complexity-2 Laravel ticket, picks Claude Sonnet, 公司 API, 自審 and presses 派工
- **THEN** one `dispatch` event is sent with `vendor` `anthropic`, `model` `sonnet`, `bill` `corp`, `review` `self`, `effort` `mid`, `via` `panel`, `preset` `none`, `cx` 2, `stack` `laravel`

#### Scenario: Quick dispatch

- **WHEN** the player presses 一鍵派工 on a ticket and preset A is usable
- **THEN** one `dispatch` event is sent with `via` `quick`, `preset` `A` and preset A's vendor, model, billing and review

#### Scenario: Batch dispatch

- **WHEN** the player with skills presses 批次派工 and two tickets are dispatched
- **THEN** two `dispatch` events are sent, both with `via` `batch`

#### Scenario: Refused dispatch

- **WHEN** the player presses 派工 on an outsourced ticket with 公司 API selected
- **THEN** no `dispatch` event is sent

### Requirement: Dispatch result event

Each time a dispatched job is settled, the game SHALL send one `job_result` event with the job's `vendor`, `model`, `bill`, `review` and `effort`, the ticket's `cx` (after any trap reveal), `stack` and `gig`, `tokens` (tokens used in thousands, rounded to an integer), `cost` (NT$ charged to the wallet or company API, rounded to an integer; 0 for subscription, seat and local billing), `hours` (rounded to one decimal) and `outcome`. `outcome` SHALL be the first that applies: `aborted` (settled as forced failure: serial run out of hours, cancelled at day end or by an outage), `quota` (subscription or seat quota ran out), `conflict` (merge conflict), `rejected` (App Store rejection), `caught` (the review caught the error and the ticket is done), `success`, `trap_stop` (a hidden trap stopped the agent), `fail`. A job saved before this change without a model id or effort SHALL report `model` `unknown` and `effort` `mid`.

#### Scenario: Outcomes

- **WHEN** jobs are settled in the following situations
- **THEN** each sends one `job_result` with the listed `outcome`

##### Example: outcome per situation

| Situation | outcome |
| --- | --- |
| serial job longer than the hours left | `aborted` |
| subscription quota smaller than the job's tokens | `quota` |
| job rolled a failure and the review caught it | `caught` |
| job succeeded with no conflict or rejection | `success` |
| hidden trap with true complexity above the model's capability | `trap_stop` |
| job rolled a failure and the review did not catch it | `fail` |

#### Scenario: Cost and tokens

- **WHEN** a successful job on 個人 API on Claude Opus (NT$1.5 per 1k tokens, no price modifier) used 100k tokens
- **THEN** its `job_result` has `tokens` 100 and `cost` 150

### Requirement: Other ticket action events

The game SHALL send one event per other ticket-solving action, after the action's result is known:

- `manual_fix` when manual work finishes on a ticket still in the queue, with the ticket's `cx` shown before the work, `stack`, `unfamiliar`, `gig`, `hours` (one decimal) and `outcome` (`success`, `fail`, or `trap` when a hidden trap was revealed).
- `evaluate` when an architecture evaluation is charged, with `vendor`, `model`, `bill`, the ticket's `cx`, `stack`, `gig` and `outcome` (`found` when a trap was revealed, `clear` otherwise, `quota` when the quota ran out).
- `rescope` when the player asks the manager to re-estimate, with the ticket's `cx`, `stack` and `outcome` (`approved` or `refused`).
- `invest` when an investment is bought, with `investment` (the investment key) and `stack` (the stack for CLAUDE.md, `none` otherwise).

An action that is refused (not enough hours, local GPU busy, investment already bought or unaffordable) SHALL NOT send its event.

#### Scenario: Manual fix

- **WHEN** in serial mode the player writes a complexity-1 Laravel ticket by hand and it succeeds
- **THEN** one `manual_fix` event is sent with `cx` 1, `stack` `laravel`, `unfamiliar` `false`, `outcome` `success`

#### Scenario: Evaluate finds a trap

- **WHEN** the player evaluates a hidden-trap ticket and the trap is revealed
- **THEN** one `evaluate` event is sent with `outcome` `found`

#### Scenario: Rescope

- **WHEN** with trust 70 the player asks the manager to re-estimate a revealed trap
- **THEN** one `rescope` event is sent with `outcome` `approved`; with trust 40 it has `outcome` `refused`

#### Scenario: Invest

- **WHEN** the player buys CLAUDE.md for Rust, then tries to buy it again
- **THEN** one `invest` event is sent with `investment` `md` and `stack` `rust`, and the second attempt sends nothing
