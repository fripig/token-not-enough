# company-tech-stack Specification

## Purpose

Lets the player choose a company with a primary tech stack at the start of a run, which shapes the mix of incoming tickets and how costly unfamiliar tickets are to write by hand. It widens the game beyond a single Laravel backend role.

## Requirements

### Requirement: Company selection at run start

The opening setup modal SHALL present four companies — Laravel 新聞站, Rails SaaS, Rust 基礎設施, App 團隊 — each labelled with its difficulty (Laravel 新聞站 and Rails SaaS 難度 ★, App 團隊 難度 ★★, Rust 基礎設施 難度 ★★★), and SHALL store the chosen company for the run. The default selection SHALL be Laravel 新聞站. The intro text SHALL describe the player as a full-stack engineer at the selected company. The weekly subscription adjustment modal SHALL NOT offer a company change.

#### Scenario: Player picks a company

- **WHEN** the player selects Rails SaaS in the opening modal and starts day 1
- **THEN** the run's company is Rails SaaS and the header and month-end receipt show the Rails SaaS company name

#### Scenario: Difficulty labels

- **WHEN** the opening modal is shown
- **THEN** the Rust 基礎設施 button shows 難度 ★★★ and the Laravel 新聞站 button shows 難度 ★

#### Scenario: Company persists across replay

- **WHEN** the player finishes a month as Rust 基礎設施 and clicks 再玩一個月
- **THEN** the opening modal preselects Rust 基礎設施

#### Scenario: Weekly adjustment hides the picker

- **WHEN** the weekly 調整訂閱 modal opens on a Monday
- **THEN** no company picker is shown

---
### Requirement: Ticket stack distribution

Every ticket SHALL carry exactly one stack from laravel, rails, rust, app, fe. Non-incident tickets SHALL be assigned the company's primary stack with probability 0.75, fe with probability 0.15, and one of the other three company stacks (uniformly) with probability 0.10. Incident tickets SHALL always use the primary stack. Each ticket's title SHALL come from its stack's title pool at the ticket's complexity level.

#### Scenario: Incident uses primary stack

- **WHEN** a traffic-spike event creates incident tickets during an App 團隊 run
- **THEN** both incident tickets have stack app and titles from the app incident pool

#### Scenario: Long-run distribution

- **WHEN** 10,000 non-incident tickets are generated for a Rails SaaS run
- **THEN** about 75% are rails, about 15% are fe, and the remaining tickets are spread across laravel, rust, and app

---
### Requirement: Unfamiliar stack hand-writing cost

A ticket SHALL be unfamiliar when its stack is neither the primary stack nor fe. Writing an unfamiliar ticket by hand SHALL take twice the normal manual hours, and the manual button SHALL show the doubled hours. Ticket cards for unfamiliar tickets SHALL show a 不熟 chip.

#### Scenario: Manual hours doubled

- **WHEN** a Laravel 新聞站 player selects a complexity 2 rust ticket with no previous tries
- **THEN** the manual button shows 8.8h and the card shows the 不熟 chip

##### Example: manual hours by familiarity

| Company | Ticket stack | Complexity | Tries | Manual hours |
| ------- | ------------ | ---------- | ----- | ------------ |
| laravel | laravel | 2 | 0 | 4.4h |
| laravel | fe | 2 | 0 | 4.4h |
| laravel | rust | 2 | 0 | 8.8h |
| app | rails | 3 | 1 | 10.6h |

---
### Requirement: Best score per mode and company

The month-end best score SHALL be stored and read per mode and company under the key tokgame-best-<mode>-<company>. When that key has no value and the company is laravel, the legacy key tokgame-best-<mode> SHALL be read as the previous best. Storage failures SHALL NOT interrupt the game.

#### Scenario: Legacy Laravel best is kept

- **WHEN** localStorage holds tokgame-best-parallel = 4200 and no tokgame-best-parallel-laravel, and a Laravel parallel run ends
- **THEN** the receipt shows 4,200 as the previous best

#### Scenario: Storage unavailable

- **WHEN** localStorage access throws at month end
- **THEN** the receipt renders without a previous-best line and no error is thrown
