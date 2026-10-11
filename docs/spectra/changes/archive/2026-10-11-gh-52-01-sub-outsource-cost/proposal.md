## Why

Issue #52, split from #45: after money stopped counting toward the score (#26), does the combination of a high-priced subscription plus outsourcing income come with no cost? The previous numbers (`SIM_SUB=pro200`, `SIM_UPGRADE=2 SIM_OUTSOURCE=1`) were measured before `gh-46-02-success-curve`, so they were re-measured on the current code before deciding whether to change subscription quota, gig pay, or anything else.

Measured 2026-10-11 on `main` 6088902, `SIM_N=100`, 300 games per row, seeds 101 and 202 (mean score change; "default" is the default autoplayer):

- Outsourcing only (`SIM_OUTSOURCE=1`) vs default: parallel −18.6% to −27.5%, serial −75% to −258%. Outsourcing has a real cost: money no longer scores, so gigs only crowd out company tickets.
- Outsourcing to pay for an OpenAI upgrade (`SIM_UPGRADE=2 SIM_OUTSOURCE=1`) vs default: parallel +19.5% to +30.3% (Rust +51.1% / +53.9%), serial −11.7% to −37.5% (one outlier: serial Rust seed 202 +110.4%, on a base of 230 points). Vs upgrading without outsourcing (`SIM_UPGRADE=1`, which can rarely afford the upgrade from the starting wallet): parallel +16.8% to +27.2% (Rust +46.6% / +55.1%), serial −9.1% to −40.0% (Rust +2.2% / +115.1%, the seed 202 value on a base of 225 points). The gain comes from the money buying Codex Sol, not from the gigs themselves.
- Strong play (`SIM_SLOTS=6 SIM_INVEST=2 SIM_CONF=1`) with Pro 200 from day 1 vs the same play switched to outsourcing-then-upgrade: parallel −1.3% to −2.9%, S games 915 → 792 of 1,800; serial −54.4% to −72.1%. Seed 101 only; the seed 202 run hung (tracked in #55). The outsourcing path does not push past the parallel S threshold (9,500, defined by strong play with Pro 200).
- Pro 200 from day 1 (`SIM_SUB=pro200`) vs default: parallel +26.4% to +44.4% (Rust +72.4% / +73.7%; before gh-46-02 it was +14.8% to +29.3%), serial +42.6% to +96.3% (Rust +435.5% / +694.8% on a base of 230–375 points). Presumed cause: the default autoplayer sends nearly everything to DeepSeek Chat (capability 30) while Pro 200 sends Sol (capability 40), and the longer success curve from gh-46-02 makes a 10-point gap cost more. Not isolated; a control group with another capability-40 model all day (for example Sonnet on Max 20×) would confirm or refute it. No decision in this change depends on it.

Decided with the user in `/spectra-discuss` on 2026-10-11: the "no cost" concern is not supported (outsourcing alone loses score, and for strong play it is a net loss), so no values change; record the measurements in `docs/DESIGN.md`.

## What Changes

- `docs/DESIGN.md`, section 接外包: add the 2026-10-11 re-measurement (outsourcing only, outsourcing-then-upgrade vs default and vs `SIM_UPGRADE=1`, strong play with and without outsourcing) and the conclusion that values stay.
- `docs/DESIGN.md`, section 結算 (the paragraph on `SIM_SUB=pro200` after money stopped scoring) and section 已知狀況與可做的下一步 (the Pro 200 item): update the Pro 200 gap to the post-gh-46-02 numbers and keep the presumed cause labelled as unmeasured.
- `docs/DESIGN.md`, section 已知狀況與可做的下一步: note that the strong-play outsourcing simulation with seed 202 hangs, tracked in #55.

## Non-Goals

- No change to subscription prices or quotas (including lowering the Pro 200 daily quota, which 已知狀況 lists as an option), `GIG_PAY`, `GIG_LATE`, grade thresholds, or any game code.
- Isolating why Pro 200 beats the default autoplayer by so much (capability vs quota) is not done here.
- Fixing the hung simulation belongs to #55.
- No delta specs: no rule or observable game behavior changes.

## Impact

- Affected specs: none
- Affected code:
  - New: (none)
  - Modified: docs/DESIGN.md
  - Removed: (none)
- Compatibility: no capability-level observable behavior changes
