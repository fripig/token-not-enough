## Why

Issue #63. In parallel mode the player picks 2–6 work slots at run start, but the slot count only caps how many agents may run; every cost that matters (PR review load `1 + 0.25 × others running`, merge-conflict chance `0.1 × others running`) already reads the number of agents actually running. The user asked to drop the slot setting and keep only the effect of how many agents run at once (「是否可以關閉數量設定 只留平行數量的影響就好」).

## What Changes

- **BREAKING (gameplay)**: parallel mode no longer has a slot count. The opening modal drops the slot picker; dispatch, one-click dispatch and batch dispatch are never blocked by a full slot count (the local GPU limit of one agent and the 0.2 hour dispatch cost stay).
- The merge-conflict chance gets a cap, `CONFLICT_MAX = 0.9`, applied after the CI halving. With 5 or fewer other agents running the chance is unchanged (at most 50%), so today's play is unaffected.
- PR review load keeps its linear formula with no cap.
- Text that showed the slot count drops it: header meter and background-agent list (`背景 agent N`, `N 個在跑`), setup log line, resume modal, month-end receipt title, rules modal, the dispatch-panel parallel hint (it also mentions the conflict cap).
- GA events stop sending the `slots` parameter.
- `S.slots` is removed from new runs; an old save's `slots` field is ignored on load and `SAVE_VER` stays.
- `tools/sim.js`: `SIM_SLOTS` becomes the auto-player's own limit on agents running at once (default 3, values 2–6 as before), and `SIM_SLOTS=0` means dispatch whenever a ticket can go. Fixed-seed outputs for the existing settings stay byte-identical when no balance number changes.
- Balance target (chosen by the user): strong play with no limit (`SIM_SLOTS=0`) SHALL score no more than +5% over the same strong play with 6 agents (`SIM_SLOTS=6`) in every parallel work-content cell; if it exceeds, `REVIEW_LOAD` or the conflict coefficient is raised and the user picks the value.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `parallel-slots`: slot count selection, slot limit and slot count on the receipt are removed; running agents are unlimited; merge-conflict chance gets the 0.9 cap; receipt title reads 平行模式.
- `game-modes`: the mode-selection log line and the parallel header meter no longer show a slot count.
- `play-analytics`: common event parameters drop `slots`.
- `save-game`: the resume modal shows 平行 without a slot count; an old save's `slots` is ignored.
- `dispatch-outcome`: the dispatch panel's warning list drops the slots-full warning.
- `dispatch-presets`: one-click dispatch buttons are no longer disabled by full slots.
- `engineering-investments`: batch dispatch no longer stops on full slots.
- `rules-reference`: the 基本 tab describes unlimited agents and the conflict cap; the setup-modal round trip no longer keeps a slot count.
- `localization`: the language switch in the setup modal no longer lists slots among the kept choices.

## Impact

- Affected specs: parallel-slots, game-modes, dispatch-outcome, play-analytics, save-game, dispatch-presets, engineering-investments, rules-reference, localization
- Affected code:
  - Modified: public/js/actions.js, public/js/data.js, public/js/state.js, public/js/modals.js, public/js/view.js, public/js/rules.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/sim.js, tools/check/parallel-slots.test.js, tools/check/game-modes.test.js, tools/check/play-analytics.test.js, tools/check/save-game.test.js, tools/check/dispatch-presets.test.js, tools/check/engineering-investments.test.js, tools/check/localization.test.js, tools/check/action-log.test.js, tools/check/dispatch-outcome.test.js, docs/DESIGN.md
  - New: none
  - Removed: none
- GA: the `slots` custom dimension stops receiving values; `game_version` separates runs before and after.
- Refactor check (measured 2026-10-14): `public/js/actions.js` 533 lines (8 over 200 characters), `view.js` 241 (36), `modals.js` 210 (10), `state.js` 150, `data.js` 169, `rules.js` 128; 1,713 lines in total. Conclusion: no refactor needed; the change mostly deletes slot handling.
