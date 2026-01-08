/**
 * Agent Context Cache System
 *
 * Caches agent context (docs, code, commits, state) for instant reuse.
 * Reduces agent ramp-up time from 30-45 minutes to 10-15 minutes.
 *
 * @module lib/preload/context-cache
 */

import { openDB, type IDBPDatabase } from 'idb';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Context data for a specific agent type
 */
export interface AgentContext {
  /** Agent type identifier (e.g., 'jepa-v1', 'spreader-v1') */
  agentType: string;
  /** When context was cached */
  timestamp: number;
  /** Documentation files */
  docs: ContextDoc[];
  /** Recent git commits */
  commits: ContextCommit[];
  /** Source code files */
  files: ContextFile[];
  /** Type definitions */
  types: ContextType[];
  /** Agent definitions */
  agents: ContextAgent[];
  /** Cache metadata */
  metadata: ContextMetadata;
}

/**
 * Document context entry
 */
export interface ContextDoc {
  /** Document path (e.g., 'CLAUDE.md', '.agents/WORK_STATUS.md') */
  path: string;
  /** Document content */
  content: string;
  /** Content hash for deduplication */
  hash: string;
  /** Last modified timestamp */
  lastModified: number;
  /** Document size in bytes */
  size: number;
}

/**
 * Git commit context entry
 */
export interface ContextCommit {
  /** Commit hash */
  hash: string;
  /** Commit message */
  message: string;
  /** Author */
  author: string;
  /** Timestamp */
  timestamp: number;
  /** Files changed */
  files: string[];
}

/**
 * Source code file context entry
 */
export interface ContextFile {
  /** File path (e.g., 'src/lib/agents/registry.ts') */
  path: string;
  /** File content */
  content: string;
  /** Content hash for deduplication */
  hash: string;
  /** Language (e.g., 'typescript', 'javascript') */
  language: string;
  /** Last modified timestamp */
  lastModified: number;
  /** File size in bytes */
  size: number;
  /** Import statements */
  imports: string[];
  /** Export statements */
  exports: string[];
}

/**
 * Type definition context entry
 */
export interface ContextType {
  /** Type name */
  name: string;
  /** Type definition */
  definition: string;
  /** Source file */
  sourceFile: string;
  /** Type kind (interface, type, enum, class) */
  kind: 'interface' | 'type' | 'enum' | 'class';
}

/**
 * Agent definition context entry
 */
export interface ContextAgent {
  /** Agent ID */
  id: string;
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent category */
  category: string;
  /** Requirements */
  requirements: Record<string, unknown>;
}

/**
 * Cache metadata
 */
export interface ContextMetadata {
  /** Cache version (increment when structure changes) */
  version: number;
  /** Total uncompressed size in bytes */
  totalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Number of items cached */
  itemCount: number;
  /** Cache build time in milliseconds */
  buildTime: number;
  /** Last access timestamp */
  lastAccess: number;
  /** Access count */
  accessCount: number;
  /** Whether cache is stale (needs refresh) */
  stale: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cached agent contexts */
  totalContexts: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Total cache size in bytes */
  totalSize: number;
  /** Average cache retrieval time in milliseconds */
  avgRetrievalTime: number;
  /** Number of stale contexts */
  staleContexts: number;
  /** Oldest context timestamp */
  oldestContext: number;
  /** Newest context timestamp */
  newestContext: number;
  /** Per-agent-type stats */
  agentStats: Record<string, AgentCacheStats>;
}

/**
 * Per-agent cache statistics
 */
export interface AgentCacheStats {
  /** Agent type */
  agentType: string;
  /** Number of times cached */
  cacheCount: number;
  /** Number of cache hits */
  hitCount: number;
  /** Cache hit rate */
  hitRate: number;
  /** Average retrieval time */
  avgRetrievalTime: number;
  /** Last cached timestamp */
  lastCached: number;
  /** Cache size in bytes */
  size: number;
}

/**
 * Cache entry in IndexedDB
 */
interface CacheEntry {
  /** Agent type */
  agentType: string;
  /** Compressed context data */
  compressed: string;
  /** Timestamp */
  timestamp: number;
  /** Metadata */
  metadata: ContextMetadata;
  /** TTL (time to live) in milliseconds */
  ttl: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DB_NAME = 'PersonalLogAgentContextCache';
const DB_VERSION = 1;
const STORE_NAME = 'contexts';
const CACHE_VERSION = 1;
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================================================
// CONTEXT CACHE CLASS
// ============================================================================

/**
 * Agent Context Cache
 *
 * Caches complete agent context for instant reuse when agents spawn.
 */
export class AgentContextCache {
  private db: IDBPDatabase | null = null;
  private stats: Map<string, { hits: number; misses: number; totalTime: number }>;
  private sharedContext: Map<string, ContextDoc | ContextFile | ContextType>;

  constructor() {
    this.stats = new Map();
    this.sharedContext = new Map();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize the context cache
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'agentType' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('ttl', 'ttl');
        }
      },
    });

    // Load shared context (docs used by multiple agents)
    await this.loadSharedContext();
  }

  /**
   * Load shared context (docs common to all agents)
   */
  private async loadSharedContext(): Promise<void> {
    // Common docs that most agents need
    const commonDocs = [
      'CLAUDE.md',
      '.agents/WORK_STATUS.md',
      'README.md',
    ];

    for (const docPath of commonDocs) {
      try {
        const content = await this.fetchDoc(docPath);
        const hash = this.hashContent(content);

        this.sharedContext.set(docPath, {
          path: docPath,
          content,
          hash,
          lastModified: Date.now(),
          size: content.length,
        });
      } catch (error) {
        console.warn(`[ContextCache] Failed to load shared doc: ${docPath}`, error);
      }
    }
  }

  // ========================================================================
  // CACHE OPERATIONS
  // ========================================================================

  /**
   * Cache agent context
   *
   * @param agentType - Agent type identifier
   * @param context - Context data to cache
   * @param ttl - Time to live in milliseconds (default: 24 hours)
   * @returns Success status
   */
  async cacheAgentContext(
    agentType: string,
    context: AgentContext,
    ttl: number = DEFAULT_TTL
  ): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const startTime = Date.now();

      // Deduplicate context with shared context
      const deduplicatedContext = this.deduplicateContext(context);

      // Update metadata
      const metadata: ContextMetadata = {
        ...context.metadata,
        version: CACHE_VERSION,
        totalSize: this.calculateContextSize(deduplicatedContext),
        compressedSize: 0, // Will be updated after compression
        compressionRatio: 0,
        buildTime: Date.now() - startTime,
        lastAccess: Date.now(),
        accessCount: 0,
        stale: false,
      };

      // Serialize and compress
      const serialized = JSON.stringify(deduplicatedContext);
      const compressed = compressToUTF16(serialized);

      metadata.compressedSize = compressed.length;
      metadata.compressionRatio = metadata.totalSize / metadata.compressedSize;

      // Create cache entry
      const entry: CacheEntry = {
        agentType,
        compressed,
        timestamp: Date.now(),
        metadata,
        ttl: Date.now() + ttl,
      };

      // Check cache size limit
      await this.evictIfNeeded(entry.compressed.length);

      // Store in IndexedDB
      await this.db!.put(STORE_NAME, entry);

      // Update stats
      const stats = this.stats.get(agentType) || { hits: 0, misses: 0, totalTime: 0 };
      this.stats.set(agentType, stats);

      console.log(`[ContextCache] Cached context for ${agentType}:`, {
        size: `${(metadata.totalSize / 1024).toFixed(2)} KB`,
        compressed: `${(metadata.compressedSize / 1024).toFixed(2)} KB`,
        ratio: `${(metadata.compressionRatio * 100).toFixed(0)}%`,
        items: metadata.itemCount,
      });

      return true;
    } catch (error) {
      console.error(`[ContextCache] Failed to cache context for ${agentType}:`, error);
      return false;
    }
  }

  /**
   * Get cached agent context
   *
   * @param agentType - Agent type identifier
   * @returns Cached context or null if not found/expired
   */
  async getAgentContext(agentType: string): Promise<AgentContext | null> {
    if (!this.db) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      const entry = await this.db!.get(STORE_NAME, agentType) as CacheEntry | undefined;

      if (!entry) {
        // Cache miss
        const stats = this.stats.get(agentType) || { hits: 0, misses: 0, totalTime: 0 };
        stats.misses++;
        this.stats.set(agentType, stats);
        return null;
      }

      // Check if expired
      if (Date.now() > entry.ttl) {
        console.log(`[ContextCache] Cache expired for ${agentType}`);
        await this.invalidateAgentContext(agentType);

        const stats = this.stats.get(agentType) || { hits: 0, misses: 0, totalTime: 0 };
        stats.misses++;
        this.stats.set(agentType, stats);
        return null;
      }

      // Decompress and deserialize
      const decompressed = decompressFromUTF16(entry.compressed);
      const context: AgentContext = JSON.parse(decompressed);

      // Update metadata
      entry.metadata.lastAccess = Date.now();
      entry.metadata.accessCount++;
      await this.db!.put(STORE_NAME, entry);

      // Update stats
      const retrievalTime = Date.now() - startTime;
      const stats = this.stats.get(agentType) || { hits: 0, misses: 0, totalTime: 0 };
      stats.hits++;
      stats.totalTime += retrievalTime;
      this.stats.set(agentType, stats);

      console.log(`[ContextCache] Retrieved context for ${agentType} in ${retrievalTime}ms`);

      return context;
    } catch (error) {
      console.error(`[ContextCache] Failed to get context for ${agentType}:`, error);

      const stats = this.stats.get(agentType) || { hits: 0, misses: 0, totalTime: 0 };
      stats.misses++;
      this.stats.set(agentType, stats);

      return null;
    }
  }

  /**
   * Invalidate cached agent context
   *
   * @param agentType - Agent type to invalidate
   * @returns Success status
   */
  async invalidateAgentContext(agentType: string): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      await this.db!.delete(STORE_NAME, agentType);
      console.log(`[ContextCache] Invalidated context for ${agentType}`);
      return true;
    } catch (error) {
      console.error(`[ContextCache] Failed to invalidate context for ${agentType}:`, error);
      return false;
    }
  }

  /**
   * Check if agent context is cached and valid
   *
   * @param agentType - Agent type to check
   * @returns True if cached and valid
   */
  async hasAgentContext(agentType: string): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const entry = await this.db!.get(STORE_NAME, agentType) as CacheEntry | undefined;
      return entry !== undefined && Date.now() <= entry.ttl;
    } catch (error) {
      console.error(`[ContextCache] Failed to check context for ${agentType}:`, error);
      return false;
    }
  }

  // ========================================================================
  // CACHE STATS
  // ========================================================================

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const allEntries = (await this.db!.getAll(STORE_NAME)) as CacheEntry[];

      let totalHits = 0;
      let totalMisses = 0;
      let totalRetrievalTime = 0;
      let totalSize = 0;
      let staleCount = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      const agentStats: Record<string, AgentCacheStats> = {};

      for (const entry of allEntries) {
        const stats = this.stats.get(entry.agentType) || { hits: 0, misses: 0, totalTime: 0 };
        const hitRate = stats.hits + stats.misses > 0
          ? stats.hits / (stats.hits + stats.misses)
          : 0;
        const avgRetrievalTime = stats.hits > 0
          ? stats.totalTime / stats.hits
          : 0;

        agentStats[entry.agentType] = {
          agentType: entry.agentType,
          cacheCount: 1,
          hitCount: stats.hits,
          hitRate,
          avgRetrievalTime,
          lastCached: entry.timestamp,
          size: entry.metadata.compressedSize,
        };

        totalHits += stats.hits;
        totalMisses += stats.misses;
        totalRetrievalTime += stats.totalTime;
        totalSize += entry.metadata.compressedSize;

        if (Date.now() > entry.ttl) {
          staleCount++;
        }

        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
        if (entry.timestamp > newestTimestamp) {
          newestTimestamp = entry.timestamp;
        }
      }

      const hitRate = totalHits + totalMisses > 0
        ? totalHits / (totalHits + totalMisses)
        : 0;

      const avgRetrievalTime = totalHits > 0
        ? totalRetrievalTime / totalHits
        : 0;

      return {
        totalContexts: allEntries.length,
        hitRate,
        totalSize,
        avgRetrievalTime,
        staleContexts: staleCount,
        oldestContext: oldestTimestamp,
        newestContext: newestTimestamp,
        agentStats,
      };
    } catch (error) {
      console.error('[ContextCache] Failed to get cache stats:', error);
      return {
        totalContexts: 0,
        hitRate: 0,
        totalSize: 0,
        avgRetrievalTime: 0,
        staleContexts: 0,
        oldestContext: 0,
        newestContext: 0,
        agentStats: {},
      };
    }
  }

  /**
   * Clear all cached contexts
   *
   * @returns Success status
   */
  async clearAll(): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      await this.db!.clear(STORE_NAME);
      this.stats.clear();
      console.log('[ContextCache] Cleared all cached contexts');
      return true;
    } catch (error) {
      console.error('[ContextCache] Failed to clear all contexts:', error);
      return false;
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Deduplicate context with shared context
   */
  private deduplicateContext(context: AgentContext): AgentContext {
    // Remove docs that are in shared context
    const docs = context.docs.filter(doc => {
      const shared = this.sharedContext.get(doc.path);
      return !shared || ('hash' in shared && shared.hash !== doc.hash);
    });

    return {
      ...context,
      docs,
      metadata: {
        ...context.metadata,
        itemCount: docs.length + context.commits.length + context.files.length,
      },
    };
  }

  /**
   * Calculate context size
   */
  private calculateContextSize(context: AgentContext): number {
    let size = 0;

    for (const doc of context.docs) {
      size += doc.size;
    }

    for (const file of context.files) {
      size += file.size;
    }

    for (const commit of context.commits) {
      size += commit.message.length + commit.files.join(',').length;
    }

    for (const type of context.types) {
      size += type.definition.length;
    }

    return size;
  }

  /**
   * Hash content for deduplication
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Fetch document content
   */
  private async fetchDoc(path: string): Promise<string> {
    // In browser environment, fetch via API
    if (typeof window !== 'undefined') {
      const response = await fetch(`/api/docs?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch doc: ${path}`);
      }
      return await response.text();
    }

    // In Node environment, read from filesystem
    const fs = await import('fs/promises');
    const fullPath = `/mnt/c/users/casey/personallog/${path}`;
    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Evict old cache entries if size limit exceeded
   */
  private async evictIfNeeded(newSize: number): Promise<void> {
    if (!this.db) return;

    try {
      const allEntries = await this.db.getAll(STORE_NAME) as CacheEntry[];
      const totalSize = allEntries.reduce((sum, entry) => sum + entry.compressed.length, 0);

      if (totalSize + newSize <= MAX_CACHE_SIZE) {
        return; // Within limit
      }

      // Sort by last access time (oldest first)
      const sortedEntries = allEntries.sort((a, b) => a.metadata.lastAccess - b.metadata.lastAccess);

      // Evict oldest entries until under limit
      let currentSize = totalSize;
      for (const entry of sortedEntries) {
        if (currentSize + newSize <= MAX_CACHE_SIZE) {
          break;
        }

        await this.db!.delete(STORE_NAME, entry.agentType);
        currentSize -= entry.compressed.length;
        console.log(`[ContextCache] Evicted cache for ${entry.agentType}`);
      }
    } catch (error) {
      console.error('[ContextCache] Failed to evict cache entries:', error);
    }
  }

  /**
   * Mark context as stale
   *
   * @param agentType - Agent type to mark stale
   */
  async markStale(agentType: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const entry = (await this.db!.get(STORE_NAME, agentType)) as CacheEntry | undefined;
      if (entry) {
        entry.metadata.stale = true;
        await this.db!.put(STORE_NAME, entry);
      }
    } catch (error) {
      console.error(`[ContextCache] Failed to mark context stale for ${agentType}:`, error);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let contextCacheInstance: AgentContextCache | null = null;

/**
 * Get the singleton context cache instance
 */
export function getContextCache(): AgentContextCache {
  if (!contextCacheInstance) {
    contextCacheInstance = new AgentContextCache();
  }
  return contextCacheInstance;
}

/**
 * Reset the singleton context cache instance
 */
export function resetContextCache(): void {
  contextCacheInstance = null;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Cache agent context (convenience function)
 */
export async function cacheAgentContext(
  agentType: string,
  context: AgentContext,
  ttl?: number
): Promise<boolean> {
  const cache = getContextCache();
  return await cache.cacheAgentContext(agentType, context, ttl);
}

/**
 * Get cached agent context (convenience function)
 */
export async function getAgentContext(agentType: string): Promise<AgentContext | null> {
  const cache = getContextCache();
  return await cache.getAgentContext(agentType);
}

/**
 * Invalidate cached agent context (convenience function)
 */
export async function invalidateAgentContext(agentType: string): Promise<boolean> {
  const cache = getContextCache();
  return await cache.invalidateAgentContext(agentType);
}

/**
 * Check if agent context is cached (convenience function)
 */
export async function hasAgentContext(agentType: string): Promise<boolean> {
  const cache = getContextCache();
  return await cache.hasAgentContext(agentType);
}

/**
 * Get cache statistics (convenience function)
 */
export async function getCacheStats(): Promise<CacheStats> {
  const cache = getContextCache();
  return await cache.getCacheStats();
}

/**
 * Clear all cached contexts (convenience function)
 */
export async function clearAllContexts(): Promise<boolean> {
  const cache = getContextCache();
  return await cache.clearAll();
}
