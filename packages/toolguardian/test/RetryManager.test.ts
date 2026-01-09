/**
 * Tests for RetryManager
 */

import { describe, it, expect, vi } from 'vitest';
import { RetryManager } from '../src/retry/RetryManager.js';
import type { RetryConfig, ExecutionResult } from '../src/types.js';

describe('RetryManager', () => {
  describe('execute() with successful function', () => {
    it('should execute function successfully on first attempt', async () => {
      const manager = new RetryManager();
      const fn = vi.fn().mockResolvedValue('success');

      const result = await manager.execute(fn, 'testTool');

      expect(result.status).toBe('success');
      expect(result.result).toBe('success');
      expect(result.retryCount).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry logic with exponential backoff', () => {
    it('should retry on retryable errors', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 10,
        maxDelay: 1000,
        backoffMultiplier: 2,
        retryableErrors: ['ETIMEDOUT']
      };

      const manager = new RetryManager(config);
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT: Connection failed'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT: Connection failed'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      const result = await manager.execute(fn, 'testTool');
      const duration = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(result.retryCount).toBe(2);
      expect(fn).toHaveBeenCalledTimes(3);
      // Should have exponential backoff delays: 10ms + 20ms = 30ms minimum
      expect(duration).toBeGreaterThanOrEqual(25);
    });

    it('should not retry non-retryable errors', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 10,
        maxDelay: 1000,
        backoffMultiplier: 2,
        retryableErrors: ['ETIMEDOUT']
      };

      const manager = new RetryManager(config);
      const fn = vi.fn().mockRejectedValue(new Error('ValidationError'));

      const result = await manager.execute(fn, 'testTool');

      expect(result.status).toBe('failed');
      expect(result.retryCount).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxAttempts limit', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 10,
        maxDelay: 1000,
        backoffMultiplier: 2
      };

      const manager = new RetryManager(config);
      const fn = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await manager.execute(fn, 'testTool');

      expect(result.status).toBe('failed');
      expect(result.retryCount).toBe(2); // 3 attempts total means 2 retries
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxDelay limit', async () => {
      const config: RetryConfig = {
        maxAttempts: 5,
        initialDelay: 100,
        maxDelay: 150,
        backoffMultiplier: 4,
        jitter: false
      };

      const manager = new RetryManager(config);
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await manager.execute(fn, 'testTool');
      const duration = Date.now() - startTime;

      // With maxDelay=150, even with multiplier=4, delay should not exceed 150
      // Attempts: 100ms + 150ms (capped) = 250ms minimum
      expect(duration).toBeLessThan(400);
    });

    it('should apply jitter when enabled', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 50,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: true
      };

      const manager = new RetryManager(config);
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const result1 = await manager.execute(fn, 'testTool');
      fn.mockClear();
      fn.mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const result2 = await manager.execute(fn, 'testTool');

      expect(result1.status).toBe('success');
      expect(result2.status).toBe('success');
      // With jitter, exact timing may vary
    });
  });

  describe('calculateDelay()', () => {
    it('should calculate exponential backoff delay', () => {
      const config: RetryConfig = {
        maxAttempts: 5,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2
      };

      const manager = new RetryManager(config);

      // Access private method via type assertion for testing
      const calculateDelay = (manager as any).calculateDelay.bind(manager);

      expect(calculateDelay(1)).toBe(100); // 100 * 2^0
      expect(calculateDelay(2)).toBe(200); // 100 * 2^1
      expect(calculateDelay(3)).toBe(400); // 100 * 2^2
      expect(calculateDelay(4)).toBe(800); // 100 * 2^3
      expect(calculateDelay(5)).toBe(1000); // Capped at maxDelay
    });
  });

  describe('isRetryable()', () => {
    it('should check if error is retryable', () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'NetworkError']
      };

      const manager = new RetryManager(config);

      // Access private method
      const isRetryable = (manager as any).isRetryable.bind(manager);

      expect(isRetryable(new Error('ETIMEDOUT: timeout'), 1)).toBe(true);
      expect(isRetryable(new Error('ECONNREFUSED: refused'), 1)).toBe(true);
      expect(isRetryable(new Error('NetworkError'), 1)).toBe(true);
      expect(isRetryable(new Error('ValidationError'), 1)).toBe(false);
      expect(isRetryable(new Error('ETIMEDOUT'), 4)).toBe(false); // Exceeded max attempts
    });

    it('should treat all errors as retryable when no specific list', () => {
      const config: RetryConfig = {
        maxAttempts: 3
      };

      const manager = new RetryManager(config);

      const isRetryable = (manager as any).isRetryable.bind(manager);

      expect(isRetryable(new Error('Any error'), 1)).toBe(true);
    });
  });

  describe('error context', () => {
    it('should include error details in result', async () => {
      const manager = new RetryManager({ maxAttempts: 1 });
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);

      const result = await manager.execute(fn, 'testTool');

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
    });
  });
});
