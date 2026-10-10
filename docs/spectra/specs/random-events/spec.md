# random-events Specification

## Purpose

Adds daily surprises — price changes, outages, budget cuts, policy changes, traffic spikes, manager moods and windfalls — so the same plan does not work every month.

## Requirements

### Requirement: Daily event roll

At the start of each day after day 1, after the seat review and before outage cancellation and new tickets, the game SHALL draw one event with probability 55%, choosing uniformly among the eight events below. The day summary SHALL show the event's title in bold followed by its text.

#### Scenario: Event frequency

- **WHEN** 10,000 day starts are simulated
- **THEN** the share of days with an event is within ±0.02 of 0.55


<!-- @trace
source: gh-09-01-core-rules-specs
updated: 2026-10-09
code:
  - docs/DESIGN.md
  - tools/check/random-events.test.js
  - tools/fake-dom.js
-->

---
### Requirement: Event effects

Each event SHALL have exactly this effect. Price drop and outage SHALL pick a random vendor other than 自架開源; quota cut SHALL pick a random subscription vendor (Anthropic, OpenAI, Google, 智譜 GLM, Kimi).

The manager event SHALL compare KPI with the pace threshold day × 7 (strictly greater passes), where day is the day being started. Its text SHALL state the current KPI and, for praise and doubt, the threshold; no event text SHALL contain 不是有買 AI 嗎.

##### Example: events

| Title | Effect |
| --- | --- |
| `<vendor>` 新模型上架，API 降價 30% | That vendor's price modifier × 0.7 for the rest of the month; repeats stack |
| `<vendor>` 服務大當機 | That vendor is unavailable today for every billing method; its running agents are cancelled |
| 主管宣布：全公司暫停把程式碼送到中國雲端模型 | Starts the company-wide Chinese cloud ban (see `client-restrictions`); if already active or the day is before 8, shows 主管在週會上提醒 with no effect instead |
| 年度預算凍結 | Company budget × 0.7 |
| `<vendor>` 調整訂閱用量政策 | That vendor's daily and weekly subscription quota × 0.8 for the rest of the month |
| 大新聞爆發，流量暴增 | Two incident tickets are added; if the day is before 6, shows 新聞流量比平常高一點 with the text 監控曲線抖了一下，系統還撐得住。沒有其他變化。 and adds no ticket instead |
| 主管在週會上點名稱讚 / 主管問進度怎麼這麼慢 / 主管在週會上提醒進度 | KPI > day × 7: 主管在週會上點名稱讚, text 「KPI 已經 `<kpi>`，超過 `<day × 7>`，AI 工具用得很有效率。」信任 +6。, trust +6 (cap 100). Otherwise on day 6 or later: 主管問進度怎麼這麼慢, text 「KPI 才 `<kpi>`，要超過 `<day × 7>` 才跟得上進度。」信任 -4。, trust −4 (floor 0). Otherwise (day before 6): 主管在週會上提醒進度, text 「KPI 目前 `<kpi>`。第一週先熟悉工具，之後 KPI 要超過天數 × 7。」沒有其他變化。, trust unchanged |
| 外包案尾款入帳 | Wallet + NT$1,500 |

#### Scenario: Budget freeze

- **WHEN** the budget freeze event happens with a company budget of NT$10,000
- **THEN** the company budget is NT$7,000

#### Scenario: Manager praise

- **WHEN** the manager event happens on day 5 with KPI 40 and trust 70
- **THEN** the title is 主管在週會上點名稱讚, the text is 「KPI 已經 40，超過 35，AI 工具用得很有效率。」信任 +6。 and trust is 76

#### Scenario: Manager reminder in the first week

- **WHEN** the manager event happens on day 5 with KPI 35 and trust 70
- **THEN** the title is 主管在週會上提醒進度, the text is 「KPI 目前 35。第一週先熟悉工具，之後 KPI 要超過天數 × 7。」沒有其他變化。 and trust is 70

#### Scenario: Manager doubt from day 6

- **WHEN** the manager event happens on day 6 with KPI 42 and trust 70
- **THEN** the title is 主管問進度怎麼這麼慢, the text is 「KPI 才 42，要超過 42 才跟得上進度。」信任 -4。 and trust is 66

##### Example: manager event outcomes

| Day | KPI | Trust before | Title | Trust after |
| --- | --- | --- | --- | --- |
| 2 | 0 | 70 | 主管在週會上提醒進度 | 70 |
| 2 | 15 | 70 | 主管在週會上點名稱讚 | 76 |
| 5 | 35 | 70 | 主管在週會上提醒進度 | 70 |
| 6 | 43 | 98 | 主管在週會上點名稱讚 | 100 |
| 6 | 42 | 70 | 主管問進度怎麼這麼慢 | 66 |
| 7 | 0 | 2 | 主管問進度怎麼這麼慢 | 0 |

#### Scenario: Ban too early

- **WHEN** the company-wide ban event is drawn on day 7
- **THEN** the title is 主管在週會上提醒 and the ban stays inactive

#### Scenario: Traffic spike too early

- **WHEN** the traffic spike event is drawn on day 5 with 3 tickets in the queue
- **THEN** the title is 新聞流量比平常高一點 and the queue still holds 3 tickets

#### Scenario: Traffic spike from day 6

- **WHEN** the traffic spike event is drawn on day 6 with 3 tickets in the queue
- **THEN** the title is 大新聞爆發，流量暴增 and the queue holds 5 tickets, the 2 new ones incidents

#### Scenario: Outage cancels running agents

- **WHEN** the outage event hits Anthropic while two Anthropic agents run overnight
- **THEN** both are cancelled with 廠商當機，session 斷了 and the summary reports 2 個跑在 Anthropic 的 agent 因為當機斷線。
