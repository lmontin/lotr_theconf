'use client';

import React from 'react';
import CharacterPiece from './CharacterPiece';
import { CharacterModel } from '@/lib/models/Character';
import { GameState } from '@/lib/models/GameState';

// Simple test component to verify character display
const TestCharacterDisplay: React.FC = () => {
  // Create mock characters for testing
  const mockGameData = {
    characters: [
      {
        id: 'test-frodo',
        name: 'Frodo',
        faction: 'Fellowship' as const,
        versions: {
          classic: {
            strength: 1,
            abilities: [
              {
                id: 'FRODO_RETREAT',
                text: 'When defending, may retreat sideways to an adjacent region at the beginning of a battle (not allowed in the mountains)',
                trigger: 'BATTLE_START',
                condition: 'IS_DEFENDING'
              }
            ]
          }
        }
      },
      {
        id: 'test-saruman',
        name: 'Saruman',
        faction: 'Sauron' as const,
        versions: {
          classic: {
            strength: 3,
            abilities: [
              {
                id: 'SARUMAN_MAGIC',
                text: 'Can cast spells during battle',
                trigger: 'BATTLE_START',
                condition: 'ALWAYS'
              }
            ]
          }
        }
      }
    ],
    regions: [],
    combatCards: []
  };

  const gameState = new GameState(mockGameData);
  const fellowshipCharacter = gameState.getCharacterById('test-frodo');
  const sauronCharacter = gameState.getCharacterById('test-saruman');

  // Create a revealed version of Saruman for testing
  const revealedSauronCharacter = gameState.getCharacterById('test-saruman');
  if (revealedSauronCharacter) {
    revealedSauronCharacter.reveal();
  }

  if (!fellowshipCharacter || !sauronCharacter) {
    return <div>Failed to create test characters</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Character Display Test</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Fellowship Player's View (Fellowship Turn):</h4>
          <div className="flex gap-4">
            <div>
              <p className="text-sm mb-1">Own Character (Frodo - Concealed):</p>
              <CharacterPiece
                character={fellowshipCharacter}
                currentPlayer="Fellowship"
                viewingPlayer="Fellowship"
                onClick={(e, id) => console.log('Clicked character:', id)}
              />
            </div>
            <div>
              <p className="text-sm mb-1">Opponent Character (Saruman - Concealed):</p>
              <CharacterPiece
                character={sauronCharacter}
                currentPlayer="Fellowship"
                viewingPlayer="Fellowship"
                onClick={(e, id) => console.log('Clicked character:', id)}
              />
            </div>
            <div>
              <p className="text-sm mb-1">Opponent Character (Saruman - Revealed):</p>
              <CharacterPiece
                character={revealedSauronCharacter!}
                currentPlayer="Fellowship"
                viewingPlayer="Fellowship"
                onClick={(e, id) => console.log('Clicked character:', id)}
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Sauron Player's View (Sauron Turn):</h4>
          <div className="flex gap-4">
            <div>
              <p className="text-sm mb-1">Opponent Character (Frodo - Concealed):</p>
              <CharacterPiece
                character={fellowshipCharacter}
                currentPlayer="Sauron"
                viewingPlayer="Sauron"
                onClick={(e, id) => console.log('Clicked character:', id)}
              />
            </div>
            <div>
              <p className="text-sm mb-1">Own Character (Saruman - Concealed):</p>
              <CharacterPiece
                character={sauronCharacter}
                currentPlayer="Sauron"
                viewingPlayer="Sauron"
                onClick={(e, id) => console.log('Clicked character:', id)}
              />
            </div>
            <div>
              <p className="text-sm mb-1">Own Character (Saruman - Revealed):</p>
              <CharacterPiece
                character={revealedSauronCharacter!}
                currentPlayer="Sauron"
                viewingPlayer="Sauron"
                onClick={(e, id) => console.log('Clicked character:', id)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Expected Behavior:</strong></p>
        <ul className="list-disc list-inside">
          <li>Own characters always show name and strength, even when concealed</li>
          <li>Opponent's concealed characters show only "?" </li>
          <li>Opponent's revealed characters show name and strength normally</li>
          <li>Concealed characters appear greyed out (50% opacity)</li>
          <li>Revealed characters appear at full opacity</li>
        </ul>
      </div>
    </div>
  );
};

export default TestCharacterDisplay;
