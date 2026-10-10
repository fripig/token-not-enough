## Summary

Two small play-flow fixes from the #39 UI review (issue #42): the morning report opens with yesterday's end-of-day summary as four figures (KPI, trust, wallet, company budget, each change and current value), and the dispatch panel picks a team seat or personal subscription by default when the player switches to another vendor.

## Motivation

- The end-of-day summary (`═ 第 N 天下班｜KPI …`) is only written to the action log, which sits under the queue. The morning report says how many tickets are queued and lists penalties, but not how the day went overall; the player has to scroll to the log to see it.
- The billing selection starts as 個人 API and only changes when the current choice becomes unusable. A player who paid for a subscription (or holds a team seat) still dispatches on 個人 API by default and pays twice unless they notice (observed in #39: Anthropic Pro subscribed, Sonnet selected, 個人 API preselected).

## Proposed Solution

User decisions (2026-10-11, picked from options):

- Morning report: a four-cell row at the top with KPI, 信任, 錢包, 公司, each showing the signed change and the current value with the same numbers as the log's end-of-day line for the day that just ended. KPI and trust changes are coloured (gain green, loss red); money is neutral. The figures are stored with the morning report in the save so a resumed run shows them; older saves without them show the report without the row.
- Billing default: when the dispatch selection moves to a different vendor (clicking another vendor's model, and once when day 1 starts), billing becomes 公司席位 if the player holds that vendor's seat and its quota covers the estimate, else 個人訂閱 if the player has a plan for that vendor and its quota covers the estimate, else it stays as it was. Changing the model within the same vendor, selecting another ticket and loading a preset do not apply the default.

## Non-Goals

- Changing what the end-of-day log line says or when it is written.
- Changing billing rules, quotas, presets or one-click dispatch.

## Impact

- Affected specs: `action-log` (modified: adds the morning summary requirement), `save-game` (modified: requirement "Day-start save" morning content), `billing-methods` (modified: adds the default billing requirement).
- Refactor check (modules this change touches, measured 2026-10-11): `public/js/actions.js` 487 lines / 32.2KB / 6 lines over 200 chars; `public/js/modals.js` 199 / 14.9KB / 9; `public/js/calc.js` 101 / 6.5KB / 1; `public/js/main.js` 61 / 3.1KB / 0; `public/css/style.css` 277 / 18.6KB / 6. Conclusion: no refactor needed.
- Affected code:
  - Modified: public/js/actions.js, public/js/modals.js, public/js/calc.js, public/js/main.js, public/css/style.css, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check/action-log.test.js, tools/check/billing-methods.test.js, tools/check/save-game.test.js, docs/DESIGN.md
