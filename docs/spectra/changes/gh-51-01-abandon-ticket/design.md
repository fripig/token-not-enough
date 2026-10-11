## Context

Issue #51 (see proposal). Relevant code today (read 2026-10-11 on `main` at c707285, which includes the unpushed `gh-46-02-success-curve` commits):

- Overdue handling is in `endDay()` in `public/js/actions.js`: company tickets with `due <= S.day` lose `ceil(kpi × LATE_KPI)` KPI and `LATE_TRUST` (4) trust (incidents `INC_LATE_TRUST` 8, or `MONITOR_LATE` 4 with 監控告警); research twins share one trust hit through `from`. Outsourced tickets pay `round(pay × GIG_LATE)` from the wallet into `S.st.outPenalty` and add to `S.st.outLate`, with no KPI or trust change.
- `rescope()` in `public/js/actions.js` is the closest existing ticket action: a `data-act="rescope"` button in `dispatchPanel` in `public/js/view.js`, dispatched from the click handler in `public/js/main.js`, sends a GA event through `track`, logs one line, then `render()`.
- The two-step 中止 → 確定中止？ button uses `cancelArm` / `armCancel` / `cancelBtn` in `public/js/view.js`; the click handler in `public/js/main.js` disarms it when anything else is clicked. It is not saved.
- Month-end stats live in `S.st` (created in `fresh()` in `public/js/state.js`); `loadGame()` fills fields missing from old saves (`S.st.confFee ??= 0`). The receipt rows are built in `showEnd()` in `public/js/modals.js`.
- `tools/check.js` runs every `tools/check/*.test.js`; a new spec needs its own test file.

Module size for the refactor check (DESIGN.md rule, only modules this change touches): actions 495 lines / 33.0KB (6 lines over 200 chars), view 205 / 21.1KB (32), main 61 / 3.2KB (1), modals 207 / 15.9KB (11), rules 125 / 9.4KB (8), state 133 / 8.2KB (4). Conclusion: no refactor first; the new code follows the `rescope` pattern.

## Goals / Non-Goals

**Goals:**

- The player can drop a ticket they will not finish for a smaller, known cost than letting it go overdue.
- The rule is the same in serial and parallel mode and needs no new saved ticket field.
- The simulator can measure the effect, and the default fixed-seed output stays byte-identical.

**Non-Goals:**

- Abandoning incident tickets.
- Abandoning a ticket while its agent runs (the player cancels first).
- Refunds for tokens already spent on earlier attempts.
- Any change to overdue penalties, re-scoping or complexity-6 tickets (#50).
- A smarter autoplayer than "abandon what is due today" (`SIM_ABANDON=1`).

## Decisions

### Abandon only idle non-incident tickets

`canAbandon(is)` is true when the ticket is in the queue, not `running`, and not `inc`. Merge-conflict tickets, research tickets and their split twins, revealed and hidden traps are all allowed. A hidden trap is removed without being revealed (no `trapHit`, nothing counted as found), the same as a cancelled run. Each abandoned research twin costs its own −2 (no sharing like overdue), because the player chose to drop each one. Alternative: also allow running tickets with an automatic cancel; the user chose cancel-first so each action keeps one meaning.

### Company tickets cost trust −2, outsourced tickets pay the overdue penalty

`ABANDON_TRUST = 2` in `public/js/actions.js` next to `LATE_TRUST`. Company ticket: `S.trust = max(0, S.trust − ABANDON_TRUST)`, no KPI change. Outsourced ticket: `pen = round(pay × GIG_LATE)` is taken from the wallet (it may go negative, as for an overdue gig) and added to `S.st.outPenalty`; no trust or KPI change. Both remove the ticket from `S.issues`, clear `sel.issue` when it was selected, add 1 to the new `S.st.abandoned`, and do not touch `S.st.late`, `S.st.kpiLost` or `S.st.outLate`. Alternatives (charge the full −4 but no KPI; only complexity 6) were offered and not chosen.

### Two-step button in the dispatch panel

`dispatchPanel` shows, under the existing evaluate / re-scope buttons, `找主管退單（信任 −2）` for a company ticket or `找主管退單（違約金 NT$X）` for a gig whenever `canAbandon(is)`. The first click arms it (`abandonArm = id` in `public/js/view.js`, label `確定退單？`), the second click on the same armed button calls `abandon(id)`; any other click disarms it, mirroring `cancelArm`. `abandonArm` is not saved and is reset by `render` only through the click handler, like `cancelArm`.

### Log, receipt, rules and GA

- Log: `✕ 退單 <title>（複雜度 N）｜信任 -2` for company tickets, `✕ 退單 <title>（複雜度 N・外包）｜違約金 NT$X` for gigs, class `warn`.
- Receipt: a `退單` row after `逾期工單` with `N 張`, always shown.
- Rules modal 工單與陷阱 tab: one line stating the cost for company and outsourced tickets and that incidents and running tickets cannot be abandoned, with numbers taken from `ABANDON_TRUST` and `GIG_LATE`.
- GA: `abandon` with `cx` (as shown), `stack`, `gig`, `merge`, `research`, plus the common parameters; sent only when the abandon happens. `cx` is the shown complexity so a hidden trap is not leaked.

### Save compatibility without SAVE_VER

The only new saved field is `S.st.abandoned`; `fresh()` sets 0 and `loadGame()` adds `S.st.abandoned ??= 0`. `SAVE_VER` stays.

### Simulator SIM_ABANDON

With `SIM_ABANDON=1`, right before each `endDay()` call the autoplayer abandons every company ticket that `canAbandon` allows and whose `due <= S.day`. That is never worse than letting it go overdue (−2 trust instead of −4 trust and half the KPI), so it measures the upper bound of the saving for a careless player. Without the flag no code path changes, so the default output is byte-identical.

## Implementation Contract

- **Behavior**: with a company ticket selected that is not running and not an incident, the dispatch panel shows `找主管退單（信任 −2）`; first click shows `確定退單？`, second click removes the ticket, lowers trust by 2 (not below 0), keeps KPI, logs `✕ 退單 …｜信任 -2`, sends GA `abandon`, and the receipt later shows 退單 1 張. For a gig the button reads `找主管退單（違約金 NT$X）` with X = round(pay × 0.3), and abandoning lowers the wallet by X and adds X to 外包違約金. Incidents and running tickets show no button and `abandon(id)` does nothing for them. Clicking elsewhere after the first click restores the button.
- **Interface / data shape**: exported `ABANDON_TRUST = 2`, `canAbandon(is)`, `abandon(id)` in `public/js/actions.js`; exported `abandonArm`, `armAbandon(id)` in `public/js/view.js`; `data-abandon="<id>"` on the button handled in `public/js/main.js`; `S.st.abandoned` (number). New dictionary keys in both `public/js/i18n/zh-TW.js` and `public/js/i18n/en.js` for the two button labels, the confirm label, the two log lines, the receipt row and the rules line.
- **Failure modes**: `abandon(id)` on a missing, running or incident ticket returns without any change or event. Old saves load with `S.st.abandoned = 0`.
- **Acceptance criteria**: `node tools/check.js` passes, including the new `tools/check/abandon-ticket.test.js` (company cost, trust floor at 0, gig penalty and negative wallet, incident and running refused, hidden trap not revealed, research twin each −2, receipt row, two-step arm/disarm, log lines in both languages, old save without `abandoned`) and the `abandon` event in `tools/check/play-analytics.test.js`. The default fixed-seed simulator output (`SIM_N=100 SIM_SEED=101`, and `SIM_INVEST=1`) is byte-identical before and after; `SIM_ABANDON=1` with the same seed is run and its averages recorded in `docs/DESIGN.md`.
- **Scope boundaries**: in scope are the action, button, log, receipt row, rules line, GA event, save default, `SIM_ABANDON`, checks and `docs/DESIGN.md`. Out of scope: incidents, running tickets, overdue and re-scope rules, complexity 6.

## Risks / Trade-offs

- [Abandoning becomes the default for every hard ticket] → it still costs trust and gives no KPI, so finishing stays better; `SIM_ABANDON=1` shows how much a "drop everything due today" player gains. If parallel-mode averages rise by more than 5% the result is reported to the user instead of retuning here.
- [Accidental abandon] → two-step confirmation, and the button is only in the dispatch panel after selecting the ticket.
- [Trust floor] → at trust 0 abandoning a company ticket is free; same as the floor on overdue penalties today, accepted.

## Migration Plan

No data migration. Deploys with the normal push to `main`. Note: local `main` currently carries unpushed `gh-46-02-success-curve` commits that must wait for #45, so this change is not pushed on its own from that checkout; the push follows the user's decision for #45/#49.

## Open Questions

None.
