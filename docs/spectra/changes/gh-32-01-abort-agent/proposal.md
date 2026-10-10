## Why

Issue #32: 「派出去的agent可以中止 避免派錯模型就沒救了」. In parallel mode a background agent can only be stopped by the game (ticket due at day end, vendor outage). A player who dispatched the wrong model or billing method has to watch it burn tokens and slot time until it finishes or fails.

## What Changes

- Parallel mode: every row in the 背景 agent list gets a two-step cancel button. The first click arms it (中止 → 確定中止？); a second click on the same row cancels that agent; any other click disarms it. No `confirm()`.
- Cancelling charges tokens, money or quota for the fraction already run (at least 5%), the same formula as the existing day-end and outage cancellation.
- The ticket goes back to the queue unchanged: no failure counted (`tries` stays), no retry discount on its base tokens, and a hidden trap stays hidden. Cancellation takes no player time.
- The security audit roll still applies (the agent already read the code), as does the company overdraft check.
- A local-GPU agent that is cancelled frees the GPU at once.
- The action log gets a `⏹ 中止` line naming the agent, model and billing method, tokens burned, spend and hours.
- GA `job_result` gets a new `outcome` value `cancelled` for player cancellation; game-forced cancellation keeps `aborted`.
- While a hidden trap runs, the dispatch log's 預計 hours, the job row's completion time and its progress bar follow the shown-complexity estimate, and the row reads 超過預估，還在跑 once that estimate has passed. Found by `/spectra-review`: the true hours leaked the trap, and with cancelling that became a trap check cheaper than an architecture evaluation; the player chose to hide the true time. The real run time is unchanged.
- The rules pop-up mentions that background agents can be cancelled by the player and what that costs.

## Non-Goals

- Serial mode: dispatch runs and settles at once, so there is nothing running to cancel.
- No refund of the tokens already used and no time cost for cancelling.
- No change to game-forced cancellation (day end, outage); it still counts as a failure with the retry discount and reveals hidden traps.
- No save-format change: daytime actions are not saved, so `SAVE_VER` stays.
- The simulator's auto-player does not learn to cancel.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `game-modes`: new requirement for the player cancelling a background agent in parallel mode (cost, ticket state, trap, audit, local GPU, log line, two-step button).
- `trap-tickets`: new requirement that a running unrevealed trap shows the shown-complexity estimate (log hours, completion time, progress bar).
- `play-analytics`: the Dispatch result event gains the `cancelled` outcome for player cancellation.

## Impact

- Affected specs: `game-modes`, `play-analytics`, `trap-tickets`.
- Affected code: public/js/actions.js (cancel action, `settle` option to skip failure bookkeeping and trap reveal, `cancelled` outcome), public/js/view.js (cancel button on job rows, armed state), public/js/main.js (event delegation), public/js/rules.js (rules text), tools/check.js (assertions), docs/DESIGN.md.
- Refactor check (2026-10-10, modules this change touches): actions.js 461 lines / 32.8KB / 12 lines over 200 characters; view.js 178 / 19.2KB / 26; main.js 53 / 2.5KB / 0; rules.js 118 / 15.0KB / 23. Conclusion: no refactor needed; the change reuses `settle` and the existing job list.
