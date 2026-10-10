## REMOVED Requirements

### Requirement: Investment panel collapse

**Reason**: The investment panel moved into a tab next to the dispatch panel (requirement "Dispatch and investment tabs" in `game-layout`, issue #40); a collapse toggle inside a tab is redundant and the user chose to remove it.

**Migration**: None for players: the stored `tokgame-invfold` value is ignored and the investments are reached through the 工程投資 tab. Checks for the collapse in `tools/check/engineering-investments.test.js` are removed.
