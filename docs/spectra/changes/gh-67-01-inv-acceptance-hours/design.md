## Context

`gh-64-01-agent-investments` made the written investments into queue tickets in parallel mode. Dispatched to an agent, a ticket pays tokens only; `settleInv` in public/js/actions.js applies the level with `applyInv` the moment the job finishes, sends the `invest` GA event and removes the ticket. Hand-writing (`invSelf`) still costs the level's hours and company budget. With unlimited parallel agents (#63), a player can open and dispatch all ten level-1 tickets at 9:00 on day 1 and own everything by about 16:00 (estimate from constants, see proposal).

## Goals / Non-Goals

**Goals:**

- An agent-built investment costs the player some of their own hours, so the whole set cannot be finished on day 1 and the hours trade-off of investing comes back.
- The agent route stays worth it compared with hand-writing for a capable model (no company budget, fewer hours).

**Non-Goals:**

- Limiting how many investment tickets run at once (rejected by the user).
- Charging the fixed company budget on the agent route (rejected by the user).
- Delaying the effect to the next working day (rejected by the user).
- Automatic acceptance on job completion like PR review: PR time that lands after 17:00 is dropped by `advance()`, so a job finishing late or overnight would be accepted for free.
- Changing serial mode, hand-writing, quality anchors (`INV_Q`), complexities (`INV_CX`) or the non-written investments.

## Decisions

### Finished investment jobs wait in the queue for acceptance

`settleInv` on a fully paid finish no longer calls `applyInv`. It sets `is.acc = {q, v, m, b}` (quality, vendor, model id, payment) on the ticket, keeps it in the queue and logs that it awaits acceptance. Shortfall, cancel and outage paths are unchanged (the ticket returns without `acc`). The ticket keeps counting as open for its investment and level (`invTicketOpen`), so no second ticket for that level can be opened.

### Acceptance costs half the hand-writing hours and nothing else

`ACCEPT_HRS = 0.5` in public/js/data.js. Acceptance hours = `ACCEPT_HRS × lvCost(k, L).hrs` (level 1: 1–3 hours; level 2: 0.5 hours). The new action `acceptInv(id)` refuses with 工時不夠 when hours left are below that, otherwise advances the clock with `advance()` (background agents keep running, PR review of jobs finishing meanwhile is added as usual), calls `applyInv(inv, acc.q)`, sends the `invest` event with `via: 'agent'` and the stored vendor, model, payment and quality, logs the acceptance and removes the ticket. No money, company budget or tokens are spent. A busy local GPU does not block it. 0.5 is the initial value; the simulator measurement may change it with the user's choice.

### Awaiting-acceptance panel and card

With a 待驗收 ticket selected, the dispatch panel shows the title, the stored quality, a primary 驗收（Nh，不花錢） button (disabled with the refusal reason) and the 取消投資 button; it shows no presets, model rows, payment, effort, 自己做 or dispatch. The card shows a 待驗收 chip and no one-click preset buttons. 取消投資 removes the ticket like today; the tokens already paid stay paid.

### GA timing moves to acceptance

The `invest` event for an agent investment is sent from `acceptInv`, not from `settleInv`; a ticket that is cancelled while awaiting acceptance sends nothing. Parameters are unchanged, so the GA custom dimensions need no change.

## Implementation Contract

- Behavior: in parallel mode, a dispatched investment ticket whose job finishes fully paid shows 待驗收 on its card; until the player presses 驗收（Nh，不花錢） in the dispatch panel the investment level is not owned and its quality is not applied; pressing it advances the clock by `ACCEPT_HRS × hand-writing hours` and applies the level or raises a redo's quality.
- Interface / data shape: `ACCEPT_HRS` (data.js); `acceptHrs(is)` and `acceptBlock(is)` and `acceptInv(id)` (actions.js); ticket field `acc: {q, v, m, b}` (optional; absent means not awaiting acceptance); button `data-act="invaccept"` delegated in main.js; new i18n keys for the chip, button, panel line and log lines in both dictionaries.
- Failure modes: not enough hours → button disabled with 工時不夠, nothing changes; calling `acceptInv` for a ticket without `acc` or a running ticket → no change, returns false.
- Acceptance criteria: the delta spec scenarios asserted in tools/check/agent-investments.test.js and tools/check/play-analytics.test.js; `node tools/check.js` passes in full; fixed-seed sim outputs without `SIM_INVAGENT` are byte-identical before and after.
- Scope boundaries: in scope are the acceptance state and action, panel and card, GA timing, logs, save compatibility, rules modal text, what's-new entry, DESIGN.md and the `SIM_INVAGENT` auto-player. Out of scope are the Non-Goals above.

## Risks / Trade-offs

- [The agent route may become worse than hand-writing for weak models] → acceptable: `SIM_INVAGENT=cheap` was already −0.1% to −7.9% and is measured only.
- [Players may forget to accept] → the 待驗收 chip on the card and the log line say it has no effect yet; the ticket is listed with investment tickets at the end of the queue.
- [Old saves with an investment job running overnight] → the job finishes into 待驗收 under the new rule; no migration needed.
