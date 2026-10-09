## MODIFIED Requirements

### Requirement: Reviewing pull requests

In parallel mode, when a background agent succeeds or its ticket is rejected by store review, the player SHALL spend complexity × 0.2 hours reviewing the PR, halved when the dispatch used any self-review level (pre-commit hook effect in `engineering-investments`), then multiplied by the review load 1 + 0.25 × the number of other agents still running at that moment. Agents that finish in the same clock step SHALL NOT count as still running. The time SHALL be added to the clock advance in progress and logged as ↳ 審 PR 花了 Xh. Serial mode SHALL have no PR review time. While agents are running, the dispatch panel SHALL explain that each running agent makes the next PR review longer (showing the current load as ×<load>) and adds merge-conflict chance, and the 平行模式 button in the opening modal SHALL describe the longer PR reviews and likelier conflicts without mentioning tokens.

#### Scenario: PR review with self-review

- **WHEN** a 自審 agent finishes a complexity-4 ticket successfully in parallel mode with no other agent running
- **THEN** 0.4 hours of PR review are added to the clock

#### Scenario: PR review with other agents running

- **WHEN** an agent without review finishes a complexity-2 ticket successfully while 2 other agents are still running
- **THEN** 0.6 hours of PR review are added to the clock (2 × 0.2 × 1.5)

##### Example: review load

| Other agents still running | Review level | Hook | Complexity | PR review hours |
| --- | --- | --- | --- | --- |
| 0 | 不審核 | no | 3 | 0.6 |
| 1 | 不審核 | no | 3 | 0.75 |
| 5 | 不審核 | no | 4 | 1.8 |
| 2 | 自審 | yes | 4 | 0.3 |

## REMOVED Requirements

### Requirement: Parallel token multiplier

**Reason**: Each agent has its own context, so the number of other agents running does not change a dispatch's tokens; the player found the cross-job amplification unreasonable (issue #12).

**Migration**: Token estimates and charges no longer depend on running agents. The concurrency cost moves to PR review hours (see Reviewing pull requests).
