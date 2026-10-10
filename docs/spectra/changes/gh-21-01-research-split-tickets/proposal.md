## Why

The player asked: 「我打算新增一種工作類型 直接進行會大幅消耗token 但是如果先進行研究就會拆成兩個比較小的工作」. Today a big ticket is either dispatched as-is or hand-written; there is no way to break it down first. A visible "needs research" ticket adds a clear up-front choice — spend a little time or tokens to research and split it, or brute-force it at a large token premium — which is different from trap tickets (hidden, probabilistic reveal).

## What Changes

- New research ticket (需研究): a non-incident ticket generated with complexity 4 or 5 becomes a research ticket with probability `RESEARCH_RATE` (0.3, initial value to be confirmed by the simulator). Its card shows a 需研究 chip and the hint 直接派工 token ×4. Outsourced tickets can be research tickets; incidents, traps and merge-conflict tickets cannot.
- Dispatching a research ticket directly multiplies its token estimate and usage by `RESEARCH_DIRECT_TK` (4; first proposed as 2.5, raised after the simulator run, see design.md). Success rate and run time are unchanged. One-click dispatch keeps working (its quota and wallet checks already use the estimate); batch dispatch only handles complexity ≤2 and is unaffected.
- Two research actions in the dispatch panel, both always split the ticket:
  - Agent research: 40k × model token multiplier tokens through the selected billing method, 0.5h × model speed of player time; same charging, audit, overdraft, quota-shortfall, local-GPU and outsourced-billing rules as architecture evaluation.
  - Self research: 1.5h of player time (×2 on an unfamiliar stack), no tokens; blocked when hand-writing is blocked.
- Splitting replaces the ticket with two tickets in its queue position: complexity 4 → 2 and 3, complexity 5 → 3 and 3. KPI (and outsourcing pay) is split in proportion to complexity so the two add up to the original. Due date, stack, client, sensitivity, outsourced flag and store review carry over; large codebase is kept only on a part of complexity ≥3. Parts are never traps or research tickets. Titles come from a new per-stack research title pool where each entry names the original ticket and its two parts.
- Research tickets cannot be architecture-evaluated. A merge-conflict ticket left by a directly dispatched research ticket is not a research ticket.
- Analytics: new `research` event; `dispatch` and `job_result` gain a `research` parameter.
- Log lines for research and splitting; rules modal 工單與陷阱 tab explains research tickets.
- `tools/sim.js` gains `SIM_RESEARCH_RATE` and `SIM_RESEARCH=agent|self`; `tools/check.js` asserts the spec examples; `docs/DESIGN.md` records the requirement and measurements.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `research-tickets`: generation of research tickets, the direct-dispatch token premium, agent and self research, and splitting into two smaller tickets.

### Modified Capabilities

- `dispatch-outcome`: the token estimate includes the research-ticket multiplier (see `research-tickets`).
- `ticket-lifecycle`: ticket generation names `research-tickets` as the source of the research field.
- `trap-tickets`: architecture evaluation is not offered on research tickets.
- `play-analytics`: new `research` event; `dispatch` and `job_result` carry `research`.
- `rules-reference`: the 工單與陷阱 tab covers research tickets.

## Impact

- Affected specs: new `research-tickets`; modified `dispatch-outcome`, `ticket-lifecycle`, `trap-tickets`, `play-analytics`, `rules-reference`.
- Affected code: public/js/data.js, public/js/state.js, public/js/calc.js, public/js/actions.js, public/js/view.js, public/js/main.js, public/js/rules.js, public/index.html (footer intro), tools/sim.js, tools/check.js, docs/DESIGN.md.
- Save data: new ticket fields `research` and `parts`; a ticket from an older save has neither and behaves as a normal ticket, so `SAVE_VER` stays 1.
- Refactor check (2026-10-10, only the modules this change touches): actions.js 364 lines／25.7KB (10 lines over 200 chars), data.js 175／19.4KB (7), view.js 152／16.4KB (21), rules.js 105／12.3KB (20), state.js 106／6.2KB (2), calc.js 98／6.4KB (1). Conclusion: no refactor first; if research and splitting grow past about 100 lines in actions.js, move them to their own module.
