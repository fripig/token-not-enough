## 1. Trap data and generation

- [x] 1.1 Trap generation on small tickets and Telltale titles (Trap ticket generation, Telltale trap titles): add `TRAP_RATE = 0.15`, give every `STACKS` entry (including `fe`) a `pool.trap` list of at least 4 telltale Traditional Chinese titles, and make `makeIssue` mark non-incident complexity 1–2 tickets as traps with `trueCx` 4 (0.6) or 5, `trueBase`, `revealed`, `evaluated`, `rescoped` flags, taking a telltale title with probability 0.5. Verify: tools/check.js generates 20,000 tickets and asserts the trap share 0.15 ± 0.02 among shown complexity 1–2, zero traps at complexity ≥3 and among incidents, trueCx 4 share 0.6 ± 0.05, telltale-title share 0.5 ± 0.05, and every stack's `pool.trap` length ≥ 4.

## 2. Trap behaviour

- [x] 2.1 Split billing out of `settle` into a `charge(b, v, M, tk)` helper returning `{spend, short}`, with no behaviour change for existing tickets. Verify: all existing tools/check.js assertions still pass and a new assertion charges 40k Sonnet tokens to personal API and checks the wallet drops by 40 × 0.45 × priceMod. [after: 1.1]
- [x] 2.2 Working on an unrevealed trap: `makeJob` rolls unrevealed traps against the true view; capability ≥ trueCx uses true tokens/hours/success and reveals on settle with 原來牽扯到架構，硬做完了 on success; weaker models spend 0.4 × true tokens and hours, fail with 做到一半發現牽扯整個架構，先停下來, reveal and increment tries even with self-review; `manual` on an unrevealed trap spends the shown hand-writing hours, reveals with 手寫到一半發現要動架構 and keeps the ticket queued. Revealed trap display: reveal sets `shownCx`, `cx = trueCx`, `base = trueBase`, keeps KPI and due. Verify: tools/check.js asserts the three spec scenarios (DeepSeek Chat stop, Sonnet push-through with true-complexity tokens, 2.2h hand-writing reveal) and that KPI and due are unchanged after reveal. [after: 2.1]
- [x] 2.3 Architecture evaluation before committing (Architecture evaluation): add the evaluate action charging `40k × M.verb` tokens through `charge`, spending `0.5h × M.speed` player time (clock advance in parallel mode), revealing traps with probability `min(0.95, 0.35 + 0.15 × cap)`, setting `evaluated` on completion, and stopping without reveal on quota shortfall with 額度不夠，評估沒做完. Verify: tools/check.js asserts the Sonnet/personal API cost example (40k tokens, 0.4h), the reveal-probability table via a stubbed `Math.random`, the missed-trap case leaving `revealed` false and `evaluated` true, and the quota-shortfall case leaving `evaluated` false. [after: 2.1]
- [x] 2.4 Manager re-scoping: add the re-scope action for revealed, not-yet-rescoped traps (trust ≥ 50: −5 trust, KPI to `KPI[trueCx]` × hard-stack multiplier, due +2 capped at 20; else −3 trust only), logging 主管同意重新評估 or 主管：不是說很簡單嗎？, and setting `rescoped`. Verify: tools/check.js asserts all three rows of the re-scope example table. [after: 2.2]

## 3. Player-facing UI

- [x] 3.1 Revealed trap display and dispatch actions: ticket cards show 牽一髮動全身・原估 N on revealed traps and 已評估 on evaluated tickets (unrevealed traps look like normal tickets); the dispatch panel shows 先讓 agent 評估架構 with its token and time cost on eligible tickets (disabled under the same outage, China-ban and hours rules as dispatch) and 找主管重新評估 on eligible revealed traps; chip styles use existing CSS tokens. Verify: tools/check.js renders cards and the dispatch panel for an unrevealed trap, a revealed trap, and an evaluated ticket and asserts the chips and buttons; manual browser check at desktop and 400px width in light and dark theme with no overflow and no console errors. [after: 2.3, 2.4]
- [x] 3.2 Receipt counts (Trap counts on the receipt): `S.st.trapHit` and `S.st.trapFound` are counted on reveals and the receipt shows 踩到陷阱 N 次 and 事先識破 M 次. Verify: tools/check.js sets the counters to 1 and 2, renders `showEnd`, and asserts both lines. [after: 2.2, 2.3]

## 4. Balance, docs and release

- [x] 4.1 Simulator measures trap cost: tools/sim.js accepts `SIM_TRAP=0` to replace `TRAP_RATE` with 0 before eval. Verify: run `node tools/sim.js` and `SIM_TRAP=0 node tools/sim.js` with the same `SIM_N`; both exit 0 and the per-mode × company ratios are printed for comparison. [after: 2.2]
- [x] 4.2 Update docs/CLAUDE.md (trap rules and constants, evaluation, re-scoping, receipt counts, code map entries for `charge` and the trap helpers, measured sim numbers from 4.1) and README.md (trap tickets in 玩法重點). Verify: content review against the constants in public/js/game.js. [after: 3.1, 3.2, 4.1, 5.1]
- [x] 4.3 Run `node tools/check.js` and `node tools/sim.js`, do a browser playthrough of one month per mode that evaluates, steps on and re-scopes at least one trap, then commit; pushing to main is confirmed with the user first. Verify: both commands exit 0 and their output is reported. [after: 4.2, 5.1]

## 5. Trap rate adjustment (from measured sim results)

Change note: task 1.1 was completed with `TRAP_RATE = 0.15`. Its record stays as written; the task below replaces that value per the design decision "Trap rate measured with the simulator".

- [x] 5.1 Trap rate measured with the simulator: set `TRAP_RATE` to 0.10 and update the tools/check.js trap-share assertion to 0.10 ± 0.02. Verify: `node tools/check.js` passes, and `SIM_N=100 node tools/sim.js` with and without `SIM_TRAP=0` shows every parallel-mode company at or above 85% of its no-trap mean. [after: 4.1]

## 6. Review and verify follow-ups

- [x] 6.1 Architecture evaluation before committing — audit and overdraft: extract `auditRoll` and `checkOverdraft` from `settle` and call both from `evaluate`, so evaluating a sensitive ticket on personal billing rolls the audit and a company-API overdraft is penalised in the same action; build the dispatch button's disabled condition from the shared `blocked` value. Verify: tools/check.js asserts the two new spec scenarios (sensitive DeepSeek evaluation with a stubbed roll below 0.6 → trust −12 and audits +1; NT$5 company budget with Opus → budget 0, trust −8, overdraft log) and all earlier assertions still pass. [after: 5.1]
- [x] 6.2 Close test gaps from verify: reveal a `trueCx: 5` trap through `reveal()` and assert the card shows complexity 5, 牽一髮動全身・原估 1 and an unchanged KPI; render a missed (evaluated, unrevealed) trap and assert its card matches an evaluated normal ticket and the dispatch panel has no evaluate button. Verify: `node tools/check.js` passes. [after: 6.1]
- [x] 6.3 tools/sim.js `SIM_TRAP` fails loudly: exit with an error when the value is not a finite number or the `TRAP_RATE` replacement did not change the script. Verify: `SIM_TRAP=off node tools/sim.js` exits non-zero with a message, and `SIM_N=5 SIM_TRAP=0 node tools/sim.js` exits 0.
- [x] 6.4 Ticket flags are not re-rolled on reveal — record it in docs/CLAUDE.md's trap section, and update the docs/CLAUDE.md line about external JS dependencies to mention the Google Analytics script added in public/index.html. Verify: content review. [after: 6.1]

