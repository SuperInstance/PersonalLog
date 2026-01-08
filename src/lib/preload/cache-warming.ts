/**
 * Cache Warming System
 *
 * Pre-warms agent context cache on startup and refreshes periodically.
 * Runs in background to avoid blocking startup.
 *
 * @module lib/preload/cache-warming
 */

import { getContextCache, type AgentContext } from './context-cache';
import type { AgentDefinition } from '@/lib/agents/types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Cache warming status
 */
export enum WarmingStatus {
  /** Not started */
  IDLE = 'idle',
  /** Warming in progress */
  WARMING = 'warming',
  /** Completed successfully */
  COMPLETED = 'completed',
  /** Failed with error */
  FAILED = 'failed',
  /** Partially completed (some agents failed) */
  PARTIAL = 'partial',
}

/**
 * Warming progress information
 */
export interface WarmingProgress {
  /** Current status */
  status: WarmingStatus;
  /** Total number of agents to warm */
  totalAgents: number;
  /** Number of agents warmed so far */
  warmedAgents: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current agent being warmed */
  currentAgent?: string;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  /** Start timestamp */
  startTime: number;
  /** Errors encountered */
  errors: Array<{ agentType: string; error: string }>;
}

/**
 * Cache warming configuration
 */
export interface WarmingConfig {
  /** Auto-warm on startup */
  autoWarmOnStartup: boolean;
  /** Background refresh interval in milliseconds (default: 1 hour) */
  refreshInterval: number;
  /** Whether to warm in background (non-blocking) */
  background: boolean;
  /** Agents to warm (empty = all available agents) */
  agentTypes: string[];
  /** Maximum time to spend warming in milliseconds */
  maxWarmingTime: number;
  /** On progress callback */
  onProgress?: (progress: WarmingProgress) => void;
}

/**
 * Agent context builder function
 */
export type ContextBuilder = (agentType: string) => Promise<AgentContext>;

// ============================================================================
// CACHE WARMING CLASS
// ============================================================================

/**
 * Cache Warmer
 *
 * Pre-warms agent context cache for instant agent spawn.
 */
export class CacheWarmer {
  private warming = false;
  private currentProgress: WarmingProgress | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private contextBuilder: ContextBuilder | null = null;

  constructor() {
    // Initialize progress
    this.currentProgress = {
      status: WarmingStatus.IDLE,
      totalAgents: 0,
      warmedAgents: 0,
      progress: 0,
      startTime: 0,
      errors: [],
    };
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize the cache warmer
   *
   * @param contextBuilder - Function to build context for an agent type
   */
  initialize(contextBuilder: ContextBuilder): void {
    this.contextBuilder = contextBuilder;
  }

  // ========================================================================
  // CACHE WARMING
  // ========================================================================

  /**
   * Warm cache for specific agent types
   *
   * @param agentTypes - Agent types to warm
   * @param config - Warming configuration
   * @returns Warming progress result
   */
  async warmCache(
    agentTypes: string[],
    config: Partial<WarmingConfig> = {}
  ): Promise<WarmingProgress> {
    if (this.warming) {
      console.warn('[CacheWarmer] Warming already in progress');
      return this.currentProgress!;
    }

    if (!this.contextBuilder) {
      throw new Error('[CacheWarmer] Context builder not initialized. Call initialize() first.');
    }

    const fullConfig: WarmingConfig = {
      autoWarmOnStartup: true,
      refreshInterval: 60 * 60 * 1000, // 1 hour
      background: true,
      agentTypes,
      maxWarmingTime: 5 * 60 * 1000, // 5 minutes
      onProgress: config.onProgress,
    };

    this.warming = true;
    const startTime = Date.now();

    this.currentProgress = {
      status: WarmingStatus.WARMING,
      totalAgents: agentTypes.length,
      warmedAgents: 0,
      progress: 0,
      startTime,
      errors: [],
    };

    this.notifyProgress();

    try {
      if (fullConfig.background) {
        // Warm in background (don't block)
        this.warmInBackground(agentTypes, fullConfig, startTime);
        return this.currentProgress;
      } else {
        // Warm synchronously
        return await this.warmSynchronously(agentTypes, fullConfig, startTime);
      }
    } catch (error) {
      this.currentProgress.status = WarmingStatus.FAILED;
      this.currentProgress.errors.push({
        agentType: 'system',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.notifyProgress();
      this.warming = false;
      throw error;
    }
  }

  /**
   * Warm cache for all registered agents
   *
   * @param agents - All registered agent definitions
   * @param config - Warming configuration
   * @returns Warming progress result
   */
  async warmAllAgents(
    agents: AgentDefinition[],
    config: Partial<WarmingConfig> = {}
  ): Promise<WarmingProgress> {
    const agentTypes = agents.map(agent => agent.id);
    return await this.warmCache(agentTypes, config);
  }

  /**
   * Warm specific agent type
   *
   * @param agentType - Agent type to warm
   * @param config - Warming configuration
   * @returns Success status
   */
  async warmAgent(
    agentType: string,
    config: Partial<WarmingConfig> = {}
  ): Promise<boolean> {
    try {
      const result = await this.warmCache([agentType], config);
      return result.status === WarmingStatus.COMPLETED;
    } catch (error) {
      console.error(`[CacheWarmer] Failed to warm agent ${agentType}:`, error);
      return false;
    }
  }

  // ========================================================================
  // BACKGROUND REFRESH
  // ========================================================================

  /**
   * Start periodic background refresh
   *
   * @param agents - Agents to refresh
   * @param interval - Refresh interval in milliseconds
   */
  startBackgroundRefresh(
    agents: AgentDefinition[],
    interval: number = 60 * 60 * 1000 // 1 hour
  ): void {
    this.stopBackgroundRefresh();

    this.refreshTimer = setInterval(async () => {
      console.log('[CacheWarmer] Running background refresh...');
      try {
        await this.warmAllAgents(agents, { background: true });
        console.log('[CacheWarmer] Background refresh complete');
      } catch (error) {
        console.error('[CacheWarmer] Background refresh failed:', error);
      }
    }, interval);

    console.log(`[CacheWarmer] Started background refresh (interval: ${interval}ms)`);
  }

  /**
   * Stop background refresh
   */
  stopBackgroundRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[CacheWarmer] Stopped background refresh');
    }
  }

  // ========================================================================
  // SMART REFRESH
  // ========================================================================

  /**
   * Smart refresh (only refresh if code changes detected)
   *
   * @param agents - Agents to potentially refresh
   * @param lastModifiedTimestamp - Last known modification timestamp
   * @returns Number of agents refreshed
   */
  async smartRefresh(
    agents: AgentDefinition[],
    lastModifiedTimestamp: number
  ): Promise<number> {
    console.log('[CacheWarmer] Running smart refresh...');

    let refreshedCount = 0;

    for (const agent of agents) {
      try {
        // Check if agent has been modified since last refresh
        const hasChanges = await this.checkForChanges(agent.id, lastModifiedTimestamp);

        if (hasChanges) {
          console.log(`[CacheWarmer] Changes detected for ${agent.id}, refreshing...`);
          await this.warmAgent(agent.id);
          refreshedCount++;
        } else {
          console.log(`[CacheWarmer] No changes for ${agent.id}, skipping`);
        }
      } catch (error) {
        console.error(`[CacheWarmer] Failed to check changes for ${agent.id}:`, error);
      }
    }

    console.log(`[CacheWarmer] Smart refresh complete: ${refreshedCount} agents refreshed`);
    return refreshedCount;
  }

  // ========================================================================
  // PROGRESS TRACKING
  // ========================================================================

  /**
   * Get current warming progress
   */
  getProgress(): WarmingProgress | null {
    return this.currentProgress;
  }

  /**
   * Check if warming is in progress
   */
  isWarming(): boolean {
    return this.warming;
  }

  /**
   * Cancel current warming operation
   */
  cancelWarming(): void {
    if (this.warming) {
      this.warming = false;
      console.log('[CacheWarmer] Warming cancelled');
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Warm cache synchronously (blocks until complete)
   */
  private async warmSynchronously(
    agentTypes: string[],
    config: WarmingConfig,
    startTime: number
  ): Promise<WarmingProgress> {
    const cache = getContextCache();

    for (let i = 0; i < agentTypes.length; i++) {
      if (!this.warming) {
        // Cancelled
        break;
      }

      const agentType = agentTypes[i];
      this.currentProgress!.currentAgent = agentType;

      try {
        // Check time limit
        const elapsed = Date.now() - startTime;
        if (elapsed > config.maxWarmingTime) {
          console.warn('[CacheWarmer] Max warming time exceeded');
          break;
        }

        // Build context
        const context = await this.contextBuilder!(agentType);

        // Cache context
        await cache.cacheAgentContext(agentType, context);

        this.currentProgress!.warmedAgents++;
        this.currentProgress!.progress = Math.round(
          (this.currentProgress!.warmedAgents / this.currentProgress!.totalAgents) * 100
        );

        // Estimate time remaining
        const avgTimePerAgent = elapsed / (i + 1);
        const remainingAgents = agentTypes.length - i - 1;
        this.currentProgress!.estimatedTimeRemaining = Math.round(avgTimePerAgent * remainingAgents);

        this.notifyProgress();
      } catch (error) {
        console.error(`[CacheWarmer] Failed to warm ${agentType}:`, error);
        this.currentProgress!.errors.push({
          agentType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update final status
    if (this.currentProgress!.errors.length === 0) {
      this.currentProgress!.status = WarmingStatus.COMPLETED;
    } else if (this.currentProgress!.warmedAgents > 0) {
      this.currentProgress!.status = WarmingStatus.PARTIAL;
    } else {
      this.currentProgress!.status = WarmingStatus.FAILED;
    }

    this.currentProgress!.currentAgent = undefined;
    this.currentProgress!.estimatedTimeRemaining = 0;
    this.warming = false;

    this.notifyProgress();

    return this.currentProgress!;
  }

  /**
   * Warm cache in background (non-blocking)
   */
  private warmInBackground(
    agentTypes: string[],
    config: WarmingConfig,
    startTime: number
  ): void {
    // Use setTimeout to run in next tick (non-blocking)
    setTimeout(async () => {
      try {
        await this.warmSynchronously(agentTypes, config, startTime);
      } catch (error) {
        console.error('[CacheWarmer] Background warming failed:', error);
      }
    }, 0);
  }

  /**
   * Check for changes since last refresh
   */
  private async checkForChanges(agentType: string, lastModified: number): Promise<boolean> {
    // In a real implementation, this would check:
    // - Git history for file changes
    // - File modification timestamps
    // - Agent definition changes
    // For now, assume changes if lastModified > 1 hour ago
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return lastModified < oneHourAgo;
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(): void {
    if (this.currentProgress && this.currentProgress.status !== WarmingStatus.IDLE) {
      // In a real implementation, this would emit an event or call a callback
      console.log(`[CacheWarmer] Progress: ${this.currentProgress.progress}%`);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopBackgroundRefresh();
    this.cancelWarming();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let cacheWarmerInstance: CacheWarmer | null = null;

/**
 * Get the singleton cache warmer instance
 */
export function getCacheWarmer(): CacheWarmer {
  if (!cacheWarmerInstance) {
    cacheWarmerInstance = new CacheWarmer();
  }
  return cacheWarmerInstance;
}

/**
 * Reset the singleton cache warmer instance
 */
export function resetCacheWarmer(): void {
  if (cacheWarmerInstance) {
    cacheWarmerInstance.dispose();
  }
  cacheWarmerInstance = null;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize cache warmer with context builder
 */
export function initializeCacheWarmer(contextBuilder: ContextBuilder): void {
  const warmer = getCacheWarmer();
  warmer.initialize(contextBuilder);
}

/**
 * Warm cache for specific agents
 */
export async function warmAgentCache(
  agentTypes: string[],
  config?: Partial<WarmingConfig>
): Promise<WarmingProgress> {
  const warmer = getCacheWarmer();
  return await warmer.warmCache(agentTypes, config);
}

/**
 * Warm cache for all agents
 */
export async function warmAllAgentCaches(
  agents: AgentDefinition[],
  config?: Partial<WarmingConfig>
): Promise<WarmingProgress> {
  const warmer = getCacheWarmer();
  return await warmer.warmAllAgents(agents, config);
}

/**
 * Get warming progress
 */
export function getWarmingProgress(): WarmingProgress | null {
  const warmer = getCacheWarmer();
  return warmer.getProgress();
}

/**
 * Check if warming is in progress
 */
export function isWarmingCache(): boolean {
  const warmer = getCacheWarmer();
  return warmer.isWarming();
}

/**
 * Cancel cache warming
 */
export function cancelCacheWarming(): void {
  const warmer = getCacheWarmer();
  warmer.cancelWarming();
}

/**
 * Start background refresh
 */
export function startBackgroundRefresh(
  agents: AgentDefinition[],
  interval?: number
): void {
  const warmer = getCacheWarmer();
  warmer.startBackgroundRefresh(agents, interval);
}

/**
 * Stop background refresh
 */
export function stopBackgroundRefresh(): void {
  const warmer = getCacheWarmer();
  warmer.stopBackgroundRefresh();
}

/**
 * Smart refresh (only if changes detected)
 */
export async function smartRefreshCache(
  agents: AgentDefinition[],
  lastModified: number
): Promise<number> {
  const warmer = getCacheWarmer();
  return await warmer.smartRefresh(agents, lastModified);
}
