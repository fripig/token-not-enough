## Why

In parallel mode every new dispatch currently costs 1 + 0.15 × (agents already running) times the tokens. Each agent has its own context, so how many other agents are running does not change how many tokens this one reads or writes; the player (issue #12) called this unreasonable. The real cost of running many agents at once is on the human side: reviewing a PR while several other agents are in flight means more context switching.

## What Changes

- **BREAKING (balance)**: remove the parallel token multiplier. A dispatch's token estimate and charge no longer depend on how many agents are running. The estimate label no longer shows ×<multiplier>.
- Add a PR review load: in parallel mode, when an agent finishes and PR review time is charged, the hours are multiplied by 1 + 0.25 × the number of other agents still running at that moment. The existing self-review halving and pre-commit hook ×0.5 still apply on top. The 0.25 coefficient is a starting value to be tuned with `tools/sim.js`.
- The dispatch panel hint, the parallel mode button and the slot buttons in the opening setup describe the review load instead of the token multiplier (for example the slot button shows the maximum review multiplier instead of the maximum token multiplier).
- Merge-conflict chance, slot limits and serial mode are unchanged.
- `docs/DESIGN.md` records the decision (requirement 3 is reinterpreted) and the re-measured balance numbers.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `game-modes`: remove the parallel token multiplier requirement; PR review hours gain the concurrent-agent load factor.
- `parallel-slots`: the slot limit requirement no longer refers to a token multiplier; the slot-count example shows the maximum PR review multiplier.
- `dispatch-outcome`: the token estimate formula drops the parallel multiplier; the estimate label no longer shows ×<multiplier>.
- `engineering-investments`: the pre-commit hook example states that the review hours shown are with no other agent running.

## Impact

- Affected specs: `game-modes`, `parallel-slots`, `dispatch-outcome`, `engineering-investments`
- Affected code: public/js/actions.js (`parMul`, `makeJob`, `prHrs`, `advance`), public/js/calc.js (`est`), public/js/view.js (dispatch panel), public/js/modals.js (`showSetup`), tools/check.js, tools/sim.js (if it references the multiplier), docs/DESIGN.md
- Save data: the job field `mul` is dropped; old saves that still carry it load fine, so `SAVE_VER` does not change.
