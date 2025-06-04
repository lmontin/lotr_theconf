'use client'; // Mark as a Client Component

import React, { useState, useEffect } from 'react';
import GameBoard from '../components/GameBoard';
import GameLog from '../components/GameLog';
import LoggingDebugPanel from '../components/LoggingDebugPanel';
import { GameState } from '@/lib/models/GameState'; // Adjusted path
import rawGameData from '@/data/gameData.json'; // Path to gameData (fixed)
import { IGameData } from '@/types/data'; // Type for gameData

const gameData: IGameData = rawGameData as IGameData;

const GamePage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0); // For forcing updates

  useEffect(() => {
    // Initialize GameState on the client side
    const newGameState = new GameState(gameData);

    // Patch the log method to update the React state log
    (newGameState as any).log = (message: string) => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setGameLog(prev => [...prev, `[${time}] [Turn ${newGameState.getTurn()} - ${newGameState.getCurrentPlayer()} - ${newGameState.getCurrentPhase()}]: ${message}`]);
    };

    // Call the random placement function for each faction
    newGameState.randomlyPlaceFactionCharacters('Fellowship');
    newGameState.randomlyPlaceFactionCharacters('Sauron');

    // Automatically advance from setup to Turn 1 if all characters are placed
    newGameState.checkAndAdvanceFromSetup();

    setGameState(newGameState);
    console.log("GameState initialized and characters randomly placed:", newGameState);
  }, []); // Empty dependency array ensures this runs once on mount

  const handleGameUpdate = () => {
    // Force a re-render by incrementing the trigger
    setUpdateTrigger(prev => prev + 1);
    console.log("Game update triggered, updateTrigger:", updateTrigger + 1);
  };

  if (!gameState) {
    return <div>Loading game...</div>; // Or a more sophisticated loading screen
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-24">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Lord of the Rings Game</h1>
      
      {/* Phase Control Panel */}
      <div className="w-full max-w-4xl mb-6 p-4 bg-gray-100 rounded-lg border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm">
            <span className="font-semibold">Turn:</span> {gameState.getTurn()} | 
            <span className="font-semibold ml-2">Phase:</span> {gameState.getCurrentPhase()} | 
            <span className="font-semibold ml-2">Player:</span> {gameState.getCurrentPlayer()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                gameState.nextPhase();
                handleGameUpdate();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Next Phase
            </button>
            <button
              onClick={() => {
                // Advance to SAURON_MOVE phase specifically for testing
                while (gameState.getCurrentPhase() !== 'SAURON_MOVE') {
                  gameState.nextPhase();
                }
                handleGameUpdate();
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              → SAURON_MOVE
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          💡 <strong>Testing tip:</strong> Use "→ SAURON_MOVE" button, then move Flying Nazgul to a region with Fellowship characters (Arthedain=Aragorn, Cardolan=Frodo, Rhudaur=Gandalf) to trigger battle.
        </div>
      </div>

      <GameBoard gameState={gameState} onGameUpdate={handleGameUpdate} />
      <div className="w-full max-w-4xl mt-6">
        <GameLog log={gameLog} gameState={gameState} />
      </div>
      <LoggingDebugPanel />
    </main>
  );
};

export default GamePage;
