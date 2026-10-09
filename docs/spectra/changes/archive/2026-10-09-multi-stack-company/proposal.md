## Why

A run currently has exactly one primary tech stack, but many real teams own two — a Laravel backend plus its own app, or a Rails SaaS with a Rust service. The player asked for the opening company choice to allow multiple selections so a run can model such a team.

## What Changes

- The opening setup lets the player select one or two primary stacks (Laravel 新聞站, Rails SaaS, Rust 基礎設施, App 團隊); at least one stays selected and a third cannot be added.
- Non-incident tickets: the selected stacks share 75% evenly, fe keeps 15%, the unselected company stacks share 10%. Incident tickets draw uniformly from the selected stacks.
- A ticket is unfamiliar (不熟, double manual hours) only when its stack is neither selected nor fe.
- Header, intro text, day-1 log line and month-end title join the selected company names with ＋.
- Best score keys: a single selection keeps tokgame-best-<mode>-<stack> (and the legacy Laravel fallback); a pair uses tokgame-best-<mode>-<a>+<b> in fixed stack order.
- The CLAUDE.md investment buttons list selected stacks first.
- The selection persists to the next run; a stored single-stack value from before this change is accepted.
- `tools/sim.js` gains a mode that measures the six two-stack combinations; `tools/check.js` asserts the new rules.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `company-tech-stack`: company selection becomes a 1–2 stack selection; ticket distribution, incident stack, unfamiliar rule and best-score key follow the selected set.
- `engineering-investments`: the investment panel lists all selected stacks first in the CLAUDE.md row.

## Impact

- Affected specs: company-tech-stack, engineering-investments
- Affected code: public/js/game.js, tools/check.js, tools/sim.js
- Documentation: docs/CLAUDE.md (local handoff file, not tracked in git)
