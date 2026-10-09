## Why

A run lasts 20 in-game days and lives only in memory, so reloading or closing the tab throws the whole month away. DESIGN.md lists "存檔與繼續" as a possible extension; issue #11 asks for it now.

## What Changes

- The game writes one save slot to `localStorage` at the start of each day: right after the opening setup is confirmed (day 1) and right after each day change in `endDay`. Mid-day actions are not saved, so a reload rewinds to that morning and the player may replay the day.
- On page load, when a usable save exists, a modal offers 繼續上一局 (showing day, companies and mode) or 開新局. Continuing restores the run at that morning; 開新局 deletes the save and opens the usual opening setup.
- The save carries a save-structure version number (not `GAME_VERSION`). A save with a different structure version, or one that fails to parse or validate, is deleted and the player sees a notice before the opening setup.
- The save is deleted when a new month starts (開新局, 再玩一個月) and when the month-end receipt opens.
- Best scores are recorded as before, including for resumed runs. Resuming sends no analytics event.

## Capabilities

### New Capabilities

- `save-game`: when the single save slot is written, what it contains, how a run is resumed on page load, and when the save is discarded.

### Modified Capabilities

(none)

## Impact

- Affected specs: new `save-game`.
- Affected code: public/js/state.js (save, load, clear functions and the structure version), public/js/main.js (page-load entry that checks the save before the opening setup), public/js/actions.js (`endDay` writes the save), public/js/modals.js (opening setup confirm writes the save, resume and notice modals, `showEnd` clears the save), tools/check.js (assertions for the spec scenarios), docs/DESIGN.md (save rules and code map).
- No new dependencies. Uses the browser's `localStorage`, wrapped in try/catch as the project already requires.
