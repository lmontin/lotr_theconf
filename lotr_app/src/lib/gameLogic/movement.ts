import { GameState, Faction } from '../models/GameState';
import { Character } from '../models/Character';
import { Region } from '../models/Region';

export type MoveType = 'FORWARD' | 'TUNNEL' | 'RIVER' | 'SPECIAL_ABILITY' | 'RETREAT_SIDEWAYS' | 'RETREAT_BACKWARDS';

export interface LegalMove {
  type: MoveType;
  destinationRegionId: string;
}

/**
 * Checks if a character can enter a region based on capacity and enemies.
 * @param character The character attempting to move.
 * @param destinationRegion The target region.
 * @param gameState The current game state.
 * @returns True if the character can enter, false otherwise.
 */
export function canEnterRegion(character: Character, destinationRegion: Region, gameState: GameState): boolean {
  // Check faction capacity in the destination region
  const occupantsInRegion = gameState.getCharactersInRegion(destinationRegion.id);
  let factionCount = 0;
  for (const charId of occupantsInRegion) {
    const char = gameState.getCharacterById(charId); // Assuming GameState has getCharacterById
    if (char && char.faction === character.faction && !char.is_defeated) {
      factionCount++;
    }
  }

  if (factionCount >= destinationRegion.getCapacity(character.faction)) {
    // gameState.log(`${character.name} cannot enter ${destinationRegion.name}: capacity full for ${character.faction}.`);
    return false;
  }

  // Check for enemies (movement is allowed, but will trigger battle)
  // This function primarily checks if entry is *possible*, battle is a consequence.
  // Specific abilities might prevent moving into enemy-occupied regions without battle.
  // For now, basic capacity check is the main blocker.
  // if (destinationRegion.containsEnemy(character.faction, gameState)) {
  //   gameState.log(`${character.name} can enter ${destinationRegion.name}, but it contains enemies.`);
  // }

  return true;
}

/**
 * Gets all legal moves for a given character.
 * @param character The character for whom to find legal moves.
 * @param gameState The current game state.
 * @param context Optional context for ability-driven moves.
 * @returns A list of legal moves.
 */
export function getLegalMoves(character: Character, gameState: GameState, context?: any): LegalMove[] {
  const moves: LegalMove[] = [];
  if (!character.locationId || character.is_defeated) {
    return moves; // Character not on board or defeated
  }

  const currentRegionModel = gameState.getRegionModel(character.locationId); // Assumes GameState can provide Region model
  if (!currentRegionModel) {
    gameState.log(`Error: Current region for ${character.name} not found.`);
    return moves;
  }


  // 1. Regular forward movement
  const forwardRegionIds = character.faction === 'Fellowship' ? currentRegionModel.fellowshipAdjacent : currentRegionModel.sauronAdjacent;
  if (forwardRegionIds) {
    for (const destId of forwardRegionIds) {
      const destRegionModel = gameState.getRegionModel(destId);
      if (destRegionModel && canEnterRegion(character, destRegionModel, gameState)) {
        moves.push({ type: 'FORWARD', destinationRegionId: destId });
      }
    }
  }

  // 2. Special paths (Fellowship only)
  if (character.faction === 'Fellowship' && currentRegionModel.fellowshipSpecialForward) {
    for (const specialDestId of currentRegionModel.fellowshipSpecialForward) {
      const specialDestRegionModel = gameState.getRegionModel(specialDestId);
      if (specialDestRegionModel) {
        // Special check for Eregion -> Fangorn tunnel by region names
        if (currentRegionModel.name === 'Eregion' && specialDestRegionModel.name === 'Fangorn') {
          if (canEnterRegion(character, specialDestRegionModel, gameState)) {
            moves.push({ type: 'TUNNEL', destinationRegionId: specialDestId });
          }
        }
        // Generic check for other special moves (e.g., River)
        else if (canEnterRegion(character, specialDestRegionModel, gameState)) {
            const currentSpecial = currentRegionModel.special;
            const destSpecial = specialDestRegionModel.special;
            const hasRiverAccess = (Array.isArray(currentSpecial) && currentSpecial.includes('RiverAccess')) ||
                                   (typeof currentSpecial === 'string' && currentSpecial === 'RiverAccess') ||
                                   (Array.isArray(destSpecial) && destSpecial.includes('RiverAccess')) ||
                                   (typeof destSpecial === 'string' && destSpecial === 'RiverAccess');

            if (hasRiverAccess) {
                 moves.push({ type: 'RIVER', destinationRegionId: specialDestId });
            }
        }
      }
    }
  }
  return moves;
}

