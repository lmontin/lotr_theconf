import { ICharacter, ICharacterVersion, ICharacterAbility } from '../../types/data';
import { GameState } from './GameState'; // Assuming GameState is in the same directory
import { Faction } from './GameState'; // Import Faction type

export class Character {
  public readonly id: string;
  public readonly name: string;
  public readonly faction: Faction;
  private currentVersionData: ICharacterVersion;
  public strength: number;
  public isRingbearer: boolean; // Added for game logic

  public is_revealed: boolean;
  public is_defeated: boolean;
  public location: string | null; // Region ID, null if not on board
  private game: GameState; // Reference to the game state for logging or other interactions

  constructor(charData: ICharacter, game: GameState, version: 'classic' | 'enhanced' = 'classic') {
    this.id = charData.id;
    this.name = charData.name;
    this.faction = charData.faction;
    this.game = game;

    const selectedVersion = charData.versions[version];
    if (!selectedVersion) {
      throw new Error(`Version ${version} not found for character ${charData.name}`);
    }
    this.currentVersionData = selectedVersion;
    this.strength = selectedVersion.strength;
    this.isRingbearer = false; // Default to false

    this.is_revealed = false;
    this.is_defeated = false;
    this.location = null; // Character needs to be placed initially
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
    // Placeholder for abilities like Crebain that keep a character revealed
    // e.g., check for active effects on this character in GameState
    return false;
  }

  public defeat(): void {
    if (!this.is_defeated) {
      this.is_defeated = true;
      this.is_revealed = true; // Defeated characters are typically revealed
      this.game.log(`${this.name} has been defeated.`);
      // Further logic: remove from region, move to a defeated pile, etc.
    }
  }

  public setLocation(regionId: string | null, gameState?: GameState): void { // gameState param is optional for compatibility
    const gameInstance = gameState || this.game;
    this.location = regionId;
    if (regionId) {
        gameInstance.log(`${this.name} moved to ${gameInstance.getRegion(regionId)?.name || regionId}.`);
    } else {
        gameInstance.log(`${this.name} was removed from the board.`);
    }
  }

  public getCurrentVersionData(): ICharacterVersion {
    return this.currentVersionData;
  }

  public getAbilities(): ICharacterAbility[] { // Return type updated
    return this.currentVersionData.abilities || [];
  }

  public get locationId(): string | null {
    return this.location;
  }
}
