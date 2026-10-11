## Problem

Reported in #44 from a full parallel run (6 slots, Laravel＋DevOps, outsourcing on):

1. When day 20 ended, 5 company tickets and 4 outsourced tickets were counted overdue (KPI lost, trust −20, NT$2,100 in penalties). Several of them arrived on days 18–20 and would normally have been due on day 21 or later; the player had no way to finish them in time and was punished anyway.
2. The month-end receipt showed 你自己掏的錢 as about −NT$51,864. The player had spent NT$16,386 of their own money (subscriptions, personal API, conference fees, penalties) and earned about NT$68,000 from outsourcing, so the line read as if the wallet money had gone somewhere else.

## Root Cause

1. `makeIssue` in `public/js/state.js` caps every deadline with `Math.min(20, …)`: normal tickets (today + 1–5 days), the hard-stack +1 day, and incidents with 監控告警 (tomorrow). Re-scoping a revealed trap (`rescope` in `public/js/actions.js`) also caps `due + 2` at 20. `endDay` treats every ticket with `due <= S.day` as overdue, so on day 20 every capped ticket is overdue.
2. `monthScore()` in `public/js/modals.js` computes `self` as subscription fees + personal API + outsourcing penalties + conference fees − outsourcing income, and the receipt labels that result 你自己掏的錢. With enough outsourcing income it goes negative.

## Proposed Solution

User decisions (2026-10-11, picked from options):

- Deadlines are no longer capped at day 20. A ticket created late in the month keeps its natural deadline (for example day 22) and the card shows it as usual. Re-scoping adds 2 days without a cap. Ending day 20 counts only tickets with a deadline on or before day 20 as overdue; background agents still running on later-due tickets are stopped like a player cancel and charged for the fraction completed (user decision, 2026-10-11, from /spectra-discuss) (company tickets lose KPI and trust, outsourced tickets pay the penalty); tickets due after day 20 are left unfinished without penalty and are not counted as overdue. Research split tickets keep the original deadline as before.
- The receipt splits money into two lines: 你自己掏的錢 is spending only (subscription fees + personal API + outsourcing penalties + conference fees, never negative), and a new line 個人淨收支 = outsourcing income − that spending, signed (`+NT$51,864` or `-NT$2,000`), shown when outsourcing was on. The 自費養 AI 的勇者 title checks spending only. The score formula is unchanged (money is not scored since #26).

## Non-Goals

- Rebalancing KPI or grade thresholds (tracked separately in #45).
- Changing other day-20 limits: hardware delivery (arrival after day 20 refused) and the conference registration window stay as they are.
- Showing a separate list of unfinished-but-not-due tickets on the receipt.

## Success Criteria

- In parallel mode, an agent dispatched on day 20 for a ticket due on day 22 that is still running when day 20 ends is charged for the fraction it completed (at least 5%), logs `⏹ 月底收工`, sends `job_result` with `outcome` `cancelled`, and its company API cost counts toward that day's NT$1,500 limit; the ticket is not overdue.

- A ticket created on day 19 with a 3-day deadline has `due` 22; ending day 20 with it in the queue changes neither KPI nor trust and does not add to the overdue count.
- A ticket due on day 20 (including an incident created on day 20 without 監控告警) is still overdue when day 20 ends.
- With subscription fees NT$8,125, personal API NT$61, conference fees NT$6,100, penalties NT$2,100 and outsourcing income NT$68,000, the receipt shows 你自己掏的錢 NT$16,386 and 個人淨收支 +NT$51,614, and the title is not chosen by a negative spend.
- `node tools/check.js` passes; the fixed-seed simulator output change is measured and recorded.

## Impact

- Affected specs: `ticket-lifecycle` (deadline cap, overdue on day 20), `stack-agent-effects` (hard-stack deadline cap), `engineering-investments` (監控告警 incident deadline cap), `trap-tickets` (re-scope cap), `outsource-gigs` (personal spend definition, receipt lines), `month-end-scoring` (receipt lines, title rule), `game-modes` (agents still running when day 20 ends are stopped and charged), `play-analytics` (`cancelled` also covers the month-end stop).
- Refactor check (modules this change touches, measured 2026-10-11): `public/js/state.js` 133 lines / 4 over 200 chars; `public/js/actions.js` 493 / 6; `public/js/modals.js` 206 / 11. Conclusion: no refactor needed.
- Affected code:
  - Modified: public/js/state.js, public/js/actions.js, public/js/modals.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check/ticket-lifecycle.test.js, tools/check/stack-agent-effects.test.js, tools/check/engineering-investments.test.js, tools/check/trap-tickets.test.js, tools/check/outsource-gigs.test.js, tools/check/month-end-scoring.test.js, tools/check/game-modes.test.js, tools/check/play-analytics.test.js, docs/DESIGN.md
