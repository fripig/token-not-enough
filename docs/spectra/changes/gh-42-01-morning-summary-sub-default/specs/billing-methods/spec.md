## ADDED Requirements

### Requirement: Default billing when switching vendor

When the dispatch selection moves to a different non-local vendor (the player clicks a model of another vendor) and when the run's day 1 starts, the billing SHALL become 公司席位 if the player holds that vendor's seat, the option is usable for the selected ticket and the seat quota left covers the quota estimate; otherwise, unless the selected ticket is sensitive, 個人訂閱 if the player has a plan for that vendor, the option is usable and the plan quota left covers the quota estimate; otherwise the billing SHALL stay as it was. A sensitive ticket SHALL NOT be switched to 個人訂閱 by this default, because personal billing on a sensitive ticket risks a security audit. The quota estimate SHALL be the high end of the selected ticket's estimate times the model's quota weight, and any quota left when no ticket is selected. Choosing another model of the same vendor, selecting another ticket, loading a preset and confirming 週一調整 SHALL NOT apply this default.

#### Scenario: Subscription preferred

- **WHEN** the player has an Anthropic Pro plan with quota left, a complexity-2 ticket is selected on Gemini Pro with 公司 API, and the player clicks Sonnet
- **THEN** the billing becomes 個人訂閱

#### Scenario: Seat preferred over subscription

- **WHEN** the player holds an Anthropic seat and an Anthropic plan, a ticket is selected on Gemini Pro, and the player clicks Sonnet
- **THEN** the billing becomes 公司席位

#### Scenario: Nothing to prefer

- **WHEN** the player has no Anthropic plan and no seat, a ticket is selected on Gemini Pro with 公司 API, and the player clicks Sonnet
- **THEN** the billing stays 公司 API

#### Scenario: Same vendor keeps the choice

- **WHEN** Sonnet is selected with 個人 API although an Anthropic plan exists, and the player clicks Opus
- **THEN** the billing stays 個人 API

#### Scenario: Not enough quota

- **WHEN** the Anthropic plan has less quota left than the selected ticket's estimate high times Sonnet's weight, and the player switches from Gemini Pro with 公司 API to Sonnet
- **THEN** the billing stays 公司 API

#### Scenario: Outsourced ticket

- **WHEN** an outsourced ticket is selected, the player holds an Anthropic seat and no plan, and switches to Sonnet from Gemini Pro with 個人 API
- **THEN** the billing stays 個人 API

#### Scenario: Sensitive ticket keeps company billing

- **WHEN** a sensitive ticket is selected on Gemini Pro with 公司 API, the player has an Anthropic plan and no Anthropic seat, and switches to Sonnet
- **THEN** the billing stays 公司 API

#### Scenario: Sensitive ticket still gets a seat

- **WHEN** a sensitive ticket is selected on Gemini Pro with 公司 API, the player holds an Anthropic seat and an Anthropic plan, and switches to Sonnet
- **THEN** the billing becomes 公司席位

#### Scenario: Day 1

- **WHEN** the player confirms the opening setup with an Anthropic plan and the default Sonnet selection
- **THEN** the billing is 個人訂閱 when day 1 starts
