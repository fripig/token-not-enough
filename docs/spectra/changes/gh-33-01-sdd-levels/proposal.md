## Why

Issue #33: 「sdd也新增高等級 第一級是使用markdown紀錄文件例如sUPERPOWER 第二級是使用spectra openspec speckit等框架」, followed in the 2026-10-10 discussion by 「SDD應該做成選項 可以選擇不用」 and 「SDD TDD 單元測試 ＣＩＣＤ都弄成可選項」. Today 導入 SDD is one flat level that applies to every dispatch, so its token ×1.1 is pure loss on complexity 1–2 tickets and the player has no way to opt out or to invest further. This change covers SDD and the shared dispatch-panel area; 單元測試, a new TDD investment and CI become selectable in a follow-up change (gh-33-02).

## What Changes

- 導入 SDD gets two levels. Level 1 is the current effect, described as markdown spec documents (for example Superpowers): token ×1.1, success +0.08 on complexity ≥3, a hidden trap stops after 0.15. Level 2 is an SDD framework (Spectra, OpenSpec, Spec Kit): token ×1.2, success +0.15 on complexity ≥3, a hidden trap stops after 0.05.
- Level 2 costs 1 hour and NT$200 company budget, like the other level 2 investments (first proposed as 4 hours and NT$400; changed after the balance measurement, see design.md), and needs only level 1; unlike the other level 2 investments it needs no conference.
- The dispatch panel gets a 開發流程 section below 自我審核 with an SDD row: 不用, markdown（Lv1） and 框架（Lv2）, showing only owned levels; it is hidden until SDD level 1 is owned. The chosen level applies to that dispatch only. The default choice is "highest owned", so a player who never touches the row gets the same behaviour as today.
- Dispatch presets store an SDD level. Loading or one-click dispatching a preset whose level is not owned uses the highest owned level instead of skipping the preset. First-load defaults: 方案 A 不用, 方案 B and C highest owned. Stored presets without an SDD level are treated as highest owned.
- The dispatch log line names the SDD level when one is used; the trap-stop note for level 2 says it was found while running the framework flow.
- GA `dispatch` and `job_result` get a new `sdd` parameter (`none`, `md`, `framework`).
- Saves without the new selection field load as "highest owned"; old running jobs with a boolean `sdd` read `true` as level 1. `SAVE_VER` stays.
- The rules pop-up, the dispatch-panel investment hint and `docs/DESIGN.md` describe both levels and the choice.
- `tools/sim.js` gets switches to buy level 2 and to turn SDD off for shown complexity ≤2, so the effect of the choice can be measured; without them the auto-player's games are unchanged.

## Non-Goals (optional)

See design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `engineering-investments`: SDD gains level 2 with its own cost and no conference requirement; SDD effects depend on the level chosen per dispatch; a new dispatch-panel SDD choice; saves without the choice load as highest owned.
- `dispatch-presets`: presets store and load an SDD level, capped to the owned level, with new defaults.
- `play-analytics`: `dispatch` and `job_result` carry `sdd`.
- `action-log`: the dispatch decision line names the SDD level used.
- `rules-reference`: the rules tabs describe the SDD levels and the per-dispatch choice.

## Impact

- Affected specs: engineering-investments, dispatch-presets, play-analytics, action-log, rules-reference
- Affected code: public/js/data.js (SDD constants as per-level tables, level 2 entry, preset validation and defaults), public/js/calc.js (`est` takes the SDD choice, preset blocking), public/js/actions.js (`makeJob`, `dispatch` log, `jobChoice`, `settle` trap note, `invLock`, `savePreset`, `batch`, `invHint`), public/js/state.js (`sel` default, save loading), public/js/view.js (dispatch panel SDD row, preset labels), public/js/main.js (click handler), public/js/rules.js, tools/check.js, tools/sim.js, docs/DESIGN.md
- GA admin: register `sdd` as an event-scoped custom dimension.
