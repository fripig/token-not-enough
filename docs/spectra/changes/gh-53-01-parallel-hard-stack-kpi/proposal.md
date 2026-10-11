## Summary

In parallel mode, Rust, App and DevOps tickets stop getting the KPI ×1.3 (`HARD_KPI`) bonus; serial mode keeps it. The parallel S threshold is re-measured with the same rule #45 used (median of the strong-play autoplayer) and drops from 10,700 to 9,500.

## Motivation

Issue #53, found while #45 set the parallel S threshold. KPI ×1.3 (with due date +1 day) compensates for Rust, App and DevOps being slower, which matters in serial mode where time is the limit. In parallel mode strong play finishes these tickets anyway, so ×1.3 is pure bonus. Measured on 2026-10-11 on `main` 95f5188 (`SIM_N=100 SIM_SEED=101`, 300 games per row, strong play = `SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`):

- Strong play, parallel, mean vs Laravel: Rust +22.7%, App +19.1%, DevOps +21.8%, SRE +2.4%, Rails −0.2%. S games out of 300: Rust 269, DevOps 261, App 241, SRE 75, Laravel 55, Rails 45.
- Same code with `HARD_KPI` 1.0: Rust −1.7%, App −4.6%, DevOps −2.4%, SRE +2.6%, Rails −0.2%.

Decided with the user in `/spectra-discuss` on 2026-10-11: parallel ×1.0 for all three stacks (chosen over ×1.15, which left Rust and DevOps at +10% and three times Laravel's S share, and over per-stack values), and re-set the parallel S threshold to the new strong-play median in this change.

## Proposed Solution

- One helper decides the hard-stack KPI multiplier from the mode: `HARD_KPI` (1.3) in serial mode, 1 in parallel mode. Ticket creation (`makeIssue`, including complexity 6) and 找主管重新評估 (`rescope`) use it.
- Due date +1 day for Rust, App and DevOps stays in both modes.
- Outsourcing pay stays `kpi × GIG_PAY`, so parallel-mode Rust, App and DevOps gigs pay without ×1.3.
- Day-1 tickets are generated before the player confirms the mode; on setup confirm, when the mode changed, the KPI (and gig pay) of the queued tickets is recomputed without drawing random numbers.
- Parallel S threshold 10,700 → 9,500 (strong-play median measured on a copy with ×1.0: 9,525 seed 101, 9,558 seed 202). Parallel A–D and all serial thresholds stay.
- The rules modal line for the stack compensation says the KPI bonus is serial only (zh-TW and en).
- `tools/sim.js` sets the mode before generating day-1 tickets, so its first serial game no longer gets parallel-mode KPI (and the reverse).

## Alternatives Considered

- Parallel ×1.15 for all three: default autoplayer stays within the ±25% target (Rust −23.3%), but strong play keeps Rust +10.7%, DevOps +10.0%, App +7.5% and S games 150 / 145 / 115 vs Laravel 49.
- Per-stack in parallel (App, DevOps ×1.0, Rust ×1.15): strong-play Rust still +10.7% and one more exception in the rules.
- Keep 10,700: strong play would get S in about 11% of games (193 of 1,800 at seed 101).

## Impact

- Affected specs: stack-agent-effects (Harder stack compensation), month-end-scoring (Grade).
- Affected code:
  - Modified: public/js/state.js, public/js/actions.js, public/js/modals.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/sim.js, tools/check/stack-agent-effects.test.js, tools/check/month-end-scoring.test.js, tools/check/rules-reference.test.js, docs/DESIGN.md
  - New: none
  - Removed: none
- Refactor check (2026-10-11, `wc -l` on the modules this change touches): state.js 140 lines, actions.js 508, modals.js and rules.js unchanged in structure (rules.js 126); the change swaps one multiplier and one threshold. No refactor needed.
- Save games: no new fields; tickets already in a save keep the KPI they were created with. `SAVE_VER` unchanged.
