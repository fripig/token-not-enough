## MODIFIED Requirements

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
