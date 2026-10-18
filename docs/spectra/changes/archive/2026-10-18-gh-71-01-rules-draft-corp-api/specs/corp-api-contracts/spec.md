## MODIFIED Requirements

### Requirement: Contract list in rules and log

The rules modal billing tab SHALL list this run's contracted vendor names for 公司 API, joined by the list separator; when the list is empty it SHALL say 這局公司沒有簽任何廠商. When the rules modal is opened from the opening setup modal, the billing tab SHALL use the contract list currently ticked in that modal (in the fixed anthropic, openai, google order) instead of the confirmed list, on every tab switch until the rules modal closes; opened from anywhere else it SHALL use the confirmed list. Opening or closing the rules modal SHALL NOT change the ticked or the confirmed list. The opening setup log line SHALL end with ・公司 API：<vendor names joined by 、> or ・公司 API：無.

#### Scenario: Rules tab

- **WHEN** the contract list is OpenAI + Google and the player opens the 付費與稽核 tab
- **THEN** the 公司 API line names OpenAI and Google and does not name Anthropic

#### Scenario: Rules opened from the setup modal before confirming

- **WHEN** the confirmed list is Anthropic + Google, the player unticks Anthropic and Google and ticks OpenAI in the opening setup modal, then opens the rules from that modal and switches to the 付費與稽核 tab
- **THEN** the 公司 API line names OpenAI and does not name Anthropic or Google

#### Scenario: Nothing ticked in the setup modal

- **WHEN** the player unticks all three vendors in the opening setup modal and opens the rules from that modal
- **THEN** the 付費與稽核 tab says 這局公司沒有簽任何廠商

#### Scenario: Header rules keep the confirmed list

- **WHEN** the confirmed list is Anthropic + Google and the player opens the rules from the header button
- **THEN** the 公司 API line names Anthropic and Google

#### Scenario: Closing the rules keeps the ticks

- **WHEN** the player ticks OpenAI only in the opening setup modal, opens the rules from it, and closes the rules
- **THEN** the setup modal is shown again with OpenAI ticked and the confirmed list is still Anthropic + Google

#### Scenario: Setup log

- **WHEN** the player confirms the opening setup with no contracted vendor
- **THEN** the setup log line ends with ・公司 API：無
