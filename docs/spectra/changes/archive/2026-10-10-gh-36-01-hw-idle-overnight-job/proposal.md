## Problem

In parallel mode, a local agent dispatched one day can run overnight and keep the local GPU busy into the next day. Because the GPU runs one local agent at a time, the player cannot dispatch or evaluate anything locally that morning, so the machine is never marked as used and the player loses trust at clock-out for "idle" hardware that was in fact working. Issue #36 reports exactly this: `D14 ! 電腦閒置：有顯卡的 PC（RTX 5090）、NVIDIA DGX Spark 今天沒用到，主管覺得白買了（信任 -4）。` while an overnight local agent was still running.

## Root Cause

- The per-day usage record (`S.hwUsed`) is only set by `useHw`, which is called when a local dispatch, architecture evaluation or research is accepted.
- `endDay` resets `S.hwUsed` to all unused when the next day starts and never records the local jobs that carry over in `S.jobs`.
- Overnight carry-over subtracts 3h with a floor of 0.05h, so an overnight job is always still running at the next day start; the `local-hardware` spec even lists "only a local dispatch refused because an overnight local agent kept the GPU busy" as a trust −2 case.

## Proposed Solution

- When the next day starts, after the overnight time reduction in `endDay`, call `useHw(j.v, j.m)` for every local job still in `S.jobs`. The same mapping as dispatch applies: any local model marks the PC, Spark-unlocked models also mark the Spark, GLM-5.3 also marks the Mac.
- No minimum running time: a job that occupies the GPU at day start counts, even if it finishes minutes later.
- Player cancellation of that job later in the day does not undo the mark; this opens no new exploit because a same-day local dispatch followed by a cancel already counts as used.
- Expiry and outage cancellation need no special handling: the local vendor is never subject to outages, and expiry cancellation happens at clock-out of the day the job ran, before the idle check.
- No new log line; the morning report already says agents ran overnight.
- Update the `local-hardware` spec (idle requirement and its examples, including the day-start save statement), the rules modal idle line in both dictionaries, the hardware section of `docs/DESIGN.md`, and `tools/check.js` assertions.
- No save-structure change; `SAVE_VER` stays the same.

## Non-Goals

- Changing the idle penalty amount (`HW_IDLE`) or the one-local-agent-at-a-time rule.
- Counting a machine as used because of non-local jobs or hand-writing.
- Serial mode: jobs finish at dispatch and never run overnight, so behavior is unchanged.
- Re-balancing; the default simulator never dispatches local models.

## Success Criteria

- Parallel mode, PC and Spark installed, a Qwen3-Coder-Next job runs overnight from day N into day N+1, nothing else local on day N+1: ending day N+1 leaves trust unchanged and logs no idle line.
- Same setup with a Gemma 4 26B A4B overnight job: ending day N+1 drops trust by 2 and names only the Spark.
- With no local job carried over and no local use, the existing idle penalties are unchanged.
- `node tools/check.js` passes with the new assertions; `SIM_N=100 SIM_SEED=101 node tools/sim.js` output is identical before and after the change.

## Impact

- Affected specs: `local-hardware` (modified: Idle machine trust penalty)
- Affected code:
  - Modified: public/js/actions.js, public/js/i18n/zh-TW.js, public/js/i18n/en.js, tools/check.js, docs/DESIGN.md
  - New: none
  - Removed: none
