/**
 * MPC Controller
 *
 * Core Model Predictive Control controller for multi-agent optimization.
 * Implements Observer → Predictor → Optimizer → Actions pattern.
 *
 * @example
 * ```typescript
 * import { mpcController } from '@/lib/mpc/controller';
 *
 * // Initialize controller
 * await mpcController.initialize(config);
 *
 * // Plan and execute
 * const plan = await mpcController.plan();
 * await mpcController.execute(plan);
 * ```
 */

import type {
  MPCState,
  MPCPlan,
  MPCPlanStep,
  MPCConfig,
  MPCEvent,
  MPCEventType,
  OptimizationObjective,
  PlanningHorizon,
  MPCTask,
  AgentOutcomePrediction,
  ResourceUsagePrediction,
  CompletionTimePrediction,
  ScenarioSimulation,
  CostWeights,
  AgentDefinition,
  HardwareProfile,
} from './types';
import {
  MPCStatus,
  ResourceType,
  TaskPriority,
  MPCEventType as MPCEventTypes,
} from './types';
import { stateManager } from './state-manager';
import { predictionEngine } from './prediction-engine';

/**
 * MPC Controller class
 *
 * Singleton controller implementing the Observer-Predictor-Optimizer-Actions loop.
 */
export class MPCController {
  /** Controller configuration */
  private config: MPCConfig | null = null;

  /** Current status */
  private status: MPCStatus = MPCStatus.IDLE;

  /** Current plan being executed */
  private currentPlan: MPCPlan | null = null;

  /** Event listeners */
  private eventListeners: Map<MPCEventType, Set<(event: MPCEvent) => void>> = new Map();

  /** Planning interval timer */
  private planningTimer: ReturnType<typeof setInterval> | null = null;

  /** Execution step timer */
  private executionTimer: ReturnType<typeof setInterval> | null = null;

  /** Observer function */
  private observer: (state: MPCState) => Promise<Record<string, unknown>> = this.defaultObserver;

  /** Predictor function */
  private predictor: (
    state: MPCState,
    observations: Record<string, unknown>,
    horizon: PlanningHorizon
  ) => Promise<MPCState[]> = this.defaultPredictor;

  /** Optimizer function */
  private optimizer: (
    predictedStates: MPCState[],
    objective: OptimizationObjective,
    currentPlan?: MPCPlan
  ) => Promise<MPCPlan> = this.defaultOptimizer;

  /** Action executor function */
  private actionExecutor: (
    plan: MPCPlan,
    state: MPCState
  ) => Promise<Map<string, unknown>> = this.defaultActionExecutor;

  /** Is controller running */
  private running: boolean = false;

  constructor() {
    // Initialize event listener sets
    Object.values(MPCEventTypes).forEach((type) => {
      this.eventListeners.set(type as MPCEventType, new Set());
    });
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize MPC controller with configuration
   *
   * @param config - Controller configuration
   */
  async initialize(config: MPCConfig): Promise<void> {
    this.config = config;
    this.status = MPCStatus.IDLE;

    // Initialize state manager with hardware profile
    await stateManager.initialize(config.hardwareProfile, {
      maxHistorySize: config.stateHistorySize,
      anomalyThreshold: config.anomalyThreshold,
    });

    this.emit(MPCEventTypes.STATE_CHANGED, {
      type: MPCEventTypes.STATE_CHANGED,
      timestamp: Date.now(),
      data: { status: this.status, config },
      source: 'MPCController',
    });
  }

  /**
   * Start MPC controller loop
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    if (!this.config) {
      throw new Error('MPC controller not initialized');
    }

    this.running = true;
    this.status = MPCStatus.EXECUTING;

    // Start planning loop
    this.planningTimer = setInterval(
      () => this.plan(),
      this.config.horizon.replanInterval * 1000
    );

    // Start execution loop
    this.executionTimer = setInterval(
      () => this.executeStep(),
      this.config.horizon.stepDuration * 1000
    );

    this.emit(MPCEventTypes.PLAN_STARTED, {
      type: MPCEventTypes.PLAN_STARTED,
      timestamp: Date.now(),
      data: { interval: this.config.horizon.replanInterval },
      source: 'MPCController',
    });
  }

  /**
   * Stop MPC controller loop
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.status = MPCStatus.PAUSED;

    // Clear timers
    if (this.planningTimer) {
      clearInterval(this.planningTimer);
      this.planningTimer = null;
    }

    if (this.executionTimer) {
      clearInterval(this.executionTimer);
      this.executionTimer = null;
    }

    this.emit(MPCEventTypes.PLAN_COMPLETED, {
      type: MPCEventTypes.PLAN_COMPLETED,
      timestamp: Date.now(),
      data: {},
      source: 'MPCController',
    });
  }

  /**
   * Reset controller state
   */
  async reset(): Promise<void> {
    await this.stop();
    this.currentPlan = null;
    this.status = MPCStatus.IDLE;
    await stateManager.reset();
  }

  // ========================================================================
  // MPC LOOP: OBSERVE → PREDICT → OPTIMIZE → ACT
  // ========================================================================

  /**
   * Main MPC planning loop
   *
   * Observes current state, predicts future states, optimizes actions,
   * and returns the optimal plan.
   *
   * @returns Optimized MPC plan
   */
  async plan(): Promise<MPCPlan> {
    if (!this.config) {
      throw new Error('MPC controller not initialized');
    }

    const startTime = Date.now();
    this.status = MPCStatus.PLANNING;

    try {
      // Get current state
      const currentState = stateManager.getCurrentState();
      if (!currentState) {
        throw new Error('State not available');
      }

      // OBSERVE: Gather observations from current state
      const observations = await this.observer(currentState);

      // PREDICT: Predict future states over planning horizon
      const predictedStates = await this.predictor(
        currentState,
        observations,
        this.config.horizon
      );

      // OPTIMIZE: Find optimal actions given predictions
      const plan = await this.optimizer(
        predictedStates,
        this.config.objective,
        this.currentPlan || undefined
      );

      // Update current plan
      this.currentPlan = plan;

      // Commit state
      await stateManager.commitState();

      this.status = MPCStatus.EXECUTING;

      this.emit(MPCEventTypes.PLAN_CREATED, {
        type: MPCEventTypes.PLAN_CREATED,
        timestamp: Date.now(),
        data: {
          planId: plan.id,
          duration: Date.now() - startTime,
          steps: plan.steps.length,
          expectedQuality: plan.expectedQuality,
          risk: plan.risk,
        },
        source: 'MPCController',
      });

      return plan;
    } catch (error) {
      this.status = MPCStatus.ERROR;
      this.emit(MPCEventTypes.PLAN_FAILED, {
        type: MPCEventTypes.PLAN_FAILED,
        timestamp: Date.now(),
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
        source: 'MPCController',
      });
      throw error;
    }
  }

  /**
   * Execute current plan step by step
   */
  private async executeStep(): Promise<void> {
    if (!this.currentPlan || !this.running) {
      return;
    }

    const currentState = stateManager.getCurrentState();
    if (!currentState) {
      return;
    }

    try {
      // Execute current plan step
      const results = await this.actionExecutor(this.currentPlan, currentState);

      // Check for conflicts
      await this.checkForConflicts();

      // Check for anomalies
      const anomalies = await stateManager.detectAnomalies();
      for (const anomaly of anomalies) {
        this.emit(MPCEventTypes.ANOMALY_DETECTED, {
          type: MPCEventTypes.ANOMALY_DETECTED,
          timestamp: Date.now(),
          data: { anomaly },
          source: 'MPCController',
        });
      }

      // Update metrics
      await this.updateMetrics();

    } catch (error) {
      console.error('Error executing plan step:', error);
      this.emit(MPCEventTypes.PLAN_FAILED, {
        type: MPCEventTypes.PLAN_FAILED,
        timestamp: Date.now(),
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
        source: 'MPCController',
      });
    }
  }

  /**
   * Execute a complete plan
   *
   * @param plan - Plan to execute
   */
  async execute(plan: MPCPlan): Promise<void> {
    this.currentPlan = plan;
    this.status = MPCStatus.EXECUTING;

    for (const step of plan.steps) {
      if (!this.running) {
        break;
      }

      // Wait until step start time
      const now = Date.now();
      if (step.startTime > now) {
        await new Promise((resolve) =>
          setTimeout(resolve, step.startTime - now)
        );
      }

      // Execute step tasks
      await this.executeStepTasks(step);
    }

    this.status = MPCStatus.IDLE;
  }

  /**
   * Execute tasks in a plan step
   *
   * @param step - Plan step to execute
   */
  private async executeStepTasks(step: MPCPlanStep): Promise<void> {
    const state = stateManager.getCurrentState();
    if (!state) {
      return;
    }

    for (const taskId of step.tasks) {
      const task = state.tasks.get(taskId);
      if (!task) {
        continue;
      }

      try {
        // Update task to running
        await stateManager.updateTask(taskId, {
          status: 'running',
          actualStart: Date.now(),
        });

        // Assign agent
        const agentId = task.agentId;
        await this.assignAgent(agentId, taskId);

        // Allocate resources
        for (const [resourceType, amount] of task.resourceRequirements) {
          await stateManager.allocateResources(resourceType, amount);
        }

        this.emit(MPCEventTypes.AGENT_ASSIGNED, {
          type: MPCEventTypes.AGENT_ASSIGNED,
          timestamp: Date.now(),
          data: { agentId, taskId },
          source: 'MPCController',
        });

      } catch (error) {
        console.error(`Error executing task ${taskId}:`, error);
        await stateManager.updateTask(taskId, {
          status: 'failed',
          error: error instanceof Error ? error : new Error(String(error)),
        });

        this.emit(MPCEventTypes.TASK_FAILED, {
          type: MPCEventTypes.TASK_FAILED,
          timestamp: Date.now(),
          data: { taskId, error },
          source: 'MPCController',
        });
      }
    }
  }

  // ========================================================================
  // DEFAULT OBSERVER
  // ========================================================================

  /**
   * Default observer implementation
   * Extracts observations from current state
   */
  private async defaultObserver(
    state: MPCState
  ): Promise<Record<string, unknown>> {
    return {
      // Task observations
      pendingTasks: Array.from(state.tasks.values()).filter(
        (t) => t.status === 'pending'
      ).length,
      runningTasks: Array.from(state.tasks.values()).filter(
        (t) => t.status === 'running'
      ).length,
      completedTasks: Array.from(state.tasks.values()).filter(
        (t) => t.status === 'complete'
      ).length,

      // Agent observations
      idleAgents: Array.from(state.agents.values()).filter(
        (a) => a.status === 'idle'
      ).length,
      runningAgents: Array.from(state.agents.values()).filter(
        (a) => a.status === 'running'
      ).length,

      // Resource observations
      resourceUtilization: Array.from(state.resources.values()).map((r) => ({
        type: r.type,
        utilization: r.used / r.total,
        available: r.available,
      })),

      // Metrics observations
      metrics: state.metrics,
    };
  }

  // ========================================================================
  // DEFAULT PREDICTOR
  // ========================================================================

  /**
   * Default predictor implementation
   * Predicts future states using prediction engine
   */
  private async defaultPredictor(
    state: MPCState,
    _observations: Record<string, unknown>,
    horizon: PlanningHorizon
  ): Promise<MPCState[]> {
    return await predictionEngine.predictFutureStates(state, horizon);
  }

  // ========================================================================
  // DEFAULT OPTIMIZER
  // ========================================================================

  /**
   * Default optimizer implementation
   * Optimizes plan to minimize cost function
   */
  private async defaultOptimizer(
    predictedStates: MPCState[],
    objective: OptimizationObjective,
    currentPlan?: MPCPlan
  ): Promise<MPCPlan> {
    if (!this.config) {
      throw new Error('MPC controller not initialized');
    }

    // Create plan steps from predicted states
    const steps: MPCPlanStep[] = [];
    const agentAssignments = new Map<string, string[]>();
    const resourceAllocation: Array<{
      time: number;
      usage: Map<ResourceType, number>;
    }> = [];

    let currentTime = Date.now();

    for (let i = 0; i < predictedStates.length; i++) {
      const state = predictedStates[i];
      const startTime = currentTime;
      const endTime = currentTime + this.config.horizon.stepDuration * 1000;

      // Find tasks that can execute in this step
      const executableTasks = this.findExecutableTasks(state);

      // Sort by priority and dependencies
      const sortedTasks = this.prioritizeTasks(executableTasks, state);

      // Apply max parallel agents constraint
      const selectedTasks = sortedTasks.slice(0, this.config.maxParallelAgents);

      // Calculate resource usage for this step
      const resourceUsage = new Map<ResourceType, number>();
      for (const taskId of selectedTasks) {
        const task = state.tasks.get(taskId);
        if (!task) continue;

        for (const [type, amount] of task.resourceRequirements) {
          const current = resourceUsage.get(type) || 0;
          resourceUsage.set(type, current + amount);

          // Track agent assignments
          const agentTasks = agentAssignments.get(task.agentId) || [];
          agentTasks.push(taskId);
          agentAssignments.set(task.agentId, agentTasks);
        }
      }

      // Calculate risk (based on resource utilization and task count)
      const avgUtilization = this.calculateAverageUtilization(resourceUsage, state);
      const risk = Math.min(1, avgUtilization * 0.8 + selectedTasks.length * 0.1);

      // Calculate confidence (decreases with prediction horizon)
      const confidence = Math.max(0.5, 1 - i * 0.1);

      steps.push({
        step: i + 1,
        tasks: selectedTasks,
        startTime,
        endTime,
        resourceUsage,
        dependenciesSatisfied: [],
        risk,
        confidence,
      });

      // Record resource allocation
      resourceAllocation.push({
        time: startTime,
        usage: new Map(resourceUsage),
      });

      currentTime = endTime;
    }

    // Calculate plan metrics
    const expectedCompletionTime = steps.length > 0
      ? steps[steps.length - 1].endTime
      : Date.now();

    const avgQuality = this.calculateExpectedQuality(predictedStates);
    const totalCost = this.calculateCost(steps, objective.weights, predictedStates[predictedStates.length - 1]);
    const avgRisk = steps.reduce((sum, step) => sum + step.risk, 0) / steps.length;
    const avgConfidence = steps.reduce((sum, step) => sum + step.confidence, 0) / steps.length;

    // Predict conflicts
    const predictedConflicts = await this.predictPlanConflicts(steps, predictedStates);

    return {
      id: this.generatePlanId(),
      createdAt: Date.now(),
      horizon: this.config.horizon,
      objective,
      steps,
      expectedCompletionTime,
      expectedQuality: avgQuality,
      totalCost,
      risk: avgRisk,
      confidence: avgConfidence,
      predictedConflicts,
      resourceAllocation,
      agentAssignments,
      metadata: {
        replanFrom: currentPlan?.id,
        predictedStatesCount: predictedStates.length,
      },
    };
  }

  /**
   * Find tasks that can execute in current step
   */
  private findExecutableTasks(state: MPCState): string[] {
    const executable: string[] = [];

    for (const [taskId, task] of state.tasks) {
      if (task.status !== 'pending') {
        continue;
      }

      // Check if all dependencies are satisfied
      const depsComplete = task.dependencies.every(
        (depId) => {
          const dep = state.tasks.get(depId);
          return dep?.status === 'complete';
        }
      );

      if (depsComplete) {
        executable.push(taskId);
      }
    }

    return executable;
  }

  /**
   * Prioritize tasks for execution
   */
  private prioritizeTasks(taskIds: string[], state: MPCState): string[] {
    return taskIds.sort((a, b) => {
      const taskA = state.tasks.get(a)!;
      const taskB = state.tasks.get(b)!;

      // Sort by priority (higher first)
      const priorityDiff = taskB.priority - taskA.priority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Then by dependencies (fewer deps first)
      const depDiff = taskA.dependencies.length - taskB.dependencies.length;
      if (depDiff !== 0) {
        return depDiff;
      }

      // Finally by creation time (older first)
      return taskA.createdAt - taskB.createdAt;
    });
  }

  /**
   * Calculate average resource utilization
   */
  private calculateAverageUtilization(
    usage: Map<ResourceType, number>,
    state: MPCState
  ): number {
    let totalUtilization = 0;
    let resourceCount = 0;

    for (const [type, used] of usage) {
      const resource = state.resources.get(type);
      if (resource) {
        totalUtilization += used / resource.total;
        resourceCount++;
      }
    }

    return resourceCount > 0 ? totalUtilization / resourceCount : 0;
  }

  /**
   * Calculate expected quality score
   */
  private calculateExpectedQuality(predictedStates: MPCState[]): number {
    const qualities = predictedStates
      .map((s) => s.metrics.avgQualityScore)
      .filter((q) => q > 0);

    return qualities.length > 0
      ? qualities.reduce((a, b) => a + b, 0) / qualities.length
      : 0.8;
  }

  /**
   * Calculate cost function value
   */
  private calculateCost(
    steps: MPCPlanStep[],
    weights: CostWeights,
    finalState: MPCState
  ): number {
    let cost = 0;

    // Time cost (completion time)
    const completionTime = steps.length > 0
      ? steps[steps.length - 1].endTime - Date.now()
      : 0;
    cost += completionTime * weights.timeWeight;

    // Quality cost (inverse - lower is better for cost)
    const avgQuality = this.calculateExpectedQuality([finalState]);
    cost += (1 - avgQuality) * 10000 * weights.qualityWeight;

    // Resource cost
    for (const step of steps) {
      const avgUtil = this.calculateAverageUtilization(step.resourceUsage, finalState);
      cost += avgUtil * 1000 * weights.resourceWeight;
    }

    // Risk cost
    const avgRisk = steps.reduce((sum, step) => sum + step.risk, 0) / steps.length;
    cost += avgRisk * 5000 * weights.riskWeight;

    // Priority cost (lower priority tasks have higher cost)
    for (const step of steps) {
      for (const taskId of step.tasks) {
        const task = finalState.tasks.get(taskId);
        if (task) {
          const priorityCost = (TaskPriority.CRITICAL - task.priority) * 1000;
          cost += priorityCost * weights.priorityWeight;
        }
      }
    }

    return cost;
  }

  /**
   * Predict conflicts for plan
   */
  private async predictPlanConflicts(
    steps: MPCPlanStep[],
    predictedStates: MPCState[]
  ): Promise<Array<{
    id: string;
    resourceType: ResourceType;
    taskIds: string[];
    severity: number;
    type: 'contention' | 'exhaustion' | 'dependency' | 'priority';
    timeWindow: { start: number; end: number };
  }>> {
    const conflicts: Array<{
      id: string;
      resourceType: ResourceType;
      taskIds: string[];
      severity: number;
      type: 'contention' | 'exhaustion' | 'dependency' | 'priority';
      timeWindow: { start: number; end: number };
    }> = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const state = predictedStates[i];

      for (const [resourceType, usage] of step.resourceUsage) {
        const resource = state.resources.get(resourceType);
        if (!resource) continue;

        const utilization = (resource.used + usage) / resource.total;

        if (utilization > 1.0) {
          conflicts.push({
            id: `conflict-${i}-${resourceType}`,
            resourceType,
            taskIds: step.tasks,
            severity: Math.min(1, utilization - 0.8) * 5,
            type: utilization > resource.total ? 'exhaustion' : 'contention',
            timeWindow: {
              start: step.startTime,
              end: step.endTime,
            },
          });
        }
      }
    }

    return conflicts;
  }

  // ========================================================================
  // DEFAULT ACTION EXECUTOR
  // ========================================================================

  /**
   * Default action executor implementation
   * Executes plan and returns results
   */
  private async defaultActionExecutor(
    plan: MPCPlan,
    state: MPCState
  ): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    // Execute current step
    const currentStep = plan.steps.find((step) =>
      step.startTime <= Date.now() && step.endTime >= Date.now()
    );

    if (currentStep) {
      for (const taskId of currentStep.tasks) {
        const task = state.tasks.get(taskId);
        if (task && task.status === 'pending') {
          // Mark task as scheduled
          await stateManager.updateTask(taskId, {
            status: 'scheduled',
            scheduledStart: currentStep.startTime,
          });

          results.set(taskId, { scheduled: true });
        }
      }
    }

    return results;
  }

  // ========================================================================
  // AGENT ASSIGNMENT
  // ========================================================================

  /**
   * Assign agent to task
   *
   * @param agentId - Agent ID
   * @param taskId - Task ID
   */
  private async assignAgent(agentId: string, taskId: string): Promise<void> {
    const state = stateManager.getCurrentState();
    if (!state) {
      return;
    }

    const agentState = state.agents.get(agentId);
    if (!agentState) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Update agent state
    await stateManager.updateAgentState(agentId, {
      status: 'running' as any,
      currentTaskId: taskId,
      startTime: Date.now(),
    });

    // Update task
    await stateManager.updateTask(taskId, {
      status: 'running',
      actualStart: Date.now(),
    });
  }

  // ========================================================================
  // CONFLICT DETECTION
  // ========================================================================

  /**
   * Check for conflicts in current state
   */
  private async checkForConflicts(): Promise<void> {
    const state = stateManager.getCurrentState();
    if (!state || !this.currentPlan) {
      return;
    }

    for (const conflict of this.currentPlan.predictedConflicts) {
      this.emit(MPCEventTypes.CONFLICT_DETECTED, {
        type: MPCEventTypes.CONFLICT_DETECTED,
        timestamp: Date.now(),
        data: { conflict },
        source: 'MPCController',
      });

      // Attempt resolution
      await this.resolveConflict(conflict);
    }
  }

  /**
   * Resolve a detected conflict
   *
   * @param conflict - Conflict to resolve
   */
  private async resolveConflict(conflict: {
    id: string;
    resourceType: ResourceType;
    taskIds: string[];
    severity: number;
    type: 'contention' | 'exhaustion' | 'dependency' | 'priority';
    timeWindow: { start: number; end: number };
  }): Promise<void> {
    const state = stateManager.getCurrentState();
    if (!state) {
      return;
    }

    // Simple resolution: lower priority tasks yield
    const tasksToYield = conflict.taskIds
      .map((id) => state.tasks.get(id))
      .filter((t) => t !== undefined)
      .sort((a, b) => (a!.priority - b!.priority))
      .slice(0, Math.ceil(conflict.taskIds.length / 2));

    for (const task of tasksToYield) {
      if (task && task.status === 'pending') {
        // Reschedule task (add 1 minute delay)
        await stateManager.updateTask(task.id, {
          scheduledStart: (task.scheduledStart || Date.now()) + 60000,
        });
      }
    }

    this.emit(MPCEventTypes.CONFLICT_RESOLVED, {
      type: MPCEventTypes.CONFLICT_RESOLVED,
      timestamp: Date.now(),
      data: {
        conflictId: conflict.id,
        resolution: 'rescheduled_lower_priority',
        tasksYielded: tasksToYield.map((t) => t!.id),
      },
      source: 'MPCController',
    });
  }

  // ========================================================================
  // METRICS UPDATE
  // ========================================================================

  /**
   * Update controller metrics
   */
  private async updateMetrics(): Promise<void> {
    const state = stateManager.getCurrentState();
    if (!state) {
      return;
    }

    // Metrics are updated by state manager
    await stateManager.commitState();
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Get current status
   */
  getStatus(): MPCStatus {
    return this.status;
  }

  /**
   * Get current plan
   */
  getCurrentPlan(): MPCPlan | null {
    return this.currentPlan;
  }

  /**
   * Get configuration
   */
  getConfig(): MPCConfig | null {
    return this.config;
  }

  /**
   * Add event listener
   */
  addEventListener(
    eventType: MPCEventType,
    listener: (event: MPCEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    eventType: MPCEventType,
    listener: (event: MPCEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(eventType: MPCEventType, event: MPCEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in MPC event listener:`, error);
        }
      });
    }
  }

  /**
   * Trigger replanning
   */
  async triggerReplan(): Promise<MPCPlan> {
    if (!this.config || !this.config.enableReplanning) {
      throw new Error('Replanning not enabled');
    }

    this.emit(MPCEventTypes.REPLAN_TRIGGERED, {
      type: MPCEventTypes.REPLAN_TRIGGERED,
      timestamp: Date.now(),
      data: { reason: 'manual_trigger' },
      source: 'MPCController',
    });

    return await this.plan();
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Generate unique plan ID
   */
  private generatePlanId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global MPC controller singleton instance
 */
export const mpcController = new MPCController();
