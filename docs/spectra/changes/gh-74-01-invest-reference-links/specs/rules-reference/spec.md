## ADDED Requirements

### Requirement: Reference links in the investment rules tab

The 投資與電腦 tab of the rules modal SHALL show the same reference links as the 工程投資 tab: each investment row's effect cell SHALL end with that investment's links, the 導入 SDD level 2 row's effect cell SHALL end with the level 2 links, and the name cell of every conference row and every machine row SHALL be a link to that item's URL. Links SHALL open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`. Clicking a link SHALL NOT close the modal or switch tabs.

#### Scenario: Every reference URL appears in the tab

- **WHEN** the player opens the 投資與電腦 tab
- **THEN** the tab contains a link for every investment reference URL, every 導入 SDD level 2 reference URL, every conference URL and every machine URL

#### Scenario: Conference name is a link

- **WHEN** the player opens the 投資與電腦 tab
- **THEN** the COSCUP row's name cell is a link to https://coscup.org/ that opens in a new tab

#### Scenario: Link click keeps the modal open

- **WHEN** the player clicks a reference link in the 投資與電腦 tab
- **THEN** the rules modal stays open on 投資與電腦
