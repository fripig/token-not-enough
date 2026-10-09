## Why

The player asked: 「openai訂閱制新增 500美元的等級」. OpenAI launched ChatGPT Pro 500 ($500/month, 25× the Plus allowance) at DevDay on 2026-09-29 and now sells Pro as Pro 100 / Pro 200 / Pro 500 (third-party coverage citing OpenAI; not verified against OpenAI's own pages). The game's OpenAI row only has Plus and an unnamed Pro, so it no longer matches the real lineup the game parodies.

Pro 500 alone costs more than the month-end score floor on personal spend: the score term max(−4000, 8000 − spend) ÷ 8 stops deducting once personal spend passes NT$12,000, so a Pro 500 buyer would get every further personal NT$ for free. The player asked whether raising that point to NT$15,000 would help and chose to measure 12k / 15k / 20k inside this change before deciding.

## What Changes

- Add an OpenAI subscription plan Pro 500 (id `pro500`): NT$16,250/month (the same ×32.5 rate as Plus NT$650 and Pro NT$6,500), daily 12,500k, weekly 50,000k (25× Plus). It appears after Pro 200 in the plan picker, at month start and in the Monday adjustment, and prorates like every other plan.
- Show token amounts of 10M and above with one decimal (trailing .0 dropped), so Pro 500's daily 12,500k reads 12.5M instead of rounding to 13M. The player chose this over writing 13M in the spec or changing the quota to 12,000k. It also affects quota boxes and logs above 10M (10,234k reads 10.2M instead of 10M), and amounts that round to 10M read 10M instead of 10.0M (9,960k); amounts that round below 10M are unchanged. After review, the score formula moved into `monthScore(floor)` in public/js/modals.js so `showEnd` and the simulator's `SIM_FLOOR` share one formula.
- Rename the existing OpenAI plan Pro to Pro 200. Its id stays `pro`, its price and quotas are unchanged, so saves, GA `plan` values and the simulator keep working.
- Measure the personal-spend score floor at NT$12,000 (current), NT$15,000 and NT$20,000 with the simulator, with and without Pro 500, and hand the table to the player. The game rule changes only after the player picks a value; that pick then adds a `month-end-scoring` delta spec to this change.
- Decided after the measurement (2026-10-10): the player picked NT$20,000, so the spend term becomes max(−12000, 8000 − spend) ÷ 8 and Pro 500's whole price counts. The default auto player and Pro 200 never pass NT$12,000, so their scores are unchanged; the table is in docs/DESIGN.md.
- Record the change and the measurements in docs/DESIGN.md.

All plan numbers were chosen by the player from options; the 25× and Pro 200 naming come from the web search on 2026-10-10.

Measured before this change (2026-10-10, a scratchpad copy of the simulator, `SIM_N=100`, 300 games per cell, one run): the default auto player's personal spend median is NT$3.7k–4.4k and no game passes NT$12,000; with `SIM_LUNA=1` about 4% of parallel games pass NT$12,000 and none passes NT$15,000. So moving the floor to 15k or 20k is expected to barely change existing balance; the measurement in this change confirms or refutes that.

## Non-Goals

- No Pro 100 plan (its allowance multiple was not found).
- No Astra Ultrafast mode (Pro 500's exclusive faster mode at 8× quota draw); it would be a new dispatch control.
- Pro 200 keeps 8,000k/30,000k; the real-world cut from about 20× to 10× Plus is not applied.
- No floor value other than the three measured ones, unless the player asks after seeing the table.
- `SAVE_VER` stays the same: adding a plan id does not break old saves.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `agent-catalog`: the Subscription plans table gains OpenAI Pro 500 and renames OpenAI Pro to Pro 200, with a scenario for how token amounts of 10M and above are shown.
- `month-end-scoring`: the Score formula's personal-spend floor moves from NT$12,000 to NT$20,000 (spend term floor −4000 ÷ 8 → −12000 ÷ 8).

## Impact

- public/js/data.js: the OpenAI `plans` list in `VENDORS` and the `kt` token formatter.

Refactor check (2026-10-10): the JS modules total 1,076 lines, the largest is actions.js at 337 lines / 22.6KB; this change edits one plan row and `kt` in data.js and adds two switches to tools/sim.js, so no refactor is needed first.
- public/js/modals.js: the score formula in `showEnd` (floor NT$20,000).
- tools/check.js: assertions for the OpenAI plan row (names, order, price, quotas), a Monday prorate example for Pro 200 → Pro 500, the existing subscription-plan table assertion, and later the score floor.
- tools/sim.js: opt-in `SIM_SUB` and `SIM_FLOOR` switches for the balance measurement.
- docs/DESIGN.md: the requirements list, the vendor/plan notes, the 結算 section and the measurement tables.
- docs/spectra/specs/agent-catalog/spec.md and docs/spectra/specs/month-end-scoring/spec.md via delta specs.
