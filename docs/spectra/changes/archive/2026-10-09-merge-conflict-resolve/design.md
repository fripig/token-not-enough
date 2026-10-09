## Context

Parallel mode settles each finished background job in `settle`, called from `advance` with `{conflict: 0.1 × other running jobs × (補測試 ? 0.5 : 1)}`. Today a rolled conflict sets the result to failure, increments `S.st.conflicts`, and multiplies the ticket's `base` by 0.4 for the retry. `advance` adds PR review time (`cx × 0.2`, halved with review) only when the result is ok or App Store rejected. The conflict roll happens before the App Store rejection roll. Tickets are plain objects created by `makeIssue` (fields include `title`, `cx`, `base`, `inc`, `stack`, `trap`, `revealed`, `evaluated`, `rescoped`, `store`, `sens`, `big`, `client`, `due`, `kpi`, `tries`); `canEvaluate` gates 評估架構 and `rescope` requires `revealed`. `endDay` applies overdue penalties to every queued ticket whose `due` has passed.

## Goals / Non-Goals

**Goals:**

- A merge conflict becomes a smaller follow-up ticket the player resolves with a fresh choice of how, instead of a full failure.
- Keep the existing conflict probability and the 補測試 halving so slot-count and investment balance stays comparable.

**Non-Goals:**

- Auto-resolving through the original job's payment method (rejected by the player; see the superseding decision below).
- Splitting conflicts into minor and severe (rejected by the player).
- Chained conflicts on conflict tickets (rejected by the player).
- Changing conflict probability, slot count, or grade thresholds.
- Serial mode (it has no concurrent agents and no conflicts).

## Decisions

### Conflict turns the ticket into a 解決衝突 ticket in place

**Supersedes**: merge-conflict-resolve / Conflict is rolled before charging

When the conflict roll hits on a job that would otherwise succeed, `settle` mutates the same ticket object instead of creating a new one: `merge = true`, `title = 解決衝突：<original title>`, `cx = max(1, cx − 1)`, `base = BASE[new cx] × R(0.85, 1.15)`, `trap = false`, `revealed = false`, `evaluated = false`, `big = big && new cx ≥ 3`, `tries = 0`. `id`, `stack`, `client`, `sens`, `inc`, `due`, `kpi`, `store` stay. Mutating in place keeps the queue order, the player's selection (`sel.issue`), and the overdue handling in `endDay` without new bookkeeping. If the original was a revealed trap, the new complexity is computed from the true complexity. The job's tokens are charged as usual; the log shows a warn line ⚡ <original title>｜<agent / model>｜和其他 agent 的改動合併衝突，留下「解決衝突」工單（複雜度 N）｜燒掉 <tokens>｜<spend>｜<hours>h (same fields as the ✓ / ✗ lines). `S.st.conflicts` increments; `S.st.done` and KPI do not change. `settle` returns ok false, so `advance` adds no PR review time.

### Conflict tickets never conflict again

`settle` skips the conflict roll when `is.merge` is true, regardless of the probability passed by `advance`.

### Resolve-time rules come from the existing ticket rules

A conflict ticket is dispatched, quick-dispatched, batch-dispatched (it qualifies when its complexity is ≤ 2), or written by hand exactly like any ticket, using its new complexity. On success the normal path removes it, adds the inherited KPI, increments done, adds PR review time from its complexity, and rolls App Store rejection if `store` is set. Failure follows the normal retry path.

### Conflict tickets cannot be evaluated or rescoped

`canEvaluate` returns false for `merge` tickets; `rescope` already requires `revealed`, which is false on a conflict ticket. The card shows a 合併衝突 chip so the player can tell it apart.

### Removed: auto-resolve through the same payment method

**Supersedes**: merge-conflict-resolve / Resolve time is added in advance, not discounted by review

The earlier design decisions in this change (rebase tokens ×1.15 through the same charge, `CONFLICT_HRS` resolve time, App Store roll after a resolved conflict, initial-numbers-by-sim for those constants) are dropped; `CONFLICT_TK` and `CONFLICT_HRS` are not introduced. The conflict retry discount (base ×0.4) is removed because conflicts no longer reach the failure branch.

### Balance is confirmed by sim, not tuned in advance

tools/sim.js (parallel mode, all four companies, default slots) measures the mean score before and after. If any company's parallel mean moves by more than ±15% versus before, implementation stops and reports before tuning. The result is recorded in docs/CLAUDE.md.

## Implementation Contract

- Behavior: in parallel mode, a would-succeed job that rolls a conflict leaves the same card in the queue as 解決衝突：<title> with complexity max(1, cx − 1), a 合併衝突 chip, the original due date, KPI, client restrictions and flags. The player resolves it with any dispatch method or by hand; completing it earns the original KPI. A conflict ticket never conflicts again and has no 評估架構 / 找主管重新評估 action. Receipt 合併衝突 N 次 counts rolled conflicts.
- Interface / data shape: ticket field `merge: boolean` (false from `makeIssue`); `settle(j, {conflict})` keeps its signature and return shape `{ok, hrs, rejected}`; `canEvaluate` excludes `merge`.
- Failure modes: a conflict ticket that is still open on its due date is penalized as overdue (half KPI, trust −4, incident −8). Jobs cancelled by `cancelJobs` pass no conflict option and are unaffected. A self-review catch that turns a failure into success can still roll a conflict.
- UI text: the dispatch-panel parallel hint says a conflict leaves a 解決衝突 ticket instead of implying a full redo; the setup-modal parallel description stays as is. docs/CLAUDE.md: parallel-mode conflict rule, the self-review 審核救不了 list (drop 合併衝突), and a dated before/after balance note.
- Acceptance: node tools/check.js asserts the success criteria in proposal.md with the conflict roll forced; the existing 補測試 0.2 → 0.1 probability assertion still passes. node tools/sim.js completes and its parallel means are recorded.
- Scope: in — `makeIssue` default field, `settle`, `canEvaluate`, the ticket card chip, the parallel hint, tools/check.js, docs/CLAUDE.md. Out — multi-stack-company edits in the same files, tools/sim.js logic (only run it), serial mode.

## Risks / Trade-offs

- [Conflict tickets can pile up late in the day and go overdue] → this is the intended pressure; sim measures the net effect.
- [Mutating the ticket in place loses the original title/complexity] → the title keeps the original text and the log records the conflict; nothing else reads the old values.
- [Uncommitted multi-stack-company edits in public/js/game.js] → commit that change first or stage only this change's hunks with /spectra-commit.
