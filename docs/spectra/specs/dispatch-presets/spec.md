# dispatch-presets Specification

## Purpose

Lets the player save up to three dispatch configurations (vendor, model, billing, review level) and dispatch a ticket with one click, falling back to the next saved configuration when one cannot be used for that ticket. It removes the repetitive re-selection that made each dispatch tedious.

## Requirements

### Requirement: Preset storage and defaults

The game SHALL keep three dispatch presets named 方案 A, 方案 B and 方案 C, each storing a vendor, a model, a billing method, a review level, a reasoning effort (0 = 低, 1 = 中, 2 = 高) and a requested SDD level (0 = 不用, 1 = markdown, 2 = 框架). A new run SHALL keep the presets of the previous run when every preset names an existing vendor, an existing model of that vendor and a billing method among sub, seat, api, corp and local. A preset without a reasoning effort SHALL be kept with effort 中. A preset without a requested SDD level SHALL be kept with requested level 2. A preset whose requested SDD level is present but not 0, 1 or 2 SHALL count as invalid. Otherwise, and on first load, the presets SHALL be: 方案 A DeepSeek Chat with 個人 API, 自審 and SDD 不用; 方案 B Claude Sonnet with 公司 API, 自審 and SDD level 2; 方案 C Claude Opus with 公司 API, 嚴格審核 and SDD level 2, all with effort 中. In 一般 mode a preset's stored effort SHALL be ignored when estimating or dispatching. When a preset is estimated, loaded or one-click dispatched, its SDD level SHALL be applied as min(requested level, owned SDD level), so a preset requesting a level that is not owned uses the highest owned level and SHALL NOT be skipped for that reason.

#### Scenario: Defaults on first load

- **WHEN** the page loads and the first run starts
- **THEN** the presets are A = deepseek/chat/api/review 1/effort 1/SDD 0, B = anthropic/sonnet/corp/review 1/effort 1/SDD 2, C = anthropic/opus/corp/review 2/effort 1/SDD 2

#### Scenario: Presets carry over to the next run

- **WHEN** the player saved anthropic/haiku/sub/review 0/effort 2/SDD 1 into 方案 A and starts the next run with 再玩一個月
- **THEN** 方案 A is still anthropic/haiku/sub/review 0/effort 2/SDD 1

#### Scenario: Preset without effort

- **WHEN** a stored preset is anthropic/sonnet/corp/review 1 with no effort and no SDD level at run start
- **THEN** the preset is kept as anthropic/sonnet/corp/review 1/effort 1/SDD 2

#### Scenario: Invalid preset falls back to defaults

- **WHEN** a stored preset names a model id that does not exist for its vendor, or an SDD level of 3, at run start
- **THEN** all three presets are reset to the defaults

#### Scenario: Stored effort ignored in 一般 mode

- **WHEN** 方案 A stores effort 2 and the run is in 一般 mode
- **THEN** one-click dispatch with 方案 A estimates and dispatches as effort 中

#### Scenario: SDD level capped to ownership

- **WHEN** 方案 B requests SDD level 2, only SDD level 1 is owned and the player one-click dispatches a ticket with 方案 B
- **THEN** 方案 B is not skipped and the dispatched job applies SDD level 1

---
### Requirement: Saving and loading presets in the dispatch panel

The dispatch panel SHALL offer a save button for each preset that copies the current vendor, model, billing, review, reasoning-effort and requested SDD level selection into that preset, and a load button for each preset that copies the preset into the current selection without dispatching. The load buttons SHALL be at the top of the dispatch panel, right under the ticket title and before the estimate; the save buttons SHALL be at the bottom, after the fine-tuning sections. A load button SHALL be shown as selected when the current selection equals its preset on vendor, model, billing, review, applied SDD level and, in 進階 mode, reasoning effort. In 進階 mode the load button label SHALL show the preset's effort when it is not 中. While SDD level 1 or higher is owned, the load button label SHALL show the preset's applied SDD level as SDD 不用, SDD markdown or SDD 框架; while SDD is not owned it SHALL NOT mention SDD.

#### Scenario: Save current selection

- **WHEN** the selection is Gemini Pro, 公司 API, 不審核, effort 高, requested SDD level 0 and the player presses 存成方案 B
- **THEN** 方案 B becomes google/pro/corp/review 0/effort 2/SDD 0 and no ticket is dispatched

#### Scenario: Load a preset

- **WHEN** the player presses 載入方案 C
- **THEN** the dispatch panel shows 方案 C's vendor, model, billing, review, effort and SDD level as selected, the estimate at the top is recomputed and the 載入方案 C button is shown as selected

#### Scenario: Effort in the load label

- **WHEN** 方案 B stores effort 高 and the run is in 進階 mode
- **THEN** the 載入方案 B button label includes 高強度

#### Scenario: SDD in the load label

- **WHEN** the presets are the defaults and SDD level 1 is owned
- **THEN** the 載入方案 A label includes SDD 不用 and the 載入方案 B and C labels include SDD markdown; with SDD not owned no label includes SDD

---
### Requirement: Preset usability per ticket

A preset SHALL be unusable for a ticket, with a reason, in this priority order: the vendor has an outage today (今日當機); the model is banned for the ticket's client (the existing ban reason text); the model needs a machine that is not installed (需要 <machine name>, see `local-hardware`); the billing method is not available or not usable for that vendor (the billing note, or 沒有公司席位 for seat without an approved seat of that vendor); billing is local while the local GPU is busy in parallel mode (本地 GPU 忙); billing is sub or seat and the high end of the quota estimate exceeds the remaining quota (額度不夠); billing is api and the high end of the cost estimate exceeds the personal wallet (錢包不夠). Free work slots and remaining hours SHALL NOT be preset reasons.

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
  - tools/check/dispatch-presets.test.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: One-click dispatch from the ticket card

Each ticket card in the queue SHALL show three one-click dispatch buttons, one for each of 方案 A, 方案 B and 方案 C in that order. Each button SHALL name its preset letter, the preset's model and its billing. A button whose preset is unusable for that ticket (requirement "Preset usability per ticket") SHALL be disabled and show the reason. All three buttons SHALL be disabled when no work slot is free (parallel mode) or fewer than 0.2 hours remain. Pressing an enabled button SHALL dispatch the ticket exactly as the dispatch panel would with that preset selected, with the dispatch trigger 一鍵派工方案 <letter>; it SHALL NOT fall back to another preset and SHALL NOT log skipped presets. A sensitive ticket SHALL NOT disable a preset with personal billing; that button SHALL show the audit odds instead. Batch dispatch keeps choosing the first usable preset in A, B, C order and logging skipped presets (requirement "Batch dispatch unlocked by skills" in `engineering-investments`).

#### Scenario: Choose a preset on a finance ticket

- **WHEN** a finance-client ticket is in the queue with the default presets and the player presses its 方案 B button
- **THEN** the 方案 A button is disabled showing the ban reason, the ticket is dispatched with Claude Code / Sonnet・公司 API and the log names 一鍵派工方案 B without a skipped preset

#### Scenario: Disabled preset does nothing

- **WHEN** one-click dispatch is invoked for a preset that is unusable for the ticket
- **THEN** nothing is dispatched and no game value changes

#### Scenario: No usable preset

- **WHEN** all three presets are unusable for a ticket
- **THEN** all three of the ticket's one-click buttons are disabled, each showing its reason

#### Scenario: Sensitive ticket keeps personal billing

- **WHEN** a sensitive ticket's 方案 A uses 個人 API with DeepSeek
- **THEN** the 方案 A button is enabled and shows the audit odds 60%

#### Scenario: No free slot

- **WHEN** every work slot is busy in parallel mode
- **THEN** all three one-click buttons on every card are disabled
