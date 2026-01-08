/**
 * Performance-Optimized Logger
 *
 * Conditional logging utility that prevents console overhead in production.
 * All logging is conditional based on environment variables and log levels.
 *
 * @example
 * ```typescript
 * import { logger } from '@superinstance/shared-logger'
 *
 * logger.debug('Detailed info:', data) // Only in DEBUG mode
 * logger.info('User action:', action)  // Only in non-test environments
 * logger.warn('Warning:', warning)     // Only in non-test environments
 * logger.error('Error:', error)        // Always logged
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * Check if debug logging is enabled
 */
const isDebugEnabled = (): boolean => {
  return process.env.DEBUG === '1' || process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'
}

/**
 * Check if logging is enabled for non-error levels
 */
const isLoggingEnabled = (): boolean => {
  return process.env.NODE_ENV !== 'test'
}

/**
 * Performance-optimized logger implementation
 */
export const logger: Logger = {
  /**
   * Debug-level logging (only in DEBUG/development mode)
   */
  debug: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.debug('[DEBUG]', ...args)
    }
  },

  /**
   * Info-level logging (disabled in test environment)
   */
  info: (...args: unknown[]) => {
    if (isLoggingEnabled()) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * Warning-level logging (disabled in test environment)
   */
  warn: (...args: unknown[]) => {
    if (isLoggingEnabled()) {
      console.warn('[WARN]', ...args)
    }
  },

  /**
   * Error-level logging (always enabled)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  },
}

/**
 * Create a scoped logger with a prefix
 *
 * @example
 * ```typescript
 * const logger = createLogger('MyModule')
 * logger.info('Something happened') // [INFO] [MyModule] Something happened
 * ```
 */
export function createLogger(scope: string): Logger {
  return {
    debug: (...args: unknown[]) => {
      if (isDebugEnabled()) {
        console.debug(`[DEBUG] [${scope}]`, ...args)
      }
    },
    info: (...args: unknown[]) => {
      if (isLoggingEnabled()) {
        console.info(`[INFO] [${scope}]`, ...args)
      }
    },
    warn: (...args: unknown[]) => {
      if (isLoggingEnabled()) {
        console.warn(`[WARN] [${scope}]`, ...args)
      }
    },
    error: (...args: unknown[]) => {
      console.error(`[ERROR] [${scope}]`, ...args)
    },
  }
}

/**
 * Set the log level at runtime
 */
export function setLogLevel(level: LogLevel): void {
  process.env.LOG_LEVEL = level
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return (process.env.LOG_LEVEL as LogLevel) || 'info'
}
