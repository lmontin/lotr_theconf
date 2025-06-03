import { ICharacter, ICharacterVersion, ICharacterAbility, Faction } from '../../types/data'; // Corrected path and added Faction
import { GameState } from './GameState';

export class CharacterModel implements ICharacter { // Changed class name to CharacterModel to match usage
  public readonly id: string;
  public readonly name: string;
  public readonly faction: Faction;
  public readonly versions: { // Added to satisfy ICharacter
    classic?: ICharacterVersion;
    enhanced?: ICharacterVersion;
  };
  private currentVersionData: ICharacterVersion;
  public strength: number;
  public isRingbearer: boolean; 

  public is_revealed: boolean;
  // public is_defeated: boolean; // Renamed to defeated to match usage in movement.ts
  public defeated: boolean; // Renamed from is_defeated
  public location: string | null; 
  private game: GameState; 

  constructor(charData: ICharacter, game: GameState, version: 'classic' | 'enhanced' = 'classic') {
    this.id = charData.id;
    this.name = charData.name;
    this.faction = charData.faction;
    this.versions = charData.versions; // Store versions
    this.game = game;

    const selectedVersion = charData.versions[version];
    if (!selectedVersion) {
      throw new Error(`Version ${version} not found for character ${charData.name}`);
    }
    this.currentVersionData = selectedVersion;
    this.strength = selectedVersion.strength;
    this.isRingbearer = false; 

    this.is_revealed = false;
    this.defeated = false; // Initialized defeated
    this.location = null; 
  }

  public reveal(): void {
    if (!this.is_revealed) {
      this.is_revealed = true;
      this.game.log(`${this.name} is revealed.`);
    }
  }

  public conceal(): void {
    if (this.is_revealed && !this.has_persistent_reveal()) {
      this.is_revealed = false;
      this.game.log(`${this.name} is concealed.`);
    }
  }

  public has_persistent_reveal(): boolean {
    return false;
  }

  // public defeat(): void { // Renamed to setDefeated to match usage
  //   if (!this.is_defeated) {
  //     this.is_defeated = true;
  //     this.is_revealed = true; 
  //     this.game.log(`${this.name} has been defeated.`);
  //   }
  // }

  public getLocation(): string | null { // Added getLocation as it was used in movement.ts
    return this.location;
  }

  public setLocation(regionId: string | null, isInitialSetup = false): void {
    const oldRegionId = this.location;
    const oldRegionName = oldRegionId ? this.game.getRegionById(oldRegionId)?.name : 'off the board';

    if (oldRegionId === regionId) {
      return;
    }

    this.location = regionId;

    if (regionId) {
      const newRegionModel = this.game.getRegionById(regionId);
      if (newRegionModel && !isInitialSetup) {
        this.game.log(`${this.name} moved from ${oldRegionName || 'unknown region'} to ${newRegionModel.name}.`);
      } else if (!newRegionModel) {
        this.game.log(`Error: Attempted to set location for ${this.name} to non-existent region ${regionId}. Location cleared.`);
        this.location = null;
      }
    } else {
      if (!isInitialSetup && oldRegionId) {
        this.game.log(`${this.name} was removed from the board (was in ${oldRegionName}).`);
      }
    }
  }

  public isDefeated(): boolean { // Added isDefeated as it was used in movement.ts
    return this.defeated;
  }

  public setDefeated(defeatedStatus: boolean): void { // Renamed from defeat and takes boolean
    if (this.defeated !== defeatedStatus) {
        this.defeated = defeatedStatus;
        if (defeatedStatus) {
            this.is_revealed = true; // Defeated characters are revealed
            this.game.log(`${this.name} has been defeated.`);
            // Remove from current region if defeated and on board
            if (this.location) {
                const currentRegion = this.game.getRegionById(this.location); // MODIFIED: Renamed to getRegionById
                currentRegion?.removeOccupant(this.id);
                // Consider if location should be set to null here or by calling setLocation(null)
                // For now, just removing from occupants. Game logic might explicitly move them.
            }
        } else {
            // Logic for reviving a character if needed, though less common
            this.game.log(`${this.name} is no longer defeated.`);
        }
    }
  }

  public getCurrentVersionData(): ICharacterVersion {
    return this.currentVersionData;
  }

  public getAbilities(): string[] {
    if (this.currentVersionData.abilities) {
      return this.currentVersionData.abilities.map(ability => ability.id);
    }
    return (this.currentVersionData as any).specialAbilities || [];
  }
}
