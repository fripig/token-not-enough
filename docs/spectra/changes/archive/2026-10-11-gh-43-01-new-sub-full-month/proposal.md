## Why

On day 16 a player switched OpenAI from 不訂閱 to Pro 200 and paid only NT$1,625 (NT$6,500 × 1 week left ÷ 4) (issue #43). That follows the current Monday rule, which pro-rates every price increase by the weeks left, but it makes a top-tier subscription in the last week cost a quarter of its monthly price. The user (2026-10-11) picked "新訂閱收全月" from three options: a vendor going from no subscription to a paid plan pays the full monthly price; upgrades between paid plans stay pro-rated.

## What Changes

- 週一：調整訂閱: for a vendor whose current plan is 不訂閱 (price NT$0) and whose new plan is paid, charge the new plan's full monthly price, not pro-rated.
- For a vendor whose current plan is paid, keep the current rule: max(0, new price − current price) × (weeks left ÷ 4). Downgrades still take effect immediately with no refund.
- The opening modal is unchanged (it already charges the full monthly price).
- The Monday modal lead line and the rules modal (zh-TW and en) say that a new subscription is charged the full month and an upgrade pays the difference for the weeks left.

## Non-Goals

- Upgrading from a cheap paid plan (e.g. Plus) to an expensive one stays pro-rated, so subscribing Plus on day 1 and upgrading on day 16 is still cheaper than subscribing Pro 200 on day 16. The user chose this option knowing the other two ("一律收全月差價", "維持按週比例").
- No change to quotas: a plan bought mid-month still gets the full daily and weekly quota from that Monday.
- No refund on downgrade, no change to team seats.
- Saved games need no migration: the rule only affects the next payment.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `work-calendar`: the Monday subscription payment rule charges the full monthly price when a vendor goes from 不訂閱 to a paid plan.

## Impact

- public/js/modals.js: `planCost` (Monday branch).
- public/js/i18n/zh-TW.js and public/js/i18n/en.js: `ui.setup.leadAdj`, `rules.time3`.
- docs/spectra/specs/work-calendar/spec.md (through the delta spec).
- tools/check/work-calendar.test.js: the 週一補差價 section.
- docs/DESIGN.md: 時間與資源 section.
- tools/sim.js: `SIM_UPGRADE` subscribes OpenAI from 不訂閱 on Mondays, so its results change; the default simulation subscribes only at the opening and is expected to be byte-identical under a fixed seed.
