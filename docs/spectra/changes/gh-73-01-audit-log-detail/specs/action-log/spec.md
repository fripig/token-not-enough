## MODIFIED Requirements

### Requirement: Billing method on result and evaluation lines

Every attempt result line (success, failure, merge conflict) SHALL name the agent as `<agent> / <model name>・<billing>`; a success line SHALL keep its review suffix when review is not 不審核, followed by the `<reviewer>` segment of the dispatch line when the job had a reviewer other than 同一個. A failure whose catch was discarded because the review could not be done SHALL use the note 審核沒做完，沒抓到錯誤 (see `cross-model-review`). Every architecture evaluation line SHALL contain `評估｜<agent> / <model name>・<billing>`, using the model name without effort. Every architecture evaluation line (found, nothing found, interrupted by quota or wallet) of a sensitive ticket SHALL write the ticket as `<title>（機敏）` (English: `<title> (sensitive)`); a non-sensitive ticket's evaluation line SHALL show the title alone.

#### Scenario: Failure names the billing method

- **WHEN** a DeepSeek Chat attempt billed to 個人 API fails its test
- **THEN** the log line contains `Claude Code 接 DeepSeek API / Chat・個人 API` and 測試沒過，改壞了

#### Scenario: Evaluation names model and billing

- **WHEN** the player evaluates a ticket with Claude Code / Opus billed to 公司 API and nothing is found
- **THEN** the log line contains `評估｜Claude Code / Opus・公司 API` and 評估完成，看起來沒問題

#### Scenario: Success names the reviewer

- **WHEN** a Sonnet attempt billed to 公司 API with 自審 reviewed by Opus on 公司 API succeeds
- **THEN** the log line contains `Claude Code / Sonnet・公司 API・自審・Opus 審（公司 API）`

#### Scenario: Evaluation of a sensitive ticket

- **WHEN** the player evaluates a sensitive ticket titled 補齊 parser 的單元測試 and nothing is found
- **THEN** the evaluation line contains `補齊 parser 的單元測試（機敏）｜評估｜`
