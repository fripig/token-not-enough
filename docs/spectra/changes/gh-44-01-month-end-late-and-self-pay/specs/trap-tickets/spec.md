## MODIFIED Requirements

### Requirement: Manager re-scoping

A revealed trap that has not been re-scoped SHALL offer a 找主管重新評估 action. With trust at least 50, the action SHALL reduce trust by 5, set the KPI reward to KPI[true complexity] times the hard-stack multiplier (rounded), and move the due date 2 days later without a cap at day 20. With trust below 50, it SHALL reduce trust by 3 and change nothing else. In both cases the action SHALL NOT be offered again for that ticket.

#### Scenario: Re-scope accepted

- **WHEN** trust is 70 and the player re-scopes a revealed rust trap with shown complexity 1, true complexity 4, KPI 4 and due day 6
- **THEN** trust becomes 65, KPI becomes 21 and the due day becomes 8

##### Example: re-scope outcomes

| Trust | Stack | True cx | KPI before | Due before | Trust after | KPI after | Due after |
| ----- | ----- | ------- | ---------- | ---------- | ----------- | --------- | --------- |
| 70 | rust | 4 | 4 | 6 | 65 | 21 | 8 |
| 50 | laravel | 5 | 3 | 19 | 45 | 24 | 21 |
| 49 | laravel | 4 | 3 | 6 | 46 | 3 | 6 |
