# agent-investments Specification

## Purpose

In parallel mode, lets the player turn an engineering investment into a queue ticket that is either hand-written at the investment's usual cost or dispatched to a background agent. An agent-built investment pays only tokens, and its effect is scaled by a quality that depends on how capable the model is, so a high-tier model delivers the full benefit and a low-tier model a weaker one.

## Requirements

### Requirement: Opening an investment ticket

In parallel mode, the written investments SHALL be 寫 CLAUDE.md (per stack), 單元測試, CI 流水線, pre-commit／lint hook, secret scanning／脫敏, 上架自動化（fastlane）, 監控告警, 做 skills, 接 MCP 文件 and 導入 SDD, at level 1 and, where it exists, level 2. Pressing the investment-tab button of a written investment SHALL add one investment ticket for its next level to the queue, SHALL write a log line naming the investment, and SHALL NOT spend hours, company budget or tokens, nor send an analytics event. The button SHALL be refused with the same reasons as a purchase except hours and company budget (already at the highest level, next level locked). While an investment ticket for that investment and level is in the queue or running, the button SHALL be disabled with the text 已開工單. 交叉審核工具, 提升 agent 能力, conferences and machine purchases SHALL keep purchasing directly. In serial mode no investment ticket SHALL be created.

#### Scenario: Opening a ticket

- **WHEN** in parallel mode with 8 hours left the player presses the 寫 CLAUDE.md button for laravel
- **THEN** 8 hours remain, CLAUDE.md for laravel is not owned, the queue holds one investment ticket titled with CLAUDE.md and laravel, and the button reads 已開工單 and is disabled

#### Scenario: Locked level

- **WHEN** in parallel mode 單元測試 level 1 is owned and no 綜合場 conference was attended
- **THEN** pressing the 單元測試 button creates no ticket and the button shows the locked reason

#### Scenario: Not a written investment

- **WHEN** in parallel mode the player presses the 交叉審核工具 button with 8 hours left and NT$12,000 company budget
- **THEN** it is bought directly: 6 hours remain and company budget is NT$11,800

---
### Requirement: Investment ticket properties

An investment ticket SHALL have the investment's complexity for that level, no KPI, no due date, the 內部專案 client, and SHALL NOT be an incident, sensitive, outsourced, a trap, a research ticket, a merge-conflict ticket, a large codebase or need store review. It SHALL never be overdue, SHALL NOT be cancelled at end of day for being due, and SHALL be listed after all ordinary tickets in queue order. Its card SHALL show the investment name, a 投資 chip, complexity pips and estimated tokens, and SHALL NOT show KPI, due, client, stack or unfamiliar chips. Evaluate, research and rescope SHALL NOT be available for it, and batch dispatch SHALL skip it.

The initial complexities SHALL be:

| Investment | Level 1 | Level 2 |
| --- | --- | --- |
| pre-commit／lint hook | 2 | — |
| CI 流水線 | 3 | — |
| secret scanning／脫敏 | 3 | 5 |
| 上架自動化（fastlane） | 3 | — |
| 接 MCP 文件 | 3 | — |
| 寫 CLAUDE.md | 4 | 5 |
| 單元測試 | 4 | 5 |
| 監控告警 | 4 | — |
| 做 skills | 4 | 5 |
| 導入 SDD | 5 | 5 |

The implementation SHALL keep this table in sync with any value changed by simulator tuning.

#### Scenario: Never overdue

- **WHEN** an investment ticket opened on day 3 is still in the queue when the player ends day 20
- **THEN** no overdue line, KPI loss or trust loss is caused by it and the overdue count does not include it

#### Scenario: Queue order and batch

- **WHEN** skills are bought, the queue holds a complexity-2 ticket due tomorrow and a 寫 CLAUDE.md investment ticket, and the player presses batch dispatch
- **THEN** the investment ticket is listed last and stays in the queue, and the complexity-2 ticket is dispatched

---
### Requirement: Solving an investment ticket by hand

With an investment ticket selected, the dispatch panel SHALL offer 自己做 with the investment's purchase hours and company budget. Pressing it SHALL perform the purchase defined in `engineering-investments` (same refusals, cost, clock advance and log line), SHALL set that level's quality to 100%, and SHALL remove the ticket from the queue. It SHALL NOT be blocked by a busy local GPU.

#### Scenario: Hand-written investment ticket

- **WHEN** in parallel mode at 9:00 with NT$12,000 company budget the player selects a 單元測試 investment ticket and presses 自己做
- **THEN** the clock reads 13:00, company budget is NT$11,600, 單元測試 level 1 is owned with quality 100% and the ticket is gone

#### Scenario: Not enough budget

- **WHEN** company budget is NT$200 and the player presses 自己做 on a 寫 CLAUDE.md investment ticket
- **THEN** nothing changes and the ticket stays in the queue

---
### Requirement: Dispatching an investment ticket to an agent

With an investment ticket selected, the dispatch panel SHALL offer presets, model, payment method and, in advanced mode, reasoning effort, and SHALL NOT show self-review, SDD or cross-model review. For model `M` (after reasoning effort) and complexity `cx`, the agent SHALL use `BASE[cx] × M.verb` tokens and run `cx × M.speed` hours, multiplied by the gaming-PC speed factor for local models; no other multiplier and no random variation SHALL apply, and the panel SHALL show these exact values and the expected quality as 預計品質 N%. Payment SHALL use the same methods and rules as ticket dispatch (subscription and seat quotas, personal API wallet, company API with the daily limit and overdraft penalties, local GPU one at a time, Chinese cloud blocked under the company-wide ban), SHALL NOT roll a security audit and SHALL NOT deduct the investment's fixed company budget. Dispatching SHALL cost 0.2 hours like any parallel dispatch. One-click preset buttons on the card SHALL dispatch it with the preset's vendor, model, payment and effort, ignoring the preset's review and SDD, with the same disable reasons as for tickets except review and SDD reasons. A running investment job SHALL count as a running agent for other tickets' PR review load and merge-conflict chance, SHALL NOT itself need PR review and SHALL NOT have a merge conflict, and SHALL NOT fail.

#### Scenario: Sonnet on company API

- **WHEN** in parallel mode with NT$12,000 company budget the player dispatches a 寫 CLAUDE.md (laravel) investment ticket to Sonnet on company API at middle effort
- **THEN** the panel showed 550k tokens, 3.2 hours and 預計品質 100%; after 3.2 hours company budget is about NT$11,752 (550 × 0.45 = NT$247.5) and CLAUDE.md for laravel is owned at level 1 with quality 100%

#### Scenario: Counts as a running agent

- **WHEN** an investment job and one complexity-2 ticket job without review are running, no hook is owned, and the ticket job finishes successfully while the investment job is still running
- **THEN** its PR review time is 0.5 hours (2 × 0.2 × (1 + 0.25 × 1))

#### Scenario: Preset ignores review and SDD

- **WHEN** preset C is Opus, company API, strict review and SDD 2, and the player presses C on an investment ticket's card
- **THEN** the investment job runs with Opus on company API and its tokens are `BASE[cx] × 0.85` with no review or SDD multiplier

---
### Requirement: Investment quality

An agent-built level's quality SHALL come from `gap = M.cap − cx × 10` (model capability after reasoning effort): linear between the anchors gap 0 → 100%, −10 → 60%, −20 → 30%, −30 → 10%, 100% above 0 and 10% below −30. When the job finishes and the level is above the owned level, the investment SHALL become owned at that level with that quality; when it equals the owned level (a redo), that level's quality SHALL become the higher of the old and new quality. A level purchased directly or hand-written SHALL have quality 100%. Level counts, level locks and the month-end investment count SHALL NOT depend on quality.

#### Scenario: Quality by model

- **WHEN** a 導入 SDD level 1 investment ticket (complexity 5) is finished by each model in the table at middle effort
- **THEN** the quality is as shown

##### Example: SDD level 1 quality

| Model | Capability | Quality |
| --- | --- | --- |
| Opus | 50 | 100% |
| Sonnet | 40 | 60% |
| DeepSeek Chat | 30 | 30% |
| Gemini Flash | 20 | 10% |
| Sonnet at high effort | 50 | 100% |
| a capability-45 model | 45 | 80% |

#### Scenario: Redo keeps the higher quality

- **WHEN** CLAUDE.md for laravel is owned at level 1 with quality 60% and a redo finishes with quality 30%, then another redo finishes with quality 100%
- **THEN** the quality is 60% after the first redo and 100% after the second

---
### Requirement: Quality-scaled effects

For an investment with per-level values `V[0]` (not owned) … `V[L]` and per-level quality `q_1 … q_L`, the effect value SHALL be `V[0] + Σ (V[l] − V[l−1]) × q_l` over owned levels. This SHALL apply to the CLAUDE.md token multiplier and failure reduction, the 單元測試 catch-rate bonus, the CI 流水線 conflict multiplier, the pre-commit hook PR-review multiplier, the secret-scanning audit multiplier, the fastlane store-reject chance, the 接 MCP 文件 reveal bonus and evaluation-time multiplier, and the SDD failure reduction and trap-stop fraction. The SDD token overhead SHALL NOT be scaled. On/off effects SHALL apply a level only when its quality is at least 60%: 做 skills batch dispatch uses the highest level with quality ≥ 60% for its complexity limit and shows no batch button when none qualifies, and 監控告警 applies its incident deadline, incident KPI multiplier and incident late-trust value only with quality ≥ 60%. Dispatch-panel hints and the rules modal SHALL show the scaled values.

#### Scenario: Scaled values

- **WHEN** the investments in the table are owned with the given qualities
- **THEN** the effect values are as shown

##### Example: scaled effects

| Investment and quality | Effect | Value |
| --- | --- | --- |
| CLAUDE.md level 1, 60% | failure reduction | 3.6% (0.06 × 0.6) |
| CLAUDE.md level 1, 60% | token multiplier | 0.91 (1 − 0.15 × 0.6) |
| CLAUDE.md level 1 100%, level 2 60% | failure reduction | 11.4% (0.06 + 0.09 × 0.6) |
| secret scanning level 1, 60% | audit multiplier | 0.7 |
| CI 流水線, 30% | conflict multiplier | 0.85 |

#### Scenario: On/off threshold

- **WHEN** 做 skills level 1 is owned with quality 30%
- **THEN** no batch dispatch button is shown; after a redo with quality 60% the button is shown with complexity limit 2

---
### Requirement: Shortfall, cancel and end of day

When an investment job's payment comes up short (quota, wallet), the level SHALL NOT be applied, the part paid SHALL stay paid, the ticket SHALL return to the queue and the log SHALL say the quota or wallet ran out. The player SHALL be able to cancel a running investment job with the same two-step button and partial charge as a ticket job, returning the ticket to the queue. A vendor outage SHALL cancel it like a ticket job; at the end of day 20 a running investment job SHALL be cancelled like a month-end ticket job. Running investment jobs SHALL carry over night like ticket jobs. For an investment ticket in the queue, the dispatch panel's abandon button SHALL read 取消投資 with a two-step confirmation and SHALL remove the ticket with no trust, KPI or money cost and without counting it as abandoned.

#### Scenario: Wallet runs out

- **WHEN** an investment job on personal API needs NT$30 and the wallet holds NT$10
- **THEN** NT$10 is paid, the wallet is NT$0, the investment is not owned and the ticket is back in the queue

#### Scenario: Cancel the ticket

- **WHEN** the player presses 取消投資 and then confirms on a queued investment ticket with trust 70
- **THEN** the ticket is gone, trust is 70 and the month-end abandoned count is unchanged

---
### Requirement: Redo offer

In parallel mode, when the highest owned level of a written investment has quality below 100% and no ticket for that level is open, its investment-tab row SHALL show a button 重做（品質 N%） that opens an investment ticket for the same level. The next-level button SHALL stay available alongside it when the next level exists and is unlocked.

#### Scenario: Redo button

- **WHEN** 單元測試 level 1 is owned with quality 60% in parallel mode
- **THEN** the row shows 重做（品質 60%）, and pressing it adds a 單元測試 level 1 investment ticket

---
### Requirement: Investment tickets in logs and saves

Dispatching an investment ticket SHALL log the investment name, the agent and model with payment, 預計品質 N% and the expected hours. Completion SHALL log the investment name, agent and model with payment, the applied quality, tokens, spend and hours. The day-start save SHALL keep queued and running investment tickets and the per-level qualities; a save without qualities SHALL load every owned level at 100% and `SAVE_VER` SHALL NOT change. Investment ticket titles SHALL follow the current language.

#### Scenario: Old save

- **WHEN** a save made before this change with CLAUDE.md laravel level 2 owned is loaded
- **THEN** both CLAUDE.md levels have quality 100% and the failure reduction is 15%

#### Scenario: Save with a running investment job

- **WHEN** the game is saved at day start while an investment job is running overnight and the save is resumed
- **THEN** the job is still running with the same remaining hours and finishes applying its level
