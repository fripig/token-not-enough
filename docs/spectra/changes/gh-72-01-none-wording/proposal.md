## Summary

Reword the 全端打雜 (Jack of all trades) description, its setup hint line and its `NEWS` sentence so the six main stacks, not frontend, are the subject. Tracked in GitHub issue #72, following #69.

## Motivation

The current description 什麼都接，前端以外都不熟 and hint 前端以外手寫都要 ×2 put frontend in front, so the option reads like "the frontend person who does odd jobs". The actual rule is that frontend is never unfamiliar for anyone; 全端打雜 is unfamiliar with all six main stacks. The user chose to make the six main stacks the subject.

## Proposed Solution

- `stack.none.desc`: zh-TW `什麼都接，六條主技術線都不熟。`, en `Take anything; none of the six main stacks is familiar.`
- `ui.setup.workHintNone`: zh-TW `沒有熟悉的主技術線：工單 {six}% 平分給六條線、{fe}% 是前端；六條主技術線手寫都要 ×{x}（前端人人都會，不算不熟）。`, en `No familiar main stack: {six}% of tickets are split over the six stacks, {fe}% are frontend; hand-writing any of the six main stacks takes ×{x} (everyone knows frontend, so it is not unfamiliar).` Same placeholders and constants as today.
- `news.gh-69-01` in both dictionaries: replace the 前端以外 phrasing with 六條主技術線 phrasing, same numbers. No new `NEWS` entry (wording only, the entry went live today).
- Refactor check: only the two dictionaries, one test file and docs change; no module code changes, so no refactor needed.

## Non-Goals

- No rule, number, name (全端打雜 stays), identifier or save change. Fixed-seed simulator output is unaffected because no code runs differently.

## Impact

- Affected specs: company-tech-stack
- Affected code:
  - Modified: public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check/company-tech-stack.test.js, docs/DESIGN.md
