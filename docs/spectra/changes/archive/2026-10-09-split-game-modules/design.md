## Context

The whole game is the classic script `public/js/game.js`, loaded by `public/index.html` at the end of `<body>`. It is already organised under banner comments: 資料, 工具, 狀態, 計算, 動作, 畫面, 彈窗, 事件. All top-level bindings are script globals. Only two places reassign shared mutable bindings: `fresh()` reassigns `S`, `sel` and `uid`, and `start()` resets `uid=0`. `showSetup` reassigns `draft`, which only the modal code uses.

The two tools load the game by text: `tools/check.js` runs `eval(src + tests)` and its `ticket()` helper does `++uid`; `tools/sim.js` runs `eval(src + sim)` and implements `SIM_TRAP` by regex-replacing `const TRAP_RATE=…;` in the source. Both install a fake `document` and `localStorage` before the eval.

Facts checked on 2026-10-09 while writing this design:
- Running `tools/check.js` with `"use strict";` prepended to the evaluated source still passes every assertion, so module strict mode does not break the current code.
- Node v24.21.0 loads a `.js` file that uses `import`/`export` as an ES module when no `package.json` is present, and a named import observes later reassignment by the exporting module (live binding).

## Goals / Non-Goals

**Goals:**
- Replace `public/js/game.js` with seven ES modules that follow the existing banners, loaded without any build step.
- Load the game in both tools through `import`, not `eval` of source text.
- Prove behavior is unchanged with byte-identical seeded simulator output and an unchanged `tools/check.js` pass count.

**Non-Goals:**
- Any framework, library, bundler, transpiler or npm dependency.
- Any change to rules, numbers, UI text, markup, CSS, rendering approach or event delegation.
- Restructuring code inside a section, renaming identifiers, or splitting `render()`.
- Keeping the file-path argument of the tools or the `.html` single-file mode of `sim.js`.

## Decisions

### Module boundaries follow the existing banners

| Module | Content (by banner) |
|---|---|
| `public/js/data.js` | 資料 and 工具: vendors, clients, seat, base numbers, stacks, companies, presets, investments, random and formatting helpers |
| `public/js/state.js` | 狀態: `S`, `sel`, id counter, `fresh`, stack picking, trap rate, `makeIssue` |
| `public/js/calc.js` | 計算: quota, review, stack effects, `est`, `bills`, presets, `log` |
| `public/js/actions.js` | 動作: dispatch, settle, evaluate, invest, events, `endDay` |
| `public/js/view.js` | 畫面: DOM handles `app`/`ov`/`mo`, `render` and panels |
| `public/js/modals.js` | 彈窗: plan picker, setup, day and end modals, `draft` |
| `public/js/main.js` | 事件 and 開局: click delegation on `app`, `firstIssues`, `start`, and the single top-level `start()` call |

Alternative considered: grouping by feature (traps, presets, investments). Rejected because features cross every layer today and the banner split is mechanical, reviewable and keeps the code map in `docs/CLAUDE.md` recognisable.

### Every top-level binding is exported; modules import what they use by name

Exporting every top-level declaration keeps the tools able to reach internals the same way they do now. Each module imports only the names it references. Circular imports between modules are allowed because no module reads another module's binding while it is being evaluated: top-level code only declares, except `view.js` reading `document.getElementById` and `main.js` registering the click handler and calling `start()`.

Alternative considered: one namespace object (`G.S`, `G.render`). Rejected because it would rewrite almost every line.

### Shared mutable state stays as live bindings, reassigned only by its owner

`S`, `sel`, the id counter and `TRAP_RATE` stay `let` bindings in `state.js`; importers read them live. Code outside `state.js` cannot assign an imported binding, so:
- `nextId()` replaces `++uid` (used by `makeIssue` and by the `ticket()` helper in `tools/check.js`);
- `resetIds()` replaces `uid=0` in `start()`;
- `setTrapRate(r)` replaces the source rewrite in `tools/sim.js`.
`draft` moves with the modal code into `modals.js`, its only writer.

### Tools import the modules after installing the fake DOM

`tools/fake-dom.js` installs `globalThis.document` and `globalThis.localStorage` and exports the element stubs. `tools/check.js` and `tools/sim.js` import it first, then import the game modules by name, so the game's load-time `start()` runs against the fake DOM exactly as it does under `eval` today. `tools/sim.js` also imports `tools/seed.js` before the game modules: static imports run before the importing file's own code, so the seeded `Math.random` has to be installed by a module of its own to be in place when `main.js` calls `start()`. Both tools import `public/js/main.js` first among the game modules so module initialisation follows the same order as the browser. The tool files become ES modules (`import` instead of `require`, `import.meta.dirname` instead of `__dirname`) and keep their names and commands.

### Behavior equivalence is proven with a seeded simulator before and after

`SIM_SEED=<integer>` makes `tools/sim.js` replace `Math.random` with a seeded generator before the game loads. This lands first, on the classic script, together with `nextId`, `resetIds` and `setTrapRate`, and its output is saved as the baseline. Because the split does not change the order of `Math.random` calls, the seeded output after the split must be byte-identical.

## Implementation Contract

Capability-level observable behavior is unchanged: the same page, text, rules and numbers.

- The page loads with `public/index.html` referencing `js/main.js` via `<script type="module">`, and `public/js/game.js` no longer exists.
- No file under `public/js/` assigns a binding it imports; `nextId`, `resetIds` and `setTrapRate` are the only ways to change the id counter and trap rate from outside `state.js`.
- `node tools/check.js` prints the same `N passed, 0 failed` count as the baseline recorded before the split and exits 0.
- `SIM_SEED=1 SIM_N=10 node tools/sim.js`, with each of these extra settings: none, `SIM_TRAP=0`, `SIM_SLOTS=5`, `SIM_INVEST=1`, `SIM_COMBOS=1`, prints output byte-identical to the baseline saved in `docs/spectra/changes/split-game-modules/sim-seed-baseline.txt`.
- Without `SIM_SEED`, `tools/sim.js` keeps using `Math.random`. A non-integer `SIM_SEED` exits non-zero with an error, like the existing `SIM_TRAP` and `SIM_SLOTS` checks.
- Served by `python3 -m http.server -d public`, the page plays through setup, a dispatch, ending a day and the end-of-month modal with no console errors.
- In scope: `public/js/`, `public/index.html`, `tools/check.js`, `tools/sim.js`, new `tools/fake-dom.js` and `tools/seed.js`, `README.md`, local `docs/CLAUDE.md`. Out of scope: `public/css/style.css`, `.github/workflows/pages.yml`, specs.

## Risks / Trade-offs

- [A cross-module name is used but not imported, so a `ReferenceError` appears only when that code path runs] → After the split, scan every module for identifiers that are top-level declarations of another module and are neither imported nor locally declared, and fix every hit before running the other checks; the seeded simulator and `tools/check.js` then exercise most paths.
- [Seeded output differs because the split changed the order of `Math.random` calls] → Only move code between files, never reorder statements within a function; if output differs, diff it to the first diverging line and find the moved statement.
- [The work in progress in `merge-conflict-resolve` edits the same file] → Do not start until that change is committed; the baseline is recorded on the committed file.
- [`file://` no longer works for local play] → `README.md` and `docs/CLAUDE.md` already say to use the local server; the README update states it explicitly.
- [The GitHub Pages CDN may serve old `index.html` with new modules, or the reverse, for a few minutes after deploy] → Accepted: the site is a free side project, and the window is the same as for any deploy.

## Migration Plan

1. On the committed classic script: add `SIM_SEED`, `nextId`, `resetIds`, `setTrapRate`; switch the tools to them; record the check count and seeded baseline.
2. Split into modules, add `tools/fake-dom.js` and `tools/seed.js`, convert both tools to imports, switch `public/index.html`, delete `public/js/game.js`.
3. Run the import scan, `tools/check.js`, the five seeded simulator runs and the browser smoke test.
4. Update docs, push to `main`, confirm the live site loads.

Rollback: revert the split commit; the step-1 commit is harmless on its own.

## Open Questions

None.
