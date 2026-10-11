## 1. Baseline before the fix

- [x] 1.1 Fixed-seed simulator outputs from the unchanged code are saved in the session scratchpad for three runs: `SIM_N=100 SIM_SEED=101 node tools/sim.js`, `SIM_N=100 SIM_SEED=101 SIM_INVEST=1 node tools/sim.js`, and `SIM_N=100 SIM_SEED=101 SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_UPGRADE=2 SIM_OUTSOURCE=1 node tools/sim.js`. Verify each run exits 0 and its file ends with the per-mode summary lines.

## 2. Parallel clock and background agents: clear the end-of-day residue

- [x] 2.1 A failing check in `tools/check/game-modes.test.js` covers the "Residue at the end of the day" scenario of Requirement: Parallel clock and background agents: a parallel run with 3 agents whose remaining time is above 1 hour and `S.hours = 1 + 5e-16`, after `wait(false)`, has `S.hours === 0`, unchanged agent remaining times beyond the 1 hour waited, and a rendered dock where both `data-act="wait1"` and `data-act="waitn"` are disabled while `data-act="end"` is not. Verify by running `node tools/check.js game-modes` before the fix and seeing this check fail on `S.hours` being a positive residue. [after: 1.1]
- [x] 2.2 `advance()` in `public/js/actions.js` leaves `S.hours` at exactly 0 whenever it would end at or below 1e-9 (including negatives), using the same 1e-9 tolerance its loop already uses; above 1e-9 the value is unchanged. Verify by running `node tools/check.js game-modes` and seeing the check from 2.1 pass. [after: 2.1]

## 3. Verification

- [x] 3.1 The reproduction command from #55, `SIM_N=100 SIM_SEED=202 SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_UPGRADE=2 SIM_OUTSOURCE=1 node tools/sim.js`, runs to completion and prints the per-mode summary lines. Verify by running it and recording its wall-clock time. [after: 2.2]
- [x] 3.2 The three fixed-seed outputs from 1.1 are byte-identical after the fix. Verify by re-running the same three commands and comparing with `cmp` against the saved files. [after: 2.2]
- [x] 3.3 The full rule check passes. Verify by running `node tools/check.js` and seeing every test pass. [after: 2.2]

## 4. Documentation

- [x] 4.1 `docs/DESIGN.md` no longer lists the seed-202 strong-play outsourcing hang as open in 已知狀況與可做的下一步; instead it records the root cause (floating-point residue left in `S.hours` by `advance()`, which kept the wait buttons enabled and made `tools/sim.js` loop) and the fix, citing #55 and `gh-55-01-sim-hang-strong-outsource`, and the 平行模式 section states that the clock snaps to 17:00 when the residue is at most 1e-9 hours. Verify by content review against `proposal.md` and the outputs from 3.1 and 3.2. [after: 3.3]
