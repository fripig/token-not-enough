# team-seats Specification

## Purpose

Lets the player ask the company to pay for a team seat with one vendor, trading a five-day procurement wait and a trust requirement for a company-paid daily and weekly quota that does not touch the personal wallet or the company API budget.

## Requirements

### Requirement: Seat request

The player SHALL be able to hold up to three team seats, at most one per seat vendor (Anthropic, OpenAI, Google), and SHALL have at most one pending seat request at a time. The opening setup modal and the weekly subscription adjustment modal SHALL offer a seat request only when no request is pending and fewer than three seats are approved. The request SHALL offer 不申請 followed by every seat vendor without an approved seat, in the order Anthropic, OpenAI, Google, with 不申請 selected by default. Its heading SHALL read 向公司申請第 N 個團隊席位（5 天後審核，信任需 X 以上）, where N is the number of approved seats plus one and X is the trust threshold for that seat. Confirming a vendor SHALL record a pending request for that vendor on the current day and log the request.

#### Scenario: Request an OpenAI seat at the start

- **WHEN** the player picks OpenAI in the seat request and starts day 1
- **THEN** the seat request is pending for OpenAI and the quota area shows 團隊席位採購審核中，預計第 6 天有結果

#### Scenario: No new request while one is pending

- **WHEN** a seat request is pending and the Monday adjustment modal opens
- **THEN** the modal shows no seat request options

#### Scenario: Second seat request lists the remaining vendors

- **WHEN** an OpenAI seat is approved, no request is pending, and the Monday adjustment modal opens
- **THEN** the seat request heading reads 向公司申請第 2 個團隊席位（5 天後審核，信任需 65 以上） and the options are 不申請, Anthropic and Google

#### Scenario: No request after three seats

- **WHEN** Anthropic, OpenAI and Google seats are all approved and the Monday adjustment modal opens
- **THEN** the modal shows no seat request options


<!-- @trace
source: gh-06-01-multi-team-seats
updated: 2026-10-09
code:
  - public/js/actions.js
  - public/js/modals.js
  - docs/DESIGN.md
  - CLAUDE.md
  - public/js/state.js
  - public/js/view.js
  - tools/check/team-seats.test.js
  - public/js/calc.js
  - public/js/data.js
-->

---
### Requirement: Seat approval

On the first day at least five days after the request, a pending request SHALL be approved when trust is at least the threshold for the next seat and rejected otherwise. The thresholds SHALL be 55 for the first seat, 65 for the second and 75 for the third, chosen by the number of seats approved when the request is reviewed. Approval and rejection SHALL each be reported in the day summary and the log, and either SHALL end the pending request. A rejection SHALL report 採購被退件：主管信任不夠（需要 X 以上）。 with X the threshold that was applied. After the review, a new request SHALL be allowed at the next weekly adjustment, including the adjustment on the same day as the review, and a rejected vendor SHALL be offered again.

#### Scenario: Approved with enough trust

- **WHEN** an OpenAI seat was requested on day 1 and trust is 60 when day 6 starts
- **THEN** the seat is approved for OpenAI

#### Scenario: Rejected with low trust

- **WHEN** a first seat was requested on day 1 and trust is 50 when day 6 starts
- **THEN** the request is rejected with 採購被退件：主管信任不夠（需要 55 以上）。

#### Scenario: Second seat needs more trust

- **WHEN** one seat is approved, a second seat was requested on day 6, and trust is the value in the table when day 11 starts
- **THEN** the outcome matches the table

##### Example: second-seat thresholds

| Trust on day 11 | Outcome |
| --- | --- |
| 64 | rejected with 採購被退件：主管信任不夠（需要 65 以上）。 |
| 65 | approved |

#### Scenario: Third seat needs more trust

- **WHEN** two seats are approved, a third seat was requested on day 11, and trust is the value in the table when day 16 starts
- **THEN** the outcome matches the table

##### Example: third-seat thresholds

| Trust on day 16 | Outcome |
| --- | --- |
| 74 | rejected with 採購被退件：主管信任不夠（需要 75 以上）。 |
| 75 | approved |

#### Scenario: Request again on the review day

- **WHEN** a seat request is approved or rejected when day 6 starts and the player opens the day-6 Monday adjustment
- **THEN** the modal offers a seat request


<!-- @trace
source: gh-06-01-multi-team-seats
updated: 2026-10-09
code:
  - public/js/actions.js
  - public/js/modals.js
  - docs/DESIGN.md
  - CLAUDE.md
  - public/js/state.js
  - public/js/view.js
  - tools/check/team-seats.test.js
  - public/js/calc.js
  - public/js/data.js
-->

---
### Requirement: Seat billing

Each approved seat SHALL add 公司席位 as a billing method for models of that seat's vendor only, with its own quota of 2,500k per day and 10,000k per week weighted by the model's quota weight. Seat quota SHALL reset daily and on Mondays like subscription quota and SHALL NOT be affected by subscription quota events. The quota area SHALL show one quota box per approved seat in approval order. When at least one seat is approved and the selected model belongs to a vendor without one, the dispatch panel SHALL hint which agents' models can use a seat, naming every seated vendor joined with 、.

#### Scenario: Codex bills an OpenAI seat

- **WHEN** an OpenAI seat is approved and the player selects a Codex CLI model
- **THEN** 公司席位 is offered as a billing method with 2,500k quota left for the day

#### Scenario: Other vendor cannot use the seat

- **WHEN** an OpenAI seat is approved and the player selects a Claude Code model
- **THEN** 公司席位 is not offered and the panel hints that Codex CLI models can use the seat

#### Scenario: Two seats bill separately

- **WHEN** OpenAI and Google seats are approved and 1,000k of OpenAI seat quota was used today
- **THEN** a Codex CLI model and a Gemini CLI model both offer 公司席位, with 1,500k and 2,500k left respectively, and the quota area shows an OpenAI seat box followed by a Google seat box

#### Scenario: Hint names every seated agent

- **WHEN** OpenAI and Google seats are approved and the player selects a Claude Code model
- **THEN** the panel hints that Codex CLI and Gemini CLI models can use a seat

<!-- @trace
source: gh-06-01-multi-team-seats
updated: 2026-10-09
code:
  - public/js/actions.js
  - public/js/modals.js
  - docs/DESIGN.md
  - CLAUDE.md
  - public/js/state.js
  - public/js/view.js
  - tools/check/team-seats.test.js
  - public/js/calc.js
  - public/js/data.js
-->