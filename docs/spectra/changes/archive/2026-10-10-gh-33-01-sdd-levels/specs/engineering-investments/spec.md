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

寫 CLAUDE.md (per stack), 單元測試, secret scanning／脫敏 and 做 skills SHALL also have a level 2 costing 1 hour and NT$200, purchasable once level 1 is owned and the matching conference was attended: a 技術線場 conference covering that stack for CLAUDE.md, a 綜合場 conference for 單元測試, a 資安場 conference for secret scanning and an AI 場 conference for 做 skills. 導入 SDD SHALL also have a level 2 (SDD 框架) costing 1 hour and NT$200, purchasable once level 1 is owned, with no conference requirement. 提升 agent 能力 is defined in its own requirement.

The hours and budget in this section are the initial values; the implementation SHALL keep them in sync with any value changed by simulator tuning. A purchase SHALL be refused when the highest level is already owned, when the next level is locked, when remaining hours are below the hour cost, or when the company API budget is below the budget cost. A purchase SHALL deduct the budget from the company API budget and count it in the day's company spend and the month's company bill. In parallel mode it SHALL advance the clock by the hour cost (background agents keep running and settle, and the PR review time of an agent that finishes during the investment is added on top, as with every other clock advance); in serial mode it SHALL subtract the hours. It SHALL NOT be blocked by a busy local GPU. Investments SHALL reset at the start of each run. The investment 補測試 SHALL NOT exist.

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

---
### Requirement: SDD effect

導入 SDD level 1 SHALL be described as writing markdown spec documents (for example Superpowers) and level 2 as using an SDD framework (Spectra, OpenSpec, Spec Kit). The SDD level applied to an agent dispatch SHALL be the level chosen for that dispatch, capped at the owned level (see Requirement: SDD choice on the dispatch panel). With applied level L ≥ 1, the dispatch token estimate SHALL be multiplied by the factor for L; tickets whose complexity used for the run is 3 or higher SHALL gain the success bonus for L before clamping; and an unrevealed trap dispatched to a model whose capability is below its true complexity SHALL stop after the trap-stop fraction for L of the true token and time cost instead of 0.4, with the log note for L. With applied level 0 the dispatch SHALL behave as without 導入 SDD. Architecture evaluation, research and hand-writing SHALL NOT be affected.

| Applied level | Token factor | Success bonus (complexity ≥3) | Trap-stop fraction | Trap-stop note |
| --- | --- | --- | --- | --- |
| 0 | 1 | 0 | 0.4 | 做到一半發現牽扯整個架構，先停下來 |
| 1 | 1.1 | 0.08 | 0.15 | 寫規格時就發現牽扯整個架構，先停下來 |
| 2 | 1.2 | 0.15 | 0.05 | 跑框架流程時就發現牽扯整個架構，先停下來 |

#### Scenario: Small ticket costs more

- **WHEN** SDD level 1 is owned and applied and a complexity 2 ticket is estimated
- **THEN** tokens are 1.1 × the estimate without SDD and success is unchanged

#### Scenario: Large ticket succeeds more

- **WHEN** a complexity 4 fe ticket is estimated with Sonnet without review at each applied level
- **THEN** success and tokens follow the table

##### Example: complexity 4 fe ticket with Sonnet

| Applied level | Success | Tokens vs. without SDD |
| --- | --- | --- |
| 0 | 0.80 | × 1 |
| 1 | 0.88 | × 1.1 |
| 2 | 0.95 | × 1.2 |

#### Scenario: Trap stops earlier

- **WHEN** an unrevealed trap with true complexity 5 is dispatched to DeepSeek Chat with applied SDD level 1, and another with applied level 2
- **THEN** the first run uses 0.15 and the second 0.05 of the true-complexity token and time estimate; both fail, reveal the trap and log their level's trap-stop note

#### Scenario: Evaluation unaffected

- **WHEN** SDD level 2 is owned and Sonnet evaluates a ticket
- **THEN** the evaluation tokens and hours equal those without SDD

## ADDED Requirements

### Requirement: SDD choice on the dispatch panel

While 導入 SDD level 1 or higher is owned, the dispatch panel SHALL show a 開發流程 section after the 自我審核 section (and after 推理強度 in 進階 mode) containing an SDD row with buttons 不用, markdown（Lv1） and, only while level 2 is owned, 框架（Lv2）. Each button SHALL show that level's token factor, complexity ≥3 success bonus and trap-stop percentage from the game constants (不用 shows the 40% trap-stop only). While SDD is not owned the section SHALL NOT be shown.

The selection SHALL store a requested level 0, 1 or 2. The applied level for a dispatch SHALL be min(requested level, owned level), and the highlighted button SHALL be the applied level. Clicking a button SHALL set the requested level to that button's level and recompute the estimate. At the start of every run the requested level SHALL be 2, so that a player who never uses the row gets the highest owned level on every dispatch. The investment hint line SHALL name SDD with the applied level's token factor and, for complexity ≥3, its success bonus, and SHALL NOT name SDD when the applied level is 0.

#### Scenario: Row follows ownership

- **WHEN** the dispatch panel is opened with SDD not owned, then with level 1 owned, then with level 2 owned
- **THEN** the panel shows no 開發流程 section, then 不用 and markdown（Lv1） with markdown（Lv1） highlighted, then all three buttons with 框架（Lv2） highlighted

#### Scenario: Turning SDD off for a ticket

- **WHEN** SDD level 1 is owned, the player clicks 不用 and dispatches a complexity 2 ticket
- **THEN** the estimate's tokens equal those without SDD, the hint line does not name SDD and the dispatched job applies level 0

#### Scenario: Requested level kept after buying level 2

- **WHEN** SDD level 2 is owned and the requested level is 1 because the player clicked markdown（Lv1） earlier in the run
- **THEN** markdown（Lv1） is highlighted and dispatches apply level 1 until the player clicks another button

#### Scenario: New run resets the request

- **WHEN** the player chose 不用 in one run and starts the next run with 再玩一個月, then buys SDD level 1
- **THEN** the dispatch panel highlights markdown（Lv1）

### Requirement: SDD choice in saves

The save SHALL include the requested SDD level as part of the dispatch selection. A save whose selection has no requested SDD level, or one that is not 0, 1 or 2, SHALL load with requested level 2 and SHALL NOT be rejected. A running job saved before this change, whose SDD record is a boolean, SHALL apply level 1 for `true` and level 0 for `false`. The save structure version SHALL NOT change.

#### Scenario: Old save

- **WHEN** a save with SDD `true`, a selection without an SDD level and a running job with SDD `true` is loaded
- **THEN** the save is not rejected, the requested level is 2, the dispatch panel highlights markdown（Lv1） and when the running job settles its GA `job_result` has `sdd` `md` and a trap stop logs the level 1 note
