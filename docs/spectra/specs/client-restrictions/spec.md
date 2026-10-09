# client-restrictions Specification

## Purpose

Gives every ticket a client whose contract decides whether Chinese models can be used, so cheap Chinese models carry a real constraint instead of being a free win.

## Requirements

### Requirement: Ticket clients

Each non-incident company ticket SHALL get a client drawn with these weights: 內部專案 42% (no ban), 新創客戶 18% (no ban), 金融客戶 18% (bans Chinese cloud), 政府標案 22% (bans Chinese cloud and Chinese weights). Incident tickets SHALL always be 內部專案. Outsourced tickets have their own client (see `outsource-gigs`).

#### Scenario: Client distribution

- **WHEN** 10,000 non-incident tickets are generated
- **THEN** each client's share is within ±0.02 of its weight

#### Scenario: Incidents are internal

- **WHEN** an incident ticket is generated
- **THEN** its client is 內部專案


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->

---
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


<!-- @trace
source: gh-17-01-local-hardware
updated: 2026-10-10
code:
  - public/sitemap.xml
  - docs/DESIGN.md
  - public/js/actions.js
  - tools/sim.js
  - public/js/view.js
  - public/index.html
  - tools/check.js
  - public/js/calc.js
  - public/js/data.js
  - public/js/main.js
  - public/js/state.js
-->

---
### Requirement: Client label on the ticket card

The ticket card SHALL show `<client>・禁中國雲端` for 金融客戶, `<client>・禁中國模型` for 政府標案, 禁中國雲端 for any other non-outsourced ticket while the company-wide ban is active, and the client name otherwise.

#### Scenario: Card under company-wide ban

- **WHEN** the company-wide ban is active
- **THEN** a 內部專案 ticket card shows 禁中國雲端 and a 政府標案 card shows 政府標案・禁中國模型

<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check.js
  - tools/fake-dom.js
-->