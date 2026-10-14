## MODIFIED Requirements

### Requirement: Resume on page load

When the page loads and a usable save exists, the game SHALL show a resume modal instead of the opening setup. The modal SHALL show the saved day, the saved companies and the saved mode (平行 or 單線, with no agent count), and offer 繼續 and 開新局. A save that still carries a `slots` field from before #63 SHALL be usable and SHALL resume with the field ignored.

繼續 SHALL restore `S`, `sel` and the ticket id counter to the saved values and render the board. Every running job's ticket SHALL be the same object as the matching ticket in the queue. When the save has a morning report, the morning report modal SHALL open with it. Resuming SHALL NOT send any analytics event.

開新局 SHALL delete the save and open the opening setup as on a first visit.

When no save exists, page load SHALL open the opening setup as before.

#### Scenario: Resume a parallel run with an overnight job

- **WHEN** a day-4 save of a parallel run holds one running job, the page loads and the player chooses 繼續
- **THEN** the board shows day 4 with that job running, the job's ticket is the queue entry with the same id, and the day-4 morning report modal opens

##### Example: resume modal text

- **GIVEN** a save of day 7, companies Laravel and Rust, parallel mode
- **WHEN** the page loads
- **THEN** the modal line reads 第 7 天・<companyName of laravel+rust>・平行

#### Scenario: Old save with a slot count

- **WHEN** a day-5 parallel save written before #63 carries `slots: 4` and two running jobs, the page loads and the player chooses 繼續
- **THEN** the board shows day 5 with both jobs running, the header shows 背景 agent 2, and a third ticket can be dispatched with no slot limit

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
