'use client'; // Mark as a Client Component

import React, { useState, useEffect } from 'react';
import GameBoard from '../components/GameBoard';
import GameLog from '../components/GameLog';
import { GameState } from '@/lib/models/GameState'; // Adjusted path
import rawGameData from '@/data/gameData.json'; // Path to gameData (fixed)
import { IGameData } from '@/types/data'; // Type for gameData

const gameData: IGameData = rawGameData as IGameData;

const GamePage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0); // For forcing updates

  useEffect(() => {
    // Initialize GameState on the client side
    const newGameState = new GameState(gameData);
    
    // Call the random placement function for each faction
    newGameState.randomlyPlaceFactionCharacters('Fellowship');
    newGameState.randomlyPlaceFactionCharacters('Sauron');

    setGameState(newGameState);
    console.log("GameState initialized and characters randomly placed:", newGameState);
  }, []); // Empty dependency array ensures this runs once on mount

  const handleGameUpdate = () => {
    setUpdateTrigger(prev => prev + 1); // Increment to trigger re-render
    console.log("Game update triggered");
  };

  if (!gameState) {
    return <div>Loading game...</div>; // Or a more sophisticated loading screen
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-24">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Lord of the Rings Game</h1>
      <GameBoard gameState={gameState} onGameUpdate={handleGameUpdate} />
      <div className="w-full max-w-4xl mt-6">
        <GameLog log={gameState.gameLog} gameState={gameState} />
      </div>
    </main>
  );
};

export default GamePage;
