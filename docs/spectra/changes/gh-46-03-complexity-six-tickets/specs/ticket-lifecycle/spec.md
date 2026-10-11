## MODIFIED Requirements

### Requirement: Ticket generation

A non-incident ticket SHALL get complexity from r = random + day ÷ 20 × 0.38: r < 0.28 → 1, < 0.6 → 2, < 0.9 → 3, < 1.12 → 4, otherwise 5. From day 11, a non-incident ticket that got complexity 5 SHALL become complexity 6 with probability 0.25 (`SIX_RATE`), drawn after every other field of the ticket except the research roll; when `SIX_RATE` is 0 no extra random draw SHALL be made. An incident ticket SHALL have complexity 4. Base tokens SHALL be BASE[complexity] × a uniform factor in [0.85, 1.15] with BASE = 60, 180, 350, 550, 850, 1,200 k for complexity 1–6; a ticket turned into complexity 6 SHALL keep its uniform factor. KPI SHALL be round(KPI[complexity] × incident factor × stack factor) with KPI = 3, 6, 10, 16, 24, 34, incident factor 1.6 (see `engineering-investments` for monitoring) and stack factor from `stack-agent-effects`. A complexity-6 ticket SHALL take its title from its stack's complexity-6 title pool, and every stack including front-end SHALL provide at least 3 complexity-6 titles. The deadline SHALL be today for an incident, today + 1–3 days for complexity 1–2, and today + 2–5 days otherwise, plus the stack extension from `stack-agent-effects`. The deadline SHALL NOT be capped at day 20: a ticket created late in the month SHALL keep a deadline after day 20, and its card SHALL show 剩 N 天 as for any other ticket. A ticket SHALL be sensitive with probability 55% for incidents and 25% otherwise, and SHALL be large codebase with probability 45% when complexity is at least 3. Stack, trap, research and store-review fields come from `company-tech-stack`, `trap-tickets`, `research-tickets` and `stack-agent-effects`.

#### Scenario: Complexity by day

- **WHEN** non-incident tickets are generated with the listed random values
- **THEN** their complexity is as listed

##### Example: complexity rolls

| Day | random | r | Complexity |
| --- | --- | --- | --- |
| 1 | 0.25 | 0.269 | 1 |
| 1 | 0.5 | 0.519 | 2 |
| 10 | 0.5 | 0.69 | 3 |
| 20 | 0.0 | 0.38 | 2 |
| 20 | 0.99 | 1.37 | 5, or 6 with probability 0.25 |
| 10 | 0.99 | 1.18 | 5 (no complexity 6 before day 11) |

#### Scenario: Share of complexity 6

- **WHEN** 20,000 non-incident tickets are generated on day 15
- **THEN** about 25% of the tickets in the complexity-5 band are complexity 6, and no ticket generated on day 10 or earlier and no incident ticket is complexity 6

#### Scenario: Complexity-6 values

- **WHEN** a complexity-6 Laravel ticket and a complexity-6 Rust ticket are generated
- **THEN** their KPI is 34 and 44, and their base tokens lie between 1,020k and 1,380k

#### Scenario: Six rate zero keeps the random sequence

- **WHEN** the simulator runs with SIM_SIX_RATE=0 and a fixed seed
- **THEN** its output is identical to the same seed on the code before complexity-6 tickets existed

#### Scenario: Incident KPI

- **WHEN** an incident is generated for a Laravel company without monitoring
- **THEN** its complexity is 4, its KPI is 26 (round(16 × 1.6)) and its deadline is today

#### Scenario: Deadline past the month end

- **WHEN** a non-incident laravel complexity 3 ticket is created on day 19 with a base due offset of 3 days
- **THEN** its deadline is day 22 and on day 20 its card shows 剩 2 天

## ADDED Requirements

### Requirement: Complexity pips on the ticket card

A ticket card SHALL show its complexity as max(5, complexity) pips, the first complexity pips filled, so complexity 1–5 show five pips and complexity 6 shows six filled pips.

#### Scenario: Pips by complexity

- **WHEN** cards of complexity 2, 5 and 6 are drawn
- **THEN** they show 2 of 5, 5 of 5 and 6 of 6 filled pips
