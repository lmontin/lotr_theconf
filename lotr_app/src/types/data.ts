export type Faction = "Fellowship" | "Sauron";

export type GamePhase = 'SETUP' | 'FELLOWSHIP_MOVE' | 'FELLOWSHIP_ACTION' | 'SAURON_MOVE' | 'SAURON_ACTION' | 'UPKEEP' | 'GAME_OVER';

export type MoveType = 'FORWARD' | 'RIVER' | 'SEA' | 'FELLOWSHIP_SPECIAL_FORWARD' | 'RETREAT' | 'SPECIAL' | 'TUNNEL' | 'SPECIAL_ATTACK';

export interface IMoveOption {
  type: MoveType;
  destinationRegionId: string;
  destinationRegionName: string;
}

export interface IMoveLogEntry {
  characterId: string;
  characterName: string;
  fromRegionId: string | null;
  fromRegionName: string | null; // Changed from string to string | null
  toRegionId: string;
  toRegionName: string;
  moveType: MoveType;
  turn: number;
  phase: GamePhase; // Changed from any
}

export interface IRegion {
  id: string;
  name: string;
  row: number;
  position: number;
  special?: string | string[];
  fellowshipAdjacent?: string[];
  sauronAdjacent?: string[];
  fellowshipSpecialMovement?: string[]; // Renamed from fellowshipSpecialForward for clarity
  startingCapacityFellowship?: number;
  startingCapacitySauron?: number;
  startingCapacity?: number;
  factionCapacity?: number; // Uncommented to support test data
  isStronghold?: boolean; // Derived property, not in JSON
  isCity?: boolean; // Derived property, not in JSON
  isRiverAccess?: boolean; // Derived property, not in JSON
  adjacentRegions?: string[]; // Derived property, not in JSON
}

export interface ICharacterAbility {
  id: string;
  text: string;
  trigger: string; // Consider creating an enum for trigger types
  condition?: string; // Consider creating an enum for condition types
}

export interface ICharacterVersion {
  id?: string; // Optional for backwards compatibility with test data
  name?: string; // name also seems to be on the parent ICharacter
  strength: number;
  abilities?: ICharacterAbility[]; // Updated from string[]
  flavorText?: string;
  illustrator?: string;
  combatCardLimit?: number;
}

export interface ICharacter {
  id: string;
  name: string;
  faction: Faction; // Use the new Faction type
  versions: {
    classic?: ICharacterVersion;
    enhanced?: ICharacterVersion;
  };
  // location?: string | null; // Location is dynamic, part of game state, not static data
}

export interface ICombatCardAbility {
  id: string;
  text: string;
  trigger: string;
  condition?: string;
}

export interface ICombatCard {
  id: string;
  name: string;
  faction: Faction | "Either"; // Use Faction type
  cardType: "text" | "strength"; // Added from gameData.json
  strength: number | null; // Updated to be number or null
  abilities?: ICombatCardAbility[]; // Updated from string[]
  resolutionOrder: number;
  // effectDescription: string; // Covered by abilities.text
  flavorText?: string;
  illustrator?: string;
}

export interface IGameData {
  characters: ICharacter[];
  regions: IRegion[];
  combatCards: ICombatCard[];
}

// Added for active battle structure
export interface IActiveBattle {
  regionId: string;
  regionName: string;
  triggeringCharacterId: string;
  attackingFaction: Faction;
  attackers: string[]; // list of character IDs
  defendingFaction: Faction;
  defenders: string[]; // list of character IDs
}
