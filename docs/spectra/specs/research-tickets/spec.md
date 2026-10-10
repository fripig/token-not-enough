# research-tickets Specification

## Purpose

Adds visible research tickets: large tickets that burn a lot of tokens when dispatched directly but can be researched first, by an agent or by the player, and split into two smaller tickets. It gives the player a clear up-front trade-off between paying for research and brute-forcing a big ticket.

## Requirements

### Requirement: Research ticket generation

A non-incident ticket generated with complexity 4 or 5 SHALL become a research ticket with probability RESEARCH_RATE (0.3). Incident tickets, tickets generated with complexity 1–3, and merge-conflict tickets SHALL NOT be research tickets; trap tickets are never research tickets because traps are generated only at complexity 1–2. Outsourced tickets SHALL follow the same rule. A research ticket SHALL take its title from its stack's research title pool, where every entry names the ticket and the titles of its two parts; every stack including front-end SHALL provide at least 3 entries. When RESEARCH_RATE is 0 the generator SHALL make no extra random draw, so the random sequence equals that of a game without research tickets.

#### Scenario: Research share among large tickets

- **WHEN** 20,000 non-incident tickets are generated
- **THEN** about 30% of the tickets with complexity 4 or 5 are research tickets and no ticket with complexity 1–3 is a research ticket

#### Scenario: Incidents are never research tickets

- **WHEN** incident tickets are generated
- **THEN** none of them is a research ticket

#### Scenario: Research rate zero keeps the random sequence

- **WHEN** the simulator runs with SIM_RESEARCH_RATE=0 and a fixed seed
- **THEN** its output is identical to the same seed on the code before research tickets existed

---
### Requirement: Research ticket card

A research ticket's card SHALL show a 需研究 chip and the hint 直接派工 token ×4（先研究可拆成兩張小單）. The dispatch panel for a research ticket SHALL show the agent research button with its token and hour cost and the self research button with its hour cost, and SHALL NOT show the architecture evaluation button. The dispatch decision log line of a research ticket SHALL include 需研究 among its tags.

#### Scenario: Card and panel

- **WHEN** a complexity-4 Laravel research ticket is rendered and selected with Claude Sonnet billed to personal API
- **THEN** the card shows 需研究 and the ×4 hint, and the panel shows 先讓 agent 研究拆單（40k tokens，0.4h） and 自己研究拆單（1.5h，0 token） and no 先讓 agent 評估架構 button

---
### Requirement: Direct dispatch token premium

Dispatching a research ticket without researching it SHALL multiply its token estimate and actual tokens by RESEARCH_DIRECT_TK (4). The success rate and run time SHALL be the same as for the same ticket without the research flag. One-click dispatch SHALL use the multiplied estimate for its quota and wallet checks; batch dispatch is unaffected because it only dispatches tickets of shown complexity 2 or less.

#### Scenario: Sonnet on a research ticket

- **WHEN** Sonnet without review estimates a front-end complexity-4 research ticket with base 550k
- **THEN** the estimate is 2,200k (550 × 4) and the success rate and hours equal those of the same ticket without the flag

#### Scenario: One-click skips a preset that cannot afford the premium

- **WHEN** preset A bills personal API and the wallet covers the ticket's normal estimate but not 4 × it
- **THEN** one-click dispatch skips preset A with 錢包不夠

---
### Requirement: Agent research

The dispatch panel SHALL offer agent research on a research ticket that is not running. Agent research SHALL charge RESEARCH_TK (40k) × the base model's token multiplier through the selected billing method and SHALL spend RESEARCH_HRS (0.5h) × model speed × the local speed factor of player time; reasoning effort SHALL NOT change it. In parallel mode it SHALL advance the clock while the ticket is marked running, as architecture evaluation does. It SHALL be refused, changing nothing, when the billing method is company billing on an outsourced ticket, the model needs a machine that is not installed, local billing is selected while the local GPU is busy, the hours exceed the hours left, or the panel's dispatch controls are blocked (outage, client ban, billing not usable). A sensitive ticket billed to personal subscription or personal API SHALL roll the security audit, and a company API overdraft SHALL apply the overdraft penalty, as for architecture evaluation. If subscription or seat quota runs out, research SHALL stop: the used quota is charged, the hours are spent, the ticket is not split, and the log shows 額度不夠，研究沒做完.

#### Scenario: Agent research cost

- **WHEN** the player researches a research ticket with Claude Sonnet billed to personal API in serial mode
- **THEN** 40k tokens are charged at Sonnet's API price (NT$18), 0.4h of player time is spent and the ticket is split

#### Scenario: Quota runs out

- **WHEN** the player researches with a subscription that has 30k quota left
- **THEN** the quota drops to 0, the ticket stays a research ticket in the queue and the log shows 額度不夠，研究沒做完

#### Scenario: Refused on an outsourced ticket

- **WHEN** the player researches an outsourced research ticket with 公司 API selected
- **THEN** nothing changes and no event is sent

---
### Requirement: Self research

The dispatch panel SHALL offer self research on a research ticket that is not running. Self research SHALL spend RESEARCH_SELF_HRS (1.5h) of player time, × UNFAMILIAR_HRS (2) on an unfamiliar stack, and no tokens; in parallel mode it SHALL advance the clock while the ticket is marked running. It SHALL be refused, changing nothing, when hand-writing is blocked or the hours exceed the hours left. It SHALL always split the ticket and SHALL NOT roll a security audit.

#### Scenario: Self research hours

##### Example: hours by stack familiarity

| Company | Ticket stack | Hours |
| --- | --- | --- |
| Laravel | laravel | 1.5 |
| Laravel | rust | 3 |
| Laravel | fe | 1.5 |

#### Scenario: Not enough hours

- **WHEN** 1h is left and the player tries self research on a familiar-stack research ticket
- **THEN** nothing changes

---
### Requirement: Splitting a researched ticket

Completed research SHALL remove the ticket and put two new tickets with new ids at its position in the queue, and the dispatch panel SHALL select the first part. Part complexities SHALL be 2 and 3 for complexity 4, and 3 and 3 for complexity 5. Each part's base tokens SHALL be BASE[part complexity] × a uniform factor in [0.85, 1.15]. The first part's KPI SHALL be round(original KPI × its complexity ÷ the sum of part complexities) and the second part's KPI the remainder; an outsourced ticket's pay SHALL be split the same way. Each part SHALL keep the original's stack, client, sensitivity, due date, outsourced flag and store review, SHALL keep large codebase only when its complexity is at least 3, and SHALL NOT be an incident, a trap, a research ticket, evaluated, revealed or a merge-conflict ticket, with no failed attempts. Part titles SHALL be the two part titles of the original's research title entry. Each part SHALL remember the original ticket's id. When both parts of the same original are overdue at the end of the same day, the trust drop SHALL apply only once for that original: the first part logs the normal trust drop and the second logs 信任 -0, while each part still loses its own KPI penalty and counts as one overdue ticket.

#### Scenario: KPI split

##### Example: parts by original ticket

| Original | Parts (complexity, KPI) |
| --- | --- |
| Laravel complexity 4, KPI 16 | (2, 6), (3, 10) |
| Laravel complexity 5, KPI 24 | (3, 12), (3, 12) |
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

---
### Requirement: Research log lines

A completed agent research SHALL log ✂ <title>｜研究｜<agent> / <model>・<billing>｜拆成「<part 1>」（複雜度 N）＋「<part 2>」（複雜度 N）｜<tokens> tokens｜<spend>｜<hours>h. A completed self research SHALL log ✂ <title>｜自己研究｜拆成「<part 1>」（複雜度 N）＋「<part 2>」（複雜度 N）｜<hours>h. An agent research stopped by quota SHALL log ✗ <title>｜研究｜<agent> / <model>・<billing>｜額度不夠，研究沒做完｜<spend>.

#### Scenario: Self research log

- **WHEN** the player self-researches a complexity-5 Laravel research ticket
- **THEN** the newest log line starts with ✂, contains 自己研究 and 拆成, and names both part titles with 複雜度 3

---
### Requirement: Saves without research fields

A ticket loaded from a save made before this change has no research fields and SHALL behave as a normal ticket. The save structure version SHALL stay 1.

#### Scenario: Old save

- **WHEN** a day-5 save whose tickets have no research field is loaded
- **THEN** the game resumes on day 5 and no ticket shows 需研究
