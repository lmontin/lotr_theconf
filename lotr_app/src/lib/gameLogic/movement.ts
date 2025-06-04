import { GameState } from '../models/GameState';
import { CharacterModel as Character } from '../models/Character';
import { RegionModel as Region } from '../models/Region';
import { Faction, MoveType, IMoveOption, IMoveLogEntry, GamePhase } from '../../types/data';
import { triggerAbilities, MovementContext } from '../systems/AbilitySystem';
import { logMovement, logAbility, logTrace, logError } from '../utils/detailedLogger';

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

  logTrace('movement', 'canEnterRegion', `Checking entry for ${character.name} into ${destinationRegionModel.name}`, {
    characterId: character.id,
    characterName: character.name,
    characterFaction: charFaction,
    regionId: destinationRegionModel.id,
    regionName: destinationRegionModel.name,
    regionCapacityForFaction,
    factionOccupantsCount,
    hasEnemies,
    regionOccupants: destinationRegionModel.getOccupants().map(c => ({ id: c.id, name: c.name, faction: c.faction }))
  });

  if (regionCapacityForFaction > 0) {
    const canEnter = factionOccupantsCount < regionCapacityForFaction;
    logTrace('movement', 'canEnterRegion', `Region has capacity. Can enter: ${canEnter}`, {
      hasCapacity: true,
      canEnter
    });
    return canEnter;
  } else {
    const canEnter = hasEnemies || factionOccupantsCount === 0;
    logTrace('movement', 'canEnterRegion', `Region has 0 capacity for faction. Can enter (enemies or empty): ${canEnter}`, {
      hasCapacity: false,
      hasEnemies,
      factionOccupantsCount,
      canEnter
    });
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

  logMovement('movement', 'getLegalMoves', `Calculating legal moves for ${character.name}`, {
    characterId: character.id,
    characterName: character.name,
    faction: character.faction,
    currentLocation: characterLocation,
    defeated: character.defeated,
    gamePhase: gameState.getCurrentPhase(),
    currentPlayer: gameState.getCurrentPlayer()
  });

  if (!characterLocation || character.defeated) {
    logMovement('movement', 'getLegalMoves', `No moves available - character not placed or defeated`, {
      hasLocation: !!characterLocation,
      defeated: character.defeated
    });
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
        const canEnter = canEnterRegion(character, destRegionModel, gameState);
        if (canEnter) {
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
            if (currentRegionModel.id === 'REGION_EREGION' && specialDestRegionModel.id === 'REGION_FANGORN') {
              gameState.log('DIAGNOSTIC (Eregion to Fangorn Path): Determined move type as RIVER.');
            }
          } else if (currentRegionModel.id === 'REGION_EREGION' && specialDestRegionModel.id === 'REGION_FANGORN') {
            moveType = 'TUNNEL' as MoveType;
            gameState.log('DIAGNOSTIC (Eregion to Fangorn Path): Determined move type as TUNNEL.');
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
  logAbility('movement', 'getLegalMoves', 'Triggering CHECK_MOVE_LEGALITY abilities', {
    characterId: character.id,
    characterName: character.name,
    availableMovesCount: movementContext.availableMoves.length,
    availableMoves: movementContext.availableMoves
  });
  
  triggerAbilities('CHECK_MOVE_LEGALITY', movementContext);

  // 5. Add any additional moves granted by abilities
  if (movementContext.additionalMoves && movementContext.additionalMoves.length > 0) {
    logAbility('movement', 'getLegalMoves', 'Processing additional moves from abilities', {
      additionalMovesCount: movementContext.additionalMoves.length,
      additionalMoves: movementContext.additionalMoves
    });
    
    for (const additionalMove of movementContext.additionalMoves) {
      const destRegionModel = gameState.getRegionById(additionalMove.destination);
      if (destRegionModel && canEnterRegion(character, destRegionModel, gameState)) {
        const newMove = { 
          type: additionalMove.moveType as MoveType, 
          destinationRegionId: additionalMove.destination 
        };
        moves.push(newMove);
        
        logAbility('movement', 'getLegalMoves', 'Added ability-granted move', {
          moveType: additionalMove.moveType,
          destination: additionalMove.destination,
          destinationName: destRegionModel.name
        });
      } else {
        logAbility('movement', 'getLegalMoves', 'Rejected ability-granted move - cannot enter region', {
          moveType: additionalMove.moveType,
          destination: additionalMove.destination,
          regionFound: !!destRegionModel,
          canEnter: destRegionModel ? canEnterRegion(character, destRegionModel, gameState) : false
        });
      }
    }
  }

  logMovement('movement', 'getLegalMoves', `Final legal moves for ${character.name}`, {
    totalMoves: moves.length,
    moves: moves.map(m => ({ type: m.type, destination: m.destinationRegionId }))
  });

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
  logMovement('movement', 'moveCharacter', 'Starting character move', {
    characterId,
    destinationRegionId,
    moveType,
    gamePhase: gameState.getCurrentPhase(),
    currentPlayer: gameState.getCurrentPlayer()
  });

  const characterModel = gameState.getCharacterById(characterId);
  if (!characterModel) {
    logError('movement', 'moveCharacter', `Character ${characterId} not found`);
    gameState.log(`MOVE FAIL: Character ${characterId} not found.`);
    return false;
  }
  if (characterModel.defeated) {
    logError('movement', 'moveCharacter', `Character ${characterModel.name} is defeated`);
    gameState.log(`MOVE FAIL: ${characterModel.name} is defeated.`);
    return false;
  }

  const destinationRegionModel = gameState.getRegionById(destinationRegionId);
  if (!destinationRegionModel) {
    logError('movement', 'moveCharacter', `Destination region ${destinationRegionId} not found`);
    gameState.log(`MOVE FAIL: ${characterModel.name} to ${destinationRegionId} - Destination region not found.`);
    return false;
  }

  if (!canEnterRegion(characterModel, destinationRegionModel, gameState)) {
    logError('movement', 'moveCharacter', `Character cannot enter destination region`, {
      characterName: characterModel.name,
      regionName: destinationRegionModel.name,
      regionId: destinationRegionId
    });
    gameState.log(`MOVE FAIL: ${characterModel.name} cannot enter ${destinationRegionModel.name} (e.g., capacity full, or 0 capacity and no enemies/not empty).`);
    return false;
  }

  const oldRegionId = characterModel.getLocation();
  const oldRegionName = oldRegionId ? gameState.getRegionById(oldRegionId)?.name : 'off-board';

  logMovement('movement', 'moveCharacter', 'Move validation passed, executing move', {
    characterName: characterModel.name,
    fromRegion: oldRegionId,
    fromRegionName: oldRegionName,
    toRegion: destinationRegionId,
    toRegionName: destinationRegionModel.name,
    moveType
  });

  // Create movement context for ability system
  const movementContext: MovementContext = {
    character: characterModel,
    fromRegion: oldRegionId || undefined,
    toRegion: destinationRegionId,
    moveType: moveType as 'NORMAL' | 'TUNNEL' | 'RIVER' | 'SPECIAL',
    gameState
  };

  // Trigger pre-move abilities
  logAbility('movement', 'moveCharacter', 'Triggering MOVE_START abilities', {
    characterName: characterModel.name,
    fromRegion: oldRegionId,
    toRegion: destinationRegionId,
    moveType
  });
  triggerAbilities('MOVE_START', movementContext);

  // Execute the move
  // Update both the character location and GameState's region tracking
  if (oldRegionId) {
    logMovement('movement', 'moveCharacter', 'Executing move via GameState.moveCharacter (with battle trigger)', {
      characterName: characterModel.name,
      fromRegion: oldRegionId,
      toRegion: destinationRegionId,
      triggerBattle: true
    });
    
    // Use GameState's moveCharacter method to properly update region tracking AND handle battles
    gameState.moveCharacter(characterModel.id, destinationRegionId, { 
      triggerBattle: true, // Let GameState handle battle triggering with proper phase checks
      isSetup: false, 
      isRetreat: false 
    });
  } else {
    logMovement('movement', 'moveCharacter', 'Placing character from off-board', {
      characterName: characterModel.name,
      toRegion: destinationRegionId
    });
    // Character is being placed from off-board
    gameState.placeCharacter(characterModel.id, destinationRegionId);
  }

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
  logAbility('movement', 'moveCharacter', 'Triggering MOVE_END abilities', {
    characterName: characterModel.name,
    fromRegion: oldRegionId,
    toRegion: destinationRegionId,
    moveType
  });
  triggerAbilities('MOVE_END', movementContext);

  logMovement('movement', 'moveCharacter', 'Move completed successfully', {
    characterName: characterModel.name,
    finalLocation: characterModel.getLocation(),
    activeBattle: gameState.getActiveBattle(),
    activeBattleExists: !!gameState.getActiveBattle(),
    moveLogEntry
  });

  return true;
}

