## Context

導入 SDD is defined in `INVEST.sdd` in public/js/data.js as one level (6h, NT$500) with three constants `SDD_TK = 1.1`, `SDD_P = 0.08`, `SDD_TRAP_STOP = 0.15`. `est()` in public/js/calc.js applies the token factor to every estimate and the success bonus to complexity ≥3 whenever `S.inv.sdd` is truthy; `makeJob()` in public/js/actions.js uses the trap-stop factor and stores `sdd: S.inv.sdd` on the job so `settle()` can pick the 寫規格時就發現 note. Investment levels are already stored as numbers and read through `lv()` (true → 1), and four other investments have a level 2 described by an `lv2` entry; `invLock()` maps their level 2 to a conference category through `CONF_LV2`.

The dispatch selection `sel` holds `v, m, b, rv, ef`; `fresh()` in public/js/state.js keeps `rv` and `ef` across runs. Presets (`S.presets`, defaults `DEFAULT_PRESETS`, validation `validPreset`/`presetsOf`) hold the same five fields, and `quick()`/`loadPreset()` copy a preset into `sel` with `Object.assign`. The simulator sets `sel` fields directly and never uses presets.

Decisions from the 2026-10-10 discussion (all chosen by the user): level 1 = the current effect; level 2 = more tokens but more accurate; level 2 needs no conference; SDD is chosen per dispatch on the dispatch panel; presets remember the SDD choice and fall back to the highest owned level; 單元測試, TDD and CI move to gh-33-02.

## Goals / Non-Goals

**Goals:**

- Two SDD levels with per-level effects, level 2 bought after level 1 without a conference.
- A per-dispatch SDD choice (不用 / Lv1 / Lv2, only owned levels) in a new 開發流程 section of the dispatch panel, designed so gh-33-02 can add more rows to the same section.
- Presets, GA, the action log, the rules pop-up, saves and the simulator follow the choice.
- A player who never touches the new row, and the auto-player without new switches, behave exactly as before.

**Non-Goals:**

- 單元測試, TDD and CI as selectable options, and any per-use cost for them (gh-33-02).
- Changing level 1's numbers, hours or price.
- SDD affecting architecture evaluation, research, hand-writing or the batch-dispatch complexity limit.
- A conference that opens SDD level 2, or any change to `CONF_LV2`.
- Bumping `SAVE_VER`.

## Decisions

### Per-level tables for the SDD constants

`SDD_TK = [1, 1.1, 1.2]`, `SDD_P = [0, 0.08, 0.15]`, `SDD_TRAP_STOP = [0, 0.15, 0.05]` — index 0 is never read: at level 0 `makeJob` uses `TRAP_STOP` (0.4) as today. This follows `MD_P` and `TEST_CATCH`, so `rules.js` and the hint line index by level the same way. Alternative: separate `SDD2_*` constants — rejected, it doubles the names every reader has to know and diverges from the existing level pattern.

### The choice is "requested level", the effect uses min(requested, owned)

`sel.sdd` and each preset's `sdd` hold a requested level 0, 1 or 2. The effective level is `min(requested, lv(S.inv.sdd))`, computed by one exported helper (`sddLevel(req)`) used by `est`, `makeJob`, the dispatch panel and the preset label. `sel.sdd` starts at 2 in every run (`fresh()` resets it, it does not carry over like `rv`/`ef`), so an untouched selection means "highest owned" and reproduces today's behaviour (SDD on for every dispatch once bought). This also implements "presets fall back to the highest owned level" without a special case. Alternatives: store the effective level (breaks when the player buys level 2 later: a preset saved at level 1 would never upgrade even if it meant "best"), or a boolean on/off plus the owned level (cannot express "use Lv1 although Lv2 is owned").

Consequence: a player who explicitly picks Lv1 and later buys Lv2 stays on Lv1 until they change it; picking 不用 stays 不用. This is visible on the panel, so it is acceptable.

### `est` takes the SDD request as a sixth parameter

`est(is, v, mid, rv = sel.rv, ef = sel.ef, sd = sel.sdd)`. Callers that estimate for a preset (`presetBlock`, the serial-mode check in `batch`) pass the preset's `rv`, `ef` and `sdd`; the `batch` check currently omits `ef`, and it is fixed in the same edit since the line is touched anyway. Alternative: read `sel.sdd` inside `est` only — rejected, preset estimates would use the panel's choice instead of the preset's.

### Level 2 without a conference

`invLock()` returns no lock for `sdd` before it looks up `CONF_LV2`. Without this the lookup finds no category and the button would read 需要去過undefined. `INVEST.sdd.lv2 = {hrs: 1, cost: 200, desc}` (same price as the other level 2 investments; first proposed as 4 hours and NT$400, changed by the user after the first balance round, see Risks); `invCost`, `invMax`, the panel's Lv2 text and the GA `investment: 'sdd2'` value already follow from having an `lv2` entry.

### Dispatch panel layout

A new section `開發流程` after 自我審核 (and after 推理強度 in advanced mode), rendered only when SDD level ≥1 is owned. It holds one labelled row "SDD" with buttons `data-sdd="0|1|2"`: 不用 (陷阱燒 40%), markdown Lv1 (token ×1.1・≥3 成功率 +8%・陷阱燒 15%), and 框架 Lv2 only when owned (token ×1.2・≥3 成功率 +15%・陷阱燒 5%); the numbers come from the constants. The selected button is the effective level. Clicking sets `sel.sdd` to that level and re-renders. The section is a container so gh-33-02 adds rows (tests, TDD, CI) without moving SDD.

### Preset defaults

`DEFAULT_PRESETS` get `sdd: 0` for A (DeepSeek Chat, used for cheap small work) and `sdd: 2` for B and C. `validPreset` accepts a missing `sdd` or 0–2; `presetsOf` fills a missing `sdd` with 2. The load button label appends `・SDD 不用|markdown|框架` from the effective level only when SDD is owned, so players without SDD see no change.

### Log, GA and trap note

- The dispatch line's option segment becomes `<agent> / <model>・<billing>・<review>` plus `・SDD markdown` or `・SDD 框架` when the effective level is ≥1; nothing is added at level 0 (including when SDD is not owned).
- `jobChoice()` adds `sdd: ['none','md','framework'][lv(j.sdd)]`, so both `dispatch` and `job_result` carry it; `lv()` reads an old job's boolean.
- `makeJob` stores the effective level as `sdd`. `settle()`'s trap-stop note: level 2 → 跑框架流程時就發現牽扯整個架構，先停下來; level 1 → the existing 寫規格時就發現牽扯整個架構，先停下來; level 0 → 做到一半發現牽扯整個架構，先停下來.

### Saves

`loadGame` sets `sel.sdd = 2` when the saved `sel` has no `sdd` (or an invalid one). Running jobs keep a boolean `sdd` and are read through `lv()`. `SAVE_VER` stays because the missing field has a default that reproduces the old behaviour.

### Simulator switches

`SIM_SDD2=1` (with `SIM_INVEST`): after every `SIM_INVEST` purchase is done (SDD level 1 is the last of them), the auto-player buys level 2 when it can, in the same daily purchase step. `SIM_SDD_PICK=1`: before each dispatch the auto-player sets `sel.sdd = 0` for shown complexity ≤2 and 2 otherwise. Without these the auto-player never sets `sel.sdd`, it stays 2, and every existing fixed-seed output stays byte-identical (no new `Math.random` calls are added).

## Implementation Contract

**In scope**

- Data: `SDD_TK`, `SDD_P`, `SDD_TRAP_STOP` become 3-element per-level arrays; `INVEST.sdd` gets an `lv2` entry with 1 hour, NT$200 and a description naming Spectra／OpenSpec／Spec Kit; the level 1 description names markdown spec documents such as Superpowers; `DEFAULT_PRESETS` and preset validation carry `sdd`.
- Behaviour: estimates, dispatch, preset blocking, quick and batch dispatch use `min(requested, owned)`; the trap stop factor is 0.4 / 0.15 / 0.05 by effective level; level 2 is purchasable with level 1 owned, 1 hour and NT$200, regardless of conferences.
- UI: the 開發流程 section with the SDD row as described; preset load labels; the investment hint names the effective SDD level's effect; the rules pop-up describes both levels, that level 2 needs no conference, and the per-dispatch choice.
- Records: dispatch log segment, trap-stop note per level, GA `sdd` on `dispatch` and `job_result`.
- Saves: missing `sel.sdd` → 2; no `SAVE_VER` change.
- Tools: `tools/check.js` assertions for every spec scenario of this change; `tools/sim.js` switches `SIM_SDD2` and `SIM_SDD_PICK`; balance numbers recorded in `docs/DESIGN.md`.

**Acceptance**

- `node tools/check.js` exits 0.
- `SIM_N=100 SIM_SEED=101 node tools/sim.js` and `SIM_INVEST=1 SIM_N=100 SIM_SEED=101 node tools/sim.js` print exactly the same output as before the change.
- Balance target (parallel mode, `SIM_N=100`, two seeds): `SIM_INVEST=1 SIM_SDD2=1` within +3% to +15% of `SIM_INVEST=1`; if outside, tune level 2's hours, cost or numbers and record each round in `docs/DESIGN.md`. Serial mode is recorded without a target, as for every other investment.

**Out of scope**

- Any change to 單元測試, CI, a TDD investment, conferences or `CONF_LV2`.
- Any change to architecture evaluation, research, hand-writing or self-review.

## Risks / Trade-offs

- [Choice persists while ownership changes: a player on 不用 who forgets the row loses SDD benefits] → the row is always visible once SDD is owned, the hint line says which SDD level applies, and the dispatch log names it.
- [Preset A default 不用 surprises a player who bought SDD expecting it everywhere] → only first-load defaults change; stored presets without `sdd` are treated as highest owned, and the A label shows SDD 不用 once SDD is owned.
- [Level 2's effect on the auto-player is hard to measure: it already gets S in about nine of ten parallel games] → measured 2026-10-10 (`SIM_N=100`, seeds 101/202): at 4h/NT$400 parallel −3.4% to +0.2%, at 1h/NT$200 −1.2% to +2.3%, both below the +3% target; the user chose 1h/NT$200 and accepted missing the target, as with the domestic conferences.
- [More buttons on a 400px-wide screen] → the row reuses the existing `.seg` buttons that already wrap for 自我審核 and 推理強度; checked manually at 400px.

## Migration Plan

No data migration. Old saves load with `sel.sdd = 2`; old running jobs read their boolean `sdd` as level 0/1. Stored presets without `sdd` read as 2. Rollback is a revert of the commit; saves written by the new version still load in the old one because the extra `sel.sdd` field is ignored there.

## Open Questions

(none — the balance round settled level 2 at 1 hour and NT$200 and accepted missing the parallel target)
