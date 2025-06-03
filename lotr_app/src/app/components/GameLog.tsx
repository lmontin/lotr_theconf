import React, { useState } from 'react';

export interface GameLogProps {
  log: string[];
  gameState?: any; // Accept gameState for modal display
}

const GameLog: React.FC<GameLogProps> = ({ log, gameState }) => {
  const [showModal, setShowModal] = useState(false);
  // Show latest logs at the top
  const reversedLog = [...log].reverse();
  return (
    <div className="w-full mt-4">
      <div className="flex items-center mb-1">
        <span className="font-bold text-base text-gray-900 mr-3">Game Log</span>
        {gameState && (
          <button
            className="ml-auto px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs shadow"
            onClick={() => setShowModal(true)}
          >
            Show Game State
          </button>
        )}
      </div>
      <div className="bg-gray-900 text-gray-100 p-2 rounded shadow max-h-40 overflow-y-auto text-xs sm:text-sm">
        <ul className="space-y-0.5">
          {reversedLog.length === 0 ? (
            <li className="italic text-gray-400">No game events yet.</li>
          ) : (
            reversedLog.map((entry, idx) => (
              <li key={idx} className="whitespace-pre-line">{entry}</li>
            ))
          )}
        </ul>
      </div>
      {/* Modal for Game State */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 relative">
            <div className="flex justify-between items-center border-b px-4 py-2">
              <span className="font-bold text-lg">Current Game State</span>
              <button
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto text-xs font-mono whitespace-pre-wrap">
              {gameState ? (
                <pre>{JSON.stringify(gameState, null, 2)}</pre>
              ) : (
                <span>No game state available.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLog;
