# trap-tickets Specification

## Purpose

Adds tickets that look small but hide a large true complexity, so the player faces the familiar "30-minute fix that takes all day" problem. It also gives the player a paid way to investigate before committing and a way to renegotiate a trap once it is revealed.

## Requirements

### Requirement: Trap ticket generation

A non-incident ticket generated with complexity 1 or 2 SHALL become a trap with probability TRAP_RATE (0.10). A trap SHALL keep its generated complexity as the shown complexity and SHALL have a hidden true complexity of 4 (probability 0.6) or 5 (probability 0.4). Incident tickets and tickets generated with complexity 3 or higher SHALL NOT be traps. A trap's KPI reward and due date SHALL be generated from the shown complexity.

#### Scenario: Trap share among small tickets

- **WHEN** 20,000 non-incident tickets are generated
- **THEN** about 10% of the tickets with shown complexity 1 or 2 are traps, no ticket with shown complexity 3 or higher is a trap, and about 60% of traps have true complexity 4

#### Scenario: Incidents are never traps

- **WHEN** incident tickets are generated
- **THEN** none of them is a trap

---
### Requirement: Telltale trap titles

Every stack SHALL provide at least 4 telltale trap titles. A trap SHALL take a telltale title with probability 0.5 and otherwise an ordinary title from its shown complexity level. An unrevealed trap's card SHALL show the same chips and complexity as a normal ticket of the same shown complexity.

#### Scenario: Hidden trap card

- **WHEN** an unrevealed trap with shown complexity 1 is rendered
- **THEN** its card shows complexity 1 and no trap chip

---
### Requirement: Architecture evaluation

The dispatch panel SHALL offer an evaluation action on non-incident tickets that are neither evaluated nor revealed. Evaluation SHALL charge 40k × model verbosity tokens through the selected billing method and SHALL spend 0.5h × model speed of player time. On a trap it SHALL reveal the true complexity with probability min(0.95, 0.35 + 0.15 × model capability). A completed evaluation SHALL mark the ticket as evaluated and show a 已評估 chip whether or not it found a trap. If subscription or seat quota runs out during evaluation, it SHALL stop without a reveal, log 額度不夠，評估沒做完, and leave the ticket not evaluated. Because the agent reads the code, an evaluation of a sensitive ticket billed to a personal subscription or personal API SHALL roll the same security audit as a dispatch (probability 0.6 for Chinese vendors, 0.35 otherwise, trust −12), and an evaluation that overdraws the company API budget SHALL apply the same overdraft penalty as a dispatch immediately.

#### Scenario: Evaluation cost

- **WHEN** the player evaluates a ticket with Claude Code Sonnet billed to personal API
- **THEN** 40k tokens are charged to the personal wallet at Sonnet's API price and 0.4h of player time is spent

##### Example: reveal probability by capability

| Model capability | Reveal probability on a trap |
| ---------------- | ---------------------------- |
| 2 | 0.65 |
| 3 | 0.80 |
| 4 | 0.95 |
| 5 | 0.95 |

#### Scenario: Evaluating a sensitive ticket

- **WHEN** the player evaluates a sensitive ticket with DeepSeek Chat billed to personal API and the audit roll is below 0.6
- **THEN** trust drops by 12 and the audit count increases by 1

#### Scenario: Evaluation overdraws the company budget

- **WHEN** the company API budget is NT$5 and the player evaluates with Opus billed to company API
- **THEN** the budget is reset to 0, trust drops by 8, and the log shows the overdraft warning in the same action

#### Scenario: Missed trap looks like a normal ticket

- **WHEN** an evaluation of a trap does not reveal it
- **THEN** the card shows 已評估 exactly as an evaluated normal ticket does, and the evaluation button is no longer offered

---
### Requirement: Working on an unrevealed trap

When an unrevealed trap is dispatched, the run SHALL be rolled against the true complexity and true token base. If the model capability is at least the true complexity, the run SHALL use the true-complexity tokens, hours and success rate, and the ticket SHALL be revealed when the run settles. If the model capability is below the true complexity, the run SHALL spend 0.4 × the true-complexity tokens and hours, fail with the note 做到一半發現牽扯整個架構，先停下來, reveal the ticket, and increase its tries; self-review SHALL NOT prevent this. Hand-writing an unrevealed trap SHALL spend the shown-complexity hand-writing hours and then reveal the ticket with the note 手寫到一半發現要動架構, leaving it in the queue.

#### Scenario: Weak model stops on a trap

- **WHEN** an unrevealed trap with shown complexity 1 and true complexity 4 is dispatched to DeepSeek Chat (capability 3)
- **THEN** the run fails with 做到一半發現牽扯整個架構，先停下來, the ticket is revealed with complexity 4, and the charged tokens are 0.4 × the true-complexity estimate

#### Scenario: Strong model pushes through

- **WHEN** the same trap is dispatched to Claude Code Sonnet (capability 4) and the run succeeds
- **THEN** the ticket completes, the charged tokens follow the true complexity 4 estimate, and the log includes 原來牽扯到架構，硬做完了

#### Scenario: Hand-writing a trap

- **WHEN** the player hand-writes an unrevealed trap with shown complexity 1 at Laravel 新聞站 with no previous tries
- **THEN** 2.2h of player time is spent, the ticket is revealed and stays in the queue

---
### Requirement: Revealed trap display

A revealed trap SHALL use its true complexity and true token base for all later estimates and runs, SHALL show a 牽一髮動全身 chip that includes its original shown complexity, and SHALL keep its original KPI reward and due date.

#### Scenario: Estimates after reveal

- **WHEN** a trap with shown complexity 1 and true complexity 5 is revealed
- **THEN** its card shows complexity 5 and the chip 牽一髮動全身・原估 1, and its KPI reward is unchanged

---
### Requirement: Manager re-scoping

A revealed trap that has not been re-scoped SHALL offer a 找主管重新評估 action. With trust at least 50, the action SHALL reduce trust by 5, set the KPI reward to KPI[true complexity] times the hard-stack multiplier (rounded), and move the due date 2 days later capped at day 20. With trust below 50, it SHALL reduce trust by 3 and change nothing else. In both cases the action SHALL NOT be offered again for that ticket.

#### Scenario: Re-scope accepted

- **WHEN** trust is 70 and the player re-scopes a revealed rust trap with shown complexity 1, true complexity 4, KPI 4 and due day 6
- **THEN** trust becomes 65, KPI becomes 21 and the due day becomes 8

##### Example: re-scope outcomes

| Trust | Stack | True cx | KPI before | Due before | Trust after | KPI after | Due after |
| ----- | ----- | ------- | ---------- | ---------- | ----------- | --------- | --------- |
| 70 | rust | 4 | 4 | 6 | 65 | 21 | 8 |
| 50 | laravel | 5 | 3 | 19 | 45 | 24 | 20 |
| 49 | laravel | 4 | 3 | 6 | 46 | 3 | 6 |

---
### Requirement: Trap counts on the receipt

The month-end receipt SHALL show how many traps were stepped on (revealed by an agent run or hand-writing) and how many were found by evaluation.

#### Scenario: Receipt lines

- **WHEN** a month ends after one trap was revealed by an agent run and two by evaluation
- **THEN** the receipt shows 踩到陷阱 1 次 and 事先識破 2 次
