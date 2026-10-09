## MODIFIED Requirements

### Requirement: Subscription plans

Subscription plans SHALL be as follows, with daily and weekly quotas in k tokens. DeepSeek and 自架開源 SHALL have no subscription. The OpenAI plan Pro 200 SHALL keep the plan id `pro`, and Pro 500 SHALL use the plan id `pro500`.

##### Example: plans

| Vendor | Plan | Monthly NT$ | Daily | Weekly |
| --- | --- | --- | --- | --- |
| Anthropic | Pro | 650 | 450 | 1,800 |
| Anthropic | Max 5× | 3,300 | 2,200 | 9,000 |
| Anthropic | Max 20× | 6,500 | 9,000 | 36,000 |
| OpenAI | Plus | 650 | 500 | 2,000 |
| OpenAI | Pro 200 | 6,500 | 8,000 | 30,000 |
| OpenAI | Pro 500 | 16,250 | 12,500 | 50,000 |
| Google | AI Pro | 650 | 700 | 2,800 |
| Google | Ultra | 8,000 | 10,000 | 40,000 |
| 智譜 GLM | Lite | 100 | 1,500 | 6,000 |
| 智譜 GLM | Pro | 500 | 6,000 | 24,000 |
| Kimi | 會員 | 300 | 1,500 | 6,000 |

#### Scenario: Plan picker rows

- **WHEN** the opening modal opens
- **THEN** it shows plan rows for Anthropic, OpenAI, Google, 智譜 GLM and Kimi only, each starting with 不訂閱

#### Scenario: OpenAI row lists Plus, Pro 200 and Pro 500

- **WHEN** the opening modal opens
- **THEN** the OpenAI row's buttons read 不訂閱, Plus, Pro 200 and Pro 500 in that order, Pro 500 shows NT$16,250/月・每日 12.5M, and no button reads Pro alone

#### Scenario: Token amounts of 10M and above keep one decimal

- **WHEN** a token amount of 1,000k or more is shown (plan buttons, quota boxes, logs)
- **THEN** it is rounded to one decimal in M, and once the rounded value is 10 or more a trailing .0 is dropped: 10,000k shows 10M, 10,004k shows 10M, 9,960k shows 10M, 12,500k shows 12.5M, 10,234k shows 10.2M and 50,000k shows 50M; amounts that round below 10M show as before (9,940k shows 9.9M, 8,000k shows 8.0M, 450k shows 450k)

#### Scenario: Pro 500 at month start overdraws the wallet

- **WHEN** the player picks only OpenAI Pro 500 at month start and confirms, with the starting personal wallet of NT$8,000
- **THEN** the modal shows 這次要從個人錢包付 NT$16,250 and 付完剩 -NT$8,250, and after confirming the wallet is -NT$8,250, the subscription fee total is NT$16,250 and OpenAI's plan id is `pro500`

#### Scenario: Monday upgrade from Pro 200 to Pro 500

- **WHEN** on day 11 the player holding OpenAI Pro 200 changes it to Pro 500 and confirms
- **THEN** the player pays NT$4,875 ((16,250 − 6,500) × 2/4) and OpenAI's daily and weekly quotas become 12,500k and 50,000k
