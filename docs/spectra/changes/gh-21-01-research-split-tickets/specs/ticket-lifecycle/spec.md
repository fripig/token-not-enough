## MODIFIED Requirements

### Requirement: Ticket generation

A non-incident ticket SHALL get complexity from r = random + day ÷ 20 × 0.38: r < 0.28 → 1, < 0.6 → 2, < 0.9 → 3, < 1.12 → 4, otherwise 5. An incident ticket SHALL have complexity 4. Base tokens SHALL be BASE[complexity] × a uniform factor in [0.85, 1.15] with BASE = 60, 180, 350, 550, 850 k for complexity 1–5. KPI SHALL be round(KPI[complexity] × incident factor × stack factor) with KPI = 3, 6, 10, 16, 24, incident factor 1.6 (see `engineering-investments` for monitoring) and stack factor from `stack-agent-effects`. The deadline SHALL be today for an incident, today + 1–3 days for complexity 1–2, and today + 2–5 days otherwise, plus the stack extension from `stack-agent-effects`, capped at day 20. A ticket SHALL be sensitive with probability 55% for incidents and 25% otherwise, and SHALL be large codebase with probability 45% when complexity is at least 3. Stack, trap, research and store-review fields come from `company-tech-stack`, `trap-tickets`, `research-tickets` and `stack-agent-effects`.

#### Scenario: Complexity by day

##### Example: complexity rolls

| Day | random | r | Complexity |
| --- | --- | --- | --- |
| 1 | 0.25 | 0.269 | 1 |
| 1 | 0.5 | 0.519 | 2 |
| 10 | 0.5 | 0.69 | 3 |
| 20 | 0.0 | 0.38 | 2 |
| 20 | 0.99 | 1.37 | 5 |

#### Scenario: Incident KPI

- **WHEN** an incident is generated for a Laravel company without monitoring
- **THEN** its complexity is 4, its KPI is 26 (round(16 × 1.6)) and its deadline is today

---
### Requirement: Overdue tickets

At the end of each day every company ticket with a deadline on or before today SHALL be removed. Each SHALL lose ceil(KPI × 0.5) from KPI, drop trust by 4 (8 for an incident, see `engineering-investments` for monitoring; 0 for the second overdue part of the same researched ticket, see `research-tickets`), add 1 to the overdue count, and log `⌛ 逾期：<title>｜KPI -<n>｜信任 -<t>`, where `<t>` is that ticket's trust drop amount. The next day summary SHALL report `<n> 張工單逾期，主管信任 -<sum>。`, where `<sum>` is the total of those amounts. The ticket card SHALL show 今天到期 when the deadline is today and 剩 N 天 otherwise.

#### Scenario: Overdue incident

- **WHEN** an incident worth 26 KPI is still in the queue when its day ends with KPI 50 and trust 70
- **THEN** KPI is 37, trust is 62, the overdue count rises by 1, and the log line ends with `KPI -13｜信任 -8`

#### Scenario: Morning report total

- **WHEN** one normal ticket and one incident without 監控告警 are overdue at the end of a day
- **THEN** the next morning report reads `2 張工單逾期，主管信任 -12。`
