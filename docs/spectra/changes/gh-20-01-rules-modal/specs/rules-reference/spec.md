## Purpose

Gives the player an in-game rules reference that can be opened at any time during play and from the setup modal. The numbers it shows are read from the same constants the game logic uses, so balance changes cannot leave it stale.

## ADDED Requirements

### Requirement: Rules entry points

The in-game header SHALL show a 規則 button whenever the game screen is drawn. The setup modal, both at run start and for the Monday 調整訂閱, SHALL show a 看完整規則 button. Both buttons SHALL open the rules modal. No other modal (morning report, resume, bad save, month-end) SHALL show a rules button.

#### Scenario: Header button

- **WHEN** the game screen is rendered on any day
- **THEN** the header contains a 規則 button with `data-act="rules"`

#### Scenario: Setup modal button

- **WHEN** the setup modal is shown at run start or for 調整訂閱
- **THEN** it contains a 看完整規則 button that opens the rules modal

#### Scenario: Other modals have no entry

- **WHEN** the morning report or the month-end modal is shown
- **THEN** it contains no rules button

### Requirement: Rules tabs

The rules modal SHALL be titled 遊戲規則 and SHALL show six tab buttons in this order: 基本, 派工與成功率, 付費與稽核, 工單與陷阱, 投資與電腦, 結算, and a 關閉 button. Exactly one tab SHALL be selected and its content shown. Clicking a tab SHALL show that tab's content. The first open in a page load SHALL select 基本; later opens in the same page load SHALL select the tab that was selected when the modal was last closed. The selected tab SHALL NOT be written to storage or the save slot.

The tabs SHALL cover, at minimum:

- 基本: days, weeks and hours; starting wallet, company budget and trust; Monday quota reset and subscription changes; single-line and parallel mode including slot choices, PR review time and merge conflicts; the 進階模式 reasoning-effort table.
- 派工與成功率: the success-rate table by ability minus complexity; the big-codebase adjustment; the self-review table; stack effects; presets and 一鍵派工.
- 付費與稽核: the billing methods; company API daily limit and overdraft penalties; audit odds and penalty; team seats; client bans on Chinese models.
- 工單與陷阱: complexity with base tokens and KPI; incident tickets; late penalties; unfamiliar stacks; traps, 評估架構 and 找主管重新評估; outsourcing.
- 投資與電腦: every engineering investment with its hours, cost and effect; every hardware purchase with its price text, trust threshold, delivery days and effect; the idle penalty.
- 結算: the score formula, grade thresholds for both modes, best score per mode and work content, and the day-start save.

Lines that apply only to 平行模式, 進階模式 or 接外包 SHALL be labeled with that setting. All rules SHALL be shown regardless of the current run's settings.

#### Scenario: Default tab

- **WHEN** the player opens the rules modal for the first time after the page loads
- **THEN** six tab buttons appear in the listed order and 基本 is selected

#### Scenario: Switching tabs

- **WHEN** the player clicks 結算
- **THEN** 結算 is selected and the score formula is shown

#### Scenario: Last tab remembered in the page session

- **WHEN** the player selects 投資與電腦, closes the modal and opens it again
- **THEN** 投資與電腦 is selected

### Requirement: Rule numbers come from game constants

Every rate, multiplier, cost, penalty, threshold of trust and score weight in the rules modal that also drives game logic SHALL be produced from the constant the logic reads, not written as a separate literal. Such numbers that are inline literals in the game logic SHALL become named constants with unchanged values before the rules modal uses them, and game behavior SHALL NOT change as a result. Structural bounds (the 20 working days, the 5-day week, complexity ranges such as 複雜度 3 以下, the ability threshold 4 for borrow checker and big-codebase penalties, 0–2 outsourced tickets a day) MAY be written as text.

#### Scenario: Grade thresholds follow the constants

- **WHEN** the 結算 tab is shown
- **THEN** it lists each single-line grade threshold and each threshold multiplied by the parallel-mode factor

##### Example: current values

| Grade | Single-line | Parallel |
| ----- | ----------- | -------- |
| S | 4600 | 7360 |
| A | 3800 | 6080 |
| B | 3000 | 4800 |
| C | 2200 | 3520 |

#### Scenario: Investments and hardware follow the data

- **WHEN** the 投資與電腦 tab is shown
- **THEN** it lists every investment name with its hours and cost, and every hardware name with its trust threshold, using the same values as the investment panel

#### Scenario: Behavior unchanged by the constant lift

- **WHEN** `SIM_SEED=1 SIM_N=5 node tools/sim.js` runs before and after the literals are lifted into constants
- **THEN** the two outputs are identical

### Requirement: Closing returns to the opening context

When the rules modal is opened from the header, 關閉 SHALL hide the overlay and leave the game screen as it was. When it is opened from the setup modal, 關閉 SHALL show the setup modal again with every unconfirmed choice kept (work content, mode, slot count, 接外包, 進階模式, plans and seat request) and its buttons working. Opening and closing the rules modal SHALL NOT change the run state, write a save, or send an analytics event.

#### Scenario: Close from the header

- **WHEN** the player opens the rules from the header and clicks 關閉
- **THEN** the overlay is hidden and the run state is unchanged

#### Scenario: Close back to setup

- **WHEN** at run start the player selects 接外包 and 單線模式, opens 看完整規則, and clicks 關閉
- **THEN** the setup modal is shown with 接外包 and 單線模式 still selected, and 開始第 1 天 still starts the run with those choices
