## Context

The local vendor (自架開源, OpenCode＋本地 GPU) today offers Qwen Coder 32B (cap 3, Chinese weights), Gemma 27B (cap 3) and gpt-oss 20B (cap 2), all free and slow. In parallel mode `localBusy()` allows only one local agent at a time, and while it runs the player cannot hand-write (`manual` is refused and its button reads 本地 GPU 跑 agent 中，電腦卡到沒辦法手寫). Engineering investments (`INVEST`) cost hours plus company API budget; team seats (`S.seatReq`) are a trust-gated purchase request reviewed at day start in `endDay`.

The game's money is real-scale NT$ (Claude Pro NT$650, Max 20× NT$6,500, company API budget NT$12,000 per month), so a real RTX 5090 PC (about NT$120,000), DGX Spark (about NT$130,000) or 512GB Mac Studio (about NT$300,000) cannot come out of the API budget. The user chose to treat machines as company capital purchase requests gated by trust, like team seats.

## Goals / Non-Goals

**Goals:**

- Three stackable machines the player can request from the investment panel, each approved by trust on arrival.
- PC speeds up local models; Spark unlocks two capability-4 local models (one not Chinese weights) and Mac unlocks a capability-5 local model; owning any machine frees hand-writing while a local agent runs.
- Real prices shown as text only; no API budget spent.

**Non-Goals:**

- No second concurrent local agent: `localBusy()` still limits local dispatch and local evaluation to one at a time (user choice).
- No change to the month-end score formula, receipt or investment count; machines are not counted in 工程投資 N 項.
- Supersedes: the first draft excluded a capability-5 local model; after the user asked for stronger local models, GLM-5.3 (capability 5) replaces Qwen3 Coder 480B on the Mac (see Unlocked models decision). Balance risk is handled under Risks.
- No buying machines from the personal wallet or with lease payments (rejected options).
- Reasoning effort, review levels, trap and stack rules apply to the new models unchanged.

## Decisions

### Machine catalog as a HW table in data.js

`HW` in `public/js/data.js` keyed `pc`, `spark`, `mac`, in that display order, each with `name`, `price` (display text), `trust`, `days`, `desc`:

| key | name | price text | trust | days | effect |
| --- | --- | --- | --- | --- | --- |
| pc | 有顯卡的 PC（RTX 5090） | 約 NT$12 萬 | 55 | 2 | local model hours ×0.7 (`PC_SPEED`) |
| spark | NVIDIA DGX Spark | 約 NT$13 萬 | 60 | 3 | unlocks Qwen3-Coder-Next and Gemma 4 31B |
| mac | Mac Studio（512GB） | 約 NT$30 萬 | 70 | 3 | unlocks GLM-5.3 |

`HW_REQ_HRS = 1` (writing the purchase order) and `HW_SETUP_HRS = 1` (setup on arrival). Trust thresholds and days come from the user-approved preview; they are initial values that simulator tuning may change.

### Unlocked models live in the local vendor with an hw field

Add to `VENDORS.local.models`, after the existing three, in this order: `{id:'qcnext',name:'Qwen3-Coder-Next',cap:4,price:0,w:0,speed:1.4,verb:1.2,cn:true,hw:'spark'}`, `{id:'gemma4',name:'Gemma 4 31B',cap:4,price:0,w:0,speed:2,verb:1.2,hw:'spark'}` and `{id:'glm53',name:'GLM-5.3',cap:5,price:0,w:0,speed:2.8,verb:1,cn:true,hw:'mac'}`. Model choice follows a web search on 2026-10-10 of open-weight coding models that fit each machine: Qwen3-Coder-Next (80B MoE, about 46GB) and Gemma 4 31B fit a 128GB Spark; GLM-5.3 (744B, about 372–475GB at 4-bit) fits only the 512GB Mac Studio. Most strong open-weight models are Chinese; Gemma 4 31B (dense, released 2026-04, Apache 2.0) is the Spark's non-Chinese option so government tenders still have a free capability-4 route. Supersedes the earlier gpt-oss 120B choice: the user pointed out gpt-oss has no recent training data (「寫程式還是要用 gemma吧 用gpt-oss沒有新資料」). Speed 2.0 reflects a dense model on the Spark's limited memory bandwidth. Qwen3 Coder 480B from the first draft is superseded by GLM-5.3. Keeping them in the catalog (rather than injecting them on purchase) means presets, saves and GA `model` ids stay stable and `validPreset` accepts them. A helper `hwBlock(M)` in `public/js/calc.js` returns `需要 <HW name>` when `M.hw` is set and `S.hw[M.hw]` is false, otherwise `''`. The model speeds and verbs are estimates chosen to sit between the existing local models and Sonnet; the `SIM_HW` run confirms or refutes their balance.

Alternative considered: separate vendor rows per machine — rejected, it would duplicate billing and busy logic.

### Base local models renamed to the current generation

The user asked to update the base local models as well (「基本款也順便改」) and chose to rename them and speed up the MoE ones. Keep the ids so saves, presets and GA `model` values stay valid (same approach as the OpenAI rename): `qwen` → Qwen3.6 35B-A3B (MoE, speed 2.1 → 1.7, still Chinese weights), `gemma` → Gemma 4 26B A4B (MoE, speed 2.4 → 1.9), `oss` → Gemma 4 E4B (small dense, speed 1.8 kept). Capabilities and token multipliers stay. Names come from the 2026-10-10 web search (Gemma 4 released 2026-04 in E2B／E4B／26B A4B／31B; Qwen3.6 35B-A3B cited as the speed pick). The ~20% speed-up is an estimate of MoE inference advantage; `node tools/sim.js` (default player, which already uses local models only as a fallback) and `SIM_HW=1` confirm whether it moves balance. Existing `tools/check.js` assertions that match the rendered name Gemma 27B are updated to the new names; the footer in `public/index.html` lists Qwen and Gemma only, and `public/sitemap.xml` `lastmod` is bumped.

### Hardware state and purchase request flow

`S.hw = {pc:false, spark:false, mac:false}` and `S.hwReq = null | {k, day}` initialised in `fresh()`. `requestHw(k)` in `public/js/actions.js` is refused (returns false, no change) when `S.hw[k]` is true, `S.hwReq` is set, remaining hours are below `HW_REQ_HRS`, or `S.day + HW[k].days > 20`; otherwise it records `S.hwReq={k,day:S.day}`, spends the hour (parallel mode `advance`, serial mode subtract), sends `invest` with `investment` k and `stack` `none`, and logs the request. `hwReqBlock(k)` returns the refusal reason shown on the button, checked in this order: 已到貨, 採購審核中, 工時不夠, 來不及到貨; `requestHw` refuses whenever it is non-empty.

In `endDay`, after the seat review and before random events, when `S.hwReq` exists and `S.day >= hwReq.day + HW[k].days`: clear the request; if `S.trust >= HW[k].trust` set `S.hw[k]=true`, subtract `HW_SETUP_HRS` from the new day's hours, report 採購到貨：<name> 架好了（架設花了 1 小時）。 and log ★; else report 採購被退件：主管信任不夠（需要 X 以上）。 and log ✗. The queue area shows 採購 <name> 審核中，預計第 N 天到貨 while pending, like the seat line.

Alternative considered: approving at request time — rejected so that trust after the request still matters, matching seats.

### Local speed-up and hand-writing unblock

`est` multiplies `hrs` by `PC_SPEED` when the vendor is `local` and `S.hw.pc`; `evalCost` does the same for a local model, so evaluation time follows. `manual` and its button check `localBusy()&&!hasHw()` where `hasHw()` is true when any `S.hw` value is true; the button label when unblocked is the normal 自己手寫 label.

### Locked models in dispatch panel and presets

In the dispatch panel `avail(v,M)` also requires `!hwBlock(M)`; a locked model button is disabled and its subtitle shows the `hwBlock` reason; the dispatch button is disabled for a locked model. `presetBlock` returns the `hwBlock` reason right after the client-ban check. `dispatch` and `evaluate` refuse a locked model.

### Save compatibility without bumping SAVE_VER

`loadGame` fills `S.hw ??= {pc:false,spark:false,mac:false}` and `S.hwReq ??= null` for saves made before this change; `SAVE_VER` stays 1 because the missing fields have defaults.

### Idle machine trust penalty

`S.hwUsed = {pc:false, spark:false, mac:false}` records which machines' effects were used today. An accepted agent dispatch (a job is created) or a charged architecture evaluation with a local model sets `pc`; with Qwen3-Coder-Next or Gemma 4 31B also sets `spark`; with GLM-5.3 also sets `mac`. Refused actions set nothing. In `endDay`, next to the company daily-spend check and before the day-20 jump to month-end scoring, every machine with `S.hw[k]` true and `S.hwUsed[k]` false drops trust by `HW_IDLE = 2` (not below 0); one summary line 電腦閒置：<names> 今天沒用到，主管覺得白買了（信任 -N）。 and one log line `!` are written when any machine is idle. `S.hwUsed` resets to all false when the new day starts, so the day-start save always holds all false; `loadGame` fills the default for older saves. The arrival day counts: a machine installed that morning and unused by evening is penalised. Values come from the user's choices (per machine, −2, from arrival day); −2 matches the scale of other daily trust losses (late −4, overspend −6).

Alternative considered: one shared "any local use" flag — rejected by the user in favour of per-machine use. Alternative considered: minimum local hours per day — rejected as harder to read.

### Simulator switch SIM_HW

`tools/sim.js` gains `SIM_HW=1`: at each day start the auto-player requests the next machine not yet owned in the order spark, pc, mac when no request is pending (real trust rules apply); when its default choice is blocked for a ticket and the local GPU is free (or in serial mode), it dispatches an unlocked client-allowed local model instead of its fallback: GLM-5.3 for displayed complexity ≥4, otherwise Qwen3-Coder-Next, and Gemma 4 31B when the client bans Chinese weights. Output compares against the same code's default player. Supersedes the first version that requested regardless of trust: that auto-player kept getting rejected after its trust collapsed and wasted an hour per request (parallel −3.6%～−5.5%), so it now requests only when trust already meets the machine's threshold; arrival still applies the real trust check.

## Implementation Contract

**In scope:** `HW`, `PC_SPEED`, `HW_REQ_HRS`, `HW_SETUP_HRS`, the two new local models, `S.hw`/`S.hwReq`/`S.hwUsed`, `requestHw`, the idle machine trust penalty in `endDay`, the arrival review in `endDay`, the 採購電腦 row in the investment panel (`data-hw="<k>"` buttons, each showing name, price text, trust threshold and days, or the refusal reason), the queue-area pending line, `hwBlock` in dispatch panel / presets / dispatch / evaluate, PC speed-up in `est` and `evalCost`, hand-writing unblock, `loadGame` defaults, `invest` GA event for requests, `SIM_HW`, `tools/check.js` assertions, `docs/DESIGN.md`.

**Also in scope:** renaming the base local models with the new speeds, updating the existing `tools/check.js` name assertions, `public/index.html` footer and `public/sitemap.xml` `lastmod`.

**Out of scope:** concurrent local agents, score/receipt changes, personal-wallet purchases, new GA event types.

**Acceptance:**

- `node tools/check.js` exits 0 with new assertions for: request refusals (owned, pending, hours, past day 20), approval at threshold and rejection one below, arrival-day hours 7, PC ×0.7 local hours, locked model reason in `presetBlock`, Spark model allowed for a government ticket, Mac model banned for a government ticket, manual allowed with a running local job after any machine, `invest` event with `investment` `spark`, old save without `hw` loads, idle penalty (PC and Spark installed, only a Gemma dispatch today → trust −2 for Spark only; nothing used → −4; trust 1 → 0; arrival day counts; refused dispatch does not count).
- `SIM_HW=1 SIM_N=100 node tools/sim.js` run twice; parallel-mode averages recorded in `docs/DESIGN.md`; target parallel +3%～+15% vs the default player. If outside, tune trust/days/model speed and record the process.
- Manual browser check at 400px width: panel row renders in light and dark themes.

## Risks / Trade-offs

- [GLM-5.3 is a free capability-5 model and may dominate] → speed 2.8 (slowest model in the game), one local agent at a time, banned for government tenders and the idle penalty limit it; if `SIM_HW` exceeds +15% in parallel mode, slow it down or lower it to capability 4 after reporting to the user.

- [The idle penalty may make machines a net loss for players who cannot keep the local GPU busy, especially the Mac with its Chinese-weights restriction] → `SIM_HW` measures the auto-player including the penalty; record the numbers and report to the user before tuning `HW_IDLE`.

- [Auto-player trust collapses before day 11, so later requests are rejected and the measured effect is a lower bound] → record this next to the numbers, as for team seats.
- [Free capability-4 model for government tenders may dominate since local costs nothing] → Gemma 4 31B speed 2.0 plus one-at-a-time local keeps throughput low; tune speed if `SIM_HW` exceeds +15%.
- [Mac at trust 70 is reachable on day 1 since trust starts at 70] → only one request at a time; Mac requested first blocks others for 3 days. Accepted.

## Migration Plan

Static deploy via push to `main`; older saves load with defaults. Rollback is reverting the commit.

## Open Questions

None; prices, thresholds, stacking and the one-local-agent limit are user-chosen.
