## Context

Issue #50 (see proposal). Code read on `main` at e7db9a3 (includes `gh-46-01`, `gh-46-02`, `gh-45-01`, `gh-51-01`):

- `makeIssue(inc, st)` in `public/js/state.js` draws, in this order: complexity (`r = random + day/20 × 0.38`, cut at 0.28/0.6/0.9/1.12, otherwise 5), base tokens `BASE[cx] × R(0.85, 1.15)`, deadline, stack, trap and true complexity, the pool group `g` and title index `i`, store review, sensitivity, large codebase (`cx >= 3`), client, and last the research roll (`RESEARCH_RATE > 0 && !inc && cx >= 4`). Incidents are complexity 4. `makeGig()` calls `makeIssue` and sets `pay = kpi × GIG_PAY`.
- `BASE = [0,60,180,350,550,850]`, `KPI = [0,3,6,10,16,24]` and `POOL_KEYS = ['1','2','3','4','5','trap','research','inc']` live in `public/js/data.js`; `RESEARCH_SPLIT = {4:[2,3], 5:[3,3]}` is used by `splitResearch()` in `public/js/actions.js`.
- The ticket card in `public/js/view.js` draws complexity as five pips (`[1,2,3,4,5].map(...)`).
- The rules modal 工單與陷阱 tab builds its complexity table from `BASE`/`KPI` and the research split line from `RESEARCH_SPLIT`; `rules.res1` says research tickets are complexity 4–5.
- `RESEARCH_RATE` / `setResearchRate` in `public/js/state.js` and `SIM_RESEARCH_RATE` in `tools/sim.js` are the pattern for a rate the simulator can turn off without changing the random sequence.
- With the `gh-46-02` curve (`pStep`, anchors from gap +20) a complexity-6 ticket gives Fable (60) 75%, Opus (50) 50%, Sonnet (40) 25% before investments and review (computed, not measured).

Module size for the refactor check (only modules this change touches): state 133 lines / 8.2KB (4 lines over 200 chars), data 166 / 16.5KB (10), actions 508 / 33.9KB (6; only `RESEARCH_SPLIT` is read there, no edit expected), view 210 / 21.7KB (33), rules 126 / 9.5KB (8). Conclusion: no refactor first.

## Goals / Non-Goals

**Goals:**

- From day 11 a small share of complexity-5 tickets become complexity 6, in both modes, so stronger models have tickets to differ on.
- `SIM_SIX_RATE=0` reproduces the previous fixed-seed output byte for byte.
- The simulator measures the score change and the number of complexity-6 tickets per game.

**Non-Goals:**

- Complexity-6 incidents or traps with true complexity 6.
- Changing the complexity roll for 1–5, deadlines, success curve, investment bonuses or grade thresholds.
- Hand-writing complexity 6 in one day (13.2h > 8h; complexity 5 already cannot be hand-written).
- Autoplayer strategy changes beyond what already exists (`SIM_ABANDON` stays available).

## Decisions

### Complexity 6 is a second roll on complexity-5 tickets from day 11

`SIX_RATE = 0.25` and `SIX_DAY = 11` (exported `let SIX_RATE` with `setSixRate(r)` in `public/js/state.js`, like `RESEARCH_RATE`). In `makeIssue`, after every existing draw except the research roll and before it, when `SIX_RATE > 0`, the ticket is not an incident, `cx === 5` and `S.day >= SIX_DAY`, one `Math.random() < SIX_RATE` draw turns it into complexity 6. Rolling after the other draws keeps every other field's random sequence unchanged, and skipping the draw when `SIX_RATE` is 0 makes `SIM_SIX_RATE=0` byte-identical to the code before. Rolling before the research draw lets a complexity-6 ticket become a research ticket under the existing `cx >= 4` rule. Alternative: extend the complexity cut-offs with a sixth band; rejected because it shifts every ticket's complexity and cannot be turned off for an identical comparison. The rate 0.25 is the user's pick; the per-game count (estimated about 2 parallel, 1 serial) is measured in the simulator task.

### Converting a ticket to complexity 6 reuses its existing draws

The conversion sets `cx = 6`; `base` is multiplied by `BASE[6] / BASE[5]` so it keeps the same uniform factor without a new draw, and `trueBase` follows `base` (a complexity-5 ticket is never a trap); `kpi = round(KPI[6] × stack factor)`; the pool group becomes `'6'` with index `i % pool6.length`, so no extra draw is needed for the title. Deadline (complexity ≥ 3 rule), large codebase (rolled for complexity ≥ 3), store review, sensitivity and client are kept. `BASE[6] = 1200`, `KPI[6] = 34`, `POOL_KEYS` gains `'6'` after `'5'`.

### Research splits complexity 6 into 3 + 4

`RESEARCH_SPLIT[6] = [3, 4]` (user's pick). `splitResearch()` already reads the split table and divides KPI and pay by the part complexities, so a Laravel complexity-6 research ticket with KPI 34 splits into (3, 15) and (4, 19); the complexity-4 part keeps large codebase when the original had it. The research title pools are shared by 4–6, so no new research titles.

### Six pips for complexity 6

The card draws `max(5, cx)` pips, filled up to `cx`, so 1–5 look exactly as today and 6 shows six filled pips (like Fable's six dots).

### Rules modal and simulator flag

The complexity table already lists every `BASE` entry, so it gains row 6 (1.2M tokens, KPI 34); a new rules line `rules.six` states that from day `SIX_DAY` about `SIX_RATE` of complexity-5 tickets become complexity 6, and `rules.res1` changes to complexity 4–6. `tools/sim.js` reads `SIM_SIX_RATE` (0–1, validated like `SIM_RESEARCH_RATE`) and calls `setSixRate`.

## Implementation Contract

- **Behavior**: on day 11 or later, a non-incident ticket that would be complexity 5 is complexity 6 in about 25% of cases; it shows six pips, a base token estimate around 1,200k, KPI 34 (44 for rust/app/devops), a complexity-6 title from its stack's pool in the current language, and follows all other ticket rules. Before day 11 and for incidents no ticket is complexity 6. A complexity-6 research ticket splits into complexity 3 and 4.
- **Interface / data shape**: `BASE[6] = 1200`, `KPI[6] = 34`, `POOL_KEYS` includes `'6'`, `RESEARCH_SPLIT[6] = [3,4]` in `public/js/data.js`; `SIX_RATE`, `SIX_DAY`, `setSixRate` in `public/js/state.js`; dictionary pools `pool.<stack>.6` with 3 titles for laravel, rails, rust, app, sre, devops, fe in both `public/js/i18n/zh-TW.js` and `public/js/i18n/en.js`; new key `rules.six`; `SIM_SIX_RATE` in `tools/sim.js`. No save or GA change (`cx` 6 is just a new value; `SAVE_VER` stays).
- **Failure modes**: `SIM_SIX_RATE` outside 0–1 or non-numeric exits with an error like `SIM_RESEARCH_RATE`. Saves from before this change have no complexity-6 tickets and load unchanged.
- **Acceptance criteria**: `node tools/check.js` passes with new assertions in `tools/check/ticket-lifecycle.test.js` (no complexity 6 before day 11 or on incidents; about 25% of complexity-5-band tickets on day 11+; KPI 34 / 44, base 1,200k ± 15%; pips), `tools/check/research-tickets.test.js` (complexity 6 can be research; split 3+4 with KPI 15/19), `tools/check/localization.test.js` (pool `6` same length in both languages; a complexity-6 title follows a language switch), `tools/check/rules-reference.test.js` (row 6 and `rules.six` numbers from constants). `SIM_N=100 SIM_SEED=101 SIM_SIX_RATE=0` (and with `SIM_INVEST=1`) is byte-identical to the output before this change; the default run is compared against it per mode × work content, with the number of complexity-6 tickets per game, and recorded in `docs/DESIGN.md`.
- **Scope boundaries**: in scope are generation, constants, titles, card pips, rules text, simulator flag, checks and `docs/DESIGN.md`. Out of scope: incidents, traps, success curve, grade thresholds, autoplayer strategy.

## Risks / Trade-offs

- [Scores drop because complexity-6 tickets mostly fail for the autoplayer] → measured; if any parallel-mode average drops by more than 5% against `SIM_SIX_RATE=0`, report to the user before changing the rate or values.
- [Serial mode: Fable with review needs 8.6h > 8h] → accepted (user's pick to keep both modes); the player can dispatch without review, use Opus/Sonnet, or hand the ticket back.
- [Pool index mapping `i % 3` biases titles when a stack has more than 3 complexity-5 titles] → harmless; titles are flavour only.

## Migration Plan

No data migration. Deploys with the normal push to `main`.

## Open Questions

None.
