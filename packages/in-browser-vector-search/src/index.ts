/**
 * @superinstance/in-browser-vector-search
 *
 * Privacy-first in-browser vector search with semantic similarity and checkpointing.
 *
 * @example
 * ```typescript
 * import { VectorStore } from '@superinstance/in-browser-vector-search'
 *
 * const store = new VectorStore()
 * await store.init()
 *
 * // Add entries
 * await store.addEntry({
 *   type: 'document',
 *   sourceId: 'doc1',
 *   content: 'Your content here',
 *   metadata: { timestamp: new Date().toISOString() },
 *   editable: true
 * })
 *
 * // Search semantically
 * const results = await store.search('query')
 * ```
 */

// Main export
export { VectorStore } from './vector-store'

// WebGPU accelerated search
export {
  WebGPUVectorSearch,
  WebGPUUnsupportedError,
  WebGPUInitializationError,
} from './webgpu-vector-search'

// Types
export type {
  KnowledgeEntry,
  Checkpoint,
  LoRAExport,
  KnowledgeSearchOptions,
  KnowledgeSearchResult,
  EmbeddingGenerator
} from './vector-store'

export type {
  WebGPUSearchOptions,
  SearchResult,
  BatchSearchResult,
  PerformanceMetrics,
} from './webgpu-vector-search'

// Utilities
export {
  cosineSimilarity,
  normalizeVector,
  dotProduct,
  euclideanDistance,
  hashEmbedding,
  batchCosineSimilarity,
  topKSimilar,
  vectorMean,
  weightedSum,
  estimateMemorySize,
  recommendedBatchSize,
  estimateTokens,
  DEFAULT_EMBEDDING_DIM,
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_SEARCH_LIMIT,
  EPSILON,
  CHARS_PER_TOKEN,
  MAX_EMBEDDING_CACHE_SIZE,
  MIN_KEYWORD_LENGTH,
  KEYWORD_MATCH_BOOST
} from './vector-utils'

// Errors
export {
  VectorSearchError,
  StorageError,
  ValidationError,
  NotFoundError,
  QuotaError
} from './errors'
