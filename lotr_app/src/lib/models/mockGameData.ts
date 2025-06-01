import { IGameData } from '../../types/data';
// @ts-ignore
import * as gameJson from '@/data/gameData.json'; // Use path alias

const loadedGameData: any = gameJson; // Cast to any to bypass strict type checking if json is not perfectly IGameData

export const mockGameData: IGameData = {
    characters: loadedGameData.characters || [],
    regions: loadedGameData.regions || [],
    combatCards: loadedGameData.combatCards || [],
};
