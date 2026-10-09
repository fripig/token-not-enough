## Purpose

Lets the player opt into an advanced mode where each dispatch also picks a reasoning effort (低 / 中 / 高). Higher effort makes the agent more capable but uses more tokens and makes the work slower; lower effort is weaker, cheaper and faster.

## ADDED Requirements

### Requirement: Advanced mode toggle

The opening setup modal SHALL show a 進階模式 section with the options 一般 and 進階, separate from the company selection and the outsourcing toggle. The default SHALL be 一般. The choice SHALL persist to the next run started with 再玩一個月, and a stored value that is not a boolean SHALL fall back to 一般. Changing only this toggle SHALL NOT regenerate day-1 tickets. The weekly subscription adjustment modal SHALL NOT show the toggle. The best-score key SHALL NOT depend on this toggle.

#### Scenario: Default and persistence

- **WHEN** the first run starts, the player picks 進階, finishes the month and clicks 再玩一個月
- **THEN** the first run starts with 一般 preselected and the second run's modal preselects 進階

#### Scenario: Invalid stored value

- **WHEN** the stored advanced-mode value is the number 1
- **THEN** the run starts in 一般 mode

#### Scenario: Toggle does not redraw tickets

- **WHEN** the player switches between 一般 and 進階 in the opening modal without changing companies
- **THEN** the day-1 ticket ids and titles stay the same

#### Scenario: Weekly modal

- **WHEN** the weekly 調整訂閱 modal opens
- **THEN** no advanced-mode toggle is shown

#### Scenario: Same best-score key

- **WHEN** a run in 進階 mode with company laravel in parallel mode ends
- **THEN** the best score is compared against and stored under the same key a 一般 run would use

### Requirement: Reasoning effort selector

In 進階 mode the dispatch panel SHALL show a 推理強度 selector with 低, 中 and 高, each showing its capability, token and time effect. The selection SHALL persist to the next run. In 一般 mode the selector SHALL NOT be shown and every dispatch SHALL behave as 中 regardless of the stored selection. The available model list SHALL be the same in both modes.

#### Scenario: Selector visibility

- **WHEN** the player opens the dispatch panel in 一般 mode, then in a run started in 進階 mode
- **THEN** the 推理強度 selector is absent in the first and shows 低, 中, 高 in the second

#### Scenario: 一般 mode ignores stored effort

- **WHEN** the stored effort selection is 高 and the run is in 一般 mode
- **THEN** the estimate and dispatch use the model's unchanged capability, token usage and time

### Requirement: Effort effect on the agent

When dispatching in 進階 mode the selected effort SHALL modify the chosen model for that dispatch: 低 SHALL lower capability by 1 with a floor of 1, multiply token usage by 0.7 and multiply execution time by 0.8 (faster); 中 SHALL leave the model unchanged; 高 SHALL raise capability by 1 with no ceiling, multiply token usage by 1.5 and multiply execution time by 1.4 (slower). The modified capability SHALL be used for success rate, self-review catch rate and the check whether an agent pushes through an unrevealed trap. Price per 1k token and subscription weight SHALL NOT change. Architecture evaluation and hand-writing SHALL NOT be affected by effort. When the effort is not 中, logs SHALL name the model with the effort, such as Sonnet・高強度.

#### Scenario: Success rate, tokens and time per effort

- **WHEN** Claude Sonnet (capability 4) is estimated on a complexity-4 Laravel ticket with no review, no investments, no large codebase, in single-line mode in 進階 mode
- **THEN** the estimates differ by effort as in the example

##### Example: Sonnet on a complexity-4 Laravel ticket

| Effort | Capability | Success rate | Token estimate | Hours |
| ------ | ---------- | ------------ | -------------- | ----- |
| 低     | 3          | 50%          | 0.7 × 中       | 0.8 × 中 |
| 中     | 4          | 80%          | 中             | 中    |
| 高     | 5          | 95%          | 1.5 × 中       | 1.4 × 中 |

#### Scenario: Capability floor and no ceiling

- **WHEN** Claude Haiku (capability 2) is estimated at 低 and Claude Opus (capability 5) at 高
- **THEN** Haiku uses capability 1 and Opus uses capability 6

#### Scenario: High effort pushes through a trap

- **WHEN** an unrevealed trap with true complexity 5 is dispatched to Claude Sonnet at 高 in 進階 mode
- **THEN** the agent uses capability 5, does not stop partway, and tokens and hours follow the true complexity with the 高 multipliers

#### Scenario: Evaluation unaffected

- **WHEN** the player evaluates a ticket's architecture with Claude Sonnet while effort is 高
- **THEN** the evaluation token cost, time and reveal rate equal those at 中

#### Scenario: Log name

- **WHEN** a Sonnet dispatch at 高 is logged
- **THEN** the log line names the model Sonnet・高強度
