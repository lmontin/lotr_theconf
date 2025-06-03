'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import CharacterPiece from './CharacterPiece';
import { GameState } from '@/lib/models/GameState';
import { CharacterModel } from '@/lib/models/Character';
import { RegionModel } from '@/lib/models/Region';
import { getLegalMoves, LegalMove } from '@/lib/gameLogic/movement';

interface GameBoardProps {
  gameState: GameState;
  onGameUpdate: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onGameUpdate }) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [legalMoveRegionIds, setLegalMoveRegionIds] = useState<string[]>([]);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);

  const allCharacters = gameState.getAllCharacters();
  const allRegions = gameState.getAllRegions();

  useEffect(() => {
    // If a character was selected, calculate legal moves for them
    if (selectedCharacterId) {
      const character = gameState.getCharacterById(selectedCharacterId);
      if (character && !character.defeated) {
        console.log("Calculating legal moves for selected character:", character.name);
        const moves = getLegalMoves(character, gameState);
        setLegalMoves(moves);
        setLegalMoveRegionIds(moves.map(move => move.destinationRegionId));
      } else {
        // Character might have been defeated or removed, so clear selection
        console.log("Selected character not found or defeated, clearing selection");
        setSelectedCharacterId(null);
        setLegalMoves([]);
        setLegalMoveRegionIds([]);
      }
    } else {
      // No character selected, clear legal moves
      setLegalMoves([]);
      setLegalMoveRegionIds([]);
    }
  }, [selectedCharacterId]); // Only depend on selectedCharacterId to avoid infinite re-renders

  const handleCharacterClick = (characterId: string) => {
    const character = gameState.getCharacterById(characterId);
    if (!character) return;

    if (selectedCharacterId === characterId) {
      setSelectedCharacterId(null);
      setLegalMoves([]);
      setLegalMoveRegionIds([]);
      console.log(`Character deselected: ${character.name}`);
    } else {
      setSelectedCharacterId(characterId);
      console.log(`Character selected: ${character.name}`);
      const moves = getLegalMoves(character, gameState);
      setLegalMoves(moves);
      setLegalMoveRegionIds(moves.map(move => move.destinationRegionId));
      console.log(`Legal moves for ${character.name}:`, moves);
    }
  };

  const handleRegionClick = (regionId: string) => {
    console.log(`Region clicked: ${regionId}`);
    if (selectedCharacterId && legalMoveRegionIds.includes(regionId)) {
      const characterToMove = gameState.getCharacterById(selectedCharacterId);
      const targetRegion = gameState.getRegionById(regionId);

      if (characterToMove && targetRegion) {
        console.log(`Attempting to move ${characterToMove.name} to ${targetRegion.name}`);
        
        const moveSuccess = gameState.moveCharacter(selectedCharacterId, regionId);

        if (moveSuccess) {
          // After a successful move, advance the turn
          gameState.nextTurn();
          setSelectedCharacterId(null);
          setLegalMoves([]);
          setLegalMoveRegionIds([]);
          onGameUpdate(); 
        } else {
          console.log("Move failed via GameState method. Character may remain selected with old legal moves.");
        }
      } else {
        console.error('Move failed: Character or target region not found.');
        setSelectedCharacterId(null);
        setLegalMoves([]);
        setLegalMoveRegionIds([]);
      }
    } else {
      console.log('No character selected or region is not a legal move.');
      if (selectedCharacterId) {
        setSelectedCharacterId(null);
        setLegalMoves([]);
        setLegalMoveRegionIds([]);
      }
    }
  };

  const selectedCharacter = selectedCharacterId ? gameState.getCharacterById(selectedCharacterId) : null;

  // Group and sort regions for rendering based on row and position
  const regionsByRow = useMemo(() => {
    const grouped: { [key: number]: RegionModel[] } = {};
    allRegions.forEach(region => {
      if (!grouped[region.row]) {
        grouped[region.row] = [];
      }
      grouped[region.row].push(region);
    });

    for (const row in grouped) {
      grouped[row].sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [allRegions]);

  const sortedRowNumbers = useMemo(() => {
    return Object.keys(regionsByRow).map(Number).sort((a, b) => a - b);
  }, [regionsByRow]);

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Game Board</h1>
      {selectedCharacter && (
        <p className="mb-4 text-lg font-semibold text-indigo-700 text-center">
          Selected: {selectedCharacter.name} ({selectedCharacter.faction})
        </p>
      )}
      {legalMoveRegionIds.length > 0 && !selectedCharacter && (
         // Hide legal moves hint if no character is selected, as legal moves are cleared.
        <></>
      )}
      {legalMoveRegionIds.length > 0 && selectedCharacter && (
        <p className="mb-4 text-md text-yellow-600 text-center">
          Legal moves for {selectedCharacter.name} highlighted in yellow.
        </p>
      )}

      {/* Game Board Layout by Rows and Positions */}
      <div className="space-y-4 mb-8"> {/* Container for all rows */}
        {sortedRowNumbers.map(rowNumber => (
          <div key={`row-${rowNumber}`} className="flex flex-row flex-wrap justify-center items-stretch gap-2 sm:gap-4"> {/* Row container */}
            {regionsByRow[rowNumber].map(region => {
              const charactersInRegion = allCharacters.filter(char => char.getLocation() === region.id);
              const isLegalMove = legalMoveRegionIds.includes(region.id);
              const regionBgColor = isLegalMove ? "bg-yellow-200" : "bg-green-300";
              const regionBorderColor = isLegalMove ? "border-yellow-500" : "border-transparent";

              return (
                <div
                  key={region.id}
                  className={`p-3 sm:p-4 rounded shadow-lg flex flex-col items-center justify-start cursor-pointer hover:shadow-xl transition-all duration-150 ease-in-out ${regionBgColor} border-4 ${regionBorderColor} w-[120px] h-[120px] sm:w-[150px] sm:h-[150px]`}
                  onClick={() => handleRegionClick(region.id)}
                  title={`${region.name} (Row: ${region.row}, Pos: ${region.position}) | ID: ${region.id} | Cap: F${region.getCapacity('Fellowship')},S${region.getCapacity('Sauron')}`}
                >
                  <span className="font-bold text-xs sm:text-sm mb-1 sm:mb-2 text-center truncate w-full">{region.name}</span>
                  <div className="space-y-1 w-full overflow-y-auto flex-grow" style={{maxHeight: 'calc(100% - 30px)'}}>
                    {charactersInRegion.length > 0 ? (
                      charactersInRegion.map(char => (
                        <CharacterPiece
                          key={char.id}
                          character={char}
                          onClick={(e, charId) => { e.stopPropagation(); handleCharacterClick(charId); }} // Modified to use charId from callback
                          isSelected={char.id === selectedCharacterId}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-gray-600 italic text-center mt-2">Empty</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-3 text-center">Character Pool (All Characters)</h2>
      <div className="flex flex-wrap gap-3 p-3 bg-gray-200 rounded-lg justify-center">
        {allCharacters.map(char => (
          <CharacterPiece
            key={char.id}
            character={char}
            onClick={(_e, charId) => handleCharacterClick(charId)} // Modified to use charId, _e as event is not used here for stopPropagation
            isSelected={char.id === selectedCharacterId}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
