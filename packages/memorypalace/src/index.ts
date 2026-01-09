/**
 * MemoryPalace - Hierarchical Three-Tier Memory System
 *
 * A sophisticated memory system for AI agents featuring:
 * - Working Memory (seconds/minutes): Current context and active tasks
 * - Short-term Memory (hours/days): Recent conversations and learnings
 * - Long-term Memory (weeks/years): Persistent knowledge and skills
 *
 * Features:
 * - Automatic memory consolidation between tiers
 * - Semantic retrieval with vector search
 * - Cross-agent memory sharing with access control
 * - Browser-native with IndexedDB support
 * - Zero dependencies on other SuperInstance tools
 *
 * @example
 * ```typescript
 * import { MemoryPalace } from '@superinstance/memorypalace';
 *
 * const memory = new MemoryPalace({
 *   workingMemorySize: 50,
 *   shortTermCapacity: 5000,
 *   longTermCapacity: 1000000,
 *   consolidationInterval: 3600000
 * });
 *
 * // Store in working memory
 * memory.working.set('currentTask', 'Building AI tools');
 *
 * // Store in short-term
 * await memory.shortTerm.store('Conversation summary', { ... });
 *
 * // Store in long-term
 * await memory.longTerm.store('Important knowledge', { ... });
 *
 * // Retrieve across all tiers
 * const results = await memory.retrieve('AI tools');
 * ```
 */

import { EventEmitter } from 'eventemitter3';
import { WorkingMemory } from './storage/working-memory.js';
import { ShortTermMemory } from './storage/short-term-memory.js';
import { LongTermMemory } from './storage/long-term-memory.js';
import { SemanticRetrieval } from './retrieval/semantic-retrieval.js';
import { MultiAgentMemory } from './sharing/multi-agent-memory.js';
import {
  Memory,
  MemoryTier,
  MemoryQuery,
  MemoryStats,
  ConsolidationResult,
  ConsolidationConfig,
  RetrievalConfig,
  SharingConfig,
  MemoryPalaceConfig,
  MemoryEvent,
  PrivacyLevel
} from './types.js';

/**
 * Default configuration for MemoryPalace
 */
const DEFAULT_CONFIG: MemoryPalaceConfig = {
  consolidation: {
    workingToShortTermThreshold: 0.6,
    shortToLongTermThreshold: 0.8,
    workingMaxSize: 50,
    shortTermMaxSize: 5000,
    longTermMaxSize: 1000000,
    consolidationInterval: 3600000, // 1 hour
    accessDecayRate: 0.1,
    importanceDecayRate: 0.05
  },
  retrieval: {
    vectorDimensions: 384,
    similarityThreshold: 0.6,
    maxResults: 100,
    searchAllTiers: true,
    tierWeights: {
      working: 3.0,
      shortTerm: 1.5,
      longTerm: 1.0
    }
  },
  sharing: {
    enabled: true,
    defaultPrivacy: PrivacyLevel.PRIVATE,
    allowSharingRequests: true,
    requirePermission: false,
    maxSharedMemories: 10000
  },
  enablePersistence: false,
  persistencePath: undefined
};

/**
 * MemoryPalace - Main class for hierarchical memory management
 *
 * Provides unified access to all three memory tiers with automatic
 * consolidation, semantic retrieval, and multi-agent sharing.
 */
export class MemoryPalace extends EventEmitter {
  /** Working memory - fast access for current context */
  public readonly working: WorkingMemory;

  /** Short-term memory - recent information storage */
  public readonly shortTerm: ShortTermMemory;

  /** Long-term memory - persistent knowledge storage */
  public readonly longTerm: LongTermMemory;

  /** Semantic retrieval - cross-tier search */
  public readonly retrieval: SemanticRetrieval;

  /** Multi-agent memory sharing */
  public readonly sharing: MultiAgentMemory;

  private config: MemoryPalaceConfig;
  private consolidationTimer?: NodeJS.Timeout;
  private isConsolidating: boolean;

  constructor(config: Partial<MemoryPalaceConfig> = {}) {
    super();

    // Merge with defaults
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);

    // Initialize storage tiers
    this.working = new WorkingMemory({
      maxSize: this.config.consolidation.workingMaxSize,
      enableAutoEviction: true,
      defaultAgentId: 'default'
    });

    this.shortTerm = new ShortTermMemory({
      maxCapacity: this.config.consolidation.shortTermMaxSize,
      ttl: 86400000, // 24 hours
      enableCompression: false,
      defaultAgentId: 'default'
    });

    this.longTerm = new LongTermMemory({
      maxCapacity: this.config.consolidation.longTermMaxSize,
      enablePersistence: this.config.enablePersistence,
      persistencePath: this.config.persistencePath,
      enableVectorIndex: true,
      vectorDimensions: this.config.retrieval.vectorDimensions,
      defaultAgentId: 'default'
    });

    // Initialize retrieval
    this.retrieval = new SemanticRetrieval(
      this.working,
      this.shortTerm,
      this.longTerm,
      this.config.retrieval
    );

    // Initialize sharing
    this.sharing = new MultiAgentMemory(
      this.working,
      this.shortTerm,
      this.longTerm,
      this.config.sharing
    );

    this.isConsolidating = false;

    // Set up event forwarding
    this.setupEventForwarding();

    // Start automatic consolidation
    this.startConsolidation();
  }

  /**
   * Retrieve memories across all tiers
   * @param query - Search query
   * @returns Ranked results from all tiers
   */
  async retrieve(query: string | MemoryQuery): Promise<Memory[]> {
    const normalizedQuery = typeof query === 'string'
      ? { query, maxResults: this.config.retrieval.maxResults }
      : query;

    const results = await this.retrieval.retrieve(normalizedQuery);
    return results.map(r => r.memory);
  }

  /**
   * Semantic search with vector embedding
   * @param query - Search query text
   * @param embedding - Vector embedding of query
   * @returns Ranked results with similarity scores
   */
  async semanticSearch(
    query: string,
    embedding: number[],
    options: {
      agentId?: string;
      tags?: string[];
      minImportance?: number;
      maxResults?: number;
    } = {}
  ): Promise<Array<{ memory: Memory; similarity: number }>> {
    return await this.longTerm.semanticSearch(embedding, {
      ...options,
      maxResults: options.maxResults ?? this.config.retrieval.maxResults
    });
  }

  /**
   * Get recent memories from all tiers
   */
  async getRecent(limit: number = 20): Promise<Memory[]> {
    const results = await this.retrieval.getRecent(limit);
    return results.map(r => r.memory);
  }

  /**
   * Get important memories from all tiers
   */
  async getImportant(minImportance: number = 0.7): Promise<Memory[]> {
    const results = await this.retrieval.getImportant(minImportance);
    return results.map(r => r.memory);
  }

  /**
   * Get memories by tag across all tiers
   */
  async getByTag(tag: string): Promise<Memory[]> {
    const results = await this.retrieval.getByTags([tag]);
    return results.map(r => r.memory);
  }

  /**
   * Get memories by agent ID across all tiers
   */
  async getByAgent(agentId: string): Promise<Memory[]> {
    const working = this.working.getByAgent(agentId);
    const shortTerm = await this.shortTerm.getByAgent(agentId);
    const longTerm = await this.longTerm.getByAgent(agentId);
    return [...working, ...shortTerm, ...longTerm];
  }

  /**
   * Store in the appropriate tier based on importance
   */
  async store(
    content: any,
    options: {
      agentId?: string;
      importance?: number;
      tags?: string[];
      tier?: MemoryTier;
      embedding?: number[];
    } = {}
  ): Promise<string> {
    const importance = options.importance ?? 0.5;
    const tier = options.tier ?? this.selectTier(importance);

    switch (tier) {
      case MemoryTier.WORKING:
        const key = this.generateKey();
        this.working.set(key, content, {
          agentId: options.agentId,
          tags: options.tags,
          importance
        });
        return key;

      case MemoryTier.SHORT_TERM:
        return await this.shortTerm.store(content, {
          agentId: options.agentId,
          tags: options.tags,
          importance
        });

      case MemoryTier.LONG_TERM:
        return await this.longTerm.store(content, {
          agentId: options.agentId,
          tags: options.tags,
          importance,
          embedding: options.embedding
        });
    }
  }

  /**
   * Share a memory with another agent
   */
  async share(
    memoryId: string,
    fromAgentId: string,
    toAgentId: string,
    options?: {
      permissions?: { canRead?: boolean; canWrite?: boolean; canDelete?: boolean };
      message?: string;
    }
  ): Promise<boolean> {
    return await this.sharing.shareMemory(memoryId, fromAgentId, toAgentId, options);
  }

  /**
   * Get memories shared with an agent
   */
  async getShared(agentId: string): Promise<Memory[]> {
    return await this.sharing.getSharedMemories(agentId);
  }

  /**
   * Manually trigger consolidation
   */
  async consolidate(): Promise<ConsolidationResult> {
    if (this.isConsolidating) {
      throw new Error('Consolidation already in progress');
    }

    this.isConsolidating = true;
    this.emit('consolidation:started', { timestamp: Date.now() });

    const startTime = Date.now();
    const result: ConsolidationResult = {
      promoted: { toShortTerm: 0, toLongTerm: 0 },
      evicted: { fromWorking: 0, fromShortTerm: 0 },
      decayed: 0,
      duration: 0
    };

    try {
      // Promote from working to short-term
      const workingMemories = this.working.getAll();
      for (const memory of workingMemories) {
        if (memory.importance >= this.config.consolidation.workingToShortTermThreshold) {
          await this.shortTerm.store(memory.content, {
            agentId: memory.agentId,
            tags: [...memory.tags, 'promoted-from-working'],
            importance: memory.importance * 0.9 // Decay slightly
          });
          this.working.delete(memory.id);
          result.promoted.toShortTerm++;
        }
      }

      // Promote from short-term to long-term
      const shortTermMemories = await this.shortTerm.getByImportance(
        this.config.consolidation.shortToLongTermThreshold
      );
      for (const memory of shortTermMemories) {
        await this.longTerm.store(memory.content, {
          agentId: memory.agentId,
          tags: [...memory.tags, 'promoted-from-short-term'],
          importance: memory.importance
        });
        await this.shortTerm.delete(memory.id);
        result.promoted.toLongTerm++;
      }

      result.duration = Date.now() - startTime;
      this.emit('consolidation:completed', result);
      return result;
    } finally {
      this.isConsolidating = false;
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): MemoryStats {
    const workingStats = this.working.getStats();
    const shortTermStats = this.shortTerm.getStats();
    const longTermStats = this.longTerm.getStats();

    return {
      working: {
        count: workingStats.size,
        maxSize: workingStats.maxSize,
        utilization: workingStats.utilization
      },
      shortTerm: {
        count: shortTermStats.count,
        maxSize: shortTermStats.maxCapacity,
        utilization: shortTermStats.utilization
      },
      longTerm: {
        count: longTermStats.count,
        maxSize: longTermStats.maxCapacity,
        utilization: longTermStats.utilization
      },
      totalMemories: workingStats.size + shortTermStats.count + longTermStats.count,
      consolidationQueue: 0,
      lastConsolidation: Date.now()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MemoryPalaceConfig>): void {
    this.config = this.mergeConfig(this.config, updates);

    // Update component configs
    if (updates.retrieval) {
      this.retrieval.updateConfig(this.config.retrieval);
    }
  }

  /**
   * Stop automatic consolidation
   */
  stopConsolidation(): void {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = undefined;
    }
  }

  /**
   * Start automatic consolidation
   */
  startConsolidation(): void {
    this.stopConsolidation();

    this.consolidationTimer = setInterval(async () => {
      try {
        await this.consolidate();
      } catch (error) {
        this.emit('error', error);
      }
    }, this.config.consolidation.consolidationInterval);
  }

  /**
   * Clean up and destroy all resources
   */
  async destroy(): Promise<void> {
    this.stopConsolidation();
    this.working.destroy();
    this.shortTerm.destroy();
    await this.longTerm.destroy();
    this.sharing.destroy();
    this.removeAllListeners();
  }

  /**
   * Select appropriate tier based on importance
   */
  private selectTier(importance: number): MemoryTier {
    if (importance < this.config.consolidation.workingToShortTermThreshold) {
      return MemoryTier.WORKING;
    } else if (importance < this.config.consolidation.shortToLongTermThreshold) {
      return MemoryTier.SHORT_TERM;
    } else {
      return MemoryTier.LONG_TERM;
    }
  }

  /**
   * Generate a unique key for working memory
   */
  private generateKey(): string {
    return `wm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Merge configurations deeply
   */
  private mergeConfig(base: MemoryPalaceConfig, updates: Partial<MemoryPalaceConfig>): MemoryPalaceConfig {
    return {
      consolidation: { ...base.consolidation, ...updates.consolidation },
      retrieval: { ...base.retrieval, ...updates.retrieval },
      sharing: { ...base.sharing, ...updates.sharing },
      enablePersistence: updates.enablePersistence ?? base.enablePersistence,
      persistencePath: updates.persistencePath ?? base.persistencePath
    };
  }

  /**
   * Forward events from components
   */
  private setupEventForwarding(): void {
    // Forward working memory events
    this.working.on('memory:created', (data) => this.emit('memory:created', data));
    this.working.on('memory:accessed', (data) => this.emit('memory:accessed', data));
    this.working.on('memory:evicted', (data) => this.emit('memory:evicted', data));

    // Forward short-term events
    this.shortTerm.on('memory:created', (data) => this.emit('memory:created', data));
    this.shortTerm.on('memory:accessed', (data) => this.emit('memory:accessed', data));
    this.shortTerm.on('memory:evicted', (data) => this.emit('memory:evicted', data));
    this.shortTerm.on('memory:updated', (data) => this.emit('memory:updated', data));

    // Forward long-term events
    this.longTerm.on('memory:created', (data) => this.emit('memory:created', data));
    this.longTerm.on('memory:accessed', (data) => this.emit('memory:accessed', data));
    this.longTerm.on('memory:evicted', (data) => this.emit('memory:evicted', data));
    this.longTerm.on('memory:updated', (data) => this.emit('memory:updated', data));

    // Forward sharing events
    this.sharing.on('memory:shared', (data) => this.emit('memory:shared', data));
    this.sharing.on('share:request:created', (data) => this.emit('share:request:created', data));
  }
}

// Re-export types
export * from './types.js';

// Re-export storage
export { WorkingMemory } from './storage/working-memory.js';
export { ShortTermMemory } from './storage/short-term-memory.js';
export { LongTermMemory } from './storage/long-term-memory.js';

// Re-export retrieval
export { SemanticRetrieval } from './retrieval/semantic-retrieval.js';

// Re-export sharing
export { MultiAgentMemory } from './sharing/multi-agent-memory.js';

// Re-export enums
export { MemoryTier, MemoryStatus, PrivacyLevel } from './types.js';
