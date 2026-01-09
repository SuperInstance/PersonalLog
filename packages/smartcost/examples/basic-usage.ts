/**
 * SmartCost Basic Usage Example
 *
 * Demonstrates drop-in replacement for OpenAI API calls
 * with automatic cost optimization and caching
 */

import { SmartCost } from '../src/index.js';

// ============================================================================
// EXAMPLE 1: Basic Usage (Drop-in Replacement)
// ============================================================================

async function basicUsage() {
  // Initialize SmartCost with your API keys
  const optimizer = new SmartCost({
    monthlyBudget: 500,
    alertThreshold: 0.8,
    cacheStrategy: 'semantic',
    routingStrategy: 'cost-optimized',
    providers: [
      {
        id: 'openai',
        type: 'openai',
        name: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY,
        models: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            maxTokens: 8192,
            inputCostPerMillion: 30,
            outputCostPerMillion: 60,
            avgLatency: 3000,
            qualityScore: 0.95,
            enabled: true,
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            maxTokens: 16385,
            inputCostPerMillion: 0.5,
            outputCostPerMillion: 1.5,
            avgLatency: 1000,
            qualityScore: 0.8,
            enabled: true,
          },
        ],
        enabled: true,
      },
    ],
  });

  // Use exactly like OpenAI API
  const response = await optimizer.chat.completions.create({
    model: 'gpt-4', // SmartCost will route intelligently
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain quantum computing in simple terms.' },
    ],
    temperature: 0.7,
    maxTokens: 1000,
  });

  console.log('Response:', response.content);
  console.log('Cost:', response.cost.totalCost);
  console.log('Tokens:', response.tokens);
  console.log('Provider:', response.provider);
  console.log('Cached:', response.cached);

  return response;
}

// ============================================================================
// EXAMPLE 2: Real-time Cost Monitoring
// ============================================================================

async function costMonitoring() {
  const optimizer = new SmartCost({
    monthlyBudget: 100,
    enableMonitoring: true,
  });

  // Listen to cost updates
  optimizer.on('costUpdate', (metrics) => {
    console.log('Cost Update:');
    console.log(`  Total Cost: $${metrics.totalCost.toFixed(2)}`);
    console.log(`  Budget Used: ${(metrics.budgetUtilization * 100).toFixed(1)}%`);
    console.log(`  Total Savings: $${metrics.totalSavings.toFixed(2)}`);
    console.log(`  Savings Rate: ${metrics.savingsPercent.toFixed(1)}%`);
  });

  // Listen to budget alerts
  optimizer.on('budgetAlert', (alert) => {
    console.log(`Budget ${alert.level}:`);
    console.log(`  Utilization: ${(alert.utilization * 100).toFixed(1)}%`);
    console.log(`  Remaining: $${alert.remaining.toFixed(2)}`);
    console.log(`  Action: ${alert.recommendedAction}`);
  });

  // Listen to cache hits
  optimizer.on('cacheHit', (event) => {
    console.log('Cache Hit:');
    console.log(`  Type: ${event.type}`);
    console.log(`  Similarity: ${event.similarity.toFixed(2)}`);
    console.log(`  Savings: $${event.savings.toFixed(4)}`);
  });

  // Listen to routing decisions
  optimizer.on('routingDecision', (decision) => {
    console.log('Routing Decision:');
    console.log(`  Provider: ${decision.provider}`);
    console.log(`  Model: ${decision.model}`);
    console.log(`  Strategy: ${decision.strategy}`);
    console.log(`  Est. Cost: $${decision.estimatedCost.toFixed(4)}`);
  });

  // Make some requests
  await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'What is the capital of France?' },
    ],
  });

  // Get current metrics
  const metrics = optimizer.getCostMetrics();
  console.log('Current Metrics:', metrics);
}

// ============================================================================
// EXAMPLE 3: Multi-Provider Setup
// ============================================================================

async function multiProvider() {
  const optimizer = new SmartCost({
    monthlyBudget: 200,
    routingStrategy: 'cost-optimized',
    providers: [
      // OpenAI
      {
        id: 'openai',
        type: 'openai',
        name: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY,
        models: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            maxTokens: 8192,
            inputCostPerMillion: 30,
            outputCostPerMillion: 60,
            avgLatency: 3000,
            qualityScore: 0.95,
            enabled: true,
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            maxTokens: 16385,
            inputCostPerMillion: 0.5,
            outputCostPerMillion: 1.5,
            avgLatency: 1000,
            qualityScore: 0.8,
            enabled: true,
          },
        ],
        priority: 10,
        enabled: true,
      },

      // Anthropic
      {
        id: 'anthropic',
        type: 'anthropic',
        name: 'Anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        models: [
          {
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
            maxTokens: 200000,
            inputCostPerMillion: 15,
            outputCostPerMillion: 75,
            avgLatency: 2500,
            qualityScore: 0.96,
            enabled: true,
          },
          {
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet',
            maxTokens: 200000,
            inputCostPerMillion: 3,
            outputCostPerMillion: 15,
            avgLatency: 1500,
            qualityScore: 0.9,
            enabled: true,
          },
        ],
        priority: 5,
        enabled: true,
      },

      // Ollama (local, free)
      {
        id: 'ollama',
        type: 'ollama',
        name: 'Ollama',
        baseURL: 'http://localhost:11434',
        models: [
          {
            id: 'llama2',
            name: 'Llama 2',
            maxTokens: 4096,
            inputCostPerMillion: 0,
            outputCostPerMillion: 0,
            avgLatency: 2000,
            qualityScore: 0.75,
            enabled: true,
          },
        ],
        priority: 1, // Highest priority (free)
        enabled: true,
      },
    ],
  });

  // SmartCost will intelligently route to cheapest viable model
  const response = await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'Write a haiku about AI.' },
    ],
  });

  console.log('Provider selected:', response.provider);
  console.log('Model used:', response.model);
  console.log('Cost:', response.cost.totalCost);
  console.log('Routing decision:', response.routingDecision);

  return response;
}

// ============================================================================
// EXAMPLE 4: Streaming Responses
// ============================================================================

async function streamingExample() {
  const optimizer = new SmartCost({
    monthlyBudget: 50,
  });

  console.log('Streaming response:');

  const response = await optimizer.stream(
    {
      messages: [
        { role: 'user', content: 'Tell me a short story about a robot.' },
      ],
    },
    (chunk) => {
      // Called for each chunk of the response
      process.stdout.write(chunk);
    }
  );

  console.log('\n\nComplete!');
  console.log('Total cost:', response.cost.totalCost);
  console.log('Duration:', response.duration, 'ms');
}

// ============================================================================
// EXAMPLE 5: Cache Management
// ============================================================================

async function cacheManagement() {
  const optimizer = new SmartCost({
    cacheStrategy: 'semantic',
    cache: {
      maxSize: 100 * 1024 * 1024, // 100 MB
      ttl: 86400, // 1 day
      similarityThreshold: 0.85,
    },
  });

  // Make a request (will be cached)
  const response1 = await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'What is machine learning?' },
    ],
  });

  console.log('First request - Cost:', response1.cost.totalCost);
  console.log('First request - Cached:', response1.cached);

  // Make similar request (will hit cache)
  const response2 = await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'Explain machine learning' },
    ],
  });

  console.log('Second request - Cost:', response2.cost.totalCost);
  console.log('Second request - Cached:', response2.cached);
  console.log('Cache similarity:', response2.cacheSimilarity);

  // Get cache statistics
  const cacheStats = optimizer.getCacheStats();
  console.log('Cache hit rate:', (cacheStats.hitRate * 100).toFixed(1) + '%');
  console.log('Cache entries:', cacheStats.totalEntries);
  console.log('Total savings:', '$' + cacheStats.totalSavings.toFixed(2));
}

// ============================================================================
// EXAMPLE 6: Budget Enforcement
// ============================================================================

async function budgetEnforcement() {
  const optimizer = new SmartCost({
    budget: {
      monthlyLimit: 10,
      alertThreshold: 0.8,
      throttleThreshold: 0.9,
    },
  });

  // Setup budget alert handler
  optimizer.on('budgetAlert', (alert) => {
    if (alert.level === 'critical') {
      console.error('CRITICAL: Budget at 90%+. Consider upgrading plan.');
      // You could implement throttling here
    } else if (alert.level === 'exceeded') {
      console.error('EXCEEDED: Budget limit reached. Requests blocked.');
      // You could implement request blocking here
    }
  });

  // Check budget state
  const budgetState = optimizer.getBudgetState();
  console.log('Budget state:', budgetState);

  // Make requests
  try {
    await optimizer.chat.completions.create({
      messages: [
        { role: 'user', content: 'Hello!' },
      ],
    });
  } catch (error: any) {
    if (error.message.includes('Budget exceeded')) {
      console.error('Request blocked: Budget exceeded');
    }
  }
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function main() {
  console.log('=== SmartCost Examples ===\n');

  console.log('\n--- Example 1: Basic Usage ---');
  await basicUsage();

  console.log('\n--- Example 2: Cost Monitoring ---');
  await costMonitoring();

  console.log('\n--- Example 3: Multi-Provider ---');
  await multiProvider();

  console.log('\n--- Example 4: Streaming ---');
  await streamingExample();

  console.log('\n--- Example 5: Cache Management ---');
  await cacheManagement();

  console.log('\n--- Example 6: Budget Enforcement ---');
  await budgetEnforcement();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  basicUsage,
  costMonitoring,
  multiProvider,
  streamingExample,
  cacheManagement,
  budgetEnforcement,
};
