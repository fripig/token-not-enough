## 1. Baseline

- [x] 1.1 Record the pre-change averages: with a clean working tree run `SIM_N=100 node tools/sim.js` twice and keep the per mode × company averages and grade distribution. Verification: the numbers are posted as an issue #13 comment before any code changes.

## 2. Incident ramp

- [x] 2.1 [after: 1.1] Daily ticket intake uses the day-based incident probability: export `INC_RATE = 0.12`, `INC_RAMP = 0.03` and `incRate(day)` = min(`INC_RATE`, `INC_RAMP` × (day − 1)) from `public/js/actions.js`, and `endDay` uses `incRate(S.day)` for each new ticket instead of the literal 0.12. Day 1 setup in `firstIssues` stays 4 non-incident tickets. Verification: new `tools/check.js` assertions for every row of the ticket-lifecycle incident-probability table (day 2 → 0.03, 3 → 0.06, 4 → 0.09, 5 / 12 / 20 → 0.12), and that 10,000 day-2 intake rolls give an incident share within ±0.01 of 0.03; `node tools/check.js` exits 0.
- [x] 2.2 [after: 2.1] Event effects: the 大新聞爆發，流量暴增 event adds no ticket before day 6: in `EVENTS`, when `S.day < 6` it returns ['新聞流量比平常高一點','監控曲線抖了一下，系統還撐得住。沒有其他變化。']; from day 6 it behaves as today. The existing monitoring assertions for this event in `tools/check.js` run right after `newRun`, which leaves the run on day 1, so they set `S.day = 6` before calling it. Verification: new assertions for the random-events scenarios Traffic spike too early (day 5, 3 tickets stay 3, no-effect title) and Traffic spike from day 6 (5 tickets, 2 new incidents); the updated monitoring assertions still pass; `node tools/check.js` exits 0.

## 3. Balance and documentation

- [x] 3.1 [after: 2.2] Measure the effect: run `SIM_N=100 node tools/sim.js` twice and compare each mode × company average with the 1.1 baseline. No target is set and no value is tuned (the player chose the ramp and no later compensation); results are recorded as measured. If any parallel average rises by more than 15%, report it to the player before continuing. Verification: before/after numbers posted as an issue #13 comment.
- [x] 3.2 [after: 3.1] `docs/DESIGN.md` reflects the change: a new requirement entry quoting the player's issue #13 feedback and decisions, the 工單 section and the 隨機事件 section describe the ramp and the day-6 traffic spike, the code map lists `INC_RATE`, `INC_RAMP`, `incRate`, and the 3.1 measurements are recorded. Verification: `grep -n "incRate\|第 6 天" docs/DESIGN.md` finds the new lines; content review.
