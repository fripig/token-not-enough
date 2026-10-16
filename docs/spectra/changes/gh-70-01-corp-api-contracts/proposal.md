## Why

Company API billing is hard-coded to Anthropic and Google (`corp:true` in `VENDORS`), so OpenAI always shows 公司沒簽約 even though the player can hold an OpenAI team seat. Nobody recorded why OpenAI was left out; it came with the v1 build. The user asked (issue #70) to turn the contract list into an opening setting so players can match how their own company pays for AI.

## What Changes

- The opening setup modal gets a 公司 API 合約 section: three toggle buttons for Anthropic, OpenAI and Google. Default is Anthropic + Google (today's behavior). Any subset is allowed, including none (the company pays for no AI tokens; the budget is left for engineering investments).
- The choice is stored in the run state (`S.corpApi`, fixed vendor order), persists to the next run like the other opening toggles, falls back to the default when invalid, and is not shown in the weekly 調整訂閱 modal. Changing it does not redraw day-1 tickets.
- The 公司 API billing option is available only for vendors in the run's contract list; others keep the note 公司沒簽約. Chinese vendors and local models never offer company API.
- Team seats are unchanged: all three vendors can still be requested regardless of the contract list.
- The rules modal billing tab lists this run's contracted vendors (or says none).
- The opening setup log line adds the contract list.
- Every GA event carries a new common parameter `corp_api` (e.g. `anthropic+google`, `none`).
- Usage challenge: with no contracted vendor, the company API budget is left out of the usage value (otherwise an unspendable budget would count as unused).
- Best-score key and grade thresholds do not depend on the contract list.
- Old saves without the field load as Anthropic + Google; `SAVE_VER` stays.
- A `gh-70-01` entry in What's New.
- The `corp` flag on `VENDORS` is removed; the contract list is the only source.

## Capabilities

### New Capabilities

- `corp-api-contracts`: the opening contract setting — choices, default, persistence, validation, setup log line, save fallback, and that it does not affect seats, best-score key or grades.

### Modified Capabilities

- `agent-catalog`: "Only Anthropic and Google SHALL accept company API billing" becomes "company API billing follows the run's contract list"; the company-API flag column and the OpenAI scenario change.
- `billing-methods`: 公司 API availability reads the run's contract list.
- `play-analytics`: common event parameters add `corp_api`.
- `quota-burn`: company API value is excluded when the contract list is empty.

## Impact

- Affected specs: `corp-api-contracts` (new), `agent-catalog`, `billing-methods`, `play-analytics`, `quota-burn`
- Affected code: public/js/data.js, public/js/state.js, public/js/modals.js, public/js/calc.js, public/js/rules.js, public/js/news.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check/agent-catalog.test.js, tools/check/billing-methods.test.js, tools/check/play-analytics.test.js, tools/check/quota-burn.test.js, tools/check/corp-api-contracts.test.js (new), docs/DESIGN.md
- Simulator: default contract list equals today's behavior, so fixed-seed output of tools/sim.js is expected to stay byte-identical (to be confirmed by running it).
- GA admin: register `corp_api` as an event-scoped custom dimension.
- Refactor check (modules this change touches, measured 2026-10-17): data 185 lines / 18.4KB (11 lines over 200 chars), state 160 / 10.5KB (5), modals 216 / 17.1KB (11), calc 210 / 14.0KB (4), rules 156 / 12.4KB (10), news 69 / 3.5KB (0). Conclusion: no refactor needed; the change follows the existing opening-toggle pattern.
