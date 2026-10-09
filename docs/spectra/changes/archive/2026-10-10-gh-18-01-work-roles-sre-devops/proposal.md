## Why

The opening picker frames the player's choice as a company (「公司（可選 1–2 條主技術線）」), while what it really decides is which kind of work lands on the player's desk. The user asked to present it as 工作內容 and to add two work types that are missing from a game about code agents: SRE and DevOps (issue #18).

## What Changes

- The opening picker label becomes 工作內容（可選 1–2 項） and every option shows a work-content name instead of a company name: Laravel 後端, Rails 後端, Rust 基礎設施, App 開發, SRE, DevOps. The intro sentence, header, day-1 log line and month-end title use these names through `companyName()`; the intro reads 「你是工程師，負責「<names>」。」. The public page intro (public/index.html footer) says 開局選一到兩項工作內容.
- Two new stacks `sre` and `devops` join `COMPANIES` after `app`, each with a title pool (at least 3 titles per complexity 1–5, plus `trap` and `inc` pools) in the same short, concrete tone. The fixed order becomes laravel, rails, rust, app, sre, devops.
- SRE (難度 ★★): when sre is selected, every company ticket in the daily intake that did not roll an incident rolls `incRate(day)` a second time; on a hit it becomes an sre incident ticket. The first-week ramp therefore still applies, day 1 still has no incidents, and runs without sre are unchanged.
- DevOps (難度 ★★): agent run hours ×1.25 (waiting for CI and terraform plan/apply), and the same compensation as Rust and App — non-incident due date +1 day, KPI ×1.3.
- Unselected sre and devops tickets count as unfamiliar like other stacks; the 10% unselected share is now split over five stacks instead of three. Outsourced tickets draw uniformly from seven stacks (six work contents plus fe).
- The dispatch panel shows a stack hint for sre and devops tickets.
- tools/sim.js and tools/check.js cover the new stacks; docs/DESIGN.md records the change and the measured balance.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `company-tech-stack`: picker label, six work-content names and difficulty labels, fixed order with sre and devops, ticket distribution over five unselected stacks, and the SRE extra incident roll.
- `stack-agent-effects`: DevOps run-hour multiplier, DevOps in the harder-stack compensation, and hints for sre and devops.
- `outsource-gigs`: outsourced tickets draw from seven stacks.

## Impact

- Affected specs: company-tech-stack, stack-agent-effects, outsource-gigs
- Affected code: public/js/data.js, public/js/state.js, public/js/calc.js, public/js/actions.js, public/js/modals.js, public/index.html, public/sitemap.xml, tools/check.js, tools/sim.js, docs/DESIGN.md
- No change to identifiers (`S.companies`, `COMPANIES`, `STACKS[k].company`), GA parameters, best-score keys or `SAVE_VER`; existing saves and best scores keep working.
