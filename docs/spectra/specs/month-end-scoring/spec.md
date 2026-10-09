# month-end-scoring Specification

## Purpose

Turns the month into a score, a letter grade and a title, and shows a receipt of where the money, tokens and time went.

## Requirements

### Requirement: Score formula

Personal spend SHALL be subscription fees + personal API + outsourcing penalties − outsourcing income. The score SHALL be round(KPI × 10 + trust × 4 + max(−12000, 8000 − personal spend) ÷ 8 − audits × 80), so the spend term stops deducting once personal spend passes NT$20,000. The receipt SHALL state 總分 = KPI × 10 + 信任 × 4 + 省下的個人預算 ÷ 8 − 稽核次數 × 80.

#### Scenario: Score example

- **WHEN** a month ends with KPI 300, trust 50, personal spend NT$2,000 and 1 audit
- **THEN** the score is 3,870

#### Scenario: Spend above the old NT$12,000 floor still counts

- **WHEN** a month ends with KPI 300, trust 50, personal spend NT$16,250 (only OpenAI Pro 500) and 1 audit
- **THEN** the spend term is −1,031.25 and the score is 2,089

#### Scenario: Overspending floor

- **WHEN** personal spend is NT$50,000
- **THEN** the spend term is −1,500, not −5,250

---
### Requirement: Grade

The grade SHALL be S at 4,600 or more, A at 3,800, B at 3,000, C at 2,200, and D below, with every threshold multiplied by 1.6 in parallel mode (7,360 / 6,080 / 4,800 / 3,520).

#### Scenario: Same score, different modes

- **WHEN** the score is 3,870
- **THEN** the grade is A in serial mode and C in parallel mode


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

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

After day 20 ends, the receipt modal SHALL show the grade, title, 個人訂閱月費, 個人 API 帳單, 你自己掏的錢, 公司 API 帳單, tokens and share per vendor used (沒有用到任何 agent when none), 完成工單, 逾期工單 N 張（KPI -X）, 自己手寫, 審核救回, 資安稽核, 主管信任, KPI, 總分, and 先前最佳 when a best score exists (best-score storage is defined in `company-tech-stack`). Lines owned by later features (outsourcing, traps, investments, merge conflicts, slot count) are defined in their specs. 再玩一個月 SHALL start a new run and open the opening modal with the previous mode, companies and options selected; 看看紀錄 SHALL close the receipt and disable the end-day button.

#### Scenario: Look at the log

- **WHEN** the player clicks 看看紀錄 on the receipt
- **THEN** the receipt closes and 下班，結束第 20 天 is disabled

<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->
