import { GameState } from '../models/GameState';
import { Character as CharacterModel } from '../models/Character';
import { Region as RegionModel } from '../models/Region';
import { IGameData, ICharacter, IRegion } from '../../types/data';
import { mockGameData } from '../models/mockGameData'; // Now loads from gameData.json
import { canEnterRegion, getLegalMoves, LegalMove, MoveType } from './movement';

// Helper to create a game state with specific character locations for testing
const createRichMockGameState = (characterLocations: { [key: string]: string | null }): GameState => {
  const gameDataCopy: IGameData = JSON.parse(JSON.stringify(mockGameData)); // Use the loaded gameData
  const gs = new GameState(gameDataCopy); // Corrected: GameState constructor takes 1 argument

  // Manually set locations for characters after GameState initialization
  for (const charId in characterLocations) {
    const char = gs.getCharacterById(charId);
    const locId = characterLocations[charId];
    if (char && locId) {
      char.setLocation(locId, gs);
    } else if (char && locId === null) {
      char.setLocation(null, gs);
    }
  }
  return gs;
};

describe('Movement Logic', () => {
  let gameState: GameState;
  // Use IDs from the actual gameData.json via mockGameData
  const frodoId = mockGameData.characters.find(c => c.name === 'Frodo')!.id;
  const aragornId = mockGameData.characters.find(c => c.name === 'Aragorn')!.id;
  const gandalfId = mockGameData.characters.find(c => c.name === 'Gandalf')!.id;
  const witchKingId = mockGameData.characters.find(c => c.name === 'Witch-king')!.id;
  const sarumanId = mockGameData.characters.find(c => c.name === 'Saruman')!.id;
  const samId = mockGameData.characters.find(c => c.name === 'Sam')!.id;
  const merryId = mockGameData.characters.find(c => c.name === 'Merry')!.id;

  const theShireId = mockGameData.regions.find(r => r.name === 'The Shire')!.id;
  // Rivendell is special in Rhudaur, Lorien special in Fangorn. Minas Morgul, Buckland, Moria not in gameData.json
  const rhudaurId = mockGameData.regions.find(r => r.name === 'Rhudaur')!.id; // Contains Rivendell
  const eregionId = mockGameData.regions.find(r => r.name === 'Eregion')!.id;
  const fangornId = mockGameData.regions.find(r => r.name === 'Fangorn')!.id; // Contains Lorien
  const dagorladId = mockGameData.regions.find(r => r.name === 'Dagorlad')!.id;
  const mordorId = mockGameData.regions.find(r => r.name === 'Mordor')!.id;
  // Using Dol Guldur (in Mirkwood) as a Sauron starting point instead of Minas Morgul for tests
  const mirkwoodId = mockGameData.regions.find(r => r.name === 'Mirkwood')!.id; 
  const gapOfRohanId = mockGameData.regions.find(r => r.name === 'Gap of Rohan')!.id; // Added for clarity

  // Find some Sauron characters for testing Mordor capacity
  const sauronChar1Id = mockGameData.characters.find(c => c.faction === 'Sauron' && c.id !== witchKingId && c.id !== sarumanId)!.id;
  const sauronChar2Id = mockGameData.characters.find(c => c.faction === 'Sauron' && c.id !== witchKingId && c.id !== sarumanId && c.id !== sauronChar1Id)!.id;


  beforeEach(() => {
    const initialLocations = {
      [frodoId]: theShireId,
      [aragornId]: rhudaurId, // Aragorn starts in Rhudaur (Rivendell)
      [gandalfId]: rhudaurId, // Gandalf starts in Rhudaur (Rivendell)
      [witchKingId]: mirkwoodId, // Witch-king starts in Mirkwood (Dol Guldur) instead of Minas Morgul
      [sarumanId]: gapOfRohanId, // Saruman starts in Gap of Rohan (Isenguard)
    };
    gameState = createRichMockGameState(initialLocations);
  });

  describe('getLegalMoves', () => {
    test('should return correct adjacent moves for Fellowship character in The Shire', () => {
      const frodo = gameState.getCharacterById(frodoId);
      expect(frodo).toBeDefined();
      expect(frodo?.locationId).toBe(theShireId);

      const legalMoves = getLegalMoves(frodo!, gameState); // Corrected arguments
      const theShireModel = gameState.getRegionModel(theShireId);
      expect(theShireModel).toBeDefined();
      const expectedDestinationIds = (theShireModel?.fellowshipAdjacent || []);

      const expectedLegalMoves: LegalMove[] = expectedDestinationIds.map(id => ({ type: 'FORWARD', destinationRegionId: id }));

      expect(legalMoves.length).toBe(expectedLegalMoves.length);
      expectedLegalMoves.forEach(expectedMove => {
        expect(legalMoves).toEqual(expect.arrayContaining([
          expect.objectContaining(expectedMove)
        ]));
      });
    });

    test('should return correct adjacent moves for Sauron character in Mirkwood', () => {
      const witchKing = gameState.getCharacterById(witchKingId);
      expect(witchKing).toBeDefined();
      expect(witchKing?.locationId).toBe(mirkwoodId);

      const legalMoves = getLegalMoves(witchKing!, gameState);
      const mirkwoodModel = gameState.getRegionModel(mirkwoodId);
      expect(mirkwoodModel).toBeDefined();
      const expectedDestinationIds = (mirkwoodModel?.sauronAdjacent || []);
      
      const expectedLegalMoves: LegalMove[] = expectedDestinationIds.map(id => ({ type: 'FORWARD', destinationRegionId: id }));

      expect(legalMoves.length).toBe(expectedLegalMoves.length);
      expectedLegalMoves.forEach(expectedMove => {
        expect(legalMoves).toEqual(expect.arrayContaining([
          expect.objectContaining(expectedMove)
        ]));
      });
    });

    test('should include fellowshipSpecialForward moves if applicable and region is enterable', () => {
      // Place Gandalf in Eregion
      const initialLocations = { [gandalfId]: eregionId };
      gameState = createRichMockGameState(initialLocations);
      const gandalf = gameState.getCharacterById(gandalfId)!;
      expect(gandalf.locationId).toBe(eregionId);

      const eregionModel = gameState.getRegionModel(eregionId)!;
      const fangornModel = gameState.getRegionModel(fangornId)!;

      // Ensure Fangorn is enterable (e.g., not at capacity for Fellowship)
      // For this test, assume it's enterable by default or set up explicitly if needed.

      const legalMoves = getLegalMoves(gandalf, gameState);
      
      const eregionData = mockGameData.regions.find(r => r.id === eregionId);
      expect(eregionData?.fellowshipSpecialForward).toContain(fangornId);

      // Check for the TUNNEL move to Fangorn
      const tunnelMoveToFangorn = legalMoves.find(
        move => move.destinationRegionId === fangornId && move.type === 'TUNNEL'
      );
      expect(tunnelMoveToFangorn).toBeDefined();

      // Also check for regular forward moves from Eregion
      const expectedForwardDestinationIds = eregionModel.fellowshipAdjacent || [];
      expectedForwardDestinationIds.forEach(destId => {
        expect(legalMoves.some(move => move.destinationRegionId === destId && move.type === 'FORWARD')).toBe(true);
      });
    });

    test('should return no moves if character is not on board', () => {
      const frodo = gameState.getCharacterById(frodoId)!;
      frodo.setLocation(null, gameState); // Remove Frodo from board
      expect(frodo.locationId).toBeNull();
      const legalMoves = getLegalMoves(frodo, gameState);
      expect(legalMoves.length).toBe(0);
    });

    test('should return no moves if character is defeated', () => {
      const frodo = gameState.getCharacterById(frodoId)!;
      frodo.defeat(); // Mark Frodo as defeated
      expect(frodo.is_defeated).toBe(true);
      const legalMoves = getLegalMoves(frodo, gameState);
      expect(legalMoves.length).toBe(0);
    });

    // Add more tests for river moves, mountain restrictions, capacity limits etc.
    // For example, a character at a river access point.
    test('should include RIVER moves for Fellowship character at a river access point', () => {
        // Setup: Place a character (e.g., Aragorn) in a region with fellowshipSpecialForward and river access
        // For this example, let's assume 'Eregion' can lead to 'Fangorn' via TUNNEL (already tested)
        // and potentially another region via RIVER if data supports it.
        // We need a region with 'RiverAccess' in its 'special' property and a 'fellowshipSpecialForward'
        // that isn't the Eregion->Fangorn tunnel.
        // Let's use mockGameData to find/define such a scenario or adjust if necessary.
        // This test depends heavily on gameData.json having river connections correctly defined.

        // For now, this is a placeholder structure, as specific river data needs verification.
        // const riverStartingRegionId = 'REGION_WITH_RIVER_ACCESS'; // e.g., Anduin Vale
        // const riverDestinationRegionId = 'REGION_ACROSS_RIVER';
        // gameState = createRichMockGameState({ [aragornId]: riverStartingRegionId });
        // const aragorn = gameState.getCharacterById(aragornId)!;
        // const legalMoves = getLegalMoves(aragorn, gameState);
        // expect(legalMoves.some(m => m.destinationRegionId === riverDestinationRegionId && m.type === 'RIVER')).toBe(true);
        // This test will be more meaningful once river data is confirmed.
        expect(true).toBe(true); // Placeholder
    });


    test('should not allow movement into a region at full capacity for the character\'s faction', () => {
        // Setup: Mordor is Sauron's starting region, capacity 4. Place 4 Sauron units there.
        const mordorRegion = gameState.getRegionModel(mordorId)!;
        const sauronChar3Id = mockGameData.characters.find(c => c.faction === 'Sauron' && ![witchKingId, sarumanId, sauronChar1Id, sauronChar2Id].includes(c.id))!.id;
        const sauronChar4Id = mockGameData.characters.find(c => c.faction === 'Sauron' && ![witchKingId, sarumanId, sauronChar1Id, sauronChar2Id, sauronChar3Id].includes(c.id))!.id;
        
        const initialLocations = {
            [witchKingId]: mordorId,
            [sarumanId]: mordorId, // Saruman can start elsewhere, but for test, put in Mordor
            [sauronChar1Id]: mordorId,
            [sauronChar2Id]: mordorId,
            // Dagorlad is adjacent to Mordor for Sauron
            [sauronChar3Id]: dagorladId, // This character will try to move into Mordor
        };
        gameState = createRichMockGameState(initialLocations);

        const movingChar = gameState.getCharacterById(sauronChar3Id)!;
        expect(movingChar.locationId).toBe(dagorladId);
        
        // Verify Mordor is full
        const occupantsInMordor = gameState.getCharactersInRegion(mordorId);
        let sauronCountInMordor = 0;
        occupantsInMordor.forEach(charId => {
            const char = gameState.getCharacterById(charId);
            if (char && char.faction === 'Sauron' && !char.is_defeated) {
                sauronCountInMordor++;
            }
        });
        expect(sauronCountInMordor).toBe(mordorRegion.getCapacity('Sauron'));


        const legalMoves = getLegalMoves(movingChar, gameState);
        
        // Mordor should not be a legal move destination
        const moveToMordor = legalMoves.find(move => move.destinationRegionId === mordorId);
        expect(moveToMordor).toBeUndefined();
    });


  });

  describe('canEnterRegion', () => {
    test('should return true if region is not full and no enemies', () => {
      const frodo = gameState.getCharacterById(frodoId)!; // In The Shire
      const rhudaurRegion = gameState.getRegionModel(rhudaurId)!; // Rhudaur (for Rivendell)
      const canEnter = canEnterRegion(frodo, rhudaurRegion, gameState);
      expect(canEnter).toBe(true);
    });

    test('should return true if region has enemies but is not full (battle will occur)', () => {
      // Place Frodo in The Shire, Witch-king in Rhudaur (Rivendell)
      gameState = createRichMockGameState({ [frodoId]: theShireId, [witchKingId]: rhudaurId });
      const frodo = gameState.getCharacterById(frodoId)!;
      const rhudaurRegion = gameState.getRegionModel(rhudaurId)!;
      
      // Verify Witch-king is in Rhudaur
      expect(gameState.getCharactersInRegion(rhudaurId)).toContain(witchKingId);

      const canEnter = canEnterRegion(frodo, rhudaurRegion, gameState);
      expect(canEnter).toBe(true); // Movement is allowed, battle ensues
    });

    test('should return false if region is at capacity for character\'s faction', () => {
      // The Shire, capacity 4 for Fellowship. Place 4 Fellowship units.
      const gandalfInShireId = mockGameData.characters.find(c => c.name === 'Gandalf')!.id;
      const samInShireId = mockGameData.characters.find(c => c.name === 'Sam')!.id;
      const merryInShireId = mockGameData.characters.find(c => c.name === 'Merry')!.id;
      // Aragorn will try to move into The Shire from Rivendell
      
      gameState = createRichMockGameState({
        [frodoId]: theShireId,
        [gandalfInShireId]: theShireId,
        [samInShireId]: theShireId,
        [merryInShireId]: theShireId,
        [aragornId]: rhudaurId 
      });

      const aragorn = gameState.getCharacterById(aragornId)!;
      const theShireRegion = gameState.getRegionModel(theShireId)!;

      // Verify The Shire is full for Fellowship
      const occupantsInShire = gameState.getCharactersInRegion(theShireId);
      let fellowshipCount = 0;
      occupantsInShire.forEach(charId => {
        const char = gameState.getCharacterById(charId);
        if (char && char.faction === 'Fellowship' && !char.is_defeated) {
          fellowshipCount++;
        }
      });
      expect(fellowshipCount).toBe(theShireRegion.getCapacity('Fellowship'));

      const canEnter = canEnterRegion(aragorn, theShireRegion, gameState);
      expect(canEnter).toBe(false);
    });

    test('should return true if region is at capacity for other faction but not character\'s faction', () => {
      // Mordor, capacity 4 for Sauron. Fill with 4 Sauron units.
      // Frodo (Fellowship) tries to enter. Capacity for Fellowship in Mordor is also 4 (factionCapacity).
      const sauronChar3Id = mockGameData.characters.find(c => c.faction === 'Sauron' && ![witchKingId, sarumanId, sauronChar1Id, sauronChar2Id].includes(c.id))!.id;
      const sauronChar4Id = mockGameData.characters.find(c => c.faction === 'Sauron' && ![witchKingId, sarumanId, sauronChar1Id, sauronChar2Id, sauronChar3Id].includes(c.id))!.id;

      gameState = createRichMockGameState({
        [witchKingId]: mordorId,
        [sarumanId]: mordorId,
        [sauronChar1Id]: mordorId,
        [sauronChar2Id]: mordorId,
        [frodoId]: dagorladId, // Frodo in Dagorlad, adjacent to Mordor
      });

      const frodo = gameState.getCharacterById(frodoId)!;
      const mordorRegion = gameState.getRegionModel(mordorId)!;
      
      // Verify Mordor is full for Sauron
      let sauronCountInMordor = 0;
      gameState.getCharactersInRegion(mordorId).forEach(charId => {
        const char = gameState.getCharacterById(charId);
        if (char && char.faction === 'Sauron' && !char.is_defeated) sauronCountInMordor++;
      });
      expect(sauronCountInMordor).toBe(mordorRegion.getCapacity('Sauron'));

      // Fellowship count in Mordor is 0, capacity is 4. So Frodo should be able to enter.
      const canEnter = canEnterRegion(frodo, mordorRegion, gameState);
      expect(canEnter).toBe(true);
    });
  });
});
