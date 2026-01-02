/**
 * Error Handling Type Definitions
 *
 * Comprehensive error type system for PersonalLog.
 * Categorizes errors by severity, recovery potential, and user impact.
 */

// ============================================================================
// ERROR CATEGORIES
// ============================================================================

/**
 * Error categories determine how errors are displayed and handled
 */
export type ErrorCategory =
  // System errors - show technical info to help debug
  | 'system'        // WASM, IndexedDB, hardware detection failures
  | 'benchmark'     // Benchmark crashes, timeouts
  | 'network'       // Network failures, API errors

  // User errors - provide helpful guidance
  | 'quota'         // Storage quota exceeded
  | 'capability'    // Feature not available on this device
  | 'offline'       // Network offline, service unavailable

  // Graceful degradations - silent fallback
  | 'wasm-fallback' // WASM unavailable, use JS fallback
  | 'hardware-incomplete' // Hardware info incomplete, use defaults
  | 'timeout'       // Operation timeout, skip gracefully

  // Application errors
  | 'validation'    // Input validation failed
  | 'not-found'     // Resource not found
  | 'permission'    // Permission denied
  | 'unknown';      // Uncategorized errors

/**
 * Error severity levels
 */
export type ErrorSeverity =
  | 'critical'  // App cannot function
  | 'high'      // Major feature broken
  | 'medium'    // Feature partially degraded
  | 'low'       // Minor issue, workaround available
  | 'info';     // Informational, no action needed

/**
 * Recovery potential - can the user recover from this error?
 */
export type RecoveryPotential =
  | 'recoverable'    // User can fix it (retry, grant permission, etc.)
  | 'fallback'       // System can provide fallback
  | 'degraded'       // Can continue with reduced functionality
  | 'fatal';         // Cannot recover, must abort

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base error class for all PersonalLog errors
 */
export class PersonalLogError extends Error {
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly recovery: RecoveryPotential;
  readonly userMessage: string;
  readonly technicalDetails?: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: number;
  readonly recoverable: boolean;

  constructor(
    message: string,
    options: {
      category: ErrorCategory;
      severity: ErrorSeverity;
      recovery: RecoveryPotential;
      userMessage: string;
      technicalDetails?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, { cause: options.cause });

    this.name = this.constructor.name;
    this.category = options.category;
    this.severity = options.severity;
    this.recovery = options.recovery;
    this.userMessage = options.userMessage;
    this.technicalDetails = options.technicalDetails;
    this.context = options.context;
    this.timestamp = Date.now();
    this.recoverable =
      options.recovery === 'recoverable' ||
      options.recovery === 'fallback' ||
      options.recovery === 'degraded';

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON(): ErrorRecord {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recovery: this.recovery,
      userMessage: this.userMessage,
      technicalDetails: this.technicalDetails,
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }

  /**
   * Check if error should be visible to user
   */
  isUserVisible(): boolean {
    return this.severity !== 'info' && this.category !== 'wasm-fallback';
  }

  /**
   * Check if error should trigger fallback behavior
   */
  shouldFallback(): boolean {
    return this.recovery === 'fallback' || this.recovery === 'degraded';
  }
}

// ============================================================================
// SPECIALIZED ERROR CLASSES
// ============================================================================

/**
 * WASM-related errors
 */
export class WasmError extends PersonalLogError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category'> & {
      technicalDetails?: string;
    } = {}
  ) {
    super(message, {
      ...options,
      category: 'system',
      severity: options.severity || 'high',
      recovery: options.recovery || 'fallback',
      userMessage: options.userMessage || 'WebAssembly module failed to load. Using optimized JavaScript instead.',
    });
  }
}

/**
 * IndexedDB-related errors
 */
export class StorageError extends PersonalLogError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category'> & {
      technicalDetails?: string;
    } = {}
  ) {
    super(message, {
      ...options,
      category: 'system',
      severity: options.severity || 'critical',
      recovery: options.recovery || 'fatal',
      userMessage: options.userMessage || 'Database storage is unavailable. Please check your browser settings.',
    });
  }
}

/**
 * Storage quota exceeded error
 */
export class QuotaError extends PersonalLogError {
  readonly usedBytes: number;
  readonly totalBytes: number;

  constructor(
    usedBytes: number,
    totalBytes: number,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category'> & {} = {}
  ) {
    const usedMB = Math.round(usedBytes / (1024 * 1024));
    const totalMB = Math.round(totalBytes / (1024 * 1024));

    super(`Storage quota exceeded: ${usedMB}MB used of ${totalMB}MB`, {
      ...options,
      category: 'quota',
      severity: 'high',
      recovery: 'recoverable',
      userMessage: options.userMessage || `Storage almost full (${usedMB}MB used of ${totalMB}MB). Consider clearing old conversations or enabling compaction.`,
      technicalDetails: options.technicalDetails || `Quota: ${totalBytes} bytes, Used: ${usedBytes} bytes`,
      context: { usedBytes, totalBytes, ...options.context },
    });

    this.usedBytes = usedBytes;
    this.totalBytes = totalBytes;
  }
}

/**
 * Hardware detection error
 */
export class HardwareDetectionError extends PersonalLogError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category' | 'recovery'> & {
      technicalDetails?: string;
    } = {}
  ) {
    super(message, {
      ...options,
      category: 'system',
      severity: options.severity || 'medium',
      recovery: 'fallback',
      userMessage: options.userMessage || 'Could not detect all hardware capabilities. Some features may use default settings.',
    });
  }
}

/**
 * Benchmark error
 */
export class BenchmarkError extends PersonalLogError {
  readonly benchmarkId?: string;

  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category'> & {
      benchmarkId?: string;
      technicalDetails?: string;
    } = {}
  ) {
    super(message, {
      ...options,
      category: 'benchmark',
      severity: options.severity || 'medium',
      recovery: options.recovery || 'degraded',
      userMessage: options.userMessage || 'Performance benchmark failed. Using default performance settings.',
      context: { benchmarkId: options.benchmarkId, ...options.context },
    });

    this.benchmarkId = options.benchmarkId;
  }
}

/**
 * Feature not available error
 */
export class CapabilityError extends PersonalLogError {
  readonly feature: string;
  readonly requirement: string;

  constructor(
    feature: string,
    requirement: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category'> & {} = {}
  ) {
    super(`Feature not available: ${feature}`, {
      ...options,
      category: 'capability',
      severity: 'medium',
      recovery: 'degraded',
      userMessage: options.userMessage || `"${feature}" requires ${requirement}. This feature is disabled on your device.`,
      context: { feature, requirement, ...options.context },
    });

    this.feature = feature;
    this.requirement = requirement;
  }
}

/**
 * Network error
 */
export class NetworkError extends PersonalLogError {
  readonly url?: string;
  readonly status?: number;

  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category'> & {
      url?: string;
      status?: number;
      technicalDetails?: string;
    } = {}
  ) {
    const isOffline = !navigator.onLine;
    const category: ErrorCategory = isOffline ? 'offline' : 'network';

    super(message, {
      ...options,
      category,
      severity: options.severity || (isOffline ? 'high' : 'medium'),
      recovery: options.recovery || (isOffline ? 'recoverable' : 'degraded'),
      userMessage: options.userMessage || (isOffline
        ? 'You appear to be offline. Some features may be limited.'
        : 'Network request failed. Please check your connection.'),
      context: { url: options.url, status: options.status, ...options.context },
    });

    this.url = options.url;
    this.status = options.status;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends PersonalLogError {
  readonly operation: string;
  readonly timeout: number;

  constructor(
    operation: string,
    timeout: number,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category' | 'recovery'> & {} = {}
  ) {
    super(`Operation timed out: ${operation}`, {
      ...options,
      category: 'timeout',
      severity: options.severity || 'low',
      recovery: 'degraded',
      userMessage: options.userMessage || `"${operation}" took too long and was skipped. This is normal on slower devices.`,
      context: { operation, timeout, ...options.context },
    });

    this.operation = operation;
    this.timeout = timeout;
  }
}

/**
 * Validation error
 */
export class ValidationError extends PersonalLogError {
  readonly field?: string;
  readonly value?: unknown;

  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category' | 'severity' | 'recovery'> & {
      field?: string;
      value?: unknown;
    } = {}
  ) {
    super(message, {
      ...options,
      category: 'validation',
      severity: 'low',
      recovery: 'recoverable',
      userMessage: options.userMessage || 'Invalid input. Please check your entries and try again.',
      context: { field: options.field, value: options.value, ...options.context },
    });

    this.field = options.field;
    this.value = options.value;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends PersonalLogError {
  readonly resource: string;
  readonly id?: string;

  constructor(
    resource: string,
    id?: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category' | 'severity' | 'recovery'> & {} = {}
  ) {
    super(`Resource not found: ${resource}${id ? ` (${id})` : ''}`, {
      ...options,
      category: 'not-found',
      severity: 'medium',
      recovery: 'recoverable',
      userMessage: options.userMessage || `The requested ${resource} could not be found.`,
      context: { resource, id, ...options.context },
    });

    this.resource = resource;
    this.id = id;
  }
}

/**
 * Permission error
 */
export class PermissionError extends PersonalLogError {
  readonly permission: string;

  constructor(
    permission: string,
    options: Omit<ConstructorParameters<typeof PersonalLogError>[1], 'category' | 'recovery'> & {} = {}
  ) {
    super(`Permission denied: ${permission}`, {
      ...options,
      category: 'permission',
      severity: options.severity || 'high',
      recovery: 'recoverable',
      userMessage: options.userMessage || `Permission required: ${permission}. Please grant access in your browser settings.`,
      context: { permission, ...options.context },
    });

    this.permission = permission;
  }
}

// ============================================================================
// ERROR RECORD (for logging/serialization)
// ============================================================================

/**
 * Serialized error record
 */
export interface ErrorRecord {
  name: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recovery: RecoveryPotential;
  userMessage: string;
  technicalDetails?: string;
  context?: Record<string, unknown>;
  timestamp: number;
  recoverable: boolean;
  stack?: string;
}

// ============================================================================
// ERROR CONTEXT (for enhanced debugging)
// ============================================================================

/**
 * Enhanced error context for logging
 */
export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  hardwareProfile?: {
    score: number;
    cores: number;
    ram: number;
    hasGPU: boolean;
  };
  additional?: Record<string, unknown>;
}

// ============================================================================
// RECOVERY ACTION
// ============================================================================

/**
 * Recovery action that users can take
 */
export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;  // If true, this is the primary recommended action
  dangerous?: boolean; // If true, action might have side effects
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if error is a PersonalLogError
 */
export function isPersonalLogError(error: unknown): error is PersonalLogError {
  return error instanceof PersonalLogError;
}

/**
 * Check if error is recoverable
 */
export function isRecoverable(error: unknown): boolean {
  return isPersonalLogError(error) && error.recoverable;
}

/**
 * Check if error should fallback
 */
export function shouldFallback(error: unknown): boolean {
  return isPersonalLogError(error) && error.shouldFallback();
}

/**
 * Get error category
 */
export function getErrorCategory(error: unknown): ErrorCategory | 'unknown' {
  if (isPersonalLogError(error)) {
    return error.category;
  }
  return 'unknown';
}

/**
 * Get error severity
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (isPersonalLogError(error)) {
    return error.severity;
  }
  return 'medium'; // Default severity for unknown errors
}
