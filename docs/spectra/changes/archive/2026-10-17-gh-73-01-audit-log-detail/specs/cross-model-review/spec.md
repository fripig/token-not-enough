## MODIFIED Requirements

### Requirement: Audit for a personally billed reviewer

For a sensitive ticket, after the writer's audit roll (see `billing-methods`), the game SHALL roll one more audit when a reviewer other than 同一個 was charged anything and its billing is 個人訂閱 or 個人 API, at the reviewer vendor's odds (secret scanning applies). The reviewer's audit line SHALL use the `billing-methods` audit line format with the who segment written as `審核 <agent> / <reviewer model name>・<reviewer billing>`. The dispatch panel's sensitive warning SHALL name the reviewer's odds when only the reviewer is billed personally.

#### Scenario: Two rolls

- **WHEN** a sensitive ticket is written by Sonnet on 個人 API and reviewed by DeepSeek Reasoner on 個人 API, without secret scanning
- **THEN** one audit is rolled at 35% and another at 60%

#### Scenario: Company-billed reviewer

- **WHEN** a sensitive ticket is written by Sonnet on 公司 API and reviewed by Opus on 公司 API
- **THEN** no audit is rolled

#### Scenario: Reviewer audit line names the reviewer

- **WHEN** a sensitive ticket written by Sonnet on 公司 API and reviewed by Opus on 個人 API has its reviewer audited
- **THEN** the audit line contains `審核 Claude Code / Opus・個人 API` and 主管信任 -12
