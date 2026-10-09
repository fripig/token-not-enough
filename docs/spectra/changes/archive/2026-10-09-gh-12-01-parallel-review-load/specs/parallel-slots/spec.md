## MODIFIED Requirements

### Requirement: Slot count selection

When parallel mode is selected in the opening setup modal, the modal SHALL offer slot counts 2, 3, 4, 5 and 6 with 3 selected by default, and confirming SHALL set the run's slot count. Each slot button SHALL show the maximum PR review load 審 PR 最多 ×<1 + 0.25 × (n − 1), two decimals> and the maximum conflict chance 衝突最多 <10 × (n − 1)>%. The picker SHALL NOT appear for serial mode or in the weekly subscription adjustment modal. The slot count SHALL persist to the next run started with 再玩一個月, and an invalid stored value SHALL fall back to 3.

#### Scenario: Pick five slots

- **WHEN** the player selects parallel mode and 5 slots, then starts day 1
- **THEN** the background-agent list shows 0 / 5

#### Scenario: Serial mode hides the picker

- **WHEN** the player selects serial mode in the opening modal
- **THEN** no slot buttons are shown

#### Scenario: Replay keeps the count

- **WHEN** a parallel run with 6 slots ends and the player clicks 再玩一個月
- **THEN** the opening modal preselects 6 slots

#### Scenario: Slot button labels

- **WHEN** the opening modal shows the 4-slot button
- **THEN** it shows 審 PR 最多 ×1.75 and 衝突最多 30%

### Requirement: Slot limit on dispatch

In parallel mode the player SHALL NOT be able to have more background agents running than the chosen slot count; the dispatch button SHALL be disabled and the warning 工作槽都滿了，先等一個 agent 跑完。 SHALL be shown when all slots are busy. PR review load and merge-conflict chance SHALL keep their per-running-agent formulas. A dispatch's tokens SHALL NOT depend on the number of running agents.

#### Scenario: Two slots fill up

- **WHEN** the run has 2 slots and 2 agents are running
- **THEN** a third dispatch is refused and the dispatch button is disabled

##### Example: maximum PR review load by slot count

| Slots | Other agents still running at most | PR review load |
| ----- | ---------------------------------- | -------------- |
| 2 | 1 | 1.25 |
| 4 | 3 | 1.75 |
| 6 | 5 | 2.25 |
