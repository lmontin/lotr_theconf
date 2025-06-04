'use client';

import React, { useState, useEffect } from 'react';
import { detailedLogger } from '@/lib/utils/detailedLogger';

interface LogEntry {
  timestamp: number;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: string;
  file: string;
  function: string;
  message: string;
  data?: Record<string, any>;
}

const LoggingDebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLogs = detailedLogger.getLogs();
      setLogs(currentLogs);
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, []);

  const categories = ['ALL', ...new Set(logs.map(log => log.category))];
  const levels = ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];

  const filteredLogs = logs.filter(log => {
    const categoryMatch = selectedCategory === 'ALL' || log.category === selectedCategory;
    const levelMatch = selectedLevel === 'ALL' || log.level === selectedLevel;
    return categoryMatch && levelMatch;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'BATTLE': return 'text-purple-700 font-bold';
      case 'MOVEMENT': return 'text-blue-600';
      case 'UI': return 'text-green-600';
      case 'GAME_STATE': return 'text-orange-600';
      case 'ABILITY': return 'text-red-600';
      default: return 'text-gray-700';
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'TRACE': return 'text-gray-500';
      case 'DEBUG': return 'text-blue-600';
      case 'INFO': return 'text-green-600';
      case 'WARN': return 'text-yellow-600';
      case 'ERROR': return 'text-red-600';
      default: return 'text-gray-800';
    }
  };

  const clearLogs = () => {
    detailedLogger.clearLogs();
    setLogs([]);
  };

  const exportLogs = () => {
    const logsJson = detailedLogger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700 z-50"
      >
        Show Debug Logs
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Debug Logging Panel</h2>
          <div className="flex gap-2">
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear
            </button>
            <button
              onClick={exportLogs}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50 flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium mb-1">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className={cat === 'BATTLE' ? 'font-bold text-purple-700' : ''}>
                  {cat === 'BATTLE' ? '⚔️ BATTLE' : cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Level:</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {levels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoScroll"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <label htmlFor="autoScroll" className="text-sm">Auto-scroll</label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCategory('BATTLE')}
              className="px-2 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              ⚔️ Show Battle Only
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </div>

        {/* Logs */}
        <div 
          className="flex-1 overflow-auto p-4 font-mono text-xs"
          ref={(el) => {
            if (el && autoScroll) {
              el.scrollTop = el.scrollHeight;
            }
          }}
        >
          {filteredLogs.map((log, index) => (
            <div key={index} className={`mb-2 border-b pb-2 ${log.category === 'BATTLE' ? 'border-purple-200 bg-purple-50' : 'border-gray-100'}`}>
              <div className={`font-semibold ${getLogColor(log.level)}`}>
                [{new Date(log.timestamp).toISOString().substr(11, 12)}] {log.level} 
                <span className={`ml-2 ${getCategoryColor(log.category)}`}>
                  {log.category === 'BATTLE' ? '[⚔️ BATTLE]' : `[${log.category}]`}
                </span> 
                <span className="text-gray-600">{log.file}.{log.function}</span>
              </div>
              <div className={`ml-4 ${log.category === 'BATTLE' ? 'text-purple-800 font-medium' : 'text-gray-800'}`}>
                {log.message}
              </div>
              {log.data && (
                <details className="ml-4 mt-1">
                  <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
                    View data
                  </summary>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-gray-500 text-center py-8">
              No logs match the current filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoggingDebugPanel;
