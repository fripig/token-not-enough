## MODIFIED Requirements

### Requirement: Security audit on sensitive tickets

When a sensitive ticket (機敏) is billed to 個人訂閱 or 個人 API, the game SHALL roll an audit after the attempt settles, whatever its outcome: 35% for a non-Chinese vendor and 60% for a Chinese vendor (secret scanning modifies these, see `engineering-investments`). An audit SHALL drop trust by 12 (not below 0), count one audit, and log a warn line that names the ticket and who was billed: `! 資安稽核：<title>｜<agent> / <model name>・<billing>｜機敏程式碼送進個人帳號被抓到，主管信任 -12`, or for a Chinese vendor `! 資安稽核：<title>｜<agent> / <model name>・<billing>｜機敏程式碼送進中國雲端模型被抓到，主管信任 -12`. The title SHALL be the ticket's title in the current language; the model name SHALL be the one the attempt was charged with (with effort for a dispatch, without effort for an architecture evaluation or an agent research); the trust number SHALL come from the audit trust constant. Company API, company seat and local GPU billing SHALL NOT be audited. The dispatch panel SHALL show the audit probability as a warning for a risky combination.

#### Scenario: Personal API on a sensitive ticket

- **WHEN** a sensitive ticket is billed to Sonnet on 個人 API
- **THEN** the panel warns 機敏工單用個人帳號：有 35% 機率被資安稽核抓到。

#### Scenario: Chinese cloud on a sensitive ticket

- **WHEN** a sensitive ticket is billed to DeepSeek Chat on 個人 API
- **THEN** the panel warns 機敏工單送到中國雲端：有 60% 機率被資安稽核抓到。

#### Scenario: Company API is safe

- **WHEN** a sensitive ticket is billed to 公司 API
- **THEN** no audit roll happens

#### Scenario: Audit line names the ticket and billing

- **WHEN** a sensitive ticket 登入頁支援密碼自動填入 dispatched to Claude Code / Opus on 個人訂閱 is audited when it settles
- **THEN** the newest log line reads `! 資安稽核：登入頁支援密碼自動填入｜Claude Code / Opus・個人訂閱｜機敏程式碼送進個人帳號被抓到，主管信任 -12`

#### Scenario: Chinese cloud audit line

- **WHEN** a sensitive ticket billed to DeepSeek Chat on 個人 API is audited
- **THEN** the audit line contains `Claude Code 接 DeepSeek API / Chat・個人 API` and 機敏程式碼送進中國雲端模型被抓到
