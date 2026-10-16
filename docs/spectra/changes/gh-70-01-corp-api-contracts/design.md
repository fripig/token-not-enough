## Context

`VENDORS` in public/js/data.js marks Anthropic and Google with `corp:true`; `bills()` in public/js/calc.js reads `V.corp` to enable 公司 API, and the rules modal (`rulesTab('billing')` in public/js/rules.js) lists vendors with `VENDORS[v].corp`. The only other reader is the `agent-catalog` check. Opening toggles (outsourcing, advanced mode, usage challenge) follow one pattern: a field on `S` that `fresh()` carries over from the previous run with validation, a copy in the modal `draft`, a `.sec` block of `.sb` buttons in `showSetup`, assignment on confirm, a GA common parameter in `track()`, and a `??=` fallback in `loadGame`.

## Goals / Non-Goals

**Goals:**

- Player picks any subset of Anthropic, OpenAI, Google as company-contracted vendors at the start of a run; default Anthropic + Google.
- Company API availability, rules text, GA and the setup log follow that choice.

**Non-Goals:**

- Contracts for Chinese vendors or local models (they stay personal-pay only; user choice).
- Tying team seats to the contract list (user choice: seats unchanged).
- Separate best-score keys or grade thresholds per contract set (user choice).
- Changing contracts mid-run (weekly modal does not show it).
- Rebalancing. No numbers change; the default reproduces today's game.

## Decisions

### Store the list on `S.corpApi`, drop `VENDORS[v].corp`

`S.corpApi` is an array of vendor keys in the fixed order of new constant `CORP_VENDORS = ['anthropic','openai','google']`; new constant `CORP_DEFAULT = ['anthropic','google']`; new `normCorp(x)` returns `x` filtered and reordered to `CORP_VENDORS` when `x` is an array whose every entry is in `CORP_VENDORS` with no duplicates, else a copy of `CORP_DEFAULT`. An empty array is valid. New helper `corpOk(v) = S.corpApi.includes(v)` in calc.js. Alternative kept-the-flag-and-overwrite-at-start was rejected: mutating a shared data table per run is the kind of hidden state the module rules avoid, and two sources would drift.

### Toggle buttons, not a radio set

The section reuses the stack-picker look: three `.sb` buttons with `data-corp="<vendor>"`, each toggles membership; no minimum. Button `small` text: selected → 走部門預算, unselected → 公司沒簽約 (reusing `bill.dept` / `bill.noContract`). Placed after the outsourcing section and before 進階模式, since it is about who pays.

### Usage challenge with no contracts

`burnStat()` adds company spend and remaining budget only when `S.corpApi.length > 0`. Without contracts the budget can only buy investments, which `quota-burn` already says do not count as usage; counting the leftover as unused would make "no contracts" an unwinnable burn setup. With at least one contract the formula is unchanged.

### GA parameter name `corp_api`

Value is `S.corpApi.join('+')` or `none` when empty, mirroring `companies`. Added in `track()` so every event carries it, like `burn`.

## Implementation Contract

**Data shape:** `S.corpApi: string[]`, subset of `CORP_VENDORS` in that order. `fresh()` sets `corpApi: normCorp(S?.corpApi)`. `loadGame` always sets `S.corpApi = normCorp(S.corpApi)`, so a missing or broken value (undefined, null) loads as the default. `SAVE_VER` unchanged.

**Opening modal (`showSetup` without `adjust`):** section label 公司 API 合約 with hint 公司有簽約的廠商才能走公司 API；都不勾就是公司不出 AI 的錢（預算只剩工程投資用）。 `draft.corpApi` starts from `S.corpApi`; clicking toggles; confirm assigns `S.corpApi = normCorp(draft.corpApi)` before `prefBill` runs and before `track('game_start')`. Changing only this does not call `firstIssues()` or `addGigs()`. The weekly modal (`adjust`) renders no such section.

**Billing:** `bills(v, is)` makes 公司 API `ok` only when `corpOk(v) && S.corp > 0`; note 公司沒簽約 when `!corpOk(v)`, else 預算用完 / 走部門預算 as today. Local stays local-only. Everything downstream (`billOk`, `presetBlock`, `prefBill`, `rvPrefBill`, dispatch panel fallback) already reads `bills()` and needs no change.

**Rules modal:** billing tab's 公司 API line lists `S.corpApi` vendor names joined by the list separator; when empty it reads 這局公司沒有簽任何廠商 (en: no vendor contracted this run).

**Setup log line:** `log.setup.mode` gains a `{corp}` part: `・公司 API：Anthropic、Google` or `・公司 API：無` (en `· company API: Anthropic, Google` / `none`).

**GA:** every event has `corp_api`.

**i18n keys (both dictionaries):** `ui.setup.corp`, `ui.setup.corpHint`, `rules.bill.corpNone`, `log.setup.corpPart`, `log.setup.corpNone`, `news.gh-70-01`. `ui.setup.r.corp` reworded to say the contracted vendors are chosen below.

**Acceptance:**

- `node tools/check.js` passes, including new `tools/check/corp-api-contracts.test.js` and updated agent-catalog, billing-methods, play-analytics, quota-burn checks.
- `SIM_SEED=101 node tools/sim.js` output is byte-identical to `main` before the change (default contract list = today's behavior).
- Opening the page locally, unticking Anthropic and ticking OpenAI: Sonnet's 公司 API button is disabled with 公司沒簽約, Sol's is enabled.

**In scope:** the setting, billing availability, rules text, setup log, GA, burn adjustment, save fallback, What's New, DESIGN.md update.
**Out of scope:** seats, Chinese vendors, simulator flags, best-score keys, grades, weekly changes.

## Risks / Trade-offs

- [Unticking Anthropic disables default presets B and C (both Anthropic + 公司 API)] → Existing behavior: the one-click button shows the reason and batch dispatch skips to the next preset. Accepted; players can re-save presets.
- [Contracting OpenAI makes Codex Sol on company money available, which was never balanced] → Player-chosen scenario with no score separation; not measured. Recorded in DESIGN.md as unmeasured.
- [Old saves] → default fill reproduces the old behavior exactly.

## Migration Plan

Ships with a normal push to `main`. Rollback is a revert; saves written by the new version keep an extra `corpApi` field that older code ignores.

## Open Questions

None.
