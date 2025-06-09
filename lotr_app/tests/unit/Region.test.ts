import { RegionModel as Region } from '@/lib/models/Region';
import { CharacterModel as Character } from '@/lib/models/Character';
import { GameState } from '@/lib/models/GameState';
import { IRegion as IRegionData, ICharacter as ICharacterData, ICombatCard } from '@/types/data';

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
    mockGameState.placeCharacter(frodo.id, shire.id);
    expect(shire.getOccupants().length).toBe(1);
    expect(shire.getOccupants().map(c => c.id)).toContain(frodo.id);
  });

  it('should not add a character if already present in GameState index', () => {
    mockGameState.placeCharacter(frodo.id, shire.id);
    // Attempting to place again in the same region via GameState might have different behavior
    // depending on GameState.placeCharacter implementation (e.g., throw error, be a no-op, or allow duplicates if not handled)
    // For this test, we assume GameState.placeCharacter handles or ignores re-placement.
    // If it throws, the test would fail here, which is also informative.
    mockGameState.placeCharacter(frodo.id, shire.id);
    expect(shire.getOccupants().length).toBe(1);
  });

  it('should remove a character from the region via GameState', () => {
    mockGameState.placeCharacter(frodo.id, shire.id);
    expect(shire.getOccupants().length).toBe(1);
    mockGameState.setCharacterLocation(frodo.id, null); // Simulate character removal or move
    expect(shire.getOccupants().length).toBe(0);
  });

  it('should not fail when removing a character not present (from GameState perspective)', () => {
    // Initially, Frodo is not in the Shire in mockGameState's index
    mockGameState.setCharacterLocation(frodo.id, null); // Ensure Frodo is not in any region
    expect(shire.getOccupants().length).toBe(0);
  });

  it('should get characters by faction using getOccupants(faction)', () => {
    mockGameState.placeCharacter(frodo.id, shire.id);    // Fellowship
    mockGameState.placeCharacter(sam.id, shire.id);      // Fellowship
    mockGameState.placeCharacter(witchKing.id, shire.id); // Sauron

    const fellowshipChars = shire.getOccupants('Fellowship');
    expect(fellowshipChars.length).toBe(2);
    expect(fellowshipChars.map(c => c.id)).toContain(frodo.id);
    expect(fellowshipChars.map(c => c.id)).toContain(sam.id);

    const sauronChars = shire.getOccupants('Sauron');
    expect(sauronChars.length).toBe(1);
    expect(sauronChars.map(c => c.id)).toContain(witchKing.id);
  });

  it('should check if it contains an enemy', () => {
    mockGameState.placeCharacter(frodo.id, shire.id);
    expect(shire.containsEnemy('Fellowship')).toBe(false); 
    expect(shire.containsEnemy('Sauron')).toBe(true);   

    mockGameState.placeCharacter(witchKing.id, shire.id);
    expect(shire.containsEnemy('Fellowship')).toBe(true);  
    // Now both Frodo (Fellowship) and WitchKing (Sauron) are in the Shire
    // So, for Sauron, Fellowship is an enemy.
    expect(shire.containsEnemy('Sauron')).toBe(true);    
  });

  it('should return false for containsEnemy if only own faction present or empty', () => {
    expect(shire.containsEnemy('Fellowship')).toBe(false);
    expect(shire.containsEnemy('Sauron')).toBe(false);

    mockGameState.placeCharacter(frodo.id, shire.id);
    expect(shire.containsEnemy('Fellowship')).toBe(false);

    // Create a new GameState and Region for this specific sub-test to ensure isolation
    const freshGameState = new GameState({ characters: [mockWitchKingCharData], regions: [mockMordorData], combatCards: [] });
    const freshMordor = new Region(mockMordorData, freshGameState);
    freshGameState.placeCharacter(witchKing.id, freshMordor.id);
    expect(freshMordor.containsEnemy('Sauron')).toBe(false);
  });

  it('should get current capacity for a faction', () => {
    expect(shire.getCapacity('Fellowship')).toBe(mockShireData.startingCapacityFellowship);
    expect(shire.getCapacity('Sauron')).toBe(mockShireData.startingCapacitySauron);
  });

  it('isAtCapacity should correctly report based on factionCapacity', () => {
    expect(shire.isAtCapacity('Fellowship')).toBe(false);
    mockGameState.placeCharacter(new Character({ id: 'f1', name:'F1', faction: 'Fellowship', versions: {classic: {id:'f1c', name:'F1', strength:1}}}, mockGameState).id, shire.id);
    mockGameState.placeCharacter(new Character({ id: 'f2', name:'F2', faction: 'Fellowship', versions: {classic: {id:'f2c', name:'F2', strength:1}}}, mockGameState).id, shire.id);
    expect(shire.isAtCapacity('Fellowship')).toBe(false);
    mockGameState.placeCharacter(new Character({ id: 'f3', name:'F3', faction: 'Fellowship', versions: {classic: {id:'f3c', name:'F3', strength:1}}}, mockGameState).id, shire.id);
    expect(shire.isAtCapacity('Fellowship')).toBe(false);
    mockGameState.placeCharacter(new Character({ id: 'f4', name:'F4', faction: 'Fellowship', versions: {classic: {id:'f4c', name:'F4', strength:1}}}, mockGameState).id, shire.id);
    expect(shire.isAtCapacity('Fellowship')).toBe(true);

    expect(mordor.isAtCapacity('Sauron')).toBe(false);
    mockGameState.placeCharacter(new Character({ id: 's1', name:'S1', faction: 'Sauron', versions: {classic: {id:'s1c', name:'S1', strength:1}}}, mockGameState).id, mordor.id);
    mockGameState.placeCharacter(new Character({ id: 's2', name:'S2', faction: 'Sauron', versions: {classic: {id:'s2c', name:'S2', strength:1}}}, mockGameState).id, mordor.id);
    mockGameState.placeCharacter(new Character({ id: 's3', name:'S3', faction: 'Sauron', versions: {classic: {id:'s3c', name:'S3', strength:1}}}, mockGameState).id, mordor.id);
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
