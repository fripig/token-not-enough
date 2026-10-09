## MODIFIED Requirements

### Requirement: Other ticket action events

The game SHALL send one event per other ticket-solving action, after the action's result is known:

- `manual_fix` when manual work finishes on a ticket still in the queue, with the ticket's `cx` shown before the work, `stack`, `unfamiliar`, `gig`, `hours` (one decimal) and `outcome` (`success`, `fail`, or `trap` when a hidden trap was revealed).
- `evaluate` when an architecture evaluation is charged, with `vendor`, `model`, `bill`, the ticket's `cx` shown before the evaluation, `stack`, `gig` and `outcome` (`found` when a trap was revealed, `clear` otherwise, `quota` when the quota ran out).
- `rescope` when the player asks the manager to re-estimate, with the ticket's `cx`, `stack` and `outcome` (`approved` or `refused`).
- `invest` when an investment is bought, with `investment` (the investment key) and `stack` (the stack for CLAUDE.md, `none` otherwise).

An action that is refused (not enough hours, local GPU busy, investment already bought or unaffordable) SHALL NOT send its event.

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

- **WHEN** the player buys CLAUDE.md for Rust, then tries to buy it again
- **THEN** one `invest` event is sent with `investment` `md` and `stack` `rust`, and the second attempt sends nothing
