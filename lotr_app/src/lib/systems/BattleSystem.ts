export interface FullBattleContext {
  attacker: CharacterModel;
  defender: CharacterModel;
  gameState: GameState;
  attackerCard?: any; // Replace 'any' with CombatCard type if available
  defenderCard?: any;
  log: string[];
  outcome?: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'MUTUAL_DEFEAT';
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
  };

  // Step 1: Reveal both characters
  ctx.log.push('Step 1: Reveal characters');
  if (!(attacker as any).isRevealed && !(attacker as any).is_revealed) {
    attacker.reveal?.();
    ctx.log.push(`${attacker.name} is revealed.`);
  }
  if (!(defender as any).isRevealed && !(defender as any).is_revealed) {
    defender.reveal?.();
    ctx.log.push(`${defender.name} is revealed.`);
  }

  // Step 2: Trigger character abilities (Fellowship first, then Sauron)
  ctx.log.push('Step 2: Trigger character abilities (Fellowship, then Sauron)');
  ctx.log.push('Skipped: Ability system not implemented.');

  // Step 3: Card play and resolve card effects
  ctx.log.push('Step 3: Card play and resolve card effects');
  if (attackerCard) ctx.log.push(`${attacker.name} plays card: ${attackerCard.name || '[card]'}`);
  if (defenderCard) ctx.log.push(`${defender.name} plays card: ${defenderCard.name || '[card]'}`);
  ctx.log.push('Skipped: Card effect resolution not implemented.');

  // Step 4: Compare strengths (including card bonuses)
  ctx.log.push('Step 4: Compare strengths and determine outcome');
  const attackerStrength = attacker.strength + (attackerCard?.strength || 0);
  const defenderStrength = defender.strength + (defenderCard?.strength || 0);
  ctx.log.push(`${attacker.name} total strength: ${attackerStrength}`);
  ctx.log.push(`${defender.name} total strength: ${defenderStrength}`);

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

  // Log all steps in the game state
  ctx.log.forEach(line => gameState.log(`[Full Battle] ${line}`));
  return ctx;
}
import { CharacterModel } from '../models/Character';
import { GameState } from '../models/GameState';

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
