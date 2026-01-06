/**
 * DAG Execution Engine
 *
 * Executes DAG-based task plans with optimal parallelization.
 * Tracks task status, handles failures, and manages retries.
 */

import {
  DAGGraph,
  DAGNode,
  DAGExecutionState,
  DAGExecutionPlan,
  DAGNodeStatus,
  createExecutionPlan,
  validateDAG
} from '../spreader/dag';
import { createConversation, addMessage } from '@/lib/storage/conversation-store';

// ============================================================================
// EXECUTOR CONFIGURATION
// ============================================================================

export interface DAGExecutorConfig {
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  maxParallelTasks?: number;
  onProgress?: (progress: DAGExecutionProgress) => void;
  onTaskComplete?: (taskId: string, result: unknown) => void;
  onTaskFailed?: (taskId: string, error: Error) => void;
}

export interface DAGExecutionProgress {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  percentage: number;
  currentRound: number;
  totalRounds: number;
}

export interface DAGExecutionResult {
  success: boolean;
  results: Map<string, unknown>;
  errors: Map<string, Error>;
  executionTime: number; // milliseconds
  completedTasks: string[];
  failedTasks: string[];
}

// ============================================================================
// TASK EXECUTOR INTERFACE
// ============================================================================

/**
 * Interface for executing individual tasks.
 * Implement this to provide custom task execution logic.
 */
export interface TaskExecutor {
  execute(task: DAGNode, conversationId: string): Promise<unknown>;
}

/**
 * Default task executor that creates a conversation and sends the task as a message.
 */
export class DefaultTaskExecutor implements TaskExecutor {
  async execute(task: DAGNode, conversationId: string): Promise<unknown> {
    // Send task message to conversation
    const prompt = `Task: ${task.task}\n\n` +
      `Please complete this task. When done, provide a summary of your work.`;

    await addMessage(
      conversationId,
      'text',
      { type: 'system', reason: 'dag-task-execution' },
      { text: prompt }
    );

    return {
      conversationId,
      taskId: task.id,
      status: 'submitted'
    };
  }
}

// ============================================================================
// DAG EXECUTOR
// ============================================================================

export class DAGExecutor {
  private state: Map<string, DAGExecutionState> = new Map();
  private config: Required<DAGExecutorConfig>;
  private taskExecutor: TaskExecutor;
  private parentId: string;
  private startTime: number = 0;
  private abortController: AbortController | null = null;

  constructor(
    parentId: string,
    config: DAGExecutorConfig = {},
    taskExecutor?: TaskExecutor
  ) {
    this.parentId = parentId;
    this.taskExecutor = taskExecutor || new DefaultTaskExecutor();

    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      maxParallelTasks: config.maxParallelTasks ?? 5,
      onProgress: config.onProgress ?? (() => {}),
      onTaskComplete: config.onTaskComplete ?? (() => {}),
      onTaskFailed: config.onTaskFailed ?? (() => {})
    };
  }

  /**
   * Executes a DAG with optimal parallelization.
   */
  async execute(dag: DAGGraph): Promise<DAGExecutionResult> {
    this.startTime = Date.now();
    this.abortController = new AbortController();

    // Validate DAG
    const validation = validateDAG(dag);
    if (!validation.isValid) {
      throw new Error(
        `Invalid DAG: ${validation.errors.join('; ')}`
      );
    }

    // Create execution plan
    const plan = createExecutionPlan(dag);

    // Initialize state
    for (const [id] of dag.nodes) {
      this.state.set(id, {
        status: 'pending',
        retries: 0
      });
    }

    const results = new Map<string, unknown>();
    const errors = new Map<string, Error>();

    try {
      // Execute round by round
      for (const round of plan.rounds) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          throw new Error('Execution aborted');
        }

        // Update progress
        this.updateProgress(plan, round.round);

        // Execute tasks in this round (with parallelism limit)
        await this.executeRound(dag, round, results, errors);
      }

      // Final progress update
      this.updateProgress(plan, plan.rounds.length);

      const completedTasks = Array.from(this.state.entries())
        .filter(([_, s]) => s.status === 'complete')
        .map(([id]) => id);

      const failedTasks = Array.from(this.state.entries())
        .filter(([_, s]) => s.status === 'failed')
        .map(([id]) => id);

      return {
        success: failedTasks.length === 0,
        results,
        errors,
        executionTime: Date.now() - this.startTime,
        completedTasks,
        failedTasks
      };

    } catch (error) {
      // If aborted, return partial results
      if (this.abortController.signal.aborted) {
        const completedTasks = Array.from(this.state.entries())
          .filter(([_, s]) => s.status === 'complete')
          .map(([id]) => id);

        const failedTasks = Array.from(this.state.entries())
          .filter(([_, s]) => s.status !== 'complete')
          .map(([id]) => id);

        return {
          success: false,
          results,
          errors,
          executionTime: Date.now() - this.startTime,
          completedTasks,
          failedTasks
        };
      }

      throw error;
    }
  }

  /**
   * Executes a single round of tasks.
   */
  private async executeRound(
    dag: DAGGraph,
    round: { round: number; parallelTasks: string[] },
    results: Map<string, unknown>,
    errors: Map<string, Error>
  ): Promise<void> {
    const { parallelTasks } = round;

    // Process tasks in batches to limit parallelism
    const batchSize = this.config.maxParallelTasks;

    for (let i = 0; i < parallelTasks.length; i += batchSize) {
      const batch = parallelTasks.slice(i, i + batchSize);

      // Execute batch in parallel
      const batchPromises = batch.map(taskId =>
        this.executeTask(dag, taskId)
          .then(result => {
            results.set(taskId, result);
            this.config.onTaskComplete(taskId, result);
            return { taskId, result, success: true };
          })
          .catch(error => {
            errors.set(taskId, error);
            this.config.onTaskFailed(taskId, error);
            return { taskId, error, success: false };
          })
      );

      const batchResults = await Promise.all(batchPromises);

      // Check if we should continue (no failures that block next round)
      const failures = batchResults.filter(r => !r.success);
      if (failures.length > 0) {
        console.warn(`Round ${round.round}: ${failures.length} tasks failed`);

        // Retry failed tasks
        for (const failure of failures) {
          const taskState = this.state.get(failure.taskId);
          if (taskState && taskState.retries < this.config.maxRetries) {
            console.log(`Retrying task ${failure.taskId} (attempt ${taskState.retries + 1})`);
            await this.sleep(this.config.retryDelay);
            await this.retryTask(dag, failure.taskId, results, errors);
          }
        }
      }
    }
  }

  /**
   * Executes a single task.
   */
  private async executeTask(
    dag: DAGGraph,
    taskId: string
  ): Promise<unknown> {
    const node = dag.nodes.get(taskId);
    if (!node) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update state
    this.state.set(taskId, {
      status: 'running',
      startTime: Date.now(),
      retries: this.state.get(taskId)?.retries || 0
    });

    try {
      // Create child conversation for this task
      const childConversation = await this.createChildConversation(node);

      // Execute task
      const result = await this.taskExecutor.execute(node, childConversation);

      // Update state
      this.state.set(taskId, {
        status: 'complete',
        endTime: Date.now(),
        result,
        retries: this.state.get(taskId)?.retries || 0
      });

      return result;

    } catch (error) {
      // Update state
      this.state.set(taskId, {
        status: 'failed',
        endTime: Date.now(),
        error: error as Error,
        retries: this.state.get(taskId)?.retries || 0
      });

      throw error;
    }
  }

  /**
   * Retries a failed task.
   */
  private async retryTask(
    dag: DAGGraph,
    taskId: string,
    results: Map<string, unknown>,
    errors: Map<string, Error>
  ): Promise<void> {
    const taskState = this.state.get(taskId);
    if (!taskState) return;

    // Increment retry count
    taskState.retries++;

    try {
      const result = await this.executeTask(dag, taskId);
      results.set(taskId, result);
      errors.delete(taskId);
    } catch (error) {
      // Already updated in executeTask
      console.error(`Retry ${taskState.retries} failed for task ${taskId}:`, error);
    }
  }

  /**
   * Creates a child conversation for a task.
   */
  private async createChildConversation(node: DAGNode): Promise<string> {
    const title = `📋 ${node.task}`;

    const conversation = await createConversation(title, 'ai-assisted');

    // Add initial context message
    const contextMessage = `You're working on task: ${node.task}\n\n` +
      `This is a parallel task from a DAG execution plan.\n` +
      `Task ID: ${node.id}\n` +
      `Priority: ${node.priority || 'normal'}\n` +
      `Estimated duration: ${node.estimatedDuration || 'unknown'}s\n\n` +
      `Please complete this task and provide a summary when done.`;

    await addMessage(
      conversation.id,
      'text',
      { type: 'system', reason: 'dag-task' },
      { text: contextMessage }
    );

    return conversation.id;
  }

  /**
   * Updates execution progress.
   */
  private updateProgress(plan: DAGExecutionPlan, currentRound: number): void {
    const totalTasks = this.state.size;
    const completedTasks = Array.from(this.state.values())
      .filter(s => s.status === 'complete').length;
    const failedTasks = Array.from(this.state.values())
      .filter(s => s.status === 'failed').length;
    const runningTasks = Array.from(this.state.values())
      .filter(s => s.status === 'running').length;

    const percentage = totalTasks > 0
      ? ((completedTasks + failedTasks) / totalTasks) * 100
      : 0;

    this.config.onProgress({
      totalTasks,
      completedTasks,
      failedTasks,
      runningTasks,
      percentage,
      currentRound,
      totalRounds: plan.rounds.length
    });
  }

  /**
   * Aborts the execution.
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Gets the current execution state.
   */
  getExecutionState(): Map<string, DAGExecutionState> {
    return new Map(this.state);
  }

  /**
   * Gets the status of a specific task.
   */
  getTaskStatus(taskId: string): DAGNodeStatus | undefined {
    return this.state.get(taskId)?.status;
  }

  /**
   * Utility: Sleep for specified milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// EXECUTOR FACTORY
// ============================================================================

/**
 * Creates a DAG executor with default configuration.
 */
export function createDAGExecutor(
  parentId: string,
  config?: DAGExecutorConfig,
  taskExecutor?: TaskExecutor
): DAGExecutor {
  return new DAGExecutor(parentId, config, taskExecutor);
}

// ============================================================================
// EXECUTION HELPERS
// ============================================================================

/**
 * Executes a DAG and returns the results.
 * Convenience function that creates an executor and runs it.
 */
export async function executeDAG(
  dag: DAGGraph,
  parentId: string,
  config?: DAGExecutorConfig
): Promise<DAGExecutionResult> {
  const executor = new DAGExecutor(parentId, config);
  return executor.execute(dag);
}

/**
 * Executes a DAG with progress tracking callbacks.
 */
export async function executeDAGWithProgress(
  dag: DAGGraph,
  parentId: string,
  onProgress: (progress: DAGExecutionProgress) => void,
  config?: Omit<DAGExecutorConfig, 'onProgress'>
): Promise<DAGExecutionResult> {
  const executor = new DAGExecutor(parentId, {
    ...config,
    onProgress
  });
  return executor.execute(dag);
}
