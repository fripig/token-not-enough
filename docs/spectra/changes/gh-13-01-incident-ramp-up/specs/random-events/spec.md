## MODIFIED Requirements

### Requirement: Event effects

Each event SHALL have exactly this effect. Price drop and outage SHALL pick a random vendor other than 自架開源; quota cut SHALL pick a random subscription vendor (Anthropic, OpenAI, Google, 智譜 GLM, Kimi).

##### Example: events

| Title | Effect |
| --- | --- |
| `<vendor>` 新模型上架，API 降價 30% | That vendor's price modifier × 0.7 for the rest of the month; repeats stack |
| `<vendor>` 服務大當機 | That vendor is unavailable today for every billing method; its running agents are cancelled |
| 主管宣布：全公司暫停把程式碼送到中國雲端模型 | Starts the company-wide Chinese cloud ban (see `client-restrictions`); if already active or the day is before 8, shows 主管在週會上提醒 with no effect instead |
| 年度預算凍結 | Company budget × 0.7 |
| `<vendor>` 調整訂閱用量政策 | That vendor's daily and weekly subscription quota × 0.8 for the rest of the month |
| 大新聞爆發，流量暴增 | Two incident tickets are added; if the day is before 6, shows 新聞流量比平常高一點 with the text 監控曲線抖了一下，系統還撐得住。沒有其他變化。 and adds no ticket instead |
| 主管在週會上點名稱讚 / 主管問進度怎麼這麼慢 | Trust +6 (cap 100) if KPI > day × 7, otherwise trust −4 (floor 0) |
| 外包案尾款入帳 | Wallet + NT$1,500 |

#### Scenario: Budget freeze

- **WHEN** the budget freeze event happens with a company budget of NT$10,000
- **THEN** the company budget is NT$7,000

#### Scenario: Manager praise

- **WHEN** the manager event happens on day 5 with KPI 40 and trust 70
- **THEN** the title is 主管在週會上點名稱讚 and trust is 76

#### Scenario: Manager doubt

- **WHEN** the manager event happens on day 5 with KPI 35 and trust 70
- **THEN** the title is 主管問進度怎麼這麼慢 and trust is 66

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
