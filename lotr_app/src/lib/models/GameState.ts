import { ICharacter, IRegion, ICombatCard } from '../../types/data';
import { Player } from './Player';
import { CharacterModel } from './Character'; // Corrected: Assuming Character.ts exports CharacterModel directly
import { RegionModel } from './Region'; // Reverted to standard named import

export type GamePhase = 'SETUP' | 'FELLOWSHIP_MOVE' | 'FELLOWSHIP_ACTION' | 'SAURON_MOVE' | 'SAURON_ACTION' | 'UPKEEP' | 'GAME_OVER';
export type Faction = 'Fellowship' | 'Sauron';

export class GameState {
  private turn: number;
  private currentPhase: GamePhase;
  private currentPlayer: Faction;
  public winner: Faction | 'Draw' | null;
  public gameLog: string[];
  public battleHistory: any[]; // Added for battle outcomes
  public revealedCharacters: Set<string>; // Added to track revealed characters
  public activeBattle: any | null; // Added for ongoing battle state
  public lastMove: any | null; // Added to store last move data
  public gameOver: boolean; // Added explicit gameOver flag

  public fellowshipPlayer: Player;
  public sauronPlayer: Player;

  // Data from gamedata.json
  private charactersData: ICharacter[];
  private regionsData: IRegion[];
  private combatCardsData: ICombatCard[];

  // private regionStates: Map<string, { region: IRegion; characters: string[] }>; // MODIFIED
  private regionModels: Map<string, RegionModel>; // MODIFIED: Store RegionModel instances

  private characterInstances: Map<string, CharacterModel>; // To store Character instances

  constructor(gameData: { characters: ICharacter[], regions: IRegion[], combatCards: ICombatCard[] }) {
    this.turn = 1;
    this.currentPhase = 'SETUP';
    this.currentPlayer = 'Fellowship';
    this.winner = null;
    this.gameLog = [];
    this.battleHistory = [];
    this.revealedCharacters = new Set<string>();
    this.activeBattle = null;
    this.lastMove = null;
    this.gameOver = false;

    this.charactersData = gameData.characters;
    this.regionsData = gameData.regions;
    this.combatCardsData = gameData.combatCards;

    this.fellowshipPlayer = new Player('Fellowship', this.combatCardsData.filter(c => c.faction === 'Fellowship' || c.faction === 'Either'));
    this.sauronPlayer = new Player('Sauron', this.combatCardsData.filter(c => c.faction === 'Sauron' || c.faction === 'Either'));

    // this.regionStates = new Map(); // MODIFIED
    this.regionModels = new Map<string, RegionModel>(); // MODIFIED
    this.initializeRegions();
    this.characterInstances = new Map();
    this.initializeCharacters(gameData.characters);

    this.log('Game initialized. Turn 1, Phase: SETUP, Player: Fellowship');
  }

  private initializeRegions(): void {
    this.regionsData.forEach(regionData => { 
      const regionModelInstance = new RegionModel(regionData, this); // Use standard named import
      this.regionModels.set(regionData.id, regionModelInstance); 
    });
  }

  private initializeCharacters(charactersData: ICharacter[]): void {
    charactersData.forEach(charData => {
      const character = new CharacterModel(charData, this);
      this.characterInstances.set(charData.id, character);
      // Initial placement can be done here or by a separate setup method
      // For now, characters are created but not placed on the board by default
    });
  }

  public log(message: string): void {
    console.log(message);
    this.gameLog.push(`[Turn ${this.turn} - ${this.currentPlayer} - ${this.currentPhase}]: ${message}`);
  }

  public logBattle(battleData: any): void {
    this.battleHistory.push(battleData);
    this.log(`Battle logged: ${JSON.stringify(battleData)}`); // Basic logging of battle data
  }

  public setLastMove(moveData: any): void {
    this.lastMove = moveData;
    this.log(`Last move set: ${JSON.stringify(moveData)}`);
  }

  public addRevealedCharacter(characterId: string): void {
    this.revealedCharacters.add(characterId);
    this.log(`Character ${characterId} revealed.`);
  }

  // ADDED: New public methods
  public getCharacterById(characterId: string): CharacterModel | undefined {
    return this.characterInstances.get(characterId);
  }

  public getAllCharacters(): CharacterModel[] {
    return Array.from(this.characterInstances.values());
  }

  public getAllRegions(): RegionModel[] {
    return Array.from(this.regionModels.values());
  }

  // Example of how to get a region by ID, if needed later
  public getRegionById(regionId: string): RegionModel | undefined {
    return this.regionModels.get(regionId);
  }

  // Placeholder for advancing turn and phase
  public advancePhase(): void {
    // Basic phase progression logic (can be expanded)
    switch (this.currentPhase) {
      case 'SETUP':
        this.currentPhase = 'FELLOWSHIP_MOVE';
        this.currentPlayer = 'Fellowship';
        break;
      case 'FELLOWSHIP_MOVE':
        this.currentPhase = 'FELLOWSHIP_ACTION';
        break;
      case 'FELLOWSHIP_ACTION':
        this.currentPhase = 'SAURON_MOVE';
        this.currentPlayer = 'Sauron';
        break;
      case 'SAURON_MOVE':
        this.currentPhase = 'SAURON_ACTION';
        break;
      case 'SAURON_ACTION':
        this.currentPhase = 'UPKEEP';
        this.currentPlayer = 'Fellowship'; // Or determine based on game rules
        this.turn++;
        break;
      case 'UPKEEP':
        this.currentPhase = 'FELLOWSHIP_MOVE';
        break;
      case 'GAME_OVER':
        // No phase change
        break;
      default:
        this.log('Unknown game phase');
    }
    this.log(`Phase advanced to ${this.currentPhase}. Current player: ${this.currentPlayer}. Turn: ${this.turn}`);
  }

  // Placeholder for checking game over conditions
  public checkGameOver(): void {
    // Example condition: Sauron wins if Frodo is corrupted or captured
    // Example condition: Fellowship wins if the One Ring is destroyed
    // This needs to be implemented based on specific game rules
    if (this.turn > 20) { // Example: Game ends after 20 turns (placeholder)
        this.winner = 'Draw'; // Or determine winner based on victory points
        this.currentPhase = 'GAME_OVER';
        this.gameOver = true;
        this.log('Game Over. Max turns reached.');
    }
  }

  // Method to place a character in a region
  public placeCharacter(characterId: string, regionId: string): boolean {
    const character = this.characterInstances.get(characterId);
    const region = this.regionModels.get(regionId);

    if (character && region) {
      // Remove character from previous region if any
      this.regionModels.forEach(r => r.removeOccupant(characterId)); // MODIFIED: Renamed to removeOccupant
      // Add character to new region
      region.addOccupant(character.id); // MODIFIED: Renamed to addOccupant and pass ID
      character.setLocation(regionId); // MODIFIED: Renamed to setLocation
      this.log(`Placed character ${character.name} in region ${region.name}`);
      return true;
    }
    this.log(`Failed to place character ${characterId} in region ${regionId}. Character or region not found.`);
    return false;
  }

    // Method to move a character from one region to another
    public moveCharacter(characterId: string, toRegionId: string): boolean {
        const character = this.getCharacterById(characterId);
        const toRegion = this.getRegionById(toRegionId);

        if (!character) {
            this.log(`Move failed: Character ${characterId} not found.`);
            return false;
        }
        if (!toRegion) {
            this.log(`Move failed: Target region ${toRegionId} not found.`);
            return false;
        }

        const fromRegionId = character.getLocation(); // MODIFIED: Renamed to getLocation
        if (fromRegionId) {
            const fromRegion = this.getRegionById(fromRegionId);
            if (fromRegion) {
                fromRegion.removeOccupant(characterId); // MODIFIED: Renamed to removeOccupant
            }
        }

        toRegion.addOccupant(character.id); // MODIFIED: Renamed to addOccupant and pass ID
        character.setLocation(toRegionId); // MODIFIED: Renamed to setLocation
        this.log(`Character ${character.name} moved to ${toRegion.name}.`);
        // Potentially trigger other game events here (e.g., revealing character, battle)
        return true;
    }


  // Getters for basic game state information
  public getTurn(): number { return this.turn; }
  public getCurrentPhase(): GamePhase { return this.currentPhase; }
  public getCurrentPlayer(): Faction { return this.currentPlayer; }
}
