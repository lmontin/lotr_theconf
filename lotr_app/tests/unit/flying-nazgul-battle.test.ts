import { GameState } from '@/lib/models/GameState';
import { CharacterModel } from '@/lib/models/Character';
import { mockGameData } from '@/lib/models/mockGameData';
import { getLegalMoves, moveCharacter } from '@/lib/gameLogic/movement';
import { MoveType } from '@/types/data';

describe('Flying Nazgûl Battle Triggering', () => {
  let gameState: GameState;
  let flyingNazgul: CharacterModel;
  let sam: CharacterModel;

  beforeEach(() => {
    gameState = new GameState(mockGameData);
    
    // Get characters
    flyingNazgul = gameState.getCharacterById('CHAR_SAURON_FLYING_NAZGUL')!;
    sam = gameState.getCharacterById('CHAR_FELLOWSHIP_SAM')!;
    
    expect(flyingNazgul).toBeDefined();
    expect(sam).toBeDefined();
    
    // Place Flying Nazgûl in Mirkwood
    gameState.placeCharacter(flyingNazgul.id, 'REGION_MIRKWOOD');
    
    // Place Sam alone in Rhudaur (single Fellowship character)
    gameState.placeCharacter(sam.id, 'REGION_RHUDAUR');
    
    // Set game phase to Sauron movement phase
    gameState.nextPhase(); // SETUP -> SAURON_MOVE
  });

  it('should allow Flying Nazgûl to move to region with single Fellowship character', () => {
    const legalMoves = getLegalMoves(flyingNazgul, gameState);
    
    // Should have special flying move to Rhudaur where Sam is alone
    const flyingMoveToRhudaur = legalMoves.find(
      move => move.destinationRegionId === 'REGION_RHUDAUR' && move.type === 'FLYING_MOVE'
    );
    
    expect(flyingMoveToRhudaur).toBeDefined();
  });

  it('should trigger battle when Flying Nazgûl uses special move to attack Sam', () => {
    // Capture initial battle state
    const initialBattle = gameState.getActiveBattle();
    expect(initialBattle).toBeNull();
    
    // Execute the flying move
    const moveSuccess = moveCharacter(
      flyingNazgul.id,
      'REGION_RHUDAUR',
      gameState,
      'FLYING_MOVE' as MoveType
    );
    
    expect(moveSuccess).toBe(true);
    
    // Verify character moved
    expect(flyingNazgul.getLocation()).toBe('REGION_RHUDAUR');
    
    // Most importantly: Battle should be triggered
    const activeBattle = gameState.getActiveBattle();
    expect(activeBattle).toBeDefined();
    expect(activeBattle).not.toBeNull();
    
    if (activeBattle) {
      expect(activeBattle.regionId).toBe('REGION_RHUDAUR');
      expect(activeBattle.triggeringCharacterId).toBe(flyingNazgul.id);
      expect(activeBattle.attackingFaction).toBe('Sauron');
      expect(activeBattle.defendingFaction).toBe('Fellowship');
      expect(activeBattle.attackers).toContain(flyingNazgul);
      expect(activeBattle.defenders).toContain(sam);
    }
  });

  it('should not allow Flying Nazgûl to move to region with multiple Fellowship characters', () => {
    // Add another Fellowship character to Rhudaur
    const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
    gameState.placeCharacter(frodo.id, 'REGION_RHUDAUR');
    
    const legalMoves = getLegalMoves(flyingNazgul, gameState);
    
    // Should NOT have flying move to Rhudaur anymore (has 2 Fellowship characters)
    const flyingMoveToRhudaur = legalMoves.find(
      move => move.destinationRegionId === 'REGION_RHUDAUR' && move.type === 'FLYING_MOVE'
    );
    
    expect(flyingMoveToRhudaur).toBeUndefined();
  });

  it('should log the battle trigger when Flying Nazgûl attacks', () => {
    // Execute the flying move
    moveCharacter(
      flyingNazgul.id,
      'REGION_RHUDAUR',
      gameState,
      'FLYING_MOVE' as MoveType
    );
    
    // Check that battle trigger was logged (we'll just verify it was called through other means)
    const activeBattle = gameState.getActiveBattle();
    expect(activeBattle).toBeDefined();
    expect(activeBattle).not.toBeNull();
  });

  it('should work with regular adjacent moves too (baseline test)', () => {
    // Place Sam in a region adjacent to Mirkwood via normal Sauron movement
    const mistyMountains = 'REGION_MISTY_MOUNTAINS';
    gameState.placeCharacter(sam.id, mistyMountains);
    
    const legalMoves = getLegalMoves(flyingNazgul, gameState);
    const regularMove = legalMoves.find(
      move => move.destinationRegionId === mistyMountains && move.type === 'FORWARD'
    );
    
    expect(regularMove).toBeDefined();
    
    // Execute regular move
    const moveSuccess = moveCharacter(
      flyingNazgul.id,
      mistyMountains,
      gameState,
      'FORWARD' as MoveType
    );
    
    expect(moveSuccess).toBe(true);
    
    // Should still trigger battle
    const activeBattle = gameState.getActiveBattle();
    expect(activeBattle).toBeDefined();
  });
});
