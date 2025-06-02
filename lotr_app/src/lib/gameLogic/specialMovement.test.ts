import { GameState } from '../models/GameState';
import { CharacterModel } from '../models/Character';
import { RegionModel } from '../models/Region';
import { mockGameData } from '../models/mockGameData';
import { getLegalMoves, canEnterRegion } from './movement';
import { Faction, MoveType } from '../../types/data';

// Helper to create a minimal game state for these specific tests
const createMinimalGameState = (): GameState => {
  // Use a small, relevant subset of mockGameData or define inline
  const minimalMockData = {
    characters: mockGameData.characters.filter(c => ['CHAR_FELLOWSHIP_ARAGORN'].includes(c.id)),
    regions: mockGameData.regions.filter(r => ['REGION_EREGION', 'REGION_FANGORN'].includes(r.id)),
    combatCards: [],
  };
  const gameState = new GameState(minimalMockData);

  // Setup Aragorn in Eregion
  const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN');
  if (aragorn) {
    aragorn.setLocation('REGION_EREGION', true);
  } else {
    console.error("Minimal Test Setup: Aragorn not found in minimal mock data.");
  }
  return gameState;
};

describe('Special Movement Deep Dive', () => {
  describe('TUNNEL Move: Eregion to Fangorn', () => {
    it('should correctly identify TUNNEL move and log relevant data', () => {
      const gameState = createMinimalGameState();
      const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
      const eregion = gameState.getRegionById('REGION_EREGION')!;
      const fangorn = gameState.getRegionById('REGION_FANGORN')!;

      console.log('--- TUNNEL Test: Initial State ---');
      console.log('Aragorn Location:', aragorn.getLocation());
      console.log('Eregion Data:', JSON.stringify(eregion, (key, value) => key === 'game' ? undefined : value));
      console.log('Eregion fellowshipSpecialMovement:', JSON.stringify(eregion.fellowshipSpecialMovement));
      console.log('Fangorn Data:', JSON.stringify(fangorn, (key, value) => key === 'game' ? undefined : value));
      console.log('Can Aragorn enter Fangorn (initial)?', canEnterRegion(aragorn, fangorn, gameState));

      // Spy on gameState.log to capture diagnostic messages
      const logSpy = jest.spyOn(gameState, 'log');

      const legalMoves = getLegalMoves(aragorn, gameState);

      console.log('--- TUNNEL Test: After getLegalMoves ---');
      console.log('Captured GameState Logs:', logSpy.mock.calls.map(call => call[0]));
      console.log('Legal Moves Found:', JSON.stringify(legalMoves));

      const tunnelMove = legalMoves.find(
        (move) => move.destinationRegionId === 'REGION_FANGORN' && move.type === 'TUNNEL'
      );

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DIAGNOSTIC (Eregion to Fangorn Path): Determined move type as TUNNEL.'));
      expect(tunnelMove).toBeDefined();
      if (tunnelMove) {
        expect(tunnelMove.type).toBe('TUNNEL' as MoveType);
      }
      logSpy.mockRestore();
    });
  });

  describe('RIVER Move: Eregion to Fangorn (Modified Special)', () => {
    it('should correctly identify RIVER move when special properties are modified and log data', () => {
      const gameState = createMinimalGameState();
      const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
      
      // It's crucial to get the *models* from the gameState as these are the instances used by the logic
      const eregionModel = gameState.getRegionById('REGION_EREGION')! as RegionModel & { special?: string | string[] };
      const fangornModel = gameState.getRegionById('REGION_FANGORN')! as RegionModel & { special?: string | string[] };

      console.log('--- RIVER Test: Initial State (Before Modification) ---');
      console.log('Aragorn Location:', aragorn.getLocation());
      console.log('Eregion Original Special:', JSON.stringify(eregionModel.special));
      console.log('Fangorn Original Special:', JSON.stringify(fangornModel.special));
      console.log('Can Aragorn enter Fangorn (initial)?', canEnterRegion(aragorn, fangornModel, gameState));


      // Store original special properties to restore them later
      const originalEregionSpecial = eregionModel.special;
      const originalFangornSpecial = fangornModel.special;

      // Modify special properties directly on the model instances
      eregionModel.special = 'RiverAccess';
      fangornModel.special = 'RiverAccess';
      
      // Re-check isRiverAccess if it's a getter or relies on initial construction
      // For this test, we assume direct property modification is sufficient, but this is a key point.
      // If RegionModel.isRiverAccess is a getter that caches its value or reads from the initial data,
      // direct modification of 'special' might not be reflected unless the getter is re-evaluated.
      // The current RegionModel.isRiverAccess reads directly from `this.special` so it should be fine.

      console.log('--- RIVER Test: State After Modification ---');
      console.log('Eregion Modified Special:', JSON.stringify(eregionModel.special));
      console.log('Fangorn Modified Special:', JSON.stringify(fangornModel.special));
      console.log('Eregion isRiverAccess (after mod):', eregionModel.isRiverAccess); // Assuming isRiverAccess is a public getter or property
      console.log('Fangorn isRiverAccess (after mod):', fangornModel.isRiverAccess);


      const logSpy = jest.spyOn(gameState, 'log');
      const legalMoves = getLegalMoves(aragorn, gameState);

      console.log('--- RIVER Test: After getLegalMoves ---');
      console.log('Captured GameState Logs for RIVER:', logSpy.mock.calls.map(call => call[0]));
      console.log('Legal Moves Found (RIVER):', JSON.stringify(legalMoves));

      const riverMove = legalMoves.find(
        (move) => move.destinationRegionId === 'REGION_FANGORN' && move.type === 'RIVER'
      );

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DIAGNOSTIC (Eregion to Fangorn Path): Determined move type as RIVER.'));
      expect(riverMove).toBeDefined();
      if (riverMove) {
        expect(riverMove.type).toBe('RIVER' as MoveType);
      }

      // Restore original special properties
      eregionModel.special = originalEregionSpecial;
      fangornModel.special = originalFangornSpecial;
      logSpy.mockRestore();
    });
  });
});
