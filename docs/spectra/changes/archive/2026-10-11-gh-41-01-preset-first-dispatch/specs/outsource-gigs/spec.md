## MODIFIED Requirements

### Requirement: Personal billing only for outsourced tickets

For an outsourced ticket, 公司 API and 公司席位 (for any approved seat vendor) SHALL be unusable with the reason 外包不能用公司資源 in the dispatch panel; a one-click button whose preset uses either SHALL be disabled with that reason, and batch dispatch SHALL skip such a preset with that reason. Dispatching and architecture evaluation SHALL do nothing when the selected billing is 公司 API or 公司席位 for an outsourced ticket. Personal subscription, personal API and local GPU SHALL work as for company tickets.

#### Scenario: Dispatch panel

- **WHEN** an outsourced ticket is selected with 公司 API previously chosen
- **THEN** the 公司 API option is disabled with 外包不能用公司資源 and the selection moves to the first usable billing

#### Scenario: Preset buttons

- **WHEN** an outsourced ticket's first preset uses 公司 API and the second uses 個人 API
- **THEN** the ticket's 方案 A one-click button is disabled with 外包不能用公司資源 and its 方案 B button dispatches with 個人 API

#### Scenario: Batch dispatch

- **WHEN** skills are invested, every preset uses 公司 API, and the queue holds a complexity 1 company ticket and a complexity 1 outsourced ticket
- **THEN** batch dispatch sends the company ticket and skips the outsourced ticket

#### Scenario: Direct dispatch refused

- **WHEN** dispatch is called for an outsourced ticket with billing set to 公司 API
- **THEN** no job is created and no budget changes
