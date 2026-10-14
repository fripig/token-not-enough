## MODIFIED Requirements

### Requirement: One-click dispatch from the ticket card

Each ticket card in the queue SHALL show three one-click dispatch buttons, one for each of 方案 A, 方案 B and 方案 C in that order. Each button SHALL name its preset letter, the preset's model and its billing. A button whose preset is unusable for that ticket (requirement "Preset usability per ticket") SHALL be disabled and show the reason. All three buttons SHALL be disabled when fewer than 0.2 hours remain; how many agents are running in parallel mode SHALL NOT disable them. Pressing an enabled button SHALL dispatch the ticket exactly as the dispatch panel would with that preset selected, with the dispatch trigger 一鍵派工方案 <letter>; it SHALL NOT fall back to another preset and SHALL NOT log skipped presets. A sensitive ticket SHALL NOT disable a preset with personal billing; that button SHALL show the audit odds instead. Batch dispatch keeps choosing the first usable preset in A, B, C order and logging skipped presets (requirement "Batch dispatch unlocked by skills" in `engineering-investments`).

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

#### Scenario: Many agents running

- **WHEN** 6 agents are running in parallel mode with 8 hours left and a complexity 2 front-end ticket from 內部專案 is in the queue with the default presets
- **THEN** its 方案 A button is enabled and pressing it dispatches a seventh agent

#### Scenario: Out of time

- **WHEN** fewer than 0.2 hours remain
- **THEN** all three one-click buttons on every card are disabled
