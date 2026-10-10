## Problem

After the player switches language, ticket cards already in the queue keep the title in the old language, while tickets generated afterwards use the new one. Issue #38: a player who switched to English mid-run still saw Chinese ticket titles on the board. The dictionaries are complete (`en.js` has no Chinese and every title pool has the same length as zh-TW), so this is not a missing translation.

## Root Cause

- `makeIssue` in `public/js/state.js` picks a title string from `STACKS[stack].pool` (built from the current dictionary) and stores the finished string in the ticket's `title`. Research tickets also store the two part titles as strings in `parts`, and `splitResearch` in `public/js/actions.js` copies them into the new tickets' `title`.
- A merge conflict overwrites `title` with the finished string `t('ui.mergeTitle', {title})`.
- The board (`render` and `dispatchPanel` in `public/js/view.js`) and every log line read `is.title` directly, so nothing can re-translate it.
- The `localization` spec requires this behaviour: requirement "Already-written text keeps its language" says ticket titles are stored as finished strings and switching language does not re-translate them.

## Proposed Solution

The user decided on 2026-10-11 that ticket titles follow the current language, while action log lines keep the language they were written in.

- Each generated ticket also stores where its title came from in the title pool: technology line, pool group (`1`–`5`, `trap`, `research`, `inc`), index, and for a research split part which of the two parts. The existing `title` string is still stored as a fallback.
- One function resolves a ticket's display title: look up the stored pool position in the current language, add the conflict-resolution prefix for merge-conflict tickets, and fall back to the stored `title` when the ticket has no pool position (saves written before this change, test fixtures) or the position no longer exists in the dictionary.
- The board (ticket cards, background agent rows, dispatch panel header) and every new log line use that function, so log lines written after a switch use the new language and lines already written stay as they are.
- Picking the title consumes exactly the same random draws as today, so fixed-seed simulator output stays byte-identical.
- Save structure and `SAVE_VER` stay the same; old saves load and show their stored titles.

## Non-Goals

- Re-translating action log lines or stored morning reports already written.
- Changing title pools, their order or their sizes.
- Any change to game rules, numbers or GA events.

## Success Criteria

- zh-TW run, queue holds a ticket titled 跑馬燈文字錯字; switching to English shows `Typo in the news ticker` on its card and in the dispatch panel; switching back shows 跑馬燈文字錯字 again.
- A research ticket and both of its split parts, a revealed trap with a telltale title, an incident ticket, an outsourced ticket and a merge-conflict ticket (prefix and inner title) all show the current language after a switch.
- Log lines written before the switch are unchanged; a log line written after the switch about a ticket generated before it uses the new language title.
- A save whose tickets lack the pool position loads in either language and shows the stored titles.
- `node tools/check.js` passes; `SIM_N=100 SIM_SEED=101 node tools/sim.js` prints byte-identical output before and after the change.

## Impact

- Affected specs: `localization` (modified).
- Affected code:
  - Modified: public/js/state.js, public/js/actions.js, public/js/view.js, tools/check/localization.test.js, docs/DESIGN.md
  - New: none
  - Removed: none
