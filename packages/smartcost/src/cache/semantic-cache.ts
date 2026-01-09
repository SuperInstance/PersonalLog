/**
 * Semantic Cache - Vector-Based Intelligent Caching
 *
 * Caches LLM responses using semantic similarity to avoid repeat calls
 * Integrates with vector search for efficient similarity matching
 */

import type {
  CacheEntry,
  CacheStats,
  CacheConfig,
  CacheStrategy,
  ChatCompletionRequest,
  TokenUsage,
} from '../types/index.js';

// ============================================================================
// SEMANTIC CACHE CLASS
// ============================================================================

export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private vectorSearch: any = null; // Will integrate with vector search
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private embeddingsCache: Map<string, Float32Array> = new Map();

  // Cache size tracking
  private currentSize: number = 0;

  constructor(
    config: CacheConfig = {},
    vectorSearch?: any // Optional vector search instance
  ) {
    this.config = {
      maxSize: config.maxSize || 100 * 1024 * 1024, // 100 MB
      ttl: config.ttl || 86400, // 1 day
      similarityThreshold: config.similarityThreshold || 0.85,
      enableCompression: config.enableCompression || false,
      storage: config.storage || 'memory',
    };

    this.vectorSearch = vectorSearch;

    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      semanticHits: 0,
      exactHits: 0,
      totalSavings: 0,
      avgSimilarity: 0,
    };

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Get cached response for request
   * Returns null if not found or similarity too low
   */
  public async get(
    request: ChatCompletionRequest,
    strategy: CacheStrategy = 'semantic'
  ): Promise<{
    response: any;
    entry: CacheEntry;
    similarity?: number;
  } | null> {
    const startTime = performance.now();

    // Try exact match first (for hybrid and exact strategies)
    if (strategy === 'exact' || strategy === 'hybrid') {
      const exactMatch = this.getExactMatch(request);
      if (exactMatch) {
        this.recordHit('exact', exactMatch);
        return {
          response: exactMatch.response,
          entry: exactMatch,
          similarity: 1.0,
        };
      }
    }

    // Try semantic match
    if (strategy === 'semantic' || strategy === 'hybrid') {
      const semanticMatch = await this.getSemanticMatch(request);
      if (semanticMatch) {
        this.recordHit('semantic', semanticMatch.entry, semanticMatch.similarity);
        return {
          response: semanticMatch.entry.response,
          entry: semanticMatch.entry,
          similarity: semanticMatch.similarity,
        };
      }
    }

    // No match found
    this.stats.totalMisses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Store response in cache
   */
  public async set(
    request: ChatCompletionRequest,
    response: any,
    provider: string,
    model: string,
    tokens: TokenUsage,
    cost: number
  ): Promise<void> {
    // Generate cache key
    const key = this.generateCacheKey(request);

    // Generate embedding for semantic search
    let embedding: Float32Array | undefined = undefined;
    if (this.config.storage === 'memory' || this.vectorSearch) {
      const result = await this.generateEmbedding(request);
      if (result) embedding = result;
    }

    // Calculate entry size
    const entrySize = this.calculateEntrySize(request, response, embedding);

    // Check if we need to evict entries
    await this.ensureCapacity(entrySize);

    // Create cache entry
    const entry: CacheEntry = {
      key,
      request,
      response,
      provider,
      model,
      tokens,
      cost,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      ttl: this.config.ttl,
      embedding,
    };

    // Store in cache
    this.cache.set(key, entry);

    // Update size tracking
    this.currentSize += entrySize;
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize = this.currentSize;

    // Add to vector search if available
    if (this.vectorSearch && embedding) {
      try {
        await this.vectorSearch.add({
          id: key,
          vector: Array.from(embedding),
          metadata: {
            provider,
            model,
            cost,
            createdAt: entry.createdAt,
          },
        });
      } catch (error) {
        console.warn('Failed to add to vector search:', error);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.embeddingsCache.clear();
    this.currentSize = 0;
    this.stats.totalEntries = 0;
    this.stats.totalSize = 0;

    if (this.vectorSearch) {
      this.vectorSearch.clear();
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size in bytes
   */
  public getSize(): number {
    return this.currentSize;
  }

  /**
   * Get number of entries
   */
  public getEntryCount(): number {
    return this.cache.size;
  }

  /**
   * Delete expired entries
   */
  public deleteExpired(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > entry.ttl * 1000) {
        const size = this.calculateEntrySize(
          entry.request,
          entry.response,
          entry.embedding
        );
        this.cache.delete(key);
        this.currentSize -= size;
        deleted++;

        if (this.vectorSearch && entry.embedding) {
          this.vectorSearch.delete(key);
        }
      }
    }

    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize = this.currentSize;

    return deleted;
  }

  /**
   * Delete entries by provider
   */
  public deleteByProvider(provider: string): number {
    let deleted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.provider === provider) {
        const size = this.calculateEntrySize(
          entry.request,
          entry.response,
          entry.embedding
        );
        this.cache.delete(key);
        this.currentSize -= size;
        deleted++;

        if (this.vectorSearch && entry.embedding) {
          this.vectorSearch.delete(key);
        }
      }
    }

    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize = this.currentSize;

    return deleted;
  }

  /**
   * Get cache entries (with optional filtering)
   */
  public getEntries(filter?: {
    provider?: string;
    model?: string;
    minCost?: number;
    maxCost?: number;
  }): CacheEntry[] {
    let entries = Array.from(this.cache.values());

    if (filter) {
      if (filter.provider) {
        entries = entries.filter((e) => e.provider === filter.provider);
      }
      if (filter.model) {
        entries = entries.filter((e) => e.model === filter.model);
      }
      if (filter.minCost) {
        entries = entries.filter((e) => e.cost >= filter.minCost!);
      }
      if (filter.maxCost) {
        entries = entries.filter((e) => e.cost <= filter.maxCost!);
      }
    }

    // Sort by last accessed (most recent first)
    entries.sort((a, b) => b.lastAccessed - a.lastAccessed);

    return entries;
  }

  // ========================================================================
  // PRIVATE METHODS - CACHE LOOKUP
  // ========================================================================

  /**
   * Get exact match from cache
   */
  private getExactMatch(request: ChatCompletionRequest): CacheEntry | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.createdAt > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry;
  }

  /**
   * Get semantic match from cache
   */
  private async getSemanticMatch(
    request: ChatCompletionRequest
  ): Promise<{
    entry: CacheEntry;
    similarity: number;
  } | null> {
    // Generate embedding for query
    const embedding = await this.generateEmbedding(request);

    if (!embedding) return null;

    // Use vector search if available
    if (this.vectorSearch) {
      try {
        const results = await this.vectorSearch.search(
          Array.from(embedding),
          {
            topK: 5,
            threshold: this.config.similarityThreshold,
          }
        );

        if (results.length > 0) {
          const result = results[0];
          const entry = this.cache.get(result.id);

          if (entry && !this.isExpired(entry)) {
            entry.lastAccessed = Date.now();
            entry.accessCount++;
            entry.similarity = result.score;

            return {
              entry,
              similarity: result.score,
            };
          }
        }
      } catch (error) {
        console.warn('Vector search failed:', error);
      }
    }

    // Fallback: manual similarity search
    return this.manualSemanticSearch(request, embedding);
  }

  /**
   * Manual semantic search (fallback when vector search unavailable)
   */
  private async manualSemanticSearch(
    request: ChatCompletionRequest,
    queryEmbedding: Float32Array
  ): Promise<{
    entry: CacheEntry;
    similarity: number;
  } | null> {
    let bestMatch: { entry: CacheEntry; similarity: number } | null = null;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry) || !entry.embedding) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

      if (
        similarity >= this.config.similarityThreshold &&
        (!bestMatch || similarity > bestMatch.similarity)
      ) {
        bestMatch = { entry, similarity };
      }
    }

    if (bestMatch) {
      bestMatch.entry.lastAccessed = Date.now();
      bestMatch.entry.accessCount++;
      bestMatch.entry.similarity = bestMatch.similarity;
    }

    return bestMatch;
  }

  // ========================================================================
  // PRIVATE METHODS - EMBEDDINGS
  // ========================================================================

  /**
   * Generate embedding for request
   */
  private async generateEmbedding(
    request: ChatCompletionRequest
  ): Promise<Float32Array | undefined> {
    // Create text representation of request
    const text = this.requestToText(request);

    // Check cache
    const cached = this.embeddingsCache.get(text);
    if (cached) return cached;

    // Simple heuristic-based embedding (fallback)
    // In production, you'd use a real embedding model here
    const embedding = this.generateHeuristicEmbedding(text);

    // Cache embedding
    this.embeddingsCache.set(text, embedding);

    return embedding;
  }

  /**
   * Generate simple heuristic embedding
   * This is a fallback - use real embeddings in production
   */
  private generateHeuristicEmbedding(text: string): Float32Array {
    // Create a simple 256-dimensional embedding based on text characteristics
    const dim = 256;
    const embedding = new Float32Array(dim);

    // Normalize text
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    // Character frequency
    for (let i = 0; i < normalized.length && i < dim; i++) {
      const charCode = normalized.charCodeAt(i);
      embedding[i] = charCode / 255;
    }

    // Word count influence
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    for (let i = 0; i < Math.min(wordCount, dim / 2); i++) {
      embedding[i + dim / 2] = words[i].length / 20;
    }

    // L2 normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < dim; i++) {
      embedding[i] /= norm || 1;
    }

    return embedding;
  }

  /**
   * Convert request to text for embedding
   */
  private requestToText(request: ChatCompletionRequest): string {
    const parts: string[] = [];

    // Add messages
    request.messages.forEach((msg) => {
      parts.push(`${msg.role}:${msg.content}`);
    });

    // Add parameters (affect output)
    if (request.temperature !== undefined) {
      parts.push(`temp:${request.temperature}`);
    }
    if (request.maxTokens !== undefined) {
      parts.push(`max:${request.maxTokens}`);
    }
    if (request.functions) {
      parts.push(`functions:${request.functions.map(f => f.name).join(',')}`);
    }

    return parts.join(' ');
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // ========================================================================
  // PRIVATE METHODS - UTILITIES
  // ========================================================================

  /**
   * Generate cache key for exact matching
   */
  private generateCacheKey(request: ChatCompletionRequest): string {
    // Create deterministic key from request
    const parts: string[] = [];

    // Add messages (order matters)
    request.messages.forEach((msg) => {
      parts.push(`${msg.role}:${msg.content}`);
    });

    // Add parameters that affect output
    if (request.temperature !== undefined) {
      parts.push(`temp:${request.temperature}`);
    }
    if (request.maxTokens !== undefined) {
      parts.push(`max:${request.maxTokens}`);
    }
    if (request.topP !== undefined) {
      parts.push(`topp:${request.topP}`);
    }
    if (request.functions) {
      parts.push(`funcs:${JSON.stringify(request.functions.map(f => f.name))}`);
    }

    // Hash the key
    const str = parts.join('|');
    return this.simpleHash(str);
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${Math.abs(hash)}`;
  }

  /**
   * Calculate entry size in bytes
   */
  private calculateEntrySize(
    request: any,
    response: any,
    embedding?: Float32Array
  ): number {
    let size = 0;

    // Request size (rough estimate)
    size += JSON.stringify(request).length * 2; // UTF-16

    // Response size
    size += JSON.stringify(response).length * 2;

    // Embedding size
    if (embedding) {
      size += embedding.length * 4; // Float32 = 4 bytes per element
    }

    // Metadata overhead
    size += 200; // Rough estimate for timestamps, counts, etc.

    return size;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > entry.ttl * 1000;
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    // Check if we need to evict
    while (this.currentSize + requiredSize > this.config.maxSize) {
      // Find least recently used entry
      let lruKey: string | null = null;
      let lruTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < lruTime) {
          lruTime = entry.lastAccessed;
          lruKey = key;
        }
      }

      if (lruKey) {
        const entry = this.cache.get(lruKey);
        if (entry) {
          const size = this.calculateEntrySize(
            entry.request,
            entry.response,
            entry.embedding
          );
          this.cache.delete(lruKey);
          this.currentSize -= size;

          if (this.vectorSearch && entry.embedding) {
            this.vectorSearch.delete(lruKey);
          }
        }
      } else {
        // Can't evict more, cache is empty
        break;
      }
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(
    type: 'exact' | 'semantic',
    entry: CacheEntry,
    similarity?: number
  ): void {
    this.stats.totalHits++;

    if (type === 'exact') {
      this.stats.exactHits++;
    } else {
      this.stats.semanticHits++;
    }

    if (similarity !== undefined) {
      // Update average similarity
      const totalSemanticHits = this.stats.semanticHits;
      const currentAvg = this.stats.avgSimilarity;
      this.stats.avgSimilarity =
        (currentAvg * (totalSemanticHits - 1) + similarity) / totalSemanticHits;
    }

    // Track savings
    this.stats.totalSavings += entry.cost;

    this.updateHitRate();
  }

  /**
   * Update cache hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total === 0 ? 0 : this.stats.totalHits / total;
  }

  /**
   * Start periodic cleanup task
   */
  private startPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.deleteExpired();
    }, 300000);

    // Clean up embeddings cache every hour
    setInterval(() => {
      if (this.embeddingsCache.size > 10000) {
        // Keep only most recent 10000
        const entries = Array.from(this.embeddingsCache.entries());
        entries.slice(0, -10000).forEach(([key]) => {
          this.embeddingsCache.delete(key);
        });
      }
    }, 3600000);
  }
}
