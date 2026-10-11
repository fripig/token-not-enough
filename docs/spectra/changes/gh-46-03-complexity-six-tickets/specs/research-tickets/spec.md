## MODIFIED Requirements

### Requirement: Research ticket generation

A non-incident ticket generated with complexity 4, 5 or 6 SHALL become a research ticket with probability RESEARCH_RATE (0.3); for complexity 6 the research roll SHALL come after the complexity-6 roll (see `ticket-lifecycle`). Incident tickets, tickets generated with complexity 1–3, and merge-conflict tickets SHALL NOT be research tickets; trap tickets are never research tickets because traps are generated only at complexity 1–2. Outsourced tickets SHALL follow the same rule. A research ticket SHALL take its title from its stack's research title pool, where every entry names the ticket and the titles of its two parts; every stack including front-end SHALL provide at least 3 entries. When RESEARCH_RATE is 0 the generator SHALL make no extra random draw, so the random sequence equals that of a game without research tickets.

#### Scenario: Research share among large tickets

- **WHEN** 20,000 non-incident tickets are generated
- **THEN** about 30% of the tickets with complexity 4, 5 or 6 are research tickets and no ticket with complexity 1–3 is a research ticket

#### Scenario: Incidents are never research tickets

- **WHEN** incident tickets are generated
- **THEN** none of them is a research ticket

#### Scenario: Research rate zero keeps the random sequence

- **WHEN** the simulator runs with SIM_RESEARCH_RATE=0 and a fixed seed
- **THEN** its output is identical to the same seed on the code before research tickets existed

### Requirement: Splitting a researched ticket

Completed research SHALL remove the ticket and put two new tickets with new ids at its position in the queue, and the dispatch panel SHALL select the first part. Part complexities SHALL be 2 and 3 for complexity 4, 3 and 3 for complexity 5, and 3 and 4 for complexity 6. Each part's base tokens SHALL be BASE[part complexity] × a uniform factor in [0.85, 1.15]. The first part's KPI SHALL be round(original KPI × its complexity ÷ the sum of part complexities) and the second part's KPI the remainder; an outsourced ticket's pay SHALL be split the same way. Each part SHALL keep the original's stack, client, sensitivity, due date, outsourced flag and store review, SHALL keep large codebase only when its complexity is at least 3, and SHALL NOT be an incident, a trap, a research ticket, evaluated, revealed or a merge-conflict ticket, with no failed attempts. Part titles SHALL be the two part titles of the original's research title entry. Each part SHALL remember the original ticket's id. When both parts of the same original are overdue at the end of the same day, the trust drop SHALL apply only once for that original: the first part logs the normal trust drop and the second logs 信任 -0, while each part still loses its own KPI penalty and counts as one overdue ticket.

#### Scenario: KPI split

- **WHEN** research tickets of the listed kinds are researched
- **THEN** their parts have the listed complexity and KPI

##### Example: parts by original ticket

| Original | Parts (complexity, KPI) |
| --- | --- |
| Laravel complexity 4, KPI 16 | (2, 6), (3, 10) |
| Laravel complexity 5, KPI 24 | (3, 12), (3, 12) |
| Laravel complexity 6, KPI 34 | (3, 15), (4, 19) |
| Rust complexity 4, KPI 21 | (2, 8), (3, 13) |
| Outsourced Laravel complexity 4, pay NT$1,280 | (2, NT$512), (3, NT$768) |

#### Scenario: Fields carried over

- **WHEN** a sensitive, large-codebase financial-client research ticket of complexity 4 due on day 9 is researched
- **THEN** both parts are sensitive, belong to the financial client and are due on day 9, only the complexity-3 part is large codebase, and neither part is a research ticket

#### Scenario: Both parts overdue

- **WHEN** a Laravel research ticket of complexity 4 with KPI 16 due on day 9 is split, neither part is done, and day 9 ends with KPI 50 and trust 70
- **THEN** KPI is 42, trust is 66, the overdue count rises by 2, the log line of the second part ends with `信任 -0`, and the next morning report reads `2 張工單逾期，主管信任 -4。`

#### Scenario: Merge conflict on a directly dispatched research ticket

- **WHEN** a research ticket dispatched directly in parallel mode ends in a merge conflict
- **THEN** the follow-up 解決衝突 ticket is not a research ticket
