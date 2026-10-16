## Summary

Rename the opening-modal work-content label to 熟悉的工作內容（可選 1–2 項） and add one hint line under it saying every stack sends tickets (selected 75%, frontend 15%, others 10%) and unselected stacks are unfamiliar (hand-writing ×2). Tracked in GitHub issue #68.

## Motivation

The label 工作內容（可選 1–2 項） reads as "only these one or two kinds of tickets will appear". In fact every stack sends tickets; the selection only decides which stacks get most of them, which stacks can have incidents, and which stacks the player hand-writes at normal speed. The setup rules list already says this (`ui.setup.r.stack`), but it sits far from the picker, so players miss it. The user asked to show the selection as "familiar" work content.

## Proposed Solution

- Label text: zh-TW `熟悉的工作內容（可選 1–2 項）`, en `Stacks you know (pick 1–2)`.
- New hint line directly under the label, before the buttons: zh-TW `所有技術線都會進工單：選的佔 75%、前端 15%、其他 10%。沒選的算不熟，手寫要 ×2。`, en `Every stack sends tickets: 75% to your picks, 15% frontend, 10% the rest. Stacks you did not pick are unfamiliar; hand-writing takes ×2.`
- The numbers are interpolated from named constants: new `STACK_PICK` (0.75) and `STACK_FE` (0.15) in `public/js/data.js`, used by `pickStack` in place of its literals; the remainder is `1 − STACK_PICK − STACK_FE`; the ×2 is the existing `UNFAMILIAR_HRS`. Values do not change, so the random sequence and fixed-seed simulator output stay identical.
- The hint reuses the existing `.hint` style and appears only in the opening setup (the weekly adjustment modal has no picker).
- Add a `gh-68-01` entry at the front of `NEWS` with `news.gh-68-01` in both dictionaries.

## Non-Goals

- No change to ticket distribution, the 1–2 selection limit, intake counts, or any rule.
- Program identifiers (`S.companies`, GA `companies`, best-score keys, save format) and the intro sentence 你是工程師，負責「…」 stay as they are.
- The rules modal stack section is not changed.

## Alternatives Considered

- Rename only the label without a hint line: rejected by the user; the hint carries the actual proportions.
- Rename to 你的專長（…其他技術線也會進件）: rejected by the user.

## Impact

- Affected specs: company-tech-stack
- Affected code:
  - Modified: public/js/data.js, public/js/state.js, public/js/modals.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, public/js/news.js, tools/check/company-tech-stack.test.js, docs/DESIGN.md
  - New: none
  - Removed: none
- Refactor check (modules this change touches, measured 2026-10-16): modals.js 216 lines / 16.9KB (10 lines over 200 chars), state.js 160 lines / 10.5KB (5), dictionaries 818 lines each. Conclusion: no refactor needed; text-only change follows the current render-string pattern.
