## Why

`public/js/game.js` is one classic script of 791 committed lines and 62.8KB (measured 2026-10-09; average 79 characters per line, 46 lines over 200 characters), and recent features already have to touch many distant blocks at once (the pending `merge-conflict-resolve` edit spans seven places across the file). After reviewing the framework-refactor signals in `docs/CLAUDE.md`, the user chose to split the file into native ES modules now, without adopting a framework or a build step.

## What Changes

- Split `public/js/game.js` into native ES modules under `public/js/`, following the existing section banners: data and helpers, state and ticket generation, calculations, actions, rendering, modals, and an entry module that wires events and starts the game.
- Load the entry module from `public/index.html` with `<script type="module">` instead of the classic `<script src="js/game.js">`.
- Keep game state in the state module as exported live bindings; replace the two places outside that module that reassign shared bindings (the `uid` reset in `start` and the test helper's `++uid`) with exported functions, and expose a setter for the trap rate so the simulator no longer rewrites source text.
- Convert `tools/check.js` and `tools/sim.js` from `eval` of the game source to ES module imports, with the fake DOM installed by a shared module imported first.
- Add a seeded random mode to `tools/sim.js` (`SIM_SEED`) before the split, so the split can be proven behavior-identical by comparing seeded output byte for byte.
- Update `README.md` and the local `docs/CLAUDE.md` code map to the new file layout.

## Non-Goals (optional)

- No front-end framework, rendering library, bundler, transpiler, or `package.json` dependency.
- No change to game rules, numbers, text, markup, CSS, or the `render()` full-string re-render and `data-*` event delegation approach.
- No renaming of functions or constants beyond what module boundaries require.
- Dropping the optional file-path argument of `tools/check.js` and `tools/sim.js` (including the single-file `.html` mode of `sim.js`); they always load the modules under `public/js/`.

## Impact

- Affected specs: none
- Affected code:
  - New: public/js/data.js, public/js/state.js, public/js/calc.js, public/js/actions.js, public/js/view.js, public/js/modals.js, public/js/main.js, tools/fake-dom.js, tools/seed.js
  - Modified: public/index.html, tools/check.js, tools/sim.js, README.md, docs/CLAUDE.md (local, git-ignored)
  - Removed: public/js/game.js
- Compatibility: no capability-level observable behavior changes. Opening `public/index.html` directly from disk (`file://`) stops working because browsers block module scripts there; the documented local server (`python3 -m http.server -d public 8000`) keeps working. The tools require Node with ES module syntax detection for `.js` files without a `package.json` (Node 22.12 or later; this machine runs v24.21.0).
- Ordering: `merge-conflict-resolve` must be committed before this change is applied. The parked `outsource-gigs` change was written against `public/js/game.js` and its task file references need updating after this change lands.
