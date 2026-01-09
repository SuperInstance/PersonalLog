/**
 * Example 2: Intelligent LLM Routing for Cost Optimization
 *
 * This example demonstrates how to use intelligent routing to automatically
 * choose the best model for each query based on complexity and cost
 * Keywords: llm routing, model selection, ai cost optimization, query analysis, smart routing
 *
 * Use case: Automatically route queries to cheapest suitable model
 * Benefits: 50-90% cost savings while maintaining quality
 */

import { IntelligentRouter } from '../src/core/router.js';
import type { ProviderConfig, ChatCompletionRequest } from '../src/types/index.js';

// Configure providers
const providers: ProviderConfig[] = [
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
      },
    ],
    maxRequestsPerMinute: 50,
    priority: 2,
    enabled: true,
  },
];

// Initialize router
const router = new IntelligentRouter(providers);

// Example 1: Simple query routes to cheapest model
async function handleSimpleQuery() {
  const request: ChatCompletionRequest = {
    messages: [
      { role: 'user', content: 'What is the capital of France?' },
    ],
  };

  const decision = await router.route(request, 'cost-optimized');

  console.log('Simple Query Analysis:');
  console.log(`  Complexity: ${(decision.confidence * 100).toFixed(0)}%`);
  console.log(`  Selected: ${decision.provider}/${decision.model}`);
  console.log(`  Estimated cost: $${decision.estimatedCost.toFixed(6)}`);
  console.log(`  Reasoning: ${decision.reasoning}\n`);

  // Would use cheapest model (GPT-3.5 Turbo)
}

// Example 2: Complex query routes to capable model
async function handleComplexQuery() {
  const request: ChatCompletionRequest = {
    messages: [
      { role: 'system', content: 'You are an expert in quantum physics.' },
      { role: 'user', content: 'Explain quantum entanglement and its implications for quantum computing.' },
    ],
    temperature: 0.1,
    maxTokens: 2000,
  };

  const decision = await router.route(request, 'quality-optimized');

  console.log('Complex Query Analysis:');
  console.log(`  Complexity: High`);
  console.log(`  Selected: ${decision.provider}/${decision.model}`);
  console.log(`  Estimated cost: $${decision.estimatedCost.toFixed(6)}`);
  console.log(`  Quality score: ${decision.qualityScore}\n`);

  // Would use highest quality model (Claude 3 Opus)
}

// Example 3: Function calling requirement
async function handleFunctionCall() {
  const request: ChatCompletionRequest = {
    messages: [
      { role: 'user', content: 'What is the weather in San Francisco?' },
    ],
    functions: [
      {
        name: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
        },
      },
    ],
  };

  const decision = await router.route(request, 'balanced');

  console.log('Function Call Query:');
  console.log(`  Required capabilities: functionCalling`);
  console.log(`  Selected: ${decision.provider}/${decision.model}`);
  console.log(`  Strategy: ${decision.strategy}\n`);

  // Routes to model with function calling support
}

// Example 4: Speed-optimized query
async function handleFastQuery() {
  const request: ChatCompletionRequest = {
    messages: [
      { role: 'user', content: 'Quick response needed' },
    ],
  };

  const decision = await router.route(request, 'speed-optimized');

  console.log('Speed-Optimized Query:');
  console.log(`  Selected: ${decision.provider}/${decision.model}`);
  console.log(`  Estimated latency: ${decision.estimatedLatency}ms`);
  console.log(`  Estimated cost: $${decision.estimatedCost.toFixed(6)}\n`);

  // Routes to fastest model
}

// Example 5: Analyze query without routing
async function analyzeQuery() {
  const request: ChatCompletionRequest = {
    messages: [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Explain machine learning' },
    ],
  };

  const analysis = router.analyzeQuery(request);

  console.log('Query Analysis:');
  console.log(`  Complexity: ${(analysis.complexity * 100).toFixed(0)}%`);
  console.log(`  Estimated tokens: ${analysis.estimatedTokens}`);
  console.log(`  Expected output: ${analysis.expectedOutputTokens} tokens`);
  console.log(`  Suggested: ${analysis.suggestedProvider}/${analysis.suggestedModel}`);
  console.log(`  Reasoning: ${analysis.reasoning}\n`);
}

// Example 6: Get routing alternatives
async function showAlternatives() {
  const request: ChatCompletionRequest = {
    messages: [
      { role: 'user', content: 'Test query' },
    ],
  };

  const decision = await router.route(request, 'cost-optimized');

  console.log('Routing Alternatives:');
  console.log(`  Selected: ${decision.provider}/${decision.model}`);
  console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);

  if (decision.alternatives && decision.alternatives.length > 0) {
    console.log(`\n  Alternatives considered:`);
    decision.alternatives.forEach((alt, i) => {
      console.log(`    ${i + 1}. ${alt.provider}/${alt.model}`);
      console.log(`       Cost: $${alt.estimatedCost.toFixed(6)}`);
      console.log(`       Latency: ${alt.estimatedLatency}ms`);
      console.log(`       Quality: ${alt.qualityScore}`);
    });
  }
}

// Run all examples
async function runExamples() {
  console.log('=== Intelligent Routing Examples ===\n');

  await handleSimpleQuery();
  await handleComplexQuery();
  await handleFunctionCall();
  await handleFastQuery();
  await analyzeQuery();
  await showAlternatives();

  // Show statistics
  const stats = router.getRoutingStats();
  console.log('\nRouting Statistics:');
  console.log(`  Total decisions: ${stats.totalDecisions}`);
  console.log(`  Average confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`  Providers used:`, Object.keys(stats.decisionsByProvider));
}

runExamples().catch(console.error);
