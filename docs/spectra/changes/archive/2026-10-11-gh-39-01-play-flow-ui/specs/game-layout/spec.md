## Purpose

Defines where the player's recurring controls and feedback sit on the game screen and how modals and option buttons look, so the daily loop (dispatch, wait, end the day) works without hunting for controls on desktop and at 400px width.

## ADDED Requirements

### Requirement: Day controls dock

The game screen SHALL render the day controls in a dock that is the last element of the game screen and stays pinned to the bottom of the viewport while the player scrolls the game screen. The dock SHALL contain, in this order: a status text with the current day and time, the "wait 1 hour" and "wait for the next agent" buttons (parallel mode only), the "adjust subscription" button (Mondays only, days 1, 6, 11, 16), and the "end day" button. The buttons SHALL keep their existing actions, labels and disabled conditions. The time SHALL be the parallel-mode clock (for example `11:00`) in parallel mode and the hours left (for example `6.4h`) in single mode. The action log section SHALL NOT contain these buttons.

#### Scenario: Parallel mode on day 1

- **WHEN** a parallel-mode run is on day 1 at 9:00 with no agent running
- **THEN** the dock shows day 1 and `9:00`, the wait 1 hour button, a disabled wait-for-next-agent button, the adjust subscription button and the end day button for day 1, and the action log section has none of these buttons

#### Scenario: Single mode on day 2

- **WHEN** a single-mode run is on day 2 with 6.4 hours left
- **THEN** the dock shows day 2 and `6.4h`, has no wait buttons and no adjust subscription button, and has the end day button for day 2

#### Scenario: End day from the dock

- **WHEN** the player clicks the end day button in the dock
- **THEN** the day ends exactly as it did from the old button

### Requirement: Recent results in the empty dispatch panel

When no ticket is selected, the dispatch panel SHALL show its existing hint and, when the action log is not empty, the newest 3 action log entries (fewer if the log has fewer) under a "just now" label, newest first, with the same colour class each entry has in the log. Selecting a ticket SHALL replace this view with the dispatch controls. Dispatching SHALL NOT select another ticket automatically.

#### Scenario: After a parallel dispatch

- **WHEN** the player dispatches the selected ticket in parallel mode
- **THEN** no ticket is selected and the dispatch panel shows the dispatch log line for that ticket as the first entry under "just now"

##### Example: Entry count

| Log entries | Entries shown in the panel |
| ----------- | -------------------------- |
| 0           | none, hint only            |
| 2           | 2                          |
| 7           | the newest 3               |

### Requirement: Modal backdrop darkens the page

The modal backdrop SHALL darken the page behind a modal in both light and dark themes. Its colour SHALL come from a dedicated colour token: in the light theme the same colour as before (the light ink colour at 45% opacity), in the dark theme black at 60% opacity.

#### Scenario: Dark mode modal

- **WHEN** the browser prefers a dark colour scheme and a morning report modal opens
- **THEN** the page behind the modal is darker than without the modal

### Requirement: Option buttons align text left

Option buttons (the segmented choices used in the dispatch panel, investment panel and modals) SHALL left-align their text, including description lines that wrap.

#### Scenario: Wrapped description

- **WHEN** the setup modal shows the Rust work-content button and its description wraps to two lines
- **THEN** both lines start at the button's left padding
