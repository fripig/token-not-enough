## Why

The five engineering investments cover token cost, success rate, self-review, evaluation and batching, but several recurring pains have no investment answer: PR review time in parallel mode, security audits on sensitive tickets, App Store rejections, and same-day incident deadlines. 補測試 also bundles two unrelated effects (catch rate and merge conflicts), so a serial-mode player pays for a conflict reduction they never use. The player asked to refine the existing items and add more (issue #8).

## What Changes

- **BREAKING (save-less, per-run only)**: 補測試 is split into two investments. 單元測試 keeps the self-review catch rate bonus; CI 流水線 keeps the merge-conflict halving. The old 補測試 item is removed.
- New investment pre-commit／lint hook: halves the PR review time charged when an agent finishes in parallel mode.
- New investment secret scanning／脫敏: halves the security audit chance when a sensitive ticket is dispatched or evaluated with personal subscription or personal API.
- New investment 上架自動化（fastlane）: lowers the App Store rejection chance for store-review tickets from 20% to 10%, including the success rate shown in the dispatch panel.
- New investment 監控告警: incident tickets generated after the purchase are due one day later (capped at day 20), and an overdue incident costs 4 trust instead of 8 while 監控告警 is owned; the traffic-spike event text reflects the new deadline.
- The investment panel, dispatch-panel hint line, quick-dispatch audit warning and month-end count cover the new items.
- `tools/sim.js` SIM_INVEST auto-player buys the new list; `tools/check.js` asserts each effect; `docs/DESIGN.md` updates the investment table and measured balance.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `engineering-investments`: investment list and costs change (補測試 split into 單元測試 and CI 流水線; four new investments), the tests-effect requirement splits, and new effect requirements are added for hook, secret scanning, fastlane and monitoring (incident deadline and overdue trust penalty).

## Impact

- Affected specs: engineering-investments
- Affected code: public/js/data.js (INVEST table and constants), public/js/state.js (S.inv shape, incident deadline in makeIssue), public/js/calc.js (catchRate, STORE_REJECT usage in est and stackHint), public/js/actions.js (conflictRate, PR review time in advance, auditOdds, invCount, invHint, traffic-spike event text, overdue trust penalty in endDay), public/js/view.js (invPanel rows, quick-dispatch audit warning), tools/sim.js, tools/check.js, docs/DESIGN.md
