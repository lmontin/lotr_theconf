import { GameState } from '../models/GameState';
import { CharacterModel } from '../models/Character';
import { RegionModel } from '../models/Region';
import { mockGameData } from '../models/mockGameData';
import { getLegalMoves, canEnterRegion, moveCharacter } from './movement';
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
            charModel.setLocation(startingRegionId, true);
        } else {
            console.warn(`Mock data issue in test: Attempted to set starting location for ${charData.name} (${charData.id}) to non-existent region ${startingRegionId}. Character will start off-board.`);
            charModel.setLocation(null, true); 
        }
      } else {
        charModel.setLocation(null, true);
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
        frodo.setLocation('REGION_THE_SHIRE', true);
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
      witchKing.setLocation(mirkwoodId, true);

      const legalMoves = getLegalMoves(witchKing, gameState);
      const mirkwoodRegion = gameState.getRegionById(mirkwoodId)!;
      const expectedDestinations = mirkwoodRegion.sauronAdjacent || []; 

      const enterableExpectedDestinations = expectedDestinations.filter(destId => {
        const destRegionModel = gameState.getRegionById(destId);
        return destRegionModel && canEnterRegion(witchKing, destRegionModel, gameState);
      });

      expect(legalMoves.length).toBe(enterableExpectedDestinations.length);
      enterableExpectedDestinations.forEach(destId => {
        expect(legalMoves.some(move => move.destinationRegionId === destId && move.type === 'FORWARD')).toBe(true);
      });
    });
    
    it('should include fellowshipSpecialForward moves if applicable and region is enterable', () => {
        const gameState = createRichMockGameState();
        const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
        const eregionId = 'REGION_EREGION';
        aragorn.setLocation(eregionId, true);

        // Debug: print the special movement property and legal moves
        const eregion = gameState.getRegionById(eregionId);
        // eslint-disable-next-line no-console
        console.log('DEBUG fellowshipSpecialMovement:', eregion?.fellowshipSpecialMovement);

        const legalMoves = getLegalMoves(aragorn, gameState);
        // eslint-disable-next-line no-console
        console.log('DEBUG legalMoves:', legalMoves);

        const fangornMove = legalMoves.find(move => move.destinationRegionId === 'REGION_FANGORN');
        expect(fangornMove).toBeDefined();
        expect(fangornMove?.type).toBe('TUNNEL' as MoveType); 
    });

    it('should return no moves if character is not on board', () => {
        const gameState = createRichMockGameState();
        const gandalf = gameState.getCharacterById('CHAR_FELLOWSHIP_GANDALF')!;
        gandalf.setLocation(null); 
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

        frodo.setLocation(eregionId, true);

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
    
    it("should not allow movement into a region at full capacity for the character's faction", () => {
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
        if (charModel) charModel.setLocation(mordorId, true);
      });
      expect(mordorRegionModel.getOccupants('Sauron').length).toBe(mordorRegionModel.getCapacity('Sauron'));
      // Try to move another Sauron character in
      const extraChar = gameState.getCharacterById('CHAR_SAURON_WITCHKING');
      if (extraChar) extraChar.setLocation('REGION_DAGORLAD', true);
      const legalMoves = getLegalMoves(extraChar!, gameState);
      const moveToMordor = legalMoves.find(move => move.destinationRegionId === mordorId);
      expect(moveToMordor).toBeUndefined();
    });
  });

  describe('canEnterRegion', () => {
    it('should return true if region is not full and no enemies', () => {
        const gameState = createRichMockGameState();
        const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
        frodo.setLocation('REGION_RHUDAUR', true);
        const eregion = gameState.getRegionModel('REGION_EREGION')!;
        expect(canEnterRegion(frodo, eregion, gameState)).toBe(true);
    });

    it('should return true if region has enemies but is not full (battle will occur)', () => {
        const gameState = createRichMockGameState();
        const aragorn = gameState.getCharacterById('CHAR_FELLOWSHIP_ARAGORN')!;
        aragorn.setLocation('REGION_RHUDAUR', true);
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
        witchKing.setLocation('REGION_DAGORLAD', true);

        const theShire = gameState.getRegionModel('REGION_THE_SHIRE')!;
        expect(theShire.getOccupants("Fellowship" as Faction).length).toBe(theShire.getCapacity("Fellowship" as Faction));
        expect(theShire.getOccupants("Sauron" as Faction).length).toBe(0);
        expect(canEnterRegion(witchKing, theShire, gameState)).toBe(true);
    });
  });

  describe('moveCharacter', () => {
    it('should successfully move a character to an empty, valid region', () => {
      const gameState = createRichMockGameState();
      const frodoId = 'CHAR_FELLOWSHIP_FRODO';
      const eregionId = 'REGION_EREGION';
      const frodoInitialLocation = gameState.getCharacterById(frodoId)!.getLocation();

      moveCharacter(frodoId, eregionId, gameState, 'FORWARD' as MoveType);

      const frodo = gameState.getCharacterById(frodoId)!;
      const eregion = gameState.getRegionModel(eregionId)!;

      expect(frodo.getLocation()).toBe(eregionId);
      expect(eregion.containsCharacter(frodoId)).toBe(true);
      if (frodoInitialLocation) {
        expect(gameState.getRegionModel(frodoInitialLocation)?.containsCharacter(frodoId)).toBe(false);
      }
      const lastLog = gameState.getLastMove();
      expect(lastLog?.characterId).toBe(frodoId);
      expect(lastLog?.toRegionId).toBe(eregionId);
    });

    it('should trigger a battle if moving into a region with enemies', () => {
      const gameState = createRichMockGameState();
      const aragornId = 'CHAR_FELLOWSHIP_ARAGORN';
      const mordorId = 'REGION_MORDOR';
      const aragorn = gameState.getCharacterById(aragornId)!;
      if(aragorn.getLocation() === mordorId) aragorn.setLocation('REGION_RHUDAUR', true);

      const mordorRegion = gameState.getRegionModel(mordorId)!;
      expect(mordorRegion.getOccupants("Sauron" as Faction).length).toBeGreaterThan(0);
      expect(canEnterRegion(aragorn, mordorRegion, gameState)).toBe(true);

      moveCharacter(aragornId, mordorId, gameState, 'FORWARD' as MoveType);

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
      const initialLogLength = gameState.gameLog.length;

      moveCharacter(frodoId, 'REGION_EREGION', gameState, 'FORWARD' as MoveType);

      expect(frodo.getLocation()).toBe(initialLocation);
      expect(gameState.gameLog.length).toBe(initialLogLength + 1); 
      expect(gameState.gameLog.at(-1)).toContain('MOVE FAIL: Frodo is defeated');
      expect(gameState.gameLog.some(log => log.includes('Frodo has been defeated'))).toBe(true);
    });
    
    it('should fail to move to a non-existent region', () => {
        const gameState = createRichMockGameState();
        const frodoId = 'CHAR_FELLOWSHIP_FRODO';
        const frodo = gameState.getCharacterById(frodoId)!;
        const initialLocation = frodo.getLocation();
        const initialLogLength = gameState.gameLog.length;

        moveCharacter(frodoId, 'nonExistentRegionId', gameState, 'FORWARD' as MoveType);
        
        expect(frodo.getLocation()).toBe(initialLocation);
        expect(gameState.gameLog.length).toBe(initialLogLength + 1);
        expect(gameState.gameLog.at(-1)).toContain(`MOVE FAIL: ${frodo.name} to nonExistentRegionId - Destination region not found.`);
    });

    it('should fail to move a non-existent character', () => {
        const gameState = createRichMockGameState();
        const initialLogLength = gameState.gameLog.length;
        moveCharacter('nonExistentCharacterId', 'REGION_THE_SHIRE', gameState, 'FORWARD' as MoveType);
        expect(gameState.gameLog.length).toBe(initialLogLength + 1);
        expect(gameState.gameLog.at(-1)).toContain('MOVE FAIL: Character nonExistentCharacterId not found.');
    });

    it("should fail to move into a region at full capacity for the character's faction", () => {
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
          charModel.setLocation(fromRegions[idx], true);
          const before = shireRegion.getOccupants('Sauron').length;
          moveCharacter(charId, shireId, gameState, 'FORWARD');
          const after = shireRegion.getOccupants('Sauron').length;
          console.log(`DEBUG: Moved ${charId} from ${fromRegions[idx]} to Shire. Before: ${before}, After: ${after}`);
          console.log('DEBUG: Last move log:', gameState.gameLog.at(-1));
        }
      });
      console.log('DEBUG: Sauron occupants in Shire after 3 moves:', shireRegion.getOccupants('Sauron').map(c => c.id));
      expect(shireRegion.getOccupants('Sauron').length).toBe(3);
      // Move a 4th Sauron character in
      const fourthChar = gameState.getCharacterById('CHAR_SAURON_FLYING_NAZGUL');
      if (fourthChar) {
        fourthChar.setLocation('REGION_CARDOLAN', true);
        moveCharacter('CHAR_SAURON_FLYING_NAZGUL', shireId, gameState, 'FORWARD');
      }
      expect(shireRegion.getOccupants('Sauron').length).toBe(4);
      // Try to move a 5th Sauron character in
      const extraChar = gameState.getCharacterById('CHAR_SAURON_WITCHKING');
      if (extraChar) {
        extraChar.setLocation('REGION_ARTHEDAIN', true);
        moveCharacter('CHAR_SAURON_WITCHKING', shireId, gameState, 'FORWARD');
        // Should not be able to enter
        expect(shireRegion.getOccupants('Sauron').length).toBe(4);
        const legalMoves = getLegalMoves(extraChar, gameState);
        const moveToShire = legalMoves.find(move => move.destinationRegionId === shireId);
        expect(moveToShire).toBeUndefined();
      }
    });
  });
});

// --- SPECIAL MOVEMENT TESTS (merged from specialMovement.test.ts) ---

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

      // Spy on gameState.log to capture diagnostic messages
      const logSpy = jest.spyOn(gameState, 'log');

      const legalMoves = getLegalMoves(aragorn, gameState);

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
      const eregionModel = gameState.getRegionById('REGION_EREGION')! as RegionModel & { special?: string | string[] };
      const fangornModel = gameState.getRegionById('REGION_FANGORN')! as RegionModel & { special?: string | string[] };

      // Store original special properties to restore them later
      const originalEregionSpecial = eregionModel.special;
      const originalFangornSpecial = fangornModel.special;

      // Modify special properties directly on the model instances
      eregionModel.special = 'RiverAccess';
      fangornModel.special = 'RiverAccess';

      const logSpy = jest.spyOn(gameState, 'log');
      const legalMoves = getLegalMoves(aragorn, gameState);

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
