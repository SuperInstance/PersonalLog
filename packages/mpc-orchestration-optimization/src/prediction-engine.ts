/**
 * MPC Prediction Engine
 *
 * Predicts agent outcomes, resource usage, completion times, and conflicts.
 * Provides scenario simulation for what-if analysis.
 *
 * @example
 * ```typescript
 * import { predictionEngine } from '@/lib/mpc/prediction-engine';
 *
 * // Predict agent outcome
 * const outcome = await predictionEngine.predictAgentOutcome(
 *   state,
 *   agentId,
 *   taskId
 * );
 *
 * // Simulate scenario
 * const scenario = await predictionEngine.simulateScenario(
 *   state,
 *   modifications,
 *   horizon
 * );
 * ```
 */

import type {
  MPCState,
  MPCTask,
  AgentExecutionState,
  Prediction,
  AgentOutcomePrediction,
  ResourceUsagePrediction,
  ResourceConflict,
  CompletionTimePrediction,
  ScenarioSimulation,
  PlanningHorizon,
  MPCPlan,
  ResourceSnapshot,
} from './types';
import {
  ResourceType,
  TaskPriority,
  MPCStatus,
} from './types';

/**
 * Historical data for learning predictions
 */
interface HistoricalTaskData {
  taskId: string;
  agentId: string;
  estimatedDuration: number;
  actualDuration: number;
  success: boolean;
  qualityScore: number;
  resourceUsage: Map<ResourceType, number>;
  timestamp: number;
}

/**
 * Pattern learned from historical data
 */
interface LearnedPattern {
  patternId: string;
  agentId: string;
  avgDurationRatio: number; // actual / estimated
  avgQualityScore: number;
  successRate: number;
  resourceUsageProfile: Map<ResourceType, number>;
  sampleSize: number;
  lastUpdated: number;
}

/**
 * MPC Prediction Engine class
 *
 * Singleton prediction engine for multi-agent systems.
 */
export class MPCPredictionEngine {
  /** Historical task data */
  private historicalData: HistoricalTaskData[] = [];

  /** Learned patterns */
  private patterns: Map<string, LearnedPattern> = new Map();

  /** Maximum history size */
  private maxHistorySize: number = 10000;

  /** Minimum samples for reliable predictions */
  private minSamples: number = 5;

  /** Confidence decay factor */
  private confidenceDecay: number = 0.95;

  /**
   * Predict agent outcome for a task
   *
   * @param state - Current MPC state
   * @param agentId - Agent ID
   * @param taskId - Task ID
   * @returns Agent outcome prediction
   */
  async predictAgentOutcome(
    state: MPCState,
    agentId: string,
    taskId: string
  ): Promise<AgentOutcomePrediction> {
    const task = state.tasks.get(taskId);
    const agentState = state.agents.get(agentId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!agentState) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Get historical pattern for this agent
    const pattern = this.patterns.get(agentId);

    // Calculate success probability
    const baseSuccessRate = pattern?.successRate ?? 0.9;
    const successProbability = this.calculateSuccessProbability(
      task,
      agentState,
      baseSuccessRate
    );

    // Calculate quality score
    const baseQuality = pattern?.avgQualityScore ?? 0.8;
    const qualityScore = this.calculateQualityScore(
      task,
      agentState,
      baseQuality
    );

    // Identify potential failures
    const potentialFailures = this.identifyPotentialFailures(
      task,
      agentState,
      state
    );

    // Calculate confidence
    const confidence = this.calculatePredictionConfidence(
      pattern?.sampleSize ?? 0
    );

    return {
      agentId,
      taskId,
      successProbability: {
        value: successProbability,
        confidence,
        lowerBound: Math.max(0, successProbability - (1 - confidence) * 0.3),
        upperBound: Math.min(1, successProbability + (1 - confidence) * 0.3),
        timestamp: Date.now(),
      },
      qualityScore: {
        value: qualityScore,
        confidence,
        lowerBound: Math.max(0, qualityScore - (1 - confidence) * 0.2),
        upperBound: Math.min(1, qualityScore + (1 - confidence) * 0.2),
        timestamp: Date.now(),
      },
      potentialFailures,
    };
  }

  /**
   * Predict resource usage for a task
   *
   * @param state - Current MPC state
   * @param taskId - Task ID
   * @returns Resource usage predictions
   */
  async predictResourceUsage(
    state: MPCState,
    taskId: string
  ): Promise<Map<ResourceType, ResourceUsagePrediction>> {
    const task = state.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const predictions = new Map<ResourceType, ResourceUsagePrediction>();

    // Predict usage for each resource type required
    for (const [resourceType, requirement] of task.resourceRequirements) {
      const pattern = this.patterns.get(task.agentId);
      const historicalUsage = pattern?.resourceUsageProfile.get(resourceType);

      // Base prediction on task requirements and historical usage
      const baseUsage = historicalUsage
        ? (requirement + historicalUsage) / 2
        : requirement;

      // Predict peak usage (typically 1.5x base)
      const peakUsage = baseUsage * 1.5;

      // Predict duration based on task estimate and historical ratio
      const durationRatio = pattern?.avgDurationRatio ?? 1.0;
      const duration = task.estimatedDuration * durationRatio;

      // Check for conflicts
      const conflicts = await this.predictResourceConflicts(
        state,
        taskId,
        resourceType,
        baseUsage,
        duration
      );

      // Calculate confidence
      const confidence = this.calculatePredictionConfidence(
        pattern?.sampleSize ?? 0
      );

      predictions.set(resourceType, {
        resourceType,
        usage: {
          value: baseUsage,
          confidence,
          lowerBound: baseUsage * 0.7,
          upperBound: baseUsage * 1.3,
          timestamp: Date.now(),
        },
        peakUsage: {
          value: peakUsage,
          confidence,
          lowerBound: peakUsage * 0.8,
          upperBound: peakUsage * 1.2,
          timestamp: Date.now(),
        },
        duration: {
          value: duration,
          confidence,
          lowerBound: duration * 0.8,
          upperBound: duration * 1.2,
          timestamp: Date.now(),
        },
        conflicts,
      });
    }

    return predictions;
  }

  /**
   * Predict resource conflicts
   *
   * @param state - Current MPC state
   * @param taskId - Task ID
   * @param resourceType - Resource type
   * @param usage - Expected usage
   * @param duration - Expected duration
   * @returns Array of predicted conflicts
   */
  async predictResourceConflicts(
    state: MPCState,
    taskId: string,
    resourceType: ResourceType,
    usage: number,
    duration: number
  ): Promise<ResourceConflict[]> {
    const conflicts: ResourceConflict[] = [];
    const resource = state.resources.get(resourceType);

    if (!resource) {
      return conflicts;
    }

    // Get all active and scheduled tasks
    const activeTasks = this.getTasksInTimeWindow(state, Date.now(), Date.now() + duration * 1000);

    for (const otherTask of activeTasks) {
      if (otherTask.id === taskId) {
        continue;
      }

      const otherTaskUsage = otherTask.resourceRequirements.get(resourceType) || 0;

      // Check if combined usage exceeds capacity
      const totalUsage = resource.used + resource.reserved + usage + otherTaskUsage;
      const utilization = totalUsage / resource.total;

      if (utilization > 1.0) {
        // Conflict detected
        conflicts.push({
          id: this.generateConflictId(),
          resourceType,
          taskIds: [taskId, otherTask.id],
          severity: Math.min(1, utilization - 0.8) * 5, // Scale 0-1
          type: utilization > resource.total ? 'exhaustion' : 'contention',
          timeWindow: {
            start: Date.now(),
            end: Date.now() + duration * 1000,
          },
          resolution: this.suggestConflictResolution(
            resourceType,
            [taskId, otherTask.id],
            utilization
          ),
        });
      }
    }

    return conflicts;
  }

  /**
   * Predict completion time for a task
   *
   * @param state - Current MPC state
   * @param taskId - Task ID
   * @returns Completion time prediction
   */
  async predictCompletionTime(
    state: MPCState,
    taskId: string
  ): Promise<CompletionTimePrediction> {
    const task = state.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Get agent pattern
    const pattern = this.patterns.get(task.agentId);
    const durationRatio = pattern?.avgDurationRatio ?? 1.0;

    // Base duration prediction
    let predictedDuration = task.estimatedDuration * durationRatio;

    // Adjust for dependencies
    const dependencyDelay = this.calculateDependencyDelay(state, task);
    predictedDuration += dependencyDelay;

    // Adjust for resource contention
    const contentionDelay = await this.calculateContentionDelay(state, task);
    predictedDuration += contentionDelay;

    // Adjust for priority (high priority tasks get resources faster)
    const priorityFactor = this.calculatePriorityFactor(task.priority);
    predictedDuration *= priorityFactor;

    // Calculate completion time
    const startTime = task.scheduledStart || task.actualStart || Date.now();
    const completionTime = startTime + predictedDuration * 1000;

    // Calculate confidence
    const confidence = this.calculatePredictionConfidence(
      pattern?.sampleSize ?? 0
    );

    // Identify factors affecting prediction
    const factors = [
      {
        factor: 'historical_performance',
        impact: 1 - (pattern?.avgDurationRatio ?? 1.0),
        confidence: pattern ? 0.8 : 0.3,
      },
      {
        factor: 'dependencies',
        impact: dependencyDelay / predictedDuration,
        confidence: 0.9,
      },
      {
        factor: 'resource_contention',
        impact: contentionDelay / predictedDuration,
        confidence: 0.7,
      },
      {
        factor: 'priority',
        impact: 1 - priorityFactor,
        confidence: 0.6,
      },
    ];

    return {
      taskId,
      completionTime: {
        value: completionTime,
        confidence,
        lowerBound: startTime + predictedDuration * 0.7 * 1000,
        upperBound: startTime + predictedDuration * 1.3 * 1000,
        timestamp: Date.now(),
      },
      duration: {
        value: predictedDuration,
        confidence,
        lowerBound: predictedDuration * 0.7,
        upperBound: predictedDuration * 1.3,
        timestamp: Date.now(),
      },
      factors,
    };
  }

  /**
   * Simulate a what-if scenario
   *
   * @param state - Current state
   * @param modifications - Modifications to apply
   * @param horizon - Planning horizon
   * @returns Scenario simulation result
   */
  async simulateScenario(
    state: MPCState,
    modifications: Array<{
      variable: string;
      original: unknown;
      modified: unknown;
    }>,
    horizon: PlanningHorizon
  ): Promise<ScenarioSimulation> {
    // Clone state for simulation
    const simulatedState = this.cloneState(state);

    // Apply modifications
    for (const mod of modifications) {
      this.applyModification(simulatedState, mod.variable, mod.modified);
    }

    // Simulate execution over horizon
    const simulatedPlan = await this.simulateExecution(
      simulatedState,
      horizon
    );

    // Calculate outcomes
    const outcomes = this.calculateOutcomes(simulatedState, simulatedPlan);

    // Compare to baseline
    const baselinePlan = await this.simulateExecution(state, horizon);
    const baselineOutcomes = this.calculateOutcomes(state, baselinePlan);

    const comparison = {
      timeDiff: outcomes.completionTime - baselineOutcomes.completionTime,
      qualityDiff: outcomes.qualityScore - baselineOutcomes.qualityScore,
      resourceUtilDiff: outcomes.resourceUtilization - baselineOutcomes.resourceUtilization,
      riskDiff: outcomes.risk - baselineOutcomes.risk,
    };

    return {
      id: this.generateScenarioId(),
      description: this.generateScenarioDescription(modifications),
      modifications,
      simulatedState,
      simulatedPlan,
      outcomes,
      comparison,
    };
  }

  /**
   * Predict multiple future states
   *
   * @param state - Current state
   * @param horizon - Planning horizon
   * @returns Array of predicted future states
   */
  async predictFutureStates(
    state: MPCState,
    horizon: PlanningHorizon
  ): Promise<MPCState[]> {
    const predictedStates: MPCState[] = [];
    let currentState = this.cloneState(state);

    for (let step = 1; step <= horizon.steps; step++) {
      // Predict state at this step
      const nextState = await this.predictNextState(
        currentState,
        horizon.stepDuration
      );

      predictedStates.push(nextState);
      currentState = nextState;
    }

    return predictedStates;
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Calculate success probability for a task
   */
  private calculateSuccessProbability(
    task: MPCTask,
    agentState: AgentExecutionState,
    baseSuccessRate: number
  ): number {
    let successProb = baseSuccessRate;

    // Adjust for agent retries
    if (agentState.retries > 0) {
      successProb *= 0.9; // 10% reduction per retry
    }

    // Adjust for task priority (higher priority = more oversight)
    if (task.priority === TaskPriority.CRITICAL) {
      successProb *= 1.05;
    }

    // Adjust for task dependencies (more deps = more complexity)
    if (task.dependencies.length > 3) {
      successProb *= 0.95;
    }

    // Ensure bounds
    return Math.max(0, Math.min(1, successProb));
  }

  /**
   * Calculate quality score for a task
   */
  private calculateQualityScore(
    task: MPCTask,
    agentState: AgentExecutionState,
    baseQuality: number
  ): number {
    let quality = baseQuality;

    // Adjust for agent progress
    if (agentState.progress > 0.5) {
      quality *= 1.05; // Agent making good progress
    }

    // Adjust for task duration (longer tasks = higher quality potential)
    if (task.estimatedDuration > 300) {
      quality *= 1.02;
    }

    // Ensure bounds
    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Identify potential failure modes
   */
  private identifyPotentialFailures(
    task: MPCTask,
    agentState: AgentExecutionState,
    state: MPCState
  ): Array<{
    mode: string;
    probability: number;
    mitigations: string[];
  }> {
    const failures: Array<{
      mode: string;
      probability: number;
      mitigations: string[];
    }> = [];

    // Check for resource exhaustion
    for (const [resourceType, requirement] of task.resourceRequirements) {
      const resource = state.resources.get(resourceType);
      if (resource && resource.available < requirement) {
        failures.push({
          mode: 'resource_exhaustion',
          probability: 0.7,
          mitigations: [
            'Reschedule task when resources available',
            'Reduce resource requirements',
            'Reallocate resources from lower priority tasks',
          ],
        });
      }
    }

    // Check for agent errors
    if (agentState.status === 'error') {
      failures.push({
        mode: 'agent_failure',
        probability: 0.8,
        mitigations: [
          'Restart agent',
          'Reassign task to different agent',
          'Debug agent error',
        ],
      });
    }

    // Check for dependency failures
    for (const depId of task.dependencies) {
      const depTask = state.tasks.get(depId);
      if (depTask?.status === 'failed') {
        failures.push({
          mode: 'dependency_failure',
          probability: 0.9,
          mitigations: [
            'Repair or retry dependency task',
            'Remove dependency if possible',
            'Cancel this task',
          ],
        });
      }
    }

    return failures;
  }

  /**
   * Calculate prediction confidence based on sample size
   */
  private calculatePredictionConfidence(sampleSize: number): number {
    // Confidence increases with sample size, caps at 0.95
    return Math.min(0.95, sampleSize / (sampleSize + this.minSamples));
  }

  /**
   * Get tasks in a time window
   */
  private getTasksInTimeWindow(
    state: MPCState,
    startTime: number,
    endTime: number
  ): MPCTask[] {
    return Array.from(state.tasks.values()).filter((task) => {
      if (task.status === 'complete' || task.status === 'failed') {
        return false;
      }

      const taskStart = task.scheduledStart || task.actualStart || Date.now();
      const taskEnd = taskStart + task.estimatedDuration * 1000;

      // Check for overlap
      return taskStart < endTime && taskEnd > startTime;
    });
  }

  /**
   * Suggest conflict resolution
   */
  private suggestConflictResolution(
    resourceType: ResourceType,
    taskIds: string[],
    utilization: number
  ): ResourceConflict['resolution'] {
    if (utilization > 1.2) {
      // Severe exhaustion - need rescheduling
      return {
        strategy: 'reschedule',
        details: {
          suggestedDelay: 60000, // 1 minute delay
          priority: 'lower_first',
        },
      };
    } else if (utilization > 1.0) {
      // Moderate exhaustion - reallocation needed
      return {
        strategy: 'reallocate',
        details: {
          suggestedAllocation: taskIds.map((id) => ({
            taskId: id,
            percentage: 0.5,
          })),
        },
      };
    } else {
      // Minor contention - prioritize
      return {
        strategy: 'prioritize',
        details: {
          priority: 'high_priority_first',
        },
      };
    }
  }

  /**
   * Calculate dependency delay
   */
  private calculateDependencyDelay(state: MPCState, task: MPCTask): number {
    let maxDelay = 0;

    for (const depId of task.dependencies) {
      const depTask = state.tasks.get(depId);
      if (!depTask) {
        maxDelay += 60; // 1 minute penalty for missing dependency
        continue;
      }

      if (depTask.status !== 'complete') {
        // Dependency not complete, estimate delay
        const depRemaining = depTask.estimatedDuration;
        maxDelay = Math.max(maxDelay, depRemaining);
      }
    }

    return maxDelay;
  }

  /**
   * Calculate resource contention delay
   */
  private async calculateContentionDelay(
    state: MPCState,
    task: MPCTask
  ): Promise<number> {
    let contentionDelay = 0;

    for (const [resourceType, requirement] of task.resourceRequirements) {
      const resource = state.resources.get(resourceType);
      if (!resource) {
        continue;
      }

      // Calculate queue time based on utilization
      const utilization = (resource.used + resource.reserved) / resource.total;
      if (utilization > 0.8) {
        // High contention - add delay
        contentionDelay += (utilization - 0.8) * 120; // Up to 2 minutes
      }
    }

    return contentionDelay;
  }

  /**
   * Calculate priority factor
   */
  private calculatePriorityFactor(priority: TaskPriority): number {
    // Higher priority = faster execution (lower factor)
    switch (priority) {
      case TaskPriority.CRITICAL:
        return 0.9;
      case TaskPriority.HIGH:
        return 0.95;
      case TaskPriority.NORMAL:
        return 1.0;
      case TaskPriority.LOW:
        return 1.1;
      default:
        return 1.0;
    }
  }

  /**
   * Clone state for simulation
   */
  private cloneState(state: MPCState): MPCState {
    return {
      ...state,
      id: `sim-${state.id}`,
      timestamp: Date.now(),
      agents: new Map(state.agents),
      tasks: new Map(
        Array.from(state.tasks.entries()).map(([id, task]) => [
          id,
          { ...task },
        ])
      ),
      resources: new Map(
        Array.from(state.resources.entries()).map(([type, snapshot]) => [
          type,
          { ...snapshot },
        ])
      ),
      currentPlan: state.currentPlan ? { ...state.currentPlan } : undefined,
      metrics: { ...state.metrics },
    };
  }

  /**
   * Apply modification to state
   */
  private applyModification(
    state: MPCState,
    variable: string,
    value: unknown
  ): void {
    // Parse variable path (e.g., 'resources.CPU.available')
    const parts = variable.split('.');

    if (parts[0] === 'resources' && parts.length === 3) {
      const resourceType = parts[1] as ResourceType;
      const property = parts[2];

      const resource = state.resources.get(resourceType);
      if (resource && property in resource) {
        (resource as unknown as Record<string, unknown>)[property] = value;
      }
    }

    // Add more modification paths as needed
  }

  /**
   * Simulate execution over planning horizon
   */
  private async simulateExecution(
    state: MPCState,
    horizon: PlanningHorizon
  ): Promise<MPCPlan | undefined> {
    // This is a simplified simulation
    // Full implementation would run MPC optimization

    const totalTasks = state.tasks.size;
    const completedTasks = Array.from(state.tasks.values()).filter(
      (t) => t.status === 'complete'
    ).length;

    const estimatedCompletion = totalTasks > 0
      ? Date.now() + (totalTasks - completedTasks) * 60 * 1000 // 1 min per task
      : Date.now();

    return {
      id: 'sim-plan',
      createdAt: Date.now(),
      horizon,
      objective: {
        name: 'simulation',
        description: 'Simulated execution plan',
        weights: {
          timeWeight: 1.0,
          qualityWeight: 1.0,
          resourceWeight: 1.0,
          riskWeight: 1.0,
          priorityWeight: 1.0,
        },
        constraints: [],
      },
      steps: [],
      expectedCompletionTime: estimatedCompletion,
      expectedQuality: 0.8,
      totalCost: 100,
      risk: 0.2,
      confidence: 0.7,
      predictedConflicts: [],
      resourceAllocation: [],
      agentAssignments: new Map(),
      metadata: {},
    };
  }

  /**
   * Calculate outcomes from state and plan
   */
  private calculateOutcomes(
    state: MPCState,
    plan?: MPCPlan
  ): {
    completionTime: number;
    qualityScore: number;
    resourceUtilization: number;
    risk: number;
  } {
    return {
      completionTime: plan?.expectedCompletionTime || Date.now() + 60000,
      qualityScore: plan?.expectedQuality || state.metrics.avgQualityScore,
      resourceUtilization: state.metrics.resourceUtilization,
      risk: plan?.risk || 0.3,
    };
  }

  /**
   * Generate scenario description
   */
  private generateScenarioDescription(
    modifications: Array<{ variable: string; original: unknown; modified: unknown }>
  ): string {
    return `Scenario with ${modifications.length} modification(s)`;
  }

  /**
   * Predict next state
   */
  private async predictNextState(
    currentState: MPCState,
    stepDuration: number
  ): Promise<MPCState> {
    // Simple state transition prediction
    const nextState: MPCState = {
      ...currentState,
      id: `pred-${Date.now()}`,
      timestamp: Date.now(),
      status: MPCStatus.EXECUTING,
    };

    // Update resource snapshots (simulate usage)
    for (const [type, snapshot] of nextState.resources) {
      // Simulate some resource usage change
      const usageChange = (Math.random() - 0.5) * 0.1 * snapshot.total;
      nextState.resources.set(type, {
        ...snapshot,
        used: Math.max(0, Math.min(snapshot.total, snapshot.used + usageChange)),
        available: snapshot.total - snapshot.used - snapshot.reserved,
        timestamp: Date.now(),
      });
    }

    return nextState;
  }

  // ========================================================================
  // LEARNING METHODS
  // ========================================================================

  /**
   * Learn from completed task
   *
   * @param task - Completed task
   * @param actualDuration - Actual completion time
   * @param success - Whether task succeeded
   * @param qualityScore - Quality score (0-1)
   */
  async learnFromTask(
    task: MPCTask,
    actualDuration: number,
    success: boolean,
    qualityScore: number
  ): Promise<void> {
    const data: HistoricalTaskData = {
      taskId: task.id,
      agentId: task.agentId,
      estimatedDuration: task.estimatedDuration,
      actualDuration,
      success,
      qualityScore,
      resourceUsage: new Map(task.resourceRequirements),
      timestamp: Date.now(),
    };

    // Add to history
    this.historicalData.push(data);

    // Trim history if needed
    if (this.historicalData.length > this.maxHistorySize) {
      this.historicalData.shift();
    }

    // Update patterns
    await this.updatePatterns(task.agentId);
  }

  /**
   * Update learned patterns for an agent
   *
   * @param agentId - Agent ID
   */
  private async updatePatterns(agentId: string): Promise<void> {
    // Get all historical data for this agent
    const agentData = this.historicalData.filter((d) => d.agentId === agentId);

    if (agentData.length < this.minSamples) {
      return; // Not enough data
    }

    // Calculate averages
    const avgDurationRatio =
      agentData.reduce((sum, d) => sum + d.actualDuration / d.estimatedDuration, 0) /
      agentData.length;

    const successRate =
      agentData.filter((d) => d.success).length / agentData.length;

    const avgQuality =
      agentData.reduce((sum, d) => sum + d.qualityScore, 0) / agentData.length;

    // Aggregate resource usage
    const resourceUsage = new Map<ResourceType, number>();
    for (const data of agentData) {
      for (const [type, usage] of data.resourceUsage) {
        const current = resourceUsage.get(type) || 0;
        resourceUsage.set(type, current + usage);
      }
    }

    // Normalize by sample size
    for (const [type, total] of resourceUsage) {
      resourceUsage.set(type, total / agentData.length);
    }

    // Update pattern
    this.patterns.set(agentId, {
      patternId: `pattern-${agentId}`,
      agentId,
      avgDurationRatio,
      avgQualityScore: avgQuality,
      successRate,
      resourceUsageProfile: resourceUsage,
      sampleSize: agentData.length,
      lastUpdated: Date.now(),
    });
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Generate unique conflict ID
   */
  private generateConflictId(): string {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique scenario ID
   */
  private generateScenarioId(): string {
    return `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get learned patterns
   */
  getPatterns(): Map<string, LearnedPattern> {
    return new Map(this.patterns);
  }

  /**
   * Get historical data
   */
  getHistoricalData(): HistoricalTaskData[] {
    return [...this.historicalData];
  }

  /**
   * Clear historical data
   */
  clearHistory(): void {
    this.historicalData = [];
    this.patterns.clear();
  }
}

/**
 * Global prediction engine singleton instance
 */
export const predictionEngine = new MPCPredictionEngine();
