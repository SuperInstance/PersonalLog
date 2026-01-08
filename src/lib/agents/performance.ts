/**
 * Agent Performance Tracking System
 *
 * Comprehensive performance tracking for all agents to enable
 * data-driven agent selection for Neural MPC.
 *
 * Privacy-First Design:
 * - No user conversation content logged
 * - Only metadata (agent ID, task type, outcome)
 * - Local storage only (no server upload)
 * - User can opt-out
 * - Clear data on request
 *
 * @example
 * ```typescript
 * import { performanceTracker } from '@/lib/agents/performance';
 *
 * // Record an agent execution
 * await performanceTracker.recordAgentExecution('jepa-v1', 'analyze', {
 *   outcome: TaskOutcome.SUCCESS,
 *   duration: 1234,
 *   resources: { cpu: 0.5, memory: 1024000 }
 * });
 *
 * // Get top agents for a task
 * const topAgents = await performanceTracker.getTopAgentsForTask('analyze');
 *
 * // Get detailed stats for an agent
 * const stats = await performanceTracker.getAgentPerformance('jepa-v1');
 * ```
 */

import type {
  AgentExecutionRecord,
  AgentPerformanceStats,
  AgentRanking,
  PerformanceHistory,
  PerformanceQueryOptions,
  RankingQueryOptions,
  PrivacySettings,
  StorageStats,
} from './performance-types';
import { TaskType, TaskOutcome, ErrorType } from './performance-types';
import {
  recordExecution,
  queryExecutions,
  getAgentExecutions,
  deleteExecutions,
  deleteExecutionsBefore,
  clearAllExecutions,
  getPrivacySettings,
  updatePrivacySettings,
  getStorageStats,
  calculateAgentStats,
} from './performance-storage';
import { StorageError, ValidationError } from '@/lib/errors';

// ============================================================================
// PERFORMANCE TRACKER CLASS
// ============================================================================

/**
 * Agent performance tracker
 *
 * Main interface for tracking and querying agent performance metrics.
 */
export class PerformanceTracker {
  private enabled: boolean = true;

  constructor() {
    this.initializeFromPrivacySettings();
  }

  /**
   * Initialize from privacy settings
   */
  private async initializeFromPrivacySettings(): Promise<void> {
    try {
      const privacy = await getPrivacySettings();
      this.enabled = privacy.enabled;
    } catch (error) {
      console.warn('Failed to load privacy settings, using defaults', error);
      this.enabled = true;
    }
  }

  // ========================================================================
  // RECORDING
  // ========================================================================

  /**
   * Record an agent execution
   *
   * @param agentId - Agent ID that performed the task
   * @param taskType - Type of task performed
   * @param execution - Execution details
   * @returns Promise resolving to execution record ID
   *
   * @example
   * ```typescript
   * const recordId = await performanceTracker.recordAgentExecution(
   *   'jepa-v1',
   *   TaskType.ANALYZE,
   *   {
   *     outcome: TaskOutcome.SUCCESS,
   *     duration: 1234,
   *     resources: { cpu: 0.5, memory: 1024000 },
   *     conversationId: 'conv-123'
   *   }
   * );
   * ```
   */
  async recordAgentExecution(
    agentId: string,
    taskType: TaskType,
    execution: {
      outcome: TaskOutcome;
      duration: number;
      errorType?: ErrorType;
      errorMessage?: string;
      resources: {
        cpu: number;
        memory: number;
        tokens?: number;
      };
      conversationId: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    if (!this.enabled) {
      // Silently skip if tracking is disabled
      return '';
    }

    const recordId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const record: AgentExecutionRecord = {
      id: recordId,
      agentId,
      taskType,
      outcome: execution.outcome,
      timestamp: new Date().toISOString(),
      duration: execution.duration,
      errorType: execution.errorType,
      errorMessage: execution.errorMessage,
      resources: execution.resources,
      conversationId: execution.conversationId,
      metadata: execution.metadata,
    };

    await recordExecution(record);
    return recordId;
  }

  /**
   * Record user feedback for an agent execution
   *
   * @param agentId - Agent ID
   * @param taskType - Type of task
   * @param rating - User rating (1-5)
   * @param reused - Whether user reused the agent
   *
   * @example
   * ```typescript
   * await performanceTracker.recordAgentFeedback(
   *   'jepa-v1',
   *   TaskType.ANALYZE,
   *   5,
   *   true
   * );
   * ```
   */
  async recordAgentFeedback(
    agentId: string,
    taskType: TaskType,
    rating: number,
    reused: boolean = false
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Find the most recent execution for this agent/task
    const records = await queryExecutions({
      agentId,
      taskType,
      limit: 1,
      sortOrder: 'desc',
    });

    if (records.length === 0) {
      throw new ValidationError('No execution found for feedback', {
        context: { agentId, taskType },
      });
    }

    // Update the record with feedback
    const record = records[0];
    record.rating = rating;
    record.reused = reused;

    await recordExecution(record);
  }

  // ========================================================================
  // QUERYING
  // ========================================================================

  /**
   * Get performance statistics for an agent
   *
   * @param agentId - Agent ID
   * @returns Promise resolving to performance stats or null if no data
   *
   * @example
   * ```typescript
   * const stats = await performanceTracker.getAgentPerformance('jepa-v1');
   * if (stats) {
   *   console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
   *   console.log(`Average duration: ${stats.averageDuration.toFixed(0)}ms`);
   * }
   * ```
   */
  async getAgentPerformance(
    agentId: string
  ): Promise<AgentPerformanceStats | null> {
    return calculateAgentStats(agentId);
  }

  /**
   * Get detailed statistics for an agent
   *
   * Alias for getAgentPerformance for convenience.
   *
   * @param agentId - Agent ID
   * @returns Promise resolving to performance stats or null
   */
  async getAgentStats(agentId: string): Promise<AgentPerformanceStats | null> {
    return this.getAgentPerformance(agentId);
  }

  /**
   * Get top-ranked agents for a specific task
   *
   * Agents are ranked by a composite score considering:
   * - Success rate (how often they succeed)
   * - Speed (how fast they complete tasks)
   * - User satisfaction (ratings and reuse rate)
   *
   * @param taskType - Type of task to rank agents for
   * @param options - Ranking options
   * @returns Promise resolving to ranked agent list
   *
   * @example
   * ```typescript
   * // Get top 5 agents for analysis tasks
   * const topAgents = await performanceTracker.getTopAgentsForTask(
   *   TaskType.ANALYZE,
   *   { limit: 5, minSampleSize: 10 }
   * );
   *
   * topAgents.forEach((agent) => {
   *   console.log(`#${agent.rank}: ${agent.agentId} (score: ${agent.score.toFixed(2)})`);
   * });
   * ```
   */
  async getTopAgentsForTask(
    taskType: TaskType,
    options: Partial<RankingQueryOptions> = {}
  ): Promise<AgentRanking[]> {
    const opts: RankingQueryOptions = {
      taskType,
      minSampleSize: options.minSampleSize ?? 5,
      limit: options.limit ?? 10,
      successWeight: options.successWeight ?? 0.5,
      speedWeight: options.speedWeight ?? 0.2,
      satisfactionWeight: options.satisfactionWeight ?? 0.3,
    };

    // Normalize weights (all guaranteed non-null after ?? operators)
    const totalWeight =
      (opts.successWeight ?? 0.5) +
      (opts.speedWeight ?? 0.2) +
      (opts.satisfactionWeight ?? 0.3);
    const normalizedWeights = {
      success: (opts.successWeight ?? 0.5) / totalWeight,
      speed: (opts.speedWeight ?? 0.2) / totalWeight,
      satisfaction: (opts.satisfactionWeight ?? 0.3) / totalWeight,
    };

    // Get all records for this task type
    const records = await queryExecutions({ taskType });

    // Group by agent
    const agentRecords = new Map<string, AgentExecutionRecord[]>();
    records.forEach((record) => {
      if (!agentRecords.has(record.agentId)) {
        agentRecords.set(record.agentId, []);
      }
      agentRecords.get(record.agentId)!.push(record);
    });

    // Calculate scores for each agent
    const rankings: AgentRanking[] = [];

    for (const [agentId, agentRecordList] of agentRecords.entries()) {
      // Skip if below minimum sample size
      if (agentRecordList.length < opts.minSampleSize!) {
        continue;
      }

      const stats = await this.calculateQuickStats(agentRecordList);

      // Calculate individual scores (0-1)
      const successScore = stats.successRate;
      const speedScore = this.normalizeSpeed(stats.averageDuration);
      const satisfactionScore = stats.satisfactionRate;

      // Calculate composite score
      const score =
        successScore * normalizedWeights.success +
        speedScore * normalizedWeights.speed +
        satisfactionScore * normalizedWeights.satisfaction;

      // Calculate confidence (based on sample size)
      const confidence = Math.min(
        agentRecordList.length / (opts.minSampleSize! * 2),
        1
      );

      rankings.push({
        agentId,
        rank: 0, // Will be set after sorting
        score,
        successRate: stats.successRate,
        speedScore,
        satisfactionScore,
        confidence,
        sampleSize: agentRecordList.length,
      });
    }

    // Sort by score (descending)
    rankings.sort((a, b) => b.score - a.score);

    // Assign ranks
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    // Apply limit
    return rankings.slice(0, opts.limit);
  }

  /**
   * Get performance history for an agent
   *
   * @param agentId - Agent ID
   * @param window - Time window (day, week, month)
   * @returns Promise resolving to performance history
   *
   * @example
   * ```typescript
   * const history = await performanceTracker.getPerformanceHistory(
   *   'jepa-v1',
   *   'week'
   * );
   *
   * history.history.forEach((point) => {
   *   console.log(`${point.timestamp}: ${point.successRate.toFixed(2)} success rate`);
   * });
   * ```
   */
  async getPerformanceHistory(
    agentId: string,
    window: 'day' | 'week' | 'month' = 'week'
  ): Promise<PerformanceHistory | null> {
    const now = new Date();
    let startTime: Date;
    let bucketSize: number; // in milliseconds

    switch (window) {
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        bucketSize = 60 * 60 * 1000; // 1 hour
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        bucketSize = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        bucketSize = 24 * 60 * 60 * 1000; // 1 day
        break;
    }

    const records = await queryExecutions({
      agentId,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
    });

    if (records.length === 0) {
      return null;
    }

    // Group records into time buckets
    const buckets = new Map<number, AgentExecutionRecord[]>();

    records.forEach((record) => {
      const timestamp = new Date(record.timestamp).getTime();
      const bucketStart = Math.floor(timestamp / bucketSize) * bucketSize;

      if (!buckets.has(bucketStart)) {
        buckets.set(bucketStart, []);
      }
      buckets.get(bucketStart)!.push(record);
    });

    // Calculate stats for each bucket
    const historyPoints: PerformanceHistory['history'] = [];

    for (const [bucketStart, bucketRecords] of buckets.entries()) {
      const stats = await this.calculateQuickStats(bucketRecords);

      historyPoints.push({
        timestamp: new Date(bucketStart).toISOString(),
        successRate: stats.successRate,
        averageDuration: stats.averageDuration,
        executionCount: bucketRecords.length,
      });
    }

    // Sort by timestamp
    historyPoints.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      agentId,
      history: historyPoints,
      window,
    };
  }

  /**
   * Query execution records
   *
   * @param options - Query options
   * @returns Promise resolving to matching records
   */
  async queryRecords(options: PerformanceQueryOptions): Promise<AgentExecutionRecord[]> {
    return queryExecutions(options);
  }

  // ========================================================================
  // PRIVACY & STORAGE
  // ========================================================================

  /**
   * Get privacy settings
   *
   * @returns Promise resolving to privacy settings
   */
  async getPrivacySettings(): Promise<PrivacySettings> {
    return getPrivacySettings();
  }

  /**
   * Update privacy settings
   *
   * @param settings - Partial settings to update
   * @returns Promise resolving to updated settings
   */
  async updatePrivacySettings(
    settings: Partial<PrivacySettings>
  ): Promise<PrivacySettings> {
    const updated = await updatePrivacySettings(settings);
    this.enabled = updated.enabled;
    return updated;
  }

  /**
   * Get storage statistics
   *
   * @returns Promise resolving to storage stats
   */
  async getStorageStats(): Promise<StorageStats> {
    return getStorageStats();
  }

  /**
   * Clear all performance data
   *
   * WARNING: This is a destructive operation!
   *
   * @returns Promise that resolves when all data is cleared
   */
  async clearAllData(): Promise<void> {
    await clearAllExecutions();
  }

  /**
   * Apply retention policy (delete old data)
   *
   * @param retentionDays - Number of days to retain (0 = keep forever)
   * @returns Promise resolving to number of deleted records
   */
  async applyRetentionPolicy(retentionDays: number): Promise<number> {
    if (retentionDays === 0) {
      return 0; // Keep forever
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return deleteExecutionsBefore(cutoffDate.toISOString());
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Calculate quick statistics from a list of records
   *
   * @param records - Execution records
   * @returns Quick statistics
   */
  private async calculateQuickStats(records: AgentExecutionRecord[]): Promise<{
    successRate: number;
    averageDuration: number;
    satisfactionRate: number;
  }> {
    if (records.length === 0) {
      return { successRate: 0, averageDuration: 0, satisfactionRate: 0 };
    }

    const successCount = records.filter((r) => r.outcome === TaskOutcome.SUCCESS).length;
    const successRate = successCount / records.length;

    const averageDuration =
      records.reduce((sum, r) => sum + r.duration, 0) / records.length;

    // Calculate satisfaction rate (ratings + reuse)
    const ratings = records.filter((r) => r.rating !== undefined).map((r) => r.rating!);
    const reused = records.filter((r) => r.reused).length;
    const averageRating =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length / 5 : 0;
    const reuseRate = reused / records.length;
    const satisfactionRate = (averageRating + reuseRate) / 2;

    return { successRate, averageDuration, satisfactionRate };
  }

  /**
   * Normalize duration to a speed score (0-1)
   *
   * Faster is better. Use exponential decay.
   *
   * @param duration - Duration in milliseconds
   * @returns Speed score (0-1)
   */
  private normalizeSpeed(duration: number): number {
    // Define "fast" as < 1 second, "slow" as > 30 seconds
    const FAST_THRESHOLD = 1000;
    const SLOW_THRESHOLD = 30000;

    if (duration <= FAST_THRESHOLD) {
      return 1.0;
    }

    if (duration >= SLOW_THRESHOLD) {
      return 0.0;
    }

    // Linear interpolation between fast and slow
    return 1 - (duration - FAST_THRESHOLD) / (SLOW_THRESHOLD - FAST_THRESHOLD);
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

/**
 * Global performance tracker instance
 */
export const performanceTracker = new PerformanceTracker();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Record agent execution (convenience function)
 *
 * @param agentId - Agent ID
 * @param taskType - Task type
 * @param execution - Execution details
 * @returns Promise resolving to record ID
 */
export async function recordAgentExecution(
  agentId: string,
  taskType: TaskType,
  execution: {
    outcome: TaskOutcome;
    duration: number;
    errorType?: ErrorType;
    errorMessage?: string;
    resources: {
      cpu: number;
      memory: number;
      tokens?: number;
    };
    conversationId: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  return performanceTracker.recordAgentExecution(agentId, taskType, execution);
}

/**
 * Record agent feedback (convenience function)
 *
 * @param agentId - Agent ID
 * @param taskType - Task type
 * @param rating - Rating (1-5)
 * @param reused - Whether user reused the agent
 */
export async function recordAgentFeedback(
  agentId: string,
  taskType: TaskType,
  rating: number,
  reused: boolean = false
): Promise<void> {
  return performanceTracker.recordAgentFeedback(agentId, taskType, rating, reused);
}

/**
 * Get agent performance (convenience function)
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to performance stats
 */
export async function getAgentPerformance(
  agentId: string
): Promise<AgentPerformanceStats | null> {
  return performanceTracker.getAgentPerformance(agentId);
}

/**
 * Get top agents for task (convenience function)
 *
 * @param taskType - Task type
 * @param options - Ranking options
 * @returns Promise resolving to ranked agents
 */
export async function getTopAgentsForTask(
  taskType: TaskType,
  options?: Partial<RankingQueryOptions>
): Promise<AgentRanking[]> {
  return performanceTracker.getTopAgentsForTask(taskType, options);
}

/**
 * Get performance history (convenience function)
 *
 * @param agentId - Agent ID
 * @param window - Time window
 * @returns Promise resolving to performance history
 */
export async function getPerformanceHistory(
  agentId: string,
  window?: 'day' | 'week' | 'month'
): Promise<PerformanceHistory | null> {
  return performanceTracker.getPerformanceHistory(agentId, window);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  AgentExecutionRecord,
  AgentPerformanceStats,
  AgentRanking,
  PerformanceHistory,
  PerformanceQueryOptions,
  RankingQueryOptions,
  PrivacySettings,
  StorageStats,
} from './performance-types';

// Export enums as values
export { TaskType, TaskOutcome, ErrorType } from './performance-types';
