## Context

The game started as a single claude.ai Artifact. The v1 rules were never written as specs; later Spectra changes (tech-stack-companies, trap-tickets, parallel-slots, dispatch-presets-and-investments, multi-stack-company, outsource-gigs, reasoning-effort, merge-conflict-resolve, gh-06-01-multi-team-seats, gh-08-01-more-investments) each specified only their own addition. The source of truth for the core rules today is the code in public/js/data.js, state.js, calc.js, actions.js, modals.js and view.js, with a prose summary in docs/DESIGN.md. `tools/check.js` (419 assertions passing on 2026-10-09) covers the later features but almost none of the v1 rules.

## Goals / Non-Goals

**Goals:**

- Write the v1 rules as ten specs that match the current code, with concrete numbers in scenarios.
- Make each scenario checkable: add `tools/check.js` assertions so a future rule change is caught.

**Non-Goals:**

- Changing any rule, number, or interface text. Where the code and docs/DESIGN.md disagree, the spec follows the code and the discrepancy is reported, not fixed.
- Re-specifying behavior already owned by an existing spec: slot count and merge conflicts (`parallel-slots`), team seats (`team-seats`), stack effects (`stack-agent-effects`), company choice and best-score key (`company-tech-stack`), traps (`trap-tickets`), presets (`dispatch-presets`), investments (`engineering-investments`), outsourcing (`outsource-gigs`), reasoning effort (`reasoning-effort`). New specs mention these only where a core formula has a hook for them.
- Testing the random event pool's probabilities statistically beyond the daily 55% trigger.

## Decisions

### Ten capabilities split by game concept, not by module

Specs follow what a player sees (calendar, billing, clients, tickets, outcome, review, modes, events, scoring) rather than the module layout, because module boundaries already moved once (split-game-modules) and may move again. Alternative considered: one large `core-rules` spec. Rejected because the later delta specs need narrow capabilities to modify.

### Formulas stated with their hooks to later features

Core formulas such as the token estimate and success rate include factors owned by later specs (CLAUDE.md, SDD, parallel multiplier, stack gap). The new specs name each factor and point to the owning spec instead of restating its numbers, so one rule has one home.

### Assertions grouped per capability in tools/check.js

Each capability gets its own labeled block of assertions in `tools/check.js`, using the existing `newRun`/`ticket` helpers and `ok`/`near`. Random outcomes are asserted by stubbing `Math.random` for single rolls or by sampling with a tolerance for distributions, matching how the file already checks stack distribution.

## Implementation Contract

- In scope: new spec files under this change; new assertions in `tools/check.js`; recording click handlers and `setAttribute` calls in `tools/fake-dom.js` so UI scenarios can be asserted; one paragraph in docs/DESIGN.md naming the core-rule specs.
- Out of scope: any edit to public/.
- Acceptance: `node tools/check.js` exits 0 with the new assertions included and prints a pass count higher than 419; `spectra validate gh-09-01-core-rules-specs` passes; `git diff --stat public/` is empty.
- Failure mode: if an assertion written from a spec scenario fails against current code, the spec is wrong (it must match the code); fix the spec, not the code, and note the correction in the tasks.

## Risks / Trade-offs

- [The specs freeze numbers that are still being tuned] → Later balance changes are expected to update these specs through delta specs, which is the point of having them.
- [Statistical assertions can flake] → Use Math.random stubs where a single roll decides the outcome; use sample sizes of at least 5,000 with tolerances of ±0.02–0.04 for distributions, as the existing checks do.

## Migration Plan

Not applicable: no runtime change, nothing to deploy beyond docs and tooling.

## Open Questions

(none)
