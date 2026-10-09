## 1. Simulator switch

- [x] 1.1 Before editing, capture the baseline: run `SIM_SEED=1 SIM_N=5 node tools/sim.js` and save its output to a scratch file outside the repo. Then add `SIM_SEATS` to tools/sim.js. Unset means no seats. `1`, `2` or `3` grants that many seats, appending `SEAT.vendors[k]` to `S.seats` at the start of day 6, 11 and 16 (k = 0, 1, 2) in each simulated month. Any other value prints `SIM_SEATS 必須是 1–3 的整數，收到「…」` and exits non-zero. While seats are granted, a company ticket (not outsourced) is billed `seat` to the first vendor in `S.seats` whose `quotaLeft('seat', v)` is above 300, using its capability-4 model (anthropic/sonnet, openai/std, google/pro). If no seat qualifies, or the ticket is outsourced, the existing choice applies. Update the header comment to describe the switch. Verify:
  - `SIM_SEED=1 SIM_N=5 node tools/sim.js` output is byte-identical to the baseline (`cmp` exit 0).
  - `SIM_SEATS=3 SIM_SEED=1 SIM_N=5 node tools/sim.js` exits 0, and its sample lines show nonzero OpenAI or Google tokens. To make that visible, add the seat token total to the sample line only when `SIM_SEATS` is set, so the default output stays byte-identical.
  - `SIM_SEATS=4 node tools/sim.js` exits non-zero with the message.

## 2. Measurement and record

- [x] 2.1 Measure the upper bound: run the no-seat baseline and `SIM_SEATS=1`, `2` and `3`, each with `SIM_N=100` (300 runs per mode × company), two independent runs each. Compute (mean with seats ÷ mean without seats − 1) per mode × company, pairing each seat run with the baseline of the same round. Keep the raw outputs in scratch files outside the repo. Verify by recording all eight runs' exit codes and the computed table in the issue #7 comment. [after: 1.1]
- [x] 2.2 Record the result in docs/DESIGN.md:
  - Add `SIM_SEATS` to the tools/sim.js description.
  - Add a dated table to the 團隊席位 rules: rows are mode × company, columns are 1, 2 and 3 seats, each cell showing both runs. Also say how the upper bound was simulated.
  - Replace the known-issues line "多團隊席位的平衡沒有量過" with the measured range.
  - If any parallel-mode three-seat cell is above +15%, flag it there as needing a separate tuning discussion, without changing any game number.

  Verify by reading those three places and running `node tools/check.js` (the game rules are untouched, so it still passes). [after: 2.1]
