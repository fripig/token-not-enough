## Context

`tools/check.js` imports `tools/fake-dom.js`, `tools/check-seed.js` (seeds `Math.random` with `CHECK_SEED`, default `CHECK_SEED_DEFAULT` = 29) and then `public/js/main.js`, whose load calls `start()`. Everything after the helper functions `ok`, `near` and `stripComments` lives in one `tests()` function, split into about 117 sections each opened by a `/* … */` header comment. Measured 2026-10-10 at `e3b9595`: 2,527 lines／261.7KB, 1,027 `ok(` call sites, 1,307 assertions run, about 54 s for one run. Facts that shape the design:

- Sections are in the order the changes added them. Assertions for one spec are scattered: engineering investments, for example, sit in the investment block, the SDD block, the panel-collapse block and the domestic-conference block.
- The whole run uses one seeded random sequence and one game state. Inside `tests()` there are 224 top-level `const`／`let` declarations; helpers such as `newRun`, `ticket`, `withRand`, `clickMo`, `clickApp` and `job` are used by many sections. Some sections temporarily replace `Math.random` and restore it from `R0`.
- Two sections use a second, never-started copy of `state.js` loaded as `state.js?pristine` (first-run defaults for self-review and game modes).
- Several sections build file URLs relative to `tools/check.js` with `import.meta.url` (`../public/js/` for the i18n source scan, `../.github/workflows/pages.yml` for the deploy version check).
- On success the run prints only `<n> passed, 0 failed`.
- Node is v24.21.0; `node --test a.test.js b.test.js` ran each file in its own process (different `process.pid`, checked in the scratchpad on 2026-10-10).

## Goals / Non-Goals

**Goals:**

- Every spec's assertions live in one file named after the spec, so a change to one spec edits one file.
- Each file runs independently: its result does not depend on which other files ran or in what order, and it can be run alone.
- No assertion is lost or duplicated by the split.
- `node tools/check.js` stays the command people and docs use; `CHECK_SEED=<integer>` and `CHECK_SEED=random` keep their meaning.

**Non-Goals:**

- No change to the game under `public/`, to `tools/sim.js`, or to any spec requirement text.
- No `package.json`, npm dependency or build step; vitest was considered and not chosen (the user picked built-in `node:test`).
- No rewrite of assertions into `assert`／`expect` style; `ok(cond, name, detail)` stays.
- No CI job that runs the check (`pages.yml` does not run it today); that would be a separate change.
- No new assertions and no tightening of existing ones.
- Keeping today's random sequence byte-for-byte: rejected by the user in discussion, because spec-ordered files cannot share the old interleaved sequence.

## Decisions

### One test file per spec, named after the spec directory

Files are `tools/check/<spec>.test.js`, where `<spec>` is a directory name under `docs/spectra/specs/` (for example `save-game.test.js`). A section goes to the spec whose requirement defines the behavior it asserts; when one header block checks rules from several specs (the `gh-26-01-money-off-score` block covers wallet, scoring, gig pay and the starting wallet), its assertions are split across those specs. A spec with no assertions gets no file. Starting mapping by section header (the implementer confirms each against the spec text):

| Section headers in today's check.js | Target spec file |
| --- | --- |
| 1.1 技術線資料, 1.2 工單技術線分布, 2.3 不熟技術線手寫時間, 3.3 最高分 key, 5.2 公司按鈕的難度標示, 畫面元素, multi-stack-company, 開局按鈕, gh-18-01 toggle, 工單分布與不熟, 公司名稱與最高分 key | company-tech-stack |
| 2.1 慣例加成與 Rust 效果, 2.2 App 上架審核, 5.1 Rust／App 補償, 派工台提示 | stack-agent-effects |
| trap 1.1–6.2, trap 3.2 | trap-tickets |
| research 1.2–3.3 and 研究單 block | research-tickets |
| parallel-slots blocks, 合併衝突留下「解決衝突」工單 | parallel-slots |
| 團隊席位, multi-team-seats blocks | team-seats |
| dispatch-presets, 方案能不能用, 一鍵派工, 存成／載入方案 | dispatch-presets |
| engineering-investments through 開局說明, 投資按鈕順序, SDD blocks, 工程投資面板收合, 國內研討會 | engineering-investments |
| outsource-gigs blocks | outsource-gigs |
| reasoning-effort blocks | reasoning-effort |
| 核心規則 block, by its `work-calendar：`, `agent-catalog：`, … prefixes | the ten core specs (work-calendar, agent-catalog, billing-methods, client-restrictions, ticket-lifecycle, dispatch-outcome, self-review, game-modes, random-events, month-end-scoring) |
| GA 遊戲事件, 派工與結果事件 | play-analytics |
| save-game block | save-game |
| local-hardware block | local-hardware |
| rules-reference block | rules-reference |
| 執行紀錄 block | action-log |
| 玩家中止背景 agent block | game-modes |
| 多語系 block, including the source scan for Chinese outside comments | localization |
| gh-18-01 SRE extra incident roll, 本地 GPU 在跑時不能手寫, gh-26-01 money-off-score block | decided per assertion by the defining requirement |

Alternative considered: files grouped by the change that added them — rejected, it keeps one spec's assertions scattered, which is the problem.

### node:test, one process per file

The runner is Node's built-in `node:test`. node:test runs each file in its own child process, so each file loads the game fresh and `check-seed.js` seeds `Math.random` once per file with the same `CHECK_SEED` value (default 29). Adding, removing or reordering files does not change any other file's draws. `CHECK_SEED=random` leaves the real generator in every file. Alternatives considered: hand-written per-file reset of seed, `start()`, fake `localStorage` and language in one process (works but every file must remember every reset and the run stays single-threaded); vitest (needs `package.json`, `node_modules` and `npm install`; its extra watch／UI／coverage features are not needed here); per-file seeds derived from file name or index (index shifts when a file is inserted; name hashing adds nothing for this check).

### Shared library

`tools/check/lib.js` imports `../fake-dom.js`, `../check-seed.js` and then `../../public/js/main.js` in that order, so a test file that imports `./lib.js` first loads modules in the same order as the browser and today's check. It exports:

- `ok(cond, name, detail)` and `near(a, b, eps)` with today's semantics.
- `section(name, fn)`: registers one node:test `test(name)`. Inside, a failed `ok()` prints `✗ <name> <detail>` as today and the section keeps running; at the end the test fails with an error listing the failed assertion names if any failed, and passes otherwise.
- `stripComments` and every helper used by more than one spec file (at least `newRun`, `ticket`, `withRand`, `clickMo`, `clickApp`, `job`; the implementer adds others found while moving). Helpers used by one spec stay in that file.
- The `state.js?pristine` copy, imported as `../../public/js/state.js?pristine`.

URLs built with `import.meta.url` gain one `../` because the files move one directory down (`../../public/js/`, `../../.github/workflows/pages.yml`).

Each top-level header comment becomes one `section()` with the header text as its name, so node:test's report lists sections by name. A `{ … }` block that starts with its own header (one feature per block, for example the research-ticket or save-game block) stays one section, because its sub-sections share block-scoped variables and splitting them would collide names; a failed assertion inside still prints its own `✗` line. The two wrapper blocks that span several specs (the engineering-investments block and the core-rules block) are opened up and split at their inner headers. Two adjacent sections that share a state-dependent value (導入 SDD 效果 and SDD 兩級, sharing `ec0`) are merged. Implemented 2026-10-10: 93 sections.

### Runner entry point

`tools/check.js` becomes a runner of about 20 lines. It imports `./check-seed.js` first, so an invalid `CHECK_SEED` exits 1 with the existing message before any test starts. It lists `tools/check/*.test.js`; with no arguments it runs all of them, with arguments it runs only the files whose spec name matches each argument, and an unknown name prints the valid names and exits 1. It runs `node --test --test-reporter=spec <files>` through `child_process.spawnSync(process.execPath, …, {stdio:'inherit'})` and exits with the child's status. The environment, including `CHECK_SEED`, passes through unchanged.

### Expand, migrate, contract

The split happens in batches while every assertion keeps running exactly once:

1. Expand: add `lib.js` and the runner; today's `tests()` body moves unchanged into `tools/check/legacy.test.js` as one section, importing the shared helpers from `lib.js`. `node tools/check.js` runs it and must pass.
2. Migrate: each batch moves whole sections for a group of specs out of `legacy.test.js` into spec files. `legacy.test.js` keeps one shared sequence, so removing sections changes the draws of the sections left behind; each batch re-runs the full check.
3. Contract: when `legacy.test.js` is empty it is deleted.

## Implementation Contract

- `node tools/check.js` runs every `tools/check/*.test.js` file and exits 0 when all pass; any failed `ok()` makes its section fail, prints `✗ <assertion name> <detail>`, and makes the command exit non-zero.
- `node tools/check.js save-game trap-tickets` runs only those two files; `node tools/check.js nope` exits 1 and lists the valid names; `node --test tools/check/save-game.test.js` runs one file directly.
- `CHECK_SEED=random node tools/check.js` runs every file with the real `Math.random`; `CHECK_SEED=2 node tools/check.js` runs every file with seed 2; `CHECK_SEED=abc node tools/check.js` exits 1 with `CHECK_SEED 必須是整數或 random，收到「abc」`.
- Running one file alone gives the same section results as the same file in a full run with the same seed.
- No assertion lost or duplicated: a baseline list of assertion names is captured from today's `tools/check.js` by a patched copy in the scratchpad (its `ok()` also appends the name to a file); the same is done for the split files. The two lists compared as multisets are equal, except names that embed a value drawn from `Math.random`, each of which is listed and explained in the task's verification note. No listing flag is added to the repo.
- `git diff` of the change shows nothing under `public/` and no change to `tools/sim.js`, `tools/sim-seed.js`, `tools/seed.js` or `tools/fake-dom.js`; `tools/check-seed.js` changes only in its comment, if at all.
- The 60 `@trace` `code:` lines naming `tools/check.js` in `docs/spectra/specs/*/spec.md` (counted 2026-10-10) name the spec's own `tools/check/<spec>.test.js`; `grep -rn "tools/check.js" docs/spectra/specs` returns nothing afterwards. Requirement and scenario text is untouched.
- Capability-level observable behavior is unchanged.
- In scope: `tools/check.js`, new `tools/check/`, `@trace` code paths in specs, `docs/DESIGN.md`, `README.md`. Out of scope: game code, simulator, assertion tolerances, CI.

## Risks / Trade-offs

- [With new per-file sequences, some of the about 20 ratio assertions (tolerances 2.5–4 standard deviations) may fail under the default seed] → follow the procedure in `docs/DESIGN.md`: run `CHECK_SEED=random node tools/check.js` at least 10 times to confirm the rule holds, then widen that assertion's tolerance or change the default seed, and record the reason in `docs/DESIGN.md`.
- [A moved section silently depends on state or a variable set by an earlier section, in a different file after the split] → each batch runs the full check and each moved file alone; a `ReferenceError` or a changed result points to the missing setup, which the moved section then sets up itself.
- [Moved code still builds paths relative to `tools/`] → the contract lists the known `import.meta.url` uses; running the localization and play-analytics files alone catches a wrong path because the file read fails.
- [The total run time is not measured yet; parallel files may be faster than 54 s, but the slowest single spec file sets the floor] → measured after the split and recorded in `docs/DESIGN.md`; no decision depends on it.
- [node:test's report replaces the single `<n> passed, 0 failed` line] → the exit code still decides pass／fail, which is what DESIGN and README ask people to check.

## Migration Plan

Tooling only; merge to `main`. Rollback is reverting the commits. Other open branches that add assertions to `tools/check.js` must move them into the matching spec file when they rebase.

## Open Questions

None.
