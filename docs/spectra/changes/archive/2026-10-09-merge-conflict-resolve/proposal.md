## Problem

In parallel mode, when a background agent finishes while other agents are still running, the run rolls a merge-conflict chance (0.1 per other running agent, halved by 補測試). A conflict currently marks the whole ticket as failed: the ticket goes back to the queue, tries +1, and the player must redo it from scratch (only the next attempt's base tokens are cut to ×0.4). The player reported this feels unreasonable: in real work a merge conflict is a smaller follow-up task, not a reason to throw the finished work away.

## Root Cause

`settle` in public/js/game.js treats a rolled conflict the same as a failed run (`ok=false`), and the failure branch only discounts the retry. There is no "resolve the conflict" outcome.

## Proposed Solution

A rolled merge conflict turns the ticket into a 解決衝突 ticket that stays in the queue, and the player chooses again how to resolve it: any vendor, model, payment method and review level, 一鍵派工, 批次派工, or writing it by hand.

- The conflict ticket replaces the original card: title 解決衝突：<original title>, complexity max(1, original − 1) with base tokens from that complexity, and it keeps the original's tech stack, client (China-model restrictions), sensitivity, incident flag, due date, KPI, and App Store review flag.
- The original ticket's KPI is earned only when the conflict ticket completes; until then it is not done. If the conflict ticket is still open at its due date, the normal overdue penalty applies.
- A conflict ticket never rolls another merge conflict, is never a trap, and cannot be evaluated (評估架構) or rescoped (找主管重新評估).
- The first run's tokens are still charged; no PR review time is spent until the conflict ticket succeeds (then it uses the conflict ticket's complexity). App Store rejection is rolled when the conflict ticket succeeds.
- The receipt's 合併衝突 N 次 counts conflicts when they are rolled.
- The retry discount for conflicts (base ×0.4) is removed. The conflict probability formula and the 補測試 halving are unchanged.

This replaces the earlier version of this change (auto-resolve by charging 15% extra tokens through the same payment method plus 0.3 h × complexity); the player rejected reusing the same payment method.

tools/sim.js measures the parallel-mode mean score before and after; the result is recorded in docs/CLAUDE.md.

### Capabilities

- Modified: `parallel-slots` — the merge-conflict outcome on completion.

## Non-Goals (optional)

Recorded in design.md.

## Success Criteria

- A parallel-mode job that would succeed and rolls a conflict leaves a 解決衝突 ticket in the queue with complexity max(1, cx − 1), the original due date and KPI; KPI and the done count are unchanged until it completes (tools/check.js asserts this).
- Completing the conflict ticket adds the original KPI and never rolls another conflict, even with other agents running (tools/check.js).
- The conflict ticket offers no 評估架構 or 找主管重新評估 action (tools/check.js).
- node tools/check.js exits 0 and node tools/sim.js runs without errors; the parallel-mode mean score change per company is recorded in docs/CLAUDE.md.

## Impact

- Affected code:
  - Modified: public/js/game.js, tools/check.js, docs/CLAUDE.md
  - New: (none)
  - Removed: (none)
- The working tree currently holds the uncommitted, completed multi-stack-company change, which also edits public/js/game.js and tools/check.js; this change must be committed separately.
