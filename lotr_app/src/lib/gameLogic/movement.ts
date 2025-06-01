import { GameState, Faction } from '../models/GameState';
import { Character } from '../models/Character';
import { Region } from '../models/Region';
import { IRegion } from '@/types/data';

export type MoveType = 'FORWARD' | 'TUNNEL' | 'RIVER' | 'SPECIAL_ABILITY' | 'RETREAT_SIDEWAYS' | 'RETREAT_BACKWARDS';

export interface LegalMove {
  type: MoveType;
  destinationRegionId: string;
  // Potentially add context like 'requires_battle', 'uses_ability_x'
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
  const currentRegionData: IRegion = currentRegionModel; // Changed: Access properties directly


  // 1. Regular forward movement
  const forwardRegionIds = character.faction === 'Fellowship' ? currentRegionData.fellowshipAdjacent : currentRegionData.sauronAdjacent;
  if (forwardRegionIds) {
    for (const destId of forwardRegionIds) {
      const destRegionModel = gameState.getRegionModel(destId);
      if (destRegionModel && canEnterRegion(character, destRegionModel, gameState)) {
        moves.push({ type: 'FORWARD', destinationRegionId: destId });
      }
    }
  }

  // 2. Special paths (Fellowship only)
  if (character.faction === 'Fellowship' && currentRegionData.fellowshipSpecialForward) {
    for (const specialDestId of currentRegionData.fellowshipSpecialForward) {
      const specialDestRegionModel = gameState.getRegionModel(specialDestId);
      if (specialDestRegionModel) {
        // Example: Tunnel of Moria (Eregion to Fangorn)
        if (currentRegionData.id === 'eregion' && specialDestId === 'fangorn') { // Assuming IDs are lowercase
          if (canEnterRegion(character, specialDestRegionModel, gameState)) {
            moves.push({ type: 'TUNNEL', destinationRegionId: specialDestId });
          }
        }
        // Example: River Anduin (generic check, specific river connections handled by data)
        // This part needs more robust logic based on how "RIVER" moves are defined.
        // For now, if it's in fellowshipSpecialForward and not the tunnel, assume it's a river if conditions met.
        // A more explicit 'move_type' in region data or context might be better.
        else if (canEnterRegion(character, specialDestRegionModel, gameState)) {
             // Heuristic: if it's a special forward move and not the specific tunnel, consider it RIVER for now.
             // This should be refined based on actual game data structure for special moves.
            if (currentRegionData.special?.includes('RiverAccess') || specialDestRegionModel.special?.includes('RiverAccess')) {
                 moves.push({ type: 'RIVER', destinationRegionId: specialDestId });
            }
        }
      }
    }
  }

  // 3. Character-specific movement abilities (Placeholder)
  // const abilityContext = { ...context, character, game: gameState, available_moves: [...moves] };
  // TRIGGER_EFFECTS("CHECK_MOVE_LEGALITY", abilityContext); // This needs an event/effect system
  // if (abilityContext.additional_moves) {
  //   moves.push(...abilityContext.additional_moves);
  // }

  // gameState.log(`Legal moves for ${character.name} from ${currentRegionData.name}: ${JSON.stringify(moves)}`);
  return moves;
}

