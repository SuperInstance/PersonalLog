# Context Optimization Engine - Complete Guide

## Overview

The Context Optimization Engine is an intelligent message prioritization system for the Spreader agent. It ensures that the most important messages are kept within token limits as conversations grow unbounded.

## Architecture

### Core Components

1. **ContextOptimizerEngine** (`context-optimizer.ts`)
   - Main optimization engine with multi-factor scoring
   - Configurable weights and strategies
   - Metrics tracking and reporting

2. **Context Integration** (`context-integration.ts`)
   - Integration layer for Spreader agent
   - Automatic optimization before/after spread operations
   - Task-specific context optimization

3. **Scoring System** (`importance-scoring.ts`)
   - Base importance scoring
   - Factor-based scoring (recency, relevance, hierarchy, etc.)

4. **Compression Strategies** (`compression-strategies.ts`)
   - Lossless, lossy, and hybrid compression
   - Redundancy detection
   - Summarization

## Features

### 1. Enhanced Scoring Algorithm

The optimizer uses a multi-factor scoring system:

```typescript
interface EnhancedMessageScore {
  recency: number           // 0-1, recent messages score higher
  relevance: number         // 0-1, semantic similarity to task
  hierarchy: number         // 0-1, user > assistant > system
  task: number              // 0-1, task-specific importance
  informationDensity: number // 0-1, unique content ratio
  total: number             // Weighted combination (0-1)
}
```

#### Scoring Factors

**Recency Scoring**
- Exponential decay over message position
- Last ~10 messages get significantly higher scores
- Formula: `Math.exp(-age / 10)`

**Relevance Scoring**
- Keyword matching against task requirements
- Semantic similarity analysis
- Boosts messages matching task context

**Hierarchy Scoring**
- User messages: 1.0
- AI assistant messages: 0.7
- System messages: 0.4

**Task-Specific Scoring**
- Code tasks: Boosts messages with code indicators
- Writing tasks: Boosts content-related messages
- Analysis tasks: Boosts analytical content

**Information Density**
- Ratio of unique words to total words
- Longer messages with high uniqueness get boosted
- Formula: `uniqueWords / totalWords`

### 2. Optimization Strategies

The optimizer automatically selects the best strategy:

#### `none`
- No optimization needed (context already within limits)

#### `preserve_only`
- Critical threshold exceeded
- Only keeps messages with preserve markers
- Used in extreme token pressure situations

#### `threshold`
- Warning threshold exceeded
- Removes messages below score threshold
- Default threshold: 0.3

#### `budget`
- Aggressive optimization needed
- Fits messages within strict token budget
- Prioritizes by score

#### `task_specific`
- Optimized for specific task requirements
- Analyzes task keywords and complexity
- Includes required messages

### 3. Preservation System

Messages can be force-preserved using markers:

```
[PRESERVE]    - Always keep this message
[IMPORTANT]   - Important information
[DECISION]    - Key decision made
[KEY]         - Key information
[CRITICAL]    - Critical information
```

Example:
```typescript
const message = {
  content: {
    text: "[PRESERVE] This is critical context for future tasks"
  }
}
```

### 4. Task-Specific Optimization

Automatically analyzes tasks and optimizes context accordingly:

```typescript
const task: TaskContextRequirements = {
  task: 'Implement authentication feature',
  taskType: 'code',
  keywords: ['auth', 'login', 'security', 'token'],
  minTokens: 1000,
  maxTokens: 8000,
  priority: 'high',
  requiredMessageIds: ['msg_123', 'msg_456']
}

const result = await optimizer.optimizeForTask(messages, task)
```

### 5. Metrics and Analytics

Comprehensive metrics tracking:

```typescript
interface ContextMetrics {
  totalOptimizations: number
  totalTokensSaved: number
  totalTimeSpent: number
  avgSavingsPercentage: number
  avgProcessingTime: number
  strategyCounts: Record<OptimizationStrategy, number>
  totalMessagesProcessed: number
  totalMessagesRemoved: number
  totalMessagesPreserved: number
  lastOptimization: string | null
  firstOptimization: string | null
}
```

## Usage

### Basic Usage

```typescript
import {
  getContextOptimizer,
  type ContextOptimizationResult
} from '@/lib/agents/spread'

// Get optimizer instance
const optimizer = getContextOptimizer()

// Optimize conversation
const result: ContextOptimizationResult = await optimizer.optimize(messages)

console.log(`Saved ${result.tokensSaved} tokens (${result.savingsPercentage}%)`)
console.log(`Removed ${result.messagesRemoved} messages`)
console.log(`Strategy: ${result.strategy}`)
```

### Custom Configuration

```typescript
import { ContextOptimizerEngine } from '@/lib/agents/spread'

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
```

### Integration with Spreader

```typescript
import {
  optimizeContextForSpread,
  optimizeContextAfterMerge
} from '@/lib/agents/spread'

// Before spreading tasks
const {
  optimizedParentContext,
  perTaskContexts,
  optimizationResult
} = await optimizeContextForSpread(parentMessages, tasks)

// After merging results
const {
  optimizedContext,
  optimizationResult
} = await optimizeContextAfterMerge(parentMessages, mergedMessages)
```

## Configuration

### Optimizer Config

```typescript
interface ContextOptimizerConfig {
  // Token budgets
  maxTokens: number                  // Maximum context size (default: 128000)
  warningThreshold: number           // Warning at this % (default: 0.60)
  criticalThreshold: number          // Critical at this % (default: 0.85)

  // Scoring weights (must sum to ~1.0)
  weights: {
    recency: number                  // Recent messages (default: 0.20)
    relevance: number                // Task relevance (default: 0.30)
    hierarchy: number                // User > AI > System (default: 0.15)
    task: number                     // Task-specific (default: 0.20)
    informationDensity: number       // Unique content (default: 0.15)
  }

  // Optimization thresholds
  minScoreThreshold: number          // Minimum score to keep (default: 0.3)
  preserveMarkers: string[]          // Force-preserve markers

  // Features
  enableSummarization: boolean       // Use summarization (default: true)
  enableDeduplication: boolean       // Remove duplicates (default: true)
  enableMetadataStripping: boolean   // Strip metadata (default: true)

  // Logging
  enableMetrics: boolean             // Track metrics (default: true)
  logLevel: 'none' | 'basic' | 'detailed'
}
```

## Performance

### Efficiency

- **Time Complexity**: O(n log n) for n messages
- **Space Complexity**: O(n) for scoring and sorting
- **Processing Speed**: <1 second for 1000 messages

### Optimization Strategies

1. **Small Conversations** (< 100 messages)
   - Strategy: `none`
   - Processing: <10ms

2. **Medium Conversations** (100-500 messages)
   - Strategy: `threshold`
   - Processing: 10-50ms

3. **Large Conversations** (500-1000 messages)
   - Strategy: `budget` or `task_specific`
   - Processing: 50-500ms

4. **Very Large Conversations** (1000+ messages)
   - Strategy: `preserve_only` if critical
   - Processing: 500-1000ms

## Best Practices

### 1. Use Preserve Markers

Mark critical messages that must be kept:

```typescript
// User explicitly marks important information
"[PRESERVE] The database schema uses UUIDs for all primary keys"

// System marks key decisions
"[DECISION] Using PostgreSQL as the primary database"
```

### 2. Configure Weights for Your Use Case

**Code-Heavy Conversations:**
```typescript
weights: {
  recency: 0.15,
  relevance: 0.35,  // High relevance for code matching
  hierarchy: 0.10,
  task: 0.30,       // High task importance
  informationDensity: 0.10
}
```

**General Conversations:**
```typescript
weights: {
  recency: 0.25,    // Recency more important
  relevance: 0.25,
  hierarchy: 0.20,
  task: 0.15,
  informationDensity: 0.15
}
```

### 3. Set Appropriate Thresholds

**Conservative** (keep more):
```typescript
warningThreshold: 0.70
criticalThreshold: 0.90
minScoreThreshold: 0.2
```

**Aggressive** (remove more):
```typescript
warningThreshold: 0.50
criticalThreshold: 0.75
minScoreThreshold: 0.4
```

### 4. Use Task-Specific Optimization

When spreading tasks, always use task-specific optimization:

```typescript
const tasks = [
  'Implement user authentication',
  'Design database schema',
  'Write API documentation'
]

for (const task of tasks) {
  const result = await optimizer.optimizeForTask(messages, {
    task,
    taskType: inferTaskType(task),
    keywords: extractKeywords(task),
    minTokens: 1000,
    maxTokens: 8000,
    priority: 'high',
    requiredMessageIds: []
  })

  // Use optimized context for this task
}
```

### 5. Monitor Metrics

Regularly check optimization metrics:

```typescript
const metrics = optimizer.getMetrics()

console.log(`Total optimizations: ${metrics.totalOptimizations}`)
console.log(`Avg savings: ${metrics.avgSavingsPercentage.toFixed(1)}%`)
console.log(`Avg processing time: ${metrics.avgProcessingTime.toFixed(0)}ms`)

// Strategy distribution
console.log('Strategy usage:', metrics.strategyCounts)

// Reset if needed (start fresh)
optimizer.resetMetrics()
```

## Advanced Features

### Custom Scoring

Extend the optimizer with custom scoring logic:

```typescript
class CustomContextOptimizer extends ContextOptimizerEngine {
  protected async calculateScores(
    messages: Message[],
    task?: AnalyzedTaskRequirements
  ): Promise<EnhancedMessageScore[]> {
    // Call parent for base scores
    const baseScores = await super.calculateScores(messages, task)

    // Apply custom logic
    for (const score of baseScores) {
      // Custom scoring logic here
      if (this.isHighlyReferenced(score.messageId)) {
        score.total = Math.min(score.total * 1.2, 1.0)
      }
    }

    return baseScores
  }

  private isHighlyReferenced(messageId: string): boolean {
    // Check if message is referenced by other messages
    // Implementation specific to your use case
    return false
  }
}
```

### Dynamic Configuration

Adjust configuration based on conversation state:

```typescript
const optimizer = getContextOptimizer()

// If approaching token limit, be more aggressive
const currentTokens = estimateTotalTokens(messages)
const usagePercentage = currentTokens / maxTokens

if (usagePercentage > 0.8) {
  optimizer.updateConfig({
    minScoreThreshold: 0.5,  // Raise threshold
    warningThreshold: 0.5    // Earlier warning
  })
} else if (usagePercentage < 0.3) {
  optimizer.updateConfig({
    minScoreThreshold: 0.2,  // Lower threshold
    warningThreshold: 0.7    // Later warning
  })
}
```

## Troubleshooting

### Problem: Too many messages removed

**Solution:**
- Lower `minScoreThreshold`
- Use preserve markers more frequently
- Adjust weights to favor recency

### Problem: Context still too large after optimization

**Solution:**
- Lower `maxTokens` configuration
- Enable aggressive summarization
- Use `preserve_only` strategy temporarily

### Problem: Important messages removed

**Solution:**
- Mark important messages with `[PRESERVE]`
- Increase `hierarchy` weight
- Add to `requiredMessageIds` in task requirements

### Problem: Slow optimization performance

**Solution:**
- Disable metrics (`enableMetrics: false`)
- Reduce conversation size before optimizing
- Use `threshold` strategy instead of `task_specific`

## API Reference

See inline TypeScript documentation in:
- `/src/lib/agents/spread/context-optimizer.ts`
- `/src/lib/agents/spread/context-integration.ts`
- `/src/lib/agents/spread/importance-scoring.ts`

## Testing

Run tests:

```bash
npm test -- context-optimizer
```

Test coverage includes:
- Basic optimization scenarios
- Preservation system
- Scoring algorithms
- Task-specific optimization
- Metrics tracking
- Performance benchmarks
- Edge cases

## Future Enhancements

Planned features:

1. **Semantic Similarity**
   - Vector embeddings for true semantic similarity
   - Topic clustering
   - Duplicate detection using embeddings

2. **Machine Learning**
   - Learn optimal weights from user feedback
   - Predict which messages will be needed
   - Adaptive scoring based on conversation patterns

3. **Advanced Summarization**
   - LLM-based summarization
   - Hierarchical summarization
   - Query- focused summarization

4. **Multi-Conversation Awareness**
   - Cross-conversation references
   - Global context management
   - Shared knowledge graphs

## Contributing

When contributing to the context optimizer:

1. Maintain zero TypeScript errors
2. Add tests for new features
3. Update this documentation
4. Consider performance implications
5. Test with large conversations (1000+ messages)

## License

Part of PersonalLog.AI - See project LICENSE file.
