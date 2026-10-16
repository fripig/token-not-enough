# corp-api-contracts Specification

## Purpose

Lets the player choose, at the start of a run, which vendors their company has a company API contract with, so the game can match how the player's own workplace pays for AI. The choice decides where the 公司 API billing option is available.

## Requirements

### Requirement: Company API contract setting

The opening setup modal SHALL show a 公司 API 合約 section with one toggle button each for Anthropic, OpenAI and Google, in that order, with the hint 公司有簽約的廠商才能走公司 API；都不勾就是公司不出 AI 的錢（預算只剩工程投資用）。 Each click SHALL toggle that vendor; any subset SHALL be allowed, including none. The run's contract list SHALL be stored in vendor order anthropic, openai, google. The default SHALL be Anthropic + Google. The choice SHALL persist to the next run started with 再玩一個月; a stored value that is not an array of distinct vendors from those three SHALL fall back to the default. Changing only this setting SHALL NOT regenerate day-1 tickets or outsourced tickets. The weekly 調整訂閱 modal SHALL NOT show the section, and the list SHALL NOT change during a run.

#### Scenario: Default and persistence

- **WHEN** the first run starts, the player unticks Google and ticks OpenAI, finishes the month and clicks 再玩一個月
- **THEN** the first run's modal preselects Anthropic and Google, and the second run's modal preselects Anthropic and OpenAI

#### Scenario: Empty list is allowed

- **WHEN** the player unticks every vendor and confirms
- **THEN** the run starts with an empty contract list and 公司 API is unavailable for every vendor

#### Scenario: Invalid stored value

- **WHEN** a run starts and the carried-over contract value is not a valid list
- **THEN** the run's contract list is normalized as below

##### Example: normalization

| Stored value | Run's contract list |
| --- | --- |
| `['google','anthropic']` | `['anthropic','google']` |
| `[]` | `[]` |
| `['openai','deepseek']` | `['anthropic','google']` |
| `['openai','openai']` | `['anthropic','google']` |
| `true` | `['anthropic','google']` |
| missing | `['anthropic','google']` |

#### Scenario: Toggle does not redraw tickets

- **WHEN** the player toggles OpenAI in the opening modal without changing work content or outsourcing
- **THEN** the day-1 ticket ids and titles stay the same

#### Scenario: Weekly modal

- **WHEN** the weekly 調整訂閱 modal opens
- **THEN** no company API contract section is shown

---
### Requirement: Contract list scope

The contract list SHALL only decide company API availability (see `billing-methods`) and the company pool of the usage challenge (see `quota-burn`). It SHALL NOT affect which vendors can be requested as team seats, the best-score key, or the grade thresholds.

#### Scenario: Seats ignore contracts

- **WHEN** the contract list is empty and the player opens the seat request on a Monday
- **THEN** Anthropic, OpenAI and Google are offered as usual

#### Scenario: Same best-score key

- **WHEN** a parallel Laravel run with only OpenAI contracted ends
- **THEN** the best score is compared against and stored under the same key a default-contract run would use

---
### Requirement: Contract list in rules and log

The rules modal billing tab SHALL list this run's contracted vendor names for 公司 API, joined by the list separator; when the list is empty it SHALL say 這局公司沒有簽任何廠商. The opening setup log line SHALL end with ・公司 API：<vendor names joined by 、> or ・公司 API：無.

#### Scenario: Rules tab

- **WHEN** the contract list is OpenAI + Google and the player opens the 付費與稽核 tab
- **THEN** the 公司 API line names OpenAI and Google and does not name Anthropic

#### Scenario: Setup log

- **WHEN** the player confirms the opening setup with no contracted vendor
- **THEN** the setup log line ends with ・公司 API：無

---
### Requirement: Contract list in saves

The contract list SHALL be saved with the run. A save without the field SHALL load with Anthropic + Google. `SAVE_VER` SHALL NOT change.

#### Scenario: Old save

- **WHEN** a save written before this capability is resumed
- **THEN** 公司 API is available for Anthropic and Google and not for OpenAI
