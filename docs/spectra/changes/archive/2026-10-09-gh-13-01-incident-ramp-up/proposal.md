## Why

Incident tickets (due today, complexity 4, trust −8 when overdue) can arrive from day 2 at the full 12% per new ticket, plus the 大新聞爆發，流量暴增 event that adds two at once. By arithmetic (not simulated) about 43% of parallel-mode days and 32% of serial-mode days get at least one incident from intake alone, before the event. The player (issue #13) reports often being hit before they had time to prepare — no budget saved, no 監控告警 bought — and losing trust on a failed first attempt with no time left to retry. Preparation should be possible before the pressure reaches full strength.

## What Changes

- **Balance**: the chance that a newly generated daily ticket is an incident ramps up by day: min(0.12, 0.03 × (day − 1)), so day 2 → 3%, day 3 → 6%, day 4 → 9%, day 5 onward → 12%. Day 1 still starts with 4 non-incident tickets.
- **Balance**: the 大新聞爆發，流量暴增 event has no effect before day 6. When drawn on days 2–5 it shows a no-effect notice instead, the same pattern the company-wide Chinese cloud ban uses before day 8.
- Incidents missing from week 1 are not made up later; the rate stays 12% from day 5 to day 20.
- `docs/DESIGN.md` records the decision and the re-measured balance numbers from `tools/sim.js`.

## Non-Goals

- No change to incident complexity, deadline, KPI factor, trust penalty or the 監控告警 investment.
- No compensation in later weeks (the player chose not to raise later rates).
- No change to outsourced gigs (they are never incidents) or other events.
- Rejected: 0% for the whole first week (too easy) and a flat 6% for week 1 (still about a quarter of week-1 days hit).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `ticket-lifecycle`: Daily ticket intake uses the day-based incident ramp instead of a flat 12%.
- `random-events`: Event effects — the traffic spike event is a no-effect notice before day 6.

## Impact

- Affected specs: `ticket-lifecycle`, `random-events`
- Affected code: public/js/actions.js (`EVENTS`, `endDay`, new exported incident-rate helper), tools/check.js, docs/DESIGN.md
- Save data: no new fields, `SAVE_VER` unchanged.
