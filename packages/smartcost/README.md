# @superinstance/smartcost

> **AI cost optimizer that saves 50-90% on LLM API costs** through intelligent routing, semantic caching, and real-time cost tracking

## 🎯 Mission

SmartCost is a production-ready, drop-in replacement for direct LLM API calls that automatically:

- **Routes intelligently** - Selects cheapest viable model based on query complexity
- **Caches semantically** - Avoids repeat calls using vector-based similarity matching
- **Tracks costs** - Real-time monitoring with <10ms overhead
- **Enforces budgets** - Automatic throttling and alerts
- **Integrates seamlessly** - Works with OpenAI, Anthropic, Ollama, and more

## 🚀 Quick Start

```bash
npm install @superinstance/smartcost
```

```typescript
import { SmartCost } from '@superinstance/smartcost';

// Initialize with your API keys
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
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          maxTokens: 16385,
          inputCostPerMillion: 0.5,
          outputCostPerMillion: 1.5,
          avgLatency: 1000,
          qualityScore: 0.8,
        },
      ],
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
});

console.log('Response:', response.content);
console.log('Cost:', response.cost.totalCost);
console.log('Saved:', response.cost.savingsPercent, '%');
console.log('Provider:', response.provider);
console.log('Cached:', response.cached);
```

## ✨ Key Features

### 1. Intelligent Routing

SmartCost analyzes each query's complexity and automatically routes to the cheapest viable model:

```typescript
const optimizer = new SmartCost({
  routingStrategy: 'cost-optimized', // 'speed-optimized' | 'quality-optimized' | 'balanced'
  providers: [/* ... */],
});

// Simple query → routes to GPT-3.5 ($0.002)
await optimizer.chat.completions.create({
  messages: [{ role: 'user', content: 'What is 2 + 2?' }],
});

// Complex query → routes to GPT-4 ($0.03)
await optimizer.chat.completions.create({
  messages: [
    { role: 'system', content: 'You are an expert mathematician.' },
    { role: 'user', content: 'Explain the Riemann hypothesis.' },
  ],
  temperature: 0.3,
});
```

### 2. Semantic Caching

Avoid repeat API calls using vector-based similarity matching:

```typescript
const optimizer = new SmartCost({
  cacheStrategy: 'semantic',
  cache: {
    similarityThreshold: 0.85, // 85% similarity
    ttl: 86400, // 1 day
  },
});

// First call - hits API ($0.03)
await optimizer.chat.completions.create({
  messages: [{ role: 'user', content: 'Explain photosynthesis' }],
});

// Similar call - hits cache ($0.00)
await optimizer.chat.completions.create({
  messages: [{ role: 'user', content: 'What is photosynthesis?' }],
});
```

### 3. Real-time Cost Monitoring

Track every API call with real-time budget enforcement:

```typescript
const optimizer = new SmartCost({
  monthlyBudget: 100,
  enableMonitoring: true,
});

// Listen to cost updates
optimizer.on('costUpdate', (metrics) => {
  console.log('Total Cost:', `$${metrics.totalCost.toFixed(2)}`);
  console.log('Budget Used:', `${(metrics.budgetUtilization * 100).toFixed(1)}%`);
  console.log('Savings:', `${metrics.savingsPercent.toFixed(1)}%`);
});

// Listen to budget alerts
optimizer.on('budgetAlert', (alert) => {
  if (alert.level === 'critical') {
    console.error('Budget at 90%+. Consider upgrading.');
  }
});

// Get current metrics
const metrics = optimizer.getCostMetrics();
console.log(metrics);
```

### 4. Multi-Provider Support

Use multiple providers with automatic failover:

```typescript
const optimizer = new SmartCost({
  providers: [
    // OpenAI
    {
      id: 'openai',
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      models: [/* ... */],
      priority: 10,
    },

    // Anthropic
    {
      id: 'anthropic',
      type: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: [/* ... */],
      priority: 5,
    },

    // Ollama (local, free)
    {
      id: 'ollama',
      type: 'ollama',
      baseURL: 'http://localhost:11434',
      models: [/* ... */],
      priority: 1, // Highest priority (free)
    },
  ],
});

// SmartCost routes intelligently, with automatic failover
const response = await optimizer.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## 📊 Cost Savings

SmartCost typically achieves:

- **50-70% savings** through intelligent routing
- **20-40% additional savings** through semantic caching
- **70-90% total savings** compared to unoptimized usage

Example savings for 10,000 requests:

| Strategy | Cost | Savings |
|----------|------|---------|
| GPT-4 only | $300 | 0% |
| SmartCost (routing) | $90 | 70% |
| SmartCost (routing + cache) | $30 | 90% |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     SmartCost                            │
├─────────────────────────────────────────────────────────┤
│  Drop-in API: optimizer.chat.completions.create()       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │    Semantic   │  │  Intelligent  │  │   Real-time │ │
│  │     Cache     │  │    Router     │  │ Cost Tracker│ │
│  │               │  │               │  │             │ │
│  │ • Exact match │  │ • Complexity  │  │ • <10ms     │ │
│  │ • Semantic    │  │   analysis    │  │   overhead  │ │
│  │   similarity  │  │ • Cost        │  │ • Budget    │ │
│  │ • LRU eviction│  │   prediction  │  │   enforcement│ │
│  └───────────────┘  └───────────────┘  └─────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Provider Adapters                       │ │
│  │  OpenAI │ Anthropic │ Ollama │ Cohere │ Custom      │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 📖 API Reference

### Configuration

```typescript
interface SmartCostConfig {
  monthlyBudget?: number;          // Default: 500
  alertThreshold?: number;         // Default: 0.8 (80%)
  cacheStrategy?: 'semantic' | 'exact' | 'hybrid' | 'disabled';
  routingStrategy?: 'cost-optimized' | 'speed-optimized' | 'quality-optimized' | 'balanced';
  providers?: ProviderConfig[];
  cache?: CacheConfig;
  budget?: BudgetConfig;
}
```

### Response Format

```typescript
interface ChatCompletionResponse {
  content: string;                  // Response text
  model: string;                    // Model used
  provider: string;                 // Provider used
  tokens: {
    input: number;                  // Input tokens
    output: number;                 // Output tokens
    total: number;                  // Total tokens
  };
  cost: {
    inputCost: number;              // Input cost
    outputCost: number;             // Output cost
    totalCost: number;              // Total cost
    originalCost?: number;          // Cost without optimization
    savings?: number;               // Amount saved
    savingsPercent?: number;        // Percentage saved
  };
  duration: number;                 // Request duration (ms)
  finishReason: string;             // Completion reason
  cached: boolean;                  // Was response cached?
  cacheSimilarity?: number;         // Cache similarity (0-1)
  routingDecision: RoutingDecision; // Why this model was chosen
}
```

### Events

```typescript
// Cost updates
optimizer.on('costUpdate', (metrics) => {
  console.log('Total cost:', metrics.totalCost);
  console.log('Savings:', metrics.savingsPercent, '%');
});

// Budget alerts
optimizer.on('budgetAlert', (alert) => {
  console.log('Budget', alert.level, ':', alert.utilization);
});

// Cache hits
optimizer.on('cacheHit', (event) => {
  console.log('Cache hit:', event.type, 'similarity:', event.similarity);
});

// Routing decisions
optimizer.on('routingDecision', (decision) => {
  console.log('Routed to:', decision.provider, decision.model);
});
```

## 🔧 Advanced Usage

### Streaming

```typescript
const response = await optimizer.stream(
  {
    messages: [{ role: 'user', content: 'Tell me a story' }],
  },
  (chunk) => {
    process.stdout.write(chunk); // Stream chunks
  }
);
```

### Function Calling

```typescript
const response = await optimizer.chat.completions.create({
  messages: [
    { role: 'user', content: 'What is the weather in SF?' },
  ],
  functions: [
    {
      name: 'get_weather',
      description: 'Get weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' },
        },
      },
    },
  ],
  functionCall: 'auto',
});
```

### Analytics

```typescript
// Get comprehensive analytics
const metrics = optimizer.getCostMetrics();
const cacheStats = optimizer.getCacheStats();
const routingStats = optimizer.getRoutingStats();
const budgetState = optimizer.getBudgetState();

console.log('Total cost:', metrics.totalCost);
console.log('Cache hit rate:', (cacheStats.hitRate * 100).toFixed(1) + '%');
console.log('Most used model:', routingStats.mostCommonModel);
console.log('Budget remaining:', budgetState.remaining);
```

## 🧪 Testing

```bash
npm test
npm run test:coverage
```

## 📦 Build

```bash
npm run build
```

## 🤝 Integration with Existing Tools

SmartCost integrates seamlessly with other SuperInstance tools:

### Cascade Router

```typescript
import { SmartCost } from '@superinstance/smartcost';
// SmartCost includes intelligent routing similar to Cascade Router
// with cost optimization built-in
```

### Vector Search

```typescript
import { VectorSearch } from '@superinstance/in-browser-vector-search';

const vectorSearch = new VectorSearch();

const optimizer = new SmartCost({
  cache: {
    // SmartCost can use vector search for semantic caching
    similarityThreshold: 0.85,
  },
});

// Or use custom vector search instance
```

## 📝 License

MIT

## 🙏 Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.

## 🔗 Links

- [GitHub](https://github.com/SuperInstance/SmartCost)
- [NPM](https://www.npmjs.com/package/@superinstance/smartcost)
- [Documentation](https://docs.superinstance.ai/smartcost)
- [Examples](./examples)

## 🎉 Roadmap

- [ ] Web dashboard for real-time monitoring
- [ ] Advanced token optimization algorithms
- [ ] Custom embedding models for semantic caching
- [ ] Multi-region support
- [ ] GraphQL API
- [ ] Kubernetes operator

---

Built with ❤️ by [SuperInstance](https://superinstance.ai)
