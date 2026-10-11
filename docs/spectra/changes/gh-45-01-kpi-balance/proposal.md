## Why

Issue #45: a player in parallel mode (6 slots, Max 20× all Opus with 自審, OpenAI seat with Astra, SDD framework, agent capability Lv3, CLAUDE.md Lv2) scored about 12,900, nearly twice the parallel S threshold (6,880), so S no longer tells strong play from ordinary play. `gh-46-02-success-curve` (#49, committed locally, not pushed) lowered success rates; measured after it on 2026-10-11 (`SIM_N=100`, seeds 101 and 202, 3,600 games each):

- Strong play (`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`), parallel: median 10,700 on both seeds, 100% S with the current thresholds.
- Default autoplayer (3 slots), parallel: median 6,260 / 6,350, S 31.8% / 33.8%.
- Default autoplayer, serial: D 67.4% / 70.3% with the current thresholds (26.4% / 26.3% before gh-46-02).

## What Changes

Decisions made with the user in `/spectra-discuss` and `/spectra-propose` on 2026-10-11:

- **Parallel S is for strong play**: parallel S becomes 10,700, the median score of the strong-play autoplayer above, so about half of strong-play games get S.
- **Parallel A–D stay**: A 5,280, B 4,000, C 2,720 (the current values).
- **Serial thresholds go down** to S 3,800, A 2,400, B 1,400, C 500, so the default autoplayer's serial grade shares are within 5 points of before gh-46-02 (measured: at most 2.2 points apart).
- **Each mode stores its own thresholds**: `GRADES` becomes one list per mode and `PAR_GRADE` (parallel = serial × 1.6) is removed.
- The rules modal 結算 tab shows both columns from the new lists.

Measured result with the new thresholds (seed 101 / 202): parallel strong play S 50.1% / 50.1%, A 49.9%; parallel default S 0% / 0%, A 76.7% / 79.1%, B 17.1% / 15.8%; serial default S 1.1% / 0.9%, A 13.7% / 12.2%, B 27.4% / 27.1%, C 30.6% / 32.1%, D 27.1% / 27.7%.

## Non-Goals

- The work-content imbalance found while measuring: with S at 10,700 strong play gets S in 14% of Laravel and Rails games but 82%–85% of Rust, App and DevOps games, because their KPI ×1.3 is pure bonus in parallel mode. The user chose to keep the median and track this in #53 (`gh-53-01-parallel-hard-stack-kpi`).
- The cost of expensive subscriptions and outsourcing income (#52, `gh-52-01-sub-outsource-cost`).
- Thresholds that depend on the slot count, score formula changes, KPI values.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `month-end-scoring`: Grade requirement gets per-mode thresholds (serial 3,800 / 2,400 / 1,400 / 500, parallel 10,700 / 5,280 / 4,000 / 2,720).
- `play-analytics`: the Game end example (serial, 3,280 points) now reports grade A instead of B; added during apply after `node tools/check.js` caught it.

## Impact

- Affected specs: month-end-scoring, play-analytics.
- Affected code: public/js/modals.js (`GRADES`, `PAR_GRADE`, `monthScore`), public/js/rules.js (grade table in the 結算 tab), tools/check/month-end-scoring.test.js, tools/check/rules-reference.test.js, tools/check/play-analytics.test.js, docs/DESIGN.md.
- Refactor check (2026-10-11, modules this change touches): modals 208 lines, rules 126 lines (measured with `wc -l`); the change edits two constants and one table row. No refactor needed.
- Release: ships together with gh-46-02 (#49); local `main` already holds gh-46-02's three commits, unpushed.
- Coordination: another session is implementing #51 in the same checkout and touches public/js/modals.js, public/js/rules.js, tools/check/rules-reference.test.js and docs/DESIGN.md; apply waits until #51 is committed.
