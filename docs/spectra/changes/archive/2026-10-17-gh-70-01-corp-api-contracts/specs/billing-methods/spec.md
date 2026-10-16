## MODIFIED Requirements

### Requirement: Billing options per vendor

For a local model the only billing option SHALL be 本地 GPU (note 不花 token 錢，但很慢). For any other vendor the options SHALL be, in order: 個人訂閱 (available only with a plan, note 沒有訂閱 or `<plan>・剩 <quota>`), 公司席位 (only when the player holds that vendor's seat, see `team-seats`), 個人 API (available only while the wallet is above NT$0, note 自己的信用卡; otherwise note 錢包見底), and 公司 API (available only for a vendor in the run's contract list (see `corp-api-contracts`) while the company budget is above 0; otherwise note 公司沒簽約 or 預算用完, else 走部門預算). Outsourced tickets add their own restriction (see `outsource-gigs`). Dispatch and architecture evaluation SHALL NOT start with a billing option that is not available, even when called without the dispatch panel.

#### Scenario: No subscription

- **WHEN** the player has no Google plan and selects Gemini Pro
- **THEN** 個人訂閱 is disabled with the note 沒有訂閱 and 個人 API and 公司 API are enabled

#### Scenario: Company budget used up

- **WHEN** the company budget is NT$0 and the player selects Sonnet
- **THEN** 公司 API is disabled with the note 預算用完

#### Scenario: Empty wallet

- **WHEN** the wallet is NT$0 or less and the player selects Sonnet
- **THEN** 個人 API is disabled with the note 錢包見底

#### Scenario: Unavailable billing cannot start

- **WHEN** the wallet is NT$0, Sonnet on 個人 API is selected, and dispatch or evaluation is triggered directly
- **THEN** no agent starts, no hours are spent and the ticket is not evaluated

#### Scenario: No contracted vendor

- **WHEN** the run's contract list is empty and the player selects Sonnet, Sol or Gemini Pro
- **THEN** 公司 API is disabled with the note 公司沒簽約 even though the company budget is above 0
