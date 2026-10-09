## Why

Players asked for an optional advanced mode with finer model control. Today each model has a single fixed capability, token usage and speed, so the only lever is switching models. A reasoning-effort knob (low / medium / high) adds a second, realistic trade-off: thinking harder makes an agent more capable, but it burns more tokens and the work takes longer.

## What Changes

- The opening setup modal gains a 進階模式 section with 一般 and 進階 options (default 一般). Like 接外包, it persists across 再玩一個月, falls back to 一般 when the stored value is not a boolean, and is not shown in the weekly subscription modal.
- In 進階 mode the dispatch panel shows a 推理強度 selector with 低 / 中 / 高. The model list itself does not change.
- Effort modifies the chosen model for that dispatch: 高 raises capability by 1, multiplies token usage and multiplies execution time (slower); 低 lowers capability by 1 (minimum 1), reduces token usage and shortens execution time (faster); 中 is the unchanged model. Exact multipliers are set in design and tuned with the simulator.
- Effort affects everything derived from capability in dispatch: success rate, self-review catch rate, and whether an agent can push through an unrevealed trap. Architecture evaluation is not affected.
- 一般 mode behaves exactly as today (equivalent to 中).
- Dispatch presets also store an effort level; presets saved before this change load as 中, and in 一般 mode the stored effort is ignored.
- The best score is not split by mode; the existing best-score key is reused.
- `tools/sim.js` gains a switch to run an auto-player that uses effort; `tools/check.js` gains assertions for the effort rules; `docs/DESIGN.md` documents the rules and measured balance.

## Capabilities

### New Capabilities

- `reasoning-effort`: advanced-mode toggle and the low/medium/high reasoning-effort knob with its effect on capability, token usage and execution time.

### Modified Capabilities

- `dispatch-presets`: presets store an effort level in addition to vendor, model, billing and review.

## Impact

- Affected code: public/js/data.js (effort table, preset validation), public/js/state.js (run state and dispatch selection), public/js/calc.js (estimate applies effort), public/js/actions.js (dispatch, presets), public/js/view.js (dispatch panel selector, preset labels), public/js/modals.js (setup toggle), public/js/main.js (event delegation), public/css/style.css if the selector needs styling.
- Tooling: tools/check.js, tools/sim.js.
- Docs: docs/DESIGN.md.
- No new dependencies; no change to deployment.
