## Why

Parallel mode always gives the player exactly 3 background agent slots. How many agents to run at once is one of the most interesting trade-offs in agent-assisted work: more agents finish more tickets but each one costs more tokens (context reloading) and raises the chance of merge conflicts. Letting the player choose the slot count turns that trade-off into a decision.

## What Changes

- When parallel mode is selected on the opening setup screen, the player also picks the number of background agent slots, from 2 to 6 (default 3). The choice is fixed for the month and kept for 再玩一個月.
- The existing parallel costs are unchanged and scale with the choice: each running agent adds 15% token use to new dispatches and 10% merge-conflict chance on completion.
- The parallel-mode description and the month-end receipt title show the chosen slot count.
- tools/sim.js accepts `SIM_SLOTS` to measure each slot count; the measured means per slot count are recorded in docs/CLAUDE.md. Scoring and grade thresholds are not changed.
- tools/check.js covers the picker and slot limits; README.md and docs/CLAUDE.md describe the option.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `parallel-slots`: choosing the number of parallel agent slots at run start, how the choice limits dispatching, and how it is shown.

### Modified Capabilities

(none)

## Impact

- Affected code: public/js/game.js (fresh, showSetup, showEnd), tools/sim.js, tools/check.js.
- Affected docs: docs/CLAUDE.md, README.md.
- Best scores stay keyed by mode and company; slot count is not part of the key.
