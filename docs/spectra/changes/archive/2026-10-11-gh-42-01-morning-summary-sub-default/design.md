## Context

`endDay()` in `public/js/actions.js` applies end-of-day penalties, logs `daySummary()` (formatted from `S.dayStart` and the current values), advances the day, builds the morning report lines `rep`, saves `{rep, ev, monday}` via `saveGame()` and opens `showDay(rep, ev, monday)` in `public/js/modals.js`. Resume (`showResume`) reopens `showDay` from the saved `morning`. The dispatch selection `sel` starts with `b:'api'`; the vendor click handler in `public/js/main.js` only switches billing for local GPU; `dispatchPanel()` falls back to the first usable billing when the current one is unusable. `bills(v, is)` in `public/js/calc.js` lists billing options with availability; `quotaLeft(kind, v)` and `costLine()` give quota needs.

## Goals / Non-Goals

**Goals:** morning report shows yesterday's four figures; vendor change and day 1 start prefer seat, then subscription.

**Non-Goals:** changes to the log line, billing rules, presets, one-click dispatch; applying the default on Monday plan changes.

## Decisions

### One structured summary, two renderings

Add `daySum()` in `actions.js` returning `{d, kpi:[Δ, v], trust:[Δ, v], wallet:[Δ, v], corp:[Δ, v]}` with exactly the rounding `daySummary()` uses today; `daySummary()` formats the log line from it (output unchanged). `endDay()` takes `const sum=daySum()` before advancing the day and passes it into the morning object: `saveGame({rep, ev, monday, sum})` and `showDay(rep, ev, monday, sum)`. Resume passes `m.sum`. Alternative: format the summary into a `rep` string; rejected because the user chose four figures.

### Morning report row

`showDay` renders, when `sum` is present, a `.daysum` grid under the title: a caption `ui.day.sum` ("第 {d} 天下班" / "Day {d} wrap-up") and four cells labelled KPI, 信任, 錢包, 公司 (existing `log.lab.*` keys), each with the signed change (`+24`, `-8`, `±0`; money with `nt()`, e.g. `-NT$120`) and the current value below. KPI and trust changes get `.ok` (gain) or `.bad` (loss); money cells are neutral. Four columns on desktop, two at ≤480px.

### Save compatibility

`sum` is an optional field of the morning object. `readSave` validation is unchanged (it only requires `morning.rep` to be an array), so older saves load and show the report without the row. `SAVE_VER` stays.

### `prefBill(v, is, m)` in `calc.js`

Returns `'seat'` when the player holds `v`'s seat, that option is usable in `bills(v, is)` (outsourced tickets block seats) and `quotaLeft('seat', v)` covers the quota estimate; else `'sub'` under the same conditions for the personal plan, except for a sensitive ticket (user decision after review, 2026-10-11: personal billing on a sensitive ticket risks the audit, so the default never moves it there); else `null`. The quota estimate is `costLine(kind, M, v, est(is, v, m)).hi` with a ticket, and `0` (any quota left) without one. Local vendors return `null`.

Called from the vendor click handler in `main.js` only when the clicked vendor differs from `sel.v` (after the existing local switch), and once in the setup modal's confirm when the run starts (not on Monday adjust), with `is = null`. A `null` result leaves `sel.b` unchanged.

## Implementation Contract

- Ending day 3 with the baseline KPI 37/trust 70/wallet 7,360/company 11,310 and end values 61/62/7,240/10,900: the day-4 morning report shows cells `+24`/`61`, `-8`/`62`, `-NT$120`/`NT$7,240`, `-NT$410`/`NT$10,900` with trust `-8` styled as a loss; the save's `morning.sum` has the same numbers; resuming that save shows the same row; a save whose morning lacks `sum` resumes without the row and without error; the log line is byte-identical to before.
- With an Anthropic Pro plan and a ticket selected on Google Gemini Pro / 公司 API, clicking Sonnet sets billing to 個人訂閱; with an approved Anthropic seat it sets 公司席位; with no plan and no seat it keeps 公司 API; clicking Opus after that (same vendor) keeps whatever billing is selected; a sub quota below the estimate does not select sub; an outsourced ticket never gets 公司席位 from this rule. Starting day 1 with an Anthropic plan selects 個人訂閱 for the default Sonnet selection.
- `node tools/check.js` passes; fixed-seed simulator output unchanged (`SIM_N=100 SIM_SEED=101 node tools/sim.js` before and after; the simulator sets billing itself).
- Out of scope: Non-Goals.

## Risks / Trade-offs

- [Auto-selecting a subscription on a sensitive ticket would add audit risk the player did not choose] → sensitive tickets only get the seat default; review raised it and the user chose to exclude subscriptions for them.
- [Players who prefer 個人 API must re-pick it after switching vendors] → same-vendor model changes and ticket changes keep their choice.
