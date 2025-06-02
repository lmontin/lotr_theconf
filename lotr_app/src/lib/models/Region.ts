import type { IRegion, Faction } from '../../types/data'; // Corrected path
import type { GameState } from './GameState'; // Reverted: Restore GameState import

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
  public readonly isStronghold?: boolean;
  public readonly isCity?: boolean;
  public readonly isRiverAccess?: boolean; 
  public readonly adjacentRegions: string[];


  private occupantIds: string[];
  private game: GameState; // Reverted: Restore GameState type

  constructor(data: IRegion, game: GameState) { // Reverted: Restore GameState type
    this.id = data.id;
    this.name = data.name;
    this.row = data.row;
    this.position = data.position;
    this.special = data.special;
    this.fellowshipAdjacent = data.fellowshipAdjacent;
    this.sauronAdjacent = data.sauronAdjacent;
    this.fellowshipSpecialMovement = data.fellowshipSpecialForward; // Changed from data.fellowshipSpecialMovement
    this.capacity = {
        Fellowship: data.startingCapacityFellowship,
        Sauron: data.startingCapacitySauron,
        total: data.startingCapacity 
    };
    this.isStronghold = data.special?.includes("stronghold"); 
    this.isCity = data.special?.includes("city"); 
    this.adjacentRegions = Array.from(new Set([...(data.fellowshipAdjacent || []), ...(data.sauronAdjacent || [])]));
    this.isRiverAccess = data.special?.includes("river-access");

    this.occupantIds = []; 
    this.game = game;
  }

  public addOccupant(characterId: string): void {
    if (!this.occupantIds.includes(characterId)) {
      this.occupantIds.push(characterId);
    }
  }

  public removeOccupant(characterId: string): void {
    const index = this.occupantIds.indexOf(characterId);
    if (index > -1) {
      this.occupantIds.splice(index, 1);
    }
  }

  public getOccupants(faction?: Faction): string[] {
    if (!this.game) {
        console.error(`RegionModel ${this.name} does not have a game instance.`);
        return [];
    }
    if (!faction) {
      return [...this.occupantIds];
    }
    return this.occupantIds.filter(charId => {
      const char = this.game.getCharacterById(charId);
      return char && char.faction === faction;
    });
  }

  public containsEnemy(friendlyFaction: Faction): boolean {
    if (!this.game) {
        console.error(`RegionModel ${this.name} does not have a game instance for containsEnemy check.`);
        return false;
    }
    return this.occupantIds.some(charId => {
      const char = this.game.getCharacterById(charId);
      return char && char.faction !== friendlyFaction;
    });
  }

  public getCapacity(faction: Faction): number {
    // Ensure Faction type is correctly used for indexing
    if (faction === 'Fellowship') return this.capacity.Fellowship || 0;
    if (faction === 'Sauron') return this.capacity.Sauron || 0;
    return 0; 
  }
}
