## 1. Slot choice

- [x] 1.1 Slot picker in the opening setup (Slot count selection): add `SLOT_CHOICES`, keep `S.slots` across `fresh()` (2–6, else 3), show `data-slots` buttons 2–6 under the mode picker only when the draft mode is parallel and only in the opening modal, set `S.slots` on confirm, and make the parallel-mode description use the drafted count. Verify: tools/check.js asserts default 3, picker present for parallel and absent for serial and weekly adjustment, confirm with 5 sets `S.slots` to 5 and the agent list shows `0 / 5`, replay preselects 6, and an invalid stored value falls back to 3.
- [x] 1.2 Existing costs carry the trade-off (Slot limit on dispatch) and Slot count on the receipt: confirm dispatch refuses beyond `S.slots` with the existing warning and disabled button, and the parallel receipt title includes `（N 個 agent）`. Verify: tools/check.js asserts the two-slot refusal, the token-multiplier table (1.15, 1.45, 1.75) via `parMul()` with N−1 running jobs, and the receipt title for a 4-slot Laravel run. [after: 1.1]

## 2. Measurement, docs and release

- [x] 2.1 Simulator measures each slot count: tools/sim.js reads `SIM_SLOTS` (2–6, error otherwise) and sets `S.slots` for parallel runs. Verify: `SIM_SLOTS=7 node tools/sim.js` exits non-zero; `SIM_SLOTS=N node tools/sim.js` exits 0 for N = 2..6 and the parallel means per company are collected. [after: 1.1]
- [x] 2.2 Update docs/CLAUDE.md (slot choice, measured means from 2.1, whether one count dominates) and README.md (slot choice in 遊戲模式). Verify: content review against `SLOT_CHOICES` and the sim output. [after: 1.2, 2.1]
- [x] 2.3 Run `node tools/check.js` and `node tools/sim.js`, browser-check the setup modal at desktop and 400px width in both themes and play one parallel month with a non-default slot count, then commit; pushing is confirmed with the user first. Verify: both commands exit 0 and their output is reported. [after: 2.2]
