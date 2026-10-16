## MODIFIED Requirements

### Requirement: Other ticket action events

The game SHALL send one event per other ticket-solving action, after the action's result is known:

- `manual_fix` when manual work finishes on a ticket still in the queue, with the ticket's `cx` shown before the work, `stack`, `unfamiliar`, `gig`, `hours` (one decimal) and `outcome` (`success`, `fail`, or `trap` when a hidden trap was revealed).
- `evaluate` when an architecture evaluation is charged, with `vendor`, `model`, `bill`, the ticket's `cx` shown before the evaluation, `stack`, `gig` and `outcome` (`found` when a trap was revealed, `clear` otherwise, `quota` when the quota ran out).
- `research` when agent or self research on a research ticket is charged, with `via` (`agent` or `self`), `vendor`, `model` and `bill` (`none` for all three on self research), the ticket's `cx`, `stack`, `gig` and `outcome` (`split` when the ticket was split, `quota` when the quota ran out).
- `rescope` when the player asks the manager to re-estimate, with the ticket's `cx`, `stack` and `outcome` (`approved` or `refused`).
- `invest` when an investment level is applied (bought directly, an investment ticket hand-written, or an agent investment ticket accepted), a machine purchase request is accepted, or a conference registration is accepted, with `investment`, `stack`, `via`, `quality`, `vendor`, `model` and `bill`. `via` SHALL be `agent` for a level applied by an agent investment ticket and `self` otherwise; `quality` SHALL be the applied quality as an integer percent (100 for `self`, machine requests and registrations); `vendor`, `model` and `bill` SHALL be the agent's choice for `agent` and `none` otherwise. A redo that applies a quality to an already-owned level SHALL send the same key as that level. `investment` SHALL be the investment key for level 1 (for example `md`, `tests`), the key followed by `2` for level 2 (`md2`, `tests2`, `scan2`, `skills2`), `ai1`, `ai2` or `ai3` for 提升 agent 能力, `pc`, `spark` or `mac` for a machine request, and `conf_` followed by the conference key for a registration (for example `conf_hitcon`). `stack` SHALL be the stack for CLAUDE.md at either level and `none` otherwise. Machine arrival or rejection and conference attendance SHALL NOT send an event. Opening, dispatching, cancelling, a payment shortfall or an agent job finishing into 待驗收 of an investment ticket SHALL NOT send an event, and investment tickets SHALL NOT send `dispatch` or `job_result`.

An action that is refused (not enough hours, local GPU busy, research on a ticket that is not a research ticket, investment already bought, locked or unaffordable, machine request refused, conference registration refused) SHALL NOT send its event.

#### Scenario: Manual fix

- **WHEN** in serial mode the player writes a complexity-1 Laravel ticket by hand and it succeeds
- **THEN** one `manual_fix` event is sent with `cx` 1, `stack` `laravel`, `unfamiliar` `false`, `outcome` `success`

#### Scenario: Evaluate finds a trap

- **WHEN** the player evaluates a hidden-trap ticket shown as complexity 1 with true complexity 4 and the trap is revealed
- **THEN** one `evaluate` event is sent with `outcome` `found` and `cx` 1

#### Scenario: Rescope

- **WHEN** with trust 70 the player asks the manager to re-estimate a revealed trap
- **THEN** one `rescope` event is sent with `outcome` `approved`; with trust 40 it has `outcome` `refused`

#### Scenario: Invest

- **WHEN** the player buys CLAUDE.md for Rust, then tries to buy it again before attending a conference covering rust
- **THEN** one `invest` event is sent with `investment` `md` and `stack` `rust`, and the second attempt sends nothing

#### Scenario: Machine request

- **WHEN** the player requests the DGX Spark, then tries to request the Mac while the Spark is pending
- **THEN** one `invest` event is sent with `investment` `spark` and `stack` `none`, and the second attempt sends nothing

#### Scenario: Research

- **WHEN** the player self-researches a complexity-4 Laravel research ticket
- **THEN** one `research` event is sent with `via` `self`, `vendor` `none`, `cx` 4, `stack` `laravel`, `outcome` `split`

#### Scenario: Level 2 and agent capability

- **WHEN** after attending COSCUP the player buys CLAUDE.md level 2 for Rust and 提升 agent 能力 level 1
- **THEN** one `invest` event is sent with `investment` `md2` and `stack` `rust`, and one with `investment` `ai1` and `stack` `none`

#### Scenario: Conference registration

- **WHEN** the player registers for HITCON, then tries to register for COSCUP in the same week
- **THEN** one `invest` event is sent with `investment` `conf_hitcon` and `stack` `none`, the second attempt sends nothing, and the Monday attendance sends nothing

#### Scenario: Agent investment ticket

- **WHEN** in parallel mode the player opens a 寫 CLAUDE.md investment ticket for laravel, dispatches it to DeepSeek Chat on personal API, it finishes, and the player accepts it
- **THEN** no event is sent on opening, dispatch or finishing, no `dispatch` or `job_result` event is sent, and one `invest` event is sent on acceptance with `investment` `md`, `stack` `laravel`, `via` `agent`, `quality` 60, `vendor` `deepseek`, `model` `chat`, `bill` `api`

#### Scenario: Direct purchase parameters

- **WHEN** in serial mode the player buys 監控告警
- **THEN** one `invest` event is sent with `investment` `monitor`, `via` `self`, `quality` 100, `vendor` `none`, `model` `none`, `bill` `none`
