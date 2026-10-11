## Context

Two month-end bugs from #44 (see proposal). Deadlines are capped at day 20 in two places: `makeIssue` in `public/js/state.js` (the base deadline for normal tickets, the hard-stack +1 day, and the 監控告警 incident deadline) and `rescope` in `public/js/actions.js`. `endDay` already treats only `due <= S.day` as overdue and removes those tickets, so removing the caps is enough for day 20: tickets due after day 20 stay in the queue, the month ends, and they are never processed. On the receipt, `monthScore()` in `public/js/modals.js` returns `self` (spend minus outsourcing income), which `showEnd` prints as 你自己掏的錢 and uses for the 自費養 AI 的勇者 title.

## Goals / Non-Goals

**Goals:**

- Tickets keep their natural deadline past day 20; only tickets due by day 20 are overdue when the month ends (company and outsourced).
- 你自己掏的錢 is spending only; a separate signed 個人淨收支 line shows income minus spending when outsourcing was on.

**Non-Goals:**

- KPI or grade rebalancing (#45).
- Other day-20 limits (hardware delivery, conference registration window).
- A receipt line listing unfinished tickets that were not yet due.

## Decisions

### Remove the day-20 cap instead of flagging capped tickets

The user chose to keep the real deadline (for example 第 22 天到期 / 剩 2 天) over keeping the cap and adding a "was capped" flag. Removing `Math.min(20, …)` needs no new ticket field, so `SAVE_VER` stays and old saves load unchanged (their capped tickets still read due 20 and behave as before). The random calls in `makeIssue` are unchanged, so the same seed produces the same tickets; only end-of-month overdue processing differs.

### Incidents created on day 20 with 監控告警 are due on day 21

Removing the cap applies to the monitoring incident deadline as well, so such an incident is never overdue. This follows the same rule (deadline after day 20 is not overdue) and keeps one rule instead of an incident exception.

### Agents still running at month end are stopped like a player cancel

Without the cap, `endDay` on day 20 no longer cancels agents whose ticket is due after day 20, and `showEnd` runs before they settle, so their tokens and money would never be charged (a player could dispatch Opus or Fable on day 20 for free) and no `job_result` would be sent. The user chose to stop them like a player cancel: `settle` with `cancel:true` and the completed fraction (`cancelFrac`, at least `CANCEL_MIN`), so the charge goes through the usual billing, the audit roll and overdraft check apply, the attempt count and trap state are untouched, and `job_result` sends `cancelled`. It runs right after the due-ticket cancellation and before the company spend limit check, so the cost counts toward that day. The log line uses its own prefix `⏹ 月底收工` (new dictionary key) so it reads differently from the player's own `⏹ 中止`. Treating them as expired (`aborted`, fail) was rejected: the note 到期還沒跑完 would be wrong and a hidden trap could be revealed and counted as hit.

### 個人淨收支 only when outsourcing was on

Without outsourcing, income is 0 and the net line would just be the negative of 你自己掏的錢, so it is hidden. The sign format reuses the end-of-day summary's money delta (`sumDelta(d, true)`: `+NT$X`, `-NT$X`, `±NT$0`).

## Implementation Contract

- **Behavior**: cards for tickets created late in the month show 剩 N 天 counted to their real deadline (possibly after day 20). Ending day 20 penalises only tickets due on or before day 20 (KPI and trust for company tickets, 30% penalty for gigs); others produce no log line and no count. The receipt shows 你自己掏的錢 = 個人訂閱月費 + 個人 API 帳單 + 外包違約金 + 研討會報名費 (never negative) and, with outsourcing on, 個人淨收支 = 外包收入 − 你自己掏的錢 in signed NT$.
- **Interface / data shape**: `monthScore()` returns `{self, net, score, grade}` where `self` excludes outsourcing income and `net = S.st.outIncome - self`. Ticket `due` values may exceed 20. New dictionary key `end.net` in `public/js/i18n/zh-TW.js` (個人淨收支) and `public/js/i18n/en.js` (Net personal balance). No `S`, save or GA changes.
- **Month-end agents**: in parallel mode, ending day 20 first cancels agents on due tickets as today, then stops every remaining agent through `settle(j,{frac:cancelFrac(j),fail:true,cancel:true,…})` with a month-end flag that switches the log line to `⏹ 月底收工 …` (new key in both dictionaries, same fields as `log.cancel`), before the `S.corpDay > CORP_DAY_LIMIT` check. Serial mode has no background agents and is unaffected.
- **Failure modes**: none new; old saves keep their stored deadlines.
- **Acceptance criteria**: `node tools/check.js` passes with updated and new assertions in `tools/check/ticket-lifecycle.test.js` (no cap; day-20 end with due 20 and due 22 tickets), `tools/check/stack-agent-effects.test.js` (app day 19 → due 22), `tools/check/trap-tickets.test.js` (re-scope due 19 → 21), `tools/check/engineering-investments.test.js` (monitoring incident day 20 → due 21; conference fee spend assertion still 2,000 → 5,000), `tools/check/outsource-gigs.test.js` (gig due 21 not penalised; receipt spend and net lines), `tools/check/month-end-scoring.test.js` (`self` excludes income; self-pay title), `tools/check/game-modes.test.js` (day-20 agent on a due-22 ticket is charged its fraction, logs `⏹ 月底收工`, counts toward the company spend limit), `tools/check/play-analytics.test.js` (that agent sends `outcome` `cancelled`). The fixed-seed simulator (`SIM_N=100 SIM_SEED=101`, plus `SIM_OUTSOURCE=1`) is run before and after and the score change recorded in `docs/DESIGN.md`.
- **Scope boundaries**: in scope are the deadline caps in `makeIssue` and `rescope`, stopping and charging agents still running when day 20 ends, receipt money lines and title input, rules text that mentions these, dictionaries, checks and `docs/DESIGN.md`. Out of scope: hardware delivery limit, conference window, score formula, grade thresholds.

## Risks / Trade-offs

- Average scores rise slightly because day-20 overdue penalties shrink (estimated, not measured; the before/after simulator run confirms the size). If parallel-mode grade shares move by more than 5 points, report it to the user instead of retuning in this change.
- A player can now leave late-month tickets unfinished for free; this is the intended fix, since those tickets could not be finished in time anyway.
