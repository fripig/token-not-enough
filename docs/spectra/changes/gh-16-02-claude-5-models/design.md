## Context

`VENDORS.anthropic.models` in public/js/data.js holds Haiku (cap 2, 0.12, w 0.3, speed 0.5, verb 0.9), Sonnet (cap 4, 0.45, w 1, 0.8, 1) and Opus (cap 5, 1.5, w 3, 1, 0.85). gh-16-01 (archived 2026-10-10) set OpenAI to Luna 3／Sol 4／Astra 5 and measured that a capability-3 cheap model needs speed 0.7 and price 0.15 to avoid becoming the dominant choice for clients that ban DeepSeek.

Many spec examples and tools/check.js assertions use Haiku as the representative capability-2 model and Opus's price 1.5 or weight 3 as a fixed number. The dispatch panel renders capability as `'●'.repeat(cap)+'○'.repeat(5-cap)` in `dispatchPanel()` (public/js/view.js), which throws a RangeError for cap 6.

## Goals / Non-Goals

**Goals:**

- Claude Code models match the Claude 5 family: Haiku mirrors Luna, Opus sits at 2× Sonnet, Fable is a new capability-6 flagship.
- The dispatch panel renders a capability-6 model.
- Every spec example and check assertion keeps illustrating the same rule after the numbers move.
- The Haiku change is measured and recorded.

**Non-Goals:**

- Retuning Sonnet, other vendors, subscription plans, seats, effort multipliers or the success-rate table.
- A save version bump: ids are unchanged and `fable` is additive; an old save or preset never references `fable`.
- Measuring Opus or Fable with the simulator.

## Decisions

### Haiku mirrors Luna

Haiku becomes capability 3, price 0.15, speed 0.7, keeping w 0.3 and verb 0.9. Haiku 5.5 and GPT-6 Luna have the same list price, and the user asked for the same treatment. Unlike Luna, Haiku can bill the company API, so the measurement uses Sonnet's billing rule (subscription when quota remains, else company API) to show that difference.

### Opus at twice Sonnet's price

Opus price 0.9 (2× Sonnet's 0.45) and w 2, keeping capability 5, speed 1 and verb 0.85. Real Opus 5.5 is 2× Sonnet 5.5.

### Fable is capability 6

Fable (id `fable`): capability 6, price 1.8 (4× Sonnet, compressed from the real 5×), w 4, speed 1.2 (long turns), verb 0.85. Capability 6 gives 95% on complexity-5 tickets where Opus has 80%; the user chose this over a capability-5 Fable distinguished only by tokens. The success-rate, catch-rate (capped 0.95) and trap rules already accept any capability, and 高 effort already produces capability 6 for Opus, so no formula changes.

### Capability dots

A model button shows `cap` filled dots followed by `max(0, 5 − cap)` empty dots, so capability 1–5 render exactly as today and Fable shows six filled dots. The model row already wraps (`.mods` is `flex-wrap`), so a fourth Anthropic button fits at 400px.

### Example substitution with Gemini Flash

Spec examples that need a capability-2 model use Gemini Flash (capability 2). Flash is ctx, which only matters on large-codebase tickets; every replaced example has no large codebase, so the rates are unchanged. The Haiku token scenario in dispatch-outcome ("Haiku on a hard ticket", 495k) stays as written: Haiku keeps verb 0.9 and capability 3 is still below complexity 4, so no discount applies.

## Implementation Contract

**Behavior:** The Claude Code row lists Haiku, Sonnet, Opus, Fable with 能力 ●●●○○, ●●●●○, ●●●●●, ●●●●●● and $0.15/k, $0.45/k, $0.9/k, $1.8/k. Fable can be dispatched on every billing method an Anthropic model accepts, including 公司 API, subscription (consuming tokens × 4) and an Anthropic team seat. Default presets stay A = DeepSeek Chat, B = Sonnet, C = Opus.

**Data shape:** `VENDORS.anthropic.models` = haiku {cap 3, price .15, w .3, speed .7, verb .9}, sonnet unchanged, opus {cap 5, price .9, w 2, speed 1, verb .85}, fable {id 'fable', name 'Fable', cap 6, price 1.8, w 4, speed 1.2, verb .85}. Catalog totals become 7 vendors and 17 models.

**Failure modes:** none new; a cap above 5 no longer throws in `dispatchPanel()`.

**Acceptance:** `node tools/check.js` exits 0 with assertions for each delta scenario; `spectra validate gh-16-02-claude-5-models` passes; `SIM_HAIKU=1` runs and its results are in docs/DESIGN.md.

**Scope:** in — public/js/data.js, the capability dots in public/js/view.js, tools/check.js, tools/sim.js, docs/DESIGN.md. Out — CSS, GA events, save format, other vendors.

## Risks / Trade-offs

- [Haiku on company API may be stronger than Luna on personal API] → measured with `SIM_HAIKU=1`; a parallel-mode gain above 5 percentage points in both runs is reported to the user before archive.
- [Cheaper Opus makes preset C and strict-review Opus stronger for human players] → not measured (no auto player uses Opus); recorded as unmeasured in docs/DESIGN.md.
- [Fable capability 6 removes most risk on complexity-5 tickets for players who can pay NT$1.8/k or w 4] → intended as the premium choice; unmeasured.
