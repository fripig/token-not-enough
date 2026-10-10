## ADDED Requirements

### Requirement: Running unrevealed trap shows the shown estimate

While an agent runs on an unrevealed trap, the game SHALL show time as if the ticket had its shown complexity; the real run time, tokens and outcome SHALL follow Requirement: Working on an unrevealed trap unchanged. The job SHALL carry a shown estimate: the hours the dispatch panel estimates for the ticket as shown, multiplied by the same random factor the real run hours use, with no additional random draw. For any other ticket the shown estimate SHALL equal the real run hours. The dispatch log line's `預計 <hours>h` SHALL use the shown estimate. In parallel mode, with elapsed time = real run hours − hours left, the 背景 agent row SHALL show the completion time `now + shown estimate − elapsed` and a progress bar of elapsed ÷ shown estimate while elapsed is below the shown estimate; once elapsed reaches the shown estimate it SHALL read 超過預估，還在跑 with a full bar. A job saved without a shown estimate SHALL use its real run hours.

#### Scenario: Row follows the shown estimate

- **WHEN** at 9:00 an unrevealed trap is dispatched in parallel mode with a real run of 4.0 hours and a shown estimate of 1.0 hour
- **THEN** after the 0.2-hour dispatch step the row reads 10:00 完成 with a 20% bar, and the dispatch log line ends with `預計 1.0h`

#### Scenario: Past the shown estimate

- **WHEN** the same agent is still running at 10:30
- **THEN** its row reads 超過預估，還在跑 with a full bar

#### Scenario: Ordinary ticket unchanged

- **WHEN** a ticket that is not a trap is dispatched with a real run of 2.0 hours at 9:00
- **THEN** after the dispatch step its row reads 11:00 完成 and the dispatch log line ends with `預計 2.0h`

#### Scenario: Old saved job

- **WHEN** a saved running job has no shown estimate and 1.5 of its 2.0 hours left at 9:00
- **THEN** its row reads 10:30 完成 with a 25% bar
