## MODIFIED Requirements

### Requirement: CLAUDE.md effect

For a ticket whose stack has CLAUDE.md, agent token estimates SHALL be multiplied by 0.85 and the remaining failure chance SHALL be multiplied by (1 − 0.06) at level 1 or (1 − 0.15) at level 2 (see `dispatch-outcome`), before clamping to 0.05–0.97. Texts SHALL describe the effect as 失敗少 6% / 失敗少 15%.

#### Scenario: Laravel CLAUDE.md

- **WHEN** CLAUDE.md is bought for laravel and a complexity 4 laravel ticket is estimated with Sonnet without review
- **THEN** tokens are 0.85 × the estimate without the investment and success is 0.765 instead of 0.75

#### Scenario: Laravel CLAUDE.md level 2

- **WHEN** CLAUDE.md level 2 is owned for laravel and a complexity 4 laravel ticket is estimated with Sonnet without review
- **THEN** tokens are 0.85 × the estimate without the investment and success is 0.7875

#### Scenario: Other stack unaffected

- **WHEN** CLAUDE.md is bought for laravel and a fe ticket is estimated
- **THEN** the estimate equals the estimate without the investment

### Requirement: Tests effect

With 單元測試, the self-review catch rate SHALL increase by 0.10 at level 1 or 0.20 at level 2 (capped at 0.95) for review levels above 0. 單元測試 SHALL NOT change the merge conflict probability.

#### Scenario: Catch rate only

- **WHEN** 單元測試 is bought and CI 流水線 is not, Sonnet (capability 40) uses 自審 on a complexity 4 fe ticket, and two other agents are running at completion
- **THEN** catch rate is 0.3 and conflict probability is 0.2

#### Scenario: Level 2 catch rate

- **WHEN** 單元測試 level 2 is owned and 自審 is used on a complexity 4 fe ticket
- **THEN** catch rate is 0.4 with Sonnet (capability 40) and 0.2 with Gemini Flash (capability 20)

### Requirement: SDD effect

導入 SDD level 1 SHALL be described as writing markdown spec documents (for example Superpowers) and level 2 as using an SDD framework (Spectra, OpenSpec, Spec Kit). The SDD level applied to an agent dispatch SHALL be the level chosen for that dispatch, capped at the owned level (see Requirement: SDD choice on the dispatch panel). With applied level L ≥ 1, the dispatch token estimate SHALL be multiplied by the factor for L; for tickets whose complexity used for the run is 3 or higher the remaining failure chance SHALL be multiplied by (1 − failure reduction for L) before clamping (see `dispatch-outcome`); and an unrevealed trap dispatched to a model whose capability is below its true complexity × 10 (see `trap-tickets`) SHALL stop after the trap-stop fraction for L of the true token and time cost instead of 0.4, with the log note for L. With applied level 0 the dispatch SHALL behave as without 導入 SDD. Architecture evaluation, research and hand-writing SHALL NOT be affected.

| Applied level | Token factor | Failure reduction (complexity ≥3) | Trap-stop fraction | Trap-stop note |
| --- | --- | --- | --- | --- |
| 0 | 1 | 0 | 0.4 | 做到一半發現牽扯整個架構，先停下來 |
| 1 | 1.1 | 0.08 | 0.15 | 寫規格時就發現牽扯整個架構，先停下來 |
| 2 | 1.2 | 0.15 | 0.05 | 跑框架流程時就發現牽扯整個架構，先停下來 |

#### Scenario: Small ticket costs more

- **WHEN** SDD level 1 is owned and applied and a complexity 2 ticket is estimated
- **THEN** tokens are 1.1 × the estimate without SDD and success is unchanged

#### Scenario: Large ticket succeeds more

- **WHEN** a complexity 4 fe ticket is estimated with Sonnet without review at each applied level
- **THEN** success and tokens follow the table

##### Example: complexity 4 fe ticket with Sonnet

| Applied level | Success | Tokens vs. without SDD |
| --- | --- | --- |
| 0 | 0.75 | × 1 |
| 1 | 0.77 | × 1.1 |
| 2 | 0.7875 | × 1.2 |

#### Scenario: Trap stops earlier

- **WHEN** an unrevealed trap with true complexity 5 is dispatched to DeepSeek Chat with applied SDD level 1, and another with applied level 2
- **THEN** the first run uses 0.15 and the second 0.05 of the true-complexity token and time estimate; both fail, reveal the trap and log their level's trap-stop note

#### Scenario: Evaluation unaffected

- **WHEN** SDD level 2 is owned and Sonnet evaluates a ticket
- **THEN** the evaluation tokens and hours equal those without SDD

### Requirement: Agent capability investment

The game SHALL offer 提升 agent 能力 with levels 1 to 3, each costing 1 hour and NT$200 company budget (tuned by simulator measurement). Level N SHALL be purchasable only after attending at least N conferences of any category and owning level N − 1. Each owned level SHALL multiply the remaining failure chance of every agent dispatch by (1 − 0.05) before clamping to 0.05–0.97 (see `dispatch-outcome`). Architecture evaluation and hand-writing SHALL NOT be affected.

#### Scenario: Two levels

- **WHEN** two conferences were attended, 提升 agent 能力 level 2 is owned and a complexity 4 fe ticket is estimated with Sonnet without review
- **THEN** success is 0.774375 (1 − 0.25 × 0.95 × 0.95)

#### Scenario: Locked level

- **WHEN** one conference was attended and level 1 is owned
- **THEN** level 2 cannot be bought and the button states that 2 conferences are needed
