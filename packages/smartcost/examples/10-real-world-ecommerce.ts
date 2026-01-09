/**
 * Example 10: Real-World E-commerce Integration
 *
 * This example demonstrates a complete e-commerce AI system with cost optimization
 * Keywords: e-commerce ai, product recommendations, chatbot, cost optimization, customer service
 *
 * Use case: Production e-commerce system using AI for multiple features
 * Benefits: 60-80% cost savings, better user experience, scalable AI operations
 */

import { CostTracker } from '../src/core/cost-tracker.js';
import { IntelligentRouter } from '../src/core/router.js';
import type { ProviderConfig, ChatCompletionRequest } from '../src/types/index.js';

// Configuration
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
        capabilities: { functionCalling: true },
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        maxTokens: 4096,
        inputCostPerMillion: 0.5,
        outputCostPerMillion: 1.5,
        avgLatency: 500,
        qualityScore: 0.7,
        capabilities: { functionCalling: true },
      },
    ],
    priority: 1,
    enabled: true,
  },
  {
    id: 'anthropic',
    type: 'anthropic',
    name: 'Anthropic',
    models: [
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        maxTokens: 200000,
        inputCostPerMillion: 3,
        outputCostPerMillion: 15,
        avgLatency: 2000,
        qualityScore: 0.85,
        capabilities: {},
      },
    ],
    priority: 2,
    enabled: true,
  },
];

const tracker = new CostTracker({
  monthlyBudget: 500,
  alertThreshold: 0.75,
  enableMonitoring: true,
});

const router = new IntelligentRouter(providers);

// Semantic cache for product queries
class ProductCache {
  private cache = new Map<string, { response: string; timestamp: number }>();

  get(query: string): string | null {
    const cached = this.cache.get(query.toLowerCase());
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
      return cached.response;
    }
    return null;
  }

  set(query: string, response: string): void {
    this.cache.set(query.toLowerCase(), { response, timestamp: Date.now() });
  }
}

const productCache = new ProductCache();

// ============================================================================
// USE CASE 1: Product Search (Cost-Optimized)
// ============================================================================

async function searchProducts(query: string) {
  console.log(`\n🔍 Product Search: "${query}"`);

  // Check cache first
  const cached = productCache.get(query);
  if (cached) {
    console.log('✅ Cache hit - $0.000');
    return cached;
  }

  // Use cheapest model for simple search
  const request: ChatCompletionRequest = {
    messages: [
      {
        role: 'system',
        content: 'You are a product search assistant. Keep responses brief.',
      },
      { role: 'user', content: query },
    ],
    maxTokens: 150,
  };

  const decision = await router.route(request, 'cost-optimized');

  const startTracking = tracker.trackRequestStart(
    decision.provider,
    decision.model,
    { input: 100, output: 75 },
    30,
    60
  );

  // Simulate API call
  const response = `Found 15 products matching "${query}": Top results - Product A ($29.99), Product B ($19.99)...`;

  tracker.trackRequestComplete(
    startTracking.requestId,
    decision.provider,
    decision.model,
    { input: 100, output: 75, total: 175 },
    30,
    60,
    800
  );

  // Cache the result
  productCache.set(query, response);

  console.log(`  Model: ${decision.model}`);
  console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);
  console.log(`  Results: ${response.substring(0, 80)}...`);

  return response;
}

// ============================================================================
// USE CASE 2: Product Recommendations (Balanced)
// ============================================================================

async function getRecommendations(userId: string, category: string) {
  console.log(`\n🎯 Recommendations for user ${userId} in ${category}`);

  const request: ChatCompletionRequest = {
    messages: [
      {
        role: 'system',
        content: 'You are a recommendation engine. Suggest 3-5 products with brief explanations.',
      },
      {
        role: 'user',
        content: `Recommend products in ${category} for a customer interested in sustainable products`,
      },
    ],
    maxTokens: 300,
  };

  const decision = await router.route(request, 'balanced');

  const startTracking = tracker.trackRequestStart(
    decision.provider,
    decision.model,
    { input: 200, output: 200 },
    30,
    60
  );

  const response = `Based on your interest in sustainability: 1) Eco-friendly water bottle ($25), 2) Bamboo utensil set ($18)...`;

  tracker.trackRequestComplete(
    startTracking.requestId,
    decision.provider,
    decision.model,
    { input: 200, output: 200, total: 400 },
    30,
    60,
    1200
  );

  console.log(`  Model: ${decision.model}`);
  console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);
  console.log(`  Recommendations: ${response.substring(0, 80)}...`);

  return response;
}

// ============================================================================
// USE CASE 3: Customer Support Chatbot (Quality-Optimized)
// ============================================================================

async function customerSupport(userMessage: string, conversationHistory: string[] = []) {
  console.log(`\n💬 Customer Support: "${userMessage}"`);

  const messages: ChatCompletionRequest['messages'] = [
    {
      role: 'system',
      content: 'You are a helpful customer support agent. Be empathetic, clear, and solution-oriented.',
    },
    ...conversationHistory.map(msg => ({
      role: 'user' as const,
      content: msg,
    })),
    { role: 'user', content: userMessage },
  ];

  const request: ChatCompletionRequest = {
    messages,
    maxTokens: 400,
    temperature: 0.7,
  };

  // Use quality-optimized for customer support
  const decision = await router.route(request, 'quality-optimized');

  const startTracking = tracker.trackRequestStart(
    decision.provider,
    decision.model,
    { input: 500, output: 300 },
    30,
    60
  );

  const response = `I understand your concern. I'd be happy to help you with that. Let me look into your order...`;

  tracker.trackRequestComplete(
    startTracking.requestId,
    decision.provider,
    decision.model,
    { input: 500, output: 300, total: 800 },
    30,
    60,
    2500
  );

  console.log(`  Model: ${decision.model}`);
  console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);
  console.log(`  Response: ${response}`);

  return response;
}

// ============================================================================
// USE CASE 4: Order Status (Speed-Optimized)
// ============================================================================

async function getOrderStatus(orderId: string) {
  console.log(`\n📦 Order Status: ${orderId}`);

  const request: ChatCompletionRequest = {
    messages: [
      {
        role: 'system',
        content: 'You provide concise order status updates. Use a standard format.',
      },
      {
        role: 'user',
        content: `What's the status of order ${orderId}?`,
      },
    ],
    maxTokens: 100,
  };

  const decision = await router.route(request, 'speed-optimized');

  const startTracking = tracker.trackRequestStart(
    decision.provider,
    decision.model,
    { input: 80, output: 50 },
    30,
    60
  );

  const response = `Order #${orderId}: Shipped - Expected delivery: Jan 15, 2026 (via UPS Ground)`;

  tracker.trackRequestComplete(
    startTracking.requestId,
    decision.provider,
    decision.model,
    { input: 80, output: 50, total: 130 },
    30,
    60,
    400
  );

  console.log(`  Model: ${decision.model}`);
  console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);
  console.log(`  Status: ${response}`);

  return response;
}

// ============================================================================
// USE CASE 5: Product Description Generation (Quality-Optimized)
// ============================================================================

async function generateProductDescription(productName: string, features: string[]) {
  console.log(`\n✍️  Generating description for: ${productName}`);

  const request: ChatCompletionRequest = {
    messages: [
      {
        role: 'system',
        content: 'You write compelling e-commerce product descriptions. Highlight key benefits and features.',
      },
      {
        role: 'user',
        content: `Write a product description for ${productName}. Features: ${features.join(', ')}`,
      },
    ],
    maxTokens: 500,
    temperature: 0.8,
  };

  const decision = await router.route(request, 'quality-optimized');

  const startTracking = tracker.trackRequestStart(
    decision.provider,
    decision.model,
    { input: 300, output: 400 },
    30,
    60
  );

  const response = `Experience premium quality with ${productName}. Designed for...`;

  tracker.trackRequestComplete(
    startTracking.requestId,
    decision.provider,
    decision.model,
    { input: 300, output: 400, total: 700 },
    30,
    60,
    3000
  );

  console.log(`  Model: ${decision.model}`);
  console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);
  console.log(`  Description: ${response.substring(0, 100)}...`);

  return response;
}

// ============================================================================
// USE CASE 6: Review Summarization (Balanced)
// ============================================================================

async function summarizeReviews(productId: string, reviews: string[]) {
  console.log(`\n⭐ Summarizing ${reviews.length} reviews for product ${productId}`);

  const reviewText = reviews.slice(0, 10).join('\n');

  const request: ChatCompletionRequest = {
    messages: [
      {
        role: 'system',
        content: 'Summarize customer reviews highlighting key pros and cons.',
      },
      {
        role: 'user',
        content: `Summarize these reviews:\n${reviewText}`,
      },
    ],
    maxTokens: 300,
  };

  const decision = await router.route(request, 'balanced');

  const startTracking = tracker.trackRequestStart(
    decision.provider,
    decision.model,
    { input: 2000, output: 250 },
    30,
    60
  );

  const response = `Customers love the quality (4.5/5 stars). Pros: Great value, fast shipping. Cons: Limited color options...`;

  tracker.trackRequestComplete(
    startTracking.requestId,
    decision.provider,
    decision.model,
    { input: 2000, output: 250, total: 2250 },
    30,
    60,
    2000
  );

  console.log(`  Model: ${decision.model}`);
  console.log(`  Cost: $${decision.estimatedCost.toFixed(6)}`);
  console.log(`  Summary: ${response}`);

  return response;
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

function showEcommerceReport() {
  const metrics = tracker.getCostMetrics();
  const budget = tracker.getBudgetState();

  console.log('\n' + '='.repeat(60));
  console.log('📊 E-COMMERCE AI SYSTEM REPORT');
  console.log('='.repeat(60));

  console.log('\n💰 Budget Status:');
  console.log(`   Budget: $${budget.total}`);
  console.log(`   Used: $${metrics.totalCost.toFixed(4)}`);
  console.log(`   Remaining: $${budget.remaining.toFixed(2)}`);
  console.log(`   Utilization: ${(budget.utilization * 100).toFixed(2)}%`);

  console.log('\n📈 Usage Metrics:');
  console.log(`   Total requests: ${metrics.totalRequests}`);
  console.log(`   Total tokens: ${metrics.totalTokens.toLocaleString()}`);
  console.log(`   Avg cost per request: $${metrics.avgCostPerRequest.toFixed(6)}`);
  console.log(`   Avg tokens per request: ${metrics.avgTokensPerRequest.toFixed(0)}`);

  console.log('\n💡 Savings:');
  console.log(`   Total saved: $${metrics.totalSavings.toFixed(4)}`);
  console.log(`   Savings rate: ${metrics.savingsPercent.toFixed(1)}%`);
  console.log(`   Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);

  console.log('\n🏷️  Cost by Provider:');
  Object.entries(tracker.getProviderCosts()).forEach(([provider, cost]) => {
    console.log(`   ${provider}: $${cost.toFixed(4)}`);
  });

  console.log('\n🎯 Cost by Model:');
  Object.entries(tracker.getModelCosts())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([model, cost]) => {
      console.log(`   ${model}: $${cost.toFixed(4)}`);
    });

  console.log('\n' + '='.repeat(60));
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

async function runEcommerceSystem() {
  console.log('🛒 E-Commerce AI System Demo');
  console.log('Production-ready cost optimization\n');

  // Simulate real customer journey
  await searchProducts('wireless headphones');
  await searchProducts('wireless headphones'); // Cache hit

  await getRecommendations('user-12345', 'Electronics');

  await customerSupport('Where is my order?');
  await customerSupport('I need to return an item', ['Previous order was fine']);

  await getOrderStatus('ORD-2026-001');

  await generateProductDescription('Smart Watch Pro', ['Heart rate monitor', 'GPS', 'Waterproof']);

  await summarizeReviews('PROD-789', [
    'Great product, works perfectly',
    'Battery life could be better',
    'Excellent value for money',
    'Fast shipping',
  ]);

  // Show comprehensive report
  showEcommerceReport();
}

// Run the demo
runEcommerceSystem().catch(console.error);
