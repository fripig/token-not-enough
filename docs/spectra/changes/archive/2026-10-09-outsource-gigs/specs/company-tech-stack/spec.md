## MODIFIED Requirements

### Requirement: Ticket stack distribution

Every ticket SHALL carry exactly one stack from laravel, rails, rust, app, fe. Non-incident company tickets SHALL be assigned a selected stack with probability 0.75 (uniformly among the selected stacks), fe with probability 0.15, and an unselected company stack with probability 0.10 (uniformly among the unselected company stacks). Incident tickets SHALL use a selected stack chosen uniformly. Outsourced tickets SHALL use the uniform stack rule of the outsource-gigs capability instead. Each ticket's title SHALL come from its stack's title pool at the ticket's complexity level.

#### Scenario: Incident uses a selected stack

- **WHEN** a traffic-spike event creates incident tickets during an App 團隊 run
- **THEN** both incident tickets have stack app and titles from the app incident pool

#### Scenario: Long-run distribution with one stack

- **WHEN** 10,000 non-incident company tickets are generated for a Rails SaaS run
- **THEN** about 75% are rails, about 15% are fe, and the remaining tickets are spread across laravel, rust, and app

#### Scenario: Long-run distribution with two stacks

- **WHEN** 10,000 non-incident company tickets are generated for a Laravel 新聞站＋App 團隊 run
- **THEN** laravel and app are each about 37.5%, fe about 15%, and rails and rust each about 5%

#### Scenario: Incidents with two stacks

- **WHEN** 1,000 incident tickets are generated for a Laravel 新聞站＋App 團隊 run
- **THEN** every incident ticket's stack is laravel or app and both appear
