/**
 * Central Error Manager - Public API
 *
 * Main entry point for the error handling system.
 * Exports all error types, handlers, and utilities.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

import type {
  ErrorCategory,
  ErrorSeverity,
  RecoveryPotential,
  ErrorRecord,
  ErrorContext,
  RecoveryAction,
} from './types';

export type {
  ErrorCategory,
  ErrorSeverity,
  RecoveryPotential,
  ErrorRecord,
  ErrorContext,
  RecoveryAction,
};

// ============================================================================
// ERROR CLASSES
// ============================================================================

export {
  CentralError,
  WasmError,
  StorageError,
  QuotaError,
  BenchmarkError,
  CapabilityError,
  NetworkError,
  TimeoutError,
  ValidationError,
  NotFoundError,
  PermissionError,
  HardwareDetectionError,
} from './types';

// ============================================================================
// TYPE GUARDS
// ============================================================================

export {
  isCentralError,
  isRecoverable,
  shouldFallback,
  getErrorCategory,
  getErrorSeverity,
} from './types';

// ============================================================================
// ERROR HANDLER
// ============================================================================

export {
  ErrorHandler,
  getErrorHandler,
  resetErrorHandler,
  log,
  getUserMessage,
  getRecoveryActions,
  getErrorHistory,
  onError,
  registerRecoveryActions,
} from './handler';

export type { ErrorHandlerConfig } from './handler';

// ============================================================================
// RECOVERY STRATEGIES
// ============================================================================

export {
  WasmRecoveryStrategy,
  StorageRecoveryStrategy,
  HardwareRecoveryStrategy,
  NetworkRecoveryStrategy,
  TimeoutRecoveryStrategy,
  initializeRecoveryStrategies,
  wasmRecovery,
  storageRecovery,
  hardwareRecovery,
  networkRecovery,
  timeoutRecovery,
} from './recovery';

// ============================================================================
// ERROR LOGGER
// ============================================================================

export {
  Logger,
  getLogger,
  resetLogger,
  logError,
  logWarn,
  logInfo,
  logDebug,
  getLogEntries,
  exportLogsAsJSON,
  exportLogsAsCSV,
  clearLogs,
  getLogCount,
} from './logger';

export type {
  LogEntry,
  LogContext,
  LogLevel,
  LoggerConfig,
} from './logger';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize the error handling system
 *
 * Call this once at app startup to setup global error handlers
 * and recovery strategies.
 */
export async function initializeErrorHandler(config?: {
  enableLogging?: boolean;
  enableUserNotifications?: boolean;
  logToConsole?: boolean;
  userTechnicalLevel?: 'basic' | 'intermediate' | 'advanced';
}): Promise<void> {
  const { getErrorHandler } = await import('./handler');
  const { initializeRecoveryStrategies } = await import('./recovery');

  // Initialize error handler with config
  getErrorHandler(config);

  // Initialize recovery strategies
  initializeRecoveryStrategies();

  // Log initialization
  if (config?.enableLogging !== false) {
    console.log('[CentralErrorManager] System initialized');
  }
}

/**
 * Handle an error with full context
 *
 * This is the main function to use when catching errors.
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, {
 *     component: 'ConversationList',
 *     operation: 'loadConversations',
 *   });
 * }
 */
export function handleError(
  error: unknown,
  context?: ErrorContext
): ErrorRecord {
  // Lazy import to avoid circular dependency
  const { log } = require('./handler');
  return log(error, context) as ErrorRecord;
}

/**
 * Create and throw a typed error
 *
 * Helper function to create and throw specific error types.
 *
 * @example
 * throw createError('wasm', 'Failed to load vector module', {
 *   severity: 'high',
 *   context: { module: 'vector-search' },
 * });
 */
export function createError(
  category: ErrorCategory,
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recovery?: RecoveryPotential;
    userMessage?: string;
    technicalDetails?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  }
): any {
  const {
    WasmError,
    StorageError,
    QuotaError,
    HardwareDetectionError,
    BenchmarkError,
    CapabilityError,
    NetworkError,
    TimeoutError,
    ValidationError,
    NotFoundError,
    PermissionError,
    CentralError,
  } = require('./types');

  // Map category to error class
  const errorClasses: Record<string, any> = {
    'wasm-fallback': WasmError,
    system: StorageError,
    quota: QuotaError,
    benchmark: BenchmarkError,
    capability: CapabilityError,
    network: NetworkError,
    offline: NetworkError,
    timeout: TimeoutError,
    validation: ValidationError,
    'not-found': NotFoundError,
    permission: PermissionError,
  };

  const ErrorClass = errorClasses[category] || CentralError;

  return new ErrorClass(message, options || {});
}

/**
 * Wrap an async function with error handling
 *
 * Automatically catches and logs errors from async operations.
 *
 * @example
 * const safeFetch = withErrorHandling(fetch, {
 *   component: 'API',
 *   operation: 'fetchData',
 * });
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: ErrorContext
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error) => {
          handleError(error, context);
          throw error; // Re-throw for caller to handle
        });
      }

      return result;
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw for caller to handle
    }
  }) as T;
}

/**
 * Create a fallback-aware async function
 *
 * Returns a fallback value if the main function fails.
 *
 * @example
 * const getVectorSearch = withFallback(
 *   loadWasmVectorSearch,
 *   loadJsVectorSearch,
 *   'vector-search'
 * );
 */
export function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  featureName: string
): () => Promise<T> {
  return async () => {
    try {
      return await primary();
    } catch (error) {
      handleError(error, {
        component: 'WithFallback',
        operation: featureName,
      } as ErrorContext);

      // Try fallback
      try {
        return await fallback();
      } catch (fallbackError) {
        handleError(fallbackError, {
          component: 'WithFallback',
          operation: `${featureName}-fallback`,
        } as ErrorContext);
        throw fallbackError;
      }
    }
  };
}
