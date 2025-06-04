import React, { useRef, useState } from 'react';

export interface GameLogProps {
  log: string[];
  gameState?: any; // Accept gameState for modal display
}

// Safe JSON serialization that handles circular references
const safeStringify = (obj: any, maxDepth = 5): string => {
  const seen = new WeakSet();
  
  const replacer = (key: string, value: any, currentDepth = 0): any => {
    if (currentDepth > maxDepth) {
      return '[Max Depth Reached]';
    }
    
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
      
      // Create a simplified version for complex objects
      if (value.constructor?.name === 'CharacterModel') {
        return {
          id: value.id,
          name: value.name,
          faction: value.faction,
          location: value.getLocation?.() || value.location
        };
      }
      
      if (value.constructor?.name === 'RegionModel') {
        return {
          id: value.id,
          name: value.name,
          capacity: value.capacity
        };
      }
      
      if (value.constructor?.name === 'GameState') {
        return {
          turn: value.getTurn?.() || value.turn,
          phase: value.getCurrentPhase?.() || value.phase,
          player: value.getCurrentPlayer?.() || value.player,
          gameOver: value.gameOver,
          winner: value.winner
        };
      }
    }
    
    return value;
  };
  
  try {
    return JSON.stringify(obj, replacer, 2);
  } catch (error) {
    return `[Serialization Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
};

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
  
  // Game state modal search states
  const [modalSearch, setModalSearch] = useState("");
  const [showModalDropdown, setShowModalDropdown] = useState(false);
  const [modalHighlightedIdx, setModalHighlightedIdx] = useState(0);
  const gameStateRef = useRef<HTMLPreElement | null>(null);

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

  // Game state search matches
  const gameStateMatches = modalSearch && gameState
    ? (() => {
        const gameStateStr = safeStringify(gameState);
        const lines = gameStateStr.split('\n');
        return lines
          .map((line, idx) => ({ line: line.trim(), lineNumber: idx }))
          .filter(({ line }) => line.toLowerCase().includes(modalSearch.toLowerCase()))
          .map(({ line, lineNumber }) => ({
            display: line.length > 60 ? line.substring(0, 60) + '...' : line,
            lineNumber,
            fullLine: line
          }));
      })()
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

  // Jump to game state line
  const jumpToGameStateLine = (lineNumber: number) => {
    setShowModalDropdown(false);
    setModalSearch("");
    
    if (gameStateRef.current) {
      // Find the target line element
      const targetElement = gameStateRef.current.querySelector(`[data-line="${lineNumber}"]`);
      
      if (targetElement) {
        // Scroll to the target element
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        
        // Highlight the target line temporarily
        const originalBg = (targetElement as HTMLElement).style.backgroundColor;
        const originalColor = (targetElement as HTMLElement).style.color;
        
        (targetElement as HTMLElement).style.backgroundColor = '#3b82f6';
        (targetElement as HTMLElement).style.color = 'white';
        (targetElement as HTMLElement).style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
          (targetElement as HTMLElement).style.backgroundColor = originalBg;
          (targetElement as HTMLElement).style.color = originalColor;
        }, 2000);
      } else {
        console.warn(`Could not find line element for line ${lineNumber}`);
      }
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

  // Keyboard navigation for modal dropdown
  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showModalDropdown || gameStateMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setModalHighlightedIdx((prev) => (prev + 1) % gameStateMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setModalHighlightedIdx((prev) => (prev - 1 + gameStateMatches.length) % gameStateMatches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      jumpToGameStateLine(gameStateMatches[modalHighlightedIdx].lineNumber);
    } else if (e.key === "Escape") {
      setShowModalDropdown(false);
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
              ref={(el) => { logRefs.current[origIdx] = el; }}
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
                  onClick={() => {
                    setShowModal(false);
                    setModalSearch("");
                    setShowModalDropdown(false);
                  }}
                >
                  Close
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  className="mt-2 px-2 py-1 border rounded text-xs w-full"
                  placeholder="Search game state..."
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setShowModalDropdown(!!e.target.value && gameStateMatches.length > 0);
                    setModalHighlightedIdx(0);
                  }}
                  onFocus={() => setShowModalDropdown(!!modalSearch && gameStateMatches.length > 0)}
                  onBlur={() => setTimeout(() => setShowModalDropdown(false), 100)}
                  onKeyDown={handleModalKeyDown}
                  autoFocus
                />
                {showModalDropdown && gameStateMatches.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 max-h-40 overflow-y-auto border bg-white shadow rounded mt-1">
                    {gameStateMatches.map((match, i) => (
                      <div
                        key={match.lineNumber}
                        className={`px-2 py-1 cursor-pointer text-xs ${
                          modalHighlightedIdx === i ? "bg-blue-100" : ""
                        }`}
                        onMouseDown={() => jumpToGameStateLine(match.lineNumber)}
                        onMouseEnter={() => setModalHighlightedIdx(i)}
                        title={match.fullLine}
                      >
                        <span className="text-gray-500 mr-2">Line {match.lineNumber + 1}:</span>
                        {highlightMatch(match.display, modalSearch)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto text-xs font-mono whitespace-pre-wrap">
              {/* Show live character status above raw game state */}
              {gameState && getLiveCharacterStatus(gameState) && (
                <>
                  <div className="mb-2">
                    <span className="font-bold">Live Character Status:</span>
                    <pre className="mb-2 bg-gray-100 rounded p-2 overflow-x-auto">
                      {safeStringify(getLiveCharacterStatus(gameState))}
                    </pre>
                  </div>
                </>
              )}
              {gameState ? (
                <pre ref={gameStateRef}>
                  {safeStringify(gameState)
                    .split('\n')
                    .map((line, idx) => (
                      <span 
                        key={idx} 
                        data-line={idx}
                        className={
                          modalSearch && line.toLowerCase().includes(modalSearch.toLowerCase()) 
                            ? "bg-yellow-200 text-black" 
                            : ""
                        }
                      >
                        {line + '\n'}
                      </span>
                    ))}
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

// Helper to get live character status as plain objects
function getLiveCharacterStatus(gameState: any) {
  if (!gameState || typeof gameState.getAllCharacters !== 'function') return null;
  return gameState.getAllCharacters().map((char: any) => ({
    id: char.id,
    name: char.name,
    faction: char.faction,
    defeated: char.defeated ?? char.isDefeated ?? false,
    location: char.getLocation ? char.getLocation() : char.location,
    revealed: char.isRevealed ?? char.is_revealed ?? false,
  }));
}

export default GameLog;
