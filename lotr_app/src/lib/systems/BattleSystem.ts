import { Player } from '../models/Player';
import { ICombatCard } from '../../types/data';
import { CharacterModel } from '../models/Character';
import { GameState } from '../models/GameState';
import { triggerAbilities, checkBattleEnd, BattleContext } from './AbilitySystem';

/**
 * Reveals a card in the context of a battle, updating the context and log.
 * For Magic/Eye of Sauron, logs the reveal and sets a flag in context.
 */
export function revealCard(card: ICombatCard, ctx: any): void {
  if (!ctx || !ctx.log) return;
  ctx.log.push(`Card revealed: ${card.name}`);
  if (!ctx.cardsRevealed) ctx.cardsRevealed = [];
  ctx.cardsRevealed.push(card.id);
  // For text cards, set flags for further resolution
  if (card.id === 'CARD_FELLOWSHIP_MAGIC' || card.id === 'CARD_SAURON_MAGIC') {
    ctx.magicCardRevealed = true;
  }
  if (card.id === 'CARD_SAURON_EYE_OF_SAURON') {
    ctx.eyeOfSauronRevealed = true;
  }
}

/**
 * After a card is played, check if both players should reclaim their discards as new hands.
 */
export function checkHandReclaimAfterCardPlay(gameState: GameState): void {
  gameState.checkAndTriggerHandReclaim();
}

/**
 * Plays a card for the player during battle, removing it from hand and adding to discard.
 * Returns the played card, or undefined if not found.
 */
export function playBattleCard(player: Player, cardId: string): ICombatCard | undefined {
  return player.playCard(cardId);
}

/**
 * Returns the available cards in a player's hand
 */
export function getAvailableCards(player: Player): ICombatCard[] {
  return player.hand;
}

/**
 * Selects a card from the player's hand for battle (stub: picks first card for now)
 * In production, this would be replaced by UI or AI logic.
 */
export function chooseCard(player: Player, ctx?: any): ICombatCard | undefined {
  const available = getAvailableCards(player);
  return available.length > 0 ? available[0] : undefined;
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
  
  // Add card strength bonus
  if (card?.strength) {
    strength += card.strength;
  }
  
  // TODO: Add ability-based strength modifiers from context
  // This would be handled by abilities that trigger during COMPARE_STRENGTHS
  
  return strength;
}

/**
 * Finalize battle by logging all events and cleaning up
 */
function finalizeBattle(ctx: FullBattleContext): void {
  // Log all battle events in the game state
  ctx.log.forEach(line => ctx.gameState.log(`[Full Battle] ${line}`));
  
  // Clear battle phase
  ctx.battlePhase = 'END';
  
  // Trigger any final cleanup abilities
  // (This is handled by the BATTLE_END trigger in the main function)
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
  ctx.log.push('Step 1: Reveal characters');
  ctx.battlePhase = 'REVEAL';
  
  if (!(attacker as any).isRevealed && !(attacker as any).is_revealed) {
    attacker.reveal?.();
    ctx.log.push(`${attacker.name} is revealed.`);
  }
  if (!(defender as any).isRevealed && !(defender as any).is_revealed) {
    defender.reveal?.();
    ctx.log.push(`${defender.name} is revealed.`);
  }

  // Step 2: Pre-battle substitution check (Sam can substitute for Frodo)
  ctx.log.push('Step 2a: Check for pre-battle substitution');
  ctx.battlePhase = 'PRE_SUBSTITUTION';
  
  triggerAbilities('PRE_BATTLE_SUBSTITUTE', ctx);
  
  // Check if defender was substituted
  if (checkBattleEnd(ctx)) {
    ctx.battlePhase = 'END';
    finalizeBattle(ctx);
    return ctx;
  }

  // Step 2b: Trigger character abilities (Fellowship first, then Sauron)
  ctx.log.push('Step 2b: Trigger character abilities (Fellowship, then Sauron)');
  ctx.battlePhase = 'ABILITIES';
  
  triggerAbilities('BATTLE_START', ctx);
  
  // Check if battle ended early due to abilities (retreat, etc.)
  if (checkBattleEnd(ctx)) {
    ctx.battlePhase = 'END';
    finalizeBattle(ctx);
    return ctx;
  }

  // Step 3: Card play and resolve card effects
  ctx.log.push('Step 3: Card play and resolve card effects');
  ctx.battlePhase = 'CARDS';
  
  if (!ctx.skipCardPlay) {
    if (attackerCard) {
      ctx.log.push(`${attacker.name} plays card: ${attackerCard.name || '[card]'}`);
      if (ctx.cardsPlayed) {
        ctx.cardsPlayed[attacker.faction] = attackerCard;
      }
    }
    if (defenderCard) {
      ctx.log.push(`${defender.name} plays card: ${defenderCard.name || '[card]'}`);
      if (ctx.cardsPlayed) {
        ctx.cardsPlayed[defender.faction] = defenderCard;
      }
    }
    
    // Trigger card resolution abilities
    triggerAbilities('RESOLVE_CARDS', ctx);
  } else {
    ctx.log.push('Card play skipped due to ability effect.');
  }

  // Step 4: Compare strengths (including card bonuses)
  ctx.log.push('Step 4: Compare strengths and determine outcome');
  ctx.battlePhase = 'STRENGTH';
  
  // Trigger strength comparison abilities
  triggerAbilities('COMPARE_STRENGTHS', ctx);
  
  const attackerStrength = calculateFinalStrength(attacker, attackerCard, ctx);
  const defenderStrength = calculateFinalStrength(defender, defenderCard, ctx);
  
  ctx.log.push(`${attacker.name} total strength: ${attackerStrength}`);
  ctx.log.push(`${defender.name} total strength: ${defenderStrength}`);

  // Determine outcome
  if (attackerStrength > defenderStrength) {
    ctx.outcome = 'ATTACKER_WIN';
    ctx.log.push(`${attacker.name} wins the battle.`);
    defender.setDefeated?.(true);
  } else if (defenderStrength > attackerStrength) {
    ctx.outcome = 'DEFENDER_WIN';
    ctx.log.push(`${defender.name} wins the battle.`);
    attacker.setDefeated?.(true);
  } else {
    ctx.outcome = 'MUTUAL_DEFEAT';
    ctx.log.push('Both characters are defeated (tie).');
    attacker.setDefeated?.(true);
    defender.setDefeated?.(true);
  }

  // Step 5: End-battle abilities
  ctx.battlePhase = 'END';
  triggerAbilities('BATTLE_END', ctx);
  
  finalizeBattle(ctx);
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
  } else if (defenderStrength > attackerStrength) {
    winner = defender;
    loser = attacker;
    log = `${defender.name} (strength ${defenderStrength}) defeats ${attacker.name} (strength ${attackerStrength})`;
  } else {
    tie = true;
    log = `${attacker.name} and ${defender.name} tie (strength ${attackerStrength})`;
  }

  // Log the result in the game state
  gameState.log(`[Simple Battle] ${log}`);

  return { winner, loser, tie, log };
}
