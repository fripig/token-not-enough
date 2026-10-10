## MODIFIED Requirements

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

The dispatch panel SHALL offer a save button for each preset that copies the current vendor, model, billing, review, reasoning-effort and requested SDD level selection into that preset, and a load button for each preset that copies the preset into the current selection without dispatching. In 進階 mode the load button label SHALL show the preset's effort when it is not 中. While SDD level 1 or higher is owned, the load button label SHALL show the preset's applied SDD level as SDD 不用, SDD markdown or SDD 框架; while SDD is not owned it SHALL NOT mention SDD.

#### Scenario: Save current selection

- **WHEN** the selection is Gemini Pro, 公司 API, 不審核, effort 高, requested SDD level 0 and the player presses 存成方案 B
- **THEN** 方案 B becomes google/pro/corp/review 0/effort 2/SDD 0 and no ticket is dispatched

#### Scenario: Load a preset

- **WHEN** the player presses 載入方案 C
- **THEN** the dispatch panel shows 方案 C's vendor, model, billing, review, effort and SDD level as selected and the estimate is recomputed

#### Scenario: Effort in the load label

- **WHEN** 方案 B stores effort 高 and the run is in 進階 mode
- **THEN** the 載入方案 B button label includes 高強度

#### Scenario: SDD in the load label

- **WHEN** the presets are the defaults and SDD level 1 is owned
- **THEN** the 載入方案 A label includes SDD 不用 and the 載入方案 B and C labels include SDD markdown; with SDD not owned no label includes SDD
