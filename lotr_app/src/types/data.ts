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
  factionCapacity: number;
}

export interface ICharacterVersion {
  id: string;
  name: string;
  strength: number;
  specialAbilities?: string[];
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
}

export interface ICombatCard {
  id: string;
  name: string;
  faction: "Fellowship" | "Sauron" | "Either";
  resolutionOrder: number;
  strengthBonus?: number;
  specialAbilities?: string[];
  effectDescription: string;
  flavorText?: string;
  illustrator?: string;
}
