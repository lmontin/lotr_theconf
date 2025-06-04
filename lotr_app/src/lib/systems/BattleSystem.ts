import { Player } from '../models/Player';
import { ICombatCard } from '../../types/data';
import { CharacterModel } from '../models/Character';
import { GameState } from '../models/GameState';
import { triggerAbilities, checkBattleEnd, BattleContext } from './AbilitySystem';
import { detailedLogger } from '../utils/detailedLogger';

/**
 * Reveals a card in the context of a battle, updating the context and log.
 * For Magic/Eye of Sauron, logs the reveal and sets a flag in context.
 */
export function revealCard(card: ICombatCard, ctx: any): void {
  detailedLogger.debug('BATTLE', 'BattleSystem', 'revealCard', 
    `Revealing card: ${card.name}`, 
    { cardId: card.id, cardType: card.cardType, cardStrength: card.strength });
    
  if (!ctx || !ctx.log) return;
  ctx.log.push(`Card revealed: ${card.name}`);
  if (!ctx.cardsRevealed) ctx.cardsRevealed = [];
  ctx.cardsRevealed.push(card.id);
  
  // For text cards, set flags for further resolution
  if (card.id === 'CARD_FELLOWSHIP_MAGIC' || card.id === 'CARD_SAURON_MAGIC') {
    ctx.magicCardRevealed = true;
    detailedLogger.info('BATTLE', 'BattleSystem', 'revealCard', 
      'Magic card revealed, setting flag for resolution');
  }
  if (card.id === 'CARD_SAURON_EYE_OF_SAURON') {
    ctx.eyeOfSauronRevealed = true;
    detailedLogger.info('BATTLE', 'BattleSystem', 'revealCard', 
      'Eye of Sauron card revealed, setting flag for resolution');
  }
}

/**
 * After a card is played, check if both players should reclaim their discards as new hands.
 */
export function checkHandReclaimAfterCardPlay(gameState: GameState): void {
  detailedLogger.debug('BATTLE', 'BattleSystem', 'checkHandReclaimAfterCardPlay', 
    'Checking if hand reclaim is needed after card play');
  gameState.checkAndTriggerHandReclaim();
}

/**
 * Plays a card for the player during battle, removing it from hand and adding to discard.
 * Returns the played card, or undefined if not found.
 */
export function playBattleCard(player: Player, cardId: string): ICombatCard | undefined {
  detailedLogger.debug('BATTLE', 'BattleSystem', 'playBattleCard', 
    `Player ${player.faction} playing card ${cardId}`, 
    { playerId: player.faction, cardId, handSize: player.hand.length });
    
  const result = player.playCard(cardId);
  
  if (result) {
    detailedLogger.info('BATTLE', 'BattleSystem', 'playBattleCard', 
      `Card ${result.name} successfully played by ${player.faction}`, 
      { cardId: result.id, newHandSize: player.hand.length, discardSize: player.discard.length });
  } else {
    detailedLogger.warn('BATTLE', 'BattleSystem', 'playBattleCard', 
      `Failed to play card ${cardId} for ${player.faction} - card not found in hand`);
  }
  
  return result;
}

/**
 * Returns the available cards in a player's hand
 */
export function getAvailableCards(player: Player): ICombatCard[] {
  detailedLogger.trace('BATTLE', 'BattleSystem', 'getAvailableCards', 
    `Getting available cards for ${player.faction}`, 
    { playerId: player.faction, handSize: player.hand.length });
  return player.hand;
}

/**
 * Selects a card from the player's hand for battle (stub: picks first card for now)
 * In production, this would be replaced by UI or AI logic.
 */
export function chooseCard(player: Player, ctx?: any): ICombatCard | undefined {
  const available = getAvailableCards(player);
  const chosen = available.length > 0 ? available[0] : undefined;
  
  detailedLogger.debug('BATTLE', 'BattleSystem', 'chooseCard', 
    `Auto-choosing card for ${player.faction}`, 
    { 
      playerId: player.faction, 
      availableCards: available.length, 
      chosenCard: chosen ? chosen.name : 'none' 
    });
    
  return chosen;
}

export interface FullBattleContext extends BattleContext {
  attacker: CharacterModel;
  defender: CharacterModel;
  gameState: GameState;
  attackerCard?: any; // Replace 'any' with CombatCard type if available
  defenderCard?: any;
  log: string[];
  outcome?: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'MUTUAL_DEFEAT';
  battlePhase?: 'REVEAL' | 'PRE_SUBSTITUTION' | 'ABILITIES' | 'CARDS' | 'STRENGTH' | 'END';
  skipCardPlay?: boolean;
  fellowshipCharacter?: CharacterModel;
  sauronCharacter?: CharacterModel;
  cardsPlayed?: { [faction: string]: any };
}

/**
 * Calculate final strength including card bonuses and ability modifiers
 */
function calculateFinalStrength(character: CharacterModel, card?: any, ctx?: FullBattleContext): number {
  let strength = character.strength;
  
  detailedLogger.debug('BATTLE', 'BattleSystem', 'calculateFinalStrength', 
    `Calculating strength for ${character.name}`, 
    { characterName: character.name, baseStrength: strength, hasCard: !!card });
  
  // Add card strength bonus
  if (card?.strength) {
    strength += card.strength;
    detailedLogger.debug('BATTLE', 'BattleSystem', 'calculateFinalStrength', 
      `Added card strength bonus: ${card.strength}`, 
      { cardName: card.name, cardStrength: card.strength, newTotalStrength: strength });
  }
  
  // TODO: Add ability-based strength modifiers from context
  // This would be handled by abilities that trigger during COMPARE_STRENGTHS
  
  detailedLogger.info('BATTLE', 'BattleSystem', 'calculateFinalStrength', 
    `Final strength for ${character.name}: ${strength}`, 
    { characterName: character.name, finalStrength: strength });
  
  return strength;
}

/**
 * Finalize battle by logging all events and cleaning up
 */
function finalizeBattle(ctx: FullBattleContext): void {
  detailedLogger.info('BATTLE', 'BattleSystem', 'finalizeBattle', 
    'Finalizing battle and cleaning up', 
    { 
      outcome: ctx.outcome, 
      logEntries: ctx.log.length,
      battlePhase: ctx.battlePhase 
    });
    
  // Log all battle events in the game state
  ctx.log.forEach(line => {
    ctx.gameState.log(`[Full Battle] ${line}`);
    detailedLogger.debug('BATTLE', 'BattleSystem', 'finalizeBattle', `Battle Log: ${line}`);
  });
  
  // Clear battle phase
  ctx.battlePhase = 'END';
  
  // Trigger any final cleanup abilities
  // (This is handled by the BATTLE_END trigger in the main function)
  
  detailedLogger.info('BATTLE', 'BattleSystem', 'finalizeBattle', 'Battle finalization complete');
}

/**
 * Resolves a full 4-step battle between two characters.
 * Steps: Reveal, Abilities, Cards, Strength Comparison
 */
export function resolveFullBattle(
  attacker: CharacterModel,
  defender: CharacterModel,
  gameState: GameState,
  attackerCard?: any,
  defenderCard?: any
): FullBattleContext {
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
    `Starting full battle: ${attacker.name} vs ${defender.name}`, 
    { 
      attackerName: attacker.name, 
      attackerStrength: attacker.strength,
      attackerFaction: attacker.faction,
      attackerId: attacker.id,
      defenderName: defender.name, 
      defenderStrength: defender.strength,
      defenderFaction: defender.faction,
      defenderId: defender.id,
      attackerCard: attackerCard ? attackerCard.name : 'none',
      defenderCard: defenderCard ? defenderCard.name : 'none',
      areTheSameObject: attacker === defender,
      attackerObjectRef: attacker.constructor.name + '@' + attacker.id,
      defenderObjectRef: defender.constructor.name + '@' + defender.id
    });

  const ctx: FullBattleContext = {
    attacker,
    defender,
    gameState,
    attackerCard,
    defenderCard,
    log: [],
    battlePhase: 'REVEAL',
    fellowshipCharacter: attacker.faction === 'Fellowship' ? attacker : defender,
    sauronCharacter: attacker.faction === 'Sauron' ? attacker : defender,
    cardsPlayed: {},
  };

  // Step 1: Reveal both characters
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 'BATTLE STEP 1: Reveal characters');
  ctx.log.push('Step 1: Reveal characters');
  ctx.battlePhase = 'REVEAL';
  
  if (!(attacker as any).isRevealed && !(attacker as any).is_revealed) {
    attacker.reveal?.();
    ctx.log.push(`${attacker.name} is revealed.`);
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      `${attacker.name} revealed in battle`);
  }
  if (!(defender as any).isRevealed && !(defender as any).is_revealed) {
    defender.reveal?.();
    ctx.log.push(`${defender.name} is revealed.`);
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      `${defender.name} revealed in battle`);
  }

  // Step 2: Pre-battle substitution check (Sam can substitute for Frodo)
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 'BATTLE STEP 2a: Check for pre-battle substitution');
  ctx.log.push('Step 2a: Check for pre-battle substitution');
  ctx.battlePhase = 'PRE_SUBSTITUTION';
  
  triggerAbilities('PRE_BATTLE_SUBSTITUTE', ctx);
  
  // Check if defender was substituted
  if (checkBattleEnd(ctx)) {
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      'Battle ended early due to substitution');
    ctx.battlePhase = 'END';
    finalizeBattle(ctx);
    return ctx;
  }

  // Step 2b: Trigger character abilities (Fellowship first, then Sauron)
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 'BATTLE STEP 2b: Trigger character abilities');
  ctx.log.push('Step 2b: Trigger character abilities (Fellowship, then Sauron)');
  ctx.battlePhase = 'ABILITIES';
  
  triggerAbilities('BATTLE_START', ctx);
  
  // Check if battle ended early due to abilities (retreat, etc.)
  if (checkBattleEnd(ctx)) {
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      'Battle ended early due to abilities');
    ctx.battlePhase = 'END';
    finalizeBattle(ctx);
    return ctx;
  }

  // Step 3: Card play and resolve card effects
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 'BATTLE STEP 3: Card play and resolve card effects');
  ctx.log.push('Step 3: Card play and resolve card effects');
  ctx.battlePhase = 'CARDS';
  
  if (!ctx.skipCardPlay) {
    if (attackerCard) {
      ctx.log.push(`${attacker.name} plays card: ${attackerCard.name || '[card]'}`);
      detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
        `${attacker.name} plays card: ${attackerCard.name}`, 
        { cardId: attackerCard.id, cardStrength: attackerCard.strength });
      if (ctx.cardsPlayed) {
        ctx.cardsPlayed[attacker.faction] = attackerCard;
      }
    }
    if (defenderCard) {
      ctx.log.push(`${defender.name} plays card: ${defenderCard.name || '[card]'}`);
      detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
        `${defender.name} plays card: ${defenderCard.name}`, 
        { cardId: defenderCard.id, cardStrength: defenderCard.strength });
      if (ctx.cardsPlayed) {
        ctx.cardsPlayed[defender.faction] = defenderCard;
      }
    }
    
    // Trigger card resolution abilities
    triggerAbilities('RESOLVE_CARDS', ctx);
  } else {
    ctx.log.push('Card play skipped due to ability effect.');
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      'Card play was skipped due to ability effect');
  }

  // Step 4: Compare strengths (including card bonuses)
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 'BATTLE STEP 4: Compare strengths and determine outcome');
  ctx.log.push('Step 4: Compare strengths and determine outcome');
  ctx.battlePhase = 'STRENGTH';
  
  // Trigger strength comparison abilities
  triggerAbilities('COMPARE_STRENGTHS', ctx);
  
  const attackerStrength = calculateFinalStrength(attacker, attackerCard, ctx);
  const defenderStrength = calculateFinalStrength(defender, defenderCard, ctx);
  
  ctx.log.push(`${attacker.name} total strength: ${attackerStrength}`);
  ctx.log.push(`${defender.name} total strength: ${defenderStrength}`);

  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
    'Strength comparison complete', 
    { 
      attackerName: attacker.name, 
      attackerStrength, 
      defenderName: defender.name, 
      defenderStrength 
    });

  // Determine outcome
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
    'Before outcome determination - checking character states', 
    { 
      attackerName: attacker.name, 
      attackerDefeated: attacker.defeated,
      attackerLocation: attacker.location,
      defenderName: defender.name, 
      defenderDefeated: defender.defeated,
      defenderLocation: defender.location
    });

  if (attackerStrength > defenderStrength) {
    ctx.outcome = 'ATTACKER_WIN';
    ctx.log.push(`${attacker.name} wins the battle.`);
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      `BATTLE RESULT: ${attacker.name} wins`, 
      { winner: attacker.name, loser: defender.name, margin: attackerStrength - defenderStrength });
    
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      `About to defeat ${defender.name} (defender)`, 
      { defenderName: defender.name, defenderCurrentlyDefeated: defender.defeated });
    
    defender.setDefeated?.(true);
    
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      `After defeating ${defender.name}, checking both character states`, 
      { 
        attackerName: attacker.name, 
        attackerDefeated: attacker.defeated,
        attackerLocation: attacker.location,
        defenderName: defender.name, 
        defenderDefeated: defender.defeated,
        defenderLocation: defender.location
      });
    
  } else if (defenderStrength > attackerStrength) {
    ctx.outcome = 'DEFENDER_WIN';
    ctx.log.push(`${defender.name} wins the battle.`);
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      `BATTLE RESULT: ${defender.name} wins`, 
      { winner: defender.name, loser: attacker.name, margin: defenderStrength - attackerStrength });
    
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      `About to defeat ${attacker.name} (attacker)`, 
      { attackerName: attacker.name, attackerCurrentlyDefeated: attacker.defeated });
    
    attacker.setDefeated?.(true);
    
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      `After defeating ${attacker.name}, checking both character states`, 
      { 
        attackerName: attacker.name, 
        attackerDefeated: attacker.defeated,
        attackerLocation: attacker.location,
        defenderName: defender.name, 
        defenderDefeated: defender.defeated,
        defenderLocation: defender.location
      });
    
  } else {
    ctx.outcome = 'MUTUAL_DEFEAT';
    ctx.log.push('Both characters are defeated (tie).');
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      'BATTLE RESULT: Mutual defeat (tie)', 
      { attackerName: attacker.name, defenderName: defender.name, tiedStrength: attackerStrength });
    
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
      'About to defeat both characters due to tie');
    
    attacker.setDefeated?.(true);
    defender.setDefeated?.(true);
  }

  // Step 5: End-battle abilities
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 'BATTLE STEP 5: End-battle abilities');
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
    'Before end-battle abilities - checking character states', 
    { 
      attackerName: attacker.name, 
      attackerDefeated: attacker.defeated,
      attackerLocation: attacker.location,
      defenderName: defender.name, 
      defenderDefeated: defender.defeated,
      defenderLocation: defender.location,
      areTheSameObject: attacker === defender,
      battleOutcome: ctx.outcome
    });
  
  ctx.battlePhase = 'END';
  triggerAbilities('BATTLE_END', ctx);
  
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
    'After end-battle abilities - checking character states', 
    { 
      attackerName: attacker.name, 
      attackerDefeated: attacker.defeated,
      attackerLocation: attacker.location,
      defenderName: defender.name, 
      defenderDefeated: defender.defeated,
      defenderLocation: defender.location
    });
  
  finalizeBattle(ctx);
  
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveFullBattle', 
    'Full battle resolution complete', 
    { outcome: ctx.outcome, totalLogEntries: ctx.log.length });
    
  return ctx;
}

export interface SimpleBattleResult {
  winner: CharacterModel | null;
  loser: CharacterModel | null;
  tie: boolean;
  log: string;
}

/**
 * Resolves a simple battle between two characters using only their strength.
 * No abilities or cards are used.
 */
export function resolveSimpleBattle(
  attacker: CharacterModel,
  defender: CharacterModel,
  gameState: GameState
): SimpleBattleResult {
  detailedLogger.info('BATTLE', 'BattleSystem', 'resolveSimpleBattle', 
    `Starting simple battle: ${attacker.name} vs ${defender.name}`, 
    { 
      attackerName: attacker.name, 
      attackerStrength: attacker.strength,
      defenderName: defender.name, 
      defenderStrength: defender.strength 
    });

  const attackerStrength = attacker.strength;
  const defenderStrength = defender.strength;
  let winner: CharacterModel | null = null;
  let loser: CharacterModel | null = null;
  let tie = false;
  let log = '';

  if (attackerStrength > defenderStrength) {
    winner = attacker;
    loser = defender;
    log = `${attacker.name} (strength ${attackerStrength}) defeats ${defender.name} (strength ${defenderStrength})`;
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveSimpleBattle', 
      `Simple battle result: ${attacker.name} wins`, 
      { winner: attacker.name, loser: defender.name, margin: attackerStrength - defenderStrength });
  } else if (defenderStrength > attackerStrength) {
    winner = defender;
    loser = attacker;
    log = `${defender.name} (strength ${defenderStrength}) defeats ${attacker.name} (strength ${attackerStrength})`;
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveSimpleBattle', 
      `Simple battle result: ${defender.name} wins`, 
      { winner: defender.name, loser: attacker.name, margin: defenderStrength - attackerStrength });
  } else {
    tie = true;
    log = `${attacker.name} and ${defender.name} tie (strength ${attackerStrength})`;
    detailedLogger.info('BATTLE', 'BattleSystem', 'resolveSimpleBattle', 
      'Simple battle result: Tie', 
      { attackerName: attacker.name, defenderName: defender.name, tiedStrength: attackerStrength });
  }

  // Log the result in the game state
  gameState.log(`[Simple Battle] ${log}`);

  return { winner, loser, tie, log };
}
