## Problem

A player lost 12 trust on day 11 and again on day 15 and could not tell why from the action log (GitHub issue #73). The only line was `! 資安稽核：機敏程式碼送進個人帳號被抓到，主管信任 -12`, which names neither the ticket nor the agent and billing that triggered it. On day 15 the trigger was an agent research of a sensitive ticket, and the research line (`✂ …｜研究｜…`) does not mark the ticket as sensitive at all, so nothing in the log connects the research to the audit.

## Root Cause

`auditRoll` in `public/js/actions.js` is called from three places (attempt settlement in `settle`, including the extra reviewer roll; `evaluate`; agent `research`), but it logs `log.audit` / `log.auditCn` with only the trust amount. The dispatch line lists 機敏 among its tags, while the evaluation lines (`log.evalFound`, `log.evalClear`, `log.evalShort`) and research lines (`log.split`, `log.researchShort`) print only the ticket title.

## Proposed Solution

- The audit line names the ticket and who was billed: `! 資安稽核：<title>｜<agent> / <model>・<billing>｜機敏程式碼送進個人帳號被抓到，主管信任 -12` (Chinese cloud variant keeps its own wording). For the cross-model reviewer roll the `<agent> / <model>・<billing>` segment is the reviewer's, prefixed with 審核. The model name is the one the attempt used: dispatch with effort (`Sonnet・高強度`), evaluation and research without effort (they ignore effort).
- Evaluation and research log lines append the sensitive tag to the ticket title when the ticket is sensitive: `<title>（機敏）`, in every such line (completed, found, short).
- New dictionary keys in both `zh-TW` and `en`; one `NEWS` entry `gh-73-01` with a sentence in both dictionaries.
- No rule, number, random draw, save field or GA change. `auditRoll` gains a model argument only for the log text, so fixed-seed simulator output stays byte-identical.
- Refactor check (only modules this change touches): `public/js/actions.js` 640 lines; edits are a few call sites and one function. No refactor needed.

## Non-Goals

- No audit-odds hint on batch dispatch or the research buttons (the player chose log-only scope; the dispatch panel already warns).
- No retranslation of existing log lines in old saves; lines written before this change keep their old text.
- No change to audit odds, trust loss or which billings are audited.

## Success Criteria

- After a sensitive ticket billed to 個人訂閱 is audited on settlement, the newest warn line contains the ticket title, `Claude Code / Opus・個人訂閱` and 主管信任 -12.
- After an agent research of a sensitive ticket on 個人 API is audited, the audit line names the ticket and the research line contains `<title>（機敏）`.
- A reviewer audit line contains 審核 and the reviewer's model and billing.
- `node tools/check.js` passes; `SIM_N=100 SIM_SEED=101 node tools/sim.js` output is byte-identical before and after.

## Impact

- Affected specs: billing-methods, action-log, research-tickets, cross-model-review
- Affected code:
  - Modified: public/js/actions.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, public/js/news.js, tools/check/billing-methods.test.js, tools/check/action-log.test.js, tools/check/research-tickets.test.js, tools/check/cross-model-review.test.js, docs/DESIGN.md
