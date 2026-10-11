## MODIFIED Requirements

### Requirement: Outsourcing pay and late penalty

An outsourced ticket's pay SHALL be its KPI value × 250 in NT$. Finishing it SHALL add the pay to the personal wallet and to the month's outsourcing income, SHALL NOT add KPI, and SHALL NOT change trust. When an outsourced ticket is overdue at the end of a day (its deadline is on or before that day), the player SHALL pay a penalty of 30% of its pay (rounded) from the wallet, KPI and trust SHALL NOT change, and the ticket SHALL leave the queue. When day 20 ends, outsourced tickets with a deadline after day 20 SHALL NOT be overdue and SHALL NOT cost a penalty. The late penalty SHALL be deducted in full even when it takes the wallet below NT$0; it is the only charge allowed to do so. Manager re-scoping SHALL NOT be offered for outsourced tickets.

#### Scenario: Pay values

- **WHEN** outsourced tickets in the table are finished
- **THEN** the wallet grows by the pay and KPI is unchanged

##### Example: pay by stack and complexity

| Stack | Complexity | KPI | Pay |
| --- | --- | --- | --- |
| laravel | 1 | 3 | NT$750 |
| laravel | 2 | 6 | NT$1,500 |
| rust | 2 | 8 | NT$2,000 |
| fe | 4 | 16 | NT$4,000 |
| laravel | 5 | 24 | NT$6,000 |

#### Scenario: Late penalty

- **WHEN** a laravel complexity 2 outsourced ticket (pay NT$1,500) is still in the queue at the end of its due day
- **THEN** the wallet drops by NT$450, KPI and trust are unchanged, and the ticket is removed

#### Scenario: Late penalty below zero

- **WHEN** the wallet is NT$100 and a laravel complexity 2 outsourced ticket (pay NT$1,500) becomes overdue
- **THEN** the wallet is −NT$350 and 個人 API is disabled with the note 錢包見底 until the wallet is above NT$0

#### Scenario: No penalty for gigs due after the month

- **WHEN** day 20 ends with an outsourced ticket (pay NT$1,500) due on day 21 in the queue
- **THEN** the wallet is unchanged, the outsourcing late count does not rise and no `外包逾期` line is logged

#### Scenario: No re-scoping

- **WHEN** an outsourced trap ticket is revealed
- **THEN** the dispatch panel shows no 找主管重新評估 button

### Requirement: Outsourcing on the receipt

The month-end personal spend is defined in `month-end-scoring` and does not subtract outsourcing income; it is shown as 你自己掏的錢 and SHALL NOT affect the score. When outsourcing was on, the receipt SHALL show 外包收入, 外包違約金, 外包完成 and 外包逾期 lines, and a 個人淨收支 line equal to outsourcing income minus personal spend, signed (`+NT$X` when positive, `-NT$X` when negative, `±NT$0` when zero). When outsourcing was off the receipt SHALL NOT show 個人淨收支.

#### Scenario: Receipt

- **WHEN** a run with outsourcing on ends with NT$3,300 subscription fees, NT$1,000 personal API, NT$7,500 outsourcing income, NT$450 penalties, 4 gigs done and 1 late
- **THEN** 你自己掏的錢 shows NT$4,750, 個人淨收支 shows +NT$2,750, and the receipt lists 外包收入 NT$7,500, 外包違約金 NT$450, 外包完成 4 張, 外包逾期 1 張, and the score is the same as with outsourcing income NT$0

##### Example: net balance sign

| Spend | Outsourcing income | 你自己掏的錢 | 個人淨收支 |
| --- | --- | --- | --- |
| NT$16,386 | NT$68,000 | NT$16,386 | +NT$51,614 |
| NT$4,000 | NT$2,000 | NT$4,000 | -NT$2,000 |
| NT$1,500 | NT$1,500 | NT$1,500 | ±NT$0 |
