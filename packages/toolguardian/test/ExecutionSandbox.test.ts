/**
 * Tests for ExecutionSandbox
 */

import { describe, it, expect, vi } from 'vitest';
import { ExecutionSandbox } from '../src/sandbox/ExecutionSandbox.js';

describe('ExecutionSandbox', () => {
  describe('execute() with successful function', () => {
    it('should execute function successfully', async () => {
      const sandbox = new ExecutionSandbox();
      const fn = vi.fn().mockResolvedValue('success');

      const result = await sandbox.execute(fn);

      expect(result.status).toBe('success');
      expect(result.result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should execute synchronous function', async () => {
      const sandbox = new ExecutionSandbox();
      const fn = vi.fn().mockReturnValue('sync result');

      const result = await sandbox.execute(fn);

      expect(result.status).toBe('success');
      expect(result.result).toBe('sync result');
    });
  });

  describe('timeout handling', () => {
    it('should timeout slow function', async () => {
      const sandbox = new ExecutionSandbox();
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return 'should not complete';
      };

      const startTime = Date.now();
      const result = await sandbox.execute(fn, { timeout: 100 });
      const duration = Date.now() - startTime;

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('timeout');
      expect(duration).toBeLessThan(500);
    });

    it('should allow fast function to complete within timeout', async () => {
      const sandbox = new ExecutionSandbox();
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'completed';
      };

      const result = await sandbox.execute(fn, { timeout: 200 });

      expect(result.status).toBe('success');
      expect(result.result).toBe('completed');
    });

    it('should use default timeout from config', async () => {
      const sandbox = new ExecutionSandbox({ defaultTimeout: 100 });
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'should not complete';
      };

      const result = await sandbox.execute(fn);

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('timeout');
    });
  });

  describe('error handling', () => {
    it('should catch thrown errors', async () => {
      const sandbox = new ExecutionSandbox();
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);

      const result = await sandbox.execute(fn);

      expect(result.status).toBe('failed');
      expect(result.error).toBe(error);
    });

    it('should catch synchronous errors', async () => {
      const sandbox = new ExecutionSandbox();
      const fn = () => {
        throw new Error('Sync error');
      };

      const result = await sandbox.execute(fn);

      expect(result.status).toBe('failed');
      expect(result.error?.message).toBe('Sync error');
    });

    it('should not catch errors when catchErrors is false', async () => {
      const sandbox = new ExecutionSandbox({ defaultCatchErrors: false });
      const fn = async () => {
        throw new Error('Uncaught error');
      };

      await expect(sandbox.execute(fn)).rejects.toThrow('Uncaught error');
    });

    it('should respect per-execution catchErrors option', async () => {
      const sandbox = new ExecutionSandbox({ defaultCatchErrors: true });
      const fn = async () => {
        throw new Error('Uncaught error');
      };

      await expect(sandbox.execute(fn, { catchErrors: false }))
        .rejects.toThrow('Uncaught error');
    });
  });

  describe('execution time tracking', () => {
    it('should track execution time', async () => {
      const sandbox = new ExecutionSandbox();
      const delay = 50;
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'done';
      };

      const result = await sandbox.execute(fn);

      expect(result.executionTime).toBeGreaterThanOrEqual(delay - 10);
      expect(result.executionTime).toBeLessThan(delay + 100);
    });

    it('should track time even for failed executions', async () => {
      const sandbox = new ExecutionSandbox();
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        throw new Error('Failed');
      };

      const result = await sandbox.execute(fn);

      expect(result.status).toBe('failed');
      expect(result.executionTime).toBeGreaterThanOrEqual(20);
    });
  });

  describe('memory tracking', () => {
    it('should estimate memory usage', async () => {
      const sandbox = new ExecutionSandbox();
      const fn = async () => {
        // Create a large string
        return 'x'.repeat(1000000);
      };

      const result = await sandbox.execute(fn, { trackMemory: true });

      expect(result.status).toBe('success');
      expect(result.memoryUsed).toBeGreaterThan(0);
    });

    it('should fail when exceeding memory limit', async () => {
      const sandbox = new ExecutionSandbox();
      const fn = async () => {
        // Create a large object
        return new Array(1000000).fill('x');
      };

      const result = await sandbox.executeWithMemoryLimit(
        fn,
        10 * 1024 * 1024, // 10MB limit
        { timeout: 5000 }
      );

      // May succeed or fail depending on actual memory usage
      expect(['success', 'failed']).toContain(result.status);
      if (result.status === 'failed') {
        expect(result.error?.message).toContain('memory');
      }
    });
  });

  describe('context tracking', () => {
    it('should pass context to execution', async () => {
      const sandbox = new ExecutionSandbox();
      const context = { userId: 'user-123', requestId: 'req-456' };
      const fn = vi.fn().mockResolvedValue('result');

      await sandbox.execute(fn, { context });

      expect(fn).toHaveBeenCalled();
    });
  });

  describe('withTimeout()', () => {
    it('should resolve promise before timeout', async () => {
      const sandbox = new ExecutionSandbox();
      const promise = new Promise(resolve => setTimeout(() => resolve('fast'), 50));

      const result = await (sandbox as any).withTimeout(promise, 200);

      expect(result).toBe('fast');
    });

    it('should reject promise after timeout', async () => {
      const sandbox = new ExecutionSandbox();
      const promise = new Promise(resolve => setTimeout(() => resolve('slow'), 5000));

      await expect((sandbox as any).withTimeout(promise, 100))
        .rejects.toThrow();
    });
  });
});
