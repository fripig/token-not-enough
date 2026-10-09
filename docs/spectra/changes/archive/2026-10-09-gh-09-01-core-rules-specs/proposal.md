## Why

The v1 rules (calendar and money, vendors and models, payment methods, client restrictions, ticket lifecycle, success rate, self-review, parallel/serial modes, random events, month-end scoring) were built before Spectra was adopted, so they live only in docs/DESIGN.md and the code. Every later spec (team seats, traps, investments, outsourcing) builds on these rules without a spec to point to, and `tools/check.js` asserts almost none of them.

## What Changes

- Add ten specs that describe the current v1 behavior exactly as implemented in public/js/*.js on 2026-10-09. No game rule, number, or text changes.
- Add `tools/check.js` assertions for the scenarios in the new specs, so a later change that alters a core rule fails the check until its spec is updated.
- Point docs/DESIGN.md at the new specs as the requirement source for the core rules.

## Capabilities

### New Capabilities

- `work-calendar`: 20 working days, 8 hours a day, starting money and trust, weekly Monday resets, subscription purchase and weekly adjustment with prorated upgrades, day-start ticket intake.
- `agent-catalog`: the seven vendors and their models with capability, price, quota weight, speed, and token verbosity; the dispatch panel's agent and model selection, including outages.
- `billing-methods`: personal subscription quota, personal API, company API, and local GPU billing; quota exhaustion; company overspend and overdraft penalties; security audit on sensitive tickets.
- `client-restrictions`: ticket clients, Chinese cloud and Chinese weight bans, the company-wide Chinese cloud ban, and how banned models are shown and skipped.
- `ticket-lifecycle`: ticket generation (complexity, base tokens, KPI, deadline, incident, sensitive, large codebase), completion reward, failure and retry discounts, hand-writing, and overdue penalties.
- `dispatch-outcome`: success rate, token estimate and actual usage, run time, and how a dispatch settles into success or failure.
- `self-review`: the three review levels, their token and time multipliers, catch rate, and the displayed effective success rate.
- `game-modes`: serial and parallel mode selection and their rules (clock, background jobs, token multiplier, PR review, overnight runs, cancellation, single local GPU job).
- `random-events`: the eight daily events and the 55% daily trigger.
- `month-end-scoring`: score formula, grade thresholds, title selection, and the receipt.

### Modified Capabilities

(none)

## Impact

- Affected specs: work-calendar, agent-catalog, billing-methods, client-restrictions, ticket-lifecycle, dispatch-outcome, self-review, game-modes, random-events, month-end-scoring (all new).
- Affected code: tools/check.js (new assertions only), docs/DESIGN.md (a pointer to the specs). public/js/*.js is not changed.
