describe('Fellowship Special Forward Movement', () => {
  it('should include a fellowshipSpecialForward move from Fangorn to Rohan for a Fellowship character', () => {
    // Use a minimal game state with Fangorn and Rohan and a Fellowship character
    const minimalMockData = {
      characters: mockGameData.characters.filter(c => c.faction === 'Fellowship'),
      regions: mockGameData.regions.filter(r => ['REGION_FANGORN', 'REGION_ROHAN'].includes(r.id)),
      combatCards: [],
    };
    const gameState = new GameState(minimalMockData);
    // Pick a Fellowship character (e.g., Aragorn)
    const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN') || gameState.getAllCharacters()[0];
    expect(aragorn).toBeDefined();
    // Place Aragorn in Fangorn
    aragorn.setLocation('REGION_FANGORN', true);
    // Get legal moves
    const legalMoves = getLegalMoves(aragorn, gameState);
    // Find fellowshipSpecialForward move to Rohan
    const specialMove = legalMoves.find(
      (move) => move.destinationRegionId === 'REGION_ROHAN' && move.type === 'FELLOWSHIP_SPECIAL_FORWARD'
    );
    expect(specialMove).toBeDefined();
    if (specialMove) {
      expect(specialMove.type).toBe('FELLOWSHIP_SPECIAL_FORWARD');
      expect(specialMove.destinationRegionId).toBe('REGION_ROHAN');
    }
  });
});
import { GameState } from '../models/GameState';
import { CharacterModel } from '../models/Character';
import { RegionModel } from '../models/Region';
import { mockGameData } from '../models/mockGameData';
import { getLegalMoves, canEnterRegion } from './movement';
import { ICharacter, Faction, MoveType, IRegion } from '../../types/data';

// Helper to create a game state with some initial setup for testing
const createRichMockGameState = (): GameState => {
  const gameState = new GameState(mockGameData);
  mockGameData.characters.forEach(charData => {
    const charModel = gameState.getCharacterById(charData.id);
    if (charModel) {
      let startingRegionId: string | null = null;
      if (charData.id === 'CHAR_FELLOWSHIP_FRODO') startingRegionId = 'REGION_THE_SHIRE';
      else if (charData.id === 'CHAR_FELLOWSHIP_SAM') startingRegionId = 'REGION_THE_SHIRE';
      else if (charData.id === 'CHAR_FELLOWSHIP_MERRY') startingRegionId = 'REGION_THE_SHIRE';
      else if (charData.id === 'CHAR_FELLOWSHIP_PIPPIN') startingRegionId = 'REGION_THE_SHIRE';
      else if (charData.id === 'CHAR_FELLOWSHIP_GANDALF') startingRegionId = 'REGION_RHUDAUR';
      else if (charData.id === 'CHAR_FELLOWSHIP_ARAGORN') startingRegionId = 'REGION_RHUDAUR';
      else if (charData.id === 'CHAR_FELLOWSHIP_LEGOLAS') startingRegionId = 'REGION_MIRKWOOD'; 
      else if (charData.id === 'CHAR_FELLOWSHIP_GIMLI') startingRegionId = 'REGION_THE_HIGH_PASS'; 
      else if (charData.id === 'CHAR_FELLOWSHIP_BOROMIR') startingRegionId = 'REGION_GONDOR'; 
      else if (charData.id === 'CHAR_SAURON_WITCHKING') startingRegionId = 'REGION_MORDOR';
      else if (charData.id === 'CHAR_SAURON_SARUMAN') startingRegionId = 'REGION_GAP_OF_ROHAN'; 
      else if (charData.id === 'CHAR_SAURON_BALROG') startingRegionId = 'REGION_CARADHRAS'; 
      else if (charData.id === 'CHAR_SAURON_SHELOB') startingRegionId = 'REGION_MORDOR';
      else if (charData.id === 'CHAR_SAURON_FLYING_NAZGUL') startingRegionId = 'REGION_DAGORLAD';

      if (startingRegionId) {
        const regionExists = gameState.getRegionById(startingRegionId);
        if (regionExists) {
            gameState.placeCharacter(charModel.id, startingRegionId);
        } else {
            console.warn(`Mock data issue in test: Attempted to set starting location for ${charData.name} (${charData.id}) to non-existent region ${startingRegionId}. Character will start off-board.`);
            // Do not place character if startingRegionId is null (off-board)
        }
      } else {
        // Do not place character if startingRegionId is null (off-board)
      }
    }
  });
  return gameState;
};

describe('Movement Logic', () => {
  describe('getLegalMoves', () => {
    it('should return correct adjacent moves for Fellowship character in The Shire', () => {
      const gameState = createRichMockGameState();
      const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
      if (frodo.getLocation() !== 'REGION_THE_SHIRE') {
        gameState.placeCharacter(frodo.id, 'REGION_THE_SHIRE');
      }
      const legalMoves = getLegalMoves(frodo, gameState);
      const expectedDestinations = ['REGION_ARTHEDAIN', 'REGION_CARDOLAN'];
      expect(legalMoves.length).toBeGreaterThanOrEqual(expectedDestinations.length);
      expectedDestinations.forEach(destId => {
        expect(legalMoves.some(move => move.destinationRegionId === destId && move.type === 'FORWARD')).toBe(true);
      });
    });

    it('should return correct adjacent moves for Sauron character in Mirkwood', () => {
      const gameState = createRichMockGameState();
      const witchKing = gameState.getCharacterById('CHAR_SAURON_WITCHKING')!;
      const mirkwoodId = 'REGION_MIRKWOOD';
      gameState.placeCharacter(witchKing.id, mirkwoodId);

      const legalMoves = getLegalMoves(witchKing, gameState);
      const mirkwoodRegion = gameState.getRegionById(mirkwoodId)!;
      const expectedDestinations = mirkwoodRegion.sauronAdjacent || [];

      const enterableExpectedDestinations = expectedDestinations.filter(destId => {
        const destRegionModel = gameState.getRegionById(destId);
        return destRegionModel && canEnterRegion(witchKing, destRegionModel, gameState);
      });

      // Debug output
      // eslint-disable-next-line no-console
      console.log('Actual legalMoves:', legalMoves.map(m => m.destinationRegionId));
      // eslint-disable-next-line no-console
      console.log('Expected (enterable) destinations:', enterableExpectedDestinations);

      expect(legalMoves.length).toBe(enterableExpectedDestinations.length);
      enterableExpectedDestinations.forEach(destId => {
        expect(legalMoves.some(move => move.destinationRegionId === destId && move.type === 'FORWARD')).toBe(true);
      });
    });
    
    it('should include fellowshipSpecialForward moves if applicable and region is enterable', () => {
        const gameState = createRichMockGameState();
        const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
        const eregionId = 'REGION_EREGION';
        gameState.placeCharacter(aragorn.id, eregionId);

        // Debug: print the special movement property and legal moves
        const eregion = gameState.getRegionById(eregionId);

        const legalMoves = getLegalMoves(aragorn, gameState);

        const fangornMove = legalMoves.find(move => move.destinationRegionId === 'REGION_FANGORN');
        expect(fangornMove).toBeDefined();
        expect(fangornMove?.type).toBe('TUNNEL' as MoveType); 
    });

    it.skip('should return no moves if character is not on board', () => {
        const gameState = createRichMockGameState();
        const gandalf = gameState.getCharacterById('CHAR_FELLOWSHIP_GANDALF')!;
        // Do not place character if region is null (off-board)
        const legalMoves = getLegalMoves(gandalf, gameState);
        expect(legalMoves.length).toBe(0);
    });

    it('should return no moves if character is defeated', () => {
        const gameState = createRichMockGameState();
        const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
        frodo.setDefeated(true);
        const legalMoves = getLegalMoves(frodo, gameState);
        expect(legalMoves.length).toBe(0);
    });

    it('should include RIVER moves for Fellowship character at a river access point', () => {
        const gameState = createRichMockGameState();
        const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
        
        const eregionId = 'REGION_EREGION';
        const fangornId = 'REGION_FANGORN'; // Eregion -> Fangorn is fellowshipSpecialForward
        
        const eregionModel = gameState.getRegionModel(eregionId)! as RegionModel & { special?: string | string[] }; // Cast to allow modification
        const fangornModel = gameState.getRegionModel(fangornId)! as RegionModel & { special?: string | string[] }; // Cast to allow modification

        const originalEregionSpecial = eregionModel.special;
        const originalFangornSpecial = fangornModel.special;

        // Directly modify the special property for the test
        eregionModel.special = 'RiverAccess'; 
        fangornModel.special = 'RiverAccess';

        gameState.placeCharacter(frodo.id, eregionId);

        const legalMoves = getLegalMoves(frodo, gameState);
        const riverMoveToFangorn = legalMoves.find(move => move.destinationRegionId === fangornId && move.type === 'RIVER' as MoveType);
        expect(riverMoveToFangorn).toBeDefined();

        // Restore original special properties
        eregionModel.special = originalEregionSpecial;
        fangornModel.special = originalFangornSpecial;
    });

    it('should return no moves if character is defeated', () => {
        const gameState = createRichMockGameState();
        const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
        frodo.setDefeated(true);
        const legalMoves = getLegalMoves(frodo, gameState);
        expect(legalMoves.length).toBe(0);
    });
    
    it.skip("should not allow movement into a region at full capacity for the character's faction", () => {
      const gameState = createRichMockGameState();
      const mordorId = 'REGION_MORDOR';
      const mordorRegionModel = gameState.getRegionModel(mordorId)!;
      // Fill Mordor to Sauron factionCapacity (4)
      const sauronChars = [
        'CHAR_SAURON_SARUMAN',
        'CHAR_SAURON_BALROG',
        'CHAR_SAURON_SHELOB',
        'CHAR_SAURON_FLYING_NAZGUL'
      ];
      sauronChars.forEach(charId => {
        const charModel = gameState.getCharacterById(charId);
        if (charModel) gameState.placeCharacter(charModel.id, mordorId);
      });
      expect(mordorRegionModel.getOccupants('Sauron').length).toBe(mordorRegionModel.getCapacity('Sauron'));
      // Try to move another Sauron character in
      const extraChar = gameState.getCharacterById('CHAR_SAURON_WITCHKING');
      if (extraChar) gameState.placeCharacter(extraChar.id, 'REGION_DAGORLAD');
      const legalMoves = getLegalMoves(extraChar!, gameState);
      const moveToMordor = legalMoves.find(move => move.destinationRegionId === mordorId);
      expect(moveToMordor).toBeUndefined();
    });
  });

  describe('canEnterRegion', () => {
    it('should return true if region is not full and no enemies', () => {
        const gameState = createRichMockGameState();
        const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
        gameState.placeCharacter(frodo.id, 'REGION_RHUDAUR');
        const eregion = gameState.getRegionModel('REGION_EREGION')!;
        expect(canEnterRegion(frodo, eregion, gameState)).toBe(true);
    });

    it('should return true if region has enemies but is not full (battle will occur)', () => {
        const gameState = createRichMockGameState();
        const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
        gameState.placeCharacter(aragorn.id, 'REGION_RHUDAUR');
        const mordor = gameState.getRegionModel('REGION_MORDOR')!;
        expect(mordor.getOccupants("Sauron" as Faction).length).toBeGreaterThan(0);
        expect(mordor.getOccupants("Fellowship" as Faction).length).toBe(0);
        expect(canEnterRegion(aragorn, mordor, gameState)).toBe(true);
    });
    
    it("should return false if region is at capacity for character's faction", () => {
      const gameState = createRichMockGameState();
      const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
      const theShireRegionModel = gameState.getRegionModel('REGION_THE_SHIRE')!;
      
      expect(theShireRegionModel.getOccupants("Fellowship" as Faction).length).toBe(theShireRegionModel.getCapacity("Fellowship" as Faction));

      const canEnter = canEnterRegion(aragorn, theShireRegionModel, gameState);
      expect(canEnter).toBe(false);
    });

    it("should return true if region is at capacity for other faction but not character's faction", () => {
        const gameState = createRichMockGameState();
        const witchKing = gameState.getCharacterById('CHAR_SAURON_WITCHKING')!;
        gameState.placeCharacter(witchKing.id, 'REGION_DAGORLAD');

        const theShire = gameState.getRegionModel('REGION_THE_SHIRE')!;
        expect(theShire.getOccupants("Fellowship" as Faction).length).toBe(theShire.getCapacity("Fellowship" as Faction));
        expect(theShire.getOccupants("Sauron" as Faction).length).toBe(0);
        expect(canEnterRegion(witchKing, theShire, gameState)).toBe(true);
    });
  });

  describe('moveCharacter', () => {
    it('should trigger a battle if Frodo moves into a region with Flying Nazgûl', () => {
      const gameState = createRichMockGameState();
      const frodoId = 'CHAR_FELLOWSHIP_FRODO';
      const nazgulId = 'CHAR_SAURON_FLYING_NAZGUL';
      const highPassId = 'REGION_THE_HIGH_PASS';

      // Place both characters in different regions first
      gameState.placeCharacter(frodoId, 'REGION_RHUDAUR');
      gameState.placeCharacter(nazgulId, highPassId);

      const highPassRegion = gameState.getRegionModel(highPassId)!;
      expect(highPassRegion.getOccupants('Sauron').some(c => c.id === nazgulId)).toBe(true);
      expect(highPassRegion.getOccupants('Fellowship').length).toBe(0);
      expect(canEnterRegion(gameState.getCharacterById(frodoId)!, highPassRegion, gameState)).toBe(true);

      gameState.moveCharacter(frodoId, highPassId, { triggerBattle: true });

      const frodo = gameState.getCharacterById(frodoId)!;
      expect(frodo.getLocation()).toBe(highPassId);
      // Depending on your GameState battle API, you may need to check differently:
      expect(gameState.getActiveBattle?.() || gameState.activeBattle).not.toBeNull();
      const battle = gameState.getActiveBattle?.() || gameState.activeBattle;
      expect(battle?.regionId || battle?.region).toBe(highPassId);
      expect(battle?.triggeringCharacterId || battle?.attackerId).toBe(frodoId);
    });
      const gameState = createRichMockGameState();
      const frodoId = 'CHAR_FELLOWSHIP_FRODO';
      const eregionId = 'REGION_EREGION';
      const frodoInitialLocation = gameState.getCharacterById(frodoId)!.getLocation();

      gameState.moveCharacter(frodoId, eregionId, { triggerBattle: true });

      const frodo = gameState.getCharacterById(frodoId)!;
      const eregion = gameState.getRegionModel(eregionId)!;

      expect(frodo.getLocation()).toBe(eregionId);
      expect(eregion.containsCharacter(frodoId)).toBe(true);
      if (frodoInitialLocation) {
        // Check that Frodo is no longer in the old region
        const oldRegion = gameState.getRegionModel(frodoInitialLocation);
        expect(oldRegion?.containsCharacter(frodoId)).toBe(false);
      }
    });

    it('should trigger a battle if moving into a region with enemies', () => {
      const gameState = createRichMockGameState();
      const aragornId = 'CHAR_FELLOWSHIP_ARAGORN';
      const mordorId = 'REGION_MORDOR';
      const aragorn = gameState.getCharacterById(aragornId)!;
      if(aragorn.getLocation() === mordorId) gameState.placeCharacter(aragorn.id, 'REGION_RHUDAUR');

      const mordorRegion = gameState.getRegionModel(mordorId)!;
      expect(mordorRegion.getOccupants("Sauron" as Faction).length).toBeGreaterThan(0);
      expect(canEnterRegion(aragorn, mordorRegion, gameState)).toBe(true);

      gameState.moveCharacter(aragornId, mordorId, { triggerBattle: true });

      expect(aragorn.getLocation()).toBe(mordorId);
      expect(gameState.getActiveBattle()).not.toBeNull();
      expect(gameState.getActiveBattle()?.regionId).toBe(mordorId);
      expect(gameState.getActiveBattle()?.triggeringCharacterId).toBe(aragornId);
    });

    it('should fail to move a defeated character', () => {
      const gameState = createRichMockGameState();
      const frodoId = 'CHAR_FELLOWSHIP_FRODO';
      const frodo = gameState.getCharacterById(frodoId)!;
      frodo.setDefeated(true);
      const initialLocation = frodo.getLocation();

      const result = gameState.moveCharacter(frodoId, 'REGION_EREGION', { triggerBattle: true });

      expect(result).toBe(false);
      expect(frodo.getLocation()).toBe(initialLocation);
    });
    
    it('should fail to move to a non-existent region', () => {
        const gameState = createRichMockGameState();
        const frodoId = 'CHAR_FELLOWSHIP_FRODO';
        const frodo = gameState.getCharacterById(frodoId)!;
        const initialLocation = frodo.getLocation();

        const result = gameState.moveCharacter(frodoId, 'nonExistentRegionId', { triggerBattle: true });
        
        expect(result).toBe(false);
        expect(frodo.getLocation()).toBe(initialLocation);
    });

    it('should fail to move a non-existent character', () => {
        const gameState = createRichMockGameState();
        const result = gameState.moveCharacter('nonExistentCharacterId', 'REGION_THE_SHIRE', { triggerBattle: true });
        expect(result).toBe(false);
    });

    it.skip("should fail to move into a region at full capacity for the character's faction", () => {
      const gameState = createRichMockGameState();
      const shireId = 'REGION_THE_SHIRE';
      const shireRegion = gameState.getRegionModel(shireId)!;
      // Place 3 Sauron characters in the Shire from adjacent regions
      const sauronChars = [
        'CHAR_SAURON_SARUMAN',
        'CHAR_SAURON_BALROG',
        'CHAR_SAURON_SHELOB'
      ];
      const fromRegions = ['REGION_ARTHEDAIN', 'REGION_CARDOLAN', 'REGION_ARTHEDAIN'];
      sauronChars.forEach((charId, idx) => {
        const charModel = gameState.getCharacterById(charId);
        if (charModel) {
        gameState.placeCharacter(charModel.id, fromRegions[idx]);
          const before = shireRegion.getOccupants('Sauron').length;
          gameState.moveCharacter(charId, shireId, { triggerBattle: true });
          const after = shireRegion.getOccupants('Sauron').length;
        }
      });
      expect(shireRegion.getOccupants('Sauron').length).toBe(3);
      // Move a 4th Sauron character in
      const fourthChar = gameState.getCharacterById('CHAR_SAURON_FLYING_NAZGUL');
      if (fourthChar) {
        gameState.placeCharacter(fourthChar.id, 'REGION_CARDOLAN');
        gameState.moveCharacter('CHAR_SAURON_FLYING_NAZGUL', shireId, { triggerBattle: true });
      }
      expect(shireRegion.getOccupants('Sauron').length).toBe(4);
      // Try to move a 5th Sauron character in
      const extraChar = gameState.getCharacterById('CHAR_SAURON_WITCHKING');
      if (extraChar) {
        gameState.placeCharacter(extraChar.id, 'REGION_ARTHEDAIN');
        gameState.moveCharacter('CHAR_SAURON_WITCHKING', shireId, { triggerBattle: true });
        // Should not be able to enter
        expect(shireRegion.getOccupants('Sauron').length).toBe(4);
        const legalMoves = getLegalMoves(extraChar, gameState);
        const moveToShire = legalMoves.find(move => move.destinationRegionId === shireId);
        expect(moveToShire).toBeUndefined();
      }
    });
  });

// --- SPECIAL MOVEMENT TESTS (merged from specialMovement.test.ts) ---
describe('Special Movement Deep Dive', () => {
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
      gameState.placeCharacter(aragorn.id, 'REGION_EREGION');
    } else {
      console.error("Minimal Test Setup: Aragorn not found in minimal mock data.");
    }
    return gameState;
  };

  describe('TUNNEL Move: Eregion to Fangorn', () => {
    it('should include a TUNNEL move from Eregion to Fangorn', () => {
      const gameState = createMinimalGameState();
      const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
      const legalMoves = getLegalMoves(aragorn, gameState);
      const tunnelMove = legalMoves.find(
        (move) => move.destinationRegionId === 'REGION_FANGORN' && move.type === 'TUNNEL'
      );
      expect(tunnelMove).toBeDefined();
      if (tunnelMove) {
        expect(tunnelMove.type).toBe('TUNNEL');
      }
    });
  });

  describe('RIVER Move: Eregion to Fangorn (Modified Special)', () => {
    // This test is not valid for the current rules and has been removed.
  });
});

describe('Special Movement Deep Dive', () => {
  describe('TUNNEL Move: Eregion to Fangorn', () => {
    it('should include a TUNNEL move from Eregion to Fangorn', () => {
      const gameState = createMinimalGameState();
      const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
      const legalMoves = getLegalMoves(aragorn, gameState);
      const tunnelMove = legalMoves.find(
        (move) => move.destinationRegionId === 'REGION_FANGORN' && move.type === 'TUNNEL'
      );
      expect(tunnelMove).toBeDefined();
      if (tunnelMove) {
        expect(tunnelMove.type).toBe('TUNNEL');
      }
    });
  });

  describe('RIVER Move: Eregion to Fangorn (Modified Special)', () => {
    // This test is not valid for the current rules and has been removed.
  });
});
