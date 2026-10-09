## Why

The game had page-view analytics only, so there was no way to tell how far players get before they quit. Commit aa66a04 added Google Analytics game events (start, each day reached, month end) and a deploy-stamped game version, but it shipped without a spec and without check.js assertions, so a later change could drop or rename an event without anything failing.

## What Changes

- Add a `play-analytics` spec describing the events exactly as shipped in aa66a04: when `game_start`, `day_reached` and `game_end` are sent, the parameters every event carries, the no-op behavior without `gtag`, and the `GAME_VERSION` stamp written at deploy.
- Add `tools/check.js` assertions for every scenario in the spec.
- No game code changes: public/js/*.js and .github/workflows/pages.yml stay as committed in aa66a04.

## Non-Goals (optional)

- New events (for example per-dispatch or per-investment events). The user asked for play progress by day; finer events can come in a later change.
- Configuring the GA property (custom dimensions, explorations). That is done in the GA admin console, outside the repo.
- A hand-maintained semantic version number. The user chose the short commit hash stamped at deploy.

## Capabilities

### New Capabilities

- `play-analytics`: GA events that record game start, each day reached and the month-end result, with the run's settings and the deployed game version.

### Modified Capabilities

(none)

## Impact

- Affected specs: play-analytics (new)
- Affected code:
  - New: (none)
  - Modified: tools/check.js (assertions only), docs/DESIGN.md (point to the spec)
  - Removed: (none)
