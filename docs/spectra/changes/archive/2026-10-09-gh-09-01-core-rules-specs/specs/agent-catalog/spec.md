## Purpose

Lists the code agents and models the player can dispatch to and the fictional numbers that drive their cost, speed and quality, and defines how the dispatch panel lets the player pick one.

## ADDED Requirements

### Requirement: Vendor and model catalog

The game SHALL offer exactly these vendors and models. Each model SHALL have capability `cap` (1–5), price per 1k tokens in NT$, subscription quota weight `w`, hours per complexity point `speed`, and token multiplier `verb`. Models marked ctx SHALL get the large-codebase bonus; vendors marked Chinese SHALL be treated as Chinese cloud; Qwen Coder 32B SHALL be treated as Chinese weights. Only Anthropic and Google SHALL accept company API billing. All numbers SHALL be fictional balance values, and the page footer SHALL keep the notice 價格、額度與模型能力都是遊戲平衡用的虛構數字，不代表各家實際方案。

##### Example: models

| Vendor (agent) | Model | cap | price | w | speed | verb | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic (Claude Code) | Haiku | 2 | 0.12 | 0.3 | 0.5 | 0.9 | company API |
| Anthropic | Sonnet | 4 | 0.45 | 1 | 0.8 | 1 | company API |
| Anthropic | Opus | 5 | 1.5 | 3 | 1 | 0.85 | company API |
| OpenAI (Codex CLI) | mini | 2 | 0.1 | 0.3 | 0.5 | 1 | |
| OpenAI | 標準 | 4 | 0.4 | 1 | 0.8 | 1.05 | |
| OpenAI | 高推理 | 5 | 0.4 | 1 | 1.4 | 1.8 | |
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

- **WHEN** the player selects OpenAI 標準 in the dispatch panel
- **THEN** the 公司 API billing button is disabled with the note 公司沒簽約

### Requirement: Subscription plans

Subscription plans SHALL be as follows, with daily and weekly quotas in k tokens. DeepSeek and 自架開源 SHALL have no subscription.

##### Example: plans

| Vendor | Plan | Monthly NT$ | Daily | Weekly |
| --- | --- | --- | --- | --- |
| Anthropic | Pro | 650 | 450 | 1,800 |
| Anthropic | Max 5× | 3,300 | 2,200 | 9,000 |
| Anthropic | Max 20× | 6,500 | 9,000 | 36,000 |
| OpenAI | Plus | 650 | 500 | 2,000 |
| OpenAI | Pro | 6,500 | 8,000 | 30,000 |
| Google | AI Pro | 650 | 700 | 2,800 |
| Google | Ultra | 8,000 | 10,000 | 40,000 |
| 智譜 GLM | Lite | 100 | 1,500 | 6,000 |
| 智譜 GLM | Pro | 500 | 6,000 | 24,000 |
| Kimi | 會員 | 300 | 1,500 | 6,000 |

#### Scenario: Plan picker rows

- **WHEN** the opening modal opens
- **THEN** it shows plan rows for Anthropic, OpenAI, Google, 智譜 GLM and Kimi only, each starting with 不訂閱

### Requirement: Agent and model selection

With a ticket selected, the dispatch panel SHALL show one row per vendor with a button per model showing its capability as filled and empty dots and its price (免費 for local models, with ・中國權重 for Qwen). A model button SHALL be disabled when its vendor is down today (the vendor row then reads 今日當機) or when the ticket's client bans it. If the current selection is disabled, the panel SHALL switch to the first available model in catalog order. Selecting a local model SHALL switch billing to 本地 GPU; selecting a non-local model while billing is 本地 GPU SHALL switch billing to 個人 API. If the selected billing becomes unavailable, the panel SHALL switch to the first available billing method. The dispatch button SHALL read 派給 <agent> in serial mode and 派到背景 <agent> in parallel mode, and SHALL be disabled when the vendor is down, the model is banned, the local GPU is busy with local billing, or fewer than 0.2 hours remain.

#### Scenario: Local model forces local billing

- **WHEN** billing is 個人 API and the player clicks Gemma 27B
- **THEN** billing switches to 本地 GPU

#### Scenario: Leaving local switches to personal API

- **WHEN** billing is 本地 GPU and the player clicks Sonnet
- **THEN** billing switches to 個人 API

#### Scenario: Outage disables a vendor

- **WHEN** Anthropic is down today and Sonnet was selected
- **THEN** every Anthropic model button is disabled and the selection moves to the first available model of the next vendor
