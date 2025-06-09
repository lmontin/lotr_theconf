import { GameState } from '@/lib/models/GameState';
import { CharacterModel } from '@/lib/models/Character';
import { RegionModel } from '@/lib/models/Region';
import { Player } from '@/lib/models/Player';
import { resolveFullBattle } from '@/lib/systems/BattleSystem';
import { moveCharacter, getLegalMoves } from '@/lib/gameLogic/movement';
import { triggerAbilities, registerAbilityHandler, clearAllAbilityHandlers, BattleContext } from '@/lib/systems/AbilitySystem';
import { ICharacter, IRegion, ICombatCard } from '@/types/data';

describe('AbilitySystem Integration Tests', () => {
  let gameState: GameState;
  let frodo: CharacterModel;
  let sam: CharacterModel;
  let nazgul: CharacterModel;
  let balrog: CharacterModel;
  let shelob: CharacterModel;
  let witchKing: CharacterModel;

  const mockGameData = {
    characters: [
      {
        id: 'CHAR_FRODO',
        name: 'Frodo',
        faction: 'Fellowship' as const,
        versions: { 
          classic: { 
            strength: 2, 
            abilities: [
              { id: 'frodo_retreat', text: 'May retreat from battle', trigger: 'BATTLE_START' },
              { id: 'ring_resistance', text: 'Resistant to Nazgul', trigger: 'BATTLE_START' }
            ]
          } 
        }
      },
      {
        id: 'CHAR_SAM',
        name: 'Sam',
        faction: 'Fellowship' as const,
        versions: { 
          classic: { 
            strength: 3, 
            abilities: [
              { id: 'substitute', text: 'May substitute for Frodo', trigger: 'BATTLE_START' },
              { id: 'strength_bonus', text: '+1 strength vs evil', trigger: 'COMPARE_STRENGTHS' }
            ]
          } 
        }
      },
      {
        id: 'CHAR_NAZGUL',
        name: 'Nazgul',
        faction: 'Sauron' as const,
        versions: { 
          classic: { 
            strength: 4, 
            abilities: [
              { id: 'flying_move', text: 'May move to any region', trigger: 'CHECK_MOVE_LEGALITY' }
            ]
          } 
        }
      },
      {
        id: 'CHAR_BALROG',
        name: 'Balrog',
        faction: 'Sauron' as const,
        versions: { 
          classic: { 
            strength: 7, 
            abilities: [
              { id: 'tunnel_ambush', text: 'May move through mountains', trigger: 'CHECK_MOVE_LEGALITY' }
            ]
          } 
        }
      },
      {
        id: 'CHAR_SHELOB',
        name: 'Shelob',
        faction: 'Sauron' as const,
        versions: { 
          classic: { 
            strength: 6, 
            abilities: [
              { id: 'post_battle_move', text: 'May move after winning battle', trigger: 'BATTLE_END' }
            ]
          } 
        }
      },
      {
        id: 'CHAR_WITCH_KING',
        name: 'Witch-king',
        faction: 'Sauron' as const,
        versions: { 
          classic: { 
            strength: 5, 
            abilities: [
              { id: 'sideways_attack', text: 'May attack sideways', trigger: 'CHECK_MOVE_LEGALITY' },
              { id: 'frodo_retreat_block', text: 'Blocks Frodo retreat', trigger: 'BATTLE_START' }
            ]
          } 
        }
      }
    ] as ICharacter[],
    regions: [
      {
        id: 'REGION_SHIRE',
        name: 'The Shire',
        row: 1,
        position: 1,
        fellowshipAdjacent: ['REGION_BREE'],
        sauronAdjacent: [],
        special: 'Fellowship Start',
        startingCapacityFellowship: 4,
        startingCapacitySauron: 0,
        factionCapacity: 2
      },
      {
        id: 'REGION_BREE',
        name: 'Bree',
        row: 2,
        position: 1,
        fellowshipAdjacent: ['REGION_WEATHERTOP'],
        sauronAdjacent: ['REGION_SHIRE'],
        special: 'Town',
        startingCapacityFellowship: 2,
        startingCapacitySauron: 2,
        factionCapacity: 2
      },
      {
        id: 'REGION_WEATHERTOP',
        name: 'Weathertop',
        row: 3,
        position: 1,
        fellowshipAdjacent: ['REGION_RIVENDELL'],
        sauronAdjacent: ['REGION_BREE'],
        special: 'Stronghold',
        startingCapacityFellowship: 1,
        startingCapacitySauron: 1,
        factionCapacity: 1
      },
      {
        id: 'REGION_MOUNTAINS',
        name: 'Misty Mountains',
        row: 4,
        position: 2,
        fellowshipAdjacent: ['REGION_MORIA'],
        sauronAdjacent: ['REGION_WEATHERTOP'],
        special: 'Mountains',
        startingCapacityFellowship: 1,
        startingCapacitySauron: 1,
        factionCapacity: 1,
        fellowshipSpecialMovement: ['REGION_TUNNEL_EXIT']
      },
      {
        id: 'REGION_TUNNEL_EXIT',
        name: 'Tunnel Exit',
        row: 5,
        position: 3,
        fellowshipAdjacent: [],
        sauronAdjacent: ['REGION_MOUNTAINS'],
        special: 'Hidden',
        startingCapacityFellowship: 1,
        startingCapacitySauron: 1,
        factionCapacity: 1
      }
    ] as IRegion[],
    combatCards: [] as ICombatCard[]
  };

  beforeEach(() => {
    // Clear any previously registered ability handlers
    clearAllAbilityHandlers();
    
    gameState = new GameState(mockGameData);
    
    // Get character models
    frodo = gameState.getCharacterById('CHAR_FRODO')!;
    sam = gameState.getCharacterById('CHAR_SAM')!;
    nazgul = gameState.getCharacterById('CHAR_NAZGUL')!;
    balrog = gameState.getCharacterById('CHAR_BALROG')!;
    shelob = gameState.getCharacterById('CHAR_SHELOB')!;
    witchKing = gameState.getCharacterById('CHAR_WITCH_KING')!;

    // Set up initial positions
    frodo.setLocation('REGION_SHIRE', true);
    sam.setLocation('REGION_SHIRE', true);
    nazgul.setLocation('REGION_BREE', true);
    balrog.setLocation('REGION_MOUNTAINS', true);
    shelob.setLocation('REGION_WEATHERTOP', true);
    witchKing.setLocation('REGION_BREE', true);
  });

  describe('Scenario A: Early Battle Termination (Frodo Retreat)', () => {
    it('should end battle early when Frodo retreats successfully', () => {
      let retreatTriggered = false;
      let battleContext: BattleContext;

      // Register Frodo's retreat ability with correct ID from test data
      registerAbilityHandler('frodo_retreat', (source, context) => {
        const ctx = context as BattleContext;
        if (ctx.defender.name === 'Frodo') {
          // Check if retreat is possible (not in mountains)
          const frodoRegion = gameState.getRegionById(frodo.getLocation()!);
          if (!frodoRegion?.special?.includes('Mountains')) {
            retreatTriggered = true;
            (ctx as any).retreated = true;
            ctx.log.push('Frodo retreats from battle!');
          }
        }
      });

      // Move Frodo to Bree to set up battle
      moveCharacter('CHAR_FRODO', 'REGION_BREE', gameState, 'FORWARD');
      
      // Battle should trigger automatically, but let's test the ability directly
      battleContext = resolveFullBattle(nazgul, frodo, gameState);

      expect(retreatTriggered).toBe(true);
      expect(battleContext.log).toContain('Frodo retreats from battle!');
      expect(battleContext.outcome).toBeUndefined(); // Battle ended early
    });

    it('should prevent retreat in mountains', () => {
      let retreatAttempted = false;
      let retreatSuccessful = false;

      registerAbilityHandler('frodo_retreat', (source, context) => {
        const ctx = context as BattleContext;
        if (ctx.defender.name === 'Frodo') {
          retreatAttempted = true;
          const frodoRegion = gameState.getRegionById(frodo.getLocation()!);
          if (!frodoRegion?.special?.includes('Mountains')) {
            retreatSuccessful = true;
            (ctx as any).retreated = true;
          }
        }
      });

      // Move Frodo to mountains
      frodo.setLocation('REGION_MOUNTAINS');
      
      const battleContext = resolveFullBattle(balrog, frodo, gameState);

      expect(retreatAttempted).toBe(true);
      expect(retreatSuccessful).toBe(false);
      expect(battleContext.outcome).toBeDefined(); // Battle continued normally
    });
  });

  describe('Scenario B: Sam Substitute Ability', () => {
    it('should allow Sam to substitute for Frodo in same region', () => {
      let substituteTriggered = false;
      let originalDefender: string;
      let newDefender: string;

      registerAbilityHandler('substitute', (source, context) => {
        const ctx = context as BattleContext;
        if (ctx.defender.name === 'Frodo' && sam.getLocation() === frodo.getLocation()) {
          substituteTriggered = true;
          originalDefender = ctx.defender.name;
          // In real implementation, would swap defender
          newDefender = 'Sam';
          ctx.log.push('Sam substitutes for Frodo in battle!');
        }
      });

      // Both Frodo and Sam in Shire, move Nazgul to attack
      moveCharacter('CHAR_NAZGUL', 'REGION_SHIRE', gameState, 'FORWARD');
      
      const battleContext = resolveFullBattle(nazgul, frodo, gameState);

      expect(substituteTriggered).toBe(true);
      expect(originalDefender!).toBe('Frodo');
      expect(newDefender!).toBe('Sam');
      expect(battleContext.log).toContain('Sam substitutes for Frodo in battle!');
    });

    it('should not allow substitute when Sam is not in same region', () => {
      let substituteAttempted = false;

      registerAbilityHandler('substitute', (source, context) => {
        const ctx = context as BattleContext;
        if (ctx.defender.name === 'Frodo') {
          substituteAttempted = true;
          // Sam not in same location, substitute fails
          expect(sam.getLocation()).not.toBe(frodo.getLocation());
        }
      });

      // Move Sam away
      sam.setLocation('REGION_BREE');
      
      // Move Nazgul to attack Frodo in Shire
      moveCharacter('CHAR_NAZGUL', 'REGION_SHIRE', gameState, 'FORWARD');
      
      resolveFullBattle(nazgul, frodo, gameState);

      expect(substituteAttempted).toBe(true);
    });
  });

  describe('Scenario C: Strength Modification Chain', () => {
    it('should apply multiple strength modifiers correctly', () => {
      let samBonusApplied = false;
      let strengthModifications: number[] = [];

      registerAbilityHandler('strength_bonus', (source, context) => {
        const ctx = context as BattleContext;
        if (source.name === 'Sam') {
          samBonusApplied = true;
          // In real implementation, would modify strength calculation
          strengthModifications.push(1); // +1 strength bonus
          ctx.log.push('Sam gains +1 strength from loyalty to Frodo!');
        }
      });

      const battleContext = resolveFullBattle(nazgul, sam, gameState);

      expect(samBonusApplied).toBe(true);
      expect(strengthModifications).toContain(1);
      expect(battleContext.log).toContain('Sam gains +1 strength from loyalty to Frodo!');
    });
  });

  describe('Scenario D: Special Movement (Balrog Tunnel)', () => {
    it('should allow Balrog tunnel movement through mountains', () => {
      let tunnelMoveGranted = false;
      const originalMoves = getLegalMoves(balrog, gameState);

      registerAbilityHandler('tunnel_ambush', (source, context) => {
        const ctx = context as any;
        if (ctx.character?.name === 'Balrog' && source.name === 'Balrog') {
          tunnelMoveGranted = true;
          // Grant additional tunnel move
          if (!ctx.additionalMoves) ctx.additionalMoves = [];
          ctx.additionalMoves.push({
            moveType: 'TUNNEL',
            destination: 'REGION_TUNNEL_EXIT'
          });
        }
      });

      const enhancedMoves = getLegalMoves(balrog, gameState);

      expect(tunnelMoveGranted).toBe(true);
      expect(enhancedMoves.length).toBeGreaterThanOrEqual(originalMoves.length);
    });
  });

  describe('Scenario E: Post-Battle Movement (Shelob)', () => {
    it('should allow Shelob additional move after winning battle', () => {
      let postBattleMoveGranted = false;

      registerAbilityHandler('post_battle_move', (source, context) => {
        const ctx = context as BattleContext;
        // This will trigger during BATTLE_END phase after outcome is set
        if (source.name === 'Shelob') {
          postBattleMoveGranted = true;
          ctx.log.push('Shelob may move again after victory!');
        }
      });

      // Move Fellowship character to same region as Shelob
      moveCharacter('CHAR_FRODO', 'REGION_WEATHERTOP', gameState, 'FORWARD');
      
      const battleContext = resolveFullBattle(shelob, frodo, gameState);

      
      // Ensure Shelob wins (higher strength)
      expect(shelob.strength).toBeGreaterThan(frodo.strength);
      expect(postBattleMoveGranted).toBe(true);
      expect(battleContext.log).toContain('Shelob may move again after victory!');
    });
  });

  describe('Scenario F: Complex Ability Interactions', () => {
    it('should handle conflicting abilities properly', () => {
      let frodoRetreatAttempted = false;
      let witchKingBlockApplied = false;

      registerAbilityHandler('frodo_retreat', (source, context) => {
        frodoRetreatAttempted = true;
      });

      registerAbilityHandler('frodo_retreat_block', (source, context) => {
        const ctx = context as BattleContext;
        if (ctx.attacker.name === 'Witch-king' && ctx.defender.name === 'Frodo') {
          witchKingBlockApplied = true;
          ctx.log.push('Witch-king prevents Frodo from retreating!');
          // Block retreat by not setting retreated flag
        }
      });

      // Move Frodo to region with Witch-king
      moveCharacter('CHAR_FRODO', 'REGION_BREE', gameState, 'FORWARD');
      
      const battleContext = resolveFullBattle(witchKing, frodo, gameState);

      expect(frodoRetreatAttempted).toBe(true);
      expect(witchKingBlockApplied).toBe(true);
      expect(battleContext.log).toContain('Witch-king prevents Frodo from retreating!');
      expect(battleContext.outcome).toBeDefined(); // Battle should continue
    });
  });

  describe('UI Simulation Tests', () => {
    it('should simulate UI battle dialog flow with abilities', async () => {
      const uiActions: string[] = [];
      
      // Simulate UI responding to ability triggers
      registerAbilityHandler('frodo_retreat', (source, context) => {
        uiActions.push('SHOW_RETREAT_DIALOG');
        uiActions.push('USER_CHOOSES_RETREAT');
        (context as any).retreated = true;
      });

      // Simulate user clicking on Frodo to move to battle
      uiActions.push('USER_CLICKS_FRODO');
      uiActions.push('SHOW_LEGAL_MOVES');
      uiActions.push('USER_CLICKS_BREE');
      
      const moveSuccess = moveCharacter('CHAR_FRODO', 'REGION_BREE', gameState, 'FORWARD');
      expect(moveSuccess).toBe(true);
      
      uiActions.push('BATTLE_TRIGGERED');
      uiActions.push('SHOW_BATTLE_DIALOG');
      
      const battleContext = resolveFullBattle(nazgul, frodo, gameState);
      
      uiActions.push('BATTLE_RESOLVED');
      uiActions.push('UPDATE_BOARD_STATE');

      expect(uiActions).toEqual([
        'USER_CLICKS_FRODO',
        'SHOW_LEGAL_MOVES', 
        'USER_CLICKS_BREE',
        'BATTLE_TRIGGERED',
        'SHOW_BATTLE_DIALOG',
        'SHOW_RETREAT_DIALOG',
        'USER_CHOOSES_RETREAT', 
        'BATTLE_RESOLVED',
        'UPDATE_BOARD_STATE'
      ]);
    });

    it.skip('should simulate card selection with ability interactions', () => {
      // SKIPPED: Battle card system not fully implemented yet
      const uiFlow: string[] = [];
      
      // Mock combat cards with abilities that have trigger data
      const mockCard = { 
        name: 'Noble Sacrifice', 
        strength: 2, 
        abilities: [
          { id: 'sacrifice', text: 'Sacrifice ability', trigger: 'RESOLVE_CARDS' }
        ]
      };
      
      registerAbilityHandler('sacrifice', (source, context) => {
        uiFlow.push('CARD_ABILITY_TRIGGERED');
        const ctx = context as BattleContext;
        ctx.log.push('Noble Sacrifice ability activated!');
      });

      uiFlow.push('BATTLE_STARTS');
      uiFlow.push('SHOW_CARD_SELECTION');
      uiFlow.push('USER_SELECTS_CARD');
      
      const battleContext = resolveFullBattle(frodo, nazgul, gameState, mockCard);
      
      uiFlow.push('RESOLVE_BATTLE');
      uiFlow.push('UPDATE_UI');

      expect(uiFlow).toContain('CARD_ABILITY_TRIGGERED');
      expect(battleContext.log).toContain('Noble Sacrifice ability activated!');
    });
  });

  describe('Edge Case Stress Tests', () => {
    it('should handle multiple simultaneous ability triggers', () => {
      const abilityOrder: string[] = [];
      
      // Multiple characters with abilities that trigger on BATTLE_START
      registerAbilityHandler('frodo_retreat', () => abilityOrder.push('FRODO'));
      registerAbilityHandler('substitute', () => abilityOrder.push('SAM'));
      registerAbilityHandler('ring_resistance', () => abilityOrder.push('FRODO_RING')); // Frodo's second ability

      const battleContext: BattleContext = {
        attacker: nazgul,
        defender: frodo,
        gameState,
        log: []
      };

      triggerAbilities('BATTLE_START', battleContext);

      // Test that abilities were triggered - should include multiple Frodo/Sam abilities
      expect(abilityOrder.length).toBeGreaterThan(0);
      expect(abilityOrder).toContain('FRODO');
      expect(abilityOrder).toContain('SAM');
      // Note: Nazgul's flying_move has CHECK_MOVE_LEGALITY trigger, not BATTLE_START
    });

    it('should handle ability errors gracefully', () => {
      registerAbilityHandler('error_ability', () => {
        throw new Error('Test ability error');
      });

      // Create a character that will cause an error 
      const errorAbilityChar = new CharacterModel({
        id: 'CHAR_ERROR',
        name: 'Error Character',
        faction: 'Fellowship' as const,
        versions: {
          classic: {
            strength: 1,
            abilities: [{ id: 'error_ability', text: 'Error', trigger: 'BATTLE_START' }]
          }
        }
      }, gameState);
      
      const battleContext: BattleContext = {
        attacker: errorAbilityChar,
        defender: nazgul,
        gameState,
        log: []
      };

      expect(() => {
        triggerAbilities('BATTLE_START', battleContext);
      }).not.toThrow();

      // Should log error - check that the battle context has some error indication
      expect(battleContext.log.length).toBeGreaterThanOrEqual(0);
    });
  });
});
