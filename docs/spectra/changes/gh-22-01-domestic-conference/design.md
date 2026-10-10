## Context

Investments live in `INVEST` / `INV_KEYS` in `public/js/data.js`; ownership is `S.inv` (`md` is a per-stack object of booleans, the rest are booleans) created in `fresh()` in `public/js/state.js`. Effects are read in 28 places across `actions.js` (22), `calc.js` (3), `state.js` (2) and `view.js` (1), each touching a different formula: `est` (CLAUDE.md, SDD), `catchRate` (單元測試), `auditOdds` (secret scanning), `batch` (做 skills), merge conflict, PR hours, store rejection, incident due day / KPI / late trust, evaluation. Hand-writing hours come from `manualHrs` in `calc.js`, unfamiliarity from `unfamiliar` in `state.js`. The day change, Monday quota reset, seat review and hardware arrival run in `endDay` in `actions.js`. Personal spend is computed in `monthScore` in `modals.js`.

Measured on origin/main (2026-10-10) for the modules this change touches: `actions.js` 364 lines, `data.js` 175, `view.js` 152, `modals.js` 194, `rules.js` 105, `state.js` 106, `calc.js` 98. The refactor check concluded: tidy up locally (levels), no framework.

## Goals / Non-Goals

**Goals:**

- Weekend, self-paid conferences that unlock higher investment levels, as chosen in discuss.
- Investment levels expressed as numbers and per-level value tables, with byte-identical simulator output when no conference is attended.
- Old saves keep loading.

**Non-Goals:**

- A strategy-pattern interface for investment effects.
- Level 2 for investments other than CLAUDE.md, 單元測試, secret scanning and 做 skills.
- Real conference dates, weekday attendance, trust checks for conferences.
- Panel collapse (`gh-22-02-invest-panel-collapse`).

## Decisions

### Investment ownership as levels with per-level tables

`S.inv.md[stack]`, `S.inv.tests`, `S.inv.scan`, `S.inv.skills` and the other investments hold a level number: 0 not bought, 1 bought, 2 level 2. New `S.inv.ai` holds 0–3. Constants with a level 2 become arrays indexed by level: `MD_P=[0,.06,.15]`, `TEST_CATCH=[0,.1,.2]`, `SCAN_AUDIT=[1,.5,.25]`, `SKILLS_CX=[0,2,3]`; `MD_TK` stays a single factor applied at level ≥1. `AI_P=.08` per level, up to `AI_MAX=3`. `lv(x)` reads a stored value as a level (`true` counts as 1). Investments without a level 2 keep truthiness checks (`S.inv.ci` is 0 or 1). Alternative considered: a strategy object per investment with effect hooks; rejected because about ten hooks would each serve one or two investments and only forward calls.

### Upgrade purchase through the existing invest action

`invest(k, st, want)` buys the next level (or refuses when `want` skips a level): level 1 as today, level 2 for `md`, `tests`, `scan`, `skills` when unlocked, and the next `ai` level. `INVEST[k]` gains `lv2:{hrs,cost,desc}` for the four upgradable investments and a new `ai` entry, appended to `INV_KEYS`. `investBlock(k, st, want)` returns the first refusal reason in this order: 已完成 (max level reached), the unlock reason (需要先買 Lv1, 需要去過<category>研討會, 需要去過 N 場研討會), 工時不夠, 公司預算不夠. Cost for every level 2 and every `ai` level: 1h and NT$200 (initially 3h and NT$400, lowered in tuning).

### Conference data and state

`CONF` in `data.js` maps a key to `{name, cat, stacks, fee}`; `CONF_KEYS` fixes the panel order; `CONF_CATS` names the categories 技術線場, 資安場, AI 場, 綜合場 (`stack`, `sec`, `ai`, `gen`). `S.conf={req:null, went:[]}`: `req` is the key registered this week, `went` lists attended keys in order. Constants: `CONF_LAST_DAY=15`, `CONF_MANUAL=.8`.

| Key | Name | Category | Stacks | Fee (NT$) and source (checked 2026-10-10) |
| --- | --- | --- | --- | --- |
| iplayground | iPlayground | stack | app | 4,000, 2026 general ticket |
| mopcon | MOPCON×JSDC | stack | app, fe | 699, 2026 general ticket |
| devopsdays | DevOpsDays Taipei | stack | sre, devops | 3,500, estimate (2026 price not found) |
| kubesummit | KubeSummit | stack | sre, devops | 3,000, 2025 presale (2026 not found) |
| coscup | COSCUP | stack | rails, rust | 0, free and no registration |
| webconf | WebConf Taiwan | stack | laravel, fe | 4,200, 2024 general ticket (2026 not announced) |
| hitcon | HITCON | sec | — | 6,000, 2026 general ticket |
| cybersec | CYBERSEC 臺灣資安大會 | sec | — | 0, 2026 online registration is free |
| taiwanai | 台灣人工智慧年會 | ai | — | 2,500, estimate (2026 price not found) |
| hwdc | Hello World Dev Conference | gen | — | 3,600, 2026 early-bird (general not found) |

Task 1.1 checked the official or ticketing pages (sources in the issue #22 comment); two fees remain estimates and `docs/DESIGN.md` says so. COSCUP and CYBERSEC are free in reality; with fee 0 its only cost is using one of the three weekends.

### Registration on weekdays, attendance processed on Monday

`registerConf(key)` is refused when the day is above `CONF_LAST_DAY`, a registration is pending, the key is in `went`, or the wallet is below the fee. On success it deducts the fee from the wallet, adds it to `S.st.confFee`, sets `S.conf.req`, logs one line and sends the GA event; it costs no hours and works with a busy local GPU. In `endDay`, when the new day is a Monday, after seat review and hardware arrival and before the random event, a pending registration moves to `went` and the morning report and log name the conference and what it unlocked. The day-start snapshot is taken before this, which is fine because attendance changes no tracked value. A pending registration at the end of day 20 cannot exist because registration closes after day 15.

### Conference effects read from attended conferences

Helpers in `state.js`: `confStacks()` returns the set of stacks covered by attended tech-stack conferences; `confCat(cat)` says whether a conference of that category was attended; `confCount()` is `went.length`. `unfamiliar(is)` returns false when `is.stack` is in `confStacks()`. `manualHrs(is)` multiplies by `CONF_MANUAL` when `is.stack` is in `confStacks()` (after the unfamiliarity factor, which is then 1). Unlock rules: CLAUDE.md level 2 for stack `st` needs `S.inv.md[st]>=1` and `st` in `confStacks()`; `skills` needs `confCat('ai')`; `scan` needs `confCat('sec')`; `tests` needs `confCat('gen')`; `ai` level N needs `confCount()>=N`.

### Personal spend includes conference fees

`monthScore` personal spend becomes subscription + personal API + outsourcing penalties + conference fees − outsourcing income. The 自費養 AI 的勇者 title uses the same personal spend, so fees count toward it. Supersedes the original assumption that fees lower the score: gh-26-01-money-off-score (archived 2026-10-10, merged into this branch) removed personal spend from the score, so fees are shown and drive titles only. The receipt adds 研討會 N 場 and 研討會報名費 NT$X when at least one registration happened.

### GA events without new dimensions

Registration sends `invest` with `investment` `conf_<key>` and `stack` `none`. A level 2 purchase sends `investment` `<key>2` (`md2`, `tests2`, `scan2`, `skills2`) with `stack` as today. 提升 agent 能力 sends `ai1`, `ai2`, `ai3`. No GA admin change is needed. Alternative: new `level` and `conference` parameters; rejected because each needs a custom dimension registered in GA.

### Save compatibility without a version bump

`loadGame` normalizes `S.inv`: every `true` becomes 1 and `false` becomes 0 (including inside `md`), `S.inv.ai ??= 0`, `S.conf ??= {req:null, went:[]}`, `S.st.confFee ??= 0`. `SAVE_VER` stays the same because missing fields have safe defaults, as with the hardware fields.

### Simulator measurement

`SIM_CONF=1` (requires `SIM_INVEST` ≥1, otherwise the simulator exits with a message) makes the auto player register on the first day of weeks 1–3 for the first affordable conference in its priority list: an unattended tech-stack conference covering its first selected stack, then 台灣人工智慧年會, HWDC, HITCON, then any remaining. Each day it buys any affordable unlocked level 2 and the next 提升 agent 能力 level before its other investments. The comparison is `SIM_INVEST=1 SIM_CONF=1` against `SIM_INVEST=1` on the same code.

## Implementation Contract

**Behavior**: the investment panel shows a 國內研討會 row with one button per conference (fee, category and covered stacks, or the refusal reason), Lv2 buttons on the four upgradable rows once level 1 is owned, and a 提升 agent 能力 row. Registering shows 已報名・週末出席 on the conference and disables the others until Monday. The Monday morning report shows 週末參加了 <name>：… with what was unlocked. The dispatch hint line names active level 2 effects and 提升 agent 能力. Hand-writing a covered stack shows the reduced hours and no 不熟 chip.

**Interface / data shape**: `CONF`, `CONF_KEYS`, `CONF_CATS`, `CONF_LAST_DAY`, `CONF_MANUAL`, `AI_P`, `SKILLS_CX` and the level arrays in `data.js`; `S.conf`, `S.inv.ai`, `S.st.confFee` and `confStacks`, `confCat`, `confCount` in `state.js`; `registerConf`, `confBlock` and the extended `invest` / `investBlock` in `actions.js`; click delegation `data-conf="<key>"` in `main.js`.

**Failure modes**: refused registrations and purchases change nothing and send no GA event, as other refused actions. A save from before this change loads with levels normalized and no conferences.

**Acceptance criteria**: `node tools/check.js` exits 0 with assertions for every scenario in this change's delta specs; fixed-seed `tools/sim.js` output without `SIM_CONF` equals the pre-change output; `SIM_CONF=1` measurements are recorded in `docs/DESIGN.md`; manual check of the panel at 400px width in light and dark mode.

**Scope boundaries**: in scope are the items in the proposal. Out of scope: panel collapse, hardware, seats, effects of other investments, GA admin settings.

## Risks / Trade-offs

- [Conferences cost no hours and no trust; COSCUP is free] → they can become a must-pick every weekend. `SIM_CONF` measures it; if parallel mode exceeds +15%, raise fees or lower `AI_P` / level 2 values and record the change.
- [Two ticket fees are estimates] → labeled in `docs/DESIGN.md`.
- [Measured below target] → parallel mode measured −4.4% to +1.3% after two tuning rounds (target +3% to +15%); the player chose to keep the tuned values and real self-paid fees. After merging `gh-26-01-money-off-score` (money out of the score) it measured −9.9% to +4.0% in parallel and −1.7% to +20.4% in serial (`SIM_N=100`, seeds 101/202); still below the parallel target, values unchanged. That measurement was taken while fees still lowered the score; after merging gh-26-01-money-off-score the fee no longer costs points, so task 6.3 re-measures on the merged code before any value is changed.
- [Levels change the shape of `S.inv`] → `loadGame` normalization plus a check assertion that loads a save with boolean investments.
- [Auto player trust usually reaches 0 early] → conferences do not depend on trust, so the measurement is not blocked by it.
