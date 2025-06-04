import { GameState } from '../models/GameState';
import { mockGameData } from '../models/mockGameData';
import { moveCharacter } from './movement';

describe('Phase-Based Battle Triggering', () => {
  let gameState: GameState;

  // Helper function to create fresh game state
  const createFreshGameState = () => {
    const freshGameState = new GameState(mockGameData);
    // Clear any existing battle state
    freshGameState.setActiveBattle(null);
    return freshGameState;
  };

  test('should show initial game state and phase progression', () => {
    // Create fresh state for this test
    gameState = createFreshGameState();
    
    console.log('=== INITIAL STATE ===');
    console.log(`Turn: ${gameState.getTurn()}`);
    console.log(`Phase: ${gameState.getCurrentPhase()}`);
    console.log(`Current Player: ${gameState.getCurrentPlayer()}`);
    
    // Progress from SETUP to SAURON_MOVE
    gameState.nextPhase();
    
    console.log('=== AFTER nextPhase() FROM SETUP ===');
    console.log(`Turn: ${gameState.getTurn()}`);
    console.log(`Phase: ${gameState.getCurrentPhase()}`);
    console.log(`Current Player: ${gameState.getCurrentPlayer()}`);
    
    expect(gameState.getCurrentPhase()).toBe('SAURON_MOVE');
    expect(gameState.getCurrentPlayer()).toBe('Sauron');
  });

  test('should trigger battle when Flying Nazgûl moves during correct SAURON_MOVE phase', () => {
    // Create fresh state for this test
    gameState = createFreshGameState();
    
    // Setup characters in positions needed for this test
    gameState.placeCharacter('CHAR_FELLOWSHIP_FRODO', 'REGION_RHUDAUR');
    gameState.placeCharacter('CHAR_SAURON_FLYING_NAZGUL', 'REGION_MORDOR');
    
    // Move to SAURON_MOVE phase
    gameState.nextPhase();
    
    console.log('=== BEFORE MOVE ===');
    console.log(`Turn: ${gameState.getTurn()}`);
    console.log(`Phase: ${gameState.getCurrentPhase()}`);
    console.log(`Current Player: ${gameState.getCurrentPlayer()}`);
    console.log(`Battle active before move: ${gameState.getActiveBattle() !== null}`);
    
    const flyingNazgul = gameState.getCharacterById('CHAR_SAURON_FLYING_NAZGUL')!;
    const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
    
    console.log(`Flying Nazgûl location: ${flyingNazgul.getLocation()}`);
    console.log(`Frodo location: ${frodo.getLocation()}`);
    
    // Move Flying Nazgûl from Mordor to Rhudaur (where Frodo is)
    const moveResult = moveCharacter(
      'CHAR_SAURON_FLYING_NAZGUL',
      'REGION_RHUDAUR',
      gameState,
      'SPECIAL'
    );
    
    console.log('=== AFTER MOVE ===');
    console.log(`Move successful: ${moveResult}`);
    console.log(`Flying Nazgûl location: ${gameState.getCharacterById('CHAR_SAURON_FLYING_NAZGUL')?.getLocation()}`);
    console.log(`Battle active: ${gameState.getActiveBattle() !== null}`);
    if (gameState.getActiveBattle()) {
      console.log(`Battle region: ${gameState.getActiveBattle()!.regionName}`);
      console.log(`Attackers: ${gameState.getActiveBattle()!.attackers.map((c: any) => c.name)}`);
      console.log(`Defenders: ${gameState.getActiveBattle()!.defenders.map((c: any) => c.name)}`);
    }
    
    expect(moveResult).toBe(true);
    expect(gameState.getActiveBattle()).not.toBeNull();
    expect(gameState.getActiveBattle()!.regionId).toBe('REGION_RHUDAUR');
  });

  test('should NOT trigger battle when Flying Nazgûl moves during wrong FELLOWSHIP_MOVE phase', () => {
    // Create completely fresh state for this test
    gameState = createFreshGameState();
    
    // Setup characters in positions needed for this test
    gameState.placeCharacter('CHAR_FELLOWSHIP_FRODO', 'REGION_RHUDAUR');
    gameState.placeCharacter('CHAR_SAURON_FLYING_NAZGUL', 'REGION_MORDOR');
    
    // Move to FELLOWSHIP_MOVE phase (wrong phase for Sauron character)
    gameState.nextPhase(); // SETUP -> SAURON_MOVE
    gameState.nextPhase(); // SAURON_MOVE -> SAURON_ACTION
    gameState.nextPhase(); // SAURON_ACTION -> FELLOWSHIP_MOVE
    
    console.log('=== BEFORE MOVE (WRONG PHASE) ===');
    console.log(`Turn: ${gameState.getTurn()}`);
    console.log(`Phase: ${gameState.getCurrentPhase()}`);
    console.log(`Current Player: ${gameState.getCurrentPlayer()}`);
    console.log(`Battle active before move: ${gameState.getActiveBattle() !== null}`);
    
    expect(gameState.getCurrentPhase()).toBe('FELLOWSHIP_MOVE');
    expect(gameState.getCurrentPlayer()).toBe('Fellowship');
    expect(gameState.getActiveBattle()).toBeNull(); // Should start with no battle
    
    // Try to move Flying Nazgûl during Fellowship's turn (this should not trigger battle)
    const moveResult = moveCharacter(
      'CHAR_SAURON_FLYING_NAZGUL',
      'REGION_RHUDAUR',
      gameState,
      'SPECIAL'
    );
    
    console.log('=== AFTER MOVE (WRONG PHASE) ===');
    console.log(`Move successful: ${moveResult}`);
    console.log(`Battle active: ${gameState.getActiveBattle() !== null}`);
    
    // The move should succeed, but battle should NOT trigger due to wrong phase
    expect(moveResult).toBe(true);
    expect(gameState.getActiveBattle()).toBeNull(); // This should now pass!
    
    if (gameState.getActiveBattle() === null) {
      console.log('✅ CORRECT: No battle triggered during wrong phase!');
    } else {
      console.log('❌ BUG: Battle still triggered during wrong phase!');
    }
  });

  test('should log the battle trigger condition details', () => {
    // Create fresh state for this test
    gameState = createFreshGameState();
    
    // Setup characters in positions needed for this test
    gameState.placeCharacter('CHAR_FELLOWSHIP_FRODO', 'REGION_RHUDAUR');
    gameState.placeCharacter('CHAR_SAURON_FLYING_NAZGUL', 'REGION_MORDOR');
    
    // Move to SAURON_MOVE phase
    gameState.nextPhase();
    
    console.log('=== BATTLE TRIGGER TEST ===');
    console.log(`Current Phase: ${gameState.getCurrentPhase()}`);
    console.log(`Current Player: ${gameState.getCurrentPlayer()}`);
    console.log(`Battle active before move: ${gameState.getActiveBattle() !== null}`);
    
    const moveResult = moveCharacter(
      'CHAR_SAURON_FLYING_NAZGUL',
      'REGION_RHUDAUR',
      gameState,
      'SPECIAL'
    );
    
    console.log(`Move Result: ${moveResult}`);
    console.log(`Battle Triggered: ${gameState.getActiveBattle() !== null}`);
  });
});
