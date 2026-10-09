## MODIFIED Requirements

### Requirement: Overdue tickets

At the end of each day every company ticket with a deadline on or before today SHALL be removed. Each SHALL lose ceil(KPI × 0.5) from KPI, drop trust by 4 (8 for an incident, see `engineering-investments` for monitoring), add 1 to the overdue count, and log `⌛ 逾期：<title>｜KPI -<n>｜信任 -<t>`, where `<t>` is that ticket's trust drop amount. The next day summary SHALL report `<n> 張工單逾期，主管信任 -<sum>。`, where `<sum>` is the total of those amounts. The ticket card SHALL show 今天到期 when the deadline is today and 剩 N 天 otherwise.

#### Scenario: Overdue incident

- **WHEN** an incident worth 26 KPI is still in the queue when its day ends with KPI 50 and trust 70
- **THEN** KPI is 37, trust is 62, the overdue count rises by 1, and the log line ends with `KPI -13｜信任 -8`

#### Scenario: Morning report total

- **WHEN** one normal ticket and one incident without 監控告警 are overdue at the end of a day
- **THEN** the next morning report reads `2 張工單逾期，主管信任 -12。`
