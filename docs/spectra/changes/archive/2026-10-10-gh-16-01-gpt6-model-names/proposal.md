## Summary

Rename the three OpenAI (Codex CLI) models from mini, 標準 and 高推理 to the GPT-6 family names Luna, Sol and Astra, without a version number, and retune Luna and Astra so their numbers match what those models are. Internal ids stay the same.

## Motivation

Every other vendor shows a model family name (Haiku／Sonnet／Opus, Flash／Pro, Chat／Reasoner). OpenAI shows generic tier labels, which read as placeholders. OpenAI's current Codex lineup is GPT-6 Luna (small and cheap), Sol (coding) and Astra (flagship).

The current numbers do not fit those models. 高推理 was modelled as a reasoning mode: same price as 標準, slow (speed 1.4) and verbose (verb 1.8). Astra is a flagship: about 5× Sol's price and about 10% fewer output tokens than Sol. 高推理 also overlaps with the advanced-mode reasoning effort knob, so 高推理・高強度 counted reasoning twice. Luna scores close to Sol on coding benchmarks (DeepSWE 66.6 vs 68.8), well above a capability-2 model.

External figures (third-party reports of OpenAI's list prices and launch evaluations, not checked against OpenAI directly): input price per 1M tokens Luna $0.10, Sol $2, Astra $10; DeepSWE Luna 66.6, Sol 68.8, Astra 74.1.

## Proposed Solution

In `VENDORS.openai.models` (public/js/data.js), keep the ids `mini`, `std`, `high` and set:

| id | name | cap | price | w | speed | verb |
| --- | --- | --- | --- | --- | --- | --- |
| mini | Luna | 2 → 3 | 0.1 → 0.15 | 0.3 | 0.5 → 0.7 | 1 |
| std | Sol | 4 | 0.4 | 1 | 0.8 | 1.05 |
| high | Astra | 5 | 0.4 → 1.6 | 1 → 3 | 1.4 → 1 | 1.8 → 0.95 |

- The real price ratios (1 : 20 : 100) are compressed on purpose. Luna stays more expensive than DeepSeek Chat (capability 3, NT$0.03/k) and as slow as it (speed 0.7) so it does not strictly dominate it; its edge is that no client bans it.
- Luna's first tuning (price 0.08, speed 0.5) was measured with `SIM_LUNA=1` on 2026-10-10: parallel Laravel +7.0%／+6.1% and App +8.4%／+10.3%, serial +32%～+62% against the default auto player, while the same strategy with the old mini numbers was −5%～−14% in parallel. The user chose to keep capability 3 and make Luna slower and pricier (speed 0.7, price 0.15), then measure again. Astra lands next to Opus (capability 5, NT$1.5/k, w 3).
- Astra no longer carries reasoning-mode traits, so the advanced-mode effort knob is the only source of "high reasoning".
- Names carry no "GPT-6" prefix, matching the other vendors.
- Update the agent-catalog spec, tools/check.js, docs/DESIGN.md and the tools/sim.js comment that says Codex 標準.
- Add a simulator option `SIM_LUNA=1` so the auto player uses Luna on personal API instead of Sonnet when DeepSeek is banned, and record the measured effect in docs/DESIGN.md. The default auto player never picks Luna or Astra (it picks DeepSeek Chat, Sonnet, or with seats Codex Sol), so a default run cannot show the effect of this change.

## Non-Goals

- No change to Sol or to any other vendor's numbers or names.
- No change to model ids, so saves (`SAVE_VER`), dispatch presets and GA `model` values (which send ids) are unaffected.
- No numeric balance target: the simulator result is recorded as measured. If Luna turns out to shift parallel-mode averages by more than the ±5 percentage point run-to-run noise, that is reported to the user before any further retuning.
- Astra is not measured by the simulator; no auto player picks capability-5 models.

## Alternatives Considered

- GPT-6 Luna／GPT-6 Sol／GPT-6 Astra as names: rejected by the user; longer on 400px buttons and needs another rename next generation.
- Rename only, keep numbers: rejected by the user; the numbers did not match the models.
- Only retune Astra, leave Luna at capability 2: offered, not chosen.
- Use the uncompressed price ratios (Luna NT$0.02/k, Astra NT$2.0/k): offered, not chosen; Luna would be cheaper than DeepSeek Chat with no client ban.

## Impact

- Affected specs: agent-catalog
- Affected code:
  - Modified: public/js/data.js, tools/check.js, tools/sim.js, docs/DESIGN.md
  - New: none
  - Removed: none
