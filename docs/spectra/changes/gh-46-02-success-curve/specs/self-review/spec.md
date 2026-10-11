## MODIFIED Requirements

### Requirement: Review levels

The dispatch panel SHALL offer three review levels: 不審核 (tokens ×1, time ×1, catch rate 0, note 改壞就整單重做), 自審 (tokens ×1.3, time ×1.2) and 嚴格審核 (tokens ×1.6, time ×1.35). The catch rate SHALL use the same gap as the success rate (see `dispatch-outcome`): 0.2 + 0.1 × gap ÷ 10 for 自審 and that plus 0.2 for 嚴格審核, plus the tests bonus (see `engineering-investments`), floored at 0 and capped at 0.95. Each reviewed level SHALL show `token ×<multiplier>・抓錯 <rate>%` for the selected ticket and model. The chosen level SHALL be kept across runs, default 自審.

#### Scenario: Catch rates by gap

- **WHEN** a ticket and model are selected with 自審 or 嚴格審核 and no investments
- **THEN** the catch rate follows the gap as listed

##### Example: no investments

| Gap | Example | 自審 | 嚴格審核 |
| --- | --- | --- | --- |
| −30 | Gemini Flash (20) on complexity 5 | 0% | 10% |
| −20 | Gemini Flash (20) on complexity 4 | 0% | 20% |
| −10 | DeepSeek Chat (30) on complexity 4 | 10% | 30% |
| 0 | Sonnet (40) on complexity 4 | 20% | 40% |
| +5 | a capability-45 model on complexity 4 | 25% | 45% |
| +10 | Fable (60) on complexity 5 | 30% | 50% |
| +20 | Sonnet (40) on complexity 2 | 40% | 60% |
| +30 | Opus (50) on complexity 2 | 50% | 70% |

#### Scenario: Same model, harder ticket

- **WHEN** Sonnet with 自審 is selected for a complexity-2 front-end ticket and then for a complexity-4 front-end ticket
- **THEN** the 自審 button shows 抓錯 40% for the first and 抓錯 20% for the second

### Requirement: Effective success rate

The success rate shown SHALL be (p + (1 − p) × catch rate), multiplied by (1 − store rejection rate) for a store-review ticket, where p is the raw success rate.

#### Scenario: Sonnet with self-review

- **WHEN** Sonnet with 自審 is selected for a front-end complexity-4 ticket
- **THEN** the panel shows 80% with （原 75%）
