## Why

Issue #51, split out of #50 (`gh-46-03-complexity-six-tickets`). Today a ticket the player cannot finish has only two outcomes: spend tokens and money on an attempt that will probably fail, or leave it to go overdue (KPI −half of the ticket's KPI, trust −4). The user asked (2026-10-11): 「是否要加入放棄工單功能 不然做跟不做都可能降低信任度」. Complexity-6 tickets (#50) will add more tickets that are known to be out of reach, so the player needs a third choice before #50 lands.

## What Changes

User decisions (2026-10-11, picked from options):

- A new action 找主管退單 removes a ticket from the queue. For a company ticket it costs trust −2 (not below 0) and no KPI, versus trust −4 and half the KPI when it goes overdue.
- Incident tickets cannot be abandoned.
- An outsourced ticket can be abandoned by paying the same 30% penalty as when it goes overdue, with no trust or KPI change (same as an overdue gig), so the player can clear it early.
- Only tickets with no agent running can be abandoned; to abandon a running ticket the player first uses the existing 中止 (cancel) action.
- The button sits in the dispatch panel next to the other ticket actions and uses the same two-step confirmation as 中止: 找主管退單（信任 −2） → 確定退單？; clicking anywhere else disarms it.
- The action log gets one line per abandon, the month-end receipt shows 退單 N 張, the rules modal describes the rule, and GA gets an `abandon` event.
- The simulator gets `SIM_ABANDON=1`, which makes the autoplayer abandon company tickets that are due today and not running before ending the day; without it the fixed-seed output is unchanged.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `abandon-ticket`: the 找主管退單 action — which tickets can be abandoned, its cost for company and outsourced tickets, the two-step button, the log line, the receipt line and the rules text.

### Modified Capabilities

- `play-analytics`: adds the `abandon` event.

## Impact

- Affected specs: abandon-ticket (new), play-analytics
- Affected code:
  - Modified: public/js/actions.js, public/js/view.js, public/js/main.js, public/js/state.js, public/js/modals.js, public/js/rules.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/sim.js, tools/check/play-analytics.test.js, docs/DESIGN.md
  - New: tools/check/abandon-ticket.test.js
  - Removed: none
