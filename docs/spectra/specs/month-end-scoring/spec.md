# month-end-scoring Specification

## Purpose

Turns the month into a score, a letter grade and a title, and shows a receipt of where the money, tokens and time went.

## Requirements

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

---
### Requirement: Title

The receipt SHALL show the first matching title: 資安部門的常客 (2 or more audits), 自費養 AI 的勇者 (personal spend above NT$7,000), 公司帳單上的頭號人物 (company bill above NT$10,500), 對岸模型省錢達人 (DeepSeek, 智譜 GLM and Kimi above 40% of tokens), 地端信仰者 (local above 40% of tokens), 手工藝工程師 (more than 12 hand-written attempts), Token 精算師 (grade S or A), otherwise 還在摸索的開發者.

#### Scenario: Audits take precedence

- **WHEN** a month ends with 2 audits and grade S
- **THEN** the title is 資安部門的常客

#### Scenario: Default title

- **WHEN** no rule matches and the grade is C
- **THEN** the title is 還在摸索的開發者


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check/month-end-scoring.test.js
  - tools/fake-dom.js
-->

---
### Requirement: Receipt

After day 20 ends, the receipt modal SHALL show the grade, title, 個人訂閱月費, 個人 API 帳單, 你自己掏的錢, 月底錢包餘額, 公司 API 帳單, tokens and share per vendor used (沒有用到任何 agent when none), 完成工單, 逾期工單 N 張（KPI -X）, 自己手寫, 審核救回, 資安稽核, 主管信任, KPI, 總分, and 先前最佳 when a best score exists (best-score storage is defined in `company-tech-stack`). When at least one conference was registered, it SHALL also show 研討會 N 場 (attended conferences) and 研討會報名費 NT$X. Lines owned by later features (outsourcing, traps, investments, merge conflicts, slot count) are defined in their specs. 再玩一個月 SHALL start a new run and open the opening modal with the previous mode, companies and options selected; 看看紀錄 SHALL close the receipt and disable the end-day button.

#### Scenario: Look at the log

- **WHEN** the player clicks 看看紀錄 on the receipt
- **THEN** the receipt closes and 下班，結束第 20 天 is disabled

#### Scenario: Wallet balance on the receipt

- **WHEN** a month ends with the wallet at NT$5,430
- **THEN** the receipt shows 月底錢包餘額 NT$5,430 and the score does not depend on it

#### Scenario: Conference lines

- **WHEN** the run ends after attending COSCUP and HITCON with fees NT$0 and NT$6,000
- **THEN** the receipt shows 研討會 2 場 and 研討會報名費 NT$6,000; a run without registrations shows neither line
