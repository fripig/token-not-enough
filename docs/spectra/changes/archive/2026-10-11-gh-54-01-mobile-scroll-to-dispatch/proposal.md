## Summary

In the one-column layout (screen width 860px or less), clicking a ticket card scrolls the page smoothly to the top of the dispatch / investment tab panel, so the player does not have to scroll past the whole queue to reach the dispatch controls (issue #54).

## Motivation

Below 860px the main grid becomes one column (`.main` media query in `public/css/style.css`): the ticket queue and the background agent list come first and the tab panel with the dispatch controls comes after them. Clicking a card (`data-iss` branch in `public/js/main.js`) only selects the ticket, switches to the dispatch tab and re-renders; the page stays where it is, so on a phone the player scrolls down past every card after each pick. `gh-39-01-play-flow-ui` (#39) listed "手機點工單自動捲到派工台" as not done. The user raised putting the preset buttons in the bottom dock instead (2026-10-11); the discussion concluded the real pain is this scroll distance, and the user picked this change.

## Proposed Solution

User decisions (2026-10-11, picked from options in `/spectra-discuss`):

- Only in the one-column layout (the same 860px breakpoint as the CSS); the two-column desktop layout does not scroll.
- Clicking a ticket card scrolls to the top of the tab panel (the tab bar), where the preset buttons, estimate and dispatch button now sit (#41). Clicking a card while the 工程投資 tab is active does the same, since it already switches to 派工台.
- The one-click A/B/C buttons under a card do not scroll; they dispatch directly.
- After dispatching, manual work or any other action the page does not scroll back to the queue; the player stays on the dispatch panel and sees the "剛剛" entries.
- Smooth scrolling, instant when the browser prefers reduced motion.
- No game state, save, GA event or log line is involved.

## Non-Goals

- Scrolling back to the queue after an action, or a "back to tickets" button (rejected by the user; revisit if needed).
- Putting the preset buttons in the bottom dock (rejected in discussion: duplicates the card's A/B/C buttons and makes the 87–102px dock taller on phones).
- Making the dispatch estimate row sticky.

## Alternatives Considered

- Scroll whenever the tab panel top is outside the viewport, at any width: also moves desktop users who scrolled down a long queue; the user chose the one-column-only rule.
- Scroll back to the queue after dispatch: smoother for chains of dispatches but hides the "剛剛" result; rejected by the user.

## Impact

- Affected specs: `game-layout` (modified: adds requirement "Ticket click scrolls to the dispatch panel on narrow screens").
- Refactor check (modules this change touches, measured 2026-10-11): `public/js/view.js` 210 lines / 21.7KB / 33 lines over 200 chars; `public/js/main.js` 63 / 3.5KB / 1; `public/css/style.css` 287 / 19.6KB / 6. Conclusion: no refactor needed; the change adds one small function and one click-branch call.
- Affected code:
  - Modified: public/js/view.js, public/js/main.js, public/css/style.css, tools/check/game-layout.test.js, docs/DESIGN.md
