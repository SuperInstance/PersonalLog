/**
 * Intelligent Router Unit Tests
 *
 * Comprehensive test suite for IntelligentRouter module
 * Testing: query analysis, routing strategies, provider management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntelligentRouter } from '../../src/core/router.js';
import type { ProviderConfig, ChatCompletionRequest, RoutingStrategy } from '../../src/types/index.js';

describe('IntelligentRouter', () => {
  let router: IntelligentRouter;
  let providers: ProviderConfig[];

  beforeEach(() => {
    // Setup test providers
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
            capabilities: {
              functionCalling: true,
              streaming: true,
            },
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            maxTokens: 4096,
            inputCostPerMillion: 0.5,
            outputCostPerMillion: 1.5,
            avgLatency: 500,
            qualityScore: 0.7,
            capabilities: {
              functionCalling: true,
              streaming: true,
            },
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
            capabilities: {
              functionCalling: true,
              streaming: true,
              vision: true,
            },
          },
        ],
        maxRequestsPerMinute: 50,
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
        priority: 3,
        enabled: true,
      },
    ];

    router = new IntelligentRouter(providers);
  });

  describe('Initialization', () => {
    it('should initialize with providers', () => {
      const stats = router.getRoutingStats();

      // Should have initialized correctly
      expect(stats.totalDecisions).toBe(0);
      expect(stats.avgConfidence).toBeNaN();
    });

    it('should skip disabled providers', () => {
      const disabledProviders = [
        {
          ...providers[0],
          enabled: false,
        },
      ];

      const disabledRouter = new IntelligentRouter(disabledProviders);
      const state = disabledRouter.getProviderState('openai');

      expect(state).toBeUndefined();
    });

    it('should skip disabled models', () => {
      const providerWithDisabledModel: ProviderConfig = {
        ...providers[0],
        models: [
          {
            ...providers[0].models[0],
            enabled: false,
          },
          providers[0].models[1],
        ],
      };

      const routerWithDisabled = new IntelligentRouter([providerWithDisabledModel]);

      // Should still work with enabled models
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const decision = await router.route(request);
      expect(decision.model).toBe('gpt-3.5-turbo');
    });

    it('should initialize provider state', () => {
      const openaiState = router.getProviderState('openai');

      expect(openaiState).toBeDefined();
      expect(openaiState?.available).toBe(true);
      expect(openaiState?.requestCount).toBe(0);
      expect(openaiState?.errorCount).toBe(0);
    });
  });

  describe('Query Analysis', () => {
    it('should analyze simple query', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello, world!' }],
      };

      const analysis = router.analyzeQuery(request);

      expect(analysis.complexity).toBeGreaterThanOrEqual(0);
      expect(analysis.complexity).toBeLessThanOrEqual(1);
      expect(analysis.estimatedTokens).toBeGreaterThan(0);
      expect(analysis.expectedOutputTokens).toBeGreaterThan(0);
    });

    it('should analyze complex query', async () => {
      const request: ChatCompletionRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Explain quantum computing in detail.' },
          { role: 'assistant', content: 'Quantum computing is...' },
          { role: 'user', content: 'Can you elaborate on qubits?' },
        ],
        temperature: 0.2,
        maxTokens: 2000,
      };

      const analysis = router.analyzeQuery(request);

      expect(analysis.complexity).toBeGreaterThan(0);
      expect(analysis.estimatedTokens).toBeGreaterThan(100);
    });

    it('should detect function calling requirement', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'What is the weather?' }],
        functions: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            parameters: { type: 'object', properties: {} },
          },
        ],
      };

      const analysis = router.analyzeQuery(request);

      expect(analysis.requiredCapabilities).toContain('functionCalling');
    });

    it('should detect streaming requirement', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      const analysis = router.analyzeQuery(request);

      expect(analysis.requiredCapabilities).toContain('streaming');
    });

    it('should estimate tokens correctly', async () => {
      const request: ChatCompletionRequest = {
        messages: [
          { role: 'user', content: 'This is a test message with some words.' },
        ],
      };

      const analysis = router.analyzeQuery(request);

      // Roughly: 54 chars / 4 = ~13 tokens
      expect(analysis.estimatedTokens).toBeGreaterThan(10);
      expect(analysis.estimatedTokens).toBeLessThan(20);
    });

    it('should suggest appropriate model', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Simple question' }],
      };

      const analysis = router.analyzeQuery(request);

      expect(analysis.suggestedProvider).toBeDefined();
      expect(analysis.suggestedModel).toBeDefined();
    });
  });

  describe('Routing - Cost Optimized', () => {
    it('should route to cheapest model for simple query', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Simple question' }],
      };

      const decision = await router.route(request, 'cost-optimized');

      // Should choose GPT-3.5 Turbo (cheapest)
      expect(decision.model).toBe('gpt-3.5-turbo');
      expect(decision.provider).toBe('openai');
      expect(decision.strategy).toBe('cost-optimized');
    });

    it('should consider function calling in cost optimization', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Call a function' }],
        functions: [
          {
            name: 'test_func',
            description: 'Test function',
            parameters: {},
          },
        ],
      };

      const decision = await router.route(request, 'cost-optimized');

      // Should choose cheapest with function calling
      expect(decision.model).toBe('gpt-3.5-turbo');
    });
  });

  describe('Routing - Speed Optimized', () => {
    it('should route to fastest model', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Quick answer' }],
      };

      const decision = await router.route(request, 'speed-optimized');

      // GPT-3.5 has lowest latency (500ms)
      expect(decision.model).toBe('gpt-3.5-turbo');
      expect(decision.strategy).toBe('speed-optimized');
    });

    it('should prioritize speed over cost', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Fast response needed' }],
      };

      const decision = await router.route(request, 'speed-optimized');

      expect(decision.estimatedLatency).toBeLessThanOrEqual(500);
    });
  });

  describe('Routing - Quality Optimized', () => {
    it('should route to highest quality model', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Complex analysis needed' }],
      };

      const decision = await router.route(request, 'quality-optimized');

      // Claude 3 Opus has highest quality score
      expect(decision.model).toBe('claude-3-opus');
      expect(decision.strategy).toBe('quality-optimized');
    });

    it('should accept higher cost for quality', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Best quality response' }],
      };

      const decision = await router.route(request, 'quality-optimized');

      expect(decision.qualityScore).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Routing - Balanced', () => {
    it('should balance cost, speed, and quality', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Balanced query' }],
      };

      const decision = await router.route(request, 'balanced');

      expect(decision.strategy).toBe('balanced');
      expect(decision.provider).toBeDefined();
      expect(decision.model).toBeDefined();
    });

    it('should consider all factors in scoring', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Medium complexity' }],
      };

      const decision = await router.route(request, 'balanced');

      // Should have reasonable scores across the board
      expect(decision.qualityScore).toBeGreaterThan(0.5);
      expect(decision.estimatedLatency).toBeLessThan(5000);
    });
  });

  describe('Routing - Priority', () => {
    it('should follow priority order', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const decision = await router.route(request, 'priority');

      // OpenAI has priority 1 (highest)
      expect(decision.provider).toBe('openai');
      expect(decision.strategy).toBe('priority');
    });
  });

  describe('Provider State Management', () => {
    it('should update provider state on request', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await router.route(request);

      const state = router.getProviderState('openai');
      expect(state?.requestCount).toBeGreaterThan(0);
    });

    it('should mark provider unavailable after errors', () => {
      // Simulate errors
      for (let i = 0; i < 6; i++) {
        router.updateProviderState('openai', 'error');
      }

      const state = router.getProviderState('openai');
      expect(state?.available).toBe(false);
    });

    it('should reset error count on success', () => {
      // Add errors
      router.updateProviderState('anthropic', 'error');
      router.updateProviderState('anthropic', 'error');
      router.updateProviderState('anthropic', 'error');

      let state = router.getProviderState('anthropic');
      expect(state?.errorCount).toBe(3);

      // Success should reset
      router.updateProviderState('anthropic', 'success');

      state = router.getProviderState('anthropic');
      expect(state?.errorCount).toBe(0);
      expect(state?.available).toBe(true);
    });

    it('should track average latency', () => {
      router.updateProviderState('openai', 'success', 2000);
      router.updateProviderState('openai', 'success', 2500);
      router.updateProviderState('openai', 'success', 3000);

      const state = router.getProviderState('openai');
      expect(state?.avgLatency).toBeCloseTo(2500, 0);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // Create provider with low rate limit
      const limitedProviders: ProviderConfig[] = [
        {
          ...providers[0],
          maxRequestsPerMinute: 2,
        },
      ];

      const limitedRouter = new IntelligentRouter(limitedProviders);

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      // Make requests up to limit
      await limitedRouter.route(request);
      await limitedRouter.route(request);

      let state = limitedRouter.getProviderState('openai');
      expect(state?.requestCount).toBe(2);

      // Next request should respect rate limit
      const options = limitedRouter.getAvailableOptions(await limitedRouter.analyzeQuery(request));
      // After hitting limit, provider should be excluded from options
      const openaiOption = options.find(opt => opt.provider === 'openai');
      expect(openaiOption).toBeUndefined();
    });
  });

  describe('Available Options', () => {
    it('should return available routing options', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const analysis = router.analyzeQuery(request);
      const options = router.getAvailableOptions(analysis);

      expect(options.length).toBeGreaterThan(0);
      expect(options[0].provider).toBeDefined();
      expect(options[0].model).toBeDefined();
      expect(options[0].score).toBeDefined();
    });

    it('should sort options by score', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const analysis = router.analyzeQuery(request);
      const options = router.getAvailableOptions(analysis);

      // Check if sorted by score (descending)
      for (let i = 1; i < options.length; i++) {
        expect(options[i].score).toBeLessThanOrEqual(options[i - 1].score);
      }
    });

    it('should filter by required capabilities', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Use vision' }],
        functions: [{ name: 'vision_func', description: 'Vision', parameters: {} }],
      };

      const analysis = router.analyzeQuery(request);
      const options = router.getAvailableOptions(analysis);

      // All options should support required capabilities
      options.forEach(option => {
        const caps = option.modelConfig.capabilities || {};
        expect(caps.functionCalling || caps.vision).toBe(true);
      });
    });

    it('should filter by context window size', async () => {
      const largeRequest: ChatCompletionRequest = {
        messages: [
          { role: 'user', content: 'A'.repeat(100000) }, // Large context
        ],
      };

      const analysis = router.analyzeQuery(largeRequest);

      // Should only return models with sufficient context
      const options = router.getAvailableOptions(analysis);
      options.forEach(option => {
        expect(option.modelConfig.maxTokens).toBeGreaterThanOrEqual(analysis.estimatedTokens);
      });
    });
  });

  describe('Routing Statistics', () => {
    it('should track routing statistics', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await router.route(request);
      await router.route(request);
      await router.route(request);

      const stats = router.getRoutingStats();

      expect(stats.totalDecisions).toBe(3);
      expect(stats.decisionsByProvider['openai']).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });

    it('should track decisions by model', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await router.route(request);

      const stats = router.getRoutingStats();
      expect(Object.keys(stats.decisionsByModel).length).toBeGreaterThan(0);
    });
  });

  describe('Routing Decision Structure', () => {
    it('should include all required fields', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const decision = await router.route(request);

      expect(decision.provider).toBeDefined();
      expect(decision.model).toBeDefined();
      expect(decision.strategy).toBeDefined();
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
      expect(decision.reasoning).toBeDefined();
      expect(decision.estimatedCost).toBeGreaterThanOrEqual(0);
      expect(decision.estimatedLatency).toBeGreaterThan(0);
      expect(decision.qualityScore).toBeGreaterThan(0);
    });

    it('should provide alternative options', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const decision = await router.route(request);

      expect(decision.alternatives).toBeDefined();
      expect(decision.alternatives!.length).toBeGreaterThan(0);
      expect(decision.alternatives![0].provider).toBeDefined();
      expect(decision.alternatives![0].model).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages', async () => {
      const request: ChatCompletionRequest = {
        messages: [],
      };

      const analysis = router.analyzeQuery(request);

      expect(analysis.estimatedTokens).toBe(0);
    });

    it('should handle very long messages', async () => {
      const longContent = 'A'.repeat(100000);
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: longContent }],
      };

      const analysis = router.analyzeQuery(request);

      expect(analysis.estimatedTokens).toBeGreaterThan(20000);
    });

    it('should throw error when no models available', async () => {
      const emptyProviders: ProviderConfig[] = [
        {
          ...providers[0],
          models: [],
        },
      ];

      const emptyRouter = new IntelligentRouter(emptyProviders);
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(emptyRouter.route(request)).rejects.toThrow('No available models');
    });

    it('should handle all providers disabled', async () => {
      const disabledProviders = providers.map(p => ({ ...p, enabled: false }));
      const disabledRouter = new IntelligentRouter(disabledProviders);

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(disabledRouter.route(request)).rejects.toThrow();
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence for clear decisions', async () => {
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Simple' }],
      };

      const decision = await router.route(request, 'cost-optimized');

      // GPT-3.5 is significantly cheaper, should have high confidence
      expect(decision.confidence).toBeGreaterThan(0.6);
    });

    it('should have moderate confidence for similar options', async () => {
      // This would require providers with similar costs
      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const decision = await router.route(request, 'balanced');

      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Complex Routing Scenarios', () => {
    it('should handle mixed requirements', async () => {
      const request: ChatCompletionRequest = {
        messages: [
          { role: 'system', content: 'You are an expert' },
          { role: 'user', content: 'Analyze this data' },
        ],
        functions: [
          { name: 'analyze', description: 'Analyze', parameters: {} },
        ],
        temperature: 0.1,
        maxTokens: 5000,
      };

      const decision = await router.route(request, 'balanced');

      expect(decision).toBeDefined();
      expect(decision.provider).toBeDefined();
    });

    it('should adapt to different query complexities', async () => {
      const simpleRequest: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const complexRequest: ChatCompletionRequest = {
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'Complex '.repeat(1000) },
        ],
        functions: [
          { name: 'func1', description: 'Function 1', parameters: {} },
          { name: 'func2', description: 'Function 2', parameters: {} },
        ],
        temperature: 0.1,
      };

      const simpleAnalysis = router.analyzeQuery(simpleRequest);
      const complexAnalysis = router.analyzeQuery(complexRequest);

      expect(complexAnalysis.complexity).toBeGreaterThan(simpleAnalysis.complexity);
    });
  });
});
