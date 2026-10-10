## MODIFIED Requirements

### Requirement: Idle machine trust penalty

The game SHALL track, per installed machine, whether its effect was used during the current day: the PC by any accepted local-model dispatch or charged local architecture evaluation, the DGX Spark by one with Qwen3-Coder-Next or Gemma 4 31B, the Mac Studio by one with GLM-5.3. Refused actions SHALL NOT count. A local agent still running when the next day starts (an overnight carry-over in parallel mode) SHALL count as used on that new day with the same model-to-machine mapping as a dispatch, regardless of how long it runs that day; cancelling it later that day, by the player or on expiry, SHALL NOT remove the mark. When the player ends a day, including day 20 before month-end scoring, every installed machine not used that day SHALL drop trust by 2 (not below 0). This SHALL apply from the arrival day on. When any machine is idle the day summary and the log SHALL name the idle machines and the total trust lost, as 電腦閒置：<names> 今天沒用到，主管覺得白買了（信任 -N）。 The usage record SHALL reset when the next day starts, then SHALL mark the machines used by local agents carried over into that day, and the day-start save SHALL store it in that state; a save without a usage record SHALL load as all unused.

#### Scenario: Idle penalties

- **WHEN** the player ends the day in each case in the table
- **THEN** trust changes as shown

##### Example: idle cases

| Installed | Used today | Trust before | Trust after |
| --- | --- | --- | --- |
| PC, Spark | dispatched Gemma 4 26B A4B | 60 | 58 (Spark idle) |
| PC, Spark | dispatched Gemma 4 31B | 60 | 60 |
| PC, Spark | dispatched Qwen3-Coder-Next | 60 | 60 |
| PC, Spark | nothing local | 60 | 56 |
| PC, Spark, Mac | nothing local | 1 | 0 |
| PC | only a local dispatch refused because a local agent started earlier the same day kept the GPU busy, with that agent's dispatch not recorded | 60 | 58 |

#### Scenario: Overnight local agent counts as used

- **WHEN** in parallel mode a local agent dispatched on day N is still running when day N+1 starts and nothing else local happens on day N+1
- **THEN** ending day N+1 drops trust only for installed machines that agent's model does not map to

##### Example: overnight carry-over

| Installed | Overnight local agent from day N | Other local use on day N+1 | Trust before ending day N+1 | Trust after |
| --- | --- | --- | --- | --- |
| PC, Spark | Qwen3-Coder-Next | none | 60 | 60 |
| PC, Spark | Gemma 4 26B A4B | none | 60 | 58 (Spark idle) |
| PC | Gemma 4 26B A4B, cancelled by the player at 9:00 on day N+1 | none | 60 | 60 |
| PC, Mac | GLM-5.3 | none | 60 | 60 |

#### Scenario: Day-start save reflects carried-over agents

- **WHEN** the PC and Spark are installed and a Qwen3-Coder-Next agent runs overnight into day N+1
- **THEN** the day N+1 start save stores the usage record with the PC and Spark marked used and the Mac unused

#### Scenario: Arrival day counts

- **WHEN** the Spark is installed on the morning of day 4 and no local model is used on day 4
- **THEN** ending day 4 drops trust by 2 and the summary names NVIDIA DGX Spark

#### Scenario: Usage resets each day

- **WHEN** the PC and Spark are installed, Gemma 4 31B was dispatched on day 5 and finished that day, and nothing local is used on day 6
- **THEN** ending day 5 changes nothing and ending day 6 drops trust by 4
