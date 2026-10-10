## MODIFIED Requirements

### Requirement: Dispatch decision line

Every agent dispatch, in parallel and serial mode, SHALL log one line `→ 派出 <title>（<tags>）｜<agent> / <model name>・<billing>・<review><sdd>｜成功率 <pe>%｜<trigger>｜預計 <hours>h`. `<tags>` SHALL be the shown complexity `複雜度 N`, then `今天到期` when the deadline is today or `第 N 天到期` otherwise, then 事故, 機敏 and 外包 for tickets with those flags, joined with ・. The model name SHALL include the effort suffix as defined in `reasoning-effort`. `<review>` SHALL be 不審核, 自審 or 嚴格審核. `<sdd>` SHALL be `・SDD markdown` when the applied SDD level is 1, `・SDD 框架` when it is 2, and empty when it is 0 or SDD is not owned (see `engineering-investments`). `<pe>` SHALL be the success rate the dispatch panel shows for the dispatched options, rounded to a whole percent, computed from the ticket as shown. `<trigger>` SHALL be 派工台 for the dispatch button, `一鍵派工方案 <letter>` for one-click dispatch and `批次派工方案 <letter>` for batch dispatch. In serial mode the dispatch line SHALL be written before the result line of the same dispatch.

#### Scenario: One-click dispatch in parallel mode

- **WHEN** on day 3 with SDD not owned the player one-click dispatches a complexity 2 ticket due on day 4 with 方案 B (Claude Code / Sonnet, 公司 API, 自審) and the panel would show 97%
- **THEN** the newest log line reads `D03 → 派出 <title>（複雜度 2・第 4 天到期）｜Claude Code / Sonnet・公司 API・自審｜成功率 97%｜一鍵派工方案 B｜預計 <hours>h`

#### Scenario: Serial mode logs the dispatch before the result

- **WHEN** the player dispatches a ticket from the dispatch panel in serial mode
- **THEN** the second-newest line is the 派出 line with 派工台 and the newest line is the result line

#### Scenario: Unrevealed trap shows the shown odds

- **WHEN** an unrevealed trap shown as complexity 1 is dispatched with a capability 3 model and no review
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
