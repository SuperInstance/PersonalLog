/**
 * MemoryPalace - Hierarchical Three-Tier Memory System
 *
 * A sophisticated memory system for AI agents with:
 * - Working Memory (seconds/minutes)
 * - Short-term Memory (hours/days)
 * - Long-term Memory (weeks/years)
 *
 * Features automatic consolidation, semantic retrieval, and cross-agent memory sharing.
 */

/**
 * Memory tiers representing different storage levels
 */
export enum MemoryTier {
  WORKING = 'working',
  SHORT_TERM = 'short-term',
  LONG_TERM = 'long-term'
}

/**
 * Status of a memory entry
 */
export enum MemoryStatus {
  ACTIVE = 'active',
  CONSOLIDATING = 'consolidating',
  ARCHIVED = 'archived',
  EVICTED = 'evicted'
}

/**
 * Privacy levels for shared memories
 */
export enum PrivacyLevel {
  PRIVATE = 'private',           // Only owning agent can access
  SHARED = 'shared',             // Specific agents can access
  PUBLIC = 'public'              // All agents can access
}

/**
 * A single memory entry with metadata
 */
export interface Memory {
  id: string;
  agentId: string;
  tier: MemoryTier;
  content: any;
  importance: number;            // 0-1 score
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  updatedAt: number;
  status: MemoryStatus;
  tags: string[];
  embedding?: number[];          // Vector embedding for semantic search
  privacy: PrivacyLevel;
  sharedWith?: string[];         // Agent IDs that can access
  metadata?: Record<string, any>;
}

/**
 * Result of a memory retrieval operation
 */
export interface RetrievalResult {
  memory: Memory;
  relevance: number;             // 0-1 similarity score
  tier: MemoryTier;
}

/**
 * Statistics for memory system monitoring
 */
export interface MemoryStats {
  working: {
    count: number;
    maxSize: number;
    utilization: number;
  };
  shortTerm: {
    count: number;
    maxSize: number;
    utilization: number;
  };
  longTerm: {
    count: number;
    maxSize: number;
    utilization: number;
  };
  totalMemories: number;
  consolidationQueue: number;
  lastConsolidation: number;
}

/**
 * Configuration for consolidation thresholds
 */
export interface ConsolidationConfig {
  workingToShortTermThreshold: number;  // Importance score to promote
  shortToLongTermThreshold: number;     // Importance score to promote
  workingMaxSize: number;
  shortTermMaxSize: number;
  longTermMaxSize: number;
  consolidationInterval: number;        // ms between consolidations
  accessDecayRate: number;              // How fast access count decays
  importanceDecayRate: number;          // How fast importance decays
}

/**
 * Configuration for semantic search
 */
export interface RetrievalConfig {
  vectorDimensions: number;
  similarityThreshold: number;          // Minimum similarity to return
  maxResults: number;
  searchAllTiers: boolean;
  tierWeights: {
    working: number;
    shortTerm: number;
    longTerm: number;
  };
}

/**
 * Configuration for memory sharing
 */
export interface SharingConfig {
  enabled: boolean;
  defaultPrivacy: PrivacyLevel;
  allowSharingRequests: boolean;
  requirePermission: boolean;
  maxSharedMemories: number;
}

/**
 * Main configuration for MemoryPalace
 */
export interface MemoryPalaceConfig {
  consolidation: ConsolidationConfig;
  retrieval: RetrievalConfig;
  sharing: SharingConfig;
  enablePersistence?: boolean;
  persistencePath?: string;
}

/**
 * Event types emitted by MemoryPalace
 */
export type MemoryEvent =
  | 'memory:created'
  | 'memory:accessed'
  | 'memory:updated'
  | 'memory:consolidated'
  | 'memory:evicted'
  | 'memory:shared'
  | 'consolidation:started'
  | 'consolidation:completed';

/**
 * Payload for memory events
 */
export interface MemoryEventPayload {
  memoryId: string;
  agentId: string;
  fromTier?: MemoryTier;
  toTier?: MemoryTier;
  timestamp: number;
}

/**
 * Search query for semantic retrieval
 */
export interface MemoryQuery {
  query: string;
  embedding?: number[];
  agentId?: string;
  tiers?: MemoryTier[];
  tags?: string[];
  minImportance?: number;
  maxResults?: number;
  includePrivate?: boolean;
}

/**
 * Result of a memory consolidation cycle
 */
export interface ConsolidationResult {
  promoted: {
    toShortTerm: number;
    toLongTerm: number;
  };
  evicted: {
    fromWorking: number;
    fromShortTerm: number;
  };
  decayed: number;
  duration: number;
}
