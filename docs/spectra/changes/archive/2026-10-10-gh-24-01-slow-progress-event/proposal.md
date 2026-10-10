## Problem

A player (issue #24) reported losing trust "for not using AI" although they never bought a computer, on a new game, right after day 1 ended. The message only appeared in the morning report pop-up, so there is no original text.

Reproduction on the current version (`82523b6`, node with the fake DOM, fixed seeds, new game confirmed through the setup pop-up, no hardware request) ran 1,000 games per play style and counted the trust-losing log lines between the end of day 1 and the morning of day 2:

| Day 1 play style | Hardware idle penalty | 主管問進度怎麼這麼慢 event (−4) | Security audit (−12) |
| --- | --- | --- | --- |
| Quick-dispatch every ticket, then end the day | 0 | 18 | 267 |
| End day 1 without doing anything | 0 | 83 | 0 |

The case that matches the report shows `D02 ◆ 主管問進度怎麼這麼慢｜「不是有買 AI 嗎？」信任 -4。` in the morning report after a day 1 with KPI 0.

## Root Cause

The hardware idle penalty works as specified: at the start of a new game `S.hw`, `S.hwReq` and `S.hwUsed` are all empty, and `endDay` only charges idle trust for computers in `S.hw`. The trust loss comes from the manager random event in `EVENTS`: when drawn and KPI is not above day × 7, trust drops by 4 with the text 「不是有買 AI 嗎？」. Two problems make it read like a hardware penalty:

- The text says 「買 AI」 (bought AI) and gives no reason; the real reason (KPI below the day × 7 pace) is not shown anywhere in the game.
- It can fire from the morning of day 2, when a player who spent day 1 learning the game cannot have reached the pace yet.

## Proposed Solution

- **Text**: the manager event names the current KPI and the threshold. Praise: 「KPI 已經 40，超過 35，AI 工具用得很有效率。」信任 +6。 Doubt: 「KPI 才 30，要超過 49 才跟得上進度。」信任 -4。 The words 「買 AI」 are removed.
- **Balance**: on days 2–5 (the first week), when KPI is not above the threshold, the event shows a no-effect reminder titled 主管在週會上提醒進度 with 「KPI 目前 0。第一週先熟悉工具，之後 KPI 要超過天數 × 7。」沒有其他變化。 Trust does not change. Praise in the first week is unchanged (+6). This follows the traffic spike event, which is a no-effect notice before day 6.
- The pace (7 per day), praise (+6) and doubt (−4) numbers become named constants; the rules pop-up reads them and explains the event.
- `docs/DESIGN.md` records the decision and the measured balance change from `tools/sim.js`.

## Non-Goals

- No change to the hardware idle penalty (`HW_IDLE`) or hardware purchase rules; they already behave as specified.
- No change to the threshold itself (KPI > day × 7, strict) or to how often events are drawn.
- No compensation in later weeks for doubts skipped in week 1.
- No change to other events' text.

## Success Criteria

- On days 2–5 with KPI not above day × 7, the manager event leaves trust unchanged and shows 主管在週會上提醒進度.
- On day 6 or later with KPI not above day × 7, trust drops by 4 and the text states the current KPI and the threshold.
- No event text contains 「不是有買 AI 嗎」.
- `node tools/check.js` passes with the updated `random-events` and `action-log` assertions.
- `tools/sim.js` before/after averages are recorded in `docs/DESIGN.md`.

## Impact

- Affected specs: `random-events`, `action-log`
- Affected code:
  - Modified: public/js/actions.js, public/js/rules.js, tools/check.js, docs/DESIGN.md
  - New: none
  - Removed: none
- Save data: no new fields, `SAVE_VER` unchanged (old saves keep the morning report text they were saved with).
