## MODIFIED Requirements

### Requirement: Grade

The grade SHALL use thresholds per mode. In serial mode it SHALL be S at 3,800 or more, A at 2,400, B at 1,400, C at 500, and D below. In parallel mode it SHALL be S at 10,700 or more, A at 5,280, B at 4,000, C at 2,720, and D below. Parallel thresholds SHALL NOT be derived from the serial ones.

#### Scenario: Same score, different modes

- **WHEN** the score is 3,120
- **THEN** the grade is A in serial mode and C in parallel mode

##### Example: thresholds

| Mode | Score | Grade |
| --- | --- | --- |
| serial | 3,800 | S |
| serial | 3,799 | A |
| serial | 2,400 | A |
| serial | 1,400 | B |
| serial | 500 | C |
| serial | 499 | D |
| parallel | 10,700 | S |
| parallel | 10,699 | A |
| parallel | 5,280 | A |
| parallel | 4,000 | B |
| parallel | 2,720 | C |
| parallel | 2,719 | D |
