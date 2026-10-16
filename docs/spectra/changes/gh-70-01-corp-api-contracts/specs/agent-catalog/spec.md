## MODIFIED Requirements

### Requirement: Vendor and model catalog

The game SHALL offer exactly these vendors and models. Each model SHALL have capability `cap` on a ×10 integer scale (10–60 today; values that are not multiples of 10, such as 45, are allowed for later models), price per 1k tokens in NT$, subscription quota weight `w`, hours per complexity point `speed`, and token multiplier `verb`. Wherever capability is compared with ticket complexity, complexity SHALL be multiplied by 10 (`CAP_SCALE`). Models marked ctx SHALL get the large-codebase bonus; vendors marked Chinese SHALL be treated as Chinese cloud; Qwen3.6 35B-A3B, Qwen3-Coder-Next and GLM-5.3 SHALL be treated as Chinese weights. The base local models SHALL keep the ids `qwen`, `gemma` and `oss` (Qwen3.6 35B-A3B, Gemma 4 26B A4B, Gemma 4 E4B). Qwen3-Coder-Next and Gemma 4 31B SHALL require the NVIDIA DGX Spark and GLM-5.3 SHALL require the Mac Studio (see `local-hardware`). Only Anthropic, OpenAI and Google SHALL be able to accept company API billing, and only when the run's contract list includes them (see `corp-api-contracts`); Chinese vendors and local models SHALL never accept it. The Anthropic models SHALL follow the Claude 5 family: Haiku, Sonnet, Opus and Fable, in that order, with Fable (id `fable`) as the only capability-60 model. The OpenAI models SHALL be named after the GPT-6 family without the GPT-6 prefix (Luna, Sol, Astra) while keeping the ids `mini`, `std` and `high`. All numbers SHALL be fictional balance values, and the page footer SHALL keep the notice 價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。

##### Example: models

| Vendor (agent) | Model | cap | price | w | speed | verb | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic (Claude Code) | Haiku | 30 | 0.15 | 0.3 | 0.7 | 0.9 | |
| Anthropic | Sonnet | 40 | 0.45 | 1 | 0.8 | 1 | |
| Anthropic | Opus | 50 | 0.9 | 2 | 1 | 0.85 | |
| Anthropic | Fable | 60 | 1.8 | 4 | 1.2 | 0.85 | |
| OpenAI (Codex CLI) | Luna (id mini) | 30 | 0.15 | 0.3 | 0.7 | 1 | |
| OpenAI | Sol (id std) | 40 | 0.4 | 1 | 0.8 | 1.05 | |
| OpenAI | Astra (id high) | 50 | 1.6 | 3 | 1 | 0.95 | |
| Google (Gemini CLI) | Flash | 20 | 0.06 | 0.25 | 0.4 | 1.1 | ctx |
| Google | Pro | 40 | 0.35 | 1 | 0.9 | 1 | ctx |
| DeepSeek (Claude Code 接 DeepSeek API) | Chat | 30 | 0.03 | 1 | 0.7 | 1.15 | Chinese |
| DeepSeek | Reasoner | 40 | 0.06 | 1 | 1.2 | 1.5 | Chinese |
| 智譜 GLM (Claude Code＋GLM Coding Plan) | GLM Air | 30 | 0.04 | 0.5 | 0.6 | 1.1 | Chinese |
| 智譜 GLM | GLM | 40 | 0.1 | 1 | 0.9 | 1.1 | Chinese |
| Kimi (Kimi CLI) | K2 | 40 | 0.12 | 1 | 0.9 | 1.2 | Chinese |
| 自架開源 (OpenCode＋本地 GPU) | Qwen3.6 35B-A3B (id qwen) | 30 | 0 | 0 | 1.7 | 1.3 | Chinese weights |
| 自架開源 | Gemma 4 26B A4B (id gemma) | 30 | 0 | 0 | 1.9 | 1.25 | |
| 自架開源 | Gemma 4 E4B (id oss) | 20 | 0 | 0 | 1.8 | 1.2 | |
| 自架開源 | Qwen3-Coder-Next (id qcnext) | 40 | 0 | 0 | 1.4 | 1.2 | Chinese weights, needs DGX Spark |
| 自架開源 | Gemma 4 31B (id gemma4) | 40 | 0 | 0 | 2.0 | 1.2 | needs DGX Spark |
| 自架開源 | GLM-5.3 (id glm53) | 50 | 0 | 0 | 2.8 | 1 | Chinese weights, needs Mac Studio |

#### Scenario: Company API only for contracted vendors

- **WHEN** the run's contract list is the default Anthropic + Google and the player selects OpenAI Sol in the dispatch panel
- **THEN** the 公司 API billing button is disabled with the note 公司沒簽約

#### Scenario: OpenAI contracted

- **WHEN** the run's contract list is OpenAI only and the company budget is above 0
- **THEN** Sol's 公司 API billing button is enabled with the note 走部門預算, and Sonnet's and Gemini Pro's are disabled with the note 公司沒簽約

#### Scenario: Chinese vendors never take company API

- **WHEN** the run's contract list has all three vendors and the player selects DeepSeek Chat
- **THEN** the 公司 API billing button is disabled with the note 公司沒簽約

#### Scenario: Codex CLI shows GPT-6 family names

- **WHEN** the dispatch panel lists the Codex CLI models
- **THEN** the model buttons read Luna, Sol and Astra in that order, with capability 30, 40 and 50, and none of them reads mini, 標準 or 高推理

#### Scenario: Luna is open to restricted clients

- **WHEN** the selected ticket's client is 政府標案 and the player opens the Codex CLI models
- **THEN** Luna is enabled with capability 30 at $0.15/k, while DeepSeek Chat is disabled with 政府標案禁用

#### Scenario: Local row lists the base models then the machine models

- **WHEN** the dispatch panel lists the 自架開源 models
- **THEN** the buttons read Qwen3.6 35B-A3B, Gemma 4 26B A4B, Gemma 4 E4B, Qwen3-Coder-Next, Gemma 4 31B and GLM-5.3 in that order, and none reads Qwen Coder 32B, Gemma 27B or gpt-oss
