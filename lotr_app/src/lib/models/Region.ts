import type { IRegion, Faction } from '../../types/data';
import type { GameState } from './GameState';
import type { CharacterModel } from './Character';

export class RegionModel implements IRegion {
  public readonly id: string;
  public readonly name: string;
  public readonly row: number;
  public readonly position: number;
  public readonly special?: string | string[];
  public readonly fellowshipAdjacent?: string[];
  public readonly sauronAdjacent?: string[];
  public readonly fellowshipSpecialMovement?: string[];
  public readonly capacity: { // Assuming this structure from previous context
    Fellowship?: number;
    Sauron?: number;
    total?: number; // if used
  };
  public readonly factionCapacity: number; // Add this property expected by tests
  public readonly isStronghold?: boolean;
  public readonly isCity?: boolean;
  public readonly isRiverAccess?: boolean; 
  public readonly adjacentRegions: string[];


  private game: GameState;

  constructor(data: IRegion, game: GameState) { // Reverted: Restore GameState type
    this.id = data.id;
    this.name = data.name;
    this.row = data.row;
    this.position = data.position;
    this.special = data.special;
    this.fellowshipAdjacent = data.fellowshipAdjacent;
    this.sauronAdjacent = data.sauronAdjacent;
    this.fellowshipSpecialMovement = data.fellowshipSpecialMovement; // Use correct property name
    this.capacity = {
        Fellowship: data.startingCapacityFellowship,
        Sauron: data.startingCapacitySauron,
        total: data.startingCapacity 
    };
    this.factionCapacity = data.factionCapacity || 0;
    this.isStronghold = data.special?.includes("stronghold"); 
    this.isCity = data.special?.includes("city"); 
    this.adjacentRegions = Array.from(new Set([...(data.fellowshipAdjacent || []), ...(data.sauronAdjacent || [])]));
    this.isRiverAccess = data.special?.includes("river-access");

    this.game = game;
  }


  // --- New: Use GameState as single source of truth ---
  public getOccupants(faction?: Faction): CharacterModel[] {
    const charIds = Array.from(this.game.charactersIn(this.id));
    const allChars = charIds.map(id => this.game.getCharacterById(id)).filter(Boolean) as CharacterModel[];
    if (!faction) return allChars;
    return allChars.filter(char => char.faction === faction);
  }

  public containsCharacter(characterId: string): boolean {
    return this.game.regionOf(characterId) === this.id;
  }

  public containsEnemy(friendlyFaction: Faction): boolean {
    return this.getOccupants().some(char => char.faction !== friendlyFaction);
  }

  public getOccupants(faction?: Faction): CharacterModel[] {
    const charIds = Array.from(this.game.charactersIn(this.id));
    const allChars = charIds.map(id => this.game.getCharacterById(id)).filter(Boolean) as CharacterModel[];
    if (!faction) return allChars;
    return allChars.filter(char => char.faction === faction);
  }

  // Helper method to check if region contains a character by ID



  public getCapacity(faction: Faction): number {
    return this.factionCapacity || 0;
  }


  // Deprecated: addCharacter/removeCharacter/addOccupant/removeOccupant are no-ops (region view is derived from GameState)
  public addCharacter(_character: CharacterModel): void {}
  public removeCharacter(_character: CharacterModel): void {}
  public addOccupant(_characterId: string): void {}
  public removeOccupant(_characterId: string): void {}

  public isAtCapacity(faction: Faction): boolean {
    const currentCount = this.getOccupants(faction).length;
    const maxCapacity = this.getCapacity(faction);
    return currentCount >= maxCapacity;
  }
}
