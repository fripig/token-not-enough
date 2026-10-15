## Why

Issue #65. The user asked for a new mode where the goal is to use up the subscription quota and the company-provided tokens within the month (「新增模式 想辦法把訂閱制 或者公司提供的token在一個月內用完」, 「用的越滿越高分」). Today every rule rewards saving tokens; the real-world pressure of "the company paid for it, use it or lose it" has no place in the game. In `/spectra-discuss` the user picked: keep the normal score and add a usage bonus; count personal subscriptions, team seats and the company API budget; combine them weighted by value; make it an opening toggle; keep the company daily-limit and overdraft penalties; do not add tickets until the simulator shows they are needed.

## What Changes

- New opening toggle 用量挑戰 (不挑戰／挑戰用滿), default off, stackable with serial and parallel mode, persisted to the next run like the outsourcing toggle, hidden in the weekly adjustment modal.
- With the toggle on, the game tracks value-weighted usage: each week of a paid personal subscription is worth plan price ÷ 4 and each week of an approved team seat is worth a fixed seat value; the week's usage fraction is `min(1, weekly tokens used ÷ weekly cap)`. The company API budget is worth what was spent on tokens plus what is left at month end. Usage = used value ÷ total value.
- Month-end score adds a usage bonus `round(BURN_PTS[mode] × usage)`; the receipt shows the used and total value, the usage percentage and the bonus. Grades use a separate threshold set per mode when the toggle is on. Best scores are stored under a separate key (suffix `-burn`).
- The quota area shows the month's usage so far (used value / total value, percentage), counting the current week as if it closed now.
- The company daily limit (NT$1,500, trust −6) and overdraft (trust −8) stay unchanged. Ticket intake is unchanged.
- GA: every event carries `burn` (true/false); `game_end` also carries `burn_pct` (integer percent) when the toggle is on.
- Rules modal explains the toggle and the bonus with interpolated numbers; dictionary keys in `zh-TW` and `en`.
- Save: `S.burn` and the closed-week totals are saved; old saves without them read as toggle off and zero totals, `SAVE_VER` stays.
- `tools/sim.js`: `SIM_BURN=1` turns the toggle on and prints average usage; `SIM_BURN=2` adds a burn-maximising auto-player. The first measurement checks whether ticket volume can fill each plan; the bonus size and the grade thresholds are set from measurements and confirmed by the user.

## Capabilities

### New Capabilities

- `quota-burn`: the 用量挑戰 toggle, value-weighted usage tracking, the in-game usage display, the usage bonus, the separate grade thresholds, and the receipt lines.

### Modified Capabilities

- `month-end-scoring`: the score formula and the grade requirement refer to the usage bonus and the separate thresholds defined in `quota-burn` when the toggle is on.
- `company-tech-stack`: the best-score key gains a `-burn` suffix when the toggle is on.
- `play-analytics`: common parameters gain `burn`; `game_end` gains `burn_pct` when the toggle is on.

## Impact

- Affected specs: `quota-burn` (new), `month-end-scoring`, `company-tech-stack`, `play-analytics`.
- Affected code: public/js/data.js (`bestKey`, burn constants), public/js/state.js (`fresh`, `track`, `loadGame`), public/js/actions.js (`charge` corp spend, weekly reset in `endDay`), public/js/calc.js (usage calculation), public/js/view.js (quota area), public/js/modals.js (`showSetup`, `monthScore`, `showEnd`, `GRADES`), public/js/rules.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/sim.js, tools/check/quota-burn.test.js (new), tools/check/month-end-scoring.test.js, tools/check/company-tech-stack.test.js, tools/check/play-analytics.test.js, docs/DESIGN.md.
- Refactor check (2026-10-15): actions.js 622 lines / 41.7KB (10 lines over 200 chars), modals.js 208 / 15.7KB (9), state.js 158 / 10.2KB (4), calc.js 198 / 13.3KB (4). No refactor needed first; the usage calculation goes in calc.js as a few small functions.
