## MODIFIED Requirements

### Requirement: Unfamiliar stack hand-writing cost

A ticket SHALL be unfamiliar when its stack is neither a selected stack, nor fe, nor a stack covered by an attended 技術線場 conference (see `engineering-investments`). Writing an unfamiliar ticket by hand SHALL take twice the normal manual hours, and the manual button SHALL show the doubled hours. Ticket cards for unfamiliar tickets SHALL show a 不熟 chip.

#### Scenario: Manual hours doubled

- **WHEN** a Laravel 後端 player selects a complexity 2 rust ticket with no previous tries
- **THEN** the manual button shows 8.8h and the card shows the 不熟 chip

##### Example: manual hours by familiarity

| Selected stacks | Attended conference | Ticket stack | Complexity | Tries | Manual hours |
| ------- | ------- | ------------ | ---------- | ----- | ------------ |
| laravel | none | laravel | 2 | 0 | 4.4h |
| laravel | none | fe | 2 | 0 | 4.4h |
| laravel | none | rust | 2 | 0 | 8.8h |
| app | none | rails | 3 | 1 | 10.6h |
| laravel, rust | none | rust | 2 | 0 | 4.4h |
| laravel, rust | none | app | 2 | 0 | 8.8h |
| laravel | none | sre | 2 | 0 | 8.8h |
| sre, devops | none | devops | 2 | 0 | 4.4h |
| laravel | COSCUP | rust | 2 | 0 | 3.5h |
| laravel | WebConf Taiwan | laravel | 2 | 0 | 3.5h |
| laravel | HITCON | rust | 2 | 0 | 8.8h |
