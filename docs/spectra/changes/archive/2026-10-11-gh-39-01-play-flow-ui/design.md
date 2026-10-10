## Context

The game screen is one string rebuilt by `render()` in `public/js/view.js` on every action; events are delegated from `#app` by `data-*` attributes in `public/js/main.js`. Order today: header, meters, quotas, queue + dispatch panel, investment panel (`invPanel`), action log section whose header holds the day controls. Modals live in `#ov` / `#mo` outside `#app`. All colours are CSS tokens defined in `:root` plus two dark blocks (`@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]`). Pages must work at 400px width.

## Goals / Non-Goals

**Goals:**

- Day controls reachable without scrolling, on desktop and at 400px.
- After any action that clears the selection, the dispatch panel shows what just happened.
- Modal backdrop darkens the page in both themes.
- Wrapped option button descriptions are left-aligned.

**Non-Goals:**

- Mobile auto-scroll to the dispatch panel, sticky estimate row, setup modal shortening, morning report summary, default billing method (listed in the proposal).
- Changing state, saves, GA events, log text or game rules.

## Decisions

### Dock is a sticky last child of the game screen

Render the day controls in a new element `.dock`, appended as the last child of `#app` (`.app` is a flex column), with `position:sticky; bottom:0`. Sticky-bottom on the last child keeps it pinned to the viewport bottom while any part of the game screen is visible and lets it settle after the log section at the end, so it never covers the page footer `.about`. Alternative `position:fixed` would cover the footer and needs body padding; rejected.

The dock shows, left to right: a status text (`第 N 天・<time>` where time is the parallel clock `clock(8-S.hours)` or the single-mode hours left `h1(S.hours)h`), then the buttons in today's order: wait 1h and wait for next agent (parallel only), adjust subscription (Mondays only), end day. Same `data-act`, same disabled conditions, same labels. The action log section keeps its title and loses the buttons. Styling: `var(--card)` background, full 1px `var(--line)` border with 8px radius (same as panels), small upward shadow, `z-index:5` (below `.ov` at 10), bottom padding includes `env(safe-area-inset-bottom)`. At ≤480px the status text sits on its own row and the buttons share one row with equal width, smaller padding and 12px text (labels wrap inside the button); measured during apply: the first version stacked one button per row and the dock was 196px tall in a 400px-wide frame, the compact version is 87px.

### Recent log entries in the empty dispatch panel

When no ticket is selected, `dispatchPanel()` renders the existing two-line hint and, if `S.log` is not empty, a block labelled "剛剛" / "Just now" with the newest `DP_RECENT = 3` log entries (`S.log` is newest first), each as `<p class="<cls>">msg</p>` with the same classes and colours as the log. No new state; selection is still cleared after a dispatch. Alternative: auto-select the next ticket; rejected because a double click would dispatch a different ticket with the same settings.

### `--scrim` token

Add `--scrim` to `:root` as `color-mix(in srgb, #17212B 45%, transparent)` (the light-theme `--ink` at 45%, today's value) and `rgb(0 0 0 / .6)` in both dark blocks. `.ov` uses `background:var(--scrim)`.

### Left-aligned option buttons

Add `text-align:left` to `.sb`. `.qk` and `.iss` already set it; `.mb` content is single-line and is left as is.

## Implementation Contract

- Game screen: exactly one `.dock` element, the last child of `#app`, containing the status text and the day control buttons; the action log section contains no `data-act="wait1"`, `"waitn"`, `"adjust"` or `"end"` buttons. Serial mode: no wait buttons anywhere (existing assertion in `tools/check/game-modes.test.js` keeps passing).
- Dispatch panel with no selected ticket and a non-empty log: shows the newest 3 log messages in newest-first order; with an empty log, only the hint.
- `public/css/style.css`: `--scrim` defined in `:root` and in both dark blocks, `.ov` background uses `var(--scrim)`, `.sb` has `text-align:left`, `.dock` is `position:sticky` with `bottom:0`.
- New dictionary keys exist in both `zh-TW.js` and `en.js` (status text and "Just now" label); no Chinese in `public/js/*.js` outside comments.
- Verification: `node tools/check.js` passes including the new `tools/check/game-layout.test.js`; manual browser check at desktop width and 400px that the end-day button is visible at the bottom without scrolling and that a modal darkens the page in dark mode.
- Out of scope: everything listed under Non-Goals.

## Risks / Trade-offs

- [The dock covers the bottom ~56px of content while scrolling] → it is opaque with a border so it reads as a toolbar; the last content (log) settles above it at the page end.
- [Three recent entries may include the day-start line instead of the action] → after any action the action's own lines are newest, so they are shown first.
- [Sticky does not work if an ancestor has `overflow` set] → `.app` and `body` set no overflow; verify in the browser check.
