## MODIFIED Requirements

### Requirement: Vendor and model catalog

The game SHALL offer exactly these vendors and models. Each model SHALL have capability `cap` (1–6), price per 1k tokens in NT$, subscription quota weight `w`, hours per complexity point `speed`, and token multiplier `verb`. Models marked ctx SHALL get the large-codebase bonus; vendors marked Chinese SHALL be treated as Chinese cloud; Qwen3.6 35B-A3B, Qwen3-Coder-Next and GLM-5.3 SHALL be treated as Chinese weights. The base local models SHALL keep the ids `qwen`, `gemma` and `oss` (Qwen3.6 35B-A3B, Gemma 4 26B A4B, Gemma 4 E4B). Qwen3-Coder-Next and Gemma 4 31B SHALL require the NVIDIA DGX Spark and GLM-5.3 SHALL require the Mac Studio (see `local-hardware`). Only Anthropic and Google SHALL accept company API billing. The Anthropic models SHALL follow the Claude 5 family: Haiku, Sonnet, Opus and Fable, in that order, with Fable (id `fable`) as the only capability-6 model. The OpenAI models SHALL be named after the GPT-6 family without the GPT-6 prefix (Luna, Sol, Astra) while keeping the ids `mini`, `std` and `high`. All numbers SHALL be fictional balance values, and the page footer SHALL keep the notice 價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。

##### Example: models

| Vendor (agent) | Model | cap | price | w | speed | verb | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic (Claude Code) | Haiku | 3 | 0.15 | 0.3 | 0.7 | 0.9 | company API |
| Anthropic | Sonnet | 4 | 0.45 | 1 | 0.8 | 1 | company API |
| Anthropic | Opus | 5 | 0.9 | 2 | 1 | 0.85 | company API |
| Anthropic | Fable | 6 | 1.8 | 4 | 1.2 | 0.85 | company API |
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
| 自架開源 (OpenCode＋本地 GPU) | Qwen3.6 35B-A3B (id qwen) | 3 | 0 | 0 | 1.7 | 1.3 | Chinese weights |
| 自架開源 | Gemma 4 26B A4B (id gemma) | 3 | 0 | 0 | 1.9 | 1.25 | |
| 自架開源 | Gemma 4 E4B (id oss) | 2 | 0 | 0 | 1.8 | 1.2 | |
| 自架開源 | Qwen3-Coder-Next (id qcnext) | 4 | 0 | 0 | 1.4 | 1.2 | Chinese weights, needs DGX Spark |
| 自架開源 | Gemma 4 31B (id gemma4) | 4 | 0 | 0 | 2.0 | 1.2 | needs DGX Spark |
| 自架開源 | GLM-5.3 (id glm53) | 5 | 0 | 0 | 2.8 | 1 | Chinese weights, needs Mac Studio |

#### Scenario: Company API only for contracted vendors

- **WHEN** the player selects OpenAI Sol in the dispatch panel
- **THEN** the 公司 API billing button is disabled with the note 公司沒簽約

#### Scenario: Codex CLI shows GPT-6 family names

- **WHEN** the dispatch panel lists the Codex CLI models
- **THEN** the model buttons read Luna, Sol and Astra in that order, with capability 3, 4 and 5, and none of them reads mini, 標準 or 高推理

#### Scenario: Luna is open to restricted clients

- **WHEN** the selected ticket's client is 政府標案 and the player opens the Codex CLI models
- **THEN** Luna is enabled with capability 3 at $0.15/k, while DeepSeek Chat is disabled with 政府標案禁用

#### Scenario: Local row lists the base models then the machine models

- **WHEN** the dispatch panel lists the 自架開源 models
- **THEN** the buttons read Qwen3.6 35B-A3B, Gemma 4 26B A4B, Gemma 4 E4B, Qwen3-Coder-Next, Gemma 4 31B and GLM-5.3 in that order, and none reads Qwen Coder 32B, Gemma 27B or gpt-oss

---
### Requirement: Agent and model selection

With a ticket selected, the dispatch panel SHALL show one row per vendor with a button per model showing its capability as one filled dot per capability point followed by empty dots up to five dots in total and its price (免費 for local models, with ・中國權重 for Chinese weights). A model button SHALL be disabled when its vendor is down today (the vendor row then reads 今日當機) when the ticket's client bans it, or when it needs a machine that is not installed (reason 需要 <machine name>, see `local-hardware`). If the current selection is disabled, the panel SHALL switch to the first available model in catalog order. Selecting a local model SHALL switch billing to 本地 GPU; selecting a non-local model while billing is 本地 GPU SHALL switch billing to 個人 API. If the selected billing becomes unavailable, the panel SHALL switch to the first available billing method. The dispatch button SHALL read 派給 <agent> in serial mode and 派到背景 <agent> in parallel mode, and SHALL be disabled when the vendor is down, the model is banned, the model needs a machine that is not installed, the local GPU is busy with local billing, or fewer than 0.2 hours remain.

#### Scenario: Local model forces local billing

- **WHEN** billing is 個人 API and the player clicks Gemma 4 26B A4B
- **THEN** billing switches to 本地 GPU

#### Scenario: Leaving local switches to personal API

- **WHEN** billing is 本地 GPU and the player clicks Sonnet
- **THEN** billing switches to 個人 API

#### Scenario: Claude Code lists the Claude 5 family

- **WHEN** the dispatch panel lists the Claude Code models
- **THEN** the buttons read Haiku, Sonnet, Opus and Fable in that order, with 能力 ●●●○○, ●●●●○, ●●●●● and ●●●●●● and prices $0.15/k, $0.45/k, $0.9/k and $1.8/k

#### Scenario: Outage disables a vendor

- **WHEN** Anthropic is down today and Sonnet was selected
- **THEN** every Anthropic model button is disabled and the selection moves to the first available model of the next vendor

#### Scenario: Selection leaves a locked model

- **WHEN** Gemma 4 31B is selected from an earlier run's selection and no DGX Spark is installed
- **THEN** the selection moves to the first available model in catalog order
