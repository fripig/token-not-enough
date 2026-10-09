## MODIFIED Requirements

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
