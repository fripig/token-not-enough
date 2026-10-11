## Context

The main grid (`.main` in `public/css/style.css`) has two columns and collapses to one column at `max-width:860px`. In one column the queue panel (ticket cards, background agents) comes first and the tab panel (`tabPanel()` in `public/js/view.js`, `<section class="panel tabbed">`) comes after it. The click handler in `public/js/main.js` handles a ticket card (`data-iss`) by setting `sel.issue`, calling `setTab('dispatch')` and `render()`. `render()` replaces `app.innerHTML` synchronously, so the new `.tabbed` element exists right after it returns. The test fake DOM (`tools/fake-dom.js`) has no `matchMedia`, and its `app.querySelector` returns an object without `scrollIntoView`.

## Goals / Non-Goals

**Goals:**

- In the one-column layout, a ticket card click brings the tab bar of the tab panel to the top of the viewport.
- Desktop (two columns) behaviour stays exactly as it is.
- Node tools (`tools/check.js`, `tools/sim.js`) keep working without a real DOM.

**Non-Goals:**

- Scrolling after dispatch, manual work, research, evaluation, rescope, abandon, cancel, the one-click A/B/C buttons, batch dispatch, tab clicks or day changes.
- A "back to tickets" button or a sticky estimate row.
- Any change to game state, saves, GA events or the action log.

## Decisions

### Scroll only when the one-column media query matches

Use `matchMedia(NARROW_MQ).matches` with `NARROW_MQ = '(max-width:860px)'`, the same query as the CSS rule that collapses `.main`. A comment next to the constant says it must match the CSS. Alternative considered: scroll whenever the panel top is outside the viewport at any width; rejected by the user because it would also move desktop players scrolling a long queue.

### Scroll after render, targeting the tab panel section

`scrollToDispatch()` in `public/js/view.js` runs after `render()` in the `data-iss` branch and calls `app.querySelector('.tabbed')?.scrollIntoView?.({behavior, block:'start'})`. Targeting the section (not `#tp-dispatch`) keeps the tab bar visible so the player sees which tab is active. A `scroll-margin-top` on `.tabbed` (8px) leaves a small gap above the panel border. Alternative considered: scrolling inside `render()` when the selection changes; rejected because `render()` runs after every action and would need to track the previous selection.

### Reduced motion uses instant scrolling

`behavior` is `'auto'` when `matchMedia('(prefers-reduced-motion: reduce)').matches`, otherwise `'smooth'`. This follows the existing reduced-motion rule in the stylesheet that turns off transitions.

### Guard every browser API

`scrollToDispatch()` returns without doing anything when `globalThis.matchMedia` is not a function, and uses optional calls for `querySelector` and `scrollIntoView`. No error is thrown or logged in node tools.

## Implementation Contract

- Behaviour: at a viewport width of 860px or less, clicking a ticket card (including from the 工程投資 tab) selects it, activates 派工台 and scrolls the page so the tab panel's top edge is near the top of the viewport (8px gap), smoothly unless reduced motion is preferred. At widths above 860px nothing scrolls. Other buttons never trigger this scroll.
- Interface: `export const NARROW_MQ = '(max-width:860px)'` and `export function scrollToDispatch()` in `public/js/view.js`; the ticket-card branch of the click handler in `public/js/main.js` calls `scrollToDispatch()` after `render()`. `.tabbed{scroll-margin-top:8px}` in `public/css/style.css`.
- Failure modes: without `matchMedia`, without the `.tabbed` element or without `scrollIntoView`, the function silently does nothing.
- Acceptance: a new section in `tools/check/game-layout.test.js` stubs `globalThis.matchMedia` and `els.app.querySelector` and asserts: narrow + card click → one `scrollIntoView` call on `.tabbed` with `{behavior:'smooth', block:'start'}`; narrow + reduced motion → `behavior:'auto'`; wide → no call; narrow + one-click quick button or tab click → no call; no `matchMedia` → card click still selects the ticket and throws nothing; `NARROW_MQ`'s width appears in the `.main` media rule of `public/css/style.css`. `node tools/check.js` passes in full. Manual check in a 400px-wide browser and at desktop width.
- Scope: in scope are the function, the click-branch call, the CSS margin, the test section and `docs/DESIGN.md`. Out of scope: everything in Non-Goals.

## Risks / Trade-offs

- [Breakpoint drift] If the CSS breakpoint changes and `NARROW_MQ` does not, the scroll happens in the wrong layouts → the test asserts the CSS contains the same query.
- [Chained dispatches] After dispatching the player stays at the dispatch panel and scrolls up by hand to pick the next ticket → accepted by the user; a back button can be added later.
