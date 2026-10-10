## Context

`render()` in `public/js/view.js` rebuilds the whole game screen as one string. Today `.main` is a two-column grid (queue panel | dispatch panel `dispatchPanel()`), followed by a full-width investment section `invPanel()` with a collapse toggle (`invFolded`, `toggleInvFold`, `tokgame-invfold`), the action log section and the day dock `dayDock()`. Events are delegated by `data-*` in `public/js/main.js`. Many checks (`tools/check/*.test.js`) find investment, conference and hardware buttons by searching `els.app.innerHTML` after `render()`.

## Goals / Non-Goals

**Goals:**

- One right-column panel with tabs 派工台 / 工程投資 (labels from the dictionary), dispatch active by default.
- Ticket click always lands on the dispatch tab; new page load, new run and every new day start on dispatch.
- Remove the collapse feature and its storage key.

**Non-Goals:**

- Rule, cost or text changes to investments, conferences or hardware.
- Persisting the tab choice anywhere.

## Decisions

### Both tab panels are rendered, the inactive one is `hidden`

The right column renders a tab bar and two tab panels; the inactive panel carries the `hidden` attribute (the stylesheet already forces `[hidden]{display:none!important}`). Rendering both keeps every existing check that searches the screen HTML for investment or dispatch buttons valid without switching tabs, and the cost is negligible (the investment markup is already rendered today). Alternative: render only the active panel; rejected because it would make dozens of existing assertions depend on tab state.

Markup: `<section class="panel tabbed">` → `<div class="tabs" role="tablist">` with two `<button role="tab" data-tab="dispatch|invest" aria-selected="true|false">`; the invest tab label is the investment title followed by `<small>已做 N 項</small>` (existing `ui.inv.count`). Each panel is `<div role="tabpanel" data-tabpanel="dispatch|invest">`.

### Tab state lives in `view.js`, outside the game state

`export let tab='dispatch'` and `export const setTab=id=>{tab=id;}` in `public/js/view.js`, like `cancelArm`. Resets to `'dispatch'`: in `main.js` when a ticket card (`data-iss`) is clicked and in `start()`; in `endDay()` before it renders the new day. Module load starts at `'dispatch'`, so a reload and a resumed save start there. Not in `S`, not in the save, no GA event, no log line. Switching tabs only re-renders.

### Headings move into the tab bar

The tab labels replace the `派工台` and `工程投資` `<h2>` headings: `dispatchPanel()` drops its `<h2>` and keeps the selected ticket's title as a header line; the investment tab body starts with a one-line note (new key `ui.inv.note`, "效果維持到月底，每局歸零。") replacing the old `ui.inv.lasting` + count header text; `ui.inv.lasting` is removed. Investment rows inside the narrower column use a single-column layout (description above its buttons) via a `.tabbed .inv` rule, since the column is about 620px wide on desktop.

### Remove the collapse

Delete `INV_FOLD_KEY`, `invFold`, `invFolded`, `toggleInvFold`, `resetInvFold`, the `invfold` click branch, the `.ph .fold` style and the collapse checks; remove requirement "Investment panel collapse" from `engineering-investments`. Old `tokgame-invfold` values stay in browsers unused.

## Implementation Contract

- Main screen: exactly one `[role=tablist]` with tabs `data-tab="dispatch"` and `data-tab="invest"`; exactly one tab has `aria-selected="true"`; the matching `data-tabpanel` has no `hidden` attribute and the other has it. No full-width investment section remains and no `data-act="invfold"` exists anywhere.
- Clicking `data-tab="invest"` shows the investment panel; clicking a ticket card from there selects it and shows the dispatch tab; `endDay()` and `start()` leave the dispatch tab active.
- Tab switches do not change `S`, the save string, the log or send GA events.
- `node tools/check.js` passes, including updated `game-layout` and `engineering-investments` checks; localization key parity holds.
- Manual browser check: desktop and 400px; tab switch, ticket click from the invest tab, investment buy stays on the invest tab.
- Out of scope: Non-Goals above.

## Risks / Trade-offs

- [Players may not notice investments behind a tab] → the tab label always shows 已做 N 項; the dispatch panel's investment hint line stays.
- [Buying an investment re-renders] → `tab` is module state, so the invest tab stays active after a purchase.
