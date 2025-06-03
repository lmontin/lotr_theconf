import { resolveSimpleBattle, resolveFullBattle } from '../systems/BattleSystem';

import { ICharacter, IRegion, ICombatCard } from '../../types/data';

import { Player } from './Player';
import { CharacterModel } from './Character';
import { RegionModel } from './Region';

// --- Lightweight in-memory region/character mapping ---
type CharacterId = string;
type RegionId = string;

class LightweightRegionCharacterIndex {
  // single source of truth: char_id -> region_id
  private charRegion: Map<CharacterId, RegionId> = new Map();
  // eager reverse index: region_id -> Set<char_id>
  private regionChars: Map<RegionId, Set<CharacterId>> = new Map();

  addCharacter(charId: CharacterId, regionId: RegionId): void {
    if (this.charRegion.has(charId)) {
      throw new Error(`${charId} already on the board`);
    }
    this.charRegion.set(charId, regionId);
    if (!this.regionChars.has(regionId)) {
      this.regionChars.set(regionId, new Set());
    }
    this.regionChars.get(regionId)!.add(charId);
  }

  moveCharacter(charId: CharacterId, newRegion: RegionId): void {
    const oldRegion = this.charRegion.get(charId);
    if (!oldRegion) throw new Error(`${charId} not on the board`);
    if (oldRegion === newRegion) return;
    this.charRegion.set(charId, newRegion);
    this.regionChars.get(oldRegion)!.delete(charId);
    if (this.regionChars.get(oldRegion)!.size === 0) {
      this.regionChars.delete(oldRegion);
    }
    if (!this.regionChars.has(newRegion)) {
      this.regionChars.set(newRegion, new Set());
    }
    this.regionChars.get(newRegion)!.add(charId);
  }

  removeCharacter(charId: CharacterId): void {
    const regionId = this.charRegion.get(charId);
    if (regionId) {
      this.regionChars.get(regionId)?.delete(charId);
      if (this.regionChars.get(regionId)?.size === 0) {
        this.regionChars.delete(regionId);
      }
    }
    this.charRegion.delete(charId);
  }

  regionOf(charId: CharacterId): RegionId | undefined {
    return this.charRegion.get(charId);
  }

  charactersIn(regionId: RegionId): Set<CharacterId> {
    return this.regionChars.get(regionId) ?? new Set();
  }
}

export type GamePhase = 'SETUP' | 'FELLOWSHIP_MOVE' | 'FELLOWSHIP_ACTION' | 'SAURON_MOVE' | 'SAURON_ACTION' | 'UPKEEP' | 'GAME_OVER';
export type Faction = 'Fellowship' | 'Sauron';

export class GameState {
  // --- Add setActiveBattle for test compatibility ---
  public gameLog: string[] = [];
  public setActiveBattle(battle: any): void {
    this.activeBattle = battle;
    // Avoid circular structure in log: log only summary info
    if (battle && typeof battle === 'object') {
      const summary = {
        region: battle.regionId || battle.region || undefined,
        attackers: Array.isArray(battle.attackers) ? battle.attackers.map((c: any) => c.id || c.name) : undefined,
        defenders: Array.isArray(battle.defenders) ? battle.defenders.map((c: any) => c.id || c.name) : undefined,
        type: battle.type || undefined
      };
      this.log(`Active battle set: ${JSON.stringify(summary)}`);
    } else {
      this.log(`Active battle set.`);
    }
  }
  private turn: number;
  private currentPhase: GamePhase;
  private currentPlayer: Faction;
  public winner: Faction | 'Draw' | null;
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
  // --- Lightweight index ---
  private regionCharIndex: LightweightRegionCharacterIndex = new LightweightRegionCharacterIndex();

  constructor(gameData: { characters: ICharacter[], regions: IRegion[], combatCards: ICombatCard[] }) {
    this.turn = 1;
    this.currentPhase = 'SETUP';
    this.currentPlayer = 'Sauron'; // Sauron goes first
    this.winner = null;
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

    this.log('Game initialized. Turn 1, Phase: SETUP, Player: Sauron');
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
      // Characters are created but not placed on the board by default
    });
  }

  // Logging is now handled outside GameState
  public log(message: string): void {
    this.gameLog.push(message);
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

  public setCharacterLocation(characterId: string, regionId: string | null): void {
    const character = this.getCharacterById(characterId);
    if (!character) {
      this.log(`Attempted to set location for non-existent character ${characterId}`);
      return;
    }
    const oldRegion = this.regionCharIndex.regionOf(characterId);
    if (oldRegion) {
      this.regionCharIndex.removeCharacter(characterId);
    }
    if (regionId) {
      this.regionCharIndex.addCharacter(characterId, regionId);
      character.setLocation(regionId);
      this.log(`Character ${character.name} location set to ${regionId}`);
    } else {
      character.setLocation(null);
      this.log(`Character ${character.name} location cleared.`);
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
  public nextTurn(): void {
    // Alternate player each turn, only one move per turn
    if (this.currentPlayer === 'Fellowship') {
      this.currentPlayer = 'Sauron';
      this.turn++;
      // When switching to Sauron, set to Sauron move phase
      if (this.currentPhase === 'SETUP') {
        this.currentPhase = 'SAURON_MOVE';
      } else if (this.currentPhase === 'FELLOWSHIP_MOVE') {
        this.currentPhase = 'SAURON_MOVE';
      }
    } else {
      this.currentPlayer = 'Fellowship';
      // When switching to Fellowship, set to Fellowship move phase
      if (this.currentPhase === 'SAURON_MOVE') {
        this.currentPhase = 'FELLOWSHIP_MOVE';
      } else if (this.currentPhase === 'SETUP') {
        this.currentPhase = 'FELLOWSHIP_MOVE';
      }
    }
    this.log(`Turn advanced. Current player: ${this.currentPlayer}. Turn: ${this.turn}. Phase: ${this.currentPhase}`);
  }

  // Method to advance to the next phase in the turn sequence
  public nextPhase(): void {
    switch (this.currentPhase) {
      case 'SETUP':
        this.currentPhase = 'SAURON_MOVE';
        this.currentPlayer = 'Sauron';
        break;
      case 'SAURON_MOVE':
        this.currentPhase = 'SAURON_ACTION';
        // Current player remains Sauron
        break;
      case 'SAURON_ACTION':
        this.currentPhase = 'FELLOWSHIP_MOVE';
        this.currentPlayer = 'Fellowship';
        break;
      case 'FELLOWSHIP_MOVE':
        this.currentPhase = 'FELLOWSHIP_ACTION';
        // Current player remains Fellowship
        break;
      case 'FELLOWSHIP_ACTION':
        this.currentPhase = 'UPKEEP';
        this.currentPlayer = 'Sauron'; // Upkeep is handled by Sauron
        break;
      case 'UPKEEP':
        // Start next turn
        this.turn++;
        this.currentPhase = 'SAURON_MOVE';
        this.currentPlayer = 'Sauron';
        break;
      case 'GAME_OVER':
        // No phase change if game is over
        break;
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
      // Remove from previous region in index
      const oldRegion = this.regionCharIndex.regionOf(characterId);
      if (oldRegion) {
        this.regionCharIndex.removeCharacter(characterId);
      }
      this.regionCharIndex.addCharacter(characterId, regionId);
      character.setLocation(regionId);
      this.log(`Placed character ${character.name} in region ${region.name}`);
      return true;
    }
    this.log(`Failed to place character ${characterId} in region ${regionId}. Character or region not found.`);
    return false;
  }

    // Method to move a character from one region to another
    public moveCharacter(characterId: string, toRegionId: string, options: { 
      triggerBattle?: boolean, 
      isSetup?: boolean, 
      isRetreat?: boolean 
    } = {}): boolean {
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
        // Check if character is defeated - defeated characters cannot move
        if (character.defeated) {
            this.log(`Move failed: Character ${character.name} is defeated and cannot move.`);
            return false;
        }
        const fromRegionId = this.regionCharIndex.regionOf(characterId);
        if (fromRegionId) {
            this.regionCharIndex.moveCharacter(characterId, toRegionId);
        } else {
            this.regionCharIndex.addCharacter(characterId, toRegionId);
        }
        character.setLocation(toRegionId);
        this.log(`Character ${character.name} moved to ${toRegion.name}.`);

        // Only trigger battles under specific conditions
        const shouldTriggerBattle = 
          options.triggerBattle === true || // Explicitly requested
          (!options.isSetup && // Not during setup
           !options.isRetreat && // Not during retreat moves
           options.triggerBattle !== false && // Not explicitly disabled
           (this.currentPhase === 'FELLOWSHIP_MOVE' || this.currentPhase === 'SAURON_MOVE')); // Only during movement phases

        if (shouldTriggerBattle) {
            // Simple battle trigger: if after moving, there is an enemy in the region, resolve a simple battle
            const occupants = toRegion.getOccupants();
            const enemies = occupants.filter(c => c.faction !== character.faction && !c.defeated);
            if (enemies.length > 0) {
                // For now, just battle the first enemy found
                const defender = enemies[0];
                this.log(`Battle triggered: ${character.name} vs ${defender.name}`);
                // Use the new 4-step battle system
                const result = resolveFullBattle(character, defender, this);
                // Mark loser as defeated
                if (result.outcome !== 'MUTUAL_DEFEAT' && result.outcome) {
                    if (result.outcome === 'ATTACKER_WIN') {
                        defender.setDefeated?.(true);
                        this.setCharacterLocation(defender.id, null);
                    } else if (result.outcome === 'DEFENDER_WIN') {
                        character.setDefeated?.(true);
                        this.setCharacterLocation(character.id, null);
                    }
                } else if (result.outcome === 'MUTUAL_DEFEAT') {
                    character.setDefeated?.(true);
                    defender.setDefeated?.(true);
                    this.setCharacterLocation(character.id, null);
                    this.setCharacterLocation(defender.id, null);
                }
                // Optionally, log the battle result in battleHistory
                this.logBattle({
                    attacker: character.name,
                    defender: defender.name,
                    winner: result.outcome === 'ATTACKER_WIN' ? character.name : result.outcome === 'DEFENDER_WIN' ? defender.name : null,
                    loser: result.outcome === 'ATTACKER_WIN' ? defender.name : result.outcome === 'DEFENDER_WIN' ? character.name : null,
                    tie: result.outcome === 'MUTUAL_DEFEAT',
                    log: result.log ? result.log.join('\n') : '',
                    turn: this.turn,
                    phase: this.currentPhase
                });
            }
        }
        return true;
    }
  // --- New region/character view helpers ---
  public regionOf(characterId: string): string | undefined {
    return this.regionCharIndex.regionOf(characterId);
  }

  public charactersIn(regionId: string): Set<string> {
    return this.regionCharIndex.charactersIn(regionId);
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
