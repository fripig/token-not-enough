## MODIFIED Requirements

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
