import { GameState } from '@/lib/models/GameState';
import { CharacterModel } from '@/lib/models/Character';
import { moveCharacter } from '@/lib/gameLogic/movement';
import { mockGameData } from '@/lib/models/mockGameData';

describe('Debug Flying Nazgûl Real Scenario', () => {
  let gameState: GameState;
  let flyingNazgul: CharacterModel;
  let frodo: CharacterModel;

  beforeEach(() => {
    gameState = new GameState(mockGameData);
    
    // Get characters
    flyingNazgul = gameState.getCharacterById('CHAR_SAURON_FLYING_NAZGUL')!;
    frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;

    // Set up the exact scenario from your logs
    // Flying Nazgûl in Mordor, Frodo in Rhudaur
    gameState.placeCharacter('CHAR_SAURON_FLYING_NAZGUL', 'REGION_MORDOR');
    gameState.placeCharacter('CHAR_FELLOWSHIP_FRODO', 'REGION_RHUDAUR');

    console.log('=== INITIAL SETUP ===');
    const rhudaurRegion = gameState.getRegionById('REGION_RHUDAUR')!;
    console.log('Frodo location:', frodo.getLocation());
    console.log('Flying Nazgûl location:', flyingNazgul.getLocation());
    console.log('Rhudaur occupants:', rhudaurRegion.getOccupants().map(c => ({ name: c.name, faction: c.faction })));
    console.log('Rhudaur contains Fellowship?', rhudaurRegion.getOccupants('Fellowship').length > 0);
    console.log('Rhudaur contains Sauron?', rhudaurRegion.getOccupants('Sauron').length > 0);
  });

  test('should trigger battle when Flying Nazgûl moves to Rhudaur with Frodo', () => {
    console.log('\n=== BEFORE MOVE ===');
    const rhudaurRegion = gameState.getRegionById('REGION_RHUDAUR')!;
    console.log('Rhudaur occupants before move:', rhudaurRegion.getOccupants().map(c => ({ name: c.name, faction: c.faction })));
    console.log('Contains enemy of Sauron (Fellowship)?', rhudaurRegion.containsEnemy('Sauron'));

    // Execute the move
    const moveResult = moveCharacter(
      gameState,
      'CHAR_SAURON_FLYING_NAZGUL',
      'REGION_RHUDAUR',
      'SPECIAL'
    );

    console.log('\n=== AFTER MOVE ===');
    console.log('Move result:', moveResult);
    console.log('Flying Nazgûl location:', flyingNazgul.getLocation());
    console.log('Rhudaur occupants after move:', rhudaurRegion.getOccupants().map(c => ({ name: c.name, faction: c.faction })));
    console.log('Contains enemy of Sauron (Fellowship)?', rhudaurRegion.containsEnemy('Sauron'));
    console.log('Contains enemy of Fellowship (Sauron)?', rhudaurRegion.containsEnemy('Fellowship'));
    console.log('Active battle:', gameState.getActiveBattle());

    expect(moveResult).toBe(true);
    expect(gameState.getActiveBattle()).toBeTruthy();
  });
});
