import React from 'react';

export interface GameLogProps {
  log: string[];
}

const GameLog: React.FC<GameLogProps> = ({ log }) => {
  return (
    <div className="w-full bg-gray-900 text-gray-100 p-2 mt-4 rounded shadow max-h-40 overflow-y-auto text-xs sm:text-sm">
      <div className="font-bold mb-1">Game Log</div>
      <ul className="space-y-0.5">
        {log.length === 0 ? (
          <li className="italic text-gray-400">No game events yet.</li>
        ) : (
          log.map((entry, idx) => (
            <li key={idx} className="whitespace-pre-line">{entry}</li>
          ))
        )}
      </ul>
    </div>
  );
};

export default GameLog;
