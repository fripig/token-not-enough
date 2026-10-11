## MODIFIED Requirements

### Requirement: Tests effect

With 單元測試, the self-review catch rate SHALL increase by 0.10 at level 1 or 0.20 at level 2 (capped at 0.95) for review levels above 0. 單元測試 SHALL NOT change the merge conflict probability.

#### Scenario: Catch rate only

- **WHEN** 單元測試 is bought and CI 流水線 is not, Sonnet (capability 40) uses 自審, and two other agents are running at completion
- **THEN** catch rate is 0.87 and conflict probability is 0.2

#### Scenario: Level 2 catch rate

- **WHEN** 單元測試 level 2 is owned and Sonnet (capability 40) uses 自審
- **THEN** catch rate is 0.95 (the cap) with Sonnet (capability 40) and 0.81 with Gemini Flash (capability 20)

### Requirement: SDD effect

導入 SDD level 1 SHALL be described as writing markdown spec documents (for example Superpowers) and level 2 as using an SDD framework (Spectra, OpenSpec, Spec Kit). The SDD level applied to an agent dispatch SHALL be the level chosen for that dispatch, capped at the owned level (see Requirement: SDD choice on the dispatch panel). With applied level L ≥ 1, the dispatch token estimate SHALL be multiplied by the factor for L; tickets whose complexity used for the run is 3 or higher SHALL gain the success bonus for L before clamping; and an unrevealed trap dispatched to a model whose capability is below its true complexity × 10 (see `trap-tickets`) SHALL stop after the trap-stop fraction for L of the true token and time cost instead of 0.4, with the log note for L. With applied level 0 the dispatch SHALL behave as without 導入 SDD. Architecture evaluation, research and hand-writing SHALL NOT be affected.

| Applied level | Token factor | Success bonus (complexity ≥3) | Trap-stop fraction | Trap-stop note |
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
| 0 | 0.80 | × 1 |
| 1 | 0.88 | × 1.1 |
| 2 | 0.95 | × 1.2 |

#### Scenario: Trap stops earlier

- **WHEN** an unrevealed trap with true complexity 5 is dispatched to DeepSeek Chat with applied SDD level 1, and another with applied level 2
- **THEN** the first run uses 0.15 and the second 0.05 of the true-complexity token and time estimate; both fail, reveal the trap and log their level's trap-stop note

#### Scenario: Evaluation unaffected

- **WHEN** SDD level 2 is owned and Sonnet evaluates a ticket
- **THEN** the evaluation tokens and hours equal those without SDD
