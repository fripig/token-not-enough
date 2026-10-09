## MODIFIED Requirements

### Requirement: Token estimate and usage

Estimated tokens SHALL be base × verb × 0.7 (large codebase with a ctx model) × 0.85 (when the base model's capability exceeds complexity by at least 1) × the review token multiplier (see `self-review`) × investment multipliers (see `engineering-investments`). Stacks SHALL NOT change tokens, and the number of agents running in parallel mode SHALL NOT change tokens. The panel SHALL show the range 0.7×–1.3× of the estimate. The actual tokens of a run SHALL be the estimate × a uniform factor in [0.7, 1.3]. The cost line SHALL show quota (estimate × w) for subscription and seat, NT$ (estimate × price × price modifier) labelled 自付 or 公司付 for API billing, and NT$0 for local.

#### Scenario: Sonnet on an easy ticket

- **WHEN** Sonnet without review estimates a front-end complexity-2 ticket with base 180k in serial mode
- **THEN** the estimate is 153k (180 × 1 × 0.85) and the panel shows 107k–199k

#### Scenario: Haiku on a hard ticket

- **WHEN** Haiku without review estimates a front-end complexity-4 ticket with base 550k
- **THEN** the estimate is 495k (550 × 0.9, no discount)

#### Scenario: Running agents do not change tokens

- **WHEN** Sonnet without review estimates a front-end complexity-2 ticket with base 180k in parallel mode while 2 agents are running
- **THEN** the estimate is 153k, the same as with no agent running

### Requirement: Estimate display

The panel SHALL show estimated tokens (with no multiplier in the label), cost, success rate and hours (labelled 執行時間 in parallel mode and 工時 in serial mode). The success rate SHALL be green at 80% or more, amber at 50% or more, and red below. When review or store review applies, the label SHALL add （原 <raw rate>%）. The panel SHALL show at most one warning, in this priority: vendor down, local GPU busy, sensitive Chinese cloud, sensitive personal account, quota short, slots full, due today and unable to finish, will run overnight, serial hours short, wallet short.

#### Scenario: Colour bands

- **WHEN** the shown success rate is 72%
- **THEN** it is shown in the amber style

#### Scenario: Label without multiplier

- **WHEN** two agents are running in parallel mode and the panel shows a ticket
- **THEN** the estimate label reads 預估 tokens with no ×multiplier
