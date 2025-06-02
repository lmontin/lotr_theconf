import type { IRegion, Faction } from '../../types/data'; // Corrected path
import type { GameState } from './GameState'; // Reverted: Restore GameState import
import type { CharacterModel } from './Character'; // Add Character import for methods

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


  private occupantIds: string[];
  private occupants: Map<string, CharacterModel>; // Store character objects directly
  private game: GameState; // Reverted: Restore GameState type

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

    this.occupantIds = []; 
    this.occupants = new Map(); // Initialize character map
    this.game = game;
  }

  public addOccupant(characterId: string): void {
    if (!this.occupantIds.includes(characterId)) {
      this.occupantIds.push(characterId);
      // Also update the occupants map with the CharacterModel from the game state
      const charModel = this.game.getCharacterById(characterId);
      if (charModel) {
        this.occupants.set(characterId, charModel);
        // Debug output
        console.log(`[Region:addOccupant] Added ${characterId} to ${this.name}. OccupantIds:`, this.occupantIds);
      } else {
        console.log(`[Region:addOccupant] WARNING: CharacterModel for ${characterId} not found in game state when adding to ${this.name}`);
      }
    } else {
      // Debug output
      console.log(`[Region:addOccupant] ${characterId} already present in ${this.name}. OccupantIds:`, this.occupantIds);
    }
    // Always print current occupants for debugging
    console.log(`[Region:addOccupant] Current occupants in ${this.name}:`, Array.from(this.occupants.keys()));
  }

  public removeOccupant(characterId: string): void {
    const index = this.occupantIds.indexOf(characterId);
    if (index > -1) {
      this.occupantIds.splice(index, 1);
      this.occupants.delete(characterId);
      // Debug output
      console.log(`[Region:removeOccupant] Removed ${characterId} from ${this.name}. OccupantIds:`, this.occupantIds);
    } else {
      // Debug output
      console.log(`[Region:removeOccupant] Tried to remove ${characterId} from ${this.name}, but not present. OccupantIds:`, this.occupantIds);
    }
    // Always print current occupants for debugging
    console.log(`[Region:removeOccupant] Current occupants in ${this.name}:`, Array.from(this.occupants.keys()));
  }

  public getOccupants(faction?: Faction): CharacterModel[] {
    if (!faction) {
      // Return all characters from our local map
      return this.occupantIds.map(charId => this.occupants.get(charId)).filter(char => char !== undefined) as CharacterModel[];
    }
    // Return characters of specific faction from our local map
    return this.occupantIds.map(charId => {
      const char = this.occupants.get(charId);
      return char && char.faction === faction ? char : null;
    }).filter(char => char !== null) as CharacterModel[];
  }

  // Helper method to check if region contains a character by ID
  public containsCharacter(characterId: string): boolean {
    return this.occupantIds.includes(characterId);
  }

  public containsEnemy(friendlyFaction: Faction): boolean {
    return this.occupantIds.some(charId => {
      const char = this.occupants.get(charId);
      return char && char.faction !== friendlyFaction;
    });
  }

  public getCapacity(faction: Faction): number {
    // Use the shared factionCapacity for both factions
    return this.factionCapacity || 0;
  }

  // Add character management methods expected by tests
  public addCharacter(character: CharacterModel): void {
    this.addOccupant(character.id); // Use existing ID tracking
    this.occupants.set(character.id, character); // Store character object
  }

  public removeCharacter(character: CharacterModel): void {
    this.removeOccupant(character.id); // Use existing ID tracking
    this.occupants.delete(character.id); // Remove character object
  }

  public isAtCapacity(faction: Faction): boolean {
    const currentCount = this.getOccupants(faction).length;
    const maxCapacity = this.getCapacity(faction);
    return currentCount >= maxCapacity;
  }
}
