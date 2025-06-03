Detailed Analysis of Failing Tests
Based on the test results and rulebook analysis, here are the detailed explanations for each failing test:

1. Test: "should trigger a battle if Frodo moves into a region with Flying Nazgûl"
Current State:

Test sets up Frodo in Rhudaur and Flying Nazgûl in The High Pass
Expects The High Pass to have 0 Fellowship occupants initially
ACTUAL RESULT: The High Pass has 1 Fellowship occupant (test fails)
Issue: The test setup is placing a Fellowship character (probably Frodo) in The High Pass during createRichMockGameState(), but the test assumes it should be empty.

Rulebook Reference:

"If a character moves into a region occupied by one or more enemy characters, a Battle occurs"

What Should Happen: After placing Frodo in Rhudaur and Nazgûl in The High Pass, the region should have only Sauron characters. When Frodo moves there, a battle should trigger.

2. Test: "should trigger a battle if moving into a region with enemies"
Current State:

Test moves Aragorn to Mordor (which should have Sauron characters)
Expects Aragorn's location to be Mordor after movement
ACTUAL RESULT: Aragorn's location is null (test fails)
Issue: The character's location is being set to null, likely because the battle system is defeating Aragorn and removing him from the board.

Rulebook Reference:

"The character with the lower total strength is defeated" "When a character is defeated, remove it from the game board and set it aside"

What Should Happen: The test should either:

Set up a scenario where Aragorn wins the battle, OR
Check that a battle occurred (even if Aragorn lost and was removed)
3. Test: "should fail to move a defeated character"
Current State:

Test sets Frodo as defeated with frodo.setDefeated(true)
Attempts to move Frodo to Eregion
Expects moveCharacter to return false
ACTUAL RESULT: moveCharacter returns true (test fails)
Issue: The GameState.moveCharacter method doesn't check if a character is defeated before allowing movement.

Rulebook Reference:

"When a character is defeated, remove it from the game board and set it aside"

What Should Happen: Defeated characters should not be able to move. The method should check character.defeated and return false if true.

4. Test: "should include a TUNNEL move from Eregion to Fangorn"
Current State:

Test tries to call createMinimalGameState() function
ACTUAL RESULT: ReferenceError: createMinimalGameState is not defined
Issue: The helper function createMinimalGameState doesn't exist in the test file.

Rulebook Reference:

"The Fellowship can move characters from Eregion to Fangorn in one move (yellow arrow), but not from Fangorn to Eregion"

What Should Happen: Test needs the helper function or should use createRichMockGameState() instead.

Now let me fix these issues: