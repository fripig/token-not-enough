## MODIFIED Requirements

### Requirement: Dispatch decision line

Every agent dispatch, in parallel and serial mode, SHALL log one line `→ 派出 <title>（<tags>）｜<agent> / <model name>・<billing>・<review><reviewer><sdd>｜成功率 <pe>%｜<trigger>｜預計 <hours>h`. `<tags>` SHALL be the shown complexity `複雜度 N`, then `今天到期` when the deadline is today or `第 N 天到期` otherwise, then 事故, 機敏 and 外包 for tickets with those flags, joined with ・. The model name SHALL include the effort suffix as defined in `reasoning-effort`. `<review>` SHALL be 不審核, 自審 or 嚴格審核. `<reviewer>` SHALL be `・<reviewer model name> 審（<reviewer billing>）` when the effective reviewer is not 同一個 (see `cross-model-review`), and empty otherwise. `<sdd>` SHALL be `・SDD markdown` when the applied SDD level is 1, `・SDD 框架` when it is 2, and empty when it is 0 or SDD is not owned (see `engineering-investments`). `<pe>` SHALL be the success rate the dispatch panel shows for the dispatched options, rounded to a whole percent, computed from the ticket as shown. `<trigger>` SHALL be 派工台 for the dispatch button, `一鍵派工方案 <letter>` for one-click dispatch and `批次派工方案 <letter>` for batch dispatch. In serial mode the dispatch line SHALL be written before the result line of the same dispatch.

#### Scenario: One-click dispatch in parallel mode

- **WHEN** on day 3 with SDD not owned the player one-click dispatches a complexity 2 ticket due on day 4 with 方案 B (Claude Code / Sonnet, 公司 API, 自審) and the panel would show 97%
- **THEN** the newest log line reads `D03 → 派出 <title>（複雜度 2・第 4 天到期）｜Claude Code / Sonnet・公司 API・自審｜成功率 97%｜一鍵派工方案 B｜預計 <hours>h`

#### Scenario: Serial mode logs the dispatch before the result

- **WHEN** the player dispatches a ticket from the dispatch panel in serial mode
- **THEN** the second-newest line is the 派出 line with 派工台 and the newest line is the result line

#### Scenario: Unrevealed trap shows the shown odds

- **WHEN** an unrevealed trap shown as complexity 1 is dispatched with a capability 30 model and no review
- **THEN** the dispatch line shows 複雜度 1 and the success rate computed for complexity 1

##### Example: tags

| Ticket | Tags |
| --- | --- |
| complexity 3, due today, incident | 複雜度 3・今天到期・事故 |
| complexity 2, due day 9, sensitive | 複雜度 2・第 9 天到期・機敏 |
| complexity 1, due day 5, gig | 複雜度 1・第 5 天到期・外包 |

#### Scenario: SDD level in the dispatch line

- **WHEN** the player dispatches with Claude Code / Sonnet, 公司 API and 自審 at each applied SDD level
- **THEN** the options segment of the dispatch line is as listed

##### Example: options segment

| Applied SDD level | Segment |
| --- | --- |
| 0 | `Claude Code / Sonnet・公司 API・自審` |
| 1 | `Claude Code / Sonnet・公司 API・自審・SDD markdown` |
| 2 | `Claude Code / Sonnet・公司 API・自審・SDD 框架` |

#### Scenario: Reviewer in the dispatch line

- **WHEN** 交叉審核工具 is owned and the player dispatches with Claude Code / Sonnet, 公司 API, 自審 reviewed by Opus on 個人訂閱, with applied SDD level 2
- **THEN** the options segment of the dispatch line is `Claude Code / Sonnet・公司 API・自審・Opus 審（個人訂閱）・SDD 框架`

---
### Requirement: Billing method on result and evaluation lines

Every attempt result line (success, failure, merge conflict) SHALL name the agent as `<agent> / <model name>・<billing>`; a success line SHALL keep its review suffix when review is not 不審核, followed by the `<reviewer>` segment of the dispatch line when the job had a reviewer other than 同一個. A failure whose catch was discarded because the review could not be done SHALL use the note 審核沒做完，沒抓到錯誤 (see `cross-model-review`). Every architecture evaluation line SHALL contain `評估｜<agent> / <model name>・<billing>`, using the model name without effort.

#### Scenario: Failure names the billing method

- **WHEN** a DeepSeek Chat attempt billed to 個人 API fails its test
- **THEN** the log line contains `Claude Code 接 DeepSeek API / Chat・個人 API` and 測試沒過，改壞了

#### Scenario: Evaluation names model and billing

- **WHEN** the player evaluates a ticket with Claude Code / Opus billed to 公司 API and nothing is found
- **THEN** the log line contains `評估｜Claude Code / Opus・公司 API` and 評估完成，看起來沒問題

#### Scenario: Success names the reviewer

- **WHEN** a Sonnet attempt billed to 公司 API with 自審 reviewed by Opus on 公司 API succeeds
- **THEN** the log line contains `Claude Code / Sonnet・公司 API・自審・Opus 審（公司 API）`
