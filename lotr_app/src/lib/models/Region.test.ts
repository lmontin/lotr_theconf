import { RegionModel as Region } from './Region';
import { CharacterModel as Character } from './Character';
import { GameState } from './GameState';
import { IRegion as IRegionData, ICharacter as ICharacterData, ICombatCard } from '../../types/data';

const mockShireData: IRegionData = {
  id: 'shire',
  name: 'The Shire',
  row: 1,
  position: 1,
  special: ['Bag End'],
  fellowshipAdjacent: ['buckland'],
  sauronAdjacent: [],
  startingCapacityFellowship: 4,
  startingCapacitySauron: 1,
  factionCapacity: 4,
};

const mockMordorData: IRegionData = {
  id: 'mordor',
  name: 'Mordor',
  row: 5,
  position: 5,
  special: ['Mount Doom'],
  fellowshipAdjacent: [],
  sauronAdjacent: ['gorgoroth'],
  startingCapacityFellowship: 1,
  startingCapacitySauron: 3,
  factionCapacity: 3,
};

const mockFrodoCharData: ICharacterData = {
    id: 'frodo', name: 'Frodo', faction: 'Fellowship',
    versions: { classic: { id: 'f-c', name: 'Frodo', strength: 1 } }
};
const mockSamCharData: ICharacterData = {
    id: 'sam', name: 'Sam', faction: 'Fellowship',
    versions: { classic: { id: 's-c', name: 'Sam', strength: 2 } }
};
const mockWitchKingCharData: ICharacterData = {
    id: 'witchking', name: 'Witch-king', faction: 'Sauron',
    versions: { classic: { id: 'wk-c', name: 'Witch-king', strength: 5 } }
};

let mockGameState: GameState;
let frodo: Character;
let sam: Character;
let witchKing: Character;

describe('Region', () => {
  let shire: Region;
  let mordor: Region;

  beforeEach(() => {
    mockGameState = new GameState({
        characters: [mockFrodoCharData, mockSamCharData, mockWitchKingCharData],
        regions: [mockShireData, mockMordorData],
        combatCards: [] as ICombatCard[],
    });

    frodo = new Character(mockFrodoCharData, mockGameState);
    sam = new Character(mockSamCharData, mockGameState);
    witchKing = new Character(mockWitchKingCharData, mockGameState);

    shire = new Region(mockShireData, mockGameState);
    mordor = new Region(mockMordorData, mockGameState);
  });

  it('should initialize correctly with data', () => {
    expect(shire.id).toBe('shire');
    expect(shire.name).toBe('The Shire');
    // Check a few properties from the data to ensure it was stored/used
    expect(shire.factionCapacity).toBe(mockShireData.factionCapacity);
    expect(shire.special).toEqual(mockShireData.special);
    expect(shire.getOccupants().length).toBe(0);
  });

  it('should add a character to the region', () => {
    shire.addCharacter(frodo);
    expect(shire.getOccupants().length).toBe(1);
    expect(shire.getOccupants()).toContain(frodo);
    // The Character's location is set by Character.setLocation, which is called by GameState or movement logic.
    // Region.addCharacter itself doesn't set Character.location in the current model.
    // However, if it were to, this is where you'd test it:
    // expect(frodo.location).toBe(shire.id); // This depends on Character.setLocation being called by Region.addCharacter
  });

  it('should not add a character if already present', () => {
    shire.addCharacter(frodo);
    shire.addCharacter(frodo); 
    expect(shire.getOccupants().length).toBe(1);
  });

  it('should remove a character from the region', () => {
    shire.addCharacter(frodo);
    // To test character.location update, ensure it was set first (e.g. by a mock GameState.moveCharacter)
    // frodo.setLocation(shire.id); // Simulate character being placed
    shire.removeCharacter(frodo);
    expect(shire.getOccupants().length).toBe(0);
    // expect(frodo.location).toBeNull(); // This depends on Character.setLocation(null) being called by Region.removeCharacter
  });

  it('should not fail when removing a character not present', () => {
    shire.removeCharacter(frodo); 
    expect(shire.getOccupants().length).toBe(0);
  });

  it('should get characters by faction using getOccupants(faction)', () => {
    shire.addCharacter(frodo);    // Fellowship
    shire.addCharacter(sam);      // Fellowship
    shire.addCharacter(witchKing); // Sauron

    const fellowshipChars = shire.getOccupants('Fellowship');
    expect(fellowshipChars.length).toBe(2);
    expect(fellowshipChars).toContain(frodo);
    expect(fellowshipChars).toContain(sam);

    const sauronChars = shire.getOccupants('Sauron');
    expect(sauronChars.length).toBe(1);
    expect(sauronChars).toContain(witchKing);
  });

  it('should check if it contains an enemy', () => {
    shire.addCharacter(frodo); 
    expect(shire.containsEnemy('Fellowship')).toBe(false); 
    expect(shire.containsEnemy('Sauron')).toBe(true);   

    shire.addCharacter(witchKing); 
    expect(shire.containsEnemy('Fellowship')).toBe(true);  
    expect(shire.containsEnemy('Sauron')).toBe(true);    
  });

  it('should return false for containsEnemy if only own faction present or empty', () => {
    expect(shire.containsEnemy('Fellowship')).toBe(false);
    expect(shire.containsEnemy('Sauron')).toBe(false);

    shire.addCharacter(frodo);
    expect(shire.containsEnemy('Fellowship')).toBe(false);

    const anotherRegion = new Region(mockMordorData, mockGameState);
    anotherRegion.addCharacter(witchKing);
    expect(anotherRegion.containsEnemy('Sauron')).toBe(false);
  });

  it('should get current capacity for a faction', () => {
    expect(shire.getCapacity('Fellowship')).toBe(4); // Updated to match actual capacity
    expect(shire.getCapacity('Sauron')).toBe(1); // Updated to match mockShireData.startingCapacitySauron
  });

  it('isAtCapacity should correctly report based on factionCapacity', () => {
    expect(shire.isAtCapacity('Fellowship')).toBe(false);
    shire.addCharacter(new Character({ id: 'f1', name:'F1', faction: 'Fellowship', versions: {classic: {id:'f1c', name:'F1', strength:1}}}, mockGameState));
    shire.addCharacter(new Character({ id: 'f2', name:'F2', faction: 'Fellowship', versions: {classic: {id:'f2c', name:'F2', strength:1}}}, mockGameState));
    expect(shire.isAtCapacity('Fellowship')).toBe(false);
    shire.addCharacter(new Character({ id: 'f3', name:'F3', faction: 'Fellowship', versions: {classic: {id:'f3c', name:'F3', strength:1}}}, mockGameState));
    expect(shire.isAtCapacity('Fellowship')).toBe(false); // 3 out of 4, not at capacity yet
    shire.addCharacter(new Character({ id: 'f4', name:'F4', faction: 'Fellowship', versions: {classic: {id:'f4c', name:'F4', strength:1}}}, mockGameState));
    expect(shire.isAtCapacity('Fellowship')).toBe(true); // 4 out of 4, now at capacity

    expect(mordor.isAtCapacity('Sauron')).toBe(false);
    mordor.addCharacter(new Character({ id: 's1', name:'S1', faction: 'Sauron', versions: {classic: {id:'s1c', name:'S1', strength:1}}}, mockGameState));
    mordor.addCharacter(new Character({ id: 's2', name:'S2', faction: 'Sauron', versions: {classic: {id:'s2c', name:'S2', strength:1}}}, mockGameState));
    mordor.addCharacter(new Character({ id: 's3', name:'S3', faction: 'Sauron', versions: {classic: {id:'s3c', name:'S3', strength:1}}}, mockGameState));
    expect(mordor.isAtCapacity('Sauron')).toBe(true);
  });

  it('should correctly identify special properties using the special string/array', () => {
    expect(shire.special).toContain('Bag End');
    expect(shire.special).not.toContain('Mountains');
    expect(mordor.special).toContain('Mount Doom');

    const noSpecialData: IRegionData = { id: 'nospec', name: 'No Special', row:0, position:0, factionCapacity: 2 }; // No special field
    const noSpecialRegion = new Region(noSpecialData, mockGameState);
    expect(noSpecialRegion.special).toBeUndefined();

    const singleSpecialData: IRegionData = { id: 'single', name: 'Single Special', row:0, position:0, factionCapacity: 2, special: 'UniqueThing' };
    const singleSpecialRegion = new Region(singleSpecialData, mockGameState);
    expect(singleSpecialRegion.special).toBe('UniqueThing');
  });

});
