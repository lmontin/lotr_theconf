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
