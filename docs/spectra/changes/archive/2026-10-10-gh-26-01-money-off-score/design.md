## Context

Today `monthScore()` in public/js/modals.js computes round(KPI × 10 + trust × 4 + max(8000 − SPEND_FLOOR, 8000 − personal spend) ÷ 8 − audits × 80), where personal spend = subscription fees + personal API + outsourcing penalties − outsourcing income. Because `GIG_PAY` (80) ÷ 8 equals the KPI weight 10, an outsourced ticket is worth exactly as many points as a company ticket of the same complexity, so raising its pay would make gigs dominate. The wallet can go negative: `charge()` in public/js/actions.js deducts personal API cost unconditionally, the dispatch panel only warns 錢包可能不夠付這一筆。, and the opening/Monday subscription modal charges `planCost()` even past NT$0 (the agent-catalog spec has a scenario where Pro 500 leaves the wallet at −NT$8,250).

Issue #26 discussion (2026-10-10) decided, from options offered to the user: money leaves the score entirely; the wallet stops spending when empty; leftover money is shown but not scored; gig pay KPI × 250; starting wallet raised so Pro 500 is affordable. During apply the user reversed the last point after measurement (see Starting wallet stays NT$8,000) and added that a short wallet must never affect plans already held.

Refactor check (only modules this change touches, main at af2b04b): actions.js 364 lines / 25.6KB (10 lines over 200 chars), modals.js 194 / 16.6KB (17), view.js 152 / 16.4KB (21), rules.js 105 / 12.3KB (20), calc.js 98 / 6.4KB (1), state.js 106 / 6.2KB (2). Edits are local to existing functions; no refactor needed.

## Goals / Non-Goals

**Goals:**

- Spending personal money never lowers the score; the only limit on personal spending is the wallet balance.
- Outsourced tickets pay amounts that look like real freelance prices.
- Grade letters keep roughly the same meaning for the default auto-player after the spend term disappears.

**Non-Goals:**

- Changing the daily gig count (0–2), the 30% late penalty, or gig eligibility rules.
- Changing titles (資安部門的常客, 自費養 AI 的勇者 and so on); they still read personal spend as shown on the receipt.
- Scoring leftover money (rejected in discussion: it would re-couple money and score and keep penalising conference fees).
- A credit/overdraft mechanic with month-end debt penalty (rejected in discussion in favour of stopping when empty).
- Updating gh-22-01-domestic-conference; it is ingested after this change lands.
- Changing the company API budget or its trust penalties.

## Decisions

### Score formula without personal spend

`monthScore()` returns round(KPI × 10 + trust × 4 − audits × 80). `SCORE.spendBase`, `SCORE.spendDiv`, `SCORE.spendFloor` and `SPEND_FLOOR` are removed; `monthScore` takes no floor argument. The receipt formula line becomes 總分 = KPI × 10 + 信任 × 4 − 稽核次數 × 80, and the receipt keeps 你自己掏的錢 and adds 月底錢包餘額. Alternative considered: keep the term but exclude outsourcing income only — rejected because conference fees and self-paid tokens would still cost score.

### Re-set grade thresholds with the simulator

Removing the spend term lowers every score by that term. Measured on main at af2b04b (`SIM_N=30 SIM_SEED=101 node tools/sim.js`, sample lines): the default auto-player's personal spend is about NT$3,400–4,200, a spend term of about +475 to +575. Draft thresholds subtract 500: S 4,100 / A 3,300 / B 2,500 / C 1,700, parallel ×1.6 (6,560 / 5,280 / 4,000 / 2,720). The draft is an estimate. Result: on the old base (af2b04b) the draft kept every letter within 4.0 points; after merging main (5717748, research tickets) parallel S rose 5.4–6.2 points, so S moved to 4,300 (parallel 6,880), the trial with the most margin (every letter within 2.9 points in parallel, 2.1 in serial; 4,200 reached +4.4). The measurement task compares the default auto-player's grade mix per mode (`SIM_N=100`, `SIM_SEED=101` and `202`) before and after, and adjusts the four thresholds (multiples of 100) until each letter's share per mode is within 5 percentage points of before. The final numbers replace the draft in the month-end-scoring delta spec, `GRADES` and docs/DESIGN.md. Alternative: keep thresholds — rejected, every grade would drop about one letter.

### Wallet stops personal API spending when empty

`charge()` for 個人 API: cost c = tokens × price × price modifier; available a = max(0, wallet). If c ≤ a, deduct c as today. Otherwise deduct a, add a to the personal API total, and return short with frac = a ÷ c (0 when a is 0). `settle` already turns short into a failed attempt with scaled tokens and hours; the note for 個人 API is 錢包見底，agent 停在一半 (subscription and seat keep 撞到用量上限，agent 停在一半). The GA `job_result` outcome stays `quota` for both (no new outcome value, play-analytics outcome list unchanged). Evaluation shares `charge()`, so an evaluation on 個人 API that runs out is interrupted like a quota shortfall and not marked evaluated. Alternative: block dispatch when the upper estimate exceeds the wallet — rejected because the estimate is a range and the quota mechanic already establishes "stop halfway".

### Personal API option disabled at an empty wallet

`bills()` marks 個人 API not available with the note 錢包見底 when the wallet is NT$0 or less. The dispatch warning for an upper estimate above the wallet becomes 錢包可能不夠，跑到一半會停下來。 and still does not block. Preset blocking (錢包不夠 when the upper estimate exceeds the wallet) is unchanged. Review found that `dispatch()` and `evaluate()` did not check the option themselves, so the simulator (which sets `sel.b` after the panel redraw) dispatched personal API with an empty wallet; both now refuse an unavailable option via `billOk()`, and the simulator falls back to Anthropic subscription, company API (not for gigs), then local Gemma, skipping a ticket it cannot start in parallel mode. Measurements were redone after this fix.

### Subscription confirm blocked when the wallet cannot pay

In the opening and Monday modals, when `planCost()` exceeds the wallet, the confirm button (開始第 1 天 / 確定調整) is disabled and the sum line shows 錢包不夠付這次的訂閱. Selecting plans stays possible so the player sees the cost. 不改了 still closes the Monday modal.

### Outsourcing late penalty may go below zero

The late penalty is the only charge allowed to take the wallet below NT$0, so a late gig always costs something. A negative wallet disables 個人 API until gig income brings it above NT$0; it never affects the score.

### Outsourcing pay KPI × 250

`GIG_PAY` becomes 250. Pay is still KPI × GIG_PAY with the stack-compensated KPI (Rust/App/DevOps ×1.3, rounded as today), so a laravel complexity 2 gig pays NT$1,500 and its late penalty is NT$450.

### Starting wallet stays NT$8,000

The draft raised `START.wallet` to 20,000 so Pro 500 fits at month start. Measured during apply (`SIM_N=100`, seeds 101/202): with money unscored, `SIM_SUB=pro500` went from −4%…+12% to +15%…+32% versus the default player in parallel mode, and outsourcing went from +4%…+12% to −12%…−18%, because a NT$20,000 wallet never limits the auto-player (it spends about NT$4,000). The user chose to keep NT$8,000: Pro 200 fits at month start, Pro 500 does not and becomes a Monday upgrade funded by saved money or gigs. `tools/sim.js` exits with an error when `SIM_SUB` names a plan the starting wallet cannot pay.

### Held plans are never blocked by the wallet

The subscription confirm is blocked only when this payment is above NT$0 and exceeds the wallet (`planShort`). Keeping plans unchanged or downgrading (NT$0) always works, even with a negative wallet, and a held subscription keeps its quota whatever the wallet (user requirement during apply: 「錢不夠應該不影響已有的訂閱」).

### Simulator save-and-upgrade strategy

`SIM_UPGRADE=1`: on days 6, 11 and 16 the auto-player upgrades OpenAI to Pro 500, else Pro 200, when the prorated difference fits the wallet minus NT$1,500 kept for personal API, and then dispatches Codex Sol on that subscription while today's quota is above 300k (the `SIM_SUB` dispatch rule). `SIM_UPGRADE=2` also stops taking outsourced tickets once it holds Pro 500 (left gigs only cost money). With money unscored, gigs are worth only what their income buys; an auto-player that never spends gig income measures only their time cost (−12%…−18%), and one that keeps taking gigs after Pro 500 measures −8%…−13% versus upgrading without gigs. The outsourcing target is checked with `SIM_UPGRADE=2 SIM_OUTSOURCE=1` versus `SIM_UPGRADE=2` alone.

### Remove SIM_FLOOR from the simulator

`tools/sim.js` drops `SIM_FLOOR` and its validation, and its header comment no longer mentions the spend floor. The per-run sample line keeps `self` so measurements can still see personal spend.

## Implementation Contract

**In scope (observable behavior):**

- Month-end score = round(KPI × 10 + trust × 4 − audits × 80); grade thresholds per the final measured values; receipt shows the new formula text, 你自己掏的錢 and 月底錢包餘額; the rules modal 結算 tab shows the same formula and thresholds.
- A new run starts with wallet NT$8,000 (unchanged); OpenAI Pro 500 cannot be bought at month start.
- Subscription confirm is never blocked for a NT$0 payment, and held plans keep working with an empty or negative wallet.
- `tools/sim.js` has `SIM_UPGRADE=1|2` and rejects a `SIM_SUB` plan the starting wallet cannot pay.
- Personal API charges never take the wallet below NT$0; a short charge fails the attempt with 錢包見底，agent 停在一半 and scaled tokens/hours; 個人 API is disabled with 錢包見底 when the wallet ≤ NT$0; the dispatch warning reads 錢包可能不夠，跑到一半會停下來。.
- Opening and Monday subscription confirm is disabled with 錢包不夠付這次的訂閱 when the cost exceeds the wallet.
- Outsourced pay = KPI × 250; late penalty 30% of pay, allowed to take the wallet below NT$0.
- The rules modal 基本, 付費與稽核, 工單與陷阱 and 結算 tabs state the new starting wallet, wallet stop rule, gig pay and score formula (numbers interpolated from constants).

**Acceptance:**

- `node tools/check.js` exits 0 with assertions for every scenario in this change's delta specs (score examples, grade thresholds, wallet stop, disabled 個人 API, blocked subscription confirm, gig pay table, late penalty below zero, Pro 500 at start, `game_end` score).
- `node tools/sim.js` runs to completion; the measurement tables (default, `SIM_OUTSOURCE=1`, `SIM_SUB=pro200`, `SIM_SUB=pro500`, two seeds each) are recorded in docs/DESIGN.md.
- With `SIM_UPGRADE=2`, `SIM_OUTSOURCE=1` versus outsourcing off stays within −5% to +15% per work content in parallel mode; if not, record the result and ask the user before tuning.

**Out of scope:** company API rules, titles, gig count and penalty rate, gh-22-01 conference rules, save format (`SAVE_VER` unchanged).

## Risks / Trade-offs

- [Subscriptions and personal API become stronger once spending is free up to the wallet plus gig income] → measure with `SIM_SUB=pro200`/`pro500` and the default player; record results and raise any parallel cell above +15% versus before to the user rather than tuning silently.
- [Grade thresholds tuned on a crude auto-player whose trust usually hits 0] → keep the "within 5 points per letter" target and document it as auto-player-relative.
- [Old saves with a negative wallet from the previous rules] → they load unchanged; 個人 API is disabled until the wallet is positive. Acceptable; no migration.
- [GA `quota` outcome now mixes wallet and quota stops] → documented in DESIGN.md; split later only if analysis needs it.

## Migration Plan

Ship as one push to `main` (GitHub Pages deploys). Best scores in localStorage were computed with the old formula and stay as 先前最佳; they are not migrated. Rollback is a revert of the change's commit.

## Open Questions

(none — threshold values are settled by the measurement task's stated target)
