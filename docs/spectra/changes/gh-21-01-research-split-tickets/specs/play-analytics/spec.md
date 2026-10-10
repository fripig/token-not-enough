## MODIFIED Requirements

### Requirement: Dispatch event

Each time an agent is started on a ticket, the game SHALL send one `dispatch` event with `vendor`, `model` (model id), `bill` (`sub`, `seat`, `api`, `corp` or `local`), `review` (`none`, `self` or `strict`), `effort` (`low`, `mid` or `high`; always `mid` outside advanced mode), `via` (`panel` for the 派工 button, `quick` for 一鍵派工, `batch` for 批次派工), `preset` (`A`, `B` or `C` for quick and batch, `none` for panel), and the ticket's `cx` (complexity shown at dispatch), `stack`, `incident`, `sensitive`, `gig` (outsourced ticket), `merge` (merge-conflict ticket) and `research` (research ticket dispatched without research). In serial mode it SHALL be sent before the job's `job_result`. A dispatch that is refused (no free slot, local GPU busy, company billing on an outsourced ticket, no usable preset) SHALL NOT send it.

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

#### Scenario: Direct dispatch of a research ticket

- **WHEN** the player dispatches a research ticket without researching it
- **THEN** its `dispatch` event has `research` `true`; a normal ticket's has `research` `false`

---
### Requirement: Dispatch result event

Each time a dispatched job is settled, the game SHALL send one `job_result` event with the job's `vendor`, `model`, `bill`, `review` and `effort`, the ticket's `cx` (after any trap reveal), `stack`, `gig` and `research`, `tokens` (tokens used in thousands, rounded to an integer), `cost` (NT$ charged to the wallet or company API, rounded to an integer; 0 for subscription, seat and local billing), `hours` (rounded to one decimal) and `outcome`. `outcome` SHALL be the first that applies: `aborted` (settled as forced failure: serial run out of hours, cancelled at day end or by an outage), `quota` (subscription or seat quota ran out), `conflict` (merge conflict), `rejected` (App Store rejection), `caught` (the review caught the error and the ticket is done), `success`, `trap_stop` (a hidden trap stopped the agent), `fail`. A job saved before this change without a model id or effort SHALL report `model` `unknown` and `effort` `mid`.

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

- **WHEN** a successful job on 個人 API on Claude Opus (NT$0.9 per 1k tokens, no price modifier) used 100k tokens
- **THEN** its `job_result` has `tokens` 100 and `cost` 90

#### Scenario: Research flag on the result

- **WHEN** a directly dispatched research ticket's job is settled
- **THEN** its `job_result` has `research` `true`

---
### Requirement: Other ticket action events

The game SHALL send one event per other ticket-solving action, after the action's result is known:

- `manual_fix` when manual work finishes on a ticket still in the queue, with the ticket's `cx` shown before the work, `stack`, `unfamiliar`, `gig`, `hours` (one decimal) and `outcome` (`success`, `fail`, or `trap` when a hidden trap was revealed).
- `evaluate` when an architecture evaluation is charged, with `vendor`, `model`, `bill`, the ticket's `cx` shown before the evaluation, `stack`, `gig` and `outcome` (`found` when a trap was revealed, `clear` otherwise, `quota` when the quota ran out).
- `research` when agent or self research on a research ticket is charged, with `via` (`agent` or `self`), `vendor`, `model` and `bill` (`none` for all three on self research), the ticket's `cx`, `stack`, `gig` and `outcome` (`split` when the ticket was split, `quota` when the quota ran out).
- `rescope` when the player asks the manager to re-estimate, with the ticket's `cx`, `stack` and `outcome` (`approved` or `refused`).
- `invest` when an investment is bought or a machine purchase request is accepted, with `investment` (the investment key, or `pc`, `spark` or `mac` for a machine request) and `stack` (the stack for CLAUDE.md, `none` otherwise). Machine arrival or rejection SHALL NOT send an event.

An action that is refused (not enough hours, local GPU busy, research on a ticket that is not a research ticket, investment already bought or unaffordable, machine request refused) SHALL NOT send its event.

#### Scenario: Manual fix

- **WHEN** in serial mode the player writes a complexity-1 Laravel ticket by hand and it succeeds
- **THEN** one `manual_fix` event is sent with `cx` 1, `stack` `laravel`, `unfamiliar` `false`, `outcome` `success`

#### Scenario: Evaluate finds a trap

- **WHEN** the player evaluates a hidden-trap ticket shown as complexity 1 with true complexity 4 and the trap is revealed
- **THEN** one `evaluate` event is sent with `outcome` `found` and `cx` 1

#### Scenario: Rescope

- **WHEN** with trust 70 the player asks the manager to re-estimate a revealed trap
- **THEN** one `rescope` event is sent with `outcome` `approved`; with trust 40 it has `outcome` `refused`

#### Scenario: Invest

- **WHEN** the player buys CLAUDE.md for Rust, then tries to buy it again
- **THEN** one `invest` event is sent with `investment` `md` and `stack` `rust`, and the second attempt sends nothing

#### Scenario: Machine request

- **WHEN** the player requests the DGX Spark, then tries to request the Mac while the Spark is pending
- **THEN** one `invest` event is sent with `investment` `spark` and `stack` `none`, and the second attempt sends nothing

#### Scenario: Research

- **WHEN** the player self-researches a complexity-4 Laravel research ticket
- **THEN** one `research` event is sent with `via` `self`, `vendor` `none`, `cx` 4, `stack` `laravel`, `outcome` `split`

