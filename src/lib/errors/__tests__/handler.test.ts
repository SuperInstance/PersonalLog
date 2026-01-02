/**
 * Unit Tests: Error Handler
 *
 * Tests the central error handling system including:
 * - Error normalization for all error types
 * - Error categorization and severity inference
 * - Recovery action generation
 * - Error history management
 * - Callback system
 *
 * @coverage Target: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorHandler,
  getErrorHandler,
  resetErrorHandler,
  log,
  getUserMessage,
  getRecoveryActions,
  getErrorHistory,
  onError,
  registerRecoveryActions,
} from '../handler';
import type {
  ErrorCategory,
  ErrorRecord,
} from '../types';
import {
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
  isPersonalLogError,
} from '../types';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    // Reset global handler before each test
    resetErrorHandler();
    handler = new ErrorHandler({
      enableLogging: false, // Disable console logging in tests
      logToConsole: false,
      enableUserNotifications: false,
    });
  });

  afterEach(() => {
    resetErrorHandler();
  });

  // ==========================================================================
  // HANDLE() METHOD TESTS
  // ==========================================================================

  describe('handle()', () => {
    it('should handle PersonalLogError instances', () => {
      const error = new WasmError('WASM failed to compile');
      const record = handler.handle(error);

      expect(record.name).toBe('WasmError');
      expect(record.message).toBe('WASM failed to compile');
      expect(record.category).toBe('system');
      expect(record.severity).toBe('high');
      expect(record.userMessage).toBeDefined();
      expect(record.timestamp).toBeGreaterThan(0);
      expect(record.recoverable).toBe(true);
    });

    it('should handle standard Error instances', () => {
      const error = new Error('Standard error occurred');
      const record = handler.handle(error);

      expect(record.name).toBe('Error');
      expect(record.message).toBe('Standard error occurred');
      expect(record.category).toBe('unknown');
      expect(record.severity).toBe('medium');
      expect(record.userMessage).toBeDefined();
      expect(record.timestamp).toBeGreaterThan(0);
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      const record = handler.handle(error);

      expect(record.name).toBe('UnknownError');
      expect(record.message).toBe('String error message');
      expect(record.category).toBe('unknown');
    });

    it('should handle unknown primitives', () => {
      const error = 12345;
      const record = handler.handle(error);

      expect(record.name).toBe('UnknownError');
      expect(record.message).toBe('12345');
    });

    it('should merge context with PersonalLogError context', () => {
      const error = new ValidationError('Invalid input', {
        context: { field: 'email' },
      });

      const record = handler.handle(error, {
        component: 'LoginForm',
        operation: 'validate',
      });

      expect(record.context?.field).toBe('email');
      expect(record.context?.component).toBe('LoginForm');
      expect(record.context?.operation).toBe('validate');
    });

    it('should add context to standard errors', () => {
      const error = new Error('Something went wrong');
      const record = handler.handle(error, {
        component: 'TestComponent',
        additional: { userId: '123' },
      });

      expect(record.context?.component).toBe('TestComponent');
      expect(record.context?.additional).toEqual({ userId: '123' });
    });
  });

  // ==========================================================================
  // NORMALIZE ERROR TESTS
  // ==========================================================================

  describe('normalizeError() - Error Categorization', () => {
    it('should categorize network errors correctly', () => {
      const error = new Error('Network request failed');
      const record = handler.handle(error);

      expect(record.category).toBe('network');
    });

    it('should categorize fetch errors as network', () => {
      const error = new Error('Failed to fetch');
      const record = handler.handle(error);

      expect(record.category).toBe('network');
    });

    it('should categorize IndexedDB errors as system', () => {
      const error = new Error('IndexedDB transaction failed');
      const record = handler.handle(error);

      expect(record.category).toBe('system');
    });

    it('should categorize quota errors correctly', () => {
      const error = new Error('Storage quota exceeded');
      const record = handler.handle(error);

      expect(record.category).toBe('quota');
    });

    it('should categorize timeout errors correctly', () => {
      const error = new Error('Operation timed out');
      const record = handler.handle(error);

      expect(record.category).toBe('timeout');
    });

    it('should categorize permission errors correctly', () => {
      const error = new Error('Permission denied');
      const record = handler.handle(error);

      expect(record.category).toBe('permission');
    });

    it('should categorize validation errors correctly', () => {
      const error = new Error('Invalid input data');
      const record = handler.handle(error);

      expect(record.category).toBe('validation');
    });

    it('should categorize not found errors correctly', () => {
      const error = new Error('Resource not found');
      const record = handler.handle(error);

      expect(record.category).toBe('not-found');
    });

    it('should categorize WASM errors correctly', () => {
      const error = new Error('WASM compilation failed');
      const record = handler.handle(error);

      expect(record.category).toBe('wasm-fallback');
    });

    it('should categorize benchmark errors correctly', () => {
      const error = new Error('Performance benchmark failed');
      const record = handler.handle(error);

      expect(record.category).toBe('benchmark');
    });

    it('should default to unknown for unrecognized errors', () => {
      const error = new Error('Something completely different');
      const record = handler.handle(error);

      expect(record.category).toBe('unknown');
    });
  });

  describe('normalizeError() - Severity Inference', () => {
    it('should infer critical severity for fatal errors', () => {
      const error = new Error('Critical system failure');
      const record = handler.handle(error);

      expect(record.severity).toBe('critical');
    });

    it('should infer high severity for quota errors', () => {
      const error = new Error('Storage quota exceeded');
      const record = handler.handle(error);

      expect(record.severity).toBe('high');
    });

    it('should infer high severity for permission denied', () => {
      const error = new Error('Permission denied');
      const record = handler.handle(error);

      expect(record.severity).toBe('high');
    });

    it('should infer low severity for timeout errors', () => {
      const error = new Error('Operation timed out');
      const record = handler.handle(error);

      expect(record.severity).toBe('low');
    });

    it('should default to medium severity', () => {
      const error = new Error('Random error');
      const record = handler.handle(error);

      expect(record.severity).toBe('medium');
    });
  });

  describe('normalizeError() - User Message Inference', () => {
    it('should provide network error user message', () => {
      const error = new Error('Network request failed');
      const record = handler.handle(error);

      expect(record.userMessage).toContain('Network');
    });

    it('should provide quota error user message', () => {
      const error = new Error('Storage quota exceeded');
      const record = handler.handle(error);

      expect(record.userMessage).toContain('Storage');
    });

    it('should provide permission error user message', () => {
      const error = new Error('Permission denied');
      const record = handler.handle(error);

      expect(record.userMessage).toContain('Permission');
    });

    it('should provide timeout error user message', () => {
      const error = new Error('Operation timed out');
      const record = handler.handle(error);

      expect(record.userMessage).toContain('too long');
    });

    it('should provide not found error user message', () => {
      const error = new Error('Resource not found');
      const record = handler.handle(error);

      expect(record.userMessage).toContain('not found');
    });

    it('should provide generic error message for unknown errors', () => {
      const error = new Error('Random unexpected issue');
      const record = handler.handle(error);

      expect(record.userMessage).toContain('unexpected error');
    });
  });

  // ==========================================================================
  // RECOVERY ACTIONS TESTS
  // ==========================================================================

  describe('getRecoveryActions()', () => {
    it('should generate retry action for recoverable errors', () => {
      const error = new Error('Network request failed');
      const actions = handler.getRecoveryActions(error);

      const retryAction = actions.find(a => a.label === 'Try Again');
      expect(retryAction).toBeDefined();
      expect(retryAction?.primary).toBe(true);
    });

    it('should generate clear data action for quota errors', () => {
      const error = new QuotaError(100 * 1024 * 1024, 200 * 1024 * 1024);
      const actions = handler.getRecoveryActions(error);

      const clearAction = actions.find(a => a.label === 'Clear Old Data');
      expect(clearAction).toBeDefined();
    });

    it('should generate go offline action for offline errors', () => {
      const error = new NetworkError('Offline mode');
      const actions = handler.getRecoveryActions(error);

      // Simulate offline condition
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const offlineAction = actions.find(a => a.label === 'Go Offline');
      expect(offlineAction).toBeDefined();

      // Reset
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    });

    it('should generate request permission action for permission errors', () => {
      const error = new PermissionError('camera');
      const actions = handler.getRecoveryActions(error);

      const permissionAction = actions.find(a => a.label === 'Request Permission');
      expect(permissionAction).toBeDefined();
    });

    it('should generate learn more action for capability errors', () => {
      const error = new CapabilityError('WebGPU', 'GPU support');
      const actions = handler.getRecoveryActions(error);

      const learnAction = actions.find(a => a.label === 'Learn More');
      expect(learnAction).toBeDefined();
    });

    it('should generate reload action for system errors', () => {
      const error = new StorageError('Database unavailable');
      const actions = handler.getRecoveryActions(error);

      const reloadAction = actions.find(a => a.label === 'Reload Page');
      expect(reloadAction).toBeDefined();
      expect(reloadAction?.dangerous).toBe(true);
    });

    it('should generate copy details action for advanced users', () => {
      handler.updateConfig({ userTechnicalLevel: 'advanced' });

      const error = new Error('Test error');
      const actions = handler.getRecoveryActions(error);

      const copyAction = actions.find(a => a.label === 'Copy Error Details');
      expect(copyAction).toBeDefined();
    });

    it('should use custom recovery actions when registered', () => {
      const error = new ValidationError('Invalid email');

      // Register custom action
      handler.registerRecoveryActions('validation', (err) => [
        {
          label: 'Fix Email',
          action: () => console.log('Fixing email'),
        },
      ]);

      const actions = handler.getRecoveryActions(error);
      const customAction = actions.find(a => a.label === 'Fix Email');

      expect(customAction).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HISTORY TESTS
  // ==========================================================================

  describe('Error History', () => {
    it('should track error occurrences', () => {
      const error = new Error('Test error');

      handler.handle(error);
      const history = handler.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].error.message).toBe('Test error');
      expect(history[0].count).toBe(1);
    });

    it('should increment count for duplicate errors', () => {
      const error = new Error('Duplicate error');

      handler.handle(error);
      handler.handle(error);
      handler.handle(error);

      const history = handler.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].count).toBe(3);
    });

    it('should track first and last seen timestamps', () => {
      const error = new Error('Timestamp test');

      handler.handle(error);

      // Wait a bit to ensure different timestamps
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // busy wait
      }

      handler.handle(error);

      const history = handler.getHistory();
      const entry = history[0];

      expect(entry.firstSeen).toBeLessThan(entry.lastSeen);
    });

    it('should filter history by category', () => {
      handler.handle(new Error('Network error'));
      handler.handle(new Error('Storage quota exceeded'));
      handler.handle(new Error('Permission denied'));

      const networkHistory = handler.getHistory({ category: 'network' });

      expect(networkHistory).toHaveLength(1);
      expect(networkHistory[0].error.category).toBe('network');
    });

    it('should filter history by severity', () => {
      handler.handle(new Error('Critical failure'));
      handler.handle(new Error('Storage quota exceeded'));

      const highSeverityHistory = handler.getHistory({ severity: 'high' });

      expect(highSeverityHistory.length).toBeGreaterThan(0);
      highSeverityHistory.forEach(entry => {
        expect(entry.error.severity).toBe('high');
      });
    });

    it('should filter history by timestamp', () => {
      const cutoffTime = Date.now();

      handler.handle(new Error('Recent error'));

      const recentHistory = handler.getHistory({ since: cutoffTime });

      expect(recentHistory.length).toBeGreaterThan(0);
      recentHistory.forEach(entry => {
        expect(entry.firstSeen).toBeGreaterThanOrEqual(cutoffTime);
      });
    });

    it('should sort history by last seen time', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      handler.handle(error1);
      handler.handle(error2);
      handler.handle(error1); // Make error1 more recent

      const history = handler.getHistory();

      expect(history[0].error.message).toBe('First error');
      expect(history[1].error.message).toBe('Second error');
    });

    it('should trim history when max size exceeded', () => {
      const smallHandler = new ErrorHandler({
        enableLogging: false,
        logToConsole: false,
        maxErrorHistory: 3,
      });

      // Add more errors than max
      for (let i = 0; i < 5; i++) {
        smallHandler.handle(new Error(`Error ${i}`));
      }

      const history = smallHandler.getHistory();

      expect(history.length).toBeLessThanOrEqual(3);
    });

    it('should clear history', () => {
      handler.handle(new Error('Test error'));
      handler.clearHistory();

      const history = handler.getHistory();

      expect(history).toHaveLength(0);
    });
  });

  // ==========================================================================
  // CALLBACK TESTS
  // ==========================================================================

  describe('Error Callbacks', () => {
    it('should call registered error callbacks', () => {
      const callback = vi.fn();
      handler.onError(callback);

      const error = new Error('Test error');
      handler.handle(error);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
        })
      );
    });

    it('should call multiple callbacks in order', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      handler.onError(callback1);
      handler.onError(callback2);

      handler.handle(new Error('Test'));

      expect(callback1).toHaveBeenCalledBefore(callback2);
    });

    it('should unsubscribe callback when returned function is called', () => {
      const callback = vi.fn();
      const unsubscribe = handler.onError(callback);

      unsubscribe();
      handler.handle(new Error('Test'));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not fail if callback throws error', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback failed');
      });

      const successCallback = vi.fn();

      handler.onError(errorCallback);
      handler.onError(successCallback);

      // Should not throw despite error in callback
      expect(() => handler.handle(new Error('Test'))).not.toThrow();

      // Other callbacks should still be called
      expect(successCallback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // USER MESSAGING TESTS
  // ==========================================================================

  describe('getUserMessage()', () => {
    it('should return user message for PersonalLogError', () => {
      const error = new QuotaError(100, 200);
      const message = handler.getUserMessage(error);

      expect(message).toContain('Storage');
      expect(message).toContain('100');
    });

    it('should return inferred message for standard errors', () => {
      const error = new Error('Network request failed');
      const message = handler.getUserMessage(error);

      expect(message).toContain('Network');
    });

    it('should return generic message for unknown errors', () => {
      const error = 'Random string error';
      const message = handler.getUserMessage(error);

      expect(message).toContain('unexpected error');
    });
  });

  // ==========================================================================
  // CONFIGURATION TESTS
  // ==========================================================================

  describe('Configuration', () => {
    it('should use default config', () => {
      const defaultHandler = new ErrorHandler();
      const config = defaultHandler.getConfig();

      expect(config.enableLogging).toBe(true);
      expect(config.logToConsole).toBe(true);
      expect(config.maxErrorHistory).toBe(100);
      expect(config.userTechnicalLevel).toBe('intermediate');
    });

    it('should merge custom config with defaults', () => {
      const customHandler = new ErrorHandler({
        maxErrorHistory: 50,
        userTechnicalLevel: 'advanced',
      });

      const config = customHandler.getConfig();

      expect(config.maxErrorHistory).toBe(50);
      expect(config.userTechnicalLevel).toBe('advanced');
      expect(config.enableLogging).toBe(true); // Default
    });

    it('should update config at runtime', () => {
      handler.updateConfig({ userTechnicalLevel: 'basic' });

      const config = handler.getConfig();

      expect(config.userTechnicalLevel).toBe('basic');
    });

    it('should call analytics callback when configured', () => {
      const analyticsCallback = vi.fn();
      handler.updateConfig({ analyticsCallback });

      handler.handle(new Error('Test error'));

      expect(analyticsCallback).toHaveBeenCalledTimes(1);
      expect(analyticsCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
        })
      );
    });

    it('should not fail if analytics callback throws', () => {
      const badCallback = vi.fn(() => {
        throw new Error('Analytics failed');
      });

      handler.updateConfig({ analyticsCallback: badCallback });

      expect(() => handler.handle(new Error('Test'))).not.toThrow();
    });
  });

  // ==========================================================================
  // CONVENIENCE FUNCTIONS TESTS
  // ==========================================================================

  describe('Convenience Functions', () => {
    it('should log error using log() function', () => {
      const record = log(new Error('Test error'));

      expect(record).toBeDefined();
      expect(record.message).toBe('Test error');
    });

    it('should get user message using getUserMessage() function', () => {
      const message = getUserMessage(new Error('Network request failed'));

      expect(message).toContain('Network');
    });

    it('should get recovery actions using getRecoveryActions() function', () => {
      const actions = getRecoveryActions(new Error('Test error'));

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should get error history using getErrorHistory() function', () => {
      log(new Error('Test error'));

      const history = getErrorHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should register callback using onError() function', () => {
      const callback = vi.fn();
      const unsubscribe = onError(callback);

      log(new Error('Test'));

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should register recovery actions using registerRecoveryActions()', () => {
      const unsubscribe = registerRecoveryActions('validation', (err) => [
        {
          label: 'Custom Action',
          action: () => {},
        },
      ]);

      const actions = getRecoveryActions(new ValidationError('Test'));

      expect(actions.find(a => a.label === 'Custom Action')).toBeDefined();

      unsubscribe();
    });
  });

  // ==========================================================================
  // SPECIALIZED ERROR TYPE TESTS
  // ==========================================================================

  describe('Specialized Error Types', () => {
    it('should handle WasmError correctly', () => {
      const error = new WasmError('WASM compile failed', {
        technicalDetails: 'Module: test.wasm',
      });

      expect(error.category).toBe('system');
      expect(error.recovery).toBe('fallback');
      expect(error.technicalDetails).toBe('Module: test.wasm');
    });

    it('should handle StorageError correctly', () => {
      const error = new StorageError('Database locked');

      expect(error.category).toBe('system');
      expect(error.severity).toBe('critical');
      expect(error.recovery).toBe('fatal');
    });

    it('should handle QuotaError correctly', () => {
      const error = new QuotaError(150 * 1024 * 1024, 200 * 1024 * 1024);

      expect(error.category).toBe('quota');
      expect(error.usedBytes).toBe(150 * 1024 * 1024);
      expect(error.totalBytes).toBe(200 * 1024 * 1024);
      expect(error.userMessage).toContain('150');
      expect(error.userMessage).toContain('200');
    });

    it('should handle HardwareDetectionError correctly', () => {
      const error = new HardwareDetectionError('CPU detection failed');

      expect(error.category).toBe('system');
      expect(error.recovery).toBe('fallback');
    });

    it('should handle BenchmarkError correctly', () => {
      const error = new BenchmarkError('Suite crashed', {
        benchmarkId: 'test-suite-1',
      });

      expect(error.category).toBe('benchmark');
      expect(error.benchmarkId).toBe('test-suite-1');
      expect(error.recovery).toBe('degraded');
    });

    it('should handle CapabilityError correctly', () => {
      const error = new CapabilityError('WebGPU', 'GPU support');

      expect(error.category).toBe('capability');
      expect(error.feature).toBe('WebGPU');
      expect(error.requirement).toBe('GPU support');
    });

    it('should handle NetworkError correctly', () => {
      const error = new NetworkError('Fetch failed', {
        url: 'https://api.example.com',
        status: 500,
      });

      expect(error.url).toBe('https://api.example.com');
      expect(error.status).toBe(500);
    });

    it('should handle TimeoutError correctly', () => {
      const error = new TimeoutError('Database query', 5000);

      expect(error.category).toBe('timeout');
      expect(error.operation).toBe('Database query');
      expect(error.timeout).toBe(5000);
    });

    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid email', {
        field: 'email',
        value: 'not-an-email',
      });

      expect(error.category).toBe('validation');
      expect(error.field).toBe('email');
      expect(error.value).toBe('not-an-email');
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('Conversation', 'conv-123');

      expect(error.category).toBe('not-found');
      expect(error.resource).toBe('Conversation');
      expect(error.id).toBe('conv-123');
    });

    it('should handle PermissionError correctly', () => {
      const error = new PermissionError('camera');

      expect(error.category).toBe('permission');
      expect(error.permission).toBe('camera');
    });
  });

  // ==========================================================================
  // TYPE GUARDS TESTS
  // ==========================================================================

  describe('Type Guards', () => {
    it('should identify PersonalLogError instances', () => {
      const personalLogError = new WasmError('Test');
      const standardError = new Error('Test');

      expect(isPersonalLogError(personalLogError)).toBe(true);
      expect(isPersonalLogError(standardError)).toBe(false);
      expect(isPersonalLogError('string')).toBe(false);
      expect(isPersonalLogError(null)).toBe(false);
    });
  });

  // ==========================================================================
  // TOJSON() METHOD TESTS
  // ==========================================================================

  describe('toJSON() Method', () => {
    it('should serialize PersonalLogError to ErrorRecord', () => {
      const error = new ValidationError('Invalid input', {
        field: 'email',
        context: { userId: '123' },
      });

      const record = error.toJSON();

      expect(record.name).toBe('ValidationError');
      expect(record.message).toBe('Invalid input');
      expect(record.category).toBe('validation');
      expect(record.severity).toBe('low');
      expect(record.recovery).toBe('recoverable');
      expect(record.userMessage).toBeDefined();
      expect(record.context?.field).toBe('email');
      expect(record.context?.userId).toBe('123');
      expect(record.timestamp).toBeGreaterThan(0);
      expect(record.recoverable).toBe(true);
      expect(record.stack).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HELPER METHODS TESTS
  // ==========================================================================

  describe('Error Helper Methods', () => {
    it('should check if error is user visible', () => {
      const visibleError = new ValidationError('Invalid input');
      const infoError = new WasmError('WASM failed', {
        severity: 'info' as any,
      });

      expect(visibleError.isUserVisible()).toBe(true);
      expect(infoError.isUserVisible()).toBe(false);
    });

    it('should check if error should fallback', () => {
      const fallbackError = new WasmError('WASM failed');
      const recoverableError = new ValidationError('Invalid input');

      expect(fallbackError.shouldFallback()).toBe(true);
      expect(recoverableError.shouldFallback()).toBe(false);
    });
  });
});
