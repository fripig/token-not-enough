## Context

Issue #65. Every rule today rewards saving tokens. The user wants an opt-in challenge where the score also rewards using up what was paid for: personal subscriptions, team seats and the company API budget. Decisions taken in `/spectra-discuss` (all picked by the user from options):

1. Score = normal score + usage bonus (not usage alone, not a usage gate).
2. Pools counted: personal subscriptions, team seats, company API budget. Personal API is the player's own money and is not counted.
3. Pools are combined weighted by value (NT$), not averaged per pool.
4. Ticket intake is unchanged; the simulator first measures whether tickets can fill each plan.
5. It is an opening toggle stackable with serial and parallel mode, not a third mode.
6. Company daily limit (`CORP_DAY_LIMIT` NT$1,500, trust −6) and overdraft (trust −8) stay as they are; pacing the budget is the skill.

Current code facts this design relies on (read on 2026-10-15):

- Quotas: `S.used.sub[v]` and `S.used.seat[v]` hold `{d, w}`; `quotaLeft` in public/js/calc.js caps with `p.day × cm` and `p.week × cm` where `cm` is `S.capMod[v]` for subscriptions and 1 for seats. For every plan and for seats, `day × 5 > week` (e.g. Max 5× 2,200 × 5 = 11,000 > 9,000; seat 2,500 × 5 = 12,500 > 10,000), so the weekly cap binds.
- `endDay` in public/js/actions.js zeroes `used.*.w` on Monday right after `S.day++`, before seat review, hardware arrival and random events. Seats approved that morning are therefore not yet in `S.seats` when the reset runs. The Monday subscription adjustment modal opens after `endDay`, so `S.subs` at reset time is still the plan of the week that just ended.
- Company token spend goes through the `corp` branch of `charge` (dispatch, review segment, evaluate, research). Investments pay through `payInv`, hardware does not touch `S.corp`. The budget-freeze event does `S.corp *= 0.7`.
- `monthScore()` in public/js/modals.js computes `round(KPI × 10 + trust × 4 − audits × 80)` and picks `GRADES[serial|parallel]`. `bestKey()` in public/js/data.js returns `tokgame-best-<mode>-<stacks>`.

## Goals / Non-Goals

**Goals:**

- An opening toggle 用量挑戰 that adds a value-weighted usage bonus to the month-end score.
- The player can see the usage so far during the month.
- Separate grade thresholds and best-score keys so challenge runs do not compete with normal runs.
- Measured bonus size and thresholds, confirmed by the user.

**Non-Goals:**

- More tickets or token-only "busywork" tasks (rejected in discuss; revisit only if the measurement in task 1 shows even modest plans cannot be filled).
- Changing company daily-limit or overdraft penalties.
- Counting personal API spend or local models.
- Counting investment or hardware spending as usage.
- A third game mode.

## Decisions

### Value of each pool

- Personal subscription: each closed week with a paid plan is worth `plan.price ÷ 4` NT$ (the plan in effect during that week). Plan `none` is worth 0.
- Team seat: each closed week a seat is approved is worth `BURN_SEAT_VALUE ÷ 4`. `BURN_SEAT_VALUE` starts at NT$3,300, the Max 5× price, because a seat's weekly cap (10,000k) is close to Max 5× (9,000k). This is an estimate, not measured; task 1 records whether seats dominate the total.
- Company API: worth `corpTk + max(0, S.corp)` at the time of reading, where `corpTk` is all token spend charged to the company budget. Investments and the freeze event reduce `S.corp`, so they shrink the total without counting as used.

### Usage fraction per week

A subscription or seat week's used value is `value × min(1, used.w ÷ (week × cm))`, with `cm = S.capMod[v]` for subscriptions and 1 for seats, read at the moment the week closes. Company usage is `min(1, corpTk ÷ total)`, so an overdraft counts as 100% and never more.

### When weeks close

Before the Monday reset zeroes `used.*.w` in `endDay`, the ending week's subscription and seat values are added to `S.st.burnV` (used NT$) and `S.st.burnM` (total NT$). At month end the fourth week is never reset, so the live calculation includes the current week. The same function serves the in-game display (current week counted as if it closed now) and the receipt. The closing runs every Monday regardless of the toggle; it calls no `Math.random`, so fixed-seed outputs stay byte-identical.

### Bonus and grades

- Bonus = `round(BURN_PTS[mode] × usage)`, added to the score only when `S.burn` is on.
- Starting values were estimates (`BURN_PTS` serial 500 / parallel 2,000). Measured in task 4.2 (2026-10-16): with parallel 2,000 the burn-maximising player scored −8.2%～+21.3% against default dispatch, so burning did not pay. The user chose parallel 4,000 / serial 500 and the thresholds below, computed by the calibration rule: `GRADES.burnSerial = [3900, 2500, 1500, 600]`, `GRADES.burnParallel = [12300, 7880, 6600, 5320]`.
- Calibration rule (task 2): parallel S = median score of the strong play (`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`) with `SIM_BURN=2`, rounded to hundreds, matching how `GRADES.parallel` S was set in #45/#53; parallel A–D and serial S–C = base threshold + median bonus of the default auto-player with `SIM_BURN=1` in that mode, rounded to hundreds. `BURN_PTS` target: the burn-maximising player (`SIM_BURN=2`) scores between +5% and +20% over the same player with the toggle on but default dispatch (`SIM_BURN=1`) in every parallel cell. If missed, report the numbers and let the user choose.

### Toggle shape

Same shape as the outsourcing toggle: `data-burn="0|1"` buttons in `showSetup`, stored in `draft.burn` and `S.burn`, persisted across `fresh()` (`S?.burn===true`), not shown in the weekly adjustment modal, changing it does not regenerate day-1 tickets.

### Best-score key

`bestKey()` appends `-burn` when `S.burn` is on. The legacy `tokgame-best-<mode>` fallback is only read when the toggle is off.

### Display

The quota area gets one row above the per-vendor boxes when `S.burn` is on: 用量 NT$X / NT$Y（N%）, from `burnStat()`. Hidden when off.

## Implementation Contract

**Behavior**

- Toggle off: game, score, grades, best keys and receipts are exactly as today; GA events carry `burn: false`.
- Toggle on: quota area shows usage so far; the receipt adds 用量挑戰 lines (used value / total value, usage %, bonus) and the formula line shows `+ 用量 × BURN_PTS`; grade uses the burn thresholds; best score is stored under the `-burn` key; `game_end` carries `burn_pct`.

**Interface / data shape**

- data.js: `BURN_PTS`, `BURN_SEAT_VALUE`; `bestKey()` appends `-burn`.
- state.js: `S.burn` (boolean), `S.st.burnV`, `S.st.burnM`, `S.st.corpTk` (numbers, NT$); `track()` adds `burn: S.burn`; `loadGame` fills missing `S.burn` with false and missing totals with 0. `SAVE_VER` unchanged.
- calc.js: `weekBurn()` → `{v, m}` for the current week across subscriptions and seats; `burnStat()` → `{v, m, pct}` = closed totals + `weekBurn()` + company pool, `pct` in 0–1 (0 when `m` is 0).
- actions.js: `charge` corp branch adds to `S.st.corpTk`; `endDay` closes the week before the Monday reset.
- modals.js: `GRADES.burnSerial`, `GRADES.burnParallel`; `monthScore()` returns `burn` (bonus) and `pct` and adds the bonus when on.
- GA: common parameter `burn` (boolean); `game_end` adds `burn_pct` (integer 0–100) only when `S.burn`.

**Failure modes**

- Total value 0 (e.g. no subscription, no seat, company budget fully spent on investments): usage 0, bonus 0, display shows NT$0 / NT$0（0%）.
- Old saves without the fields load as toggle off with zero totals; a save from a toggle-on run that lacks `corpTk` is impossible (field added in the same release).

**Acceptance criteria**

- `node tools/check.js` passes, including new `tools/check/quota-burn.test.js` scenarios and updated month-end-scoring, company-tech-stack and play-analytics assertions.
- `SIM_N=100 SIM_SEED=101 node tools/sim.js` and `SIM_INVEST=1` with the same seed print byte-identical output before and after the change.
- Calibration numbers recorded in docs/DESIGN.md with the user's choice.
- Manual browser check at 400px and desktop: toggle, usage row, receipt lines, both languages.

**Scope boundaries**

- In scope: toggle, usage tracking, display, bonus, grades, best key, GA, rules modal, dictionaries, save, sim switches, docs.
- Out of scope: ticket volume, penalties, personal API, local models, new events.

## Risks / Trade-offs

- [Big plans cannot be filled by ticket volume] → task 1 measures it; underfilled big plans are the intended trade-off, but if even Max 5× cannot be filled the user decides whether to add tickets.
- [Seat value estimate is off] → seats are free to the player, so their value only sets how much an unused seat hurts; task 1 reports the seat share of the total.
- [Burn bonus rewards strict review + high effort on easy tickets, which the base game treats as waste] → that is the intended challenge; the bonus target (+5%～+20%) keeps tickets as the main score.
- [Week-close logic runs even with the toggle off] → no randomness, so fixed-seed outputs stay identical; verified in acceptance.
