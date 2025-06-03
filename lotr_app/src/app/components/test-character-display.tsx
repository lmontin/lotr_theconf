'use client';

import React from 'react';
import CharacterPiece from './CharacterPiece';
import { CharacterModel } from '@/lib/models/Character';
import { GameState } from '@/lib/models/GameState';

// Simple test component to verify character display
const TestCharacterDisplay: React.FC = () => {
  // Create a mock character for testing
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
      }
    ],
    regions: [],
    combatCards: []
  };

  const gameState = new GameState(mockGameData);
  const testCharacter = gameState.getCharacterById('test-frodo');

  if (!testCharacter) {
    return <div>Failed to create test character</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Character Display Test</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Concealed Character:</h4>
          <CharacterPiece
            character={testCharacter}
            onClick={(e, id) => console.log('Clicked character:', id)}
          />
        </div>
        <div>
          <h4 className="font-semibold mb-2">Revealed Character:</h4>
          <CharacterPiece
            character={(() => {
              testCharacter.reveal();
              return testCharacter;
            })()}
            onClick={(e, id) => console.log('Clicked character:', id)}
          />
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <p>Expected: Character name should show with strength in brackets (e.g., "Frodo (1)")</p>
        <p>Hover over the character to see abilities tooltip</p>
      </div>
    </div>
  );
};

export default TestCharacterDisplay;
