## MODIFIED Requirements

### Requirement: Chinese model bans

A ticket's ban level SHALL be: all when the client is 政府標案; Chinese cloud when the client is 金融客戶, or when the company-wide Chinese cloud ban is active and the ticket is not outsourced; otherwise none. Under a Chinese cloud or all ban, every model of a Chinese vendor (DeepSeek, 智譜 GLM, Kimi) SHALL be disabled, showing `<client>禁用` when the client imposes the ban and 公司政策禁用 when only the company-wide ban applies. Under an all ban, the local Chinese-weights models (Qwen3.6 35B-A3B, Qwen3-Coder-Next, GLM-5.3) SHALL also be disabled with 中國權重禁用. Gemma 4 26B A4B, Gemma 4 E4B and Gemma 4 31B SHALL never be banned.

#### Scenario: Financial client

- **WHEN** a 金融客戶 ticket is selected
- **THEN** DeepSeek, GLM and Kimi models are disabled with 金融客戶禁用 and Qwen3.6 35B-A3B is available

#### Scenario: Government client

- **WHEN** a 政府標案 ticket is selected
- **THEN** DeepSeek, GLM and Kimi models show 政府標案禁用, Qwen3.6 35B-A3B shows 中國權重禁用, and Gemma 4 26B A4B is available

#### Scenario: Company-wide ban

- **WHEN** the company-wide ban is active and a 新創客戶 ticket is selected
- **THEN** DeepSeek models show 公司政策禁用 and Qwen3.6 35B-A3B is available
