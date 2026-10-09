## 1. Subscription events

- [x] 1.1 Game start and Subscription events requirements: confirming the opening setup sends `game_start`, one `subscription` event per subscribed vendor in `SUBV` order (or one `vendor` `none` / `plan` `none`), then `day_reached` day 1; confirming the weekly 調整訂閱 modal sends `subscription` only for vendors whose plan changed, and closing it sends nothing. Implemented in `showSetup`'s confirm handler (public/js/modals.js) by applying subscriptions before `track('game_start')`. Verify: update the existing play-analytics block in tools/check.js (the "opening confirm sends game_start then day_reached" assertion becomes the three-event order) and add assertions for the Opening subscriptions, No subscription and Monday change scenarios; `node tools/check.js` exits 0.

## 2. Dispatch and result events

- [x] 2.1 Every started agent sends `dispatch` with the parameters of the Dispatch event requirement, and every settled job sends `job_result` with the parameters and outcome order of the Dispatch result event requirement. `makeJob` stores the model id and effective effort on the job; per the design decision "How the dispatch was triggered", `dispatch(via, preset)` receives `panel`/`quick`/`batch` and the preset letter from `quick(id, via)` and `batch`; `settle` computes `tokens`, `cost` and `outcome` following the design decision "Outcome values". Verify: tools/check.js asserts the Panel, Quick, Batch and Refused dispatch scenarios, each row of the outcome table, the Opus 100k → `tokens` 100 / `cost` 150 example and the `unknown`/`mid` fallback for a job without `m`/`ef`; `node tools/check.js` exits 0. [after: 1.1]

## 3. Other ticket action events

- [x] 3.1 `manual`, `evaluate`, `rescope` and `invest` (public/js/actions.js) send `manual_fix`, `evaluate`, `rescope` and `invest` with the parameters of the Other ticket action events requirement, and refused actions send nothing. Verify: tools/check.js asserts the Manual fix, Evaluate finds a trap, Rescope (trust 70 approved, trust 40 refused) and Invest (second purchase sends nothing) scenarios; `node tools/check.js` exits 0. [after: 2.1]

## 4. Documentation and final checks

- [x] 4.1 docs/DESIGN.md lists the new events and their parameters next to the existing GA event summary, and names the parameters to register as GA custom dimensions (`tokens`, `cost`, `hours` as custom metrics). Verify by reading the paragraph. [after: 3.1]
- [x] 4.2 `node tools/check.js` exits 0, `SIM_N=20 node tools/sim.js` finishes without errors (sim has no `gtag`), and `spectra validate gh-14-01-choice-analytics` passes. [after: 4.1]
