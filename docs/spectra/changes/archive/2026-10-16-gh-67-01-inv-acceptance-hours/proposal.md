## Why

Issue #67, a follow-up of #64. Since #64, a written investment in parallel mode can be dispatched to a background agent that pays only tokens and none of the player's hours, and there is no limit on running agents. The user reported that this makes it possible to finish every investment on day 1 (「工程投資可以變工單以後 變成第一天就能把所有東西投資完 好像有點太強」). Estimated from the constants (not run): the ten level-1 investments total about 4,630k base tokens; Opus on Max 20× needs about 7.9M quota-weighted tokens (under the 9M daily quota), the longest job (導入 SDD, complexity 5) runs 5 hours, and ten dispatches cost 2 hours, so everything lands before the end of day 1 at 100% quality. Hand-written, the same set costs 33 hours (about four working days) and NT$3,600 of company budget; the hours were the main cost and the agent route removed them. The user chose to add acceptance hours (「加驗收工時」) over a one-at-a-time limit, paying the company budget, or delaying the effect to the next day.

## What Changes

- In parallel mode, an investment job that finishes no longer applies its level. The ticket stays in the queue as **待驗收** (awaiting acceptance) and remembers the quality the agent achieved.
- Selecting a 待驗收 ticket shows a 驗收（Nh） button: accepting costs the player's own hours, `ACCEPT_HRS` (0.5) × the hours of hand-writing that level, advances the clock like any hand-written work, costs no money and no company budget, and then applies the level (or raises a redo's quality) exactly as finishing the job did before. Level-1 acceptance therefore takes 1–3 hours per investment and 16.5 hours for all ten, which cannot fit in one 8-hour day.
- Until accepted, the investment has no effect; the ticket can still be cancelled with 取消投資 (tokens already spent stay spent). It cannot be re-dispatched while awaiting acceptance.
- The GA `invest` event for an agent investment moves from job completion to acceptance; its parameters are unchanged.
- Hand-writing an investment ticket (自己做), serial mode, and the non-written investments are unchanged.
- The rules modal, the what's-new list and docs/DESIGN.md describe the acceptance step; `tools/sim.js` with `SIM_INVAGENT` accepts finished investments when it has the hours. Balance target: `SIM_INVAGENT=1` against `SIM_INVEST=1` stays within −5% to +10% in parallel mode (the #64 target was 0% to +10%; the acceptance hours are expected to cost some of that gain).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `agent-investments`: a finished investment job puts the ticket into an awaiting-acceptance state; a new requirement defines acceptance (hours, clock, refusals, applying the level, cancelling); dispatch, quality, redo, analytics-timing and save requirements are adjusted to apply the level at acceptance instead of at job completion.
- `play-analytics`: the `invest` event of an agent investment is sent on acceptance instead of on job completion; a job finishing into 待驗收 sends nothing.

## Impact

- Code: public/js/actions.js (`settleInv`, a new acceptance action, refusal reason), public/js/view.js (`invDispatch`, card chip), public/js/main.js (button delegation), public/js/data.js (`ACCEPT_HRS`), public/js/rules.js, public/js/news.js, public/js/i18n/zh-TW.js and public/js/i18n/en.js.
- Tools: tools/sim.js (`SIM_INVAGENT` accepts), tools/check/agent-investments.test.js, tools/check/play-analytics.test.js, tools/check/rules-reference.test.js if the rules text is asserted.
- Docs: docs/DESIGN.md (投資工單 section, balance table, code map).
- Saves: a queued ticket gains an optional acceptance field; old saves have none and load as before, `SAVE_VER` stays. An old save's running investment job finishes into 待驗收.
- Refactor check (2026-10-16): actions.js 627 lines／42.0KB (10 lines over 200 characters), view.js 279／29.0KB (40), rules.js 155／12.3KB (10); conclusion: no refactor needed, the change adds one action and one panel branch.
