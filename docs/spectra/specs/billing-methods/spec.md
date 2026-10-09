# billing-methods Specification

## Purpose

Defines who pays for an agent's tokens — the player's subscription quota, the player's own API card, the company's API budget, or a local GPU — and the trust and security consequences of each choice.

## Requirements

### Requirement: Billing options per vendor

For a local model the only billing option SHALL be 本地 GPU (note 不花 token 錢，但很慢). For any other vendor the options SHALL be, in order: 個人訂閱 (available only with a plan, note 沒有訂閱 or `<plan>・剩 <quota>`), 公司席位 (only when the player holds that vendor's seat, see `team-seats`), 個人 API (always available, note 自己的信用卡), and 公司 API (available only for a company-contracted vendor while the company budget is above 0; otherwise note 公司沒簽約 or 預算用完, else 走部門預算). Outsourced tickets add their own restriction (see `outsource-gigs`).

#### Scenario: No subscription

- **WHEN** the player has no Google plan and selects Gemini Pro
- **THEN** 個人訂閱 is disabled with the note 沒有訂閱 and 個人 API and 公司 API are enabled

#### Scenario: Company budget used up

- **WHEN** the company budget is NT$0 and the player selects Sonnet
- **THEN** 公司 API is disabled with the note 預算用完


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Charging tokens

When an agent finishes or stops, its tokens SHALL be charged by billing method: 個人訂閱 and 公司席位 SHALL consume tokens × model weight `w` from both the daily and weekly quota; 個人 API SHALL deduct tokens × price × the vendor's price modifier from the wallet and add it to the personal API total; 公司 API SHALL deduct the same amount from the company budget and add it to today's company spend and the company bill; 本地 GPU SHALL cost nothing and log the spend as 電費. The wallet SHALL be allowed to go negative; the dispatch panel SHALL warn 錢包可能不夠付這一筆。 when the upper estimate exceeds the wallet but SHALL NOT block dispatch.

#### Scenario: Personal API cost

- **WHEN** 200k tokens of Sonnet (NT$0.45 per 1k) are billed to 個人 API with no price change
- **THEN** the wallet drops by NT$90 and the personal API total rises by NT$90

#### Scenario: Subscription quota cost

- **WHEN** 200k tokens of Opus (w 3) are billed to an Anthropic subscription
- **THEN** 600k is used from both the daily and the weekly quota


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Quota exhaustion

If the quota needed exceeds the quota left, the agent SHALL use up the remaining quota and stop: the attempt SHALL fail with the note 撞到用量上限，agent 停在一半, recorded tokens SHALL scale by the fraction of quota available, and the hours SHALL be max(0.3, hours × max(0.3, fraction)). Self-review SHALL NOT rescue this failure. The dispatch panel SHALL warn 剩餘額度可能不夠，跑到一半會被限流。 when the upper estimate exceeds the quota left.

#### Scenario: Half the quota

- **WHEN** a subscription agent needs 400k quota and 200k is left
- **THEN** 200k quota is used, the ticket stays in the queue with one more failed try, and the log reads 撞到用量上限，agent 停在一半


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Company spend limits

After any charge, if the company budget is below 0, trust SHALL drop by 8 (not below 0), the company budget SHALL be set to 0, and the log SHALL record ! 公司 API 預算透支，財務來信關切. At the end of a day, if today's company spend (API charges and investments) exceeds NT$1,500, trust SHALL drop by 6 and the day summary SHALL report it.

#### Scenario: Daily overspend

- **WHEN** the player spends NT$1,600 on company API in one day and ends the day with trust 70
- **THEN** trust is 64 and the next day summary includes 今天公司 API 刷了 NT$1,600，主管在 Slack 問你在幹嘛（信任 -6）。

#### Scenario: Overdraft

- **WHEN** the company budget is NT$100 and a company API charge of NT$300 settles with trust 70
- **THEN** the company budget is NT$0 and trust is 62


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Security audit on sensitive tickets

When a sensitive ticket (機敏) is billed to 個人訂閱 or 個人 API, the game SHALL roll an audit after the attempt settles, whatever its outcome: 35% for a non-Chinese vendor and 60% for a Chinese vendor (secret scanning modifies these, see `engineering-investments`). An audit SHALL drop trust by 12 (not below 0), count one audit, and log ! 資安稽核. Company API, company seat and local GPU billing SHALL NOT be audited. The dispatch panel SHALL show the audit probability as a warning for a risky combination.

#### Scenario: Personal API on a sensitive ticket

- **WHEN** a sensitive ticket is billed to Sonnet on 個人 API
- **THEN** the panel warns 機敏工單用個人帳號：有 35% 機率被資安稽核抓到。

#### Scenario: Chinese cloud on a sensitive ticket

- **WHEN** a sensitive ticket is billed to DeepSeek Chat on 個人 API
- **THEN** the panel warns 機敏工單送到中國雲端：有 60% 機率被資安稽核抓到。

#### Scenario: Company API is safe

- **WHEN** a sensitive ticket is billed to 公司 API
- **THEN** no audit roll happens

<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->