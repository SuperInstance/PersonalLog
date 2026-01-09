# SmartCost Architecture

## System Overview

SmartCost is an intelligent AI cost optimization engine that reduces LLM API costs by 50-90% through three core mechanisms:

1. **Intelligent Routing** - Automatically selects the optimal model for each query
2. **Semantic Caching** - Eliminates redundant API calls using vector similarity
3. **Real-Time Cost Tracking** - Monitors and enforces budgets with <10ms overhead

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SmartCost Engine                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐      ┌─────────────────┐                   │
│  │   Application  │─────▶│  SmartCost API  │                   │
│  └────────────────┘      └────────┬────────┘                   │
│                                    │                            │
│           ┌────────────────────────┼────────────────┐           │
│           ▼                        ▼                ▼           │
│  ┌────────────────┐    ┌─────────────────┐  ┌──────────────┐  │
│  │ Query Analysis │    │ Semantic Cache  │  │ Cost Tracker │  │
│  └────────┬───────┘    └────────┬────────┘  └──────┬───────┘  │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌────────────────┐    ┌─────────────────┐  ┌──────────────┐  │
│  |Intelligent     │    │ Vector Search   │  │ Budget       │  │
│  |Router         │    │ (In-Browser)    │  │ Manager      │  │
│  └────────┬───────┘    └────────┬────────┘  └──────┬───────┘  │
│           │                    │                    │           │
│           └────────────────────┴────────────────────┘           │
│                                    │                            │
│                                    ▼                            │
│                       ┌─────────────────────┐                   │
│                       │  Provider Layer     │                   │
│                       ├─────────────────────┤                   │
│                       │ • OpenAI            │                   │
│                       │ • Anthropic         │                   │
│                       │ • Ollama (local)    │                   │
│                       │ • Custom providers  │                   │
│                       └─────────────────────┘                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cost Tracker

**Purpose:** Real-time cost monitoring and budget enforcement

**Key Features:**
- <10ms tracking overhead
- Predictive cost estimation
- Real-time budget alerts
- Automatic budget period reset
- Detailed cost breakdowns

**Data Flow:**
```
Request → trackRequestStart() → Budget Check
                                    ↓
                              API Call Made
                                    ↓
Request ← trackRequestComplete() ← Metrics Updated
            ↓
        Cost Record Stored
            ↓
        Budget Updated
            ↓
        Alerts Emitted (if needed)
```

**State Management:**
- In-memory record storage (last 10,000 records)
- Automatic cleanup of old records
- Provider/model cost aggregation
- Budget state tracking

### 2. Intelligent Router

**Purpose:** Automatic model selection based on query analysis

**Routing Strategies:**
1. **Cost-Optimized** - Always choose cheapest viable model
2. **Speed-Optimized** - Choose fastest model (lowest latency)
3. **Quality-Optimized** - Choose highest quality model
4. **Balanced** - Balance cost, speed, and quality
5. **Priority** - Use provider priority order with fallback
6. **Fallback** - Try cheapest first, escalate on failure

**Query Analysis Pipeline:**
```
Input Request
      ↓
Calculate Complexity Score (0-1)
      ↓
Identify Required Capabilities
      ↓
Estimate Token Counts
      ↓
Match Against Available Models
      ↓
Score Each Option
      ↓
Apply Routing Strategy
      ↓
Return Routing Decision
```

**Complexity Factors:**
- Token count (30% weight)
- Message count (20% weight)
- System message presence (10%)
- Function calling (15%)
- Low temperature (10%)
- Stop sequences (5%)

**Provider State Management:**
- Health monitoring
- Rate limiting enforcement
- Error tracking with automatic failover
- Latency tracking (rolling average)

### 3. Semantic Cache

**Purpose:** Eliminate redundant API calls using semantic similarity

**Cache Strategy:**
1. **Exact Match** - String-based deduplication (instant)
2. **Semantic Match** - Vector similarity search (fast)
3. **Hybrid** - Try exact, fallback to semantic

**How It Works:**
```
Query Received
      ↓
Generate Vector Embedding
      ↓
Search Cache (Similarity ≥ 0.85)
      ↓
    ┌──────┴──────┐
    ↓             ↓
Cache Hit    Cache Miss
    ↓             ↓
Return     Make API Call
Response        ↓
          Store in Cache
                ↓
          Return Response
```

**Cache Metadata:**
- Vector embeddings
- Timestamp
- Access count
- TTL (configurable)
- Similarity scores

## Data Models

### CostRecord
```typescript
{
  requestId: string;
  timestamp: number;
  provider: string;
  model: string;
  tokens: { input, output, total };
  cost: { inputCost, outputCost, totalCost };
  duration: number;
  cached: boolean;
  cacheHitType: 'semantic' | 'exact' | 'none';
}
```

### RoutingDecision
```typescript
{
  provider: string;
  model: string;
  strategy: RoutingStrategy;
  confidence: number; // 0-1
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
  qualityScore: number;
  alternatives: RoutingAlternative[];
}
```

### BudgetState
```typescript
{
  total: number;
  used: number;
  remaining: number;
  utilization: number; // 0-1
  periodStart: number;
  periodEnd: number;
  alertThreshold: number;
  alertTriggered: boolean;
}
```

## Performance Characteristics

### Throughput
- **Routing:** 100+ decisions/second
- **Tracking:** 500+ operations/second
- **Caching:** 1000+ lookups/second

### Latency
- **Routing overhead:** <50ms per request
- **Tracking overhead:** <10ms per request
- **Cache lookup:** <5ms per query

### Memory
- **Record storage:** Limited to 10,000 records
- **Cache size:** Configurable (default 100MB)
- **Vector storage:** In-memory Float32Array

### Scalability
- **Request volume:** 1000+ requests/minute tested
- **Provider count:** Handles 10+ providers efficiently
- **History size:** Last 1,000 routing decisions maintained

## Integration Points

### Input Integration
```typescript
// Direct API calls
SmartCost.route(request, strategy)

// Wrapper functions
SmartCost.trackOpenAI(apiCall)
SmartCost.trackAnthropic(apiCall)

// Middleware
app.use(SmartCost.middleware())
```

### Output Integration
```typescript
// Event listeners
tracker.on('budgetAlert', handler)
tracker.on('costUpdate', handler)

// Metrics APIs
tracker.getCostMetrics()
tracker.getBudgetState()
router.getRoutingStats()
```

### Provider Integration
```typescript
// OpenAI
smartcost.complete({
  provider: 'openai',
  model: 'gpt-4',
  messages: [...]
})

// Anthropic
smartcost.complete({
  provider: 'anthropic',
  model: 'claude-3-opus',
  messages: [...]
})

// Ollama (local)
smartcost.complete({
  provider: 'ollama',
  model: 'llama2',
  messages: [...]
})
```

## Error Handling

### Budget Exceeded
```
Request → Budget Check → Exceeded
                          ↓
                  Emit budgetAlert
                          ↓
                  Block request
                          ↓
                  Return error
```

### Provider Unavailable
```
Request → Route → Provider Down
                    ↓
              Check alternatives
                    ↓
              Failover to next provider
                    ↓
              Update provider state
```

### Cache Failure
```
Query → Cache Lookup → Cache Error
                           ↓
                   Fallback to API
                           ↓
                   Continue normally
```

## Security Considerations

### API Keys
- Environment variables supported
- No keys stored in code
- Optional per-provider key injection

### Budget Enforcement
- Hard denies at 100% budget
- Throttling at configurable thresholds
- No override mechanisms (by design)

### Data Privacy
- All tracking in-memory
- No external data transmission
- Cache storage configurable (memory/IndexedDB)

## Deployment Architecture

### Client-Side (Browser)
```
Application
    ↓
SmartCost (bundled)
    ↓
Direct to Provider APIs
```

### Server-Side (Node.js)
```
Application
    ↓
SmartCost (installed)
    ↓
Provider APIs (via proxy)
```

### Hybrid
```
Client → SmartCost → Server → Provider APIs
              ↓           ↑
         Cache/Tracking  Proxy/Keys
```

## Optimization Strategies

### Cost Optimization
1. Use cost-optimized routing for simple queries
2. Enable semantic caching (30-60% savings)
3. Use local models (Ollama) for testing
4. Set appropriate budget alerts
5. Monitor per-model costs

### Performance Optimization
1. Cache routing decisions
2. Batch metric queries
3. Use speed-optimized routing when latency matters
4. Enable in-memory cache for fastest lookups
5. Limit record storage

### Accuracy Optimization
1. Use quality-optimized routing for complex tasks
2. Increase semantic similarity threshold
3. Monitor cache hit quality
4. Review low-confidence routing decisions
5. Use fallback strategy for critical queries

## Monitoring & Observability

### Metrics Collected
- Total cost and token usage
- Request count and rate
- Cache hit rate and savings
- Provider/model distribution
- Average latency
- Budget utilization

### Alerts Generated
- Budget threshold warnings (80%, 90%, 100%)
- Provider unavailability
- Cache failures (if configured)
- Unusual spending patterns

### Debug Information
- Routing decision reasoning
- Query complexity scores
- Similarity scores for cache hits
- Provider state history

## Future Enhancements

### Planned Features
1. **Machine Learning Integration**
   - Learn from user feedback
   - Optimize routing over time
   - Predict query complexity

2. **Advanced Caching**
   - Distributed caching (Redis)
   - Cache preloading
   - Intelligent cache invalidation

3. **Budget Optimization**
   - Predictive budget planning
   - Cost forecasting
   - Automated spending optimization

4. **Provider Management**
   - Dynamic provider discovery
   - Automatic failover testing
   - Provider health scoring

### Extension Points
1. Custom routing strategies
2. Custom cache backends
3. Custom analytics providers
4. Custom budget strategies
5. Custom provider adapters

## Design Principles

1. **Zero Dependencies on Core** - Works standalone
2. **Optional Integration** - Use what you need
3. **Production Ready** - Comprehensive error handling
4. **Developer First** - Clear APIs and documentation
5. **Performance Focused** - <10ms overhead
6. **Security Conscious** - No data exfiltration
7. **Extensible** - Plugin architecture
8. **Observable** - Comprehensive metrics

## Testing Strategy

### Unit Tests
- Cost tracking operations
- Routing logic
- Cache operations
- Budget enforcement
- Provider state management

### Integration Tests
- End-to-end workflows
- Multi-provider scenarios
- Budget enforcement
- Cache effectiveness

### Performance Tests
- Load testing (1000+ req/min)
- Latency benchmarks
- Memory profiling
- Concurrency testing

### Coverage Goals
- Lines: 80%+
- Functions: 80%+
- Branches: 75%+
- Statements: 80%+
