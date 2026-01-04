/**
 * DevTools Logger - Enhanced Logging System
 *
 * Provides structured, filterable logging with levels, timestamps,
 * and support for different log categories.
 *
 * @module lib/devtools/logger
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'plugin'
  | 'theme'
  | 'api'
  | 'ui'
  | 'storage'
  | 'performance'
  | 'network'
  | 'system'
  | 'general';

export interface LogEntry {
  /** Unique ID */
  id: string;

  /** Log level */
  level: LogLevel;

  /** Log category */
  category: LogCategory;

  /** Log message */
  message: string;

  /** Additional data */
  data?: any;

  /** Timestamp */
  timestamp: number;

  /** Stack trace (for errors) */
  stack?: string;

  /** Source */
  source?: string;
}

export interface LogFilter {
  /** Minimum log level */
  minLevel?: LogLevel;

  /** Categories to include */
  categories?: LogCategory[];

  /** Search query */
  search?: string;

  /** Time range */
  startTime?: number;
  endTime?: number;
}

export interface LogListener {
  (entry: LogEntry): void;
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

class DevToolsLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private listeners: Set<LogListener> = new Set();
  private enabled = true;
  private levelFilters: Record<LogLevel, boolean> = {
    debug: true,
    info: true,
    warn: true,
    error: true,
  };
  private categoryFilters: Record<LogCategory, boolean> = {
    plugin: true,
    theme: true,
    api: true,
    ui: true,
    storage: true,
    performance: true,
    network: true,
    system: true,
    general: true,
  };

  // ========================================================================
  // LOGGING METHODS
  // ========================================================================

  /**
   * Log debug message
   */
  debug(message: string, data?: any, category: LogCategory = 'general', source?: string): void {
    this.log('debug', message, data, category, source);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any, category: LogCategory = 'general', source?: string): void {
    this.log('info', message, data, category, source);
  }

  /**
   * Log warning
   */
  warn(message: string, data?: any, category: LogCategory = 'general', source?: string): void {
    this.log('warn', message, data, category, source);
  }

  /**
   * Log error
   */
  error(message: string, data?: any, category: LogCategory = 'general', source?: string, error?: Error): void {
    this.log('error', message, data, category, source, error?.stack);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: any,
    category: LogCategory = 'general',
    source?: string,
    stack?: string
  ): void {
    if (!this.enabled) return;

    if (!this.levelFilters[level]) return;

    if (!this.categoryFilters[category]) return;

    const entry: LogEntry = {
      id: this.generateId(),
      level,
      category,
      message,
      data,
      timestamp: Date.now(),
      stack,
      source,
    };

    // Add to logs
    this.logs.push(entry);

    // Trim if needed
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify listeners
    this.notifyListeners(entry);

    // Console output
    this.outputToConsole(entry);
  }

  // ========================================================================
  // LOG RETRIEVAL
  // ========================================================================

  /**
   * Get all logs
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      // Filter by level
      if (filter.minLevel) {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const minIndex = levels.indexOf(filter.minLevel);
        filtered = filtered.filter((log) => levels.indexOf(log.level) >= minIndex);
      }

      // Filter by categories
      if (filter.categories && filter.categories.length > 0) {
        filtered = filtered.filter((log) => filter.categories!.includes(log.category));
      }

      // Filter by search
      if (filter.search) {
        const search = filter.search.toLowerCase();
        filtered = filtered.filter(
          (log) =>
            log.message.toLowerCase().includes(search) ||
            JSON.stringify(log.data).toLowerCase().includes(search)
        );
      }

      // Filter by time range
      if (filter.startTime) {
        filtered = filtered.filter((log) => log.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filtered = filtered.filter((log) => log.timestamp <= filter.endTime!);
      }
    }

    return filtered.reverse(); // Newest first
  }

  /**
   * Get log by ID
   */
  getLog(id: string): LogEntry | undefined {
    return this.logs.find((log) => log.id === id);
  }

  /**
   * Get log count
   */
  getLogCount(filter?: LogFilter): number {
    return this.getLogs(filter).length;
  }

  /**
   * Get logs grouped by level
   */
  getLogsByLevel(): Record<LogLevel, number> {
    return {
      debug: this.logs.filter((l) => l.level === 'debug').length,
      info: this.logs.filter((l) => l.level === 'info').length,
      warn: this.logs.filter((l) => l.level === 'warn').length,
      error: this.logs.filter((l) => l.level === 'error').length,
    };
  }

  /**
   * Get logs grouped by category
   */
  getLogsByCategory(): Record<LogCategory, number> {
    const result: Partial<Record<LogCategory, number>> = {};
    for (const log of this.logs) {
      result[log.category] = (result[log.category] || 0) + 1;
    }
    return result as Record<LogCategory, number>;
  }

  // ========================================================================
  // LOG MANAGEMENT
  // ========================================================================

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Clear logs by category
   */
  clearCategory(category: LogCategory): void {
    this.logs = this.logs.filter((log) => log.category !== category);
  }

  /**
   * Clear logs by level
   */
  clearLevel(level: LogLevel): void {
    this.logs = this.logs.filter((log) => log.level !== level);
  }

  /**
   * Export logs
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Import logs
   */
  importLogs(json: string): void {
    try {
      const imported = JSON.parse(json) as LogEntry[];
      this.logs = [...this.logs, ...imported];
      // Trim if needed
      while (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    } catch (error) {
      this.error('Failed to import logs', { error }, 'system', 'logger');
    }
  }

  // ========================================================================
  // FILTER MANAGEMENT
  // ========================================================================

  /**
   * Set level filter
   */
  setLevelFilter(level: LogLevel, enabled: boolean): void {
    this.levelFilters[level] = enabled;
  }

  /**
   * Set category filter
   */
  setCategoryFilter(category: LogCategory, enabled: boolean): void {
    this.categoryFilters[category] = enabled;
  }

  /**
   * Enable/disable logger
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if logger is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  // ========================================================================
  // LISTENERS
  // ========================================================================

  /**
   * Subscribe to logs
   */
  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(entry: LogEntry): void {
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (error) {
        // Avoid infinite loop
        console.error('Error in log listener:', error);
      }
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Output to console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.category.toUpperCase()}] ${entry.source ? `[${entry.source}]` : ''}`;

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case 'info':
        console.info(prefix, entry.message, entry.data || '');
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case 'error':
        console.error(prefix, entry.message, entry.data || '');
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let loggerInstance: DevToolsLogger | null = null;

export function getDevToolsLogger(): DevToolsLogger {
  if (!loggerInstance) {
    loggerInstance = new DevToolsLogger();
  }
  return loggerInstance;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const logger = getDevToolsLogger();

export const debug = (message: string, data?: any, category?: LogCategory, source?: string) =>
  logger.debug(message, data, category, source);

export const info = (message: string, data?: any, category?: LogCategory, source?: string) =>
  logger.info(message, data, category, source);

export const warn = (message: string, data?: any, category?: LogCategory, source?: string) =>
  logger.warn(message, data, category, source);

export const error = (message: string, data?: any, category?: LogCategory, source?: string, err?: Error) =>
  logger.error(message, data, category, source, err);
