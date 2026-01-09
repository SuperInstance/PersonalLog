/**
 * SmartCost Advanced Integration Example
 *
 * Demonstrates integration with Cascade Router, Vector Search,
 * and advanced cost optimization techniques
 */

import { SmartCost } from '../src/index.js';

// ============================================================================
// EXAMPLE 1: Integration with Cascade Router
// ============================================================================

async function cascadeRouterIntegration() {
  console.log('=== SmartCost + Cascade Router Integration ===\n');

  // SmartCost provides cost-aware routing
  const optimizer = new SmartCost({
    monthlyBudget: 500,
    routingStrategy: 'cost-optimized', // Cascade Router integration
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
            capabilities: {
              functionCalling: true,
              streaming: true,
              vision: false,
              bestFor: ['complex-reasoning', 'code-generation'],
            },
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
            capabilities: {
              functionCalling: true,
              streaming: true,
              bestFor: ['simple-tasks', 'chat'],
            },
          },
        ],
        enabled: true,
      },
    ],
  });

  // Make a simple query (routes to GPT-3.5)
  console.log('Making simple query...');
  const simpleResponse = await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'What is 2 + 2?' },
    ],
  });

  console.log('Simple query routing:');
  console.log('  Model:', simpleResponse.model);
  console.log('  Cost:', '$' + simpleResponse.cost.totalCost.toFixed(4));
  console.log('  Reasoning:', simpleResponse.routingDecision.reasoning);

  // Make a complex query (routes to GPT-4)
  console.log('\nMaking complex query...');
  const complexResponse = await optimizer.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an expert mathematician.' },
      { role: 'user', content: 'Explain the Riemann hypothesis and its implications.' },
    ],
    temperature: 0.3,
  });

  console.log('Complex query routing:');
  console.log('  Model:', complexResponse.model);
  console.log('  Cost:', '$' + complexResponse.cost.totalCost.toFixed(4));
  console.log('  Reasoning:', complexResponse.routingDecision.reasoning);

  // Cost savings from intelligent routing
  const savings = (simpleResponse.routingDecision.estimatedCost /
    (simpleResponse.cost.totalCost + complexResponse.cost.totalCost)) * 100;
  console.log('\nEstimated savings from intelligent routing:', savings.toFixed(1) + '%');
}

// ============================================================================
// EXAMPLE 2: Semantic Cache with Vector Search
// ============================================================================

async function semanticCaching() {
  console.log('\n=== Semantic Caching with Vector Search ===\n');

  const optimizer = new SmartCost({
    cacheStrategy: 'semantic',
    cache: {
      maxSize: 100 * 1024 * 1024, // 100 MB
      ttl: 86400, // 1 day
      similarityThreshold: 0.85, // High similarity threshold
    },
  });

  // Monitor cache hits
  optimizer.on('cacheHit', (event) => {
    console.log('Cache HIT:');
    console.log('  Type:', event.type);
    console.log('  Similarity:', event.similarity.toFixed(3));
    console.log('  Savings:', '$' + event.savings.toFixed(4));
  });

  optimizer.on('cacheMiss', (event) => {
    console.log('Cache MISS - making API call');
  });

  // First request (API call)
  console.log('Request 1: "Explain photosynthesis"');
  await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'Explain photosynthesis' },
    ],
  });

  // Similar request (semantic cache hit)
  console.log('\nRequest 2: "What is photosynthesis?"');
  await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'What is photosynthesis?' },
    ],
  });

  // Another similar request
  console.log('\nRequest 3: "How does photosynthesis work?"');
  await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'How does photosynthesis work?' },
    ],
  });

  // Different request (cache miss)
  console.log('\nRequest 4: "Explain cellular respiration"');
  await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'Explain cellular respiration' },
    ],
  });

  // Get cache statistics
  const stats = optimizer.getCacheStats();
  console.log('\nCache Statistics:');
  console.log('  Hit Rate:', (stats.hitRate * 100).toFixed(1) + '%');
  console.log('  Total Hits:', stats.totalHits);
  console.log('  Total Misses:', stats.totalMisses);
  console.log('  Semantic Hits:', stats.semanticHits);
  console.log('  Exact Hits:', stats.exactHits);
  console.log('  Total Savings:', '$' + stats.totalSavings.toFixed(2));
  console.log('  Avg Similarity:', stats.avgSimilarity.toFixed(3));
}

// ============================================================================
// EXAMPLE 3: Function Calling with Cost Optimization
// ============================================================================

async function functionCalling() {
  console.log('\n=== Function Calling with Cost Optimization ===\n');

  const optimizer = new SmartCost({
    routingStrategy: 'balanced',
  });

  // Define functions
  const functions = [
    {
      name: 'get_weather',
      description: 'Get the current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
        },
        required: ['location'],
      },
    },
    {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate',
          },
        },
        required: ['expression'],
      },
    },
  ];

  // Request with function calling
  console.log('Request with function calling...');
  const response = await optimizer.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: 'What is the weather in San Francisco and what is 25 * 37?',
      },
    ],
    functions,
    functionCall: 'auto',
  });

  console.log('Response:', response.content);
  console.log('Model:', response.model);
  console.log('Cost:', '$' + response.cost.totalCost.toFixed(4));

  // SmartCost routes to models that support function calling
  console.log('Routing decision:', response.routingDecision.reasoning);
}

// ============================================================================
// EXAMPLE 4: Token Optimization
// ============================================================================

async function tokenOptimization() {
  console.log('\n=== Token Optimization ===\n');

  const optimizer = new SmartCost({
    routingStrategy: 'cost-optimized',
  });

  // Monitor routing decisions to see token optimization
  optimizer.on('routingDecision', (decision) => {
    console.log('Routing Decision:');
    console.log('  Provider:', decision.provider);
    console.log('  Model:', decision.model);
    console.log('  Strategy:', decision.strategy);
    console.log('  Est. Cost:', '$' + decision.estimatedCost.toFixed(4));
    console.log('  Reasoning:', decision.reasoning);
  });

  // Request with long context
  console.log('Request with long context...');
  const longContext = 'Explain the history of computer science. '.repeat(100);
  await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: longContext + '\n\nSummarize this in 3 bullet points.' },
    ],
    maxTokens: 500,
  });

  // Request with short context
  console.log('\nRequest with short context...');
  await optimizer.chat.completions.create({
    messages: [
      { role: 'user', content: 'What is AI?' },
    ],
    maxTokens: 500,
  });
}

// ============================================================================
// EXAMPLE 5: Analytics and Reporting
// ============================================================================

async function analyticsReporting() {
  console.log('\n=== Analytics and Reporting ===\n');

  const optimizer = new SmartCost({
    monthlyBudget: 100,
    enableMonitoring: true,
  });

  // Make various requests to generate data
  const requests = [
    'What is machine learning?',
    'Explain neural networks',
    'What is deep learning?',
    'How do transformers work?',
    'What is reinforcement learning?',
  ];

  console.log('Making', requests.length, 'requests...');
  for (const prompt of requests) {
    await optimizer.chat.completions.create({
      messages: [
        { role: 'user', content: prompt },
      ],
    });
  }

  // Get comprehensive analytics
  const costMetrics = optimizer.getCostMetrics();
  console.log('\nCost Metrics:');
  console.log('  Total Cost:', '$' + costMetrics.totalCost.toFixed(2));
  console.log('  Total Requests:', costMetrics.totalRequests);
  console.log('  Total Tokens:', costMetrics.totalTokens);
  console.log('  Avg Cost/Request:', '$' + costMetrics.avgCostPerRequest.toFixed(4));
  console.log('  Avg Tokens/Request:', costMetrics.avgTokensPerRequest.toFixed(0));
  console.log('  Budget Utilization:', (costMetrics.budgetUtilization * 100).toFixed(1) + '%');
  console.log('  Savings:', '$' + costMetrics.totalSavings.toFixed(2));
  console.log('  Savings Rate:', costMetrics.savingsPercent.toFixed(1) + '%');

  console.log('\nCost by Provider:');
  for (const [provider, cost] of Object.entries(costMetrics.costByProvider)) {
    console.log(`  ${provider}:`, '$' + cost.toFixed(2));
  }

  console.log('\nCost by Model:');
  for (const [model, cost] of Object.entries(costMetrics.costByModel)) {
    console.log(`  ${model}:`, '$' + cost.toFixed(2));
  }

  const cacheStats = optimizer.getCacheStats();
  console.log('\nCache Statistics:');
  console.log('  Entries:', cacheStats.totalEntries);
  console.log('  Hit Rate:', (cacheStats.hitRate * 100).toFixed(1) + '%');
  console.log('  Total Savings:', '$' + cacheStats.totalSavings.toFixed(2));

  const routingStats = optimizer.getRoutingStats();
  console.log('\nRouting Statistics:');
  console.log('  Total Decisions:', routingStats.totalDecisions);
  console.log('  Avg Confidence:', (routingStats.avgConfidence * 100).toFixed(1) + '%');
  console.log('  Most Common Provider:', routingStats.mostCommonProvider);
  console.log('  Most Common Model:', routingStats.mostCommonModel);
}

// ============================================================================
// EXAMPLE 6: Custom Routing Strategy
// ============================================================================

async function customRouting() {
  console.log('\n=== Custom Routing Strategy ===\n');

  // Test different routing strategies
  const strategies = ['cost-optimized', 'speed-optimized', 'quality-optimized', 'balanced'] as const;

  for (const strategy of strategies) {
    console.log(`\nTesting ${strategy} routing...`);

    const optimizer = new SmartCost({
      routingStrategy: strategy,
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

    const response = await optimizer.chat.completions.create({
      messages: [
        { role: 'user', content: 'Write a short poem about AI.' },
      ],
    });

    console.log('  Selected Model:', response.model);
    console.log('  Cost:', '$' + response.cost.totalCost.toFixed(4));
    console.log('  Duration:', response.duration.toFixed(0) + 'ms');
    console.log('  Reasoning:', response.routingDecision.reasoning);
  }
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function main() {
  console.log('=== SmartCost Advanced Integration Examples ===\n');

  try {
    await cascadeRouterIntegration();
    await semanticCaching();
    await functionCalling();
    await tokenOptimization();
    await analyticsReporting();
    await customRouting();

    console.log('\n=== All Examples Complete ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  cascadeRouterIntegration,
  semanticCaching,
  functionCalling,
  tokenOptimization,
  analyticsReporting,
  customRouting,
};
