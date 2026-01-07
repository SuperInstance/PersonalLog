/**
 * Auto-Merge Orchestrator
 *
 * Automatically merges child task results when all children complete.
 * Listens to DAG execution events and triggers appropriate merge strategies.
 */

import { Conversation } from '@/types/conversation';
import { SessionSchema } from '../spreader/types';
import {
  ChildResult,
  MergeConflict,
  MergeOptions,
  MergeResult,
  ConflictResolution,
} from './merge-types';
import { autoMergeEngine } from './auto-merge';
import { conflictDetector } from './conflict-detection';
import { mergeStrategyRegistry } from './merge-strategies';

// ============================================================================
// MERGE STRATEGY ENUMERATION
// ============================================================================

/**
 * Available merge strategies for automatic result merging
 */
export enum MergeStrategy {
  /** Append arrays/lists together */
  CONCAT = 'concat',

  /** Deep merge objects/maps */
  MERGE = 'merge',

  /** Majority vote on conflicts */
  VOTE = 'vote',

  /** First/primary task wins */
  PRIORITY = 'priority',

  /** User-defined custom merge function */
  CUSTOM = 'custom',
}

// ============================================================================
// AUTO-MERGE CONFIGURATION
// ============================================================================

/**
 * Configuration for auto-merge behavior
 */
export interface AutoMergeConfig {
  /** Enable/disable automatic merging */
  enabled: boolean;

  /** Strategy to use for merging */
  strategy: MergeStrategy;

  /** Merge automatically when all children complete */
  autoMergeOnComplete: boolean;

  /** Wait for all children before merging (vs incremental merging) */
  waitForAllChildren: boolean;

  /** Maximum time to wait for children (ms) before partial merge */
  maxWaitTime: number;

  /** Whether to notify user of merge progress */
  notifyProgress: boolean;

  /** Whether to show conflicts in UI */
  showConflicts: boolean;

  /** Custom merge function (for CUSTOM strategy) */
  customMergeFn?: (results: ChildResult[]) => Promise<Partial<SessionSchema>>;
}

/**
 * Default auto-merge configuration
 */
export const DEFAULT_AUTO_MERGE_CONFIG: AutoMergeConfig = {
  enabled: true,
  strategy: MergeStrategy.MERGE,
  autoMergeOnComplete: true,
  waitForAllChildren: true,
  maxWaitTime: 300000, // 5 minutes
  notifyProgress: true,
  showConflicts: true,
};

// ============================================================================
// MERGE PROGRESS TRACKING
// ============================================================================

/**
 * Progress information for auto-merge operation
 */
export interface MergeProgress {
  /** Total number of child tasks */
  totalChildren: number;

  /** Number of children completed */
  completedChildren: number;

  /** Number of children failed */
  failedChildren: number;

  /** Current merge status */
  status: 'pending' | 'merging' | 'complete' | 'failed';

  /** Current merge strategy being used */
  strategy: MergeStrategy;

  /** Number of conflicts detected */
  conflictsDetected: number;

  /** Number of conflicts resolved */
  conflictsResolved: number;

  /** Whether user input is required */
  requiresUserInput: boolean;

  /** Merge completion percentage (0-100) */
  percentage: number;

  /** Error message if merge failed */
  error?: string;
}

// ============================================================================
// CHILD RESULT TRACKING
// ============================================================================

/**
 * Tracks the results of child conversations
 */
interface ChildResultTracker {
  /** Child conversation ID */
  conversationId: string;

  /** Task ID */
  taskId: string;

  /** Status of the child task */
  status: 'pending' | 'running' | 'complete' | 'failed';

  /** Result from child (if complete) */
  result?: ChildResult;

  /** Error if failed */
  error?: Error;

  /** Timestamp when completed */
  completedAt?: number;
}

// ============================================================================
// AUTO-MERGE ORCHESTRATOR
// ============================================================================

/**
 * Orchestrates automatic merging of child task results
 */
export class AutoMergeOrchestrator {
  private config: AutoMergeConfig;
  private parentConversation: Conversation;
  private parentSchema: Partial<SessionSchema>;
  private children: Map<string, ChildResultTracker> = new Map();
  private mergeProgress: MergeProgress;
  private onProgressCallback?: (progress: MergeProgress) => void;
  private startTime: number = 0;

  constructor(
    parentConversation: Conversation,
    parentSchema: Partial<SessionSchema>,
    config: Partial<AutoMergeConfig> = {}
  ) {
    this.parentConversation = parentConversation;
    this.parentSchema = parentSchema;
    this.config = { ...DEFAULT_AUTO_MERGE_CONFIG, ...config };

    this.mergeProgress = {
      totalChildren: 0,
      completedChildren: 0,
      failedChildren: 0,
      status: 'pending',
      strategy: this.config.strategy,
      conflictsDetected: 0,
      conflictsResolved: 0,
      requiresUserInput: false,
      percentage: 0,
    };
  }

  /**
   * Register a child task for tracking
   */
  registerChild(taskId: string, conversationId: string): void {
    this.children.set(taskId, {
      conversationId,
      taskId,
      status: 'pending',
    });

    this.mergeProgress.totalChildren = this.children.size;
    this.updateProgress();
  }

  /**
   * Update child task status
   */
  updateChildStatus(
    taskId: string,
    status: 'running' | 'complete' | 'failed',
    result?: ChildResult,
    error?: Error
  ): void {
    const child = this.children.get(taskId);
    if (!child) {
      console.warn(`[AutoMergeOrchestrator] Unknown task: ${taskId}`);
      return;
    }

    child.status = status;
    if (result) {
      child.result = result;
    }
    if (error) {
      child.error = error;
    }
    if (status === 'complete' || status === 'failed') {
      child.completedAt = Date.now();
    }

    // Update progress
    this.mergeProgress.completedChildren = Array.from(this.children.values()).filter(
      (c) => c.status === 'complete'
    ).length;
    this.mergeProgress.failedChildren = Array.from(this.children.values()).filter(
      (c) => c.status === 'failed'
    ).length;

    this.updateProgress();

    // Check if we should trigger auto-merge
    if (this.config.autoMergeOnComplete && this.shouldAutoMerge()) {
      this.triggerAutoMerge();
    }
  }

  /**
   * Set progress callback
   */
  onProgress(callback: (progress: MergeProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Check if all children are complete (or failed)
   */
  private allChildrenComplete(): boolean {
    return Array.from(this.children.values()).every(
      (c) => c.status === 'complete' || c.status === 'failed'
    );
  }

  /**
   * Check if we should trigger auto-merge
   */
  private shouldAutoMerge(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (this.config.waitForAllChildren) {
      return this.allChildrenComplete();
    }

    // Incremental merge: merge as children complete
    const completedCount = this.mergeProgress.completedChildren;
    return completedCount > 0 && completedCount === this.mergeProgress.totalChildren;
  }

  /**
   * Trigger automatic merge
   */
  private async triggerAutoMerge(): Promise<void> {
    if (this.mergeProgress.status === 'merging' || this.mergeProgress.status === 'complete') {
      return; // Already merging or complete
    }

    this.mergeProgress.status = 'merging';
    this.startTime = Date.now();
    this.updateProgress();

    try {
      // Collect completed child results
      const completedResults = Array.from(this.children.values())
        .filter((c) => c.status === 'complete' && c.result)
        .map((c) => c.result!);

      if (completedResults.length === 0) {
        throw new Error('No completed child results to merge');
      }

      // Detect conflicts
      const conflicts = await conflictDetector.detectConflicts(
        this.parentSchema,
        completedResults
      );

      this.mergeProgress.conflictsDetected = conflicts.length;
      this.updateProgress();

      // Apply merge strategy
      const mergedResult = await this.applyMergeStrategy(completedResults, conflicts);

      // Update parent schema
      if (mergedResult.success) {
        this.parentSchema = mergedResult.merged.schema;
        this.mergeProgress.conflictsResolved = mergedResult.conflictsResolved;
        this.mergeProgress.requiresUserInput = mergedResult.requiredUserInput;
        this.mergeProgress.status = 'complete';
      } else {
        this.mergeProgress.status = 'failed';
        this.mergeProgress.error = mergedResult.errorMessage;
      }

      this.mergeProgress.percentage = 100;
      this.updateProgress();

    } catch (error) {
      this.mergeProgress.status = 'failed';
      this.mergeProgress.error = error instanceof Error ? error.message : 'Unknown error';
      this.updateProgress();
    }
  }

  /**
   * Apply merge strategy to child results
   */
  private async applyMergeStrategy(
    results: ChildResult[],
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    switch (this.config.strategy) {
      case MergeStrategy.CONCAT:
        return this.concatStrategy(results, conflicts);

      case MergeStrategy.MERGE:
        return this.mergeStrategy(results, conflicts);

      case MergeStrategy.VOTE:
        return this.voteStrategy(results, conflicts);

      case MergeStrategy.PRIORITY:
        return this.priorityStrategy(results, conflicts);

      case MergeStrategy.CUSTOM:
        if (this.config.customMergeFn) {
          return this.customStrategy(results, conflicts);
        }
        // Fall back to MERGE if no custom function provided
        return this.mergeStrategy(results, conflicts);

      default:
        return this.mergeStrategy(results, conflicts);
    }
  }

  /**
   * CONCAT strategy: Append arrays/lists
   */
  private async concatStrategy(
    results: ChildResult[],
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    try {
      const merged: Partial<SessionSchema> = {
        project: this.parentSchema.project || results[0]?.schema.project,
        completed: [],
        next: [],
        decisions: {},
        technicalSpecs: {},
      };

      // Concatenate completed items
      for (const result of results) {
        if (result.schema.completed) {
          merged.completed = [...(merged.completed || []), ...result.schema.completed];
        }
        if (result.schema.next) {
          merged.next = [...(merged.next || []), ...result.schema.next];
        }
        if (result.schema.decisions) {
          merged.decisions = { ...merged.decisions, ...result.schema.decisions };
        }
        if (result.schema.technicalSpecs) {
          merged.technicalSpecs = {
            ...merged.technicalSpecs,
            ...result.schema.technicalSpecs,
          };
        }
      }

      // Dedupe
      merged.completed = Array.from(new Set(merged.completed));
      merged.next = Array.from(new Set(merged.next));

      return {
        success: true,
        merged: {
          schema: merged,
          content: results.flatMap((r) => r.content || []),
        },
        conflicts,
        conflictsResolved: conflicts.length,
        requiredUserInput: false,
      };
    } catch (error) {
      return {
        success: false,
        merged: { schema: {}, content: [] },
        conflicts,
        conflictsResolved: 0,
        requiredUserInput: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * MERGE strategy: Deep merge with conflict resolution
   */
  private async mergeStrategy(
    results: ChildResult[],
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    // Use existing auto-merge engine
    let mergedSchema = { ...this.parentSchema };

    for (const result of results) {
      const mergeResult = await autoMergeEngine.mergeChildResult(
        this.parentConversation,
        mergedSchema,
        result,
        { strategy: mergeStrategyRegistry.selectStrategy(conflicts) }
      );

      if (!mergeResult.success) {
        return mergeResult;
      }

      mergedSchema = mergeResult.merged.schema;
    }

    return {
      success: true,
      merged: {
        schema: mergedSchema,
        content: results.flatMap((r) => r.content || []),
      },
      conflicts,
      conflictsResolved: conflicts.length,
      requiredUserInput: false,
    };
  }

  /**
   * VOTE strategy: Majority vote on conflicts
   */
  private async voteStrategy(
    results: ChildResult[],
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    try {
      const merged: Partial<SessionSchema> = {
        project: this.parentSchema.project || results[0]?.schema.project,
        completed: [],
        next: [],
        decisions: {},
        technicalSpecs: {},
      };

      // Count occurrences of each completed item
      const completedVotes = new Map<string, number>();
      for (const result of results) {
        for (const item of result.schema.completed || []) {
          completedVotes.set(item, (completedVotes.get(item) || 0) + 1);
        }
      }

      // Keep items with majority vote
      const threshold = Math.floor(results.length / 2) + 1;
      for (const [item, count] of completedVotes.entries()) {
        if (count >= threshold) {
          merged.completed!.push(item);
        }
      }

      // Same for next items
      const nextVotes = new Map<string, number>();
      for (const result of results) {
        for (const item of result.schema.next || []) {
          nextVotes.set(item, (nextVotes.get(item) || 0) + 1);
        }
      }

      for (const [item, count] of nextVotes.entries()) {
        if (count >= threshold) {
          merged.next!.push(item);
        }
      }

      // Merge decisions (last writer wins for simple conflicts)
      for (const result of results) {
        if (result.schema.decisions) {
          merged.decisions = { ...merged.decisions, ...result.schema.decisions };
        }
      }

      // Merge technical specs (deep merge)
      for (const result of results) {
        if (result.schema.technicalSpecs) {
          merged.technicalSpecs = {
            ...merged.technicalSpecs,
            ...result.schema.technicalSpecs,
          };
        }
      }

      return {
        success: true,
        merged: {
          schema: merged,
          content: results.flatMap((r) => r.content || []),
        },
        conflicts,
        conflictsResolved: conflicts.length,
        requiredUserInput: false,
      };
    } catch (error) {
      return {
        success: false,
        merged: { schema: {}, content: [] },
        conflicts,
        conflictsResolved: 0,
        requiredUserInput: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * PRIORITY strategy: First/primary task wins
   */
  private async priorityStrategy(
    results: ChildResult[],
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    try {
      // First result wins
      const primaryResult = results[0];

      return {
        success: true,
        merged: {
          schema: {
            ...this.parentSchema,
            ...primaryResult.schema,
          },
          content: primaryResult.content || [],
        },
        conflicts,
        conflictsResolved: conflicts.length,
        requiredUserInput: false,
      };
    } catch (error) {
      return {
        success: false,
        merged: { schema: {}, content: [] },
        conflicts,
        conflictsResolved: 0,
        requiredUserInput: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * CUSTOM strategy: User-defined merge function
   */
  private async customStrategy(
    results: ChildResult[],
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    try {
      if (!this.config.customMergeFn) {
        throw new Error('Custom merge function not provided');
      }

      const mergedSchema = await this.config.customMergeFn(results);

      return {
        success: true,
        merged: {
          schema: mergedSchema,
          content: results.flatMap((r) => r.content || []),
        },
        conflicts,
        conflictsResolved: conflicts.length,
        requiredUserInput: false,
      };
    } catch (error) {
      return {
        success: false,
        merged: { schema: {}, content: [] },
        conflicts,
        conflictsResolved: 0,
        requiredUserInput: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...this.mergeProgress });
    }
  }

  /**
   * Get the current merge progress
   */
  getProgress(): MergeProgress {
    return { ...this.mergeProgress };
  }

  /**
   * Get the merged schema
   */
  getMergedSchema(): Partial<SessionSchema> {
    return this.parentSchema;
  }

  /**
   * Get child results
   */
  getChildResults(): Map<string, ChildResultTracker> {
    return new Map(this.children);
  }

  /**
   * Apply user conflict resolutions
   */
  async applyUserResolutions(resolutions: ConflictResolution[]): Promise<MergeResult> {
    // Collect completed child results
    const completedResults = Array.from(this.children.values())
      .filter((c) => c.status === 'complete' && c.result)
      .map((c) => c.result!);

    if (completedResults.length === 0) {
      throw new Error('No completed child results to merge');
    }

    // Apply resolutions using auto-merge engine
    const result = await autoMergeEngine.applyUserResolution(
      this.parentConversation,
      this.parentSchema,
      completedResults[0], // Primary result
      resolutions
    );

    if (result.success) {
      this.parentSchema = result.merged.schema;
      this.mergeProgress.conflictsResolved += resolutions.length;
      this.mergeProgress.requiresUserInput = false;
      this.updateProgress();
    }

    return result;
  }

  /**
   * Cancel auto-merge operation
   */
  cancel(): void {
    if (this.mergeProgress.status === 'merging') {
      this.mergeProgress.status = 'failed';
      this.mergeProgress.error = 'Cancelled by user';
      this.updateProgress();
    }
  }

  /**
   * Reset orchestrator state
   */
  reset(): void {
    this.children.clear();
    this.mergeProgress = {
      totalChildren: 0,
      completedChildren: 0,
      failedChildren: 0,
      status: 'pending',
      strategy: this.config.strategy,
      conflictsDetected: 0,
      conflictsResolved: 0,
      requiresUserInput: false,
      percentage: 0,
    };
    this.startTime = 0;
    this.updateProgress();
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an auto-merge orchestrator
 */
export function createAutoMergeOrchestrator(
  parentConversation: Conversation,
  parentSchema: Partial<SessionSchema>,
  config?: Partial<AutoMergeConfig>
): AutoMergeOrchestrator {
  return new AutoMergeOrchestrator(parentConversation, parentSchema, config);
}

/**
 * Smart merge strategy detection
 * Automatically selects the best strategy based on results
 */
export function detectBestStrategy(results: ChildResult[]): MergeStrategy {
  // If only one result, priority is fine
  if (results.length === 1) {
    return MergeStrategy.PRIORITY;
  }

  // If many results with potential conflicts, use vote
  if (results.length > 3) {
    return MergeStrategy.VOTE;
  }

  // Default to merge
  return MergeStrategy.MERGE;
}
