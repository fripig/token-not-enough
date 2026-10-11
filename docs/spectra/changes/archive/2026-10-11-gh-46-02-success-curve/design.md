## Context

Issue #46, second change. `gh-46-01-model-capability-scale` (committed as 8b7d163, not archived when this was written) put capability on a ×10 scale and made `pStep(gap)` in `public/js/calc.js` interpolate between `P_STEP = [.95, .8, .5, .25, .1]` at gaps +10 … −30. This change starts from that code.

Current success path in `est()` (`public/js/calc.js`, read 2026-10-11):

1. `diff = M.cap − is.cx × CAP_SCALE + stackGap(is, M)`, `p = pStep(diff)`.
2. Large codebase: `+BIG.p` (0.08) for ctx models, `−BIG.p` for non-ctx models with `M.cap < WEAK_CAP`.
3. `p += MD_P[md]`, `+ SDD_P[sdd]` when `is.cx >= 3`, `+ AI_P × lv(S.inv.ai)`; clamp to 0.05–0.97.
4. `c = catchRate(rv, M)` = `CATCH.base + CATCH.per × M.cap / CAP_SCALE` (+ `CATCH.strict` for 嚴格審核) + `TEST_CATCH[lv(S.inv.tests)]`, capped at `CATCH.max` 0.95; 0 for 不審核.
5. Shown rate `pe = (p + (1 − p) × c) × (1 − store rejection)`.

Readers of these values: `est()` and `catchRate()` in `public/js/calc.js`; the review buttons in `dispatchPanel` (`public/js/view.js`) call `catchRate(i, M)` directly; `invHint()` in `public/js/actions.js` prints `MD_P`, `SDD_P`, `AI_P` as `+N%`; `rulesTab('dispatch')` and the investments tab in `public/js/rules.js` print `P_STEP`, `pStep`, `BIG`, `CATCH`, `MD_P`, `AI_P`; dictionary keys `hint.md`, `hint.sddP`, `hint.ai`, `sdd.desc`, `ui.sdd.desc`, `invest.md.desc`, `invest.md.lv2`, `invest.ai.desc`, `rules.big`, `rules.catchFormula`, `rules.inv2`, `rules.inv3`, `gap.up`/`gap.interp` texts in both dictionaries. Tests that call `catchRate(rv, M)`: `tools/check/self-review.test.js`, `tools/check/engineering-investments.test.js`, `tools/check/reasoning-effort.test.js`.

Measured with the formulas above for #45's setup (CLAUDE.md Lv2, SDD Lv2, agent capability Lv3, tests Lv2, 自審, complexity 5): Opus and Fable both show 99.85%.

## Goals / Non-Goals

**Goals:**

- The dispatch panel shows meaningfully below 100% for hard tickets even with every investment, and a stronger model shows a higher rate on hard tickets.
- Hit the user's acceptance numbers (see Implementation Contract) with constants that keep their current names where the meaning carries over.

**Non-Goals:**

- Grade thresholds, KPI and score targets (#45).
- Cross-model review (#48), complexity 6 tickets (gh-46-03).
- Reveal rate, trap push-through, tokens, hours, store rejection, effort step.
- Keeping the simulator byte-identical (rates change on purpose).

## Decisions

### Six anchors starting at gap +20

**Supersedes**: gh-46-01-model-capability-scale / Linear success-rate interpolation between the P_STEP anchors

`P_STEP = [.95, .88, .75, .5, .25, .1]` for gaps +20, +10, 0, −10, −20, −30. `pStep(gap)` keeps the same interpolation but starts at a named top gap `P_TOP = 2 × CAP_SCALE`: `x = (P_TOP − gap) / CAP_SCALE` clamped to 0–5. Gaps above +20 give 95%, below −30 give 10%. The interpolation mechanism from gh-46-01 is unchanged; only the anchor list and the starting gap move. Alternative: a smooth formula (logistic). Rejected: the anchor table is what the rules modal shows and what players read; a table is easier to tune by measurement.

### Investment bonuses multiply the remaining failure

After the base rate, `f = 1 − p`, then `f ×= 1 − MD_P[md]`, `f ×= 1 − SDD_P[sdd]` when complexity ≥ 3, `f ×= (1 − AI_P) ** level`; `p = clamp(1 − f, 0.05, 0.97)`. `MD_P` and `SDD_P` keep their numbers (0.06 / 0.15, 0.08 / 0.15) with the new meaning "失敗少 N%"; `AI_P` goes from 0.08 to 0.05. Example: Sonnet on a complexity-4 fe ticket (75%) with CLAUDE.md Lv2 → 1 − 0.25 × 0.85 = 78.75%. Alternative: keep adding points with smaller numbers. Rejected: additive bonuses still pile every model up at the clamp, which is the reported problem.

### Catch rate follows the same gap as the success rate

`catchRate(rv, gap)` = 0 for 不審核, otherwise `CATCH.base + CATCH.per × gap / CAP_SCALE` + `CATCH.strict` for 嚴格審核 + `TEST_CATCH[lv(S.inv.tests)]`, floored at 0 and capped at `CATCH.max`. New constants: `CATCH = {base: .2, per: .1, strict: .2, max: .95}`. The gap passed in is the same `diff` the success rate uses (capability after effort, minus complexity × 10, plus stack gap and large-codebase gap). The signature changes from `(rv, M)` to `(rv, gap)`; `est()` returns it as `c` as before. The review buttons in `dispatchPanel` read `est(is, v, m, i).c` for each level instead of calling `catchRate(i, M)`. Values: gap 0 → 自審 20% / 嚴格 40%; gap +10 → 30% / 50%; gap −20 → 0% / 20%. Alternative chosen against by the user: lower the old capability-only formula (keeps easy tickets less safe and models closer together).

### Large codebase is a ±5 capability gap

`BIG = {gap: 5, tk: .7}` (the `p` field goes away). A new exported `bigGap(is, M)` in `public/js/calc.js` returns +5 for a large-codebase ticket with a ctx model, −5 for a non-ctx model with capability below `WEAK_CAP`, else 0; `est()` adds it to `diff` next to `stackGap`. It affects success and catch rate, not tokens (the ctx token ×0.7 stays). Examples: Gemini Pro (40, ctx) on a complexity-4 large-codebase fe ticket: gap 0 + 5 = +5 → 81.5%; DeepSeek Chat (30, not ctx) on a complexity-3 large-codebase fe ticket: gap 0 − 5 = −5 → 62.5%; Opus (50) is not below 40, so its gap is unchanged.

### Starting values are the spec values; simulator only records

The starting constants above meet the acceptance numbers (computed 2026-10-11 with a scratch script that reproduces `est()`): Opus 90.7%, Fable 96.3%, gap +20 98.5%. The spec examples use these values. The simulator is run before and after (`SIM_N=100 SIM_SEED=101`, default and `SIM_INVEST=1`) and the average-score change per mode × work content is recorded in `docs/DESIGN.md` and on #45; it is not a pass/fail gate. If the user wants different constants after seeing the dispatch panel, that is a follow-up adjustment, not part of this change's acceptance.

## Implementation Contract

- **Behavior**: on the dispatch panel and in the rules modal, success rates follow the six anchors; investment bonuses show as fewer failures (zh-TW wording 失敗少 N%, en "N% fewer failures"); each review button's catch percentage depends on the selected ticket and model; large-codebase tickets move the gap by ±5. Logged dispatch success rates (`→ 派出 …｜成功率 N%`) use the new numbers automatically.
- **Interface / data shape**: `P_STEP` (6 entries), `P_TOP` and `pStep(gap)` exported from `public/js/calc.js`; `catchRate(rv, gap)`; new `bigGap(is, M)` exported from `public/js/calc.js`; `CATCH = {base:.2, per:.1, strict:.2, max:.95}`, `BIG = {gap:5, tk:.7}`, `AI_P = .05` in `public/js/data.js`. `est()` return shape unchanged. No change to `S`, `sel`, saves (`SAVE_VER` unchanged) or GA events.
- **Failure modes**: none new; old saves load unchanged (rates are computed at dispatch time, saved jobs keep their already-rolled outcome).
- **Acceptance criteria**:
  - `node tools/check.js` passes with the delta-spec examples asserted, including a new check for #45's setup: Opus (50) complexity-5 laravel ticket with CLAUDE.md Lv2 (laravel), SDD Lv2, 提升 agent 能力 Lv3, 單元測試 Lv2 and 自審 shows `pe` in 0.85–0.92; Fable (60) on the same ticket ≥ Opus + 0.05; Sonnet on a complexity-2 fe ticket (gap +20) with the same investments ≥ 0.95.
  - `rules-reference` checks pass with six gap rows and the new formula texts in both languages; localization checks pass (no missing keys, no Chinese in code).
  - Simulator before/after averages recorded in `docs/DESIGN.md`.
- **Scope boundaries**: in scope are the success curve, the bonus formula, the catch-rate formula, the large-codebase gap, every text that states them, checks and docs. Out of scope: thresholds/KPI, reveal rate, trap, tokens, hours, effort, new tickets or models.

## Risks / Trade-offs

- [Investments feel much weaker per item: CLAUDE.md Lv2 on a gap-0 ticket goes from +15 points to +3.75] → accepted by the acceptance numbers; the text says 失敗少 15% so players read it as a fraction. Recorded for #45, which re-tunes scoring.
- [Self-review becomes weak on hard tickets (gap 0 自審 20%)] → intended by the user's choice; #48 (stronger reviewer) is the planned answer.
- [Scores drop and grades get harsher until #45 lands] → measured and posted on #45; the user decided thresholds are #45's job.
- [gh-46-01 not archived when this is applied] → task 1 checks that it is archived; the delta specs here modify the post-gh-46-01 requirement text.
