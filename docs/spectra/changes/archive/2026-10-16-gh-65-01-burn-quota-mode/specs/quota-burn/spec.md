## Purpose

An opt-in challenge (用量挑戰) that rewards using up the paid-for token pools within the month: personal subscriptions, team seats and the company API budget. It adds a value-weighted usage bonus to the month-end score, with its own grade thresholds and best-score keys.

## ADDED Requirements

### Requirement: Usage challenge toggle

The opening setup modal SHALL show a 用量挑戰 section with the options 不挑戰 and 挑戰用滿, separate from the work-content selection, the outsourcing toggle and the advanced-mode toggle. The default SHALL be 不挑戰. The choice SHALL be stored as `S.burn` and SHALL persist to the next run started with 再玩一個月; a stored value that is not a boolean SHALL fall back to 不挑戰. Changing only this toggle SHALL NOT regenerate day-1 tickets. The weekly subscription adjustment modal SHALL NOT show the toggle. The toggle SHALL be available in both serial and parallel mode.

#### Scenario: Default off and persistence

- **WHEN** a first run opens the setup modal, the player selects 挑戰用滿, plays to the month end and presses 再玩一個月
- **THEN** the first modal showed 不挑戰 selected, and the new run's setup modal shows 挑戰用滿 selected

#### Scenario: Toggle does not regenerate tickets

- **WHEN** the player switches between 不挑戰 and 挑戰用滿 in the setup modal
- **THEN** the day-1 ticket queue keeps the same ticket ids and titles

#### Scenario: Toggle off changes nothing

- **WHEN** a run ends with the toggle off
- **THEN** the score, grade, best-score key and receipt lines are the same as without this capability

---
### Requirement: Value-weighted usage

The game SHALL compute usage as used value ÷ total value in NT$ over three pools:

- Personal subscription: each week a vendor has a paid plan SHALL be worth plan price ÷ 4, using the plan in effect during that week; plan 不訂閱 SHALL be worth 0. The week's used value SHALL be its worth × min(1, tokens counted against the weekly quota ÷ (weekly cap × the vendor's quota modifier at the moment the week closes)).
- Team seat: each week a seat is approved SHALL be worth `BURN_SEAT_VALUE` ÷ 4 (NT$3,300 ÷ 4), with used value computed the same way with modifier 1. A seat approved on a Monday SHALL count from that week on.
- Company API budget: total SHALL be company token spend + max(0, remaining company budget); used SHALL be min(total, company token spend). Company token spend SHALL include every token charge billed to the company API (dispatch, review segment, evaluation, research) and SHALL NOT include investment or hardware spending.

A week SHALL close at the Monday reset, before seat review; the fourth week SHALL be counted at month end without a reset. Usage SHALL be 0 when the total value is 0. Closing weeks SHALL NOT consume random numbers.

#### Scenario: Freeze and investments shrink the company total

- **WHEN** the company budget falls by the budget-freeze event or by investment purchases
- **THEN** the company pool's total shrinks by that amount and its used value is unchanged

#### Scenario: Overdraft counts as full

- **WHEN** company token spend is NT$12,400 and the remaining budget is −NT$400
- **THEN** the company pool's total is NT$12,400 and its used value is NT$12,400

#### Scenario: Personal API is not counted

- **WHEN** a run's only token spending is NT$3,000 of personal API
- **THEN** the usage bonus is 0

##### Example: month usage

| Pool | Weeks | Worth | Used |
| --- | --- | --- | --- |
| Anthropic Max 5× (NT$3,300) | 4 weeks at 100%, 50%, 100%, 50% of 9,000k | NT$3,300 | NT$2,475 |
| Seat approved day 6 | 3 weeks at 80% of 10,000k | NT$2,475 | NT$1,980 |
| Company API | spend NT$9,000, NT$3,000 left | NT$12,000 | NT$9,000 |
| Total | | NT$17,775 | NT$13,455 (75.7%) |

---
### Requirement: Usage display

When `S.burn` is on, the quota area SHALL show one row 用量 NT$X / NT$Y（N%）above the per-vendor quota boxes, where X and Y are the used and total value with the current week counted as if it closed now, and N is the rounded percentage. When `S.burn` is off the row SHALL NOT be shown.

#### Scenario: Day 1 display

- **WHEN** a run with the toggle on, Max 5× and no company spend starts day 1
- **THEN** the row shows 用量 NT$0 / NT$12,825（0%）

---
### Requirement: Usage bonus and receipt

When `S.burn` is on, the month-end score SHALL add round(`BURN_PTS[mode]` × usage), with `BURN_PTS` serial 500 and parallel 4,000. The receipt SHALL add the lines 用量挑戰 NT$X / NT$Y（N%）and 用量加分 +B, and the formula line SHALL append + 用量 × `BURN_PTS[mode]`. Grades SHALL use `GRADES.burnSerial` [3,900, 2,500, 1,500, 600] and `GRADES.burnParallel` [12,300, 7,880, 6,600, 5,320] for S, A, B, C, with D below C.

#### Scenario: Parallel bonus

- **WHEN** a parallel run with the toggle on ends with KPI 700, trust 50, no audits and the month usage of the example above (75.7%)
- **THEN** the bonus is 3,028, the score is 10,228 and the grade is A

#### Scenario: Serial grade boundary

- **WHEN** a serial run with the toggle on ends with score 3,900
- **THEN** the grade is S, and with 3,899 it is A
