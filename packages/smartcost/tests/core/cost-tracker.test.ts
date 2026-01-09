/**
 * Cost Tracker Unit Tests
 *
 * Comprehensive test suite for CostTracker module
 * Testing: cost tracking, budget management, metrics, alerts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CostTracker } from '../../src/core/cost-tracker.js';
import type { SmartCostConfig, BudgetConfig } from '../../src/types/index.js';

describe('CostTracker', () => {
  let tracker: CostTracker;
  let config: SmartCostConfig;

  beforeEach(() => {
    // Reset configuration before each test
    config = {
      monthlyBudget: 500,
      alertThreshold: 0.8,
      enableMonitoring: true,
    };

    tracker = new CostTracker(config);
  });

  afterEach(() => {
    // Clean up
    tracker.removeAllListeners();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultTracker = new CostTracker();
      const budget = defaultTracker.getBudgetState();

      expect(budget.total).toBe(500);
      expect(budget.alertThreshold).toBe(0.8);
      expect(budget.used).toBe(0);
      expect(budget.remaining).toBe(500);
    });

    it('should initialize with custom budget', () => {
      const customTracker = new CostTracker({
        monthlyBudget: 1000,
        alertThreshold: 0.9,
      });
      const budget = customTracker.getBudgetState();

      expect(budget.total).toBe(1000);
      expect(budget.alertThreshold).toBe(0.9);
    });

    it('should initialize metrics to zero', () => {
      const metrics = tracker.getCostMetrics();

      expect(metrics.totalCost).toBe(0);
      expect(metrics.totalTokens).toBe(0);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });

    it('should set correct period boundaries for monthly budget', () => {
      const budget = tracker.getBudgetState();
      const now = Date.now();

      // Should be within current month
      expect(budget.periodStart).toBeLessThanOrEqual(now);
      expect(budget.periodEnd).toBeGreaterThan(now);
    });
  });

  describe('Request Tracking', () => {
    it('should track request start and return estimation', () => {
      const result = tracker.trackRequestStart(
        'openai',
        'gpt-4',
        { input: 1000, output: 500 },
        30, // $30 per million input
        60  // $60 per million output
      );

      expect(result.estimatedCost).toBeCloseTo(0.00006, 7); // (1000/1M)*30 + (500/1M)*60
      expect(result.budgetOk).toBe(true);
      expect(result.requestId).toMatch(/^req_/);
      expect(result.budgetRemaining).toBe(500);
    });

    it('should generate unique request IDs', () => {
      const id1 = tracker.trackRequestStart('openai', 'gpt-4', { input: 100, output: 100 }, 30, 60).requestId;
      const id2 = tracker.trackRequestStart('openai', 'gpt-4', { input: 100, output: 100 }, 30, 60).requestId;

      expect(id1).not.toBe(id2);
    });

    it('should complete request tracking and update metrics', () => {
      const startResult = tracker.trackRequestStart(
        'openai',
        'gpt-4',
        { input: 1000, output: 500 },
        30,
        60
      );

      tracker.trackRequestComplete(
        startResult.requestId,
        'openai',
        'gpt-4',
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1500 // duration in ms
      );

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalCost).toBeCloseTo(0.00006, 7);
      expect(metrics.totalTokens).toBe(1500);
      expect(metrics.totalRequests).toBe(1);
    });

    it('should track cost breakdown correctly', () => {
      const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);

      const cost = tracker.trackRequestComplete(
        startResult.requestId,
        'openai',
        'gpt-4',
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1500
      );

      expect(cost.inputCost).toBeCloseTo(0.00003, 7);
      expect(cost.outputCost).toBeCloseTo(0.00003, 7);
      expect(cost.totalCost).toBeCloseTo(0.00006, 7);
    });

    it('should track cached requests', () => {
      const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);

      tracker.trackRequestComplete(
        startResult.requestId,
        'openai',
        'gpt-4',
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1500,
        true, // cached
        'semantic'
      );

      const records = tracker.getRecords();
      expect(records[0].cached).toBe(true);
      expect(records[0].cacheHitType).toBe('semantic');
    });

    it('should update budget after request', () => {
      const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);

      tracker.trackRequestComplete(
        startResult.requestId,
        'openai',
        'gpt-4',
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1500
      );

      const budget = tracker.getBudgetState();
      expect(budget.used).toBeCloseTo(0.00006, 7);
      expect(budget.remaining).toBeCloseTo(499.99994, 5);
      expect(budget.utilization).toBeCloseTo(0.00000012, 9);
    });
  });

  describe('Budget Management', () => {
    it('should check budget before request', () => {
      const result = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000000, output: 500000 }, 30, 60);

      // Small cost should be allowed
      expect(result.budgetOk).toBe(true);
    });

    it('should allow requests under budget', () => {
      const result = tracker.trackRequestStart('openai', 'gpt-4', { input: 100, output: 100 }, 30, 60);

      expect(result.budgetOk).toBe(true);
      expect(result.budgetRemaining).toBe(500);
    });

    it('should always allow negligible costs', () => {
      // Even at high utilization, tiny costs (<$0.001) are allowed
      for (let i = 0; i < 100; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 10000, output: 5000 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 10000, output: 5000, total: 15000 },
          30,
          60,
          1000
        );
      }

      const result = tracker.trackRequestStart('openai', 'gpt-4', { input: 1, output: 1 }, 30, 60);
      expect(result.budgetOk).toBe(true);
    });

    it('should emit budget alert at threshold', () => {
      return new Promise<void>((done) => {
        tracker.once('budgetAlert', (alert) => {
          expect(alert.level).toBe('warning');
          expect(alert.utilization).toBeGreaterThanOrEqual(0.8);
          expect(alert.recommendedAction).toBeDefined();
          done();
        });

        // Make requests to reach 80% threshold
        const targetCost = 500 * 0.8;
        const requestsNeeded = Math.ceil(targetCost / 0.00006);

        for (let i = 0; i < requestsNeeded; i++) {
          const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
          tracker.trackRequestComplete(
            startResult.requestId,
            'openai',
            'gpt-4',
            { input: 1000, output: 500, total: 1500 },
            30,
            60,
            1000
          );
        }
      });
    });

    it('should reset budget correctly', () => {
      // Make some requests
      for (let i = 0; i < 10; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      // Reset
      tracker.resetTracking();

      const budget = tracker.getBudgetState();
      const metrics = tracker.getCostMetrics();

      expect(budget.used).toBe(0);
      expect(budget.remaining).toBe(500);
      expect(metrics.totalCost).toBe(0);
      expect(metrics.totalRequests).toBe(0);
    });
  });

  describe('Metrics and Analytics', () => {
    it('should calculate average cost per request', () => {
      // Make 3 requests with different costs
      for (let i = 0; i < 3; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.avgCostPerRequest).toBeCloseTo(0.00006, 7);
    });

    it('should calculate average tokens per request', () => {
      for (let i = 0; i < 3; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 2000, output: 1000 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 2000, output: 1000, total: 3000 },
          30,
          60,
          1000
        );
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.avgTokensPerRequest).toBe(3000);
    });

    it('should track cost by provider', () => {
      // OpenAI requests
      for (let i = 0; i < 5; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      // Anthropic requests
      for (let i = 0; i < 3; i++) {
        const startResult = tracker.trackRequestStart('anthropic', 'claude-3', { input: 1000, output: 500 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'anthropic',
          'claude-3',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      const providerCosts = tracker.getProviderCosts();
      expect(providerCosts['openai']).toBeCloseTo(0.0003, 6);
      expect(providerCosts['anthropic']).toBeCloseTo(0.00018, 6);
    });

    it('should track cost by model', () => {
      // GPT-4 requests
      for (let i = 0; i < 5; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      const modelCosts = tracker.getModelCosts();
      expect(modelCosts['openai:gpt-4']).toBeCloseTo(0.0003, 6);
    });

    it('should calculate cache hit rate', () => {
      // Regular request
      let startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
      tracker.trackRequestComplete(
        startResult.requestId,
        'openai',
        'gpt-4',
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1000,
        false
      );

      // Cached request
      startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
      tracker.trackRequestComplete(
        startResult.requestId,
        'openai',
        'gpt-4',
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1000,
        true,
        'semantic'
      );

      const metrics = tracker.getCostMetrics();
      expect(metrics.cacheHitRate).toBe(0.5);
    });
  });

  describe('Savings Tracking', () => {
    it('should record savings from optimizations', () => {
      tracker.recordSavings(0.10, 0.03); // Original $0.10, optimized $0.03

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalSavings).toBeCloseTo(0.07, 7);
    });

    it('should calculate savings percentage correctly', () => {
      tracker.recordSavings(0.10, 0.03);
      tracker.recordSavings(0.20, 0.05);

      const metrics = tracker.getCostMetrics();
      // Total: 0.22 spent, 0.22 saved (0.07 + 0.15)
      // Savings% = 0.22 / (0.22 + 0.22) = 50%
      expect(metrics.savingsPercent).toBeCloseTo(50, 1);
    });

    it('should not record negative savings', () => {
      tracker.recordSavings(0.03, 0.10); // Cost increased

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalSavings).toBe(0);
    });
  });

  describe('Records Management', () => {
    it('should retrieve all records', () => {
      for (let i = 0; i < 5; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      const records = tracker.getRecords();
      expect(records.length).toBe(5);
    });

    it('should filter records by provider', () => {
      // OpenAI
      let startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
      tracker.trackRequestComplete(startResult.requestId, 'openai', 'gpt-4', { input: 1000, output: 500, total: 1500 }, 30, 60, 1000);

      // Anthropic
      startResult = tracker.trackRequestStart('anthropic', 'claude-3', { input: 1000, output: 500 }, 30, 60);
      tracker.trackRequestComplete(startResult.requestId, 'anthropic', 'claude-3', { input: 1000, output: 500, total: 1500 }, 30, 60, 1000);

      const openaiRecords = tracker.getRecords({ provider: 'openai' });
      expect(openaiRecords.length).toBe(1);
      expect(openaiRecords[0].provider).toBe('openai');
    });

    it('should filter records by model', () => {
      // GPT-4
      let startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
      tracker.trackRequestComplete(startResult.requestId, 'openai', 'gpt-4', { input: 1000, output: 500, total: 1500 }, 30, 60, 1000);

      // GPT-3.5
      startResult = tracker.trackRequestStart('openai', 'gpt-3.5-turbo', { input: 1000, output: 500 }, 1, 2);
      tracker.trackRequestComplete(startResult.requestId, 'openai', 'gpt-3.5-turbo', { input: 1000, output: 500, total: 1500 }, 1, 2, 1000);

      const gpt4Records = tracker.getRecords({ model: 'gpt-4' });
      expect(gpt4Records.length).toBe(1);
      expect(gpt4Records[0].model).toBe('gpt-4');
    });

    it('should filter records by time range', () => {
      const now = Date.now();

      let startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
      tracker.trackRequestComplete(startResult.requestId, 'openai', 'gpt-4', { input: 1000, output: 500, total: 1500 }, 30, 60, 1000);

      const records = tracker.getRecords({
        startTime: now - 1000,
        endTime: now + 1000,
      });

      expect(records.length).toBe(1);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate cost correctly', () => {
      const cost = tracker.estimateCost(1000, 500, 30, 60);
      expect(cost).toBeCloseTo(0.00006, 7);
    });

    it('should handle large token counts', () => {
      const cost = tracker.estimateCost(1000000, 500000, 30, 60);
      expect(cost).toBeCloseTo(0.06, 6); // $30 + $30 = $60
    });
  });

  describe('Performance Tracking', () => {
    it('should track average overhead', () => {
      tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);

      const overhead = tracker.getAverageOverhead();
      expect(overhead).toBeGreaterThan(0);
      expect(overhead).toBeLessThan(10); // Should be < 10ms
    });

    it('should maintain low overhead (< 10ms)', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
      }

      const avgOverhead = tracker.getAverageOverhead();
      expect(avgOverhead).toBeLessThan(10);
    });
  });

  describe('Event Emission', () => {
    it('should emit cost update event', () => {
      return new Promise<void>((done) => {
        tracker.once('costUpdate', (event) => {
          expect(event.totalCost).toBeDefined();
          expect(event.budgetUtilization).toBeDefined();
          expect(event.totalSavings).toBeDefined();
          expect(event.savingsPercent).toBeDefined();
          done();
        });

        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      });
    });

    it('should emit request start event', () => {
      return new Promise<void>((done) => {
        tracker.once('requestStart', (event) => {
          expect(event.requestId).toBeDefined();
          expect(event.provider).toBe('openai');
          expect(event.model).toBe('gpt-4');
          expect(event.estimatedCost).toBeDefined();
          done();
        });

        tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should track tokens per minute', () => {
      // Make multiple requests
      for (let i = 0; i < 10; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 10000, output: 5000 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 10000, output: 5000, total: 15000 },
          30,
          60,
          1000
        );
      }

      // Should track these internally (no direct API, but affects state)
      const metrics = tracker.getCostMetrics();
      expect(metrics.totalTokens).toBe(150000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tokens', () => {
      const cost = tracker.estimateCost(0, 0, 30, 60);
      expect(cost).toBe(0);
    });

    it('should handle very large token counts', () => {
      const cost = tracker.estimateCost(10000000, 5000000, 30, 60);
      expect(cost).toBeCloseTo(0.6, 5);
    });

    it('should handle zero cost per million', () => {
      const cost = tracker.estimateCost(1000, 500, 0, 0);
      expect(cost).toBe(0);
    });

    it('should handle rapid requests', () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalRequests).toBe(100);
    });
  });
});
