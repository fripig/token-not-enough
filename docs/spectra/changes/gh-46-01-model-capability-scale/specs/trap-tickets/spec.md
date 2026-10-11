## MODIFIED Requirements

### Requirement: Architecture evaluation

The dispatch panel SHALL offer an evaluation action on non-incident tickets that are neither evaluated, revealed, merge-conflict tickets nor research tickets. Evaluation SHALL charge 40k × model verbosity tokens through the selected billing method and SHALL spend 0.5h × model speed of player time. On a trap it SHALL reveal the true complexity with probability min(0.95, 0.35 + 0.15 × model capability ÷ 10). A completed evaluation SHALL mark the ticket as evaluated and show a 已評估 chip whether or not it found a trap. If subscription or seat quota runs out during evaluation, it SHALL stop without a reveal, log 額度不夠，評估沒做完, and leave the ticket not evaluated. Because the agent reads the code, an evaluation of a sensitive ticket billed to a personal subscription or personal API SHALL roll the same security audit as a dispatch (probability 0.6 for Chinese vendors, 0.35 otherwise, trust −12), and an evaluation that overdraws the company API budget SHALL apply the same overdraft penalty as a dispatch immediately.

#### Scenario: Evaluation cost

- **WHEN** the player evaluates a ticket with Claude Code Sonnet billed to personal API
- **THEN** 40k tokens are charged to the personal wallet at Sonnet's API price and 0.4h of player time is spent

##### Example: reveal probability by capability

| Model capability | Reveal probability on a trap |
| ---------------- | ---------------------------- |
| 20 | 0.65 |
| 25 | 0.725 |
| 30 | 0.80 |
| 40 | 0.95 |
| 45 | 0.95 |
| 50 | 0.95 |

#### Scenario: Evaluating a sensitive ticket

- **WHEN** the player evaluates a sensitive ticket with DeepSeek Chat billed to personal API and the audit roll is below 0.6
- **THEN** trust drops by 12 and the audit count increases by 1

#### Scenario: Evaluation overdraws the company budget

- **WHEN** the company API budget is NT$5 and the player evaluates with Opus billed to company API
- **THEN** the budget is reset to 0, trust drops by 8, and the log shows the overdraft warning in the same action

#### Scenario: Missed trap looks like a normal ticket

- **WHEN** an evaluation of a trap does not reveal it
- **THEN** the card shows 已評估 exactly as an evaluated normal ticket does, and the evaluation button is no longer offered

#### Scenario: No evaluation on a research ticket

- **WHEN** the player selects a research ticket
- **THEN** the panel shows no 先讓 agent 評估架構 button and evaluation does nothing

### Requirement: Working on an unrevealed trap

When an unrevealed trap is dispatched, the run SHALL be rolled against the true complexity and true token base. If the model capability is at least the true complexity × 10, the run SHALL use the true-complexity tokens, hours and success rate, and the ticket SHALL be revealed when the run settles. If the model capability is below the true complexity × 10, the run SHALL spend 0.4 × the true-complexity tokens and hours, fail with the note 做到一半發現牽扯整個架構，先停下來, reveal the ticket, and increase its tries; self-review SHALL NOT prevent this. Hand-writing an unrevealed trap SHALL spend the shown-complexity hand-writing hours and then reveal the ticket with the note 手寫到一半發現要動架構, leaving it in the queue.

#### Scenario: Weak model stops on a trap

- **WHEN** an unrevealed trap with shown complexity 1 and true complexity 4 is dispatched to DeepSeek Chat (capability 30)
- **THEN** the run fails with 做到一半發現牽扯整個架構，先停下來, the ticket is revealed with complexity 4, and the charged tokens are 0.4 × the true-complexity estimate

#### Scenario: Strong model pushes through

- **WHEN** the same trap is dispatched to Claude Code Sonnet (capability 40) and the run succeeds
- **THEN** the ticket completes, the charged tokens follow the true complexity 4 estimate, and the log includes 原來牽扯到架構，硬做完了

#### Scenario: In-between capability still stops on a harder trap

- **WHEN** an unrevealed trap with true complexity 5 is dispatched to a model with capability 45
- **THEN** the run stops partway like a weak model, because 45 is below 50

#### Scenario: Hand-writing a trap

- **WHEN** the player hand-writes an unrevealed trap with shown complexity 1 at Laravel 新聞站 with no previous tries
- **THEN** 2.2h of player time is spent, the ticket is revealed and stays in the queue
