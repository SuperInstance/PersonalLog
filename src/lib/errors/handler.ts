/**
 * Central Error Handler
 *
 * Single point of truth for error handling in PersonalLog.
 * Provides logging, user messaging, and recovery actions.
 */

import {
  isPersonalLogError,
  getErrorCategory,
  getErrorSeverity,
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
  type ErrorRecord,
  type ErrorContext,
  type ErrorCategory,
  type RecoveryAction,
  type PersonalLogError,
} from './types';

// Re-export error types for convenience
export {
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
  type ErrorRecord,
  type ErrorContext,
  type ErrorCategory,
  type RecoveryAction,
  type PersonalLogError,
};

// ============================================================================
// ERROR HANDLER CONFIGURATION
// ============================================================================

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableUserNotifications: boolean;
  logToConsole: boolean;
  maxErrorHistory: number;
  userTechnicalLevel: 'basic' | 'intermediate' | 'advanced';
  analyticsCallback?: (error: ErrorRecord) => void;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableLogging: true,
  enableUserNotifications: true,
  logToConsole: true,
  maxErrorHistory: 100,
  userTechnicalLevel: 'intermediate',
};

// ============================================================================
// ERROR HISTORY
// ============================================================================

interface ErrorHistoryEntry {
  error: ErrorRecord;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorHistory: Map<string, ErrorHistoryEntry> = new Map();
  private errorCallbacks: Set<(error: ErrorRecord) => void> = new Set();
  private recoveryCallbacks: Map<ErrorCategory, Set<(error: PersonalLogError) => RecoveryAction[]>> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupGlobalErrorHandlers();
  }

  // ==========================================================================
  // CORE ERROR HANDLING
  // ==========================================================================

  /**
   * Main error handling entry point
   */
  handle(error: unknown, context?: ErrorContext): ErrorRecord {
    const errorRecord = this.normalizeError(error, context);

    // Log the error
    if (this.config.enableLogging) {
      this.logError(errorRecord);
    }

    // Add to history
    this.addToHistory(errorRecord);

    // Notify callbacks
    this.notifyCallbacks(errorRecord);

    // Send to analytics if configured
    if (this.config.analyticsCallback) {
      try {
        this.config.analyticsCallback(errorRecord);
      } catch (err) {
        console.error('Analytics callback failed:', err);
      }
    }

    return errorRecord;
  }

  /**
   * Normalize any error into an ErrorRecord
   */
  private normalizeError(error: unknown, context?: ErrorContext): ErrorRecord {
    // Already a PersonalLogError
    if (isPersonalLogError(error)) {
      return {
        ...error.toJSON(),
        context: { ...error.context, ...context },
      };
    }

    // Standard Error
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        category: this.inferCategory(error),
        severity: this.inferSeverity(error),
        recovery: 'recoverable',
        userMessage: this.inferUserMessage(error),
        technicalDetails: error.stack,
        context: context as Record<string, unknown>,
        timestamp: Date.now(),
        recoverable: true,
      };
    }

    // String or other primitive
    const message = String(error);
    return {
      name: 'UnknownError',
      message,
      category: 'unknown',
      severity: 'medium',
      recovery: 'recoverable',
      userMessage: 'An unexpected error occurred. Please try again.',
      context: context as Record<string, unknown>,
      timestamp: Date.now(),
      recoverable: true,
    };
  }

  /**
   * Infer error category from Error properties
   */
  private inferCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      name.includes('networkerror') ||
      name.includes('typeerror') && message.includes('failed to fetch')
    ) {
      return 'network';
    }

    // Storage errors
    if (
      message.includes('indexeddb') ||
      message.includes('storage') ||
      message.includes('quota') ||
      message.includes('database') ||
      name.includes('indexeddb')
    ) {
      if (message.includes('quota')) {
        return 'quota';
      }
      return 'system';
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('timed out')
    ) {
      return 'timeout';
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('denied') ||
      message.includes('unauthorized')
    ) {
      return 'permission';
    }

    // Validation errors
    if (
      message.includes('invalid') ||
      message.includes('validation') ||
      name.includes('validationerror')
    ) {
      return 'validation';
    }

    // Not found errors
    if (
      message.includes('not found') ||
      message.includes('does not exist') ||
      name.includes('notfounderror')
    ) {
      return 'not-found';
    }

    // WASM errors
    if (
      message.includes('wasm') ||
      message.includes('webassembly') ||
      message.includes('compile')
    ) {
      return 'wasm-fallback';
    }

    // Benchmark errors
    if (
      message.includes('benchmark') ||
      message.includes('performance')
    ) {
      return 'benchmark';
    }

    return 'unknown';
  }

  /**
   * Infer error severity
   */
  private inferSeverity(error: Error): ErrorRecord['severity'] {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Critical errors
    if (
      message.includes('critical') ||
      message.includes('fatal') ||
      name.includes('securityerror')
    ) {
      return 'critical';
    }

    // High severity
    if (
      message.includes('quota') ||
      message.includes('permission denied') ||
      message.includes('storage')
    ) {
      return 'high';
    }

    // Low severity
    if (
      message.includes('timeout') ||
      message.includes('deprecated') ||
      name.includes('warning')
    ) {
      return 'low';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Infer user-friendly message
   */
  private inferUserMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network request failed. Please check your connection.';
    }

    if (message.includes('quota') || message.includes('storage')) {
      return 'Storage is almost full. Consider clearing old data.';
    }

    if (message.includes('permission')) {
      return 'Permission required. Please check your browser settings.';
    }

    if (message.includes('timeout')) {
      return 'Operation took too long. Please try again.';
    }

    if (message.includes('not found')) {
      return 'The requested resource could not be found.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  // ==========================================================================
  // LOGGING
  // ==========================================================================

  /**
   * Log error to console with appropriate formatting
   */
  private logError(error: ErrorRecord): void {
    if (!this.config.logToConsole) return;

    const style = this.getConsoleStyle(error.severity);
    const emoji = this.getEmoji(error.category);

    // Main error message
    console.error(
      `%c${emoji} PersonalLog Error [${error.category.toUpperCase()}]`,
      style,
      error.userMessage
    );

    // Technical details (based on user level)
    if (this.config.userTechnicalLevel !== 'basic') {
      if (error.technicalDetails) {
        console.log('%cTechnical Details:', 'font-weight: bold; color: #666');
        console.log(error.technicalDetails);
      }
    }

    // Full details for advanced users
    if (this.config.userTechnicalLevel === 'advanced') {
      console.log('%cFull Error Details:', 'font-weight: bold; color: #666');
      console.log({
        name: error.name,
        message: error.message,
        category: error.category,
        severity: error.severity,
        recovery: error.recovery,
        context: error.context,
        timestamp: new Date(error.timestamp).toISOString(),
      });
    }

    // Stack trace if available
    if (error.stack) {
      console.group('%cStack Trace', 'font-weight: bold; color: #666');
      console.error(error.stack);
      console.groupEnd();
    }
  }

  /**
   * Get console styling based on severity
   */
  private getConsoleStyle(severity: ErrorRecord['severity']): string {
    const base = 'font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px;';

    switch (severity) {
      case 'critical':
        return `${base} background: #fee; color: #c00; border: 2px solid #c00;`;
      case 'high':
        return `${base} background: #fff3cd; color: #856404; border: 1px solid #ffc107;`;
      case 'medium':
        return `${base} background: #e3f2fd; color: #0d47a1; border: 1px solid #2196f3;`;
      case 'low':
        return `${base} background: #f3f4f6; color: #4b5563; border: 1px solid #9ca3af;`;
      case 'info':
        return `${base} background: #ecfdf5; color: #047857; border: 1px solid #10b981;`;
      default:
        return base;
    }
  }

  /**
   * Get emoji for error category
   */
  private getEmoji(category: ErrorCategory): string {
    const emojis: Record<ErrorCategory, string> = {
      system: '⚙️',
      benchmark: '⏱️',
      network: '🌐',
      quota: '💾',
      capability: '🔧',
      offline: '📡',
      'wasm-fallback': '⬇️',
      'hardware-incomplete': '🖥️',
      timeout: '⏰',
      validation: '✓',
      'not-found': '🔍',
      permission: '🔒',
      unknown: '⚠️',
    };
    return emojis[category] || '⚠️';
  }

  // ==========================================================================
  // ERROR HISTORY
  // ==========================================================================

  /**
   * Add error to history with deduplication
   */
  private addToHistory(error: ErrorRecord): void {
    const key = this.getErrorKey(error);
    const now = Date.now();

    const existing = this.errorHistory.get(key);
    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      existing.error = error;
    } else {
      this.errorHistory.set(key, {
        error,
        count: 1,
        firstSeen: now,
        lastSeen: now,
      });

      // Trim history if needed
      if (this.errorHistory.size > this.config.maxErrorHistory) {
        const oldest = Array.from(this.errorHistory.entries())
          .sort((a, b) => a[1].firstSeen - b[1].firstSeen)[0];
        if (oldest) {
          this.errorHistory.delete(oldest[0]);
        }
      }
    }
  }

  /**
   * Generate unique key for error deduplication
   */
  private getErrorKey(error: ErrorRecord): string {
    return `${error.name}:${error.category}:${error.message}`;
  }

  /**
   * Get error history
   */
  getHistory(filter?: {
    category?: ErrorCategory;
    severity?: ErrorRecord['severity'];
    since?: number;
  }): ErrorHistoryEntry[] {
    let entries = Array.from(this.errorHistory.values());

    if (filter?.category) {
      entries = entries.filter(e => e.error.category === filter.category);
    }

    if (filter?.severity) {
      entries = entries.filter(e => e.error.severity === filter.severity);
    }

    if (filter?.since) {
      entries = entries.filter(e => e.firstSeen >= filter.since!);
    }

    return entries.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory.clear();
  }

  // ==========================================================================
  // USER MESSAGING
  // ==========================================================================

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: unknown): string {
    if (isPersonalLogError(error)) {
      return error.userMessage;
    }

    const normalized = this.normalizeError(error);
    return normalized.userMessage;
  }

  /**
   * Get technical details (for advanced users)
   */
  getTechnicalDetails(error: unknown): string | undefined {
    if (isPersonalLogError(error)) {
      return error.technicalDetails;
    }

    if (error instanceof Error) {
      return error.stack || error.message;
    }

    return String(error);
  }

  // ==========================================================================
  // RECOVERY ACTIONS
  // ==========================================================================

  /**
   * Get recovery actions for an error
   */
  getRecoveryActions(error: unknown): RecoveryAction[] {
    if (!isPersonalLogError(error)) {
      const normalized = this.normalizeError(error);
      return this.getDefaultRecoveryActions(normalized);
    }

    // Get custom recovery actions
    const category = error.category;
    const customActions = this.recoveryCallbacks.get(category);
    let actions: RecoveryAction[] = [];

    if (customActions) {
      for (const callback of customActions) {
        try {
          actions = actions.concat(callback(error));
        } catch (err) {
          console.error('Recovery callback failed:', err);
        }
      }
    }

    // Add default actions if none provided
    if (actions.length === 0) {
      actions = this.getDefaultRecoveryActions(error.toJSON());
    }

    return actions;
  }

  /**
   * Get default recovery actions based on error category
   */
  private getDefaultRecoveryActions(error: ErrorRecord): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    // Add retry action for most errors
    if (error.recovery === 'recoverable') {
      actions.push({
        label: 'Try Again',
        action: () => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        },
        primary: true,
      });
    }

    // Category-specific actions
    switch (error.category) {
      case 'quota':
        actions.push({
          label: 'Clear Old Data',
          action: async () => {
            // This would open a dialog to clear old data
            console.log('Clear old data action triggered');
          },
        });
        break;

      case 'offline':
        actions.push({
          label: 'Go Offline',
          action: () => {
            // Enable offline mode
            console.log('Offline mode enabled');
          },
        });
        break;

      case 'permission':
        actions.push({
          label: 'Request Permission',
          action: async () => {
            // Request the permission
            console.log('Request permission action triggered');
          },
        });
        break;

      case 'capability':
        actions.push({
          label: 'Learn More',
          action: () => {
            // Open documentation
            if (typeof window !== 'undefined') {
              window.open('/docs/capabilities', '_blank');
            }
          },
        });
        break;

      case 'system':
      case 'benchmark':
        actions.push({
          label: 'Reload Page',
          action: () => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          },
          dangerous: true,
        });
        break;
    }

    // Add copy details action for technical users
    if (this.config.userTechnicalLevel === 'advanced') {
      actions.push({
        label: 'Copy Error Details',
        action: () => {
          if (typeof navigator !== 'undefined') {
            const details = JSON.stringify(error, null, 2);
            navigator.clipboard.writeText(details);
          }
        },
      });
    }

    return actions;
  }

  /**
   * Register custom recovery actions for an error category
   */
  registerRecoveryActions(
    category: ErrorCategory,
    callback: (error: PersonalLogError) => RecoveryAction[]
  ): () => void {
    if (!this.recoveryCallbacks.has(category)) {
      this.recoveryCallbacks.set(category, new Set());
    }

    this.recoveryCallbacks.get(category)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.recoveryCallbacks.get(category);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  // ==========================================================================
  // CALLBACKS
  // ==========================================================================

  /**
   * Register error callback
   */
  onError(callback: (error: ErrorRecord) => void): () => void {
    this.errorCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Notify all error callbacks
   */
  private notifyCallbacks(error: ErrorRecord): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (err) {
        console.error('Error callback failed:', err);
      }
    }
  }

  // ==========================================================================
  // GLOBAL ERROR HANDLERS
  // ==========================================================================

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Unhandled errors
    window.addEventListener('error', (event) => {
      event.preventDefault();
      this.handle(event.error || event.message, {
        component: event.filename,
        additional: { lineno: event.lineno, colno: event.colno },
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      this.handle(event.reason, {
        component: 'Promise',
      });
    });
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalHandler: ErrorHandler | null = null;

/**
 * Get global error handler instance
 */
export function getErrorHandler(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
  if (!globalHandler) {
    globalHandler = new ErrorHandler(config);
  }
  return globalHandler;
}

/**
 * Reset global handler (useful for testing)
 */
export function resetErrorHandler(): void {
  globalHandler = null;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Log an error
 */
export function log(error: unknown, context?: ErrorContext): ErrorRecord {
  return getErrorHandler().handle(error, context);
}

/**
 * Get user message for error
 */
export function getUserMessage(error: unknown): string {
  return getErrorHandler().getUserMessage(error);
}

/**
 * Get recovery actions for error
 */
export function getRecoveryActions(error: unknown): RecoveryAction[] {
  return getErrorHandler().getRecoveryActions(error);
}

/**
 * Get error history
 */
export function getErrorHistory(filter?: {
  category?: ErrorCategory;
  severity?: ErrorRecord['severity'];
  since?: number;
}): ErrorHistoryEntry[] {
  return getErrorHandler().getHistory(filter);
}

/**
 * Register error callback
 */
export function onError(callback: (error: ErrorRecord) => void): () => void {
  return getErrorHandler().onError(callback);
}

/**
 * Register recovery actions
 */
export function registerRecoveryActions(
  category: ErrorCategory,
  callback: (error: PersonalLogError) => RecoveryAction[]
): () => void {
  return getErrorHandler().registerRecoveryActions(category, callback);
}
