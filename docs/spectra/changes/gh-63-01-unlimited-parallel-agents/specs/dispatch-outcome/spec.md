## MODIFIED Requirements

### Requirement: Estimate display

The panel SHALL show estimated tokens (with no multiplier in the label), cost, success rate and hours (labelled 執行時間 in parallel mode and 工時 in serial mode). The success rate SHALL be green at 80% or more, amber at 50% or more, and red below. When review or store review applies, the label SHALL add （原 <raw rate>%）. The panel SHALL show at most one warning, in this priority: vendor down, local GPU busy, sensitive Chinese cloud, sensitive personal account, quota short, due today and unable to finish, will run overnight, serial hours short, wallet short. There SHALL be no warning about how many agents are running.

#### Scenario: Colour bands

- **WHEN** the shown success rate is 72%
- **THEN** it is shown in the amber style

#### Scenario: Label without multiplier

- **WHEN** two agents are running in parallel mode and the panel shows a ticket
- **THEN** the estimate label reads 預估 tokens with no ×multiplier

#### Scenario: Many running agents give no warning

- **WHEN** 6 agents are running in parallel mode with 8 hours left and the panel shows a complexity 1 ticket due in 3 days with Claude Code / Sonnet・公司 API
- **THEN** no warning is shown and the dispatch button is enabled
