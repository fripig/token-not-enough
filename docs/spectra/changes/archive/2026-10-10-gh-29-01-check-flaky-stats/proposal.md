## Why

`node tools/check.js` uses the real `Math.random`, and about 20 assertions check a measured share against a tolerance (for example 「進件：sre 第 12 天事故 0.2256」 within ±0.01 on 10,000 tickets). Most tolerances are only 2.5–4 standard deviations wide, so a correct game still fails a run now and then. Measured 2026-10-10 on `main` at `5717748`: 2 of 40 runs failed, on two different assertions (「ticket-lifecycle：新進工單 12% 是事故」 and 「約一半陷阱用暗示標題」), and earlier during gh-21-01 the SRE intake assertion failed 2 times in about a dozen runs. A 200,000-ticket measurement of the SRE case gave 0.2243 against 0.2256, so the rules are right and the failures are sampling noise. A check that fails by chance makes 「全部通過」 unreliable as evidence. The user chose to seed the check run by default (#29).

## What Changes

- `tools/seed.js` exports the existing mulberry32 seeding as a function so another tool can call it; reading `SIM_SEED` moves to new `tools/sim-seed.js`, imported only by `tools/sim.js`, so `SIM_SEED` keeps working exactly as before for the simulator and no longer leaks into the check.
- New `tools/check-seed.js`, imported by `tools/check.js` before the game modules: it seeds `Math.random` with a fixed default seed, so every run of `node tools/check.js` draws the same random sequence and gives the same result.
- `CHECK_SEED=<integer>` runs the check with another seed; `CHECK_SEED=random` keeps the real `Math.random`, for hunting borderline assertions.
- `docs/DESIGN.md` documents the default seed and `CHECK_SEED`.

## Non-Goals (optional)

Recorded in design.md.

## Impact

- Affected specs: none
- Affected code:
  - New: tools/check-seed.js, tools/sim-seed.js
  - Modified: tools/seed.js, tools/check.js, tools/sim.js (import line only), docs/DESIGN.md
  - Removed: (none)
- Compatibility: no capability-level observable behavior changes; the game under `public/` is not touched and `tools/sim.js` output for any `SIM_SEED` stays identical.
- Refactor check (2026-10-10, only the modules this change touches): tools/check.js 1,958 lines／200.3KB (160 lines over 200 chars), tools/seed.js 8 lines. Conclusion: no refactor; only test tooling changes.
