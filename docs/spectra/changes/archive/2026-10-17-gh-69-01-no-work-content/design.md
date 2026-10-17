## Context

The opening picker (`showSetup`, `toggleCompany`) allows one or two of the six work contents; `normCompanies` rejects anything else and falls back to `['laravel']`. With an empty `S.companies`, three places break today: `pickStack` returns `pick([])` (undefined) on its 75% branch, `makeIssue` picks the incident stack with `pick(S.companies)`, and `companyName`/`bestKey`/`track` produce an empty string. Everything else that reads `S.companies` already behaves correctly for an empty list: `unfamiliar` treats every non-fe stack as unfamiliar, `intakeIssue` skips the SRE second roll because `includes('sre')` is false, and `INV_STACKS` lists all six stacks then fe.

gh-68-01-familiar-work-label (#68) renames the picker label to 熟悉的工作內容（可選 1–2 項）, adds a hint line, and introduces `STACK_PICK` (0.75) and `STACK_FE` (0.15). This change builds on that.

Refactor check (modules this change touches, 2026-10-17): data.js 184 lines / 18.3KB (11 lines over 200 chars), state.js 160 / 10.5KB (5), modals.js 216 / 16.9KB (10), tools/sim.js 247 / 23.8KB (23). Conclusion: no refactor needed.

## Goals / Non-Goals

**Goals:**

- A 全端打雜 option in the opening picker, stored as `S.companies = []`.
- Correct ticket and incident stacks, names, best-score key and GA value for the empty selection.
- A simulator switch to measure the option.

**Non-Goals:**

- No compensation: KPI, deadlines, budgets and grade thresholds are unchanged.
- No change to the 1–2 limit for real stacks, or to runs with a selection.
- No change to outsourced ticket stacks (they keep their own uniform rule).
- No rules-modal section for the option.
- No balance target; the measured gap is recorded only.

## Decisions

### Empty list, not a sentinel stack

Store 全端打雜 as `S.companies = []` rather than a seventh key like `'none'` in `COMPANIES`. A sentinel would leak into every `COMPANIES.filter`, the unselected-stack branch, conference coverage and investments; the empty list already gives the right answer in `unfamiliar`, `intakeIssue` and `INV_STACKS`. The string `none` exists only at the edges: the button's `data-company` value, the best-score key and the GA parameter.

### Distribution: fe keeps 15%, six stacks share the rest

With no selection, `pickStack` returns fe with probability `STACK_FE` and otherwise a uniform pick from `COMPANIES` (about 14.17% each). Rejected: keeping a 10% "other" slice (there is no "selected" slice to contrast it with). The random-call count per ticket stays one `Math.random` plus one `pick`, the same as today, so runs with a selection consume the identical sequence.

### Incidents spread over all six stacks

Incident stack is `pick(S.companies.length ? S.companies : COMPANIES)`. The SRE second roll stays tied to selecting SRE, so 全端打雜 has the base incident rate only.

### Seventh button, mutually exclusive

`toggleCompany(cs, 'none')` returns `[]`; `toggleCompany([], k)` returns `[k]`; clicking 全端打雜 while it is selected keeps `[]` (the player leaves it by picking a stack). Stack buttons are not disabled while 全端打雜 is selected. Rejected: allowing the last stack to be deselected (easy to hit by accident and has no place for the ★★★★ label).

### Display name and code `none`

`companyName([])` returns the dictionary string `stack.none.company` (全端打雜 / Jack of all trades). `bestKey` and `track` use `none` when the list is empty. The legacy `tokgame-best-<mode>` fallback still applies only to Laravel alone.

### No compensation, measure first

The user chose a pure hard option. `SIM_NONE=1` adds a 全端打雜 row to the simulator's per-mode runs (compared with Laravel alone); the numbers go into docs/DESIGN.md. If the gap looks unreasonable, compensation is a separate discussion.

## Implementation Contract

**Behavior**

- Opening modal: below the six stack buttons, a seventh button 全端打雜 with 難度 ★★★★ and the description 什麼都接，前端以外都不熟 (English: Take anything; every stack but frontend is unfamiliar). Selected state follows `draft.companies.length === 0`. The label reads 熟悉的工作內容（可選 1–2 項，或全端打雜） (English: Stacks you know (pick 1–2, or Jack of all trades)).
- Hint line (from #68): with an empty selection it reads 沒有熟悉的技術線：工單 85% 平分給六條線、前端 15%，前端以外手寫都要 ×2。 (English: No familiar stack: 85% of tickets are split over the six stacks, 15% frontend; hand-writing anything but frontend takes ×2.), percentages from `1 − STACK_FE` and `STACK_FE`, multiplier from `UNFAMILIAR_HRS`.
- Intro: 你是工程師，負責「全端打雜」。; header, day-1 log line, resume modal, month-end title show 全端打雜.
- Switching between 全端打雜 and a stack in the opening modal redraws day-1 tickets via `firstIssues()` (the existing selection-change path).

**Interface / data shape**

- `normCompanies(c)`: an empty array is valid and returns `[]`; other rules unchanged.
- `toggleCompany(cs, k)`: `k === 'none'` returns `[]`; a stack `k` with `cs` empty returns `[k]`.
- `pickStack()`, `makeIssue(inc)`: as in Decisions.
- `companyName(cs)`, `bestKey()`, `track` `companies`: empty → name string / `none`.
- New dictionary keys in both languages: `stack.none.company`, `stack.none.desc`, `ui.setup.workHintNone`, `news.gh-69-01`; `ui.setup.work` updated.
- `tools/sim.js`: `SIM_NONE=1` appends a run with `S.companies = []` labelled `none`; the run-label split maps `none` to `[]`. Its investment buyer buys no CLAUDE.md in that run (no selected stack) and picks conferences in its priority order (taiwanai, hwdc, hitcon, then the rest), taking the first affordable one, because there is no first stack to match.

**Failure modes**

- Saves: an empty `companies` array passes `readSave`; no `SAVE_VER` bump.
- Invalid stored values other than `[]` still fall back to Laravel alone.

**Acceptance criteria**

- `node tools/check.js` passes, including new assertions: toggle table rows for none; long-run distribution with an empty selection (fe about 15%, each stack about 14.17%, no undefined stack); 1,000 incidents all in the six stacks and each appears; no SRE second roll; manual hours ×2 for every non-fe stack; names, intro, best-score key `tokgame-best-parallel-none` (and `-burn`), GA `companies` `none`; save with empty companies resumes.
- `SIM_N=100 SIM_SEED=101 node tools/sim.js` output identical before and after (without `SIM_NONE`).
- `SIM_NONE=1` run recorded in docs/DESIGN.md for both modes, seeds 101 and 202.

**Scope boundaries**

In scope: the files listed in the proposal. Out of scope: compensation, rules modal text, outsourced ticket stacks, grade thresholds.

## Risks / Trade-offs

- [Serial mode can become unpleasant: every non-fe hand-written ticket takes double time] → measure with `SIM_NONE=1`; the ★★★★ label warns players; compensation is deferred to a follow-up decision.
- [Four stars break the 1–3 star convention] → only a label; the button already renders `'★'.repeat(level)`, so level 4 needs no layout change, verified at 400px width during apply.
- [#68 not yet archived] → apply #68 first; when applying this change, re-check that the delta for `Company selection at run start` still matches the archived text.
