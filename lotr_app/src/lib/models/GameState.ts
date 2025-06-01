import { ICharacter, IRegion, ICombatCard } from '../../types/data';
import { Player } from './Player';
import { Character as CharacterModel } from './Character'; // Alias to avoid naming conflict
import { Region as RegionModel } from './Region'; // Alias for Region model

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
  public characterLocations: Map<string, string>; // Added for character locations (characterId -> regionId)
  public activeBattle: any | null; // Added for ongoing battle state
  public lastMove: any | null; // Added to store last move data
  public gameOver: boolean; // Added explicit gameOver flag

  public fellowshipPlayer: Player;
  public sauronPlayer: Player;

  // Data from gamedata.json
  private charactersData: ICharacter[];
  private regionsData: IRegion[];
  private combatCardsData: ICombatCard[];

  private regionStates: Map<string, { region: IRegion; characters: string[] }>;

  private characterInstances: Map<string, CharacterModel>; // To store Character instances

  constructor(gameData: { characters: ICharacter[], regions: IRegion[], combatCards: ICombatCard[] }) {
    this.turn = 1;
    this.currentPhase = 'SETUP';
    this.currentPlayer = 'Fellowship';
    this.winner = null;
    this.gameLog = [];
    this.battleHistory = []; // Initialize battleHistory
    this.revealedCharacters = new Set<string>(); // Initialize revealedCharacters
    this.characterLocations = new Map<string, string>(); // Initialize characterLocations
    this.activeBattle = null; // Initialize activeBattle
    this.lastMove = null; // Initialize lastMove
    this.gameOver = false; // Initialize gameOver

    this.charactersData = gameData.characters;
    this.regionsData = gameData.regions;
    this.combatCardsData = gameData.combatCards;

    // Adjusted Player instantiation to match Player constructor (faction, initialDeck)
    this.fellowshipPlayer = new Player('Fellowship', this.combatCardsData.filter(c => c.faction === 'Fellowship' || c.faction === 'Either'));
    this.sauronPlayer = new Player('Sauron', this.combatCardsData.filter(c => c.faction === 'Sauron' || c.faction === 'Either'));

    this.regionStates = new Map();
    this.initializeRegions();
    this.characterInstances = new Map(); // Initialize characterInstances
    this.initializeCharacters(gameData.characters);

    this.log('Game initialized. Turn 1, Phase: SETUP, Player: Fellowship');
  }

  private initializeRegions(): void {
    this.regionsData.forEach(region => {
      this.regionStates.set(region.id, {
        region: region,
        characters: [] // Initially empty, placement will be handled later
      });
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

  public removeRevealedCharacter(characterId: string): void {
    this.revealedCharacters.delete(characterId);
    this.log(`Character ${characterId} concealed.`);
  }

  public isCharacterRevealed(characterId: string): boolean {
    return this.revealedCharacters.has(characterId);
  }

  public setCharacterLocation(characterId: string, regionId: string | null): void {
    if (regionId === null) {
      this.characterLocations.delete(characterId);
      this.log(`Character ${characterId} location removed.`);
    } else {
      this.characterLocations.set(characterId, regionId);
      this.log(`Character ${characterId} moved to region ${regionId}.`);
    }
  }

  public getCharacterLocation(characterId: string): string | undefined {
    return this.characterLocations.get(characterId);
  }

  public getTurn(): number {
    return this.turn;
  }

  public getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }

  public getCurrentPlayer(): Faction {
    return this.currentPlayer;
  }

  public getRegion(regionId: string): IRegion | undefined {
    return this.regionsData.find(r => r.id === regionId);
  }

  public getRegionState(regionId: string): { region: IRegion; characters: string[] } | undefined {
    return this.regionStates.get(regionId);
  }

  public getCharactersInRegion(regionId: string): string[] {
    return this.regionStates.get(regionId)?.characters || [];
  }

  public getCharacterById(characterId: string): CharacterModel | undefined {
    return this.characterInstances.get(characterId);
  }

  public getRegionModel(regionId: string): RegionModel | undefined {
    const regionData = this.regionsData.find(r => r.id === regionId);
    if (regionData) {
      // Assuming Region model constructor takes IRegion data
      return new RegionModel(regionData); // Corrected: Pass only regionData
    }
    return undefined;
  }

  /**
   * Checks if both players have 9 cards in their discard piles.
   * If so, each player reclaims their discard pile.
   */
  public checkAndTriggerHandReclaim(): void {
    const fellowshipDiscards = this.fellowshipPlayer.discard.length;
    const sauronDiscards = this.sauronPlayer.discard.length;

    if (fellowshipDiscards === 9 && sauronDiscards === 9) {
      this.fellowshipPlayer.reclaimDiscardPile();
      this.sauronPlayer.reclaimDiscardPile();
      this.log('Both players have reclaimed their combat cards.');
    }
  }

  // Basic turn and phase progression - to be expanded
  public nextPhase(): void {
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
        this.currentPlayer = 'Fellowship'; // Or handle upkeep logic for both
        break;
      case 'UPKEEP':
        this.turn++;
        this.currentPhase = 'FELLOWSHIP_MOVE';
        this.currentPlayer = 'Fellowship';
        break;
      case 'GAME_OVER':
        // No phase change
        return;
    }
    this.log(`Phase changed to ${this.currentPhase}. Current player: ${this.currentPlayer}. Turn: ${this.turn}`);
  }

  public setWinner(winner: Faction | 'Draw'): void {
    if (!this.winner) {
      this.winner = winner;
      this.currentPhase = 'GAME_OVER';
      this.gameOver = true; // Ensure gameOver flag is set
      this.log(`Game Over! Winner: ${winner}`);
    }
  }

  public saveGame(): string {
    this.log('Game state saved.'); // Log before serializing
    const stateToSave = {
      turn: this.turn,
      currentPhase: this.currentPhase,
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      gameLog: this.gameLog, // Now includes 'Game state saved.'
      battleHistory: this.battleHistory,
      revealedCharacters: Array.from(this.revealedCharacters),
      characterLocations: Array.from(this.characterLocations.entries()),
      activeBattle: this.activeBattle,
      lastMove: this.lastMove,
      gameOver: this.gameOver,
      fellowshipPlayer: this.fellowshipPlayer.toJSON(),
      sauronPlayer: this.sauronPlayer.toJSON(),
      // regionStates are implicitly part of characterLocations and initial setup
    };
    return JSON.stringify(stateToSave);
  }

  public loadGame(savedStateJSON: string, gameData: { characters: ICharacter[], regions: IRegion[], combatCards: ICombatCard[] }): void {
    const savedState = JSON.parse(savedStateJSON);

    this.turn = savedState.turn;
    this.currentPhase = savedState.currentPhase;
    this.currentPlayer = savedState.currentPlayer;
    this.winner = savedState.winner;
    this.gameLog = savedState.gameLog; // Overwrite with saved log
    this.battleHistory = savedState.battleHistory;
    this.revealedCharacters = new Set(savedState.revealedCharacters);
    this.characterLocations = new Map(savedState.characterLocations);
    this.activeBattle = savedState.activeBattle;
    this.lastMove = savedState.lastMove;
    this.gameOver = savedState.gameOver;

    // Re-initialize players with loaded state
    this.fellowshipPlayer = Player.fromJSON(savedState.fellowshipPlayer, gameData.combatCards.filter(c => c.faction === 'Fellowship' || c.faction === 'Either'));
    this.sauronPlayer = Player.fromJSON(savedState.sauronPlayer, gameData.combatCards.filter(c => c.faction === 'Sauron' || c.faction === 'Either'));

    // Re-initialize regions (they are static but their occupants might change based on characterLocations)
    this.initializeRegions(); // This resets regionStates.characters, which is fine as character locations are restored above.
    // If regionStates held more dynamic data, a more careful merge would be needed.

    this.log('Game state loaded.'); // Log after restoring everything
  }
}
