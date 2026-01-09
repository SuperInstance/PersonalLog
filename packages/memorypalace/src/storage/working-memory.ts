/**
 * Working Memory - Fast, temporary storage for active context
 *
 * Stores current tasks, immediate goals, and active information.
 * Capacity: 10-100 items
 * Access time: <1ms
 * Duration: seconds to minutes
 */

import { EventEmitter } from 'eventemitter3';
import { Memory, MemoryTier, MemoryStatus, PrivacyLevel } from '../types.js';

/**
 * Configuration for working memory
 */
export interface WorkingMemoryConfig {
  maxSize: number;
  enableAutoEviction: boolean;
  defaultAgentId: string;
}

/**
 * Options for storing a memory
 */
export interface StoreOptions {
  agentId?: string;
  tags?: string[];
  importance?: number;
  privacy?: PrivacyLevel;
  metadata?: Record<string, any>;
}

/**
 * Working memory implementation using in-memory Map
 * Provides O(1) access for current context
 */
export class WorkingMemory extends EventEmitter {
  private memories: Map<string, Memory>;
  private config: WorkingMemoryConfig;
  private accessCounts: Map<string, number>;

  constructor(config: Partial<WorkingMemoryConfig> = {}) {
    super();
    this.memories = new Map();
    this.accessCounts = new Map();
    this.config = {
      maxSize: config.maxSize ?? 50,
      enableAutoEviction: config.enableAutoEviction ?? true,
      defaultAgentId: config.defaultAgentId ?? 'default'
    };
  }

  /**
   * Store a value in working memory
   * @param key - The key to store under
   * @param value - The value to store
   * @param options - Storage options
   */
  set(key: string, value: any, options: StoreOptions = {}): void {
    const now = Date.now();
    const existingMemory = this.memories.get(key);

    // Calculate importance based on access pattern and provided importance
    const importance = options.importance ?? this.calculateInitialImportance(key, value);

    const memory: Memory = {
      id: key,
      agentId: options.agentId ?? this.config.defaultAgentId,
      tier: MemoryTier.WORKING,
      content: value,
      importance,
      accessCount: existingMemory ? existingMemory.accessCount + 1 : 1,
      lastAccessed: now,
      createdAt: existingMemory ? existingMemory.createdAt : now,
      updatedAt: now,
      status: MemoryStatus.ACTIVE,
      tags: options.tags ?? [],
      privacy: options.privacy ?? PrivacyLevel.PRIVATE,
      metadata: options.metadata ?? {}
    };

    this.memories.set(key, memory);
    this.accessCounts.set(key, memory.accessCount);

    // Auto-evict if over capacity
    if (this.config.enableAutoEviction && this.memories.size > this.config.maxSize) {
      this.evictLeastImportant();
    }

    this.emit('memory:created', { memoryId: key, tier: MemoryTier.WORKING });
  }

  /**
   * Get a value from working memory
   * @param key - The key to retrieve
   * @returns The stored value or undefined
   */
  get(key: string): any | undefined {
    const memory = this.memories.get(key);
    if (memory) {
      // Update access statistics
      memory.accessCount++;
      memory.lastAccessed = Date.now();
      this.accessCounts.set(key, memory.accessCount);
      this.emit('memory:accessed', { memoryId: key, tier: MemoryTier.WORKING });
      return memory.content;
    }
    return undefined;
  }

  /**
   * Get the full memory object for a key
   */
  getMemory(key: string): Memory | undefined {
    return this.memories.get(key);
  }

  /**
   * Check if a key exists in working memory
   */
  has(key: string): boolean {
    return this.memories.has(key);
  }

  /**
   * Delete a key from working memory
   */
  delete(key: string): boolean {
    const deleted = this.memories.delete(key);
    this.accessCounts.delete(key);
    if (deleted) {
      this.emit('memory:evicted', { memoryId: key, tier: MemoryTier.WORKING });
    }
    return deleted;
  }

  /**
   * Clear all working memory
   */
  clear(): void {
    const keys = Array.from(this.memories.keys());
    this.memories.clear();
    this.accessCounts.clear();
    keys.forEach(key => {
      this.emit('memory:evicted', { memoryId: key, tier: MemoryTier.WORKING });
    });
  }

  /**
   * Get all memories in working memory
   */
  getAll(): Memory[] {
    return Array.from(this.memories.values());
  }

  /**
   * Get memories by tag
   */
  getByTag(tag: string): Memory[] {
    return this.getAll().filter(m => m.tags.includes(tag));
  }

  /**
   * Get memories by agent ID
   */
  getByAgent(agentId: string): Memory[] {
    return this.getAll().filter(m => m.agentId === agentId);
  }

  /**
   * Get memories sorted by importance
   */
  getByImportance(minImportance: number = 0): Memory[] {
    return this.getAll()
      .filter(m => m.importance >= minImportance)
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Get the current size of working memory
   */
  size(): number {
    return this.memories.size;
  }

  /**
   * Get utilization ratio (0-1)
   */
  getUtilization(): number {
    return this.memories.size / this.config.maxSize;
  }

  /**
   * Get maximum capacity
   */
  getMaxSize(): number {
    return this.config.maxSize;
  }

  /**
   * Update a memory's importance
   */
  updateImportance(key: string, importance: number): boolean {
    const memory = this.memories.get(key);
    if (memory) {
      memory.importance = Math.max(0, Math.min(1, importance));
      memory.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Add tags to a memory
   */
  addTags(key: string, tags: string[]): boolean {
    const memory = this.memories.get(key);
    if (memory) {
      const newTags = tags.filter(t => !memory.tags.includes(t));
      memory.tags.push(...newTags);
      memory.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Remove tags from a memory
   */
  removeTags(key: string, tags: string[]): boolean {
    const memory = this.memories.get(key);
    if (memory) {
      memory.tags = memory.tags.filter(t => !tags.includes(t));
      memory.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get statistics about working memory
   */
  getStats(): {
    size: number;
    maxSize: number;
    utilization: number;
    byAgent: Record<string, number>;
    averageImportance: number;
    totalAccesses: number;
  } {
    const memories = this.getAll();
    const byAgent: Record<string, number> = {};

    for (const memory of memories) {
      byAgent[memory.agentId] = (byAgent[memory.agentId] || 0) + 1;
    }

    const totalImportance = memories.reduce((sum, m) => sum + m.importance, 0);
    const totalAccesses = Array.from(this.accessCounts.values()).reduce((a, b) => a + b, 0);

    return {
      size: this.memories.size,
      maxSize: this.config.maxSize,
      utilization: this.getUtilization(),
      byAgent,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      totalAccesses
    };
  }

  /**
   * Export all memories for consolidation
   */
  exportForConsolidation(): Array<{ key: string; memory: Memory }> {
    return Array.from(this.memories.entries()).map(([key, memory]) => ({
      key,
      memory: { ...memory } // Clone to avoid reference issues
    }));
  }

  /**
   * Calculate initial importance based on content and key
   */
  private calculateInitialImportance(key: string, value: any): number {
    let importance = 0.5; // Base importance

    // Boost for certain key patterns
    if (key.includes('current') || key.includes('active') || key.includes('task')) {
      importance += 0.2;
    }
    if (key.includes('important') || key.includes('critical') || key.includes('urgent')) {
      importance += 0.3;
    }

    // Boost for object/array content (structured data)
    if (typeof value === 'object' && value !== null) {
      importance += 0.1;
    }

    return Math.min(1, importance);
  }

  /**
   * Evict the least important memory
   */
  private evictLeastImportant(): void {
    const memories = this.getAll();
    if (memories.length === 0) return;

    // Sort by importance (lowest first) and last accessed
    memories.sort((a, b) => {
      if (Math.abs(a.importance - b.importance) > 0.01) {
        return a.importance - b.importance;
      }
      return a.lastAccessed - b.lastAccessed;
    });

    const toEvict = memories[0];
    if (toEvict) {
      this.delete(toEvict.id);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}
