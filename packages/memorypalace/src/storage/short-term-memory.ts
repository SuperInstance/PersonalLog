/**
 * Short-term Memory - Medium-duration storage for recent information
 *
 * Stores recent conversations, recent learnings, and session context.
 * Capacity: 1,000-10,000 items
 * Access time: <10ms
 * Duration: hours to days
 */

import { EventEmitter } from 'eventemitter3';
import { Memory, MemoryTier, MemoryStatus, PrivacyLevel } from '../types.js';

/**
 * Configuration for short-term memory
 */
export interface ShortTermMemoryConfig {
  maxCapacity: number;
  ttl: number;                    // Time to live in milliseconds
  enableCompression: boolean;
  defaultAgentId: string;
}

/**
 * Options for storing in short-term memory
 */
export interface StoreOptions {
  agentId?: string;
  tags?: string[];
  importance?: number;
  privacy?: PrivacyLevel;
  sharedWith?: string[];
  metadata?: Record<string, any>;
}

/**
 * Memory item with expiration tracking
 */
interface ExpirableMemory {
  memory: Memory;
  expiresAt: number;
}

/**
 * Short-term memory implementation with TTL and indexing
 * Provides fast retrieval for recent information
 */
export class ShortTermMemory extends EventEmitter {
  private memories: Map<string, ExpirableMemory>;
  private byAgent: Map<string, Set<string>>;
  private byTag: Map<string, Set<string>>;
  private config: ShortTermMemoryConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<ShortTermMemoryConfig> = {}) {
    super();
    this.memories = new Map();
    this.byAgent = new Map();
    this.byTag = new Map();
    this.config = {
      maxCapacity: config.maxCapacity ?? 5000,
      ttl: config.ttl ?? 86400000, // 24 hours default
      enableCompression: config.enableCompression ?? false,
      defaultAgentId: config.defaultAgentId ?? 'default'
    };

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Store a value in short-term memory
   * @param content - The content to store
   * @param options - Storage options
   * @returns The ID of the stored memory
   */
  async store(content: any, options: StoreOptions = {}): Promise<string> {
    const id = this.generateId();
    const now = Date.now();
    const importance = options.importance ?? this.calculateInitialImportance(content);

    const memory: Memory = {
      id,
      agentId: options.agentId ?? this.config.defaultAgentId,
      tier: MemoryTier.SHORT_TERM,
      content,
      importance,
      accessCount: 0,
      lastAccessed: now,
      createdAt: now,
      updatedAt: now,
      status: MemoryStatus.ACTIVE,
      tags: options.tags ?? [],
      privacy: options.privacy ?? PrivacyLevel.PRIVATE,
      sharedWith: options.sharedWith ?? [],
      metadata: options.metadata ?? {}
    };

    const expirable: ExpirableMemory = {
      memory,
      expiresAt: now + this.config.ttl
    };

    this.memories.set(id, expirable);
    this.indexMemory(id, memory);

    // Check capacity
    if (this.memories.size > this.config.maxCapacity) {
      await this.evictExpiredOrUnimportant();
    }

    this.emit('memory:created', { memoryId: id, tier: MemoryTier.SHORT_TERM });
    return id;
  }

  /**
   * Get a memory by ID
   */
  async get(id: string): Promise<Memory | undefined> {
    const expirable = this.memories.get(id);
    if (!expirable) return undefined;

    // Check if expired
    if (Date.now() > expirable.expiresAt) {
      await this.delete(id);
      return undefined;
    }

    // Update access statistics
    expirable.memory.accessCount++;
    expirable.memory.lastAccessed = Date.now();

    this.emit('memory:accessed', { memoryId: id, tier: MemoryTier.SHORT_TERM });
    return expirable.memory;
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
   * Get all memories with a specific tag
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
    const now = Date.now();

    for (const [id, expirable] of this.memories.entries()) {
      if (now <= expirable.expiresAt && expirable.memory.importance >= minImportance) {
        results.push(expirable.memory);
      }
    }

    return results.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Get memories within a time range
   */
  async getByTimeRange(startTime: number, endTime: number): Promise<Memory[]> {
    const results: Memory[] = [];
    const now = Date.now();

    for (const expirable of this.memories.values()) {
      if (now <= expirable.expiresAt) {
        const memory = expirable.memory;
        if (memory.createdAt >= startTime && memory.createdAt <= endTime) {
          results.push(memory);
        }
      }
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Search memories by content
   */
  async search(query: string, options: {
    agentId?: string;
    tags?: string[];
    minImportance?: number;
    limit?: number;
  } = {}): Promise<Memory[]> {
    const results: Memory[] = [];
    const queryLower = query.toLowerCase();

    for (const [id, expirable] of this.memories.entries()) {
      if (Date.now() > expirable.expiresAt) continue;

      const memory = expirable.memory;

      // Filter by agent
      if (options.agentId && memory.agentId !== options.agentId) continue;

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        if (!options.tags.some(t => memory.tags.includes(t))) continue;
      }

      // Filter by importance
      if (options.minImportance && memory.importance < options.minImportance) continue;

      // Search in content
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      if (contentStr.includes(queryLower)) {
        results.push(memory);
      }
    }

    return results.slice(0, options.limit ?? 100);
  }

  /**
   * Update a memory
   */
  async update(id: string, updates: Partial<Memory>): Promise<boolean> {
    const expirable = this.memories.get(id);
    if (!expirable) return false;

    // Remove old indexes if changing agent or tags
    if (updates.agentId && updates.agentId !== expirable.memory.agentId) {
      const agentIds = this.byAgent.get(expirable.memory.agentId);
      agentIds?.delete(id);
    }

    if (updates.tags) {
      for (const tag of expirable.memory.tags) {
        const tagIds = this.byTag.get(tag);
        tagIds?.delete(id);
      }
    }

    // Update memory
    Object.assign(expirable.memory, updates, {
      updatedAt: Date.now()
    });

    // Re-index
    this.indexMemory(id, expirable.memory);

    this.emit('memory:updated', { memoryId: id, tier: MemoryTier.SHORT_TERM });
    return true;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    const expirable = this.memories.get(id);
    if (!expirable) return false;

    // Remove from indexes
    const agentIds = this.byAgent.get(expirable.memory.agentId);
    agentIds?.delete(id);

    for (const tag of expirable.memory.tags) {
      const tagIds = this.byTag.get(tag);
      tagIds?.delete(id);
    }

    this.memories.delete(id);
    this.emit('memory:evicted', { memoryId: id, tier: MemoryTier.SHORT_TERM });
    return true;
  }

  /**
   * Get current usage (number of memories)
   */
  getUsage(): number {
    // Clean up expired first
    this.cleanupExpired();
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
    expiringSoon: number;
  } {
    this.cleanupExpired();

    const byAgent: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    let totalImportance = 0;
    let expiringSoon = 0;
    const now = Date.now();
    const oneHour = 3600000;

    for (const expirable of this.memories.values()) {
      const memory = expirable.memory;

      byAgent[memory.agentId] = (byAgent[memory.agentId] || 0) + 1;
      for (const tag of memory.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }

      totalImportance += memory.importance;

      if (expirable.expiresAt - now < oneHour) {
        expiringSoon++;
      }
    }

    return {
      count: this.memories.size,
      maxCapacity: this.config.maxCapacity,
      utilization: this.memories.size / this.config.maxCapacity,
      byAgent,
      byTag,
      averageImportance: this.memories.size > 0 ? totalImportance / this.memories.size : 0,
      expiringSoon
    };
  }

  /**
   * Clean up expired memories
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, expirable] of this.memories.entries()) {
      if (now > expirable.expiresAt) {
        this.memories.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Extend TTL for a memory
   */
  async extendTTL(id: string, additionalMs: number): Promise<boolean> {
    const expirable = this.memories.get(id);
    if (!expirable) return false;

    expirable.expiresAt = Math.min(
      expirable.expiresAt + additionalMs,
      Date.now() + this.config.ttl * 2 // Max 2x TTL
    );

    return true;
  }

  /**
   * Get all memories (for consolidation)
   */
  async getAll(): Promise<Memory[]> {
    this.cleanupExpired();
    return Array.from(this.memories.values()).map(e => e.memory);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.memories.clear();
    this.byAgent.clear();
    this.byTag.clear();
    this.removeAllListeners();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `stm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
   * Calculate initial importance
   */
  private calculateInitialImportance(content: any): number {
    let importance = 0.5;

    // Boost for structured data
    if (typeof content === 'object' && content !== null) {
      const keys = Object.keys(content);
      if (keys.length > 0) importance += 0.1;
    }

    // Boost for string content (conversations, notes)
    if (typeof content === 'string' && content.length > 50) {
      importance += 0.1;
    }

    return Math.min(1, importance);
  }

  /**
   * Evict expired or low-importance memories when at capacity
   */
  private async evictExpiredOrUnimportant(): Promise<void> {
    // First, clean expired
    this.cleanupExpired();

    // If still over capacity, evict low importance
    while (this.memories.size > this.config.maxCapacity) {
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      let lowestImportance = 1;

      for (const [id, expirable] of this.memories.entries()) {
        // Prefer low importance, least recently accessed
        const score = expirable.memory.importance * 0.5 +
                      (1 - expirable.memory.lastAccessed / Date.now()) * 0.5;

        if (score < lowestImportance || expirable.memory.lastAccessed < oldestTime) {
          lowestImportance = score;
          oldestTime = expirable.memory.lastAccessed;
          oldestId = id;
        }
      }

      if (oldestId) {
        await this.delete(oldestId);
      } else {
        break;
      }
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanup(): void {
    // Clean every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, 300000);
  }
}
