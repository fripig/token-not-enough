## Context

Each model in `VENDORS` has fixed `cap`, `verb` (token multiplier) and `speed` (hours per complexity unit). `est(is, v, mid, rv)` in public/js/calc.js derives success rate, catch rate, token estimate and hours from `model(v, mid)`; `makeJob` copies `e.M` onto the job, and `settle` charges with `j.M` (price and quota weight `w`) and logs `j.M.name`. Run-level opt-ins such as `S.outsource` live on `S`, are preserved by `fresh()`, and are edited through the setup modal's `draft`. The dispatch selection `sel` keeps `rv` across `fresh()`. Presets are `{v, m, b, rv}` objects validated by `validPreset` and normalised by `presetsOf`.

## Goals / Non-Goals

**Goals:**

- An opt-in 進階模式 with a per-dispatch 推理強度 (低 / 中 / 高) that trades capability against tokens and time; higher effort is slower, lower effort is faster.
- 一般 mode produces identical behaviour to today, including simulator output under a fixed `SIM_SEED`.
- Presets remember effort.

**Non-Goals:**

- No new models, no per-vendor effort tables (every model gets the same multipliers; the game does not invent which vendor reasons better).
- Architecture evaluation (`evaluate`, `evalCost`, `revealRate`) and hand-writing are unaffected by effort.
- Best score is not split; `bestKey()` is unchanged.
- No change to the receipt besides what already exists (no "effort used" statistics).

## Decisions

### Effort as a model transform, not new models

Add to public/js/data.js:

- `EFFORT = [{id:'low', name:'低', cap:-1, tk:0.7, hrs:0.8}, {id:'mid', name:'中', cap:0, tk:1, hrs:1}, {id:'high', name:'高', cap:1, tk:1.5, hrs:1.4}]`, indexed 0/1/2 like `REVIEW`.
- `effModel(M, ef)` returns `M` itself when `ef === 1`; otherwise a copy with `cap = max(1, M.cap + EFFORT[ef].cap)`, `verb = M.verb × EFFORT[ef].tk`, `speed = M.speed × EFFORT[ef].hrs`, `name = M.name + '・' + EFFORT[ef].name + '強度'`. `price`, `w`, `ctx`, `cn` are untouched.
- `efOf(ef)` returns `ef` when `S.advanced` is true, otherwise 1.

`est` gains a fifth parameter `ef = sel.ef` and builds `M = effModel(model(v, mid), efOf(ef))`. The one exception is the existing ×0.85 token discount for a model stronger than the ticket: it is decided by the base model's capability (`M0.cap - is.cx >= 1`), so 高 costs exactly 1.5× and 低 exactly 0.7× the tokens of 中. Because every downstream consumer (success-rate diff, `catchRate`, trap push-through check in `makeJob`, `settle` charging and log name) already reads `e.M` / `j.M`, effort propagates without touching those functions.

Alternative considered: adding extra model entries per effort. Rejected — triples the model buttons, breaks the "model list unchanged" requirement and the preset validation.

Multipliers are starting estimates (unmeasured). The confirming measurement is the simulator run in the balance task; if parallel-mode advanced average score falls outside the target band, adjust only `tk` and `hrs` of 低/高, keep `cap` ±1.

### Capability above 5 is allowed

高 on a cap-5 model yields cap 6 (no upper clamp). This keeps 高 meaningful for Opus / 高推理 on complexity-5 or trap tickets, at 1.5× tokens and 1.4× time. Catch rate stays under its existing 0.95 cap.

Alternative: clamp at 5 and disable 高 for cap-5 models. Rejected — removes the most interesting choice (Opus 高 on a revealed trap).

### Run state

- `S.advanced`: boolean, `fresh()` keeps `S?.advanced === true`, otherwise false.
- `sel.ef`: `fresh()` keeps `sel?.ef ?? 1`, like `rv`.
- Setup `draft` carries `advanced`; buttons use `data-adv="0|1"`. Changing only this toggle does not regenerate day-1 tickets.

### Presets

Preset shape becomes `{v, m, b, rv, ef}`. `validPreset` accepts `ef` in `[0,1,2]` or missing; `presetsOf` fills a missing `ef` with 1 so old presets stay valid. `DEFAULT_PRESETS` get `ef: 1`. `savePreset` stores `sel.ef`; `loadPreset` copies it. `presetBlock` passes `p.ef` to `est` (where `efOf` neutralises it in 一般 mode). Preset button labels show the effort name only in 進階 mode and only when it is not 中.

## Implementation Contract

**Observable behaviour**

- Setup modal shows a 進階模式 section (一般 / 進階) below 外包; default 一般; persists across 再玩一個月; non-boolean stored value → 一般; weekly modal does not show it.
- In 進階 mode the dispatch panel shows a 推理強度 row of three buttons (`data-ef="0|1|2"`), each with a short hint (`能力 −1・token ×0.7・時間 ×0.8`, `原本的模型`, `能力 +1・token ×1.5・時間 ×1.4`). In 一般 mode the row is absent.
- Dispatch-panel success rate, catch rate, token range and hours reflect the selected effort.
- Example (Sonnet cap 4, complexity-4 Laravel ticket, no review, no investments, single-line mode): 中 → diff 0 → p 0.80; 高 → diff 1 → p 0.95, hours × 1.4, token × 1.5; 低 → diff −1 → p 0.50, hours × 0.8, token × 0.7.
- Logs name the model as e.g. `Sonnet・高強度` when effort is not 中.
- 一般 mode: `est` output is bit-identical to today for any `ef` argument.

**Tooling**

- `tools/check.js` asserts the example above, the cap floor (Haiku cap 2 at 低 on any ticket uses cap 1), cap 6 for Opus 高, 一般 mode ignoring `ef`, preset fallback for a preset without `ef`, and `fresh()` fallback for a non-boolean `advanced`.
- `tools/sim.js` gains `SIM_EFFORT=1`: sets `S.advanced = true` and per ticket picks `ef = 2` when `cap − cx ≤ −1`, `ef = 0` when `cap − cx ≥ 2`, else 1 (using the chosen model's base cap and the shown complexity).
- With `SIM_SEED` fixed and no `SIM_EFFORT`, simulator output is identical before and after the change.

**Balance target**: parallel mode, `SIM_EFFORT=1` average score ÷ default average score − 1 within −5% … +15% for all four companies (measured with `SIM_N=100`, two runs). Single-line mode has no target; record the numbers.

**In scope**: the files listed in the proposal's Impact. **Out of scope**: evaluation, hand-writing, receipt statistics, best-score key, new models.

## Risks / Trade-offs

- [高 on cheap Chinese models + strict review may amplify the already-strong combo noted in DESIGN.md] → measure with the simulator; if parallel exceeds +15%, raise 高 `tk` before touching `cap`.
- [cap 6 makes `catchRate` reach 0.93 with self-review] → still under the 0.95 cap; acceptable.
- [Preset shape change could invalidate saved presets and reset them to defaults] → missing `ef` is accepted and filled with 1.

## Migration Plan

Static site; deploy by pushing to `main`. Presets live only in memory across `fresh()`, so no stored-data migration. Rollback is a revert.

## Open Questions

None.
