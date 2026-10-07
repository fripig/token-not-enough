## Context

The game lives in public/js/game.js as one script: data tables at the top (VENDORS, CLIENTS, BASE, KPI, POOL), a single state object S created by fresh(), a pure estimate function est(is, v, mid, rv), a settle(j, o) function that applies every cost and outcome, full-page re-rendering through render(), and modals built by showSetup, showDay and showEnd. Ticket titles come from POOL, keyed by complexity 1 to 5 plus `inc`, and are all drawn from a Laravel news-site backend. The opening text in showSetup says the player is a Laravel team engineer. Best scores are written to localStorage under `tokgame-best-<mode>`. tools/sim.js evals game.js with a fake DOM and plays automated months.

All numbers in the game are invented balance values, and the page footer says so. That rule continues here: stack effects describe properties of the stack, not measured vendor performance.

## Goals / Non-Goals

**Goals:**

- The player picks one of four companies at the start of a run, and that choice changes which tickets arrive.
- Ticket variety grows to five stacks (Laravel, Rails, Rust, App, front-end) without changing the existing vendor, billing, client, review, or parallel-mode rules.
- A ticket's stack changes agent outcomes through stack properties only, and the player can see why before dispatching.
- Balance stays checkable with tools/sim.js for every company.

**Non-Goals:**

- Per-vendor or per-model skill ratings for a stack (for example "model X is better at Rust"). Rejected because the numbers would be invented and could be read as a real benchmark.
- A player skill tree or role selection beyond the company choice.
- Changing the company in the middle of a run; the weekly plan adjustment screen does not offer it.
- New vendors, billing methods, or client types.
- Translating the UI out of Traditional Chinese.
- Introducing a front-end framework or build step. The user wants that decision made once the game is feature-complete; this change keeps the current render()-string and data-* delegation pattern and only records the evaluation signals in docs/CLAUDE.md.

## Decisions

### Company choice sets the primary stack

Add a `STACKS` table keyed by `laravel`, `rails`, `rust`, `app`, `fe`. The first four are companies; `fe` (front-end) is a shared stack that every company receives. Each entry holds a display name, the company name shown on the setup screen, a short effect description, and its ticket title pool. `S.company` holds the chosen key and, like `S.mode`, survives `fresh()` so "再玩一個月" keeps the last choice. Default company is `laravel`, so a player who does not touch the picker gets today's flavour.

Alternative considered: one mixed pool with no company choice. Rejected by the user in favour of a per-run choice, which gives each run a different feel.

### Ticket stack distribution

For non-incident tickets created by makeIssue: 75% primary stack, 15% `fe`, 10% one of the other three company stacks chosen uniformly. Incident tickets always use the primary stack's incident titles. These three shares are balance estimates; tools/sim.js output per company is the measurement that confirms or adjusts them.

### Unfamiliar stack doubles hand-writing time

A ticket is unfamiliar when its stack is neither the primary stack nor `fe` (the player is a full-stack engineer, so front-end counts as familiar). The manual action's hours become `cx × 2.2 × (retry discount) × 2` for unfamiliar tickets. Agent run time is unaffected by familiarity.

### Stack effects apply inside est and settle only

Effects are computed in est (success probability and hours) and settle (store review), so the dispatch panel estimate, the parallel-mode job timing, and the receipt stay consistent without extra plumbing.

| Stack | Success effect | Time effect | Post-success effect |
| --- | --- | --- | --- |
| laravel, rails | Convention bonus: for tickets with complexity 3 or lower, the capability gap used for the success table is raised by 1 | none | none |
| rust | Borrow checker: for models with capability below 4, the capability gap is lowered by 1 | agent hours × 1.2 (compile and test loop) | none |
| app | none | agent hours × 1.15 (simulator runs) | Store review: tickets flagged `store` fail after an otherwise successful run with probability 0.2 |
| fe | none | none | none |

The capability gap is the existing `diff = M.cap - is.cx` that selects 95/80/50/25/10% in est. The existing clamp to 5%–97% still applies after the stack effect. Token usage is not changed by stack. The shown success rate for store-flagged tickets is multiplied by 0.8 so the estimate includes the store-review risk.

The time multipliers were first set to × 1.4 (rust) and × 1.3 (app). tools/sim.js measured those values at −28.5% / −22.5% (parallel) and −67.1% / −57.7% (serial) mean score against Laravel (100 runs × 3 review levels per company and mode), so they were lowered to × 1.2 and × 1.15 together with the compensation below.

### Harder stacks pay more and allow more time

Non-incident rust and app tickets get one extra day before their due date (still capped at day 20) and a KPI reward × 1.3. Incident tickets keep their same-day due date; their KPI multiplier × 1.6 is multiplied by the stack multiplier. Rationale: the slower stacks lose throughput because both modes are time-bound, so the reward and the deadline compensate instead of removing the stack's identity.

Measured with `SIM_N=60 node tools/sim.js` (180 runs per company and mode) after this decision together with the × 1.2 / × 1.15 time multipliers: parallel rails −2.0%, rust −4.4%, app +6.1%; serial rails −0.6%, rust −33.8%, app −25.3% against Laravel.

Alternatives considered: keeping × 1.4 / × 1.3 with this compensation (measured serial rust −67.7%, app −50.5%); a smarter simulated player that sends rust tickets to a capability-4 model (serial rust got worse, −91.1%, because that model is slower).

### Difficulty label on company buttons

The remaining serial-mode gap is kept as intended difficulty and shown on the company picker: Laravel 新聞站 and Rails SaaS show 難度 ★, App 團隊 shows 難度 ★★, Rust 基礎設施 shows 難度 ★★★. The labels follow the measured serial-mode ordering above.

### Store review flag on app tickets

makeIssue sets `store: true` on app-stack tickets with complexity 2 or higher with probability 0.4 (estimate). A store-review failure is recorded with the note `卡在 App Store 審核被退件`, counts as a normal failure (tries++, base token discount 0.7), and is not recoverable by self-review because the review happens after the agent finishes. In parallel mode the PR review time is still spent before the store result, matching the existing order where review time follows success.

### Best score key per mode and company

The best-score key becomes `tokgame-best-<mode>-<company>`. When that key is empty and the company is `laravel`, the value of the legacy key `tokgame-best-<mode>` is used as the previous best, so existing players keep their record. The legacy key is never written again.

### Simulator covers every company

tools/sim.js loops over the four companies inside each mode and review level, sets `S.company` before play, and prints one summary line per company and mode with the mean score and the count of each grade, in addition to the existing sample lines.

## Implementation Contract

**Behavior**

- The opening setup modal shows a "公司" picker with four buttons (Laravel 新聞站, Rails SaaS, Rust 基礎設施, App 團隊), each with its difficulty label and a one-line description of its stack effect; the selected one is highlighted the same way as the mode picker. The intro paragraph says the player is a full-stack engineer at the selected company.
- The weekly "調整訂閱" modal does not show the company picker.
- The header subtitle and the month-end receipt title include the company name.
- Every ticket card shows a stack chip. Unfamiliar tickets additionally show a `不熟` chip. App tickets with the store flag show a `需上架審核` chip.
- The dispatch panel shows a hint line describing the selected ticket's stack effect whenever that stack has one (laravel/rails only when complexity ≤ 3, rust always, app always). The success rate and hours shown already include the effect.
- The manual button label shows the doubled hours for unfamiliar tickets.
- A store-review failure appears in the log with the note above.

**Interface / data shape**

- `STACKS[key] = { name, company, desc, pool: {1:[...],2:[...],3:[...],4:[...],5:[...],inc:[...]} }` for keys `laravel`, `rails`, `rust`, `app`; `fe` has the same shape and its `inc` list may be empty because incidents always use the primary stack.
- Each pool level holds at least 3 Traditional Chinese (Taiwan usage) ticket titles; the existing POOL titles become `STACKS.laravel.pool`.
- Issue objects gain `stack` (one of the five keys) and `store` (boolean).
- `S.company` is one of the four company keys.
- localStorage key `tokgame-best-<mode>-<company>`; every read and write stays wrapped in try/catch.

**Failure modes**

- If localStorage throws, the game runs without best scores, as today.
- An unknown or missing `S.company` falls back to `laravel`.

**Acceptance criteria**

- `node tools/sim.js` completes without exceptions for 2 modes × 3 review levels × 4 companies and prints a per-company summary.
- In that output, each company's parallel-mode mean score is within ±25% of the parallel Laravel mean. Serial mode has no threshold; its measured gaps are recorded in docs/CLAUDE.md next to the difficulty labels.
- Manual browser check at desktop width and at 400px width, light and dark theme: company picker, chips, hint line, and receipt render without overflow, and the console shows no errors.

**Scope boundaries**

- In scope: STACKS data and ticket pools, makeIssue stack assignment, est and settle stack effects, manual unfamiliar multiplier, setup/header/card/dispatch/receipt UI, best-score key, tools/sim.js, docs/CLAUDE.md and README.md (including a note on when to evaluate a framework refactor).
- Out of scope: any framework or build-step migration, vendor/model tables, billing, clients and China-model rules, review levels, parallel-mode rules, events, scoring formula and grade thresholds.

## Risks / Trade-offs

- [Rust or App runs become clearly harder than Laravel] → measured and partly compensated (see Harder stacks pay more and allow more time); the serial-mode remainder is labelled as difficulty instead of hidden.
- [Convention bonus makes Laravel and Rails trivially easy with cheap models] → the bonus only applies to complexity ≤ 3, and the sim compares companies.
- [tools/sim.js's automated player ignores most mechanics, so its balance signal is coarse] → treat it as a regression and order-of-magnitude check, as docs/CLAUDE.md already notes.
- [Ticket titles with stack-specific jargon may confuse non-specialists] → keep titles short and concrete, matching the tone of the current pool.

## Migration Plan

No data migration beyond the best-score key fallback. Deploy is the existing push to main; rollback is reverting the commit.
