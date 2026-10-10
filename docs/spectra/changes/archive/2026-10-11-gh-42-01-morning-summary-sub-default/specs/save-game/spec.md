## MODIFIED Requirements

### Requirement: Day-start save

The game SHALL write one save to `localStorage` under the key `tokgame-save` at these moments and no others:

- when the player confirms the opening setup modal (開始第 1 天), after the run's settings, first-day tickets and subscription fees are applied;
- when `endDay` moves the run to a new day, after that day's tickets, random event and seat review are applied and before the morning report modal opens.

The save SHALL contain the save structure version, the run state `S`, the dispatch selection `sel`, the ticket id counter, and the morning report (`null` for day 1; otherwise the report lines, the random event, whether it is a Monday and the previous day's summary figures, see `action-log`). Dispatching, waiting, manual work, evaluation, investment, presets and the weekly 調整訂閱 confirm SHALL NOT write a save. When writing fails (storage unavailable or full), the game SHALL continue without error.

#### Scenario: Opening confirm saves day 1

- **WHEN** the player confirms the opening setup
- **THEN** `localStorage['tokgame-save']` holds a save with day 1 and a `null` morning report

#### Scenario: Day change saves the new morning

- **WHEN** the player ends day 3 and the run moves to day 4
- **THEN** the save holds day 4, the day-4 queue and the day-4 morning report including the day-3 summary figures

#### Scenario: Mid-day actions do not save

- **WHEN** the player dispatches a ticket on day 4 after the day-4 save was written
- **THEN** the save still holds the day-4 morning state without that dispatch

#### Scenario: Storage throws

- **WHEN** `localStorage.setItem` throws and the player ends a day
- **THEN** no error is thrown and the morning report modal opens
