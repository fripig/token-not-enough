## Context

The opening setup modal (`showSetup` in public/js/modals.js) lists `COMPANIES` = laravel, rails, rust, app as toggles labelled 公司（可選 1–2 條主技術線）, each button showing `STACKS[k].company`, a difficulty from `STACKS[k].level` and `STACKS[k].desc`. The selection lives in `S.companies` (normalised by `normCompanies`), drives `pickStack()` (75% selected / 15% fe / 10% unselected), incident stacks (`makeIssue(true)` picks a selected stack), unfamiliarity (`unfamiliar`), GA's `companies` parameter, `bestKey()` and saves. Stack effects live in `stackGap`, `stackHrs`, `stackHint` (public/js/calc.js) and `hardStack` (public/js/state.js, due +1 and KPI ×1.3 for rust and app). The daily intake in `endDay` (public/js/actions.js) creates each ticket with `makeIssue(Math.random()<incRate(S.day))`.

The working tree still holds the uncommitted, under-review change gh-17-01-local-hardware touching the same files; this change builds on top of it and must not revert any of it.

## Goals / Non-Goals

**Goals:**

- Present the picker as 工作內容 with six options: Laravel 後端 ★, Rails 後端 ★, Rust 基礎設施 ★★★, App 開發 ★★, SRE ★★, DevOps ★★.
- SRE: more incidents when selected. DevOps: slower agent runs with the Rust/App compensation.
- Keep every stored identifier stable so saves, best scores and GA history stay comparable.

**Non-Goals:**

- No identifier renames (`S.companies`, `COMPANIES`, `normCompanies`, `companyName`, `STACKS[k].company`, `data-company`, GA `companies`, `tokgame-best-*`), no `SAVE_VER` bump — the user chose UI-text-only.
- No change to the 1–2 selection limit.
- No per-vendor skill on SRE or DevOps; effects come from the work itself, like the other stacks.
- SRE does not change the traffic-spike event (still two incidents from the selected stacks), incident KPI/deadline rules, or monitoring effects.
- No new investment tied to SRE or DevOps; existing ones (監控告警, CLAUDE.md per stack) apply as usual — CLAUDE.md gains entries for sre and devops automatically because `INV_STACKS` is derived from `COMPANIES`.
- Single-mode balance gets no target, as with other stacks.

## Decisions

### UI text only; display names come from `STACKS[k].company`

Change the `company` string values (Laravel 新聞站 → Laravel 後端, Rails SaaS → Rails 後端, App 團隊 → App 開發; Rust 基礎設施 kept) and the picker label, intro sentence and comments. Alternative: rename identifiers and bump `SAVE_VER` — rejected by the user because it drops saves and splits GA history.

### SRE incidents via a second roll

In the daily intake, each new company ticket first rolls `incRate(day)` exactly as today (incident stack uniform among selected stacks). If it did not hit and `S.companies` includes sre, it rolls `incRate(day)` again; a hit makes it `makeIssue(true,'sre')`. From day 5 a lone SRE run sees incidents on 1 − 0.88² ≈ 22.6% of new tickets (vs 12%), all sre; an SRE + Laravel run sees about 6% laravel + 16.6% sre. Alternatives: multiply the overall rate by 2 when SRE is picked (also doubles the other selected stack's incidents) or pick the stack before the incident roll (changes the random sequence and every fixed-seed output for runs without SRE). The second roll leaves the incident rate of runs without SRE untouched.

### DevOps reuses the Rust/App pattern

`stackHrs` returns 1.25 for devops; `hardStack` includes devops so due +1 day (non-incident) and KPI ×1.3 apply, including the KPI used by `rescope`. No success-rate effect.

### Title pools

sre: monitoring, alerting, SLO, capacity, on-call themes (e.g. 告警門檻太敏感半夜一直叫, 補上 SLO 儀表板, 資料庫連線數容量規劃); incidents such as 磁碟滿了 log 寫不進去, 憑證過期全站 HTTPS 失效. devops: CI/CD, IaC, containers (e.g. CI 快取失效每次都重抓套件, Terraform state 拆模組, Kubernetes 升級); incidents such as 部署 pipeline 卡住全部門無法上線. At least 3 titles per complexity 1–5, at least 4 trap titles and 3 inc titles each.

### Hints

sre: 「SRE：選了 SRE 時事故單比較多（每張新工單多擲一次事故）。」 shown on sre tickets. devops: 「DevOps：要等 CI 與 terraform，執行時間 ×1.25。」

## Implementation Contract

- Picker: label 工作內容（可選 1–2 項）; six buttons in order laravel, rails, rust, app, sre, devops showing the names and stars above; toggle rules unchanged. `normCompanies` accepts sre and devops.
- Intro sentence 「你是工程師，負責「<companyName>」。…」; header, day-1 log, month-end title and resume modal show the new names via `companyName()`.
- `pickStack`: 0.75 selected, 0.15 fe, 0.10 uniformly among the unselected of the six — for a Laravel-only run each of rails, rust, app, sre, devops ≈ 2%.
- Intake: second incident roll as described; day 1 still 4 non-incident tickets; runs without sre make no second roll and keep the 0.12 incident share from day 5.
- DevOps: hours ×1.25 in `est`, due +1 and KPI ×1.3 (complexity 3 non-incident devops ticket KPI 13; complexity 4 devops incident KPI round(16×1.6×1.3)=33).
- Gigs: `GIG_STACKS` = six work contents + fe, uniform (≈ 1/7 each).
- tools/sim.js iterates all six; `SIM_COMBOS=1` runs 15 pairs. tools/check.js asserts the scenarios in the delta specs.
- Balance acceptance: parallel-mode SRE and DevOps average score within ±25% of parallel Laravel (`SIM_N=100`, two runs). If outside, report to the user before tuning.
- Out of scope: identifier renames, save version, GA parameter changes, new investments.

## Risks / Trade-offs

- [SRE incidents are due the same day; a lone SRE run may be far below Laravel] → measure; incidents pay KPI ×1.6 which partly compensates. Report before tuning.
- [The unselected 10% now spreads over five stacks; existing check.js distribution assertions use three] → update them in this change.
- [Building on the uncommitted gh-17-01 tree makes commits hard to separate] → commit gh-17-01 first, or use `/spectra-commit` file selection; apply should not start until the user decides.

## Migration Plan

No data migration: stored `S.companies` values stay valid; old best-score keys keep working. Rollback is a revert.

## Open Questions

(none)
