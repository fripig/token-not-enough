## Why

gh-06-01-multi-team-seats let a player hold up to three company-paid team seats (trust 55/65/75), but its balance was never measured: the tools/sim.js auto-player never requests a seat. It also ignores trust, so even if it requested seats under the real rules it would almost never get one. A probe run on 2026-10-09 (SIM_N=30, 360 runs per mode, script kept outside the repo) found trust ≥ 55 on day 6 in only 11% (parallel) and 13% (single-thread) of runs, and ≥ 65 on day 11 in 0% and 0%. Measuring under the real rules would therefore show almost no effect, so this change measures the upper bound instead: how much a player gains when trust is always high enough.

## What Changes

- tools/sim.js gains a `SIM_SEATS=<1|2|3>` switch. With it set, the simulator grants seats at the start of day 6, 11 and 16, up to that count, in `SEAT.vendors` order (Anthropic, OpenAI, Google), as if every request had been approved. It does this by appending to `S.seats`, without going through the request picker or trust check. Any other value exits with an error, like `SIM_SLOTS`.
- With seats granted, the auto-player bills a company ticket to the first seated vendor whose seat quota left today is above 300k, using that vendor's capability-4 model (Claude Sonnet, Codex 標準, Gemini Pro). Outsourced tickets keep their current personal-API billing. Without `SIM_SEATS`, the auto-player's choices are unchanged.
- The simulator's header comment and the tools/sim.js entry in docs/DESIGN.md describe the new switch.
- Run `SIM_SEATS=1`, `2` and `3` against a no-seat baseline, `SIM_N=100`, twice each, and record the mean score ratio per mode × company in docs/DESIGN.md's team seat section. Replace the "unmeasured" line in the known issues with the result.
- Report the numbers on GitHub issue #7. If any parallel-mode cell for three seats is above +15% (the target band used for earlier features is −5% to +15%), say so there and in DESIGN.md, and leave the decision on thresholds or quota to a separate discussion.

## Non-Goals (optional)

- Changing any game rule or number (seat quota, trust thresholds, approval wait). The user chose to record the result and discuss tuning separately.
- Teaching the auto-player to protect trust and request seats under the real rules. That would rewrite the dispatch strategy and shift every existing balance table; the user chose the upper-bound measurement instead.
- Measuring seat combinations other than Anthropic → OpenAI → Google, or a smarter choice of which seat to bill.
- Adding check.js assertions: the simulator is a measurement tool with no spec, and its default output is guarded by the seeded comparison below.

## Impact

- Affected specs: none
- Affected code:
  - New: (none)
  - Modified: tools/sim.js, docs/DESIGN.md
  - Removed: (none)
- Compatibility: no capability-level observable behavior changes. Without `SIM_SEATS`, seeded simulator output (SIM_SEED=1 SIM_N=5) stays byte-for-byte identical to before the change.
