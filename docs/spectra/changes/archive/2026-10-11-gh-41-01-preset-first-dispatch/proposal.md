## Summary

Put the decision at the top of the dispatch panel (load preset, estimate, warning and action buttons first, fine-tuning below) and replace the single one-click button on each ticket card with three buttons, one per preset A, B and C (issue #41).

## Motivation

The user (2026-10-11): "把派工方案的載入跟最後決策移到上方 有機會直接套用 不用卷到最下面", "一鍵派工直接給ＡＢＣ三個選項的按鈕".

- In the dispatch panel the load-preset buttons, the estimate and the dispatch button come after the model grid (seven vendor rows), billing, review, effort and SDD rows. On a 784px-high desktop viewport the dispatch button is below the fold (measured in #39), so applying a preset and dispatching needs a scroll every time.
- The ticket card's one-click button always takes the first usable preset in A→B→C order. To use 方案 C for one ticket the player has to open the dispatch panel, load C and dispatch.

## Proposed Solution

User decisions (2026-10-11, all picked from options):

- Dispatch panel order: ticket title, load-preset buttons, estimate, hints, warning line, action buttons; then the fine-tuning sections (agent and model, billing, review, effort, SDD) and the save-preset buttons at the bottom. The load button whose preset equals the current selection is shown as selected.
- Ticket card: three one-click buttons A, B, C, each naming the preset's model and billing. A preset that cannot be used for that ticket is a disabled button showing the reason; a sensitive ticket's personal-billing preset shows the audit odds. All three are disabled when no work slot is free or fewer than 0.2 hours remain. Pressing a button dispatches with exactly that preset; no fallback, no skip log line.
- Batch dispatch (做 skills) keeps using the first usable preset in A→B→C order and keeps logging skipped presets.

## Non-Goals

- Changing preset contents, defaults, usability reasons or any dispatch rule.
- Changing batch dispatch.
- Making the estimate or buttons sticky inside the panel.

## Impact

- Affected specs: `dispatch-presets` (modified: one-click from the card, saving and loading presets), `outsource-gigs` (modified: preset fallback wording), `research-tickets` (modified: one-click premium check wording), `game-layout` (modified: adds the dispatch panel order requirement).
- Refactor check (modules this change touches, measured 2026-10-11): `public/js/view.js` 197 lines / 20.4KB / 31 lines over 200 chars; `public/js/actions.js` 486 / 32.0KB / 6; `public/js/main.js` 61 / 3.1KB / 0; `public/css/style.css` 271 / 18.1KB / 6. Conclusion: no refactor needed; `dispatchPanel()` is reordered and `quickBtn()` rewritten in place.
- Affected code:
  - Modified: public/js/view.js, public/js/actions.js, public/js/main.js, public/css/style.css, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check/dispatch-presets.test.js, tools/check/game-layout.test.js, docs/DESIGN.md
