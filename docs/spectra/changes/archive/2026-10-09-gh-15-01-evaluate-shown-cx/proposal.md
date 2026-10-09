## Problem

The GA `evaluate` event reports the ticket's complexity after a trap is revealed (the true complexity), while `manual_fix` reports the complexity the player saw before acting. The same parameter `cx` therefore means different things across events, and evaluations that find a trap cannot be grouped by the estimate the player judged from.

## Root Cause

In `evaluate()` (public/js/actions.js) the `evaluate` event is sent after `reveal(is)`, and it reads `is.cx` at send time; `reveal` replaces `cx` with the true complexity. `manual()` captures `cx` before the work starts.

## Proposed Solution

Capture the ticket's shown complexity before the evaluation runs and send that as `cx` for every `evaluate` outcome (`found`, `clear`, `quota`). Update the play-analytics spec so `evaluate` carries the complexity shown before the evaluation, and assert it in tools/check.js.

## Non-Goals (optional)

- `job_result` keeps reporting complexity after any trap reveal; it describes the work actually done.
- No new parameter for the true complexity.

## Success Criteria

- Evaluating a hidden trap with shown complexity 1 and true complexity 4 that gets revealed sends `evaluate` with `cx` 1 and `outcome` `found`; `node tools/check.js` asserts it and exits 0.

## Impact

- Affected specs: play-analytics (Other ticket action events)
- Affected code:
  - Modified: public/js/actions.js, tools/check.js
  - New: (none)
  - Removed: (none)
