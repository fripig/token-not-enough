# local-hardware Specification

## Purpose

Lets the player request real machines for the local GPU route — a GPU PC, an NVIDIA DGX Spark and a Mac Studio — as trust-gated company purchases that do not spend the company API budget. Installed machines speed up local models, unlock capability-4 local models, and free hand-writing while a local agent runs.

## Requirements

### Requirement: Machine purchase request

The engineering investment panel SHALL show a 採購電腦 row with one button per machine in the order 有顯卡的 PC（RTX 5090）, NVIDIA DGX Spark, Mac Studio（512GB）. Each enabled button SHALL show the machine name, its real-world price text (約 NT$12 萬, 約 NT$13 萬, 約 NT$30 萬), its trust threshold and its delivery days. At most one machine request SHALL be pending at a time. A request SHALL be refused, with the button disabled and showing the reason, when the machine is installed (已到貨), any machine request is pending (採購審核中), fewer than 1 hour remains (工時不夠), or the current day plus the machine's delivery days is after day 20 (來不及到貨). An accepted request SHALL record the machine and the current day, spend 1 hour (subtracted in serial mode; the clock advances in parallel mode while background agents keep running), log the request, and SHALL NOT change the company API budget, the day's company spend or the month's company bill. While a request is pending the quota area SHALL show 採購 <machine name> 審核中，預計第 N 天到貨. Installed machines and the pending request SHALL reset at the start of each run.

| Machine | Price text | Trust threshold | Delivery days |
| --- | --- | --- | --- |
| 有顯卡的 PC（RTX 5090） | 約 NT$12 萬 | 55 | 2 |
| NVIDIA DGX Spark | 約 NT$13 萬 | 60 | 3 |
| Mac Studio（512GB） | 約 NT$30 萬 | 70 | 3 |

The thresholds and days in this table are the initial values; the implementation SHALL keep this table in sync with any value changed by simulator tuning.

#### Scenario: Request a Spark on day 1

- **WHEN** in serial mode with 8 hours left and NT$12,000 company budget the player requests NVIDIA DGX Spark on day 1
- **THEN** 7 hours remain, the company budget is still NT$12,000, and the quota area shows 採購 NVIDIA DGX Spark 審核中，預計第 4 天到貨

#### Scenario: Refusals

- **WHEN** a request is attempted in each case in the table
- **THEN** nothing changes and the button shows the reason

##### Example: refusal cases

| State | Request | Reason |
| --- | --- | --- |
| PC installed | PC | 已到貨 |
| Spark request pending | Mac | 採購審核中 |
| 0.5 hours left | PC | 工時不夠 |
| day 18 | Spark (3 days) | 來不及到貨 |

#### Scenario: Last possible request

- **WHEN** on day 18 with no pending request the player requests the PC
- **THEN** the request is accepted with arrival on day 20


<!-- @trace
source: gh-17-01-local-hardware
updated: 2026-10-10
code:
  - public/sitemap.xml
  - docs/DESIGN.md
  - public/js/actions.js
  - tools/sim.js
  - public/js/view.js
  - public/index.html
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: Machine arrival

At the start of the first day on or after the request day plus the machine's delivery days, after the team seat review, the pending request SHALL end. When trust is at least the machine's threshold the machine SHALL be installed, that day SHALL start with 1 hour less (7 hours; 10:00 on the parallel clock), and the day summary SHALL report 採購到貨：<machine name> 架好了（架設花了 1 小時）。 Otherwise the machine SHALL NOT be installed, trust SHALL NOT change, the day summary SHALL report 採購被退件：主管信任不夠（需要 X 以上）。 with X the threshold, and the machine SHALL be requestable again. Both outcomes SHALL be logged.

#### Scenario: Approved at the threshold

- **WHEN** a Spark was requested on day 1 and trust is the value in the table when day 4 starts
- **THEN** the outcome matches the table

##### Example: Spark thresholds

| Trust on day 4 | Outcome |
| --- | --- |
| 59 | rejected with 採購被退件：主管信任不夠（需要 60 以上）。, 8 hours |
| 60 | Spark installed, 7 hours |

#### Scenario: New request after arrival

- **WHEN** the PC arrives and is installed on day 3
- **THEN** the Spark and Mac buttons are enabled on day 3


<!-- @trace
source: gh-17-01-local-hardware
updated: 2026-10-10
code:
  - public/sitemap.xml
  - docs/DESIGN.md
  - public/js/actions.js
  - tools/sim.js
  - public/js/view.js
  - public/index.html
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: PC speeds up local models

With the PC installed, the execution hours of every local model (including models unlocked by other machines) SHALL be multiplied by 0.7, both for agent dispatch estimates and actual runs and for architecture evaluation time. Tokens, success chance and non-local models SHALL be unchanged. The dispatch panel investment hint for a local model SHALL include 顯卡 PC：本地執行時間 ×0.7.

#### Scenario: Gemma with and without the PC

- **WHEN** a complexity-2 Laravel ticket is estimated with Gemma 4 26B A4B without review in serial mode
- **THEN** the hours are 3.8 without the PC and 2.66 with it

#### Scenario: Cloud model unaffected

- **WHEN** the PC is installed and a ticket is estimated with Sonnet
- **THEN** the estimate equals the estimate without the PC


<!-- @trace
source: gh-17-01-local-hardware
updated: 2026-10-10
code:
  - public/sitemap.xml
  - docs/DESIGN.md
  - public/js/actions.js
  - tools/sim.js
  - public/js/view.js
  - public/index.html
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: Machine-unlocked local models

Qwen3-Coder-Next and Gemma 4 31B SHALL be usable only with the DGX Spark installed and GLM-5.3 only with the Mac Studio installed. A locked model's button SHALL be disabled with the reason 需要 <machine name>, and dispatch or evaluation with a locked model SHALL do nothing. Client bans SHALL apply as for other local models: Gemma 4 31B is not Chinese weights; Qwen3-Coder-Next and GLM-5.3 are.

#### Scenario: Locked model

- **WHEN** no machine is installed and the dispatch panel shows the 自架開源 row
- **THEN** Qwen3-Coder-Next and Gemma 4 31B are disabled with 需要 NVIDIA DGX Spark and GLM-5.3 with 需要 Mac Studio（512GB）

#### Scenario: Government tender

- **WHEN** both Spark and Mac are installed and a 政府標案 ticket is selected
- **THEN** Gemma 4 31B is enabled while Qwen3-Coder-Next and GLM-5.3 are disabled with 中國權重禁用


<!-- @trace
source: gh-17-01-local-hardware
updated: 2026-10-10
code:
  - public/sitemap.xml
  - docs/DESIGN.md
  - public/js/actions.js
  - tools/sim.js
  - public/js/view.js
  - public/index.html
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: Hand-writing while a local agent runs

With any machine installed, a running local agent SHALL NOT block 自己手寫. The local GPU SHALL still run at most one agent at a time in parallel mode, and local dispatch and local architecture evaluation SHALL still be refused while a local agent runs.

#### Scenario: Hand-write next to a local agent

- **WHEN** in parallel mode a local agent is running, the PC is installed, and the player hand-writes another ticket
- **THEN** the hand-writing proceeds

#### Scenario: Second local agent still refused

- **WHEN** in parallel mode a local agent is running and all three machines are installed
- **THEN** dispatching another ticket with a local model is refused


<!-- @trace
source: gh-17-01-local-hardware
updated: 2026-10-10
code:
  - public/sitemap.xml
  - docs/DESIGN.md
  - public/js/actions.js
  - tools/sim.js
  - public/js/view.js
  - public/index.html
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: Save compatibility for machines

Loading a save that has no installed-machine or pending-request data SHALL treat it as no machines installed and no request pending, and SHALL NOT discard the save.

#### Scenario: Older save

- **WHEN** a day-5 save written before this change is loaded
- **THEN** the game resumes on day 5 with no machines installed and every machine requestable


<!-- @trace
source: gh-17-01-local-hardware
updated: 2026-10-10
code:
  - public/sitemap.xml
  - docs/DESIGN.md
  - public/js/actions.js
  - tools/sim.js
  - public/js/view.js
  - public/index.html
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: Idle machine trust penalty

The game SHALL track, per installed machine, whether its effect was used during the current day: the PC by any accepted local-model dispatch or charged local architecture evaluation, the DGX Spark by one with Qwen3-Coder-Next or Gemma 4 31B, the Mac Studio by one with GLM-5.3. Refused actions SHALL NOT count. A local agent still running when the next day starts (an overnight carry-over in parallel mode) SHALL count as used on that new day with the same model-to-machine mapping as a dispatch, regardless of how long it runs that day; cancelling it later that day, by the player or on expiry, SHALL NOT remove the mark. When the player ends a day, including day 20 before month-end scoring, every installed machine not used that day SHALL drop trust by 2 (not below 0). This SHALL apply from the arrival day on. When any machine is idle the day summary and the log SHALL name the idle machines and the total trust lost, as 電腦閒置：<names> 今天沒用到，主管覺得白買了（信任 -N）。 The usage record SHALL reset when the next day starts, then SHALL mark the machines used by local agents carried over into that day, and the day-start save SHALL store it in that state; a save without a usage record SHALL load as all unused.

#### Scenario: Idle penalties

- **WHEN** the player ends the day in each case in the table
- **THEN** trust changes as shown

##### Example: idle cases

| Installed | Used today | Trust before | Trust after |
| --- | --- | --- | --- |
| PC, Spark | dispatched Gemma 4 26B A4B | 60 | 58 (Spark idle) |
| PC, Spark | dispatched Gemma 4 31B | 60 | 60 |
| PC, Spark | dispatched Qwen3-Coder-Next | 60 | 60 |
| PC, Spark | nothing local | 60 | 56 |
| PC, Spark, Mac | nothing local | 1 | 0 |
| PC | only a local dispatch refused because a local agent started earlier the same day kept the GPU busy, with that agent's dispatch not recorded | 60 | 58 |

#### Scenario: Overnight local agent counts as used

- **WHEN** in parallel mode a local agent dispatched on day N is still running when day N+1 starts and nothing else local happens on day N+1
- **THEN** ending day N+1 drops trust only for installed machines that agent's model does not map to

##### Example: overnight carry-over

| Installed | Overnight local agent from day N | Other local use on day N+1 | Trust before ending day N+1 | Trust after |
| --- | --- | --- | --- | --- |
| PC, Spark | Qwen3-Coder-Next | none | 60 | 60 |
| PC, Spark | Gemma 4 26B A4B | none | 60 | 58 (Spark idle) |
| PC | Gemma 4 26B A4B, cancelled by the player at 9:00 on day N+1 | none | 60 | 60 |
| PC, Mac | GLM-5.3 | none | 60 | 60 |

#### Scenario: Day-start save reflects carried-over agents

- **WHEN** the PC and Spark are installed and a Qwen3-Coder-Next agent runs overnight into day N+1
- **THEN** the day N+1 start save stores the usage record with the PC and Spark marked used and the Mac unused

#### Scenario: Arrival day counts

- **WHEN** the Spark is installed on the morning of day 4 and no local model is used on day 4
- **THEN** ending day 4 drops trust by 2 and the summary names NVIDIA DGX Spark

#### Scenario: Usage resets each day

- **WHEN** the PC and Spark are installed, Gemma 4 31B was dispatched on day 5 and finished that day, and nothing local is used on day 6
- **THEN** ending day 5 changes nothing and ending day 6 drops trust by 4
