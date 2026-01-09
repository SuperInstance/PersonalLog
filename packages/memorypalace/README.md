# MemoryPalace

> Hierarchical Three-Tier Memory System for AI Agents

[![npm version](https://badge.fury.io/js/%40superinstance%2Fmemorypalace.svg)](https://www.npmjs.com/package/@superinstance/memorypalace)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MemoryPalace** is a sophisticated memory system for AI agents featuring three-tier storage, automatic consolidation, semantic retrieval, and cross-agent memory sharing.

## Features

- **Three-Tier Memory Architecture**
  - Working Memory (seconds/minutes): Fast access for current context
  - Short-term Memory (hours/days): Recent conversations and learnings
  - Long-term Memory (weeks/years): Persistent knowledge and skills

- **Automatic Consolidation**
  - Importance-based promotion between tiers
  - Smart eviction when at capacity
  - Configurable consolidation intervals

- **Semantic Retrieval**
  - Vector-based similarity search
  - Cross-tier ranked results
  - Tag-based organization

- **Multi-Agent Sharing**
  - Controlled memory sharing between agents
  - Privacy levels (private, shared, public)
  - Granular permission management

## Installation

```bash
npm install @superinstance/memorypalace
```

## Quick Start

```typescript
import { MemoryPalace } from '@superinstance/memorypalace';

// Initialize with default configuration
const memory = new MemoryPalace({
  workingMemorySize: 50,
  shortTermCapacity: 5000,
  longTermCapacity: 1000000,
  consolidationInterval: 3600000  // 1 hour
});

// Store in working memory
memory.working.set('currentTask', 'Building AI agents');

// Store in short-term
await memory.shortTerm.store('User preference', {
  topic: 'technical',
  detailLevel: 'high'
});

// Store in long-term
await memory.longTerm.store('Important knowledge', {
  fact: 'WebGPU enables 60 FPS inference in browsers'
}, {
  importance: 0.9,
  tags: ['webgpu', 'performance']
});

// Retrieve across all tiers
const results = await memory.retrieve('webgpu');
```

## Architecture

```
┌─────────────────────────────────────────┐
│  Working Memory (< 1ms access)          │
│  - Current context                      │
│  - Active tasks                         │
│  - Size: 10-100 items                   │
└─────────────────────────────────────────┘
           ↓ (automatic consolidation)
┌─────────────────────────────────────────┐
│  Short-term Memory (< 10ms access)      │
│  - Recent conversations                 │
│  - Recent learnings                     │
│  - Size: 1,000-10,000 items             │
└─────────────────────────────────────────┘
           ↓ (automatic consolidation)
┌─────────────────────────────────────────┐
│  Long-term Memory (< 100ms access)      │
│  - Persistent knowledge                 │
│  - Skills and abilities                 │
│  - Size: 1,000,000+ items               │
└─────────────────────────────────────────┘
```

## Usage Examples

### Basic Operations

```typescript
// Working memory - fast temporary storage
memory.working.set('key', 'value');
const value = memory.working.get('key');

// Short-term - recent information
const id = await memory.shortTerm.store(content, {
  importance: 0.6,
  tags: ['conversation', 'session-123']
});

// Long-term - persistent knowledge
const id = await memory.longTerm.store(knowledge, {
  importance: 0.9,
  tags: ['knowledge', 'permanent']
});
```

### Cross-Tier Retrieval

```typescript
// Search across all tiers
const results = await memory.retrieve('query');

// Semantic search with vector embedding
const semanticResults = await memory.semanticSearch(
  'machine learning',
  queryEmbedding,
  { minSimilarity: 0.7 }
);

// Get by tags
const tagged = await memory.getByTag('important');

// Get important memories
const important = await memory.getImportant(0.8);
```

### Memory Sharing

```typescript
// Share with another agent
await memory.share(
  memoryId,
  'agent-alpha',
  'agent-beta',
  {
    permissions: { canRead: true, canWrite: false }
  }
);

// Get shared memories
const shared = await memory.getShared('agent-beta');

// Check access permissions
const access = await memory.sharing.canAccess(memoryId, 'agent-beta');
```

### Automatic Consolidation

```typescript
// Manual consolidation
const result = await memory.consolidate();
console.log('Promoted:', result.promoted);
console.log('Evicted:', result.evicted);

// Listen to consolidation events
memory.on('consolidation:completed', (result) => {
  console.log('Consolidation finished:', result);
});
```

## Configuration

```typescript
const memory = new MemoryPalace({
  consolidation: {
    workingToShortTermThreshold: 0.6,  // Promote above this
    shortToLongTermThreshold: 0.8,     // Promote above this
    workingMaxSize: 50,
    shortTermMaxSize: 5000,
    longTermMaxSize: 1000000,
    consolidationInterval: 3600000     // 1 hour
  },
  retrieval: {
    vectorDimensions: 384,
    similarityThreshold: 0.6,
    maxResults: 100,
    tierWeights: {
      working: 3.0,    // Boost working memory
      shortTerm: 1.5,
      longTerm: 1.0
    }
  },
  sharing: {
    enabled: true,
    defaultPrivacy: PrivacyLevel.PRIVATE,
    requirePermission: false
  }
});
```

## API Reference

### MemoryPalace

Main class for memory management.

#### Properties

- `working: WorkingMemory` - Working memory instance
- `shortTerm: ShortTermMemory` - Short-term memory instance
- `longTerm: LongTermMemory` - Long-term memory instance
- `retrieval: SemanticRetrieval` - Semantic retrieval engine
- `sharing: MultiAgentMemory` - Multi-agent sharing system

#### Methods

- `retrieve(query: string | MemoryQuery)` - Search across all tiers
- `semanticSearch(query, embedding, options?)` - Vector-based search
- `store(content, options?)` - Auto-tier storage
- `share(memoryId, from, to, options?)` - Share memory
- `consolidate()` - Manual consolidation
- `getStats()` - Memory statistics
- `destroy()` - Clean up resources

### WorkingMemory

Fast in-memory storage.

- `set(key, value, options?)` - Store a value
- `get(key)` - Get a value
- `has(key)` - Check existence
- `delete(key)` - Remove a value
- `getAll()` - Get all memories
- `getByTag(tag)` - Get by tag
- `updateImportance(key, value)` - Update importance

### ShortTermMemory

Medium-duration storage with TTL.

- `store(content, options?)` - Store and get ID
- `get(id)` - Retrieve by ID
- `getByAgent(agentId)` - Get agent's memories
- `search(query, options?)` - Keyword search
- `update(id, updates)` - Update memory
- `delete(id)` - Remove memory

### LongTermMemory

Persistent storage with vector indexing.

- `store(content, options?)` - Store with embedding
- `get(id)` - Retrieve by ID
- `semanticSearch(embedding, options?)` - Vector search
- `keywordSearch(query, options?)` - Text search
- `update(id, updates)` - Update memory
- `delete(id)` - Remove memory

## Examples

See the [examples](./examples/) directory for complete demonstrations:

1. [Basic Operations](./examples/01-basic-operations.ts)
2. [Tiered Storage](./examples/02-tiered-storage.ts)
3. [Semantic Retrieval](./examples/03-semantic-retrieval.ts)
4. [Automatic Consolidation](./examples/04-automatic-consolidation.ts)
5. [Cross-Agent Sharing](./examples/05-cross-agent-sharing.ts)
6. [Importance Scoring](./examples/06-importance-scoring.ts)
7. [Long-term Learning](./examples/07-long-term-learning.ts)
8. [Context Management](./examples/08-context-management.ts)
9. [Memory Optimization](./examples/09-memory-optimization.ts)
10. [Privacy Controls](./examples/10-privacy-controls.ts)

## Performance Targets

| Tier | Access Time | Capacity | Duration |
|------|-------------|----------|----------|
| Working | < 1ms | 10-100 items | seconds/minutes |
| Short-term | < 10ms | 1,000-10,000 items | hours/days |
| Long-term | < 100ms | 1,000,000+ items | weeks/years |

## License

MIT © [SuperInstance](https://github.com/SuperInstance)

## Related Packages

- [@superinstance/agentswarm](https://github.com/SuperInstance/AgentSwarm) - Market-based multi-agent coordination
- [@superinstance/vector-search](https://github.com/SuperInstance/vector-search) - WebGPU vector search
