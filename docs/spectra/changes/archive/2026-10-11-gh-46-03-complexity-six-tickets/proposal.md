## Why

Issue #50, split out of #46. After `gh-46-01` (capability ×10) and `gh-46-02` (success curve starting at gap +20) every current ticket tops out at complexity 5, so Fable (capability 60) and any future stronger model have nothing to stand out on. Complexity-6 tickets give the ceiling somewhere to show. `gh-51-01-abandon-ticket` landed first so a player who cannot handle one can hand it back for trust −2.

## What Changes

User decisions (2026-10-11, picked from options):

- From day 11, a non-incident ticket that rolls complexity 5 becomes complexity 6 with probability `SIX_RATE` = 0.25 (estimated about 2 per parallel game and about 1 per serial game; measured with the simulator in this change). Incidents stay complexity 4; traps keep true complexity 4–5.
- Complexity 6 uses KPI 34 and base tokens 1,200k (`KPI[6]`, `BASE[6]`), following the existing growth.
- A complexity-6 ticket can be a research ticket with the same 30% chance as 4–5, and research splits it into complexity 3 + 4.
- Complexity 6 appears in both serial and parallel mode. Outsourced tickets follow the same rule (pay = KPI × 250 × stack factor).
- Seven stacks (laravel, rails, rust, app, sre, devops, fe) each get 3 complexity-6 titles in both languages.
- Ticket cards show six complexity pips for a complexity-6 ticket (five today).
- The rules modal ticket table gains a complexity-6 row and a note that it appears from day 11.
- The simulator gets `SIM_SIX_RATE=<0–1>`; `SIM_SIX_RATE=0` makes no extra random draw so its output equals the code before this change.

With the current curve (`gh-46-02`) Fable gets 75% on complexity 6, Opus 50%, Sonnet 25% before investments and review (computed from `pStep`, not measured).

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `ticket-lifecycle`: ticket generation gains complexity 6 from day 11, its KPI and base tokens, and six card pips.
- `research-tickets`: complexity-6 tickets can be research tickets and split into 3 + 4.
- `localization`: the remembered pool group includes complexity 6.

## Impact

- Affected specs: ticket-lifecycle, research-tickets, localization
- Affected code:
  - Modified: public/js/data.js, public/js/state.js, public/js/view.js, public/js/rules.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/sim.js, tools/check/ticket-lifecycle.test.js, tools/check/research-tickets.test.js, tools/check/localization.test.js, tools/check/rules-reference.test.js, docs/DESIGN.md
  - New: none
  - Removed: none
