## Why

The Anthropic (Claude Code) models still carry the numbers of the original prototype, while the real Claude 5 family has moved: Claude API list prices per 1M input tokens are Haiku 5.5 $0.10, Sonnet 5.5 $2, Opus 5.5 $4 and Fable 5.1 $10, and Fable 5.1 is a tier above Opus. gh-16-01 already aligned OpenAI with GPT-6 (Luna $0.10, Sol $2, Astra $10), so Claude is now inconsistent with its direct counterparts: Haiku 5.5 costs the same as Luna but stays capability 2, and Opus costs 3.3× Sonnet in the game against 2× in reality.

## What Changes

- Haiku: capability 2 → 3, price 0.12 → 0.15, speed 0.5 → 0.7; w 0.3 and verb 0.9 unchanged. This mirrors Luna (capability 3, 0.15, speed 0.7), the user's choice for cheap small models.
- Sonnet: unchanged (capability 4, 0.45, w 1, speed 0.8, verb 1).
- Opus: price 1.5 → 0.9, w 3 → 2; capability 5, speed 1, verb 0.85 unchanged.
- New model Fable (id `fable`): capability 6, price 1.8, w 4, speed 1.2, verb 0.85, after Opus in the Anthropic row, company API allowed like every Anthropic model. It is the only capability-6 model; with 高 reasoning effort it reaches 7.
- Capability range becomes 1–6. Model buttons show one filled dot per capability point and empty dots up to five in total, so Fable shows six filled dots.
- Spec examples that used Haiku as "the capability-2 model" switch to Gemini Flash (capability 2) so they keep illustrating the same rates; examples that used Opus's price or weight are recomputed.
- tools/sim.js gains `SIM_HAIKU=1` (auto player dispatches Haiku instead of Sonnet when DeepSeek is banned, billing as it does for Sonnet), and docs/DESIGN.md records the measured effect.

## Non-Goals

- No change to Sonnet, other vendors, plans, seats or effort multipliers.
- No change to model ids; `fable` is new. Saves (`SAVE_VER`), presets and GA keep working because they store ids; no save version bump.
- Opus and Fable are not measured: no auto player dispatches capability-5 or 6 models.
- No numeric balance target for Haiku: the result is recorded as measured. If `SIM_HAIKU=1` beats the default auto player by more than 5 percentage points in a parallel-mode cell in both runs, that is reported to the user before archive instead of retuning.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `agent-catalog`: Claude model numbers, new Fable model, capability range 1–6, capability dots beyond five.
- `self-review`: catch-rate example uses Gemini Flash for capability 2 and adds Fable.
- `dispatch-outcome`: success-rate example uses Gemini Flash for capability 2 and adds Opus and Fable on complexity 5.
- `stack-agent-effects`: convention-bonus scenarios use Gemini Flash.
- `reasoning-effort`: floor/ceiling scenario uses Gemini Flash and adds Fable at 高.
- `billing-methods`: subscription scenario uses Opus w 2.
- `play-analytics`: cost scenario uses Opus at NT$0.9 per 1k.

## Impact

- Affected code: public/js/data.js (Anthropic models), public/js/view.js (capability dots in the dispatch panel), tools/check.js (catalog table and every assertion that relied on Haiku being capability 2 or on Opus price 1.5／w 3), tools/sim.js (`SIM_HAIKU`), docs/DESIGN.md (vendor table, measurement, requirement log).
