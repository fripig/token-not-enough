## ADDED Requirements

### Requirement: Abandon event

When the player abandons a ticket (see `abandon-ticket`), the game SHALL send one `abandon` event with the ticket's shown `cx`, `stack`, `gig`, `merge` and `research`, plus the common parameters. A refused abandon (incident, running or missing ticket) SHALL NOT send the event. Because `cx` is the shown complexity, abandoning a hidden trap SHALL NOT reveal its true complexity.

#### Scenario: Abandon a company ticket

- **WHEN** the player abandons a complexity-3 Rails ticket that is not outsourced, not a merge-conflict ticket and not a research ticket
- **THEN** one `abandon` event is sent with `cx` 3, `stack` `rails`, `gig` `false`, `merge` `false`, `research` `false`

#### Scenario: Hidden trap

- **WHEN** the player abandons a hidden trap shown as complexity 1 with true complexity 5
- **THEN** the `abandon` event has `cx` 1

#### Scenario: Refused abandon

- **WHEN** the player tries to abandon an incident ticket
- **THEN** no `abandon` event is sent
