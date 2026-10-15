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
| 交叉審核工具 | 2 | NT$200 |

寫 CLAUDE.md (per stack), 單元測試, secret scanning／脫敏 and 做 skills SHALL also have a level 2 costing 1 hour and NT$200, purchasable once level 1 is owned and the matching conference was attended: a 技術線場 conference covering that stack for CLAUDE.md, a 綜合場 conference for 單元測試, a 資安場 conference for secret scanning and an AI 場 conference for 做 skills. 導入 SDD SHALL also have a level 2 (SDD 框架) costing 1 hour and NT$200, purchasable once level 1 is owned, with no conference requirement. 提升 agent 能力 is defined in its own requirement. 交叉審核工具 SHALL have only level 1, SHALL need no conference, and its effect is defined in `cross-model-review`.

The hours and budget in this section are the initial values; the implementation SHALL keep them in sync with any value changed by simulator tuning. A purchase SHALL be refused when the highest level is already owned, when the next level is locked, when remaining hours are below the hour cost, or when the company API budget is below the budget cost. A purchase SHALL deduct the budget from the company API budget and count it in the day's company spend and the month's company bill. In parallel mode, pressing the investment-tab button of a written investment (as listed in `agent-investments`) SHALL create an investment ticket instead of purchasing, and the purchase defined here SHALL happen when that ticket is hand-written; buttons of the other investments purchase directly. A purchase in parallel mode SHALL advance the clock by the hour cost (background agents keep running and settle, and the PR review time of an agent that finishes during the investment is added on top, as with every other clock advance); in serial mode it SHALL subtract the hours. It SHALL NOT be blocked by a busy local GPU. Effects defined in this spec are the values at quality 100%; every owned level purchased here SHALL have quality 100%, and lower qualities from agent-built levels scale them as defined in `agent-investments`. Investments SHALL reset at the start of each run. The investment 補測試 SHALL NOT exist.

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
| not enough hours for SDD level 2 | 導入 SDD level 1 owned, 0.5 hours left |
| not enough budget | company budget NT$200, buying 寫 CLAUDE.md |

#### Scenario: Level 2 purchase

- **WHEN** 單元測試 level 1 is owned, HWDC was attended, and the player buys 單元測試 level 2 with 8 hours left and NT$11,600 company budget in serial mode
- **THEN** 7 hours remain, company budget is NT$11,400 and 單元測試 shows 已完成

#### Scenario: SDD level 2 without a conference

- **WHEN** 導入 SDD level 1 is owned, no conference was attended, and the player buys 導入 SDD level 2 with 8 hours left and NT$11,500 company budget in serial mode
- **THEN** 7 hours remain, company budget is NT$11,300, 導入 SDD shows 已完成 and a GA `invest` event is sent with `investment` `sdd2`

#### Scenario: New investment purchase

- **WHEN** the player buys 監控告警 with 8 hours left and NT$12,000 company budget in serial mode
- **THEN** 5 hours remain, company budget is NT$11,600 and 監控告警 shows 已完成

#### Scenario: Cross-review tool purchase

- **WHEN** the player buys 交叉審核工具 with 8 hours left and NT$12,000 company budget in serial mode, without any conference attended
- **THEN** 6 hours remain, company budget is NT$11,800, 交叉審核工具 shows 已完成 and a GA `invest` event is sent with `investment` `xreview`

#### Scenario: Parallel-mode button opens a ticket

- **WHEN** in parallel mode the player presses the 單元測試 button with 8 hours left and NT$12,000 company budget
- **THEN** 8 hours remain, company budget is NT$12,000, 單元測試 is still not owned and the queue holds one 單元測試 investment ticket
