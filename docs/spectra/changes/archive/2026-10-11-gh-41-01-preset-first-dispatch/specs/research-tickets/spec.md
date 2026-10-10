## MODIFIED Requirements

### Requirement: Direct dispatch token premium

Dispatching a research ticket without researching it SHALL multiply its token estimate and actual tokens by RESEARCH_DIRECT_TK (4). The success rate and run time SHALL be the same as for the same ticket without the research flag. The one-click buttons SHALL use the multiplied estimate for their quota and wallet checks; batch dispatch is unaffected because it only dispatches tickets of shown complexity 2 or less.

#### Scenario: Sonnet on a research ticket

- **WHEN** Sonnet without review estimates a front-end complexity-4 research ticket with base 550k
- **THEN** the estimate is 2,200k (550 × 4) and the success rate and hours equal those of the same ticket without the flag

#### Scenario: One-click button disabled when the premium is unaffordable

- **WHEN** preset A bills personal API and the wallet covers the ticket's normal estimate but not 4 × it
- **THEN** the ticket's 方案 A one-click button is disabled with 錢包不夠
