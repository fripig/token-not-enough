## Why

The GA events from gh-10-01-play-analytics only tell how far players get and with which run settings. The user wants to know which subscriptions players buy and what they choose while solving tickets (which vendor, model and billing, whether they write it themselves, evaluate, invest), and how those choices turn out. Today none of that reaches GA.

## What Changes

- New `subscription` event: one per subscribed vendor when the opening setup is confirmed (one `vendor` `none` event when nothing is subscribed), and one per vendor whose plan changed when the weekly 調整訂閱 modal is confirmed.
- New `dispatch` event each time an agent is sent on a ticket (panel, 一鍵派工 or 批次派工), carrying vendor, model, billing, review level, reasoning effort, how it was dispatched and the ticket's traits.
- New `job_result` event each time a dispatched agent is settled, carrying the same choice parameters plus the outcome, tokens, money spent and hours.
- New `manual_fix`, `evaluate`, `rescope` and `invest` events for the other ticket-solving actions, each with its outcome or item.
- All new events carry the existing common parameters. The opening confirm now sends `subscription` events between `game_start` and `day_reached`; the weekly modal sends `subscription` events only when a plan changed.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `play-analytics`: adds subscription and ticket-action events; the opening confirm and the weekly 調整訂閱 modal now send `subscription` events.

## Impact

- Affected specs: play-analytics
- Affected code:
  - New: (none)
  - Modified: public/js/modals.js (subscription events on confirm), public/js/actions.js (dispatch, job_result, manual_fix, evaluate, rescope, invest events; job records model id and effort), tools/check.js (assertions), docs/DESIGN.md (event list and GA custom dimensions)
  - Removed: (none)
- GA property: the new parameters must be registered as event-scoped custom dimensions (and `tokens`, `cost`, `hours` as custom metrics) in the GA admin console to be visible in reports; that is done outside the repo.
