## MODIFIED Requirements

### Requirement: Success rate

The success rate SHALL come from gap = model capability − ticket complexity × 10 + stack gap (see `stack-agent-effects`) + large-codebase gap (capability after reasoning effort, see `reasoning-effort`). The large-codebase gap SHALL be +5 for a ctx model and −5 for a non-ctx model with capability below 40 on a large-codebase ticket, and 0 otherwise. The base rate SHALL be read from the anchors gap +20 → 95%, +10 → 88%, 0 → 75%, −10 → 50%, −20 → 25%, −30 → 10%, interpolated linearly between neighbouring anchors, 95% for any gap above +20 and 10% for any gap below −30. Investment bonuses (see `engineering-investments`) SHALL then each multiply the remaining failure chance (1 − rate) by (1 − bonus), and the result SHALL be clamped to 5%–97%.

#### Scenario: Rate table

- **WHEN** a front-end ticket is estimated without review or investments
- **THEN** the raw success rate is as listed

##### Example: front-end tickets, no investments

| Model | Complexity | Large codebase | Gap | Rate |
| --- | --- | --- | --- | --- |
| Sonnet (40) | 2 | no | +20 | 95% |
| Sonnet (40) | 4 | no | 0 | 75% |
| Gemini Flash (20, ctx) | 3 | no | −10 | 50% |
| Gemini Flash (20, ctx) | 4 | no | −20 | 25% |
| Gemini Flash (20, ctx) | 5 | no | −30 | 10% |
| Gemini Pro (40, ctx) | 4 | yes | +5 | 81.5% |
| DeepSeek Chat (30) | 3 | yes | −5 | 62.5% |
| Opus (50) | 3 | yes | +20 | 95% |
| Opus (50) | 5 | no | 0 | 75% |
| Fable (60) | 5 | no | +10 | 88% |

#### Scenario: In-between gaps are interpolated

- **WHEN** the base rate is looked up for a gap that is not a multiple of 10
- **THEN** it lies on the straight line between the two neighbouring anchors

##### Example: interpolated base rate

| Gap | Base rate |
| --- | --- |
| +30 | 95% |
| +15 | 91.5% |
| +5 | 81.5% |
| −5 | 62.5% |
| −15 | 37.5% |
| −25 | 17.5% |
| −40 | 10% |

#### Scenario: Stronger models stay apart with every investment

- **WHEN** CLAUDE.md level 2 for laravel, 導入 SDD level 2 (applied), 提升 agent 能力 level 3 and 單元測試 level 2 are owned, review is 自審, and laravel tickets are estimated
- **THEN** the shown success rates are as listed: Opus stays in 85%–92% on complexity 5, Fable is at least 5 points higher, and an easy ticket stays at or above 95%

##### Example: every investment, 自審, laravel tickets

| Model | Complexity | Gap | Raw rate | Catch rate | Shown rate |
| --- | --- | --- | --- | --- | --- |
| Opus (50) | 5 | 0 | 84.5% | 40% | 90.7% |
| Fable (60) | 5 | +10 | 92.6% | 50% | 96.3% |
| Sonnet (40) | 2 | +30 (convention +10) | 96.4% | 70% | 98.9% |
