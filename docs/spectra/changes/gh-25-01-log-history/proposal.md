## Why

Messages that only appear in modals — the morning report, random events, why trust dropped — are gone once the modal closes, and the action log does not record the player's decisions in enough detail to review a run afterwards (issue #25: 「執行紀錄看不到 對話關掉就沒了」, found while reporting #24 when the day-1 trust loss could not be traced). The user wants the action log to be complete enough to review (復盤) a whole month from it; a log replay view is planned as a follow-up change `gh-25-02-log-replay` and depends on this one.

## What Changes

- The action log (執行紀錄, `S.log`) keeps every entry of the run instead of only the newest 80; it is still cleared when a new run starts.
- Dispatch is logged in both modes (serial mode currently logs only the result) with the full decision: ticket complexity, deadline and tags, agent / model (with effort in 進階 mode), billing method, review level, the success rate shown in the dispatch panel, how it was dispatched (派工台, 一鍵派工方案 X, 批次派工方案 X) and run hours.
- Result lines (success, failure, merge conflict) name the billing method.
- Architecture evaluation lines name the agent / model and billing method.
- Waiting in parallel mode (等 1 小時, 等到下一個 agent 完成) is logged with the clock range.
- Random events are logged with their title and text.
- Overdue lines carry the trust drop; the morning report states the total trust drop instead of 主管信任下降.
- The day-start line marks a new week.
- Each day ends with a summary line: change and current value of KPI, trust, wallet and company budget for that day.
- tools/check.js gains assertions for the new log lines; DESIGN.md documents the log contents.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

- `action-log`: what the in-game action log records — retention for the whole run, dispatch decisions, results, evaluation, waiting, random events, new week and the end-of-day summary.

### Modified Capabilities

- `ticket-lifecycle`: the Overdue tickets requirement — the overdue log line includes the trust drop and the next morning report states the total trust drop.

## Impact

- Affected specs: new `action-log`; modified `ticket-lifecycle`.
- Affected code: public/js/calc.js (`log` retention), public/js/actions.js (`dispatch`, `settle`, `evaluate`, `wait`, `endDay`), public/js/modals.js (day-1 baseline for the day summary at setup confirm), public/js/state.js (`fresh`, `loadGame` fallback for the day baseline), tools/check.js, docs/DESIGN.md.
- Save structure: entries are added to the existing saved `S.log` and one field (the day-start baseline) is added to `S` with a fallback on load, so `SAVE_VER` stays the same and old saves still load.
- No randomness is consumed by logging, so a fixed-seed `tools/sim.js` run is expected to print the same scores before and after.
- Refactor check (DESIGN.md, measured 2026-10-10): actions.js 341 lines / 23.3KB (10 lines over 200 chars), calc.js 97, modals.js 188 / 16.3KB (17), view.js 152 / 16.4KB (21), largest module far below the ~1,000-line signal. Conclusion: no refactor needed; view.js is not touched.
