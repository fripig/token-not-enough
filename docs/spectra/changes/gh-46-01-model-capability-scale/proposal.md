## Summary

Model capability moves from small integers (2–6) to a ×10 integer scale (20–60), and the base success rate is linearly interpolated between the existing anchor points, so later models can sit between today's tiers (for example 45 or 55). Every current model keeps exactly the same behaviour: the fixed-seed simulator output must be byte-identical before and after.

## Motivation

Issue #46. Capability is an integer and the success rate is a five-step lookup on capability − complexity (≥1 → 95%, 0 → 80%, −1 → 50%, −2 → 25%, lower → 10%). The only way to make a new model stronger is +1, which is a whole tier, and Fable (capability 6) already sits at the 95% step for every complexity 1–5 ticket, so a capability-7 model or Fable at 高 effort changes nothing. The user decided (2026-10-11) to split the work into three changes:

1. this change — rescale capability to ×10 integers with interpolation, no balance change;
2. `gh-46-02-success-curve` — stretch the success curve (95% needs a gap of +20) and turn investment and large-codebase bonuses into failure reduction, measured with the simulator;
3. `gh-46-03-complexity-six-tickets` — complexity 6 tickets from day 11.

Doing the rescale alone first gives a byte-identical safety net: any simulator difference means the rescale broke something, separate from the later balance changes.

## Proposed Solution

User decisions (2026-10-11, picked from options in /spectra-discuss):

- Every model's `cap` is stored ×10 (Flash and Gemma 4 E4B 20; Haiku, Luna, DeepSeek Chat, GLM Air, Qwen3.6 35B-A3B, Gemma 4 26B A4B 30; Sonnet, Sol, Gemini Pro, Reasoner, GLM, K2, Qwen3-Coder-Next, Gemma 4 31B 40; Opus, Astra, GLM-5.3 50; Fable 60). Ticket complexity stays an integer 1–5 and is compared as complexity × 10 through a named constant `CAP_SCALE = 10`.
- Base success rate: anchors at gap +10 → 95%, 0 → 80%, −10 → 50%, −20 → 25%, −30 → 10%, linear in between, flat beyond both ends. A gap of +5 gives 87.5%.
- Threshold rules stay hard cut-offs on the new scale: Rust borrow checker and the large-codebase penalty apply below 40; the Laravel/Rails convention bonus is +10 and the borrow-checker penalty −10; an unrevealed trap is pushed through when capability ≥ true complexity × 10; the token discount applies when the base model's gap is ≥ 10; low effort's capability floor is 10.
- Self-review catch rate and evaluation reveal rate stay linear in capability, written as `per × cap / CAP_SCALE` so results are bit-identical.
- Reasoning effort stays ±10 (the same as today's ±1); a finer step is deferred.
- The dispatch panel's capability bar shows one filled dot per 10, a half dot (◐) for a remaining 5, empty dots up to five, then the number, for example 能力 ●●●●◐ 45; Fable still shows six filled dots (能力 ●●●●●● 60).
- Rules modal, dictionaries and `docs/DESIGN.md` show capability numbers and thresholds on the new scale.

## Non-Goals (optional)

Recorded in design.md.

## Alternatives Considered (optional)

- Scaling complexity ×10 too: rejected, it would touch ticket generation, KPI tables, saves and the complexity-6 change for no gain; only the comparison needs the factor.
- Changing effort to ±5 now: rejected by the user, it breaks the byte-identical check; deferred.
- Interpolating the threshold rules (Rust, large codebase, trap push-through): rejected to keep the rules explainable as one cut-off each.

## Impact

- Affected specs: agent-catalog, dispatch-outcome, self-review, stack-agent-effects, reasoning-effort, trap-tickets, engineering-investments, action-log
- Affected code:
  - Modified: public/js/data.js, public/js/calc.js, public/js/actions.js, public/js/view.js, public/js/rules.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/sim.js, tools/check/agent-catalog.test.js, tools/check/dispatch-outcome.test.js, tools/check/self-review.test.js, tools/check/stack-agent-effects.test.js, tools/check/reasoning-effort.test.js, tools/check/trap-tickets.test.js, tools/check/local-hardware.test.js, tools/check/rules-reference.test.js, docs/DESIGN.md
  - New: none
  - Removed: none
