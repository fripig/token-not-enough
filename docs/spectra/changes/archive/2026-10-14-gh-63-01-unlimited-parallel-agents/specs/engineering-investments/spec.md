## MODIFIED Requirements

### Requirement: Batch dispatch unlocked by skills

With 做 skills, the queue SHALL show a batch dispatch button that one-click dispatches every non-running ticket with shown complexity 2 or lower at level 1, or 3 or lower at level 2, in queue order (earliest due first, then higher KPI), using each ticket's first usable preset. It SHALL skip tickets with no usable preset, SHALL stop when fewer than 0.2 hours remain in parallel mode (how many agents are running SHALL NOT stop it), and in serial mode SHALL stop when the next ticket's estimated hours exceed remaining hours. It SHALL log one summary line with dispatched and skipped counts. Without 做 skills the button SHALL NOT appear.

#### Scenario: Batch in parallel mode

- **WHEN** skills are bought, 8 hours are left and the queue holds complexity 1, 2, 3 and 2 tickets
- **THEN** the three complexity ≤2 tickets are dispatched and the complexity 3 ticket stays in the queue

#### Scenario: Batch at level 2

- **WHEN** skills level 2 is owned, 8 hours are left and the queue holds complexity 1, 3, 4 and 2 tickets
- **THEN** the complexity 1, 3 and 2 tickets are dispatched and the complexity 4 ticket stays in the queue

#### Scenario: Batch with many agents running

- **WHEN** skills are bought, 6 agents are running, 8 hours are left and the queue holds two complexity 1 tickets
- **THEN** both tickets are dispatched and 8 agents are running

#### Scenario: Batch runs out of time

- **WHEN** skills are bought, 0.3 hours are left and the queue holds two complexity 1 tickets
- **THEN** one ticket is dispatched and the other stays in the queue
