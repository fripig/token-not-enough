## Problem

Issue #56: the player read the morning event 「今天 Claude Code … 全部不能用」 as "Claude Code is down", yet the 一鍵派工 buttons for the Anthropic presets (B Sonnet, C Opus) were still clickable.

Reproduced on 2026-10-13 (`main` 9ce12f8) with the fake DOM, day-1 tickets and the default presets A DeepSeek Chat / B Sonnet / C Opus:

| Vendor down | Event text | Quick dispatch A / B / C |
| --- | --- | --- |
| Anthropic | 今天 Claude Code 全部不能用，不管你付的是哪種錢。 | enabled / disabled (今日當機) / disabled |
| DeepSeek | 今天 Claude Code 接 DeepSeek API 全部不能用，不管你付的是哪種錢。 | disabled / enabled / enabled |
| 智譜 GLM | 今天 Claude Code＋GLM Coding Plan 全部不能用，不管你付的是哪種錢。 | enabled / enabled / enabled |

The quick-dispatch outage check is correct: every preset of the vendor that is down is disabled.

## Root Cause

The outage event text `ev.outage.b` in `public/js/i18n/zh-TW.js` (and `en.js`) is 「今天 {agent} 全部不能用…」, filled with `VENDORS[v].agent`. The DeepSeek and 智譜 agent names start with "Claude Code" (`agent.deepseek` 「Claude Code 接 DeepSeek API」, `agent.zhipu` 「Claude Code＋GLM Coding Plan」), so when one of them is down the sentence reads as if Anthropic's Claude Code is down. The title 「{v} 服務大當機」 already names the vendor, but the body contradicts it at a glance.

## Proposed Solution

Make the vendor the subject of the body and keep the agent name as a parenthetical, as the user chose: 「今天 {v} 全部不能用（{agent} 也一樣），不管你付的是哪種錢。」, e.g. 「今天 智譜 GLM 全部不能用（Claude Code＋GLM Coding Plan 也一樣），不管你付的是哪種錢。」. English gets the same structure. The event already passes both `v` and `agent` to the dictionary, so only the two dictionary strings change; the execution log line `◆ <title>｜<text>` picks up the new text automatically.

## Non-Goals

- The other report on #56, "the outage event is not recorded in the log", is not part of this change. `endDay()` logs every drawn event (`log.event`) and a fake-DOM run shows the outage line; it has not been reproduced, and the reporter has not yet said where they looked. It stays open on #56.
- No change to which vendors an outage can hit, to the outage effect, or to the quick-dispatch / dispatch-panel outage checks.
- No change to agent or vendor names.

## Success Criteria

- With 智譜 down the event text is 「今天 智譜 GLM 全部不能用（Claude Code＋GLM Coding Plan 也一樣），不管你付的是哪種錢。」 and with DeepSeek down it is 「今天 DeepSeek 全部不能用（Claude Code 接 DeepSeek API 也一樣），不管你付的是哪種錢。」; assertions in `tools/check/random-events.test.js` check both.
- `node tools/check.js` passes, including the localization checks (same keys in `zh-TW` and `en`, English game has no Chinese).
- Fixed-seed simulator output for `SIM_N=100 SIM_SEED=101 node tools/sim.js` is byte-identical before and after (the change touches only text).

## Impact

- Affected specs: random-events (Requirement: Event effects)
- Affected code:
  - Modified: public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check/random-events.test.js, docs/spectra/specs/random-events/spec.md (via delta spec on archive)
  - New: none
  - Removed: none
- Refactor check (2026-10-13): only the two dictionaries change, 736 lines each; `public/js/actions.js` (533 lines) is not touched. No refactor needed.
