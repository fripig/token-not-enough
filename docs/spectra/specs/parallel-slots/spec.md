# parallel-slots Specification

## Purpose

Lets the player choose how many background agents run at once in parallel mode, turning the token-cost and merge-conflict trade-off of running agents concurrently into a decision made at the start of each run.

## Requirements

### Requirement: Slot count selection

When parallel mode is selected in the opening setup modal, the modal SHALL offer slot counts 2, 3, 4, 5 and 6 with 3 selected by default, and confirming SHALL set the run's slot count. The picker SHALL NOT appear for serial mode or in the weekly subscription adjustment modal. The slot count SHALL persist to the next run started with 再玩一個月, and an invalid stored value SHALL fall back to 3.

#### Scenario: Pick five slots

- **WHEN** the player selects parallel mode and 5 slots, then starts day 1
- **THEN** the background-agent list shows 0 / 5

#### Scenario: Serial mode hides the picker

- **WHEN** the player selects serial mode in the opening modal
- **THEN** no slot buttons are shown

#### Scenario: Replay keeps the count

- **WHEN** a parallel run with 6 slots ends and the player clicks 再玩一個月
- **THEN** the opening modal preselects 6 slots

---
### Requirement: Slot limit on dispatch

In parallel mode the player SHALL NOT be able to have more background agents running than the chosen slot count; the dispatch button SHALL be disabled and the warning 工作槽都滿了，先等一個 agent 跑完。 SHALL be shown when all slots are busy. Token multiplier and merge-conflict chance SHALL keep their existing per-running-agent formulas.

#### Scenario: Two slots fill up

- **WHEN** the run has 2 slots and 2 agents are running
- **THEN** a third dispatch is refused and the dispatch button is disabled

##### Example: maximum token multiplier by slot count

| Slots | Agents already running | Token multiplier for the next dispatch |
| ----- | ---------------------- | -------------------------------------- |
| 2 | 1 | 1.15 |
| 4 | 3 | 1.45 |
| 6 | 5 | 1.75 |

---
### Requirement: Slot count on the receipt

The month-end receipt title for a parallel run SHALL include the slot count.

#### Scenario: Receipt title

- **WHEN** a Laravel 新聞站 parallel run with 4 slots ends
- **THEN** the receipt title is 月底結算・Laravel 新聞站・平行模式（4 個 agent）
