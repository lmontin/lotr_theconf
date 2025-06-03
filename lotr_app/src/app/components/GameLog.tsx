import React, { useRef, useState } from 'react';

export interface GameLogProps {
  log: string[];
  gameState?: any; // Accept gameState for modal display
}

const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200">{part}</mark>
    ) : (
      part
    )
  );
};

const GameLog: React.FC<GameLogProps> = ({ log, gameState }) => {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const logRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Prepare log entries as objects with time/message if needed
  const logEntries = log.map((entry, idx) => {
    // Try to split time from message if possible
    const match = entry.match(/^\[(\d{2}:\d{2}:\d{2})\] (.*)$/);
    if (match) {
      return { time: match[1], message: match[2], idx };
    }
    return { time: '', message: entry, idx };
  });

  // Filter log entries by search
  const matches = search
    ? logEntries.filter((entry) =>
        entry.message.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // Scroll to selected log entry
  const jumpToLog = (idx: number) => {
    setSelectedIdx(idx);
    setShowDropdown(false);
    setSearch("");
    const ref = logRefs.current[idx];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      jumpToLog(matches[highlightedIdx].idx);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Show latest logs at the top
  const reversedLog = [...logEntries].reverse();

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
      <div className="mb-2 relative">
        <input
          type="text"
          placeholder="Search log..."
          className="border rounded px-2 py-1 w-full"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(!!e.target.value && matches.length > 0);
            setHighlightedIdx(0);
          }}
          onFocus={() => setShowDropdown(!!search && matches.length > 0)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
          onKeyDown={handleKeyDown}
        />
        {showDropdown && matches.length > 0 && (
          <div className="absolute z-10 left-0 right-0 max-h-40 overflow-y-auto border bg-white shadow rounded mt-1">
            {matches.map((entry, i) => (
              <div
                key={entry.idx}
                className={`px-2 py-1 cursor-pointer flex items-center ${
                  highlightedIdx === i ? "bg-blue-100" : ""
                }`}
                onMouseDown={() => jumpToLog(entry.idx)}
                onMouseEnter={() => setHighlightedIdx(i)}
              >
                <span className="text-xs text-gray-500 mr-2">{entry.time}</span>
                {highlightMatch(entry.message, search)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="h-64 overflow-y-auto border rounded bg-gray-50 p-2 space-y-1">
        {reversedLog.map((entry, i) => {
          // Map reversed index to original index for ref
          const origIdx = logEntries.length - 1 - i;
          return (
            <div
              key={origIdx}
              ref={(el) => (logRefs.current[origIdx] = el)}
              className={`text-sm ${selectedIdx === origIdx ? "bg-blue-100" : ""}`}
            >
              <span className="text-xs text-gray-500 mr-2">{entry.time}</span>
              {highlightMatch(entry.message, search)}
            </div>
          );
        })}
      </div>
      {/* Modal for Game State */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 relative">
            <div className="flex flex-col border-b px-4 py-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Current Game State</span>
                <button
                  className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
              <input
                type="text"
                className="mt-2 px-2 py-1 border rounded text-xs w-full"
                placeholder="Search game state..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto text-xs font-mono whitespace-pre-wrap">
              {gameState ? (
                <pre>
                  {search
                    ? JSON.stringify(gameState, null, 2)
                        .split('\n')
                        .map((line, idx) =>
                          line.toLowerCase().includes(search.toLowerCase()) ? (
                            <span key={idx} className="bg-yellow-200 text-black">{line + '\n'}</span>
                          ) : (
                            <span key={idx}>{line + '\n'}</span>
                        ))
                    : JSON.stringify(gameState, null, 2)}
                </pre>
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
