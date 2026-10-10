## Summary

Engineering investments gain 國內研討會: the player registers for a Taiwanese conference on a weekday, pays the ticket from the personal wallet, attends at the weekend and gets the effects from the next Monday. Conferences unlock a level 2 for four existing investments and a new three-level investment 提升 agent 能力. Before that, investment ownership is reworked from booleans to levels so the new levels are table lookups instead of extra branches.

## Motivation

The player (issue #22) asked for 「投資新增國內研討會」, then added 「研討會也能提高agent能力 當作去學怎麼用ＡＩ」 and 「改成參加研討會以後 可以投資更高等級的能力」. In discuss (2026-10-10) the player chose every rule below from options. A weekday conference was rejected because a whole day of hours always makes some ticket overdue (incidents are due the same day), so attendance happens at the weekend and costs money, not hours. The player also asked whether investment code needs the strategy pattern: the 28 investment checks each touch a different formula, so the chosen tidy-up is level numbers with per-level value tables, not a strategy interface.

## Proposed Solution

- **Investment levels (tidy-up first)**: investment ownership becomes a level number (0 = not bought). Effects that gain a level 2 read per-level value tables. Old saves with `true` load as level 1; `SAVE_VER` is unchanged. With no conference attended, fixed-seed simulator output stays byte-identical.
- **Conferences**: ten conferences in four categories. Tech-stack conferences: iPlayground (App), MOPCON×JSDC (App, 前端), DevOpsDays Taipei and KubeSummit (SRE, DevOps), COSCUP (Rails, Rust via the Ruby Taiwan track), WebConf Taiwan (Laravel, 前端). Security: HITCON, CYBERSEC. AI: 台灣人工智慧年會. General: Hello World Dev Conference (HWDC). Real dates are ignored.
- **Registration and attendance**: on days 1–15 the player registers for one conference not yet attended, paying its ticket from the personal wallet. It costs no hours and does not check trust (self-paid needs no manager approval). Only one registration can be pending. The conference is attended at the weekend after that week and takes effect on the next Monday (day 6, 11 or 16), reported in the morning report and the action log. At most 3 conferences per run.
- **Tech-stack conference effect**: for each covered stack, hand-writing hours × 0.8 and the stack no longer counts as unfamiliar.
- **Level 2 unlocks** (level 1 must be owned; 1h and NT$200 company budget each, after two tuning rounds): a tech-stack conference unlocks CLAUDE.md level 2 for each covered stack (success +0.06 → +0.15); AI unlocks 做 skills level 2 (batch dispatch shown complexity ≤2 → ≤3); security unlocks secret scanning level 2 (audit odds × 0.5 → × 0.25); general unlocks 單元測試 level 2 (catch rate +0.10 → +0.20). A second conference of the same category unlocks nothing new.
- **提升 agent 能力**: level N can be bought after attending N conferences (any category), level by level, 1h and NT$200 each. Each level adds 0.08 to base success for every agent dispatch, up to level 3.
- **Personal spend**: ticket fees count in personal spend for the month-end score; the receipt shows conferences attended and the fees.
- **Rules, analytics, docs**: the rules modal 投資與電腦 tab lists conferences, level 2 effects and 提升 agent 能力; `invest` GA events cover registrations and new levels without new GA dimensions; `docs/DESIGN.md` records the feature and measurements.
- **Balance**: `tools/sim.js` gains `SIM_CONF=1`; the parallel-mode target is +3% to +15% over the same code's `SIM_INVEST=1` player.

## Non-Goals

- No weekday attendance, no hours cost and no trust gate for conferences.
- No real-calendar dates; WebConf's unannounced date does not matter.
- No level 2 for CI, hook, fastlane, 監控告警, MCP or SDD.
- No strategy-pattern rewrite of investment effects; no change to effects other than the four with level 2.
- No change to hardware purchases, team seats or the investment panel collapse (that is `gh-22-02-invest-panel-collapse`).

## Alternatives Considered

- One generic 國內研討會 investment, or one distinct effect per conference: the player chose four categories.
- Conference as a weekday 8h activity: rejected, it guarantees overdue tickets.
- Paid public leave that pushes due days, or watching recordings for 2–3h: rejected by the player in favour of weekend attendance.
- Company-paid ticket with a trust threshold: rejected, the player chose self-paid.
- Locking existing investments behind conferences: rejected, it would make current play harder and invalidate past balance numbers.
- Model capability +1 at the top 提升 agent 能力 level: rejected as too strong for cheap models.

## Impact

- Affected specs: engineering-investments, company-tech-stack, ticket-lifecycle, month-end-scoring, play-analytics, rules-reference
- Affected code:
  - Modified: public/js/data.js, public/js/state.js, public/js/calc.js, public/js/actions.js, public/js/view.js, public/js/modals.js, public/js/main.js, public/js/rules.js, tools/check.js, tools/sim.js, docs/DESIGN.md
  - New: none
  - Removed: none
