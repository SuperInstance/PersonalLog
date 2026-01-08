/**
 * Vector Math Utilities
 *
 * Shared utility functions for vector operations.
 * Optimized for in-browser semantic search.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default embedding dimension for common models (e.g., sentence-transformers) */
export const DEFAULT_EMBEDDING_DIM = 384

/** Minimum value considered non-zero for normalization safety */
export const EPSILON = 1e-10

/** Character-to-token ratio for rough token estimation */
export const CHARS_PER_TOKEN = 4

/** Maximum cache size for embedding cache (LRU eviction) */
export const MAX_EMBEDDING_CACHE_SIZE = 1000

/** Minimum word length for keyword matching in hybrid search */
export const MIN_KEYWORD_LENGTH = 3

/** Keyword match boost factor in hybrid search */
export const KEYWORD_MATCH_BOOST = 0.05

/** Default similarity threshold for semantic search */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.7

/** Default result limit for semantic search */
export const DEFAULT_SEARCH_LIMIT = 10

/** Hash seed multiplier for hash-based embeddings */
export const HASH_MULTIPLIER = 1103515245

/** Hash seed additive constant for hash-based embeddings */
export const HASH_ADDITIVE = 12345

/** Hash bitmask for 32-bit integer generation */
export const HASH_BITMASK = 0x7fffffff

/** Hash modulo for vector normalization */
export const HASH_MODULO = 1000

/** Vector slot boost for hash-based embeddings */
export const VECTOR_SLOT_BOOST = 0.3

// ============================================================================
// VECTOR SIMILARITY
// ============================================================================

/**
 * Calculates cosine similarity between two vectors.
 *
 * This is the standard similarity metric for vector search.
 * Returns a value between 0 (orthogonal) and 1 (identical direction).
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity value between 0 and 1
 * @returns 0 if vectors have different lengths or zero magnitude
 *
 * @example
 * ```typescript
 * const vec1 = [1, 2, 3]
 * const vec2 = [2, 4, 6]
 * const similarity = cosineSimilarity(vec1, vec2)
 * console.log(similarity) // 1.0 (parallel vectors)
 * ```
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  // Vectors must have same dimensionality
  if (a.length !== b.length) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  // Calculate dot product and magnitudes in a single pass
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  // Calculate magnitudes
  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  // Handle zero magnitude vectors
  if (normA < EPSILON || normB < EPSILON) {
    return 0
  }

  return dotProduct / (normA * normB)
}

// ============================================================================
// VECTOR NORMALIZATION
// ============================================================================

/**
 * Normalizes a vector to unit length (L2 normalization).
 *
 * @param v - The vector to normalize
 * @returns A new unit-length vector pointing in the same direction
 * @returns The original vector if it has zero magnitude
 *
 * @example
 * ```typescript
 * const vec = [3, 4]
 * const normalized = normalizeVector(vec)
 * console.log(normalized) // [0.6, 0.8]
 * ```
 */
export function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0))

  if (norm < EPSILON) {
    return v // Return original if zero magnitude
  }

  return v.map(val => val / norm)
}

// ============================================================================
// DOT PRODUCT
// ============================================================================

/**
 * Calculates the dot product of two vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product (sum of element-wise products)
 * @throws {Error} If vectors have different lengths
 *
 * @example
 * ```typescript
 * const dotProduct = dotProduct([1, 2, 3], [4, 5, 6])
 * console.log(dotProduct) // 32 (1*4 + 2*5 + 3*6)
 * ```
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} !== ${b.length}`)
  }

  return a.reduce((sum, val, i) => sum + val * b[i], 0)
}

// ============================================================================
// EUCLIDEAN DISTANCE
// ============================================================================

/**
 * Calculates the Euclidean (L2) distance between two vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns The Euclidean distance
 *
 * @example
 * ```typescript
 * const distance = euclideanDistance([0, 0], [3, 4])
 * console.log(distance) // 5
 * ```
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} !== ${b.length}`)
  }

  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
}

// ============================================================================
// HASH-BASED EMBEDDINGS
// ============================================================================

/**
 * Generates a hash-based embedding for text (placeholder for real embeddings).
 *
 * This is a simple deterministic embedding based on text hashing.
 * In production, replace with real embeddings from WebLLM or an API.
 *
 * @param text - The input text
 * @param dimensions - The embedding dimension size
 * @returns A vector of the specified dimensions
 *
 * @example
 * ```typescript
 * const embedding = hashEmbedding('hello world', 384)
 * console.log(embedding.length) // 384
 * ```
 */
export function hashEmbedding(text: string, dimensions: number): number[] {
  const vector = new Array(dimensions).fill(0)

  // Simple string hash
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }

  // Use hash to seed a pseudo-random generator
  let seed = Math.abs(hash)
  for (let i = 0; i < dimensions; i++) {
    seed = (seed * HASH_MULTIPLIER + HASH_ADDITIVE) & HASH_BITMASK
    vector[i] = (seed % HASH_MODULO) / HASH_MODULO // Normalize to 0-1
  }

  // Apply some text characteristics to make similar texts more similar
  const words = text.split(/\s+/)
  const wordHash = words.reduce((h, w) => h + w.charCodeAt(0), 0)
  const slot = wordHash % dimensions
  vector[slot] = Math.min(1, vector[slot] + VECTOR_SLOT_BOOST)

  return vector
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Calculates cosine similarities between a query vector and multiple vectors.
 *
 * @param query - The query vector
 * @param vectors - Flat array of multiple vectors
 * @param dimension - The dimension of each vector
 * @returns Array of similarity scores
 *
 * @example
 * ```typescript
 * const query = [1, 2]
 * const vectors = [1, 2, 3, 4, 5, 6] // 3 vectors of dimension 2
 * const scores = batchCosineSimilarity(query, vectors, 2)
 * console.log(scores) // [1.0, 0.93, ...]
 * ```
 */
export function batchCosineSimilarity(
  query: number[],
  vectors: number[],
  dimension: number
): number[] {
  const numVectors = vectors.length / dimension
  const results: number[] = []

  for (let i = 0; i < numVectors; i++) {
    const vec = vectors.slice(i * dimension, (i + 1) * dimension)
    results.push(cosineSimilarity(query, vec))
  }

  return results
}

/**
 * Finds the top-k most similar vectors to a query.
 *
 * @param query - The query vector
 * @param vectors - Flat array of multiple vectors
 * @param dimension - The dimension of each vector
 * @param k - Number of top results to return
 * @returns Flat array alternating [index, score, index, score, ...]
 *
 * @example
 * ```typescript
 * const query = [1, 2]
 * const vectors = [1, 2, 3, 4, 5, 6]
 * const topK = topKSimilar(query, vectors, 2, 2)
 * console.log(topK) // [0, 1.0, 1, 0.93]
 * ```
 */
export function topKSimilar(
  query: number[],
  vectors: number[],
  dimension: number,
  k: number
): number[] {
  const scores = batchCosineSimilarity(query, vectors, dimension)
  const indexed = scores.map((score, idx) => ({ idx, score }))
  indexed.sort((a, b) => b.score - a.score)

  return indexed.slice(0, k).flatMap(({ idx, score }) => [idx, score])
}

/**
 * Calculates the mean of multiple vectors.
 *
 * @param vectors - Flat array of multiple vectors
 * @param dimension - The dimension of each vector
 * @returns The mean vector
 *
 * @example
 * ```typescript
 * const vectors = [1, 2, 3, 4, 5, 6] // 3 vectors of dimension 2
 * const mean = vectorMean(vectors, 2)
 * console.log(mean) // [3, 4]
 * ```
 */
export function vectorMean(vectors: number[], dimension: number): number[] {
  const numVectors = vectors.length / dimension
  const mean = new Array(dimension).fill(0)

  for (let i = 0; i < numVectors; i++) {
    for (let j = 0; j < dimension; j++) {
      mean[j] += vectors[i * dimension + j]
    }
  }

  return mean.map(v => v / numVectors)
}

/**
 * Calculates the weighted sum of multiple vectors.
 *
 * @param vectors - Flat array of multiple vectors
 * @param weights - Weight for each vector
 * @param dimension - The dimension of each vector
 * @returns The weighted sum vector
 *
 * @example
 * ```typescript
 * const vectors = [1, 2, 3, 4] // 2 vectors of dimension 2
 * const weights = [0.3, 0.7]
 * const weighted = weightedSum(vectors, weights, 2)
 * console.log(weighted) // [2.4, 3.4]
 * ```
 */
export function weightedSum(
  vectors: number[],
  weights: number[],
  dimension: number
): number[] {
  const numVectors = vectors.length / dimension
  const result = new Array(dimension).fill(0)

  for (let i = 0; i < numVectors; i++) {
    for (let j = 0; j < dimension; j++) {
      result[j] += vectors[i * dimension + j] * weights[i]
    }
  }

  return result
}

// ============================================================================
// MEMORY ESTIMATION
// ============================================================================

/**
 * Estimates the memory size required to store vectors.
 *
 * @param numVectors - Number of vectors
 * @param dimension - Dimension of each vector
 * @returns Estimated size in bytes (assuming float32)
 *
 * @example
 * ```typescript
 * const size = estimateMemorySize(1000, 384)
 * console.log(size) // 1536000 (~1.5MB)
 * ```
 */
export function estimateMemorySize(numVectors: number, dimension: number): number {
  return numVectors * dimension * 4 // 4 bytes per float32
}

/**
 * Recommends a batch size based on vector dimension.
 *
 * @param vectorDimension - The dimension of vectors
 * @returns Recommended batch size for processing
 *
 * @example
 * ```typescript
 * const batchSize = recommendedBatchSize(384)
 * console.log(batchSize) // 128
 * ```
 */
export function recommendedBatchSize(vectorDimension: number): number {
  if (vectorDimension <= 128) return 256
  if (vectorDimension <= 384) return 128
  if (vectorDimension <= 768) return 64
  return 32
}

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

/**
 * Estimates the number of tokens in a text string.
 *
 * Uses a simple approximation: ~4 characters per token.
 * For accurate counts, use a proper tokenizer.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 *
 * @example
 * ```typescript
 * const tokens = estimateTokens('Hello world')
 * console.log(tokens) // ~3
 * ```
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}
