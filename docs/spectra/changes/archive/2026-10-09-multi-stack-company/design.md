## Context

`S.company` in `public/js/game.js` is a single stack key from `COMPANIES` (`laravel`, `rails`, `rust`, `app`). It drives `pickStack()` (75/15/10 split), incident tickets in `makeIssue()`, `unfamiliar()`, `INV_STACKS()` ordering, the header and intro text, the day-1 log, the month-end title and the best-score key in `showEnd()`. `fresh()` keeps it across runs and falls back to `laravel`. `showSetup()` renders one button per company with `data-company` and stores the choice in `draft.company`. `tools/check.js` and `tools/sim.js` set `S.company` directly.

## Goals / Non-Goals

**Goals:**

- Let a run have one or two primary stacks with a predictable ticket mix.
- Keep single-stack runs identical to today, including their best-score keys.
- Measure every two-stack combination so balance outliers are visible.

**Non-Goals:**

- No three- or four-stack selection.
- No "primary vs secondary" weighting; selected stacks are equal.
- No combined difficulty rating; each company button keeps its own stars.
- No change to per-ticket stack effects (convention bonus, Rust/App time, KPI compensation, store review).
- No company change from the weekly subscription modal.

## Decisions

### Selected stacks state

Replace `S.company` with `S.companies`, an array of one or two distinct keys from `COMPANIES`, always kept in `COMPANIES` order (laravel, rails, rust, app) so keys and names are stable regardless of click order. `fresh()` accepts the previous array when valid, accepts a legacy string value as a one-element array, and otherwise falls back to `['laravel']`.

Alternative considered: keep `S.company` as the first pick plus `S.extra`. Rejected — two fields for one concept, and every consumer would need to merge them.

### Selection UI in the setup modal

The company buttons become toggles. Clicking an unselected company adds it when fewer than two are selected; when two are selected, unselected buttons are disabled. Clicking a selected company removes it unless it is the only one. The section label reads `公司（可選 1–2 條主技術線）`. Changing the selection re-rolls day-1 tickets with `firstIssues()` on confirm, as today.

Alternative considered: replacing the earliest pick when a third is clicked. Rejected — silent replacement is surprising; a disabled button with the label explains the limit.

### Ticket distribution with several selected stacks

`pickStack()`: with probability 0.75 a uniformly chosen selected stack; 0.15 `fe`; 0.10 a uniformly chosen unselected company stack. Incident tickets use a uniformly chosen selected stack. `unfamiliar(is)` is true when `is.stack` is not in `S.companies` and is not `fe`.

### Company name and best-score key

`companyName()` joins `STACKS[k].company` of the selected stacks with `＋` (e.g. `Laravel 新聞站＋App 團隊`) and is used by the header, intro, day-1 log and month-end title. `bestKey()` returns `tokgame-best-<mode>-<keys joined by +>`; for a single stack this equals today's key, and the legacy `tokgame-best-<mode>` fallback still applies only to a single `laravel` selection.

### Investment stack order

`INV_STACKS()` returns the selected stacks (in `COMPANIES` order), then the unselected company stacks, then `fe`.

### Measuring combinations in the simulator

`tools/sim.js` gains `SIM_COMBOS=1`, which runs the six two-stack combinations instead of the four single stacks and reports each against the same mode's single-Laravel mean measured in the same invocation. Without it, output is unchanged except that the auto-player sets `S.companies`. With `SIM_INVEST=1`, the auto-player buys CLAUDE.md for each selected stack before 補測試 and 導入 SDD.

Balance target: every two-stack combination in parallel mode within ±25% of single Laravel (the existing company target). Serial mode has no target; record the numbers. If a combination falls outside the target, record it and raise it with the player rather than adding new rules in this change.

## Implementation Contract

**In scope:** `S.companies` state and migration from a stored string, toggle selection UI with a two-stack limit, distribution/incident/unfamiliar rules, `companyName()` everywhere the company name is shown, `bestKey()`, investment ordering, `tools/check.js` assertions, `tools/sim.js` `SIM_COMBOS`, measured numbers in `docs/CLAUDE.md`.

**Out of scope:** three or more stacks, weighting between selected stacks, combined difficulty stars, new balance rules for combinations.

**Acceptance:**

- `node tools/check.js` exits 0 with assertions for: selection toggling and the two-stack limit; migration from a string and fallback for invalid values; distribution of 10,000 tickets for laravel+app (each about 0.375, fe about 0.15, rails and rust about 0.05 each); incidents only from selected stacks; unfamiliar only for unselected non-fe stacks; header and receipt showing `Laravel 新聞站＋App 團隊`; single-stack best key unchanged and pair key `tokgame-best-parallel-laravel+app`; CLAUDE.md button order.
- `node tools/sim.js` and `SIM_COMBOS=1 node tools/sim.js` both finish; the combination table is recorded.
- Manual: the setup modal at 400px shows disabled unselected buttons when two are selected, in light and dark themes.

## Risks / Trade-offs

- [Two stacks dilute CLAUDE.md investments, one stack concentrates them] → intended trade-off; measured via `SIM_COMBOS=1 SIM_INVEST=1`.
- [Pairing an easy stack with Rust or App lowers difficulty versus single Rust or App] → combinations are reported against single Laravel; outliers are recorded and raised rather than patched here.
- [Old best scores under single keys] → single selections keep their keys, so nothing is lost.

## Migration Plan

Static site; deploy by pushing to `main`. The only stored data are best-score keys, which keep their single-stack names. Rollback is reverting the commit.

## Measured Balance (2026-10-09)

`SIM_COMBOS=1 SIM_N=100` (300 runs per cell), run twice; each two-stack combination's mean versus single Laravel of the same mode in the same run:

| Combination | Parallel (run 1 / run 2) | Serial (run 1 / run 2) |
|---|---|---|
| Laravel+Rails | +0.9% / −0.5% | −0.2% / +0.5% |
| Laravel+Rust | +0.5% / −1.3% | −19.1% / −24.2% |
| Laravel+App | +2.3% / +2.1% | −15.6% / −14.0% |
| Rails+Rust | −2.3% / −0.0% | −24.8% / −22.0% |
| Rails+App | +1.6% / +1.8% | −13.5% / −17.6% |
| Rust+App | +0.9% / +0.6% | −34.9% / −35.5% |

Every parallel combination is within ±3% of single Laravel, well inside the ±25% target, so nothing is flagged. Serial combinations with Rust or App land between single Laravel and single Rust/App, as expected; serial has no target.

## Manual Check (2026-10-09)

Chrome, 400px-wide same-origin iframes in light and dark themes: after adding App 團隊 to Laravel 新聞站, Rails SaaS and Rust 基礎設施 render disabled (opacity 0.42 from the global disabled style), both selected buttons are highlighted, the intro reads 任職於「Laravel 新聞站＋App 團隊」, and the page width is 383px within a 398px viewport. The 技術線 bullet in the setup rules list was updated to describe choosing 1–2 stacks.

## Open Questions

(none)
