## Context

The game lives in seven ES modules under `public/js/` (split by the archived change `split-game-modules`). Company tickets come from `makeIssue(inc)` in `state.js`: `endDay()` in `actions.js` adds 3–6 (parallel) or 2–4 (serial) per day and `firstIssues()` in `main.js` adds 4 on day 1. The setup modal's confirm handler in `showSetup()` (`modals.js`) calls `firstIssues()` again only when the company selection changed. Billing options come from `bills(v)` in `calc.js`, which marks 公司 API unusable when the vendor has no contract or the budget is gone and offers 公司席位 only for the approved seat vendor (Anthropic, OpenAI or Google, per `SEAT.vendors`). `dispatchPanel()` in `view.js` auto-corrects `sel.b` to the first usable bill, and `presetBlock()` in `calc.js` reports a bill's note when it is not usable; `presetFor()` drives one-click dispatch (`quick()`) and batch dispatch (`batch()`). `dispatch()` itself does not re-check billing. `settle()` in `actions.js` adds `is.kpi` to `S.kpi` on success, and on a parallel-mode merge conflict rewrites the ticket in place with `Object.assign` into a `merge:true` 解決衝突 ticket, keeping every field it does not overwrite. `endDay()` turns overdue tickets into KPI and trust penalties. `showEnd()` in `modals.js` computes personal spend as `S.st.subFee+S.st.api`. `banOf()` in `data.js` combines the client ban with the company-wide `S.cnBan`; the ticket card in `view.js` shows a 禁中國雲端 chip whenever `S.cnBan` is set and the client has no ban.

## Goals / Non-Goals

**Goals:**

- Make outsourcing an opt-in risk/reward: cash for personal tokens and time, no company money.
- Keep company tickets and every existing rule unchanged when the toggle is off.
- Define how gigs interact with features added after this change was first written: merge-conflict tickets, OpenAI/Google seats, one-click and batch dispatch, engineering investments.
- Measure the effect of turning outsourcing on.

**Non-Goals:**

- No manager reaction to side gigs (no trust effect either way).
- No outsourced incidents, sensitive code or audits.
- No separate title pools for outsourced tickets; they reuse each stack's pools.
- No change to presets other than the new billing reason.
- No gig-specific investment rules; investments apply unchanged.
- No new score term; outsourcing enters the score only through personal spend.

## Decisions

### Outsourcing toggle in the setup modal

`S.outsource` (boolean, default false) is kept across `fresh()` like `S.slots`; any non-boolean stored value becomes false. The setup modal (`showSetup(false)`) shows a section `外包` with two buttons `不接外包` / `接外包` (`data-out="0|1"`, stored in `draft.outsource`), with a one-line explanation, placed after the company picker. The weekly modal (`showSetup(true)`) does not show it. On confirm, the handler first sets `S.outsource` and then applies the company change (which may call `firstIssues()`); this order matters because `firstIssues()` calls `addGigs()`, which reads `S.outsource`. If the toggle changed and `firstIssues()` did not run, it removes day-1 gigs and, when on, adds `rnd(3)` new ones. Company tickets are not re-rolled by the toggle alone.

Alternative considered: a fifth company button. Rejected — the player chose a separate toggle so it does not use one of the two stack slots.

### Outsourced ticket generation

`makeIssue(inc, st)` takes an optional stack; `makeGig()` in `state.js` picks a stack uniformly from laravel, rails, rust, app, fe (`GIG_STACKS`) and calls `makeIssue(false, stack)`, so the title (with the existing trap-title rule), store review and Rust/App due and KPI compensation all follow that stack exactly as for company tickets. It then overrides `out:true`, `sens:false` and `client` = `{name:'外包案主',ban:null}` (`GIG_CLIENT`). `pay = kpi × GIG_PAY` with `GIG_PAY = 80` (started at 100; lowered after measurement, see below). With outsourcing on, `firstIssues()` and `endDay()` each add `rnd(3)` (0–2) gigs after company tickets. `makeGig` and the constants are exported per the module rule; it is only called from functions, never at load time.

### Billing restriction for outsourced tickets

`bills(v, is)` takes the ticket; for `is.out`, the `corp` bill gets `ok:false` with note `外包不能用公司資源`, and the `seat` bill (for whichever vendor holds the approved seat) gets the same. `dispatchPanel()` and `presetBlock()` pass the ticket, so the auto-correct, `quick()` and `batch()` all skip company billing with that reason; `batch()` needs no change of its own because it already counts a ticket with no usable preset as skipped. `dispatch()` and `evaluate()` refuse (no-op) when the selected bill is not usable for the ticket, so no path can bill company money for a gig. `banOf()` returns the client ban only (ignores `S.cnBan`) for outsourced tickets, and the card's company-ban chip is shown only for non-gig tickets, because the company policy covers company code.

### Pay, late penalty and receipt

On success, `settle()` adds `is.pay` to `S.wallet` and `S.st.outIncome`, increments `S.st.outDone`, adds no KPI or trust, and logs `✓ … ｜外包收入 NT$<pay>`. In `endDay()`, an overdue gig costs `Math.round(pay × GIG_LATE)` with `GIG_LATE = 0.3` from the wallet, added to `S.st.outPenalty`, increments `S.st.outLate`, and changes neither KPI nor trust; it is not counted in `S.st.late`. `showEnd()` computes personal spend as `subFee + api + outPenalty − outIncome`; the receipt adds 外包收入, 外包違約金, 外包完成 and 外包逾期 lines when outsourcing was on. `rescope()` returns without effect for gigs and the dispatch panel hides its button. Gig cards show an `外包` chip and `NT$<pay>` in place of `+<kpi>`.

### Merge conflicts keep the gig

The merge-conflict branch of `settle()` overwrites title, complexity, base and trap fields only, so `out` and `pay` carry over to the 解決衝突 ticket without code change. Pay is not recomputed from the lower complexity, matching how company conflict tickets keep their KPI. The billing restriction, pay on success and late penalty then follow from `is.out`. `tools/check.js` asserts this so a later refactor of the conflict branch cannot drop the fields silently.

Alternative considered: dropping a conflicted gig. Rejected — company tickets keep their reward through a conflict, and gigs should behave the same.

### Engineering investments apply to gigs

CLAUDE.md, 補測試, skills, MCP 文件 and SDD affect gigs exactly as company tickets; `est()`, `catchRate()`, `conflictRate()` and `invHint()` need no gig branch. The player chose this (2026-10-09) over excluding repo-specific investments, treating it as habits the engineer carries to side work.

### Measuring outsourcing in the simulator

`tools/sim.js` gains `SIM_OUTSOURCE=1`, which sets `S.outsource=true` for every run. The auto-player already dispatches the first free ticket; for gigs it bills personal API (DeepSeek when allowed, otherwise Sonnet on personal API) instead of the subscription-or-company choice it makes today. Compare each mode × company mean with and without the flag; `SIM_SEED` can be used to make a pair of runs reproducible.

Balance target (parallel mode): turning outsourcing on changes the auto-player's mean between −5% and +15% for every company. Outside that range, retune `GIG_PAY` first, then the daily count. Serial mode has no target; record the numbers.

Measured (2026-10-09, `SIM_N=100`, 300 runs per cell, two independent runs each; mean with `SIM_OUTSOURCE=1` ÷ mean without, minus 1):

| Mode × company | `GIG_PAY = 100` | `GIG_PAY = 80` (final) |
| --- | --- | --- |
| parallel laravel | +14.8% / +18.4% | +11.3% / +11.3% |
| parallel rails | +16.3% / +14.0% | +10.5% / +9.1% |
| parallel rust | +10.6% / +10.3% | +6.4% / +4.9% |
| parallel app | +10.9% / +7.4% | +5.5% / +2.5% |
| serial laravel | −19.9% / −22.1% | −30.3% / −28.3% |
| serial rails | −25.1% / −24.3% | −29.8% / −29.6% |
| serial rust | −37.2% / −41.9% | −44.6% / −51.7% |
| serial app | −37.0% / −35.9% | −40.9% / −44.5% |

At 100, two parallel cells exceeded +15%, so the player chose 80 (2026-10-09); every parallel cell is then inside the target and the daily count was not changed. The score formula floors `8000 − personal spend` at −4000 but has no ceiling, so outsourcing income raises the score directly; `GIG_PAY` is what bounds it. In serial mode the auto-player takes gigs in queue order and they crowd out company tickets, so every serial cell drops; serial has no target and these numbers are recorded as they are.

## Implementation Contract

**In scope:** toggle and persistence, `makeGig()` and daily generation, billing restriction in `bills`, `dispatchPanel`, `presetBlock`, `dispatch`, `evaluate`, China-ban exemption including the card chip, pay and late penalty, merge-conflict carry-over, personal-spend formula, receipt lines, card chip and pay display, no re-scoping for gigs, `tools/check.js` assertions, `tools/sim.js` `SIM_OUTSOURCE`, rules, code map and measured numbers in `docs/DESIGN.md`.

**Out of scope:** manager reactions to gigs, gig-specific titles or events, gig-specific investment effects, new score terms, changes to the existing 外包案尾款 event.

**Acceptance:**

- `node tools/check.js` exits 0 with assertions for: toggle default off, persistence and invalid fallback; no gigs when off; 0–2 gigs per day when on and on day 1; gig stack frequencies about 0.2 each over 5,000 gigs; gigs never incident or sensitive; unfamiliar rule on gigs; corp and seat unusable with reason 外包不能用公司資源 in the dispatch panel and presets; batch dispatch skipping a gig when every preset bills the company; `dispatch()` refusing company billing for a gig; China ban not applied to gigs and no 禁中國雲端 chip on them; pay NT$480 for a complexity 2 laravel gig and NT$640 for a complexity 2 rust gig (KPI round(6 × 1.3) = 8); no KPI on success; a conflicted gig's 解決衝突 ticket keeping `out` and pay; late penalty 30% with no KPI or trust change; personal spend formula; receipt lines; no re-scope button on a revealed gig trap.
- `node tools/sim.js` and `SIM_OUTSOURCE=1 node tools/sim.js` both finish; the comparison is recorded.
- Manual: a gig card at 400px in light and dark themes shows the 外包 chip and pay without horizontal scroll.

## Risks / Trade-offs

- [Gigs add queue clutter and choice load] → at most 2 per day, opt-in.
- [Income lowers personal spend below zero and inflates score] → bounded by the measurement target; `GIG_PAY` is the tuning knob.
- [Investments make gigs cheaper with company money] → accepted by the player; the effect shows up in the `SIM_INVEST=1` × `SIM_OUTSOURCE=1` numbers if measured.
- [The auto-player cannot judge which gigs are worth taking] → the measured number is a rough lower bound on value; recorded as such.

## Migration Plan

Static site; deploy by pushing to `main`. No stored data changes; the toggle defaults to off. Rollback is reverting the commit.

## Open Questions

(none)
