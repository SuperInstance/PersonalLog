/**
 * Tests for Monitor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Monitor } from '../src/monitoring/Monitor.js';
import type { ExecutionResult, ExecutionStatus } from '../src/types.js';

describe('Monitor', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = new Monitor();
  });

  const createResult = (
    status: ExecutionStatus,
    toolName: string,
    duration: number
  ): ExecutionResult => ({
    status,
    result: status === 'success' ? { data: 'test' } : undefined,
    error: status === 'failed' ? new Error('Test error') : undefined,
    executionTime: duration,
    retryCount: 0,
    functionName: toolName
  });

  describe('record()', () => {
    it('should record successful execution', () => {
      const result = createResult('success', 'testTool', 100);

      monitor.record(result, 'testTool');

      const metrics = monitor.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(0);
    });

    it('should record failed execution', () => {
      const result = createResult('failed', 'testTool', 50);

      monitor.record(result, 'testTool');

      const metrics = monitor.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(1);
    });

    it('should track execution time', () => {
      const result = createResult('success', 'testTool', 123);

      monitor.record(result, 'testTool');

      const metrics = monitor.getMetrics();
      expect(metrics.averageExecutionTime).toBe(123);
    });

    it('should track function call counts', () => {
      const result1 = createResult('success', 'tool1', 100);
      const result2 = createResult('success', 'tool1', 100);
      const result3 = createResult('success', 'tool2', 100);

      monitor.record(result1, 'tool1');
      monitor.record(result2, 'tool1');
      monitor.record(result3, 'tool2');

      const metrics = monitor.getMetrics();
      expect(metrics.functionCallCounts['tool1']).toBe(2);
      expect(metrics.functionCallCounts['tool2']).toBe(1);
    });

    it('should track slow executions', () => {
      monitor.setAlertThresholds({ slowExecution: 100 });

      const fastResult = createResult('success', 'testTool', 50);
      const slowResult = createResult('success', 'testTool', 150);

      monitor.record(fastResult, 'testTool');
      monitor.record(slowResult, 'testTool');

      const metrics = monitor.getMetrics();
      expect(metrics.slowExecutions).toBe(1);
    });

    it('should track retried executions', () => {
      const result = createResult('success', 'testTool', 100);
      (result as any).retryCount = 3;

      monitor.record(result, 'testTool');

      const metrics = monitor.getMetrics();
      expect(metrics.retriedExecutions).toBeGreaterThan(0);
    });
  });

  describe('getMetrics()', () => {
    it('should return aggregated metrics', () => {
      const results = [
        createResult('success', 'tool1', 100),
        createResult('success', 'tool1', 200),
        createResult('failed', 'tool2', 50),
        createResult('success', 'tool2', 150)
      ];

      results.forEach(r => monitor.record(r, r.functionName!));

      const metrics = monitor.getMetrics();

      expect(metrics.totalExecutions).toBe(4);
      expect(metrics.successfulExecutions).toBe(3);
      expect(metrics.failedExecutions).toBe(1);
      expect(metrics.averageExecutionTime).toBe(125); // (100+200+50+150)/4
    });

    it('should return empty metrics when no executions', () => {
      const metrics = monitor.getMetrics();

      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });
  });

  describe('getHistory()', () => {
    it('should return execution history', () => {
      const result1 = createResult('success', 'tool1', 100);
      const result2 = createResult('success', 'tool2', 200);

      monitor.record(result1, 'tool1');
      monitor.record(result2, 'tool2');

      const history = monitor.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].toolName).toBe('tool2'); // Most recent first
      expect(history[1].toolName).toBe('tool1');
    });

    it('should limit history size', () => {
      for (let i = 0; i < 10; i++) {
        const result = createResult('success', `tool${i}`, 100);
        monitor.record(result, `tool${i}`);
      }

      const history = monitor.getHistory({ limit: 5 });

      expect(history).toHaveLength(5);
    });

    it('should filter by tool name', () => {
      monitor.record(createResult('success', 'tool1', 100), 'tool1');
      monitor.record(createResult('success', 'tool2', 100), 'tool2');
      monitor.record(createResult('success', 'tool1', 100), 'tool1');

      const tool1History = monitor.getHistory({ toolName: 'tool1' });

      expect(tool1History).toHaveLength(2);
      expect(tool1History.every(h => h.toolName === 'tool1')).toBe(true);
    });

    it('should filter by status', () => {
      monitor.record(createResult('success', 'tool1', 100), 'tool1');
      monitor.record(createResult('failed', 'tool2', 100), 'tool2');
      monitor.record(createResult('success', 'tool3', 100), 'tool3');

      const successHistory = monitor.getHistory({ status: 'success' });

      expect(successHistory).toHaveLength(2);
    });

    it('should filter by time range', () => {
      const now = Date.now();

      monitor.record(createResult('success', 'tool1', 100), 'tool1');

      // Simulate time passing
      vi.spyOn(Date, 'now').mockReturnValue(now + 10000);

      monitor.record(createResult('success', 'tool2', 100), 'tool2');

      vi.spyOn(Date, 'now').mockRestore();

      const recentHistory = monitor.getHistory({
        startTime: now + 5000,
        endTime: now + 15000
      });

      expect(recentHistory).toHaveLength(1);
      expect(recentHistory[0].toolName).toBe('tool2');
    });

    it('should respect retention period', async () => {
      monitor.setRetentionPeriod(100); // 100ms

      monitor.record(createResult('success', 'tool1', 100), 'tool1');

      // Wait for retention to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger cleanup by adding another record
      monitor.record(createResult('success', 'tool2', 100), 'tool2');

      const history = monitor.getHistory();

      // Old record should be cleaned up
      expect(history.every(h => h.toolName !== 'tool1')).toBe(true);
    });
  });

  describe('getSuccessRate()', () => {
    it('should calculate success rate for tool', () => {
      monitor.record(createResult('success', 'tool1', 100), 'tool1');
      monitor.record(createResult('success', 'tool1', 100), 'tool1');
      monitor.record(createResult('failed', 'tool1', 100), 'tool1');

      const rate = monitor.getSuccessRate('tool1');

      expect(rate).toBe(2 / 3);
    });

    it('should return 0 for non-existent tool', () => {
      const rate = monitor.getSuccessRate('nonExistent');

      expect(rate).toBe(0);
    });

    it('should return 1 when all executions succeed', () => {
      monitor.record(createResult('success', 'tool1', 100), 'tool1');
      monitor.record(createResult('success', 'tool1', 100), 'tool1');

      const rate = monitor.getSuccessRate('tool1');

      expect(rate).toBe(1);
    });
  });

  describe('getAverageTime()', () => {
    it('should calculate average execution time for tool', () => {
      monitor.record(createResult('success', 'tool1', 100), 'tool1');
      monitor.record(createResult('success', 'tool1', 200), 'tool1');
      monitor.record(createResult('success', 'tool1', 300), 'tool1');

      const avg = monitor.getAverageTime('tool1');

      expect(avg).toBe(200);
    });

    it('should return 0 for non-existent tool', () => {
      const avg = monitor.getAverageTime('nonExistent');

      expect(avg).toBe(0);
    });
  });

  describe('clearHistory()', () => {
    it('should clear all history', () => {
      monitor.record(createResult('success', 'tool1', 100), 'tool1');
      monitor.record(createResult('success', 'tool2', 100), 'tool2');

      monitor.clearHistory();

      const history = monitor.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should reset metrics after clearing', () => {
      monitor.record(createResult('success', 'tool1', 100), 'tool1');
      monitor.record(createResult('failed', 'tool2', 100), 'tool2');

      monitor.clearHistory();

      const metrics = monitor.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit execution:complete event', () => {
      const handler = vi.fn();
      monitor.on('execution:complete', handler);

      const result = createResult('success', 'testTool', 100);
      monitor.record(result, 'testTool');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'testTool',
          status: 'success',
          duration: 100
        })
      );
    });

    it('should emit execution:failed event', () => {
      const handler = vi.fn();
      monitor.on('execution:failed', handler);

      const result = createResult('failed', 'testTool', 100);
      monitor.record(result, 'testTool');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'testTool',
          error: expect.any(Error)
        })
      );
    });

    it('should emit execution:slow event', () => {
      monitor.setAlertThresholds({ slowExecution: 100 });
      const handler = vi.fn();
      monitor.on('execution:slow', handler);

      const result = createResult('success', 'testTool', 150);
      monitor.record(result, 'testTool');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'testTool',
          duration: 150
        })
      );
    });
  });

  describe('setAlertThresholds()', () => {
    it('should update alert thresholds', () => {
      monitor.setAlertThresholds({
        slowExecution: 200,
        lowSuccessRate: 0.8,
        highFailureRate: 0.2
      });

      const thresholds = (monitor as any).alertThresholds;

      expect(thresholds.slowExecution).toBe(200);
      expect(thresholds.lowSuccessRate).toBe(0.8);
      expect(thresholds.highFailureRate).toBe(0.2);
    });
  });
});
