## MODIFIED Requirements

### Requirement: Preset usability per ticket

A preset SHALL be unusable for a ticket, with a reason, in this priority order: the vendor has an outage today (今日當機); the model is banned for the ticket's client (the existing ban reason text); the model needs a machine that is not installed (需要 <machine name>, see `local-hardware`); the billing method is not available or not usable for that vendor (the billing note, or 沒有公司席位 for seat without an approved seat of that vendor); billing is local while the local GPU is busy in parallel mode (本地 GPU 忙); billing is sub or seat and the high end of the quota estimate exceeds the remaining quota (額度不夠); billing is api and the high end of the cost estimate exceeds the personal wallet (錢包不夠). Free work slots and remaining hours SHALL NOT be preset reasons.

#### Scenario: Reasons

- **WHEN** usability is evaluated for each case in the table
- **THEN** the reason matches

##### Example: reason table

| Preset | Ticket / state | Reason |
| ------ | -------------- | ------ |
| deepseek/chat/api | finance client (ban api) | the cnBlock reason text |
| anthropic/sonnet/corp | anthropic outage today | 今日當機 |
| local/gemma4/local | no DGX Spark installed | 需要 NVIDIA DGX Spark |
| local/glm53/local | government client, Mac installed | 中國權重禁用 |
| google/flash/sub | no Google subscription | 沒有訂閱 |
| anthropic/sonnet/seat | seat approved for google | 沒有公司席位 |
| local/qwen/local | parallel mode, a local job running | 本地 GPU 忙 |
| anthropic/opus/sub | quota left below estimate high × w | 額度不夠 |
| anthropic/opus/api | wallet NT$100, estimate high NT$400 | 錢包不夠 |
| anthropic/sonnet/corp | none of the above | usable |
