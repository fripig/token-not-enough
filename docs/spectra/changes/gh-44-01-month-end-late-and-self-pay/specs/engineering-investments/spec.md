## MODIFIED Requirements

### Requirement: Monitoring effect

With 監控告警, an incident ticket created after the purchase SHALL be due the day after it is created, without a cap at day 20, and its KPI SHALL use an incident multiplier of 1.2 instead of 1.6 (the stack multiplier still applies); incidents already in the queue SHALL keep their due day and KPI. While 監控告警 is owned, each overdue incident ticket SHALL reduce trust by 4 instead of 8; overdue non-incident tickets SHALL still reduce trust by 4, and KPI loss SHALL be unchanged. The 流量暴增 event text SHALL say the incidents are due tomorrow when 監控告警 is owned.

#### Scenario: Deadline and penalty

- **WHEN** 監控告警 is bought and incidents are created on the days in the table
- **THEN** they are due as shown, a complexity 4 laravel incident created after the purchase has KPI round(KPI[4] × 1.2), and an incident that becomes overdue reduces trust by 4

##### Example: incident due day

| Created on day | Due day without monitoring | Due day with monitoring |
| --- | --- | --- |
| 5 | 5 | 6 |
| 20 | 20 | 21 |

#### Scenario: Queued incident keeps deadline

- **WHEN** an incident due today is in the queue and 監控告警 is bought later that day
- **THEN** the incident is still due today, and if it becomes overdue trust drops by 4
