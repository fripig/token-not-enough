## Context

Parallel mode currently asks for a slot count (2–6, default 3, `SLOT_CHOICES`, stored in `S.slots`). The count is used only as a gate: `dispatch()` refuses when `S.jobs.length >= S.slots`, `canQuick()` disables one-click and batch dispatch, and the dispatch panel shows 工作槽都滿了. The two costs of running agents together already read the live count:

- PR review load `reviewLoad() = 1 + REVIEW_LOAD × S.jobs.length` (`REVIEW_LOAD = 0.25`), applied when an agent finishes, counting the other agents still running.
- Merge-conflict chance `conflictRate() = CONFLICT × S.jobs.length × (CI ? CI_CONFLICT : 1)` (`CONFLICT = 0.1`, `CI_CONFLICT = 0.5`), also counting the others. It has no cap today, so 10 or more others would make it 100% or more.

Existing measurements (DESIGN.md 平行模式, 2026-10-09): average score rises with slots and gains only about 0–3% past 4. The parallel S threshold 9,500 is the median of strong play with 6 slots (`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200`).

The user decided in `/spectra-discuss` on #63: remove the slot setting, cap the conflict chance at 0.9, keep the review load linear, and hold the no-limit strong play to at most +5% over the 6-agent strong play, tuning if it exceeds.

## Goals / Non-Goals

**Goals:**

- Parallel mode has no slot count; how many agents run is the player's call, priced by review load and conflict chance.
- Today's numbers do not move for up to 6 running agents (same formulas, cap not reached).
- The no-limit strategy is measured and held within the +5% target.

**Non-Goals:**

- No change to serial mode, daily intake (3–6 tickets in parallel), the 0.2 hour dispatch cost, the single local GPU rule or overnight rules.
- No cap on PR review load and no new cost for running many agents beyond the two existing ones (unless the balance gate needs a value change, which the user picks).
- No change to the GA dimension registration in the GA admin console (the `slots` dimension simply stops receiving values).
- Not renaming the `parallel-slots` spec folder or `tools/check/parallel-slots.test.js`; the folder name stays so history and `@trace` links keep working.

## Decisions

### Remove the slot cap with no hidden limit

`S.slots`, `SLOT_CHOICES` and every `S.jobs.length >= S.slots` check go away. Alternative considered: keep a hidden technical cap (for example 10) for UI safety. Rejected: the queue size (3–6 new tickets a day plus carry-over) and 0.2 hours per dispatch already bound the count, and a hidden cap would be a rule the player cannot see.

### Cap the merge-conflict chance at CONFLICT_MAX 0.9

`conflictRate()` becomes `min(CONFLICT_MAX, CONFLICT × others × CI factor)` with `CONFLICT_MAX = 0.9` in `public/js/data.js` beside `CONFLICT`. The cap applies after the CI halving, so with CI the chance reaches 0.9 only at 18 others. Alternative considered: a saturating curve `1 − 0.9^n`. Rejected because it changes the chance at every count (2 others: 20% → 19%) and so every existing fixed-seed output, while the cap leaves counts up to 5 others untouched.

### Keep the PR review load linear

`reviewLoad()` keeps `1 + 0.25 × others` with no cap; it is the main cost of running many agents.

### Simulator SIM_SLOTS becomes the auto-player's own limit

`tools/sim.js` keeps `SIM_SLOTS` (default 3, accepted 2–6) as the number of agents its auto-player lets run at once and adds `SIM_SLOTS=0` for no limit. It no longer writes `S.slots`. Because the auto-player already checks its limit before calling `dispatch()` and never uses one-click or batch dispatch, fixed-seed outputs for unchanged settings stay byte-identical. Any other value is rejected with a message naming 0 and 2–6.

### Balance gate: no-limit strong play at most +5% over 6 agents

Measure strong play `SIM_N=100 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200` with `SIM_SLOTS=0` against `SIM_SLOTS=6`, seeds 101 and 202, per parallel work-content cell (6 cells × 2 seeds). Pass when every cell is at most +5%. Also record the default auto-player with `SIM_SLOTS=0` against `SIM_SLOTS=3` for information (no target). If any cell exceeds +5%, stop and ask the user to pick among raising `REVIEW_LOAD` (for example 0.30 or 0.35) or `CONFLICT` (for example 0.15), with measured numbers for each option; after the change, re-measure the default auto-player and the parallel S threshold median, because a value change moves every parallel output.

### Old saves and analytics

`fresh()` no longer creates `S.slots`. An old save that has `slots` loads unchanged (the field is unused), so `SAVE_VER` stays. `track()` drops the `slots` parameter; `game_version` separates old and new runs in GA.

### Slot count removed from text

Dictionary keys change in both `zh-TW` and `en`:

| Key | zh-TW after |
| --- | --- |
| `ui.meter.agents` | 背景 agent {n} |
| `ui.jobs.slots` | {n} 個在跑 |
| `ui.modePar` | 平行 |
| `end.modePar` | 平行模式 |
| `ui.setup.parSub` | agent 在背景同時跑，沒有數量上限… (no `{n}`) |
| `ui.dp.parHint` | adds that the conflict chance is capped at {max}% |
| `rules.mode2` | 同時跑幾個 agent 沒有上限… (no `{a}`/`{b}`) plus the cap |

`ui.warn.slots`, `ui.setup.slots`, `ui.setup.slotN` and `ui.setup.slotSub` are deleted. The rules modal reads `CONFLICT_MAX` from the constant.

## Implementation Contract

- Behavior: in parallel mode the opening modal shows no slot buttons; the player can dispatch from the panel, one-click buttons or batch dispatch whenever at least 0.2 hours remain and other blockers (vendor down, local GPU busy, ban, billing, quota, wallet) allow, regardless of how many agents run. The header shows `背景 agent N`, the background list `N 個在跑`, the setup log `· <company>・遊戲模式：平行`, the resume line `第 N 天・<company>・平行`, and the receipt title `月底結算・<company>・平行模式`.
- Interface / data shape: `conflictRate()` returns `min(CONFLICT_MAX, CONFLICT × S.jobs.length × CI factor)`; `reviewLoad()` unchanged; `canQuick()` is `S.hours >= 0.2`; `S` has no `slots` field in a new run; GA events have no `slots` key; `SIM_SLOTS` accepts 0, 2, 3, 4, 5, 6.
- Failure modes: an old save carrying `slots` loads without error; `SIM_SLOTS` outside 0 and 2–6 exits 1 with a message.
- Acceptance criteria: `node tools/check.js` passes with checks for each modified requirement (no slot buttons, a 7th agent can be dispatched, conflict chance 0.9 at 10 others and 0.5 at 5, no `slots` GA key, old save with `slots` resumes, receipt title without count); fixed-seed outputs `SIM_N=100 SIM_SEED=101`, `SIM_N=100 SIM_SEED=101 SIM_INVEST=1`, and `SIM_N=100 SIM_SEED=101 SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1 SIM_SUB=pro200` are byte-identical before and after (as long as no balance value changes); the balance gate table is recorded in `docs/DESIGN.md`.
- Scope boundaries: in scope are the slot removal, the conflict cap, text, GA, simulator flag, checks, DESIGN.md. Out of scope are any other balance change, serial mode, intake counts and the GA admin console.

## Risks / Trade-offs

- [No-limit dispatch becomes the dominant strategy] → balance gate with user-picked tuning; the gate stops before any value changes.
- [Raising REVIEW_LOAD to curb no-limit play also slows players running 2–3 agents] → the tuning options are presented with the default auto-player (3 agents) numbers so the user sees that cost.
- [GA reports lose the slot breakdown] → accepted by the user; `game_version` separates eras.
- [The `parallel-slots` spec name no longer matches its content] → its Purpose is rewritten when the change is archived; folder name kept (see Non-Goals).
