## MODIFIED Requirements

### Requirement: Vendor and model catalog

The game SHALL offer exactly these vendors and models. Each model SHALL have capability `cap` (1–5), price per 1k tokens in NT$, subscription quota weight `w`, hours per complexity point `speed`, and token multiplier `verb`. Models marked ctx SHALL get the large-codebase bonus; vendors marked Chinese SHALL be treated as Chinese cloud; Qwen Coder 32B SHALL be treated as Chinese weights. Only Anthropic and Google SHALL accept company API billing. The OpenAI models SHALL be named after the GPT-6 family without the GPT-6 prefix (Luna, Sol, Astra) while keeping the ids `mini`, `std` and `high`. All numbers SHALL be fictional balance values, and the page footer SHALL keep the notice 價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。

##### Example: models

| Vendor (agent) | Model | cap | price | w | speed | verb | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic (Claude Code) | Haiku | 2 | 0.12 | 0.3 | 0.5 | 0.9 | company API |
| Anthropic | Sonnet | 4 | 0.45 | 1 | 0.8 | 1 | company API |
| Anthropic | Opus | 5 | 1.5 | 3 | 1 | 0.85 | company API |
| OpenAI (Codex CLI) | Luna (id mini) | 3 | 0.15 | 0.3 | 0.7 | 1 | |
| OpenAI | Sol (id std) | 4 | 0.4 | 1 | 0.8 | 1.05 | |
| OpenAI | Astra (id high) | 5 | 1.6 | 3 | 1 | 0.95 | |
| Google (Gemini CLI) | Flash | 2 | 0.06 | 0.25 | 0.4 | 1.1 | company API, ctx |
| Google | Pro | 4 | 0.35 | 1 | 0.9 | 1 | company API, ctx |
| DeepSeek (Claude Code 接 DeepSeek API) | Chat | 3 | 0.03 | 1 | 0.7 | 1.15 | Chinese |
| DeepSeek | Reasoner | 4 | 0.06 | 1 | 1.2 | 1.5 | Chinese |
| 智譜 GLM (Claude Code＋GLM Coding Plan) | GLM Air | 3 | 0.04 | 0.5 | 0.6 | 1.1 | Chinese |
| 智譜 GLM | GLM | 4 | 0.1 | 1 | 0.9 | 1.1 | Chinese |
| Kimi (Kimi CLI) | K2 | 4 | 0.12 | 1 | 0.9 | 1.2 | Chinese |
| 自架開源 (OpenCode＋本地 GPU) | Qwen Coder 32B | 3 | 0 | 0 | 2.1 | 1.3 | Chinese weights |
| 自架開源 | Gemma 27B | 3 | 0 | 0 | 2.4 | 1.25 | |
| 自架開源 | gpt-oss 20B | 2 | 0 | 0 | 1.8 | 1.2 | |

#### Scenario: Company API only for contracted vendors

- **WHEN** the player selects OpenAI Sol in the dispatch panel
- **THEN** the 公司 API billing button is disabled with the note 公司沒簽約

#### Scenario: Codex CLI shows GPT-6 family names

- **WHEN** the dispatch panel lists the Codex CLI models
- **THEN** the model buttons read Luna, Sol and Astra in that order, with capability 3, 4 and 5, and none of them reads mini, 標準 or 高推理

#### Scenario: Luna is open to restricted clients

- **WHEN** the selected ticket's client is 政府標案 and the player opens the Codex CLI models
- **THEN** Luna is enabled with capability 3 at $0.15/k, while DeepSeek Chat is disabled with 政府標案禁用
