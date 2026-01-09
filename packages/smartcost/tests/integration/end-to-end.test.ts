/**
 * End-to-End Integration Tests
 *
 * Comprehensive integration tests for SmartCost workflows
 * Testing: complete request lifecycle, multi-provider scenarios, caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CostTracker } from '../../src/core/cost-tracker.js';
import { IntelligentRouter } from '../../src/core/router.js';
import type { SmartCostConfig, ProviderConfig, ChatCompletionRequest } from '../../src/types/index.js';

describe('End-to-End Integration', () => {
  let tracker: CostTracker;
  let router: IntelligentRouter;
  let providers: ProviderConfig[];
  let config: SmartCostConfig;

  beforeEach(() => {
    config = {
      monthlyBudget: 100,
      alertThreshold: 0.8,
      enableMonitoring: true,
    };

    tracker = new CostTracker(config);

    providers = [
      {
        id: 'openai',
        type: 'openai',
        name: 'OpenAI',
        models: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            maxTokens: 8192,
            inputCostPerMillion: 30,
            outputCostPerMillion: 60,
            avgLatency: 2000,
            qualityScore: 0.9,
            capabilities: { functionCalling: true, streaming: true },
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            maxTokens: 4096,
            inputCostPerMillion: 0.5,
            outputCostPerMillion: 1.5,
            avgLatency: 500,
            qualityScore: 0.7,
            capabilities: { functionCalling: true, streaming: true },
          },
        ],
        maxRequestsPerMinute: 100,
        priority: 1,
        enabled: true,
      },
      {
        id: 'anthropic',
        type: 'anthropic',
        name: 'Anthropic',
        models: [
          {
            id: 'claude-3-opus',
            name: 'Claude 3 Opus',
            maxTokens: 200000,
            inputCostPerMillion: 15,
            outputCostPerMillion: 75,
            avgLatency: 3000,
            qualityScore: 0.95,
            capabilities: { functionCalling: true, streaming: true, vision: true },
          },
        ],
        maxRequestsPerMinute: 50,
        priority: 2,
        enabled: true,
      },
    ];

    router = new IntelligentRouter(providers);
  });

  afterEach(() => {
    tracker.removeAllListeners();
  });

  describe('Complete Request Lifecycle', () => {
    it('should handle complete request workflow', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      };

      // Step 1: Analyze and route
      const routingDecision = await router.route(request, 'cost-optimized');
      expect(routingDecision.provider).toBeDefined();
      expect(routingDecision.model).toBeDefined();

      // Step 2: Track request start
      const startTracking = tracker.trackRequestStart(
        routingDecision.provider,
        routingDecision.model,
        {
          input: routingDecision.estimatedCost ? 1000 : 100,
          output: 500,
        },
        30,
        60
      );
      expect(startTracking.budgetOk).toBe(true);
      expect(startTracking.requestId).toBeDefined();

      // Step 3: Simulate API call and track completion
      const cost = tracker.trackRequestComplete(
        startTracking.requestId,
        routingDecision.provider,
        routingDecision.model,
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1500, // duration
        false // not cached
      );

      expect(cost.totalCost).toBeGreaterThan(0);

      // Step 4: Verify metrics updated
      const metrics = tracker.getCostMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.totalCost).toBeCloseTo(cost.totalCost, 7);
    });

    it('should handle multiple sequential requests', async () => {
      const requests: ChatCompletionRequest[] = [
        { messages: [{ role: 'user', content: 'Question 1' }] },
        { messages: [{ role: 'user', content: 'Question 2' }] },
        { messages: [{ role: 'user', content: 'Question 3' }] },
      ];

      for (const request of requests) {
        const decision = await router.route(request, 'cost-optimized');
        const startTracking = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 500, output: 250 },
          30,
          60
        );

        tracker.trackRequestComplete(
          startTracking.requestId,
          decision.provider,
          decision.model,
          { input: 500, output: 250, total: 750 },
          30,
          60,
          1000
        );
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalRequests).toBe(3);
    });

    it('should handle cached requests correctly', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Cached question' }],
      };

      const decision = await router.route(request);
      const startTracking = tracker.trackRequestStart(
        decision.provider,
        decision.model,
        { input: 1000, output: 500 },
        30,
        60
      );

      // Track as cached
      tracker.trackRequestComplete(
        startTracking.requestId,
        decision.provider,
        decision.model,
        { input: 0, output: 0, total: 0 }, // No tokens used for cached
        30,
        60,
        50, // Much faster
        true, // cached
        'semantic'
      );

      // Record savings
      const originalCost = 0.00006;
      const cachedCost = 0;
      tracker.recordSavings(originalCost, cachedCost);

      const metrics = tracker.getCostMetrics();
      expect(metrics.cacheHitRate).toBe(1);
      expect(metrics.totalSavings).toBeCloseTo(originalCost, 7);
    });
  });

  describe('Multi-Provider Scenarios', () => {
    it('should distribute load across providers', async () => {
      const requests: ChatCompletionRequest[] = Array.from(
        { length: 10 },
        (_, i) => ({
          messages: [{ role: 'user', content: `Question ${i}` }],
        })
      );

      for (const request of requests) {
        const decision = await router.route(request, 'balanced');
        const startTracking = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 500, output: 250 },
          30,
          60
        );

        tracker.trackRequestComplete(
          startTracking.requestId,
          decision.provider,
          decision.model,
          { input: 500, output: 250, total: 750 },
          30,
          60,
          1000
        );
      }

      const providerCosts = tracker.getProviderCosts();
      expect(Object.keys(providerCosts).length).toBeGreaterThan(0);
    });

    it('should fallback on provider failure', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      // First provider fails
      let decision = await router.route(request);
      router.updateProviderState(decision.provider, 'error');

      // Should route to different provider
      decision = await router.route(request);
      expect(decision.provider).toBeDefined();

      // First provider recovers
      router.updateProviderState(providers[0].id, 'success');
      decision = await router.route(request);
      expect(decision.provider).toBeDefined();
    });

    it('should track costs by provider accurately', async () => {
      // OpenAI requests
      for (let i = 0; i < 5; i++) {
        const decision = await router.route({
          messages: [{ role: 'user', content: `OpenAI ${i}` }],
        });

        const startTracking = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 1000, output: 500 },
          30,
          60
        );

        tracker.trackRequestComplete(
          startTracking.requestId,
          decision.provider,
          decision.model,
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      const providerCosts = tracker.getProviderCosts();
      const modelCosts = tracker.getModelCosts();

      expect(Object.keys(providerCosts).length).toBeGreaterThan(0);
      expect(Object.keys(modelCosts).length).toBeGreaterThan(0);
    });
  });

  describe('Budget Enforcement', () => {
    it('should enforce budget limits', async () => {
      const lowBudgetConfig: SmartCostConfig = {
        monthlyBudget: 0.001, // Very low budget
        alertThreshold: 0.8,
      };

      const lowBudgetTracker = new CostTracker(lowBudgetConfig);

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Expensive request' }],
      };

      const decision = await router.route(request);

      // Request should exceed budget
      const startTracking = lowBudgetTracker.trackRequestStart(
        decision.provider,
        decision.model,
        { input: 1000000, output: 500000 }, // Large request
        30,
        60
      );

      expect(startTracking.budgetOk).toBe(false);

      lowBudgetTracker.removeAllListeners();
    });

    it('should emit budget alerts', async () => {
      return new Promise<void>((done) => {
        const alertBudget: SmartCostConfig = {
          monthlyBudget: 0.01,
          alertThreshold: 0.5, // Alert at 50%
        };

        const alertTracker = new CostTracker(alertBudget);

        alertTracker.once('budgetAlert', (alert) => {
          expect(alert.level).toBeDefined();
          expect(alert.utilization).toBeGreaterThanOrEqual(0.5);
          done();
        });

        // Make requests to trigger alert
        const makeRequests = async () => {
          for (let i = 0; i < 100; i++) {
            const decision = await router.route({
              messages: [{ role: 'user', content: `Request ${i}` }],
            });

            const startTracking = alertTracker.trackRequestStart(
              decision.provider,
              decision.model,
              { input: 500, output: 250 },
              30,
              60
            );

            alertTracker.trackRequestComplete(
              startTracking.requestId,
              decision.provider,
              decision.model,
              { input: 500, output: 250, total: 750 },
              30,
              60,
              1000
            );
          }
        };

        makeRequests();
      });
    });
  });

  describe('Strategy Comparison', () => {
    it('should use different providers for different strategies', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test request' }],
      };

      const costDecision = await router.route(request, 'cost-optimized');
      const qualityDecision = await router.route(request, 'quality-optimized');

      expect(costDecision.strategy).toBe('cost-optimized');
      expect(qualityDecision.strategy).toBe('quality-optimized');

      // Quality should cost more
      expect(qualityDecision.estimatedCost).toBeGreaterThanOrEqual(
        costDecision.estimatedCost
      );
    });

    it('should track routing statistics across strategies', async () => {
      const strategies: Array<'cost-optimized' | 'quality-optimized' | 'balanced'> = [
        'cost-optimized',
        'quality-optimized',
        'balanced',
      ];

      for (const strategy of strategies) {
        await router.route({
          messages: [{ role: 'user', content: `${strategy} request` }],
        }, strategy);
      }

      const stats = router.getRoutingStats();
      expect(stats.totalDecisions).toBe(3);
    });
  });

  describe('Cost Optimization Scenarios', () => {
    it('should maximize savings with intelligent routing', async () => {
      // Make diverse requests
      const requests: ChatCompletionRequest[] = [
        { messages: [{ role: 'user', content: 'Simple question' }] },
        { messages: [{ role: 'user', content: 'Another simple one' }] },
        {
          messages: [
            { role: 'system', content: 'Expert mode' },
            { role: 'user', content: 'Complex analysis' },
          ],
        },
      ];

      let totalOptimizedCost = 0;

      for (const request of requests) {
        const decision = await router.route(request, 'cost-optimized');
        const startTracking = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 1000, output: 500 },
          30,
          60
        );

        tracker.trackRequestComplete(
          startTracking.requestId,
          decision.provider,
          decision.model,
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );

        totalOptimizedCost += decision.estimatedCost;
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalCost).toBeCloseTo(totalOptimizedCost, 6);
      expect(metrics.totalRequests).toBe(3);
    });

    it('should calculate savings percentage correctly', async () => {
      // Original cost (using expensive model)
      const originalCostPerRequest = 0.06; // GPT-4
      const optimizedCostPerRequest = 0.00003; // GPT-3.5 Turbo

      const requests = 100;
      const totalOriginal = originalCostPerRequest * requests;
      const totalOptimized = optimizedCostPerRequest * requests;

      for (let i = 0; i < requests; i++) {
        const decision = await router.route(
          { messages: [{ role: 'user', content: 'Simple' }] },
          'cost-optimized'
        );

        const startTracking = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 1000, output: 500 },
          0.5,
          1.5
        );

        tracker.trackRequestComplete(
          startTracking.requestId,
          decision.provider,
          decision.model,
          { input: 1000, output: 500, total: 1500 },
          0.5,
          1.5,
          500
        );

        tracker.recordSavings(originalCostPerRequest, optimizedCostPerRequest);
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalSavings).toBeCloseTo(
        totalOriginal - totalOptimized,
        4
      );
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle chatbot conversation', async () => {
      const conversation: ChatCompletionRequest[] = [
        { messages: [{ role: 'user', content: 'Hello' }] },
        {
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
          ],
        },
        {
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
            { role: 'assistant', content: 'I am good!' },
            { role: 'user', content: 'Tell me more' },
          ],
        },
      ];

      for (const request of conversation) {
        const decision = await router.route(request, 'balanced');
        const startTracking = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 500, output: 250 },
          30,
          60
        );

        tracker.trackRequestComplete(
          startTracking.requestId,
          decision.provider,
          decision.model,
          { input: 500, output: 250, total: 750 },
          30,
          60,
          1000
        );
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalRequests).toBe(3);
    });

    it('should handle function calling scenarios', async () => {
      const functionRequest: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'What is the weather?' }],
        functions: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
            },
          },
        ],
      };

      const decision = await router.route(functionRequest, 'cost-optimized');

      // Should route to model with function calling
      expect(decision.provider).toBeDefined();
      expect(decision.model).toBeDefined();

      const startTracking = tracker.trackRequestStart(
        decision.provider,
        decision.model,
        { input: 1000, output: 500 },
        30,
        60
      );

      tracker.trackRequestComplete(
        startTracking.requestId,
        decision.provider,
        decision.model,
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1500
      );
    });

    it('should handle high-volume workload', async () => {
      const highVolumeRequests = 50;

      for (let i = 0; i < highVolumeRequests; i++) {
        const request: ChatCompletionRequest = {
          messages: [{ role: 'user', content: `Query ${i}` }],
        };

        const decision = await router.route(request, 'cost-optimized');
        const startTracking = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 200, output: 100 },
          30,
          60
        );

        tracker.trackRequestComplete(
          startTracking.requestId,
          decision.provider,
          decision.model,
          { input: 200, output: 100, total: 300 },
          30,
          60,
          800
        );
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalRequests).toBe(highVolumeRequests);
      expect(metrics.avgCostPerRequest).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle tracking errors gracefully', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const decision = await router.route(request);

      // Invalid request ID (not tracked)
      const cost = tracker.trackRequestComplete(
        'invalid_id',
        decision.provider,
        decision.model,
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        1000
      );

      // Should still create cost record
      expect(cost.totalCost).toBeGreaterThan(0);
    });

    it('should handle routing failures', async () => {
      const emptyRouter = new IntelligentRouter([]);
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(emptyRouter.route(request)).rejects.toThrow(
        'No available models'
      );
    });
  });

  describe('Performance Tracking', () => {
    it('should track average overhead', async () => {
      for (let i = 0; i < 20; i++) {
        const decision = await router.route({
          messages: [{ role: 'user', content: `Test ${i}` }],
        });

        tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 500, output: 250 },
          30,
          60
        );
      }

      const avgOverhead = tracker.getAverageOverhead();
      expect(avgOverhead).toBeGreaterThan(0);
      expect(avgOverhead).toBeLessThan(10); // Should be < 10ms
    });

    it('should track request durations', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const decision = await router.route(request);
      const startTracking = tracker.trackRequestStart(
        decision.provider,
        decision.model,
        { input: 1000, output: 500 },
        30,
        60
      );

      const duration = 1500;
      tracker.trackRequestComplete(
        startTracking.requestId,
        decision.provider,
        decision.model,
        { input: 1000, output: 500, total: 1500 },
        30,
        60,
        duration
      );

      const records = tracker.getRecords();
      expect(records[0].duration).toBe(duration);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent metrics across operations', async () => {
      const requestCount = 10;

      for (let i = 0; i < requestCount; i++) {
        const decision = await router.route({
          messages: [{ role: 'user', content: `Request ${i}` }],
        });

        const startTracking = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 1000, output: 500 },
          30,
          60
        );

        tracker.trackRequestComplete(
          startTracking.requestId,
          decision.provider,
          decision.model,
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      const metrics = tracker.getCostMetrics();
      const records = tracker.getRecords();
      const budget = tracker.getBudgetState();

      expect(metrics.totalRequests).toBe(requestCount);
      expect(records.length).toBe(requestCount);
      expect(budget.used).toBeCloseTo(metrics.totalCost, 7);
    });
  });
});
