# agent-catalog Specification

## Purpose

Lists the code agents and models the player can dispatch to and the fictional numbers that drive their cost, speed and quality, and defines how the dispatch panel lets the player pick one.

## Requirements

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

---
### Requirement: Subscription plans

Subscription plans SHALL be as follows, with daily and weekly quotas in k tokens. DeepSeek and 自架開源 SHALL have no subscription. The OpenAI plan Pro 200 SHALL keep the plan id `pro`, and Pro 500 SHALL use the plan id `pro500`.

##### Example: plans

| Vendor | Plan | Monthly NT$ | Daily | Weekly |
| --- | --- | --- | --- | --- |
| Anthropic | Pro | 650 | 450 | 1,800 |
| Anthropic | Max 5× | 3,300 | 2,200 | 9,000 |
| Anthropic | Max 20× | 6,500 | 9,000 | 36,000 |
| OpenAI | Plus | 650 | 500 | 2,000 |
| OpenAI | Pro 200 | 6,500 | 8,000 | 30,000 |
| OpenAI | Pro 500 | 16,250 | 12,500 | 50,000 |
| Google | AI Pro | 650 | 700 | 2,800 |
| Google | Ultra | 8,000 | 10,000 | 40,000 |
| 智譜 GLM | Lite | 100 | 1,500 | 6,000 |
| 智譜 GLM | Pro | 500 | 6,000 | 24,000 |
| Kimi | 會員 | 300 | 1,500 | 6,000 |

#### Scenario: Plan picker rows

- **WHEN** the opening modal opens
- **THEN** it shows plan rows for Anthropic, OpenAI, Google, 智譜 GLM and Kimi only, each starting with 不訂閱

#### Scenario: OpenAI row lists Plus, Pro 200 and Pro 500

- **WHEN** the opening modal opens
- **THEN** the OpenAI row's buttons read 不訂閱, Plus, Pro 200 and Pro 500 in that order, Pro 500 shows NT$16,250/月・每日 12.5M, and no button reads Pro alone

#### Scenario: Token amounts of 10M and above keep one decimal

- **WHEN** a token amount of 1,000k or more is shown (plan buttons, quota boxes, logs)
- **THEN** it is rounded to one decimal in M, and once the rounded value is 10 or more a trailing .0 is dropped: 10,000k shows 10M, 10,004k shows 10M, 9,960k shows 10M, 12,500k shows 12.5M, 10,234k shows 10.2M and 50,000k shows 50M; amounts that round below 10M show as before (9,940k shows 9.9M, 8,000k shows 8.0M, 450k shows 450k)

#### Scenario: Pro 500 does not fit the starting wallet

- **WHEN** the player picks only OpenAI Pro 500 at month start, with the starting personal wallet of NT$8,000
- **THEN** the modal shows 這次要從個人錢包付 NT$16,250, 付完剩 -NT$8,250 and 錢包不夠付這次的訂閱, 開始第 1 天 is disabled, and clicking it charges nothing and leaves OpenAI at 不訂閱

#### Scenario: Monday upgrade from Pro 200 to Pro 500

- **WHEN** on day 11 the player holding OpenAI Pro 200 with at least NT$4,875 in the wallet changes it to Pro 500 and confirms
- **THEN** the player pays NT$4,875 ((16,250 − 6,500) × 2/4) and OpenAI's daily and weekly quotas become 12,500k and 50,000k

---
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
