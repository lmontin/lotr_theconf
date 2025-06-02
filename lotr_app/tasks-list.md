# LOTR Board Game App: Movement/Region Test TODOs

## Final Section: Remaining Test Fixes

- [ ] Fix off-board logic in test/setup or `getLegalMoves` (test: should return no moves if character is not on board)
- [ ] Review region capacity logic and test data for overfilling (test: should not allow movement into a region at full capacity for the character's faction)
- [ ] Fix region occupancy assertion (test: should successfully move a character to an empty, valid region)
- [ ] Fix circular structure error in `setActiveBattle` logging (tests: should trigger a battle if moving into a region with enemies, should fail to move into a region at full capacity for the character's faction)

All other movement/capacity tests now pass and the new region/character index is the single source of truth.
