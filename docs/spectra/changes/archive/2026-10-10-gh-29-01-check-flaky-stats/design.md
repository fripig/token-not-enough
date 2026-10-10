## Context

`tools/check.js` imports `tools/fake-dom.js` and then `public/js/main.js`, whose load calls `start()` and draws the first tickets with `Math.random`. Many test blocks temporarily replace `Math.random` (helpers such as `withRand` and `rand`) and restore it from a copy taken with `const R0=Math.random` inside the test function, so whatever generator is installed before the game modules load is the one they restore. `tools/seed.js` already installs a mulberry32 generator when `SIM_SEED` is set; `tools/sim.js` imports it right after `fake-dom.js`. About 20 assertions compare a measured share with a tolerance of roughly 2.5–4 standard deviations; with the real `Math.random`, 2 of 40 runs failed on 2026-10-10.

## Goals / Non-Goals

**Goals:**

- `node tools/check.js` gives the same result every run.
- A developer can still run the check with another seed or with the real `Math.random`.
- `tools/sim.js` behaviour, including fixed-seed output, is unchanged.

**Non-Goals:**

- No change to tolerances or sample sizes of individual assertions (the user chose seeding over widening; widening was offered and declined).
- No change to the game under `public/`.
- No change to how `SIM_SEED` behaves for `tools/sim.js` (same values, validation and error message); only the file that reads it moves.

## Decisions

### Seeding function exported from seed.js

`tools/seed.js` exports `seedRandom(seed)`, which installs the existing mulberry32 generator on `Math.random`. Alternative considered: copy mulberry32 into a new file — rejected, two copies of the generator could drift.

### SIM_SEED read only by the simulator

`tools/seed.js` only exports `seedRandom`; the block that reads `SIM_SEED`, validates it with the same error message and calls `seedRandom` moves to new `tools/sim-seed.js`, and `tools/sim.js` imports `./sim-seed.js` instead of `./seed.js`. Reason (found by `/spectra-verify`, the user chose this fix): if `seed.js` kept reading `SIM_SEED`, a value left in the shell would leak into the check run, so `SIM_SEED=x node tools/check.js` would exit with the simulator's message and `SIM_SEED=7 CHECK_SEED=random` would run seeded. Alternative considered: only document the leak in `docs/DESIGN.md` — not chosen by the user.

### Default check seed in check-seed.js

New `tools/check-seed.js` imports `seedRandom` and reads `CHECK_SEED`: unset uses the default seed `CHECK_SEED_DEFAULT` (exported constant); an integer uses that seed; the literal `random` leaves the real `Math.random`; anything else prints `CHECK_SEED 必須是整數或 random，收到「…」` and exits with code 1. When seeded it prints nothing extra, so a passing run still ends with `<n> passed, 0 failed`. `tools/check.js` imports it right after `fake-dom.js` and before `public/js/main.js`, matching the order `tools/sim.js` uses. The default seed is chosen as an integer whose run passes every assertion; the value is recorded in `docs/DESIGN.md`. Alternative considered: setting `SIM_SEED` inside check.js — rejected, ES module imports are hoisted so the environment variable cannot be set before `seed.js` runs, and reusing the simulator's variable would be confusing.

## Implementation Contract

- `node tools/check.js` run twice in a row produces byte-identical output and exits 0.
- `CHECK_SEED=<another integer> node tools/check.js` runs to completion with that seed; `CHECK_SEED=random node tools/check.js` runs with the real `Math.random`; `CHECK_SEED=abc node tools/check.js` exits 1 with the error message above.
- `SIM_SEED=7 SIM_N=10 node tools/sim.js` output is byte-identical before and after the change.
- `SIM_SEED=x node tools/check.js` and `SIM_SEED=7 CHECK_SEED=random node tools/check.js` behave as if `SIM_SEED` were unset; `SIM_SEED=x node tools/sim.js` still exits 1 with the existing message.
- Capability-level observable behaviour is unchanged: nothing under `public/` changes.
- In scope: `tools/seed.js`, new `tools/check-seed.js`, new `tools/sim-seed.js`, the import line in `tools/check.js` and in `tools/sim.js`, the tool descriptions in `docs/DESIGN.md`. Out of scope: assertion tolerances, game code, simulator logic.

## Risks / Trade-offs

- [A later change that alters the random sequence can make the fixed seed land on a borderline sample and fail every run] → the failure is reproducible; confirm with `CHECK_SEED=random` or a few other seeds that the rule is right, then adjust the assertion or the default seed and note why.
- [A fixed seed exercises one sample, so a real rule regression of a few percent could pass by chance] → the tolerances are unchanged, so a regression larger than the tolerance still fails; `CHECK_SEED=random` remains available for wider sampling.

## Migration Plan

Tooling only; merge to `main`. Rollback is reverting the commit.

## Open Questions

None.
