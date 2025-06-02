Here is a step-by-step plan to update the test setup and helper logic to use the new API for all character placement and movement, ensuring the region/character index is always in sync:

1. Identify All Character Placement/Movement in Tests
Search for all instances in test files where a character’s location is set or changed.
Look for: setLocation, direct assignment to character.location, region.addOccupant, or similar.
Also check for any custom test helpers that manipulate character-region relationships.
2. Update Test Setup to Use GameState API
Replace all direct assignments or legacy methods with the new API:
Use GameState.placeCharacter(character, regionId) for initial placement.
Use GameState.moveCharacter(characterId, toRegionId) for moves.
Ensure that any helper functions or test utilities also use these methods.
3. Remove Legacy Placement/Movement Code
Delete or refactor any test code that:
Directly sets character.location.
Calls removed/obsolete methods (e.g., region.addOccupant, region.removeOccupant).
Manipulates occupantIds, occupants, or similar properties.
4. Update Test Assertions
Ensure all assertions about region occupants use the new region/character index via the correct API:
Use gameState.charactersIn(regionId) or region.characters(gameState).
5. Refactor Test Helpers
If there are test helpers for setup/teardown, update them to use the new API.
Remove any helpers that manipulate state in obsolete ways.
6. Re-run Tests and Debug
Run all movement/capacity-related tests.
If any tests fail, check for missed legacy code or incorrect usage of the new API.
7. Final Cleanup
Remove any remaining references to deleted properties or methods in test files.
Ensure all test code is consistent and only uses the new, single source of truth for character-region relationships.