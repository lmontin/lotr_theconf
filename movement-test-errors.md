# Movement Test Failures (as of June 2, 2025)

- [ ] Movement Logic › getLegalMoves › should include fellowshipSpecialForward moves if applicable and region is enterable
- [ ] Movement Logic › getLegalMoves › should include RIVER moves for Fellowship character at a river access point
- [ ] Movement Logic › getLegalMoves › should not allow movement into a region at full capacity for the character's faction
- [ ] Movement Logic › canEnterRegion › should return true if region has enemies but is not full (battle will occur)
- [ ] Movement Logic › canEnterRegion › should return false if region is at capacity for character's faction
- [ ] Movement Logic › canEnterRegion › should return true if region is at capacity for other faction but not character's faction
- [ ] Movement Logic › moveCharacter › should trigger a battle if moving into a region with enemies
- [ ] Movement Logic › moveCharacter › should fail to move into a region at full capacity for the character's faction
- [ ] Special Movement Deep Dive › TUNNEL Move: Eregion to Fangorn › should correctly identify TUNNEL move and log relevant data
- [ ] Special Movement Deep Dive › RIVER Move: Eregion to Fangorn (Modified Special) › should correctly identify RIVER move when special properties are modified and log data
