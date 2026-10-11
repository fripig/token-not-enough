## MODIFIED Requirements

### Requirement: Vendor and model catalog

The game SHALL offer exactly these vendors and models. Each model SHALL have capability `cap` on a ×10 integer scale (10–60 today; values that are not multiples of 10, such as 45, are allowed for later models), price per 1k tokens in NT$, subscription quota weight `w`, hours per complexity point `speed`, and token multiplier `verb`. Wherever capability is compared with ticket complexity, complexity SHALL be multiplied by 10 (`CAP_SCALE`). Models marked ctx SHALL get the large-codebase bonus; vendors marked Chinese SHALL be treated as Chinese cloud; Qwen3.6 35B-A3B, Qwen3-Coder-Next and GLM-5.3 SHALL be treated as Chinese weights. The base local models SHALL keep the ids `qwen`, `gemma` and `oss` (Qwen3.6 35B-A3B, Gemma 4 26B A4B, Gemma 4 E4B). Qwen3-Coder-Next and Gemma 4 31B SHALL require the NVIDIA DGX Spark and GLM-5.3 SHALL require the Mac Studio (see `local-hardware`). Only Anthropic and Google SHALL accept company API billing. The Anthropic models SHALL follow the Claude 5 family: Haiku, Sonnet, Opus and Fable, in that order, with Fable (id `fable`) as the only capability-60 model. The OpenAI models SHALL be named after the GPT-6 family without the GPT-6 prefix (Luna, Sol, Astra) while keeping the ids `mini`, `std` and `high`. All numbers SHALL be fictional balance values, and the page footer SHALL keep the notice 價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。

##### Example: models

| Vendor (agent) | Model | cap | price | w | speed | verb | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic (Claude Code) | Haiku | 30 | 0.15 | 0.3 | 0.7 | 0.9 | company API |
| Anthropic | Sonnet | 40 | 0.45 | 1 | 0.8 | 1 | company API |
| Anthropic | Opus | 50 | 0.9 | 2 | 1 | 0.85 | company API |
| Anthropic | Fable | 60 | 1.8 | 4 | 1.2 | 0.85 | company API |
| OpenAI (Codex CLI) | Luna (id mini) | 30 | 0.15 | 0.3 | 0.7 | 1 | |
| OpenAI | Sol (id std) | 40 | 0.4 | 1 | 0.8 | 1.05 | |
| OpenAI | Astra (id high) | 50 | 1.6 | 3 | 1 | 0.95 | |
| Google (Gemini CLI) | Flash | 20 | 0.06 | 0.25 | 0.4 | 1.1 | company API, ctx |
| Google | Pro | 40 | 0.35 | 1 | 0.9 | 1 | company API, ctx |
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

- **WHEN** the player selects OpenAI Sol in the dispatch panel
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

### Requirement: Agent and model selection

With a ticket selected, the dispatch panel SHALL show one row per vendor with a button per model showing its capability and its price (免費 for local models, with ・中國權重 for Chinese weights). The capability SHALL be shown as 能力 followed by one filled dot ● per full 10 points, one half dot ◐ when the remainder is 5 or more, empty dots ○ up to five symbols in total (none when there are already five or more), then a space and the capability number. A model button SHALL be disabled when its vendor is down today (the vendor row then reads 今日當機) when the ticket's client bans it, or when it needs a machine that is not installed (reason 需要 <machine name>, see `local-hardware`). If the current selection is disabled, the panel SHALL switch to the first available model in catalog order. Selecting a local model SHALL switch billing to 本地 GPU; selecting a non-local model while billing is 本地 GPU SHALL switch billing to 個人 API. If the selected billing becomes unavailable, the panel SHALL switch to the first available billing method. The dispatch button SHALL read 派給 <agent> in serial mode and 派到背景 <agent> in parallel mode, and SHALL be disabled when the vendor is down, the model is banned, the model needs a machine that is not installed, the local GPU is busy with local billing, or fewer than 0.2 hours remain.

#### Scenario: Local model forces local billing

- **WHEN** billing is 個人 API and the player clicks Gemma 4 26B A4B
- **THEN** billing switches to 本地 GPU

#### Scenario: Leaving local switches to personal API

- **WHEN** billing is 本地 GPU and the player clicks Sonnet
- **THEN** billing switches to 個人 API

#### Scenario: Claude Code lists the Claude 5 family

- **WHEN** the dispatch panel lists the Claude Code models
- **THEN** the buttons read Haiku, Sonnet, Opus and Fable in that order, with 能力 ●●●○○ 30, ●●●●○ 40, ●●●●● 50 and ●●●●●● 60 and prices $0.15/k, $0.45/k, $0.9/k and $1.8/k

#### Scenario: In-between capability shows a half dot

- **WHEN** a model with capability 45 is drawn on the dispatch panel
- **THEN** its capability reads 能力 ●●●●◐ 45

##### Example: capability bar

| Capability | Shown |
| --- | --- |
| 20 | ●●○○○ 20 |
| 30 | ●●●○○ 30 |
| 45 | ●●●●◐ 45 |
| 50 | ●●●●● 50 |
| 55 | ●●●●●◐ 55 |
| 60 | ●●●●●● 60 |

#### Scenario: Outage disables a vendor

- **WHEN** Anthropic is down today and Sonnet was selected
- **THEN** every Anthropic model button is disabled and the selection moves to the first available model of the next vendor

#### Scenario: Selection leaves a locked model

- **WHEN** Gemma 4 31B is selected from an earlier run's selection and no DGX Spark is installed
- **THEN** the selection moves to the first available model in catalog order
