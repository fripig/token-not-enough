## ADDED Requirements

### Requirement: Unlimited running agents

Parallel mode SHALL NOT have a slot count. The opening modal SHALL NOT offer a slot picker in either mode. Dispatching from the dispatch panel, one-click dispatch and batch dispatch SHALL NOT be refused because of how many agents are running; the other rules (0.2 hours of clock per dispatch, one local-GPU agent at a time, vendor outages, client bans, billing, quota and wallet checks) SHALL still apply. PR review load (`1 + 0.25 ×` other agents still running) and merge-conflict chance SHALL keep reading the number of agents actually running. A dispatch's tokens SHALL NOT depend on the number of running agents.

#### Scenario: Seventh agent

- **WHEN** 6 agents are running in parallel mode, the clock has 2 hours left and the player dispatches a seventh ticket with Claude Code / Sonnet・公司 API
- **THEN** the dispatch succeeds, 7 agents are running and the clock advances by 0.2 hours

#### Scenario: No slot picker

- **WHEN** the opening modal is shown with parallel mode selected
- **THEN** no slot buttons are shown

##### Example: PR review load by agents running

| Other agents still running | PR review load |
| -------------------------- | -------------- |
| 1 | 1.25 |
| 5 | 2.25 |
| 9 | 3.25 |

### Requirement: Parallel receipt title

The month-end receipt title for a parallel run SHALL read 月底結算・<company name>・平行模式, with no agent count.

#### Scenario: Receipt title

- **WHEN** a Laravel 後端 parallel run ends
- **THEN** the receipt title is 月底結算・Laravel 後端・平行模式

## MODIFIED Requirements

### Requirement: Merge conflicts leave a conflict ticket

In parallel mode, when a background job finishes and the merge-conflict chance is rolled on a job that would otherwise succeed, the ticket SHALL NOT complete and SHALL NOT be treated as a failed attempt. The merge-conflict chance SHALL be 0.1 per other running agent, halved with CI 流水線, and SHALL NOT exceed 0.9 (`CONFLICT_MAX`), the cap applying after the halving. The ticket SHALL stay in the queue as a conflict ticket titled 解決衝突：<original title>, with complexity max(1, original complexity − 1), base tokens for that complexity, and the original's tech stack, client, sensitivity, incident flag, due date, KPI and App Store review flag. The job's tokens SHALL be charged as usual, no PR review time SHALL be spent, and the receipt's conflict count SHALL increase by 1.

A conflict ticket SHALL be resolvable with any dispatch method or by hand under the normal ticket rules; completing it SHALL add the inherited KPI and the done count. A conflict ticket SHALL NOT roll a merge conflict, SHALL NOT be a trap, and SHALL NOT offer 評估架構 or 找主管重新評估. A conflict ticket still open on its due date SHALL receive the normal overdue penalty.

#### Scenario: Conflict on a successful job

- **WHEN** a successful Laravel cx 3 job finishes with 2 other agents running and the conflict roll hits
- **THEN** the queue holds 解決衝突：<title> with complexity 2 and the original due date and KPI, KPI and done count are unchanged, and the receipt shows 合併衝突 1 次

##### Example: conflict ticket complexity

| Original complexity | Conflict ticket complexity |
| ------------------- | -------------------------- |
| 1 | 1 |
| 3 | 2 |
| 5 | 4 |

#### Scenario: Conflict chance cap

- **WHEN** a job finishes in parallel mode
- **THEN** the conflict chance follows the number of other agents still running, capped at 0.9

##### Example: conflict chance by other agents running

| Other agents still running | CI 流水線 | Conflict chance |
| -------------------------- | --------- | --------------- |
| 2 | no | 0.2 |
| 5 | no | 0.5 |
| 9 | no | 0.9 |
| 12 | no | 0.9 |
| 12 | yes | 0.6 |
| 20 | yes | 0.9 |

#### Scenario: Resolving the conflict ticket

- **WHEN** the player dispatches the conflict ticket with any model and it succeeds while 3 other agents are running
- **THEN** no conflict is rolled, the ticket leaves the queue, and the original KPI is added

#### Scenario: No evaluate or rescope on a conflict ticket

- **WHEN** the player selects a conflict ticket
- **THEN** the dispatch panel offers no 評估架構 and no 找主管重新評估 button

#### Scenario: Conflict ticket goes overdue

- **WHEN** a conflict ticket is still in the queue at the end of its due day
- **THEN** half its KPI is deducted and trust drops by 4 (8 for an incident)

## REMOVED Requirements

### Requirement: Slot count selection

**Reason**: Parallel mode no longer has a slot count (#63); how many agents run is decided per dispatch and priced by PR review load and merge-conflict chance.
**Migration**: Requirement: Unlimited running agents. An old save's `slots` field is ignored on load.

### Requirement: Slot limit on dispatch

**Reason**: There is no slot count to limit dispatch (#63).
**Migration**: Requirement: Unlimited running agents keeps the per-running-agent cost formulas and the token rule.

### Requirement: Slot count on the receipt

**Reason**: There is no slot count to show (#63).
**Migration**: Requirement: Parallel receipt title.
