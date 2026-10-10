## MODIFIED Requirements

### Requirement: Rules tabs

The rules modal SHALL be titled 遊戲規則 and SHALL show six tab buttons in this order: 基本, 派工與成功率, 付費與稽核, 工單與陷阱, 投資與電腦, 結算, and a 關閉 button. Exactly one tab SHALL be selected and its content shown. Clicking a tab SHALL show that tab's content. The first open in a page load SHALL select 基本; later opens in the same page load SHALL select the tab that was selected when the modal was last closed. The selected tab SHALL NOT be written to storage or the save slot.

The tabs SHALL cover, at minimum:

- 基本: days, weeks and hours; starting wallet, company budget and trust; Monday quota reset and subscription changes; single-line and parallel mode including slot choices, PR review time and merge conflicts; the 進階模式 reasoning-effort table.
- 派工與成功率: the success-rate table by ability minus complexity; the big-codebase adjustment; the self-review table; stack effects; presets and 一鍵派工; the per-dispatch SDD choice (不用 or an owned level, presets remembering it and falling back to the highest owned level).
- 付費與稽核: the billing methods; company API daily limit and overdraft penalties; audit odds and penalty; team seats; client bans on Chinese models.
- 工單與陷阱: complexity with base tokens and KPI; incident tickets; late penalties; unfamiliar stacks; traps, 評估架構 and 找主管重新評估, including the trap-stop fraction for each SDD level; research tickets with their rate, direct-dispatch token premium, agent and self research costs and split table; outsourcing.
- 投資與電腦: every engineering investment with its hours, cost and effect, including the level 2 cost, effect and unlocking conference category where one exists, and stating that 導入 SDD level 2 needs no conference; 提升 agent 能力 with its per-level effect and unlock rule; every domestic conference with its category, covered stacks and fee, the registration window, weekend attendance, the self-paid rule and the tech-stack conference effect; every hardware purchase with its price text, trust threshold, delivery days and effect; the idle penalty.
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

#### Scenario: Research tickets in the tickets tab

- **WHEN** the player selects 工單與陷阱
- **THEN** the tab shows the research ticket rate 30%, the direct-dispatch premium ×4, agent research 40k tokens and 0.5h × model speed, self research 1.5h, and the splits 4 → 2＋3 and 5 → 3＋3

#### Scenario: Conferences in the rules

- **WHEN** the player opens 投資與電腦
- **THEN** the tab lists all ten conferences with their fees from the game constants, the 0.8 hand-writing factor, the four conference-unlocked level 2 effects and the 0.08 per level of 提升 agent 能力

#### Scenario: SDD levels in the rules

- **WHEN** the player opens 投資與電腦, then 派工與成功率, then 工單與陷阱
- **THEN** 投資與電腦 shows 導入 SDD level 1 (markdown, token ×1.1, +8%) and level 2 (框架, token ×1.2, +15%, 1h, NT$200, no conference); 派工與成功率 describes choosing 不用 or an owned SDD level per dispatch; 工單與陷阱 shows the trap-stop fractions 40%, 15% and 5%, all taken from the game constants
