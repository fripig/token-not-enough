# dispatch-outcome Specification

## Purpose

Defines how the game estimates and then decides an agent's result: its success rate, token usage, run time, and how the attempt settles into a completed or failed ticket.

## Requirements

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

---
### Requirement: Token estimate and usage

Estimated tokens SHALL be base × verb × 0.7 (large codebase with a ctx model) × 0.85 (when the base model's capability exceeds complexity by at least 1) × the review token multiplier (see `self-review`) × investment multipliers (see `engineering-investments`) × the research-ticket direct-dispatch multiplier (see `research-tickets`). Stacks SHALL NOT change tokens, and the number of agents running in parallel mode SHALL NOT change tokens. The panel SHALL show the range 0.7×–1.3× of the estimate. The actual tokens of a run SHALL be the estimate × a uniform factor in [0.7, 1.3]. The cost line SHALL show quota (estimate × w) for subscription and seat, NT$ (estimate × price × price modifier) labelled 自付 or 公司付 for API billing, and NT$0 for local.

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

---
### Requirement: Run time

Estimated hours SHALL be complexity × speed × 0.8 (after a failed try) × the review time multiplier × the stack time multiplier (see `stack-agent-effects`). The actual hours of a run SHALL be the estimate × a uniform factor in [0.8, 1.2]. In serial mode, if the actual hours exceed the hours left, the run SHALL use all remaining hours, charge tokens for the same fraction, and fail with the note 跑到下班還沒結束; self-review SHALL NOT rescue it. The panel SHALL warn 今天剩的工時可能不夠跑完。 in serial mode when estimate × 1.2 exceeds the hours left.

#### Scenario: Serial run out of time

- **WHEN** a serial run takes 4 hours with 2 hours left
- **THEN** half the tokens are charged, remaining hours are 0, and the attempt fails with 跑到下班還沒結束


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Settling an attempt

Whether an attempt succeeds SHALL be rolled against the success rate when it is dispatched. On settlement the game SHALL first apply review rescue (see `self-review`, which raises the tokens), then charge the tokens (see `billing-methods`), then apply quota exhaustion, merge conflict (see `parallel-slots`) and store rejection (see `stack-agent-effects`). A success SHALL complete the ticket (see `ticket-lifecycle`) and log ✓ with agent, model, tokens, spend, hours and reward. A failure SHALL log ✗ with the reason, 測試沒過，改壞了 by default. Every attempt SHALL add its tokens to the vendor's and billing method's token totals and then roll the security audit and overdraft check.

#### Scenario: Plain failure

- **WHEN** an unreviewed attempt fails
- **THEN** the log line contains 測試沒過，改壞了 and the tokens still count toward the vendor total


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
### Requirement: Estimate display

The panel SHALL show estimated tokens (with no multiplier in the label), cost, success rate and hours (labelled 執行時間 in parallel mode and 工時 in serial mode). The success rate SHALL be green at 80% or more, amber at 50% or more, and red below. When review or store review applies, the label SHALL add （原 <raw rate>%）. The panel SHALL show at most one warning, in this priority: vendor down, local GPU busy, sensitive Chinese cloud, sensitive personal account, quota short, slots full, due today and unable to finish, will run overnight, serial hours short, wallet short.

#### Scenario: Colour bands

- **WHEN** the shown success rate is 72%
- **THEN** it is shown in the amber style

#### Scenario: Label without multiplier

- **WHEN** two agents are running in parallel mode and the panel shows a ticket
- **THEN** the estimate label reads 預估 tokens with no ×multiplier

<!-- @trace
source: gh-12-01-parallel-review-load
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - public/js/calc.js
  - public/js/view.js
  - public/js/actions.js
  - public/js/modals.js
  - tools/check.js
-->
