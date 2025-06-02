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

  public getRegionModel(regionId: string): RegionModel | undefined {
    return this.regionModels.get(regionId);
  }

  public getTurn(): number {
    return this.turn;
  }

  public getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }

  public setActiveBattle(battleData: any | null): void {
    this.activeBattle = battleData;
    if (battleData) {
      this.log(`Active battle initiated: ${JSON.stringify(battleData)}`);
    } else {
      this.log(`Active battle cleared.`);
    }
  }
  
  public getLastMove(): any | null { // ADDED
    return this.lastMove;
  }

  public getActiveBattle(): any | null { // ADDED
    return this.activeBattle;
  }
  
  // TODO: Review if getCharactersInRegion is still needed or if logic
  // using it (e.g. in older versions of canEnterRegion) has been fully migrated
  // to use RegionModel.getOccupants() directly.
  // For now, assuming it's not essential if canEnterRegion is updated.
}
