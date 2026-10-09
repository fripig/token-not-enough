## MODIFIED Requirements

### Requirement: Pre-commit hook effect

With pre-commit／lint hook, the PR review hours charged when an agent finishes in parallel mode SHALL be multiplied by 0.5, on top of the halving for self-review levels above 0 and the review load for other running agents (see `game-modes`). The investment description SHALL state that it only works in parallel mode.

#### Scenario: PR review time

- **WHEN** the hook is bought and a complexity 3 ticket finishes successfully in parallel mode with no other agent running
- **THEN** PR review takes the hours in the table

##### Example: review hours

| Review level | Without hook | With hook |
| --- | --- | --- |
| 不審核 | 0.6 | 0.3 |
| 自審 | 0.3 | 0.15 |
