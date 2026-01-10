/**
 * Retry Manager
 *
 * Handles automatic retry with fallback strategies for failed function calls.
 *
 * @module retry
 */

import { RetryConfig, ExecutionResult, ExecutionStatus } from '../types.js';

/**
 * Default retry configuration
 *
 * Provides sensible defaults for retry behavior:
 * - Up to 3 attempts before giving up
 * - Exponential backoff starting at 100ms
 * - Maximum delay capped at 5 seconds
 * - Doubling delay between retries
 * - Specific network errors are retryable
 * - Jitter disabled by default for predictable testing (enable in production)
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'NetworkError'],
  jitter: false  // Disabled by default for predictability; enable in production for thundering herd prevention
};

/**
 * Retry manager for handling function execution retries
 */
export class RetryManager {
  private config: Required<RetryConfig>;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T> | T,
    context?: { toolName?: string; params?: Record<string, any> }
  ): Promise<ExecutionResult<T>> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      attempt++;
      const startTime = Date.now();

      try {
        const result = await fn();
        return {
          status: ExecutionStatus.SUCCESS,
          result,
          retryCount: attempt - 1,
          executionTime: Date.now() - startTime,
          functionName: context?.toolName
        };
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(lastError, attempt)) {
          return {
            status: ExecutionStatus.FAILED,
            error: lastError,
            retryCount: attempt - 1,
            executionTime: Date.now() - startTime,
            functionName: context?.toolName
          };
        }

        // Don't wait after last attempt
        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    return {
      status: ExecutionStatus.FAILED,
      error: lastError,
      retryCount: this.config.maxAttempts - 1,
      functionName: context?.toolName
    };
  }

  /**
   * Check if an error is retryable based on error type and attempt count
   *
   * An error is retryable if:
   * 1. The attempt number hasn't exceeded maxAttempts
   * 2. The error matches a retryable error pattern
   * 3. If no retryableErrors list is specified, all errors are retryable
   *
   * @param error - The error that occurred
   * @param attempt - The current attempt number (1-indexed)
   * @returns True if the error should be retried
   */
  private isRetryable(error: Error, attempt: number): boolean {
    // If we've exceeded max attempts, don't retry
    // Note: attempt is 1-indexed, so if maxAttempts is 3 and attempt is 4, we should stop
    if (attempt > this.config.maxAttempts) {
      return false;
    }

    // If no retryable errors specified, treat all errors as retryable
    if (!this.config.retryableErrors || this.config.retryableErrors.length === 0) {
      return true;
    }

    // Check if error message contains retryable error codes
    for (const code of this.config.retryableErrors) {
      if (error.message.includes(code) || (error as any).code === code) {
        return true;
      }
    }

    // Check if error is a network error (matches specific patterns)
    if (error.name === 'NetworkError' || error.name === 'TypeError') {
      return error.message.includes('fetch') || error.message.includes('network');
    }

    return false;
  }

  /**
   * Calculate delay before next retry with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const baseDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(baseDelay, this.config.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      return cappedDelay * (0.5 + Math.random() * 0.5);
    }

    return cappedDelay;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  updateConfig(updates: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<RetryConfig>> {
    return { ...this.config };
  }
}
