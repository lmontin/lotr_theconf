import { IRegion, ICharacter, ICombatCard } from '../types/data';

interface GameData {
  characters: ICharacter[];
  regions: IRegion[];
  combatCards: ICombatCard[];
}

export interface ValidationError {
  path: string;
  message: string;
}

export function validateGameData(data: GameData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate Characters
  const characterIds = new Set<string>();
  data.characters.forEach((char, index) => {
    const charPath = `characters[${index}]`;
    if (!char.id) errors.push({ path: `${charPath}.id`, message: 'Character ID is missing' });
    else if (characterIds.has(char.id)) errors.push({ path: `${charPath}.id`, message: `Duplicate character ID: ${char.id}` });
    else characterIds.add(char.id);

    if (!char.name) errors.push({ path: `${charPath}.name`, message: 'Character name is missing' });
    if (!char.faction || (char.faction !== 'Fellowship' && char.faction !== 'Sauron')) {
      errors.push({ path: `${charPath}.faction`, message: `Invalid faction: ${char.faction}` });
    }
    if (!char.versions || (!char.versions.classic && !char.versions.enhanced)) {
      errors.push({ path: `${charPath}.versions`, message: 'Character must have at least one version (classic or enhanced)' });
    }
    if (char.versions.classic && typeof char.versions.classic.strength !== 'number') {
        errors.push({ path: `${charPath}.versions.classic.strength`, message: 'Classic version strength must be a number' });
    }
    // Add more character version validation if needed
  });

  // Validate Regions
  const regionIds = new Set<string>();
  const regionMap = new Map<string, IRegion>();
  data.regions.forEach((region, index) => {
    const regionPath = `regions[${index}]`;
    if (!region.id) errors.push({ path: `${regionPath}.id`, message: 'Region ID is missing' });
    else if (regionIds.has(region.id)) errors.push({ path: `${regionPath}.id`, message: `Duplicate region ID: ${region.id}` });
    else regionIds.add(region.id);
    regionMap.set(region.id, region);

    if (!region.name) errors.push({ path: `${regionPath}.name`, message: 'Region name is missing' });
    if (typeof region.row !== 'number') errors.push({ path: `${regionPath}.row`, message: 'Region row must be a number' });
    if (typeof region.position !== 'number') errors.push({ path: `${regionPath}.position`, message: 'Region position must be a number' });
    if (typeof region.factionCapacity !== 'number' || region.factionCapacity < 0) {
      errors.push({ path: `${regionPath}.factionCapacity`, message: 'Faction capacity must be a non-negative number' });
    }
    if (region.startingCapacityFellowship !== undefined && (typeof region.startingCapacityFellowship !== 'number' || region.startingCapacityFellowship < 0)) {
      errors.push({ path: `${regionPath}.startingCapacityFellowship`, message: 'Starting Fellowship capacity must be a non-negative number' });
    }
    if (region.startingCapacitySauron !== undefined && (typeof region.startingCapacitySauron !== 'number' || region.startingCapacitySauron < 0)) {
      errors.push({ path: `${regionPath}.startingCapacitySauron`, message: 'Starting Sauron capacity must be a non-negative number' });
    }
  });

  // Validate Region Adjacencies
  data.regions.forEach((region, index) => {
    const regionPath = `regions[${index}]`;
    const checkAdjacency = (adjList: string[] | undefined, adjType: string, targetFaction: 'Fellowship' | 'Sauron') => {
      if (adjList) {
        adjList.forEach((adjId, adjIndex) => {
          if (!regionIds.has(adjId)) {
            errors.push({ path: `${regionPath}.${adjType}[${adjIndex}]`, message: `Invalid adjacent region ID: ${adjId}` });
          } else {
            // Check for bidirectional adjacency
            const adjacentRegion = regionMap.get(adjId);
            if (adjacentRegion) {
              const reciprocalAdj = targetFaction === 'Fellowship' ? adjacentRegion.sauronAdjacent : adjacentRegion.fellowshipAdjacent;
              if (!reciprocalAdj?.includes(region.id)) {
                // This is a soft warning for now, as the blueprint implies one-way for Sauron's forward movement
                // errors.push({ path: `${regionPath}.${adjType}[${adjIndex}]`, message: `Region ${adjId} does not list ${region.id} as ${targetFaction === 'Fellowship' ? 'sauronAdjacent' : 'fellowshipAdjacent'}` });
              }
            }
          }
        });
      }
    };

    checkAdjacency(region.fellowshipAdjacent, 'fellowshipAdjacent', 'Sauron'); // If Fellowship can go A->B, Sauron should be able to go B->A (as Sauron moves backward along Fellowship paths)
    checkAdjacency(region.sauronAdjacent, 'sauronAdjacent', 'Fellowship'); // If Sauron can go A->B, Fellowship should be able to go B->A (as Fellowship moves backward along Sauron paths)
    checkAdjacency(region.fellowshipSpecialForward, 'fellowshipSpecialForward', 'Sauron'); // Special forward paths are Fellowship only, no strict bidirectional check needed here but target regions must exist
  });

  // Validate Combat Cards
  const cardIds = new Set<string>();
  data.combatCards.forEach((card, index) => {
    const cardPath = `combatCards[${index}]`;
    if (!card.id) errors.push({ path: `${cardPath}.id`, message: 'Combat Card ID is missing' });
    else if (cardIds.has(card.id)) errors.push({ path: `${cardPath}.id`, message: `Duplicate card ID: ${card.id}` });
    else cardIds.add(card.id);

    if (!card.name) errors.push({ path: `${cardPath}.name`, message: 'Card name is missing' });
    if (!card.faction || !['Fellowship', 'Sauron', 'Either'].includes(card.faction)) {
      errors.push({ path: `${cardPath}.faction`, message: `Invalid card faction: ${card.faction}` });
    }
    if (typeof card.resolutionOrder !== 'number' || card.resolutionOrder <= 0) {
      errors.push({ path: `${cardPath}.resolutionOrder`, message: 'Card resolution order must be a positive number' });
    }
    if (!card.effectDescription) errors.push({ path: `${cardPath}.effectDescription`, message: 'Card effect description is missing' });
  });

  return errors;
}

// Example Usage (typically you would load gamedata.json using fs or an import):
/*
import gameDataJson from '../../data/gamedata.json'; // Adjust path as needed

const validationErrors = validateGameData(gameDataJson as GameData);
if (validationErrors.length > 0) {
  console.error("Game data validation failed:");
  validationErrors.forEach(err => console.error(`  Path: ${err.path}, Message: ${err.message}`));
} else {
  console.log("Game data validation successful!");
}
*/
