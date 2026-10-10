## ADDED Requirements

### Requirement: Previous day summary in the morning report

From day 2 on, the morning report SHALL open with a summary row for the day that just ended: a caption naming that day and four cells, KPI, 信任, 錢包 and 公司, each showing the change and the current value with the same numbers as that day's end-of-day summary line (requirement "End-of-day summary line"). Changes SHALL be signed (`+24`, `-8`, `±0`, and for money `-NT$120` or `±NT$0`); wallet and company values SHALL use NT$ formatting. A KPI or trust gain SHALL be styled as positive and a loss as negative; wallet and company changes SHALL use the neutral style. Resuming a save SHALL show the saved row; a save whose morning report has no summary SHALL show the report without the row.

#### Scenario: Summary after a bad day

- **WHEN** day 3 starts with KPI 37, trust 70, wallet NT$7,360, company NT$11,310, and ends with KPI 61, trust 62, wallet NT$7,240, company NT$10,900
- **THEN** the day 4 morning report shows the caption for day 3 and the cells KPI `+24` (61), 信任 `-8` (62) styled as a loss, 錢包 `-NT$120` (NT$7,240) and 公司 `-NT$410` (NT$10,900)

#### Scenario: Old save without a summary

- **WHEN** a save whose morning report lacks the summary is resumed on day 7
- **THEN** the day 7 morning report opens without the summary row and no error is thrown
