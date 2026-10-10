## MODIFIED Requirements

### Requirement: Score formula

Personal spend SHALL be subscription fees + personal API + outsourcing penalties + conference fees − outsourcing income. The score SHALL be round(KPI × 10 + trust × 4 + max(−12000, 8000 − personal spend) ÷ 8 − audits × 80), so the spend term stops deducting once personal spend passes NT$20,000. The receipt SHALL state 總分 = KPI × 10 + 信任 × 4 + 省下的個人預算 ÷ 8 − 稽核次數 × 80.

#### Scenario: Score example

- **WHEN** a month ends with KPI 300, trust 50, personal spend NT$2,000 and 1 audit
- **THEN** the score is 3,870

#### Scenario: Conference fees count as personal spend

- **WHEN** a month ends with KPI 300, trust 50, subscription fees and personal API NT$2,000, conference fees NT$3,000 and 1 audit
- **THEN** personal spend is NT$5,000 and the score is 3,495

#### Scenario: Spend above the old NT$12,000 floor still counts

- **WHEN** a month ends with KPI 300, trust 50, personal spend NT$16,250 (only OpenAI Pro 500) and 1 audit
- **THEN** the spend term is −1,031.25 and the score is 2,089

#### Scenario: Overspending floor

- **WHEN** personal spend is NT$50,000
- **THEN** the spend term is −1,500, not −5,250

---

### Requirement: Receipt

After day 20 ends, the receipt modal SHALL show the grade, title, 個人訂閱月費, 個人 API 帳單, 你自己掏的錢, 公司 API 帳單, tokens and share per vendor used (沒有用到任何 agent when none), 完成工單, 逾期工單 N 張（KPI -X）, 自己手寫, 審核救回, 資安稽核, 主管信任, KPI, 總分, and 先前最佳 when a best score exists (best-score storage is defined in `company-tech-stack`). When at least one conference was registered, it SHALL also show 研討會 N 場 (attended conferences) and 研討會報名費 NT$X. Lines owned by later features (outsourcing, traps, investments, merge conflicts, slot count) are defined in their specs. 再玩一個月 SHALL start a new run and open the opening modal with the previous mode, companies and options selected; 看看紀錄 SHALL close the receipt and disable the end-day button.

#### Scenario: Look at the log

- **WHEN** the player clicks 看看紀錄 on the receipt
- **THEN** the receipt closes and 下班，結束第 20 天 is disabled

#### Scenario: Conference lines

- **WHEN** the run ends after attending COSCUP and HITCON with fees NT$0 and NT$5,500
- **THEN** the receipt shows 研討會 2 場 and 研討會報名費 NT$5,500; a run without registrations shows neither line
