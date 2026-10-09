## Why

The game now has many interacting rules (success-rate table, billing, audits, client bans, traps, merge conflicts, investments, hardware, scoring), but during play the only explanation is the short list in the opening modal, which cannot be reopened, and the footer intro below the game. The user asked for a rules modal that can be opened at any time while playing (issue #20).

## What Changes

- A new 規則 modal with tabs: 基本, 派工與成功率, 付費與稽核, 工單與陷阱, 投資與電腦, 結算. Each tab is a short list plus small tables. Every number shown is read from the game's own constants (`VENDORS`, `REVIEW`, `INVEST`, `HW`, `SEAT`, `TRAP_RATE`, `KPI` and others), so a balance change cannot leave the rules text stale.
- A 規則 button in the in-game header (top right) that is always visible and opens the modal.
- A 看完整規則 link in the opening setup modal (and the weekly 調整訂閱 modal, which is the same modal); closing the rules modal returns to that modal with the player's draft choices intact.
- tools/check.js gets assertions for the tabs, the constant-driven numbers and the return-to-previous-modal behavior.

## Non-Goals

Recorded in design.md.

## Capabilities

### New Capabilities

- `rules-reference`: the in-game rules modal — entry points, tabs, content sourced from game constants, and closing back to the modal it was opened from.

### Modified Capabilities

(none)

## Impact

- New module public/js/rules.js (rules content and the modal), imported by public/js/view.js, public/js/modals.js and public/js/main.js.
- public/js/view.js: header gets the 規則 button.
- public/js/modals.js: `showSetup` gets the link and handles it.
- public/js/main.js: click delegation for the header button.
- public/css/style.css: tab bar and the header button.
- tools/check.js, docs/DESIGN.md (requirement list item 23, code map, module list).
- Refactor check (2026-10-10, measured with wc and awk): actions.js 337 lines / 22.6KB, view.js 151 / 16.3KB (21 lines over 200 chars), modals.js 181 / 15.6KB (17 lines over 200 chars), total 1,076 lines / 86.6KB. Conclusion: no framework; the rules content goes into its own module instead of growing modals.js.
- public/js/calc.js, public/js/actions.js, public/js/modals.js: rule numbers that are inline literals today (success-rate steps, audit odds and penalty, company daily limit, overdraft and late penalties, score weights, grade thresholds) become named exported constants with unchanged values, so the rules modal can read them.
- public/js/view.js, public/js/modals.js, public/js/calc.js and public/js/actions.js also have uncommitted edits from gh-18-01-work-roles-sre-devops: apply this change after that one is committed.
