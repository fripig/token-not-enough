## MODIFIED Requirements

### Requirement: Company selection at run start

The opening setup modal SHALL present six work contents — Laravel 後端, Rails 後端, Rust 基礎設施, App 開發, SRE, DevOps — each labelled with its difficulty (Laravel 後端 and Rails 後端 難度 ★, App 開發, SRE and DevOps 難度 ★★, Rust 基礎設施 難度 ★★★), followed by a seventh option 全端打雜 (English: Jack of all trades) labelled 難度 ★★★★ with the description 什麼都接，六條主技術線都不熟 (English: Take anything; none of the six main stacks is familiar), as toggles under the label 熟悉的工作內容（可選 1–2 項，或全端打雜） (English: Stacks you know (pick 1–2, or Jack of all trades)). Directly under the label and before the toggles, the modal SHALL show one hint line stating that every stack sends tickets and giving the shares and the unfamiliar cost: 所有技術線都會進工單：選的佔 75%、前端 15%、其他 10%。沒選的算不熟，手寫要 ×2。 (English: Every stack sends tickets: 75% to your picks, 15% frontend, 10% the rest. Stacks you did not pick are unfamiliar; hand-writing takes ×2.). The three percentages SHALL come from the same named constants the ticket stack distribution uses (the selected share, the fe share, and the remainder), and the ×2 SHALL come from the unfamiliar hand-writing multiplier, so the hint changes when those values change. While 全端打雜 is selected the hint SHALL instead read 沒有熟悉的主技術線：工單 85% 平分給六條線、15% 是前端；六條主技術線手寫都要 ×2（前端人人都會，不算不熟）。 (English: No familiar main stack: 85% of tickets are split over the six stacks, 15% are frontend; hand-writing any of the six main stacks takes ×2 (everyone knows frontend, so it is not unfamiliar).), with 85% from one minus the fe share, 15% from the fe share and ×2 from the unfamiliar multiplier. The player SHALL be able to select one or two work contents, or 全端打雜 alone: clicking an unselected work content SHALL add it when fewer than two are selected, and SHALL replace 全端打雜 when 全端打雜 is selected; when two are selected the unselected work contents SHALL be disabled while 全端打雜 stays enabled; clicking a selected work content SHALL remove it unless it is the only one selected; clicking 全端打雜 SHALL clear every work content and select 全端打雜, and clicking it while selected SHALL change nothing. 全端打雜 SHALL be stored as an empty stack list. The run SHALL store the selected stacks in the fixed order laravel, rails, rust, app, sre, devops. The default selection SHALL be Laravel 後端 alone. The intro text SHALL read 你是工程師，負責「<names>」。 followed by the existing budget sentence. The name shown in the header, the intro text, the day-1 log line, the resume modal and the month-end title SHALL be the selected work-content names joined with ＋ in that fixed order, or 全端打雜 (English: Jack of all trades) for an empty list. The selection SHALL persist to the next run started with 再玩一個月; a stored single-stack value SHALL be read as a one-stack selection, a stored empty list SHALL be read as 全端打雜, and any other invalid stored value SHALL fall back to Laravel 後端 alone. A saved run whose stack list is empty SHALL resume as 全端打雜. The weekly subscription adjustment modal SHALL NOT offer a work-content change. Stored identifiers (the run's stack list, GA's companies parameter, best-score keys and the save format) SHALL keep their existing names and values.

#### Scenario: Player picks a work content

- **WHEN** the player keeps only Rails 後端 selected in the opening modal and starts day 1
- **THEN** the run's stacks are rails and the header and month-end receipt show Rails 後端

#### Scenario: Player picks two work contents

- **WHEN** the player selects SRE in addition to the default Laravel 後端 and starts day 1
- **THEN** the run's stacks are laravel and sre, the header shows Laravel 後端＋SRE and the intro reads 你是工程師，負責「Laravel 後端＋SRE」。

#### Scenario: Selection limits

- **WHEN** the selection changes as in the table
- **THEN** the resulting selection matches

##### Example: toggle behaviour

| Selected before | Click | Selected after | Notes |
| --- | --- | --- | --- |
| laravel | devops | laravel, devops | add second |
| laravel, app | sre | laravel, app | sre button disabled |
| laravel, app | laravel | app | remove one |
| sre | sre | sre | cannot remove the last |
| laravel, app | 全端打雜 | (empty) | 全端打雜 stays enabled at two; clears both |
| (empty) | rust | rust | replaces 全端打雜 |
| (empty) | 全端打雜 | (empty) | no change |

#### Scenario: Fixed order

- **WHEN** the player clicks DevOps then App 開發 starting from a DevOps-only selection
- **THEN** the stored stacks are app then devops and the name reads App 開發＋DevOps

#### Scenario: Difficulty labels

- **WHEN** the opening modal is shown
- **THEN** the label reads 熟悉的工作內容（可選 1–2 項，或全端打雜） and the buttons show the difficulties in the table

##### Example: difficulty per option

| Option | Difficulty |
| --- | --- |
| Laravel 後端 | ★ |
| Rails 後端 | ★ |
| Rust 基礎設施 | ★★★ |
| App 開發 | ★★ |
| SRE | ★★ |
| DevOps | ★★ |
| 全端打雜 | ★★★★ |

#### Scenario: Hint line under the label

- **WHEN** the opening modal is shown in zh-TW
- **THEN** the line 所有技術線都會進工單：選的佔 75%、前端 15%、其他 10%。沒選的算不熟，手寫要 ×2。 appears after the label 熟悉的工作內容（可選 1–2 項，或全端打雜） and before the first work-content button

#### Scenario: Hint line in English

- **WHEN** the opening modal is shown in English
- **THEN** the label reads Stacks you know (pick 1–2, or Jack of all trades) and the hint reads Every stack sends tickets: 75% to your picks, 15% frontend, 10% the rest. Stacks you did not pick are unfamiliar; hand-writing takes ×2.

#### Scenario: Player picks 全端打雜

- **WHEN** the player clicks 全端打雜 in the opening modal and starts day 1
- **THEN** the run's stack list is empty, the intro reads 你是工程師，負責「全端打雜」。, the header shows 全端打雜 and the hint reads 沒有熟悉的主技術線：工單 85% 平分給六條線、15% 是前端；六條主技術線手寫都要 ×2（前端人人都會，不算不熟）。

#### Scenario: Selection persists across replay

- **WHEN** the player finishes a month as Rust 基礎設施＋App 開發 and clicks 再玩一個月
- **THEN** the opening modal preselects Rust 基礎設施 and App 開發

#### Scenario: Legacy and invalid stored values

- **WHEN** the stored selection is the string rust, or the string sre, or an empty array, or is an array of three stacks, or names an unknown stack
- **THEN** the selection becomes rust alone, sre alone, 全端打雜, and Laravel 後端 alone for the last two cases

#### Scenario: Weekly adjustment hides the picker

- **WHEN** the weekly 調整訂閱 modal opens on a Monday
- **THEN** no work-content picker is shown

#### Scenario: Identifiers unchanged

- **WHEN** a run with SRE＋DevOps selected sends game_start
- **THEN** the companies parameter is sre+devops and the best-score key at month end is tokgame-best-<mode>-sre+devops; a 全端打雜 run sends companies none and uses tokgame-best-<mode>-none
