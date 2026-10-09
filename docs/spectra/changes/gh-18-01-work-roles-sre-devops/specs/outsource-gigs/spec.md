## MODIFIED Requirements

### Requirement: Outsourced ticket generation

With outsourcing on, day 1 and every following day SHALL add 0, 1 or 2 outsourced tickets (uniformly) in addition to the company tickets; with outsourcing off no outsourced tickets SHALL appear. An outsourced ticket's stack SHALL be one of laravel, rails, rust, app, sre, devops, fe chosen uniformly, and its title SHALL come from that stack's pool following the existing trap-title rule. Outsourced tickets SHALL NOT be incidents and SHALL NOT be sensitive. They SHALL follow the existing rules for complexity, traps, due dates, Rust/App/DevOps compensation, store review, unfamiliar stacks and manual hours. Their client SHALL be 外包案主 with no ban, and the company-wide China cloud ban SHALL NOT apply to them. Outsourced ticket cards SHALL show an 外包 chip and the pay as NT$<pay> instead of the KPI value, and SHALL NOT show the 禁中國雲端 chip after the company-wide ban. Engineering investments SHALL apply to outsourced tickets exactly as to company tickets.

#### Scenario: Daily gigs

- **WHEN** outsourcing is on and day 5 starts
- **THEN** between 0 and 2 outsourced tickets are added besides the company tickets

#### Scenario: Stack spread

- **WHEN** 5,000 outsourced tickets are generated in a Laravel-only run
- **THEN** each of laravel, rails, rust, app, sre, devops and fe appears about 14.3% of the time, none is an incident or sensitive, and the rust, sre and devops ones show the 不熟 chip

#### Scenario: China ban exemption

- **WHEN** the company-wide China cloud ban event has fired and an outsourced ticket is selected
- **THEN** DeepSeek Chat is selectable for it and the ticket card shows no 禁中國雲端 chip

#### Scenario: Investments apply

- **WHEN** CLAUDE.md for Rust has been written and a rust outsourced ticket is selected
- **THEN** the dispatch panel's token estimate and success rate match a rust company ticket of the same complexity and the investment hint names the Rust CLAUDE.md
