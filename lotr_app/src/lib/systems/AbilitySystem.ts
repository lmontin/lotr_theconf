import { CharacterModel } from '../models/Character';
import { GameState } from '../models/GameState';
import { logAbility, logTrace, logError } from '../utils/detailedLogger';

// Ability trigger events
export type AbilityTrigger = 
  | 'BATTLE_START'
  | 'PRE_BATTLE_SUBSTITUTE'  // For Sam's substitute ability (before other BATTLE_START abilities)
  | 'RESOLVE_CARDS'
  | 'COMPARE_STRENGTHS'
  | 'BATTLE_END'
  | 'MOVE_START'
  | 'MOVE_END'
  | 'CHECK_MOVE_LEGALITY'
  | 'TURN_START'
  | 'TURN_END'
  | 'GAME_START'
  | 'REVEAL_CHARACTER'
  | 'CHARACTER_DEFEATED';

// Battle context for ability triggers
export interface BattleContext {
  attacker: CharacterModel;
  defender: CharacterModel;
  gameState: GameState;
  attackerCard?: any;
  defenderCard?: any;
  log: string[];
  outcome?: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'MUTUAL_DEFEAT';
  skipCardPlay?: boolean;
  fellowshipCharacter?: CharacterModel;
  sauronCharacter?: CharacterModel;
  cardsPlayed?: { [faction: string]: any };
  additionalMoves?: Array<{ moveType: string; destination: string }>;
  battlePhase?: 'REVEAL' | 'PRE_SUBSTITUTION' | 'ABILITIES' | 'CARDS' | 'STRENGTH' | 'END';
}

// Movement context for ability triggers
export interface MovementContext {
  character: CharacterModel;
  fromRegion?: string;
  toRegion?: string;
  moveType?: 'NORMAL' | 'TUNNEL' | 'RIVER' | 'SPECIAL';
  gameState: GameState;
  availableMoves?: Array<{ moveType: string; destination: string }>;
  additionalMoves?: Array<{ moveType: string; destination: string }>;
  isLegal?: boolean;
}

// General game context
export interface GameContext {
  gameState: GameState;
  character?: CharacterModel;
  faction?: string;
  trigger: AbilityTrigger;
  [key: string]: any;
}

// Ability handler function type
export type AbilityHandler = (
  source: CharacterModel | any, 
  context: BattleContext | MovementContext | GameContext
) => void;

// Registry of ability handlers
const abilityHandlers: { [key: string]: AbilityHandler } = {};

/**
 * Register an ability handler for a specific ability key
 */
export function registerAbilityHandler(abilityKey: string, handler: AbilityHandler): void {
  abilityHandlers[abilityKey] = handler;
}

/**
 * Trigger abilities for a specific event
 * Processes Fellowship abilities first, then Sauron abilities
 */
export function triggerAbilities(
  trigger: AbilityTrigger,
  context: BattleContext | MovementContext | GameContext
): void {
  const gameState = context.gameState;
  
  logAbility('AbilitySystem', 'triggerAbilities', `Triggering abilities for: ${trigger}`, {
    trigger,
    contextType: 'attacker' in context ? 'battle' : 'character' in context ? 'movement' : 'game',
    gamePhase: gameState.getCurrentPhase?.(),
    currentPlayer: gameState.getCurrentPlayer?.()
  });
  
  // For battle contexts with locked-in participants, only process abilities for battling characters
  if ('attacker' in context && 'defender' in context && context.attacker && context.defender) {
    const battleContext = context as BattleContext;
    
    logAbility('AbilitySystem', 'triggerAbilities', 'Processing battle context abilities', {
      trigger,
      attacker: { id: battleContext.attacker.id, name: battleContext.attacker.name },
      defender: { id: battleContext.defender.id, name: battleContext.defender.name }
    });
    
    // For certain triggers that happen after defender is locked in, only process battling characters
    // Process Fellowship character first if applicable (per game rules)
    const characters = [battleContext.attacker, battleContext.defender].sort((a, b) => {
      // Fellowship abilities process first
      if (a.faction === 'Fellowship' && b.faction !== 'Fellowship') return -1;
      if (b.faction === 'Fellowship' && a.faction !== 'Fellowship') return 1;
      return 0;
    });
    
    for (const character of characters) {
      processCharacterAbilities(character, trigger, context);
    }
    
    // Process any combat cards
    if (battleContext.attackerCard) {
      processCardAbilities(battleContext.attackerCard, trigger, context);
    }
    if (battleContext.defenderCard) {
      processCardAbilities(battleContext.defenderCard, trigger, context);
    }
    // If it's a battle context, we've processed the relevant characters/cards, so return.
    return;
  }
  
  // For non-battle contexts, process all characters
  let allCharacters: any[] = [];
  
  // Try to get all characters, with fallback for different gameState implementations
  if (typeof gameState.getAllCharacters === 'function') {
    allCharacters = gameState.getAllCharacters();
  } else if ((gameState as any).characters && Array.isArray((gameState as any).characters)) {
    allCharacters = (gameState as any).characters;
  } else {
    // If no characters are available, just return
    return;
  }
  
  const fellowshipCharacters = allCharacters
    .filter(char => char && char.faction === 'Fellowship' && !char.isDefeated());
  
  const sauronCharacters = allCharacters
    .filter(char => char && char.faction === 'Sauron' && !char.isDefeated());

  // Process Fellowship abilities first (per game rules)
  for (const character of fellowshipCharacters) {
    processCharacterAbilities(character, trigger, context);
  }

  // Then process Sauron abilities
  for (const character of sauronCharacters) {
    processCharacterAbilities(character, trigger, context);
  }

  // Process any combat cards that might have abilities
  if ('attackerCard' in context && context.attackerCard) {
    processCardAbilities(context.attackerCard, trigger, context);
  }
  if ('defenderCard' in context && context.defenderCard) {
    processCardAbilities(context.defenderCard, trigger, context);
  }
}

/**
 * Process abilities for a specific character
 */
function processCharacterAbilities(
  character: CharacterModel,
  trigger: AbilityTrigger,
  context: BattleContext | MovementContext | GameContext
): void {
  // Get character's abilities from their data
  const abilities = character.getAbilities?.() || [];
  
  logAbility('AbilitySystem', 'processCharacterAbilities', `Processing abilities for ${character.name}`, {
    characterId: character.id,
    characterName: character.name,
    trigger,
    abilitiesCount: abilities.length,
    abilities: abilities
  });
  
  for (const abilityId of abilities) {
    // Try the ability ID directly first (for test handlers and specific implementations)
    let handler = abilityHandlers[abilityId];
    
    // If not found, try the legacy pattern (CHARACTER_ABILITY format)
    if (!handler) {
      const legacyKey = `${character.name.toUpperCase().replace(/[^A-Z]/g, '_')}_${abilityId.toUpperCase().replace(/[^A-Z]/g, '_')}`;
      handler = abilityHandlers[legacyKey];
      
      logTrace('AbilitySystem', 'processCharacterAbilities', `Tried legacy key for ability: ${abilityId}`, {
        originalKey: abilityId,
        legacyKey,
        handlerFound: !!handler
      });
    }
    
    const shouldTrigger = shouldTriggerAbility(abilityId, trigger, character, context);
    
    logAbility('AbilitySystem', 'processCharacterAbilities', `Ability evaluation: ${abilityId}`, {
      characterName: character.name,
      abilityId,
      trigger,
      handlerExists: !!handler,
      shouldTrigger,
      contextType: 'character' in context ? 'movement' : 'attacker' in context ? 'battle' : 'game'
    });
    
    if (handler && shouldTrigger) {
      try {
        logAbility('AbilitySystem', 'processCharacterAbilities', `Executing ability: ${abilityId}`, {
          characterName: character.name,
          abilityId,
          trigger
        });
        
        handler(character, context);
        // Only log ability trigger if it's not a CHECK_MOVE_LEGALITY event,
        // as these abilities primarily add movement options and are not "triggered" in the traditional sense.
        if (trigger !== 'CHECK_MOVE_LEGALITY') {
          context.gameState.log(`[Ability] ${character.name}: ${abilityId} triggered`);
        }
        
        logAbility('AbilitySystem', 'processCharacterAbilities', `Ability executed successfully: ${abilityId}`, {
          characterName: character.name,
          abilityId
        });
      } catch (error) {
        logError('AbilitySystem', 'processCharacterAbilities', `Error triggering ability ${abilityId}`, {
          characterName: character.name,
          abilityId,
          error: error instanceof Error ? error.message : String(error)
        });
        console.error(`Error triggering ability ${abilityId}:`, error);
        context.gameState.log(`[Error] Failed to trigger ${character.name} ability: ${abilityId}`);
      }
    } else if (!handler) {
      logTrace('AbilitySystem', 'processCharacterAbilities', `No handler found for ability: ${abilityId}`, {
        characterName: character.name,
        abilityId,
        trigger
      });
    } else if (!shouldTrigger) {
      logTrace('AbilitySystem', 'processCharacterAbilities', `Ability should not trigger: ${abilityId}`, {
        characterName: character.name,
        abilityId,
        trigger
      });
    }
  }
}

/**
 * Process abilities for combat cards
 */
function processCardAbilities(
  card: any,
  trigger: AbilityTrigger,
  context: BattleContext | MovementContext | GameContext
): void {
  if (!card.abilities) return;
  
  for (const ability of card.abilities) {
    // Handle both string abilities and object abilities
    const abilityId = typeof ability === 'object' ? ability.id : ability;
    
    // Try the ability ID directly first
    let handler = abilityHandlers[abilityId];
    
    // If not found, try the legacy card pattern
    if (!handler) {
      const cardKey = `CARD_${abilityId.toUpperCase().replace(/[^A-Z]/g, '_')}`;
      handler = abilityHandlers[cardKey];
    }
    
    if (handler && shouldTriggerCardAbility(abilityId, trigger, card, context)) {
      try {
        handler(card, context);
        context.gameState.log(`[Card Ability] ${card.name}: ${abilityId} triggered`);
      } catch (error) {
        console.error(`Error triggering card ability ${abilityId}:`, error);
        context.gameState.log(`[Error] Failed to trigger card ability: ${abilityId}`);
      }
    }
  }
}

// Mapping of ability IDs to their default trigger types
const ABILITY_TRIGGER_MAP: { [key: string]: AbilityTrigger } = {
  'SAM_SUBSTITUTE': 'PRE_BATTLE_SUBSTITUTE',
  'FRODO_RETREAT': 'BATTLE_START',
  'MERRY_VS_WITCHKING': 'BATTLE_START',
  'PIPPIN_RETREAT': 'BATTLE_START',
  'GANDALF_REVEAL_CARD': 'BATTLE_START',
  'ARAGORN_SPECIAL_ATTACK': 'BATTLE_START',
  'LEGOLAS_VS_FLYING_NAZGUL': 'BATTLE_START',
  'GIMLI_VS_ORCS': 'BATTLE_START',
  'WITCHKING_SIDEWAYS_ATTACK': 'MOVE_END',
  'ORCS_FIRST_STRIKE': 'BATTLE_START',
  'MAGIC_RESISTANCE': 'RESOLVE_CARDS',
  'CARD_DRAW': 'RESOLVE_CARDS',
  'SAM_STRENGTH_BONUS': 'COMPARE_STRENGTHS',
  'FRODO_STRENGTH_BONUS': 'COMPARE_STRENGTHS',
  'SHELOB_POST_BATTLE_MOVE': 'BATTLE_END',
  'WITCHKING_FRODO_RETREAT_OPTION': 'BATTLE_END',
  'BOROMIR_MUTUAL_DESTRUCTION': 'BATTLE_END',
  'BALROG_TUNNEL_AMBUSH': 'CHECK_MOVE_LEGALITY',
  'FLYING_NAZGUL_SPECIAL_MOVE': 'CHECK_MOVE_LEGALITY',
  'BLACK_RIDER_LONG_CHARGE': 'CHECK_MOVE_LEGALITY',
  'AMBUSH': 'MOVE_END',
  'REVEAL_ENEMIES': 'MOVE_END',
  // Generic abilities that might not have specific character prefixes
  'SUBSTITUTE': 'PRE_BATTLE_SUBSTITUTE',
  'RETREAT': 'BATTLE_START',
  'REVEAL_CARD': 'BATTLE_START',
  'SPECIAL_ATTACK': 'BATTLE_START',
  'STRENGTH_BONUS': 'COMPARE_STRENGTHS',
  'VS_SPECIFIC': 'COMPARE_STRENGTHS',
  'POST_BATTLE_MOVE': 'BATTLE_END',
  'RETREAT_OPTION': 'BATTLE_END',
  'SPECIAL_MOVE': 'CHECK_MOVE_LEGALITY',
  'TUNNEL_AMBUSH': 'CHECK_MOVE_LEGALITY',
  'SIDEWAYS_ATTACK': 'CHECK_MOVE_LEGALITY',
  // Lowercase versions from the old switch statement
  'frodo_retreat': 'BATTLE_START',
  'ring_resistance': 'BATTLE_START',
  'frodo_retreat_block': 'BATTLE_START',
  'strength_bonus': 'COMPARE_STRENGTHS',
  'post_battle_move': 'BATTLE_END',
  'flying_move': 'CHECK_MOVE_LEGALITY',
  'tunnel_ambush': 'CHECK_MOVE_LEGALITY',
  'ARAGORN_SPECIAL_ATTACK_MOVE': 'BATTLE_START',
  'sideways_attack': 'MOVE_END',
  'sacrifice': 'BATTLE_END', // From shouldTriggerCardAbility
  'RETRIEVE': 'BATTLE_END', // From shouldTriggerCardAbility
  'DISCARD_PROTECTION': 'BATTLE_END', // From shouldTriggerCardAbility
};

/**
 * Determine if a character ability should trigger for the given event
 */
function shouldTriggerAbility(
  abilityId: string,
  trigger: AbilityTrigger,
  character: CharacterModel,
  context: BattleContext | MovementContext | GameContext
): boolean {
  // Get the actual ability data to check its trigger
  const characterData = character.getCurrentVersionData();
  if (characterData.abilities) {
    const abilityData = characterData.abilities.find(ability => ability.id === abilityId);
    if (abilityData && abilityData.trigger) {
      return abilityData.trigger === trigger;
    }
  }
  
  // Fallback to the predefined map if trigger is not explicitly defined in ability data
  const defaultTrigger = ABILITY_TRIGGER_MAP[abilityId];
  if (defaultTrigger) {
    return defaultTrigger === trigger;
  }

  // If no explicit trigger in data and no default mapping, it should not trigger.
  return false;
}

// Mapping of card ability IDs to their default trigger types
const CARD_ABILITY_TRIGGER_MAP: { [key: string]: AbilityTrigger } = {
  'RETRIEVE': 'BATTLE_END',
  'DISCARD_PROTECTION': 'BATTLE_END',
  'sacrifice': 'BATTLE_END',
  // Most card abilities trigger during card resolution if not specified
  // This is a general fallback, specific card abilities should define their trigger
};

/**
 * Determine if a card ability should trigger for the given event
 */
function shouldTriggerCardAbility(
  abilityId: string,
  trigger: AbilityTrigger,
  card: any,
  context: BattleContext | MovementContext | GameContext
): boolean {
  // Check if card has ability data with triggers
  if (card.abilities && Array.isArray(card.abilities) && card.abilities.length > 0) {
    const abilityData = card.abilities.find((ability: any) => {
      if (typeof ability === 'object' && ability.id === abilityId) {
        return true;
      } else if (typeof ability === 'string' && ability === abilityId) {
        return true;
      }
      return false;
    });
    
    if (abilityData && typeof abilityData === 'object' && abilityData.trigger) {
      return abilityData.trigger === trigger;
    }
  }
  
  // Fallback to the predefined map if trigger is not explicitly defined in card ability data
  const defaultTrigger = CARD_ABILITY_TRIGGER_MAP[abilityId];
  if (defaultTrigger) {
    return defaultTrigger === trigger;
  }

  // If no explicit trigger in data and no default mapping, it should not trigger.
  // For RESOLVE_CARDS, if no specific trigger is found, it's a general fallback.
  if (trigger === 'RESOLVE_CARDS') {
    return true; // Most card abilities trigger during card resolution
  }
  
  return false;
}

/**
 * Check if battle should end early due to ability effects
 */
export function checkBattleEnd(context: BattleContext): boolean {
  // Check if either character has retreated or been substituted
  if ('retreated' in context && context.retreated) {
    return true;
  }
  
  // Check if battle was cancelled by an ability
  if ('battleCancelled' in context && context.battleCancelled) {
    return true;
  }
  
  // Check if both characters are defeated
  const attackerDefeated = typeof context.attacker.isDefeated === 'function' 
    ? context.attacker.isDefeated() 
    : context.attacker.defeated || false;
  const defenderDefeated = typeof context.defender.isDefeated === 'function' 
    ? context.defender.isDefeated() 
    : context.defender.defeated || false;
    
  if (attackerDefeated && defenderDefeated) {
    context.outcome = 'MUTUAL_DEFEAT';
    return true;
  }
  
  return false;
}

/**
 * Initialize default ability handlers (placeholder implementations)
 */
function initializeDefaultHandlers(): void {
  // Fellowship character abilities
  
  /**
   * Frodo's retreat ability - can retreat sideways when defending (not in mountains)
   */
  registerAbilityHandler('FRODO_RETREAT', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Frodo') {
      return;
    }
    
    const battleContext = context as BattleContext;
    
    if (!battleContext.defender || battleContext.defender.id !== source.id) {
      return; // Only triggers when Frodo is defending
    }
    
    const gameState = battleContext.gameState;
    const currentRegion = gameState.getRegionById(source.getLocation()!);
    
    if (!currentRegion) {
      return;
    }
    
    // Cannot retreat in mountains
    if (currentRegion.special && 
        (currentRegion.special === 'Mountains' || 
         (Array.isArray(currentRegion.special) && currentRegion.special.includes('Mountains')))) {
      gameState.log(`${source.name} cannot retreat - currently in the mountains`);
      return;
    }
    
    // Get sideways retreat options (Fellowship moves backward = Sauron's forward adjacent)
    const retreatOptions = currentRegion.sauronAdjacent || [];
    const validRetreats: string[] = [];
    
    for (const regionId of retreatOptions) {
      const retreatRegion = gameState.getRegionById(regionId);
      if (retreatRegion && retreatRegion.getOccupants('Fellowship').length < retreatRegion.getCapacity('Fellowship')) {
        validRetreats.push(regionId);
      }
    }
    
    if (validRetreats.length > 0) {
      // For now, choose the first valid retreat (in a full implementation, this would be player choice)
      const retreatDestination = validRetreats[0];
      const retreatRegion = gameState.getRegionById(retreatDestination)!;
      
      // Move Frodo to retreat location (this is a retreat, don't trigger battles)
      gameState.moveCharacter(source.id, retreatDestination, { isRetreat: true });
      
      gameState.log(`${source.name} retreats to ${retreatRegion.name}`);
      
      // Mark battle as cancelled due to retreat
      (battleContext as any).battleCancelled = true;
      (battleContext as any).retreated = true;
    } else {
      gameState.log(`${source.name} has no valid retreat options`);
    }
  });

  /**
   * Sam's substitute ability - can take Frodo's place if in same region and Frodo is attacked
   */
  registerAbilityHandler('SAM_SUBSTITUTE', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Sam') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const gameState = battleContext.gameState;
    
    // Check if Frodo is being attacked and Sam is in the same region
    if (!battleContext.defender || battleContext.defender.name !== 'Frodo') {
      return;
    }
    
    const frodo = battleContext.defender;
    const sam = source;
    
    if (sam.getLocation() !== frodo.getLocation()) {
      return; // Sam must be in same region as Frodo
    }
    
    if (sam.isDefeated() || sam.is_revealed) {
      return; // Sam must be concealed and not defeated
    }
    
    // Sam reveals himself and takes Frodo's place
    sam.is_revealed = true;
    gameState.log(`${sam.name} reveals himself to substitute for ${frodo.name}`);
    
    // Switch the defender in the battle context
    battleContext.defender = sam;
    if (battleContext.fellowshipCharacter === frodo) {
      battleContext.fellowshipCharacter = sam;
    }
    
    // Frodo remains concealed and safe
    gameState.log(`${frodo.name} is protected by ${sam.name}'s sacrifice`);
  });

  /**
   * Sam's strength bonus ability - strength becomes 5 when with Frodo
   */
  registerAbilityHandler('SAM_STRENGTH_BONUS', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Sam') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const gameState = battleContext.gameState;
    
    // Find Frodo in the same region
    const samLocation = source.getLocation();
    if (!samLocation) return;
    
    const region = gameState.getRegionById(samLocation);
    if (!region) return;
    
    const fellowshipCharacters = region.getOccupants('Fellowship');
    const frodoInRegion = fellowshipCharacters.some(char => {
      return char && char.name === 'Frodo' && !char.isDefeated();
    });
    
    if (frodoInRegion) {
      // Increase Sam's effective strength to 5
      (battleContext as any).samStrengthBonus = 5 - source.strength;
      gameState.log(`${source.name}'s strength becomes 5 due to being with Frodo`);
    }
  });

  /**
   * Pippin's retreat ability - can retreat backward when attacking
   */
  registerAbilityHandler('PIPPIN_RETREAT', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Pippin') {
      return;
    }
    
    const battleContext = context as BattleContext;
    if (!battleContext.attacker || battleContext.attacker.id !== source.id) {
      return; // Only triggers when Pippin is attacking
    }
    
    const gameState = battleContext.gameState;
    const currentRegion = gameState.getRegionById(source.getLocation()!);
    
    if (!currentRegion) {
      return;
    }
    
    // Get backward retreat options (Fellowship's backward = Sauron's forward adjacent)
    const retreatOptions = currentRegion.sauronAdjacent || [];
    const validRetreats: string[] = [];
    
    for (const regionId of retreatOptions) {
      const retreatRegion = gameState.getRegionById(regionId);
      if (retreatRegion && retreatRegion.getOccupants('Fellowship').length < retreatRegion.getCapacity('Fellowship')) {
        validRetreats.push(regionId);
      }
    }
    
    if (validRetreats.length > 0) {
      // For now, choose the first valid retreat (in a full implementation, this would be player choice)
      const retreatDestination = validRetreats[0];
      const retreatRegion = gameState.getRegionById(retreatDestination)!;
      
      // Move Pippin to retreat location (this is a retreat, don't trigger battles)
      gameState.moveCharacter(source.id, retreatDestination, { isRetreat: true });
      
      gameState.log(`${source.name} retreats to ${retreatRegion.name}`);
      
      // Mark battle as cancelled due to retreat
      (battleContext as any).battleCancelled = true;
      (battleContext as any).retreated = true;
    } else {
      gameState.log(`${source.name} has no valid retreat options`);
    }
  });

  /**
   * Merry vs Witch-king ability - automatically defeats Witch-king
   */
  registerAbilityHandler('MERRY_VS_WITCHKING', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Merry') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const opponent = source.id === battleContext.attacker?.id ? battleContext.defender : battleContext.attacker;
    
    if (!opponent || opponent.name !== 'Witch-king') {
      return; // Only triggers against Witch-king
    }
    
    const gameState = battleContext.gameState;
    
    // Defeat the Witch-king immediately
    opponent.setDefeated(true);
    gameState.log(`${source.name} automatically defeats the ${opponent.name}!`);
    
    // Set battle outcome
    if (source.id === battleContext.attacker?.id) {
      battleContext.outcome = 'ATTACKER_WIN';
    } else {
      battleContext.outcome = 'DEFENDER_WIN';
    }
    
    // Skip card play
    battleContext.skipCardPlay = true;
  });

  /**
   * Gandalf's reveal card ability - forces Sauron to reveal card first
   */
  registerAbilityHandler('GANDALF_REVEAL_CARD', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Gandalf') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const gameState = battleContext.gameState;
    
    // Mark that Sauron must reveal card first
    (battleContext as any).sauronRevealsFirst = true;
    gameState.log(`${source.name} forces Sauron to reveal their combat card first`);
  });

  /**
   * Aragorn's special attack move ability - can move in any direction when attacking
   */
  registerAbilityHandler('ARAGORN_SPECIAL_ATTACK_MOVE', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Aragorn') {
      return;
    }
    
    const movementContext = context as MovementContext;
    const gameState = movementContext.gameState;
    const currentRegion = gameState.getRegionById(source.getLocation()!);
    
    if (!currentRegion) {
      return;
    }
    
    // Add all adjacent regions (forward, backward, sideways) as potential moves if they contain enemies
    const allAdjacent = [
      ...(currentRegion.fellowshipAdjacent || []),
      ...(currentRegion.sauronAdjacent || [])
    ];
    
    const additionalMoves: Array<{ moveType: string; destination: string }> = [];
    
    for (const regionId of allAdjacent) {
      const region = gameState.getRegionById(regionId);
      // Only allow Aragorn to attack in the correct direction for his faction
      if (
        region &&
        region.containsEnemy('Fellowship') &&
        source.faction === 'Fellowship' &&
        (currentRegion.fellowshipAdjacent || []).includes(regionId)
      ) {
        additionalMoves.push({
          moveType: 'SPECIAL_ATTACK',
          destination: regionId
        });
      }
    }
    
    if (additionalMoves.length > 0) {
      // Prevent duplicates in additionalMoves
      const uniqueMoves = additionalMoves.filter((move, idx, arr) =>
        arr.findIndex(m => m.destination === move.destination && m.moveType === move.moveType) === idx
      );
      movementContext.additionalMoves = uniqueMoves;
      gameState.log(`${source.name} can attack in correct direction`);
    }
  });

  /**
   * Legolas vs Flying Nazgûl ability - defeats Flying Nazgûl before cards
   */
  registerAbilityHandler('LEGOLAS_VS_FLYING_NAZGUL', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Legolas') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const opponent = source.id === battleContext.attacker?.id ? battleContext.defender : battleContext.attacker;
    
    if (!opponent || opponent.name !== 'Flying Nazgûl') {
      return; // Only triggers against Flying Nazgûl
    }
    
    const gameState = battleContext.gameState;
    
    // Defeat the Flying Nazgûl immediately
    opponent.setDefeated(true);
    gameState.log(`${source.name} defeats the ${opponent.name} with his bow!`);
    
    // Set battle outcome
    if (source.id === battleContext.attacker?.id) {
      battleContext.outcome = 'ATTACKER_WIN';
    } else {
      battleContext.outcome = 'DEFENDER_WIN';
    }
    
    // Skip card play
    battleContext.skipCardPlay = true;
  });

  /**
   * Gimli vs Orcs ability - defeats Orcs before their ability
   */
  registerAbilityHandler('GIMLI_VS_ORCS', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Gimli') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const opponent = source.id === battleContext.attacker?.id ? battleContext.defender : battleContext.attacker;
    
    if (!opponent || opponent.name !== 'Orcs') {
      return; // Only triggers against Orcs
    }
    
    const gameState = battleContext.gameState;
    
    // Defeat the Orcs immediately, preventing their first strike
    opponent.setDefeated(true);
    gameState.log(`${source.name} defeats the ${opponent.name} before they can strike!`);
    
    // Set battle outcome
    if (source.id === battleContext.attacker?.id) {
      battleContext.outcome = 'ATTACKER_WIN';
    } else {
      battleContext.outcome = 'DEFENDER_WIN';
    }
    
    // Skip card play
    battleContext.skipCardPlay = true;
  });

  /**
   * Boromir's mutual destruction ability - both characters defeated (except vs Warg)
   */
  registerAbilityHandler('BOROMIR_MUTUAL_DESTRUCTION', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Boromir') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const opponent = source.id === battleContext.attacker?.id ? battleContext.defender : battleContext.attacker;
    
    if (!opponent) {
      return;
    }
    
    // Ability has no effect against Warg
    if (opponent.name === 'Warg') {
      const gameState = battleContext.gameState;
      gameState.log(`${source.name}'s ability has no effect against the ${opponent.name}`);
      return;
    }
    
    const gameState = battleContext.gameState;
    
    // Both characters are defeated immediately
    source.setDefeated(true, true); // Explicitly remove from board
    opponent.setDefeated(true, true); // Explicitly remove from board
    
    gameState.log(`${source.name} and ${opponent.name} are both defeated!`);
    
    // Set battle outcome
    battleContext.outcome = 'MUTUAL_DEFEAT';
    
    // Skip card play
    battleContext.skipCardPlay = true;
  });

  // Sauron character abilities
  
  /**
   * Balrog's tunnel ambush ability - defeats Fellowship character using tunnel without battle
   */
  registerAbilityHandler('BALROG_TUNNEL_AMBUSH', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Balrog') {
      return;
    }
    
    // This triggers after a Fellowship character moves through the tunnel
    const movementContext = context as MovementContext;
    const gameState = movementContext.gameState;
    
    // Check if Balrog is in Caradhras and tunnel was used
    if (source.getLocation() !== 'REGION_CARADHRAS') {
      return;
    }
    
    if (movementContext.moveType !== 'TUNNEL') {
      return;
    }
    
    const fellowshipCharacter = movementContext.character;
    if (!fellowshipCharacter || fellowshipCharacter.faction !== 'Fellowship') {
      return;
    }
    
    // Defeat the Fellowship character immediately
    fellowshipCharacter.setDefeated(true);
    gameState.log(`${source.name} ambushes ${fellowshipCharacter.name} in the tunnel!`);
  });

  /**
   * Shelob's post-battle move ability - moves to Gondor after winning a battle
   */
  registerAbilityHandler('SHELOB_POST_BATTLE_MOVE', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Shelob') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const gameState = battleContext.gameState;
    
    // Only triggers if Shelob won the battle
    if (battleContext.outcome !== 'ATTACKER_WIN' && battleContext.outcome !== 'DEFENDER_WIN') {
      return;
    }
    
    // Check if Shelob won (either as attacker or defender)
    const shelobWon = (battleContext.attacker?.id === source.id && battleContext.outcome === 'ATTACKER_WIN') ||
                      (battleContext.defender?.id === source.id && battleContext.outcome === 'DEFENDER_WIN');
    
    if (!shelobWon) {
      return;
    }
    
    // Check if battle is in Gondor
    if (source.getLocation() === 'REGION_GONDOR') {
      gameState.log(`${source.name} is already in Gondor`);
      return;
    }
    
    const gondorRegion = gameState.getRegionById('REGION_GONDOR');
    if (!gondorRegion) {
      gameState.log(`Error: Gondor region not found`);
      return;
    }
    
    // Check if Gondor is full or has Fellowship characters
    const gondorFellowshipCount = gondorRegion.getOccupants('Fellowship').length;
    const gondorSauronCount = gondorRegion.getOccupants('Sauron').length;
    
    if (gondorFellowshipCount > 0 || gondorSauronCount >= gondorRegion.getCapacity('Sauron')) {
      // Shelob is defeated and removed
      source.setDefeated(true);
      gameState.log(`${source.name} is defeated - Gondor is occupied or full`);
      return;
    }
    
    // Move Shelob to Gondor (normal movement, should trigger battle if enemies present)
    gameState.moveCharacter(source.id, 'REGION_GONDOR', { triggerBattle: true });
    gameState.log(`${source.name} moves to Gondor after her victory`);
  });

  /**
   * Witch-king's sideways attack ability - can move sideways when attacking
   */
  registerAbilityHandler('WITCHKING_SIDEWAYS_ATTACK', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Witch-king') {
      return;
    }
    
    const movementContext = context as MovementContext;
    const gameState = movementContext.gameState;
    const currentRegion = gameState.getRegionById(source.getLocation()!);
    
    if (!currentRegion) {
      return;
    }
    
    // Cannot move sideways in mountains
    if (currentRegion.special && 
        (currentRegion.special === 'Mountains' || 
         (Array.isArray(currentRegion.special) && currentRegion.special.includes('Mountains')))) {
      return;
    }
    
    // Add sideways moves where there are Fellowship characters to attack
    const sidewaysRegionIds = currentRegion.fellowshipAdjacent || [];
    const additionalMoves: Array<{ moveType: string; destination: string }> = [];
    
    for (const regionId of sidewaysRegionIds) {
      const region = gameState.getRegionById(regionId);
      if (region && region.containsEnemy('Sauron')) {
        additionalMoves.push({
          moveType: 'SIDEWAYS_ATTACK',
          destination: regionId
        });
      }
    }
    
    if (additionalMoves.length > 0) {
      movementContext.additionalMoves = additionalMoves;
      gameState.log(`${source.name} can attack sideways`);
    }
  });

  /**
   * Witch-king's Frodo retreat option - Frodo can retreat to Witch-king's previous position
   */
  registerAbilityHandler('WITCHKING_FRODO_RETREAT_OPTION', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Witch-king') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const gameState = battleContext.gameState;
    
    // Check if attacking Frodo in a sideways attack
    const opponent = battleContext.defender;
    if (!opponent || opponent.name !== 'Frodo') {
      return;
    }
    
    // Store the Witch-king's previous location for Frodo's potential retreat
    const previousLocation = (battleContext as any).witchkingPreviousLocation;
    if (previousLocation) {
      (battleContext as any).frodoSpecialRetreatOption = previousLocation;
      gameState.log(`${opponent.name} may retreat to the ${source.name}'s previous position`);
    }
  });

  /**
   * Flying Nazgûl's special move ability - can move to any region with single Fellowship character
   */
  registerAbilityHandler('FLYING_NAZGUL_SPECIAL_MOVE', (source, context) => {
    logAbility('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', 'Flying Nazgul ability triggered', {
      sourceId: source instanceof CharacterModel ? source.id : 'unknown',
      sourceName: source instanceof CharacterModel ? source.name : 'unknown',
      contextCharacterId: 'character' in context ? context.character?.id : 'none',
      contextCharacterName: 'character' in context ? context.character?.name : 'none'
    });

    if (!(source instanceof CharacterModel) || source.name !== 'Flying Nazgûl') {
      logAbility('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', 'Source validation failed', {
        isCharacterModel: source instanceof CharacterModel,
        sourceName: source instanceof CharacterModel ? source.name : typeof source
      });
      return;
    }
    
    const movementContext = context as MovementContext;
    // Only add moves if this ability is being checked for the character in question
    if (!movementContext.character || source.id !== movementContext.character.id) {
      logAbility('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', 'Character mismatch - ability not applicable', {
        sourceId: source.id,
        contextCharacterId: movementContext.character?.id,
        characterMatch: movementContext.character ? source.id === movementContext.character.id : false
      });
      return;
    }
    
    const gameState = movementContext.gameState;
    const additionalMoves: Array<{ moveType: string; destination: string }> = [];
    
    logAbility('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', 'Checking all regions for valid flying targets', {
      characterId: source.id,
      characterName: source.name,
      gamePhase: gameState.getCurrentPhase?.(),
      currentPlayer: gameState.getCurrentPlayer?.()
    });
    
    // Check all regions for single Fellowship characters
    const allRegions = gameState.getAllRegions();
    for (const region of allRegions) {
      const fellowshipCharacters = region.getOccupants('Fellowship');
      
      logTrace('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', `Checking region ${region.name}`, {
        regionId: region.id,
        regionName: region.name,
        fellowshipCharactersCount: fellowshipCharacters.length,
        fellowshipCharacters: fellowshipCharacters.map(c => ({ id: c.id, name: c.name })),
        hasSpecial: !!region.special,
        special: region.special
      });
      
      if (fellowshipCharacters.length === 1) {
        const move = {
          moveType: 'FLYING_MOVE',
          destination: region.id
        };
        additionalMoves.push(move);
        
        logAbility('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', 'Added flying move to region with single Fellowship character', {
          targetRegionId: region.id,
          targetRegionName: region.name,
          targetCharacter: { id: fellowshipCharacters[0].id, name: fellowshipCharacters[0].name },
          moveType: 'FLYING_MOVE'
        });
      }
      
      // Also check mountain regions with Fellowship characters for sideways movement
      if (region.special && 
          (region.special === 'Mountains' || 
           (Array.isArray(region.special) && region.special.includes('Mountains'))) &&
          fellowshipCharacters.length > 0) {
        const move = {
          moveType: 'FLYING_SIDEWAYS',
          destination: region.id
        };
        additionalMoves.push(move);
        
        logAbility('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', 'Added flying sideways move to mountain region', {
          targetRegionId: region.id,
          targetRegionName: region.name,
          fellowshipCharactersCount: fellowshipCharacters.length,
          moveType: 'FLYING_SIDEWAYS'
        });
      }
    }
    
    if (additionalMoves.length > 0) {
      movementContext.additionalMoves = additionalMoves;
      // Removed gameState.log as it was causing premature "triggering" perception
      
      logAbility('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', 'Flying Nazgul additional moves added', {
        totalAdditionalMoves: additionalMoves.length,
        moves: additionalMoves
      });
    } else {
      logAbility('AbilitySystem', 'FLYING_NAZGUL_SPECIAL_MOVE', 'No additional flying moves available', {
        allRegionsChecked: allRegions.length,
        regionsWithSingleFellowship: allRegions.filter(r => r.getOccupants('Fellowship').length === 1).length
      });
    }
  });

  /**
   * Black Rider's long charge ability - can move forward any number of regions when attacking
   */
  registerAbilityHandler('BLACK_RIDER_LONG_CHARGE', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Black Rider') {
      return;
    }
    
    const movementContext = context as MovementContext;
    const gameState = movementContext.gameState;
    const visited = new Set<string>();
    const additionalMoves: Array<{ moveType: string; destination: string }> = [];
    
    // Recursively find all forward regions with Fellowship characters
    function findForwardTargets(regionId: string, distance: number) {
      if (visited.has(regionId) || distance > 10) return; // Prevent infinite loops
      visited.add(regionId);
      
      const region = gameState.getRegionById(regionId);
      if (!region) return;
      
      // Check if this region has Fellowship characters and can be attacked
      if (distance > 0 && region.containsEnemy('Sauron')) {
        additionalMoves.push({
          moveType: 'LONG_CHARGE',
          destination: regionId
        });
      }
      
      // Continue forward
      const forwardRegions = region.sauronAdjacent || [];
      for (const nextRegionId of forwardRegions) {
        const nextRegion = gameState.getRegionById(nextRegionId);
        if (nextRegion &&
            nextRegion.getOccupants('Sauron').length < nextRegion.getCapacity('Sauron') &&
            !nextRegion.containsEnemy('Sauron')) {
          findForwardTargets(nextRegionId, distance + 1);
        }
      }
    }
    
    const currentLocation = source.getLocation();
    if (currentLocation) {
      findForwardTargets(currentLocation, 0);
    }
    
    if (additionalMoves.length > 0) {
      movementContext.additionalMoves = additionalMoves;
      // Removed gameState.log as it was causing premature "triggering" perception
    }
  });

  /**
   * Saruman's force strength comparison ability - can skip cards and use only strength
   */
  registerAbilityHandler('SARUMAN_FORCE_STRENGTH_COMPARISON', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Saruman') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const gameState = battleContext.gameState;
    
    // Check if opponent didn't retreat
    if ((battleContext as any).retreated) {
      return;
    }
    
    // Saruman can declare no cards are played
    battleContext.skipCardPlay = true;
    gameState.log(`${source.name} declares that no cards will be played - battle resolved by strength alone`);
  });

  /**
   * Orcs' first strike ability - defeats Fellowship character before other abilities
   */
  registerAbilityHandler('ORCS_FIRST_STRIKE', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Orcs') {
      return;
    }
    
    const battleContext = context as BattleContext;
    if (!battleContext.attacker || battleContext.attacker.id !== source.id) {
      return; // Only triggers when Orcs are attacking
    }
    
    const gameState = battleContext.gameState;
    const opponent = battleContext.defender;
    
    if (!opponent) {
      return;
    }
    
    // Defeat the Fellowship character immediately
    opponent.setDefeated(true);
    gameState.log(`${source.name} strike first and defeat ${opponent.name}!`);
    
    // Set battle outcome
    battleContext.outcome = 'ATTACKER_WIN';
    
    // Skip card play
    battleContext.skipCardPlay = true;
  });

  /**
   * Orcs' First Strike ability - defeats enemy before other abilities
   */
  registerAbilityHandler('ORCS_FIRST_STRIKE', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Orcs') {
      return;
    }

    const battleContext = context as BattleContext;
    const opponent = source.id === battleContext.attacker?.id ? battleContext.defender : battleContext.attacker;

    if (!opponent) {
      return;
    }

    // Orcs defeat the opponent immediately
    opponent.setDefeated(true, true); // Explicitly remove from board

    battleContext.gameState.log(`${source.name} uses First Strike to defeat ${opponent.name}!`);

    // Set battle outcome
    battleContext.outcome = 'ATTACKER_WIN'; // Orcs win by defeating opponent
    battleContext.skipCardPlay = true; // Skip card play phase

  });

  /**
   * Warg's negate ability - opposing Fellowship character's ability has no effect
   */
  registerAbilityHandler('WARG_NEGATE_ABILITY', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Warg') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const gameState = battleContext.gameState;
    
    // Mark that Fellowship abilities are negated
    (battleContext as any).fellowshipAbilitiesNegated = true;
    gameState.log(`${source.name} negates the opposing Fellowship character's abilities`);
  });

  /**
   * Cave Troll's negate Sauron card ability - Sauron's combat card has no effect
   */
  registerAbilityHandler('CAVE_TROLL_NEGATE_SAURON_CARD', (source, context) => {
    if (!(source instanceof CharacterModel) || source.name !== 'Cave Troll') {
      return;
    }
    
    const battleContext = context as BattleContext;
    const gameState = battleContext.gameState;
    
    // Mark that Sauron's card effects are negated
    (battleContext as any).sauronCardNegated = true;
    gameState.log(`${source.name} negates Sauron's combat card effects`);
  });

  // Combat card abilities (placeholders)
  registerAbilityHandler('CARD_EYE_OF_SAURON', (source, context) => {
    // TODO: Implement Eye of Sauron card logic
  });
  
  registerAbilityHandler('CARD_NOBLE_SACRIFICE', (source, context) => {
    // TODO: Implement Noble Sacrifice card logic
  });
}

// Initialize default handlers on module load
initializeDefaultHandlers();

// For testing: clear all registered handlers
export function clearAllAbilityHandlers(): void {
  Object.keys(abilityHandlers).forEach(key => {
    delete abilityHandlers[key];
  });
}

// Export the initialization function for tests
export function initializeDefaultAbilityHandlers(): void {
  initializeDefaultHandlers();
}

// Export for convenience
export const TRIGGER_EFFECTS = triggerAbilities;

// Export for testing
export { processCharacterAbilities };
