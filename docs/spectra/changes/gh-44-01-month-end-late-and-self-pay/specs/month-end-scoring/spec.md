## MODIFIED Requirements

### Requirement: Score formula

Personal spend SHALL be subscription fees + personal API + outsourcing penalties + conference fees; outsourcing income SHALL NOT be subtracted, so personal spend SHALL never be negative. It SHALL be shown on the receipt as 你自己掏的錢 and used for titles, and SHALL NOT affect the score. The score SHALL be round(KPI × 10 + trust × 4 − audits × 80). The receipt SHALL state 總分 = KPI × 10 + 信任 × 4 − 稽核次數 × 80.

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
