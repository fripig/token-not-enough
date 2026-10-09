## Context

All UI is drawn as HTML strings. The overlay is one pair of nodes, `ov` (backdrop) and `mo` (modal box); every modal function (`showSetup`, `showDay`, `showResume`, `showBadSave`, `showEnd`) writes `mo.innerHTML`, assigns `mo.onclick` and sets `ov.hidden=false`. Only one modal exists at a time. In-game buttons are handled by the click delegation on `app` in public/js/main.js using `data-*` attributes. The overlay covers `app`, so a header button can only be clicked when no modal is open.

The opening setup modal (`showSetup(false)`, also used as `showSetup(true)` for 週一調整訂閱) keeps the player's unsaved choices in the module-level `draft` and redraws through a local `draw()` closure; its `mo.onclick` handler calls that closure.

Many rule numbers are already named constants (`REVIEW`, `EFFORT`, `INVEST`, `HW`, `SEAT`, `BASE`, `KPI`, `TRAP_STOP`, `EVAL_TK`, `RESCOPE_TRUST`, `INC_RATE`, `INC_RAMP`, `REVIEW_LOAD`, `GIG_PAY`, `GIG_LATE`, `MONITOR_LATE` and others). Some are inline literals: the success-rate steps in `est`, the audit odds and audit trust penalty in `auditOdds`/`auditRoll`, the overdraft penalty in `checkOverdraft`, the company daily limit and penalty and the late penalties in `endDay`, and the score weights and grade thresholds in `showEnd`.

## Goals / Non-Goals

**Goals:**

- A tabbed rules modal reachable from the in-game header at any time no other modal is open, and from the setup modal.
- Rule numbers in the modal come from the same constants the game logic uses.
- Closing the rules modal returns to the setup modal unchanged when opened from there.

**Non-Goals:**

- No change to any rule or number; lifting literals into constants keeps every value.
- No rules entry in the morning report, resume, bad-save or month-end modals (user chose header + setup modal only).
- The existing short rules list in the setup modal stays as it is; trimming it is a separate decision.
- No GA event for opening the rules modal.
- The rules do not adapt to the current run's settings; every tab shows all rules, with mode-specific lines labeled (平行模式, 進階模式, 接外包).
- No keyboard shortcut or click-outside-to-close; the existing modals have neither.
- No vendor/model catalog table: the dispatch panel already shows each model's ability, price and speed.

## Decisions

### Rules content lives in a new module rules.js

The modal content is long string templates. Putting it in public/js/modals.js would push that module from 181 lines toward 300 and mix reference text with game flow. A new module public/js/rules.js exports `RULE_TABS` (tab ids and titles), `rulesTab(id)` (HTML string for one tab) and `showRules(back)`. Alternative considered: a static HTML block in public/index.html like the footer — rejected because it cannot read the game constants.

### Numbers are read from named constants, inline literals are lifted

`rulesTab` interpolates constants and never repeats a number as a literal. Literals the rules need are lifted into exported constants beside the code that uses them, with values unchanged:

| Constant | Module | Value | Replaces |
|---|---|---|---|
| `P_STEP` | calc.js | `[.95,.8,.5,.25,.1]` (gap ≥1, 0, −1, −2, lower) | the chain in `est` |
| `AUDIT_ODDS` | actions.js | `{base:.35, cn:.6}` | literals in `auditOdds` |
| `AUDIT_TRUST` | actions.js | `12` | `auditRoll` penalty |
| `OVERDRAFT_TRUST` | actions.js | `8` | `checkOverdraft` penalty |
| `CORP_DAY_LIMIT`, `CORP_DAY_TRUST` | actions.js | `1500`, `6` | `endDay` daily-spend check |
| `LATE_TRUST`, `INC_LATE_TRUST` | actions.js | `4`, `8` | `endDay` late penalty |
| `SCORE` | modals.js | `{kpi:10, trust:4, spendBase:8000, spendDiv:8, spendFloor:-4000, audit:80}` | `showEnd` score formula |
| `GRADES`, `PAR_GRADE` | modals.js | `[4600,3800,3000,2200]`, `1.6` | `showEnd` grade thresholds |
| `START.hours`, `EVENT_RATE`, `OVERNIGHT_HRS` | state.js, actions.js | `8`, `.55`, `3` | daily hours in `fresh`/`endDay`, event roll, overnight progress |
| `CATCH`, `REVEAL`, `BIG`, `RETRY`, `MANUAL_HRS`, `UNFAMILIAR_HRS`, `STACK_HRS`, `STORE_RATE`, `INC_KPI`, `HARD_KPI`, `LATE_KPI`, `CONFLICT`, `CI_CONFLICT`, `PR_HRS`, `PR_REVIEWED`, `EVAL_HRS`, `MCP_EVAL_HRS`, `RESCOPE`, `SEAT.review` | data.js | unchanged values | `catchRate`, `revealRate`, `est`, `manualHrs`, `stackHrs`, `makeIssue`, `endDay`, `conflictRate`, `prHrs`, `evalCost`, `rescope`, seat review (added during apply: the tabs needed them too) |

Structural bounds — the 20 working days, the 5-day week, complexity ranges, the ability-4 threshold, 0–2 gigs a day — stay as text in the rules tabs; they are game structure rather than balance knobs.

Behavior equivalence is checked by running `SIM_SEED=1 SIM_N=5 node tools/sim.js` (plus seeded runs with `SIM_INVEST=2 SIM_OUTSOURCE=1 SIM_EFFORT=1` and `SIM_SEATS=3 SIM_HW=1`) before and after the lift and comparing output byte for byte. Alternative considered: keep literals and hard-code the same numbers in rules.js with check.js assertions tying them — rejected because two copies is exactly the drift the user wants to avoid.

### Tabs and their content

Six tabs, in order: `basic` 基本, `dispatch` 派工與成功率, `billing` 付費與稽核, `tickets` 工單與陷阱, `invest` 投資與電腦, `score` 結算. Content per tab (each is short bullet lines plus at most two small tables):

- 基本: 20 days, 5-day weeks, 8 hours a day; starting wallet, company budget, trust (from `fresh()` values via a new exported `START` constant in state.js, `{wallet:8000, corp:12000, trust:70}`, used by `fresh()`); Monday quota reset and subscription change rule; single-line vs parallel mode (slot choices from `SLOT_CHOICES`, PR review time `cx × 0.2` and `REVIEW_LOAD`, merge conflict 0.1 per other running agent); 進階模式 effort table from `EFFORT`.
- 派工與成功率: success table from `P_STEP`; big-codebase ±8%; `REVIEW` table (token, time, catch rate formula); stack effects (framework +1 at cx ≤3, borrow checker, time multipliers from `stackHrs` values, App store review with `STORE_REJECT`); failure retry discount; presets A/B/C and 一鍵派工.
- 付費與稽核: the five billing methods; company API daily limit `CORP_DAY_LIMIT`/`CORP_DAY_TRUST`, overdraft `OVERDRAFT_TRUST`; audit odds `AUDIT_ODDS` and `AUDIT_TRUST`; team seats (`SEAT.trust`, `SEAT.day`, 5-day review); client bans (金融客戶 bans Chinese cloud, 政府標案 bans Chinese weights too, company-wide ban event).
- 工單與陷阱: complexity 1–5 with `BASE` and `KPI` table; incident tickets (`INC_RATE`, `INC_RAMP`, KPI ×1.6, due same day); late penalty (`LATE_TRUST`, `INC_LATE_TRUST`, half KPI); unfamiliar stack ×2 hand-writing; traps (`TRAP_RATE`, `TRAP_STOP`), 評估架構 (`EVAL_TK`, reveal rate formula), 找主管 (`RESCOPE_TRUST`); outsourcing (`GIG_PAY`, `GIG_LATE`, personal billing only).
- 投資與電腦: one table built from `md` followed by `INV_KEYS` over `INVEST` (name, hours, cost, effect text from `INVEST[k].desc`; 寫 CLAUDE.md is noted as once per stack); hardware table from `HW_KEYS` over `HW` (name, `price` text, `trust` threshold, `days` to delivery, `desc`), plus `HW_REQ_HRS`, plus `HW_IDLE` idle penalty.
- 結算: score formula from `SCORE`; grade thresholds from `GRADES` with parallel ×`PAR_GRADE`; best score per mode × work content; save slot (day-start save, reload rewinds to the morning).

`INVEST[k].desc` and `HW[k].desc` are the same texts the investment panel shows; the rules tab reuses them rather than writing a second description.

### Returning to the setup modal by redrawing

`showRules(back)` takes an optional callback. When opened from the header, `back` is absent and closing sets `ov.hidden=true`. When opened from `showSetup`, the setup handler passes a callback that calls `draw()` again and reassigns its own `mo.onclick` — implemented by moving the handler assignment into a named function inside `showSetup` so it can be reattached. Because `draft` is module state and untouched by the rules modal, the player's choices survive. Alternative considered: saving `mo.innerHTML` and `mo.onclick` and restoring them — works too, but redrawing through `draw()` keeps one rendering path.

### Selected tab is remembered for the page session

A module variable in rules.js keeps the last opened tab; the first open in a page load shows 基本. Not saved to `localStorage` or the save slot.

### Header button placement

The header gets a `<button class="btn ghost" data-act="rules">規則</button>` after the calendar; `.top` already wraps with `flex-wrap`, so on 400px width it falls onto its own line. The setup modal gets the same `data-act="rules"` button text 看完整規則 right after the short rules list (in `showSetup(true)` it sits under the lead sentence).

## Implementation Contract

- Behavior: during play, a 規則 button is visible in the header; clicking it opens a modal titled 遊戲規則 with six tab buttons (`data-rtab="<id>"`) and a 關閉 button (`data-act="close"`). Clicking a tab redraws the modal with that tab selected (`class="sb sel"`) and its content. In the setup modal (opening and Monday), a 看完整規則 button opens the same modal; its 關閉 returns to the setup modal showing the same draft selections (work content, mode, slots, outsource, advanced, plans, seat).
- Interface: `RULE_TABS` = array of `{id,title}` in the order above; `rulesTab(id)` returns an HTML string; `showRules(back?)`; new exported constants listed in the Decisions table plus `START` in state.js.
- Failure modes: an unknown tab id falls back to `basic`. No storage access, so nothing can throw.
- Acceptance: tools/check.js asserts (a) the header HTML after `render()` contains `data-act="rules"`; (b) `showRules()` draws six `data-rtab` buttons in order and `basic` selected; (c) clicking each tab via `els.mo.onclick` selects it; (d) a sample of numbers appears and follows the constants — the 結算 tab contains each `GRADES` value and `GRADES[0]*PAR_GRADE`, the 付費與稽核 tab contains `CORP_DAY_LIMIT` formatted with `nt()`, the 投資與電腦 tab contains every `INVEST[k].name` and every `HW[k].name`; (e) opening from `showSetup(false)` after toggling 接外包 and clicking 關閉 leaves `els.mo.innerHTML` with `data-out="1"` selected and `els.ov.hidden===false`; (f) opening from the header and closing sets `els.ov.hidden===true`. `node tools/check.js` exits 0. `SIM_SEED=1 SIM_N=5 node tools/sim.js` output is identical before and after the constant lift.
- Scope in: rules.js, header button, setup-modal button, constant lift, CSS for the tab bar, check.js assertions, docs/DESIGN.md updates.
- Scope out: everything listed under Non-Goals.

## Risks / Trade-offs

- [Rules text describes behavior in words that can still drift when logic changes without changing a constant] → docs/DESIGN.md gains a line that rule changes must update public/js/rules.js; check.js covers the numeric parts.
- [The constant lift touches files with uncommitted gh-18-01 edits] → apply only after gh-18-01 is committed, as the proposal states.
- [Long tables on 400px phones] → tables use the existing small-table styles from the month-end modal and scroll inside the modal box, which already scrolls.
