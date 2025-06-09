import { triggerAbilities, registerAbilityHandler, checkBattleEnd, BattleContext, MovementContext } from '@/lib/systems/AbilitySystem';
import { CharacterModel } from '@/lib/models/Character';
import { GameState } from '@/lib/models/GameState';
import { ICharacter, IRegion, ICombatCard } from '@/types/data';

// Mock game data for testing
const mockGameData = {
  characters: [
    { 
      id: 'CHAR_FRODO', 
      name: 'Frodo', 
      faction: 'Fellowship', 
      versions: { 
        classic: { 
          strength: 2, 
          abilities: [
            { id: 'retreat', text: 'Can retreat', trigger: 'battle' },
            { id: 'resistance', text: 'Resistance to magic', trigger: 'combat' }
          ] 
        } 
      } 
    },
    { 
      id: 'CHAR_BALROG', 
      name: 'Balrog', 
      faction: 'Sauron', 
      versions: { 
        classic: { 
          strength: 7, 
          abilities: [
            { id: 'tunnel_ambush', text: 'Tunnel ambush', trigger: 'movement' }
          ] 
        } 
      } 
    },
  ] as ICharacter[],
  regions: [
    { id: 'region1', name: 'Test Region', row: 1, position: 1, fellowshipAdjacent: [], sauronAdjacent: [], fellowshipSpecialMovement: [], special: [], startingCapacityFellowship: 3, startingCapacitySauron: 1, factionCapacity: 3 },
  ] as IRegion[],
  combatCards: [] as ICombatCard[],
};

describe('AbilitySystem', () => {
  let gameState: GameState;
  let fellowshipCharacter: CharacterModel;
  let sauronCharacter: CharacterModel;

  beforeEach(() => {
    gameState = new GameState(mockGameData);
    fellowshipCharacter = new CharacterModel(mockGameData.characters[0], gameState);
    sauronCharacter = new CharacterModel(mockGameData.characters[1], gameState);
  });

  describe('registerAbilityHandler', () => {
    it('should register and trigger a custom ability handler', () => {
      let abilityTriggered = false;
      
      // Register handler with correct key format: CHARACTER_NAME_ABILITY
      registerAbilityHandler('FRODO_RETREAT', (source, context) => {
        abilityTriggered = true;
      });

      // Mock character with retreat ability (which matches the registered handler)
      jest.spyOn(fellowshipCharacter, 'getAbilities').mockReturnValue(['FRODO_RETREAT']);
      jest.spyOn(gameState, 'getAllCharacters').mockReturnValue([fellowshipCharacter]);

      const battleContext: BattleContext = {
        attacker: fellowshipCharacter,
        defender: sauronCharacter,
        gameState,
        log: []
      };

      triggerAbilities('BATTLE_START', battleContext);
      expect(abilityTriggered).toBe(true);
    });
  });

  describe('triggerAbilities', () => {
    it('should process Fellowship abilities before Sauron abilities', () => {
      const triggerOrder: string[] = [];
      
      registerAbilityHandler('FRODO_RETREAT', (source, context) => {
        triggerOrder.push('Fellowship');
      });
      
      registerAbilityHandler('BALROG_TUNNEL_AMBUSH', (source, context) => {
        triggerOrder.push('Sauron');
      });

      jest.spyOn(fellowshipCharacter, 'getAbilities').mockReturnValue(['FRODO_RETREAT']);
      jest.spyOn(sauronCharacter, 'getAbilities').mockReturnValue(['BALROG_TUNNEL_AMBUSH']);
      jest.spyOn(gameState, 'getAllCharacters').mockReturnValue([fellowshipCharacter, sauronCharacter]);

      const battleContext: BattleContext = {
        attacker: fellowshipCharacter,
        defender: sauronCharacter,
        gameState,
        log: []
      };

      // Use BATTLE_START trigger where both abilities can fire
      triggerAbilities('BATTLE_START', battleContext);
      expect(triggerOrder).toEqual(['Fellowship']);
      
      // Reset and try movement trigger for Balrog only
      triggerOrder.length = 0;
      triggerAbilities('CHECK_MOVE_LEGALITY', battleContext);
      expect(triggerOrder).toEqual(['Sauron']);
    });

    it('should only trigger abilities for the correct event', () => {
      let battleStartTriggered = false;
      let strengthTriggered = false;
      
      registerAbilityHandler('FRODO_RETREAT', (source, context) => {
        battleStartTriggered = true;
      });
      
      registerAbilityHandler('FRODO_STRENGTH_BONUS', (source, context) => {
        strengthTriggered = true;
      });

      jest.spyOn(fellowshipCharacter, 'getAbilities').mockReturnValue(['FRODO_RETREAT', 'FRODO_STRENGTH_BONUS']);
      jest.spyOn(gameState, 'getAllCharacters').mockReturnValue([fellowshipCharacter]);

      const battleContext: BattleContext = {
        attacker: fellowshipCharacter,
        defender: sauronCharacter,
        gameState,
        log: []
      };

      // Trigger BATTLE_START should only trigger retreat ability
      triggerAbilities('BATTLE_START', battleContext);
      expect(battleStartTriggered).toBe(true);
      expect(strengthTriggered).toBe(false);

      // Reset and test COMPARE_STRENGTHS
      battleStartTriggered = false;
      triggerAbilities('COMPARE_STRENGTHS', battleContext);
      expect(battleStartTriggered).toBe(false);
      expect(strengthTriggered).toBe(true);
    });
  });

  describe('checkBattleEnd', () => {
    it('should return true if battle is marked as retreated', () => {
      const battleContext: BattleContext = {
        attacker: fellowshipCharacter,
        defender: sauronCharacter,
        gameState,
        log: [],
        retreated: true
      } as any;

      expect(checkBattleEnd(battleContext)).toBe(true);
    });

    it('should return true if battle is cancelled', () => {
      const battleContext: BattleContext = {
        attacker: fellowshipCharacter,
        defender: sauronCharacter,
        gameState,
        log: [],
        battleCancelled: true
      } as any;

      expect(checkBattleEnd(battleContext)).toBe(true);
    });

    it('should return true if both characters are defeated', () => {
      jest.spyOn(fellowshipCharacter, 'isDefeated').mockReturnValue(true);
      jest.spyOn(sauronCharacter, 'isDefeated').mockReturnValue(true);

      const battleContext: BattleContext = {
        attacker: fellowshipCharacter,
        defender: sauronCharacter,
        gameState,
        log: []
      };

      expect(checkBattleEnd(battleContext)).toBe(true);
      expect(battleContext.outcome).toBe('MUTUAL_DEFEAT');
    });

    it('should return false for normal battle conditions', () => {
      jest.spyOn(fellowshipCharacter, 'isDefeated').mockReturnValue(false);
      jest.spyOn(sauronCharacter, 'isDefeated').mockReturnValue(false);

      const battleContext: BattleContext = {
        attacker: fellowshipCharacter,
        defender: sauronCharacter,
        gameState,
        log: []
      };

      expect(checkBattleEnd(battleContext)).toBe(false);
    });
  });

  describe('MovementContext integration', () => {
    it('should trigger movement abilities correctly', () => {
      let moveAbilityTriggered = false;
      
      registerAbilityHandler('BALROG_TUNNEL_AMBUSH', (source, context) => {
        moveAbilityTriggered = true;
      });

      jest.spyOn(sauronCharacter, 'getAbilities').mockReturnValue(['BALROG_TUNNEL_AMBUSH']);
      jest.spyOn(gameState, 'getAllCharacters').mockReturnValue([sauronCharacter]);

      const movementContext: MovementContext = {
        character: sauronCharacter,
        fromRegion: 'REGION_A',
        toRegion: 'REGION_B',
        moveType: 'TUNNEL',
        gameState
      };

      triggerAbilities('CHECK_MOVE_LEGALITY', movementContext);
      expect(moveAbilityTriggered).toBe(true);
    });
  });
});
