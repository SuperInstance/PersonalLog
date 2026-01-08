/**
 * Tests for Performance Tracker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPerformanceTracker,
  createPerformanceTracker,
  OperationCategory,
} from '../performance-tracker';

describe('PerformanceTracker', () => {
  let tracker: ReturnType<typeof createPerformanceTracker>;

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    tracker = createPerformanceTracker({
      maxHistorySize: 100,
      slowOperationThreshold: 100,
      highErrorRateThreshold: 0.1,
      regressionDetectionWindow: 10,
      alertCooldown: 1000,
    });
  });

  describe('Operation Tracking', () => {
    it('should track an operation from start to end', () => {
      const id = tracker.startOperation('test-operation', 'api');
      expect(id).toBeTruthy();

      tracker.endOperation(id, true);

      const summary = tracker.getPerformanceSummary();
      expect(summary.totalOperations).toBe(1);
      expect(summary.successRate).toBe(1);
    });

    it('should track operation duration correctly', () => {
      const id = tracker.startOperation('fast-operation', 'api');

      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Wait 10ms
      }

      tracker.endOperation(id, true);

      const stats = tracker.getStats('fast-operation');
      expect(stats).toBeTruthy();
      expect(stats!.mean).toBeGreaterThan(0);
      expect(stats!.min).toBeGreaterThan(0);
    });

    it('should track failed operations', () => {
      const id = tracker.startOperation('failing-operation', 'api');
      tracker.endOperation(id, false);

      const stats = tracker.getStats('failing-operation');
      expect(stats!.failureCount).toBe(1);
      expect(stats!.successRate).toBe(0);
    });

    it('should track synchronous operations', () => {
      const result = tracker.trackOperation('sync-operation', 'api', () => {
        return 'success';
      });

      expect(result).toBe('success');

      const stats = tracker.getStats('sync-operation');
      expect(stats!.count).toBe(1);
      expect(stats!.successCount).toBe(1);
    });

    it('should track async operations', async () => {
      const result = await tracker.trackOperationAsync('async-operation', 'api', async () => {
        return 'async-result';
      });

      expect(result).toBe('async-result');

      const stats = tracker.getStats('async-operation');
      expect(stats!.count).toBe(1);
      expect(stats!.successCount).toBe(1);
    });

    it('should handle errors in synchronous operations', () => {
      expect(() => {
        tracker.trackOperation('error-operation', 'api', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const stats = tracker.getStats('error-operation');
      expect(stats!.failureCount).toBe(1);
    });

    it('should handle errors in async operations', async () => {
      await expect(
        tracker.trackOperationAsync('async-error-operation', 'api', async () => {
          throw new Error('Async error');
        })
      ).rejects.toThrow('Async error');

      const stats = tracker.getStats('async-error-operation');
      expect(stats!.failureCount).toBe(1);
    });

    it('should include metadata in operations', () => {
      const id = tracker.startOperation('metadata-operation', 'api', {
        endpoint: '/api/test',
        method: 'GET',
      });

      tracker.endOperation(id, true, {
        statusCode: 200,
        responseSize: 1024,
      });

      const metrics = tracker.getMetrics('api');
      const operation = metrics.find(m => m.name === 'metadata-operation');

      expect(operation).toBeTruthy();
      expect(operation!.metadata).toEqual({
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        responseSize: 1024,
      });
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate mean correctly', () => {
      for (let i = 0; i < 10; i++) {
        const id = tracker.startOperation('mean-test', 'api');
        tracker.endOperation(id, true);
      }

      const stats = tracker.getStats('mean-test');
      expect(stats).toBeTruthy();
      expect(stats!.count).toBe(10);
      expect(stats!.mean).toBeGreaterThan(0);
    });

    it('should calculate median correctly', () => {
      const durations: number[] = [];

      for (let i = 0; i < 11; i++) {
        const id = tracker.startOperation('median-test', 'api');
        tracker.endOperation(id, true);
        durations.push(tracker.getStats('median-test')!.max);
      }

      const stats = tracker.getStats('median-test');
      expect(stats).toBeTruthy();
      expect(stats!.median).toBeGreaterThan(0);
    });

    it('should calculate percentiles correctly', () => {
      for (let i = 0; i < 100; i++) {
        const id = tracker.startOperation('percentile-test', 'api');
        tracker.endOperation(id, true);
      }

      const stats = tracker.getStats('percentile-test');
      expect(stats).toBeTruthy();
      expect(stats!.p50).toBeGreaterThan(0);
      expect(stats!.p75).toBeGreaterThanOrEqual(stats!.p50);
      expect(stats!.p90).toBeGreaterThanOrEqual(stats!.p75);
      expect(stats!.p95).toBeGreaterThanOrEqual(stats!.p90);
      expect(stats!.p99).toBeGreaterThanOrEqual(stats!.p95);
    });

    it('should calculate standard deviation correctly', () => {
      for (let i = 0; i < 50; i++) {
        const id = tracker.startOperation('stddev-test', 'api');
        tracker.endOperation(id, true);
      }

      const stats = tracker.getStats('stddev-test');
      expect(stats).toBeTruthy();
      expect(stats!.standardDeviation).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent operations', () => {
      const stats = tracker.getStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('Category Management', () => {
    it('should get metrics by category', () => {
      tracker.trackOperation('api-op-1', 'api', () => 'result');
      tracker.trackOperation('api-op-2', 'api', () => 'result');
      tracker.trackOperation('db-op-1', 'database', () => 'result');

      const apiMetrics = tracker.getMetrics('api');
      const dbMetrics = tracker.getMetrics('database');

      expect(apiMetrics.length).toBe(2);
      expect(dbMetrics.length).toBe(1);
    });

    it('should calculate category statistics', () => {
      tracker.trackOperation('cat-op-1', 'api', () => 'result');
      tracker.trackOperation('cat-op-2', 'api', () => 'result');

      const id = tracker.startOperation('cat-op-3', 'api');
      tracker.endOperation(id, false);

      const stats = tracker.getCategoryStats('api');
      expect(stats).toBeTruthy();
      expect(stats!.totalOperations).toBe(3);
      expect(stats!.successRate).toBeCloseTo(2/3, 1);
      expect(stats!.avgDuration).toBeGreaterThan(0);
    });

    it('should return null for empty categories', () => {
      const stats = tracker.getCategoryStats('cache');
      expect(stats).toBeNull();
    });
  });

  describe('Bottleneck Detection', () => {
    it('should identify slowest operations', () => {
      tracker.trackOperation('fast-op', 'api', () => 'result');
      tracker.trackOperation('slow-op', 'api', () => {
        // Simulate slow operation
        const start = performance.now();
        while (performance.now() - start < 20) {
          // Wait 20ms
        }
        return 'result';
      });

      const slowest = tracker.getSlowestOperations(2);
      expect(slowest.length).toBe(2);
      expect(slowest[0].name).toBe('slow-op');
    });

    it('should identify slowest operations by average duration', () => {
      tracker.trackOperation('fast-op', 'api', () => 'result');

      for (let i = 0; i < 5; i++) {
        tracker.trackOperation('slow-op', 'api', () => {
          const start = performance.now();
          while (performance.now() - start < 20) {
            // Wait 20ms
          }
          return 'result';
        });
      }

      const slowest = tracker.getSlowestOperationNames(2);
      expect(slowest[0].name).toBe('slow-op');
      expect(slowest[0].avgDuration).toBeGreaterThan(slowest[1].avgDuration);
    });

    it('should identify operations with highest failure rate', () => {
      for (let i = 0; i < 10; i++) {
        const id = tracker.startOperation('failing-op', 'api');
        tracker.endOperation(id, i >= 7); // 70% failure rate (i < 7 fail, i >= 7 succeed)
      }

      const failures = tracker.getHighestFailureRate(5);
      expect(failures.length).toBe(1);
      expect(failures[0].name).toBe('failing-op');
      expect(failures[0].failureRate).toBeCloseTo(0.7, 1);
    });

    it('should filter operations with minimum execution count', () => {
      const id = tracker.startOperation('single-failure', 'api');
      tracker.endOperation(id, false);

      const failures = tracker.getHighestFailureRate(10);
      expect(failures.length).toBe(0); // Should be filtered out (only 1 execution)
    });
  });

  describe('Performance Trends', () => {
    it('should detect improving trend', () => {
      // First batch: slower operations
      for (let i = 0; i < 15; i++) {
        const id = tracker.startOperation('trend-op', 'api');
        const start = performance.now();
        while (performance.now() - start < 50) {
          // Wait 50ms
        }
        tracker.endOperation(id, true);
      }

      // Second batch: faster operations
      for (let i = 0; i < 15; i++) {
        const id = tracker.startOperation('trend-op', 'api');
        tracker.endOperation(id, true);
      }

      const trend = tracker.getPerformanceTrend('trend-op', 50);
      expect(trend).toBeTruthy();
      // The trend should be improving (changePercent < 0)
      expect(trend!.changePercent).toBeLessThan(0);
    });

    it('should detect degrading trend', () => {
      // First batch: faster operations
      for (let i = 0; i < 15; i++) {
        const id = tracker.startOperation('degrading-op', 'api');
        tracker.endOperation(id, true);
      }

      // Second batch: slower operations
      for (let i = 0; i < 15; i++) {
        const id = tracker.startOperation('degrading-op', 'api');
        const start = performance.now();
        while (performance.now() - start < 50) {
          // Wait 50ms
        }
        tracker.endOperation(id, true);
      }

      const trend = tracker.getPerformanceTrend('degrading-op', 50);
      expect(trend).toBeTruthy();
      // The trend should be degrading (changePercent > 0)
      expect(trend!.changePercent).toBeGreaterThan(0);
    });

    it('should return null for insufficient data', () => {
      tracker.trackOperation('insufficient-op', 'api', () => 'result');

      const trend = tracker.getPerformanceTrend('insufficient-op');
      expect(trend).toBeNull();
    });

    it('should include timestamps and values in trend data', () => {
      for (let i = 0; i < 15; i++) {
        tracker.trackOperation('trend-data-op', 'api', () => 'result');
      }

      const trend = tracker.getPerformanceTrend('trend-data-op');
      expect(trend).toBeTruthy();
      expect(trend!.timestamps.length).toBe(15);
      expect(trend!.values.length).toBe(15);
    });
  });

  describe('Alerting', () => {
    it('should generate slow operation alerts', () => {
      const id = tracker.startOperation('very-slow-op', 'api');
      const start = performance.now();
      while (performance.now() - start < 150) {
        // Wait 150ms (exceeds threshold of 100ms)
      }
      tracker.endOperation(id, true);

      const alerts = tracker.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const slowAlert = alerts.find(a => a.type === 'slow_operation');
      expect(slowAlert).toBeTruthy();
      expect(slowAlert!.operation).toBe('very-slow-op');
    });

    it('should generate performance regression alerts', () => {
      // Build baseline
      for (let i = 0; i < 15; i++) {
        const id = tracker.startOperation('regression-op', 'api');
        tracker.endOperation(id, true);
      }

      // Trigger regression (2x slower)
      for (let i = 0; i < 10; i++) {
        const id = tracker.startOperation('regression-op', 'api');
        const start = performance.now();
        while (performance.now() - start < 50) {
          // Wait 50ms
        }
        tracker.endOperation(id, true);
      }

      const alerts = tracker.getAlerts();
      const regressionAlert = alerts.find(a => a.type === 'performance_regression');

      expect(regressionAlert).toBeTruthy();
      expect(regressionAlert!.operation).toBe('regression-op');
    });

    it('should respect alert cooldown', () => {
      const id = tracker.startOperation('cooldown-op', 'api');
      const start = performance.now();
      while (performance.now() - start < 150) {
        // Wait 150ms
      }
      tracker.endOperation(id, true);

      const alerts1 = tracker.getAlerts();
      const alertCount1 = alerts1.filter(a => a.operation === 'cooldown-op').length;

      // Trigger another slow operation immediately
      const id2 = tracker.startOperation('cooldown-op', 'api');
      const start2 = performance.now();
      while (performance.now() - start2 < 150) {
        // Wait 150ms
      }
      tracker.endOperation(id2, true);

      const alerts2 = tracker.getAlerts();
      const alertCount2 = alerts2.filter(a => a.operation === 'cooldown-op').length;

      // Should not create duplicate alert due to cooldown
      expect(alertCount2).toBe(alertCount1);
    });

    it('should clear old alerts', () => {
      const id = tracker.startOperation('old-alert-op', 'api');
      const start = performance.now();
      while (performance.now() - start < 150) {
        // Wait 150ms
      }
      tracker.endOperation(id, true);

      tracker.clearOldAlerts(0); // Clear all alerts
      const alerts = tracker.getAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('Performance Summary', () => {
    it('should generate comprehensive summary', () => {
      tracker.trackOperation('summary-op-1', 'api', () => 'result');
      tracker.trackOperation('summary-op-2', 'database', () => 'result');

      const id = tracker.startOperation('summary-op-3', 'render');
      tracker.endOperation(id, false);

      const summary = tracker.getPerformanceSummary();

      expect(summary.totalOperations).toBe(3);
      expect(summary.successRate).toBeCloseTo(2/3, 1);
      expect(summary.avgDuration).toBeGreaterThan(0);
      expect(summary.categoryBreakdown.length).toBe(3);
    });

    it('should include category breakdown in summary', () => {
      tracker.trackOperation('cat-1', 'api', () => 'result');
      tracker.trackOperation('cat-2', 'api', () => 'result');
      tracker.trackOperation('cat-3', 'database', () => 'result');

      const summary = tracker.getPerformanceSummary();
      const apiCat = summary.categoryBreakdown.find(c => c.category === 'api');
      const dbCat = summary.categoryBreakdown.find(c => c.category === 'database');

      expect(apiCat).toBeTruthy();
      expect(apiCat!.count).toBe(2);
      expect(dbCat).toBeTruthy();
      expect(dbCat!.count).toBe(1);
    });

    it('should include slowest operations in summary', () => {
      tracker.trackOperation('fast-op', 'api', () => 'result');
      tracker.trackOperation('slow-op', 'api', () => {
        const start = performance.now();
        while (performance.now() - start < 20) {
          // Wait 20ms
        }
        return 'result';
      });

      const summary = tracker.getPerformanceSummary();
      expect(summary.slowestOperations.length).toBeGreaterThan(0);
      expect(summary.slowestOperations[0].name).toBe('slow-op');
    });

    it('should include recent alerts in summary', () => {
      const id = tracker.startOperation('alert-op', 'api');
      const start = performance.now();
      while (performance.now() - start < 150) {
        // Wait 150ms
      }
      tracker.endOperation(id, true);

      const summary = tracker.getPerformanceSummary();
      expect(summary.recentAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate text report', () => {
      tracker.trackOperation('report-op-1', 'api', () => 'result');
      tracker.trackOperation('report-op-2', 'database', () => 'result');

      const report = tracker.generateReport();

      expect(report).toContain('Performance Report');
      expect(report).toContain('Total Operations: 2');
      expect(report).toContain('report-op-1');
      expect(report).toContain('report-op-2');
    });

    it('should include statistics in report', () => {
      for (let i = 0; i < 10; i++) {
        tracker.trackOperation('stats-op', 'api', () => 'result');
      }

      const report = tracker.generateReport();
      expect(report).toContain('stats-op');
    });

    it('should include alerts in report', () => {
      const id = tracker.startOperation('alert-report-op', 'api');
      const start = performance.now();
      while (performance.now() - start < 150) {
        // Wait 150ms
      }
      tracker.endOperation(id, true);

      const report = tracker.generateReport();
      expect(report).toContain('alert-report-op');
    });
  });

  describe('History Management', () => {
    it('should trim history when exceeding max size', () => {
      const smallTracker = createPerformanceTracker({ maxHistorySize: 5 });

      for (let i = 0; i < 10; i++) {
        smallTracker.trackOperation(`op-${i}`, 'api', () => 'result');
      }

      const summary = smallTracker.getPerformanceSummary();
      expect(summary.totalOperations).toBe(5); // Should be trimmed to max size
    });

    it('should clear all history', () => {
      tracker.trackOperation('op-1', 'api', () => 'result');
      tracker.trackOperation('op-2', 'database', () => 'result');

      tracker.clearHistory();

      const summary = tracker.getPerformanceSummary();
      expect(summary.totalOperations).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ending non-existent operation gracefully', () => {
      expect(() => {
        tracker.endOperation('non-existent-id');
      }).not.toThrow();
    });

    it('should handle empty history gracefully', () => {
      const summary = tracker.getPerformanceSummary();
      expect(summary.totalOperations).toBe(0);
      expect(summary.successRate).toBe(1);
      expect(summary.avgDuration).toBe(0);
    });

    it('should handle operations with same name and different categories', () => {
      tracker.trackOperation('multi-cat-op', 'api', () => 'result');
      tracker.trackOperation('multi-cat-op', 'database', () => 'result');

      const apiStats = tracker.getStats('multi-cat-op');
      expect(apiStats).toBeTruthy();
      expect(apiStats!.category).toBe('api'); // Should use first category
    });

    it('should handle very fast operations', () => {
      tracker.trackOperation('instant-op', 'api', () => 'result');

      const stats = tracker.getStats('instant-op');
      expect(stats).toBeTruthy();
      expect(stats!.mean).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getPerformanceTracker', () => {
      const tracker1 = getPerformanceTracker();
      const tracker2 = getPerformanceTracker();

      expect(tracker1).toBe(tracker2);
    });

    it('should create independent instances with createPerformanceTracker', () => {
      const tracker1 = createPerformanceTracker();
      const tracker2 = createPerformanceTracker();

      expect(tracker1).not.toBe(tracker2);

      tracker1.trackOperation('test-op', 'api', () => 'result');

      const summary1 = tracker1.getPerformanceSummary();
      const summary2 = tracker2.getPerformanceSummary();

      expect(summary1.totalOperations).toBe(1);
      expect(summary2.totalOperations).toBe(0);
    });
  });
});
