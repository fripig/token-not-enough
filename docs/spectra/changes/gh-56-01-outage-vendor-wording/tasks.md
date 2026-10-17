## 1. Outage text names the vendor

- [x] 1.1 Before editing, save the fixed-seed baseline `SIM_N=100 SIM_SEED=101 node tools/sim.js` output to the scratchpad, so 2.2 can compare against it.
- [x] 1.2 [after: 1.1] (random-events, Requirement: Event effects) The outage event body reads 今天 `<vendor>` 全部不能用（`<agent>` 也一樣），不管你付的是哪種錢。 in Traditional Chinese and the same vendor-first structure in English (for example "Everything from {v} is down today ({agent} included), whatever you pay with."), by changing `ev.outage.b` in `public/js/i18n/zh-TW.js` and `public/js/i18n/en.js`; the event title and `ev('outage', {v, agent})` in `public/js/actions.js` stay as they are. Verified by 1.3.
- [x] 1.3 [after: 1.2] `tools/check/random-events.test.js` asserts the full outage text for 智譜 GLM, DeepSeek and Anthropic (the three rows of the spec's "outage text per vendor" example), driving `EVENTS[1]` with `withRand` so `pick(APIV)` lands on each vendor; `node tools/check.js random-events localization` passes.

## 2. Verification and docs

- [x] 2.1 [after: 1.3] `node tools/check.js` passes in full.
- [x] 2.2 [after: 1.3] `SIM_N=100 SIM_SEED=101 node tools/sim.js` output is byte-identical to the 1.1 baseline (`diff` prints nothing).
- [x] 2.3 [after: 2.1] `docs/DESIGN.md` records the request as a new numbered entry under 「對話中的需求」 (issue #56 report, the user's choice of vendor-first wording, and that the not-in-log report is still unreproduced), and the 隨機事件 section notes that the outage text names the vendor; content review.
