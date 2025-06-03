import { CharacterModel } from '../models/Character';
import { GameState } from '../models/GameState';
import { RegionModel } from '../models/Region';
import { 
  registerAbilityHandler, 
  triggerAbilities, 
  clearAllAbilityHandlers,
  initializeDefaultAbilityHandlers,
  BattleContext,
  MovementContext 
} from './AbilitySystem';
import { ICharacter, IRegion, ICombatCard } from '../../types/data';

// Mock game data
const mockCharacters: ICharacter[] = [
  {
    id: 'CHAR_FELLOWSHIP_FRODO',
    name: 'Frodo',
    faction: 'Fellowship',
    versions: {
      classic: {
        strength: 1,
        abilities: [
          { id: 'FRODO_RETREAT', text: 'Can retreat sideways when defending', trigger: 'BATTLE_START' }
        ]
      }
    }
  },
  {
    id: 'CHAR_FELLOWSHIP_SAM',
    name: 'Sam',
    faction: 'Fellowship',
    versions: {
      classic: {
        strength: 2,
        abilities: [
          { id: 'SAM_SUBSTITUTE', text: 'Can substitute for Frodo', trigger: 'PRE_BATTLE_SUBSTITUTE' },
          { id: 'SAM_STRENGTH_BONUS', text: 'Strength becomes 5 with Frodo', trigger: 'COMPARE_STRENGTHS' }
        ]
      }
    }
  },
  {
    id: 'CHAR_FELLOWSHIP_MERRY',
    name: 'Merry',
    faction: 'Fellowship',
    versions: {
      classic: {
        strength: 2,
        abilities: [
          { id: 'MERRY_VS_WITCHKING', text: 'Defeats Witch-king automatically', trigger: 'BATTLE_START' }
        ]
      }
    }
  },
  {
    id: 'CHAR_SAURON_WITCHKING',
    name: 'Witch-king',
    faction: 'Sauron',
    versions: {
      classic: {
        strength: 5,
        abilities: [
          { id: 'WITCHKING_SIDEWAYS_ATTACK', text: 'Can move sideways when attacking', trigger: 'CHECK_MOVE_LEGALITY' }
        ]
      }
    }
  },
  {
    id: 'CHAR_SAURON_SHELOB',
    name: 'Shelob',
    faction: 'Sauron',
    versions: {
      classic: {
        strength: 5,
        abilities: [
          { id: 'SHELOB_POST_BATTLE_MOVE', text: 'Moves to Gondor after victory', trigger: 'BATTLE_END' }
        ]
      }
    }
  },
  {
    id: 'CHAR_SAURON_ORCS',
    name: 'Orcs',
    faction: 'Sauron',
    versions: {
      classic: {
        strength: 2,
        abilities: [
          { id: 'ORCS_FIRST_STRIKE', text: 'Defeats enemy before other abilities', trigger: 'BATTLE_START' }
        ]
      }
    }
  }
];

const mockRegions: IRegion[] = [
  {
    id: 'REGION_THE_SHIRE',
    name: 'The Shire',
    row: 1,
    position: 1,
    fellowshipAdjacent: ['REGION_ARTHEDAIN'],
    sauronAdjacent: [],
    startingCapacityFellowship: 4,
    startingCapacitySauron: 0,
    factionCapacity: 4
  },
  {
    id: 'REGION_ARTHEDAIN',
    name: 'Arthedain',
    row: 2,
    position: 1,
    fellowshipAdjacent: ['REGION_RHUDAUR'],
    sauronAdjacent: ['REGION_THE_SHIRE'],
    startingCapacityFellowship: 1,
    startingCapacitySauron: 1,
    factionCapacity: 2
  },
  {
    id: 'REGION_RHUDAUR',
    name: 'Rhudaur',
    row: 3,
    position: 1,
    fellowshipAdjacent: ['REGION_MISTY_MOUNTAINS'],
    sauronAdjacent: ['REGION_ARTHEDAIN'],
    startingCapacityFellowship: 1,
    startingCapacitySauron: 1,
    factionCapacity: 2
  },
  {
    id: 'REGION_MISTY_MOUNTAINS',
    name: 'Misty Mountains',
    row: 4,
    position: 1,
    special: 'Mountains',
    fellowshipAdjacent: [],
    sauronAdjacent: ['REGION_RHUDAUR'],
    startingCapacityFellowship: 1,
    startingCapacitySauron: 1,
    factionCapacity: 2
  },
  {
    id: 'REGION_GONDOR',
    name: 'Gondor',
    row: 5,
    position: 2,
    fellowshipAdjacent: [],
    sauronAdjacent: ['REGION_OSGILIATH'],
    startingCapacityFellowship: 2,
    startingCapacitySauron: 2,
    factionCapacity: 2
  }
];

const mockCombatCards: ICombatCard[] = [];

describe('Character Abilities', () => {
  let gameState: GameState;
  let frodo: CharacterModel;
  let sam: CharacterModel;
  let merry: CharacterModel;
  let witchking: CharacterModel;
  let shelob: CharacterModel;
  let orcs: CharacterModel;

  beforeEach(() => {
    // Clear any existing handlers to avoid interference
    clearAllAbilityHandlers();
    
    // Re-initialize default handlers
    initializeDefaultAbilityHandlers();
    
    // Create fresh game state
    gameState = new GameState({
      characters: mockCharacters,
      regions: mockRegions,
      combatCards: mockCombatCards
    });

    // Get character instances
    frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO')!;
    sam = gameState.getCharacterById('CHAR_FELLOWSHIP_SAM')!;
    merry = gameState.getCharacterById('CHAR_FELLOWSHIP_MERRY')!;
    witchking = gameState.getCharacterById('CHAR_SAURON_WITCHKING')!;
    shelob = gameState.getCharacterById('CHAR_SAURON_SHELOB')!;
    orcs = gameState.getCharacterById('CHAR_SAURON_ORCS')!;

    // Initialize handlers by importing the module (this triggers the default handlers)
    require('./AbilitySystem');
  });

  describe('Fellowship Abilities', () => {
    describe('Frodo Retreat', () => {
      it('should allow Frodo to retreat sideways when defending (not in mountains)', () => {
        // Place Frodo in Arthedain and an enemy in same region using setCharacterLocation to avoid auto-battle
        gameState.setCharacterLocation(frodo.id, 'REGION_ARTHEDAIN');
        gameState.setCharacterLocation(orcs.id, 'REGION_ARTHEDAIN');

        const battleContext: BattleContext = {
          attacker: orcs,
          defender: frodo,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        // Trigger Frodo's retreat ability
        triggerAbilities('BATTLE_START', battleContext);

        // Check if battle was cancelled due to retreat
        expect((battleContext as any).battleCancelled).toBe(true);
        expect((battleContext as any).retreated).toBe(true);

        // Check if Frodo moved to a retreat location (The Shire)
        expect(frodo.getLocation()).toBe('REGION_THE_SHIRE');
      });

      it('should not allow retreat in mountains', () => {
        // Place Frodo in mountains (test setup, don't trigger battles)
        gameState.moveCharacter(frodo.id, 'REGION_MISTY_MOUNTAINS', { isSetup: true });
        gameState.moveCharacter(orcs.id, 'REGION_MISTY_MOUNTAINS', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: orcs,
          defender: frodo,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        // Trigger Frodo's retreat ability
        triggerAbilities('BATTLE_START', battleContext);

        // Check that retreat was not allowed
        expect((battleContext as any).battleCancelled).toBeFalsy();
        expect(frodo.getLocation()).toBe('REGION_MISTY_MOUNTAINS');
      });

      it('should not trigger when Frodo is attacking', () => {
        gameState.moveCharacter(frodo.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(orcs.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: frodo,
          defender: orcs,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        triggerAbilities('BATTLE_START', battleContext);

        expect((battleContext as any).battleCancelled).toBeFalsy();
        expect(frodo.getLocation()).toBe('REGION_ARTHEDAIN');
      });
    });

    describe('Sam Substitute', () => {
      it('should allow Sam to substitute for Frodo when Sam chooses to use his ability', () => {
        // Setup: Both Sam and Frodo in same region, Frodo is selected as initial defender
        gameState.setCharacterLocation(frodo.id, 'REGION_ARTHEDAIN');
        gameState.setCharacterLocation(sam.id, 'REGION_ARTHEDAIN');
        
        // Use a neutral attacker that doesn't affect abilities (basic Orcs)
        const basicOrcs = orcs; // Use the pre-initialized character
        
        const battleContext: BattleContext = {
          attacker: basicOrcs,
          defender: frodo, // Frodo was selected as initial target
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        // Step 1: Pre-battle substitution phase (Sam can substitute for Frodo)
        triggerAbilities('PRE_BATTLE_SUBSTITUTE', battleContext);
        
        // Sam should have substituted for Frodo
        expect(sam.is_revealed).toBe(true);
        expect(battleContext.defender).toBe(sam);
        
        // Step 2: Regular battle start abilities (Frodo's retreat won't trigger since he's not defending)
        triggerAbilities('BATTLE_START', battleContext);
        
        // Frodo should still be in the region since he was never the defender when retreat was checked
        expect(frodo.getLocation()).toBe('REGION_ARTHEDAIN');
        expect(sam.getLocation()).toBe('REGION_ARTHEDAIN'); // Sam stays to fight
      });

      it('should not trigger if Sam is not in same region as Frodo', () => {
        gameState.setCharacterLocation(frodo.id, 'REGION_ARTHEDAIN');
        gameState.setCharacterLocation(sam.id, 'REGION_RHUDAUR');
        
        const basicOrcs = orcs; // Use the pre-initialized character

        const battleContext: BattleContext = {
          attacker: basicOrcs,
          defender: frodo,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        triggerAbilities('PRE_BATTLE_SUBSTITUTE', battleContext);

        expect(battleContext.defender).toBe(frodo);
        expect(sam.is_revealed).toBe(false);
      });

      it('should allow Frodo retreat when Sam does NOT substitute (Sam already revealed)', () => {
        // Setup: Both Sam and Frodo in same region, but Sam can't substitute because he's already revealed
        gameState.setCharacterLocation(frodo.id, 'REGION_ARTHEDAIN');
        gameState.setCharacterLocation(sam.id, 'REGION_ARTHEDAIN');
        
        // Make Sam already revealed so he can't substitute
        sam.reveal();
        
        const basicOrcs = orcs; // Use the pre-initialized character
        
        const battleContext: BattleContext = {
          attacker: basicOrcs,
          defender: frodo, // Frodo is selected as initial target
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        // Step 1: Pre-battle substitution phase (Sam can't substitute - already revealed)
        triggerAbilities('PRE_BATTLE_SUBSTITUTE', battleContext);

        
        // Frodo should still be the defender (no substitution occurred)
        expect(battleContext.defender).toBe(frodo);
        
        // Step 2: Regular battle start abilities (Frodo's retreat should trigger)
        triggerAbilities('BATTLE_START', battleContext);
        
        // Frodo should have retreated to an adjacent region
        expect(frodo.getLocation()).not.toBe('REGION_ARTHEDAIN');
        expect(sam.getLocation()).toBe('REGION_ARTHEDAIN'); // Sam stays in original region
      });

      it('should not trigger if Sam is already revealed (alternative scenario)', () => {
        // Alternative test: Sam was revealed in a previous action
        gameState.setCharacterLocation(frodo.id, 'REGION_CARDOLAN');
        gameState.setCharacterLocation(sam.id, 'REGION_CARDOLAN');
        sam.reveal(); // Sam was revealed earlier in the game

        const basicOrcs = gameState.getCharacterById('CHAR_SAURON_ORCS')!;

        const battleContext: BattleContext = {
          attacker: basicOrcs,
          defender: frodo,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        triggerAbilities('PRE_BATTLE_SUBSTITUTE', battleContext);

        expect(battleContext.defender).toBe(frodo); // No substitution
        expect(sam.is_revealed).toBe(true); // Still revealed
      });

      it('should prioritize Sam substitution over Frodo retreat timing', () => {
        // This test verifies the correct rule timing: Sam's substitute happens BEFORE Frodo's retreat
        gameState.setCharacterLocation(frodo.id, 'REGION_ARTHEDAIN');
        gameState.setCharacterLocation(sam.id, 'REGION_ARTHEDAIN');
        gameState.setCharacterLocation(orcs.id, 'REGION_ARTHEDAIN');

        const battleContext: BattleContext = {
          attacker: orcs,
          defender: frodo,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        // Step 1: Pre-battle substitution (Sam can substitute for Frodo)
        triggerAbilities('PRE_BATTLE_SUBSTITUTE', battleContext);
        
        // At this point, Sam should have substituted for Frodo
        expect(sam.is_revealed).toBe(true);
        expect(battleContext.defender).toBe(sam);
        
        // Step 2: Regular battle start abilities (Frodo's retreat won't trigger since he's not defending)
        triggerAbilities('BATTLE_START', battleContext);
        
        // Frodo should still be in the region since he was never the defender when retreat was checked
        expect(frodo.getLocation()).toBe('REGION_ARTHEDAIN');
        expect(sam.getLocation()).toBe('REGION_ARTHEDAIN'); // Sam stays to fight
      });
    });

    describe('Sam Strength Bonus', () => {
      it('should increase Sam\'s strength to 5 when with Frodo', () => {
        gameState.moveCharacter(frodo.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(sam.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(orcs.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: orcs,
          defender: sam,
          gameState,
          log: [],
          battlePhase: 'ABILITIES'
        };

        triggerAbilities('COMPARE_STRENGTHS', battleContext);

        expect((battleContext as any).samStrengthBonus).toBe(3); // 5 - 2 = 3 bonus
      });

      it('should not trigger if Frodo is not in same region', () => {
        gameState.moveCharacter(frodo.id, 'REGION_RHUDAUR', { isSetup: true });
        gameState.moveCharacter(sam.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(orcs.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: orcs,
          defender: sam,
          gameState,
          log: [],
          battlePhase: 'ABILITIES'
        };

        triggerAbilities('COMPARE_STRENGTHS', battleContext);

        expect((battleContext as any).samStrengthBonus).toBeUndefined();
      });
    });

    describe('Merry vs Witch-king', () => {
      it('should automatically defeat Witch-king', () => {
        gameState.moveCharacter(merry.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(witchking.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: merry,
          defender: witchking,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        triggerAbilities('BATTLE_START', battleContext);

        expect(witchking.isDefeated()).toBe(true);
        expect(battleContext.outcome).toBe('ATTACKER_WIN');
        expect(battleContext.skipCardPlay).toBe(true);
      });

      it('should not trigger against other enemies', () => {
        gameState.moveCharacter(merry.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(orcs.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: merry,
          defender: orcs,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        triggerAbilities('BATTLE_START', battleContext);

        expect(orcs.isDefeated()).toBe(false);
        expect(battleContext.outcome).toBeUndefined();
        expect(battleContext.skipCardPlay).toBeFalsy();
      });
    });
  });

  describe('Sauron Abilities', () => {
    describe('Shelob Post-Battle Move', () => {
      it('should move to Gondor after winning a battle outside Gondor', () => {
        gameState.moveCharacter(shelob.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(frodo.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: shelob,
          defender: frodo,
          gameState,
          log: [],
          outcome: 'ATTACKER_WIN',
          battlePhase: 'END'
        };

        triggerAbilities('BATTLE_END', battleContext);

        expect(shelob.getLocation()).toBe('REGION_GONDOR');
      });

      it('should not move if battle is in Gondor', () => {
        gameState.moveCharacter(shelob.id, 'REGION_GONDOR', { isSetup: true });
        gameState.moveCharacter(frodo.id, 'REGION_GONDOR', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: shelob,
          defender: frodo,
          gameState,
          log: [],
          outcome: 'ATTACKER_WIN',
          battlePhase: 'END'
        };

        triggerAbilities('BATTLE_END', battleContext);

        expect(shelob.getLocation()).toBe('REGION_GONDOR');
      });

      it('should not trigger if Shelob loses', () => {
        gameState.moveCharacter(shelob.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(frodo.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: shelob,
          defender: frodo,
          gameState,
          log: [],
          outcome: 'DEFENDER_WIN',
          battlePhase: 'END'
        };

        triggerAbilities('BATTLE_END', battleContext);

        expect(shelob.getLocation()).toBe('REGION_ARTHEDAIN');
      });
    });

    describe('Orcs First Strike', () => {
      it('should defeat Fellowship character immediately when attacking', () => {
        gameState.moveCharacter(orcs.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(frodo.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: orcs,
          defender: frodo,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        triggerAbilities('BATTLE_START', battleContext);

        expect(frodo.isDefeated()).toBe(true);
        expect(battleContext.outcome).toBe('ATTACKER_WIN');
        expect(battleContext.skipCardPlay).toBe(true);
      });

      it('should not trigger when defending', () => {
        gameState.moveCharacter(orcs.id, 'REGION_ARTHEDAIN', { isSetup: true });
        gameState.moveCharacter(frodo.id, 'REGION_ARTHEDAIN', { isSetup: true });

        const battleContext: BattleContext = {
          attacker: frodo,
          defender: orcs,
          gameState,
          log: [],
          battlePhase: 'REVEAL'
        };

        triggerAbilities('BATTLE_START', battleContext);

        expect(frodo.isDefeated()).toBe(false);
        expect(battleContext.outcome).toBeUndefined();
        expect(battleContext.skipCardPlay).toBeFalsy();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle multiple abilities in correct order (Fellowship first)', () => {
      // Place Merry vs Witch-king - Merry should win despite any Witch-king abilities
      gameState.moveCharacter(merry.id, 'REGION_ARTHEDAIN', { isSetup: true });
      gameState.moveCharacter(witchking.id, 'REGION_ARTHEDAIN', { isSetup: true });

      const battleContext: BattleContext = {
        attacker: merry,
        defender: witchking,
        gameState,
        log: [],
        battlePhase: 'REVEAL'
      };

      triggerAbilities('BATTLE_START', battleContext);

      // Merry's ability should defeat Witch-king
      expect(witchking.isDefeated()).toBe(true);
      expect(battleContext.outcome).toBe('ATTACKER_WIN');
    });

    it('should handle Sam substitution and strength bonus correctly', () => {
      gameState.moveCharacter(frodo.id, 'REGION_ARTHEDAIN', { isSetup: true });
      gameState.moveCharacter(sam.id, 'REGION_ARTHEDAIN', { isSetup: true });
      gameState.moveCharacter(orcs.id, 'REGION_ARTHEDAIN', { isSetup: true });

      // Battle starts with Orcs attacking Frodo
      const battleContext: BattleContext = {
        attacker: orcs,
        defender: frodo,
        gameState,
        log: [],
        battlePhase: 'REVEAL'
      };

      // Sam should substitute for Frodo (happens in PRE_BATTLE_SUBSTITUTE phase)
      triggerAbilities('PRE_BATTLE_SUBSTITUTE', battleContext);
      expect(battleContext.defender).toBe(sam);
      expect(sam.is_revealed).toBe(true);

      // Then trigger normal battle start (Frodo's retreat won't trigger since he's not defending)
      triggerAbilities('BATTLE_START', battleContext);

      // Later in battle, Sam should get strength bonus
      triggerAbilities('COMPARE_STRENGTHS', battleContext);
      expect((battleContext as any).samStrengthBonus).toBe(3);
    });
  });

  describe('Debug Tests', () => {
    it('should show Frodo abilities and trigger system', () => {
      // Test basic movement
      gameState.moveCharacter(frodo.id, 'REGION_ARTHEDAIN', { isSetup: true });
      gameState.moveCharacter(orcs.id, 'REGION_ARTHEDAIN', { isSetup: true });

      const battleContext: BattleContext = {
        attacker: orcs,
        defender: frodo,
        gameState,
        log: [],
        battlePhase: 'REVEAL'
      };

      // Trigger abilities with debug
      triggerAbilities('BATTLE_START', battleContext);
    });
  });

  describe('Full Battle System Integration', () => {
    it('should handle Sam substitution correctly in a complete battle flow', () => {
      // This test verifies that the full battle system respects the correct timing:
      // 1. PRE_BATTLE_SUBSTITUTE (Sam's substitute) happens before BATTLE_START (Frodo's retreat)
      
      // Setup: Both Sam and Frodo in same region
      gameState.setCharacterLocation(frodo.id, 'REGION_ARTHEDAIN');
      gameState.setCharacterLocation(sam.id, 'REGION_ARTHEDAIN');
      gameState.setCharacterLocation(orcs.id, 'REGION_RHUDAUR'); // Orcs start elsewhere
      
      // Import BattleSystem to test the full flow
        const { resolveFullBattle } = require('../systems/BattleSystem');
        
        // Simulate a battle where Frodo is the initial defender
        const battleContext = resolveFullBattle(orcs, frodo, gameState);
      
      // With correct timing:
      // - Sam should have substituted for Frodo (Sam revealed, Sam is defender)
      // - Frodo should still be in original region (no retreat because he wasn't defending)
      expect(battleContext.defender).toBe(sam);
      expect(sam.is_revealed).toBe(true);
      expect(frodo.getLocation()).toBe('REGION_ARTHEDAIN');
      expect(sam.getLocation()).toBe('REGION_ARTHEDAIN');        // Battle log should show the correct sequence
        const logText = battleContext.log.join(' ');
        expect(logText).toContain('pre-battle substitution');
        expect(logText).toContain('Trigger character abilities'); // This happens after substitution
    });
    
    it('should allow Frodo to retreat when Sam cannot substitute', () => {
      // Setup: Sam already revealed, so he cannot substitute
      gameState.setCharacterLocation(frodo.id, 'REGION_ARTHEDAIN');
      gameState.setCharacterLocation(sam.id, 'REGION_ARTHEDAIN');
      gameState.setCharacterLocation(orcs.id, 'REGION_RHUDAUR');
      sam.reveal(); // Sam is already revealed
      
      const { resolveFullBattle } = require('../systems/BattleSystem');
        const battleContext = resolveFullBattle(orcs, frodo, gameState);
      
      // With Sam unable to substitute:
      // - Frodo remains the defender initially
      // - Frodo's retreat ability should trigger and move him to adjacent region
      // - Battle might end if Frodo successfully retreats
      
      // Frodo should have retreated to an adjacent region (THE_SHIRE is adjacent to ARTHEDAIN)
      expect(frodo.getLocation()).not.toBe('REGION_ARTHEDAIN');
      expect(['REGION_THE_SHIRE', 'REGION_CARDOLAN', 'REGION_RHUDAUR']).toContain(frodo.getLocation());
    });
  });
});
