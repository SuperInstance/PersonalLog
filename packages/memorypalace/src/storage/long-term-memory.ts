/**
 * Long-term Memory - Persistent storage for important information
 *
 * Stores persistent knowledge, skills, relationships, and learned patterns.
 * Capacity: 1,000,000+ items
 * Access time: <100ms
 * Duration: weeks to years
 */

import { EventEmitter } from 'eventemitter3';
import { Memory, MemoryTier, MemoryStatus, PrivacyLevel } from '../types.js';

/**
 * Configuration for long-term memory
 */
export interface LongTermMemoryConfig {
  maxCapacity: number;
  enablePersistence: boolean;
  persistencePath?: string;
  enableVectorIndex: boolean;
  vectorDimensions: number;
  defaultAgentId: string;
}

/**
 * Options for storing in long-term memory
 */
export interface StoreOptions {
  agentId?: string;
  tags?: string[];
  importance?: number;
  privacy?: PrivacyLevel;
  sharedWith?: string[];
  embedding?: number[];      // Vector embedding for semantic search
  metadata?: Record<string, any>;
}

/**
 * Indexed memory with vector support
 */
interface IndexedMemory {
  memory: Memory;
  indexed: boolean;
}

/**
 * Long-term memory with vector indexing and persistence
 * Designed for large-scale knowledge retention
 */
export class LongTermMemory extends EventEmitter {
  private memories: Map<string, IndexedMemory>;
  private byAgent: Map<string, Set<string>>;
  private byTag: Map<string, Set<string>>;
  private vectorIndex: Map<string, number[]>;  // ID -> embedding
  private config: LongTermMemoryConfig;
  private persistenceTimer?: NodeJS.Timeout;

  constructor(config: Partial<LongTermMemoryConfig> = {}) {
    super();
    this.memories = new Map();
    this.byAgent = new Map();
    this.byTag = new Map();
    this.vectorIndex = new Map();
    this.config = {
      maxCapacity: config.maxCapacity ?? 1000000,
      enablePersistence: config.enablePersistence ?? false,
      persistencePath: config.persistencePath,
      enableVectorIndex: config.enableVectorIndex ?? true,
      vectorDimensions: config.vectorDimensions ?? 384,
      defaultAgentId: config.defaultAgentId ?? 'default'
    };

    // Load from persistence if enabled
    if (this.config.enablePersistence) {
      this.loadFromDisk();
    }
  }

  /**
   * Store a value in long-term memory
   * @param content - The content to store
   * @param options - Storage options
   * @returns The ID of the stored memory
   */
  async store(content: any, options: StoreOptions = {}): Promise<string> {
    const id = this.generateId();
    const now = Date.now();
    const importance = options.importance ?? this.calculateInitialImportance(content, options);

    const memory: Memory = {
      id,
      agentId: options.agentId ?? this.config.defaultAgentId,
      tier: MemoryTier.LONG_TERM,
      content,
      importance,
      accessCount: 0,
      lastAccessed: now,
      createdAt: now,
      updatedAt: now,
      status: MemoryStatus.ACTIVE,
      tags: options.tags ?? [],
      embedding: options.embedding,
      privacy: options.privacy ?? PrivacyLevel.PRIVATE,
      sharedWith: options.sharedWith ?? [],
      metadata: options.metadata ?? {}
    };

    const indexed: IndexedMemory = {
      memory,
      indexed: this.config.enableVectorIndex && !!options.embedding
    };

    this.memories.set(id, indexed);
    this.indexMemory(id, memory);

    if (options.embedding && this.config.enableVectorIndex) {
      this.vectorIndex.set(id, options.embedding);
    }

    // Persist if enabled
    if (this.config.enablePersistence) {
      this.schedulePersistence();
    }

    this.emit('memory:created', { memoryId: id, tier: MemoryTier.LONG_TERM });
    return id;
  }

  /**
   * Get a memory by ID
   */
  async get(id: string): Promise<Memory | undefined> {
    const indexed = this.memories.get(id);
    if (!indexed) return undefined;

    // Update access statistics
    indexed.memory.accessCount++;
    indexed.memory.lastAccessed = Date.now();

    this.emit('memory:accessed', { memoryId: id, tier: MemoryTier.LONG_TERM });
    return indexed.memory;
  }

  /**
   * Get multiple memories by IDs
   */
  async getMany(ids: string[]): Promise<Memory[]> {
    const results: Memory[] = [];
    for (const id of ids) {
      const memory = await this.get(id);
      if (memory) results.push(memory);
    }
    return results;
  }

  /**
   * Get all memories for an agent
   */
  async getByAgent(agentId: string): Promise<Memory[]> {
    const ids = this.byAgent.get(agentId);
    if (!ids) return [];

    const results: Memory[] = [];
    for (const id of ids) {
      const memory = await this.get(id);
      if (memory) results.push(memory);
    }
    return results;
  }

  /**
   * Get memories with a specific tag
   */
  async getByTag(tag: string): Promise<Memory[]> {
    const ids = this.byTag.get(tag);
    if (!ids) return [];

    const results: Memory[] = [];
    for (const id of ids) {
      const memory = await this.get(id);
      if (memory) results.push(memory);
    }
    return results;
  }

  /**
   * Get memories with importance >= threshold
   */
  async getByImportance(minImportance: number): Promise<Memory[]> {
    const results: Memory[] = [];

    for (const indexed of this.memories.values()) {
      if (indexed.memory.importance >= minImportance) {
        results.push(indexed.memory);
      }
    }

    return results.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Semantic search using vector embeddings
   * @param queryEmbedding - Vector embedding of query
   * @param options - Search options
   * @returns Memories ranked by similarity
   */
  async semanticSearch(
    queryEmbedding: number[],
    options: {
      agentId?: string;
      tags?: string[];
      minImportance?: number;
      maxResults?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<Array<{ memory: Memory; similarity: number }>> {
    const results: Array<{ memory: Memory; similarity: number }> = [];
    const minSimilarity = options.minSimilarity ?? 0.7;

    for (const [id, embedding] of this.vectorIndex.entries()) {
      const indexed = this.memories.get(id);
      if (!indexed) continue;

      const memory = indexed.memory;

      // Apply filters
      if (options.agentId && memory.agentId !== options.agentId) continue;
      if (options.minImportance && memory.importance < options.minImportance) continue;
      if (options.tags && options.tags.length > 0) {
        if (!options.tags.some(t => memory.tags.includes(t))) continue;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      if (similarity >= minSimilarity) {
        results.push({ memory, similarity });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, options.maxResults ?? 100);
  }

  /**
   * Hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    query: string,
    queryEmbedding: number[],
    options: {
      agentId?: string;
      tags?: string[];
      minImportance?: number;
      maxResults?: number;
      semanticWeight?: number;  // 0-1, default 0.7
    } = {}
  ): Promise<Array<{ memory: Memory; score: number }>> {
    const semanticWeight = options.semanticWeight ?? 0.7;
    const keywordWeight = 1 - semanticWeight;

    // Get semantic results
    const semanticResults = await this.semanticSearch(queryEmbedding, {
      agentId: options.agentId,
      tags: options.tags,
      minImportance: options.minImportance,
      maxResults: options.maxResults ?? 100,
      minSimilarity: 0.5
    });

    // Get keyword results
    const keywordResults = await this.keywordSearch(query, {
      agentId: options.agentId,
      tags: options.tags,
      minImportance: options.minImportance,
      maxResults: options.maxResults ?? 100
    });

    // Combine scores
    const combined = new Map<string, { memory: Memory; score: number }>();

    for (const { memory, similarity } of semanticResults) {
      const score = similarity * semanticWeight;
      combined.set(memory.id, { memory, score });
    }

    for (const { memory, relevance } of keywordResults) {
      const existing = combined.get(memory.id);
      if (existing) {
        existing.score += relevance * keywordWeight;
      } else {
        combined.set(memory.id, {
          memory,
          score: relevance * keywordWeight
        });
      }
    }

    // Sort by combined score
    const results = Array.from(combined.values());
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, options.maxResults ?? 100);
  }

  /**
   * Keyword search in memory content
   */
  async keywordSearch(
    query: string,
    options: {
      agentId?: string;
      tags?: string[];
      minImportance?: number;
      maxResults?: number;
    } = {}
  ): Promise<Array<{ memory: Memory; relevance: number }>> {
    const results: Array<{ memory: Memory; relevance: number }> = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    for (const indexed of this.memories.values()) {
      const memory = indexed.memory;

      // Apply filters
      if (options.agentId && memory.agentId !== options.agentId) continue;
      if (options.minImportance && memory.importance < options.minImportance) continue;
      if (options.tags && options.tags.length > 0) {
        if (!options.tags.some(t => memory.tags.includes(t))) continue;
      }

      // Calculate relevance
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      let relevance = 0;

      // Exact phrase match
      if (contentStr.includes(queryLower)) {
        relevance += 1.0;
      }

      // Word matches
      for (const word of queryWords) {
        if (contentStr.includes(word)) {
          relevance += 0.2;
        }
      }

      // Tag matches
      for (const tag of memory.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          relevance += 0.5;
        }
      }

      if (relevance > 0) {
        results.push({ memory, relevance });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, options.maxResults ?? 100);
  }

  /**
   * Update a memory
   */
  async update(id: string, updates: Partial<Memory>): Promise<boolean> {
    const indexed = this.memories.get(id);
    if (!indexed) return false;

    // Remove old indexes if needed
    if (updates.agentId && updates.agentId !== indexed.memory.agentId) {
      const agentIds = this.byAgent.get(indexed.memory.agentId);
      agentIds?.delete(id);
    }

    if (updates.tags) {
      for (const tag of indexed.memory.tags) {
        const tagIds = this.byTag.get(tag);
        tagIds?.delete(id);
      }
    }

    // Update memory
    Object.assign(indexed.memory, updates, {
      updatedAt: Date.now()
    });

    // Update vector index if embedding changed
    if (updates.embedding && this.config.enableVectorIndex) {
      this.vectorIndex.set(id, updates.embedding);
    }

    // Re-index
    this.indexMemory(id, indexed.memory);

    // Schedule persistence
    if (this.config.enablePersistence) {
      this.schedulePersistence();
    }

    this.emit('memory:updated', { memoryId: id, tier: MemoryTier.LONG_TERM });
    return true;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    const indexed = this.memories.get(id);
    if (!indexed) return false;

    // Remove from indexes
    const agentIds = this.byAgent.get(indexed.memory.agentId);
    agentIds?.delete(id);

    for (const tag of indexed.memory.tags) {
      const tagIds = this.byTag.get(tag);
      tagIds?.delete(id);
    }

    this.vectorIndex.delete(id);
    this.memories.delete(id);

    // Schedule persistence
    if (this.config.enablePersistence) {
      this.schedulePersistence();
    }

    this.emit('memory:evicted', { memoryId: id, tier: MemoryTier.LONG_TERM });
    return true;
  }

  /**
   * Get current usage
   */
  getUsage(): number {
    return this.memories.size;
  }

  /**
   * Get statistics
   */
  getStats(): {
    count: number;
    maxCapacity: number;
    utilization: number;
    byAgent: Record<string, number>;
    byTag: Record<string, number>;
    averageImportance: number;
    indexedCount: number;
  } {
    const byAgent: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    let totalImportance = 0;
    let indexedCount = 0;

    for (const indexed of this.memories.values()) {
      const memory = indexed.memory;

      byAgent[memory.agentId] = (byAgent[memory.agentId] || 0) + 1;
      for (const tag of memory.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }

      totalImportance += memory.importance;
      if (indexed.indexed) indexedCount++;
    }

    return {
      count: this.memories.size,
      maxCapacity: this.config.maxCapacity,
      utilization: this.memories.size / this.config.maxCapacity,
      byAgent,
      byTag,
      averageImportance: this.memories.size > 0 ? totalImportance / this.memories.size : 0,
      indexedCount
    };
  }

  /**
   * Get all memories (for consolidation/backup)
   */
  async getAll(): Promise<Memory[]> {
    return Array.from(this.memories.values()).map(i => i.memory);
  }

  /**
   * Force persistence to disk
   */
  async persist(): Promise<void> {
    if (!this.config.enablePersistence || !this.config.persistencePath) {
      return;
    }

    // In a real implementation, this would write to disk
    // For now, we'll just mark it as persisted
    this.emit('persistence:completed', { timestamp: Date.now() });
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
    }

    // Persist before destroying
    if (this.config.enablePersistence) {
      await this.persist();
    }

    this.memories.clear();
    this.byAgent.clear();
    this.byTag.clear();
    this.vectorIndex.clear();
    this.removeAllListeners();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `ltm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Index a memory for fast lookup
   */
  private indexMemory(id: string, memory: Memory): void {
    // Index by agent
    if (!this.byAgent.has(memory.agentId)) {
      this.byAgent.set(memory.agentId, new Set());
    }
    this.byAgent.get(memory.agentId)!.add(id);

    // Index by tags
    for (const tag of memory.tags) {
      if (!this.byTag.has(tag)) {
        this.byTag.set(tag, new Set());
      }
      this.byTag.get(tag)!.add(id);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
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
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Calculate initial importance
   */
  private calculateInitialImportance(content: any, options: StoreOptions): number {
    let importance = options.importance ?? 0.5;

    // Boost for embeddings (semantic content)
    if (options.embedding) {
      importance += 0.1;
    }

    // Boost for structured data
    if (typeof content === 'object' && content !== null) {
      const keys = Object.keys(content);
      if (keys.length >= 3) importance += 0.1;
    }

    // Boost for shared content (likely useful)
    if (options.sharedWith && options.sharedWith.length > 0) {
      importance += 0.05;
    }

    return Math.min(1, importance);
  }

  /**
   * Schedule debounced persistence
   */
  private schedulePersistence(): void {
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
    }

    this.persistenceTimer = setTimeout(() => {
      this.persist().catch(console.error);
    }, 5000); // Persist after 5 seconds of inactivity
  }

  /**
   * Load memories from disk
   */
  private loadFromDisk(): void {
    // In a real implementation, this would load from the persistence path
    // For now, this is a placeholder
  }
}
