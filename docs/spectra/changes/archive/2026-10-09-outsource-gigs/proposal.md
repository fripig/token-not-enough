## Why

The player asked for an outsourcing category whose tokens can only be paid out of their own pocket. Many engineers take side gigs; in this game that adds a tempting trade-off — spend personal subscription quota and wallet on work that pays cash but earns no KPI and gets no help from company budget.

## What Changes

- The opening setup gets a separate 接外包 toggle (off by default), independent of the 1–2 primary stack selection and kept for the next run.
- With it on, each day brings 0–2 extra outsourced tickets on top of the usual company tickets. Their stack is one of the five stacks uniformly; unselected non-fe stacks still count as unfamiliar. They are never incidents and never sensitive, and they can be trap tickets.
- Outsourced tickets can only be billed to personal subscription, personal API or local GPU. 公司 API and 公司席位 (any seat vendor: Anthropic, OpenAI or Google) are unavailable with the reason 外包不能用公司資源, in the dispatch panel and for dispatch presets, so one-click and batch dispatch skip presets that bill the company. The company-wide China cloud ban does not apply to them, and their cards do not show the 禁中國雲端 chip.
- Finishing an outsourced ticket pays NT$ = its KPI value × 80 into the personal wallet and adds no KPI. The month-end personal spend subtracts outsourcing income.
- A late outsourced ticket costs a penalty of 30% of its pay from the wallet, counted as personal spend, with no KPI or trust loss.
- A merge conflict on an outsourced ticket leaves a 解決衝突 ticket that stays outsourced: same pay, same billing restriction, same late penalty.
- Engineering investments apply to outsourced tickets exactly as they do to company tickets.
- Manager re-scoping is not offered for outsourced tickets.
- Ticket cards show an 外包 chip and the pay instead of the KPI value; the receipt adds outsourcing income, done and late lines.
- `tools/sim.js` gains a mode that turns outsourcing on; `tools/check.js` asserts the new rules.

## Capabilities

### New Capabilities

- `outsource-gigs`: the outsourcing toggle, outsourced ticket generation, billing restriction, pay, late penalty, merge-conflict carry-over and receipt lines.

### Modified Capabilities

- `company-tech-stack`: the 75/15/10 stack distribution applies to company tickets; outsourced tickets use a uniform stack.

## Impact

- Affected specs: outsource-gigs (new), company-tech-stack
- Affected code: public/js/state.js (`S.outsource`, `makeGig`, gig constants), public/js/data.js (`banOf`), public/js/calc.js (`bills`, `presetBlock`), public/js/actions.js (`dispatch`, `evaluate`, `settle`, `rescope`, `endDay`), public/js/main.js (`firstIssues`), public/js/view.js (ticket cards, `dispatchPanel`), public/js/modals.js (`showSetup`, `showEnd`), public/css/style.css, tools/check.js, tools/sim.js
- Documentation: docs/DESIGN.md (rules, code map, measured numbers)
