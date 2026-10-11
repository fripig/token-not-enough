## Context

`monthScore()` in `public/js/modals.js` computes `score = round(KPI × 10 + trust × 4 − audits × 80)` and finds the grade with `GRADES = [4300, 3300, 2500, 1700]`, multiplying each threshold by `PAR_GRADE = 1.6` in parallel mode. `rulesTab('score')` in `public/js/rules.js` prints a table with a serial column (`GRADES`) and a parallel column (`round(g × PAR_GRADE)`). `tools/check/month-end-scoring.test.js` asserts the boundaries for both modes and the 3,120-points example; `tools/check/rules-reference.test.js` asserts `GRADES`, `PAR_GRADE` and that the table shows each value. `tools/sim.js` reads the grade from the receipt HTML, so it follows the thresholds without edits. (All read 2026-10-11.)

Measurements were taken on an export of commit 133fb75 (gh-46-02 included) in the scratchpad, with `tools/sim.js` patched only to print every game's score, `SIM_N=100`, seeds 101 and 202. Thresholds do not change any score, so one run per configuration gives every candidate threshold's grade shares.

## Goals / Non-Goals

**Goals:**

- Parallel S marks strong play; ordinary parallel play lands on A/B.
- Serial grades look like they did before gh-46-02.
- Thresholds for each mode are explicit numbers, readable in one place.

**Non-Goals:**

- Fixing the KPI ×1.3 work-content imbalance (#53), subscription/outsourcing cost (#52), slot-dependent thresholds, the score formula.

## Decisions

### Parallel S at the strong-play median

Parallel S is 10,700: the median score of `SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200` (10,700 on seed 101, 10,703 on seed 202). Alternatives measured on seed 101: 10,000 gives 68% S overall (Laravel 39%, Rust 96%); 9,700 gives 75% (Laravel 51%, Rust 98%). The user chose the median and moved the Laravel/Rails vs Rust/App/DevOps gap (14% vs 82%–85% S) to #53. The strong-play baseline uses existing simulator flags; it dispatches Codex Sol (capability 40), not the reported Opus play, so the user checks one real strong game online after release.

### Parallel A–D unchanged, serial matched to the pre-gh-46-02 shares

Parallel keeps A 5,280, B 4,000, C 2,720 (user's choice: only S moves). Serial thresholds come from quantile matching: for each old threshold, the share of pre-gh-46-02 games (commit ff72868, both seeds pooled) at or above it is matched in the post-gh-46-02 scores and rounded to 100: S 3,800, A 2,400, B 1,400, C 500. Per-seed check: at most 0.9 points (seed 101) and 2.2 points (seed 202) from the pre-gh-46-02 shares; target was 5.

### One threshold list per mode

`GRADES = {serial: [3800, 2400, 1400, 500], parallel: [10700, 5280, 4000, 2720]}` in `public/js/modals.js`; `PAR_GRADE` is removed. `monthScore()` picks `GRADES[PAR() ? 'parallel' : 'serial']`. `rulesTab('score')` builds the serial and parallel columns from the two lists. Alternative: keep `PAR_GRADE` and add a separate parallel S constant. Rejected: the parallel column is no longer a multiple of the serial one, and two different mechanisms for one table is harder to read.

## Implementation Contract

- **Behavior**: the receipt grade and the rules modal 結算 table use the new thresholds; a 3,120-point month is A in serial mode and C in parallel mode.
- **Interface / data shape**: `GRADES` exported from `public/js/modals.js` as `{serial: number[4], parallel: number[4]}` in S, A, B, C order; `PAR_GRADE` no longer exported (its only readers are `public/js/rules.js` and `tools/check/rules-reference.test.js`, both updated). `monthScore()` return shape unchanged. No save, GA or best-score key change.
- **Failure modes**: none new; best scores already stored in `localStorage` are compared by score, not grade, so they stay valid.
- **Acceptance criteria**:
  - `node tools/check.js` passes with: serial 3,800 S / 3,799 A / 2,400 A / 1,400 B / 500 C / 499 D; parallel 10,700 S / 10,699 A / 5,280 A / 4,000 B / 2,720 C / 2,719 D; 3,120 → A serial, C parallel; the rules 結算 table shows both columns from `GRADES`.
  - On the code that ships (after #51 is committed), `SIM_N=100 SIM_SEED=101` default and strong-play runs reproduce the grade shares in the proposal within 2 points; the result is recorded in `docs/DESIGN.md`.
- **Scope boundaries**: in scope are `GRADES`, `monthScore`, the rules 結算 table, checks and docs. Out of scope: KPI values, HARD_KPI, score weights, simulator strategies.

## Risks / Trade-offs

- [Wide A band in parallel (5,280–10,699): almost every ordinary game is A] → accepted by the user; a later change can split A.
- [Strong play by work content is uneven (#53)] → recorded and tracked separately.
- [#51 changes game flow in the same files before this ships] → apply waits for #51's commit and re-runs the simulator on the combined code (task 3.1).
- [Grades look harsher between gh-46-02 and this change] → both ship in one push.
