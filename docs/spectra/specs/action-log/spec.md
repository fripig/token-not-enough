# action-log Specification

## Purpose

The action log (執行紀錄) is the in-game record of a run. It keeps every entry of the month and records each player decision with the inputs the player saw, plus every trust, money and KPI movement, so a finished month can be reviewed (復盤) from the log alone.

## Requirements

### Requirement: Log retention for the whole run

The action log SHALL keep every entry written during a run, newest first, with no entry limit. Starting a new run SHALL clear it. The log SHALL be saved and restored with the rest of the game state.

#### Scenario: Early entries survive a busy month

- **WHEN** more than 80 entries have been written in a run
- **THEN** the oldest entry of day 1 is still in the log

#### Scenario: New run clears the log

- **WHEN** the player clicks 再玩一個月
- **THEN** the log contains only entries of the new run

---
### Requirement: Dispatch decision line

Every agent dispatch, in parallel and serial mode, SHALL log one line `→ 派出 <title>（<tags>）｜<agent> / <model name>・<billing>・<review><sdd>｜成功率 <pe>%｜<trigger>｜預計 <hours>h`. `<tags>` SHALL be the shown complexity `複雜度 N`, then `今天到期` when the deadline is today or `第 N 天到期` otherwise, then 事故, 機敏 and 外包 for tickets with those flags, joined with ・. The model name SHALL include the effort suffix as defined in `reasoning-effort`. `<review>` SHALL be 不審核, 自審 or 嚴格審核. `<sdd>` SHALL be `・SDD markdown` when the applied SDD level is 1, `・SDD 框架` when it is 2, and empty when it is 0 or SDD is not owned (see `engineering-investments`). `<pe>` SHALL be the success rate the dispatch panel shows for the dispatched options, rounded to a whole percent, computed from the ticket as shown. `<trigger>` SHALL be 派工台 for the dispatch button, `一鍵派工方案 <letter>` for one-click dispatch and `批次派工方案 <letter>` for batch dispatch. In serial mode the dispatch line SHALL be written before the result line of the same dispatch.

#### Scenario: One-click dispatch in parallel mode

- **WHEN** on day 3 with SDD not owned the player one-click dispatches a complexity 2 ticket due on day 4 with 方案 B (Claude Code / Sonnet, 公司 API, 自審) and the panel would show 97%
- **THEN** the newest log line reads `D03 → 派出 <title>（複雜度 2・第 4 天到期）｜Claude Code / Sonnet・公司 API・自審｜成功率 97%｜一鍵派工方案 B｜預計 <hours>h`

#### Scenario: Serial mode logs the dispatch before the result

- **WHEN** the player dispatches a ticket from the dispatch panel in serial mode
- **THEN** the second-newest line is the 派出 line with 派工台 and the newest line is the result line

#### Scenario: Unrevealed trap shows the shown odds

- **WHEN** an unrevealed trap shown as complexity 1 is dispatched with a capability 3 model and no review
- **THEN** the dispatch line shows 複雜度 1 and the success rate computed for complexity 1

##### Example: tags

| Ticket | Tags |
| --- | --- |
| complexity 3, due today, incident | 複雜度 3・今天到期・事故 |
| complexity 2, due day 9, sensitive | 複雜度 2・第 9 天到期・機敏 |
| complexity 1, due day 5, gig | 複雜度 1・第 5 天到期・外包 |

#### Scenario: SDD level in the dispatch line

- **WHEN** the player dispatches with Claude Code / Sonnet, 公司 API and 自審 at each applied SDD level
- **THEN** the options segment of the dispatch line is as listed

##### Example: options segment

| Applied SDD level | Segment |
| --- | --- |
| 0 | `Claude Code / Sonnet・公司 API・自審` |
| 1 | `Claude Code / Sonnet・公司 API・自審・SDD markdown` |
| 2 | `Claude Code / Sonnet・公司 API・自審・SDD 框架` |

---
### Requirement: Billing method on result and evaluation lines

Every attempt result line (success, failure, merge conflict) SHALL name the agent as `<agent> / <model name>・<billing>`; a success line SHALL keep its review suffix when review is not 不審核. Every architecture evaluation line SHALL contain `評估｜<agent> / <model name>・<billing>`, using the model name without effort.

#### Scenario: Failure names the billing method

- **WHEN** a DeepSeek Chat attempt billed to 個人 API fails its test
- **THEN** the log line contains `Claude Code 接 DeepSeek API / Chat・個人 API` and 測試沒過，改壞了

#### Scenario: Evaluation names model and billing

- **WHEN** the player evaluates a ticket with Claude Code / Opus billed to 公司 API and nothing is found
- **THEN** the log line contains `評估｜Claude Code / Opus・公司 API` and 評估完成，看起來沒問題

---
### Requirement: Waiting line

In parallel mode, 等 1 小時 SHALL log `· 等待 <h>h（<from>→<to>）` and 等到下一個 agent 完成 SHALL log `· 等到下一個 agent 完成 <h>h（<from>→<to>）`, where `<from>` is the clock before waiting and `<to>` is the clock after the wait, capped at 17:00, and `<h>` is the time that passes with one decimal. The line SHALL be written before any result produced during the wait. Nothing SHALL be logged when no time passes.

#### Scenario: Wait one hour

- **WHEN** at 10:00 the player clicks 等 1 小時
- **THEN** the log has `· 等待 1.0h（10:00→11:00）` written before (older than) any result line produced during that hour

#### Scenario: Wait capped at end of day

- **WHEN** at 16:30 the player clicks 等 1 小時
- **THEN** the log has `· 等待 0.5h（16:30→17:00）`

---
### Requirement: Random event line

When a random event is drawn at the start of a day, the log SHALL record `◆ <event title>｜<event text>` with that day's prefix, the same title and text shown in the morning report.

#### Scenario: Manager complains

- **WHEN** the event 主管問進度怎麼這麼慢 is drawn on day 7 with KPI 0
- **THEN** the log has `D07 ◆ 主管問進度怎麼這麼慢｜「KPI 才 0，要超過 49 才跟得上進度。」信任 -4。`

---
### Requirement: New week on the day-start line

On days 6, 11 and 16 the day-start line SHALL read `— 第 N 天開工・新的一週，每週額度重置，新進 <n> 張工單…—`; other days SHALL keep `— 第 N 天開工，新進 <n> 張工單…—`.

#### Scenario: Day 6 starts

- **WHEN** day 5 ends
- **THEN** the day-start line for day 6 contains 新的一週，每週額度重置

---
### Requirement: End-of-day summary line

The game SHALL keep a day-start baseline of KPI, trust, wallet and company budget. The day 1 baseline SHALL be taken when the opening setup is confirmed, after subscription fees; confirming 週一調整 SHALL NOT reset it. Each later baseline SHALL be taken when the day number advances, before that morning's seat and hardware reviews, random event and new tickets. When a day ends, after all end-of-day penalties and before the day-20 receipt, the log SHALL record `═ 第 N 天下班｜KPI <Δ>（<v>）｜信任 <Δ>（<v>）｜錢包 <Δ>（<v>）｜公司 <Δ>（<v>）`, where each Δ is the current value minus the baseline as a signed integer (`±0` when unchanged) and money uses NT$ formatting. A loaded save without a baseline SHALL take the baseline from its current values.

#### Scenario: Summary after a bad day

- **WHEN** day 3 starts with KPI 37, trust 70, wallet NT$7,360, company NT$11,310, and ends with KPI 61, trust 62, wallet NT$7,240, company NT$10,900
- **THEN** the log has `D03 ═ 第 3 天下班｜KPI +24（61）｜信任 -8（62）｜錢包 -NT$120（NT$7,240）｜公司 -NT$410（NT$10,900）`

#### Scenario: Day 20 gets a summary

- **WHEN** day 20 ends
- **THEN** the summary line for day 20 is in the log before the receipt opens

#### Scenario: Morning event counts toward the new day

- **WHEN** day 8 starts with the event 外包案尾款入帳 and nothing else changes the wallet that day
- **THEN** the day 8 summary shows 錢包 +NT$1,500

#### Scenario: Old save without a baseline

- **WHEN** a save without a day-start baseline is loaded on day 5 and nothing changes during the day
- **THEN** the day 5 summary shows ±0 for all four values

---
### Requirement: Previous day summary in the morning report

From day 2 on, the morning report SHALL open with a summary row for the day that just ended: a caption naming that day and four cells, KPI, 信任, 錢包 and 公司, each showing the change and the current value with the same numbers as that day's end-of-day summary line (requirement "End-of-day summary line"). Changes SHALL be signed (`+24`, `-8`, `±0`, and for money `-NT$120` or `±NT$0`); wallet and company values SHALL use NT$ formatting. A KPI or trust gain SHALL be styled as positive and a loss as negative; wallet and company changes SHALL use the neutral style. Resuming a save SHALL show the saved row; a save whose morning report has no summary SHALL show the report without the row.

#### Scenario: Summary after a bad day

- **WHEN** day 3 starts with KPI 37, trust 70, wallet NT$7,360, company NT$11,310, and ends with KPI 61, trust 62, wallet NT$7,240, company NT$10,900
- **THEN** the day 4 morning report shows the caption for day 3 and the cells KPI `+24` (61), 信任 `-8` (62) styled as a loss, 錢包 `-NT$120` (NT$7,240) and 公司 `-NT$410` (NT$10,900)

#### Scenario: Old save without a summary

- **WHEN** a save whose morning report lacks the summary is resumed on day 7
- **THEN** the day 7 morning report opens without the summary row and no error is thrown

<!-- @trace
source: gh-42-01-morning-summary-sub-default
updated: 2026-10-11
code:
  - public/js/i18n/en.js
  - public/js/i18n/zh-TW.js
  - public/js/modals.js
tests:
  - tools/check/work-calendar.test.js
-->