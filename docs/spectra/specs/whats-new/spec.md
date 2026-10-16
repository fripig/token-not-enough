# whats-new Specification

## Purpose

Tells a returning player, once, which player-visible updates shipped since their last visit, before they continue their run or start a new one. The full list stays readable from the rules modal.

## Requirements

### Requirement: Update entries

The game SHALL keep a list of player-visible update entries, newest first. Each entry SHALL have a unique id and a ship date written `YYYY-MM-DD`; dates SHALL NOT increase from one entry to the next. Each entry's sentence SHALL be the dictionary key `news.<id>`, present and non-empty in every registered language, and the English sentence SHALL contain the same numbers as the 繁體中文 sentence. Dates SHALL be shown as `YYYY-MM-DD` in every language. Entries SHALL only be added at the front of the list. The first version SHALL contain 22 entries, including `gh-65-01` (the usage challenge, shipped on 2026-10-16 while this change was in progress), from `gh-32-01` (2026-10-10) to `gh-66-01` (the ship date of this change).

#### Scenario: Entries are well formed

- **WHEN** the checks read the update list
- **THEN** ids are unique, dates are non-increasing, and every id has a `news.<id>` sentence in 繁體中文 and English

#### Scenario: First version range

- **WHEN** the change ships
- **THEN** the oldest entry is `gh-32-01` dated 2026-10-10, the newest is `gh-66-01`, and there are 22 entries

---
### Requirement: Seen marker

The game SHALL remember the newest entry the player has been shown in `localStorage` key `tokgame-news`, as that entry's id. The unseen entries SHALL be the entries listed before that id. A stored id that is not in the list SHALL count as no unseen entries. When `tokgame-news` is absent, the browser SHALL count as a returning player if `localStorage` has `tokgame-save` or any key starting with `tokgame-best-`; otherwise it SHALL count as a first-time visitor, the marker SHALL be set to the newest id, and no entry is unseen. Every `localStorage` read and write SHALL be wrapped in try/catch; a failed read SHALL count as no unseen entries and SHALL write nothing.

#### Scenario: Which entries are unseen

- **WHEN** the page loads with the storage below
- **THEN** the unseen entries are as listed

##### Example: unseen entries

| Storage before load | Unseen | Marker after load |
| --- | --- | --- |
| nothing | none | newest id |
| `tokgame-lang` only | none | newest id |
| `tokgame-save`, no `tokgame-news` | all entries | unchanged until closed |
| `tokgame-best-parallel-laravel`, no `tokgame-news` | all entries | unchanged until closed |
| `tokgame-news` = id of the third entry | the first two | unchanged until closed |
| `tokgame-news` = newest id | none | unchanged |
| `tokgame-news` = `gh-00-00` (not in the list) | none | unchanged |
| reading `localStorage` throws | none | not written |

---
### Requirement: What's-new modal on page load

On page load, after the language is chosen and before the resume, bad-save or opening setup modal, the game SHALL show a what's-new modal when there are unseen entries. The modal SHALL be titled 最近更新, list the unseen entries newest first with date and sentence, at most 5, and show a 知道了 button. When more than 5 entries are unseen it SHALL also show a button reading 還有 N 筆更新, N being the unseen count minus 5. 知道了 SHALL set the marker to the newest id and then show exactly what the page would have shown without the modal: the resume modal for a usable save, the bad-save modal for an unusable save, or the opening setup. 還有 N 筆更新 SHALL set the marker to the newest id and open the rules modal on its 更新 tab. Showing or closing the modal SHALL NOT change the run state, write the save slot, write a log line or send an analytics event. Without unseen entries, page load SHALL behave as before this change.

#### Scenario: Returning player with a save

- **WHEN** `tokgame-save` holds a usable day-7 save, `tokgame-news` is absent, and the page loads
- **THEN** the what's-new modal lists the 5 newest entries and 還有 17 筆更新; after 知道了 the resume modal for day 7 opens and `tokgame-news` holds the newest id

#### Scenario: Two unseen entries

- **WHEN** `tokgame-news` holds the third entry's id, no save exists, and the page loads
- **THEN** the modal lists the first two entries and no 還有 button; after 知道了 the opening setup opens

#### Scenario: Unusable save after the modal

- **WHEN** `tokgame-save` holds an unusable save, `tokgame-news` is absent, and the page loads
- **THEN** the what's-new modal opens first and 知道了 opens the bad-save modal

#### Scenario: First-time visitor

- **WHEN** `localStorage` is empty and the page loads
- **THEN** the opening setup opens with no what's-new modal and `tokgame-news` holds the newest id

#### Scenario: Seen once

- **WHEN** a returning player closes the modal with 知道了 and reloads the page
- **THEN** no what's-new modal opens

#### Scenario: English

- **WHEN** the current language is English and the modal opens
- **THEN** its title, sentences and buttons are English and the dates are `YYYY-MM-DD`

#### Scenario: No side effects

- **WHEN** the modal is shown and closed with 知道了
- **THEN** no analytics event is sent, no log line is written and the save slot is unchanged

#### Scenario: Node tools unchanged

- **WHEN** `SIM_N=100 SIM_SEED=101 node tools/sim.js` runs before and after this change
- **THEN** the outputs are byte-identical
