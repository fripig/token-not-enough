## Context

`track(name, extra)` in public/js/state.js sends a GA event with the common parameters (`game_version`, `game_mode`, `companies`, `slots`, `advanced`, `outsource`, `day`) merged with `extra`, and does nothing without `gtag`. Today only `game_start`, `day_reached` and `game_end` exist. Subscriptions are chosen in `showSetup` (public/js/modals.js) at the opening confirm and on Mondays; ticket actions live in public/js/actions.js (`dispatch`, `quick`, `batch`, `settle`, `manual`, `evaluate`, `rescope`, `invest`).

## Goals / Non-Goals

**Goals:**

- Subscription distribution per vendor and plan, at the start of a run and when changed on Mondays.
- One event per ticket-solving choice, with enough parameters to compare choices and outcomes in GA.

**Non-Goals:**

- Panel-only interactions (selecting a ticket, switching model, loading or saving a preset, waiting) are not sent.
- Team seat applications and approvals are not sent.
- No combined subscription string; the user chose one event per vendor.
- Configuring GA custom dimensions; that is done in the GA admin console.

## Decisions

### One subscription event per vendor

At the opening confirm send one `subscription` event per vendor in `SUBV` whose plan is not `none`, with `vendor` and `plan` ids; when none is subscribed send one event with `vendor` `none` and `plan` `none`, so every run is counted. On the weekly confirm send one event per vendor whose plan changed, with the new plan (`none` when cancelled). GA then counts runs per vendor × plan by filtering `day` 1. A combined string event was rejected by the user because single-vendor distribution would need string filtering.

### Event order at the opening confirm

`game_start`, then the `subscription` events, then `day_reached` day 1. Subscriptions are applied before `game_start` is sent so the order follows the setup modal. The existing scenario "exactly two events" is replaced.

### Dispatch and result are separate events

`dispatch` is sent when an agent actually starts (parallel: the job is added to a slot; serial: before it is settled). `job_result` is sent from `settle`, so it covers parallel completion, serial settlement, overnight aborts and outage cancels in one place. To report the model id and effort at settle time, `makeJob` stores `m` (model id) and `ef` (effective effort index from `efOf`) on the job; jobs from older saves lack them and report `model` `unknown` and `effort` `mid`. No `SAVE_VER` bump: missing fields do not break loading.

### How the dispatch was triggered

`dispatch(via, preset)` takes `via` `panel` (派工 button, default), `quick` (一鍵派工) or `batch` (批次派工 through `quick`), and `preset` `A`/`B`/`C` for quick and batch, `none` for panel. `quick` gains a second argument so `batch` can pass `batch`.

### Outcome values

`job_result.outcome`, first match wins: `aborted` (settled with `fail`: serial out of hours, day-end or outage cancel), `quota` (subscription or seat quota ran out), `conflict` (merge conflict), `rejected` (App Store), `caught` (review caught the error, ticket done), `success`, `trap_stop` (hidden trap stopped the agent), `fail`.

## Implementation Contract

**Behavior**: with `gtag` present, the events and parameters below are sent; without it nothing changes in play.

**Data shape** (all events also carry the common parameters):

| Event | When | Extra parameters |
| --- | --- | --- |
| `subscription` | opening confirm (per subscribed vendor, or one `none`); weekly confirm (per changed vendor) | `vendor`, `plan` |
| `dispatch` | an agent is started on a ticket | `vendor`, `model`, `bill`, `review` (`none`/`self`/`strict`), `effort` (`low`/`mid`/`high`; `mid` in normal mode), `via`, `preset`, `cx` (shown complexity), `stack`, `incident`, `sensitive`, `gig`, `merge` |
| `job_result` | `settle` | `vendor`, `model`, `bill`, `review`, `effort`, `cx` (after any trap reveal), `stack`, `gig`, `outcome`, `tokens` (k tokens, integer), `cost` (NT$ integer for `api`/`corp`, 0 otherwise), `hours` (one decimal) |
| `manual_fix` | manual work finishes on a ticket still in the queue | `cx` (shown before work), `stack`, `unfamiliar`, `gig`, `outcome` (`success`/`fail`/`trap`), `hours` |
| `evaluate` | evaluation is charged | `vendor`, `model`, `bill`, `cx`, `stack`, `gig`, `outcome` (`found`/`clear`/`quota`) |
| `rescope` | 找主管重新評估 | `cx`, `stack`, `outcome` (`approved`/`refused`) |
| `invest` | an investment is bought | `investment` (INVEST key), `stack` (stack for `md`, `none` otherwise) |

**Failure modes**: a blocked action (no slot, blocked billing, not enough hours) sends nothing. A throwing `gtag` is caught by `track`.

**Acceptance**: `node tools/check.js` asserts each scenario of the play-analytics delta spec with a stubbed `gtag`.

**Scope**: in scope are public/js/modals.js, public/js/actions.js, tools/check.js, docs/DESIGN.md. Out of scope: GA admin configuration, tools/sim.js (has no `gtag`).

## Risks / Trade-offs

- [Event volume] A parallel run dispatches roughly 60–100 tickets (estimate, not measured), so about 200 extra events per run; well within GA4 free limits. → Confirm by counting events in a simulated month in check.js if it matters.
- [Custom dimensions] About 17 new parameters must be registered (GA allows 50 event-scoped). → Listed in docs/DESIGN.md.
