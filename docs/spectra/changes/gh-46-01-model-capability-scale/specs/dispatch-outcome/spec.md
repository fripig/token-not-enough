## MODIFIED Requirements

### Requirement: Success rate

The success rate SHALL come from gap = model capability − ticket complexity × 10 + stack gap (see `stack-agent-effects`; capability after reasoning effort, see `reasoning-effort`). The base rate SHALL be read from the anchors gap +10 → 95%, 0 → 80%, −10 → 50%, −20 → 25%, −30 → 10%, interpolated linearly between neighbouring anchors, 95% for any gap above +10 and 10% for any gap below −30. On a large-codebase ticket a ctx model SHALL get +8% and a non-ctx model with capability below 40 SHALL get −8%. Investment bonuses (see `engineering-investments`) SHALL be added next, and the result SHALL be clamped to 5%–97%.

#### Scenario: Rate table

- **WHEN** a front-end ticket is estimated without review or investments
- **THEN** the raw success rate is as listed

##### Example: front-end tickets, no investments

| Model | Complexity | Large codebase | Rate |
| --- | --- | --- | --- |
| Sonnet (40) | 2 | no | 95% |
| Sonnet (40) | 4 | no | 80% |
| Gemini Flash (20, ctx) | 3 | no | 50% |
| Gemini Flash (20, ctx) | 4 | no | 25% |
| Gemini Flash (20, ctx) | 5 | no | 10% |
| Gemini Pro (40, ctx) | 4 | yes | 88% |
| DeepSeek Chat (30) | 3 | yes | 72% |
| Opus (50) | 3 | yes | 95% |
| Opus (50) | 5 | no | 80% |
| Fable (60) | 5 | no | 95% |

#### Scenario: In-between gaps are interpolated

- **WHEN** the base rate is looked up for a gap that is not a multiple of 10
- **THEN** it lies on the straight line between the two neighbouring anchors

##### Example: interpolated base rate

| Gap | Base rate |
| --- | --- |
| +30 | 95% |
| +5 | 87.5% |
| −5 | 65% |
| −15 | 37.5% |
| −25 | 17.5% |
| −40 | 10% |

### Requirement: Token estimate and usage

Estimated tokens SHALL be base × verb × 0.7 (large codebase with a ctx model) × 0.85 (when the base model's capability exceeds complexity × 10 by at least 10) × the review token multiplier (see `self-review`) × investment multipliers (see `engineering-investments`) × the research-ticket direct-dispatch multiplier (see `research-tickets`). Stacks SHALL NOT change tokens, and the number of agents running in parallel mode SHALL NOT change tokens. The panel SHALL show the range 0.7×–1.3× of the estimate. The actual tokens of a run SHALL be the estimate × a uniform factor in [0.7, 1.3]. The cost line SHALL show quota (estimate × w) for subscription and seat, NT$ (estimate × price × price modifier) labelled 自付 or 公司付 for API billing, and NT$0 for local.

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
