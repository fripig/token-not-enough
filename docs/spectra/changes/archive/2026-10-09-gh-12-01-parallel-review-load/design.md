## Context

Parallel mode has had two costs for running agents concurrently: a token multiplier `parMul() = 1 + 0.15 × S.jobs.length` applied inside `est` (so it reaches the dispatch panel estimate, one-click dispatch checks and the charge), and the merge-conflict chance `conflictRate() = 0.1 × S.jobs.length` (halved with CI). The multiplier came from the player's early line 「消耗的Token可能加成」, which DESIGN.md already flagged as an unconfirmed interpretation. The player now says cross-job token amplification is unreasonable and chose to replace it with a PR review switching cost.

PR review time today is `prHrs(cx, rv) = cx × 0.2 × (rv ? 0.5 : 1) × (hook ? 0.5 : 1)`, charged in `advance` when a finished job succeeds or is rejected by store review. Serial mode has neither cost. The `gh-11-01-save-game` change is in the working tree and not yet committed; this change edits some of the same files (`public/js/actions.js`, `tools/check.js`, `docs/DESIGN.md`).

## Goals / Non-Goals

**Goals:**

- A dispatch's tokens do not depend on how many other agents are running.
- Concurrency costs the player's time: PR review hours grow with the number of other agents still running when a job finishes.
- Parallel balance stays close to today's: each parallel mode × company average within ±10% of the pre-change baseline.
- All UI text that mentions the token multiplier is replaced.

**Non-Goals:**

- Changing merge-conflict odds, slot choices, the parallel grade multiplier ×1.6, or serial mode.
- Scaling grade thresholds by slot count (still an open idea in DESIGN.md).
- Shared rate limits per vendor (the alternative the player did not choose).
- Re-measuring every older balance table in DESIGN.md (stack, trap, investment, outsource, effort, seat tables); only the parallel baseline per company and the slot table are re-measured. Older tables get a note that they were measured with the token multiplier.

## Decisions

### Load factor counts other agents still running at finish time

`prHrs` gains a load factor `1 + REVIEW_LOAD × S.jobs.length`, where `S.jobs` at settle time already excludes every job that finished in the same `advance` step. This mirrors how `conflictRate` counts. Alternative: count agents running at dispatch time (stored on the job). Rejected: the switching cost happens when the human reviews, not when they dispatch, and it would need a new job field and a `SAVE_VER` bump.

### Coefficient 0.25 as a starting value, tuned by simulation

`REVIEW_LOAD = 0.25` is an estimate, not measured. With 6 slots and 5 others running, a complexity-4 no-review PR becomes 0.8h × 2.25 = 1.8h. Apply measures the parallel averages before and after with `tools/sim.js`; if any parallel mode × company average moves outside ±10% of the baseline, adjust `REVIEW_LOAD` (stepping by 0.05, range 0–0.5) and record each tried value. Alternative: keep 0.15 to mirror the old token number. Rejected: the two act on different resources, so the same number means nothing.

### Remove `parMul` and the job's `mul` field entirely

`mul` on the job is written by `makeJob` but read nowhere; `est` already folds the multiplier into `tk`. Both go. Old saves carrying `mul` still load (extra field ignored), so `SAVE_VER` stays.

## Implementation Contract

**Behavior in scope:**

- `est(...)` returns the same `tk`, `lo`, `hi` regardless of `S.jobs.length` in both modes.
- In parallel mode, PR review hours = complexity × 0.2 × (0.5 if any self-review) × (0.5 if pre-commit hook) × (1 + `REVIEW_LOAD` × other agents still running). Logged as ↳ 審 PR 花了 Xh as before. Serial mode still has no PR review.
- Dispatch panel: the 預估 tokens label has no ×multiplier. While agents are running in parallel mode, the hint states: N agents are running; when this one finishes, PR review time is × the current load (1 + `REVIEW_LOAD` × N, with N = agents running now, as a preview), each additional concurrent agent adds 10% conflict chance, and conflicts leave a 解決衝突 ticket.
- Opening setup: the 平行模式 button says running more agents makes each PR review longer and conflicts likelier (no mention of tokens). Each slot button shows 審 PR 最多 ×(1 + `REVIEW_LOAD` × (n − 1)) and 衝突最多 X%.
- `REVIEW_LOAD` is exported from `public/js/actions.js` next to `prHrs`.

**Acceptance:**

- `node tools/check.js` exits 0 with assertions that: token estimate with 0 and with 2 running agents is equal; PR review with 0, 1 and 5 others running matches the formula; hook and self-review still stack.
- `node tools/sim.js` before/after numbers recorded in DESIGN.md; every parallel mode × company average within ±10% of baseline, or the deviation and the user's decision recorded.
- `grep -rn parMul public tools` returns nothing.

**Out of scope:** merge-conflict formula, serial mode, grading, other balance tables, the save-game change itself.

## Risks / Trade-offs

- [Parallel gets stronger because token cost drops] → the review load is the counterweight; tune `REVIEW_LOAD` against the baseline.
- [Review load also pushes clock time, which can push jobs to overnight and cause due-date cancellations] → this is intended pressure; sim catches large swings.
- [Uncommitted save-game edits in the same files] → apply starts after `gh-11-01-save-game` is committed, so this change's diff stays separate.
- [More slots may now have a real cost and the slot table shape may change] → re-measure the slot table and record it; no target is set for slot count.

## Migration Plan

Ship with the next push to `main`. Rollback is reverting the commit. Saves need no migration.

## Open Questions

- Final `REVIEW_LOAD` value: decided by the simulation during apply.
