
import GameBoard from '../components/GameBoard';
import React from 'react';

const GamePage: React.FC = () => {
  // TODO: Initialize GameState and pass it to GameBoard
  // const gameState = new GameState(); // Example

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Lord of the Rings Game</h1>
      {/* <GameBoard gameState={gameState} /> */}
      <GameBoard /> {/* Placeholder until GameState is integrated */}
    </main>
  );
};

export default GamePage;
