## 1. Usage tracking

- [x] 1.1 Value-weighted usage core (design "Value of each pool", "Usage fraction per week"): add `BURN_PTS` and `BURN_SEAT_VALUE` to public/js/data.js; add `S.burn`, `S.st.burnV`, `S.st.burnM`, `S.st.corpTk` to `fresh()` (`S.burn` persists via `S?.burn===true`) and fill missing ones in `loadGame` without bumping `SAVE_VER`; the `corp` branch of `charge` adds to `S.st.corpTk`; public/js/calc.js gets `weekBurn()` and `burnStat()`. Verify with new tools/check/quota-burn.test.js sections reproducing the 「month usage」 example (NT$13,455 / NT$17,775), the freeze/investment, overdraft and personal-API scenarios, and an old save without the fields loading as toggle off.
- [x] 1.2 [after: 1.1] Week closing (design "When weeks close"): `endDay` adds `weekBurn()` to `S.st.burnV`/`burnM` before the Monday reset zeroes `used.*.w`, so a seat approved that Monday counts from the new week. Verify in tools/check/quota-burn.test.js that a seat approved on day 6 adds three weeks of value, a plan changed in the Monday modal is valued from the new week, and that `SIM_N=100 SIM_SEED=101 node tools/sim.js` and `SIM_INVEST=1 SIM_N=100 SIM_SEED=101 node tools/sim.js` print byte-identical output to the pre-change run (save both outputs to the scratchpad before starting 1.1).

## 2. Toggle, score and display

- [x] 2.1 [after: 1.1] Usage challenge toggle (design "Toggle shape"): `showSetup` shows 用量挑戰 with 不挑戰／挑戰用滿 (`data-burn`), default off, persisted to 再玩一個月, not in the weekly modal, switching keeps the day-1 tickets. Verify with tools/check/quota-burn.test.js sections for the three toggle scenarios.
- [x] 2.2 [after: 2.1] Usage bonus and receipt plus Score formula and Grade (design "Bonus and grades"): `monthScore()` adds `round(BURN_PTS[mode] × pct)` only when `S.burn`, picks `GRADES.burnSerial`/`burnParallel`, returns `burn` and `pct`; `showEnd` adds the 用量挑戰 and 用量加分 lines and the formula suffix. Verify with tools/check/quota-burn.test.js (parallel bonus 3,028 → score 10,228 grade A; serial 3,900 boundary, after the task 4.3 calibration) and unchanged tools/check/month-end-scoring.test.js assertions with the toggle off.
- [x] 2.3 [after: 2.2] Best score per mode and company with the `-burn` suffix (design "Best-score key"): `bestKey()` appends `-burn` when on, legacy key read only when off. Verify the 「Usage challenge key」 scenario in tools/check/company-tech-stack.test.js.
- [x] 2.4 [after: 1.2] Usage display (design "Display"): the quota area shows 用量 NT$X / NT$Y（N%）only when `S.burn`. Verify the 「Day 1 display」 scenario (NT$0 / NT$12,825) in tools/check/quota-burn.test.js and that the row is absent with the toggle off.

## 3. Analytics, rules and text

- [x] 3.1 [after: 2.2] Common event parameters gain `burn`; Game end gains `burn_pct` only when on. Verify the updated scenarios in tools/check/play-analytics.test.js.
- [x] 3.2 [after: 2.2] Rules modal (public/js/rules.js) explains the toggle, the pools, the bonus and the burn thresholds with interpolated `BURN_PTS`, `BURN_SEAT_VALUE` and `GRADES` numbers; every new string has a key in public/js/i18n/zh-TW.js and public/js/i18n/en.js. Verify with `node tools/check.js localization rules-reference` passing.

## 4. Simulator and calibration

- [x] 4.1 [after: 2.2] tools/sim.js: `SIM_BURN=1` turns the toggle on and prints average usage and the average share of seat value per mode × work content; `SIM_BURN=2` adds a burn-maximising auto-player (fills subscription and seat quota first with high effort and strict review, paces company API to stay under the daily limit). Verify both switches run to completion with `SIM_N=20`, and that without `SIM_BURN` the outputs from 1.2 stay byte-identical.
- [x] 4.2 [after: 4.1] Measure ticket fill: run `SIM_BURN=2` with `SIM_SUB` unset (Max 5×), `SIM_SUB=pro200` and the strong play (`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`), `SIM_N=100`, seeds 101 and 202; report the usage per pool and whether Max 5× reaches at least 90%. If it does not, stop and ask the user whether to add tickets (design Non-Goals). Verify by recording the table on issue #65.
- [x] 4.3 [after: 4.2] Calibrate `BURN_PTS` and the burn grade thresholds by the rule in design "Bonus and grades"; present the measured values and let the user choose; update `BURN_PTS`, `GRADES.burnSerial`, `GRADES.burnParallel`, the numbers in specs/quota-burn/spec.md scenarios and their assertions. Verify with `node tools/check.js` passing after the update.

## 5. Docs and final check

- [x] 5.1 [after: 4.3] docs/DESIGN.md: requirement entry 51 with the user's words and choices, a 用量挑戰 rules section with the measured tables, GA dimensions `burn` and metric `burn_pct` in the analytics paragraph, the new sim switches, and the code map entries. Verify by content review against this change's specs.
- [x] 5.2 [after: 5.1] Full verification: `node tools/check.js` passes, fixed-seed outputs from 1.2 are byte-identical, and a manual browser run (`python3 -m http.server -d public 8000`) at 400px and desktop width in both languages shows the toggle, the usage row and the receipt lines.
