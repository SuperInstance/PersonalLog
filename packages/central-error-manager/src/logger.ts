/**
 * Error Logging System
 *
 * Structured logging with levels, persistence to IndexedDB,
 * and export capabilities for production error monitoring.
 */

import type { ErrorRecord } from './types';

// ============================================================================
// LOG LEVELS
// ============================================================================

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  id: string;
  level: LogLevel;
  timestamp: number;
  message: string;
  category?: string;
  context?: LogContext;
  error?: ErrorRecord;
  stack?: string;
}

export interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  hardwareProfile?: {
    score: number;
    cores: number;
    ram: number;
    hasGPU: boolean;
  };
  additional?: Record<string, unknown>;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enablePersistence: boolean;
  bufferSize: number;
  flushInterval: number; // milliseconds
  maxLogEntries: number;
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: 'info',
  enableConsole: true,
  enablePersistence: true,
  bufferSize: 100,
  flushInterval: 30000, // 30 seconds
  maxLogEntries: 1000,
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ============================================================================
// INDEXEDDB STORAGE
// ============================================================================

const DB_NAME = 'CentralErrorManager_Logs';
const DB_VERSION = 1;
const STORE_NAME = 'logs';

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store with auto-increment id
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // Create indexes for querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('level', 'level', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }

  async add(entry: LogEntry): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(filter?: {
    level?: LogLevel;
    since?: number;
    limit?: number;
  }): Promise<LogEntry[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let entries = request.result as LogEntry[];

        // Filter by level
        if (filter?.level) {
          entries = entries.filter(e => e.level === filter.level);
        }

        // Filter by timestamp
        if (filter?.since) {
          entries = entries.filter(e => e.timestamp >= (filter.since ?? 0));
        }

        // Sort by timestamp (newest first)
        entries.sort((a, b) => b.timestamp - a.timestamp);

        // Limit results
        if (filter?.limit) {
          entries = entries.slice(0, filter.limit);
        }

        resolve(entries);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

export class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private storage: IndexedDBStorage;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private isClient: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = new IndexedDBStorage();
    this.sessionId = this.generateSessionId();
    this.isClient = typeof window !== 'undefined';

    if (this.isClient && this.config.enablePersistence) {
      this.storage.init().catch(err => {
        console.error('[Logger] Failed to init IndexedDB:', err);
      });

      // Start periodic flush
      this.startFlushInterval();
    }
  }

  // ==========================================================================
  // LOGGING METHODS
  // ==========================================================================

  error(message: string, error?: ErrorRecord, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: ErrorRecord
  ): void {
    // Check minimum level
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.config.minLevel]) {
      return;
    }

    // Enrich context
    const enrichedContext = this.enrichContext(context);

    // Create log entry
    const entry: LogEntry = {
      id: this.generateId(),
      level,
      timestamp: Date.now(),
      message,
      category: error?.category,
      context: enrichedContext,
      error,
      stack: error?.stack,
    };

    // Add to buffer
    this.buffer.push(entry);

    // Trim buffer if needed
    if (this.buffer.length > this.config.bufferSize) {
      this.buffer.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush().catch(err => {
        console.error('[Logger] Flush failed:', err);
      });
    }
  }

  // ==========================================================================
  // CONTEXT ENRICHMENT
  // ==========================================================================

  private enrichContext(context?: LogContext): LogContext {
    if (!this.isClient) {
      return { ...context, sessionId: this.sessionId } as LogContext;
    }

    return {
      ...context,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      hardwareProfile: this.getHardwareProfile(),
    } as LogContext;
  }

  private getHardwareProfile(): LogContext['hardwareProfile'] {
    if (!this.isClient) return undefined;
    if (typeof navigator === 'undefined' || typeof document === 'undefined') return undefined;

    return {
      score: 0, // Could fetch from hardware detection module
      cores: navigator.hardwareConcurrency || 0,
      ram: (navigator as any).deviceMemory || 0,
      hasGPU: !!document.createElement('canvas').getContext('webgl'),
    };
  }

  // ==========================================================================
  // CONSOLE OUTPUT
  // ==========================================================================

  private logToConsole(entry: LogEntry): void {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `[${entry.level.toUpperCase()}] [${new Date(entry.timestamp).toISOString()}]`;

    // Main log
    console.log(
      `%c${prefix} ${entry.message}`,
      style
    );

    // Context
    if (entry.context) {
      console.log('%cContext:', 'color: #666; font-weight: bold;', entry.context);
    }

    // Error details
    if (entry.error) {
      console.error('%cError:', 'color: #c00; font-weight: bold;', entry.error);
    }

    // Stack trace
    if (entry.stack) {
      console.group('%cStack Trace', 'color: #666; font-weight: bold;');
      console.error(entry.stack);
      console.groupEnd();
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const base = 'font-size: 12px; font-weight: bold;';

    switch (level) {
      case 'error':
        return `${base} color: #c00;`;
      case 'warn':
        return `${base} color: #856404;`;
      case 'info':
        return `${base} color: #0d47a1;`;
      case 'debug':
        return `${base} color: #666;`;
      default:
        return base;
    }
  }

  // ==========================================================================
  // BUFFER FLUSH
  // ==========================================================================

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    if (!this.config.enablePersistence) {
      return;
    }

    try {
      // Add all entries to IndexedDB
      await Promise.all(entries.map(entry => this.storage.add(entry)));

      // Check if we need to prune old entries
      const count = await this.storage.count();
      if (count > this.config.maxLogEntries) {
        await this.pruneOldEntries();
      }
    } catch (error) {
      console.error('[Logger] Failed to persist logs:', error);
      // Re-add to buffer on failure
      this.buffer.unshift(...entries);
    }
  }

  private async pruneOldEntries(): Promise<void> {
    try {
      // Get all entries and calculate how many to delete
      const allEntries = await this.storage.getAll();
      const toDelete = allEntries.length - this.config.maxLogEntries;

      if (toDelete > 0) {
        // Delete oldest entries
        const oldestIds = allEntries
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, toDelete)
          .map(e => e.id);

        // Delete via IndexedDB
        await this.storage.clear();
        await Promise.all(
          allEntries
            .filter(e => !oldestIds.includes(e.id))
            .map(e => this.storage.add(e))
        );
      }
    } catch (error) {
      console.error('[Logger] Failed to prune old entries:', error);
    }
  }

  private startFlushInterval(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('[Logger] Periodic flush failed:', err);
      });
    }, this.config.flushInterval);
  }

  // ==========================================================================
  // QUERY AND EXPORT
  // ==========================================================================

  async getEntries(filter?: {
    level?: LogLevel;
    since?: number;
    limit?: number;
  }): Promise<LogEntry[]> {
    if (this.buffer.length > 0) {
      await this.flush();
    }

    return this.storage.getAll(filter);
  }

  async exportAsJSON(): Promise<string> {
    const entries = await this.getEntries();

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalEntries: entries.length,
      entries,
    }, null, 2);
  }

  async exportAsCSV(): Promise<string> {
    const entries = await this.getEntries();

    const headers = ['timestamp', 'level', 'message', 'category', 'component', 'operation'];
    const rows = entries.map(e => [
      new Date(e.timestamp).toISOString(),
      e.level,
      `"${e.message.replace(/"/g, '""')}"`,
      e.category || '',
      e.context?.component || '',
      e.context?.operation || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async clear(): Promise<void> {
    this.buffer = [];
    await this.storage.clear();
  }

  async getCount(): Promise<number> {
    return this.storage.count();
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    this.flush().catch(err => {
      console.error('[Logger] Final flush failed:', err);
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalLogger: Logger | null = null;

export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

export function resetLogger(): void {
  if (globalLogger) {
    globalLogger.destroy();
  }
  globalLogger = null;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function logError(message: string, error?: ErrorRecord, context?: LogContext): void {
  getLogger().error(message, error, context);
}

export function logWarn(message: string, context?: LogContext): void {
  getLogger().warn(message, context);
}

export function logInfo(message: string, context?: LogContext): void {
  getLogger().info(message, context);
}

export function logDebug(message: string, context?: LogContext): void {
  getLogger().debug(message, context);
}

export async function getLogEntries(filter?: {
  level?: LogLevel;
  since?: number;
  limit?: number;
}): Promise<LogEntry[]> {
  return getLogger().getEntries(filter);
}

export async function exportLogsAsJSON(): Promise<string> {
  return getLogger().exportAsJSON();
}

export async function exportLogsAsCSV(): Promise<string> {
  return getLogger().exportAsCSV();
}

export async function clearLogs(): Promise<void> {
  return getLogger().clear();
}

export async function getLogCount(): Promise<number> {
  return getLogger().getCount();
}
