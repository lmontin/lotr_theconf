'use client'; // Mark as a Client Component

import React, { useState, useEffect } from 'react';
import GameBoard from '../components/GameBoard';
import { GameState } from '@/lib/models/GameState'; // Adjusted path
import rawGameData from '../../../data/gamedata.json'; // Path to gameData
import { IGameData } from '@/types/data'; // Type for gameData

const gameData: IGameData = rawGameData as IGameData;

const GamePage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0); // For forcing updates

  useEffect(() => {
    // Initialize GameState on the client side
    const newGameState = new GameState(gameData);
    
    // Initial character placements
    // Fellowship starting positions
    newGameState.placeCharacter("char_frodo", "REGION_SHIRE");
    newGameState.placeCharacter("char_gandalf", "REGION_SHIRE");
    newGameState.placeCharacter("char_aragorn", "REGION_RIVENDELL");
    newGameState.placeCharacter("char_boromir", "REGION_ROHAN"); 
    newGameState.placeCharacter("char_legolas", "REGION_LORIEN");
    newGameState.placeCharacter("char_gimli", "REGION_EREBOR"); 
    // Sauron starting positions
    newGameState.placeCharacter("char_witch_king", "REGION_MINAS_MORGUL");
    newGameState.placeCharacter("char_saruman", "REGION_ISENGARD");
    newGameState.placeCharacter("char_mouth_of_sauron", "REGION_MORDOR");

    setGameState(newGameState);
    console.log("GameState initialized and initial characters placed:", newGameState);
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
    </main>
  );
};

export default GamePage;
