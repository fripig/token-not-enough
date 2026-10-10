## MODIFIED Requirements

### Requirement: Game end

When the month-end receipt opens, the game SHALL send `game_end` with the common parameters plus `score` (the receipt's total score) and `grade` (S, A, B, C or D, as shown on the receipt).

#### Scenario: Month end

- **WHEN** a serial run reaches the month-end receipt with KPI 300, trust 70, no personal spending and no audits
- **THEN** `game_end` is sent once with `day` 20, `score` 3280 and `grade` B
