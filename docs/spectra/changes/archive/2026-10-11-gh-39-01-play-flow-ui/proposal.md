## Summary

Fix four UI/UX problems found by playing day 1 in a browser (issue #39): keep the day controls (wait, adjust subscription, end day) reachable at all times, show what just happened after a dispatch, make the modal backdrop darken the page in dark mode, and left-align option button descriptions.

## Motivation

Measured on 2026-10-11 in Chrome (desktop 1523×784 viewport, dark mode; mobile measured in a 400px-wide iframe):

- The buttons "等 1 小時", "等到下一個 agent 完成", "調整訂閱" and "下班，結束第 N 天" sit in the header of the action log section, which comes after the engineering investment panel. The expanded investment panel is 1,141px tall, so on desktop the player scrolls past it every day just to end the day. On mobile the end-day button is at 4,276px of a 5,347px page.
- After dispatching (dispatch panel button, one-click dispatch, manual work, research), the selection is cleared, so the dispatch panel collapses to the hint "先從工單佇列選一張". The page content below moves up, the viewport ends up on the investment panel, and the log line that says what happened is at the very bottom of the page. The player gets no visible feedback.
- The modal backdrop `.ov` uses `var(--ink)` at 45%. In dark mode `--ink` is a light colour, so opening any modal washes the page out to grey instead of dimming it.
- Option buttons `.sb` lay out their content with `align-items:flex-start` but inherit the browser's centred button text, so a description that wraps to a second line is centred (visible on the setup modal work-content buttons, e.g. the Rust description).

## Proposed Solution

- Move the day controls out of the action log header into a dock rendered as the last element of the game screen and stuck to the bottom of the viewport. It also shows the current day and time (parallel clock or hours left) because the header has scrolled away when the player uses it. Buttons keep their `data-act` values, disabled rules and labels.
- When no ticket is selected, the dispatch panel shows the newest action log entries under the existing hint, labelled as what just happened. Selection behaviour is unchanged: nothing is auto-selected after a dispatch, so a double click cannot send the next ticket with the same settings.
- Add a `--scrim` colour token: light theme keeps today's value, both dark-theme blocks use black at 60%; `.ov` uses the token.
- Left-align text in `.sb` buttons.

## Non-Goals

- Auto-scrolling to the dispatch panel when a ticket is tapped on mobile.
- Sticking the estimate row and dispatch button to the bottom of the dispatch panel.
- Shortening the setup modal, adding the end-of-day summary to the morning report, or changing the default billing method.
- Any change to game rules, numbers, saves or GA events.

## Alternatives Considered

- Auto-select the next queued ticket after a dispatch: keeps the panel tall, but a second click on the dispatch button would send a different ticket with the same (possibly expensive) settings. Rejected.
- Move the action log above the investment panel instead of a dock: the log still drifts off screen as the queue grows, and on mobile the queue and dispatch panel alone are taller than the viewport. Rejected.
- Collapse the investment panel by default: the user already chose "remember the last choice, expanded when unset" in `gh-22-02-invest-panel-collapse`. Not revisited.

## Impact

- Affected specs: `game-layout` (new).
- Refactor check (modules this change touches, measured 2026-10-11): `public/js/view.js` 194 lines / 19.9KB / 30 lines over 200 chars; `public/css/style.css` 248 / 16.3KB / 5; `public/js/i18n/zh-TW.js` 700 / 51.0KB / 34; `public/js/i18n/en.js` 700 / 54.9KB / 52. Conclusion: no refactor needed, the change adds a few lines to each.
- Affected code:
  - Modified: public/js/view.js, public/css/style.css, public/js/i18n/zh-TW.js, public/js/i18n/en.js, docs/DESIGN.md
  - New: tools/check/game-layout.test.js
