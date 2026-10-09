## ADDED Requirements

### Requirement: Merge conflicts leave a conflict ticket

In parallel mode, when a background job finishes and the merge-conflict chance (0.1 per other running agent, halved with 補測試) is rolled on a job that would otherwise succeed, the ticket SHALL NOT complete and SHALL NOT be treated as a failed attempt. It SHALL stay in the queue as a conflict ticket titled 解決衝突：<original title>, with complexity max(1, original complexity − 1), base tokens for that complexity, and the original's tech stack, client, sensitivity, incident flag, due date, KPI and App Store review flag. The job's tokens SHALL be charged as usual, no PR review time SHALL be spent, and the receipt's conflict count SHALL increase by 1.

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

#### Scenario: Resolving the conflict ticket

- **WHEN** the player dispatches the conflict ticket with any model and it succeeds while 3 other agents are running
- **THEN** no conflict is rolled, the ticket leaves the queue, and the original KPI is added

#### Scenario: No evaluate or rescope on a conflict ticket

- **WHEN** the player selects a conflict ticket
- **THEN** the dispatch panel offers no 評估架構 and no 找主管重新評估 button

#### Scenario: Conflict ticket goes overdue

- **WHEN** a conflict ticket is still in the queue at the end of its due day
- **THEN** half its KPI is deducted and trust drops by 4 (8 for an incident)
