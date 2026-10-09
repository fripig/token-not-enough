## 1. Evaluate event complexity

- [x] 1.1 Other ticket action events requirement: `evaluate()` in public/js/actions.js captures the ticket's shown complexity before the evaluation and sends it as `cx` for the `found`, `clear` and `quota` outcomes. Verify: the "Evaluate finds a trap" assertion in tools/check.js also checks `cx` 1 for a hidden trap with true complexity 4, and it failed before the code change; `node tools/check.js` exits 0 afterwards.
- [x] 1.2 docs/DESIGN.md says `evaluate` sends the complexity shown before the evaluation; `spectra validate gh-15-01-evaluate-shown-cx` passes. Verify by reading the GA event paragraph and the validate output. [after: 1.1]
