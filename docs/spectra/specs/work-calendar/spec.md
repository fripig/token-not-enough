# work-calendar Specification

## Purpose

Defines the month the player has to survive: twenty working days of eight hours, the starting money and trust, the weekly rhythm of quota resets, and how subscriptions are bought at the start and adjusted on Mondays.

## Requirements

### Requirement: Month length and starting resources

A run SHALL last 20 working days grouped into four weeks of five days. Each run SHALL start on day 1 with 8 working hours, a personal wallet of NT$8,000, a company API budget of NT$12,000, manager trust 70 and KPI 0. Trust SHALL stay between 0 and 100. The header calendar SHALL show the four weeks with past days, the current day and future days styled differently.

#### Scenario: New run starting values

- **WHEN** a new run starts
- **THEN** the day is 1, remaining hours are 8, the wallet is NT$8,000, the company budget is NT$12,000, trust is 70 and KPI is 0


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Ending a day

Clicking 下班，結束第 N 天 SHALL end the current day. Overdue processing, the company daily spend check and (in parallel mode) background job processing SHALL run first. If the day was day 20 the month-end receipt SHALL open; otherwise the day SHALL advance by one, remaining hours SHALL reset to 8, the company daily spend SHALL reset to 0, any vendor outage SHALL clear, every daily quota usage SHALL reset to 0, and the day summary modal 第 N 天 SHALL open.

#### Scenario: Day 3 ends

- **WHEN** the player ends day 3 with 1.5 hours left
- **THEN** day 4 starts with 8 hours, every subscription and seat shows its full daily quota again, and the modal heading reads 第 4 天

#### Scenario: Day 20 ends

- **WHEN** the player ends day 20
- **THEN** the month-end receipt opens and the day does not advance


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Weekly reset on Mondays

Days 1, 6, 11 and 16 SHALL be Mondays. When a day advances to day 6, 11 or 16, every weekly quota usage SHALL reset to 0, the day summary heading SHALL read 第 N 天・新的一週 with the text 每週額度已重置。今天可以調整訂閱方案。, and the summary SHALL offer 調整訂閱. On a Monday the log panel SHALL show a 調整訂閱 button for the whole day; on other days it SHALL NOT.

#### Scenario: Day 6 is a new week

- **WHEN** day 5 ends
- **THEN** the day 6 summary reads 第 6 天・新的一週, weekly quota usage is 0, and 調整訂閱 is offered

#### Scenario: No adjustment mid-week

- **WHEN** it is day 7
- **THEN** the log panel shows no 調整訂閱 button


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Subscription purchase and weekly adjustment

The opening modal 月初：決定這個月怎麼付 token SHALL let the player pick one plan per subscription vendor (Anthropic, OpenAI, Google, 智譜 GLM, Kimi), default 不訂閱, and SHALL charge the full monthly price of every chosen plan to the personal wallet on confirm. The Monday modal 週一：調整訂閱 SHALL let the player change plans and SHALL charge, per vendor, max(0, new price − current price) × (weeks left ÷ 4), where weeks left = 4 − floor((day − 1) ÷ 5). Downgrades SHALL take effect immediately with no refund. Every subscription payment SHALL be added to the subscription fee total. The modal SHALL show 這次要從個人錢包付 with the amount and the wallet balance after paying. When the amount is above NT$0 and exceeds the wallet, the confirm button (開始第 1 天 or 確定調整) SHALL be disabled and the modal SHALL show 錢包不夠付這次的訂閱; plans SHALL stay selectable. An amount of NT$0 (no change or only downgrades) SHALL never be blocked, even with a negative wallet, and plans already held SHALL keep working whatever the wallet. Choosing 不改了 SHALL close the modal without changes.

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
| 16 | OpenAI 不訂閱 | Plus NT$650 | NT$162.5 (650 × 1/4) |
| 11 | Anthropic Max 5× | Pro | NT$0, plan becomes Pro |

#### Scenario: Monday upgrade the wallet cannot cover

- **WHEN** on day 6 the wallet is NT$1,000 and the player changes Anthropic Pro to Max 5× (NT$1,987.5)
- **THEN** 確定調整 is disabled, the modal shows 錢包不夠付這次的訂閱, and 不改了 closes the modal with the plan unchanged

#### Scenario: Negative wallet does not touch held plans

- **WHEN** on day 6 the wallet is −NT$350 and the player holding Anthropic Max 5× opens 週一：調整訂閱
- **THEN** 確定調整 is enabled with no change, downgrading to Pro is allowed and charges NT$0, and the wallet stays −NT$350

---
### Requirement: Subscription quota

Each subscription plan other than 不訂閱 SHALL have a daily and a weekly quota in k tokens. The quota left for a vendor SHALL be min(daily quota × quota modifier − tokens used today, weekly quota × quota modifier − tokens used this week), never below 0; the quota modifier starts at 1 and is changed only by the quota cut event. The quota area SHALL show one box per subscribed vendor with 今日 and 本週 bars, labelled 個人訂閱 (or 今日當機 when that vendor is down), and SHALL show 目前沒有任何訂閱。只能用 API、公司預算或本地模型。 when there is no subscription, seat, or pending seat request.

#### Scenario: Weekly cap binds

- **WHEN** Anthropic Pro (daily 450k, weekly 1,800k) has 100k used today and 1,700k used this week
- **THEN** the quota left is 100k

<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->
