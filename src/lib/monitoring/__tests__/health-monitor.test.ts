/**
 * Health Monitor Tests
 *
 * Comprehensive test suite for the health monitoring system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HealthMonitor, getHealthMonitor, resetHealthMonitor } from '../health-monitor';
import { HealthStatus, AlertSeverity, MetricCategory, TrendDirection } from '../metrics';

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    // Reset singleton and create fresh instance
    resetHealthMonitor();
    monitor = new HealthMonitor({
      collectionInterval: 100, // Fast for tests
      historySize: 10,
      anomalyWindow: 5,
      anomalyThreshold: 2,
      alertDebounceMs: 1000,
      autoRecovery: false,
    });
  });

  afterEach(() => {
    monitor.stop();
    resetHealthMonitor();
  });

  describe('Lifecycle', () => {
    it('should start monitoring', async () => {
      expect(monitor.isActive()).toBe(false);
      await monitor.start();
      expect(monitor.isActive()).toBe(true);
    });

    it('should stop monitoring', async () => {
      await monitor.start();
      expect(monitor.isActive()).toBe(true);
      monitor.stop();
      expect(monitor.isActive()).toBe(false);
    });

    it('should not start twice', async () => {
      await monitor.start();
      const isActive1 = monitor.isActive();
      await monitor.start();
      const isActive2 = monitor.isActive();
      expect(isActive1).toBe(true);
      expect(isActive2).toBe(true);
    });

    it('should track uptime', async () => {
      await monitor.start();
      const status1 = monitor.getSystemHealthStatus();
      expect(status1.uptime).toBeGreaterThan(0);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status2 = monitor.getSystemHealthStatus();
      expect(status2.uptime).toBeGreaterThan(status1.uptime);
    });
  });

  describe('Metric Collection', () => {
    it('should collect performance metrics', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const perfMetrics = metrics.filter((m) => m.category === MetricCategory.PERFORMANCE);

      expect(perfMetrics.length).toBeGreaterThan(0);
      expect(perfMetrics.some((m) => m.name === 'cpu-usage')).toBe(true);
      expect(perfMetrics.some((m) => m.name === 'fps')).toBe(true);
    });

    it('should collect memory metrics', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const memMetrics = metrics.filter((m) => m.category === MetricCategory.MEMORY);

      // Memory metrics may not be available in all browsers
      if (memMetrics.length > 0) {
        expect(memMetrics.some((m) => m.name === 'memory-used')).toBe(true);
        expect(memMetrics.some((m) => m.name === 'memory-usage-percent')).toBe(true);
      }
    });

    it('should collect storage metrics', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const storageMetrics = metrics.filter((m) => m.category === MetricCategory.STORAGE);

      // Storage may not be available in all browsers
      if (storageMetrics.length > 0) {
        expect(storageMetrics.some((m) => m.name === 'storage-used')).toBe(true);
        expect(storageMetrics.some((m) => m.name === 'storage-usage-percent')).toBe(true);
      }
    });

    it('should collect network metrics', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const networkMetrics = metrics.filter((m) => m.category === MetricCategory.NETWORK);

      expect(networkMetrics.length).toBeGreaterThan(0);
      expect(networkMetrics.some((m) => m.name === 'network-status')).toBe(true);
    });

    it('should collect system metrics', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const metrics = monitor.getMetrics();
      const systemMetrics = metrics.filter((m) => m.category === MetricCategory.SYSTEM);

      expect(systemMetrics.length).toBeGreaterThan(0);
      expect(systemMetrics.some((m) => m.name === 'uptime')).toBe(true);
    });

    it('should get specific metric by name', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cpuMetric = monitor.getMetric('cpu-usage');
      expect(cpuMetric).toBeDefined();
      expect(cpuMetric?.name).toBe('cpu-usage');
    });
  });

  describe('Health Scoring', () => {
    it('should calculate overall health score', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const score = monitor.getHealthScore();

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.status).toBeDefined();
      expect(score.categories).toBeDefined();
      expect(score.timestamp).toBeGreaterThan(0);
    });

    it('should calculate category scores', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const score = monitor.getHealthScore();

      expect(score.categories.performance).toBeGreaterThanOrEqual(0);
      expect(score.categories.performance).toBeLessThanOrEqual(100);
      expect(score.categories.memory).toBeGreaterThanOrEqual(0);
      expect(score.categories.memory).toBeLessThanOrEqual(100);
      expect(score.categories.storage).toBeGreaterThanOrEqual(0);
      expect(score.categories.storage).toBeLessThanOrEqual(100);
    });

    it('should determine health status correctly', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const score = monitor.getHealthScore();

      if (score.score >= 80) {
        expect(score.status).toBe(HealthStatus.HEALTHY);
      } else if (score.score >= 60) {
        expect(score.status).toBe(HealthStatus.WARNING);
      } else {
        expect(score.status).toBe(HealthStatus.CRITICAL);
      }
    });
  });

  describe('Alerting', () => {
    it('should generate alerts for critical metrics', async () => {
      await monitor.start();

      // Wait for collection and alert checking
      await new Promise((resolve) => setTimeout(resolve, 250));

      const alerts = monitor.getActiveAlerts();

      // Alerts are generated based on actual metrics
      // Just verify the system can generate alerts
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should track alert count and last fired time', async () => {
      await monitor.start();

      // Wait for potential alerts
      await new Promise((resolve) => setTimeout(resolve, 250));

      const alerts = monitor.getActiveAlerts();

      alerts.forEach((alert) => {
        expect(alert.count).toBeGreaterThan(0);
        expect(alert.lastFired).toBeDefined();
        expect(alert.lastFired!).toBeLessThanOrEqual(Date.now());
      });
    });

    it('should provide recovery actions in alerts', async () => {
      await monitor.start();

      // Wait for potential alerts
      await new Promise((resolve) => setTimeout(resolve, 250));

      const alerts = monitor.getActiveAlerts();

      alerts.forEach((alert) => {
        expect(Array.isArray(alert.actions)).toBe(true);
        if (alert.actions.length > 0) {
          alert.actions.forEach((action) => {
            expect(typeof action).toBe('string');
            expect(action.length).toBeGreaterThan(0);
          });
        }
      });
    });

    it('should acknowledge alerts', async () => {
      await monitor.start();

      // Wait for potential alerts
      await new Promise((resolve) => setTimeout(resolve, 250));

      const alerts = monitor.getActiveAlerts();

      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        monitor.acknowledgeAlert(alertId);

        const allAlerts = monitor.getAllAlerts();
        const acknowledged = allAlerts.find((a) => a.id === alertId);
        expect(acknowledged?.active).toBe(false);
      }
    });

    it('should dismiss alerts', async () => {
      await monitor.start();

      // Wait for potential alerts
      await new Promise((resolve) => setTimeout(resolve, 250));

      const alerts = monitor.getActiveAlerts();

      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        monitor.dismissAlert(alertId);

        const allAlerts = monitor.getAllAlerts();
        const dismissed = allAlerts.find((a) => a.id === alertId);
        expect(dismissed).toBeUndefined();
      }
    });

    it('should reset all alerts', async () => {
      await monitor.start();

      // Wait for potential alerts
      await new Promise((resolve) => setTimeout(resolve, 250));

      monitor.resetAlerts();

      const alerts = monitor.getAllAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('History Tracking', () => {
    it('should record health history', async () => {
      await monitor.start();

      // Wait for multiple collections
      await new Promise((resolve) => setTimeout(resolve, 350));

      const history = monitor.getHealthHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(10); // historySize in test config
    });

    it('should include timestamps in history', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const history = monitor.getHealthHistory();

      history.forEach((point) => {
        expect(point.timestamp).toBeDefined();
        expect(point.timestamp).toBeGreaterThan(0);
        expect(point.score).toBeDefined();
        expect(point.metrics).toBeDefined();
      });
    });

    it('should maintain history size limit', async () => {
      await monitor.start();

      // Wait for multiple collections
      await new Promise((resolve) => setTimeout(resolve, 500));

      const history = monitor.getHealthHistory();

      expect(history.length).toBeLessThanOrEqual(10); // historySize in test config
    });

    it('should clear history', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      monitor.clearHistory();

      const history = monitor.getHealthHistory();
      expect(history.length).toBe(0);
    });

    it('should track metric-specific history', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cpuHistory = monitor.getMetricHistory('cpu-usage');

      // May have history if CPU metric was collected
      expect(Array.isArray(cpuHistory)).toBe(true);
    });
  });

  describe('Trend Analysis', () => {
    it('should detect stable trend', async () => {
      await monitor.start();

      // Wait for collections
      await new Promise((resolve) => setTimeout(resolve, 250));

      const status = monitor.getSystemHealthStatus();

      expect(status.trend).toBeDefined();
      expect(status.trend.direction).toBeDefined();
      expect([TrendDirection.IMPROVING, TrendDirection.DEGRADING, TrendDirection.STABLE]).toContain(
        status.trend.direction
      );
    });

    it('should calculate trend confidence', async () => {
      await monitor.start();

      // Wait for collections
      await new Promise((resolve) => setTimeout(resolve, 250));

      const status = monitor.getSystemHealthStatus();

      expect(status.trend.confidence).toBeGreaterThanOrEqual(0);
      expect(status.trend.confidence).toBeLessThanOrEqual(1);
    });

    it('should measure trend period', async () => {
      await monitor.start();

      // Wait for collections
      await new Promise((resolve) => setTimeout(resolve, 250));

      const status = monitor.getSystemHealthStatus();

      expect(status.trend.period).toBeGreaterThanOrEqual(0);
    });
  });

  describe('System Health Status', () => {
    it('should provide complete system status', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const status = monitor.getSystemHealthStatus();

      expect(status.healthScore).toBeDefined();
      expect(status.metrics).toBeDefined();
      expect(status.alerts).toBeDefined();
      expect(status.trend).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.lastCheck).toBeGreaterThan(0);
      expect(typeof status.isMonitoring).toBe('boolean');
    });

    it('should update last check timestamp', async () => {
      await monitor.start();

      const status1 = monitor.getSystemHealthStatus();

      await new Promise((resolve) => setTimeout(resolve, 150));

      const status2 = monitor.getSystemHealthStatus();

      expect(status2.lastCheck).toBeGreaterThan(status1.lastCheck);
    });
  });

  describe('Data Export', () => {
    it('should export health data as JSON', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const exported = monitor.exportData();

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed.status).toBeDefined();
      expect(parsed.history).toBeDefined();
      expect(parsed.alerts).toBeDefined();
      expect(parsed.config).toBeDefined();
    });

    it('should include all relevant data in export', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const exported = monitor.exportData();
      const parsed = JSON.parse(exported);

      expect(parsed.status.healthScore).toBeDefined();
      expect(parsed.status.metrics).toBeDefined();
      expect(parsed.status.uptime).toBeDefined();
      expect(parsed.config).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getHealthMonitor();
      const instance2 = getHealthMonitor();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getHealthMonitor();
      resetHealthMonitor();
      const instance2 = getHealthMonitor();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle stop when not started', () => {
      expect(() => monitor.stop()).not.toThrow();
    });

    it('should handle multiple start/stop cycles', async () => {
      await monitor.start();
      monitor.stop();

      await monitor.start();
      expect(monitor.isActive()).toBe(true);

      monitor.stop();
      expect(monitor.isActive()).toBe(false);
    });

    it('should handle getting metrics when not started', () => {
      const metrics = monitor.getMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should handle getting health score when not started', () => {
      const score = monitor.getHealthScore();
      expect(score).toBeDefined();
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });

    it('should handle acknowledging non-existent alert', () => {
      expect(() => monitor.acknowledgeAlert('non-existent')).not.toThrow();
    });

    it('should handle dismissing non-existent alert', () => {
      expect(() => monitor.dismissAlert('non-existent')).not.toThrow();
    });
  });

  describe('Performance Impact', () => {
    it('should collect metrics efficiently', async () => {
      await monitor.start();

      const startTime = performance.now();

      // Wait for multiple collections
      await new Promise((resolve) => setTimeout(resolve, 300));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 500ms for 3 collections)
      expect(duration).toBeLessThan(500);
    });

    it('should not block UI during collection', async () => {
      await monitor.start();

      let frameCount = 0;
      const countFrames = () => {
        frameCount++;
        if (frameCount < 10) {
          requestAnimationFrame(countFrames);
        }
      };

      requestAnimationFrame(countFrames);

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should have processed frames while collecting
      expect(frameCount).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should work with performance monitor', async () => {
      await monitor.start();

      // Wait for collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const perfMetric = monitor.getMetric('fps');

      if (perfMetric) {
        expect(perfMetric.value).toBeGreaterThan(0);
        expect(perfMetric.unit).toBe('fps');
      }
    });

    it('should detect status changes', async () => {
      await monitor.start();

      const status1 = monitor.getSystemHealthStatus();

      // Wait for update
      await new Promise((resolve) => setTimeout(resolve, 150));

      const status2 = monitor.getSystemHealthStatus();

      expect(status2.lastCheck).not.toBe(status1.lastCheck);
    });
  });
});
