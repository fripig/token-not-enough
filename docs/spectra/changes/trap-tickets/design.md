## Context

public/js/game.js shows every ticket's complexity (`cx`) and derives all estimates from it in `est`. `makeJob` rolls the outcome from `est` at dispatch time, `settle` charges tokens through the selected billing method (subscription or seat quota, personal API wallet, company API budget, local GPU) and applies success or failure, and `manual` spends `manualHrs(is)` of player time. Stack effects (`stackGap`, `stackHrs`, `hardStack`) read `is.stack` and `is.cx`. KPI is fixed at creation as `KPI[cx]` times the incident and hard-stack multipliers. Tickets render as cards in `render`, the dispatch panel is built by `dispatchPanel`, and the receipt by `showEnd`. tools/check.js asserts spec examples against the real script with a fake DOM; tools/sim.js plays automated months.

All numbers below are invented balance values, marked as estimates where tools/sim.js is the measurement that confirms them.

## Goals / Non-Goals

**Goals:**

- Some small-looking tickets hide a much larger true complexity, and the player pays for the surprise in tokens, time and deadline pressure.
- The player can pay up front to investigate, so planning with an agent is a meaningful choice.
- A revealed trap can be negotiated with the manager, trading trust for a fair reward and more time.
- The mechanic is covered by tools/check.js and measured by tools/sim.js.

**Non-Goals:**

- Traps on incident tickets or on tickets that already show complexity 3 or higher.
- Changing the existing complexity table, billing rules, review levels, stack effects, events or scoring formula.
- Teaching the simulated player to evaluate or re-scope; the simulator measures the cost of traps for a player who ignores them.
- Decoy tickets with telltale wording that are not traps.
- Introducing a framework or build step (still deferred, see docs/CLAUDE.md).

## Decisions

### Trap generation on small tickets

In `makeIssue`, a non-incident ticket whose generated complexity is 1 or 2 becomes a trap with probability `TRAP_RATE = 0.10`. The first draft used 0.15; see Trap rate measured with the simulator. Its true complexity is 4 with probability 0.6, otherwise 5. The ticket keeps `cx` as the shown complexity and stores `trap: true`, `trueCx`, `trueBase = BASE[trueCx] × R(0.85, 1.15)`, `revealed: false`, `evaluated: false`, `rescoped: false`. Due date and KPI are generated from the shown complexity as today.

### Telltale titles

Each `STACKS` entry gains `pool.trap`, a list of at least 4 titles with telltale wording (for example "只要改一行", "順便", "應該很快"). A trap ticket takes its title from `pool.trap` with probability 0.5; otherwise it takes an ordinary title from `pool[cx]` and cannot be told apart.

### Architecture evaluation before committing

The dispatch panel shows a "先讓 agent 評估架構" button for any non-incident ticket that is not yet evaluated and not revealed. Using it with the selected vendor, model and billing method:

- spends `40k × M.verb` tokens charged through the same billing path as a dispatch, and `0.5h × M.speed` of player time (parallel mode advances the clock like hand-writing; serial mode subtracts hours);
- on a trap, reveals it with probability `min(0.95, 0.35 + 0.15 × M.cap)` (capability 2 → 0.65, 3 → 0.80, 4 and 5 → 0.95);
- sets `evaluated: true` in every case; a missed trap and a normal ticket both show a "已評估" chip, so the player cannot distinguish them;
- if subscription or seat quota runs out mid-evaluation, the evaluation stops with no reveal, consistent with dispatch.

The billing code in `settle` is split into a `charge(bill, vendor, model, tokens)` helper that returns the spend label and whether quota ran out, so dispatch and evaluation share it. The disabled-state rules (outage, China-model bans, not enough hours) match the dispatch button.

### Working on an unrevealed trap

`makeJob` computes the shown estimate as today for the display, but for an unrevealed trap it rolls the run against the true view `{...is, cx: trueCx, base: trueBase}`:

- If `M.cap >= trueCx`, the job uses the true estimate for tokens, hours and success, so the ticket can finish or fail like any true-complexity ticket. On settle, the ticket is revealed (log note `原來牽扯到架構，硬做完了` on success).
- If `M.cap < trueCx`, the job is a trap stop: tokens and hours are `0.4 ×` the true estimate (estimate), the run counts as a failure that reveals the ticket with the note `做到一半發現牽扯整個架構，先停下來`, `tries` increases, and the token base is not discounted (it becomes `trueBase`).
- Self-review cannot prevent a trap stop.
- Hand-writing an unrevealed trap spends `manualHrs` of the shown complexity, then reveals it with the note `手寫到一半發現要動架構`; the ticket stays in the queue.

Stack effects on the true run are evaluated against the true complexity (for example the Laravel/Rails convention bonus does not apply to a true complexity 4 ticket).

### Revealed trap

On reveal: `cx = trueCx`, `base = trueBase`, `revealed: true`, and the card shows a "牽一髮動全身" chip plus the original shown complexity in the chip text (for example "原估 1"). All later estimates use the true complexity. KPI and due date keep their shown-complexity values.

### Manager re-scoping

A revealed, not-yet-rescoped trap shows a "找主管重新評估" button in the dispatch panel. When trust is at least 50 (estimate): trust −5, KPI becomes `KPI[trueCx]` times the hard-stack multiplier, and the due date moves 2 days later, capped at day 20; log `主管同意重新評估`. Otherwise: trust −3, nothing else changes, log `主管：不是說很簡單嗎？`. Either way `rescoped: true` and the button disappears. It costs no player time.

### Receipt counts

`S.st.trapHit` counts reveals caused by working on a trap (agent run or hand-writing); `S.st.trapFound` counts reveals by evaluation. The receipt shows both lines.

### Trap rate measured with the simulator

`SIM_N=100 node tools/sim.js` with and without traps (`SIM_TRAP=0`), mean score with traps as a share of the no-trap mean (300 runs per mode × company, simulated player that never evaluates and always sends to a capability-3 model, so every trap stops):

| TRAP_RATE | Parallel (all companies) | Serial Laravel / Rails | Serial Rust / App |
| --------- | ------------------------ | ---------------------- | ----------------- |
| 0.15 | 95.0–98.6% | 81.9% / 83.8% | 69.3% / 73.7% |
| 0.10 | 95.3–97.9% | 88.6% / 89.5% | 76.0% / 79.0% |
| 0.06 | 95.9–100.4% | 94.8% / 89.8% | 87.0% / 86.0% |

The user chose 0.10: traps stay frequent enough to matter, parallel mode stays above 95%, and the serial-mode gap is kept and recorded as difficulty, consistent with the tech-stack-companies decision. A second simulated player that evaluated every small ticket and re-dispatched revealed traps to Opus scored lower (parallel 88.1–90.9%, serial 57.2–71.8% at 0.15), so blanket evaluation is not a dominant strategy.

### Simulator measures trap cost

tools/sim.js accepts `SIM_TRAP=0` to replace `TRAP_RATE` with 0 before evaluating the script, so the same run can be compared with and without traps.

## Implementation Contract

**Behavior**

- Ticket cards of unrevealed traps look exactly like normal tickets of the same shown complexity, except that half of them carry telltale titles.
- The dispatch panel offers 先讓 agent 評估架構 (with its token and time cost shown) on eligible tickets, and 找主管重新評估 on revealed, not-yet-rescoped traps.
- Logs and the receipt describe trap stops, forced completions, hand-writing reveals, evaluation results, and re-scoping outcomes with the notes named above.

**Interface / data shape**

- Issue fields: `trap`, `trueCx`, `trueBase`, `revealed`, `evaluated`, `rescoped`, and `shownCx` (set on reveal to the original shown complexity).
- `STACKS[k].pool.trap`: ≥4 Traditional Chinese titles for every stack including `fe`.
- Constants: `TRAP_RATE`, plus the evaluation and trap-stop numbers above, kept as named constants or local constants next to the trap helpers.
- `charge(b, v, M, tk)` returns `{spend, short}` where `short` is true when quota ran out; `settle` uses it without behaviour change for existing tickets.

**Failure modes**

- Evaluation on a ticket that becomes ineligible (already revealed, or incident) is not offered.
- Quota exhaustion during evaluation stops it with the log note `額度不夠，評估沒做完` and no reveal; the ticket is still marked evaluated only if the evaluation completed.

**Acceptance criteria**

- `node tools/check.js` passes, including new assertions for every spec example in `trap-tickets`.
- Existing assertions in tools/check.js keep passing, which shows normal tickets behave as before after the `charge` refactor.
- `node tools/sim.js` exits 0; with traps on, each parallel-mode company mean score stays at or above 85% of the same run with `SIM_TRAP=0`. Serial mode has no threshold; its measured ratios are recorded in docs/CLAUDE.md.
- Manual browser check at desktop and 400px width in light and dark theme: evaluation button, re-scope button and trap chips render without horizontal overflow and with no console errors.

**Scope boundaries**

- In scope: trap generation and titles, evaluation action, trap runs in makeJob/settle/manual, reveal display, re-scoping, receipt counts, charge helper refactor, check.js, sim.js, docs.
- Out of scope: incident traps, decoy titles, simulated-player strategy changes, scoring formula, grade thresholds, events.

## Risks / Trade-offs

- [Traps feel unfair because they cannot be detected] → half carry telltale titles, evaluation is available on every eligible ticket, and re-scoping recovers the reward.
- [Evaluating every ticket becomes the dominant strategy] → it costs tokens and 0.5h × model speed each time; serial mode's 8-hour day makes blanket evaluation expensive. Revisit if playtesting shows otherwise.
- [The `charge` refactor changes billing for normal tickets] → existing check.js assertions on store review and API spend, plus a before/after sim comparison, guard against it.
- [The 85% sim threshold is coarse because the simulated player ignores traps] → it bounds the worst case; real players who evaluate should do better.

## Migration Plan

No stored data changes. Deploy is the existing push to main; rollback is reverting the commit.
