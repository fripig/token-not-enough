## Context

The action log (執行紀錄) is the list under the dispatch area. `log(cls,msg)` prepends `{cls,msg}` to `S.log` with a `Dnn` day prefix and drops the oldest entry beyond 80. `S` is saved whole every morning, so the log already survives a reload; the end-of-month receipt already has a 看看紀錄 button that closes the receipt so the log can be read.

What the log is missing today (checked in public/js/actions.js on 2026-10-10):

- `dispatch` logs `→ 派出 <title>｜<agent> / <model>｜預計 Nh` only in parallel mode; serial mode logs only the result. Neither names billing, review, the shown success rate or how the dispatch was triggered.
- `settle` result lines name agent / model (and review on success) but not billing.
- `evaluate` lines do not name the model or billing.
- `wait` logs nothing.
- `endDay` writes overdue lines without the trust drop, and the morning report says only 主管信任下降; random events (`ev`) and the new week appear only in the morning modal.
- No line summarises how KPI, trust, wallet and company budget moved during a day.

The user's goal (issue #25 discussion, 2026-10-10): the log should let the player review (復盤) the whole month — every decision and why numbers moved. A replay view is split into a follow-up change `gh-25-02-log-replay`.

## Goals / Non-Goals

**Goals:**

- Keep every log entry of a run.
- Record each player decision with the inputs the player saw when making it.
- Record every trust / money / KPI movement that was previously only visible in a modal, plus a per-day summary.
- Keep saves compatible (`SAVE_VER` unchanged) and keep game randomness untouched.

**Non-Goals:**

- A replay / playback view, per-entry stat snapshots, or charts — follow-up change `gh-25-02-log-replay`.
- A separate "daily report history" panel or a 再看今天早上報告 button (rejected, see Decisions).
- Logging non-decisions: selecting a ticket, switching vendor/model in the panel, 載入方案, opening modals.
- Changing the log panel layout, filtering, search or export.
- Changing any rule, number or GA event.

## Decisions

### Messages go into the existing action log, not a new history panel

Options discussed with the user: (a) add missing messages to the existing log, (b) a new expandable 每日報告 history storing each morning report, (c) both plus a button to reopen today's morning report. The user chose (a). The log is already saved and already reachable from the receipt; (b) would duplicate most lines and add a new data structure and UI block.

### Keep the whole month of log entries

Options: remove the 80-entry cap, raise it to a fixed number such as 500, or keep 80. The user chose removing the cap. A run is bounded (20 days, the log is cleared by `start()`), so the log cannot grow without limit. The pre-implementation estimate was 300–400 entries per month. Measured after implementation (2026-10-10, `SIM_LOG=1 SIM_N=20 node tools/sim.js`, 360 runs per mode, end of month): parallel mode 501 entries on average, 624 at most, saved JSON 45,455 characters on average, 59,412 at most; serial mode 217 / 258 entries, 22,716 / 27,320 characters. The automatic player rarely evaluates or one-click dispatches, so real players can write more lines, but the saved size stays two orders of magnitude below the localStorage quota (about 5 million characters), so the decision stands.

### Dispatch log records the full decision in both modes

Options: full (complexity, deadline, tags, billing, review, effort, shown success rate, trigger, hours) or minimal (billing and review only). The user chose full, with the preview:

```
D03 → 派出 修正標籤頁分頁（複雜度 2・第 4 天到期）｜Claude Code / Sonnet・公司 API・自審｜成功率 97%｜一鍵派工方案 B｜預計 1.4h
```

The success rate is the one the dispatch panel shows for the selected options (`est(...).pe` on the ticket as shown, i.e. shown complexity for an unrevealed trap), because the point of review is to compare what the player saw with what happened. Serial mode logs the same dispatch line immediately before its result line.

### Result and evaluation lines name the billing method

The `who` part of every settle line (success, failure, merge conflict) becomes `<agent> / <model>・<billing>`; the success line keeps its review suffix. Evaluation lines add `<agent> / <model>・<billing>` after 評估. Effort is already in the model name (Sonnet・高強度) for dispatch; evaluation ignores effort by rule, so it uses the plain model name.

### Waiting is logged with the clock range

Hours use the game's one-decimal format (`1.0h`). The user chose to log waiting. It only exists in parallel mode. `advance()` adds PR review hours when an agent finishes during the wait, so the real elapsed time can exceed the requested hour; the line is therefore written after the clock advances, with the actual elapsed hours and clock range, and moved in the log to just before (older than) the entries written during the wait, so completions still appear after it in time order.

### Random events, overdue trust and new week are logged

Random events are logged with title and text. Overdue lines add the trust drop per ticket, and the morning report line states the total (`N 張工單逾期，主管信任 -X。`). The day-start line marks Mondays after day 1.

### End-of-day summary line with a day-start baseline in state

The user chose to add a summary. To compute a day's change, the game stores a baseline `S.dayStart = {kpi, trust, wallet, corp}`:

- day 1: set when the opening setup is confirmed (after subscription fees), not on 週一調整 confirms;
- later days: set in `endDay` right after the day number advances, before morning events, seat/hardware results and intake, so morning effects count toward the new day.

The summary is written in `endDay` after every end-of-day penalty (overdue, company daily spend, idle hardware) and before the day-20 receipt, so day 20 also gets one. Rejected: deriving deltas by parsing log lines (fragile) or writing the summary into the morning modal only (would vanish again).

### Save compatibility without bumping SAVE_VER

`S.log` only gains entries. `S.dayStart` is new; `loadGame` fills it from the loaded run's current KPI, trust, wallet and company budget when missing. The only effect for an old save is that the first day after loading excludes that morning's event effects from its summary. Per the DESIGN.md rule, a new field with a load-time default does not require a `SAVE_VER` bump.

### No refactor before this change

Measured 2026-10-10: actions.js 341 lines / 23.3KB, modals.js 188, view.js 152, calc.js 97, state.js 102; largest module far below the ~1,000-line signal, and view.js is not touched. Conclusion: implement in the current style.

## Implementation Contract

**Behavior (log line formats; `Dnn ` prefix added by `log` as today):**

| Event | Class | Format |
|---|---|---|
| Dispatch (both modes) | dim | `→ 派出 <title>（<tags>）｜<agent> / <model name>・<billing>・<review>｜成功率 <pe>%｜<trigger>｜預計 <hrs>h` |
| Success | ok | `✓ <title>｜<agent> / <model name>・<billing>・<review>｜…` (rest unchanged; review suffix only when review is not 不審核, as today) |
| Failure / conflict | bad / warn | `<agent> / <model name>・<billing>` replaces `<agent> / <model name>`; rest unchanged |
| Evaluation (all outcomes) | as today | `<title>｜評估｜<agent> / <model name>・<billing>｜…` |
| 等 1 小時 | dim | `· 等待 <h>h（<from>→<to>）` |
| 等到下一個 agent 完成 | dim | `· 等到下一個 agent 完成 <h>h（<from>→<to>）` |
| Random event | dim | `◆ <event title>｜<event text>` |
| Overdue company ticket | bad | `⌛ 逾期：<title>｜KPI -<n>｜信任 -<t>` |
| Day start | dim | `— 第 N 天開工<・新的一週，每週額度重置 on days 6/11/16>，新進 …` (rest unchanged) |
| End of day | dim | `═ 第 N 天下班｜KPI <±d>（<v>）｜信任 <±d>（<v>）｜錢包 <±NT$d>（<NT$v>）｜公司 <±NT$d>（<NT$v>）` |

- `<tags>`: `複雜度 <shown cx>`, then `今天到期` or `第 <due> 天到期`, then any of 事故, 機敏, 外包, joined with `・`.
- `<review>`: 不審核, 自審 or 嚴格審核 (`REVIEW[rv].name`). `<billing>`: `BILL_LABEL`.
- `<trigger>`: 派工台 (via panel), `一鍵派工方案 <X>` (via quick), `批次派工方案 <X>` (via batch).
- `<from>`/`<to>`: the parallel-mode clock (9:00 + elapsed); `<to>` is capped at 17:00. Nothing is logged when no time would pass.
- `<t>`: the rule amount for that ticket (4, 8 for an incident, 4 for an incident with 監控告警), even when trust is already near 0. The morning report total is the sum of these.
- Deltas: integers with sign; zero shows `±0`; money uses the game's `nt` formatting.
- Morning-report order in the log: seat/hardware results, then the random event, then the day-start line (logging order; the panel shows newest first).

**Data shape:** `S.dayStart: {kpi:number, trust:number, wallet:number, corp:number}`; `S.log` unchanged in shape, no length cap.

**Failure modes:** a missing `S.dayStart` on load is filled from current values, never an error. Logging never calls `Math.random`.

**Acceptance criteria:**

- `node tools/check.js` passes with new assertions for each row of the table above, uncapped retention, the day-1 baseline, the old-save fallback and the morning report total.
- `SIM_SEED=1 SIM_N=20 node tools/sim.js` prints identical output before and after the change.
- Manual: play a few days in each mode at http://localhost:8000 (python3 -m http.server -d public 8000) and confirm the lines appear and the log scrolls in both themes and at 400px.

**Scope boundaries:** in scope — log content, retention, day baseline, the overdue morning-report wording, check.js, DESIGN.md. Out of scope — replay UI, per-entry snapshots, log panel layout, GA events, rules text, balance numbers.

## Risks / Trade-offs

- [Long log is tedious to scroll back to day 1] → accepted for now; the replay change `gh-25-02-log-replay` adds day navigation.
- [Saved size grows with the uncapped log] → bounded by one month; measured in the tasks and recorded in DESIGN.md.
- [Overdue trust in the log can exceed the trust actually lost when trust hits 0] → the end-of-day summary shows the actual change.
- [Shown success rate for an unrevealed trap differs from the real odds] → intended: the log records what the player saw.
- [Existing check.js assertions read `S.log[0]`] → new lines are written before the result or evaluation line they precede, so `S.log[0]` after those actions is still the result line; the full check run confirms it.
