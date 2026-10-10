## Why

`tools/check.js` is one file with one `tests()` function: measured 2026-10-10 at `e3b9595` it is 2,527 lines／261.7KB (204 lines over 200 chars), has 1,027 `ok(` call sites that run 1,307 assertions, and takes about 54 s single-threaded (`node tools/check.js`, one run, macOS). It grew from 1,527 to 2,527 lines in one day and was edited 36 times that day (figures from #37). Sections are ordered by when each change added them, not by spec, so the assertions for one spec are scattered (engineering investments appear in three separate places), every section shares one random sequence and one game state, and moving or inserting a section can make an unrelated ratio assertion fail. `docs/DESIGN.md` lists "rule checks are getting hard to write" as the signal for a test framework; the user chose Node's built-in `node:test` (#37 discussion, 2026-10-10).

## What Changes

- Split the assertions into one file per spec: `tools/check/<spec>.test.js`, named after the directories under `docs/spectra/specs/`, run with Node's built-in `node:test` (no dependency, no `package.json`).
- New `tools/check/lib.js`: the shared imports (`fake-dom.js`, `check-seed.js`, then `public/js/main.js`, in that order) and helpers (`ok`, `near`, `stripComments`, `newRun`, `ticket`, `withRand`, `clickMo`, `clickApp`, `job` and others shared across specs), plus a `section(name, fn)` wrapper that runs one `node:test` test, keeps running after a failed `ok()`, and fails the test listing every failed assertion.
- Each test file runs in its own process (node:test's default), so it starts from a freshly loaded game with `Math.random` seeded by `CHECK_SEED` (default 29, same value for every file); files no longer affect each other's random draws or state.
- `node tools/check.js` stays the entry point: it validates `CHECK_SEED`, then runs `node --test` on every `tools/check/*.test.js`, or only the specs named as arguments (`node tools/check.js save-game trap-tickets`); an unknown name exits 1 and lists the valid names. Running a single file directly with `node --test tools/check/<spec>.test.js` also works.
- The 60 `@trace` `code:` entries in `docs/spectra/specs/*/spec.md` that point at `tools/check.js` are changed to the file that now holds that spec's assertions.
- `docs/DESIGN.md` (check tool description, `CHECK_SEED`, module import rule, framework evaluation) and `README.md` describe the new layout.

## Non-Goals (optional)

Recorded in design.md.

## Impact

- Affected specs: none
- Affected code:
  - New: tools/check/lib.js, tools/check/*.test.js (one per spec that has assertions)
  - Modified: tools/check.js (becomes the runner), docs/DESIGN.md, README.md, README.en.md, docs/spectra/specs/*/spec.md (`@trace` code paths only, no requirement text)
  - Removed: the `tests()` body inside tools/check.js
- Compatibility: no capability-level observable behavior changes; nothing under `public/` changes and `tools/sim.js` is untouched. The check's own output format changes to node:test's reporter, and because each file now seeds its own random sequence, the seeded draws differ from today's single sequence.
- Refactor check (2026-10-10, only the files this change touches): tools/check.js 2,527 lines／261.7KB (204 lines over 200 chars); game modules not touched. Conclusion: this change is itself the local cleanup; it introduces a test runner (`node:test`, built into Node 24), approved by the user, and no build step or front-end framework.
