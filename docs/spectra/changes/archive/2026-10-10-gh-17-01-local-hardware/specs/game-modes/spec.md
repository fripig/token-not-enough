## MODIFIED Requirements

### Requirement: Single local GPU

In parallel mode only one local-model agent SHALL run at a time. While it runs, dispatching another local agent and evaluating with a local model SHALL be unavailable. Hand-writing SHALL also be unavailable unless a machine is installed (see `local-hardware`); while unavailable the hand-write button SHALL read 本地 GPU 跑 agent 中，電腦卡到沒辦法手寫. Serial mode SHALL have no such limit.

#### Scenario: GPU busy

- **WHEN** a Qwen agent is running in parallel mode and the player selects Gemma 4 26B A4B
- **THEN** the dispatch button is disabled and the panel warns 本地 GPU 已經有一個 agent 在跑，等它跑完才能再派。

#### Scenario: Machine frees hand-writing

- **WHEN** a Qwen agent is running in parallel mode and the PC is installed
- **THEN** the hand-write button is enabled while local dispatch stays disabled
