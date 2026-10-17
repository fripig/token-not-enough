## Why

The work-content picker forces one or two familiar stacks, but every stack already sends tickets. Players asked for a "take anything" option: no familiar stack, tickets spread over all six stacks, every non-frontend ticket unfamiliar. It is a pure hard-difficulty choice for experienced players (issue #69, follow-up to #68).

## What Changes

- The opening setup modal gains a seventh option 全端打雜 (English: Jack of all trades), difficulty ★★★★, mutually exclusive with the six stacks: choosing it clears the others, choosing any stack clears it. The run stores it as an empty stack list.
- Ticket distribution with no selected stack: fe keeps its share (15%), the remaining 85% is split uniformly among the six work-content stacks. Incident tickets use the six stacks uniformly. The SRE second incident roll does not happen.
- Every ticket except fe is unfamiliar (hand-writing ×2) unless covered by an attended 技術線場 conference — the existing unfamiliar rule, unchanged.
- Names: header, intro, log, resume modal and month-end title show 全端打雜. Best-score key uses `none` (tokgame-best-<mode>-none, with -burn when the usage challenge is on). GA `companies` sends `none`.
- The #68 hint line under the picker switches to a no-familiar-stack sentence when 全端打雜 is chosen.
- An empty stored selection becomes valid; other invalid values still fall back to Laravel 後端 alone.
- No compensation (KPI, deadlines, budget unchanged). The simulator gets `SIM_NONE=1` to measure both modes against Laravel alone; results are recorded, no target.
- A `NEWS` entry announces the option.

## Non-Goals

Design.md records scope boundaries and rejected approaches.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `company-tech-stack`: selection gains the 全端打雜 option; ticket distribution and incidents handle an empty selection; best-score key `none`.
- `play-analytics`: the `companies` parameter is `none` for an empty selection.

## Impact

- Depends on gh-68-01-familiar-work-label (#68): it must be applied and archived first, because both changes modify the same requirement and the setup picker.
- Code: public/js/data.js (normCompanies, companyName, bestKey, STACKS level display), public/js/state.js (pickStack, makeIssue incident stack, track), public/js/modals.js (toggleCompany, showSetup), public/js/i18n/zh-TW.js, public/js/i18n/en.js, public/js/news.js, tools/sim.js, tools/check/company-tech-stack.test.js, tools/check/play-analytics.test.js, docs/DESIGN.md.
- Saves: an empty `companies` array becomes valid; existing saves never hold one, so `SAVE_VER` does not change.
- Fixed-seed simulator output without `SIM_NONE` stays identical.
