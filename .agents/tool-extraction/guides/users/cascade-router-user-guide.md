# Cascade Router User Guide

**Intelligent LLM Routing for Cost & Quality**

---

## What is Cascade Router?

Cascade Router is an intelligent LLM routing system that automatically chooses the best AI model for each task. It optimizes for cost, speed, and quality by routing easy tasks to fast/cheap models and hard tasks to powerful/expensive ones.

### What Problem Does It Solve?

**The Problem:**
- GPT-4 is great but expensive ($0.03/1K tokens)
- GPT-3.5 is cheaper but less capable
- Local models are free but limited
- Which model should you use for each task?

**The Cascade Router Solution:**
- Automatically analyze task complexity
- Route to appropriate model
- Stay within budget constraints
- Fallback on errors
- Monitor performance and optimize routing

### Real-World Example

**Before Cascade Router:**
```
Developer: "I'll use GPT-4 for everything"
Result: $500 API bill in one week 😬
```

**After Cascade Router:**
```
Developer: "I'll let Cascade decide"
Result:
  - Simple questions → Local model (free)
  - Medium complexity → GPT-3.5 ($0.002/1K)
  - Complex tasks → GPT-4 ($0.03/1K)

Total cost: $50 for same workload! 🎉
```

---

## When to Use Cascade Router

Use Cascade Router when:

**Perfect For:**
- Building AI-powered applications
- Managing API costs across multiple LLMs
- Need reliable fallback strategies
- Want progress monitoring for long tasks
- Balancing speed vs quality vs cost
- Batch processing many requests

**Not Ideal For:**
- One-off queries (just use any model directly)
- Tasks requiring 100% predictable behavior
- Strict compliance requirements (use specific model)

---

## Installation

### Option 1: CLI Tool

```bash
npm install -g @superinstance/cascade-router

# Or use npx (no installation)
npx @superinstance/cascade-router "Your task"
```

### Option 2: Library

```bash
npm install @superinstance/cascade-router
```

```typescript
import { CascadeRouter } from '@superinstance/cascade-router'

const router = new CascadeRouter()
const result = await router.route({
  task: "Your task here",
  budget: 1.00,
  strategy: 'auto'
})
```

---

## Quick Start Guide

### Your First Routed Request

**Step 1: Configure providers**

```bash
cascade-router config init
```

This creates `~/.cascade-router/config.yaml`:

```yaml
providers:
  - name: ollama-llama3
    type: ollama
    base_url: http://localhost:11434
    model: llama3
    priority: 1
    cost_per_1k_tokens: 0

  - name: gpt-3.5-turbo
    type: openai
    model: gpt-3.5-turbo
    priority: 2
    cost_per_1k_tokens: 0.002

  - name: gpt-4
    type: openai
    model: gpt-4
    priority: 3
    cost_per_1k_tokens: 0.03
```

**Step 2: Set your API keys**

```bash
export OPENAI_API_KEY="sk-..."
```

**Step 3: Run a routed request**

```bash
cascade-router "What is the capital of France?"
```

**Output:**
```
🔍 Analyzing task complexity...
   Task: Simple factual question
   Complexity: Low (15/100)
   Selected: ollama-llama3 (local, free)

✓ Response: Paris (France)
Cost: $0.000
Time: 0.3s
```

**Step 4: Try a complex task**

```bash
cascade-router "Analyze this codebase for security vulnerabilities and suggest fixes"
```

**Output:**
```
🔍 Analyzing task complexity...
   Task: Complex security analysis
   Complexity: High (85/100)
   Selected: gpt-4 (best quality)

✓ [Comprehensive security analysis...]
Cost: $2.45
Time: 15.3s
```

---

## Core Concepts

### 1. Providers

Providers are the AI models that Cascade Router can choose from.

**Provider Types:**
- `openai` - OpenAI models (GPT-4, GPT-3.5, etc.)
- `anthropic` - Anthropic models (Claude 3, etc.)
- `ollama` - Local models via Ollama
- `local` - Custom local models
- `mcp` - Model Context Protocol servers

**Provider Priority:**
Lower priority = tried first (for simple tasks)
Higher priority = used for complex tasks

### 2. Routing Strategies

Cascade Router supports multiple routing strategies:

**`auto` (Recommended)**
- Analyzes task complexity
- Chooses best provider based on:
  - Task complexity score
  - Budget constraints
  - Past performance
  - Provider availability

**`cost`**
- Always choose cheapest provider
- Good for: background tasks, batch processing
- Bad for: quality-critical tasks

**`speed`**
- Always choose fastest provider
- Good for: real-time responses, UI interactions
- Bad for: complex reasoning tasks

**`quality`**
- Always choose best provider
- Good for: critical decisions, final outputs
- Bad for: cost-sensitive applications

### 3. Complexity Analysis

Cascade Router analyzes each task to estimate complexity:

**Factors:**
- Input length (longer = more complex)
- Question type (factual = simple, reasoning = complex)
- Domain specificity (general = simple, technical = complex)
- Required outputs (summary = simple, generation = complex)
- Context requirements (no context = simple, much context = complex)

**Complexity Score:** 0-100
- 0-30: Simple (use local/cheap models)
- 30-60: Medium (use mid-tier models)
- 60-100: Complex (use best models)

### 4. Budget Management

Set budget limits to control costs:

```yaml
budgeting:
  hourly_limit: 10.00
  daily_limit: 100.00
  request_limit: 1.00
  alert_at: 0.80  # Alert at 80% of budget
```

Cascade Router will:
- Track spending in real-time
- Downgrade to cheaper models when budget is tight
- Alert you before hitting limits
- Stop requests when budget exceeded

### 5. Fallback Strategy

When a provider fails, Cascade Router automatically falls back:

```
Primary Request (GPT-4) → Fails (API error)
    ↓
Fallback 1 (GPT-3.5) → Fails (rate limit)
    ↓
Fallback 2 (Local model) → Success ✓
```

Configure fallback behavior:

```yaml
fallback:
  enabled: true
  max_attempts: 3
  strategy: degrade_quality  # or retry_same, escalate
```

---

## Common Patterns

### Pattern 1: Chatbot with Escalation

Simple questions use cheap models, complex ones escalate to GPT-4:

```typescript
const router = new CascadeRouter()

app.post('/chat', async (req, res) => {
  const response = await router.route({
    task: req.body.message,
    strategy: 'auto',
    budget: 0.50,
    user_id: req.user.id
  })

  res.json(response)
})
```

**Result:**
- "What's your name?" → Local model (free, instant)
- "Explain quantum entanglement" → GPT-3.5 ($0.01, good enough)
- "Debug this complex concurrent issue" → GPT-4 ($0.50, worth it)

### Pattern 2: Batch Processing

Process many documents with automatic cost optimization:

```bash
cascade-router \
  --strategy cost \
  --budget 10.00 \
  --batch ./documents/*.txt \
  "Summarize each document"
```

**Result:**
- Simple docs → Local model (free)
- Medium docs → GPT-3.5 (cheap)
- Complex docs → GPT-4 (when necessary)
- Total cost: ~$10 instead of $50+

### Pattern 3: Progressive Enhancement

Start with cheap model, upgrade if unsatisfied:

```typescript
let response = await router.route({
  task: userQuery,
  strategy: 'cost',
  max_quality: 'medium'
})

// If response quality is low, retry with better model
if (response.quality_score < 0.7) {
  response = await router.route({
    task: userQuery,
    strategy: 'quality',
    previous_response: response  // Context for improvement
  })
}
```

### Pattern 4: Adaptive Speed

Adjust routing based on urgency:

```typescript
const strategy = isUrgent ? 'speed' : 'cost'

const response = await router.route({
  task: userQuery,
  strategy: strategy,
  timeout: isUrgent ? 5000 : 30000
})
```

### Pattern 5: Cost-Conscious Development

Develop with local models, deploy with cloud models:

```yaml
# config.yaml
environments:
  development:
    providers:
      - ollama-llama3
      - ollama-mistral
    default_strategy: cost

  production:
    providers:
      - gpt-3.5-turbo
      - gpt-4
    default_strategy: auto
```

---

## Configuration

### Full Configuration Example

```yaml
# ~/.cascade-router/config.yaml

# Provider list (order matters for priority)
providers:
  # Local models (tried first)
  - name: ollama-llama3
    type: ollama
    base_url: http://localhost:11434
    model: llama3
    priority: 1
    cost_per_1k_tokens: 0
    capabilities:
      max_tokens: 4096
      supports_streaming: true

  # Mid-tier cloud models
  - name: gpt-3.5-turbo
    type: openai
    model: gpt-3.5-turbo
    priority: 2
    cost_per_1k_tokens: 0.002
    api_key_env: OPENAI_API_KEY

  # Top-tier cloud models
  - name: gpt-4
    type: openai
    model: gpt-4
    priority: 3
    cost_per_1k_tokens: 0.03
    api_key_env: OPENAI_API_KEY

  - name: claude-3-opus
    type: anthropic
    model: claude-3-opus-20240229
    priority: 3
    cost_per_1k_tokens: 0.015
    api_key_env: ANTHROPIC_API_KEY

# Routing settings
routing:
  default_strategy: auto  # auto, cost, speed, quality
  complexity_threshold:
    low: 30
    medium: 60
    high: 100

# Budget management
budgeting:
  enabled: true
  hourly_limit: 10.00
  daily_limit: 100.00
  request_limit: 1.00
  alert_at: 0.80
  stop_at: 1.00

# Fallback settings
fallback:
  enabled: true
  max_attempts: 3
  strategy: degrade_quality
  retry_delay: 1000  # ms

# Monitoring
monitoring:
  log_requests: true
  track_costs: true
  metrics_retention_days: 30

# Performance optimization
optimization:
  cache_enabled: true
  cache_ttl: 3600  # seconds
  batch_parallel_requests: true
  max_concurrent_requests: 5
```

### Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-..."

# Configuration
export CASCADE_ROUTER_CONFIG="./config.yaml"
export CASCADE_ROUTER_LOG_LEVEL="info"
export CASCADE_ROUTER_CACHE_DIR="./.cascade-cache"
```

---

## Advanced Usage

### Custom Complexity Scorer

Define your own complexity scoring:

```typescript
import { CascadeRouter, ComplexityScorer } from '@superinstance/cascade-router'

class MyComplexityScorer implements ComplexityScorer {
  score(task: string): number {
    // Custom logic
    if (task.includes('security')) return 90
    if (task.includes('debug')) return 70
    return 30
  }
}

const router = new CascadeRouter({
  complexityScorer: new MyComplexityScorer()
})
```

### Custom Provider

Add your own provider:

```typescript
import { Provider } from '@superinstance/cascade-router'

class MyCustomProvider implements Provider {
  name = 'my-custom-provider'
  priority = 2
  costPer1kTokens = 0.001

  async execute(task: string): Promise<string> {
    // Your custom logic
    return `Custom result for: ${task}`
  }
}

const router = new CascadeRouter()
router.addProvider(new MyCustomProvider())
```

### Middleware

Add middleware to requests:

```typescript
const router = new CascadeRouter({
  middleware: [
    async (context, next) => {
      console.log('Before:', context.task)
      const result = await next(context)
      console.log('After:', result.cost)
      return result
    }
  ]
})
```

### Monitoring & Metrics

Access routing metrics:

```typescript
const metrics = await router.getMetrics()

console.log('Total cost:', metrics.totalCost)
console.log('Requests by provider:', metrics.requestsByProvider)
console.log('Average latency:', metrics.averageLatency)
console.log('Cost savings:', metrics.costSavings)
```

---

## Tips and Tricks

### Tip 1: Start with Auto Strategy

```bash
# Let Cascade learn what works
cascade-router --strategy auto "Your task"
```

Over time, Cascade learns which providers work best for which tasks.

### Tip 2: Use Budget Limits

```bash
# Never overspend
cascade-router --budget 5.00 "Your expensive task"
```

Better to get a partial answer than a $100 bill!

### Tip 3: Enable Caching

```yaml
# Cache repeated queries
optimization:
  cache_enabled: true
  cache_ttl: 3600
```

Identical queries hit the cache (free!) instead of APIs.

### Tip 4: Monitor in Production

```typescript
// Set up alerts
router.on('budget_alert', (usage) => {
  console.warn(`Budget at ${usage.percentage}%`)
})

router.on('provider_error', (error) => {
  console.error('Provider failed:', error.provider)
})
```

### Tip 5: Use Local Models for Development

```yaml
# dev config
providers:
  - ollama-llama3  # Free, fast for development

# prod config
providers:
  - gpt-3.5-turbo
  - gpt-4
```

---

## Troubleshooting

### Issue: "Always using the most expensive model"

**Solution:**
```yaml
# Adjust complexity thresholds
routing:
  complexity_threshold:
    low: 50      # Higher = more tasks use cheap models
    medium: 80
    high: 100
```

### Issue: "Hitting budget limits too quickly"

**Solution:**
```bash
# Use cost strategy for non-critical tasks
cascade-router --strategy cost "Your task"
```

### Issue: "Local model gives poor results"

**Solution:**
```yaml
# Increase model priority for better local models
providers:
  - name: ollama-mixtral  # Better than llama3
    priority: 2  # Try this before GPT-3.5
```

### Issue: "Too many fallback attempts"

**Solution:**
```yaml
# Reduce max attempts
fallback:
  max_attempts: 2
  strategy: retry_same  # Instead of degrading
```

---

## Examples

### Example 1: Simple CLI Usage

```bash
# Ask a question (auto routing)
cascade-router "Explain the difference between TCP and UDP"

# Force cheapest model
cascade-router --strategy cost "What's 2+2?"

# Force best quality
cascade-router --strategy quality "Anze this complex codebase"
```

### Example 2: Cost-Conscious Batch Processing

```bash
# Process 1000 documents with $10 budget
cascade-router \
  --strategy cost \
  --budget 10.00 \
  --batch ./docs/*.txt \
  "Summarize this document in 3 bullet points"
```

### Example 3: Real-Time Chatbot

```typescript
import express from 'express'
import { CascadeRouter } from '@superinstance/cascade-router'

const app = express()
const router = new CascadeRouter({
  strategy: 'speed',  // Prioritize fast responses
  budget: 0.10       // Per request
})

app.post('/chat', async (req, res) => {
  const { message } = req.body

  const response = await router.route({
    task: message,
    timeout: 3000,  // 3 second timeout
    stream: true    // Stream response
  })

  res.stream(response)
})
```

### Example 4: Progressive Analysis

```typescript
// Start with cheap analysis
const quick = await router.route({
  task: "Analyze this code",
  strategy: 'cost',
  max_quality: 'medium'
})

// If issues found, do deep analysis
if (quick.issues_found > 0) {
  const deep = await router.route({
    task: `Deep analysis: ${quick.issues}`,
    strategy: 'quality',
    context: quick.result  // Build on quick analysis
  })
}
```

---

## Best Practices

1. **Start with Auto Strategy:** Let Cascade learn optimal routing

2. **Set Budget Limits:** Prevent unexpected costs

3. **Enable Caching:** Avoid redundant API calls

4. **Monitor Metrics:** Track costs and performance over time

5. **Use Local Models:** Free and fast for development

6. **Configure Fallbacks:** Ensure reliability when providers fail

7. **Test Strategies:** Different strategies work for different use cases

8. **Review Logs:** Understand why routing decisions were made

---

## Reference

### CLI Commands

```bash
# Route a request
cascade-router "Your task"

# Specify strategy
cascade-router --strategy auto "Your task"
cascade-router --strategy cost "Your task"
cascade-router --strategy speed "Your task"
cascade-router --strategy quality "Your task"

# Set budget
cascade-router --budget 5.00 "Your task"

# Batch processing
cascade-router --batch ./files/*.txt "Summarize"

# Interactive mode
cascade-router --interactive

# Show stats
cascade-router stats

# Clear cache
cascade-router cache clear

# Config management
cascade-router config init
cascade-router config validate
cascade-router config show
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `--strategy` | auto | Routing strategy |
| `--budget` | none | Maximum cost per request |
| `--timeout` | 30000 | Request timeout (ms) |
| `--max-parallel` | 5 | Concurrent requests in batch |
| `--cache` | true | Enable caching |
| `--fallback` | true | Enable fallback |

### API Reference

```typescript
// Create router
const router = new CascadeRouter(options)

// Route a request
const result = await router.route({
  task: string,
  strategy?: 'auto' | 'cost' | 'speed' | 'quality',
  budget?: number,
  timeout?: number,
  context?: any
})

// Get metrics
const metrics = await router.getMetrics()

// Add provider
router.addProvider(provider)

// Remove provider
router.removeProvider(name)
```

---

## Next Steps

1. Set up your providers (local + cloud)
2. Try different strategies with your tasks
3. Set budget limits and monitor costs
4. Integrate into your application
5. Share your routing rules with the community

**Need help?** [GitHub Discussions](https://github.com/SuperInstance/CascadeRouter/discussions)

**Want to contribute?** [CONTRIBUTING.md](https://github.com/SuperInstance/CascadeRouter/blob/main/CONTRIBUTING.md)
