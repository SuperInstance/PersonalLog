# MemoryPalace Architecture

This document describes the architecture and design decisions of MemoryPalace.

## Overview

MemoryPalace implements a three-tier hierarchical memory system inspired by human cognitive psychology:

1. **Working Memory** - Analogous to human working memory, holds current context
2. **Short-term Memory** - Recent information with time-based decay
3. **Long-term Memory** - Persistent knowledge with semantic indexing

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MemoryPalace                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Working   │  │  Short-term │  │  Long-term  │        │
│  │   Memory    │  │   Memory    │  │   Memory    │        │
│  │  (in-memory)│  │  (indexed)  │  │ (persisted) │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│         └────────────────┴────────────────┘                │
│                          │                                 │
│                   ┌──────▼──────┐                          │
│                   │   Retrieval  │                          │
│                   │   Engine     │                          │
│                   └──────┬──────┘                          │
│                          │                                 │
│                   ┌──────▼──────┐                          │
│                   │   Sharing   │                          │
│                   │   System    │                          │
│                   └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Storage Layer

#### WorkingMemory
- **Implementation**: In-memory Map
- **Access Pattern**: O(1) get/set
- **Eviction**: LRU + importance-based
- **Use Case**: Active tasks, current context

#### ShortTermMemory
- **Implementation**: Indexed Map with TTL
- **Access Pattern**: O(1) by ID, O(n) search
- **Eviction**: Time-based + importance
- **Use Case**: Recent conversations, session data

#### LongTermMemory
- **Implementation**: Indexed Map with vector index
- **Access Pattern**: O(1) by ID, O(n) semantic search
- **Persistence**: Optional disk storage
- **Use Case**: Knowledge, skills, relationships

### 2. Retrieval Layer

#### SemanticRetrieval
- Cross-tier search with ranking
- Combines multiple signals:
  - Vector similarity
  - Importance score
  - Recency
  - Access frequency
- Tier-weighted scoring

#### Retrieval Flow
```
Query → Parallel Search → Score Results → Rank → Return Top K
         ├─ Working      └─ Combine Signals
         ├─ Short-term
         └─ Long-term
```

### 3. Sharing Layer

#### MultiAgentMemory
- Access control per memory
- Privacy levels: PRIVATE, SHARED, PUBLIC
- Granular permissions: READ, WRITE, DELETE
- Share request workflow

## Data Structures

### Memory
```typescript
interface Memory {
  id: string;
  agentId: string;
  tier: MemoryTier;
  content: any;
  importance: number;        // 0-1
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  updatedAt: number;
  status: MemoryStatus;
  tags: string[];
  embedding?: number[];
  privacy: PrivacyLevel;
  sharedWith?: string[];
  metadata?: Record<string, any>;
}
```

### Consolidation Configuration
```typescript
interface ConsolidationConfig {
  workingToShortTermThreshold: number;  // Default: 0.6
  shortToLongTermThreshold: number;     // Default: 0.8
  workingMaxSize: number;
  shortTermMaxSize: number;
  longTermMaxSize: number;
  consolidationInterval: number;
}
```

## Consolidation Algorithm

```
1. Calculate importance for each memory
   - Base importance from storage
   - Access frequency boost
   - Recency boost
   - Tag-based boost

2. Promotion Criteria
   - Working → Short-term: importance >= threshold
   - Short-term → Long-term: importance >= threshold

3. Eviction Criteria
   - Over capacity: evict lowest importance
   - TTL expired: remove expired memories
   - Manual deletion: immediate removal

4. Update indexes
   - Remove from source tier
   - Add to destination tier
   - Update vector index if applicable
```

## Semantic Search

### Vector Similarity
- Uses cosine similarity by default
- Configurable similarity threshold
- Supports custom distance functions

### Hybrid Search
Combines semantic and keyword search:
```
score = semantic_weight * similarity +
        keyword_weight * text_relevance
```

## Event System

MemoryPalace emits events for monitoring:

```typescript
'memory:created'    // New memory stored
'memory:accessed'   // Memory retrieved
'memory:updated'    // Memory modified
'memory:evicted'    // Memory removed
'memory:shared'     // Memory shared with agent
'consolidation:started'   // Consolidation cycle start
'consolidation:completed' // Consolidation cycle done
```

## Performance Considerations

### Working Memory
- Keep small (10-100 items)
- Use for hot data only
- Auto-eviction enabled by default

### Short-term Memory
- Configure TTL appropriately
- Monitor utilization
- Tag for efficient retrieval

### Long-term Memory
- Use embeddings for semantic search
- Compress large content
- Archive old memories periodically

## Thread Safety

MemoryPalace is designed for single-threaded Node.js environments:
- No locking primitives
- EventEmitter for async coordination
- Consolidation runs sequentially

## Extension Points

### Custom Embedding Function
```typescript
const memory = new MemoryPalace();
await memory.longTerm.store(content, {
  embedding: await myEmbeddingFunction(content)
});
```

### Custom Scoring
```typescript
memory.retrieval.updateConfig({
  tierWeights: { working: 5, shortTerm: 2, longTerm: 1 },
  importanceWeight: 0.3,
  recencyWeight: 0.2
});
```

## Security Considerations

1. **Privacy**: Default to PRIVATE, explicit sharing
2. **Permissions**: Granular per-memory control
3. **Agent isolation**: Agents can't access each other's private memories
4. **Audit**: Track all share operations

## Future Enhancements

1. **Distributed storage** - Cross-process memory sharing
2. **Compression** - Automatic content compression
3. **Index optimization** - More sophisticated indexing
4. **Memory export/import** - Backup and migration
5. **Query planning** - Optimize complex queries
