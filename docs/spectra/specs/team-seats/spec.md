# team-seats Specification

## Purpose

Lets the player ask the company to pay for a team seat with one vendor, trading a five-day procurement wait and a trust requirement for a company-paid daily and weekly quota that does not touch the personal wallet or the company API budget.

## Requirements

### Requirement: Seat request

The opening setup modal SHALL offer a team seat request with the options 不申請, Anthropic, OpenAI and Google, in that order, with 不申請 selected by default. The weekly subscription adjustment modal SHALL offer the same options only when no seat request is pending or approved. Confirming a vendor SHALL record a pending request for that vendor on the current day and log the request. The player SHALL hold at most one seat request or seat at a time.

#### Scenario: Request an OpenAI seat at the start

- **WHEN** the player picks OpenAI in the seat request and starts day 1
- **THEN** the seat request is pending for OpenAI and the quota area shows 團隊席位採購審核中，預計第 6 天有結果

#### Scenario: No new request while one is pending

- **WHEN** a seat request is pending and the Monday adjustment modal opens
- **THEN** the modal shows no seat request options

---
### Requirement: Seat approval

On the first day at least five days after the request, a pending request SHALL be approved when trust is at least 55 and rejected otherwise. Approval and rejection SHALL each be reported in the day summary and the log. A rejected request SHALL allow a new request at the next weekly adjustment.

#### Scenario: Approved with enough trust

- **WHEN** an OpenAI seat was requested on day 1 and trust is 60 when day 6 starts
- **THEN** the seat is approved for OpenAI

#### Scenario: Rejected with low trust

- **WHEN** a seat was requested on day 1 and trust is 50 when day 6 starts
- **THEN** the request is rejected with 採購被退件：主管信任不夠（需要 55 以上）。

---
### Requirement: Seat billing

An approved seat SHALL add 公司席位 as a billing method for models of the seat's vendor only, with a quota of 2,500k per day and 10,000k per week weighted by the model's quota weight. Seat quota SHALL reset daily and on Mondays like subscription quota and SHALL NOT be affected by subscription quota events. When the selected model belongs to another vendor, the dispatch panel SHALL hint which agent's models can use the seat.

#### Scenario: Codex bills an OpenAI seat

- **WHEN** an OpenAI seat is approved and the player selects a Codex CLI model
- **THEN** 公司席位 is offered as a billing method with 2,500k quota left for the day

#### Scenario: Other vendor cannot use the seat

- **WHEN** an OpenAI seat is approved and the player selects a Claude Code model
- **THEN** 公司席位 is not offered and the panel hints that Codex CLI models can use the seat
