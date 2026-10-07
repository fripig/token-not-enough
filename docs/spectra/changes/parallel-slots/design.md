## Context

`fresh()` sets `S.slots = 3`. `dispatch` refuses a parallel dispatch when `S.jobs.length >= S.slots`; the dispatch button, the warning line and the background-agent list all read `S.slots`. `parMul()` (token multiplier `1 + 0.15 × running jobs`) and the merge-conflict chance (`0.1 × other running jobs`) already scale with however many jobs run. `showSetup(false)` shows the mode picker; `S.mode` and `S.company` survive `fresh()` so replay keeps them. tools/sim.js plays automated months and fills every free slot.

## Goals / Non-Goals

**Goals:**

- The player picks 2–6 parallel slots at the start of a run.
- The choice is visible and survives replay.
- The effect of each slot count is measured with tools/sim.js.

**Non-Goals:**

- Changing slots mid-run (weekly adjustment does not offer it).
- New costs for extra slots, or scoring and grade-threshold changes (the user chose to rely on the existing token and conflict costs and to measure first).
- Splitting best scores by slot count.
- Slots for serial mode.

## Decisions

### Slot picker in the opening setup

Below the mode picker, when the draft mode is parallel, show a row of five buttons 2, 3, 4, 5, 6 labelled `同時 N 個 agent`, highlighted like the other pickers; default 3. The serial mode hides the row. Confirming sets `S.slots`; `fresh()` keeps the previous `S.slots` when it is an integer from 2 to 6, otherwise 3. The parallel-mode description text uses the drafted count instead of the fixed "最多 3 個".

### Existing costs carry the trade-off

No new rule. With N slots the token multiplier for a new dispatch can reach `1 + 0.15 × (N − 1)` and the merge-conflict chance `0.1 × (N − 1)`; both formulas already exist in `parMul` and `advance`.

### Simulator measures each slot count

tools/sim.js reads `SIM_SLOTS` (integer 2–6, error otherwise) and sets `S.slots` after `start()` in parallel runs. Running it once per value gives mean scores per company; the numbers go into docs/CLAUDE.md. If one slot count clearly dominates (for example the highest count is best for every company by a wide margin), that is reported to the user instead of tuned in this change.

## Implementation Contract

**Behavior**

- Opening modal in parallel mode shows the 2–6 slot picker; serial mode does not; the weekly 調整訂閱 modal never does.
- After confirming N slots, the header meter and the background-agent list show `0 / N`, and the N+1-th concurrent dispatch is refused with the existing 工作槽都滿了 warning.
- The receipt title reads `月底結算・<公司>・平行模式（N 個 agent）`; serial stays `單線模式`.
- 再玩一個月 preselects the previous N.

**Interface / data shape**

- `S.slots`: integer 2–6; `SLOT_CHOICES = [2,3,4,5,6]`.
- Setup buttons use `data-slots="N"`.
- `SIM_SLOTS` environment variable for tools/sim.js.

**Failure modes**

- An invalid stored `S.slots` falls back to 3.
- `SIM_SLOTS` outside 2–6 or non-numeric exits tools/sim.js with an error.

**Acceptance criteria**

- `node tools/check.js` passes with new assertions for the picker, default, replay, slot limit and receipt title.
- `SIM_SLOTS=N node tools/sim.js` exits 0 for N = 2..6 and the per-company parallel means are recorded in docs/CLAUDE.md.
- Browser check of the setup modal at desktop and 400px width with no overflow or console errors.

**Scope boundaries**

- In scope: picker, `S.slots` persistence, receipt title, description text, sim switch, checks, docs.
- Out of scope: new slot costs, scoring, best-score keys, serial mode, weekly adjustment.

## Risks / Trade-offs

- [More slots may simply dominate] → measured by the simulator and reported back rather than silently tuned.
- [The simulated player always fills every slot] → its results show the cost of running at full capacity, which is the worst case for conflicts; real players may hold slots back.
