## MODIFIED Requirements

### Requirement: Investment panel and summary

The main screen SHALL show an investment panel listing each investment with its hour and budget cost, its effect, and either a buy button or 已完成; 寫 CLAUDE.md SHALL list the selected stacks first (in the fixed order laravel, rails, rust, app), then the unselected company stacks, then fe. The dispatch panel SHALL show a hint line naming investment effects active for the selected ticket. The month-end summary SHALL show the number of investments made. The setup rules list SHALL describe presets and investments in one bullet.

#### Scenario: Month-end summary

- **WHEN** the run ends after buying CLAUDE.md for laravel and 補測試
- **THEN** the summary shows 工程投資 2 項

#### Scenario: CLAUDE.md order with two stacks

- **WHEN** the run's stacks are rails and app
- **THEN** the CLAUDE.md buttons appear in the order rails, app, laravel, rust, fe
