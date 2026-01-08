# @superinstance/in-browser-vector-search

> Privacy-first in-browser vector search with semantic similarity and checkpointing

## ✨ Features

- **🔒 Privacy-First**: All data stored locally in IndexedDB, no server required
- **🔍 Semantic Search**: Find similar content using vector embeddings
- **🚀 Hybrid Search**: Combine semantic similarity with keyword matching
- **📦 Checkpoint System**: Save and restore knowledge states
- **🤖 LoRA Export**: Export data for fine-tuning AI models
- **⚡ Fast**: In-memory caching with LRU eviction
- **🎯 Custom Embeddings**: Use your own embedding generation function
- **📝 TypeScript**: Fully typed for excellent developer experience

## 📦 Installation

```bash
npm install @superinstance/in-browser-vector-search
```

## 🚀 Quick Start

```typescript
import { VectorStore } from '@superinstance/in-browser-vector-search'

// Initialize the store
const store = new VectorStore()
await store.init()

// Add some knowledge entries
await store.addEntry({
  id: 'doc1',
  type: 'document',
  sourceId: 'doc1',
  content: 'Vector search enables finding semantically similar content',
  metadata: {
    timestamp: new Date().toISOString(),
    tags: ['search', 'vectors']
  },
  editable: true
})

// Search semantically
const results = await store.search('find similar documents', {
  limit: 5,
  threshold: 0.7
})

results.forEach(result => {
  console.log(`Similarity: ${result.similarity}`)
  console.log(`Content: ${result.entry.content}`)
})
```

## 📖 Usage

### Adding Knowledge

```typescript
// Add a single entry
const entry = await store.addEntry({
  type: 'message',
  sourceId: 'msg123',
  content: 'Important project deadline next week',
  metadata: {
    timestamp: new Date().toISOString(),
    author: 'alice',
    starred: true
  },
  editable: true
})

// Add multiple entries efficiently
const entries = await store.addEntries([
  {
    type: 'message',
    sourceId: 'msg1',
    content: 'Content 1',
    metadata: { timestamp: new Date().toISOString() },
    editable: true
  },
  {
    type: 'message',
    sourceId: 'msg2',
    content: 'Content 2',
    metadata: { timestamp: new Date().toISOString() },
    editable: true
  }
])
```

### Semantic Search

```typescript
// Basic semantic search
const results = await store.search('project deadlines', {
  limit: 10,
  threshold: 0.7
})

// Filter by type
const messages = await store.search('important', {
  types: ['message'],
  limit: 5
})

// Filter by date range
const recent = await store.search('updates', {
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  }
})

// Only starred entries
const starred = await store.search('important', {
  starredOnly: true
})
```

### Hybrid Search

```typescript
// Combines semantic similarity with keyword matching
const results = await store.hybridSearch('important meeting', {
  limit: 10
})

// Keyword matches boost the semantic similarity score
// for more relevant results
```

### Managing Entries

```typescript
// Get a specific entry
const entry = await store.getEntry('doc1')

// Get entries with filters
const entries = await store.getEntries({
  type: 'message',
  starred: true,
  limit: 20,
  offset: 0
})

// Update an entry
const updated = await store.updateEntry('doc1', {
  content: 'Updated content'
})

// Delete an entry
await store.deleteEntry('doc1')
```

### Checkpoint System

```typescript
// Create a checkpoint
const checkpoint = await store.createCheckpoint('Before cleanup', {
  description: 'State before removing old entries',
  tags: ['stable', 'backup'],
  isStarred: true
})

// List all checkpoints
const checkpoints = await store.getCheckpoints()

// Rollback to a checkpoint
const { restored, removed } = await store.rollbackToCheckpoint(checkpoint.id)
console.log(`Restored ${restored} entries, removed ${removed}`)

// Get latest starred (stable) checkpoint
const stable = await store.getLatestStableCheckpoint()

// Star/unstar a checkpoint
await store.setCheckpointStarred(checkpoint.id, true)
```

### LoRA Training Export

```typescript
// Export for fine-tuning
const loraExport = await store.exportForLoRA(undefined, 'jsonl')

console.log(`Total entries: ${loraExport.statistics.totalEntries}`)
console.log(`Total tokens: ${loraExport.statistics.totalTokens}`)
console.log(`Avg quality: ${loraExport.statistics.avgQuality}`)

// Access entries
loraExport.entries.forEach(entry => {
  console.log(entry.text)
  console.log(entry.metadata)
})
```

### Custom Embeddings

```typescript
// Use your own embedding function
import { generateEmbeddings } from 'your-embedding-library'

const store = new VectorStore({
  embeddingGenerator: async (text: string) => {
    const embeddings = await generateEmbeddings([text])
    return embeddings[0]
  }
})

// Now all searches use your custom embeddings
const results = await store.search('query')
```

## 🔧 API Reference

### VectorStore

#### Constructor

```typescript
new VectorStore(options?: {
  embeddingGenerator?: (text: string) => Promise<number[]>
})
```

#### Methods

- `init(): Promise<void>` - Initialize the database
- `addEntry(entry): Promise<KnowledgeEntry>` - Add a knowledge entry
- `addEntries(entries): Promise<KnowledgeEntry[]>` - Add multiple entries
- `updateEntry(id, updates): Promise<KnowledgeEntry>` - Update an entry
- `getEntry(id): Promise<KnowledgeEntry | null>` - Get a specific entry
- `getEntries(filter?): Promise<KnowledgeEntry[]>` - Get entries with filters
- `deleteEntry(id): Promise<void>` - Delete an entry
- `search(query, options?): Promise<KnowledgeSearchResult[]>` - Semantic search
- `hybridSearch(query, options?): Promise<KnowledgeSearchResult[]>` - Hybrid search
- `createCheckpoint(name, options?): Promise<Checkpoint>` - Create checkpoint
- `getCheckpoints(): Promise<Checkpoint[]>` - List checkpoints
- `setCheckpointStarred(id, starred): Promise<Checkpoint>` - Star/unstar checkpoint
- `rollbackToCheckpoint(id): Promise<{restored, removed}>` - Rollback to checkpoint
- `getLatestStableCheckpoint(): Promise<Checkpoint | null>` - Get latest starred checkpoint
- `exportForLoRA(checkpointId?, format?): Promise<LoRAExport>` - Export for LoRA training

### Types

```typescript
interface KnowledgeEntry {
  id: string
  type: 'conversation' | 'message' | 'document' | 'contact'
  sourceId: string
  content: string
  embedding?: number[]
  metadata: {
    timestamp: string
    author?: string
    contactId?: string
    conversationId?: string
    tags?: string[]
    importance?: number
    starred?: boolean
  }
  editable: boolean
  editedContent?: string
  editedAt?: string
}

interface Checkpoint {
  id: string
  name: string
  createdAt: string
  entryCount: number
  isStarred: boolean
  description?: string
  tags: string[]
  vectorHash: string
}

interface KnowledgeSearchOptions {
  limit?: number
  threshold?: number
  types?: KnowledgeEntry['type'][]
  dateRange?: { start: string; end: string }
  tags?: string[]
  starredOnly?: boolean
}

interface KnowledgeSearchResult {
  entry: KnowledgeEntry
  similarity: number
  highlights?: string[]
}
```

## 🧪 Utility Functions

```typescript
import {
  cosineSimilarity,
  normalizeVector,
  dotProduct,
  euclideanDistance,
  hashEmbedding,
  estimateTokens
} from '@superinstance/in-browser-vector-search'

// Calculate similarity between vectors
const similarity = cosineSimilarity(vec1, vec2)

// Normalize vector to unit length
const normalized = normalizeVector(vec)

// Dot product
const dot = dotProduct(vec1, vec2)

// Euclidean distance
const dist = euclideanDistance(vec1, vec2)

// Hash-based embedding (for testing)
const embedding = hashEmbedding('text', 384)

// Estimate tokens
const tokens = estimateTokens('Your text here')
```

## 🎯 Use Cases

### 1. Personal Knowledge Base

```typescript
// Store notes and find semantically similar ones
await store.addEntry({
  type: 'document',
  sourceId: 'note1',
  content: 'Note about React hooks',
  metadata: {
    timestamp: new Date().toISOString(),
    tags: ['react', 'frontend']
  },
  editable: true
})

// Find related notes
const related = await store.search('useState and useEffect')
```

### 2. Chat Search

```typescript
// Index chat messages
await store.addEntry({
  type: 'message',
  sourceId: 'msg1',
  content: 'Discussion about project architecture',
  metadata: {
    timestamp: new Date().toISOString(),
    author: 'john',
    conversationId: 'conv1'
  },
  editable: true
})

// Search conversation history
const results = await store.search('architecture decisions', {
  types: ['message']
})
```

### 3. Document Management

```typescript
// Create checkpoints before bulk operations
await store.createCheckpoint('Before reindex', {
  isStarred: true
})

// Roll back if needed
await store.rollbackToCheckpoint(checkpointId)
```

### 4. AI Training Data

```typescript
// Export high-quality data for fine-tuning
const loraData = await store.exportForLoRA(undefined, 'jsonl')

// Use with your favorite training framework
```

## 📊 Performance

- **Storage**: IndexedDB with automatic indexing
- **Caching**: LRU cache for embeddings (configurable size)
- **Search**: Cosine similarity in O(n) where n is the number of entries
- **Memory**: ~1.5MB per 1000 vectors (384 dimensions)

## 🔒 Privacy

- All data stored locally in browser
- No network requests required
- No third-party tracking
- No data sent to servers
- Full control over your data

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires IndexedDB support

## 📝 License

MIT © [SuperInstance](https://github.com/SuperInstance)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📮 Contact

For issues and questions, please use the [GitHub issue tracker](https://github.com/SuperInstance/In-Browser-Vector-Search/issues).

---

Made with ❤️ by [SuperInstance](https://github.com/SuperInstance)
