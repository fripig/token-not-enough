## MODIFIED Requirements

### Requirement: Investment purchase

The game SHALL offer these investments, each purchasable once per run (寫 CLAUDE.md once per stack for each of the four company stacks and fe), costing player hours and company API budget:

| Investment | Hours | Company budget |
| --- | --- | --- |
| 寫 CLAUDE.md | 3 | NT$300 |
| 單元測試 | 4 | NT$400 |
| CI 流水線 | 3 | NT$300 |
| pre-commit／lint hook | 2 | NT$200 |
| secret scanning／脫敏 | 3 | NT$300 |
| 上架自動化（fastlane） | 3 | NT$400 |
| 監控告警 | 3 | NT$400 |
| 做 skills | 3 | NT$400 |
| 接 MCP 文件 | 3 | NT$400 |
| 導入 SDD | 6 | NT$500 |

The hours and budget in this table are the initial values; the implementation SHALL keep this table in sync with any value changed by simulator tuning. A purchase SHALL be refused when already bought, when remaining hours are below the hour cost, or when the company API budget is below the budget cost. A purchase SHALL deduct the budget from the company API budget and count it in the day's company spend and the month's company bill. In parallel mode it SHALL advance the clock by the hour cost (background agents keep running and settle, and the PR review time of an agent that finishes during the investment is added on top, as with every other clock advance); in serial mode it SHALL subtract the hours. It SHALL NOT be blocked by a busy local GPU. Investments SHALL reset at the start of each run. The investment 補測試 SHALL NOT exist.

#### Scenario: Successful purchase

- **WHEN** the player buys 單元測試 with 8 hours left and NT$12,000 company budget in serial mode
- **THEN** 4 hours remain, company budget is NT$11,600 and 單元測試 shows 已完成

#### Scenario: Refusals

- **WHEN** a purchase is attempted in each case in the table
- **THEN** nothing changes

##### Example: refusal cases

| Case | State |
| --- | --- |
| already bought | 單元測試 already bought |
| not enough hours | 5 hours left, buying 導入 SDD |
| not enough budget | company budget NT$200, buying 寫 CLAUDE.md |

#### Scenario: New investment purchase

- **WHEN** the player buys 監控告警 with 8 hours left and NT$12,000 company budget in serial mode
- **THEN** 5 hours remain, company budget is NT$11,600 and 監控告警 shows 已完成

### Requirement: Tests effect

With 單元測試, the self-review catch rate SHALL increase by 0.10 (capped at 0.95) for review levels above 0. 單元測試 SHALL NOT change the merge conflict probability.

#### Scenario: Catch rate only

- **WHEN** 單元測試 is bought and CI 流水線 is not, Sonnet (capability 4) uses 自審, and two other agents are running at completion
- **THEN** catch rate is 0.87 and conflict probability is 0.2

### Requirement: Investment panel and summary

The main screen SHALL show an investment panel listing each investment with its hour and budget cost, its effect, and either a buy button or 已完成; 寫 CLAUDE.md SHALL list the selected stacks first (in the fixed order laravel, rails, rust, app), then the unselected company stacks, then fe. The other investments SHALL be listed in the order 單元測試, CI 流水線, pre-commit／lint hook, secret scanning／脫敏, 上架自動化（fastlane）, 監控告警, 做 skills, 接 MCP 文件, 導入 SDD. The dispatch panel SHALL show a hint line naming investment effects active for the selected ticket. The month-end summary SHALL show the number of investments made. The setup rules list SHALL describe presets and investments in one bullet.

#### Scenario: Month-end summary

- **WHEN** the run ends after buying CLAUDE.md for laravel, 單元測試 and CI 流水線
- **THEN** the summary shows 工程投資 3 項

#### Scenario: CLAUDE.md order with two stacks

- **WHEN** the run's stacks are rails and app
- **THEN** the CLAUDE.md buttons appear in the order rails, app, laravel, rust, fe

#### Scenario: Hint lines follow the ticket

- **WHEN** secret scanning, fastlane and 監控告警 are bought and the selected ticket is a sensitive laravel ticket that is not an incident and needs no store review
- **THEN** the hint line names secret scanning and does not name fastlane or 監控告警

## ADDED Requirements

### Requirement: CI pipeline effect

With CI 流水線, the merge conflict probability on completion in parallel mode SHALL be halved. CI 流水線 SHALL NOT change the self-review catch rate.

#### Scenario: Conflicts halved

- **WHEN** CI 流水線 is bought and two other agents are running when an agent completes
- **THEN** conflict probability is 0.1

### Requirement: Pre-commit hook effect

With pre-commit／lint hook, the PR review hours charged when an agent finishes in parallel mode SHALL be multiplied by 0.5, on top of the halving for self-review levels above 0. The investment description SHALL state that it only works in parallel mode.

#### Scenario: PR review time

- **WHEN** the hook is bought and a complexity 3 ticket finishes successfully in parallel mode
- **THEN** PR review takes the hours in the table

##### Example: review hours

| Review level | Without hook | With hook |
| --- | --- | --- |
| 不審核 | 0.6 | 0.3 |
| 自審 | 0.3 | 0.15 |

### Requirement: Secret scanning effect

With secret scanning／脫敏, the security audit probability for a sensitive ticket dispatched or evaluated with personal subscription or personal API SHALL be halved: 0.30 for Chinese vendors and 0.175 for other vendors. The dispatch panel warning and the quick-dispatch warning SHALL show the halved percentage. Audit risk for company API, team seats and local SHALL remain zero.

#### Scenario: Halved odds

- **WHEN** secret scanning is bought and a sensitive ticket is dispatched with personal API
- **THEN** audit odds are 0.175 for Claude Code and 0.30 for DeepSeek

### Requirement: Fastlane effect

With 上架自動化（fastlane）, the App Store rejection probability after a successful agent run on a store-review ticket SHALL be 0.1 instead of 0.2. The success rate shown in the dispatch panel and the App stack hint text SHALL use the same probability.

#### Scenario: Shown success with fastlane

- **WHEN** fastlane is bought and a store-review app ticket has raw success p and catch rate c
- **THEN** the shown success is (p + (1 − p) × c) × 0.9 and the hint says 10%

### Requirement: Monitoring effect

With 監控告警, an incident ticket created after the purchase SHALL be due the day after it is created, capped at day 20, and its KPI SHALL use an incident multiplier of 1.2 instead of 1.6 (the stack multiplier still applies); incidents already in the queue SHALL keep their due day and KPI. While 監控告警 is owned, each overdue incident ticket SHALL reduce trust by 4 instead of 8; overdue non-incident tickets SHALL still reduce trust by 4, and KPI loss SHALL be unchanged. The 流量暴增 event text SHALL say the incidents are due tomorrow when 監控告警 is owned.

#### Scenario: Deadline and penalty

- **WHEN** 監控告警 is bought and incidents are created on the days in the table
- **THEN** they are due as shown, a complexity 4 laravel incident created after the purchase has KPI round(KPI[4] × 1.2), and an incident that becomes overdue reduces trust by 4

##### Example: incident due day

| Created on day | Due day without monitoring | Due day with monitoring |
| --- | --- | --- |
| 5 | 5 | 6 |
| 20 | 20 | 20 |

#### Scenario: Queued incident keeps deadline

- **WHEN** an incident due today is in the queue and 監控告警 is bought later that day
- **THEN** the incident is still due today, and if it becomes overdue trust drops by 4
