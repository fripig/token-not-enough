## Context

`public/js/game.js` keeps all game state in `S` (reset by `fresh()`) and the dispatch panel selection in `sel` (`{issue,v,m,b,rv}`). `sel` already survives between tickets within a run and is auto-corrected by `dispatchPanel()` when the selected model is banned or the billing method is unusable, but players who mix cheap models for small tickets and strong models for large ones still click vendor, model, billing and review for most tickets. Nothing in a run gets better over time: budgets, quotas and trust only shrink while ticket complexity rises with `S.day`.

The UI is a full string re-render (`render()`) with `data-*` event delegation on `app`; there is no build step. Rules are asserted by `tools/check.js` (fake DOM) and balance is measured by `tools/sim.js` (auto-player, three runs per review level per company per mode).

## Goals / Non-Goals

**Goals:**

- Reduce a typical dispatch from about five clicks to one (ticket card → preset button).
- Give the player a way to get stronger during the month by spending time and company budget early.
- Keep every investment a real trade-off: hours not spent on tickets, company budget not spent on API calls.
- Keep the balance tools working and extend them to measure investing.

**Non-Goals:**

- No automatic dispatch without a player click (batch dispatch is still one click per batch).
- No per-vendor skill ratings; investment effects depend only on the ticket's stack or complexity, never on the vendor.
- No investment refunds, upgrades or levels; each investment is bought at most once per run (CLAUDE.md once per stack).
- No change to the score formula. Grade thresholds change only under the rule in "Balance targets for investing".
- No localStorage persistence of presets; they carry across runs only within a page session, like `S.slots`.

## Decisions

### Dispatch preset data and persistence

`S.presets` is an array of three objects `{v,m,b,rv}`. `fresh()` keeps the previous run's presets when each entry still names an existing vendor, model and one of the billing ids `sub|seat|api|corp|local`; otherwise it falls back to `DEFAULT_PRESETS`:

| Preset | Vendor / model | Billing | Review |
|---|---|---|---|
| 方案 A | deepseek / chat | api | 自審 (1) |
| 方案 B | anthropic / sonnet | corp | 自審 (1) |
| 方案 C | anthropic / opus | corp | 嚴格審核 (2) |

Alternative considered: storing presets in localStorage. Rejected for now — the existing per-run carry-over pattern (`company`, `slots`) is enough and avoids another try/catch path.

### Preset fallback rule

`presetBlock(is,p)` returns a short reason string, or `''` when the preset is usable for ticket `is`. Checks in order:

1. Vendor outage today → `今日當機`
2. `cnBlock(is,v,M)` non-empty → that reason text
3. Billing not offered or not ok in `bills(v)` → that bill's note (e.g. `沒有訂閱`, `公司沒簽約`, `預算用完`); a `seat` preset for a vendor without an approved seat → `沒有公司席位`
4. `local` billing while `localBusy()` in parallel mode → `本地 GPU 忙`
5. `sub`/`seat` and `costLine(...).hi > quotaLeft(...)` → `額度不夠`
6. `api` and `costLine(...).hi > S.wallet` → `錢包不夠`

`presetFor(is)` returns the index of the first preset (A→B→C) with an empty reason plus the list of skipped `{name, reason}`, or `-1` when none is usable. Slot/hour availability is not a preset reason; it disables the button for every preset.

Alternative considered: one button per preset on each card. Rejected — three buttons per card is cluttered at 400px and the player still has to judge which one works; a single button that explains its fallback matches the pain point better.

### One-click dispatch from the ticket card

Each queue card becomes a wrapper element holding the existing ticket-select button and a second button `data-quick="<issue id>"`. Its label is `一鍵派工：方案 X` with a sub-line `<agent> / <model>・<billing label>`; when presets were skipped the sub-line also shows `A 不能用：<reason>` for the first skipped preset. When `presetFor` returns `-1` the button is disabled with text `沒有可用方案`. Clicking sets `sel` to the preset plus `sel.issue`, calls `dispatch()`, and logs `· 一鍵派工用方案 X（略過 A：<reason>）` when skipping occurred. A sensitive ticket with a personal billing preset is not skipped; the card shows the same audit-risk text as the dispatch panel warning.

### Saving presets from the dispatch panel

The dispatch panel adds a row `存成方案 A / B / C` (`data-save="0|1|2"`) that copies the current `sel.v,m,b,rv` into that slot, and a row of `載入方案 X` buttons (`data-load`) that copy the preset into `sel` without dispatching.

### Engineering investment catalogue

`S.inv = {md:{<stack>:true…}, tests:false, skills:false, mcp:false, sdd:false}`, reset by `fresh()`. Costs are player hours plus company API budget (`S.corp`, also added to `S.corpDay` and `S.st.corp`). Effects last until the end of the run.

| Investment | Hours | Company budget | Effect |
|---|---|---|---|
| 寫 CLAUDE.md（per stack, 5 stacks incl. fe） | 3 | NT$300 | that stack: agent token ×0.85, base success +0.06 |
| 補測試 | 6 | NT$600 | `catchRate` +0.10 (cap 0.95, only when review level >0); merge conflict probability ×0.5 |
| 做 skills | 3 | NT$400 | unlocks batch dispatch |
| 接 MCP 文件 | 3 | NT$400 | `revealRate` +0.2 (cap 0.95); evaluation hours ×0.5 |
| 導入 SDD | 6 | NT$500 | every agent dispatch token ×1.1; tickets with true complexity ≥3 base success +0.08; a hidden trap whose model lacks capability stops at 0.15 of true cost instead of `TRAP_STOP` 0.4 |

All effect sizes are estimates chosen to be noticeable; they are confirmed or retuned by the balance measurement task. The "+success" bonuses add to `p` before the existing clamp to [0.05, 0.97].

`invest(kind, stack)` is refused (button disabled with the reason) when already bought, when hours remaining are fewer than the cost, or when `S.corp` is below the cost. In parallel mode it advances the clock with `advance(hrs)` like `manual()`; in serial mode it subtracts `S.hours`. It is not blocked by `localBusy()`. It logs `★ 工程投資：<name>｜<h>h｜公司 NT$<n>`.

Alternative considered: charging tokens through the current dispatch selection like `evaluate()`. Rejected — couples investment cost to whatever ticket is selected and adds audit rolls to non-ticket work.

### Investment effects in the estimate and settle path

- `est()` multiplies token by the CLAUDE.md factor for `is.stack` and by the SDD factor, and adds the CLAUDE.md and SDD success bonuses. `makeJob()` already goes through `est(trueView(is))`, so SDD's complexity ≥3 bonus uses the true complexity for hidden traps.
- `makeJob()` uses `S.inv.sdd ? SDD_TRAP_STOP : TRAP_STOP` for the stop fraction; with SDD the log note reads `寫規格時就發現牽扯整個架構，先停下來`.
- `catchRate()` adds the 補測試 bonus (+0.10); `advance()` halves the `conflict` value passed to `settle()`.
- `revealRate()` adds the MCP bonus and `evalCost()` halves hours.
- The dispatch panel hint lists active investment effects for the selected ticket in one line.

### Batch dispatch unlocked by skills

With `S.inv.skills`, the queue header shows `批次派工（複雜度 ≤2）` (`data-act="batch"`). It walks non-running tickets with shown complexity ≤2 in queue order (due date, then KPI) and quick-dispatches each with `presetFor`, stopping when slots are full or remaining hours are under 0.2 (parallel) / under the estimate (serial). Tickets with no usable preset are skipped. It logs one summary line `· 批次派工：派出 N 張，略過 M 張`.

### Investment panel and end-of-month line

A panel `工程投資` sits below the queue/jobs panel, listing each investment with cost, effect text, and state (`已完成` or a buy button). CLAUDE.md shows one button per stack in `COMPANIES` plus `fe`, company stack first. `showEnd()` adds `工程投資 N 項`. The setup modal rules list gets one bullet describing presets and investments.

### Balance targets for investing

`tools/sim.js` gains `SIM_INVEST=1`: at the start of each day, before dispatching, the auto-player buys the next affordable item of CLAUDE.md for the company stack, 補測試, 導入 SDD (the three cost 15h, more than one 8h day, so they land on days 1–3) (it never evaluates or batch-dispatches, so MCP and skills are not measured). Report each mode × company mean with and without investing.

Targets (parallel mode): investing mean between +3% and +15% over not investing for every company. If above +15%, shrink effect sizes; if below +3%, enlarge them. Grade thresholds are raised only if, after tuning, the investing auto-player's S-grade share exceeds twice the non-investing share in parallel mode. Serial mode has no target; record the numbers.

## Implementation Contract

**In scope:** presets (data, persistence, fallback, card button, save/load), five investments with the costs and effects above, batch dispatch, investment panel, end summary line, setup rules bullet, `tools/check.js` assertions, `tools/sim.js` `SIM_INVEST`, measured balance numbers recorded in `docs/CLAUDE.md`.

**Out of scope:** localStorage for presets, editing preset names, per-vendor investment effects, auto-dispatch without clicks, changes to score formula.

**Acceptance:**

- `node tools/check.js` exits 0 and includes assertions for: default presets after `fresh()`; preset carry-over and invalid fallback; each `presetBlock` reason; `presetFor` order; each investment's effect on `est`, `catchRate`, conflict, `revealRate`, `evalCost`, trap stop fraction; investment refusals (already bought, hours, budget); batch dispatch only touching complexity ≤2 tickets.
- `node tools/sim.js` and `SIM_INVEST=1 node tools/sim.js` both finish and print per-company means; the comparison is recorded.
- Manual: at 400px width, in light and dark themes, a ticket card shows the one-click button without horizontal scroll; dispatching a finance-client ticket with 方案 A shows the skip reason.

## Risks / Trade-offs

- [Investments make the game easier overall] → measured via `SIM_INVEST`; thresholds adjusted by the stated rule.
- [One-click dispatch hides warnings shown only in the dispatch panel] → the card sub-line shows skip reasons and audit risk; overnight/late warnings remain only in the panel.
- [Card markup change (nested button not allowed) breaks existing `.iss` styles] → wrapper keeps the `.iss` button unchanged and adds the quick button as a sibling.
- [Sim auto-player cannot value MCP/skills] → recorded as unmeasured; tuned by play feel.

## Migration Plan

Static site; deploy by pushing to `main`. No stored data migration (presets are not in localStorage). Rollback is reverting the commit.

## Measured Balance (2026-10-09)

`SIM_N=100` (300 runs per cell), investing mean ÷ non-investing mean, parallel mode. Tuning history:

| Effects | Laravel | Rails | Rust | App |
|---|---|---|---|---|
| CLAUDE.md +0.08, tests +0.15, SDD +0.10 | +8.0% | +9.0% | +17.9% | +10.7% |
| CLAUDE.md +0.08, tests +0.15, SDD +0.08 | +7.7% | +7.0% | +15.3% | +13.4% |
| CLAUDE.md +0.06, tests +0.15, SDD +0.08 | +6.1% / +7.2% | +6.9% / +7.0% | +14.7% / +15.3% | +12.3% / +8.7% |
| CLAUDE.md +0.06, tests +0.15, SDD +0.07 | +4.8% / +6.1% | +7.7% / +6.3% | +14.1% / +15.5% | +9.1% / +8.1% |
| **final: CLAUDE.md +0.06, tests +0.10, SDD +0.08** | **+4.9% / +7.4%** | **+7.7% / +6.5%** | **+12.2% / +12.6%** | **+6.7% / +11.1%** |

Cells with two values are two separate runs; the same configuration moves by up to about 4 points between runs. Measuring one investment at a time (CLAUDE.md +0.06, tests +0.15, SDD +0.07) showed 補測試 drove Rust's gain (Rust: CLAUDE.md alone +6.7%, tests alone +13.2%, SDD alone +7.1%), because Rust tickets fail often and the catch-rate bonus rescues them; lowering SDD did not move Rust, lowering the tests bonus did.

Final serial-mode ratios (two runs): Laravel −11.6% / −13.6%, Rails −8.7% / −5.8%, Rust +0.9% / −4.7%, App −5.9% / −9.9%. Serial play is limited by hours, so the auto-player loses score by investing; serial has no target and this is recorded as-is. Parallel S-grade share rose from about 72% to about 88% (below the 2× rule), so grade thresholds are unchanged.

## Manual Check (2026-10-09)

Chrome, page loaded in 400px-wide same-origin iframes (the window itself would not shrink below the screen width), one light and one dark theme: document width 383px within a 398px viewport, so no horizontal scroll; ticket cards show the one-click button, the first skipped preset's reason and the audit-risk line in both themes; the investment panel lists CLAUDE.md per stack and marks bought items 已完成. The 工程投資 heading wrapped onto two lines at 400px; fixed by shortening the panel subtitle and setting `white-space:nowrap` on panel headings. Real click events then exercised one-click dispatch, buying 做 skills, batch dispatch and saving a preset with no console errors.

## Open Questions

(none)
