## MODIFIED Requirements

### Requirement: Review levels

The dispatch panel SHALL offer three review levels: 不審核 (tokens ×1, time ×1, catch rate 0, note 改壞就整單重做), 自審 (tokens ×1.3, time ×1.2) and 嚴格審核 (tokens ×1.6, time ×1.35). The catch rate SHALL be 0.45 + 0.08 × capability ÷ 10 for 自審 and that plus 0.2 for 嚴格審核, plus the tests bonus (see `engineering-investments`), capped at 0.95. Each reviewed level SHALL show `token ×<multiplier>・抓錯 <rate>%`. The chosen level SHALL be kept across runs, default 自審.

#### Scenario: Catch rates

- **WHEN** a model is selected with 自審 or 嚴格審核 and no investments
- **THEN** the catch rate is as listed

##### Example: no investments

| Model | 自審 | 嚴格審核 |
| --- | --- | --- |
| Gemini Flash (20) | 61% | 81% |
| DeepSeek Chat (30) | 69% | 89% |
| Sonnet (40) | 77% | 95% |
| a capability-45 model | 81% | 95% |
| Opus (50) | 85% | 95% |
| Fable (60) | 93% | 95% |
