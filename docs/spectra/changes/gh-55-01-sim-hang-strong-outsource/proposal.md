## Problem

Issue #55, found while measuring #52: `SIM_N=100 SIM_SEED=202 SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_UPGRADE=2 SIM_OUTSOURCE=1 node tools/sim.js` stops printing after the third parallel Rails sample and spins at 100% CPU (it ran 47 minutes before being killed). The same options with seed 101, and seed 202 with six other option sets, finish normally. Because of the hang, #52 has no seed-202 numbers for strong play with outsourcing-then-upgrade.

In the game itself, the same state shows the clock at 17:00 while the dock's 等 1 小時 and 等到下一個 agent 完成 buttons stay enabled and do nothing when clicked. The player can still end the day, so the game does not freeze.

## Root Cause

Reproduced on 2026-10-11 (`main` 53a069f) with an instrumented scratchpad copy of `tools/sim.js` that dumps state after 20,000 iterations of the inner dispatch loop: it stops in parallel Rails, game 66, day 5, with 3 of 6 slots running and `S.hours = 4.996003610813204e-16`, reached in about 16 seconds.

- `advance()` in `public/js/actions.js` loops only while `dt > 1e-9 && S.hours > 1e-9`, so it treats anything at or below 1e-9 hours as the end of the day. Its final line `S.hours = Math.max(0, S.hours)` only clamps negatives, so a floating-point residue such as 5e-16 stays in `S.hours`.
- With that residue, `wait(true)` and `wait(false)` call `advance()`, which does nothing: in the dump, `S.hours` and every job's `left` were unchanged after both calls.
- The dock in `public/js/view.js` (`dayDock`) disables both wait buttons only when `S.hours <= 0`, so they render enabled.
- `tools/sim.js` calls `wait(true)` and sets `acted = true` whenever parallel mode has a running job and `S.hours > 0`, so its `while(acted)` loop never ends.

The outsourcing filter and the Pro 500 upgrade named in the issue are not involved; this option set just happens to reach that floating-point value.

## Proposed Solution

At the end of `advance()`, set `S.hours` to 0 when it is at or below the same 1e-9 tolerance the loop already uses (negatives included). After that, `S.hours > 0` means real time is left, so the dock disables the wait buttons at 17:00 and the simulator's loop ends. The user chose to fix it in the game and not to add an iteration guard to the simulator.

## Non-Goals

- No iteration guard or timeout in `tools/sim.js` (the user picked the game-side fix only).
- No change to other places that subtract hours (single-mode dispatch, `manual`, `research`, `invest`, day-start hardware setup); they subtract whole configured hour values and are not part of this hang.
- Not re-measuring #52's missing seed-202 strong-play numbers; the reproduction command only has to finish.
- No rule, number, or save-format change; `SAVE_VER` stays.

## Success Criteria

- The reproduction command above runs to completion and prints the summary table.
- In parallel mode, once `advance()` ends the day's time, `S.hours` is exactly 0 and both dock wait buttons are disabled; a check in `tools/check/game-modes.test.js` asserts this.
- `node tools/check.js` passes.
- Fixed-seed simulator output is byte-identical before and after the change for `SIM_N=100 SIM_SEED=101`, `SIM_N=100 SIM_SEED=101 SIM_INVEST=1`, and the strong-play outsourcing set with seed 101 (`SIM_N=100 SIM_SEED=101 SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_UPGRADE=2 SIM_OUTSOURCE=1`).
- `docs/DESIGN.md` no longer lists the hang as open.

## Impact

- Affected specs: game-modes (Requirement: Parallel clock and background agents)
- Affected code:
  - Modified: public/js/actions.js, tools/check/game-modes.test.js, docs/DESIGN.md
  - New: none
  - Removed: none
- Refactor check (modules this change touches, measured 2026-10-11): `public/js/actions.js` 532 lines / 36.0KB, 8 lines over 200 characters; `tools/check/game-modes.test.js` gains one section. Conclusion: no refactor needed; the fix is one line in `advance()`.
