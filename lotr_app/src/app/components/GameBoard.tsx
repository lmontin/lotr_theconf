'use client';

import React, { useState } from 'react';
import CharacterPiece, { CharacterData } from './CharacterPiece';

// TODO: Import IRegion, GameState, RegionDisplay when available
// import { IRegion } from \'@/lib/types/data\';
// import { GameState } from \'@/lib/models/GameState\';
// import RegionDisplay from \'./RegionDisplay\';

// Sample Character Data for display - now includes locationId
const initialSampleCharacters: CharacterData[] = [
  { id: 'frodo-sample', name: 'Frodo', faction: 'Free Peoples', isConcealed: false, locationId: 'region-0' },
  { id: 'gandalf-sample', name: 'Gandalf', faction: 'Free Peoples', isConcealed: false, locationId: 'region-1' },
  { id: 'saruman-sample', name: 'Saruman', faction: 'Sauron', isConcealed: true, locationId: 'region-2' },
  { id: 'witchking-sample', name: 'Witch-king', faction: 'Sauron', isConcealed: false, locationId: 'region-3' },
  { id: 'aragorn-sample', name: 'Aragorn', faction: 'Free Peoples', isConcealed: false, locationId: 'region-0' }, // Another char in region 0
];

interface GameBoardProps {
  // TODO: Define props:
  // gameState: GameState;
  // onCharacterSelect: (characterId: string) => void; // Will be used by actual game logic
  // onRegionSelect: (regionId: string) => void; // Will be used by actual game logic
  // regions: IRegion[];
  // charactersFromState: Character[]; // This would eventually replace sampleCharacters
}

const GameBoard: React.FC<GameBoardProps> = (
  {
    /* gameState, onCharacterSelect, onRegionSelect, regions, charactersFromState */
  }
) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  // Ensure CharacterData from CharacterPiece.tsx now includes optional locationId
  const [characters, setCharacters] = useState<CharacterData[]>(initialSampleCharacters);

  const handleCharacterClick = (characterId: string) => {
    if (selectedCharacterId === characterId) {
      setSelectedCharacterId(null);
      console.log(`Character deselected: ${characterId}`);
    } else {
      setSelectedCharacterId(characterId);
      console.log(`Character selected: ${characterId}`);
    }
  };

  const handleRegionClick = (regionId: string) => {
    console.log(`Region clicked: ${regionId}`);
    if (selectedCharacterId) {
      console.log(`Attempting to move character ${selectedCharacterId} to region ${regionId}`);
      // Simulate move by updating character's locationId
      setCharacters(prevCharacters =>
        prevCharacters.map(char =>
          char.id === selectedCharacterId ? { ...char, locationId: regionId } : char
        )
      );
      console.log(`Character ${selectedCharacterId} moved to ${regionId} (simulated)`);
      setSelectedCharacterId(null); // Deselect character after move attempt
    } else {
      console.log('No character selected to move, or region is not a valid target currently.');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-200 p-4">
      <h1 className="text-2xl font-bold mb-4">Game Board</h1>
      {selectedCharacterId && (
        <p className="mb-4 text-lg font-semibold text-indigo-600">
          Selected Character: {characters.find(c => c.id === selectedCharacterId)?.name || 'Unknown'}
        </p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-8">
        {/* Placeholder for 9 regions - replace with actual region data and rendering */}
        {Array.from({ length: 9 }).map((_, index) => {
          const regionId = `region-${index}`;
          const charactersInRegion = characters.filter(char => char.locationId === regionId);
          return (
            <div
              key={regionId}
              className="bg-green-300 p-4 rounded shadow aspect-square flex flex-col items-center justify-start cursor-pointer hover:bg-green-400 transition-colors min-h-[100px]"
              onClick={() => handleRegionClick(regionId)}
              title={`Region ${index + 1}`}
            >
              <span className="font-semibold mb-2">Region {index + 1}</span>
              <div className="space-y-1 w-full">
                {charactersInRegion.map(char => (
                  <CharacterPiece
                    key={char.id}
                    character={char}
                    onClick={() => handleCharacterClick(char.id)} // Ensure this doesn't stop propagation if region click is also desired
                    isSelected={char.id === selectedCharacterId}
                  />
                ))}
                {charactersInRegion.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="text-xl font-semibold mb-2">Character Pool (Click to select/deselect):</h2>
      <div className="flex flex-wrap gap-2 p-2 bg-gray-100 rounded">
        {initialSampleCharacters.map(char => (
          <CharacterPiece
            key={char.id} // Use initialSampleCharacters here if you want a static list for selection
            character={characters.find(c => c.id === char.id) || char} // Ensure we get updated location for display if needed, but selection is primary
            onClick={() => handleCharacterClick(char.id)}
            isSelected={char.id === selectedCharacterId}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
