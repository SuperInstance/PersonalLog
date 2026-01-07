/**
 * Error Handler Tests
 *
 * Tests for error categorization, retry logic, and user notifications.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ErrorCategory,
  DAGTaskError,
  TransientError,
  PermanentError,
  UserActionError,
  categorizeError,
  calculateRetryDelay,
  createRetryState,
  updateRetryState,
  shouldRetry,
  aggregateErrors,
  formatErrorForUser,
  formatErrorReportForUser,
  analyzePartialSuccess,
  createErrorHandler,
  DEFAULT_RETRY_POLICY,
  AGGRESSIVE_RETRY_POLICY,
  CONSERVATIVE_RETRY_POLICY,
  type ErrorInfo,
  type ErrorReport,
  type RetryState,
  type DAGErrorHandler
} from '../error-handler';

describe('Error Categorization', () => {
  describe('categorizeError', () => {
    it('should categorize timeout errors as transient', () => {
      const error = new Error('Request timeout');
      const errorInfo = categorizeError(error, 'task-1');

      expect(errorInfo.category).toBe(ErrorCategory.TRANSIENT);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('timeout');
    });

    it('should categorize rate limit errors as transient', () => {
      const error = new Error('429 Too Many Requests');
      const errorInfo = categorizeError(error, 'task-2');

      expect(errorInfo.category).toBe(ErrorCategory.TRANSIENT);
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.suggestedAction).toBeDefined();
    });

    it('should categorize network errors as transient', () => {
      const error = new Error('ECONNRESET: Connection reset by peer');
      const errorInfo = categorizeError(error, 'task-3');

      expect(errorInfo.category).toBe(ErrorCategory.TRANSIENT);
      expect(errorInfo.retryable).toBe(true);
    });

    it('should categorize validation errors as permanent', () => {
      const error = new Error('Invalid input: malformed JSON');
      const errorInfo = categorizeError(error, 'task-4');

      expect(errorInfo.category).toBe(ErrorCategory.PERMANENT);
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.suggestedAction).toBeDefined();
    });

    it('should categorize not found errors as permanent', () => {
      const error = new Error('404 Not Found');
      const errorInfo = categorizeError(error, 'task-5');

      expect(errorInfo.category).toBe(ErrorCategory.PERMANENT);
      expect(errorInfo.retryable).toBe(false);
    });

    it('should categorize authentication errors as user action', () => {
      const error = new Error('401 Unauthorized: Invalid API key');
      const errorInfo = categorizeError(error, 'task-6');

      expect(errorInfo.category).toBe(ErrorCategory.USER);
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.suggestedAction).toBeDefined();
    });

    it('should categorize quota errors as user action', () => {
      const error = new Error('API quota exceeded');
      const errorInfo = categorizeError(error, 'task-7');

      expect(errorInfo.category).toBe(ErrorCategory.USER);
      expect(errorInfo.suggestedAction).toContain('quota');
    });

    it('should categorize unknown errors as unknown', () => {
      const error = new Error('Something weird happened');
      const errorInfo = categorizeError(error, 'task-8');

      expect(errorInfo.category).toBe(ErrorCategory.UNKNOWN);
      expect(errorInfo.retryable).toBe(false);
    });
  });
});

describe('Retry Logic', () => {
  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff with default policy', () => {
      const delay1 = calculateRetryDelay(0, DEFAULT_RETRY_POLICY);
      const delay2 = calculateRetryDelay(1, DEFAULT_RETRY_POLICY);
      const delay3 = calculateRetryDelay(2, DEFAULT_RETRY_POLICY);

      expect(delay1).toBe(DEFAULT_RETRY_POLICY.initialDelay);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should respect maximum delay limit', () => {
      const delay = calculateRetryDelay(100, DEFAULT_RETRY_POLICY);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_POLICY.maxDelay);
    });

    it('should add jitter when enabled', () => {
      const delay1 = calculateRetryDelay(1, DEFAULT_RETRY_POLICY);
      const delay2 = calculateRetryDelay(1, DEFAULT_RETRY_POLICY);

      // With jitter, delays should vary
      expect(delay1).not.toBe(delay2);
    });

    it('should not add jitter when disabled', () => {
      const policy = { ...DEFAULT_RETRY_POLICY, jitter: false };
      const delay1 = calculateRetryDelay(1, policy);
      const delay2 = calculateRetryDelay(1, policy);

      expect(delay1).toBe(delay2);
    });
  });

  describe('createRetryState', () => {
    it('should create initial retry state', () => {
      const state = createRetryState('task-1');

      expect(state.attempt).toBe(0);
      expect(state.canRetry).toBe(true);
      expect(state.errorHistory).toEqual([]);
    });
  });

  describe('updateRetryState', () => {
    it('should increment retry attempt', () => {
      const state = createRetryState('task-1');
      const errorInfo: ErrorInfo = {
        taskId: 'task-1',
        category: ErrorCategory.TRANSIENT,
        message: 'Timeout',
        userMessage: 'Request timeout',
        timestamp: Date.now(),
        attempt: 0,
        retryable: true
      };

      const updated = updateRetryState(state, errorInfo, DEFAULT_RETRY_POLICY);

      expect(updated.attempt).toBe(1);
      expect(updated.errorHistory).toHaveLength(1);
    });

    it('should set canRetry to false when max retries reached', () => {
      const state = createRetryState('task-1', {
        ...DEFAULT_RETRY_POLICY,
        maxRetries: 2
      });
      const errorInfo: ErrorInfo = {
        taskId: 'task-1',
        category: ErrorCategory.TRANSIENT,
        message: 'Timeout',
        userMessage: 'Request timeout',
        timestamp: Date.now(),
        attempt: 1,
        retryable: true
      };

      const updated = updateRetryState(state, errorInfo, DEFAULT_RETRY_POLICY);

      expect(updated.attempt).toBe(2);
      expect(updated.canRetry).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable errors under limit', () => {
      const state = createRetryState('task-1');
      const errorInfo: ErrorInfo = {
        taskId: 'task-1',
        category: ErrorCategory.TRANSIENT,
        message: 'Timeout',
        userMessage: 'Request timeout',
        timestamp: Date.now(),
        attempt: 0,
        retryable: true
      };

      expect(shouldRetry(errorInfo, state, DEFAULT_RETRY_POLICY)).toBe(true);
    });

    it('should return false for permanent errors', () => {
      const state = createRetryState('task-1');
      const errorInfo: ErrorInfo = {
        taskId: 'task-1',
        category: ErrorCategory.PERMANENT,
        message: 'Invalid input',
        userMessage: 'Invalid input',
        timestamp: Date.now(),
        attempt: 0,
        retryable: false
      };

      expect(shouldRetry(errorInfo, state, DEFAULT_RETRY_POLICY)).toBe(false);
    });

    it('should return false when max retries reached', () => {
      const state: RetryState = {
        attempt: 3,
        nextDelay: 1000,
        canRetry: true,
        errorHistory: []
      };
      const errorInfo: ErrorInfo = {
        taskId: 'task-1',
        category: ErrorCategory.TRANSIENT,
        message: 'Timeout',
        userMessage: 'Request timeout',
        timestamp: Date.now(),
        attempt: 3,
        retryable: true
      };

      expect(shouldRetry(errorInfo, state, DEFAULT_RETRY_POLICY)).toBe(false);
    });
  });
});

describe('Error Aggregation', () => {
  describe('aggregateErrors', () => {
    it('should aggregate empty errors', () => {
      const report = aggregateErrors([]);

      expect(report.totalErrors).toBe(0);
      expect(report.summary).toBe('All tasks completed successfully.');
    });

    it('should categorize errors by type', () => {
      const errors: ErrorInfo[] = [
        {
          taskId: 'task-1',
          category: ErrorCategory.TRANSIENT,
          message: 'Timeout',
          userMessage: 'Request timeout',
          timestamp: Date.now(),
          attempt: 1,
          retryable: true
        },
        {
          taskId: 'task-2',
          category: ErrorCategory.PERMANENT,
          message: 'Invalid input',
          userMessage: 'Invalid input',
          timestamp: Date.now(),
          attempt: 0,
          retryable: false
        },
        {
          taskId: 'task-3',
          category: ErrorCategory.TRANSIENT,
          message: 'Rate limit',
          userMessage: 'Rate limit',
          timestamp: Date.now(),
          attempt: 1,
          retryable: true
        }
      ];

      const report = aggregateErrors(errors);

      expect(report.totalErrors).toBe(3);
      expect(report.errorsByCategory[ErrorCategory.TRANSIENT]).toBe(2);
      expect(report.errorsByCategory[ErrorCategory.PERMANENT]).toBe(1);
      expect(report.retryableErrors).toBe(2);
      expect(report.permanentErrors).toBe(1);
    });

    it('should generate summary with all error types', () => {
      const errors: ErrorInfo[] = [
        {
          taskId: 'task-1',
          category: ErrorCategory.TRANSIENT,
          message: 'Timeout',
          userMessage: 'Request timeout',
          timestamp: Date.now(),
          attempt: 1,
          retryable: true
        },
        {
          taskId: 'task-2',
          category: ErrorCategory.PERMANENT,
          message: 'Invalid input',
          userMessage: 'Invalid input',
          timestamp: Date.now(),
          attempt: 0,
          retryable: false
        },
        {
          taskId: 'task-3',
          category: ErrorCategory.USER,
          message: 'Auth failed',
          userMessage: 'Authentication failed',
          suggestedAction: 'Check credentials',
          timestamp: Date.now(),
          attempt: 0,
          retryable: false
        }
      ];

      const report = aggregateErrors(errors);

      expect(report.summary).toContain('3 tasks failed');
      expect(report.summary).toContain('transient');
      expect(report.summary).toContain('permanent');
      expect(report.summary).toContain('action');
    });
  });
});

describe('User Notifications', () => {
  describe('formatErrorForUser', () => {
    it('should format error with suggested action', () => {
      const errorInfo: ErrorInfo = {
        taskId: 'task-1',
        category: ErrorCategory.USER,
        message: 'Authentication failed',
        userMessage: 'Please check your credentials',
        suggestedAction: 'Update your API key',
        timestamp: Date.now(),
        attempt: 0,
        retryable: false
      };

      const formatted = formatErrorForUser(errorInfo);

      expect(formatted).toContain('task-1');
      expect(formatted).toContain('Please check your credentials');
      expect(formatted).toContain('Update your API key');
    });

    it('should format error without suggested action', () => {
      const errorInfo: ErrorInfo = {
        taskId: 'task-2',
        category: ErrorCategory.TRANSIENT,
        message: 'Timeout',
        userMessage: 'Request timeout',
        timestamp: Date.now(),
        attempt: 1,
        retryable: true
      };

      const formatted = formatErrorForUser(errorInfo);

      expect(formatted).toContain('task-2');
      expect(formatted).toContain('Request timeout');
      expect(formatted).not.toContain('Suggested action');
    });
  });

  describe('formatErrorReportForUser', () => {
    it('should format report with user action errors', () => {
      const report: ErrorReport = {
        totalErrors: 2,
        errorsByCategory: {
          [ErrorCategory.TRANSIENT]: 1,
          [ErrorCategory.PERMANENT]: 0,
          [ErrorCategory.USER]: 1,
          [ErrorCategory.UNKNOWN]: 0
        },
        errors: [
          {
            taskId: 'task-1',
            category: ErrorCategory.TRANSIENT,
            message: 'Timeout',
            userMessage: 'Request timeout',
            timestamp: Date.now(),
            attempt: 1,
            retryable: true
          },
          {
            taskId: 'task-2',
            category: ErrorCategory.USER,
            message: 'Auth failed',
            userMessage: 'Authentication failed',
            suggestedAction: 'Update API key',
            timestamp: Date.now(),
            attempt: 0,
            retryable: false
          }
        ],
        retryableErrors: 1,
        permanentErrors: 0,
        userActionErrors: 1,
        summary: '2 tasks failed (1 transient, 1 require action)'
      };

      const formatted = formatErrorReportForUser(report);

      expect(formatted).toContain('2 tasks failed');
      expect(formatted).toContain('require your attention');
      expect(formatted).toContain('Update API key');
      expect(formatted).toContain('will be retried');
    });

    it('should format report with permanent errors', () => {
      const report: ErrorReport = {
        totalErrors: 2,
        errorsByCategory: {
          [ErrorCategory.TRANSIENT]: 0,
          [ErrorCategory.PERMANENT]: 2,
          [ErrorCategory.USER]: 0,
          [ErrorCategory.UNKNOWN]: 0
        },
        errors: [],
        retryableErrors: 0,
        permanentErrors: 2,
        userActionErrors: 0,
        summary: '2 tasks failed (2 permanent)'
      };

      const formatted = formatErrorReportForUser(report);

      expect(formatted).toContain('could not be completed');
      expect(formatted).toContain('2');
    });
  });
});

describe('Partial Success Analysis', () => {
  describe('analyzePartialSuccess', () => {
    it('should detect complete success', () => {
      const errorReport: ErrorReport = {
        totalErrors: 0,
        errorsByCategory: {
          [ErrorCategory.TRANSIENT]: 0,
          [ErrorCategory.PERMANENT]: 0,
          [ErrorCategory.USER]: 0,
          [ErrorCategory.UNKNOWN]: 0
        },
        errors: [],
        retryableErrors: 0,
        permanentErrors: 0,
        userActionErrors: 0,
        summary: 'All tasks completed successfully.'
      };

      const result = analyzePartialSuccess(10, 10, errorReport);

      expect(result.hasFailures).toBe(false);
      expect(result.successCount).toBe(10);
      expect(result.failureCount).toBe(0);
      expect(result.successRate).toBe(1);
      expect(result.isAcceptable).toBe(true);
    });

    it('should detect acceptable partial success', () => {
      const errorReport: ErrorReport = {
        totalErrors: 1,
        errorsByCategory: {
          [ErrorCategory.TRANSIENT]: 0,
          [ErrorCategory.PERMANENT]: 1,
          [ErrorCategory.USER]: 0,
          [ErrorCategory.UNKNOWN]: 0
        },
        errors: [],
        retryableErrors: 0,
        permanentErrors: 1,
        userActionErrors: 0,
        summary: '1 tasks failed (1 permanent)'
      };

      const result = analyzePartialSuccess(10, 9, errorReport, 0.8);

      expect(result.hasFailures).toBe(true);
      expect(result.successCount).toBe(9);
      expect(result.failureCount).toBe(1);
      expect(result.successRate).toBe(0.9);
      expect(result.isAcceptable).toBe(true);
    });

    it('should detect unacceptable partial success', () => {
      const errorReport: ErrorReport = {
        totalErrors: 5,
        errorsByCategory: {
          [ErrorCategory.TRANSIENT]: 0,
          [ErrorCategory.PERMANENT]: 5,
          [ErrorCategory.USER]: 0,
          [ErrorCategory.UNKNOWN]: 0
        },
        errors: [],
        retryableErrors: 0,
        permanentErrors: 5,
        userActionErrors: 0,
        summary: '5 tasks failed (5 permanent)'
      };

      const result = analyzePartialSuccess(10, 5, errorReport, 0.8);

      expect(result.hasFailures).toBe(true);
      expect(result.successCount).toBe(5);
      expect(result.failureCount).toBe(5);
      expect(result.successRate).toBe(0.5);
      expect(result.isAcceptable).toBe(false);
    });
  });
});

describe('Error Handler Class', () => {
  describe('DAGErrorHandler', () => {
    let handler: DAGErrorHandler;

    beforeEach(() => {
      handler = createErrorHandler({ logErrors: false });
    });

    it('should handle errors and categorize them', () => {
      const error = new Error('Request timeout');
      const errorInfo = handler.handleError(error, 'task-1');

      expect(errorInfo.taskId).toBe('task-1');
      expect(errorInfo.category).toBe(ErrorCategory.TRANSIENT);
    });

    it('should track retry state per task', () => {
      const state1 = handler.getRetryState('task-1');
      const state2 = handler.getRetryState('task-2');

      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
      expect(state1).not.toBe(state2);
    });

    it('should handle task failure with retry', async () => {
      const error = new Error('Request timeout');
      const decision = await handler.handleTaskFailure(error, 'task-1');

      expect(decision.shouldRetry).toBe(true);
      expect(decision.delay).toBeDefined();
      expect(decision.delay).toBeGreaterThan(0);
    });

    it('should not retry permanent errors', async () => {
      const error = new Error('Invalid input');
      const decision = await handler.handleTaskFailure(error, 'task-2');

      expect(decision.shouldRetry).toBe(false);
    });

    it('should track error history', async () => {
      const error = new Error('Request timeout');
      await handler.handleTaskFailure(error, 'task-1');

      const state = handler.getTaskRetryState('task-1');
      expect(state?.errorHistory).toHaveLength(1);
    });

    it('should generate error report', () => {
      handler.handleError(new Error('Timeout'), 'task-1');
      handler.handleError(new Error('Invalid input'), 'task-2');

      const report = handler.getErrorReport();

      expect(report.totalErrors).toBe(2);
      expect(report.errors).toHaveLength(2);
    });

    it('should clear state', () => {
      handler.handleError(new Error('Timeout'), 'task-1');
      handler.clear();

      const report = handler.getErrorReport();
      expect(report.totalErrors).toBe(0);
    });
  });
});
