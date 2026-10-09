## Context

All run state lives in three module-level bindings of `public/js/state.js`: `S` (the run), `sel` (the dispatch panel's current choice) and `uid` (the ticket id counter). `TRAP_RATE` is a constant in play (only `tools/sim.js` changes it) and `draft` in `public/js/modals.js` exists only while a setup modal is open. Nothing else in the game modules holds per-run state.

`S` is plain data except for two places that share object identity:

- A running parallel job (`S.jobs[i]`) holds `issue`, the same object that is still in `S.issues` with `running:true`. `settle` and `cancelJobs` mutate it through the job, and `endDay` filters `S.issues`, so the identity matters.
- `job.M` is a model object (possibly a copy from `effModel`). Nothing compares it by identity; it is read as data, so a JSON round trip is enough.

Today `main.js` calls `start()` at load, which runs `fresh()`, `firstIssues()`, `render()` and `showSetup(false)`. `start()` is also the 再玩一個月 handler in `showEnd`, and `tools/check.js` calls `start()` dozens of times to reset a run. `endDay` finishes the day change, sends `day_reached`, renders and opens `showDay`. The only existing `localStorage` use is the best score in `showEnd`, wrapped in try/catch.

## Goals / Non-Goals

**Goals:**

- A reload or a reopened tab resumes the run at the morning of the current day.
- One save slot, written automatically; no save/load buttons.
- A save from an incompatible code version never breaks the page: it is discarded with a notice.

**Non-Goals:**

- Mid-day saves. The player chose day-start saves, so replaying a day after a reload is allowed and not prevented.
- Multiple slots, export/import, cloud sync.
- Migrating saves across structure versions.
- Excluding resumed runs from best scores.
- A new analytics event for resuming.

## Decisions

### Save at the start of each day only

The save is written in two places: at the end of the opening setup's confirm (after settings, first-day tickets and subscription fees are applied, after `game_start`/`day_reached`) and at the end of `endDay`'s day change (after the new day's tickets and events, before `showDay`). The weekly 調整訂閱 confirm does not write a save, so reloading after a Monday adjustment rewinds to before it, refund included, which is consistent with "back to this morning".

Alternative considered: save after every action. Rejected by the user in favor of day-start saves.

### Single save slot under one localStorage key

Key `tokgame-save`. Value is JSON `{ver, S, sel, uid, morning}`. `ver` is `SAVE_VER`, an integer constant exported from `state.js`, starting at 1. `morning` is `null` for the day-1 save and `{rep, ev, monday}` for saves written by `endDay`: the same three arguments `endDay` passes to `showDay` (`rep` an array of strings, `ev` `null` or a `[title, text]` pair of strings, `monday` a boolean), so resuming can show the same morning report. The random event text is not written to the log, so without `morning` a resumed player would lose it.

### Save structure version instead of GAME_VERSION

`GAME_VERSION` changes on every deploy; tying the save to it would wipe every player's progress on each push. `SAVE_VER` is bumped by hand only when the shape of `S`, `sel` or a ticket/job changes in a way an old save cannot satisfy (a new field read without a default, a renamed field, a changed meaning). Pure number tweaks keep `SAVE_VER`. DESIGN.md records this rule next to the code map.

Alternative considered: always merge the saved `S` over `fresh()` defaults to tolerate new fields. Rejected: it hides real incompatibilities (nested objects such as `S.inv`, `S.st`, `S.used` would need per-key merging) and the user chose "same version reads, otherwise discard".

### Separate page-load entry from start

`start()` keeps its current meaning, "begin a new month", and additionally deletes the save. A new exported `boot()` in `main.js` is what the module calls at load: it reads the save and either opens the resume modal, opens the discard notice, or calls `start()`. `tools/check.js` and `showEnd`'s 再玩一個月 keep calling `start()` and therefore never see a resume modal.

### Rebind job issues on load

After parsing, every `S.jobs[i].issue` is replaced by the object in `S.issues` with the same `id`. If any job's issue id is missing from `S.issues`, the save is treated as invalid.

### Validation before applying a save

A save is usable only when: the JSON parses; `ver === SAVE_VER`; `S` is an object with integer `day` in 1–20, arrays `issues`, `jobs`, `companies`, `log`; `sel` is an object; `uid` is a non-negative integer; `morning` is `null` or an object whose `rep` is an array; and the job rebinding succeeds. Validation happens on parsed copies before `S`/`sel`/`uid` are reassigned, so a rejected save leaves the current state untouched. Any thrown error during read or validation counts as invalid.

### Resume and discard modals

Both reuse the existing `ov`/`mo` overlay with `mo.onclick`, like `showDay`.

- Resume modal: heading 繼續上一局？, one line with 第 N 天・`companyName(saved companies)`・平行（同時 N 個 agent）or 單線, buttons 繼續 (primary) and 開新局 (ghost). 繼續 applies the save and renders the board; when `morning` is present it then opens `showDay(morning.rep, morning.ev, morning.monday)`, otherwise it closes the overlay. 開新局 calls `start()`.
- Discard notice: heading 存檔無法讀取, one line saying the save came from an older version or was damaged and has been cleared, button 開新局 calling `start()`. The save is deleted before this modal opens.

## Implementation Contract

**Behavior**

- Confirming the opening setup leaves a save of day 1 in `localStorage['tokgame-save']`.
- Each `endDay` that moves to a new day leaves a save of that new day's morning state. The day-20 `endDay` that opens the receipt does not save; `showEnd` deletes the save.
- Page load with a valid save shows the resume modal; 繼續 restores `S`, `sel`, `uid` to the saved values (jobs' `issue` identical to the matching `S.issues` entry), shows the board and, for days after day 1, the saved morning report modal; no analytics event is sent.
- Page load with no save shows the opening setup exactly as today.
- Page load with an invalid save deletes it and shows the discard notice; its button opens the opening setup.
- `start()` deletes the save.
- Best scores in `showEnd` are unchanged in behavior.

**Interface (exports)**

- `state.js`: `SAVE_KEY` (`'tokgame-save'`), `SAVE_VER` (1), `saveGame(morning=null)` writes `{ver:SAVE_VER,S,sel,uid,morning}`; `readSave()` returns the parsed and validated `{S,sel,uid,morning}` or `null` and deletes an invalid save, reporting whether one was discarded (for example by returning `{bad:true}`); `loadGame(data)` assigns `S`, `sel`, `uid`; `clearSave()` removes the key. All `localStorage` access is inside try/catch; a failing `setItem` (quota, private mode) is silent.
- `main.js`: `boot()` as described; the module's last line calls `boot()` instead of `start()`.
- `modals.js`: `showResume(data)`, `showBadSave()`.

**Failure modes**

- `localStorage` unavailable or throwing: no save is written, load behaves as "no save", the game plays normally.
- Invalid save: deleted, notice shown, new game.

**Acceptance**

- `node tools/check.js` passes with new assertions covering every scenario in `specs/save-game/spec.md`, using the fake DOM's `store`.
- `node tools/sim.js` with `SIM_N=5` runs to completion.
- Manual browser check: play to day 3 in parallel mode with a job running overnight, reload, choose 繼續, the running job is listed and completes normally.

**Scope**

- In scope: the save, resume, discard and clear behavior above; check.js assertions; DESIGN.md update.
- Out of scope: mid-day saves, multiple slots, save migration, analytics changes, changes to scoring.

## Risks / Trade-offs

- [Forgetting to bump `SAVE_VER` after a state shape change] → an old save loads and a missing field throws or misbehaves mid-run. Mitigation: DESIGN.md rule beside the code map; `readSave` validation catches the common structural fields; a page reload after a crash still offers 開新局.
- [Day-start saves allow rerolling a day] → accepted by the user; best scores are not restricted.
- [Save size] → estimated well under 100 KB (log capped at 80 entries, tickets in the tens); not measured. A check.js assertion can print `JSON.stringify` length of a day-20 save if this becomes a concern.
- [Morning report shape drifts] → `morning` holds only strings and a boolean; validation requires `morning` to be `null` or an object with an array `rep`.
- [The fake DOM's `localStorage` has no `removeItem`] → `tools/fake-dom.js` gains `removeItem` so check.js and sim.js exercise the same code path as the browser.
