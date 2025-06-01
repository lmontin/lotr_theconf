export interface IRegion {
  id: string;
  name: string;
  row: number;
  position: number;
  special?: string | string[];
  fellowshipAdjacent?: string[];
  sauronAdjacent?: string[];
  fellowshipSpecialForward?: string[];
  startingCapacityFellowship?: number;
  startingCapacitySauron?: number;
  startingCapacity?: number; // Added from gameData.json
  factionCapacity: number;
}

export interface ICharacterAbility {
  id: string;
  text: string;
  trigger: string; // Consider creating an enum for trigger types
  condition?: string; // Consider creating an enum for condition types
}

export interface ICharacterVersion {
  // id: string; // id seems to be on the parent ICharacter in gameData.json
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
  faction: "Fellowship" | "Sauron";
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
  faction: "Fellowship" | "Sauron" | "Either";
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
