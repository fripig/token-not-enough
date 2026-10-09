## MODIFIED Requirements

### Requirement: Success rate

The success rate SHALL come from diff = model capability − ticket complexity + stack gap (see `stack-agent-effects`; capability after reasoning effort, see `reasoning-effort`): diff ≥ 1 → 95%, 0 → 80%, −1 → 50%, −2 → 25%, lower → 10%. On a large-codebase ticket a ctx model SHALL get +8% and a non-ctx model with capability below 4 SHALL get −8%. Investment bonuses (see `engineering-investments`) SHALL be added next, and the result SHALL be clamped to 5%–97%.

#### Scenario: Rate table

##### Example: front-end tickets, no investments

| Model | Complexity | Large codebase | Rate |
| --- | --- | --- | --- |
| Sonnet (4) | 2 | no | 95% |
| Sonnet (4) | 4 | no | 80% |
| Gemini Flash (2, ctx) | 3 | no | 50% |
| Gemini Flash (2, ctx) | 4 | no | 25% |
| Gemini Flash (2, ctx) | 5 | no | 10% |
| Gemini Pro (4, ctx) | 4 | yes | 88% |
| DeepSeek Chat (3) | 3 | yes | 72% |
| Opus (5) | 3 | yes | 95% |
| Opus (5) | 5 | no | 80% |
| Fable (6) | 5 | no | 95% |
