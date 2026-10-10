# play-analytics Specification

## Purpose

Records how far players get in a month and with which settings, by sending Google Analytics events at game start, at the start of each day and at month end. The data tells the maintainer where players stop playing and which setups they choose.

## Requirements

### Requirement: Event delivery

The game SHALL send each analytics event as `gtag('event', <name>, <parameters>)`. When no global `gtag` function exists (local server without the tag, node tools, blocked by the browser), sending an event SHALL do nothing. An exception thrown while sending SHALL be caught so the game continues normally.

#### Scenario: No gtag

- **WHEN** no global `gtag` function exists and a run is started, played through day 20 and ended
- **THEN** no error is thrown and the month-end receipt opens

#### Scenario: gtag throws

- **WHEN** the global `gtag` throws on every call and the player confirms the opening setup
- **THEN** no error is thrown and the run starts on day 1


<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
### Requirement: Common event parameters

Every event SHALL carry these parameters, read from the run's state at the moment the event is sent:

##### Example: parameters for a parallel Laravel + Rust run with 4 slots, advanced mode and outsourcing on day 3

| Parameter | Value |
| --- | --- |
| `game_version` | the value of `GAME_VERSION` (see Game version stamp) |
| `game_mode` | `parallel` (or `serial`) |
| `companies` | the selected stacks joined with `+` in the fixed company order, here `laravel+rust` |
| `slots` | `4`; always `1` in serial mode |
| `advanced` | `true` |
| `outsource` | `true` |
| `day` | `3` |

#### Scenario: Serial run parameters

- **WHEN** the player confirms the opening setup with only Rails selected, serial mode, 5 slots stored, normal mode and no outsourcing
- **THEN** the `game_start` event carries `game_mode` `serial`, `companies` `rails`, `slots` `1`, `advanced` `false`, `outsource` `false`, `day` `1`

#### Scenario: Parallel run parameters

- **WHEN** the player confirms the opening setup with Laravel and Rust, parallel mode, 4 slots, advanced mode and outsourcing
- **THEN** the `game_start` event carries `game_mode` `parallel`, `companies` `laravel+rust`, `slots` `4`, `advanced` `true`, `outsource` `true`


<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
### Requirement: Game start

When the player confirms the opening setup modal (開始第 1 天), the game SHALL send `game_start`, then the opening `subscription` events (see Subscription events), then `day_reached` with `day` 1, after the run's settings and subscriptions from the modal are applied. Confirming the weekly 調整訂閱 modal SHALL send only the `subscription` events for changed plans, and closing it SHALL NOT send any event. Starting a new month with 再玩一個月 SHALL send the events again when its opening setup is confirmed.

#### Scenario: Opening confirm

- **WHEN** the player confirms the opening setup with Claude Max 5× and no other subscription
- **THEN** exactly three events are sent, `game_start`, `subscription`, then `day_reached`, all with `day` 1

#### Scenario: Weekly adjustment without changes

- **WHEN** the player confirms the weekly 調整訂閱 modal on day 6 without changing any plan, or closes it
- **THEN** no event is sent


<!-- @trace
source: gh-14-01-choice-analytics
updated: 2026-10-09
code:
  - tools/check.js
-->

---
### Requirement: Day reached

Each time a day ends and the next day starts (days 2–20), the game SHALL send one `day_reached` event with `day` set to the new day, after the day's new tickets are added and before the day summary opens. Ending day 20 SHALL NOT send `day_reached`.

#### Scenario: Full month

- **WHEN** the player confirms the opening setup and ends the day 20 times
- **THEN** `day_reached` is sent once for each day 1 through 20, in order, and no `day_reached` has `day` 21


<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
### Requirement: Game end

When the month-end receipt opens, the game SHALL send `game_end` with the common parameters plus `score` (the receipt's total score) and `grade` (S, A, B, C or D, as shown on the receipt).

#### Scenario: Month end

- **WHEN** a serial run reaches the month-end receipt with KPI 300, trust 70, no personal spending and no audits
- **THEN** `game_end` is sent once with `day` 20, `score` 3280 and `grade` B

---
### Requirement: Game version stamp

`public/js/data.js` SHALL define `GAME_VERSION` as `'dev'` in the repository. The GitHub Pages workflow SHALL replace it with the first 7 characters of the deployed commit hash before uploading `public/`, and SHALL fail the deployment when the replacement did not happen.

#### Scenario: Repository value

- **WHEN** the game modules are loaded from the repository
- **THEN** `GAME_VERSION` is `dev` and every event carries `game_version` `dev`

#### Scenario: Deploy stamp

- **WHEN** the deploy workflow runs for commit `aa66a04…`
- **THEN** the published `js/data.js` defines `GAME_VERSION` as `aa66a04`

<!-- @trace
source: gh-10-01-play-analytics
updated: 2026-10-09
code:
  - tools/check.js
  - docs/DESIGN.md
-->

---
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


<!-- @trace
source: gh-14-01-choice-analytics
updated: 2026-10-09
code:
  - tools/check.js
-->

---
### Requirement: Dispatch event

Each time an agent is started on a ticket, the game SHALL send one `dispatch` event with `vendor`, `model` (model id), `bill` (`sub`, `seat`, `api`, `corp` or `local`), `review` (`none`, `self` or `strict`), `effort` (`low`, `mid` or `high`; always `mid` outside advanced mode), `sdd` (the applied SDD level: `none` for 0, `md` for 1, `framework` for 2; `none` while SDD is not owned), `via` (`panel` for the 派工 button, `quick` for 一鍵派工, `batch` for 批次派工), `preset` (`A`, `B` or `C` for quick and batch, `none` for panel), and the ticket's `cx` (complexity shown at dispatch), `stack`, `incident`, `sensitive`, `gig` (outsourced ticket), `merge` (merge-conflict ticket) and `research` (research ticket dispatched without research). In serial mode it SHALL be sent before the job's `job_result`. A dispatch that is refused (no free slot, local GPU busy, company billing on an outsourced ticket, no usable preset) SHALL NOT send it.

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

---
### Requirement: Dispatch result event

Each time a dispatched job is settled, the game SHALL send one `job_result` event with the job's `vendor`, `model`, `bill`, `review`, `effort` and `sdd` (the SDD level applied when it was dispatched, with the same values as the `dispatch` event), the ticket's `cx` (after any trap reveal), `stack`, `gig` and `research`, `tokens` (tokens used in thousands, rounded to an integer), `cost` (NT$ charged to the wallet or company API, rounded to an integer; 0 for subscription, seat and local billing), `hours` (rounded to one decimal) and `outcome`. `outcome` SHALL be the first that applies: `cancelled` (the player cancelled the background agent, see `game-modes`), `aborted` (settled as forced failure: serial run out of hours, cancelled at day end or by an outage), `quota` (subscription or seat quota ran out), `conflict` (merge conflict), `rejected` (App Store rejection), `caught` (the review caught the error and the ticket is done), `success`, `trap_stop` (a hidden trap stopped the agent), `fail`. A job saved before this change without a model id or effort SHALL report `model` `unknown` and `effort` `mid`. A job saved before this change with a boolean SDD record SHALL report `sdd` `md` for `true` and `none` for `false`.

#### Scenario: Outcomes

- **WHEN** jobs are settled in the following situations
- **THEN** each sends one `job_result` with the listed `outcome`

##### Example: outcome per situation

| Situation | outcome |
| --- | --- |
| player cancelled a background agent | `cancelled` |
| player cancelled a background agent whose quota ran short on the charge | `cancelled` |
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

---
### Requirement: Other ticket action events

The game SHALL send one event per other ticket-solving action, after the action's result is known:

- `manual_fix` when manual work finishes on a ticket still in the queue, with the ticket's `cx` shown before the work, `stack`, `unfamiliar`, `gig`, `hours` (one decimal) and `outcome` (`success`, `fail`, or `trap` when a hidden trap was revealed).
- `evaluate` when an architecture evaluation is charged, with `vendor`, `model`, `bill`, the ticket's `cx` shown before the evaluation, `stack`, `gig` and `outcome` (`found` when a trap was revealed, `clear` otherwise, `quota` when the quota ran out).
- `research` when agent or self research on a research ticket is charged, with `via` (`agent` or `self`), `vendor`, `model` and `bill` (`none` for all three on self research), the ticket's `cx`, `stack`, `gig` and `outcome` (`split` when the ticket was split, `quota` when the quota ran out).
- `rescope` when the player asks the manager to re-estimate, with the ticket's `cx`, `stack` and `outcome` (`approved` or `refused`).
- `invest` when an investment level is bought, a machine purchase request is accepted, or a conference registration is accepted, with `investment` and `stack`. `investment` SHALL be the investment key for level 1 (for example `md`, `tests`), the key followed by `2` for level 2 (`md2`, `tests2`, `scan2`, `skills2`), `ai1`, `ai2` or `ai3` for 提升 agent 能力, `pc`, `spark` or `mac` for a machine request, and `conf_` followed by the conference key for a registration (for example `conf_hitcon`). `stack` SHALL be the stack for CLAUDE.md at either level and `none` otherwise. Machine arrival or rejection and conference attendance SHALL NOT send an event.

An action that is refused (not enough hours, local GPU busy, research on a ticket that is not a research ticket, investment already bought, locked or unaffordable, machine request refused, conference registration refused) SHALL NOT send its event.

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

- **WHEN** the player buys CLAUDE.md for Rust, then tries to buy it again before attending a conference covering rust
- **THEN** one `invest` event is sent with `investment` `md` and `stack` `rust`, and the second attempt sends nothing

#### Scenario: Machine request

- **WHEN** the player requests the DGX Spark, then tries to request the Mac while the Spark is pending
- **THEN** one `invest` event is sent with `investment` `spark` and `stack` `none`, and the second attempt sends nothing

#### Scenario: Research

- **WHEN** the player self-researches a complexity-4 Laravel research ticket
- **THEN** one `research` event is sent with `via` `self`, `vendor` `none`, `cx` 4, `stack` `laravel`, `outcome` `split`

#### Scenario: Level 2 and agent capability

- **WHEN** after attending COSCUP the player buys CLAUDE.md level 2 for Rust and 提升 agent 能力 level 1
- **THEN** one `invest` event is sent with `investment` `md2` and `stack` `rust`, and one with `investment` `ai1` and `stack` `none`

#### Scenario: Conference registration

- **WHEN** the player registers for HITCON, then tries to register for COSCUP in the same week
- **THEN** one `invest` event is sent with `investment` `conf_hitcon` and `stack` `none`, the second attempt sends nothing, and the Monday attendance sends nothing
