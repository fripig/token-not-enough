## Why

The month-end score deducts personal spend ((8000 − personal spend) ÷ 8), so every NT$ the player spends lowers the score. Players hold back on self-paid options that make agents stronger but cannot pay back within one month (the upcoming self-paid domestic conferences in gh-22-01), and outsourced gigs pay only KPI × 80 because their income adds score one-for-one with company tickets (issue #26: 「外包案子的錢應該要多一點 目前看起來很寒酸」「錢跟kpi拆開好了 不然感覺只會導致讓玩家不敢花錢」).

## What Changes

- **BREAKING (score)**: The month-end score becomes round(KPI × 10 + trust × 4 − audits × 80). Personal spend no longer affects the score; the spend floor (`SPEND_FLOOR`, NT$20,000) and the simulator's `SIM_FLOOR` are removed. The receipt still shows every money line plus the month-end wallet balance.
- Grade thresholds are re-set with the simulator (final: S 4,300 / A 3,300 / B 2,500 / C 1,700, parallel ×1.6) so the default auto-player's grade mix stays close to today's.
- The wallet becomes a hard limit: it cannot go negative through spending. A personal API agent whose cost exceeds the wallet uses what is left and stops halfway (a failed attempt, like an exhausted subscription quota); 個人 API is disabled with 錢包見底 when the wallet is NT$0 or less; subscription purchases and Monday upgrades cannot be confirmed when the wallet cannot cover them. The only way below NT$0 is an outsourcing late penalty.
- Outsourced ticket pay becomes KPI × 250 (complexity 1–5: NT$750 / 1,500 / 2,500 / 4,000 / 6,000 before the Rust/App/DevOps ×1.3). Daily gig count and the 30% late penalty stay.
- The starting wallet stays NT$8,000. Discussion first chose NT$20,000 so Pro 500 fits at month start; measurement showed that with money unscored it made "buy the most expensive plan the wallet allows" dominant and gigs pointless, and the user chose to keep NT$8,000 (Pro 500 becomes a Monday upgrade funded by gigs).
- `tools/sim.js` gains `SIM_UPGRADE` (save gig money and upgrade OpenAI on Mondays) so the value of gigs can be measured now that their income only buys things.
- The rules modal, `tools/check.js`, `tools/sim.js` and `docs/DESIGN.md` follow the new rules; the balance tables are re-measured.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `month-end-scoring`: score formula without personal spend, new grade thresholds, receipt formula text and wallet balance line.
- `billing-methods`: personal API stops when the wallet runs out; 個人 API disabled at NT$0 or less; dispatch warning text.
- `work-calendar`: subscription purchase and Monday upgrade blocked when the wallet cannot pay; held plans unaffected.
- `outsource-gigs`: pay KPI × 250; late penalty may take the wallet below NT$0; personal spend no longer feeds the score.
- `agent-catalog`: Pro 500 at month start is blocked by the NT$8,000 starting wallet instead of overdrawing it.
- `play-analytics`: the `game_end` example score and grade follow the new formula.

## Impact

- Affected specs: month-end-scoring, billing-methods, work-calendar, outsource-gigs, agent-catalog, play-analytics.
- Affected code: public/js/modals.js (score, grades, receipt, subscription confirm), public/js/state.js (gig pay), public/js/actions.js (personal API charge, settle note), public/js/calc.js (billing options), public/js/view.js (dispatch warning), public/js/rules.js (rules text), tools/check.js, tools/sim.js, docs/DESIGN.md.
- Save format: no field changes, `SAVE_VER` unchanged; a save with a negative wallet loads and simply blocks personal spending until the wallet is positive.
- Follow-up: gh-22-01-domestic-conference (parked) says conference fees count toward personal spend; after this change lands, `/spectra-ingest` it so the fee is display-only.
