## Problem

On the first run's opening setup, a player who unticks Anthropic and ticks OpenAI under 公司 API 合約 and then presses 看完整規則 still sees the 付費與稽核 tab say only Anthropic and Google can be billed to the company (GitHub issue #71, split out of the #70 `/spectra-review`). The rules only catch up after the player confirms the setup, so the rules contradict the buttons the player just pressed.

## Root Cause

`rulesTab('billing')` in `public/js/rules.js` builds the 公司 API line from the confirmed `S.corpApi`. The opening setup keeps the in-progress choice in `draft.corpApi` (`showSetup` in `public/js/modals.js`) and only writes it to `S.corpApi` on confirm, and its rules button calls `showRules(back)` without passing the draft. Before #70 this line was fixed text, so the gap is new.

## Proposed Solution

- `rulesTab(id, corp)` takes an optional contract list for the 公司 API line; without it the line reads `S.corpApi` as today.
- `showRules(back, tab, corp)` passes `corp` through to `rulesTab` on every redraw (tab switches included).
- The setup modal's rules button passes `normCorp(draft.corpApi)`, so the line names exactly the vendors currently ticked, in the fixed anthropic → openai → google order, and says 這局公司沒有簽任何廠商 when none is ticked. The Monday adjustment modal hides the contract buttons and its draft is a copy of `S.corpApi`, so passing it there shows the same list as today.
- Rules opened from the header button or from the What's-new modal pass nothing and keep reading `S.corpApi`.
- No `NEWS` entry: the player chose not to add one (the gap is only visible right after changing the ticks).
- No rule, number, random draw, save field or GA change, so fixed-seed simulator output stays byte-identical.
- Refactor check (only modules this change touches): `public/js/rules.js` 156 lines / 12,434 bytes / 10 lines over 200 chars; `public/js/modals.js` 224 / 18,418 / 14. Edits are one function signature each and one call site. No refactor needed.

## Non-Goals

- Other rules text does not follow the setup draft: the rules modal reads no other setup choice (mode, work content, outsource, advanced, quota challenge) from game state today, so nothing else can disagree.
- No `NEWS` entry and no dictionary change; the existing `bill.corp` / `bill.corpNone` texts are reused.
- Confirming or cancelling the setup is unchanged; the rules modal never writes the draft back.

## Success Criteria

- With `S.corpApi` = Anthropic + Google, opening the setup, toggling to OpenAI only and pressing the rules button shows a 付費與稽核 tab whose 公司 API line names OpenAI and not Anthropic or Google; switching tabs and back keeps it.
- Unticking all three and opening the rules shows 這局公司沒有簽任何廠商.
- Closing the rules returns to the setup with the ticks kept; the header rules button afterwards still shows the confirmed list.
- `node tools/check.js` passes; `SIM_N=100 SIM_SEED=101 node tools/sim.js` output is byte-identical before and after.

## Impact

- Affected specs: corp-api-contracts
- Affected code:
  - Modified: public/js/rules.js, public/js/modals.js, tools/check/corp-api-contracts.test.js, docs/DESIGN.md
