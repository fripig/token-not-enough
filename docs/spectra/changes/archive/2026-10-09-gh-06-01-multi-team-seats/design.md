## Context

Team seats live in `S.seat = {vendor, status, day}` with status none, pending, approved or rejected, created in `fresh()`. `planPicker` in the setup modal offers 不申請 plus `SEAT.vendors` (anthropic, openai, google) when no request is pending or approved; confirming `showSetup` writes a pending request. `endDay` reviews a pending request on the first day at least five days later with a fixed trust threshold of 55. `bills(v, is)` adds 公司席位 only for `S.seat.vendor`, `presetBlock` returns 沒有公司席位 for any other vendor, and `render` draws one seat quota box. Seat quota counters `S.used.seat[v]` already exist for every seat vendor and reset daily and on Mondays, so per-vendor quota needs no new counters.

The review runs at the start of `endDay`, before `showDay` offers the Monday 調整訂閱 button, so a seat approved on a Monday can be followed by the next request in that same Monday's adjustment.

Another change, reasoning-effort, is being applied in the working tree and edits the same modules (calc.js, modals.js, view.js, check.js). This change is meant to be applied after reasoning-effort is committed.

## Goals / Non-Goals

**Goals:**

- Up to three approved seats, at most one per seat vendor.
- Trust thresholds 55, 65 and 75 for the first, second and third seat, judged at review time against how many seats are already approved.
- One pending request at a time; requests only in the opening setup and the Monday adjustment; a rejected vendor can be requested again later.
- Seat billing, preset usability, quota boxes and dispatch hint work for every approved seat.

**Non-Goals:**

- Two seats from the same vendor (stacked quota). The user chose one seat per vendor.
- Several requests reviewed in parallel. The user chose one pending request at a time.
- A trust penalty for rejection, or losing a seat when trust later drops. Neither exists today and the user did not ask for them.
- Teaching `tools/sim.js` to request seats. The sim auto-player never requests a seat today, so its balance tables are unaffected; balance of three company-paid seats is not measured by this change.
- Changing seat quota (2,500k per day, 10,000k per week) or the five-day wait.

## Decisions

### Split seat state into approved seats and one pending request

Replace `S.seat` with `S.seats`, an array of approved vendor keys in approval order, and `S.seatReq`, either null or `{vendor, day}`. The seat count drives the threshold, "is this vendor seated" is `S.seats.includes(v)`, and "can request" is `!S.seatReq && S.seats.length < SEAT.vendors.length`. Rejection clears `S.seatReq`, which replaces the old rejected status; the rejection message itself carries the information.

Alternative considered: a per-vendor status map `{anthropic:'approved', openai:'pending', …}`. It makes "one pending at a time" and "which seat number" derived counts spread across every reader, and keeps a rejected state that nothing needs.

### Seat trust thresholds keyed by approved seat count

Add `SEAT.trust = [55, 65, 75]` in data.js. The threshold for a request is `SEAT.trust[S.seats.length]`, read when the request is reviewed, not when it is made. The picker shows the same value so the player knows the bar before asking. Judging at review time matches how the single seat works today (trust is checked on day 6, not day 1).

### Seat picker lists only unseated vendors

`planPicker` shows the seat block when a request can be made (in the opening setup and Monday adjustment alike), with options 不申請 plus every seat vendor not in `S.seats`, in `SEAT.vendors` order. The block heading becomes 向公司申請第 N 個團隊席位（5 天後審核，信任需 X 以上）, where N is `S.seats.length + 1` and X is `SEAT.trust[S.seats.length]`. `draft.seat` keeps its current meaning (empty string or a vendor key).

### Every approved seat bills and shows quota

`bills` offers 公司席位 when `S.seats.includes(v)`. `presetBlock` returns 沒有公司席位 when `!S.seats.includes(p.v)`. `render` draws one quota box per entry of `S.seats` in approval order, then the pending line 團隊席位採購審核中，預計第 D 天有結果 when `S.seatReq` is set (D = request day + 5). The dispatch hint appears when at least one seat is approved and the selected vendor has none, and names every seated vendor's agent joined with 、: 你有 X、Y 團隊席位，選 A、B 的模型才能用公司席位付款。

## Implementation Contract

**Behavior**

- Opening setup: seat picker heading 向公司申請第 1 個團隊席位（5 天後審核，信任需 55 以上）, options 不申請, Anthropic, OpenAI, Google.
- Review on the first day at least five days after the request: approve when trust ≥ `SEAT.trust[S.seats.length]`, appending the vendor to `S.seats`, with the existing approval message and log; otherwise report 採購被退件：主管信任不夠（需要 X 以上）。 with X the threshold that was applied, and log the rejection. Either way `S.seatReq` becomes null.
- Monday adjustment: seat picker shown only when no request is pending and fewer than three seats are approved; it lists only unseated vendors and the next threshold.
- Billing: 公司席位 available for every seated vendor, each with its own daily and weekly quota; outsourced tickets still block it through `gigBlocked`.

**Data shape**

- `S.seats: string[]` (vendor keys, approval order, initially `[]`), `S.seatReq: {vendor: string, day: number} | null` (initially null). `S.seat` is removed; no reader of it remains.
- `SEAT.trust: [55, 65, 75]`.

**Failure modes**

- A request can only name a seat vendor not already in `S.seats`; the picker never offers others, so no runtime guard beyond the picker is required.
- Nothing is persisted to localStorage, so there is no old save shape to migrate.

**Acceptance criteria**

- `node tools/check.js` passes with the existing seat assertions moved to `S.seats` and new assertions for: second-seat threshold 65 (approve at 65, reject at 64 with 需要 65 以上), third-seat threshold 75, picker listing only unseated vendors with the right heading, picker hidden while pending and after three seats, two seated vendors both offering 公司席位 with separate quota, dispatch hint naming both agents, and presetBlock usable for a second seated vendor.
- `node tools/sim.js` with `SIM_N=20` runs to completion (no crash; numbers not compared).
- Manual: in the browser, request a seat on day 1, raise trust, approve on day 6, request a second seat in the day-6 Monday adjustment, see two quota boxes on day 11.

**Scope**

- In scope: data.js, state.js, actions.js (`endDay` review), calc.js (`bills`, `presetBlock`), view.js (quota boxes, dispatch hint), modals.js (`planPicker`, `showSetup` confirm), tools/check.js, docs/DESIGN.md.
- Out of scope: sim auto-player seat strategy, seat quota numbers, rating thresholds, reasoning-effort behavior.

## Risks / Trade-offs

- [Three company-paid seats may make high-trust runs noticeably easier, and the sim cannot show it] → Rising thresholds and the one-pending rule mean the third seat arrives on day 16 at the earliest (requests on days 1, 6, 11, each reviewed five days later). Record this in DESIGN.md's known issues as unmeasured; teaching the sim to request seats is a possible follow-up.
- [Conflicting edits with the in-progress reasoning-effort change in the same modules] → Apply this change only after reasoning-effort is committed.
