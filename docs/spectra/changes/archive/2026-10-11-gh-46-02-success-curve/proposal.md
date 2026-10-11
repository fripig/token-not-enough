## Why

Issue #46 (and the #45 report): with every investment and 自審, the dispatch panel shows almost 100% for every ticket, and a stronger model cannot show a difference. Two reasons, measured with the current formulas on 2026-10-11:

- The success curve tops out at 95% one step above the ticket (gap +10). Fable (60) is already there for every complexity-5 ticket, so a future 65 or 70 model gets the same rate.
- Investment bonuses add flat points (CLAUDE.md Lv2 +15%, SDD Lv2 +15%, agent capability 3 × 8%), so Opus on complexity 5 reaches the 97% clamp; the self-review catch rate (0.45 + 0.08 × capability ÷ 10, + tests, cap 0.95) then rescues 95% of the remaining failures. #45's configuration shows 99.85% for both Opus and Fable on a complexity-5 ticket.

This change depends on `gh-46-01-model-capability-scale` (capability ×10, interpolated curve), which is committed but not archived yet; the delta specs here are written against the requirement text after that archive.

## What Changes

Decisions made with the user in `/spectra-discuss` on 2026-10-11:

- **Success curve shifted right**: anchors gap +20 → 95%, +10 → 88%, 0 → 75%, −10 → 50%, −20 → 25%, −30 → 10%, interpolated in between (`P_STEP` gets six entries, `pStep()` starts at +20).
- **Investment bonuses reduce failure instead of adding points**: CLAUDE.md, SDD (complexity ≥ 3) and 提升 agent 能力 each multiply the remaining failure chance: p = 1 − (1 − base) × (1 − MD) × (1 − SDD) × (1 − AI)^level. CLAUDE.md keeps 0.06 / 0.15, SDD keeps 0.08 / 0.15, agent capability goes from 0.08 to 0.05 per level. The 5%–97% clamp stays (user's choice).
- **Self-review catch rate follows the capability gap**: catch = 0.2 + 0.1 × gap ÷ 10, + 0.2 for 嚴格審核, + tests bonus (0.1 / 0.2), floored at 0 and capped at 0.95. A model that cannot do a ticket also cannot catch its own mistakes there.
- **Large codebase becomes a capability gap**: a ctx model gets gap +5, a non-ctx model with capability below 40 gets gap −5 (same mechanism as the Rust borrow checker), so it also moves the catch rate. The flat ±8% goes away.
- Rules modal, dispatch panel hints, investment descriptions and dictionary texts describe the new formulas.

Acceptance (the user's choice: judge by the success rate shown on the dispatch panel), with CLAUDE.md Lv2 for the ticket's stack, SDD Lv2, 提升 agent 能力 Lv3, 單元測試 Lv2 and 自審:

- Opus (50) on a complexity-5 ticket shows 85%–92% (starting values give 90.7%).
- Fable (60) on the same ticket shows at least 5 points more than Opus (starting values give 96.3%).
- A gap +20 ticket still shows at least 95% (starting values give 98.5%).

## Non-Goals

- Re-tuning grade thresholds or KPI: the score change is measured and recorded, then handed to #45 (`gh-45-01-kpi-balance`).
- Using a stronger model to review (#48, `gh-48-01-cross-model-review`).
- Complexity 6 tickets (`gh-46-03-complexity-six-tickets`).
- Changing the reveal rate, trap push-through, token formula, run time, store rejection or reasoning effort step.
- Removing or raising the 97% clamp (the user chose to keep it).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dispatch-outcome`: Success rate requirement gets the new anchors, failure-reduction bonuses and the large-codebase gap.
- `self-review`: Review levels gets the gap-based catch rate; Effective success rate example changes.
- `engineering-investments`: CLAUDE.md, Tests, SDD and agent capability effects are expressed as failure reduction / new catch rate.
- `reasoning-effort`: the Sonnet example rates move to the new curve.
- `stack-agent-effects`: the Rust and convention examples move to the new curve.
- `rules-reference`: the rules tabs describe failure reduction, the gap-based catch rate and the large-codebase gap; the 提升 agent 能力 per-level value is 0.05.

## Impact

- Affected specs: dispatch-outcome, self-review, engineering-investments, reasoning-effort, stack-agent-effects, rules-reference.
- Affected code: public/js/calc.js (`P_STEP`, `pStep`, `est`, `catchRate`), public/js/data.js (`CATCH`, `BIG`, `AI_P`), public/js/view.js (review buttons' catch rate), public/js/actions.js (`invHint`), public/js/rules.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check/*.test.js for the specs above plus rules-reference, docs/DESIGN.md.
- Refactor check (2026-10-11, modules this change touches): calc 112 lines / 7.1KB (2 lines over 200 chars), data 164 / 16.0KB (9), actions 495 / 32.9KB (6), view 200 / 20.8KB (32), rules 125 / 9.2KB (7). No refactor needed first.
- Simulator output changes on purpose (success rates change); before/after averages are recorded, not targeted.
