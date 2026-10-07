## Why

The game currently casts the player as a Laravel backend engineer and draws every ticket from one fixed pool, so every run feels the same and the role is narrower than the people who will play it. Letting the player pick a company with its own primary tech stack (Laravel, Rails, Rust, mobile app), and mixing in front-end and unfamiliar-stack tickets, widens the ticket variety and makes "which agent, which model" depend on the kind of code being changed.

## What Changes

- The opening setup screen gains a company picker with four options: Laravel news site, Rails SaaS, Rust infrastructure, and mobile app team. The player is described as a full-stack engineer instead of a Laravel engineer.
- Each ticket carries a tech stack. Roughly 75% of non-incident tickets come from the chosen company's primary stack, about 15% are front-end tickets, and about 10% come from the other stacks. Incident tickets always come from the primary stack.
- Ticket titles move from one pool to per-stack pools (Laravel, Rails, Rust, App, front-end), each with titles for complexity 1 to 5 plus incidents. The existing Laravel titles are kept.
- Tickets from a stack other than the primary stack or front-end are marked as unfamiliar; writing them by hand ("自己手寫") takes twice as long.
- Stacks change agent outcomes only through properties of the stack itself, never through per-vendor skill ratings:
  - Laravel and Rails: strong conventions make low- and mid-complexity tickets easier for any model.
  - Rust: slower compile-and-test loop (longer run time) and lower-capability models struggle with the borrow checker (lower success rate).
  - App: simulator runs make agent work slower, and some tickets must pass store review, which can bounce a finished ticket back as a failure.
- The ticket card, dispatch panel estimate, and warning line show the stack and its effect; the month-end receipt names the company.
- Best scores are stored per mode and per company.
- tools/sim.js runs every company so balance can be checked per stack.
- docs/CLAUDE.md and README.md describe the new mechanic.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `company-tech-stack`: choosing a company at the start of a run, how its primary stack shapes the ticket mix, unfamiliar-stack hand-writing cost, and per-company best scores.
- `stack-agent-effects`: how a ticket's tech stack changes an agent's success rate, run time, and post-success outcome, and how those effects are shown to the player.

### Modified Capabilities

(none)

## Impact

- Affected code: public/js/game.js (data tables, makeIssue, est, settle, manual, showSetup, render, dispatchPanel, showEnd), public/css/style.css (stack chip colors in light and dark themes), tools/sim.js.
- Affected docs: docs/CLAUDE.md, README.md.
- Stored data: the localStorage best-score key changes from tokgame-best-<mode> to tokgame-best-<mode>-<company>; existing Laravel best scores are carried over.
- No new dependencies; the site stays static and deploys through the existing GitHub Pages workflow.
