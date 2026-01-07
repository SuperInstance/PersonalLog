/**
 * DAG Error Handler
 *
 * Comprehensive error handling, categorization, and retry strategies
 * for failed DAG tasks with graceful degradation and user notifications.
 */

// ============================================================================
// ERROR CATEGORIES
// ============================================================================

/**
 * Categories of errors that determine retry behavior.
 */
export enum ErrorCategory {
  /** Transient errors: Network timeouts, API rate limits, temporary failures */
  TRANSIENT = 'transient',
  /** Permanent errors: Invalid input, authentication failures, missing resources */
  PERMANENT = 'permanent',
  /** User action required: Authorization needed, quota exceeded, configuration needed */
  USER = 'user',
  /** Unknown errors: Unexpected errors that should be logged and skipped */
  UNKNOWN = 'unknown'
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Base error class for DAG task errors.
 */
export class DAGTaskError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public taskId: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DAGTaskError';
  }
}

/**
 * Transient error that should be retried.
 */
export class TransientError extends DAGTaskError {
  constructor(
    message: string,
    taskId: string,
    originalError?: Error
  ) {
    super(message, ErrorCategory.TRANSIENT, taskId, originalError);
    this.name = 'TransientError';
  }
}

/**
 * Permanent error that should not be retried.
 */
export class PermanentError extends DAGTaskError {
  constructor(
    message: string,
    taskId: string,
    originalError?: Error
  ) {
    super(message, ErrorCategory.PERMANENT, taskId, originalError);
    this.name = 'PermanentError';
  }
}

/**
 * Error requiring user action.
 */
export class UserActionError extends DAGTaskError {
  constructor(
    message: string,
    taskId: string,
    public suggestedAction: string,
    originalError?: Error
  ) {
    super(message, ErrorCategory.USER, taskId, originalError);
    this.name = 'UserActionError';
  }
}

// ============================================================================
// ERROR INFORMATION
// ============================================================================

/**
 * Detailed information about a task error.
 */
export interface ErrorInfo {
  /** Task ID that failed */
  taskId: string;
  /** Error category */
  category: ErrorCategory;
  /** Error message */
  message: string;
  /** User-friendly error description */
  userMessage: string;
  /** Suggested action for user (if applicable) */
  suggestedAction?: string;
  /** Original error */
  originalError?: Error;
  /** Timestamp of error */
  timestamp: number;
  /** Retry attempt number */
  attempt: number;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Context information */
  context?: Record<string, unknown>;
}

/**
 * Aggregated error report for multiple task failures.
 */
export interface ErrorReport {
  /** Total errors */
  totalErrors: number;
  /** Errors by category */
  errorsByCategory: Record<ErrorCategory, number>;
  /** Individual error details */
  errors: ErrorInfo[];
  /** Retryable errors */
  retryableErrors: number;
  /** Permanent errors */
  permanentErrors: number;
  /** User action errors */
  userActionErrors: number;
  /** Generated summary message */
  summary: string;
}

// ============================================================================
// RETRY POLICY
// ============================================================================

/**
 * Retry policy configuration.
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial retry delay in milliseconds */
  initialDelay: number;
  /** Maximum retry delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Whether to add jitter to retry delays */
  jitter: boolean;
  /** Jitter amount (0-1, as percentage of delay) */
  jitterAmount: number;
}

/**
 * Default retry policy.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  jitterAmount: 0.1 // 10% jitter
};

/**
 * Aggressive retry policy for transient errors.
 */
export const AGGRESSIVE_RETRY_POLICY: RetryPolicy = {
  maxRetries: 5,
  initialDelay: 500,
  maxDelay: 60000,
  backoffMultiplier: 1.5,
  jitter: true,
  jitterAmount: 0.2
};

/**
 * Conservative retry policy for critical tasks.
 */
export const CONSERVATIVE_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  initialDelay: 2000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: false,
  jitterAmount: 0
};

// ============================================================================
// RETRY STATE
// ============================================================================

/**
 * Retry state for a task.
 */
export interface RetryState {
  /** Current retry attempt */
  attempt: number;
  /** Next retry delay in milliseconds */
  nextDelay: number;
  /** Whether task can be retried */
  canRetry: boolean;
  /** Error history */
  errorHistory: ErrorInfo[];
}

// ============================================================================
// ERROR CATEGORIZATION
// ============================================================================

/**
 * Error patterns for categorization.
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  category: ErrorCategory;
  userMessage: string;
  suggestedAction?: string;
}> = [
  // Transient errors
  {
    pattern: /timeout|timed out|etimed|network|connection/i,
    category: ErrorCategory.TRANSIENT,
    userMessage: 'Network timeout occurred. The system will retry automatically.'
  },
  {
    pattern: /rate limit|too many requests|429/i,
    category: ErrorCategory.TRANSIENT,
    userMessage: 'API rate limit exceeded. Waiting before retry.',
    suggestedAction: 'Consider upgrading your API plan or reducing concurrent requests.'
  },
  {
    pattern: /temporary|temporarily unavailable|503|502/i,
    category: ErrorCategory.TRANSIENT,
    userMessage: 'Service temporarily unavailable. Retrying automatically.'
  },
  {
    pattern: /ECONNRESET|EPIPE|socket/i,
    category: ErrorCategory.TRANSIENT,
    userMessage: 'Connection interrupted. Reconnecting...'
  },

  // Permanent errors
  {
    pattern: /invalid input|malformed|validation|syntax/i,
    category: ErrorCategory.PERMANENT,
    userMessage: 'Invalid input or configuration. Please check your task definition.',
    suggestedAction: 'Review the task parameters and try again with corrected input.'
  },
  {
    pattern: /not found|404|does not exist/i,
    category: ErrorCategory.PERMANENT,
    userMessage: 'Required resource not found.',
    suggestedAction: 'Verify that all required resources and dependencies exist.'
  },
  {
    pattern: /permission denied|access denied|403|unauthorized/i,
    category: ErrorCategory.PERMANENT,
    userMessage: 'Permission denied. Access to resource was refused.',
    suggestedAction: 'Check your permissions and API credentials.'
  },

  // User action errors
  {
    pattern: /authentication|auth failed|401|unauthorized/i,
    category: ErrorCategory.USER,
    userMessage: 'Authentication failed. Please check your credentials.',
    suggestedAction: 'Update your API credentials or authentication tokens.'
  },
  {
    pattern: /quota|limit exceeded|insufficient/i,
    category: ErrorCategory.USER,
    userMessage: 'Resource quota or limit exceeded.',
    suggestedAction: 'Upgrade your plan or wait for quota to reset.'
  },
  {
    pattern: /configuration|config missing/i,
    category: ErrorCategory.USER,
    userMessage: 'Required configuration is missing.',
    suggestedAction: 'Complete the required configuration settings.'
  }
];

/**
 * Categorizes an error based on its message and type.
 */
export function categorizeError(
  error: Error,
  taskId: string
): ErrorInfo {
  const errorMessage = error.message.toLowerCase();
  const errorStack = error.stack?.toLowerCase() || '';

  let category = ErrorCategory.UNKNOWN;
  let userMessage = 'An unexpected error occurred.';
  let suggestedAction: string | undefined;
  let retryable = false;

  // Try to match error patterns
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(errorMessage) || pattern.pattern.test(errorStack)) {
      category = pattern.category;
      userMessage = pattern.userMessage;
      suggestedAction = pattern.suggestedAction;
      retryable = category === ErrorCategory.TRANSIENT;
      break;
    }
  }

  // Determine retryability based on category
  retryable = category === ErrorCategory.TRANSIENT;

  return {
    taskId,
    category,
    message: error.message,
    userMessage,
    suggestedAction,
    originalError: error,
    timestamp: Date.now(),
    attempt: 0,
    retryable,
    context: {}
  };
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Calculates the next retry delay using exponential backoff with jitter.
 */
export function calculateRetryDelay(
  attempt: number,
  policy: RetryPolicy
): number {
  // Calculate exponential backoff delay
  const delay = Math.min(
    policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt),
    policy.maxDelay
  );

  // Add jitter if enabled
  if (policy.jitter) {
    const jitterRange = delay * policy.jitterAmount;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, Math.floor(delay + jitter));
  }

  return Math.floor(delay);
}

/**
 * Creates retry state for a task.
 */
export function createRetryState(
  taskId: string,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): RetryState {
  return {
    attempt: 0,
    nextDelay: policy.initialDelay,
    canRetry: true,
    errorHistory: []
  };
}

/**
 * Updates retry state after an error.
 */
export function updateRetryState(
  state: RetryState,
  errorInfo: ErrorInfo,
  policy: RetryPolicy
): RetryState {
  const newAttempt = state.attempt + 1;
  const canRetry = errorInfo.retryable && newAttempt < policy.maxRetries;

  return {
    ...state,
    attempt: newAttempt,
    nextDelay: calculateRetryDelay(newAttempt, policy),
    canRetry,
    errorHistory: [...state.errorHistory, errorInfo]
  };
}

/**
 * Checks if a task should be retried based on error and policy.
 */
export function shouldRetry(
  errorInfo: ErrorInfo,
  state: RetryState,
  policy: RetryPolicy
): boolean {
  return errorInfo.retryable && state.attempt < policy.maxRetries;
}

/**
 * Waits for the specified delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// ERROR AGGREGATION
// ============================================================================

/**
 * Aggregates multiple errors into a report.
 */
export function aggregateErrors(errors: ErrorInfo[]): ErrorReport {
  const errorsByCategory: Record<ErrorCategory, number> = {
    [ErrorCategory.TRANSIENT]: 0,
    [ErrorCategory.PERMANENT]: 0,
    [ErrorCategory.USER]: 0,
    [ErrorCategory.UNKNOWN]: 0
  };

  for (const error of errors) {
    errorsByCategory[error.category]++;
  }

  const retryableErrors = errors.filter(e => e.retryable).length;
  const permanentErrors = errorsByCategory[ErrorCategory.PERMANENT];
  const userActionErrors = errorsByCategory[ErrorCategory.USER];

  const summary = generateErrorSummary(errors, errorsByCategory);

  return {
    totalErrors: errors.length,
    errorsByCategory,
    errors,
    retryableErrors,
    permanentErrors,
    userActionErrors,
    summary
  };
}

/**
 * Generates a human-readable error summary.
 */
function generateErrorSummary(
  errors: ErrorInfo[],
  errorsByCategory: Record<ErrorCategory, number>
): string {
  const total = errors.length;
  const transient = errorsByCategory[ErrorCategory.TRANSIENT];
  const permanent = errorsByCategory[ErrorCategory.PERMANENT];
  const user = errorsByCategory[ErrorCategory.USER];
  const unknown = errorsByCategory[ErrorCategory.UNKNOWN];

  if (total === 0) {
    return 'All tasks completed successfully.';
  }

  let summary = `${total} task${total !== 1 ? 's' : ''} failed`;

  if (transient > 0) {
    summary += ` (${transient} transient)`;
  }
  if (permanent > 0) {
    summary += ` (${permanent} permanent)`;
  }
  if (user > 0) {
    summary += ` (${user} require action)`;
  }
  if (unknown > 0) {
    summary += ` (${unknown} unknown)`;
  }

  return summary;
}

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

/**
 * Configuration for the error handler.
 */
export interface ErrorHandlerConfig {
  /** Retry policy */
  retryPolicy: RetryPolicy;
  /** Whether to log errors to console */
  logErrors: boolean;
  /** Whether to collect detailed error context */
  collectContext: boolean;
  /** Callback for error notifications */
  onError?: (error: ErrorInfo) => void;
  /** Callback for retry attempts */
  onRetry?: (taskId: string, attempt: number, delay: number) => void;
}

/**
 * Default error handler configuration.
 */
export const DEFAULT_ERROR_HANDLER_CONFIG: ErrorHandlerConfig = {
  retryPolicy: DEFAULT_RETRY_POLICY,
  logErrors: true,
  collectContext: true
};

/**
 * Comprehensive error handler for DAG tasks.
 */
export class DAGErrorHandler {
  private config: ErrorHandlerConfig;
  private retryStates: Map<string, RetryState> = new Map();
  private errorLog: ErrorInfo[] = [];

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      ...DEFAULT_ERROR_HANDLER_CONFIG,
      ...config,
      retryPolicy: {
        ...DEFAULT_ERROR_HANDLER_CONFIG.retryPolicy,
        ...config.retryPolicy
      }
    };
  }

  /**
   * Handles an error for a task.
   */
  handleError(error: Error, taskId: string): ErrorInfo {
    // Categorize error
    const errorInfo = categorizeError(error, taskId);

    // Add context if enabled
    if (this.config.collectContext) {
      errorInfo.context = this.collectErrorContext(error, taskId);
    }

    // Log error if enabled
    if (this.config.logErrors) {
      this.logError(errorInfo);
    }

    // Notify error callback
    if (this.config.onError) {
      this.config.onError(errorInfo);
    }

    // Store error
    this.errorLog.push(errorInfo);

    return errorInfo;
  }

  /**
   * Gets or creates retry state for a task.
   */
  getRetryState(taskId: string): RetryState {
    if (!this.retryStates.has(taskId)) {
      this.retryStates.set(taskId, createRetryState(taskId, this.config.retryPolicy));
    }
    return this.retryStates.get(taskId)!;
  }

  /**
   * Handles a task failure and determines if it should be retried.
   */
  async handleTaskFailure(
    error: Error,
    taskId: string
  ): Promise<{ shouldRetry: boolean; delay?: number }> {
    // Handle error
    const errorInfo = this.handleError(error, taskId);

    // Get retry state
    const state = this.getRetryState(taskId);

    // Update retry state
    const updatedState = updateRetryState(
      state,
      errorInfo,
      this.config.retryPolicy
    );
    this.retryStates.set(taskId, updatedState);

    // Check if should retry
    const shouldRetryFlag = shouldRetry(errorInfo, updatedState, this.config.retryPolicy);

    if (shouldRetryFlag) {
      // Notify retry callback
      if (this.config.onRetry) {
        this.config.onRetry(taskId, updatedState.attempt, updatedState.nextDelay);
      }

      // Wait before retry
      await sleep(updatedState.nextDelay);

      return { shouldRetry: true, delay: updatedState.nextDelay };
    }

    return { shouldRetry: false };
  }

  /**
   * Collects context information for an error.
   */
  private collectErrorContext(error: Error, taskId: string): Record<string, unknown> {
    return {
      taskId,
      errorName: error.name,
      errorMessage: error.message,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
  }

  /**
   * Logs an error to console.
   */
  private logError(errorInfo: ErrorInfo): void {
    const prefix = `[DAG Error Handler] Task ${errorInfo.taskId}`;
    console.error(prefix, errorInfo.userMessage);
    console.error('Category:', errorInfo.category);
    console.error('Message:', errorInfo.message);
    if (errorInfo.suggestedAction) {
      console.warn('Suggested action:', errorInfo.suggestedAction);
    }
    if (errorInfo.originalError) {
      console.error('Original error:', errorInfo.originalError);
    }
  }

  /**
   * Gets all logged errors.
   */
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * Gets an error report for all logged errors.
   */
  getErrorReport(): ErrorReport {
    return aggregateErrors(this.errorLog);
  }

  /**
   * Clears all error logs and retry states.
   */
  clear(): void {
    this.errorLog = [];
    this.retryStates.clear();
  }

  /**
   * Gets retry state for a task.
   */
  getTaskRetryState(taskId: string): RetryState | undefined {
    return this.retryStates.get(taskId);
  }
}

// ============================================================================
// ERROR HANDLER FACTORY
// ============================================================================

/**
 * Creates an error handler with the specified configuration.
 */
export function createErrorHandler(
  config?: Partial<ErrorHandlerConfig>
): DAGErrorHandler {
  return new DAGErrorHandler(config);
}

// ============================================================================
// USER NOTIFICATION HELPERS
// ============================================================================

/**
 * Formats error information for user display.
 */
export function formatErrorForUser(errorInfo: ErrorInfo): string {
  let message = `Task "${errorInfo.taskId}" failed: ${errorInfo.userMessage}`;

  if (errorInfo.suggestedAction) {
    message += `\n\nSuggested action: ${errorInfo.suggestedAction}`;
  }

  return message;
}

/**
 * Formats error report for user display.
 */
export function formatErrorReportForUser(report: ErrorReport): string {
  let message = report.summary;

  if (report.userActionErrors > 0) {
    message += '\n\n⚠️ Some tasks require your attention:';
    for (const error of report.errors) {
      if (error.category === ErrorCategory.USER && error.suggestedAction) {
        message += `\n\n• ${formatErrorForUser(error)}`;
      }
    }
  }

  if (report.permanentErrors > 0) {
    message += `\n\n❌ ${report.permanentErrors} task(s) could not be completed due to permanent errors.`;
  }

  if (report.retryableErrors > 0) {
    message += `\n\n🔄 ${report.retryableErrors} task(s) will be retried automatically.`;
  }

  return message;
}

// ============================================================================
// PARTIAL SUCCESS HANDLING
// ============================================================================

/**
 * Result of a DAG execution with partial success.
 */
export interface PartialSuccessResult {
  /** Whether execution had any failures */
  hasFailures: boolean;
  /** Number of successful tasks */
  successCount: number;
  /** Number of failed tasks */
  failureCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Whether result is acceptable despite failures */
  isAcceptable: boolean;
  /** Error report */
  errorReport: ErrorReport;
}

/**
 * Analyzes partial success and determines if result is acceptable.
 */
export function analyzePartialSuccess(
  totalTasks: number,
  successfulTasks: number,
  errorReport: ErrorReport,
  minimumSuccessRate: number = 0.8
): PartialSuccessResult {
  const failureCount = totalTasks - successfulTasks;
  const successRate = totalTasks > 0 ? successfulTasks / totalTasks : 0;
  const hasFailures = failureCount > 0;
  const isAcceptable = successRate >= minimumSuccessRate;

  return {
    hasFailures,
    successCount: successfulTasks,
    failureCount,
    successRate,
    isAcceptable,
    errorReport
  };
}
