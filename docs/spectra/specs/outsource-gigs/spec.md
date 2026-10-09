# outsource-gigs Specification

## Purpose

Lets the player opt into outsourced side gigs: extra tickets that can only be paid for with personal tokens, pay cash instead of KPI, and cost a penalty when late. It adds a personal risk/reward trade-off alongside company work.

## Requirements

### Requirement: Outsourcing toggle

The opening setup modal SHALL show a 外包 section with the options 不接外包 and 接外包, separate from the company selection and not counted toward its 1–2 stack limit. The default SHALL be 不接外包. The choice SHALL persist to the next run started with 再玩一個月, and a stored value that is not a boolean SHALL fall back to 不接外包. The weekly subscription adjustment modal SHALL NOT show the toggle.

#### Scenario: Default and persistence

- **WHEN** the first run starts, the player picks 接外包, finishes the month and clicks 再玩一個月
- **THEN** the first run starts with 不接外包 preselected and the second run's modal preselects 接外包

#### Scenario: Invalid stored value

- **WHEN** the stored outsourcing value is the string yes
- **THEN** the run starts with outsourcing off

#### Scenario: Weekly modal

- **WHEN** the weekly 調整訂閱 modal opens
- **THEN** no outsourcing toggle is shown


<!-- @trace
source: outsource-gigs
updated: 2026-10-09
code:
  - public/js/state.js
  - public/css/style.css
  - public/js/data.js
  - public/js/modals.js
  - tools/check.js
  - docs/DESIGN.md
  - tools/sim.js
  - public/js/main.js
  - public/js/actions.js
  - public/js/calc.js
  - public/js/view.js
-->

---
### Requirement: Outsourced ticket generation

With outsourcing on, day 1 and every following day SHALL add 0, 1 or 2 outsourced tickets (uniformly) in addition to the company tickets; with outsourcing off no outsourced tickets SHALL appear. An outsourced ticket's stack SHALL be one of laravel, rails, rust, app, sre, devops, fe chosen uniformly, and its title SHALL come from that stack's pool following the existing trap-title rule. Outsourced tickets SHALL NOT be incidents and SHALL NOT be sensitive. They SHALL follow the existing rules for complexity, traps, due dates, Rust/App/DevOps compensation, store review, unfamiliar stacks and manual hours. Their client SHALL be 外包案主 with no ban, and the company-wide China cloud ban SHALL NOT apply to them. Outsourced ticket cards SHALL show an 外包 chip and the pay as NT$<pay> instead of the KPI value, and SHALL NOT show the 禁中國雲端 chip after the company-wide ban. Engineering investments SHALL apply to outsourced tickets exactly as to company tickets.

#### Scenario: Daily gigs

- **WHEN** outsourcing is on and day 5 starts
- **THEN** between 0 and 2 outsourced tickets are added besides the company tickets

#### Scenario: Stack spread

- **WHEN** 5,000 outsourced tickets are generated in a Laravel-only run
- **THEN** each of laravel, rails, rust, app, sre, devops and fe appears about 14.3% of the time, none is an incident or sensitive, and the rust, sre and devops ones show the 不熟 chip

#### Scenario: China ban exemption

- **WHEN** the company-wide China cloud ban event has fired and an outsourced ticket is selected
- **THEN** DeepSeek Chat is selectable for it and the ticket card shows no 禁中國雲端 chip

#### Scenario: Investments apply

- **WHEN** CLAUDE.md for Rust has been written and a rust outsourced ticket is selected
- **THEN** the dispatch panel's token estimate and success rate match a rust company ticket of the same complexity and the investment hint names the Rust CLAUDE.md


<!-- @trace
source: gh-18-01-work-roles-sre-devops
updated: 2026-10-10
code:
  - public/js/data.js
  - public/js/calc.js
  - public/js/actions.js
  - public/js/state.js
  - public/js/modals.js
-->

---
### Requirement: Personal billing only for outsourced tickets

For an outsourced ticket, 公司 API and 公司席位 (for any approved seat vendor) SHALL be unusable with the reason 外包不能用公司資源 in the dispatch panel, and a dispatch preset using either SHALL be skipped with that reason by one-click dispatch and by batch dispatch. Dispatching and architecture evaluation SHALL do nothing when the selected billing is 公司 API or 公司席位 for an outsourced ticket. Personal subscription, personal API and local GPU SHALL work as for company tickets.

#### Scenario: Dispatch panel

- **WHEN** an outsourced ticket is selected with 公司 API previously chosen
- **THEN** the 公司 API option is disabled with 外包不能用公司資源 and the selection moves to the first usable billing

#### Scenario: Preset fallback

- **WHEN** an outsourced ticket's first preset uses 公司 API and the second uses 個人 API
- **THEN** one-click dispatch uses the second preset and names the first with 外包不能用公司資源

#### Scenario: Batch dispatch

- **WHEN** skills are invested, every preset uses 公司 API, and the queue holds a complexity 1 company ticket and a complexity 1 outsourced ticket
- **THEN** batch dispatch sends the company ticket and skips the outsourced ticket

#### Scenario: Direct dispatch refused

- **WHEN** dispatch is called for an outsourced ticket with billing set to 公司 API
- **THEN** no job is created and no budget changes


<!-- @trace
source: outsource-gigs
updated: 2026-10-09
code:
  - public/js/state.js
  - public/css/style.css
  - public/js/data.js
  - public/js/modals.js
  - tools/check.js
  - docs/DESIGN.md
  - tools/sim.js
  - public/js/main.js
  - public/js/actions.js
  - public/js/calc.js
  - public/js/view.js
-->

---
### Requirement: Outsourcing pay and late penalty

An outsourced ticket's pay SHALL be its KPI value × 80 in NT$. Finishing it SHALL add the pay to the personal wallet and to the month's outsourcing income, SHALL NOT add KPI, and SHALL NOT change trust. When an outsourced ticket is overdue at the end of a day, the player SHALL pay a penalty of 30% of its pay (rounded) from the wallet, KPI and trust SHALL NOT change, and the ticket SHALL leave the queue. Manager re-scoping SHALL NOT be offered for outsourced tickets.

#### Scenario: Pay values

- **WHEN** outsourced tickets in the table are finished
- **THEN** the wallet grows by the pay and KPI is unchanged

##### Example: pay by stack and complexity

| Stack | Complexity | KPI | Pay |
| --- | --- | --- | --- |
| laravel | 2 | 6 | NT$480 |
| rust | 2 | 8 | NT$640 |
| fe | 4 | 16 | NT$1,280 |

#### Scenario: Late penalty

- **WHEN** a laravel complexity 2 outsourced ticket (pay NT$480) is still in the queue at the end of its due day
- **THEN** the wallet drops by NT$144, KPI and trust are unchanged, and the ticket is removed

#### Scenario: No re-scoping

- **WHEN** an outsourced trap ticket is revealed
- **THEN** the dispatch panel shows no 找主管重新評估 button


<!-- @trace
source: outsource-gigs
updated: 2026-10-09
code:
  - public/js/state.js
  - public/css/style.css
  - public/js/data.js
  - public/js/modals.js
  - tools/check.js
  - docs/DESIGN.md
  - tools/sim.js
  - public/js/main.js
  - public/js/actions.js
  - public/js/calc.js
  - public/js/view.js
-->

---
### Requirement: Merge conflicts on outsourced tickets

When a parallel-mode merge conflict turns an outsourced ticket into a 解決衝突 ticket, that ticket SHALL stay outsourced with the same pay, and the billing restriction, pay on success and late penalty SHALL apply to it.

#### Scenario: Conflict keeps the gig

- **WHEN** a laravel complexity 2 outsourced ticket (pay NT$480) hits a merge conflict and its 解決衝突 ticket is later finished
- **THEN** the 解決衝突 card shows the 外包 chip and NT$480, 公司 API is disabled for it with 外包不能用公司資源, and finishing it adds NT$480 to the wallet and no KPI


<!-- @trace
source: outsource-gigs
updated: 2026-10-09
code:
  - public/js/state.js
  - public/css/style.css
  - public/js/data.js
  - public/js/modals.js
  - tools/check.js
  - docs/DESIGN.md
  - tools/sim.js
  - public/js/main.js
  - public/js/actions.js
  - public/js/calc.js
  - public/js/view.js
-->

---
### Requirement: Outsourcing on the receipt

The month-end personal spend SHALL equal subscription fees plus personal API spend plus outsourcing penalties minus outsourcing income, and the score formula SHALL use it unchanged otherwise. When outsourcing was on, the receipt SHALL show 外包收入, 外包違約金, 外包完成 and 外包逾期 lines.

#### Scenario: Receipt

- **WHEN** a run with outsourcing on ends with NT$3,300 subscription fees, NT$1,000 personal API, NT$2,400 outsourcing income, NT$144 penalties, 4 gigs done and 1 late
- **THEN** 你自己掏的錢 shows NT$2,044 and the receipt lists 外包收入 NT$2,400, 外包違約金 NT$144, 外包完成 4 張, 外包逾期 1 張

<!-- @trace
source: outsource-gigs
updated: 2026-10-09
code:
  - public/js/state.js
  - public/css/style.css
  - public/js/data.js
  - public/js/modals.js
  - tools/check.js
  - docs/DESIGN.md
  - tools/sim.js
  - public/js/main.js
  - public/js/actions.js
  - public/js/calc.js
  - public/js/view.js
-->