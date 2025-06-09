import { CharacterModel as Character, CharacterVersion } from '@/lib/models/Character';
import { GameState } from '@/lib/models/GameState'; // Will address this later if it causes issues
import { ICharacter as ICharacterData, IRegion, ICombatCard } from '@/types/data';

const mockFrodoData: ICharacterData = {
  id: 'char-frodo',
  name: 'Frodo Baggins',
  faction: 'Fellowship',
  versions: {
    classic: {
      // id: 'frodo-classic', // Removed as per ICharacterVersion definition
      name: 'Frodo Baggins',
      strength: 1,
      specialAbilities: ['FRODO_RETREAT', 'RING_BEARER'],
    },
  },
};

const mockGollumData: ICharacterData = {
  id: 'char-gollum',
  name: 'Gollum',
  faction: 'Sauron',
  versions: {
    classic: {
      // id: 'gollum-classic', // Removed as per ICharacterVersion definition
      name: 'Gollum',
      strength: 2,
      specialAbilities: ['SNEAKY'],
    },
  },
};

const mockGameRegions: IRegion[] = [
    { id: 'shire', name: 'The Shire', row: 1, position: 1, factionCapacity: 3},
    { id: 'rivendell', name: 'Rivendell', row: 2, position: 2, factionCapacity: 3 },
];
const mockGameCombatCards: ICombatCard[] = [];

let mockGameState: GameState;

describe('Character', () => {
  let frodo: Character;
  let gollum: Character;

  beforeEach(() => {
    mockGameState = new GameState({
        characters: [mockFrodoData, mockGollumData],
        regions: mockGameRegions,
        combatCards: mockGameCombatCards
    });
    frodo = new Character(mockFrodoData, mockGameState, 'classic');
    gollum = new Character(mockGollumData, mockGameState, 'classic');
  });

  it('should initialize correctly with classic version data', () => {
    expect(frodo.id).toBe('char-frodo');
    expect(frodo.name).toBe('Frodo Baggins');
    expect(frodo.faction).toBe('Fellowship');
    expect(frodo.strength).toBe(1);
    expect(frodo.getAbilities()).toEqual(['FRODO_RETREAT', 'RING_BEARER']);
    expect(frodo.location).toBeNull();
    // expect(frodo.is_defeated).toBe(false); // is_defeated is an alias for defeated
    expect(frodo.defeated).toBe(false); // Check defeated property directly
    expect(frodo.is_revealed).toBe(false);
  });

  it('should initialize correctly with a specified version (e.g., classic or enhanced)', () => {
    const aragornData: ICharacterData = {
        id: 'char-aragorn',
        name: 'Aragorn',
        faction: 'Fellowship',
        versions: {
            classic: { /*id: 'aragorn-classic',*/ name: 'Aragorn', strength: 4, specialAbilities: ['LEADER'] },
            enhanced: { /*id: 'aragorn-enhanced',*/ name: 'Aragorn, King Elessar', strength: 5, specialAbilities: ['LEADER', 'HEIR_OF_GONDOR'] }
        }
    };
    const aragornClassic = new Character(aragornData, mockGameState, 'classic');
    expect(aragornClassic.strength).toBe(4);
    expect(aragornClassic.getAbilities()).toEqual(['LEADER']);

    const aragornEnhanced = new Character(aragornData, mockGameState, 'enhanced');
    expect(aragornEnhanced.strength).toBe(5);
    expect(aragornEnhanced.getAbilities()).toEqual(['LEADER', 'HEIR_OF_GONDOR']);
  });

   it('should throw an error if a specified version is missing', () => {
    const legolasData: ICharacterData = {
        id: 'char-legolas',
        name: 'Legolas',
        faction: 'Fellowship',
        versions: {
            classic: { /*id: 'legolas-classic',*/ name: 'Legolas Greenleaf', strength: 3, specialAbilities: ['ARCHER'] }
            // No enhanced version
        }
    };
    expect(() => new Character(legolasData, mockGameState, 'enhanced')).toThrow('Version enhanced not found for character Legolas');
  });

  it('should throw an error if classic version is requested but missing', () => {
    const badCharData: ICharacterData = {
        id: 'char-bad',
        name: 'Bad Character',
        faction: 'Sauron',
        versions: { enhanced: { /*id: 'bad-enhanced',*/ name: 'Bad Character Enhanced', strength: 1 } } // No classic
    };
    expect(() => new Character(badCharData, mockGameState, 'classic')).toThrow('Version classic not found for character Bad Character');
  });


  it('should reveal the character and log it', () => {
    const gameLogSpy = jest.spyOn(mockGameState, 'log');
    frodo.reveal();
    expect(frodo.is_revealed).toBe(true);
    expect(gameLogSpy).toHaveBeenCalledWith(`${frodo.name} is revealed.`);
  });

  it('should not log if already revealed', () => {
    frodo.reveal(); // First reveal
    const gameLogSpy = jest.spyOn(mockGameState, 'log');
    frodo.reveal(); // Second reveal
    expect(frodo.is_revealed).toBe(true);
    expect(gameLogSpy).not.toHaveBeenCalled();
  });

  it('should conceal the character if not persistently revealed and log it', () => {
    frodo.reveal();
    jest.spyOn(frodo, 'has_persistent_reveal').mockReturnValue(false);
    const gameLogSpy = jest.spyOn(mockGameState, 'log');

    frodo.conceal();
    expect(frodo.is_revealed).toBe(false);
    expect(gameLogSpy).toHaveBeenCalledWith(`${frodo.name} is concealed.`);
  });

  it('should not log if already concealed or not revealed', () => {
    const gameLogSpy = jest.spyOn(mockGameState, 'log');
    frodo.conceal(); // Conceal when not revealed
    expect(frodo.is_revealed).toBe(false);
    expect(gameLogSpy).not.toHaveBeenCalled();

    frodo.reveal();
    jest.spyOn(frodo, 'has_persistent_reveal').mockReturnValue(false);
    frodo.conceal(); // Conceal properly
    gameLogSpy.mockClear(); // Clear spy for next check
    frodo.conceal(); // Conceal again when already concealed
    expect(gameLogSpy).not.toHaveBeenCalled();
  });

  it('should not conceal the character if persistently revealed', () => {
    frodo.reveal();
    jest.spyOn(frodo, 'has_persistent_reveal').mockReturnValue(true);
    const gameLogSpy = jest.spyOn(mockGameState, 'log');

    frodo.conceal();
    expect(frodo.is_revealed).toBe(true);
    expect(gameLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('is concealed'));
  });

  it('has_persistent_reveal should return false by default', () => {
    expect(frodo.has_persistent_reveal()).toBe(false);
  });

  it('should update location and log it', () => {
    const gameLogSpy = jest.spyOn(mockGameState, 'log');
    // Initial placement for context, should not log as a "move" if setLocation handles isInitialSetup correctly
    frodo.setLocation('shire', true); 
    gameLogSpy.mockClear(); // Clear spy after initial setup

    frodo.setLocation('rivendell');
    expect(frodo.location).toBe('rivendell');
    // Updated expectation to match new log message format
    expect(gameLogSpy).toHaveBeenCalledWith(`Frodo Baggins moved from The Shire to Rivendell.`);
    gameLogSpy.mockClear();

    frodo.setLocation(null); // Remove from board
    expect(frodo.location).toBeNull();
    // Updated expectation to match new log message format
    expect(gameLogSpy).toHaveBeenCalledWith(`Frodo Baggins was removed from the board (was in Rivendell).`);
  });

  it('should mark character as defeated, reveal it, and log it', () => {
    const gameLogSpy = jest.spyOn(mockGameState, 'log');
    frodo.setDefeated(true); // Changed from frodo.defeat()
    // expect(frodo.is_defeated).toBe(true); // is_defeated is an alias for defeated
    expect(frodo.defeated).toBe(true); // Check defeated property directly
    expect(frodo.is_revealed).toBe(true); // Defeated characters are revealed
    expect(gameLogSpy).toHaveBeenCalledWith(`${frodo.name} has been defeated.`);
  });

  it('should not log defeat if already defeated', () => {
    frodo.setDefeated(true); // Changed from frodo.defeat()
    const gameLogSpy = jest.spyOn(mockGameState, 'log');
    frodo.setDefeated(true); // Changed from frodo.defeat()
    // expect(frodo.is_defeated).toBe(true); // is_defeated is an alias for defeated
    expect(frodo.defeated).toBe(true); // Check defeated property directly
    expect(gameLogSpy).not.toHaveBeenCalled();
  });

  it('should return current version data', () => {
    const versionData = frodo.getCurrentVersionData();
    // expect(versionData.id).toBe('frodo-classic'); // ID is not on ICharacterVersion
    expect(versionData.name).toBe('Frodo Baggins'); // Check name instead
    expect(versionData.strength).toBe(1);
  });

  it('should return abilities from current version data', () => {
    expect(frodo.getAbilities()).toEqual(['FRODO_RETREAT', 'RING_BEARER']);
    const noAbilityCharData: ICharacterData = {
        id: 'char-noability', name: 'No Ability Man', faction: 'Fellowship',
        versions: { classic: { /*id: 'noability-classic',*/ name: 'No Ability Man', strength: 1 } }
    };
    const noAbilityChar = new Character(noAbilityCharData, mockGameState);
    expect(noAbilityChar.getAbilities()).toEqual([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
