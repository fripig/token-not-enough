## MODIFIED Requirements

### Requirement: Value-weighted usage

The game SHALL compute usage as used value ÷ total value in NT$ over three pools:

- Personal subscription: each week a vendor has a paid plan SHALL be worth plan price ÷ 4, using the plan in effect during that week; plan 不訂閱 SHALL be worth 0. The week's used value SHALL be its worth × min(1, tokens counted against the weekly quota ÷ (weekly cap × the vendor's quota modifier at the moment the week closes)).
- Team seat: each week a seat is approved SHALL be worth `BURN_SEAT_VALUE` ÷ 4 (NT$3,300 ÷ 4), with used value computed the same way with modifier 1. A seat approved on a Monday SHALL count from that week on.
- Company API budget: when the run's contract list is empty (see `corp-api-contracts`) this pool SHALL be left out (total 0, used 0). Otherwise total SHALL be company token spend + max(0, remaining company budget); used SHALL be min(total, company token spend). Company token spend SHALL include every token charge billed to the company API (dispatch, review segment, evaluation, research) and SHALL NOT include investment or hardware spending.

A week SHALL close at the Monday reset, before seat review; the fourth week SHALL be counted at month end without a reset. Usage SHALL be 0 when the total value is 0. Closing weeks SHALL NOT consume random numbers.

#### Scenario: Freeze and investments shrink the company total

- **WHEN** the company budget falls by the budget-freeze event or by investment purchases
- **THEN** the company pool's total shrinks by that amount and its used value is unchanged

#### Scenario: Overdraft counts as full

- **WHEN** company token spend is NT$12,400 and the remaining budget is −NT$400
- **THEN** the company pool's total is NT$12,400 and its used value is NT$12,400

#### Scenario: No contracted vendor leaves the company pool out

- **WHEN** the run's contract list is empty, the company budget is NT$11,000 after investments, and the subscription pools total NT$3,300 with NT$3,300 used
- **THEN** usage is 100%

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
