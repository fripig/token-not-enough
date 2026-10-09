## Why

The player asked: 「投資可以買電腦 有顯卡的pc mac 或者 nvidai spark 買了以後地端不會卡手寫 另外也能跑更高等級的模型」, then 「金額可能要相對調整 現在的金額太不現實了」 and 「買了沒用每天降信任」, and asked for stronger local models (「是否有更強力的本地model可以選擇」) and preferred Gemma over gpt-oss for coding (「寫程式還是要用 gemma吧 用gpt-oss沒有新資料」), and asked to update the base local models too (「基本款也順便改」). Today the local GPU is the slow, free fallback: it caps at capability 3, and while it runs an agent in parallel mode the player cannot hand-write. Buying real hardware gives the local route a growth path — free capability-4 models (one that even government tenders accept) and a slow free capability-5 model — without pretending a NT$120,000+ machine fits in the NT$12,000 monthly API budget.

## What Changes

- New 採購電腦 section in the engineering investment panel with three machines, each bought at most once per run and all stackable: 有顯卡的 PC（RTX 5090）, NVIDIA DGX Spark, Mac Studio（512GB）.
- Machines are company purchase requests, not API spend: the button shows the real-world price only as text (約 NT$12 萬／13 萬／30 萬) and SHALL NOT deduct the company API budget. Submitting costs 1 hour of the player's time. Only one machine request can be pending at a time.
- The machine arrives after 2 days (PC) or 3 days (Spark, Mac). On the arrival day morning the request is approved when trust is at least 55 (PC), 60 (Spark) or 70 (Mac); approval installs the machine and that day starts with 1 hour less (setup). A rejection costs nothing and the machine can be requested again. A request whose arrival day would be after day 20 is refused.
- Effects once installed:
  - PC: every local model's execution time ×0.7 (agent dispatch and architecture evaluation, including the models unlocked by the other machines).
  - DGX Spark: unlocks two local models — Qwen3-Coder-Next (capability 4, speed 1.4, verb 1.2, Chinese weights) and Gemma 4 31B (capability 4, speed 2.0, verb 1.2, not Chinese weights, so government tenders can use it).
  - Mac Studio: unlocks local model GLM-5.3 (capability 5, speed 2.8, verb 1.0, Chinese weights).
  - Any machine: hand-writing is no longer blocked while a local agent runs. The local GPU still runs only one agent at a time.
- Idle machines cost trust: at the end of each day, from the arrival day on, every installed machine whose effect was not used that day drops trust by 2 (PC: any local dispatch or local evaluation; Spark: Qwen3-Coder-Next or Gemma 4 31B; Mac: GLM-5.3). The day summary and log name the idle machines.
- The three base local models (no machine needed) move to the current open-weight generation, keeping their ids `qwen`, `gemma`, `oss`: Qwen Coder 32B → Qwen3.6 35B-A3B (speed 2.1 → 1.7), Gemma 27B → Gemma 4 26B A4B (speed 2.4 → 1.9), gpt-oss 20B → Gemma 4 E4B (speed 1.8 unchanged). The two MoE models are about 20% faster; capability, token multiplier and Chinese-weights flags are unchanged. The page footer's model list drops gpt-oss.
- Locked local models show as disabled buttons with 需要 <machine>; presets that use a locked model are skipped by one-click and batch dispatch with that reason.
- The `invest` analytics event is also sent when a machine request is submitted, with `investment` `pc`／`spark`／`mac`.
- `tools/sim.js` gains `SIM_HW=1` to measure the effect; `tools/check.js` and `docs/DESIGN.md` are updated.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `local-hardware`: requesting, approving and installing the three machines, and their effects on local models and hand-writing.

### Modified Capabilities

- `agent-catalog`: three machine-unlocked local models, the renamed and faster base local models, and model buttons disabled when their machine is not installed.
- `client-restrictions`: ban rules name the renamed and new local models.
- `game-modes`: the single local GPU no longer blocks hand-writing once a machine is installed.
- `ticket-lifecycle`: hand-writing is no longer blocked by a busy local GPU once a machine is installed.
- `dispatch-presets`: a new preset unusable reason for a locked local model.
- `play-analytics`: the `invest` event also covers machine requests.

## Impact

- Affected specs: new `local-hardware`; modified `agent-catalog`, `client-restrictions`, `game-modes`, `ticket-lifecycle`, `dispatch-presets`, `play-analytics`.
- Affected code: public/js/data.js, public/js/state.js, public/js/calc.js, public/js/actions.js, public/js/view.js, public/index.html, public/sitemap.xml, tools/sim.js, tools/check.js, docs/DESIGN.md.
- Save data: `S.hw` and `S.hwReq` are new fields; loading an older save fills their defaults, so `SAVE_VER` stays 1.
