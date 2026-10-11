## Context

Self-review today (`REVIEW`, `catchRate`, `est` in `public/js/calc.js`; `makeJob`, `settle` in `public/js/actions.js`) always uses the writing model. Review is a multiplier on the whole job: tokens ×1.3／×1.6 and hours ×1.2／×1.35, all charged to the writer's billing at the writer's price, and the catch rate is `0.2 + 0.1 × gap ÷ 10` (+0.2 strict, + tests bonus, 0–0.95) with the writer's gap. Whether a failure is caught is rolled in `makeJob`; `settle` turns a caught failure into a success with tokens ×1.25.

This change lets a different model do the review. All decisions below were made by the user in `/spectra-discuss` on 2026-10-11 (recorded on issue #48).

Refactor check (2026-10-11, the modules this change touches): `actions.js` 508 lines／33.9KB (6 lines over 200 chars), `view.js` 217／22.2KB (33), `data.js` 166／16.5KB (10), `calc.js` 118／7.8KB (2). Conclusion: no refactor first; the largest module is far from the ~1,000-line signal and the reviewer logic sits next to `est`／`makeJob`／`settle`.

## Goals / Non-Goals

**Goals:**

- A reviewer different from the writer, unlocked by a new investment, with its own catch rate, tokens, price, billing and time.
- 同一個 (and every run without the investment) behaves exactly as today, so fixed-seed simulator output without `SIM_XREVIEW` is unchanged.
- Presets, saves, GA and the action log carry the reviewer.

**Non-Goals:**

- Changing the 單元測試 catch bonus or making tests／CI optional; that is #47 (`gh-47-01-optional-tests-ci`), done after this change.
- A reasoning-effort choice for the reviewer (the reviewer is always effort 中).
- Restricting the reviewer list to stronger models (weaker reviewers are a legitimate cheap option).
- Reviewing architecture evaluation, research or hand-written work; only agent dispatches are reviewed.
- Requiring a conference for the investment.
- Re-tuning grade thresholds; balance is measured and reported, thresholds stay.

## Decisions

### Reviewer is a separate row under the review level

The three review levels stay; a 審核模型 row appears below them when the investment is owned and the level is 自審 or 嚴格審核, default 同一個. Alternatives: a fourth level 交叉審核 (loses the self／strict depth choice), or a fixed "strongest model of the same vendor" (no cross-vendor, no local) — both rejected by the user.

### Catch rate uses only the reviewer's gap

Same formula as `catchRate`, with gap = reviewer capability (effort 中) − complexity × 10 + `stackGap(is, R)` + `bigGap(is, R)`; strict and tests bonuses unchanged. Alternatives: max(writer gap, reviewer gap) (makes the cheapest reviewer free of downside), or stronger-only reviewers (removes the cheap option) — rejected.

### Token and time split

Writer part = the estimate with review level 不審核. Review tokens = writer tokens × (`REVIEW[rv].tk` − 1) × R.verb ÷ M.verb, where M is the writer after effort and R the reviewer at effort 中; priced at R.price × the reviewer vendor's price modifier and billed to the reviewer billing. Review hours = complexity × R.speed × `localSpeed(reviewer vendor)` × retry factor × `stackHrs` × (`REVIEW[rv].hrs` − 1). The caught-error fix (×1.25) multiplies only the writer part. With 同一個 nothing changes: the existing single-multiplier path is used.

### Reviewer billing: own row, default via `prefBill`

A 審核付費方式 row lists `bills(reviewerVendor, ticket)` (local reviewer: only 本地 GPU). When the reviewer changes, the billing is set to a seat or subscription with enough quota for the review part (same rule as `prefBill`, shared helper `quotaBill`), else 公司 API, else 個人 API, else the first usable billing; a reviewer vendor with no usable billing reverts to 同一個. The panel and `reviewerBlock` share one model-level check (`rvModelBlock`). Alternatives: same billing kind as the writer (many combinations impossible), or fully automatic (player cannot route to company API or avoid audits) — rejected.

### Unpaid or unavailable review means "not reviewed", not a failed job

At settle, the review counts as performed only when the reviewer's vendor is not down today and the review charge is not short. Otherwise a rolled catch is discarded (the failure stays a failure, logged with 審核沒做完，沒抓到錯誤) and the writer part settles as usual. This differs on purpose from the writer's quota rule (agent stops halfway): the review is an add-on. Alternative considered: cancel the whole job like today — rejected in discussion.

### Second audit roll for a personally billed reviewer

`auditRoll(ticket, reviewerBilling, reviewerVendor)` runs after the writer's roll when a cross reviewer was charged anything. Two vendors seeing sensitive code is two exposures. Alternative: one roll at the higher odds — rejected.

### Local GPU and machine usage

A job whose reviewer billing is local occupies the local GPU like a local writer (`localBusy` checks both), and dispatching it marks the reviewer model's machines as used (`useHw`), including the overnight carry-over marking. When the writer is local the reviewer can only be 同一個 (one GPU, one job).

### Effective reviewer

One helper resolves the effective reviewer for a selection or preset: none (behave as 同一個) when the investment is not owned, the level is 不審核, or the stored reviewer is null. Estimates, dispatch, presets, GA and the log all go through it, so a preset saved with a reviewer silently degrades to 同一個 without the investment, like SDD levels do.

## Implementation Contract

**Data shape:**

- `INVEST.xreview` = `{name: 交叉審核工具, hrs: 2, cost: 200}`, inserted in `INV_KEYS` after `sdd` and before `ai`; `S.inv.xreview` level 0／1. Old saves without the key load as 0.
- Selection `sel` gains `rvv` (reviewer vendor or `null` for 同一個), `rvm` (model id), `rvb` (billing id). `fresh()` keeps them across runs like `rv`; a save without them loads as `null`.
- A job gains `rvv`, `rvm`, `rvb` and `rtk` (review tokens, already multiplied by the job's random token factor); a saved job without them loads as no cross reviewer.
- A preset gains `rvv`, `rvm`, `rvb`; `validPreset` accepts a missing or `null` reviewer and rejects a reviewer naming an unknown vendor／model or a billing not in `BILL_LABEL`. `presetsOf` fills missing as `null`. Defaults A／B／C have no reviewer.

**Behavior:**

- Dispatch panel: with the investment owned and level ≥1, row 審核模型 shows 同一個 plus every model of every vendor except the writer's own model, each with capability bar, price and the catch rate it would give; disabled with reason for outage, client ban, missing machine, local while the writer is local, or local while the GPU is busy. A disabled current reviewer switches to 同一個. Row 審核付費方式 appears when a reviewer is set. The estimate block shows the writer cost line plus a second line 審核 <cost>; tokens show writer + review; hours and success rate include the reviewer.
- Warnings consider the reviewer: reviewer vendor down, sensitive with personal reviewer billing (audit odds), reviewer quota short, reviewer wallet short — each after the writer's own warning of the same kind.
- Preset usability: after the writer's reasons, an effective reviewer adds the same checks in the same order, with reasons prefixed 審核：(for example 審核：額度不夠). When writer and reviewer share vendor and quota billing, the quota check uses the sum of both high estimates.
- Settle order (changed after `/spectra-review`, user's choice): writer charge without the fix, reviewer charge × the same completion fraction (decides whether the review counts), then — only for a caught failure whose review counts — the fix (25% of the writer part) charged to the writer's billing; a short fix charge leaves the failure in place with the writer's short note. Then conflict and store rolls, audit roll for the writer, audit roll for the reviewer, overdraft check. Charging the reviewer first let an add-on review starve a writer sharing the same quota or wallet. The 同一個 path keeps its original single charge.
- Logs: dispatch line review segment `自審・Opus 審（公司 API）`; result line success segment the same; a discarded catch writes the note 審核沒做完，沒抓到錯誤.
- GA: `dispatch` and `job_result` add `rv_vendor`, `rv_model`, `rv_bill`, each `same` without a cross reviewer; `job_result` `tokens` and `cost` include the review part.
- Rules modal: the review section gains a paragraph on 交叉審核工具 with numbers interpolated from constants.
- Simulator: `SIM_XREVIEW=1` (requires `SIM_INVEST`) buys 交叉審核工具 after the other `SIM_INVEST` purchases, and for any dispatch whose writer's capability gap on the shown complexity is −10 or lower sets reviewer Claude Opus (changed from "writer below Opus" after the first measurement: reviewing every ticket measured −3%～−11%, user chose to measure the targeted strategy) with billing `prefBill` → else `corp` (non-gig) → else `api`.

**Acceptance:**

- `node tools/check.js` passes, including new `tools/check/cross-model-review.test.js`.
- Without `SIM_XREVIEW`, `SIM_N=100 SIM_SEED=101 node tools/sim.js` and the same with `SIM_INVEST=1` print output identical to before the change.
- `SIM_XREVIEW=1 SIM_INVEST=1`, seeds 101 and 202, parallel mode: measured against `SIM_INVEST=1` and recorded in `docs/DESIGN.md`. The original target was +3%～+15%. Outcome (2026-10-11): reviewing every ticket whose writer is below Opus measured −2.8%～−10.7%; the user chose to measure a targeted strategy (writer gap ≤ −10), which measured −5.7%～+1.3%; the user accepted the missed target and kept the values. After the `/spectra-review` fixes (writer-first settle order, reviewer default billing, simulator using `rvPrefBill`) it measured −3.9%～+1.6%. The planned investment-cost tuning round was not run because the one-off 2h／NT$200 is far below the measured loss (about −480 points per run), so it could not move the result.

**In scope:** investment, panel rows, estimates, dispatch／settle, presets, save defaults, GA, log, rules modal, i18n (zh-TW and en), simulator flag, checks, DESIGN.md.

**Out of scope:** #47 changes, reviewer effort, reviewing evaluation／research／manual work, grade thresholds.

## Risks / Trade-offs

- [Panel grows two more rows] → rows only render when the investment is owned and a review level is chosen; tested at 400px width.
- [Breaking fixed-seed output] → the cross path adds random calls only for the reviewer audit roll, which runs only with a cross reviewer; 同一個 uses the untouched code path. Verified by the byte-identical simulator runs.
- [Strong reviewer becomes a no-cost best answer] → review tokens are priced at the reviewer's price (Opus/Fable are expensive) and its time uses reviewer speed; measured with `SIM_XREVIEW`.
- [Saved jobs from before the change] → missing reviewer fields mean no cross reviewer; `SAVE_VER` unchanged.

## Migration Plan

Ships with a normal push to `main` (GitHub Pages). Existing saves and presets load with no reviewer. Rollback is a revert; saves written with reviewer fields remain loadable by the old code because extra fields are ignored.

## Open Questions

None. The investment's 2h／NT$200 is an initial value to be confirmed by the simulator measurement.
