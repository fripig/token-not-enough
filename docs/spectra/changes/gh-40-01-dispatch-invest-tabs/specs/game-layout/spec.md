## ADDED Requirements

### Requirement: Dispatch and investment tabs

The game screen SHALL show the dispatch panel and the engineering investment panel as two tabs of one panel in the column next to the ticket queue: 派工台 and 工程投資. The 工程投資 tab label SHALL include 已做 N 項 with the same count as the month-end investment line. Exactly one tab SHALL be active; the other tab's content SHALL NOT be visible. The dispatch tab SHALL be active when the page loads, when a run starts and when a new day starts. Clicking a ticket card SHALL select that ticket and make the dispatch tab active. Buying an investment, registering for a conference or requesting a machine SHALL keep the investment tab active. The active tab SHALL NOT be stored in the game state, the save or `localStorage`, SHALL NOT send a GA event and SHALL NOT write an action log line. There SHALL be no separate full-width investment section.

#### Scenario: Switch to investments and back via a ticket

- **WHEN** the player clicks the 工程投資 tab, buys 單元測試, then clicks a ticket card
- **THEN** after the tab click the investment rows are visible and the dispatch controls are hidden; after the purchase the investment tab is still active and its label shows 已做 1 項; after the ticket click the dispatch tab is active with that ticket selected

#### Scenario: New day starts on dispatch

- **WHEN** the investment tab is active and the player ends the day
- **THEN** the next day's screen shows the dispatch tab active

#### Scenario: Not part of the run

- **WHEN** the player switches tabs several times
- **THEN** the save contents, the action log and the game values are unchanged and no GA event is sent
