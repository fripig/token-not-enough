# dispatch-presets Specification

## Purpose

Lets the player save up to three dispatch configurations (vendor, model, billing, review level) and dispatch a ticket with one click, falling back to the next saved configuration when one cannot be used for that ticket. It removes the repetitive re-selection that made each dispatch tedious.

## Requirements

### Requirement: Preset storage and defaults

The game SHALL keep three dispatch presets named 方案 A, 方案 B and 方案 C, each storing a vendor, a model, a billing method, a review level and a reasoning effort (0 = 低, 1 = 中, 2 = 高). A new run SHALL keep the presets of the previous run when every preset names an existing vendor, an existing model of that vendor and a billing method among sub, seat, api, corp and local. A preset without a reasoning effort SHALL be kept with effort 中. Otherwise, and on first load, the presets SHALL be: 方案 A DeepSeek Chat with 個人 API and 自審; 方案 B Claude Sonnet with 公司 API and 自審; 方案 C Claude Opus with 公司 API and 嚴格審核, all with effort 中. In 一般 mode a preset's stored effort SHALL be ignored when estimating or dispatching.

#### Scenario: Defaults on first load

- **WHEN** the page loads and the first run starts
- **THEN** the presets are A = deepseek/chat/api/review 1/effort 1, B = anthropic/sonnet/corp/review 1/effort 1, C = anthropic/opus/corp/review 2/effort 1

#### Scenario: Presets carry over to the next run

- **WHEN** the player saved anthropic/haiku/sub/review 0/effort 2 into 方案 A and starts the next run with 再玩一個月
- **THEN** 方案 A is still anthropic/haiku/sub/review 0/effort 2

#### Scenario: Preset without effort

- **WHEN** a stored preset is anthropic/sonnet/corp/review 1 with no effort at run start
- **THEN** the preset is kept as anthropic/sonnet/corp/review 1/effort 1

#### Scenario: Invalid preset falls back to defaults

- **WHEN** a stored preset names a model id that does not exist for its vendor at run start
- **THEN** all three presets are reset to the defaults

#### Scenario: Stored effort ignored in 一般 mode

- **WHEN** 方案 A stores effort 2 and the run is in 一般 mode
- **THEN** one-click dispatch with 方案 A estimates and dispatches as effort 中


<!-- @trace
source: reasoning-effort
updated: 2026-10-09
code:
  - public/js/modals.js
  - CLAUDE.md
  - public/js/main.js
  - public/js/state.js
  - tools/check.js
  - tools/sim.js
  - public/js/data.js
  - docs/DESIGN.md
  - public/js/actions.js
  - public/js/view.js
  - public/js/calc.js
-->

---
### Requirement: Saving and loading presets in the dispatch panel

The dispatch panel SHALL offer a save button for each preset that copies the current vendor, model, billing, review and reasoning-effort selection into that preset, and a load button for each preset that copies the preset into the current selection without dispatching. In 進階 mode the load button label SHALL show the preset's effort when it is not 中.

#### Scenario: Save current selection

- **WHEN** the selection is Gemini Pro, 公司 API, 不審核, effort 高 and the player presses 存成方案 B
- **THEN** 方案 B becomes google/pro/corp/review 0/effort 2 and no ticket is dispatched

#### Scenario: Load a preset

- **WHEN** the player presses 載入方案 C
- **THEN** the dispatch panel shows 方案 C's vendor, model, billing, review and effort as selected and the estimate is recomputed

#### Scenario: Effort in the load label

- **WHEN** 方案 B stores effort 高 and the run is in 進階 mode
- **THEN** the 載入方案 B button label includes 高強度


<!-- @trace
source: reasoning-effort
updated: 2026-10-09
code:
  - public/js/modals.js
  - CLAUDE.md
  - public/js/main.js
  - public/js/state.js
  - tools/check.js
  - tools/sim.js
  - public/js/data.js
  - docs/DESIGN.md
  - public/js/actions.js
  - public/js/view.js
  - public/js/calc.js
-->

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
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: One-click dispatch from the ticket card

Each ticket card in the queue SHALL show a one-click dispatch button that uses the first usable preset in A, B, C order. The button SHALL name the chosen preset with its agent, model and billing, and when an earlier preset was skipped it SHALL show the first skipped preset's reason. When no preset is usable the button SHALL be disabled and read 沒有可用方案. The button SHALL be disabled when no work slot is free (parallel mode) or fewer than 0.2 hours remain. Pressing it SHALL dispatch the ticket exactly as the dispatch panel would with that preset selected, and SHALL log the skipped preset and reason when skipping occurred. A sensitive ticket SHALL NOT skip a preset with personal billing; the card SHALL show the audit-risk warning instead.

#### Scenario: Fallback with reason

- **WHEN** a finance-client ticket is dispatched with the one-click button and 方案 A is DeepSeek Chat
- **THEN** the ticket is dispatched with 方案 B and the log names that 方案 A was skipped with the ban reason

#### Scenario: No usable preset

- **WHEN** all three presets are unusable for a ticket
- **THEN** the ticket's one-click button is disabled and reads 沒有可用方案

#### Scenario: Sensitive ticket keeps personal billing

- **WHEN** a sensitive ticket's first usable preset uses 個人 API
- **THEN** that preset is used and the card shows the audit-risk warning

<!-- @trace
source: dispatch-presets-and-investments
updated: 2026-10-09
code:
  - public/css/style.css
  - public/js/game.js
  - tools/check.js
  - tools/sim.js
-->