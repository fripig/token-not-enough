## Why

Issue #64. In parallel mode an engineering investment is the only work that blocks the player's own hours: pressing it advances the clock by 2–6 hours while every other kind of work can run as a background agent. The user asked that investments can also run in parallel as tickets, that a low-tier model delivers a weaker investment, and that a high-tier model delivers the full benefit (「平行模式工程投資也可以平行處理 算是工單 低階模型執行增加的能力會降低 可以使用高模型取得該有的輔助」). In discussion the user chose that pressing an investment creates a matching ticket in the queue (「按了投資就產生一個相應的工單會不會比較好」).

## What Changes

- In parallel mode, pressing an investment button for one of the "written" investments (CLAUDE.md per stack, 單元測試, CI 流水線, pre-commit／lint hook, secret scanning／脫敏, 上架自動化, 監控告警, 做 skills, 接 MCP 文件, 導入 SDD, including their level 2) puts an **investment ticket** in the queue instead of buying it on the spot. Nothing is paid and no time passes when the ticket is created.
- An investment ticket is solved like any ticket from the dispatch panel:
  - **Hand-written (自己做)**: costs the investment's existing hours and company budget, gives full effect (quality 100%). Same as today's purchase.
  - **Dispatched to an agent** (dispatch panel, one-click presets A／B／C): runs in the background, pays tokens through the chosen payment method only (no fixed company budget), counts as a running agent for other tickets' PR review load and merge-conflict chance, and never fails. Its **quality** depends on the gap between the model's capability (with reasoning effort in advanced mode) and the investment's complexity: gap ≥ 0 gives 100%, −10 gives 60%, −20 gives 30%, −30 or lower gives 10%.
- Investment effects scale with quality: numeric effects interpolate between "not bought" and the level's full value; on/off effects (skills batch dispatch, 監控告警) need quality ≥ 60% to apply.
- An investment level whose quality is below 100% can be redone with a new investment ticket; the higher quality is kept.
- Investment tickets have no due date, KPI, client, trap, research, evaluation or rescope; the dispatch panel hides self-review, SDD and cross-model review for them. The abandon button becomes 取消投資 (no trust cost).
- Serial mode is unchanged: pressing an investment buys it on the spot as today.
- Investments not listed above (交叉審核工具, 提升 agent 能力, conferences, machine purchases) are unchanged in both modes.
- GA: the `invest` event is sent when an investment level is applied (hand-written or agent finished), with new parameters `via` (`self`／`agent`) and `quality`; investment tickets do not send `dispatch` or `job_result`.
- Saves keep investment tickets in the queue and per-level quality; old saves read every owned level as quality 100%, `SAVE_VER` stays.
- `tools/sim.js` gets a switch for the auto-player to solve investments through agent tickets in parallel mode. Balance target (chosen by the user): with a model capable enough for each investment, parallel scores 0% to +10% over `SIM_INVEST=1`; weaker models are measured only.

## Non-Goals (optional)

See `design.md`.

## Capabilities

### New Capabilities

- `agent-investments`: investment tickets in parallel mode — creation, solving by hand or by agent, quality from model capability, quality-scaled effects, redo, cancel, logging, analytics and saves.

### Modified Capabilities

- `engineering-investments`: in parallel mode the investment buttons of written investments create an investment ticket instead of buying; effects are defined at quality 100% and scaled per `agent-investments`.
- `play-analytics`: the `invest` event gains `via` and `quality` and, for investment tickets, is sent when the level is applied rather than when the button is pressed.

## Impact

- Affected specs: `agent-investments` (new), `engineering-investments`, `play-analytics`.
- Affected code: public/js/actions.js (investment ticket creation, dispatch, settle, cancel, queue order, abandon guards), public/js/calc.js (quality, quality-scaled effect values, estimate for investment tickets), public/js/data.js (investment complexities, quality anchors), public/js/state.js (per-level quality in `S`, save load defaults), public/js/view.js (investment ticket card, dispatch panel for investment tickets, investment tab buttons), public/js/main.js (investment button handler), public/js/rules.js (rules modal text), public/js/i18n/zh-TW.js and public/js/i18n/en.js (new strings), tools/sim.js (new switch), tools/check/agent-investments.test.js (new), tools/check/engineering-investments.test.js, tools/check/play-analytics.test.js, docs/DESIGN.md.
- Refactor check (2026-10-15): actions.js 532 lines／36.1KB (8 lines over 200 chars), calc.js 165／11.0KB (3), view.js 240／24.9KB (36), data.js 169／17.1KB (11), state.js 149／9.6KB (4). No framework needed; investment-ticket logic is added next to the existing investment code in actions.js, which stays well under about 1,000 lines.
