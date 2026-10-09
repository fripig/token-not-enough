## Context

Engineering investments live in the `INVEST` table in `public/js/data.js` and the per-run flags in `S.inv` (created by `fresh()` in `public/js/state.js` as `{md:{},tests:false,skills:false,mcp:false,sdd:false}`). Each effect is read where its mechanic lives: `catchRate` and `est` in `public/js/calc.js`, `conflictRate`, the PR review time inside `advance`, `evalCost`, `revealRate` and `makeJob` in `public/js/actions.js`. `invCount`, `invHint` and `invPanel` hard-code the list of non-CLAUDE.md keys.

The mechanics the new items touch:

- PR review time: `advance` charges `cx × 0.2 × (review ? 0.5 : 1)` hours when an agent finishes successfully (or is store-rejected) in parallel mode. Serial mode has no PR review time.
- Audit: `auditOdds(v)` returns 0.6 for Chinese vendors, 0.35 otherwise; `auditRoll` uses it for both dispatch and evaluation; the dispatch panel warning and quick-dispatch button print it.
- Store rejection: `STORE_REJECT = 0.2` is a constant used by `settle`, `est` (the shown `pe`) and `stackHint`.
- Incident deadline: `makeIssue(inc)` sets `due = S.day` for incidents. Incidents come from the daily draw in `endDay` (12% per ticket) and the 流量暴增 event (two at once, text says 今天下班前要處理).
- Overdue penalty: `endDay` subtracts trust `i.inc ? 8 : 4` per overdue non-gig ticket.

The player chose (issue #8): split 補測試, add pre-commit／lint hook, secret scanning, fastlane and monitoring; monitoring gives incident deadline +1 day and, added mid-discussion, a smaller overdue trust penalty for incidents.

## Goals / Non-Goals

**Goals:**

- Split 補測試 into 單元測試 (catch rate) and CI 流水線 (merge conflicts) so each mode can buy what it uses.
- Add four investments, each addressing one existing pain with one clear effect.
- Keep parallel-mode investment uplift inside the existing +3%～+15% band, measured with the simulator.

**Non-Goals:**

- Investment tiers (Lv1/Lv2) or decay/maintenance costs — the player chose not to refine that way.
- Changing base (no-investment) penalties, audit odds or store rejection.
- Making the hook useful in serial mode (serial has no PR review time; the panel text says it is parallel-only).
- Making secret scanning cover company API or seats (they carry no audit risk already).
- Re-rolling deadlines of incidents already in the queue when 監控告警 is bought.

## Decisions

### Keep the `tests` key for 單元測試, add `ci`

`S.inv.tests` keeps meaning "catch rate bonus" and is renamed 單元測試 in the UI; `S.inv.ci` takes the conflict halving. This keeps `catchRate` unchanged and limits churn in `tools/check.js`. Alternative: rename `tests` to `unit` — rejected, pure churn with no save data to migrate (investments reset each run).

### New flag keys and costs

| Key | Name | Hours | Budget | Effect |
| --- | --- | --- | --- | --- |
| `tests` | 單元測試 | 4 | NT$400 | catch rate +0.10 (cap 0.95), unchanged constant `TEST_CATCH` |
| `ci` | CI 流水線 | 3 | NT$300 | merge conflict probability ×0.5 |
| `hook` | pre-commit／lint hook | 2 | NT$200 | PR review hours ×0.5 (`HOOK_PR = 0.5`), stacks with the review-level halving |
| `scan` | secret scanning／脫敏 | 3 | NT$300 | `auditOdds` ×0.5 (`SCAN_AUDIT = 0.5`): 0.30 for Chinese vendors, 0.175 otherwise |
| `fastlane` | 上架自動化（fastlane） | 3 | NT$400 | store rejection 0.1 instead of 0.2 (`FASTLANE_REJECT = 0.1`) |
| `monitor` | 監控告警 | 3 | NT$400 | incidents created after purchase due `S.day + 1` (cap 20) with incident KPI multiplier 1.2 instead of 1.6 (`MONITOR_KPI = 1.2`); overdue incident trust −4 instead of −8 (`MONITOR_LATE = 4`) |

Costs are starting estimates; 單元測試＋CI together (7h, NT$700) cost slightly more than the old 補測試 (6h, NT$600) because buying both gives the same effect plus flexibility. Final values are set by the simulator measurement in tasks.

### Store rejection becomes a function

Replace direct uses of the `STORE_REJECT` constant with `storeReject()` in `public/js/calc.js`, returning `FASTLANE_REJECT` when `S.inv.fastlane` else `STORE_REJECT`. `settle`, `est` and `stackHint` call it so the shown success rate, the hint text and the roll agree.

### Monitoring reads the flag at different times for its two effects

The deadline bonus is applied in `makeIssue` when the incident is created (so incidents already queued keep their deadline). The trust penalty is read in `endDay` at overdue time (so an incident created before purchase but overdue after purchase gets the reduced penalty). This matches what the player sees: the alert shortens nothing retroactively, but the boss is less upset once monitoring exists. The 流量暴增 event text says 明天下班前要處理 when monitoring is owned.

### List of non-CLAUDE.md keys in one place

Export `INV_KEYS = ['tests','ci','hook','scan','fastlane','monitor','skills','mcp','sdd']` from `public/js/data.js`; `invCount`, `invPanel` and `fresh()` derive from it instead of hard-coding the list. Panel order follows this array.

## Implementation Contract

**In scope:**

- `INVEST` contains `md` plus every key in `INV_KEYS`, with the names, hours, budgets and description texts above. `補測試` no longer appears anywhere in the UI.
- `fresh()` creates `S.inv` with `md:{}` and every `INV_KEYS` key false.
- `conflictRate()` = `0.1 × running jobs × (S.inv.ci ? 0.5 : 1)`; `S.inv.tests` no longer affects it.
- PR review hours in `advance` = `cx × 0.2 × (review ? 0.5 : 1) × (S.inv.hook ? 0.5 : 1)`; the log line shows the reduced hours.
- `auditOdds(v)` = base odds × (`S.inv.scan` ? 0.5 : 1); dispatch warning, quick-dispatch warning, dispatch audit roll and evaluation audit roll all use it.
- `storeReject()` returns 0.1 with fastlane and 0.2 without; the dispatch panel's success rate `pe`, the App stack hint text and the actual roll in `settle` all use it.
- `makeIssue(true)` sets `due = min(20, S.day + 1)` and uses incident KPI multiplier `MONITOR_KPI` (1.2) when `S.inv.monitor`, else `due = S.day` and 1.6; the 流量暴增 event text says 明天 instead of 今天 when monitoring is owned.
- Overdue non-gig incidents subtract 4 trust when `S.inv.monitor`, 8 otherwise; non-incident overdue stays −4; KPI loss unchanged.
- `invHint(is)` adds lines for 單元測試, CI 流水線 and hook (both parallel mode only, since serial mode has no merge conflicts or PR review), secret scanning (only when the ticket is sensitive), fastlane (only when the ticket needs store review), monitoring (only when the ticket is an incident).
- `invCount()` counts CLAUDE.md stacks plus every true `INV_KEYS` flag; month-end shows it.
- `tools/sim.js` SIM_INVEST player buys, in order and one per day start when affordable: CLAUDE.md for each selected stack, 單元測試, CI 流水線 (parallel only), hook (parallel only), 導入 SDD. A second switch `SIM_INVEST=2` additionally buys fastlane (when app is selected), monitoring and secret scanning, to measure the new items.
- `tools/check.js` asserts each effect value above and the purchase/refusal rules for at least one new item; `node tools/check.js` exits 0.
- `docs/DESIGN.md` investment table, `INVEST` references, code map export lists and the measured balance table are updated.

**Out of scope:** investment tiers, decay, base penalty changes, changes to skills/MCP/SDD/CLAUDE.md effects.

### Balance outcome (decided during apply)

Measured 2026-10-09 (`SIM_N=100`, two runs each, paired with a no-investment run of the same code). The first version of 監控告警 (deadline +1 only) pushed the buy-everything player to +18%～+33% in parallel mode; isolating items showed the deadline extension was almost the whole gain, and raising its cost to 6h／NT$800 barely moved it. The player chose to weaken the reward of a delayed incident: KPI multiplier 1.6 → 1.2 (1.0 was also tried; it did not bring Rust／App under +15% either). With 1.2, `SIM_INVEST=1` stays at +5.8%～+14.8%, and `SIM_INVEST=2` is +9.5%～+13.0% for Laravel／Rails but +21%～+27% for Rust／App. The player accepted this: the +3%～+15% target applies to the `SIM_INVEST=1` set, and the buy-everything result is recorded in `docs/DESIGN.md` as harder companies getting more from engineering investment.

**Acceptance:** `node tools/check.js` exits 0; `SIM_INVEST=1` runs (`SIM_N=100`, twice) show parallel-mode uplift for all four companies within +3%～+15% versus no investment; `SIM_INVEST=2` results are measured and recorded in `docs/DESIGN.md` (see Balance outcome).

## Risks / Trade-offs

- [Secret scanning makes personal-API abuse of sensitive tickets cheap] → odds only halve (Chinese vendors still 30%), and the audit −12 trust stays; measure with SIM_INVEST=2.
- [Monitoring stacks two effects and may be too strong for incident-heavy runs] → incidents are ~12% of tickets plus events; if SIM_INVEST=2 exceeds +15%, raise its cost before weakening the effect.
- [Splitting 補測試 makes serial-mode investing slightly better (can skip CI)] → serial mode has no target; record measured numbers.
- [Hook is useless in serial mode] → its description says 平行模式 and the dispatch hint only shows it in parallel mode.

## Migration Plan

No persisted data: `S.inv` resets each run and is never stored in localStorage. Deploy is a push to `main`; rollback is a revert.

## Open Questions

(none — costs are tuned by measurement as part of tasks)
