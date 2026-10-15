## MODIFIED Requirements

### Requirement: Score formula

Personal spend SHALL be subscription fees + personal API + outsourcing penalties + conference fees; outsourcing income SHALL NOT be subtracted, so personal spend SHALL never be negative. It SHALL be shown on the receipt as 你自己掏的錢 and used for titles, and SHALL NOT affect the score. The score SHALL be round(KPI × 10 + trust × 4 − audits × 80). The receipt SHALL state 總分 = KPI × 10 + 信任 × 4 − 稽核次數 × 80. When the usage challenge toggle is on, the score SHALL also add the usage bonus defined in `quota-burn`.

#### Scenario: Score example

- **WHEN** a month ends with KPI 300, trust 50, personal spend NT$2,000 and 1 audit
- **THEN** the score is 3,120

#### Scenario: Personal spend does not change the score

- **WHEN** a month ends with KPI 300, trust 50, personal spend NT$16,250 (only OpenAI Pro 500) and 1 audit
- **THEN** the score is 3,120, the same as with personal spend NT$2,000

#### Scenario: Outsourcing income does not add score

- **WHEN** a month ends with KPI 0, trust 0, no audits, NT$3,000 outsourcing income, NT$1,000 penalties and NT$500 personal API
- **THEN** the score is 0 and personal spend is NT$1,500

#### Scenario: Conference fees count as personal spend only

- **WHEN** a month ends with KPI 300, trust 50, subscription fees and personal API NT$2,000, conference fees NT$3,000 and 1 audit
- **THEN** personal spend is NT$5,000 and the score is 3,120, the same as without the conference fees

#### Scenario: Self-pay title ignores outsourcing income

- **WHEN** a month ends with no audits, subscription fees NT$8,125 and outsourcing income NT$68,000
- **THEN** personal spend is NT$8,125 and the title is 自費養 AI 的勇者

---
### Requirement: Grade

The grade SHALL use thresholds per mode. In serial mode it SHALL be S at 3,800 or more, A at 2,400, B at 1,400, C at 500, and D below. In parallel mode it SHALL be S at 9,500 or more, A at 5,280, B at 4,000, C at 2,720, and D below. Parallel thresholds SHALL NOT be derived from the serial ones. When the usage challenge toggle is on, the grade SHALL use the thresholds defined in `quota-burn` instead.

#### Scenario: Same score, different modes

- **WHEN** the score is 3,120
- **THEN** the grade is A in serial mode and C in parallel mode

#### Scenario: Parallel S boundary

- **WHEN** a parallel-mode month ends with score 9,500
- **THEN** the grade is S, and with 9,499 it is A

##### Example: thresholds

| Mode | Score | Grade |
| --- | --- | --- |
| serial | 3,800 | S |
| serial | 3,799 | A |
| serial | 2,400 | A |
| serial | 1,400 | B |
| serial | 500 | C |
| serial | 499 | D |
| parallel | 9,500 | S |
| parallel | 9,499 | A |
| parallel | 5,280 | A |
| parallel | 4,000 | B |
| parallel | 2,720 | C |
| parallel | 2,719 | D |
