## Why

Real tickets often look like a 30-minute fix but turn out to touch core architecture and eat a whole day. The game currently shows every ticket's true complexity up front, so the player never faces the most familiar planning failure in agent-assisted work: committing cheap resources to a ticket whose real cost is hidden. Adding trap tickets, plus a paid way to investigate before committing, turns "should I spend tokens on planning first?" into a real decision.

## What Changes

- Some low-complexity, non-incident tickets are traps: they show complexity 1 or 2 but their true complexity is 4 or 5. The true value stays hidden until revealed.
- Some trap tickets use titles with telltale wording (for example "只要改一行", "順便"); the rest use ordinary titles and cannot be told apart by title.
- The dispatch panel gains an "先讓 agent 評估架構" action. It costs a small amount of tokens (charged through the selected billing method) and player time, and reveals a trap with a probability that rises with model capability. A missed trap or a normal ticket is marked as evaluated with no reveal.
- Working on an unrevealed trap:
  - A model whose capability is at least the true complexity finishes the ticket, but token use, run time and success rate follow the true complexity.
  - A weaker model stops partway: a fraction of the true-complexity tokens and time is spent, the ticket is revealed, and it stays in the queue.
  - Hand-writing an unrevealed trap spends the shown hand-writing estimate, then reveals the ticket.
- A revealed trap shows its true complexity and a "牽一髮動全身" chip; estimates switch to the true complexity. Its KPI reward and due date stay at the shown (small-ticket) values.
- After a reveal, the player may ask the manager to re-scope the ticket once: with enough trust it costs some trust and raises the KPI reward to the true complexity and extends the due date; with too little trust the request is refused and still costs a little trust.
- The month-end receipt counts traps stepped on and traps found by evaluation.
- tools/check.js and tools/sim.js cover trap tickets; docs/CLAUDE.md and README.md describe the mechanic.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `trap-tickets`: hidden true complexity on some low-complexity tickets, telltale titles, the paid architecture evaluation, what happens when an unrevealed trap is worked on, manager re-scoping, and the receipt counts.

### Modified Capabilities

(none)

## Impact

- Affected code: public/js/game.js (issue generation, est usage in makeJob, settle, manual, dispatchPanel, render ticket card, showEnd, new evaluate and re-scope actions), public/css/style.css (trap chip in light and dark themes), tools/check.js, tools/sim.js.
- Affected docs: docs/CLAUDE.md, README.md.
- Existing specs company-tech-stack and stack-agent-effects keep their requirements; stack effects apply to traps using the ticket's current (shown or revealed) complexity, as described in design.md.
- No new dependencies; deploy stays on the existing GitHub Pages workflow.
