## MODIFIED Requirements

### Requirement: Charging tokens

When an agent finishes or stops, its tokens SHALL be charged by billing method: 個人訂閱 and 公司席位 SHALL consume tokens × model weight `w` from both the daily and weekly quota; 個人 API SHALL deduct tokens × price × the vendor's price modifier from the wallet and add it to the personal API total; 公司 API SHALL deduct the same amount from the company budget and add it to today's company spend and the company bill; 本地 GPU SHALL cost nothing and log the spend as 電費. The wallet SHALL be allowed to go negative; the dispatch panel SHALL warn 錢包可能不夠付這一筆。 when the upper estimate exceeds the wallet but SHALL NOT block dispatch.

#### Scenario: Personal API cost

- **WHEN** 200k tokens of Sonnet (NT$0.45 per 1k) are billed to 個人 API with no price change
- **THEN** the wallet drops by NT$90 and the personal API total rises by NT$90

#### Scenario: Subscription quota cost

- **WHEN** 200k tokens of Opus (w 2) are billed to an Anthropic subscription
- **THEN** 400k is used from both the daily and the weekly quota
