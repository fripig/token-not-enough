## Summary

The 工程投資 panel on the main screen can be collapsed and expanded by clicking its title. Collapsed, it shows only the title line with 已做 N 項. The choice is a per-browser preference kept in `localStorage`, not part of the game state or the save.

## Motivation

The player (issue #22) said the investment panel 「有點佔位子了」. Today `invPanel()` in `public/js/view.js` always renders every row: 寫 CLAUDE.md with one button per stack, nine other investments and 採購電腦. Change `gh-22-01-domestic-conference` will add more rows (研討會 and new upgrade levels), so the panel will grow further. Most of the day the player works in the queue and dispatch panel and only opens investments occasionally.

## Proposed Solution

- The panel title stays an `<h2>` heading and its text becomes a toggle button. Clicking it collapses or expands the whole panel body (CLAUDE.md, the nine investments and 採購電腦). The title shows an arrow (▾ expanded, ▸ collapsed) and the button carries `aria-expanded`.
- Collapsed, the panel shows only the title and 已做 N 項, using the same count as today (`invCount()`). Expanded, it looks exactly as today.
- With no stored preference the panel is expanded. The last choice is stored in `localStorage` under `tokgame-invfold` and applies after a reload and in new runs, because it is a display preference, not part of a run.
- Every `localStorage` read and write is wrapped in try/catch. When storage is unavailable the panel starts expanded and the toggle still works for the current page.
- The choice is not stored in `S`, `sel` or the save (`tokgame-save`), sends no GA event and writes no action log line.

## Non-Goals

- No per-row collapsing and no automatic folding of bought investments (the player chose whole-panel collapse).
- No collapsing of other panels (queue, dispatch panel, quotas).
- No change to investment rules, costs, effects, order or the month-end summary.
- No change to `SAVE_VER` or save contents.

## Alternatives Considered

- Fold only the bought investments into a compact tag line: rejected by the player; the panel would still be long in the first days.
- Both whole-panel collapse and folding bought rows: rejected as more work for the same goal.
- Remember the choice in the save: rejected because it is a viewing preference, and the save only holds one run.

## Impact

- Affected specs: engineering-investments
- Affected code:
  - Modified: public/js/view.js, public/js/main.js, public/css/style.css, tools/check.js, docs/DESIGN.md
  - New: none
  - Removed: none
