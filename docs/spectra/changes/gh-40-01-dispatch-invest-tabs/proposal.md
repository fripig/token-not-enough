## Summary

Show the engineering investments as a tab next to the dispatch panel (tabs 派工台 / 工程投資 in the right column) instead of a full-width panel under the queue, and remove the investment panel collapse that the tab replaces (issue #40).

## Motivation

The investment panel is a full-width section after the queue and dispatch panel; expanded it is 1,141px tall (measured 2026-10-11 in #39), so it pushes the action log far down and dominates the page. `gh-22-02-invest-panel-collapse` added a collapse toggle, and `gh-39-01-play-flow-ui` moved the day controls into a bottom dock, but the panel still takes most of the scroll length. The user asked for the investments to live in a tab together with the dispatch panel (2026-10-11): buying investments and dispatching are both "what do I do with my hours now" decisions and belong in the same column.

## Proposed Solution

User decisions (2026-10-11, all picked from options):

- The right column becomes a tab group with two tabs: 派工台 (dispatch panel, unchanged content) and 工程投資 (the investment rows, conference row and hardware row, unchanged content). The 工程投資 tab label carries 已做 N 項.
- Clicking a ticket card while the 工程投資 tab is active switches to 派工台 with that ticket selected.
- The tab choice is not remembered: page load, a new run and every new day start on 派工台. It is not saved, not sent to GA and not logged.
- The investment panel collapse (`tokgame-invfold`, ▾/▸ toggle) is removed; the stored key is no longer read or written.

## Non-Goals

- Changing any investment, conference or hardware rule, cost or text.
- Moving the queue, background agents or action log.
- Remembering the tab across reloads.

## Alternatives Considered

- Keep the collapse inside the tab: two toggles for the same thing; rejected by the user.
- Stay on the investment tab when a ticket is clicked: the click would seem to do nothing; rejected by the user.

## Impact

- Affected specs: `game-layout` (modified: adds the tab requirement), `engineering-investments` (modified: removes requirement "Investment panel collapse").
- Refactor check (modules this change touches, measured 2026-10-11): `public/js/view.js` 203 lines / 20.6KB / 31 lines over 200 chars; `public/js/main.js` 61 / 3.0KB / 0; `public/css/style.css` 263 / 17.5KB / 6. Conclusion: no refactor needed; the change moves the investment panel inside the existing right-column panel and deletes the collapse code.
- Affected code:
  - Modified: public/js/view.js, public/js/main.js, public/js/actions.js, tools/check/localization.test.js, public/css/style.css, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check/game-layout.test.js, tools/check/engineering-investments.test.js, docs/DESIGN.md
