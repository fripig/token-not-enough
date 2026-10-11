## Why

Issue #48, raised in #46 while discussing `gh-46-02-success-curve`. Since gh-46-02 the self-review catch rate follows the writer's own capability gap, so a model that cannot handle a ticket also cannot catch its own mistakes on it. Real teams fill that gap by having a stronger model review the work (for example Sonnet writes, Opus reviews); `docs/DESIGN.md` already lists 「用 Sonnet 寫再用 Opus 審的交叉審核」 as a possible extension. gh-46-02 is archived, so the catch-rate formula this builds on is now stable.

## What Changes

User decisions (2026-10-11, all picked from options in `/spectra-discuss`):

- A new engineering investment 交叉審核工具 (for example a plugin that lets Claude Code call Codex), buyable without a conference, initially 2 hours and NT$200 of company budget, tuned by simulation.
- The review levels 不審核／自審／嚴格審核 stay. Once the investment is owned and 自審 or 嚴格審核 is selected, the dispatch panel shows a 審核模型 row (default 同一個). Picking another model shows a 審核付費方式 row whose default is chosen with the same rule as the writer's default billing (`prefBill`: seat, then subscription, when quota covers the estimate).
- With another reviewer, the catch rate keeps its formula but uses the reviewer's capability gap (including stack and large-codebase adjustments). The reviewer always runs at effort 中. A weaker reviewer is allowed: cheaper, catches less.
- Tokens split in two: the writer part is the no-review estimate, charged to the writer; the review part is the writer part × 0.3 (嚴格 0.6) × reviewer token multiplier ÷ writer token multiplier, priced and billed for the reviewer. The ×1.25 fix after a caught error stays on the writer part. 同一個 keeps today's totals exactly.
- Review time becomes complexity × reviewer speed × 0.2 (嚴格 0.35), with the same retry, stack and local-PC multipliers as the writer.
- Cross-vendor and local reviewers are allowed. Client bans, outages, the no-company-resources rule for outsourced tickets, the single local GPU and idle-machine tracking apply to the reviewer. The review part counts toward the company daily limit and overdraft.
- When the review part cannot be paid (quota or wallet short) or the reviewer's vendor is down when the job settles, the job counts as not reviewed (no catch); the writer part completes normally.
- A sensitive ticket rolls the audit once for the writer and once more for the reviewer when the reviewer is billed personally.
- Presets store the reviewer and its billing; old presets read as 同一個. Without the investment a preset's reviewer falls back to 同一個; with it, an unusable reviewer disables that one-click button with a reason.
- Saves store the reviewer on the selection and on running jobs; old saves load as 同一個 without bumping `SAVE_VER`. GA `dispatch` and `job_result` add `rv_vendor`, `rv_model`, `rv_bill` (`same` for 同一個). The dispatch log line names the reviewer.
- The simulator gets `SIM_XREVIEW=1` (with `SIM_INVEST`); without it the fixed-seed output is unchanged.
- #48 goes before #47 (`gh-47-01-optional-tests-ci`); the 單元測試 catch bonus is unchanged.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `cross-model-review`: the 交叉審核工具 reviewer choice — which reviewers are offered, the reviewer's catch rate, tokens, time and billing, the restrictions that apply to the reviewer, the unpaid-review fallback, the extra audit roll, the dispatch log segment and the rules text.

### Modified Capabilities

- `engineering-investments`: adds the 交叉審核工具 investment to the purchase table and the panel order.
- `dispatch-presets`: presets store a reviewer and its billing; reviewer reasons join preset usability.
- `play-analytics`: `dispatch` and `job_result` carry `rv_vendor`, `rv_model`, `rv_bill`; `tokens` and `cost` include the review part.
- `action-log`: the dispatch decision line names the reviewer.

## Impact

- Affected specs: cross-model-review (new), engineering-investments, dispatch-presets, play-analytics, action-log
- Affected code:
  - Modified: public/js/data.js, public/js/state.js, public/js/calc.js, public/js/actions.js, public/js/view.js, public/js/main.js, public/js/rules.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/sim.js, tools/check/engineering-investments.test.js, tools/check/dispatch-presets.test.js, tools/check/play-analytics.test.js, tools/check/action-log.test.js, docs/DESIGN.md
  - New: tools/check/cross-model-review.test.js
  - Removed: none
