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

With an investment ticket selected, the dispatch panel SHALL offer presets, model, payment method and, in advanced mode, reasoning effort, and SHALL NOT show self-review, SDD or cross-model review. For model `M` (after reasoning effort) and complexity `cx`, the agent SHALL use `BASE[cx] × M.verb` tokens and run `cx × M.speed` hours, multiplied by the gaming-PC speed factor for local models; no other multiplier and no random variation SHALL apply, and the panel SHALL show these exact values, the expected quality as 預計品質 N% and the acceptance hours the finished ticket will need. Payment SHALL use the same methods and rules as ticket dispatch (subscription and seat quotas, personal API wallet, company API with the daily limit and overdraft penalties, local GPU one at a time, Chinese cloud blocked under the company-wide ban), SHALL NOT roll a security audit and SHALL NOT deduct the investment's fixed company budget. Dispatching SHALL cost 0.2 hours like any parallel dispatch. One-click preset buttons on the card SHALL dispatch it with the preset's vendor, model, payment and effort, ignoring the preset's review and SDD, with the same disable reasons as for tickets except review and SDD reasons. A running investment job SHALL count as a running agent for other tickets' PR review load and merge-conflict chance, SHALL NOT itself need PR review and SHALL NOT have a merge conflict, and SHALL NOT fail. A job that finishes fully paid SHALL put the ticket into the awaiting-acceptance state defined in "Accepting an agent investment" instead of applying the level.

#### Scenario: Sonnet on company API

- **WHEN** in parallel mode with 8 hours left and NT$12,000 company budget the player dispatches a 寫 CLAUDE.md (laravel) investment ticket to Sonnet on company API at middle effort, waits for it to finish and accepts it
- **THEN** the panel showed 550k tokens, 3.2 hours and 預計品質 100%; after the job finishes 4.6 hours are left, company budget is about NT$11,752 (550 × 0.45 = NT$247.5) and CLAUDE.md for laravel is not owned; after acceptance 3.1 hours are left, company budget is unchanged and CLAUDE.md for laravel is owned at level 1 with quality 100%

#### Scenario: Counts as a running agent

- **WHEN** an investment job and one complexity-2 ticket job without review are running, no hook is owned, and the ticket job finishes successfully while the investment job is still running
- **THEN** its PR review time is 0.5 hours (2 × 0.2 × (1 + 0.25 × 1))

#### Scenario: Preset ignores review and SDD

- **WHEN** preset C is Opus, company API, strict review and SDD 2, and the player presses C on an investment ticket's card
- **THEN** the investment job runs with Opus on company API and its tokens are `BASE[cx] × 0.85` with no review or SDD multiplier

---
### Requirement: Investment quality

An agent-built level's quality SHALL come from `gap = M.cap − cx × 10` (model capability after reasoning effort): linear between the anchors gap 0 → 100%, −10 → 60%, −20 → 30%, −30 → 10%, 100% above 0 and 10% below −30. When the finished ticket is accepted and the level is above the owned level, the investment SHALL become owned at that level with that quality; when it equals the owned level (a redo), that level's quality SHALL become the higher of the old and new quality. A level purchased directly or hand-written SHALL have quality 100%. Level counts, level locks and the month-end investment count SHALL NOT depend on quality.

#### Scenario: Quality by model

- **WHEN** a 導入 SDD level 1 investment ticket (complexity 5) is finished by each model in the table at middle effort and accepted
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

- **WHEN** CLAUDE.md for laravel is owned at level 1 with quality 60% and a redo finishes with quality 30% and is accepted, then another redo finishes with quality 100% and is accepted
- **THEN** the quality is 60% after the first redo and 100% after the second

#### Scenario: Redo not yet accepted

- **WHEN** CLAUDE.md for laravel is owned at level 1 with quality 60% and a redo finishes with quality 100% but is not accepted
- **THEN** the quality is still 60%

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

When an investment job's payment comes up short (quota, wallet), the level SHALL NOT be applied, the part paid SHALL stay paid, the ticket SHALL return to the queue without entering the awaiting-acceptance state and the log SHALL say the quota or wallet ran out. The player SHALL be able to cancel a running investment job with the same two-step button and partial charge as a ticket job, returning the ticket to the queue. A vendor outage SHALL cancel it like a ticket job; at the end of day 20 a running investment job SHALL be cancelled like a month-end ticket job. Running investment jobs SHALL carry over night like ticket jobs; a ticket awaiting acceptance SHALL stay awaiting acceptance across days. For an investment ticket in the queue, including one awaiting acceptance, the dispatch panel's abandon button SHALL read 取消投資 with a two-step confirmation and SHALL remove the ticket with no trust, KPI or money cost and without counting it as abandoned; tokens already paid for a finished job SHALL stay paid.

#### Scenario: Wallet runs out

- **WHEN** an investment job on personal API needs NT$30 and the wallet holds NT$10
- **THEN** NT$10 is paid, the wallet is NT$0, the investment is not owned and the ticket is back in the queue without a 待驗收 chip

#### Scenario: Cancel the ticket

- **WHEN** the player presses 取消投資 and then confirms on a queued investment ticket with trust 70
- **THEN** the ticket is gone, trust is 70 and the month-end abandoned count is unchanged

#### Scenario: Cancel while awaiting acceptance

- **WHEN** the player presses 取消投資 and confirms on a 待驗收 單元測試 ticket
- **THEN** the ticket is gone, 單元測試 is not owned, no money is refunded, and the 單元測試 investment-tab button opens a new ticket again

---
### Requirement: Redo offer

In parallel mode, when the highest owned level of a written investment has quality below 100% and no ticket for that level is open, its investment-tab row SHALL show a button 重做（品質 N%） that opens an investment ticket for the same level. The next-level button SHALL stay available alongside it when the next level exists and is unlocked.

#### Scenario: Redo button

- **WHEN** 單元測試 level 1 is owned with quality 60% in parallel mode
- **THEN** the row shows 重做（品質 60%）, and pressing it adds a 單元測試 level 1 investment ticket

---
### Requirement: Investment tickets in logs and saves

Dispatching an investment ticket SHALL log the investment name, the agent and model with payment, 預計品質 N% and the expected hours. A fully paid finish SHALL log the investment name, agent and model with payment, the achieved quality, tokens, spend and hours, and that it awaits acceptance. Acceptance SHALL log the investment name, the applied quality and the acceptance hours. The day-start save SHALL keep queued, running and awaiting-acceptance investment tickets and the per-level qualities; a save without qualities SHALL load every owned level at 100%, a ticket without an acceptance field SHALL load as not awaiting acceptance, and `SAVE_VER` SHALL NOT change. Investment ticket titles SHALL follow the current language.

#### Scenario: Old save

- **WHEN** a save made before this change with CLAUDE.md laravel level 2 owned is loaded
- **THEN** both CLAUDE.md levels have quality 100% and the failure reduction is 15%

#### Scenario: Save with a running investment job

- **WHEN** the game is saved at day start while an investment job is running overnight and the save is resumed
- **THEN** the job is still running with the same remaining hours and finishes into 待驗收; accepting it applies its level

#### Scenario: Save with a ticket awaiting acceptance

- **WHEN** the game is saved at day start with a 待驗收 單元測試 ticket of quality 60% and the save is resumed
- **THEN** the ticket is still 待驗收 and accepting it owns 單元測試 level 1 with quality 60%

---
### Requirement: Accepting an agent investment

When an investment job finishes fully paid, the level SHALL NOT be applied; the ticket SHALL stay in the queue in an awaiting-acceptance state that stores the achieved quality and the agent's vendor, model and payment. Its card SHALL show a 待驗收 chip and no one-click preset buttons. With it selected, the dispatch panel SHALL show the stored quality, a 驗收（Nh，不花錢） button and the 取消投資 button, and SHALL NOT offer presets, model, payment, effort, dispatch or 自己做. The acceptance hours SHALL be `ACCEPT_HRS` (0.5) × the hand-writing hours of that investment level. Pressing 驗收 SHALL be refused with 工時不夠 when fewer hours are left; otherwise it SHALL advance the clock by the acceptance hours as hand-written work does in parallel mode (background agents keep running), SHALL spend no money, company budget or tokens, SHALL apply the level with the stored quality (or raise a redo's quality as defined in "Investment quality"), SHALL log the acceptance and SHALL remove the ticket. A busy local GPU SHALL NOT block acceptance. While awaiting acceptance the ticket SHALL count as open for its investment and level. Serial mode SHALL be unaffected, since it has no investment tickets.

#### Scenario: Finished job waits for acceptance

- **WHEN** in parallel mode a 單元測試 level 1 investment job finishes fully paid with quality 100%
- **THEN** 單元測試 is not owned, its catch-rate bonus is 0, the ticket is in the queue with a 待驗收 chip, and the 單元測試 investment-tab button reads 已開工單

#### Scenario: Accepting

- **WHEN** the player selects that ticket with 6 hours left and NT$12,000 company budget and presses 驗收（2.0h，不花錢）
- **THEN** 4 hours remain, company budget is NT$12,000, 單元測試 level 1 is owned with quality 100% and the ticket is gone

##### Example: acceptance hours

| Investment level | Hand-writing hours | Acceptance hours |
| --- | --- | --- |
| pre-commit／lint hook level 1 | 2 | 1.0 |
| 寫 CLAUDE.md level 1 | 3 | 1.5 |
| 單元測試 level 1 | 4 | 2.0 |
| 導入 SDD level 1 | 6 | 3.0 |
| any level 2 | 1 | 0.5 |
| all ten level-1 investments | 33 | 16.5 |

#### Scenario: Not enough hours

- **WHEN** 1 hour is left and the player selects a 待驗收 導入 SDD level 1 ticket
- **THEN** the 驗收 button is disabled with 工時不夠 and pressing it changes nothing

#### Scenario: Not all on day 1

- **WHEN** in parallel mode on day 1 all ten level-1 investment tickets are dispatched and finish, and the player accepts as many as the hours allow
- **THEN** at most 8 acceptance hours are spent on day 1, so at least one of the ten investments is not owned at the end of day 1
