## MODIFIED Requirements

### Requirement: Preset storage and defaults

The game SHALL keep three dispatch presets named 方案 A, 方案 B and 方案 C, each storing a vendor, a model, a billing method, a review level, a reasoning effort (0 = 低, 1 = 中, 2 = 高), a requested SDD level (0 = 不用, 1 = markdown, 2 = 框架) and a reviewer (none for 同一個, or a reviewer vendor, reviewer model and reviewer billing method, see `cross-model-review`). A new run SHALL keep the presets of the previous run when every preset names an existing vendor, an existing model of that vendor and a billing method among sub, seat, api, corp and local. A preset without a reasoning effort SHALL be kept with effort 中. A preset without a requested SDD level SHALL be kept with requested level 2. A preset without a reviewer SHALL be kept with reviewer 同一個. A preset whose requested SDD level is present but not 0, 1 or 2 SHALL count as invalid. A preset whose reviewer names a vendor or model that does not exist, or a reviewer billing method not among sub, seat, api, corp and local, SHALL count as invalid. Otherwise, and on first load, the presets SHALL be: 方案 A DeepSeek Chat with 個人 API, 自審 and SDD 不用; 方案 B Claude Sonnet with 公司 API, 自審 and SDD level 2; 方案 C Claude Opus with 公司 API, 嚴格審核 and SDD level 2, all with effort 中 and reviewer 同一個. In 一般 mode a preset's stored effort SHALL be ignored when estimating or dispatching. When a preset is estimated, loaded or one-click dispatched, its SDD level SHALL be applied as min(requested level, owned SDD level), so a preset requesting a level that is not owned uses the highest owned level and SHALL NOT be skipped for that reason. Likewise, while 交叉審核工具 is not owned or the preset's review level is 不審核, a stored reviewer SHALL be treated as 同一個 and SHALL NOT make the preset unusable.

#### Scenario: Defaults on first load

- **WHEN** the page loads and the first run starts
- **THEN** the presets are A = deepseek/chat/api/review 1/effort 1/SDD 0, B = anthropic/sonnet/corp/review 1/effort 1/SDD 2, C = anthropic/opus/corp/review 2/effort 1/SDD 2, all with reviewer 同一個

#### Scenario: Presets carry over to the next run

- **WHEN** the player saved anthropic/haiku/sub/review 0/effort 2/SDD 1 into 方案 A and starts the next run with 再玩一個月
- **THEN** 方案 A is still anthropic/haiku/sub/review 0/effort 2/SDD 1

#### Scenario: Preset without effort

- **WHEN** a stored preset is anthropic/sonnet/corp/review 1 with no effort, no SDD level and no reviewer at run start
- **THEN** the preset is kept as anthropic/sonnet/corp/review 1/effort 1/SDD 2 with reviewer 同一個

#### Scenario: Invalid preset falls back to defaults

- **WHEN** a stored preset names a model id that does not exist for its vendor, an SDD level of 3, or a reviewer model id that does not exist, at run start
- **THEN** all three presets are reset to the defaults

#### Scenario: Stored effort ignored in 一般 mode

- **WHEN** 方案 A stores effort 2 and the run is in 一般 mode
- **THEN** one-click dispatch with 方案 A estimates and dispatches as effort 中

#### Scenario: SDD level capped to ownership

- **WHEN** 方案 B requests SDD level 2, only SDD level 1 is owned and the player one-click dispatches a ticket with 方案 B
- **THEN** 方案 B is not skipped and the dispatched job applies SDD level 1

#### Scenario: Reviewer ignored without the investment

- **WHEN** 方案 B stores reviewer Opus on 公司 API, 交叉審核工具 is not owned, and the player one-click dispatches with 方案 B
- **THEN** 方案 B is not skipped and the job is reviewed by its own writer

---
### Requirement: Saving and loading presets in the dispatch panel

The dispatch panel SHALL offer a save button for each preset that copies the current vendor, model, billing, review, reasoning-effort, requested SDD level and reviewer (vendor, model and billing, or 同一個) selection into that preset, and a load button for each preset that copies the preset into the current selection without dispatching. The load buttons SHALL be at the top of the dispatch panel, right under the ticket title and before the estimate; the save buttons SHALL be at the bottom, after the fine-tuning sections. A load button SHALL be shown as selected when the current selection equals its preset on vendor, model, billing, review, applied SDD level, effective reviewer (see `cross-model-review`) and, in 進階 mode, reasoning effort. In 進階 mode the load button label SHALL show the preset's effort when it is not 中. While SDD level 1 or higher is owned, the load button label SHALL show the preset's applied SDD level as SDD 不用, SDD markdown or SDD 框架; while SDD is not owned it SHALL NOT mention SDD. While 交叉審核工具 is owned and the preset's effective reviewer is not 同一個, the load button label SHALL add `<reviewer model> 審`; otherwise it SHALL NOT mention a reviewer.

#### Scenario: Save current selection

- **WHEN** the selection is Gemini Pro, 公司 API, 不審核, effort 高, requested SDD level 0 and the player presses 存成方案 B
- **THEN** 方案 B becomes google/pro/corp/review 0/effort 2/SDD 0 and no ticket is dispatched

#### Scenario: Save a reviewer

- **WHEN** 交叉審核工具 is owned and the selection is Sonnet, 公司 API, 自審 reviewed by Opus on 公司 API, and the player presses 存成方案 A
- **THEN** 方案 A stores reviewer anthropic/opus/corp and its load label includes Opus 審

#### Scenario: Load a preset

- **WHEN** the player presses 載入方案 C
- **THEN** the dispatch panel shows 方案 C's vendor, model, billing, review, effort, SDD level and reviewer as selected, the estimate at the top is recomputed and the 載入方案 C button is shown as selected

#### Scenario: Effort in the load label

- **WHEN** 方案 B stores effort 高 and the run is in 進階 mode
- **THEN** the 載入方案 B button label includes 高強度

#### Scenario: SDD in the load label

- **WHEN** the presets are the defaults and SDD level 1 is owned
- **THEN** the 載入方案 A label includes SDD 不用 and the 載入方案 B and C labels include SDD markdown; with SDD not owned no label includes SDD

---
### Requirement: Preset usability per ticket

A preset SHALL be unusable for a ticket, with a reason, in this priority order: the vendor has an outage today (今日當機); the model is banned for the ticket's client (the existing ban reason text); the model needs a machine that is not installed (需要 <machine name>, see `local-hardware`); the billing method is not available or not usable for that vendor (the billing note, or 沒有公司席位 for seat without an approved seat of that vendor); billing is local while the local GPU is busy in parallel mode (本地 GPU 忙); billing is sub or seat and the high end of the quota estimate exceeds the remaining quota (額度不夠); billing is api and the high end of the cost estimate exceeds the personal wallet (錢包不夠). When the preset's effective reviewer is not 同一個, the same checks SHALL then be applied to the reviewer vendor, reviewer model, reviewer billing and the review part's estimate, each reason prefixed with 審核：, plus 審核：寫的是本地模型時只能同一個 when the writer is local and the reviewer is local; when writer and reviewer use the same vendor and the same quota billing, the quota check SHALL compare the sum of both high estimates with the remaining quota, and when both are billed to 個人 API, the wallet check SHALL compare the sum of both high cost estimates with the wallet. A reviewer billed to 公司席位 without an approved seat of that vendor SHALL give 審核：沒有公司席位. Free work slots and remaining hours SHALL NOT be preset reasons.

#### Scenario: Reasons

- **WHEN** usability is evaluated for each case in the table
- **THEN** the reason matches

##### Example: reason table

| Preset | Ticket / state | Reason |
| ------ | -------------- | ------ |
| deepseek/chat/api | finance client (ban api) | the cnBlock reason text |
| anthropic/sonnet/corp | anthropic outage today | 今日當機 |
| local/gemma4/local | no DGX Spark installed | 需要 NVIDIA DGX Spark |
| local/glm53/local | government client, Mac installed | 中國權重禁用 |
| google/flash/sub | no Google subscription | 沒有訂閱 |
| anthropic/sonnet/seat | seat approved for google | 沒有公司席位 |
| local/qwen/local | parallel mode, a local job running | 本地 GPU 忙 |
| anthropic/opus/sub | quota left below estimate high × w | 額度不夠 |
| anthropic/opus/api | wallet NT$100, estimate high NT$400 | 錢包不夠 |
| anthropic/sonnet/corp | none of the above | usable |
| deepseek/chat/api reviewed by anthropic/opus/corp | 交叉審核工具 owned, anthropic outage today | 審核：今日當機 |
| anthropic/sonnet/corp reviewed by deepseek/reasoner/api | 交叉審核工具 owned, finance client | 審核： followed by the cnBlock reason text |
| anthropic/sonnet/sub reviewed by anthropic/opus/sub | 交叉審核工具 owned, writer high 300k, review high 150k, 400k left | 審核：額度不夠 |
| anthropic/sonnet/corp reviewed by anthropic/opus/corp | 交叉審核工具 not owned, anthropic outage today | 今日當機 |
