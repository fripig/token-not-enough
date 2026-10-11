## MODIFIED Requirements

### Requirement: Overnight runs and cancellation

When a parallel day ends, the clock SHALL first run to 17:00. Agents whose ticket is due on or before today SHALL then be cancelled: they fail with tokens charged for the fraction completed (at least 5%), with the note 到期還沒跑完，只好中止. When day 20 ends, every agent still running after that (its ticket is due after day 20) SHALL be stopped as if the player had cancelled it (see Requirement: Player cancels a background agent): it SHALL be charged for the fraction completed (at least 5%) through its billing method, SHALL NOT count as a failure, SHALL NOT reveal a hidden trap, and SHALL log one warn line `⏹ 月底收工 <title>｜<agent> / <model name>・<billing>｜燒掉 <tokens>｜<spend>｜<hours>h`. These charges SHALL happen before the day's company spend limit is checked, so they count toward it. On day 20 in parallel mode, when the selected dispatch would not finish before 17:00 and its ticket is not due today, the dispatch panel SHALL warn 今天是月底，下班前跑不完會月底收工，照已跑的部分扣款、拿不到 KPI。 instead of the overnight warning. If the next day starts with a vendor outage, that vendor's agents SHALL be cancelled the same way as due agents with 廠商當機，session 斷了. Every remaining agent SHALL have 3 hours taken off its remaining time (at least 0.05 hours left), and the day summary SHALL report `<n> 個 agent 跑了一整晚，一早會陸續有結果。`.

#### Scenario: Agent finishes overnight

- **WHEN** an agent with 3.5 hours left is still running when a day ends and its ticket is not due
- **THEN** it has 0.5 hours left at 9:00 the next day

#### Scenario: Due ticket cancelled

- **WHEN** an agent working on a ticket due today is still running at 17:00
- **THEN** it is cancelled, the ticket becomes overdue, and the summary reports 1 個背景 agent 跑到截止還沒完成，被你中止了。

#### Scenario: Agents stopped at month end

- **WHEN** day 20 ends in parallel mode with an agent on Claude Opus with 個人 API (100k tokens, NT$0.9 per 1k) half done on a company ticket due on day 22
- **THEN** 50k tokens are charged, the wallet drops by NT$45, KPI and trust are unchanged by that ticket, the overdue count does not rise, and the log has a line starting with `⏹ 月底收工`

#### Scenario: Month-end dispatch warning

- **WHEN** on day 20 in parallel mode with 1 hour left the player selects a ticket due on day 22 and a model whose estimate is 3 hours
- **THEN** the dispatch panel shows 今天是月底，下班前跑不完會月底收工，照已跑的部分扣款、拿不到 KPI。 and not 明早才有結果

#### Scenario: Month-end charges count toward the company spend limit

- **WHEN** day 20 ends with NT$1,400 company API spend that day and an agent on 公司 API due on day 22 whose completed fraction costs NT$200
- **THEN** the day's company spend is NT$1,600 and trust drops by 6 for the company spend limit
