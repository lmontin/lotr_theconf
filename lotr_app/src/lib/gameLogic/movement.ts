import { GameState } from '../models/GameState';
import { CharacterModel as Character } from '../models/Character';
import { RegionModel as Region } from '../models/Region';
import { Faction, MoveType, IMoveOption, IMoveLogEntry, GamePhase } from '../../types/data';

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

  const currentRegionModel = gameState.getRegionById(characterLocation); // MODIFIED
  if (!currentRegionModel) {
    gameState.log(`Error: Current region for ${character.name} (${character.id}) not found.`);
    return moves;
  }

  // 1. Regular forward movement
  const forwardRegionIds = character.faction === ("Fellowship" as Faction) ? currentRegionModel.fellowshipAdjacent : currentRegionModel.sauronAdjacent;
  if (forwardRegionIds) {
    for (const destId of forwardRegionIds) {
      const destRegionModel = gameState.getRegionById(destId); // MODIFIED
      if (destRegionModel) {
        if (canEnterRegion(character, destRegionModel, gameState)) {
          moves.push({ type: 'FORWARD' as MoveType, destinationRegionId: destId });
        }
      }
    }
  }

  // 2. Special paths (Fellowship only)
  if (character.faction === ("Fellowship" as Faction)) {
    if (currentRegionModel.id === 'REGION_EREGION') { // Log specifically for Eregion
        if (currentRegionModel.fellowshipSpecialMovement && currentRegionModel.fellowshipSpecialMovement.length > 0) {
            gameState.log(`DIAGNOSTIC (Eregion): fellowshipSpecialMovement for ${currentRegionModel.name} (${currentRegionModel.id}): ${JSON.stringify(currentRegionModel.fellowshipSpecialMovement)}. Character: ${character.name}`);
        } else {
            gameState.log(`DIAGNOSTIC (Eregion): fellowshipSpecialMovement is UNDEFINED or EMPTY for ${currentRegionModel.name} (${currentRegionModel.id}). Character: ${character.name}`);
        }
    }

    if (currentRegionModel.fellowshipSpecialMovement) {
        for (const specialDestId of currentRegionModel.fellowshipSpecialMovement) {
            const specialDestRegionModel = gameState.getRegionById(specialDestId); // MODIFIED

            if (currentRegionModel.id === 'REGION_EREGION') { // Log loop processing for Eregion
                gameState.log(`DIAGNOSTIC (Eregion Special Loop): Processing specialDestId: ${specialDestId}. Target Model Found: ${!!specialDestRegionModel}. Character: ${character.name}`);
            }

            if (specialDestId === 'REGION_FANGORN' && currentRegionModel.id === 'REGION_EREGION') {
                gameState.log(`DIAGNOSTIC (Eregion to Fangorn Path): Entered specific check for Fangorn from Eregion. Character: ${character.name}`);
                if (!specialDestRegionModel) {
                    gameState.log(`DIAGNOSTIC (Eregion to Fangorn Path): Destination REGION_FANGORN model not found.`);
                    continue;
                }
                if (!canEnterRegion(character, specialDestRegionModel, gameState)) {
                    gameState.log(`DIAGNOSTIC (Eregion to Fangorn Path): Cannot enter REGION_FANGORN. canEnterRegion for ${character.name} returned false. Region state: Occupants=${JSON.stringify(specialDestRegionModel.getOccupants())}, FellowshipOccupants=${specialDestRegionModel.getOccupants("Fellowship" as Faction).length}, SauronOccupants=${specialDestRegionModel.getOccupants("Sauron" as Faction).length}`);
                    continue;
                }
                const currentSpecial = currentRegionModel.special;
                const destSpecial = specialDestRegionModel.special;
                let moveType: MoveType | null = null;

                const currentHasRiverAccess = Array.isArray(currentSpecial) ? currentSpecial.includes('RiverAccess') : currentSpecial === 'RiverAccess';
                const destHasRiverAccess = Array.isArray(destSpecial) ? destSpecial.includes('RiverAccess') : destSpecial === 'RiverAccess';

                if (currentHasRiverAccess && destHasRiverAccess) {
                    moveType = 'RIVER' as MoveType;
                    gameState.log(`DIAGNOSTIC (Eregion to Fangorn Path): Determined move type as RIVER.`);
                } else if (currentRegionModel.id === 'REGION_EREGION' && specialDestRegionModel.id === 'REGION_FANGORN') {
                    moveType = 'TUNNEL' as MoveType;
                    gameState.log(`DIAGNOSTIC (Eregion to Fangorn Path): Determined move type as TUNNEL.`);
                } else {
                    moveType = 'FELLOWSHIP_SPECIAL_FORWARD' as MoveType;
                    gameState.log(`DIAGNOSTIC (Eregion to Fangorn Path): Defaulted to FELLOWSHIP_SPECIAL_FORWARD. CurrentSpecial: ${JSON.stringify(currentSpecial)}, DestSpecial: ${JSON.stringify(destSpecial)}, CurrentRiver: ${currentHasRiverAccess}, DestRiver: ${destHasRiverAccess}`);
                }
                if (moveType) {
                    moves.push({ type: moveType, destinationRegionId: specialDestId });
                    gameState.log(`DIAGNOSTIC (Eregion to Fangorn Path): Added move ${moveType} to ${specialDestId} for ${character.name}.`);
                } else {
                    gameState.log(`DIAGNOSTIC (Eregion to Fangorn Path): Move type to REGION_FANGORN is null/undefined. Char: ${character.name}, CurrentSpecial: ${JSON.stringify(currentSpecial)}, DestSpecial: ${JSON.stringify(destSpecial)}`);
                }
            } else { // For other special destinations or other current regions
                if (specialDestRegionModel && canEnterRegion(character, specialDestRegionModel, gameState)) {
                    const currentSpecial = currentRegionModel.special;
                    const destSpecial = specialDestRegionModel.special;
                    let moveType: MoveType | null = null;
                    const currentHasRiverAccess = Array.isArray(currentSpecial) ? currentSpecial.includes('RiverAccess') : currentSpecial === 'RiverAccess';
                    const destHasRiverAccess = Array.isArray(destSpecial) ? destSpecial.includes('RiverAccess') : destSpecial === 'RiverAccess';

                    if (currentHasRiverAccess && destHasRiverAccess) {
                        moveType = 'RIVER' as MoveType;
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

  const destinationRegionModel = gameState.getRegionById(destinationRegionId); // MODIFIED
  if (!destinationRegionModel) {
    gameState.log(`MOVE FAIL: ${characterModel.name} to ${destinationRegionId} - Destination region not found.`);
    return false;
  }

  if (!canEnterRegion(characterModel, destinationRegionModel, gameState)) {
    gameState.log(`MOVE FAIL: ${characterModel.name} cannot enter ${destinationRegionModel.name} (e.g., capacity full, or 0 capacity and no enemies/not empty).`);
    return false;
  }

  const oldRegionId = characterModel.getLocation();
  const oldRegionName = oldRegionId ? gameState.getRegionById(oldRegionId)?.name : 'off-board'; // MODIFIED

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

  if (destinationRegionModel.containsEnemy(characterModel.faction)) {
    gameState.log(`Battle triggered in ${destinationRegionModel.name} involving ${characterModel.name}.`);
    const attackersInRegion = destinationRegionModel.getOccupants(characterModel.faction).map(c => c); // getOccupants returns string[]
    const defendingFaction = characterModel.faction === ("Fellowship" as Faction) ? ("Sauron" as Faction) : ("Fellowship" as Faction);
    const defendersInRegion = destinationRegionModel.getOccupants(defendingFaction).map(c => c); // getOccupants returns string[]

    gameState.setActiveBattle({
        regionId: destinationRegionId,
        regionName: destinationRegionModel.name,
        triggeringCharacterId: characterModel.id,
        attackingFaction: characterModel.faction,
        attackers: attackersInRegion, // these are string IDs
        defendingFaction: defendingFaction,
        defenders: defendersInRegion, // these are string IDs
    });
  }
  return true;
}

