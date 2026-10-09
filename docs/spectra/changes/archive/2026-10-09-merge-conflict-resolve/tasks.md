## 1. Baseline

- [x] 1.1 Record the parallel-mode mean score per company before any code change, by running SIM_N=100 node tools/sim.js on the current tree and saving the four parallel means (Laravel, Rails, Rust, App) with the date in the change folder as baseline notes; verification: the four numbers are written down.

## 2. Conflict ticket

- [x] 2.1 [after: 1.1] Implement requirement "Merge conflicts leave a conflict ticket" in public/js/game.js: `makeIssue` sets `merge: false`; in `settle`, a conflict rolled on a would-succeed job (including a self-review catch) and not on a `merge` ticket turns the same ticket object into the conflict ticket as described in design decision "Conflict turns the ticket into a 解決衝突 ticket in place" (title, cx = max(1, cx − 1), base, trap/revealed/big/tries reset, other fields kept), charges the job's tokens as usual, logs the ⚡ warn line, increments `S.st.conflicts`, returns ok false, and the conflict retry discount (base ×0.4) is removed; verification: tools/check.js assertions from 3.1.
- [x] 2.2 [after: 2.1] Make `canEvaluate` return false for `merge` tickets (decision "Conflict tickets cannot be evaluated or rescoped"), show a 合併衝突 chip on the ticket card for `merge` tickets, and change the dispatch-panel parallel hint to say a conflict leaves a 解決衝突 ticket; verification: tools/check.js renders a selected conflict ticket and finds the chip and the hint, and no 評估架構 or 找主管重新評估 button.

## 3. Checks and docs

- [x] 3.1 [after: 2.2] Add tools/check.js assertions with the conflict roll forced: (a) a successful Laravel cx 3 job with 2 other jobs running leaves 解決衝突：<title> in the queue with cx 2, the same id, due and KPI, KPI and `S.st.done` unchanged, `S.st.conflicts` 1, and no clock advance for PR review; (b) a cx 1 original gives a cx 1 conflict ticket; (c) the conflict ticket succeeding with 3 other jobs running and conflict probability 1 completes and adds the original KPI; (d) a conflict ticket still queued at its due day is penalized by `endDay` as overdue; the existing 補測試 0.2 → 0.1 probability assertion still passes; verification: node tools/check.js exits 0.
- [x] 3.2 [after: 3.1] Confirm design decision "Balance is confirmed by sim, not tuned in advance": run SIM_N=100 node tools/sim.js and compare the parallel means with 1.1; if any company moves by more than ±15%, stop and report before tuning; otherwise update docs/CLAUDE.md (the parallel-mode conflict rule, the self-review 審核救不了 list without 合併衝突, the `merge` ticket field, and a dated before/after balance note); verification: content review of docs/CLAUDE.md against the measured numbers.

## Change note

Replaced pending tasks from the earlier version of this change (none were started): the old 2.1 (rebase tokens through the same charge), 2.2 (`CONFLICT_HRS` resolve time in `advance`), 2.3 (hint about extra cost) and 3.1 (assertions for the ×1.15 charge and quota shortfall) are cancelled by decision "Removed: auto-resolve through the same payment method" and replaced by 2.1, 2.2 and 3.1 above.
