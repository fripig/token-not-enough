## 1. Spec assertions

- [x] 1.1 Add a labeled `play-analytics` block to `tools/check.js` that stubs `globalThis.gtag` and asserts every scenario of the new spec (Event delivery, Common event parameters, Game start, Day reached, Game end, Game version stamp) against the code shipped in aa66a04: opening confirm sends `game_start` then `day_reached` day 1; serial Rails and parallel Laravel + Rust common parameters (including `slots` 1 in serial and `game_version` `dev`); a full month sends `day_reached` for days 1–20 only and one `game_end`; the weekly 調整訂閱 modal sends nothing; `game_end` carries `score` 4280 and `grade` A for KPI 300, trust 70, no spending; a throwing `gtag` and a missing `gtag` do not break the run; `.github/workflows/pages.yml` stamps the short commit hash before upload and checks it. If an assertion contradicts the code, correct the spec, not public/. Verify: `node tools/check.js` exits 0 with the pass count rising from 654, and removing `track('day_reached')` from `endDay` makes it fail.

## 2. Documentation and final checks

- [x] 2.1 docs/DESIGN.md points to the `play-analytics` spec as the source for the GA event rules, keeping the existing event summary. Verify by reading the paragraph. [after: 1.1]
- [x] 2.2 The change touches no game code: `git diff --stat public/ .github/` is empty, `node tools/check.js` exits 0, and `spectra validate gh-10-01-play-analytics` passes. [after: 2.1]
