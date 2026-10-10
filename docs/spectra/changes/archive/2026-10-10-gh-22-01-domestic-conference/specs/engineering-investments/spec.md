## ADDED Requirements

### Requirement: Domestic conference registration

The investment panel SHALL list ten domestic conferences in this order, each with its category, covered stacks and ticket fee:

| Key | Name | Category | Covered stacks |
| --- | --- | --- | --- |
| iplayground | iPlayground | 技術線場 | app |
| mopcon | MOPCON×JSDC | 技術線場 | app, fe |
| devopsdays | DevOpsDays Taipei | 技術線場 | sre, devops |
| kubesummit | KubeSummit | 技術線場 | sre, devops |
| coscup | COSCUP | 技術線場 | rails, rust |
| webconf | WebConf Taiwan | 技術線場 | laravel, fe |
| hitcon | HITCON | 資安場 | none |
| cybersec | CYBERSEC 臺灣資安大會 | 資安場 | none |
| taiwanai | 台灣人工智慧年會 | AI 場 | none |
| hwdc | Hello World Dev Conference | 綜合場 | none |

Fees SHALL come from one table in the code, and `docs/DESIGN.md` SHALL state for each fee whether it was checked against an official page or is an estimate. Registration SHALL deduct the fee from the personal wallet, add it to the month's conference fees, cost no hours, ignore trust and work while the local GPU is busy. Registration SHALL be refused when the day is above 15, when another registration is pending, when the conference was already attended, or when the wallet is below the fee. A registered conference SHALL show 已報名・週末出席 and every other conference SHALL show the pending-registration refusal until the registration is processed. Registration SHALL write the action log line `★ 報名研討會：<name>｜自費 NT$<fee>｜週末出席`.

#### Scenario: Register on a weekday

- **WHEN** on day 3 with NT$8,000 in the wallet and no pending registration the player registers for WebConf Taiwan with fee F
- **THEN** the wallet is NT$8,000 − F, hours are unchanged, trust is unchanged and WebConf Taiwan shows 已報名・週末出席

#### Scenario: Registration refusals

- **WHEN** registration is attempted in each case in the table
- **THEN** nothing changes and no GA event is sent

##### Example: refusal cases

| Case | State |
| --- | --- |
| registration closed | day 16 |
| pending registration | HITCON registered on day 2, registering COSCUP on day 4 |
| already attended | COSCUP attended, registering COSCUP on day 8 |
| wallet too low | wallet NT$1,000, registering a conference with fee NT$3,000 |

---

### Requirement: Conference attendance

When the day changes to a Monday (day 6, 11 or 16) and a registration is pending, the conference SHALL become attended before the random event of that morning, the registration SHALL be cleared, and the morning report and action log SHALL state 週末參加了 <name> followed by what it unlocked (hand-writing speed-up for covered stacks, the level 2 investments it opens, and the 提升 agent 能力 level now available). A run SHALL attend at most 3 conferences. Attendance SHALL NOT change KPI, trust, wallet, company budget or hours.

#### Scenario: Attend at the weekend

- **WHEN** HITCON is registered on day 5 and the player ends day 5
- **THEN** on day 6 HITCON is attended, no registration is pending, and the morning report names HITCON, secret scanning Lv2 and 提升 agent 能力 Lv1

#### Scenario: Registration on day 15

- **WHEN** COSCUP is registered on day 15 and the player ends day 15
- **THEN** on day 16 COSCUP is attended

---

### Requirement: Tech-stack conference effect

After attending a 技術線場 conference, each of its covered stacks SHALL count as familiar for unfamiliarity (see `company-tech-stack`) and hand-writing a ticket of a covered stack SHALL take 0.8 × the hours it would otherwise take (see `ticket-lifecycle`). Conferences of other categories SHALL have no immediate effect.

#### Scenario: COSCUP for a Laravel player

- **WHEN** a Laravel 後端 player has attended COSCUP and selects a complexity 2 rust ticket with no previous tries
- **THEN** the manual button shows 3.5h and the card shows no 不熟 chip

---

### Requirement: Agent capability investment

The game SHALL offer 提升 agent 能力 with levels 1 to 3, each costing 1 hour and NT$200 company budget (tuned by simulator measurement). Level N SHALL be purchasable only after attending at least N conferences of any category and owning level N − 1. Each owned level SHALL add 0.08 to the base success chance of every agent dispatch before clamping to 0.05–0.97. Architecture evaluation and hand-writing SHALL NOT be affected.

#### Scenario: Two levels

- **WHEN** two conferences were attended, 提升 agent 能力 level 2 is owned and a complexity 4 fe ticket is estimated with Sonnet without review
- **THEN** success is 0.96

#### Scenario: Locked level

- **WHEN** one conference was attended and level 1 is owned
- **THEN** level 2 cannot be bought and the button states that 2 conferences are needed

---

### Requirement: Investment levels in saves

Investment ownership SHALL be stored as levels. A save written before this change, with boolean investment flags and no conference data, SHALL load with `true` as level 1, `false` as level 0, no attended or pending conference, conference fees 0 and 提升 agent 能力 level 0, without changing the save structure version.

#### Scenario: Old save

- **WHEN** a save with 單元測試 `true`, CLAUDE.md for laravel `true` and no conference fields is loaded
- **THEN** 單元測試 is level 1, CLAUDE.md for laravel is level 1, the catch rate matches level 1 and the save is not rejected

## MODIFIED Requirements

### Requirement: Investment purchase

The game SHALL offer these investments, each purchasable once per run at level 1 (寫 CLAUDE.md once per stack for each company stack and fe), costing player hours and company API budget:

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

寫 CLAUDE.md (per stack), 單元測試, secret scanning／脫敏 and 做 skills SHALL also have a level 2 costing 1 hour and NT$200, purchasable once level 1 is owned and the matching conference was attended: a 技術線場 conference covering that stack for CLAUDE.md, a 綜合場 conference for 單元測試, a 資安場 conference for secret scanning and an AI 場 conference for 做 skills. 提升 agent 能力 is defined in its own requirement.

The hours and budget in this table are the initial values; the implementation SHALL keep this table in sync with any value changed by simulator tuning. A purchase SHALL be refused when the highest level is already owned, when the next level is locked, when remaining hours are below the hour cost, or when the company API budget is below the budget cost. A purchase SHALL deduct the budget from the company API budget and count it in the day's company spend and the month's company bill. In parallel mode it SHALL advance the clock by the hour cost (background agents keep running and settle, and the PR review time of an agent that finishes during the investment is added on top, as with every other clock advance); in serial mode it SHALL subtract the hours. It SHALL NOT be blocked by a busy local GPU. Investments SHALL reset at the start of each run. The investment 補測試 SHALL NOT exist.

#### Scenario: Successful purchase

- **WHEN** the player buys 單元測試 with 8 hours left and NT$12,000 company budget in serial mode
- **THEN** 4 hours remain, company budget is NT$11,600 and 單元測試 shows its level 2 button with the locked reason

#### Scenario: Refusals

- **WHEN** a purchase is attempted in each case in the table
- **THEN** nothing changes

##### Example: refusal cases

| Case | State |
| --- | --- |
| already at the highest level | 監控告警 already bought |
| level 2 locked | 單元測試 level 1 owned, no 綜合場 conference attended |
| level 2 without level 1 | HITCON attended, secret scanning not bought |
| not enough hours | 5 hours left, buying 導入 SDD |
| not enough budget | company budget NT$200, buying 寫 CLAUDE.md |

#### Scenario: Level 2 purchase

- **WHEN** 單元測試 level 1 is owned, HWDC was attended, and the player buys 單元測試 level 2 with 8 hours left and NT$11,600 company budget in serial mode
- **THEN** 7 hours remain, company budget is NT$11,400 and 單元測試 shows 已完成

#### Scenario: New investment purchase

- **WHEN** the player buys 監控告警 with 8 hours left and NT$12,000 company budget in serial mode
- **THEN** 5 hours remain, company budget is NT$11,600 and 監控告警 shows 已完成

---

### Requirement: CLAUDE.md effect

For a ticket whose stack has CLAUDE.md, agent token estimates SHALL be multiplied by 0.85 and the base success chance SHALL increase by 0.06 at level 1 or 0.15 at level 2, before clamping to 0.05–0.97.

#### Scenario: Laravel CLAUDE.md

- **WHEN** CLAUDE.md is bought for laravel and a complexity 4 laravel ticket is estimated with Sonnet without review
- **THEN** tokens are 0.85 × the estimate without the investment and success is 0.86 instead of 0.80

#### Scenario: Laravel CLAUDE.md level 2

- **WHEN** CLAUDE.md level 2 is owned for laravel and a complexity 4 laravel ticket is estimated with Sonnet without review
- **THEN** tokens are 0.85 × the estimate without the investment and success is 0.95

#### Scenario: Other stack unaffected

- **WHEN** CLAUDE.md is bought for laravel and a fe ticket is estimated
- **THEN** the estimate equals the estimate without the investment

---

### Requirement: Tests effect

With 單元測試, the self-review catch rate SHALL increase by 0.10 at level 1 or 0.20 at level 2 (capped at 0.95) for review levels above 0. 單元測試 SHALL NOT change the merge conflict probability.

#### Scenario: Catch rate only

- **WHEN** 單元測試 is bought and CI 流水線 is not, Sonnet (capability 4) uses 自審, and two other agents are running at completion
- **THEN** catch rate is 0.87 and conflict probability is 0.2

#### Scenario: Level 2 catch rate

- **WHEN** 單元測試 level 2 is owned and Sonnet (capability 4) uses 自審
- **THEN** catch rate is 0.95 (the cap) with Sonnet (capability 4) and 0.81 with Gemini Flash (capability 2)

---

### Requirement: Secret scanning effect

With secret scanning／脫敏, the security audit probability for a sensitive ticket dispatched or evaluated with personal subscription or personal API SHALL be multiplied by 0.5 at level 1 or 0.25 at level 2. The dispatch panel warning and the quick-dispatch warning SHALL show the reduced percentage. Audit risk for company API, team seats and local SHALL remain zero.

#### Scenario: Reduced odds

- **WHEN** secret scanning is owned and a sensitive ticket is dispatched with personal API
- **THEN** audit odds follow the table

##### Example: audit odds by level

| Level | Claude Code | DeepSeek |
| --- | --- | --- |
| 1 | 0.175 | 0.30 |
| 2 | 0.0875 | 0.15 |

---

### Requirement: Batch dispatch unlocked by skills

With 做 skills, the queue SHALL show a batch dispatch button that one-click dispatches every non-running ticket with shown complexity 2 or lower at level 1, or 3 or lower at level 2, in queue order (earliest due first, then higher KPI), using each ticket's first usable preset. It SHALL skip tickets with no usable preset, SHALL stop when no work slot is free or fewer than 0.2 hours remain in parallel mode, and in serial mode SHALL stop when the next ticket's estimated hours exceed remaining hours. It SHALL log one summary line with dispatched and skipped counts. Without 做 skills the button SHALL NOT appear.

#### Scenario: Batch in parallel mode

- **WHEN** skills are bought, 3 slots are free and the queue holds complexity 1, 2, 3 and 2 tickets
- **THEN** the three complexity ≤2 tickets are dispatched and the complexity 3 ticket stays in the queue

#### Scenario: Batch at level 2

- **WHEN** skills level 2 is owned, 4 slots are free and the queue holds complexity 1, 3, 4 and 2 tickets
- **THEN** the complexity 1, 3 and 2 tickets are dispatched and the complexity 4 ticket stays in the queue

---

### Requirement: Investment panel and summary

The main screen SHALL show an investment panel listing each investment with its hour and budget cost, its effect, and a buy button for the next level, a locked reason, or 已完成; 寫 CLAUDE.md SHALL list the selected stacks first (in the fixed order laravel, rails, rust, app, sre, devops), then the unselected company stacks, then fe. The other investments SHALL be listed in the order 單元測試, CI 流水線, pre-commit／lint hook, secret scanning／脫敏, 上架自動化（fastlane）, 監控告警, 做 skills, 接 MCP 文件, 導入 SDD, 提升 agent 能力, followed by the 國內研討會 row. Investments with a level 2 SHALL show both levels' effects. The dispatch panel SHALL show a hint line naming investment effects active for the selected ticket, including the level 2 values and 提升 agent 能力 when owned. The month-end summary SHALL show the number of investment purchases made, counting each level as one. The setup rules list SHALL describe presets, investments and conferences in one bullet.

#### Scenario: Month-end summary

- **WHEN** the run ends after buying CLAUDE.md for laravel, 單元測試 level 1 and level 2, and CI 流水線
- **THEN** the summary shows 工程投資 4 項

#### Scenario: CLAUDE.md order with two stacks

- **WHEN** the run's stacks are rails and app
- **THEN** the CLAUDE.md buttons appear in the order rails, app, laravel, rust, sre, devops, fe

#### Scenario: Hint lines follow the ticket

- **WHEN** secret scanning, fastlane and 監控告警 are bought and the selected ticket is a sensitive laravel ticket that is not an incident and needs no store review
- **THEN** the hint line names secret scanning and does not name fastlane or 監控告警
