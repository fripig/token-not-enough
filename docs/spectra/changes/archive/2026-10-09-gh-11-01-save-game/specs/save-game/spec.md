## Purpose

Keeps a run across page reloads and closed tabs by writing one save slot at the start of each in-game day and offering to resume it when the page loads. A reload rewinds to the morning of the current day.

## ADDED Requirements

### Requirement: Day-start save

The game SHALL write one save to `localStorage` under the key `tokgame-save` at these moments and no others:

- when the player confirms the opening setup modal (開始第 1 天), after the run's settings, first-day tickets and subscription fees are applied;
- when `endDay` moves the run to a new day, after that day's tickets, random event and seat review are applied and before the morning report modal opens.

The save SHALL contain the save structure version, the run state `S`, the dispatch selection `sel`, the ticket id counter, and the morning report (`null` for day 1; otherwise the report lines, the random event and whether it is a Monday). Dispatching, waiting, manual work, evaluation, investment, presets and the weekly 調整訂閱 confirm SHALL NOT write a save. When writing fails (storage unavailable or full), the game SHALL continue without error.

#### Scenario: Opening confirm saves day 1

- **WHEN** the player confirms the opening setup
- **THEN** `localStorage['tokgame-save']` holds a save with day 1 and a `null` morning report

#### Scenario: Day change saves the new morning

- **WHEN** the player ends day 3 and the run moves to day 4
- **THEN** the save holds day 4, the day-4 queue and the day-4 morning report

#### Scenario: Mid-day actions do not save

- **WHEN** the player dispatches a ticket on day 4 after the day-4 save was written
- **THEN** the save still holds the day-4 morning state without that dispatch

#### Scenario: Storage throws

- **WHEN** `localStorage.setItem` throws and the player ends a day
- **THEN** no error is thrown and the morning report modal opens

### Requirement: Resume on page load

When the page loads and a usable save exists, the game SHALL show a resume modal instead of the opening setup. The modal SHALL show the saved day, the saved companies and the saved mode (parallel with its slot count, or serial), and offer 繼續 and 開新局.

繼續 SHALL restore `S`, `sel` and the ticket id counter to the saved values and render the board. Every running job's ticket SHALL be the same object as the matching ticket in the queue. When the save has a morning report, the morning report modal SHALL open with it. Resuming SHALL NOT send any analytics event.

開新局 SHALL delete the save and open the opening setup as on a first visit.

When no save exists, page load SHALL open the opening setup as before.

#### Scenario: Resume a parallel run with an overnight job

- **WHEN** a day-4 save of a parallel run with 3 slots holds one running job, the page loads and the player chooses 繼續
- **THEN** the board shows day 4 with that job running, the job's ticket is the queue entry with the same id, and the day-4 morning report modal opens

##### Example: resume modal text

- **GIVEN** a save of day 7, companies Laravel and Rust, parallel mode with 4 slots
- **WHEN** the page loads
- **THEN** the modal line reads 第 7 天・<companyName of laravel+rust>・平行（同時 4 個 agent）

#### Scenario: Resume the day-1 save

- **WHEN** the save holds day 1 and the player chooses 繼續
- **THEN** the board shows day 1 and no modal stays open

#### Scenario: Start over instead

- **WHEN** a save exists, the page loads and the player chooses 開新局
- **THEN** the save is deleted and the opening setup opens

#### Scenario: No save

- **WHEN** no save exists and the page loads
- **THEN** the opening setup opens

#### Scenario: Resume sends no analytics

- **WHEN** a save is resumed with 繼續
- **THEN** no `game_start` or `day_reached` event is sent

### Requirement: Save structure version

The save SHALL carry a save structure version, an integer that starts at 1 and is independent of `GAME_VERSION`. A save is usable only when its JSON parses, its structure version equals the game's current one, its day is an integer from 1 to 20, its queue, jobs, companies and log are arrays, its ticket id counter is a non-negative integer, its morning report is `null` or has an array of report lines, and every running job's ticket id is in the queue. A save that is not usable SHALL be deleted, and page load SHALL show a notice that the save could not be read, whose only button opens the opening setup. Checking a save SHALL NOT change the current run state.

#### Scenario: Saves across save structure versions

##### Example: version and damage cases

| Stored save | Page load shows | Save afterwards |
| --- | --- | --- |
| version equal to the current one, valid content | resume modal | kept |
| version 1 below the current one | could-not-read notice | deleted |
| `GAME_VERSION` differs, structure version equal | resume modal | kept |
| text that is not JSON | could-not-read notice | deleted |
| a running job whose ticket id is not in the queue | could-not-read notice | deleted |
| day 21 | could-not-read notice | deleted |

#### Scenario: Storage unavailable on load

- **WHEN** reading `localStorage` throws and the page loads
- **THEN** the opening setup opens without error

### Requirement: Save lifetime

The save SHALL be deleted when a new month starts (開新局 in the resume modal, 再玩一個月 on the receipt, and any other call that starts a fresh run) and when the month-end receipt opens. The day-20 `endDay` that opens the receipt SHALL NOT write a save. Best scores SHALL be recorded for resumed runs the same way as for uninterrupted runs.

#### Scenario: Receipt clears the save

- **WHEN** the player ends day 20
- **THEN** the receipt opens and `localStorage['tokgame-save']` is absent

#### Scenario: Play again clears the save

- **WHEN** a save exists and the player presses 再玩一個月
- **THEN** the save is absent until the new opening setup is confirmed

#### Scenario: Resumed run records best score

- **WHEN** a resumed run reaches the receipt with a score above the stored best for its mode and companies
- **THEN** the best score key holds the new score
