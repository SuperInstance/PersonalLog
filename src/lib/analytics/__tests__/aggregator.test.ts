/**
 * Unit Tests: Analytics Aggregator
 *
 * Tests the analytics data aggregation system including:
 * - Event aggregation by category
 * - Time series calculations
 * - Statistics computation (averages, percentiles)
 * - Query functions
 *
 * @coverage Target: 85%+
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsAggregator } from '../aggregator';

// Mock the analytics event store
const mockEvents: any[] = [];

vi.mock('../storage', () => ({
  analyticsEventStore: {
    queryEvents: vi.fn(async (query: any) => {
      // Return mock events based on query
      if (query.types && query.types.includes('feature_used')) {
        return mockEvents.filter(e => e.type === 'feature_used');
      }
      if (query.types && query.types.includes('error_occurred')) {
        return mockEvents.filter(e => e.type === 'error_occurred');
      }
      if (query.types && query.types.includes('error_recovered')) {
        return mockEvents.filter(e => e.type === 'error_recovered');
      }
      if (query.types && query.types.includes('session_start')) {
        return mockEvents.filter(e => e.type === 'session_start');
      }
      if (query.types && query.types.includes('session_end')) {
        return mockEvents.filter(e => e.type === 'session_end');
      }
      if (query.types && query.types.includes('message_sent')) {
        return mockEvents.filter(e => e.type === 'message_sent');
      }
      return mockEvents;
    }),
  },
}));

describe('AnalyticsAggregator', () => {
  let aggregator: AnalyticsAggregator;

  beforeEach(() => {
    aggregator = new AnalyticsAggregator();
    mockEvents.length = 0; // Clear mock events

    // Add some test events
    const now = Date.now();
    mockEvents.push(
      {
        id: 'event-1',
        type: 'message_sent',
        category: 'user_action',
        timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
        sessionId: 'session-1',
        data: { type: 'message_sent' },
      },
      {
        id: 'event-2',
        type: 'message_sent',
        category: 'user_action',
        timestamp: new Date(now - 1800000).toISOString(), // 30 min ago
        sessionId: 'session-1',
        data: { type: 'message_sent' },
      },
      {
        id: 'event-3',
        type: 'feature_used',
        category: 'engagement',
        timestamp: new Date(now - 900000).toISOString(), // 15 min ago
        sessionId: 'session-1',
        data: {
          type: 'feature_used',
          featureId: 'search',
          duration: 5000,
          success: true,
        },
      },
      {
        id: 'event-4',
        type: 'feature_used',
        category: 'engagement',
        timestamp: new Date(now - 600000).toISOString(), // 10 min ago
        sessionId: 'session-1',
        data: {
          type: 'feature_used',
          featureId: 'search',
          duration: 3000,
          success: true,
        },
      },
      {
        id: 'event-5',
        type: 'error_occurred',
        category: 'error',
        timestamp: new Date(now - 300000).toISOString(), // 5 min ago
        sessionId: 'session-1',
        data: {
          type: 'error_occurred',
          errorType: 'NetworkError',
          recoverable: true,
        },
      },
      {
        id: 'event-6',
        type: 'session_start',
        category: 'engagement',
        timestamp: new Date(now - 7200000).toISOString(), // 2 hours ago
        sessionId: 'session-1',
        data: { type: 'session_start' },
      },
      {
        id: 'event-7',
        type: 'session_end',
        category: 'engagement',
        timestamp: new Date(now - 60000).toISOString(), // 1 min ago
        sessionId: 'session-1',
        data: {
          type: 'session_end',
          duration: 7200, // 2 hours in seconds
          actionsPerformed: 10,
          messagesSent: 2,
        },
      }
    );
  });

  // ==========================================================================
  // EVENT COUNTS TESTS
  // ==========================================================================

  describe('getEventCountsByType()', () => {
    it('should count events by type', async () => {
      const counts = await aggregator.getEventCountsByType({
        type: 'days',
        value: 1,
      });

      expect(counts['message_sent']).toBe(2);
      expect(counts['feature_used']).toBe(2);
      expect(counts['error_occurred']).toBe(1);
    });

    it('should return zero for event types with no occurrences', async () => {
      const counts = await aggregator.getEventCountsByType({
        type: 'days',
        value: 1,
      });

      expect(counts['conversation_created']).toBe(0);
      expect(counts['api_response']).toBe(0);
    });

    it('should respect time range', async () => {
      const counts = await aggregator.getEventCountsByType({
        type: 'hours',
        value: 1,
      });

      // Only events from last hour
      expect(counts['feature_used']).toBe(2);
      expect(counts['error_occurred']).toBe(1);
    });
  });

  describe('getEventCountsByCategory()', () => {
    it('should count events by category', async () => {
      const counts = await aggregator.getEventCountsByCategory({
        type: 'days',
        value: 1,
      });

      expect(counts['user_action']).toBe(2);
      expect(counts['engagement']).toBe(4); // 2 feature_used + session_start + session_end
      expect(counts['error']).toBe(1);
    });

    it('should return all categories including zero counts', async () => {
      const counts = await aggregator.getEventCountsByCategory({
        type: 'days',
        value: 1,
      });

      expect(counts['user_action']).toBeDefined();
      expect(counts['performance']).toBeDefined();
      expect(counts['engagement']).toBeDefined();
      expect(counts['error']).toBeDefined();
    });
  });

  // ==========================================================================
  // TIME SERIES TESTS
  // ==========================================================================

  describe('getTimeSeries()', () => {
    it('should aggregate events by day', async () => {
      const series = await aggregator.getTimeSeries(
        {
          type: 'days',
          value: 1,
        },
        'day'
      );

      expect(series.length).toBeGreaterThan(0);
      expect(series[0]).toHaveProperty('timestamp');
      expect(series[0]).toHaveProperty('value');
      expect(series[0]).toHaveProperty('count');
    });

    it('should filter by event type', async () => {
      const series = await aggregator.getTimeSeries(
        {
          type: 'days',
          value: 1,
        },
        'day',
        'message_sent'
      );

      const totalEvents = series.reduce((sum, point) => sum + point.value, 0);

      expect(totalEvents).toBe(2);
    });

    it('should sort time series chronologically', async () => {
      const series = await aggregator.getTimeSeries(
        {
          type: 'days',
          value: 1,
        },
        'day'
      );

      for (let i = 1; i < series.length; i++) {
        expect(series[i].timestamp >= series[i - 1].timestamp).toBe(true);
      }
    });

    it('should aggregate by hour', async () => {
      const series = await aggregator.getTimeSeries(
        {
          type: 'hours',
          value: 24,
        },
        'hour'
      );

      expect(series.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // FEATURE USAGE TESTS
  // ==========================================================================

  describe('getMostUsedFeatures()', () => {
    it('should return feature usage stats', async () => {
      const features = await aggregator.getMostUsedFeatures(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      expect(features.length).toBeGreaterThan(0);
      expect(features[0]).toHaveProperty('featureId');
      expect(features[0]).toHaveProperty('usageCount');
      expect(features[0]).toHaveProperty('lastUsed');
      expect(features[0]).toHaveProperty('totalDuration');
      expect(features[0]).toHaveProperty('successRate');
    });

    it('should calculate usage count correctly', async () => {
      const features = await aggregator.getMostUsedFeatures(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      const searchFeature = features.find(f => f.featureId === 'search');

      expect(searchFeature?.usageCount).toBe(2);
    });

    it('should calculate total duration correctly', async () => {
      const features = await aggregator.getMostUsedFeatures(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      const searchFeature = features.find(f => f.featureId === 'search');

      expect(searchFeature?.totalDuration).toBe(8000); // 5000 + 3000
    });

    it('should calculate average duration correctly', async () => {
      const features = await aggregator.getMostUsedFeatures(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      const searchFeature = features.find(f => f.featureId === 'search');

      expect(searchFeature?.averageDuration).toBe(4000); // (5000 + 3000) / 2
    });

    it('should calculate success rate correctly', async () => {
      const features = await aggregator.getMostUsedFeatures(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      const searchFeature = features.find(f => f.featureId === 'search');

      expect(searchFeature?.successRate).toBe(1.0); // 2/2 successes
    });

    it('should respect limit parameter', async () => {
      const features = await aggregator.getMostUsedFeatures(
        {
          type: 'days',
          value: 1,
        },
        1
      );

      expect(features.length).toBeLessThanOrEqual(1);
    });

    it('should sort by usage count descending', async () => {
      const features = await aggregator.getMostUsedFeatures(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      for (let i = 1; i < features.length; i++) {
        expect(features[i - 1].usageCount).toBeGreaterThanOrEqual(
          features[i].usageCount
        );
      }
    });
  });

  // ==========================================================================
  // ERROR STATS TESTS
  // ==========================================================================

  describe('getErrorStats()', () => {
    it('should return error statistics', async () => {
      const errors = await aggregator.getErrorStats(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty('errorType');
      expect(errors[0]).toHaveProperty('count');
      expect(errors[0]).toHaveProperty('lastOccurred');
      expect(errors[0]).toHaveProperty('recoverable');
      expect(errors[0]).toHaveProperty('recoveryRate');
    });

    it('should count errors by type', async () => {
      const errors = await aggregator.getErrorStats(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      const networkError = errors.find(e => e.errorType === 'NetworkError');

      expect(networkError?.count).toBe(1);
    });

    it('should identify recoverable errors', async () => {
      const errors = await aggregator.getErrorStats(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      const networkError = errors.find(e => e.errorType === 'NetworkError');

      expect(networkError?.recoverable).toBe(true);
    });

    it('should calculate recovery rate', async () => {
      // Add a recovery event
      mockEvents.push({
        id: 'event-8',
        type: 'error_recovered',
        category: 'error',
        timestamp: new Date(Date.now() - 200000).toISOString(),
        sessionId: 'session-1',
        data: {
          type: 'error_recovered',
          errorType: 'NetworkError',
          recoveryTime: 5000,
        },
      });

      const errors = await aggregator.getErrorStats(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      const networkError = errors.find(e => e.errorType === 'NetworkError');

      expect(networkError?.recoveryRate).toBe(1.0); // 1 recovery / 1 error
    });

    it('should calculate average recovery time', async () => {
      // Add a recovery event
      mockEvents.push({
        id: 'event-8',
        type: 'error_recovered',
        category: 'error',
        timestamp: new Date(Date.now() - 200000).toISOString(),
        sessionId: 'session-1',
        data: {
          type: 'error_recovered',
          errorType: 'NetworkError',
          recoveryTime: 5000,
        },
      });

      const errors = await aggregator.getErrorStats(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      const networkError = errors.find(e => e.errorType === 'NetworkError');

      expect(networkError?.avgRecoveryTime).toBe(5000);
    });

    it('should sort by count descending', async () => {
      const errors = await aggregator.getErrorStats(
        {
          type: 'days',
          value: 1,
        },
        10
      );

      for (let i = 1; i < errors.length; i++) {
        expect(errors[i - 1].count).toBeGreaterThanOrEqual(errors[i].count);
      }
    });
  });

  // ==========================================================================
  // PERFORMANCE METRICS TESTS
  // ==========================================================================

  describe('getPerformanceMetrics()', () => {
    beforeEach(() => {
      // Add performance events
      const now = Date.now();
      mockEvents.push(
        {
          id: 'perf-1',
          type: 'api_response',
          category: 'performance',
          timestamp: new Date(now - 300000).toISOString(),
          sessionId: 'session-1',
          data: {
            type: 'api_response',
            endpoint: '/api/chat',
            duration: 500,
            success: true,
          },
        },
        {
          id: 'perf-2',
          type: 'api_response',
          category: 'performance',
          timestamp: new Date(now - 200000).toISOString(),
          sessionId: 'session-1',
          data: {
            type: 'api_response',
            endpoint: '/api/chat',
            duration: 600,
            success: true,
          },
        },
        {
          id: 'perf-3',
          type: 'api_response',
          category: 'performance',
          timestamp: new Date(now - 100000).toISOString(),
          sessionId: 'session-1',
          data: {
            type: 'api_response',
            endpoint: '/api/chat',
            duration: 700,
            success: false,
          },
        }
      );
    });

    it('should return performance metrics', async () => {
      const metrics = await aggregator.getPerformanceMetrics({
        type: 'days',
        value: 1,
      });

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toHaveProperty('category');
      expect(metrics[0]).toHaveProperty('avgDuration');
      expect(metrics[0]).toHaveProperty('p95Duration');
      expect(metrics[0]).toHaveProperty('p99Duration');
      expect(metrics[0]).toHaveProperty('successRate');
      expect(metrics[0]).toHaveProperty('totalOperations');
      expect(metrics[0]).toHaveProperty('trend');
    });

    it('should calculate average duration', async () => {
      const metrics = await aggregator.getPerformanceMetrics({
        type: 'days',
        value: 1,
      });

      const apiMetrics = metrics.find(m => m.category === '/api/chat');

      expect(apiMetrics?.avgDuration).toBeCloseTo(600, 0); // (500 + 600 + 700) / 3
    });

    it('should calculate success rate', async () => {
      const metrics = await aggregator.getPerformanceMetrics({
        type: 'days',
        value: 1,
      });

      const apiMetrics = metrics.find(m => m.category === '/api/chat');

      expect(apiMetrics?.successRate).toBeCloseTo(0.667, 1); // 2/3 successes
    });

    it('should calculate percentiles', async () => {
      const metrics = await aggregator.getPerformanceMetrics({
        type: 'days',
        value: 1,
      });

      const apiMetrics = metrics.find(m => m.category === '/api/chat');

      expect(apiMetrics?.p95Duration).toBeDefined();
      expect(apiMetrics?.p99Duration).toBeDefined();
    });

    it('should filter by category', async () => {
      const metrics = await aggregator.getPerformanceMetrics(
        {
          type: 'days',
          value: 1,
        },
        '/api/chat'
      );

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.every(m => m.category === '/api/chat')).toBe(true);
    });
  });

  // ==========================================================================
  // ENGAGEMENT SUMMARY TESTS
  // ==========================================================================

  describe('getEngagementSummary()', () => {
    it('should return engagement summary', async () => {
      const summary = await aggregator.getEngagementSummary({
        type: 'days',
        value: 1,
      });

      expect(summary).toHaveProperty('totalSessions');
      expect(summary).toHaveProperty('totalSessionTime');
      expect(summary).toHaveProperty('avgSessionDuration');
      expect(summary).toHaveProperty('avgMessagesPerSession');
      expect(summary).toHaveProperty('mostActiveDay');
      expect(summary).toHaveProperty('mostActiveHour');
      expect(summary).toHaveProperty('peakUsageHours');
      expect(summary).toHaveProperty('retentionRate');
    });

    it('should calculate total sessions', async () => {
      const summary = await aggregator.getEngagementSummary({
        type: 'days',
        value: 1,
      });

      expect(summary.totalSessions).toBe(1);
    });

    it('should calculate total session time', async () => {
      const summary = await aggregator.getEngagementSummary({
        type: 'days',
        value: 1,
      });

      expect(summary.totalSessionTime).toBe(7200); // From session_end event
    });

    it('should calculate average session duration', async () => {
      const summary = await aggregator.getEngagementSummary({
        type: 'days',
        value: 1,
      });

      expect(summary.avgSessionDuration).toBe(7200); // 7200 / 1 session
    });

    it('should calculate average messages per session', async () => {
      const summary = await aggregator.getEngagementSummary({
        type: 'days',
        value: 1,
      });

      expect(summary.avgMessagesPerSession).toBe(2); // 2 messages / 1 session
    });

    it('should identify most active hour', async () => {
      const summary = await aggregator.getEngagementSummary({
        type: 'days',
        value: 1,
      });

      expect(summary.mostActiveHour).toBeGreaterThanOrEqual(0);
      expect(summary.mostActiveHour).toBeLessThanOrEqual(23);
    });

    it('should return peak usage hours array', async () => {
      const summary = await aggregator.getEngagementSummary({
        type: 'days',
        value: 1,
      });

      expect(Array.isArray(summary.peakUsageHours)).toBe(true);
      expect(summary.peakUsageHours.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // PEAK USAGE HOURS TESTS
  // ==========================================================================

  describe('getPeakUsageHours()', () => {
    it('should return array of peak hours', async () => {
      const peakHours = await aggregator.getPeakUsageHours({
        type: 'days',
        value: 1,
      });

      expect(Array.isArray(peakHours)).toBe(true);
      expect(peakHours.length).toBeGreaterThan(0);
      expect(peakHours.every(h => h >= 0 && h <= 23)).toBe(true);
    });
  });

  // ==========================================================================
  // ERROR RATE TESTS
  // ==========================================================================

  describe('getErrorRate()', () => {
    it('should calculate error rate', async () => {
      const errorRate = await aggregator.getErrorRate('overall', {
        type: 'days',
        value: 1,
      });

      expect(errorRate).toHaveProperty('totalErrors');
      expect(errorRate).toHaveProperty('totalEvents');
      expect(errorRate).toHaveProperty('errorRate');
      expect(errorRate).toHaveProperty('errorTypes');
    });

    it('should count total errors', async () => {
      const errorRate = await aggregator.getErrorRate('overall', {
        type: 'days',
        value: 1,
      });

      expect(errorRate.totalErrors).toBe(1);
    });

    it('should count total events', async () => {
      const errorRate = await aggregator.getErrorRate('overall', {
        type: 'days',
        value: 1,
      });

      expect(errorRate.totalEvents).toBe(7);
    });

    it('should calculate error rate correctly', async () => {
      const errorRate = await aggregator.getErrorRate('overall', {
        type: 'days',
        value: 1,
      });

      expect(errorRate.errorRate).toBeCloseTo(0.143, 2); // 1 error / 7 events
    });

    it('should break down errors by type', async () => {
      const errorRate = await aggregator.getErrorRate('overall', {
        type: 'days',
        value: 1,
      });

      expect(errorRate.errorTypes['NetworkError']).toBe(1);
    });
  });

  // ==========================================================================
  // UTILITY FUNCTION TESTS
  // ==========================================================================

  describe('Utility Functions', () => {
    it('should calculate statistics for numeric values', async () => {
      // This is tested indirectly through getPerformanceMetrics
      const metrics = await aggregator.getPerformanceMetrics({
        type: 'days',
        value: 1,
      });

      const apiMetrics = metrics.find(m => m.category === '/api/chat');

      expect(apiMetrics?.avgDuration).toBeDefined();
      expect(apiMetrics?.p95Duration).toBeDefined();
    });

    it('should bucket timestamps correctly', async () => {
      const series = await aggregator.getTimeSeries(
        {
          type: 'days',
          value: 1,
        },
        'day'
      );

      // All timestamps should be bucketed to start of day
      series.forEach(point => {
        const date = new Date(point.timestamp);
        expect(date.getHours()).toBe(0);
        expect(date.getMinutes()).toBe(0);
        expect(date.getSeconds()).toBe(0);
      });
    });

    it('should calculate trend direction', async () => {
      const metrics = await aggregator.getPerformanceMetrics({
        type: 'days',
        value: 1,
      });

      metrics.forEach(metric => {
        expect(['increasing', 'decreasing', 'stable']).toContain(metric.trend);
      });
    });
  });
});
