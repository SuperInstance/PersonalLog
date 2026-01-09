/**
 * Example 5: Multi-Provider Setup for Cost Optimization
 *
 * This example demonstrates how to configure and use multiple AI providers
 * Keywords: multi-provider llm, ai provider comparison, cost optimization across providers
 *
 * Use case: Use multiple AI providers (OpenAI, Anthropic, Ollama) for optimal cost/performance
 * Benefits: 50-90% cost savings, redundancy, best model for each task
 */

import { IntelligentRouter } from '../src/core/router.js';
import type { ProviderConfig } from '../src/types/index.js';

// Comprehensive multi-provider configuration
const providers: ProviderConfig[] = [
  // OpenAI Configuration
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
        bestFor: ['complex-reasoning', 'code-generation', 'analysis'],
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
        bestFor: ['simple-qa', 'chat', 'basic-tasks'],
      },
    ],
    maxRequestsPerMinute: 100,
    maxTokensPerMinute: 150000,
    priority: 1,
    enabled: true,
  },

  // Anthropic Configuration
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
        bestFor: ['complex-analysis', 'long-context', 'research'],
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        maxTokens: 200000,
        inputCostPerMillion: 3,
        outputCostPerMillion: 15,
        avgLatency: 2000,
        qualityScore: 0.85,
        capabilities: {
          functionCalling: true,
          streaming: true,
        },
        bestFor: ['balanced-tasks', 'cost-effective', 'general-use'],
      },
    ],
    maxRequestsPerMinute: 50,
    maxTokensPerMinute: 400000,
    priority: 2,
    enabled: true,
  },

  // Ollama Configuration (Local/Free)
  {
    id: 'ollama',
    type: 'ollama',
    name: 'Ollama',
    models: [
      {
        id: 'llama2',
        name: 'Llama 2 70B',
        maxTokens: 4096,
        inputCostPerMillion: 0,
        outputCostPerMillion: 0,
        avgLatency: 5000,
        qualityScore: 0.6,
        capabilities: {},
        bestFor: ['testing', 'development', 'cost-sensitive'],
      },
      {
        id: 'mistral',
        name: 'Mistral 7B',
        maxTokens: 8192,
        inputCostPerMillion: 0,
        outputCostPerMillion: 0,
        avgLatency: 3000,
        qualityScore: 0.65,
        capabilities: {},
        bestFor: ['lightweight-tasks', 'fast-response'],
      },
    ],
    priority: 3,
    enabled: true,
  },
];

// Initialize router with all providers
const router = new IntelligentRouter(providers);

// Example 1: Compare providers for same query
async function compareProviders() {
  const request = {
    messages: [{ role: 'user', content: 'Explain quantum computing' }],
  };

  console.log('=== Provider Comparison ===\n');

  const strategies = ['cost-optimized', 'speed-optimized', 'quality-optimized'] as const;

  for (const strategy of strategies) {
    const decision = await router.route(request, strategy);

    console.log(`${strategy.toUpperCase()}:`);
    console.log(`  Provider: ${decision.provider}`);
    console.log(`  Model: ${decision.model}`);
    console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);
    console.log(`  Latency: ${decision.estimatedLatency}ms`);
    console.log(`  Quality: ${(decision.qualityScore * 100).toFixed(0)}%`);
    console.log();
  }
}

// Example 2: Automatic provider failover
async function demonstrateFailover() {
  console.log('=== Provider Failover Demo ===\n');

  const request = {
    messages: [{ role: 'user', content: 'Test message' }],
  };

  // First request goes to primary provider
  let decision = await router.route(request, 'priority');
  console.log(`Primary provider: ${decision.provider}/${decision.model}`);

  // Simulate primary provider failure
  console.log('\n⚠️  Simulating provider failure...');
  router.updateProviderState(decision.provider, 'error');

  // Next request should failover
  decision = await router.route(request, 'priority');
  console.log(`Failover provider: ${decision.provider}/${decision.model}`);

  // Recovery
  console.log('\n✅ Provider recovered...');
  router.updateProviderState('openai', 'success');
  decision = await router.route(request, 'priority');
  console.log(`Back to primary: ${decision.provider}/${decision.model}`);
}

// Example 3: Provider selection by use case
async function selectByUseCase() {
  console.log('\n=== Use Case Based Selection ===\n');

  const useCases = [
    {
      name: 'Complex Analysis',
      request: {
        messages: [
          { role: 'system', content: 'You are an expert analyst' },
          { role: 'user', content: 'Analyze market trends for AI in 2024' },
        ],
        temperature: 0.1,
      },
      strategy: 'quality-optimized' as const,
    },
    {
      name: 'Simple Chat',
      request: {
        messages: [{ role: 'user', content: 'Hi, how are you?' }],
      },
      strategy: 'cost-optimized' as const,
    },
    {
      name: 'Fast Response',
      request: {
        messages: [{ role: 'user', content: 'Quick question' }],
      },
      strategy: 'speed-optimized' as const,
    },
    {
      name: 'Code Generation',
      request: {
        messages: [
          { role: 'system', content: 'You are a coding expert' },
          { role: 'user', content: 'Write a Python function to sort a list' },
        ],
      },
      strategy: 'balanced' as const,
    },
  ];

  for (const useCase of useCases) {
    const decision = await router.route(useCase.request, useCase.strategy);

    console.log(`${useCase.name}:`);
    console.log(`  Strategy: ${useCase.strategy}`);
    console.log(`  Selected: ${decision.provider}/${decision.model}`);
    console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);
    console.log(`  Reason: ${decision.reasoning}`);
    console.log();
  }
}

// Example 4: Cost-effective tiered routing
async function tieredRouting() {
  console.log('=== Tiered Routing Strategy ===\n');

  // Try cheapest first, fallback to more expensive
  const request = {
    messages: [{ role: 'user', content: 'Generate a summary' }],
  };

  // Start with free/local model
  console.log('Step 1: Try free local model');
  let decision = await router.route(request, 'cost-optimized');

  if (decision.provider === 'ollama') {
    console.log(`✅ Using free model: ${decision.model}`);
    console.log(`   Cost: $0.000000`);
  } else {
    console.log(`ℹ️  Local model not suitable, using: ${decision.provider}/${decision.model}`);
    console.log(`   Cost: $${decision.estimatedCost.toFixed(6)}`);
  }
}

// Example 5: Provider performance monitoring
function monitorProviderPerformance() {
  console.log('\n=== Provider Performance Monitoring ===\n');

  providers.forEach((provider) => {
    const state = router.getProviderState(provider.id);

    if (state) {
      console.log(`${provider.name}:`);
      console.log(`  Status: ${state.available ? '✅ Available' : '❌ Unavailable'}`);
      console.log(`  Requests: ${state.requestCount}`);
      console.log(`  Errors: ${state.errorCount}`);
      console.log(`  Avg Latency: ${state.avgLatency.toFixed(0)}ms`);
      console.log();
    }
  });
}

// Example 6: Cost comparison report
async function generateCostReport() {
  console.log('=== Provider Cost Comparison ===\n');

  const testRequest = {
    messages: [
      { role: 'user', content: 'What is the capital of France?' },
    ],
  };

  console.log('For a simple query (1000 input tokens, 500 output tokens):\n');

  for (const provider of providers) {
    for (const model of provider.models) {
      const inputCost = (1000 / 1_000_000) * model.inputCostPerMillion;
      const outputCost = (500 / 1_000_000) * model.outputCostPerMillion;
      const totalCost = inputCost + outputCost;

      console.log(`${provider.name} - ${model.name}:`);
      console.log(`  Input: $${inputCost.toFixed(6)}`);
      console.log(`  Output: $${outputCost.toFixed(6)}`);
      console.log(`  Total: $${totalCost.toFixed(6)}`);
      console.log(`  Latency: ${model.avgLatency}ms`);
      console.log();
    }
  }
}

// Example 7: Intelligent load balancing
async function loadBalancing() {
  console.log('=== Load Balancing Across Providers ===\n');

  const requests = Array.from({ length: 10 }, (_, i) => ({
    messages: [{ role: 'user', content: `Request ${i}` }],
  }));

  console.log('Distributing 10 requests across providers...');

  for (const request of requests) {
    const decision = await router.route(request, 'balanced');
    console.log(`  → ${decision.provider}/${decision.model}`);
  }

  const stats = router.getRoutingStats();
  console.log('\nFinal distribution:');
  Object.entries(stats.decisionsByProvider).forEach(([provider, count]) => {
    console.log(`  ${provider}: ${count} requests`);
  });
}

// Run all examples
async function runMultiProviderExamples() {
  console.log('Multi-Provider Setup Examples\n');

  await compareProviders();
  await demonstrateFailover();
  await selectByUseCase();
  await tieredRouting();
  monitorProviderPerformance();
  await generateCostReport();
  await loadBalancing();
}

runMultiProviderExamples().catch(console.error);
