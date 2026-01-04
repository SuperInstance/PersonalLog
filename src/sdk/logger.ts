/**
 * PersonalLog Plugin SDK - Logger
 *
 * Provides logging utilities for plugins.
 *
 * @packageDocumentation
 */

import type { Logger } from './types';

// ============================================================================
// LOG LEVELS
// ============================================================================

/**
 * Log level
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log level names
 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

/**
 * Plugin logger implementation
 *
 * Provides structured logging with context and log levels.
 */
class LoggerImpl implements Logger {
  private pluginId: string;
  private minLevel: LogLevel;
  private context: Record<string, any>;

  constructor(pluginId: string, minLevel: LogLevel = LogLevel.INFO) {
    this.pluginId = pluginId;
    this.minLevel = minLevel;
    this.context = {};
  }

  /**
   * Log debug message
   *
   * @param message - Log message
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Log info message
   *
   * @param message - Log message
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Log warning message
   *
   * @param message - Log message
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Log error message
   *
   * @param message - Log message
   * @param args - Additional arguments to log
   */
  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Set minimum log level
   *
   * @param level - Minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get current minimum log level
   *
   * @returns Current minimum log level
   */
  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Create a child logger with additional context
   *
   * @param context - Additional context to add
   * @returns New logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new LoggerImpl(this.pluginId, this.minLevel);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Core logging method
   *
   * @param level - Log level
   * @param message - Log message
   * @param args - Additional arguments
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Check if level is enabled
    if (level < this.minLevel) {
      return;
    }

    // Format log entry
    const entry = this.formatLogEntry(level, message, args);

    // Output to console
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(entry);
        break;
      case LogLevel.INFO:
        console.info(entry);
        break;
      case LogLevel.WARN:
        console.warn(entry);
        break;
      case LogLevel.ERROR:
        console.error(entry);
        break;
    }

    // Emit log event for app to capture
    this.emitLogEvent(level, message, args);
  }

  /**
   * Format log entry for console output
   */
  private formatLogEntry(level: LogLevel, message: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevelNames[level];
    const parts = [`[${timestamp}]`, `[${this.pluginId}]`, `[${levelName}]`, message];

    // Add context
    if (Object.keys(this.context).length > 0) {
      parts.push(JSON.stringify(this.context));
    }

    // Add args
    if (args.length > 0) {
      parts.push(JSON.stringify(args));
    }

    return parts.join(' ');
  }

  /**
   * Emit log event for app to capture
   */
  private emitLogEvent(level: LogLevel, message: string, args: any[]): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('plugin-log', {
          detail: {
            pluginId: this.pluginId,
            level: LogLevelNames[level],
            message,
            args,
            context: this.context,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  }
}

// ============================================================================
// LOG HISTORY
// ============================================================================

/**
 * Log entry
 */
export interface LogEntry {
  pluginId: string;
  level: string;
  message: string;
  args: any[];
  context: Record<string, any>;
  timestamp: string;
}

/**
 * Log history buffer
 *
 * Stores recent log entries for debugging.
 */
class LogHistory {
  private entries: LogEntry[] = [];
  private maxEntries: number = 1000;

  add(entry: LogEntry): void {
    this.entries.push(entry);

    // Trim if too many entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  getEntries(pluginId?: string, level?: string): LogEntry[] {
    let entries = this.entries;

    if (pluginId) {
      entries = entries.filter(e => e.pluginId === pluginId);
    }

    if (level) {
      entries = entries.filter(e => e.level === level);
    }

    return entries;
  }

  clear(): void {
    this.entries = [];
  }

  getMaxEntries(): number {
    return this.maxEntries;
  }

  setMaxEntries(maxEntries: number): void {
    this.maxEntries = maxEntries;
  }
}

/**
 * Global log history
 */
export const logHistory = new LogHistory();

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new logger for a plugin
 *
 * @param pluginId - Plugin ID
 * @param minLevel - Minimum log level (default: INFO)
 * @param enableHistory - Whether to store logs in history (default: true)
 * @returns Logger instance
 */
export function createLogger(
  pluginId: string,
  minLevel: LogLevel = LogLevel.INFO,
  enableHistory: boolean = true
): Logger {
  const logger = new LoggerImpl(pluginId, minLevel);

  // Wrap to add to history
  if (enableHistory) {
    const originalInfo = logger.info.bind(logger);
    const originalWarn = logger.warn.bind(logger);
    const originalError = logger.error.bind(logger);
    const originalDebug = logger.debug.bind(logger);

    const addEntry = (level: string, message: string, args: any[]) => {
      logHistory.add({
        pluginId,
        level,
        message,
        args,
        context: {},
        timestamp: new Date().toISOString(),
      });
    };

    logger.info = (message: string, ...args: any[]) => {
      addEntry('INFO', message, args);
      originalInfo(message, ...args);
    };

    logger.warn = (message: string, ...args: any[]) => {
      addEntry('WARN', message, args);
      originalWarn(message, ...args);
    };

    logger.error = (message: string, ...args: any[]) => {
      addEntry('ERROR', message, args);
      originalError(message, ...args);
    };

    logger.debug = (message: string, ...args: any[]) => {
      addEntry('DEBUG', message, args);
      originalDebug(message, ...args);
    };
  }

  return logger;
}

/**
 * Get log history
 *
 * @param pluginId - Optional plugin ID to filter by
 * @param level - Optional log level to filter by
 * @returns Log entries
 */
export function getLogHistory(pluginId?: string, level?: string): LogEntry[] {
  return logHistory.getEntries(pluginId, level);
}

/**
 * Clear log history
 */
export function clearLogHistory(): void {
  logHistory.clear();
}

export default LoggerImpl;
