## MODIFIED Requirements

### Requirement: Effort effect on the agent

When dispatching in 進階 mode the selected effort SHALL modify the chosen model for that dispatch: 低 SHALL lower capability by 10 with a floor of 10, multiply token usage by 0.7 and multiply execution time by 0.8 (faster); 中 SHALL leave the model unchanged; 高 SHALL raise capability by 10 with no ceiling, multiply token usage by 1.5 and multiply execution time by 1.4 (slower). The modified capability SHALL be used for success rate, self-review catch rate and the check whether an agent pushes through an unrevealed trap. Price per 1k token and subscription weight SHALL NOT change. Architecture evaluation and hand-writing SHALL NOT be affected by effort. When the effort is not 中, logs SHALL name the model with the effort, such as Sonnet・高強度.

#### Scenario: Success rate, tokens and time per effort

- **WHEN** Claude Sonnet (capability 40) is estimated on a complexity-4 Laravel ticket with no review, no investments, no large codebase, in single-line mode in 進階 mode
- **THEN** the estimates differ by effort as in the example

##### Example: Sonnet on a complexity-4 Laravel ticket

| Effort | Capability | Success rate | Token estimate | Hours |
| ------ | ---------- | ------------ | -------------- | ----- |
| 低     | 30         | 50%          | 0.7 × 中       | 0.8 × 中 |
| 中     | 40         | 80%          | 中             | 中    |
| 高     | 50         | 95%          | 1.5 × 中       | 1.4 × 中 |

#### Scenario: Capability floor and no ceiling

- **WHEN** Gemini Flash (capability 20) is estimated at 低, Claude Opus (capability 50) at 高 and Claude Fable (capability 60) at 高
- **THEN** Flash uses capability 10, Opus uses capability 60 and Fable uses capability 70

#### Scenario: High effort pushes through a trap

- **WHEN** an unrevealed trap with true complexity 5 is dispatched to Claude Sonnet at 高 in 進階 mode
- **THEN** the agent uses capability 50, does not stop partway, and tokens and hours follow the true complexity with the 高 multipliers

#### Scenario: Evaluation unaffected

- **WHEN** the player evaluates a ticket's architecture with Claude Sonnet while effort is 高
- **THEN** the evaluation token cost, time and reveal rate equal those at 中

#### Scenario: Log name

- **WHEN** a Sonnet dispatch at 高 is logged
- **THEN** the log line names the model Sonnet・高強度
