## ADDED Requirements

### Requirement: Ticket click scrolls to the dispatch panel on narrow screens

When the viewport is 860px wide or less (the width at which the queue and the tab panel stack in one column), clicking a ticket card SHALL, after selecting the ticket and activating the 派工台 tab, scroll the page so the top of the tab panel (its tab bar) is at the top of the viewport with an 8px gap. The scroll SHALL be smooth, and instant when the browser prefers reduced motion. This SHALL apply equally when the card is clicked while the 工程投資 tab is active. Above 860px a ticket card click SHALL NOT scroll the page. The one-click preset buttons under a card, batch dispatch, the tab buttons, the dispatch panel actions and the day dock SHALL NOT scroll the page. Without browser scrolling support (for example in the node tools) the click SHALL select the ticket as before and SHALL NOT throw. The scroll SHALL NOT change the game state, the save or the action log and SHALL NOT send a GA event.

#### Scenario: Phone width ticket click

- **WHEN** the viewport is 400px wide and the player clicks a ticket card
- **THEN** that ticket is selected, the 派工台 tab is active and the page scrolls smoothly to the tab panel's tab bar

#### Scenario: Desktop width ticket click

- **WHEN** the viewport is 1280px wide and the player clicks a ticket card
- **THEN** that ticket is selected and the page does not scroll

#### Scenario: One-click dispatch on a phone

- **WHEN** the viewport is 400px wide and the player clicks 一鍵派工 A under a card
- **THEN** the ticket is dispatched and the page does not scroll

#### Scenario: No scroll back after dispatch

- **WHEN** the viewport is 400px wide, the player clicks a ticket card and then the dispatch button
- **THEN** the page stays at the dispatch panel, which shows the "剛剛" entries

##### Example: Scroll behaviour by viewport and motion preference

| Viewport width | Prefers reduced motion | Ticket card click scrolls |
| -------------- | ---------------------- | ------------------------- |
| 400px          | no                     | yes, smooth               |
| 400px          | yes                    | yes, instant              |
| 860px          | no                     | yes, smooth               |
| 861px          | no                     | no                        |
