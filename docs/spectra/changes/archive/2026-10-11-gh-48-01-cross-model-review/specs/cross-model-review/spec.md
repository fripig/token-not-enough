## Purpose

Lets a player who bought 交叉審核工具 have a different model review an agent's work (for example Sonnet writes, Opus reviews), so a ticket the writer cannot fully handle can still be caught by a stronger reviewer, at the reviewer's price, time and billing.

## ADDED Requirements

### Requirement: Reviewer choice on the dispatch panel

When 交叉審核工具 is owned (see `engineering-investments`) and the selected review level is 自審 or 嚴格審核, the dispatch panel SHALL show a row 審核模型 directly under the review levels. The row SHALL contain 同一個 first, then one button per model of every vendor in catalog order except the writer's own model, each showing the model name, its capability bar, its price (免費 for local models) and the catch rate it would give for the selected ticket and level. A reviewer button SHALL be disabled with a reason when its vendor is down today (今日當機), when the ticket's client bans it (the existing ban reason text), when it needs a machine that is not installed (需要 <machine name>), when it is a local model and the writer is a local model (寫的是本地模型時只能同一個), or when it is a local model and the local GPU is busy in parallel mode (本地 GPU 忙). If the selected reviewer becomes disabled, the selection SHALL switch to 同一個. The reviewer SHALL always run at reasoning effort 中, whatever the writer's effort. The selected reviewer SHALL be kept across runs, default 同一個. When the investment is not owned or the level is 不審核, the row SHALL NOT be shown and the game SHALL behave as with 同一個 for every estimate, dispatch, log line and analytics event.

#### Scenario: Row visibility

- **WHEN** the dispatch panel is shown in each state of the table
- **THEN** the 審核模型 row is shown as listed

##### Example: visibility

| 交叉審核工具 owned | Review level | Row shown |
| --- | --- | --- |
| no | 自審 | no |
| yes | 不審核 | no |
| yes | 自審 | yes |
| yes | 嚴格審核 | yes |

#### Scenario: Reviewer list excludes the writer

- **WHEN** the writer is Claude Sonnet and the row is shown
- **THEN** the row lists 同一個, Haiku, Opus, Fable and every other vendor's models, and no Sonnet button

#### Scenario: Banned reviewer is disabled

- **WHEN** the ticket's client is 金融客戶 and the row is shown
- **THEN** the DeepSeek, 智譜 and Kimi buttons are disabled with the ban reason and the local Qwen3.6 35B-A3B button is enabled

#### Scenario: Reviewer reverts to 同一個 when it becomes disabled

- **WHEN** Opus is the selected reviewer and Anthropic has an outage today
- **THEN** the selected reviewer becomes 同一個

#### Scenario: No investment means no cross review

- **WHEN** a stored selection names Opus as reviewer but 交叉審核工具 is not owned, and the player dispatches with Sonnet and 自審
- **THEN** the job is estimated, charged and logged exactly as Sonnet with 自審 reviewed by itself

---
### Requirement: Reviewer catch rate

With a reviewer other than 同一個, the catch rate SHALL use the self-review formula (see `self-review`) with the reviewer's gap in place of the writer's: reviewer capability at effort 中 − complexity × 10, plus the stack adjustment and the large-codebase adjustment computed for the reviewer model. The 嚴格審核 bonus, the tests bonus, the floor of 0 and the cap of 0.95 SHALL apply unchanged. The writer's raw success rate SHALL be unchanged, and the effective success rate shown SHALL use the reviewer's catch rate.

#### Scenario: Catch rate by reviewer

- **WHEN** a front-end complexity-4 ticket is selected with no investments other than 交叉審核工具 and the writer is Sonnet (40)
- **THEN** the catch rate follows the reviewer as listed

##### Example: reviewer catch rates

| Reviewer | Reviewer gap | 自審 | 嚴格審核 |
| --- | --- | --- | --- |
| 同一個 (Sonnet) | 0 | 20% | 40% |
| Opus (50) | +10 | 30% | 50% |
| Fable (60) | +20 | 40% | 60% |
| DeepSeek Chat (30) | −10 | 10% | 30% |

#### Scenario: Stack adjustment uses the reviewer

- **WHEN** a Rust complexity-3 ticket is written by Opus and reviewed by Haiku (30) with 自審
- **THEN** the reviewer gap is 30 − 30 − 10 = −10 and the catch rate is 10%

#### Scenario: Writer effort does not change the reviewer

- **WHEN** in advanced mode Sonnet at effort 高 writes a front-end complexity-4 ticket reviewed by Opus with 自審
- **THEN** the catch rate is 30%

#### Scenario: Effective rate with a stronger reviewer

- **WHEN** Sonnet writes a front-end complexity-4 ticket (raw 75%) reviewed by Fable with 自審 and no other investments
- **THEN** the panel shows 85% with （原 75%）

---
### Requirement: Review tokens, cost and time

With a reviewer other than 同一個, an attempt's tokens SHALL be split into a writer part and a review part. The writer part SHALL be the tokens the attempt would use with review level 不審核. The review part SHALL be the writer part × (review token multiplier − 1) × reviewer token multiplier ÷ writer token multiplier, where the review token multiplier is 1.3 for 自審 and 1.6 for 嚴格審核, the writer token multiplier is the writer model's after reasoning effort, and the reviewer's is at effort 中. The writer part SHALL be priced and billed as the writer; the review part SHALL be priced at the reviewer's price per 1k tokens × the reviewer vendor's price modifier, and SHALL use the reviewer's subscription weight for quota. A caught failure's ×1.25 SHALL apply to the writer part only. The attempt's hours SHALL be the hours with level 不審核 plus complexity × reviewer speed × the reviewer's local-PC speed factor × the retry factor × the stack time factor × (review time multiplier − 1), where the review time multiplier is 1.2 for 自審 and 1.35 for 嚴格審核. With 同一個 the tokens, cost and hours SHALL equal today's values. The estimate block SHALL show tokens as writer plus review, the writer's cost line, and a second line 審核 <cost> in the reviewer billing's unit.

#### Scenario: Tokens and cost split

- **WHEN** Sonnet on 個人 API writes with 自審 reviewed by Opus on 公司 API, the writer part is 200k tokens, and no price modifier applies
- **THEN** the review part is 51k tokens, NT$45.9 is charged to the company API for the review and NT$90 to the wallet for the writer

#### Scenario: Review time uses the reviewer's speed

- **WHEN** Sonnet (speed 0.8) writes a front-end complexity-4 ticket with 自審 on its first try
- **THEN** the hours are as listed

##### Example: hours

| Reviewer | Hours |
| --- | --- |
| 同一個 | 3.84 |
| Opus (speed 1) | 3.2 + 0.8 = 4.0 |
| Haiku (speed 0.7) | 3.2 + 0.56 = 3.76 |

#### Scenario: Caught fix stays on the writer

- **WHEN** an attempt with a 200k writer part and a 51k review part fails and the review catches it
- **THEN** the writer is charged 250k tokens and the reviewer 51k tokens

---
### Requirement: Reviewer billing

When a reviewer other than 同一個 is selected, the dispatch panel SHALL show a row 審核付費方式 under the 審核模型 row listing the reviewer vendor's billing methods with the same availability and notes as the writer's billing row, including the rule that an outsourced ticket cannot use 公司 API or 公司席位; a local reviewer SHALL list only 本地 GPU. When the reviewer changes, its billing SHALL be set to the writer's default-billing rule applied to the reviewer (an approved seat with enough quota for the review part, else a subscription with enough quota on a non-sensitive ticket; when the writer uses the same vendor and the same quota billing, the writer part's high estimate is added to the need), else 公司 API when usable, else 個人 API when usable, else the first usable billing method. If the selected reviewer billing becomes unusable, it SHALL switch to the first usable one; if the reviewer vendor has no usable billing at all, the reviewer SHALL switch to 同一個. The review part SHALL count toward the company API daily limit and overdraft like any company charge.

#### Scenario: Default reviewer billing

- **WHEN** the player owns an Anthropic Max 5× subscription with enough quota, no seat, and picks Opus as reviewer on a non-sensitive ticket
- **THEN** the reviewer billing is 個人訂閱

#### Scenario: Short subscription falls back to company API

- **WHEN** the player owns an Anthropic Pro subscription with 10k quota left, no seat, and picks Opus as reviewer on a non-sensitive company ticket whose review part needs more than 10k quota
- **THEN** the reviewer billing is 公司 API

#### Scenario: No usable reviewer billing

- **WHEN** the selected ticket is outsourced, the wallet is NT$0, there is no Anthropic subscription, and Opus is the selected reviewer
- **THEN** the selected reviewer becomes 同一個

#### Scenario: Outsourced ticket

- **WHEN** the selected ticket is outsourced and Opus is the reviewer
- **THEN** 公司 API and 公司席位 are disabled in the reviewer billing row with 外包不能用公司資源

---
### Requirement: Review that cannot be done

When a job with a reviewer other than 同一個 settles, the writer part (without the fix) SHALL be charged first, then the review part with the same completion fraction. When the writer charge is short (the agent stops halfway), the review part SHALL NOT be charged, no reviewer audit SHALL be rolled, and the review counts as not performed. The review SHALL count as performed only when the reviewer's vendor is not down that day and the review charge was not short (quota or wallet). When a caught failure's review was performed, the fix (25% of the writer part) SHALL be charged last to the writer's billing; if that charge is short, the remaining quota or wallet is used, the failure stays a failure with the writer billing's short note, and no rescue is counted. When the review is not performed, a rolled catch SHALL be discarded: a failed attempt SHALL stay a failure with the note 審核沒做完，沒抓到錯誤, and a successful attempt SHALL stay a success. The writer part SHALL settle as it would without the review, and a short review charge SHALL NOT stop the writer halfway.

#### Scenario: Reviewer quota runs out

- **WHEN** an attempt rolled a failure that the reviewer would catch, and the reviewer's subscription has less quota than the review part
- **THEN** the remaining quota is used, the attempt fails with 審核沒做完，沒抓到錯誤, and the job's GA `outcome` is `fail`

#### Scenario: Shared subscription: the writer is charged first

- **WHEN** Sonnet writes and Opus reviews, both on the Anthropic subscription, the writer part needs 250k quota, the review part 100k, 300k quota is left, and the attempt succeeded
- **THEN** the writer part is charged in full, the review uses the remaining 50k, the job completes, and its GA `outcome` is `success`

#### Scenario: Fix cannot be paid

- **WHEN** a caught failure's writer is on 個人 API, the review on 公司 API is paid, and the wallet holds less than the fix after the writer part
- **THEN** the wallet is emptied, the attempt fails with 錢包見底，agent 停在一半, the rescued count does not change, and the job's GA `outcome` is `quota`

#### Scenario: Writer stops halfway

- **WHEN** Sonnet on the Anthropic subscription writes a sensitive ticket reviewed by DeepSeek Reasoner on 個人 API, and the subscription quota runs out during the writer part
- **THEN** the attempt fails with 撞到用量上限，agent 停在一半, nothing is charged for the review, and only one audit is rolled (the writer's, at 35% for 個人訂閱)

#### Scenario: Reviewer vendor down overnight

- **WHEN** a parallel job written by DeepSeek and reviewed by Opus runs overnight into a day when Anthropic is down, and it rolled a success
- **THEN** the job is not cancelled, settles as a success, and no review part is charged

---
### Requirement: Audit for a personally billed reviewer

For a sensitive ticket, after the writer's audit roll (see `billing-methods`), the game SHALL roll one more audit when a reviewer other than 同一個 was charged anything and its billing is 個人訂閱 or 個人 API, at the reviewer vendor's odds (secret scanning applies). The dispatch panel's sensitive warning SHALL name the reviewer's odds when only the reviewer is billed personally.

#### Scenario: Two rolls

- **WHEN** a sensitive ticket is written by Sonnet on 個人 API and reviewed by DeepSeek Reasoner on 個人 API, without secret scanning
- **THEN** one audit is rolled at 35% and another at 60%

#### Scenario: Company-billed reviewer

- **WHEN** a sensitive ticket is written by Sonnet on 公司 API and reviewed by Opus on 公司 API
- **THEN** no audit is rolled

---
### Requirement: Local reviewer and machines

A job whose reviewer is billed to 本地 GPU SHALL occupy the local GPU while it runs, exactly like a job whose writer is local (see `game-modes` and `local-hardware`): other local dispatches, local reviewers and local architecture evaluations SHALL be refused while it runs in parallel mode. Dispatching it SHALL mark the reviewer model's machines as used for the idle-machine penalty, and when it runs overnight it SHALL mark them on the next day like a local writer.

#### Scenario: Local reviewer holds the GPU

- **WHEN** in parallel mode a job written by Sonnet and reviewed by local Gemma 4 26B A4B is running
- **THEN** a local dispatch, a local reviewer button and a local evaluation are refused with 本地 GPU 忙

#### Scenario: Local reviewer counts as machine use

- **WHEN** the PC and DGX Spark are installed and the only local use of the day is a reviewer Qwen3-Coder-Next
- **THEN** ending the day drops no trust for idle machines

---
### Requirement: Dispatch panel warnings with a reviewer

With a reviewer other than 同一個, the dispatch panel's single warning (see `dispatch-outcome`) SHALL also check the reviewer: a sensitive ticket with a personally billed reviewer next to the writer's sensitive warnings, the reviewer's quota short next to the writer's, and the reviewer's wallet short next to the writer's, each written with the prefix 審核：. A reviewer whose vendor is down needs no warning, because the panel switches it back to 同一個 (see Reviewer choice on the dispatch panel). When the writer and reviewer use the same vendor and the same quota billing, the quota check SHALL compare the sum of both high estimates with the remaining quota; when both are billed to 個人 API, the wallet check SHALL compare the sum of both high cost estimates with the wallet.

#### Scenario: Shared subscription quota

- **WHEN** Sonnet and its reviewer Opus both use the Anthropic subscription, the writer's high estimate is 300k quota, the review's is 150k, and 400k quota is left
- **THEN** the panel warns 審核：額度不夠

---
### Requirement: Reviewer in saves

A day-start save SHALL store the selected reviewer and its billing, and each running job's reviewer, reviewer billing and review tokens. A save without these fields SHALL load with 同一個 for the selection and no reviewer for each job, and SHALL NOT be rejected; the save structure version SHALL NOT change.

#### Scenario: Old save loads

- **WHEN** a save written before this change, with a running job, is loaded
- **THEN** the game resumes, the selection's reviewer is 同一個 and the running job settles as reviewed by its own writer

---
### Requirement: Rules text for cross review

The rules modal's review section SHALL describe 交叉審核工具: its hours and budget, that the reviewer's gap sets the catch rate, the review token and time formulas with the 自審 and 嚴格審核 values, that the review is billed separately, that an unpaid review catches nothing, and the extra audit roll; every number SHALL be interpolated from the game's constants, in both zh-TW and en.

#### Scenario: Numbers follow constants

- **WHEN** the investment's hour cost constant is changed to 3 and the rules modal is opened
- **THEN** the cross-review paragraph states 3 hours
