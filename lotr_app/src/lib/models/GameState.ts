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
    // console.log(message); // Commented out to reduce test noise
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

  public isCharacterRevealed(characterId: string): boolean { // Added method
    return this.revealedCharacters.has(characterId);
  }

  public removeRevealedCharacter(characterId: string): void { // Added method
    this.revealedCharacters.delete(characterId);
    this.log(`Character ${characterId} concealed.`);
  }

  public getCharacterLocation(characterId: string): string | null | undefined { // Added method
    const character = this.getCharacterById(characterId);
    return character?.getLocation();
  }

  public setCharacterLocation(characterId: string, regionId: string | null): void { // Added method
    const character = this.getCharacterById(characterId);
    if (character) {
      character.setLocation(regionId);
      if (regionId) {
        this.log(`Character ${character.name} location set to ${regionId}`);
      } else {
        this.log(`Character ${character.name} location cleared.`);
      }
    } else {
      this.log(`Attempted to set location for non-existent character ${characterId}`);
    }
  }

  public getRegionById(regionId: string): RegionModel | undefined {
    return this.regionModels.get(regionId);
  }

  // Alias for getRegionById (used by tests)
  public getRegionModel(regionId: string): RegionModel | undefined {
    return this.getRegionById(regionId);
  }

  // Methods needed by movement tests
  public getLastMove(): any {
    return this.lastMove;
  }

  public getActiveBattle(): any {
    return this.activeBattle;
  }

  // Placeholder for advancing turn and phase
  public nextPhase(): void { // Renamed from advancePhase to match test usage
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
    if (!this.gameOver && this.turn > 20) { // MODIFIED: Check if gameOver is not already true
        this.setWinner('Draw');
        this.log('Game Over. Max turns reached.');
    }
  }

  public setWinner(winner: Faction | 'Draw'): void {
    if (!this.gameOver) { // MODIFIED: Only set winner if game is not already over
      this.winner = winner;
      this.gameOver = true;
      this.currentPhase = 'GAME_OVER';
      this.log(`Game Over. Winner: ${winner}`);
    } else {
      this.log(`Attempted to set winner to ${winner}, but game is already over. Winner remains ${this.winner}`);
    }
  }

  public checkAndTriggerHandReclaim(): void { // Added method
    const fellowshipDiscards = this.fellowshipPlayer.discard.length;
    const sauronDiscards = this.sauronPlayer.discard.length;

    if (fellowshipDiscards >= 9 && sauronDiscards >= 9) {
      this.log('Hand reclaim triggered for both players.');
      this.fellowshipPlayer.reclaimHand();
      this.sauronPlayer.reclaimHand();
    } else if (fellowshipDiscards >= 9) {
      this.log('Fellowship player has 9+ discards, but Sauron player does not. No reclaim.');
    } else if (sauronDiscards >= 9) {
      this.log('Sauron player has 9+ discards, but Fellowship player does not. No reclaim.');
    } else {
      // this.log('Neither player has enough discards for hand reclaim.');
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

  public randomlyPlaceFactionCharacters(faction: Faction): void {
    this.log(`Attempting to randomly place characters for ${faction}.`);
    const unplacedCharacters = Array.from(this.characterInstances.values()).filter(
      char => char.faction === faction && !char.getLocation()
    );

    if (unplacedCharacters.length === 0) {
      this.log(`No unplaced characters for ${faction} to place.`);
      return;
    }

    const factionStartingRegions = Array.from(this.regionModels.values()).filter(region => {
      const capacity = faction === 'Fellowship' ? region.capacity.Fellowship : region.capacity.Sauron;
      return capacity && capacity > 0;
    });

    if (factionStartingRegions.length === 0) {
      this.log(`No starting regions found for ${faction}. Cannot place characters.`);
      return;
    }

    this.log(`Found ${unplacedCharacters.length} unplaced characters for ${faction}.`);
    this.log(`Found ${factionStartingRegions.length} potential starting regions for ${faction}.`);

    for (const character of unplacedCharacters) {
      // Filter regions that still have capacity for this faction
      const availableRegions = factionStartingRegions.filter(region => {
        const factionOccupantsCount = region.getOccupants(faction).length;
        const capacity = faction === 'Fellowship' ? region.capacity.Fellowship : region.capacity.Sauron;
        return capacity && factionOccupantsCount < capacity;
      });

      if (availableRegions.length === 0) {
        this.log(`No available starting regions with capacity for ${character.name} (${faction}). Skipping placement.`);
        continue; // Skip this character if no suitable region is found
      }

      // Select a random region from the available ones
      const randomRegionIndex = Math.floor(Math.random() * availableRegions.length);
      const selectedRegion = availableRegions[randomRegionIndex];

      this.placeCharacter(character.id, selectedRegion.id);
      // placeCharacter already logs the placement
    }
    this.log(`Finished random placement for ${faction}.`);
  }


  // Getters for basic game state information
  public getTurn(): number { return this.turn; }
  public getCurrentPhase(): GamePhase { return this.currentPhase; }
  public getCurrentPlayer(): Faction { return this.currentPlayer; }

  // ADDED: Methods needed by GameBoard component
  public getAllCharacters(): CharacterModel[] {
    return Array.from(this.characterInstances.values());
  }

  public getAllRegions(): RegionModel[] {
    return Array.from(this.regionModels.values());
  }
}
