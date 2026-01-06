/**
 * Production Logging Utilities
 *
 * Provides structured logging for development and production
 * Supports different log levels and metadata tracking
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogContext {
  userId?: string;
  projectId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel;
  private isProduction: boolean;
  private logs: LogEntry[] = [];

  constructor(minLevel: LogLevel = LogLevel.INFO, isProduction: boolean = false) {
    this.minLevel = minLevel;
    this.isProduction = isProduction;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    if (error) {
      entry.error = {
        name: error.name || 'Error',
        message: error.message || String(error),
        stack: error.stack
      };
    }

    return entry;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.log(entry);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.log(entry);
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.log(entry);
  }

  error(message: string, context?: LogContext, error?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.log(entry);
  }

  fatal(message: string, context?: LogContext, error?: any): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, error);
    this.log(entry);
  }

  private log(entry: LogEntry): void {
    this.logs.push(entry);

    // Console output with colors in development
    if (!this.isProduction) {
      const colors = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
        [LogLevel.FATAL]: '\x1b[35m'  // Magenta
      };
      const reset = '\x1b[0m';
      const prefix = colors[entry.level];

      console.log(`${prefix}[${LogLevel[entry.level]}]${reset} ${entry.message}`);

      if (entry.error) {
        console.error(`${prefix}  Error:${reset}`, entry.error);
      }

      if (entry.context) {
        console.log(`${prefix}  Context:${reset}`, entry.context);
      }
    }

    // Send to logging service in production
    if (this.isProduction) {
      this.sendToLoggingService(entry);
    }
  }

  private async sendToLoggingService(entry: LogEntry): Promise<void> {
    try {
      // In production, send to your logging service (Sentry, LogRocket, etc.)
      // For now, we'll store in local file
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      }).catch(err => {
        console.error('Failed to send log to service:', err);
      });
    } catch (error) {
      console.error('Failed to send log to service:', error);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// Create global logger instance
const NODE_ENV = process.env.NODE_ENV || 'development';
const MIN_LOG_LEVEL = NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;

export const logger = new Logger(MIN_LOG_LEVEL, NODE_ENV === 'production');

// Convenience functions for common scenarios
export const logApiRequest = (
  endpoint: string,
  method: string,
  context?: LogContext
): void => {
  logger.info(`${method} ${endpoint}`, {
    ...context,
    endpoint,
    method
  });
};

export const logApiResponse = (
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  context?: LogContext
): void => {
  const level = statusCode >= 500 ? LogLevel.ERROR : LogLevel.DEBUG;

  logger[level](`${method} ${endpoint} - ${statusCode} (${duration}ms)`, {
    ...context,
    endpoint,
    method,
    duration,
    statusCode
  });
};

export const logApiError = (
  endpoint: string,
  method: string,
  error: any,
  context?: LogContext
): void => {
  logger.error(`${method} ${endpoint} failed`, {
    ...context,
    endpoint,
    method,
    error
  });
};

export const logDatabaseOperation = (
  operation: string,
  duration: number,
  context?: LogContext
): void => {
  logger.info(`${operation} (${duration}ms)`, {
    ...context,
    operation,
    duration
  });
};

export const logValidationError = (
  field: string,
  value: any,
  error: string,
  context?: LogContext
): void => {
  logger.warn(`Validation failed: ${field}`, {
    ...context,
    field,
    value: String(value),
    error
  });
};

export const logSecurityEvent = (
  event: string,
  details: any,
  context?: LogContext
): void => {
  logger.warn(`Security event: ${event}`, {
    ...context,
    security: true,
    event,
    details
  });
};
