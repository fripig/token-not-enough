# abandon-ticket Specification

## Purpose

Lets the player drop a ticket they will not finish by asking the manager to take it back (找主管退單), for a smaller known cost than letting it go overdue. Incident tickets and tickets with a running agent cannot be abandoned.

## Requirements

### Requirement: Which tickets can be abandoned

A ticket SHALL be abandonable when it is in the queue, no agent is running on it, and it is not an incident ticket. Merge-conflict tickets, research tickets and their split tickets, outsourced tickets, and revealed or hidden traps SHALL be abandonable. Abandoning SHALL be available in serial and parallel mode on any day.

#### Scenario: Incident cannot be abandoned

- **WHEN** the player selects an incident ticket
- **THEN** the dispatch panel shows no 找主管退單 button and the abandon action changes nothing

#### Scenario: Running ticket cannot be abandoned

- **WHEN** an agent is running on a ticket in parallel mode
- **THEN** the abandon action changes nothing for that ticket until the player cancels the agent with 中止

#### Scenario: Merge-conflict ticket can be abandoned

- **WHEN** the player selects a 解決衝突 ticket that is not running
- **THEN** the dispatch panel shows the 找主管退單 button


<!-- @trace
source: gh-51-01-abandon-ticket
updated: 2026-10-11
code:
  - public/js/modals.js
  - public/js/rules.js
tests:
  - tools/check/month-end-scoring.test.js
  - tools/check/rules-reference.test.js
-->

---
### Requirement: Cost of abandoning

Abandoning a company ticket SHALL remove it from the queue, lower trust by 2 (not below 0) and leave KPI unchanged. Abandoning an outsourced ticket SHALL remove it from the queue and take round(pay × 0.3) from the wallet, adding it to the outsourcing penalty total, even if the wallet goes below 0, with no trust or KPI change. Abandoning SHALL add 1 to the abandoned count and SHALL NOT add to the overdue count, the KPI lost to overdue tickets, or the overdue outsourced count. Each abandoned ticket SHALL be charged separately, including the two tickets split from one research ticket. A hidden trap that is abandoned SHALL NOT be revealed and SHALL NOT count as a trap hit. If the abandoned ticket was selected, the dispatch panel SHALL return to its empty state.

#### Scenario: Company ticket

- **WHEN** with trust 70 and KPI 40 the player abandons a complexity-3 Laravel ticket with KPI 10
- **THEN** the ticket leaves the queue, trust is 68, KPI is 40 and the abandoned count is 1

##### Example: abandon versus overdue for a company ticket with KPI 10

| Outcome | Trust | KPI |
| --- | --- | --- |
| abandoned | −2 | 0 |
| overdue | −4 | −5 |

#### Scenario: Trust floor

- **WHEN** with trust 1 the player abandons a company ticket
- **THEN** trust is 0

#### Scenario: Outsourced ticket

- **WHEN** with NT$100 in the wallet the player abandons an outsourced ticket paying NT$2,500
- **THEN** the wallet is −NT$650, the outsourcing penalty total rises by NT$750, and trust and KPI do not change

#### Scenario: Hidden trap stays hidden

- **WHEN** the player abandons a hidden trap shown as complexity 1
- **THEN** the trap is not revealed and the trap-hit count does not change

#### Scenario: Split research tickets are charged one by one

- **WHEN** with trust 70 the player abandons both tickets split from one research ticket
- **THEN** trust is 66


<!-- @trace
source: gh-51-01-abandon-ticket
updated: 2026-10-11
code:
  - public/js/modals.js
  - public/js/rules.js
tests:
  - tools/check/month-end-scoring.test.js
  - tools/check/rules-reference.test.js
-->

---
### Requirement: Two-step abandon button

With an abandonable ticket selected, the dispatch panel SHALL show 找主管退單（信任 −2） for a company ticket or 找主管退單（違約金 NT$X） for an outsourced ticket, where X is round(pay × 0.3). The first click SHALL change that button to 確定退單？ without abandoning; a click on the armed button SHALL abandon the ticket; a click anywhere else SHALL return the button to its first label. The armed state SHALL NOT be saved.

#### Scenario: Confirm then abandon

- **WHEN** the player clicks 找主管退單（信任 −2） and then clicks 確定退單？
- **THEN** the ticket is abandoned once

#### Scenario: Click elsewhere disarms

- **WHEN** the player clicks 找主管退單（信任 −2） and then clicks a ticket card
- **THEN** nothing is abandoned and the button reads 找主管退單（信任 −2） again when that ticket is selected


<!-- @trace
source: gh-51-01-abandon-ticket
updated: 2026-10-11
code:
  - public/js/modals.js
  - public/js/rules.js
tests:
  - tools/check/month-end-scoring.test.js
  - tools/check/rules-reference.test.js
-->

---
### Requirement: Abandon log line, receipt and rules

Each abandon SHALL write one action-log line: `✕ 退單 <title>（複雜度 N）｜信任 -2` for a company ticket and `✕ 退單 <title>（複雜度 N・外包）｜違約金 NT$X` for an outsourced ticket, where N is the shown complexity. The month-end receipt SHALL show a 退單 row with the abandoned count right after the 逾期工單 row. The rules modal 工單與陷阱 tab SHALL state the cost for company and outsourced tickets and that incident tickets and tickets with a running agent cannot be abandoned, with the numbers taken from the game constants. Saves without an abandoned count SHALL load with 0.

#### Scenario: Log line

- **WHEN** on day 7 the player abandons a complexity-2 company ticket titled 修正登入頁跳轉
- **THEN** the newest log line reads `D07 ✕ 退單 修正登入頁跳轉（複雜度 2）｜信任 -2`

#### Scenario: Receipt row

- **WHEN** the month ends after the player abandoned 3 tickets
- **THEN** the receipt shows 退單 3 張 right after the 逾期工單 row

#### Scenario: Old save

- **WHEN** a save written before this change is loaded and the month ends without any abandon
- **THEN** the receipt shows 退單 0 張

<!-- @trace
source: gh-51-01-abandon-ticket
updated: 2026-10-11
code:
  - public/js/modals.js
  - public/js/rules.js
tests:
  - tools/check/month-end-scoring.test.js
  - tools/check/rules-reference.test.js
-->