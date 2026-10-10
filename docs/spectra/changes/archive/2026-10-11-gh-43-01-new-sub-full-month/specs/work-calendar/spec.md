## MODIFIED Requirements

### Requirement: Subscription purchase and weekly adjustment

The opening modal 月初：決定這個月怎麼付 token SHALL let the player pick one plan per subscription vendor (Anthropic, OpenAI, Google, 智譜 GLM, Kimi), default 不訂閱, and SHALL charge the full monthly price of every chosen plan to the personal wallet on confirm. The Monday modal 週一：調整訂閱 SHALL let the player change plans and SHALL charge, per vendor: when the current plan is 不訂閱 (price NT$0) and the new plan is paid, the full monthly price of the new plan; otherwise max(0, new price − current price) × (weeks left ÷ 4), where weeks left = 4 − floor((day − 1) ÷ 5). Downgrades SHALL take effect immediately with no refund. Every subscription payment SHALL be added to the subscription fee total. The Monday modal lead line SHALL say that a new subscription is charged the full month, an upgrade pays the difference for the weeks left, and a downgrade is not refunded. The modal SHALL show 這次要從個人錢包付 with the amount and the wallet balance after paying. When the amount is above NT$0 and exceeds the wallet, the confirm button (開始第 1 天 or 確定調整) SHALL be disabled and the modal SHALL show 錢包不夠付這次的訂閱; plans SHALL stay selectable. An amount of NT$0 (no change or only downgrades) SHALL never be blocked, even with a negative wallet, and plans already held SHALL keep working whatever the wallet. Choosing 不改了 SHALL close the modal without changes.

#### Scenario: Buying at the start

- **WHEN** the player picks Anthropic Pro (NT$650) and Kimi 會員 (NT$300) and starts day 1
- **THEN** the wallet drops from NT$8,000 to NT$7,050 and the subscription fee total is NT$950

#### Scenario: Not enough money for the plans

- **WHEN** at month start the player picks only OpenAI Pro 500 (NT$16,250) with the starting wallet of NT$8,000
- **THEN** 開始第 1 天 is disabled, the modal shows 錢包不夠付這次的訂閱, and nothing is charged; switching OpenAI to Pro 200 (NT$6,500) enables it again

#### Scenario: Prorated upgrade

##### Example: upgrade costs

| Day | From | To | Charged |
| --- | --- | --- | --- |
| 6 | Anthropic Pro NT$650 | Max 5× NT$3,300 | NT$1,987.5 (2,650 × 3/4) |
| 11 | Anthropic Pro NT$650 | Max 5× NT$3,300 | NT$1,325 (2,650 × 2/4) |
| 16 | OpenAI Plus NT$650 | Pro 200 NT$6,500 | NT$1,462.5 (5,850 × 1/4) |
| 11 | Anthropic Max 5× | Pro | NT$0, plan becomes Pro |

#### Scenario: New subscription on Monday is charged the full month

##### Example: new subscription costs

| Day | From | To | Charged |
| --- | --- | --- | --- |
| 16 | OpenAI 不訂閱 | Plus NT$650 | NT$650 |
| 16 | OpenAI 不訂閱 | Pro 200 NT$6,500 | NT$6,500 |
| 6 | Kimi 不訂閱 | 會員 NT$300 | NT$300 |

#### Scenario: Re-subscribing after dropping a plan

- **WHEN** on day 6 the player downgrades Anthropic Pro to 不訂閱 (NT$0, no refund) and on day 11 picks Anthropic Pro again
- **THEN** day 11 charges the full NT$650

#### Scenario: Monday upgrade the wallet cannot cover

- **WHEN** on day 6 the wallet is NT$1,000 and the player changes Anthropic Pro to Max 5× (NT$1,987.5)
- **THEN** 確定調整 is disabled, the modal shows 錢包不夠付這次的訂閱, and 不改了 closes the modal with the plan unchanged

#### Scenario: Negative wallet does not touch held plans

- **WHEN** on day 6 the wallet is −NT$350 and the player holding Anthropic Max 5× opens 週一：調整訂閱
- **THEN** 確定調整 is enabled with no change, downgrading to Pro is allowed and charges NT$0, and the wallet stays −NT$350
