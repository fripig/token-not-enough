## MODIFIED Requirements

### Requirement: Token estimate and usage

Estimated tokens SHALL be base × verb × 0.7 (large codebase with a ctx model) × 0.85 (when the base model's capability exceeds complexity by at least 1) × the review token multiplier (see `self-review`) × investment multipliers (see `engineering-investments`) × the research-ticket direct-dispatch multiplier (see `research-tickets`). Stacks SHALL NOT change tokens, and the number of agents running in parallel mode SHALL NOT change tokens. The panel SHALL show the range 0.7×–1.3× of the estimate. The actual tokens of a run SHALL be the estimate × a uniform factor in [0.7, 1.3]. The cost line SHALL show quota (estimate × w) for subscription and seat, NT$ (estimate × price × price modifier) labelled 自付 or 公司付 for API billing, and NT$0 for local.

#### Scenario: Sonnet on an easy ticket

- **WHEN** Sonnet without review estimates a front-end complexity-2 ticket with base 180k in serial mode
- **THEN** the estimate is 153k (180 × 1 × 0.85) and the panel shows 107k–199k

#### Scenario: Haiku on a hard ticket

- **WHEN** Haiku without review estimates a front-end complexity-4 ticket with base 550k
- **THEN** the estimate is 495k (550 × 0.9, no discount)

#### Scenario: Running agents do not change tokens

- **WHEN** Sonnet without review estimates a front-end complexity-2 ticket with base 180k in parallel mode while 2 agents are running
- **THEN** the estimate is 153k, the same as with no agent running

#### Scenario: Research ticket premium

- **WHEN** Sonnet without review estimates a front-end complexity-4 research ticket with base 550k
- **THEN** the estimate is 2,200k (550 × 1 × 4)

