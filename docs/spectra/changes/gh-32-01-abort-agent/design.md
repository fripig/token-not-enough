## Context

In parallel mode a dispatch creates a job in `S.jobs`, marks the ticket `running` (hidden from the queue) and lets it run on the clock. Jobs leave `S.jobs` in two ways today: they finish inside `advance` and are settled by `settle`, or the game cancels them through `cancelJobs(pred, note)` at day end (ticket due) or on a vendor outage. `cancelJobs` calls `settle(j, {frac: max(0.05, 1 − left/hrs), fail: true, note})`.

`settle` with `fail: true` does more than charge: it reveals a hidden trap first (`hiddenTrap` → `reveal`, `S.st.trapHit++`), and in its failure branch increments `tries` and multiplies the ticket's `base` by `RETRY.tk` (0.7). It also rolls the security audit (`auditRoll`) and checks company overdraft (`checkOverdraft`), and sends GA `job_result` with `outcome: 'aborted'`.

The discussion on 2026-10-10 (issue #32) settled the player-facing rules; the player chose that a player cancel counts nothing against the ticket.

## Goals / Non-Goals

**Goals:**

- A player can cancel any running background agent in parallel mode with a two-step button on its row in the 背景 agent list.
- Cancelling charges only the fraction already run (at least 5%) and returns the ticket to the queue unchanged.
- Cancellation cannot be used to buy a retry discount or to reveal a trap cheaply.

**Non-Goals:**

- Serial mode (no running jobs exist there).
- Refunds, a time cost for cancelling, or changes to game-forced cancellation.
- Save format changes (`SAVE_VER` stays; daytime actions are not saved).
- Teaching `tools/sim.js` to cancel.

## Decisions

### Player cancel settles through settle with a cancel option

Add a `cancel: true` option to `settle`. With it, `settle` skips the hidden-trap reveal at the top, takes the failure path for charging (same `frac`, same `charge`, `S.st.tk` and `S.st.byBill` updates, `auditRoll`, `checkOverdraft`), but in the failure branch leaves `tries` and `base` untouched and writes the `⏹ 中止` line instead of the `✗` line. `outcome` is `cancelled` and takes precedence over every other outcome.

Alternative considered: a separate function that only charges. Rejected because charging, GA, token stats, audit and overdraft would be duplicated from `settle`, and the two would drift.

### No retry discount and no trap reveal on player cancel

Game-forced cancellation keeps its current behavior (failure, `tries` +1, base ×0.7, trap reveal). A player cancel does none of these. Otherwise cancelling right after dispatch would cost 5% of the tokens and give a permanent 30% token discount on the ticket, or reveal a trap for less than an architecture evaluation (40k tokens × verb plus 0.5h).

### Cancel action in actions.js

A new exported `cancelJob(id)` in `public/js/actions.js` finds the job in `S.jobs` whose ticket id is `id`; if none exists or the mode is not parallel it does nothing. Otherwise it removes the job from `S.jobs`, sets `issue.running = false` and settles it with `{frac: max(0.05, 1 − left/hrs), fail: true, cancel: true}`. It does not advance the clock. `cancelJobs` stays for game-forced cancellation.

### Two-step cancel button with armed state in view.js

`public/js/view.js` keeps the armed ticket id in an exported `cancelArm` (null when nothing is armed), changed only through an exported `armCancel(id)` setter, following the module rule that only the owning module reassigns its bindings. Each job row renders a button with `data-cancel=<ticket id>`: label 中止 when not armed, 確定中止？ (danger style) when armed.

In `public/js/main.js` the click handler first disarms: when `cancelArm` is set and the click is not on the armed row's cancel button, it calls `armCancel(null)` and re-renders before handling the click normally (this also covers clicks on non-buttons). A click on a `data-cancel` button arms it if it is not armed, or calls `cancelJob` and disarms if it is. A stale armed id (the job finished meanwhile) is harmless: it matches no row, and the next click clears it.

Alternative considered: a single click with no protection. Rejected because the row sits next to the queue and wait buttons and a misclick costs tokens.

### GA outcome cancelled

`job_result` `outcome` gains `cancelled`, checked before `aborted`. Day-end and outage cancellation keep `aborted`, so GA can separate the player's choice from forced stops.

## Implementation Contract

**Behavior**

- Parallel mode only. Each 背景 agent row has a cancel button; the first click changes it to 確定中止？, a second click on it cancels that agent, any other click restores 中止.
- On cancel: tokens charged = job tokens × max(0.05, fraction run); money, quota or company budget charged accordingly through the existing charging rules (including running out of quota or wallet, which charges only what is left). Clock unchanged. Ticket back in the queue with the same `cx`, `base`, `tries`, trap flags, due date and KPI; it can be selected and dispatched again at once. A cancelled local agent no longer counts as running, so local dispatch and evaluation become available. The hardware use already recorded at dispatch stays (no idle penalty for that machine that day).
- Security audit roll for sensitive tickets on personal billing and the company overdraft check run as for any settled job.
- Log line (class warn): `⏹ 中止 <title>｜<agent> / <model name>・<billing>｜燒掉 <tokens>｜<spend>｜<hours>h`, where `<model name>` includes the effort suffix as in other result lines.
- GA: one `job_result` with `outcome: 'cancelled'` and the usual parameters.
- Rules pop-up: the parallel-mode text says the player can cancel a background agent, paying only for the part already run, and that the ticket returns to the queue without counting as a failure.

**Interfaces**

- `cancelJob(id)` exported from `public/js/actions.js`.
- `settle(j, {frac, fail, cancel, note})`: `cancel` is new and optional.
- `cancelArm` and `armCancel(id)` exported from `public/js/view.js`.
- DOM: `data-cancel="<ticket id>"` on the job row button.

**Failure modes**

- `cancelJob` with an id that has no running job, or in serial mode: no change, no log, no GA.

**Acceptance**

- `tools/check.js` assertions (listed in tasks) pass with `node tools/check.js` exiting 0.
- `SIM_N=100 SIM_SEED=101 node tools/sim.js` output is identical before and after the change (the auto-player never cancels and the change adds no `Math.random` calls on its paths).

**Scope boundaries**

- In: actions.js cancel action and `settle` option, view.js button and armed state, main.js delegation, rules.js text, tools/check.js, docs/DESIGN.md.
- Out: serial mode, sim auto-player, save format, game-forced cancellation behavior.

## Risks / Trade-offs

- [Cancel right after dispatch still costs 5% of the job's tokens] → Intended: the floor matches forced cancellation and keeps cancel from being free.
- [A cancelled job's pre-rolled outcome (success, review catch) is discarded and re-rolled on the next dispatch] → The player never sees the pre-rolled result, so re-rolling gives no information; the cost of the cancelled run is the price of a re-roll.
- [Armed state lives outside `S`] → It is UI-only, not saved, and reset on any other click; no game rule depends on it.
