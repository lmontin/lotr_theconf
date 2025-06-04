import { ICharacter, ICharacterVersion, ICharacterAbility, Faction } from '../../types/data'; // Corrected path and added Faction
import { GameState } from './GameState';
import { detailedLogger } from '../utils/detailedLogger';

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

  public setDefeated(defeatedStatus: boolean, removeCharacterFromBoard: boolean = true): void {
    detailedLogger.debug('BATTLE', 'Character', 'setDefeated',
      `Setting defeated status for ${this.name} to ${defeatedStatus}`,
      {
        characterName: this.name,
        characterId: this.id,
        faction: this.faction,
        currentLocation: this.location,
        wasDefeated: this.defeated,
        newDefeatedStatus: defeatedStatus,
        removeCharacterFromBoard: removeCharacterFromBoard
      });

    if (this.defeated !== defeatedStatus) {
        this.defeated = defeatedStatus;
        if (defeatedStatus) {
            this.is_revealed = true; // Defeated characters are revealed
            this.game.log(`${this.name} has been defeated.`);

            detailedLogger.info('BATTLE', 'Character', 'setDefeated',
              `${this.name} has been defeated and revealed`,
              {
                characterName: this.name,
                characterId: this.id,
                faction: this.faction,
                wasRevealed: !this.is_revealed
              });

            // Remove from current region if defeated and on board, and if explicitly requested
            if (this.location && removeCharacterFromBoard) {
                const currentRegionName = this.game.getRegionById(this.location)?.name || 'unknown region';
                this.game.log(`${this.name} is removed from ${currentRegionName} due to defeat.`);

                detailedLogger.info('BATTLE', 'Character', 'setDefeated',
                  `Removing defeated character ${this.name} from board`,
                  {
                    characterName: this.name,
                    characterId: this.id,
                    faction: this.faction,
                    previousLocation: this.location,
                    previousRegionName: currentRegionName
                  });

                // Set location to null to remove character from board
                this.location = null;

                detailedLogger.info('BATTLE', 'Character', 'setDefeated',
                  `Character ${this.name} successfully removed from board`,
                  {
                    characterName: this.name,
                    characterId: this.id,
                    newLocation: this.location
                  });
            } else if (this.location && !removeCharacterFromBoard) {
                detailedLogger.debug('BATTLE', 'Character', 'setDefeated',
                  `${this.name} was defeated but remains on board as requested`,
                  { characterName: this.name, characterId: this.id, currentLocation: this.location });
            } else {
                detailedLogger.debug('BATTLE', 'Character', 'setDefeated',
                  `${this.name} was defeated but was not on board`,
                  { characterName: this.name, characterId: this.id });
            }
        } else {
            // Logic for reviving a character if needed, though less common
            this.game.log(`${this.name} is no longer defeated.`);
            detailedLogger.info('BATTLE', 'Character', 'setDefeated',
              `${this.name} is no longer defeated`,
              { characterName: this.name, characterId: this.id, faction: this.faction });
        }
    } else {
        detailedLogger.trace('BATTLE', 'Character', 'setDefeated',
          `No change needed - ${this.name} defeated status already ${defeatedStatus}`,
          { characterName: this.name, characterId: this.id, currentStatus: this.defeated });
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
