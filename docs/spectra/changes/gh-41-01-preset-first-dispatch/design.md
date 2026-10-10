## Context

`dispatchPanel()` in `public/js/view.js` renders, in order: ticket title, agent/model grid, billing, review, effort (進階), SDD, load + save presets, estimate, hints, warning, actions. `quickBtn(is)` renders one `.qk` button per card from `presetFor(is)` (first usable preset A→B→C, first skipped reason). `quick(id, via)` in `public/js/actions.js` dispatches with `presetFor` and logs skipped presets; `batch()` calls `quick(id,'batch')`. Click delegation in `public/js/main.js` maps `data-quick` to `quick(id)`.

## Goals / Non-Goals

**Goals:** decision-first dispatch panel; three per-preset one-click buttons on every card.

**Non-Goals:** rule or preset changes; batch dispatch changes; sticky panel parts.

## Decisions

### Reorder `dispatchPanel()` into decision then fine-tuning

New order: `.dpt` title → `ui.dp.presets` section with the three load buttons only → `.est` → stack/investment/parallel hints → `.warnline` → `.actions` → a `ui.dp.tune` label ("細調" / "Fine-tune") → agent and model, billing, review, effort, SDD → save buttons (own section `ui.dp.savePresets`, "存成方案" / "Save as preset"). Markup of each block is unchanged so existing selectors keep working. The estimate already reflects the current selection, so loading a preset updates it in place at the top.

### Highlight the matching preset

A load button gets `sel` when the current selection equals that preset on vendor, model, billing, review, effort (only compared in 進階 mode, since 一般 ignores it) and applied SDD level (`sddLevel(p.sdd)` vs `sddLevel()`). Pure display; no state.

### `quick(id, via, pi)` with an explicit preset

Add an optional preset index `pi`. When given, `quick` uses only that preset: if `presetBlock(is, S.presets[pi])` returns a reason it does nothing and returns false; otherwise it loads the preset and dispatches with `preset = PN[pi]`, without a skip log line. Without `pi` (batch, existing callers) behaviour is unchanged. Card buttons carry `data-quick="<id>" data-p="<0|1|2>"`; `main.js` passes `+t.dataset.p`.

### Three buttons in the card footer

`quickBtn(is)` renders a `.qkrow` with a small label (`ui.quick.label`, "一鍵派工" / "One-click") and three `.qk` buttons. Each shows `<b>A</b>` plus model name and billing label; a disabled button (preset reason) shows the reason in red; an enabled button on a sensitive ticket with personal billing shows `稽核 N%` (new short key `ui.quick.auditShort`). All three also get `disabled` when `canQuick()` is false. Buttons share the row equally (`flex:1 1 0`, wrap text) so three fit at 400px. Keys `ui.quick.go`, `ui.quick.none`, `ui.quick.skip`, `ui.quick.audit` become unused and are removed from both dictionaries.

## Implementation Contract

- Dispatch panel with a ticket selected: the first `data-load` appears before `class="est"`, which appears before `data-act="go"`, which appears before the first `data-v` and before the first `data-save`.
- With the default presets and selection equal to 方案 B (anthropic/sonnet/corp/rv 1/ef 1/SDD), only `data-load="1"` has class `sel`.
- Each queued card has buttons `data-quick="<id>" data-p="0|1|2"`. Finance-client ticket with defaults: `data-p="0"` disabled showing 金融客戶禁用, `data-p="1"` enabled; `quick(id,'quick',1)` dispatches with Sonnet/公司 API and logs `一鍵派工方案 B` with no skip text; `quick(id,'quick',0)` returns false and changes nothing. Sensitive ticket: button A enabled and shows 稽核 60%. Full slots or <0.2h: all three disabled.
- `quick(id)` without `pi` and `batch()` behave exactly as before (existing checks pass unchanged).
- `node tools/check.js` passes; manual browser check at desktop and 400px.
- Out of scope: Non-Goals.

## Risks / Trade-offs

- [Card height grows on mobile with three buttons and reasons] → buttons share one row and use 12px text; reasons only on disabled buttons.
- [Players used to automatic fallback lose it on cards] → disabled buttons show why, and batch dispatch keeps fallback.
