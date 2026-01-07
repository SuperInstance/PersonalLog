# Context Optimizer - Quick Reference

## Import

```typescript
import {
  getContextOptimizer,
  ContextOptimizerEngine,
  optimizeContextForSpread,
  optimizeContextAfterMerge
} from '@/lib/agents/spread'
```

## Basic Usage

```typescript
// Get singleton instance
const optimizer = getContextOptimizer()

// Optimize conversation
const result = await optimizer.optimize(messages)

console.log(`Saved ${result.tokensSaved} tokens (${result.savingsPercentage}%)`)
console.log(`Strategy: ${result.strategy}`)
console.log(`Removed ${result.messagesRemoved} messages`)
```

## Task-Specific Optimization

```typescript
const result = await optimizer.optimizeForTask(messages, {
  task: 'Implement user authentication',
  taskType: 'code',
  keywords: ['auth', 'login', 'security', 'token'],
  minTokens: 1000,
  maxTokens: 8000,
  priority: 'high',
  requiredMessageIds: ['msg_123', 'msg_456']
})
```

## Spreader Integration

```typescript
// Before spreading
const {
  optimizedParentContext,
  perTaskContexts,
  optimizationResult
} = await optimizeContextForSpread(parentMessages, tasks)

// After merging
const {
  optimizedContext,
  optimizationResult
} = await optimizeContextAfterMerge(parentMessages, mergedMessages)
```

## Configuration

```typescript
// Custom configuration
const customOptimizer = new ContextOptimizerEngine({
  maxTokens: 64000,
  warningThreshold: 0.7,
  criticalThreshold: 0.9,
  weights: {
    recency: 0.25,
    relevance: 0.35,
    hierarchy: 0.10,
    task: 0.15,
    informationDensity: 0.15
  },
  minScoreThreshold: 0.4,
  enableMetrics: true
})

// Update existing
optimizer.updateConfig({
  maxTokens: 128000,
  minScoreThreshold: 0.3
})
```

## Preservation Markers

```typescript
// In message content
"[PRESERVE] This must be kept"
"[IMPORTANT] Critical information"
"[DECISION] We chose option A"
"[KEY] Key point to remember"
"[CRITICAL] System critical"
```

## Metrics

```typescript
// Get metrics
const metrics = optimizer.getMetrics()

console.log(`Optimizations: ${metrics.totalOptimizations}`)
console.log(`Tokens saved: ${metrics.totalTokensSaved}`)
console.log(`Avg savings: ${metrics.avgSavingsPercentage.toFixed(1)}%`)
console.log(`Strategy usage:`, metrics.strategyCounts)

// Reset metrics
optimizer.resetMetrics()
```

## Result Structure

```typescript
interface ContextOptimizationResult {
  originalMessages: Message[]
  optimizedMessages: Message[]
  originalTokens: number
  optimizedTokens: number
  tokensSaved: number
  savingsPercentage: number
  messagesRemoved: number
  messagesKept: number
  preservedCount: number
  scores: EnhancedMessageScore[]
  strategy: OptimizationStrategy
  processingTime: number
  summary: string
}
```

## Strategies

- `none` - No optimization needed
- `preserve_only` - Only keep preserved messages
- `threshold` - Remove below threshold
- `budget` - Fit within budget
- `task_specific` - Optimized for task

## Scoring Factors

- `recency` (0-1) - Recent messages higher
- `relevance` (0-1) - Task keyword matching
- `hierarchy` (0-1) - User > AI > System
- `task` (0-1) - Task-specific importance
- `informationDensity` (0-1) - Unique content ratio
- `total` (0-1) - Weighted combination

## Best Practices

1. **Use preserve markers** for critical messages
2. **Adjust weights** based on conversation type
3. **Set appropriate thresholds** for your use case
4. **Use task-specific optimization** when spreading
5. **Monitor metrics** to track performance
6. **Test with large conversations** (1000+ messages)

## Performance

- <100 messages: <10ms
- 100-500 messages: 10-50ms
- 500-1000 messages: 50-500ms
- 1000+ messages: <1000ms

## Testing

```bash
npm test -- context-optimizer
```

## Documentation

Full guide: `CONTEXT_OPTIMIZER_GUIDE.md`
