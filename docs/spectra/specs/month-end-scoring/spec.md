# month-end-scoring Specification

## Purpose

Turns the month into a score, a letter grade and a title, and shows a receipt of where the money, tokens and time went.

## Requirements

### Requirement: Score formula

Personal spend SHALL be subscription fees + personal API + outsourcing penalties + conference fees − outsourcing income; it SHALL be shown on the receipt and used for titles, and SHALL NOT affect the score. The score SHALL be round(KPI × 10 + trust × 4 − audits × 80). The receipt SHALL state 總分 = KPI × 10 + 信任 × 4 − 稽核次數 × 80.

#### Scenario: Score example

- **WHEN** a month ends with KPI 300, trust 50, personal spend NT$2,000 and 1 audit
- **THEN** the score is 3,120

#### Scenario: Personal spend does not change the score

- **WHEN** a month ends with KPI 300, trust 50, personal spend NT$16,250 (only OpenAI Pro 500) and 1 audit
- **THEN** the score is 3,120, the same as with personal spend NT$2,000

#### Scenario: Outsourcing income does not add score

- **WHEN** a month ends with KPI 0, trust 0, no audits, NT$3,000 outsourcing income, NT$1,000 penalties and NT$500 personal API
- **THEN** the score is 0

#### Scenario: Conference fees count as personal spend only

- **WHEN** a month ends with KPI 300, trust 50, subscription fees and personal API NT$2,000, conference fees NT$3,000 and 1 audit
- **THEN** personal spend is NT$5,000 and the score is 3,120, the same as without the conference fees

---
### Requirement: Grade

The grade SHALL be S at 4,300 or more, A at 3,300, B at 2,500, C at 1,700, and D below, with every threshold multiplied by 1.6 in parallel mode (6,880 / 5,280 / 4,000 / 2,720).

#### Scenario: Same score, different modes

- **WHEN** the score is 3,120
- **THEN** the grade is B in serial mode and C in parallel mode

##### Example: thresholds

| Mode | Score | Grade |
| --- | --- | --- |
| serial | 4,300 | S |
| serial | 4,299 | A |
| serial | 1,699 | D |
| parallel | 6,880 | S |
| parallel | 6,879 | A |
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
  - tools/check.js
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
