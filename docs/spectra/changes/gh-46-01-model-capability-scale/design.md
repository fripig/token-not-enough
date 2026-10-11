## Context

Issue #46 (see proposal). Capability lives in `VENDORS` in `public/js/data.js` as `cap` 2–6. It is read in these places (checked 2026-10-11 with a search for `.cap` across `public/js` and `tools`):

- `est()` in `public/js/calc.js`: gap = `M.cap − is.cx + stackGap()`, looked up in `P_STEP = [.95, .8, .5, .25, .1]` by index `1 − gap` clamped to 0–4; the large-codebase penalty for non-ctx models with `M.cap < 4`; the token discount when the base model's `M0.cap − is.cx >= 1`.
- `stackGap()` in `public/js/calc.js`: +1 for conventional Laravel/Rails tickets, −1 for Rust with `M.cap < 4`.
- `catchRate()` in `public/js/calc.js`: `CATCH.base + CATCH.per × M.cap`.
- `revealRate()` in `public/js/actions.js`: `REVEAL.base + REVEAL.per × M.cap`.
- `makeJob()` in `public/js/actions.js`: an unrevealed trap stops when `e.M.cap < is.trueCx`.
- `EFFORT` and `effModel()` in `public/js/data.js`: `cap` −1/0/+1, floor `Math.max(1, …)`.
- The model buttons in `dispatchPanel` in `public/js/view.js`: `'●'.repeat(M.cap)` + `'○'.repeat(5 − M.cap)`.
- The rules modal in `public/js/rules.js`: the gap table rows `+1 or more`, `0`, `−1`, `−2`, `−3 or less`; the effort table prints `EFFORT[].cap`.
- `tools/sim.js`: the effort autoplayer picks 高 when `cap − cx <= −1` and 低 when `>= 2`.

Jobs in a save store the whole effective model object `M` (including `cap`), but after load only `j.M.name` is read (background agent row in `public/js/view.js`); capability is only used at dispatch time. GA events do not send capability.

## Goals / Non-Goals

**Goals:**

- Capability values are ×10 integers so a future model can be 45 or 55 and get a success rate between today's tiers.
- Every current model, ticket, effort level and investment produces exactly the same numbers as before; the fixed-seed simulator output is byte-identical.
- The dispatch panel shows the number next to the dots so in-between values are visible.

**Non-Goals:**

- Changing any success rate, catch rate or reveal rate for existing models (that is `gh-46-02-success-curve`).
- Complexity 6 tickets (`gh-46-03-complexity-six-tickets`).
- A finer reasoning-effort step than ±10.
- Adding any new model.
- Rewording the Purpose paragraph of `docs/spectra/specs/local-hardware/spec.md` (it says capability-4 local models; delta specs cannot change a Purpose).

## Decisions

### Store capability ×10 in VENDORS and compare against complexity × CAP_SCALE

A new constant `CAP_SCALE = 10` in `public/js/data.js`. Model `cap` values in `VENDORS` become 20–60. Wherever capability meets complexity, complexity is multiplied by `CAP_SCALE` (gap, trap push-through, token discount). Ticket complexity, `BASE`, `KPI`, saves and the ticket pool are untouched. Alternative: keep `cap` small and allow decimals (4.5): rejected by the user in favour of integers, and decimals invite float drift in the byte-identical check.

### Linear success-rate interpolation between the P_STEP anchors

`P_STEP` stays as the anchor list; a new exported function `pStep(gap)` in `public/js/calc.js` maps a gap on the ×10 scale to a rate: position `x = (CAP_SCALE − gap) / CAP_SCALE` clamped to 0–4, `i = floor(x)`, result `P_STEP[i] + (P_STEP[i+1] − P_STEP[i]) × (x − i)` (at `i = 4` it is `P_STEP[4]`). At every multiple of 10 the fraction is exactly 0, so the result is exactly the old array entry and nothing changes for current models. `est()` calls `pStep(gap)` instead of indexing `P_STEP`. Example: gap +5 → 87.5%, gap −15 → 37.5%, gap +30 → 95%, gap −40 → 10%.

### Threshold rules stay hard cut-offs on the new scale

The user chose not to interpolate these: `stackGap()` returns `+CAP_SCALE` / `−CAP_SCALE`; Rust and the large-codebase penalty test `M.cap < 4 × CAP_SCALE`; the trap check is `e.M.cap < is.trueCx × CAP_SCALE`; the token discount is `M0.cap − is.cx × CAP_SCALE >= CAP_SCALE`. A 45 model therefore avoids the borrow-checker penalty but still stops on a true-complexity-5 trap. The named threshold 4 becomes a constant `WEAK_CAP = 40` used by both the Rust and the large-codebase checks.

### Catch and reveal rates divide by CAP_SCALE instead of changing their coefficients

`catchRate()` uses `CATCH.per × M.cap / CAP_SCALE` and `revealRate()` uses `REVEAL.per × M.cap / CAP_SCALE`. `40 / 10` is exactly 4 in floating point, so results are bit-identical; rewriting the coefficients to 0.008 and 0.015 would not be (0.008 is not exact in binary). `CATCH.per` and `REVEAL.per` keep 0.08 and 0.15, and the rules modal text says 能力 ÷ 10.

### Reasoning effort stays one full step of 10

`EFFORT[].cap` becomes −10 / 0 / +10 and `effModel()` floors at `CAP_SCALE`. The UI text built from `EFFORT[].cap` (dispatch panel 能力 +10, rules effort table) follows automatically; the setup text that hard-codes +1 / −1 (`ui.setup.advOnSub`) is edited.

### Capability bar with half dots and the number

A new exported function `capBar(cap)` in `public/js/view.js` returns `●` × floor(cap / 10), `◐` when cap mod 10 ≥ 5, `○` up to five symbols in total (none when already five or more), then a space and the number: 30 → `●●●○○ 30`, 45 → `●●●●◐ 45`, 60 → `●●●●●● 60`. The model button renders `能力 <capBar>`. The user picked this over number-only or dots-only.

### Simulator thresholds scale with capability

The `SIM_EFFORT` autoplayer compares `cap − cx × CAP_SCALE` with `−CAP_SCALE` and `2 × CAP_SCALE`, so its choices and output stay identical.

## Implementation Contract

- **Behavior**: for every current model the success rate, token estimate, hours, catch rate, reveal rate, trap push-through and effort effect are unchanged. The dispatch panel model buttons read, for example, `能力 ●●●●○ 40` (zh-TW) and the English equivalent with the same dots and number. The rules modal gap table reads +10 or more / 0 / −10 / −20 / −30 or less with a line saying values in between are interpolated (example +5 → 87.5%); the catch and reveal formulas read `× 能力 ÷ 10`; Rust, large-codebase, hardware and setup texts use 40 / 50 / +10 / −10.
- **Interface / data shape**: `CAP_SCALE = 10` and `WEAK_CAP = 40` exported from `public/js/data.js`; `VENDORS[].models[].cap` in 20–60; `EFFORT[].cap` in −10/0/10; `pStep(gap)` exported from `public/js/calc.js`; `capBar(cap)` exported from `public/js/view.js`. `P_STEP` stays exported (the rules modal and `tools/check/rules-reference.test.js` read it). No change to `S`, `sel`, tickets, saves (`SAVE_VER` unchanged) or GA.
- **Failure modes**: old saves load as before; a saved running job's stored `M.cap` is on the old scale but is never read after load.
- **Acceptance criteria**:
  - `node tools/check.js` passes, with existing capability assertions moved to the new scale (model table, dot HTML, effort floor 10 / Opus 高 60 / Fable 高 70, `EFFORT` caps −10/0/10, reveal-rate and Rust table labels) and new assertions: `pStep(5)` = 0.875, `pStep(−15)` = 0.375, `pStep(30)` = 0.95, `pStep(−40)` = 0.1; `catchRate(1, {cap:45})` = 0.81; `revealRate({cap:45})` = 1.025 capped to 0.95 and `revealRate({cap:25})` = 0.725; `capBar(45)` = `●●●●◐ 45`, `capBar(60)` = `●●●●●● 60`, `capBar(20)` = `●●○○○ 20`.
  - The fixed-seed simulator output is byte-identical before and after for `SIM_N=100 SIM_SEED=101` with: no flags, `SIM_INVEST=1`, `SIM_EFFORT=1`, `SIM_HW=1`, `SIM_INVEST=1 SIM_CONF=1` (compared with `diff`).
- **Scope boundaries**: in scope are capability values, every capability comparison and formula listed in Context, the effort step, the capability bar, rules modal and dictionary texts that state capability numbers, the effort autoplayer in `tools/sim.js`, checks, and `docs/DESIGN.md`. Out of scope: success-curve shape, bonus formulas, complexity 6, new models, finer effort.

## Risks / Trade-offs

- [A capability comparison is missed and keeps the old scale] → every `.cap` read in `public/js` and `tools` is listed in Context; the byte-identical simulator diff over five flag sets plus the full check run catch a missed one (a missed comparison would change success rates for every model).
- [Float drift breaks the byte-identical diff] → interpolation adds an exact 0 at anchor points and the catch/reveal formulas divide by 10 rather than using non-exact coefficients.
- [Assertion names change] → capability labels inside assertion names move to the new scale on purpose; the count of assertions only grows by the new ones.
- [local-hardware Purpose still says capability-4] → accepted; the requirements no longer state numbers there and the Purpose is a summary.

## Migration Plan

No data migration. Deploys with the normal push to `main`; rollback is a revert.

## Open Questions

None.
