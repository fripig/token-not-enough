## MODIFIED Requirements

### Requirement: Random event line

When a random event is drawn at the start of a day, the log SHALL record `◆ <event title>｜<event text>` with that day's prefix, the same title and text shown in the morning report.

#### Scenario: Manager complains

- **WHEN** the event 主管問進度怎麼這麼慢 is drawn on day 7 with KPI 0
- **THEN** the log has `D07 ◆ 主管問進度怎麼這麼慢｜「KPI 才 0，要超過 49 才跟得上進度。」信任 -4。`
