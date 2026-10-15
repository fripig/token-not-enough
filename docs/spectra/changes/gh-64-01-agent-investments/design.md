## Context

Today `invest(k, st, want)` in public/js/actions.js buys the next level on the spot: it deducts company budget, sets `S.inv[k]` (or `S.inv.md[st]`) to the new level, and in parallel mode calls `advance(hrs)`, so the player's clock jumps 1–6 hours. Every effect reads the level directly (`MD_P[lv(S.inv.md[st])]`, `S.inv.ci?CI_CONFLICT:1`, `TEST_CATCH[lv(S.inv.tests)]`, …) in calc.js, actions.js and state.js.

Parallel mode already has everything a ticket needs: queue cards, the dispatch panel (model, payment, effort, presets A／B／C), background jobs in `S.jobs` with `advance`, `cancelJob`, overnight carry-over, outage and month-end cancellation, and `charge` for payment. The user chose (issue #64 discussion, all recommended options):

- self-do and agent coexist; serial mode unchanged;
- quality from the capability gap against a per-investment complexity; redo keeps the higher quality;
- written investments only, level 2 included;
- agent investments never fail, only vary in quality;
- numeric effects scale by quality, on/off effects need quality ≥ 60%;
- agent pays tokens only, any payment method;
- pressing the investment creates a ticket in the queue (the user's own proposal), no due date, self-review／SDD／cross-review not applied, cancellable with no penalty;
- balance: with a capable model, parallel 0% to +10% over `SIM_INVEST=1`.

`tools/sim.js` and `tools/check/*.test.js` call `invest()` directly in both modes; the fixed-seed outputs depend on that behavior staying the same.

## Goals / Non-Goals

**Goals:**

- Parallel-mode investment buttons for written investments create investment tickets; the ticket is solved by hand (today's cost, quality 100%) or by an agent (tokens, quality by capability).
- One effect-value path that every effect reads, scaled by per-level quality.
- Existing fixed-seed simulator outputs (`SIM_SEED=101` default, `SIM_INVEST=1`, `SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200 SIM_SLOTS=6`) stay byte-identical when the new switch is off.

**Non-Goals:**

- Serial mode investment tickets (rejected by the user: serial balance would need re-measuring).
- Agent tickets for 交叉審核工具, 提升 agent 能力, conferences or machine purchases.
- Self-review, SDD or cross-model review improving investment quality (rejected: one more formula to tune).
- Due dates or overdue penalties on investment tickets (rejected by the user).
- A separate model picker inside the investment tab (rejected: the ticket uses the dispatch panel).
- Random variation of investment ticket tokens or hours (kept deterministic so the shown estimate is exact and no `Math.random` call is added).

## Decisions

### Investment tickets are queue issues with an `inv` field

An investment ticket is an object in `S.issues` with `inv: {k, st, L}` (`st` only for `md`, `L` the level it builds). It reuses the queue, dispatch panel, `S.jobs`, `advance`, `cancelJob`, overnight carry-over and saves. Alternative considered: a separate `S.invJobs` array with its own panel — rejected because it duplicates the job loop and the user wanted it to be a ticket.

Fields an ordinary ticket has are set to neutral values so shared code does not crash: `cx` is the investment complexity, `kpi` 0, `due` `null`, `client` the internal-project client (so `S.cnBan` still blocks Chinese cloud models for company work), `stack` the CLAUDE.md stack or `fe` for the others (display only; stack effects are not applied), no `sens`, `big`, `store`, `inc`, `out`, `trap`, `research`, `merge`. Every place that treats `due` numerically SHALL exclude investment tickets explicitly, because `null <= day` is `true` in JavaScript (end-of-day overdue list, `cancelJobs` expiry predicate, queue order, due chips).

### Self-do stays `invest()`

The hand-written path of an investment ticket calls the existing `invest(k, st, L)` and then removes the ticket; `invest()` keeps its current behavior and refusals (hours, company budget, locks) and sets that level's quality to 100%. The parallel investment-tab button calls a new `openInvTicket(k, st)` instead of `invest`. Direct `invest()` calls from the simulator and checks keep working in both modes, which keeps fixed-seed outputs identical. Alternative: make `invest()` open a ticket in parallel mode — rejected because it changes every existing parallel balance number and check.

### Quality per level, effects through one helper

`S.invQ` stores quality per owned level: `S.invQ.md[st] = [q1, q2]`, `S.invQ[k] = [q1, q2]` (index 0 is level 1). Missing entries read as 1. A table-valued effect `V` (index = level, `V[0]` = not bought) becomes

`value = V[0] + Σ_{l=1..L} (V[l] − V[l−1]) × q_l`

Single-level effects use a two-entry table (`CI_CONFLICT` → `[1, .5]`, `HOOK_PR` → `[1, .5]`, `MD_TK` → `[1, .85]`, `MCP_REVEAL` → `[0, .2]`, `MCP_EVAL_HRS` → `[1, .5]`, fastlane reject → `[STORE_REJECT, FASTLANE_REJECT]`). Scaled effects: `MD_P`, `MD_TK`, `TEST_CATCH`, `CI_CONFLICT`, `HOOK_PR`, `SCAN_AUDIT`, fastlane reject, `MCP_REVEAL`, `MCP_EVAL_HRS`, `SDD_P`, `SDD_TRAP_STOP`. `SDD_TK` (the process overhead) is not scaled. On/off effects apply a level only when its quality ≥ `INV_ON` (0.6): 做 skills batch dispatch (the batch complexity limit uses the highest level whose quality ≥ 0.6) and 監控告警 (incident deadline, KPI multiplier and late trust together). Level counting (`invCount`, `invLevel`, locks) ignores quality. Alternative: a single quality per investment — rejected because a weak Lv1 followed by a strong Lv2 would have to either upgrade Lv1 for free or downgrade Lv2.

### Quality from the capability gap

`gap = effModel(M, ef).cap − INV_CX[k][L] × CAP_SCALE`; quality is linear between the anchors in `INV_Q` = gap 0 → 1, −10 → 0.6, −20 → 0.3, −30 → 0.1, clamped to [0.1, 1]. Initial complexities (estimates to be tuned by the balance task):

| Investment | Lv1 | Lv2 |
| --- | --- | --- |
| pre-commit／lint hook | 2 | — |
| CI 流水線, secret scanning, fastlane, 接 MCP 文件 | 3 | 5 (scan) |
| 寫 CLAUDE.md, 單元測試, 監控告警, 做 skills | 4 | 5 |
| 導入 SDD | 5 | 5 |

With these, Sonnet (40) gets 100% on complexity ≤4 and 60% on 5; Opus (50) gets 100% everywhere; DeepSeek Chat (30) gets 60% on 4 and 30% on 5.

### Token and time of an agent investment

`tk = BASE[cx] × M.verb`, `hrs = cx × M.speed × localSpeed(v)` with `M = effModel(model, ef)`; no randomness, no review／SDD／stack／big-codebase multipliers, no retry discount. The estimate shown is exact. Payment goes through `charge` with any payment method `bills(v)` allows; corporate daily limit and overdraft apply; no audit roll (investment tickets are not sensitive). When the charge comes up short, the level is not applied, the ticket returns to the queue and the log says quota／wallet ran out.

### Settlement

When the job finishes, a dedicated `settleInv(j, o)` applies the level: if `L` is above the owned level, the level becomes `L` with quality q; if `L` equals the owned level (redo), `q_L = max(q_L, q)`. The ticket leaves the queue. No PR review time, no merge conflict, no reward. Cancel (player, outage, month end) charges the run fraction like other jobs and returns the ticket to the queue (month end just ends). The job counts in `S.jobs.length`, so it raises other tickets' review load and conflict chance.

### Analytics

`invest` is sent when a level is applied — on `invest()` (via `self`, quality 100, vendor／model／bill `none`) and on agent completion (via `agent`, quality as integer percent, vendor／model／bill). Opening, dispatching or cancelling an investment ticket sends nothing; `dispatch`／`job_result` are not sent for investment tickets so ticket statistics stay clean.

## Implementation Contract

**Data shapes**

- `S.invQ`: `{md: {[stack]: number[]}, [k]: number[]}`, created by `fresh()`, filled with 1 for missing entries by `loadGame`; `SAVE_VER` unchanged.
- Investment ticket in `S.issues`: `{id, inv: {k, st?, L}, cx, base, kpi: 0, due: null, client: <internal>, stack, tries: 0, title}`; `issueTitle` returns the investment name (with the stack for CLAUDE.md, and `Lv1`／`Lv2` for investments that have a level 2, matching the purchase log name) in the current language.
- Job for an investment ticket: same fields as a ticket job plus `inv`, `q` (quality), `rv: 0`, `sdd: 0`, `ok: true`, `rvv/rvm/rvb: null`.
- New constants in data.js: `INV_CX`, `INV_Q`, `INV_ON`.

**Observable behavior (parallel mode)**

- Investment tab: written investments show 開工單 with the self-do cost; pressing it adds one investment ticket, sends no event, spends nothing; while a ticket for that level is in the queue or running the button shows 已開工單 disabled. An owned level with quality < 100% shows 重做（品質 N%）.
- Queue card: investment name, chip 投資, complexity pips, estimated tokens; no KPI, due chip, client, stack effect chips.
- Dispatch panel for an investment ticket: presets, model, payment, effort (advanced), estimate showing 預計品質 N%, tokens, cost and hours; buttons 派出, 自己做（Nh・NT$X）, 取消投資 two-step; hidden: self-review, SDD, cross-review, evaluate, research, rescope.
- One-click A／B／C on the card works with the same disable reasons except review／SDD; batch dispatch skips investment tickets.
- Log: open line, dispatch line with 預計品質 instead of 成功率, completion line with quality, tokens, spend, hours; cancel line as for tickets.
- Serial mode: no investment tickets, investment tab unchanged.

**Acceptance**

- `node tools/check.js` passes, including new `tools/check/agent-investments.test.js` asserting the spec scenarios.
- Fixed-seed sim outputs listed in Goals are byte-identical before and after.
- New sim switch measured; parallel with capable models within 0% to +10% over `SIM_INVEST=1` or the result is reported to the user with the tuning knobs (`INV_CX`, `INV_Q`).

**Out of scope:** everything in Non-Goals.

## Risks / Trade-offs

- [Shared ticket code reads `due`, `kpi`, `client`, `stack` numerically or for display] → neutral field values plus explicit `inv` guards at every listed site; a check renders a queue with an investment ticket and runs end of day with one in the queue and one running.
- [Effects read in many places] → all reads go through the quality helper; a check asserts each scaled effect at quality 0.6 against the formula.
- [Cheap models + parallel could make investments nearly free] → quality anchors and complexities are tunable; the balance task measures a cheap-model variant too.
- [Investment jobs raise other tickets' review load] → intended (user-facing hint already shows running count).

## Migration Plan

No data migration: old saves lack `S.invQ` and investment tickets; `loadGame` fills quality 1. Rollback is reverting the commit; a save made with investment tickets would then load them as malformed tickets, which is acceptable for a single-slot save that is rewritten next morning.

## Open Questions

None.
