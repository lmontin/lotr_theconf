import { GameState } from '../models/GameState';
import { CharacterModel as Character } from '../models/Character';
import { RegionModel as Region } from '../models/Region';
import { Faction, MoveType, IMoveOption, IMoveLogEntry, GamePhase } from '../../types/data';
import { triggerAbilities, MovementContext } from '../systems/AbilitySystem';

export interface LegalMove {
  type: MoveType;
  destinationRegionId: string;
}

/**
 * Checks if a character can enter a region based on capacity and enemies.
 * @param character The character attempting to move.
 * @param destinationRegionModel The target region model.
 * @param gameState The current game state.
 * @returns True if the character can enter, false otherwise.
 */
export function canEnterRegion(character: Character, destinationRegionModel: Region, gameState: GameState): boolean {
  const charFaction = character.faction;
  const regionCapacityForFaction = destinationRegionModel.getCapacity(charFaction);
  const factionOccupantsCount = destinationRegionModel.getOccupants(charFaction).length;
  const hasEnemies = destinationRegionModel.containsEnemy(charFaction);

  // console.log(`[canEnterRegion] Checking for ${character.name} into ${destinationRegionModel.name} (${destinationRegionModel.id}):`);
  // console.log(`  Char Faction: ${charFaction}, Region Capacity for Faction: ${regionCapacityForFaction}, Faction Occupants: ${factionOccupantsCount}, Has Enemies: ${hasEnemies}`);

  if (regionCapacityForFaction > 0) {
    const canEnter = factionOccupantsCount < regionCapacityForFaction;
    // console.log(`  Region has capacity. Can enter? ${canEnter}`);
    return canEnter;
  } else {
    const canEnter = hasEnemies || factionOccupantsCount === 0;
    // console.log(`  Region has 0 capacity for faction. Can enter (enemies or empty)? ${canEnter}`);
    return canEnter;
  }
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
  const characterLocation = character.getLocation();

  if (!characterLocation || character.defeated) {
    return moves;
  }

  const currentRegionModel = gameState.getRegionById(characterLocation);
  if (!currentRegionModel) {
    gameState.log(`Error: Current region for ${character.name} (${character.id}) not found.`);
    return moves;
  }

  // Create movement context for ability system
  const movementContext: MovementContext = {
    character,
    fromRegion: characterLocation,
    gameState,
    availableMoves: [],
    additionalMoves: []
  };

  // 1. Regular forward movement
  const forwardRegionIds = character.faction === ("Fellowship" as Faction) ? currentRegionModel.fellowshipAdjacent : currentRegionModel.sauronAdjacent;
  if (forwardRegionIds) {
    for (const destId of forwardRegionIds) {
      const destRegionModel = gameState.getRegionById(destId);
      if (destRegionModel) {
        if (canEnterRegion(character, destRegionModel, gameState)) {
          moves.push({ type: 'FORWARD' as MoveType, destinationRegionId: destId });
        }
      }
    }
  }

  // 2. Special paths (Fellowship only)
  if (character.faction === ("Fellowship" as Faction)) {
    if (currentRegionModel.fellowshipSpecialMovement) {
      for (const specialDestId of currentRegionModel.fellowshipSpecialMovement) {
        const specialDestRegionModel = gameState.getRegionById(specialDestId);
        
        if (specialDestRegionModel && canEnterRegion(character, specialDestRegionModel, gameState)) {
          const currentSpecial = currentRegionModel.special;
          const destSpecial = specialDestRegionModel.special;
          let moveType: MoveType | null = null;
          
          const currentHasRiverAccess = Array.isArray(currentSpecial) ? currentSpecial.includes('RiverAccess') : currentSpecial === 'RiverAccess';
          const destHasRiverAccess = Array.isArray(destSpecial) ? destSpecial.includes('RiverAccess') : destSpecial === 'RiverAccess';

          if (currentHasRiverAccess && destHasRiverAccess) {
            moveType = 'RIVER' as MoveType;
          } else if (currentRegionModel.id === 'REGION_EREGION' && specialDestRegionModel.id === 'REGION_FANGORN') {
            moveType = 'TUNNEL' as MoveType;
          } else {
            moveType = 'FELLOWSHIP_SPECIAL_FORWARD' as MoveType;
          }
          
          if (moveType) {
            moves.push({ type: moveType, destinationRegionId: specialDestId });
          }
        }
      }
    }
  }

  // 3. Store available moves in context for ability system
  movementContext.availableMoves = moves.map(move => ({
    moveType: move.type,
    destination: move.destinationRegionId
  }));

  // 4. Trigger abilities that might add additional moves
  triggerAbilities('CHECK_MOVE_LEGALITY', movementContext);

  // 5. Add any additional moves granted by abilities
  if (movementContext.additionalMoves && movementContext.additionalMoves.length > 0) {
    for (const additionalMove of movementContext.additionalMoves) {
      const destRegionModel = gameState.getRegionById(additionalMove.destination);
      if (destRegionModel && canEnterRegion(character, destRegionModel, gameState)) {
        moves.push({ 
          type: additionalMove.moveType as MoveType, 
          destinationRegionId: additionalMove.destination 
        });
      }
    }
  }

  return moves;
}

/**
 * Moves a character to a new region, logs the move, and handles battle initiation.
 * @param characterId The ID of the character to move.
 * @param destinationRegionId The ID of the destination region.
 * @param gameState The current game state.
 * @param moveType The type of move being made.
 * @returns True if the move was successful, false otherwise.
 */
export function moveCharacter(
  characterId: string,
  destinationRegionId: string,
  gameState: GameState,
  moveType: MoveType
): boolean {
  const characterModel = gameState.getCharacterById(characterId);
  if (!characterModel) {
    gameState.log(`MOVE FAIL: Character ${characterId} not found.`);
    return false;
  }
  if (characterModel.defeated) {
    gameState.log(`MOVE FAIL: ${characterModel.name} is defeated.`);
    return false;
  }

  const destinationRegionModel = gameState.getRegionById(destinationRegionId);
  if (!destinationRegionModel) {
    gameState.log(`MOVE FAIL: ${characterModel.name} to ${destinationRegionId} - Destination region not found.`);
    return false;
  }

  if (!canEnterRegion(characterModel, destinationRegionModel, gameState)) {
    gameState.log(`MOVE FAIL: ${characterModel.name} cannot enter ${destinationRegionModel.name} (e.g., capacity full, or 0 capacity and no enemies/not empty).`);
    return false;
  }

  const oldRegionId = characterModel.getLocation();
  const oldRegionName = oldRegionId ? gameState.getRegionById(oldRegionId)?.name : 'off-board';

  // Create movement context for ability system
  const movementContext: MovementContext = {
    character: characterModel,
    fromRegion: oldRegionId || undefined,
    toRegion: destinationRegionId,
    moveType: moveType as 'NORMAL' | 'TUNNEL' | 'RIVER' | 'SPECIAL',
    gameState
  };

  // Trigger pre-move abilities
  triggerAbilities('MOVE_START', movementContext);

  // Execute the move
  characterModel.setLocation(destinationRegionId);

  const moveLogEntry: IMoveLogEntry = {
    characterId: characterModel.id,
    characterName: characterModel.name,
    fromRegionId: oldRegionId,
    fromRegionName: oldRegionName as string | null,
    toRegionId: destinationRegionId,
    toRegionName: destinationRegionModel.name,
    moveType,
    turn: gameState.getTurn(),
    phase: gameState.getCurrentPhase() as GamePhase,
  };
  gameState.setLastMove(moveLogEntry);
  gameState.log(`MOVE ACTION: ${characterModel.name} (${characterModel.faction}) ${moveType} from ${oldRegionName} to ${destinationRegionModel.name}.`);

  // Trigger post-move abilities
  triggerAbilities('MOVE_END', movementContext);

  // Check for battle initiation
  if (destinationRegionModel.containsEnemy(characterModel.faction)) {
    gameState.log(`Battle triggered in ${destinationRegionModel.name} involving ${characterModel.name}.`);
    const attackersInRegion = destinationRegionModel.getOccupants(characterModel.faction).map(c => c);
    const defendingFaction = characterModel.faction === ("Fellowship" as Faction) ? ("Sauron" as Faction) : ("Fellowship" as Faction);
    const defendersInRegion = destinationRegionModel.getOccupants(defendingFaction).map(c => c);

    gameState.setActiveBattle({
        regionId: destinationRegionId,
        regionName: destinationRegionModel.name,
        triggeringCharacterId: characterModel.id,
        attackingFaction: characterModel.faction,
        attackers: attackersInRegion,
        defendingFaction: defendingFaction,
        defenders: defendersInRegion,
    });
  }
  
  return true;
}

