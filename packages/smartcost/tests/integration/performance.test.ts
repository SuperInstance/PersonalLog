/**
 * Performance and Load Tests
 *
 * Performance benchmarks and load testing for SmartCost
 * Testing: throughput, latency, resource usage, high-volume scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CostTracker } from '../../src/core/cost-tracker.js';
import { IntelligentRouter } from '../../src/core/router.js';
import type { ProviderConfig, ChatCompletionRequest } from '../../src/types/index.js';

describe('Performance Tests', () => {
  let tracker: CostTracker;
  let router: IntelligentRouter;
  let providers: ProviderConfig[];

  beforeAll(() => {
    tracker = new CostTracker({
      monthlyBudget: 1000,
      alertThreshold: 0.8,
      enableMonitoring: false, // Disable for performance
    });

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
        maxRequestsPerMinute: 1000,
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
        maxRequestsPerMinute: 500,
        priority: 2,
        enabled: true,
      },
      {
        id: 'ollama',
        type: 'ollama',
        name: 'Ollama',
        models: [
          {
            id: 'llama2',
            name: 'Llama 2',
            maxTokens: 4096,
            inputCostPerMillion: 0,
            outputCostPerMillion: 0,
            avgLatency: 5000,
            qualityScore: 0.6,
            capabilities: {},
          },
        ],
        maxRequestsPerMinute: 100,
        priority: 3,
        enabled: true,
      },
    ];

    router = new IntelligentRouter(providers);
  });

  describe('Cost Tracking Performance', () => {
    it('should track requests with < 10ms overhead', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(10);
    });

    it('should complete tracking with < 10ms overhead', () => {
      const iterations = 1000;
      const startResults = [];

      // Generate request IDs
      for (let i = 0; i < iterations; i++) {
        startResults.push(
          tracker.trackRequestStart('openai', 'gpt-4', { input: 1000, output: 500 }, 30, 60)
        );
      }

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        tracker.trackRequestComplete(
          startResults[i].requestId,
          'openai',
          'gpt-4',
          { input: 1000, output: 500, total: 1500 },
          30,
          60,
          1000
        );
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(10);
    });

    it('should handle rapid sequential requests', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 500, output: 250 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 500, output: 250, total: 750 },
          30,
          60,
          500
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      expect(avgTime).toBeLessThan(15); // Including both start and complete
    });

    it('should maintain performance with large record sets', () => {
      // Add 10,000 records
      for (let i = 0; i < 10000; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 500, output: 250 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 500, output: 250, total: 750 },
          30,
          60,
          500
        );
      }

      const startTime = performance.now();
      const metrics = tracker.getCostMetrics();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Metrics retrieval should be fast
      expect(metrics.totalRequests).toBe(10000);
    });
  });

  describe('Routing Performance', () => {
    it('should route requests quickly', async () => {
      const iterations = 100;
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test request' }],
      };

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await router.route(request, 'cost-optimized');
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(50); // Each route should be fast
    });

    it('should analyze queries quickly', async () => {
      const iterations = 1000;
      const request: ChatCompletionRequest = {
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'What is AI?' },
        ],
      };

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        router.analyzeQuery(request);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(5); // Analysis should be very fast
    });

    it('should get available options quickly', async () => {
      const iterations = 1000;
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const analysis = router.analyzeQuery(request);
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        router.getAvailableOptions(analysis);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(5);
    });
  });

  describe('Load Testing', () => {
    it('should handle 1000+ requests per minute', async () => {
      const targetRPM = 1000; // requests per minute
      const requestsPerSecond = targetRPM / 60;
      const totalRequests = targetRPM;

      const startTime = Date.now();
      let completedRequests = 0;

      for (let i = 0; i < totalRequests; i++) {
        const request: ChatCompletionRequest = {
          messages: [{ role: 'user', content: `Load test request ${i}` }],
        };

        // Route
        const decision = await router.route(request, 'cost-optimized');

        // Track
        const startResult = tracker.trackRequestStart(
          decision.provider,
          decision.model,
          { input: 200, output: 100 },
          30,
          60
        );

        tracker.trackRequestComplete(
          startResult.requestId,
          decision.provider,
          decision.model,
          { input: 200, output: 100, total: 300 },
          30,
          60,
          500
        );

        completedRequests++;

        // Throttle to target rate if needed
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const expectedRequests = elapsedSeconds * requestsPerSecond;
        if (completedRequests > expectedRequests) {
          await new Promise(resolve =>
            setTimeout(resolve, ((completedRequests / requestsPerSecond) - elapsedSeconds) * 1000)
          );
        }
      }

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      const actualRPM = (completedRequests / totalTime) * 60;

      expect(completedRequests).toBe(totalRequests);
      expect(actualRPM).toBeGreaterThanOrEqual(targetRPM * 0.9); // Within 10% of target
    });

    it('should handle burst traffic', async () => {
      const burstSize = 100;
      const bursts = 10;

      for (let b = 0; b < bursts; b++) {
        const startTime = performance.now();

        // Process burst
        for (let i = 0; i < burstSize; i++) {
          const request: ChatCompletionRequest = {
            messages: [{ role: 'user', content: `Burst ${b} request ${i}` }],
          };

          const decision = await router.route(request);
          const startResult = tracker.trackRequestStart(
            decision.provider,
            decision.model,
            { input: 500, output: 250 },
            30,
            60
          );

          tracker.trackRequestComplete(
            startResult.requestId,
            decision.provider,
            decision.model,
            { input: 500, output: 250, total: 750 },
            30,
            60,
            1000
          );
        }

        const endTime = performance.now();
        const burstTime = endTime - startTime;

        // Each burst should complete quickly
        expect(burstTime).toBeLessThan(5000); // 5 seconds for 100 requests

        // Small pause between bursts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const metrics = tracker.getCostMetrics();
      expect(metrics.totalRequests).toBe(burstSize * bursts);
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 5; // seconds
      const targetRPS = 50; // requests per second
      const totalRequests = duration * targetRPS;

      const startTime = Date.now();
      let requestCount = 0;

      while (requestCount < totalRequests) {
        const loopStart = Date.now();

        // Process batch
        const batchSize = 10;
        for (let i = 0; i < batchSize && requestCount < totalRequests; i++) {
          const request: ChatCompletionRequest = {
            messages: [{ role: 'user', content: `Request ${requestCount}` }],
          };

          const decision = await router.route(request);
          const startResult = tracker.trackRequestStart(
            decision.provider,
            decision.model,
            { input: 300, output: 150 },
            30,
            60
          );

          tracker.trackRequestComplete(
            startResult.requestId,
            decision.provider,
            decision.model,
            { input: 300, output: 150, total: 450 },
            30,
            60,
            800
          );

          requestCount++;
        }

        // Maintain target rate
        const elapsed = (Date.now() - loopStart) / 1000;
        const expectedTime = batchSize / targetRPS;
        if (elapsed < expectedTime) {
          await new Promise(resolve => setTimeout(resolve, (expectedTime - elapsed) * 1000));
        }
      }

      const endTime = Date.now();
      const actualDuration = (endTime - startTime) / 1000;

      expect(requestCount).toBe(totalRequests);
      expect(actualDuration).toBeLessThanOrEqual(duration * 1.1); // Within 10% of target
    });
  });

  describe('Memory Efficiency', () => {
    it('should limit record storage', () => {
      // Add way more than 10,000 records
      const recordCount = 15000;

      for (let i = 0; i < recordCount; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 500, output: 250 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 500, output: 250, total: 750 },
          30,
          60,
          500
        );
      }

      const records = tracker.getRecords();
      expect(records.length).toBeLessThanOrEqual(10000); // Should limit to 10,000
    });

    it('should efficiently filter large datasets', () => {
      // Add 5,000 records
      for (let i = 0; i < 5000; i++) {
        const provider = i % 2 === 0 ? 'openai' : 'anthropic';
        const startResult = tracker.trackRequestStart(provider, 'gpt-4', { input: 500, output: 250 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          provider,
          'gpt-4',
          { input: 500, output: 250, total: 750 },
          30,
          60,
          500
        );
      }

      const startTime = performance.now();
      const openaiRecords = tracker.getRecords({ provider: 'openai' });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Fast filtering
      expect(openaiRecords.length).toBe(2500);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent routing requests', async () => {
      const concurrentRequests = 50;
      const requests: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const request: ChatCompletionRequest = {
          messages: [{ role: 'user', content: `Concurrent ${i}` }],
        };
        requests.push(router.route(request, 'cost-optimized'));
      }

      const startTime = performance.now();
      await Promise.all(requests);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete quickly
    });

    it('should handle concurrent tracking operations', () => {
      const concurrentOps = 100;
      const startResults: any[] = [];

      // Start tracking
      for (let i = 0; i < concurrentOps; i++) {
        startResults.push(
          tracker.trackRequestStart('openai', 'gpt-4', { input: 500, output: 250 }, 30, 60)
        );
      }

      // Complete tracking
      const startTime = performance.now();
      startResults.forEach((result, i) => {
        tracker.trackRequestComplete(
          result.requestId,
          'openai',
          'gpt-4',
          { input: 500, output: 250, total: 750 },
          30,
          60,
          500
        );
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Fast concurrent completion
    });
  });

  describe('Scalability', () => {
    it('should scale with multiple providers', async () => {
      // Create router with many providers
      const manyProviders: ProviderConfig[] = [];
      for (let i = 0; i < 10; i++) {
        manyProviders.push({
          id: `provider-${i}`,
          type: 'openai',
          name: `Provider ${i}`,
          models: [
            {
              id: `model-${i}`,
              name: `Model ${i}`,
              maxTokens: 4096,
              inputCostPerMillion: 1 + i,
              outputCostPerMillion: 2 + i,
              avgLatency: 1000 + i * 100,
              qualityScore: 0.5 + (i % 5) * 0.1,
              capabilities: {},
            },
          ],
          priority: i,
          enabled: true,
        });
      }

      const manyRouter = new IntelligentRouter(manyProviders);
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const startTime = performance.now();
      await manyRouter.route(request, 'cost-optimized');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should still be fast with many providers
    });

    it('should scale with large request history', async () => {
      // Make many routing decisions
      for (let i = 0; i < 1000; i++) {
        await router.route({
          messages: [{ role: 'user', content: `History ${i}` }],
        });
      }

      const stats = router.getRoutingStats();
      expect(stats.totalDecisions).toBe(1000);

      // Performance should not degrade significantly
      const startTime = performance.now();
      await router.route({ messages: [{ role: 'user', content: 'New' }] });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Resource Usage', () => {
    it('should have minimal memory overhead', () => {
      const initialRecords = tracker.getRecords().length;

      // Add 1,000 records
      for (let i = 0; i < 1000; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-4', { input: 500, output: 250 }, 30, 60);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-4',
          { input: 500, output: 250, total: 750 },
          30,
          60,
          500
        );
      }

      const finalRecords = tracker.getRecords().length;
      expect(finalRecords - initialRecords).toBe(1000);
    });

    it('should efficiently update metrics', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        tracker.getCostMetrics();
        tracker.getBudgetState();
        tracker.getProviderCosts();
        tracker.getModelCosts();
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Fast metrics access
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should achieve high routing throughput', async () => {
      const requestCount = 1000;
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Benchmark' }],
      };

      const startTime = performance.now();

      for (let i = 0; i < requestCount; i++) {
        await router.route(request, 'cost-optimized');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = (requestCount / totalTime) * 1000; // requests per second

      expect(throughput).toBeGreaterThan(100); // At least 100 req/sec
    });

    it('should achieve high tracking throughput', () => {
      const requestCount = 10000;

      const startTime = performance.now();

      for (let i = 0; i < requestCount; i++) {
        const startResult = tracker.trackRequestStart('openai', 'gpt-3.5-turbo', { input: 200, output: 100 }, 0.5, 1.5);
        tracker.trackRequestComplete(
          startResult.requestId,
          'openai',
          'gpt-3.5-turbo',
          { input: 200, output: 100, total: 300 },
          0.5,
          1.5,
          300
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = (requestCount / totalTime) * 1000; // requests per second

      expect(throughput).toBeGreaterThan(500); // At least 500 req/sec
    });
  });
});
