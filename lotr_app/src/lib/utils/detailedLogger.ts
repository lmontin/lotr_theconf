/**
 * Comprehensive logging system for tracking flying Nazgul battle triggering issues
 * This provides detailed tracing from UI interactions through to battle system activation
 */

interface LogEntry {
  timestamp: number;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: string;
  file: string;
  function: string;
  message: string;
  data?: Record<string, any>;
}

// Safe JSON serialization that handles circular references
function safeJsonClone(obj: any, maxDepth = 5, currentDepth = 0): any {
  if (currentDepth > maxDepth) {
    return '[Max Depth Reached]';
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => safeJsonClone(item, maxDepth, currentDepth + 1));
  }
  
  const seen = new WeakSet();
  
  function replacer(key: string, value: any): any {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  }
  
  try {
    return JSON.parse(JSON.stringify(obj, replacer));
  } catch (error) {
    return '[Serialization Error]';
  }
}

class DetailedLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = true;

  log(
    level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
    category: string,
    file: string,
    functionName: string,
    message: string,
    data?: Record<string, any>
  ) {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      file,
      function: functionName,
      message,
      data: data ? safeJsonClone(data) : undefined
    };

    this.logs.push(entry);
    
    // Keep logs under limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with color coding
    const color = this.getColorForLevel(level);
    const timestamp = new Date(entry.timestamp).toISOString().substr(11, 12);
    console.log(
      `%c[${timestamp}] ${level} [${category}] ${file}.${functionName}: ${message}`,
      `color: ${color}; font-weight: ${level === 'ERROR' ? 'bold' : 'normal'}`
    );
    
    if (data) {
      console.log(`%c    Data:`, `color: ${color}; font-style: italic`, data);
    }
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case 'TRACE': return '#888888';
      case 'DEBUG': return '#0066cc';
      case 'INFO': return '#008800';
      case 'WARN': return '#ff8800';
      case 'ERROR': return '#cc0000';
      default: return '#000000';
    }
  }

  trace(category: string, file: string, functionName: string, message: string, data?: Record<string, any>) {
    this.log('TRACE', category, file, functionName, message, data);
  }

  debug(category: string, file: string, functionName: string, message: string, data?: Record<string, any>) {
    this.log('DEBUG', category, file, functionName, message, data);
  }

  info(category: string, file: string, functionName: string, message: string, data?: Record<string, any>) {
    this.log('INFO', category, file, functionName, message, data);
  }

  warn(category: string, file: string, functionName: string, message: string, data?: Record<string, any>) {
    this.log('WARN', category, file, functionName, message, data);
  }

  error(category: string, file: string, functionName: string, message: string, data?: Record<string, any>) {
    this.log('ERROR', category, file, functionName, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  getLogsByLevel(level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  clearLogs() {
    this.logs = [];
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  dumpLogsToConsole() {
    console.group('=== DETAILED LOGS DUMP ===');
    this.logs.forEach(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      console.log(`[${timestamp}] ${log.level} [${log.category}] ${log.file}.${log.function}: ${log.message}`);
      if (log.data) {
        console.log('  Data:', log.data);
      }
    });
    console.groupEnd();
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global logger instance
export const detailedLogger = new DetailedLogger();

// Convenience functions for specific categories
export const logUI = (file: string, func: string, message: string, data?: Record<string, any>) => 
  detailedLogger.debug('UI', file, func, message, data);

export const logMovement = (file: string, func: string, message: string, data?: Record<string, any>) => 
  detailedLogger.info('MOVEMENT', file, func, message, data);

export const logBattle = (file: string, func: string, message: string, data?: Record<string, any>) => 
  detailedLogger.info('BATTLE', file, func, message, data);

export const logGameState = (file: string, func: string, message: string, data?: Record<string, any>) => 
  detailedLogger.info('GAMESTATE', file, func, message, data);

export const logAbility = (file: string, func: string, message: string, data?: Record<string, any>) => 
  detailedLogger.debug('ABILITY', file, func, message, data);

export const logError = (file: string, func: string, message: string, data?: Record<string, any>) => 
  detailedLogger.error('ERROR', file, func, message, data);

export const logTrace = (file: string, func: string, message: string, data?: Record<string, any>) => 
  detailedLogger.trace('TRACE', file, func, message, data);

// Helper for logging state snapshots
export const logStateSnapshot = (file: string, func: string, label: string, gameState: any) => {
  const snapshot = {
    turn: gameState.getTurn?.(),
    phase: gameState.getCurrentPhase?.(),
    currentPlayer: gameState.getCurrentPlayer?.(),
    activeBattle: gameState.getActiveBattle?.(),
    activeBattleExists: !!gameState.getActiveBattle?.(),
  };
  detailedLogger.debug('STATE_SNAPSHOT', file, func, `${label} - Game State`, snapshot);
};
