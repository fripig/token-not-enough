## Why

Players report two pain points: every ticket requires re-picking vendor, model, billing and review level, and a run only ever gets tighter — budgets and trust drain with no sense of getting better. Real engineers fight both by investing early (writing CLAUDE.md, adding tests, building skills, adopting spec-driven development) so agents work smoother later; the game should reward the same trade-off.

## What Changes

- Add three saved dispatch presets (方案 A/B/C), each storing vendor, model, billing and review level. Presets persist to the next run.
- Each ticket card gets a one-click dispatch button that uses the first usable preset in A→B→C order; when an earlier preset is unusable for that ticket the button and the log name the reason.
- The dispatch panel can save the current selection into any preset slot.
- Add engineering investments, paid with player hours plus company API budget, lasting until month end:
  - 寫 CLAUDE.md (once per tech stack): cheaper and more reliable agent runs on that stack.
  - 補測試: higher self-review catch rate, fewer merge conflicts.
  - 做 skills: unlocks batch dispatch of all complexity ≤2 tickets via one-click presets.
  - 接 MCP 文件: higher trap reveal rate and faster architecture evaluation.
  - 導入 SDD: every agent run costs more tokens, but complexity ≥3 tickets succeed more often and hidden traps are caught during spec writing with less wasted work.
- The end-of-month summary lists investments made.
- `tools/sim.js` gains an investing auto-player mode; `tools/check.js` asserts the new rules.

## Capabilities

### New Capabilities

- `dispatch-presets`: saved dispatch presets, one-click dispatch from ticket cards with fallback and reasons, preset persistence.
- `engineering-investments`: investment actions, their costs, their effects on agent runs, and batch dispatch unlocked by skills.

### Modified Capabilities

(none)

## Impact

- Affected specs: dispatch-presets (new), engineering-investments (new)
- Affected code: public/js/game.js, public/css/style.css, tools/check.js, tools/sim.js
- Documentation: docs/CLAUDE.md (local handoff file, not tracked in git) gets updated rules and balance numbers.
