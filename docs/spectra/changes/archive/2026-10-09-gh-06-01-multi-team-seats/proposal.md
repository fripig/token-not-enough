## Why

The player asked to be able to request more than one company team seat: 「公司團隊席位應該可以多申請 如果信任度夠高可以申請第二個第三個」. Today the player holds at most one seat for the whole month, so keeping trust high pays off only once. Letting a high-trust player win a second and third seat turns trust into an ongoing resource and gives company-paid quota for more than one vendor.

## What Changes

- The player can hold up to three team seats, at most one per seat vendor (Anthropic, OpenAI, Google).
- The trust needed for approval rises with each seat: 55 for the first, 65 for the second, 75 for the third, checked when the request is reviewed.
- Requests keep the current rhythm: made in the opening setup or the Monday adjustment, reviewed five days later, and only one request can be pending at a time. A rejected vendor can be requested again at a later Monday.
- The seat request picker lists only vendors without an approved seat, states which seat number this would be and the trust it needs, and disappears while a request is pending or once all three seats are held.
- The quota area shows one quota box per approved seat, plus the pending line when a request is under review.
- 公司席位 becomes a billing method for every vendor holding an approved seat; the dispatch panel hint names all agents whose models can use a seat.
- Dispatch presets and one-click dispatch treat a seat preset as usable when that preset's vendor holds an approved seat.
- Outsourced tickets still cannot bill any company seat (unchanged).

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `team-seats`: seat request, approval and billing change from one seat to up to three seats with rising trust thresholds.

## Impact

- Affected specs: team-seats
- Affected code: public/js/data.js (seat trust thresholds), public/js/state.js (seat state in fresh()), public/js/actions.js (seat review in endDay), public/js/calc.js (bills, presetBlock), public/js/view.js (quota boxes, dispatch hint), public/js/modals.js (seat picker in planPicker and its confirm handler in showSetup), tools/check.js (seat assertions), docs/DESIGN.md (team seat rules)
- tools/sim.js has no seat logic today; its balance tables are unaffected.
