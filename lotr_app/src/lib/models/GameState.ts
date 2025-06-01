import { ICharacter, IRegion, ICombatCard } from '../../types/data';
import { Player } from './Player'; // Assuming Player class will be in Player.ts

export type GamePhase = 'SETUP' | 'FELLOWSHIP_MOVE' | 'FELLOWSHIP_ACTION' | 'SAURON_MOVE' | 'SAURON_ACTION' | 'UPKEEP' | 'GAME_OVER';
export type Faction = 'Fellowship' | 'Sauron';

export class GameState {
  private turn: number;
  private currentPhase: GamePhase;
  private currentPlayer: Faction;
  public winner: Faction | 'Draw' | null;
  public gameLog: string[];

  public fellowshipPlayer: Player;
  public sauronPlayer: Player;

  // Data from gamedata.json - will need to be loaded
  private charactersData: ICharacter[];
  private regionsData: IRegion[];
  private combatCardsData: ICombatCard[];

  // Runtime state of characters and regions
  // For now, let's assume regions can hold character IDs or simple character objects
  // A more robust Character class instance management will be part of Character.ts
  private regionStates: Map<string, { region: IRegion; characters: string[] }>; // Map regionId to its state

  constructor(gameData: { characters: ICharacter[], regions: IRegion[], combatCards: ICombatCard[] }) {
    this.turn = 1;
    this.currentPhase = 'SETUP';
    this.currentPlayer = 'Fellowship';
    this.winner = null;
    this.gameLog = [];

    this.charactersData = gameData.characters;
    this.regionsData = gameData.regions;
    this.combatCardsData = gameData.combatCards;

    this.fellowshipPlayer = new Player('Fellowship', false, this.combatCardsData.filter(c => c.faction === 'Fellowship' || c.faction === 'Either'));
    this.sauronPlayer = new Player('Sauron', true, this.combatCardsData.filter(c => c.faction === 'Sauron' || c.faction === 'Either'));

    this.regionStates = new Map();
    this.initializeRegions();
    // Initial character placement would happen here or in a dedicated setup method

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

  public log(message: string): void {
    console.log(message);
    this.gameLog.push(`[Turn ${this.turn} - ${this.currentPlayer} - ${this.currentPhase}]: ${message}`);
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
      this.log(`Game Over! Winner: ${winner}`);
    }
  }
}
