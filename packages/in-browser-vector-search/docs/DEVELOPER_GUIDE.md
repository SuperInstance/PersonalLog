# Developer Guide - In-Browser Vector Search

> Complete API reference, integration patterns, and best practices for developers building privacy-first semantic search applications

## Table of Contents

1. [Installation](#installation)
2. [Complete API Reference](#complete-api-reference)
3. [Embedding Generation](#embedding-generation)
4. [WebGPU vs CPU](#webgpu-vs-cpu)
5. [Performance Tuning](#performance-tuning)
6. [Memory Optimization](#memory-optimization)
7. [Persistence Strategy](#persistence-strategy)
8. [Integration Examples](#integration-examples)
9. [Best Practices](#best-practices)
10. [Advanced Patterns](#advanced-patterns)

---

## Installation

### npm Installation

```bash
npm install @superinstance/in-browser-vector-search
```

### Import Options

**ES Modules (Recommended):**
```typescript
import { VectorStore, WebGPUVectorSearch } from '@superinstance/in-browser-vector-search'
```

**CommonJS:**
```javascript
const { VectorStore, WebGPUVectorSearch } = require('@superinstance/in-browser-vector-search')
```

**TypeScript:**
```typescript
import {
  VectorStore,
  WebGPUVectorSearch,
  KnowledgeEntry,
  KnowledgeSearchOptions,
  cosineSimilarity
} from '@superinstance/in-browser-vector-search'
```

### Browser Compatibility

**VectorStore (CPU-based):**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires IndexedDB support

**WebGPUVectorSearch (GPU-accelerated):**
- Chrome 113+ (stable)
- Edge 113+ (stable)
- Firefox Nightly (experimental)
- Safari Technology Preview (experimental)

---

## Complete API Reference

### VectorStore

The primary interface for vector storage and semantic search.

#### Constructor

```typescript
new VectorStore(options?: {
  embeddingGenerator?: (text: string) => Promise<number[]>
})
```

**Parameters:**
- `options` (optional)
  - `embeddingGenerator`: Custom function to generate embeddings (default: hash-based for testing)

**Example:**
```typescript
// Default (hash-based embeddings - for testing)
const store = new VectorStore()

// Custom embedding generator
import { embed } from 'some-embedding-library'

const store = new VectorStore({
  embeddingGenerator: async (text: string) => {
    const result = await embed(text)
    return result.embedding  // Must return number[]
  }
})
```

#### Methods

##### `init(): Promise<void>`

Initialize the IndexedDB database.

**Example:**
```typescript
const store = new VectorStore()
await store.init()
console.log('Database initialized')
```

##### `addEntry(entry): Promise<KnowledgeEntry>`

Add a single knowledge entry.

**Parameters:**
```typescript
interface KnowledgeEntryInput {
  type: 'conversation' | 'message' | 'document' | 'contact'
  sourceId: string
  content: string
  metadata?: {
    timestamp?: string
    author?: string
    contactId?: string
    conversationId?: string
    tags?: string[]
    importance?: number
    starred?: boolean
  }
  editable?: boolean
}
```

**Returns:** `Promise<KnowledgeEntry>` (with generated `id` and `embedding`)

**Example:**
```typescript
const entry = await store.addEntry({
  type: 'document',
  sourceId: 'doc1',
  content: 'Vector search enables semantic similarity',
  metadata: {
    timestamp: new Date().toISOString(),
    tags: ['search', 'vectors'],
    starred: true
  },
  editable: true
})

console.log('Entry added:', entry.id)
```

##### `addEntries(entries): Promise<KnowledgeEntry[]>`

Add multiple entries efficiently (batch operation).

**Parameters:** `KnowledgeEntryInput[]`

**Returns:** `Promise<KnowledgeEntry[]>`

**Example:**
```typescript
const entries = await store.addEntries([
  {
    type: 'document',
    sourceId: 'doc1',
    content: 'First document',
    metadata: { timestamp: new Date().toISOString() },
    editable: true
  },
  {
    type: 'document',
    sourceId: 'doc2',
    content: 'Second document',
    metadata: { timestamp: new Date().toISOString() },
    editable: true
  }
])

console.log(`Added ${entries.length} entries`)
```

##### `updateEntry(id, updates): Promise<KnowledgeEntry>`

Update an existing entry.

**Parameters:**
- `id`: Entry ID
- `updates`: Partial entry to update

**Returns:** `Promise<KnowledgeEntry>`

**Example:**
```typescript
const updated = await store.updateEntry('entry-id', {
  content: 'Updated content',
  editedContent: 'Original content',
  editedAt: new Date().toISOString()
})
```

##### `getEntry(id): Promise<KnowledgeEntry | null>`

Get a specific entry by ID.

**Parameters:**
- `id`: Entry ID

**Returns:** `Promise<KnowledgeEntry | null>`

**Example:**
```typescript
const entry = await store.getEntry('entry-id')
if (entry) {
  console.log('Found:', entry.content)
} else {
  console.log('Not found')
}
```

##### `getEntries(filter?): Promise<KnowledgeEntry[]>`

Get entries with optional filters.

**Parameters:**
```typescript
interface GetEntriesOptions {
  type?: KnowledgeEntry['type']
  starred?: boolean
  tags?: string[]
  dateRange?: { start: string; end: string }
  limit?: number
  offset?: number
}
```

**Returns:** `Promise<KnowledgeEntry[]>`

**Example:**
```typescript
// Get starred documents
const entries = await store.getEntries({
  type: 'document',
  starred: true,
  limit: 20
})

// Get entries from date range
const recent = await store.getEntries({
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  }
})
```

##### `search(query, options?): Promise<KnowledgeSearchResult[]>`

Perform semantic search.

**Parameters:**
- `query`: Search query string
- `options`: Search options

```typescript
interface KnowledgeSearchOptions {
  limit?: number        // Default: 10
  threshold?: number    // Default: 0.7
  types?: KnowledgeEntry['type'][]
  dateRange?: { start: string; end: string }
  tags?: string[]
  starredOnly?: boolean
}
```

**Returns:**
```typescript
interface KnowledgeSearchResult {
  entry: KnowledgeEntry
  similarity: number  // 0-1
  highlights?: string[]
}
```

**Example:**
```typescript
// Basic search
const results = await store.search('how to fix laptop')

// Advanced search with filters
const results = await store.search('laptop repair', {
  limit: 5,
  threshold: 0.8,
  types: ['document'],
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  }
})

results.forEach(result => {
  console.log(`${result.similarity}: ${result.entry.content}`)
})
```

##### `hybridSearch(query, options?): Promise<KnowledgeSearchResult[]>`

Perform hybrid search (semantic + keyword matching).

**Parameters:** Same as `search()`

**Returns:** Same as `search()`

**Example:**
```typescript
const results = await store.hybridSearch('iPhone 15 Pro Max', {
  limit: 10
})

// Keyword matches get boosted in similarity score
```

##### `deleteEntry(id): Promise<void>`

Delete an entry.

**Parameters:**
- `id`: Entry ID

**Example:**
```typescript
await store.deleteEntry('entry-id')
```

##### `createCheckpoint(name, options?): Promise<Checkpoint>`

Create a checkpoint for rollback.

**Parameters:**
```typescript
interface CheckpointOptions {
  description?: string
  tags?: string[]
  isStarred?: boolean
}
```

**Returns:**
```typescript
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
```

**Example:**
```typescript
const checkpoint = await store.createCheckpoint('Before cleanup', {
  description: 'State before removing old entries',
  tags: ['stable', 'backup'],
  isStarred: true
})
```

##### `getCheckpoints(): Promise<Checkpoint[]>`

Get all checkpoints.

**Returns:** `Promise<Checkpoint[]>`

**Example:**
```typescript
const checkpoints = await store.getCheckpoints()
checkpoints.forEach(cp => {
  console.log(`${cp.name}: ${cp.entryCount} entries`)
})
```

##### `rollbackToCheckpoint(id): Promise<{restored: number, removed: number}>`

Rollback to a checkpoint.

**Parameters:**
- `id`: Checkpoint ID

**Returns:** `Promise<{restored: number, removed: number}>`

**Example:**
```typescript
const { restored, removed } = await store.rollbackToCheckpoint(checkpointId)
console.log(`Restored ${restored} entries, removed ${removed}`)
```

##### `exportForLoRA(checkpointId?, format?): Promise<LoRAExport>`

Export data for LoRA training.

**Parameters:**
- `checkpointId` (optional): Export checkpoint state (default: current)
- `format` (optional): Export format (`'jsonl' | 'json' | 'parquet'`)

**Returns:**
```typescript
interface LoRAExport {
  checkpointId: string
  format: 'jsonl' | 'json' | 'parquet'
  entries: Array<{
    text: string
    metadata: Record<string, unknown>
  }>
  statistics: {
    totalEntries: number
    totalTokens: number
    avgQuality: number
    dateRange: { start: string; end: string }
  }
}
```

**Example:**
```typescript
const loraExport = await store.exportForLoRA(undefined, 'jsonl')

console.log(`Total entries: ${loraExport.statistics.totalEntries}`)
console.log(`Total tokens: ${loraExport.statistics.totalTokens}`)

// Export to file
const blob = new Blob(
  [loraExport.entries.map(e => JSON.stringify(e)).join('\n')],
  { type: 'application/jsonl' }
)
downloadBlob(blob, 'training-data.jsonl')
```

---

### WebGPUVectorSearch

GPU-accelerated vector similarity search.

#### Constructor

```typescript
new WebGPUVectorSearch(dimension: number, options?: {
  useGPU?: boolean        // Default: true
  batchSize?: number      // Default: auto-calculated
  enableTiming?: boolean  // Default: true
})
```

**Parameters:**
- `dimension`: Vector dimension (e.g., 384)
- `options`: Configuration options

**Example:**
```typescript
const gpuSearch = new WebGPUVectorSearch(384, {
  useGPU: true,
  batchSize: 128,
  enableTiming: true
})
```

#### Methods

##### `initializeGPU(): Promise<void>`

Initialize WebGPU device.

**Throws:**
- `WebGPUUnsupportedError`: WebGPU not available
- `WebGPUInitializationError`: Initialization failed

**Example:**
```typescript
try {
  await gpuSearch.initializeGPU()
  console.log('WebGPU initialized!')
} catch (error) {
  if (error instanceof WebGPUUnsupportedError) {
    console.log('WebGPU not supported, will use CPU')
  } else {
    console.error('Initialization error:', error)
  }
}
```

##### `isGPUSupported(): boolean`

Check if GPU is available and initialized.

**Returns:** `boolean`

**Example:**
```typescript
if (gpuSearch.isGPUSupported()) {
  console.log('GPU acceleration enabled')
} else {
  console.log('Using CPU fallback')
}
```

##### `static isBrowserSupported(): boolean`

Check if browser supports WebGPU.

**Returns:** `boolean`

**Example:**
```typescript
if (WebGPUVectorSearch.isBrowserSupported()) {
  console.log('Browser supports WebGPU')
}
```

##### `search(query, vectors, k): Promise<SearchResult[]>`

Search for similar vectors.

**Parameters:**
- `query`: Query vector (number[])
- `vectors`: Vector database (flat array: [v1_0, v1_1, ..., v2_0, v2_1, ...])
- `k`: Number of top results to return

**Returns:**
```typescript
interface SearchResult {
  index: number
  similarity: number
}
```

**Example:**
```typescript
const query = [/* 384 numbers */]
const vectors = [/* 10000 × 384 = 3,840,000 numbers */]
const k = 10

const results = await gpuSearch.search(query, vectors, k)
results.forEach(r => {
  console.log(`Index: ${r.index}, Similarity: ${r.similarity}`)
})
```

##### `batchSearch(queries, vectors, k): Promise<BatchSearchResult>`

Search multiple queries in parallel.

**Parameters:**
- `queries`: Array of query vectors
- `vectors`: Vector database (flat array)
- `k`: Number of top results per query

**Returns:**
```typescript
interface BatchSearchResult {
  results: SearchResult[][]
  gpuTime: number
  cpuTime: number
  usedGPU: boolean
}
```

**Example:**
```typescript
const queries = [
  [/* query 1 */],
  [/* query 2 */],
  [/* query 3 */]
]

const batchResults = await gpuSearch.batchSearch(queries, vectors, 10)

console.log('GPU time:', batchResults.gpuTime, 'ms')
console.log('Speedup:', batchResults.cpuTime / batchResults.gpuTime, 'x')

batchResults.results.forEach((results, i) => {
  console.log(`Query ${i} results:`, results)
})
```

##### `getMetrics(): PerformanceMetrics[]`

Get performance metrics for all searches.

**Returns:**
```typescript
interface PerformanceMetrics {
  gpuTime: number
  cpuTime: number
  speedup: number
  vectorCount: number
  vectorDimension: number
  usedGPU: boolean
}
```

**Example:**
```typescript
const metrics = gpuSearch.getMetrics()
metrics.forEach(m => {
  console.log(`Speedup: ${m.speedup}x (${m.vectorCount} vectors)`)
})
```

##### `getAverageSpeedup(): number`

Get average GPU speedup across all searches.

**Returns:** `number` (speedup multiplier)

**Example:**
```typescript
const avgSpeedup = gpuSearch.getAverageSpeedup()
console.log(`Average speedup: ${avgSpeedup.toFixed(2)}x`)
```

##### `getPerformanceSummary(): string`

Get formatted performance summary.

**Returns:** `string` (formatted summary)

**Example:**
```typescript
console.log(gpuSearch.getPerformanceSummary())
// Output:
// WebGPU Performance Summary
// ==========================
// GPU Searches: 15
// CPU Searches: 2
// Avg GPU Time: 45.23ms
// Avg CPU Time: 1234.56ms
// Avg Speedup: 27.31x
```

##### `clearMetrics(): void`

Clear performance metrics.

**Example:**
```typescript
gpuSearch.clearMetrics()
```

##### `destroy(): void`

Clean up GPU resources.

**Example:**
```typescript
// When done using GPU search
gpuSearch.destroy()
```

---

### Utility Functions

#### `cosineSimilarity(a, b): number`

Calculate cosine similarity between two vectors.

**Parameters:**
- `a`: First vector (number[])
- `b`: Second vector (number[])

**Returns:** `number` (similarity score -1 to 1)

**Example:**
```typescript
const similarity = cosineSimilarity(vec1, vec2)
console.log(`Similarity: ${similarity}`)
```

#### `normalizeVector(vector): number[]`

Normalize vector to unit length.

**Parameters:**
- `vector`: Vector to normalize

**Returns:** `number[]` (normalized vector)

**Example:**
```typescript
const normalized = normalizeVector(vector)
```

#### `dotProduct(a, b): number`

Calculate dot product of two vectors.

**Parameters:**
- `a`: First vector
- `b`: Second vector

**Returns:** `number`

**Example:**
```typescript
const dot = dotProduct(vec1, vec2)
```

#### `euclideanDistance(a, b): number`

Calculate Euclidean distance between two vectors.

**Parameters:**
- `a`: First vector
- `b`: Second vector

**Returns:** `number`

**Example:**
```typescript
const dist = euclideanDistance(vec1, vec2)
```

#### `hashEmbedding(text, dimension): number[]`

Generate hash-based embedding (for testing).

**Parameters:**
- `text`: Input text
- `dimension`: Embedding dimension (default: 384)

**Returns:** `number[]` (embedding vector)

**Example:**
```typescript
// For testing without external embedding service
const embedding = hashEmbedding('test text', 384)
```

#### `estimateTokens(text): number`

Estimate token count for text.

**Parameters:**
- `text`: Input text

**Returns:** `number` (estimated tokens)

**Example:**
```typescript
const tokens = estimateTokens('Your text here')
console.log(`Estimated ${tokens} tokens`)
```

---

## Embedding Generation

### Default Hash-Based Embeddings

The library includes a simple hash-based embedding generator for testing:

```typescript
const store = new VectorStore()
// Automatically uses hash-based embeddings
```

**Limitations:**
- ✅ Fast, no API calls
- ✅ Works offline
- ❌ Poor semantic understanding
- ❌ Not production-ready

### Production Embedding Services

#### OpenAI Embeddings

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const store = new VectorStore({
  embeddingGenerator: async (text: string) => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 384
    })

    return response.data[0].embedding
  }
})
```

#### Cohere Embeddings

```typescript
import { CohereClient } from 'cohere-ai'

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY })

const store = new VectorStore({
  embeddingGenerator: async (text: string) => {
    const response = await cohere.embed({
      texts: [text],
      model: 'embed-english-v3.0',
      inputType: 'search_document'
    })

    return response.embeddings[0]
  }
})
```

#### Local Embeddings (Transformers.js)

```typescript
import { pipeline, env } from '@xenova/transformers'

// Skip local model check
env.allowLocalModels = false

// Load model
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

const store = new VectorStore({
  embeddingGenerator: async (text: string) => {
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  }
})
```

**Benefits:**
- ✅ Runs entirely in browser
- ✅ No API costs
- ✅ Privacy-first
- ❌ Larger download (~100MB)
- ❌ Slower than GPU APIs

### Embedding Best Practices

#### Dimension Selection

| Dimension | Speed | Memory | Accuracy | Use Case |
|-----------|-------|--------|----------|----------|
| 128       | Fast  | Low    | Good     | Simple searches, prototyping |
| 384       | Fast  | Medium | Very Good | Most applications (default) |
| 768       | Slower| High   | Excellent| Complex concepts |
| 1536      | Slowest| Very High| Best    | Research, accuracy-critical |

#### Normalization

Always normalize embeddings for cosine similarity:

```typescript
const store = new VectorStore({
  embeddingGenerator: async (text: string) => {
    const embedding = await generateEmbedding(text)

    // Normalize to unit length
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map(val => val / magnitude)
  }
})
```

#### Batch Generation

Generate embeddings in batches for efficiency:

```typescript
async function batchAddEntries(contents: string[]) {
  // Generate embeddings in parallel
  const embeddings = await Promise.all(
    contents.map(content => generateEmbedding(content))
  )

  // Add entries with pre-generated embeddings
  const entries = await Promise.all(
    contents.map((content, i) =>
      store.addEntry({
        type: 'document',
        sourceId: `doc-${i}`,
        content,
        metadata: { timestamp: new Date().toISOString() },
        editable: true
      })
    )
  )

  return entries
}
```

---

## WebGPU vs CPU

### When to Use WebGPU

**Use WebGPU when:**
- Dataset size > 10K vectors
- Need real-time search (<100ms response time)
- Batch processing multiple queries
- Browser supports WebGPU

**Use CPU when:**
- Dataset size < 10K vectors
- Simple, infrequent searches
- Browser doesn't support WebGPU
- Memory constraints

### Performance Comparison

**Test Setup:**
- Vector dimension: 384
- Hardware: Typical laptop GPU
- Browser: Chrome 113+

**Results:**

| Dataset Size | CPU Time | GPU Time | Speedup |
|--------------|----------|----------|---------|
| 1K vectors   | 5ms      | 2ms      | 2.5x    |
| 10K vectors  | 50ms     | 5ms      | 10x     |
| 100K vectors | 500ms    | 15ms     | 33x     |
| 1M vectors   | 5000ms   | 80ms     | 62x     |

### Decision Tree

```
Need to search vectors
  │
  ├─ Browser supports WebGPU?
  │   ├─ Yes → Dataset > 10K?
  │   │   ├─ Yes → Use WebGPU 🚀
  │   │   └─ No → Use CPU (fast enough)
  │   └─ No → Use CPU (only option)
```

### Implementation Example

```typescript
import { VectorStore, WebGPUVectorSearch } from '@superinstance/in-browser-vector-search'

// Try WebGPU first
let searchEngine

try {
  const gpuSearch = new WebGPUVectorSearch(384)
  await gpuSearch.initializeGPU()

  if (datasetSize > 10000) {
    console.log('Using WebGPU acceleration')
    searchEngine = gpuSearch
  } else {
    console.log('Dataset too small for GPU benefit, using CPU')
    searchEngine = new VectorStore()
  }
} catch (error) {
  console.log('WebGPU not available, using CPU fallback')
  searchEngine = new VectorStore()
}

await searchEngine.init()
```

---

## Performance Tuning

### VectorStore Optimization

#### 1. Use IndexedDB Indexes

The library automatically creates indexes for common queries:

```typescript
// These queries are optimized with indexes:
await store.getEntries({ type: 'document' })        // type index
await store.getEntries({ starred: true })           // starred index
await store.getEntries({ dateRange: {...} })        // timestamp index
```

#### 2. Adjust Similarity Threshold

Higher threshold = faster search (fewer results to rank):

```typescript
const results = await store.search('query', {
  threshold: 0.8,  // Higher = fewer candidates = faster
  limit: 5
})
```

#### 3. Use Filters to Reduce Search Space

```typescript
// Filter first, then search
const results = await store.search('query', {
  types: ['document'],           // Only search documents
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  },
  starredOnly: true             // Only starred entries
})
```

### WebGPUVectorSearch Optimization

#### 1. Optimal Batch Size

```typescript
const gpuSearch = new WebGPUVectorSearch(384, {
  batchSize: 128  // Optimal for 384-dimensional vectors
})
```

**Batch Size Guidelines:**
- 128 dimensions → 256 queries/batch
- 384 dimensions → 128 queries/batch
- 768 dimensions → 64 queries/batch
- 1536 dimensions → 32 queries/batch

#### 2. Reuse GPU Device

```typescript
// Initialize once, reuse for multiple searches
const gpuSearch = new WebGPUVectorSearch(384)
await gpuSearch.initializeGPU()

// Multiple searches
for (const query of queries) {
  const results = await gpuSearch.search(query, vectors, k)
}

// Clean up when done
gpuSearch.destroy()
```

#### 3. Batch Similar Queries

```typescript
// Instead of:
for (const query of queries) {
  const results = await gpuSearch.search(query, vectors, k)
}

// Use batch search:
const batchResults = await gpuSearch.batchSearch(queries, vectors, k)

// 10-50x faster!
```

### Caching Strategy

#### Embedding Cache

The library uses an LRU cache for embeddings:

```typescript
// Cache is automatic
// First search: generates embeddings (slow)
const results1 = await store.search('query')

// Second search: uses cached embeddings (fast)
const results2 = await store.search('query')

// Cache size: 1000 entries (configurable in code)
```

#### Custom Cache Warming

```typescript
async function warmCache(commonQueries: string[]) {
  for (const query of commonQueries) {
    await store.search(query, { limit: 1 })
  }
  console.log('Cache warmed')
}

// Warm cache on app startup
await warmCache([
  'common search term 1',
  'common search term 2',
  // ...
])
```

---

## Memory Optimization

### Estimate Memory Usage

```typescript
import { estimateMemorySize } from '@superinstance/in-browser-vector-search'

// Per vector (384 dimensions, Float32Array)
const perVector = estimateMemorySize(384)
console.log(`Memory per vector: ${perVector} bytes`)

// Total for dataset
const totalMemory = estimateMemorySize(384) * numVectors
console.log(`Total memory: ${(totalMemory / 1024 / 1024).toFixed(2)} MB`)
```

**Approximations:**
- 384-dim vector: 1.5 KB
- 1K vectors: 1.5 MB
- 10K vectors: 15 MB
- 100K vectors: 150 MB
- 1M vectors: 1.5 GB

### Reduce Memory Usage

#### 1. Lower Dimension

```typescript
// Instead of 1536 dimensions
const store = new VectorStore({
  embeddingGenerator: async (text) => {
    return await generateEmbedding(text, 1536)  // 6 KB per vector
  }
})

// Use 384 dimensions
const store = new VectorStore({
  embeddingGenerator: async (text) => {
    return await generateEmbedding(text, 384)  // 1.5 KB per vector (4x less)
  }
})
```

#### 2. Use Quantization (Future)

Convert Float32 to Int8 (4x memory reduction):

```typescript
// Not yet implemented, but planned:
const store = new VectorStore({
  quantization: 'int8'  // 4x less memory
})
```

#### 3. Delete Old Entries

```typescript
// Remove entries older than 1 year
const oldEntries = await store.getEntries({
  dateRange: { end: '2023-01-01' }
})

for (const entry of oldEntries) {
  await store.deleteEntry(entry.id)
}
```

#### 4. Export and Archive

```typescript
// Export old data
const loraExport = await store.exportForLoRA(checkpointId)

// Save to file and delete from database
saveToFile(loraExport, 'archive-2023.jsonl')
await store.deleteOldEntries()
```

---

## Persistence Strategy

### IndexedDB Storage

The library uses IndexedDB for persistent storage:

```typescript
// Data persists across browser sessions
const store = new VectorStore()
await store.init()

// Add data
await store.addEntry({ /* ... */ })

// Close browser
// ... user returns later ...

// Data is still there!
const results = await store.search('query')
```

### Export/Import

#### Export to JSON

```typescript
const entries = await store.getEntries()
const json = JSON.stringify(entries, null, 2)

downloadFile(json, 'vector-store-backup.json', 'application/json')
```

#### Import from JSON

```typescript
const json = await loadFile('vector-store-backup.json')
const entries = JSON.parse(json)

await store.addEntries(entries)
```

#### Export for Training

```typescript
// Export in JSONL format for LoRA training
const loraExport = await store.exportForLoRA(undefined, 'jsonl')

// Each line: {"text": "...", "metadata": {...}}
const jsonl = loraExport.entries
  .map(e => JSON.stringify(e))
  .join('\n')

downloadFile(jsonl, 'training-data.jsonl', 'application/jsonl')
```

### Checkpoint System

#### Create Checkpoint

```typescript
const checkpoint = await store.createCheckpoint('Before migration', {
  description: 'Safety checkpoint before data migration',
  tags: ['stable', 'backup'],
  isStarred: true
})

console.log('Checkpoint created:', checkpoint.id)
```

#### Rollback to Checkpoint

```typescript
const { restored, removed } = await store.rollbackToCheckpoint(checkpointId)
console.log(`Restored ${restored} entries, removed ${removed}`)
```

#### List Checkpoints

```typescript
const checkpoints = await store.getCheckpoints()

checkpoints.forEach(cp => {
  console.log(`
    ${cp.name}
    Created: ${cp.createdAt}
    Entries: ${cp.entryCount}
    Starred: ${cp.isStarred}
  `)
})
```

---

## Integration Examples

### React Integration

```typescript
import { useEffect, useState } from 'react'
import { VectorStore } from '@superinstance/in-browser-vector-search'

function SearchApp() {
  const [store, setStore] = useState<VectorStore | null>(null)
  const [results, setResults] useState<KnowledgeSearchResult[]>([])
  const [query, setQuery] = useState('')

  // Initialize store
  useEffect(() => {
    const initStore = async () => {
      const vs = new VectorStore()
      await vs.init()
      setStore(vs)
    }

    initStore()
  }, [])

  // Handle search
  const handleSearch = async () => {
    if (!store || !query) return

    const searchResults = await store.search(query, {
      limit: 10,
      threshold: 0.7
    })

    setResults(searchResults)
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <button onClick={handleSearch}>Search</button>

      <ul>
        {results.map((result, i) => (
          <li key={i}>
            <strong>Similarity: {result.similarity.toFixed(2)}</strong>
            <p>{result.entry.content}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Vue Integration

```typescript
<template>
  <div>
    <input v-model="query" placeholder="Search..." @keyup.enter="search" />
    <button @click="search">Search</button>

    <ul>
      <li v-for="(result, i) in results" :key="i">
        <strong>Similarity: {{ result.similarity.toFixed(2) }}</strong>
        <p>{{ result.entry.content }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VectorStore } from '@superinstance/in-browser-vector-search'

const store = ref<VectorStore | null>(null)
const query = ref('')
const results = ref<KnowledgeSearchResult[]>([])

onMounted(async () => {
  store.value = new VectorStore()
  await store.value.init()
})

const search = async () => {
  if (!store.value || !query.value) return

  results.value = await store.value.search(query.value, {
    limit: 10,
    threshold: 0.7
  })
}
</script>
```

### Svelte Integration

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { VectorStore } from '@superinstance/in-browser-vector-search'

  let store: VectorStore | null = null
  let query = ''
  let results: KnowledgeSearchResult[] = []

  onMounted(async () => {
    store = new VectorStore()
    await store.init()
  })

  async function search() {
    if (!store || !query) return

    results = await store.search(query, {
      limit: 10,
      threshold: 0.7
    })
  }
</script>

<input bind:value={query} placeholder="Search..." on:keyup={search} />
<button on:click={search}>Search</button>

<ul>
  {#each results as result, i}
    <li>
      <strong>Similarity: {result.similarity.toFixed(2)}</strong>
      <p>{result.entry.content}</p>
    </li>
  {/each}
</ul>
```

### Node.js Integration (with IndexedDB Shim)

```typescript
import { VectorStore } from '@superinstance/in-browser-vector-search'
import { IDBFactory } from 'fake-indexeddb'

// Polyfill IndexedDB for Node.js
global.indexedDB = new IDBFactory()

const store = new VectorStore()
await store.init()

// Use in Node.js environment
await store.addEntry({
  type: 'document',
  sourceId: 'doc1',
  content: 'Node.js vector search!',
  metadata: { timestamp: new Date().toISOString() },
  editable: true
})

const results = await store.search('search')
console.log(results)
```

---

## Best Practices

### 1. Always Initialize Before Use

```typescript
// Good
const store = new VectorStore()
await store.init()
await store.addEntry({ /* ... */ })

// Bad (will throw error)
const store = new VectorStore()
await store.addEntry({ /* ... */ })  // Error: Database not initialized
```

### 2. Handle Errors Gracefully

```typescript
try {
  await store.addEntry({ /* ... */ })
} catch (error) {
  if (error instanceof QuotaError) {
    console.error('Storage quota exceeded, please delete old entries')
  } else if (error instanceof ValidationError) {
    console.error('Invalid entry:', error.message)
  } else {
    console.error('Unknown error:', error)
  }
}
```

### 3. Use Checkpoints for Bulk Operations

```typescript
// Before bulk operation
const checkpoint = await store.createCheckpoint('Before bulk delete')

// Perform operation
await store.deleteOldEntries()

// If something goes wrong, rollback
if (errorOccurred) {
  await store.rollbackToCheckpoint(checkpoint.id)
}
```

### 4. Optimize Similarity Threshold

```typescript
// Start with 0.7, adjust based on results
const results = await store.search(query, {
  threshold: 0.7,  // Adjust: 0.6 (more results), 0.8 (fewer, better)
  limit: 10
})
```

### 5. Use WebGPU for Large Datasets

```typescript
const datasetSize = await store.getEntries().length

if (datasetSize > 10000 && WebGPUVectorSearch.isBrowserSupported()) {
  const gpuSearch = new WebGPUVectorSearch(384)
  await gpuSearch.initializeGPU()

  // Use GPU for faster search
  const results = await gpuSearch.search(query, vectors, k)
}
```

---

## Advanced Patterns

### Custom Similarity Functions

```typescript
// Combine multiple similarity measures
function combinedSimilarity(
  semanticScore: number,
  keywordScore: number,
  recencyScore: number
): number {
  return semanticScore * 0.6 + keywordScore * 0.3 + recencyScore * 0.1
}
```

### Progressive Search

```typescript
// Show fast results first, then refine
async function progressiveSearch(query: string) {
  // Fast initial results (low threshold)
  const initial = await store.search(query, {
    threshold: 0.5,
    limit: 50
  })

  // Show to user immediately

  // Refine with higher threshold
  const refined = await store.search(query, {
    threshold: 0.75,
    limit: 10
  })

  // Update with refined results
  return { initial, refined }
}
```

### Multi-Vector Search

```typescript
// Search multiple embeddings per document
const titleEmbedding = await generateEmbedding(document.title)
const bodyEmbedding = await generateEmbedding(document.body)
const tagsEmbedding = await generateEmbedding(document.tags.join(' '))

// Combine scores
const titleResults = await store.searchVector(titleEmbedding)
const bodyResults = await store.searchVector(bodyEmbedding)
const tagsResults = await store.searchVector(tagsEmbedding)

// Weighted combination
const combined = combineResults([
  { results: titleResults, weight: 0.5 },
  { results: bodyResults, weight: 0.3 },
  { results: tagsResults, weight: 0.2 }
])
```

### Real-Time Indexing

```typescript
// Add entries as user types (debounced)
import { debounce } from 'lodash'

const debouncedIndex = debounce(async (content: string) => {
  await store.addEntry({
    type: 'document',
    sourceId: generateId(),
    content,
    metadata: { timestamp: new Date().toISOString() },
    editable: true
  })
}, 1000)

// Call on user input
inputElement.addEventListener('input', (e) => {
  debouncedIndex(e.target.value)
})
```

---

## Next Steps

- **Examples:** See the `examples/` directory for complete working examples
- **Architecture:** Read `ARCHITECTURE.md` for technical deep-dive
- **User Guide:** Read `USER_GUIDE.md` for end-user documentation

**Happy coding! 🚀**
