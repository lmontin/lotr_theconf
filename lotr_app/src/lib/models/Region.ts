import { IRegion } from '../../types/data';
import { Character } from './Character';
import { Faction } from './GameState';

export class Region implements IRegion {
    // Properties from IRegion
    id: string; // Added missing id property
    name: string;
    row: number;
    position: number;
    fellowshipAdjacent?: string[]; // Changed to optional
    sauronAdjacent?: string[]; // Changed to optional
    fellowshipSpecialForward?: string[];
    special?: string | string[];
    startingCapacityFellowship?: number; // Changed to optional
    startingCapacitySauron?: number; // Changed to optional
    factionCapacity: number;

    // Occupant tracking
    private occupants: Character[] = [];

    constructor(data: IRegion) {
        this.id = data.id; // Initialize id
        this.name = data.name;
        this.row = data.row;
        this.position = data.position;
        this.fellowshipAdjacent = data.fellowshipAdjacent;
        this.sauronAdjacent = data.sauronAdjacent;
        this.fellowshipSpecialForward = data.fellowshipSpecialForward;
        this.special = data.special;
        this.startingCapacityFellowship = data.startingCapacityFellowship;
        this.startingCapacitySauron = data.startingCapacitySauron;
        this.factionCapacity = data.factionCapacity;
    }

    /**
     * Adds a character to the region's occupants.
     * Updates the character's location.
     * @param character The character to add.
     */
    addCharacter(character: Character): void {
        if (!this.occupants.find(c => c.id === character.id)) {
            this.occupants.push(character);
            character.setLocation(this.name);
        }
    }

    /**
     * Removes a character from the region's occupants.
     * Updates the character's location to null if it was previously in this region.
     * @param character The character to remove.
     */
    removeCharacter(character: Character): void {
        const initialCount = this.occupants.length;
        this.occupants = this.occupants.filter(c => c.id !== character.id);
        if (this.occupants.length < initialCount && character.location === this.name) {
            character.setLocation(null);
        }
    }

    /**
     * Gets the non-defeated characters occupying the region.
     * @param faction Optional faction to filter by.
     * @returns An array of non-defeated characters.
     */
    getOccupants(faction?: Faction): Character[] {
        let activeOccupants = this.occupants.filter(c => !c.is_defeated);
        if (faction) {
            activeOccupants = activeOccupants.filter(c => c.faction === faction);
        }
        return activeOccupants;
    }

    /**
     * Gets the maximum capacity of this region for a given faction.
     * Based on the `factionCapacity` property from game data.
     * @param _faction The faction for which to get capacity (currently unused, assumes factionCapacity is universal).
     * @returns The capacity number.
     */
    getCapacity(_faction: Faction): number {
        return this.factionCapacity;
    }

    /**
     * Checks if the region is at its capacity for the given faction.
     * @param faction The faction to check capacity for.
     * @returns True if at capacity, false otherwise.
     */
    isAtCapacity(faction: Faction): boolean {
        return this.getOccupants(faction).length >= this.getCapacity(faction);
    }

    /**
     * Checks if the region contains any non-defeated enemy characters of the given faction.
     * @param faction The faction whose enemies to check for.
     * @returns True if an enemy is present, false otherwise.
     */
    containsEnemy(faction: Faction): boolean {
        const enemyFaction = faction === 'Fellowship' ? 'Sauron' : 'Fellowship';
        return this.getOccupants(enemyFaction).length > 0;
    }

    /**
     * Gets all characters currently in the region, including defeated ones.
     * Useful for internal state management or specific game logic.
     * @returns An array of all characters in the region.
     */
    getAllCharactersInRegion(): Character[] {
        return [...this.occupants]; // Return a copy
    }
}
