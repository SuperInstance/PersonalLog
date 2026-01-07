/**
 * DAG Auto-Merge Integration
 *
 * Integrates AutoMergeOrchestrator with DAGExecutor to automatically
 * merge child task results when all tasks complete.
 */

import { Conversation } from '@/types/conversation';
import {
  DAGExecutor,
  DAGExecutorConfig,
  DAGExecutionResult,
  DAGExecutionProgress,
  TaskExecutor,
} from './dag-executor';
import type { DAGGraph } from './dag';
import {
  AutoMergeOrchestrator,
  AutoMergeConfig,
  MergeProgress,
  MergeStrategy,
  createAutoMergeOrchestrator,
} from './auto-merge-orchestrator';
import { SessionSchema } from '../spreader/types';
import { ChildResult } from './merge-types';
import { addMessage } from '@/lib/storage/conversation-store';

// ============================================================================
// AUTO-MERGE DAG EXECUTOR CONFIG
// ============================================================================

/**
 * Configuration for DAG executor with auto-merge
 */
export interface AutoMergeDAGExecutorConfig extends DAGExecutorConfig {
  /** Auto-merge configuration */
  autoMerge?: Partial<AutoMergeConfig>;

  /** Parent conversation (for merging results) */
  parentConversation?: Conversation;

  /** Parent schema (for merging) */
  parentSchema?: Partial<SessionSchema>;

  /** Callback when merge completes */
  onMergeComplete?: (result: {
    mergedSchema: Partial<SessionSchema>;
    progress: MergeProgress;
  }) => void;

  /** Callback when merge fails */
  onMergeFailed?: (error: Error) => void;
}

// ============================================================================
// AUTO-MERGE TASK EXECUTOR
// ============================================================================

/**
 * Task executor that creates child conversations and tracks results for merging
 */
export class AutoMergeTaskExecutor implements TaskExecutor {
  private parentConversation: Conversation;

  constructor(parentConversation: Conversation) {
    this.parentConversation = parentConversation;
  }

  async execute(task: any, conversationId: string): Promise<unknown> {
    // Create a rich result that includes conversation context
    const taskName = task.name || task.task || task.command || 'Unknown Task';
    const prompt = `Task: ${taskName}\n\n` +
      `Please complete this task. When done, provide:\n` +
      `1. A summary of your work\n` +
      `2. Key decisions made\n` +
      `3. Next steps or recommendations\n` +
      `4. Any technical specifications\n\n` +
      `Task ID: ${task.id}\n` +
      `Priority: ${task.priority || 'normal'}`;

    await addMessage(
      conversationId,
      'text',
      { type: 'system', reason: 'dag-task-execution' },
      { text: prompt }
    );

    return {
      conversationId,
      taskId: task.id,
      task: taskName,
      status: 'submitted',
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// AUTO-MERGE DAG EXECUTOR
// ============================================================================

/**
 * DAG executor with automatic result merging
 * Wraps a standard DAGExecutor and adds auto-merge functionality
 */
export class AutoMergeDAGExecutor {
  private executor: DAGExecutor;
  private autoMergeOrchestrator: AutoMergeOrchestrator | null = null;
  private mergeConfig: AutoMergeConfig;
  private parentConversation?: Conversation;
  private parentSchema?: Partial<SessionSchema>;
  private onMergeComplete?: (result: {
    mergedSchema: Partial<SessionSchema>;
    progress: MergeProgress;
  }) => void;
  private onMergeFailed?: (error: Error) => void;
  private childConversations: Map<string, string> = new Map(); // taskId -> conversationId

  constructor(
    parentId: string,
    config: AutoMergeDAGExecutorConfig = {},
    taskExecutor?: TaskExecutor
  ) {
    this.executor = new DAGExecutor(parentId, config, taskExecutor);

    this.parentConversation = config.parentConversation;
    this.parentSchema = config.parentSchema;
    this.onMergeComplete = config.onMergeComplete;
    this.onMergeFailed = config.onMergeFailed;

    this.mergeConfig = {
      enabled: config.autoMerge?.enabled ?? true,
      strategy: config.autoMerge?.strategy ?? MergeStrategy.MERGE,
      autoMergeOnComplete: config.autoMerge?.autoMergeOnComplete ?? true,
      waitForAllChildren: config.autoMerge?.waitForAllChildren ?? true,
      maxWaitTime: config.autoMerge?.maxWaitTime ?? 300000,
      notifyProgress: config.autoMerge?.notifyProgress ?? true,
      showConflicts: config.autoMerge?.showConflicts ?? true,
      customMergeFn: config.autoMerge?.customMergeFn,
    };
  }

  /**
   * Execute DAG with auto-merge
   */
  async execute(dag: DAGGraph): Promise<DAGExecutionResult> {
    // Initialize auto-merge orchestrator if parent conversation provided
    if (this.parentConversation && this.parentSchema && this.mergeConfig.enabled) {
      this.autoMergeOrchestrator = new AutoMergeOrchestrator(
        this.parentConversation,
        this.parentSchema,
        this.mergeConfig
      );

      // Register all tasks
      for (const node of dag.getAllNodes()) {
        this.autoMergeOrchestrator.registerChild(node.id, '');
      }

      // Set up progress callback to notify user
      if (this.mergeConfig.notifyProgress) {
        this.autoMergeOrchestrator.onProgress((progress) => {
          this.notifyMergeProgress(progress);
        });
      }

      // Wrap task completion callback to update orchestrator
      const originalOnTaskComplete = this.executor.getExecutionState();
      this.executor = new DAGExecutor(this.parentConversation.id, {
        ...this.executor,
        onTaskComplete: async (taskId, result) => {
          // Update orchestrator with child result
          if (this.autoMergeOrchestrator) {
            const childResult: ChildResult = {
              taskId,
              conversationId: this.childConversations.get(taskId) || '',
              summary: `Completed task: ${taskId}`,
              schema: {
                completed: [taskId],
                next: [],
                decisions: {},
              },
              content: [],
              timestamp: Date.now(),
            };

            this.autoMergeOrchestrator.updateChildStatus(
              taskId,
              'complete',
              childResult
            );
          }
        },
      });
    }

    // Execute DAG
    const result = await this.executor.execute(dag);

    return result;
  }

  /**
   * Notify user of merge progress
   */
  private async notifyMergeProgress(progress: MergeProgress): Promise<void> {
    if (!this.parentConversation) return;

    const { addMessage } = await import('@/lib/storage/conversation-store');

    let message = `🔄 **Auto-Merge Progress**\n\n`;
    message += `Progress: ${progress.completedChildren}/${progress.totalChildren} tasks complete\n`;
    message += `Status: ${progress.status}\n`;
    message += `Strategy: ${progress.strategy}\n`;

    if (progress.conflictsDetected > 0) {
      message += `Conflicts: ${progress.conflictsDetected} detected, ${progress.conflictsResolved} resolved\n`;
    }

    if (progress.requiresUserInput) {
      message += `\n⚠️ **User input required** - Some conflicts need manual resolution\n`;
    }

    if (progress.status === 'complete') {
      message = `✅ **Auto-Merge Complete**\n\n`;
      message += `All ${progress.totalChildren} tasks have been merged successfully.\n`;
      message += `Conflicts resolved: ${progress.conflictsResolved}\n`;

      // Notify callback
      if (this.onMergeComplete && this.autoMergeOrchestrator) {
        this.onMergeComplete({
          mergedSchema: this.autoMergeOrchestrator.getMergedSchema(),
          progress,
        });
      }
    } else if (progress.status === 'failed') {
      message = `❌ **Auto-Merge Failed**\n\n`;
      message += `Error: ${progress.error}\n`;

      // Notify callback
      if (this.onMergeFailed) {
        this.onMergeFailed(new Error(progress.error || 'Unknown error'));
      }
    }

    await addMessage(
      this.parentConversation.id,
      'text',
      { type: 'ai-contact', contactId: 'spreader-v1', contactName: 'Auto-Merge Agent' },
      { text: message }
    );
  }

  /**
   * Get the auto-merge orchestrator
   */
  getAutoMergeOrchestrator(): AutoMergeOrchestrator | null {
    return this.autoMergeOrchestrator;
  }

  /**
   * Get the merged schema
   */
  getMergedSchema(): Partial<SessionSchema> | null {
    return this.autoMergeOrchestrator?.getMergedSchema() || null;
  }

  /**
   * Get child conversations
   */
  getChildConversations(): Map<string, string> {
    return new Map(this.childConversations);
  }

  /**
   * Get the underlying executor
   */
  getExecutor(): DAGExecutor {
    return this.executor;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a DAG executor with auto-merge
 */
export function createAutoMergeDAGExecutor(
  parentId: string,
  config?: AutoMergeDAGExecutorConfig
): AutoMergeDAGExecutor {
  return new AutoMergeDAGExecutor(parentId, config);
}

/**
 * Execute a DAG with auto-merge
 */
export async function executeDAGWithAutoMerge(
  dag: DAGGraph,
  parentConversation: Conversation,
  parentSchema: Partial<SessionSchema>,
  config?: Omit<AutoMergeDAGExecutorConfig, 'parentConversation' | 'parentSchema'>
): Promise<{
  executionResult: DAGExecutionResult;
  mergedSchema?: Partial<SessionSchema>;
}> {
  const executor = new AutoMergeDAGExecutor(parentConversation.id, {
    ...config,
    parentConversation,
    parentSchema,
  });

  const executionResult = await executor.execute(dag);
  const mergedSchema = executor.getMergedSchema();

  return {
    executionResult,
    mergedSchema: mergedSchema || undefined,
  };
}
