/**
 * MPC State Manager
 *
 * Manages the complete state of the MPC system, including agents, tasks, and resources.
 * Provides state tracking, history management, and anomaly detection.
 *
 * @example
 * ```typescript
 * import { stateManager } from '@/lib/mpc/state-manager';
 *
 * // Initialize with hardware profile
 * await stateManager.initialize(hardwareProfile);
 *
 * // Get current state
 * const state = stateManager.getCurrentState();
 *
 * // Add a task
 * await stateManager.addTask({
 *   id: 'task-1',
 *   name: 'Analyze data',
 *   agentId: 'jepa-v1',
 *   priority: TaskPriority.NORMAL,
 *   // ... other fields
 * });
 * ```
 */

import type {
  MPCState,
  MPCTask,
  AgentExecutionState,
  ResourceSnapshot,
  StateTransition,
  AnomalyDetection,
  MPCValidationResult,
  MPCEvent,
  MPCEventType,
} from './types';
import {
  MPCStatus,
  ResourceType,
  TaskPriority,
  MPCEventType as MPCEventTypes,
} from './types';
import type { AgentDefinition, AgentState } from '@/lib/agents/types';
import type { HardwareProfile } from '@/lib/hardware/types';

/**
 * MPC State Manager class
 *
 * Singleton state manager for tracking all MPC system components.
 */
export class MPCStateManager {
  /** Current state */
  private state: MPCState | null = null;

  /** State history for learning patterns */
  private stateHistory: MPCState[] = [];

  /** Maximum history size */
  private maxHistorySize: number = 1000;

  /** State transitions log */
  private transitions: StateTransition[] = [];

  /** Event listeners */
  private eventListeners: Map<MPCEventType, Set<(event: MPCEvent) => void>> = new Map();

  /** Hardware profile */
  private hardwareProfile: HardwareProfile | null = null;

  /** Anomaly detection threshold (0-1) */
  private anomalyThreshold: number = 0.7;

  /** Resource baselines for anomaly detection */
  private resourceBaselines: Map<ResourceType, number> = new Map();

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
   * Initialize the state manager with hardware profile
   *
   * @param hardwareProfile - Current hardware profile
   * @param config - Optional configuration
   */
  async initialize(
    hardwareProfile: HardwareProfile,
    config?: {
      maxHistorySize?: number;
      anomalyThreshold?: number;
    }
  ): Promise<void> {
    this.hardwareProfile = hardwareProfile;
    this.maxHistorySize = config?.maxHistorySize ?? 1000;
    this.anomalyThreshold = config?.anomalyThreshold ?? 0.7;

    // Initialize state
    this.state = this.createInitialState();

    // Initialize resource baselines
    this.initializeResourceBaselines();

    // Emit initial state change event
    this.emit(MPCEventTypes.STATE_CHANGED, {
      type: MPCEventTypes.STATE_CHANGED,
      timestamp: Date.now(),
      data: { state: this.state },
      source: 'StateManager',
    });
  }

  /**
   * Create initial MPC state
   */
  private createInitialState(): MPCState {
    if (!this.hardwareProfile) {
      throw new Error('Hardware profile not initialized');
    }

    const timestamp = Date.now();

    return {
      id: this.generateStateId(),
      timestamp,
      status: MPCStatus.IDLE,
      agents: new Map(),
      tasks: new Map(),
      resources: this.initializeResources(timestamp),
      metrics: {
        totalCompleted: 0,
        totalFailed: 0,
        avgCompletionTime: 0,
        avgQualityScore: 0,
        totalTimeSaved: 0,
        resourceUtilization: 0,
        coordinationOverhead: 0,
        replanCount: 0,
        predictionAccuracy: 1,
        parallelizationLevel: 1,
      },
    };
  }

  /**
   * Initialize resource snapshots based on hardware profile
   */
  private initializeResources(timestamp: number): Map<ResourceType, ResourceSnapshot> {
    const resources = new Map<ResourceType, ResourceSnapshot>();

    if (!this.hardwareProfile) {
      return resources;
    }

    const hw = this.hardwareProfile;

    // CPU resources
    resources.set(ResourceType.CPU, {
      type: ResourceType.CPU,
      total: hw.cpu.concurrency,
      used: 0,
      reserved: 0,
      available: hw.cpu.concurrency,
      timestamp,
      unit: 'cores',
    });

    // Memory resources (convert GB to MB)
    const totalMemoryMB = (hw.memory.totalGB || 8) * 1024;
    resources.set(ResourceType.MEMORY, {
      type: ResourceType.MEMORY,
      total: totalMemoryMB,
      used: 0,
      reserved: 0,
      available: totalMemoryMB,
      timestamp,
      unit: 'MB',
    });

    // GPU resources
    if (hw.gpu.available) {
      resources.set(ResourceType.GPU, {
        type: ResourceType.GPU,
        total: 1, // Normalized GPU units
        used: 0,
        reserved: 0,
        available: 1,
        timestamp,
        unit: 'gpu',
      });
    }

    // Network resources
    if (hw.network.downlinkMbps) {
      resources.set(ResourceType.NETWORK, {
        type: ResourceType.NETWORK,
        total: hw.network.downlinkMbps,
        used: 0,
        reserved: 0,
        available: hw.network.downlinkMbps,
        timestamp,
        unit: 'Mbps',
      });
    }

    // Storage resources (arbitrary baseline)
    resources.set(ResourceType.STORAGE, {
      type: ResourceType.STORAGE,
      total: 100,
      used: 0,
      reserved: 0,
      available: 100,
      timestamp,
      unit: 'iops',
    });

    // Token resources (for API calls)
    resources.set(ResourceType.TOKENS, {
      type: ResourceType.TOKENS,
      total: 1000000, // 1M tokens per hour baseline
      used: 0,
      reserved: 0,
      available: 1000000,
      timestamp,
      unit: 'tokens',
    });

    // API rate resources
    resources.set(ResourceType.API_RATE, {
      type: ResourceType.API_RATE,
      total: 100, // Normalized rate limit
      used: 0,
      reserved: 0,
      available: 100,
      timestamp,
      unit: 'requests',
    });

    return resources;
  }

  /**
   * Initialize resource baselines for anomaly detection
   */
  private initializeResourceBaselines(): void {
    if (!this.state) return;

    for (const [type, snapshot] of this.state.resources) {
      this.resourceBaselines.set(type, snapshot.total);
    }
  }

  // ========================================================================
  // STATE ACCESS
  // ========================================================================

  /**
   * Get current MPC state
   *
   * @returns Current state or null if not initialized
   */
  getCurrentState(): MPCState | null {
    return this.state;
  }

  /**
   * Get state history
   *
   * @param limit - Maximum number of states to return
   * @returns Array of historical states
   */
  getStateHistory(limit?: number): MPCState[] {
    if (limit) {
      return this.stateHistory.slice(-limit);
    }
    return [...this.stateHistory];
  }

  /**
   * Get state by ID
   *
   * @param stateId - State ID to retrieve
   * @returns State if found, undefined otherwise
   */
  getStateById(stateId: string): MPCState | undefined {
    return this.stateHistory.find((s) => s.id === stateId);
  }

  /**
   * Get state transitions
   *
   * @param limit - Maximum number of transitions to return
   * @returns Array of state transitions
   */
  getTransitions(limit?: number): StateTransition[] {
    if (limit) {
      return this.transitions.slice(-limit);
    }
    return [...this.transitions];
  }

  // ========================================================================
  // TASK MANAGEMENT
  // ========================================================================

  /**
   * Add a new task to the state
   *
   * @param task - Task to add
   * @throws {Error} If task with same ID exists
   */
  async addTask(task: MPCTask): Promise<void> {
    if (!this.state) {
      throw new Error('State manager not initialized');
    }

    if (this.state.tasks.has(task.id)) {
      throw new Error(`Task already exists: ${task.id}`);
    }

    // Validate task
    this.validateTask(task);

    // Add task to state
    this.state.tasks.set(task.id, task);

    // Update state timestamp
    this.state.timestamp = Date.now();
  }

  /**
   * Update an existing task
   *
   * @param taskId - Task ID to update
   * @param updates - Partial task updates
   * @throws {Error} If task not found
   */
  async updateTask(taskId: string, updates: Partial<MPCTask>): Promise<void> {
    if (!this.state) {
      throw new Error('State manager not initialized');
    }

    const task = this.state.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Apply updates
    const updatedTask = { ...task, ...updates };
    this.state.tasks.set(taskId, updatedTask);

    // Update state timestamp
    this.state.timestamp = Date.now();

    // Record transition
    this.recordTransition(
      {
        type: 'task_complete',
        description: `Task updated: ${taskId}`,
        data: { taskId, updates },
      },
      []
    );
  }

  /**
   * Remove a task from the state
   *
   * @param taskId - Task ID to remove
   * @returns True if task was removed, false if not found
   */
  async removeTask(taskId: string): Promise<boolean> {
    if (!this.state) {
      return false;
    }

    const removed = this.state.tasks.delete(taskId);
    if (removed) {
      this.state.timestamp = Date.now();
    }

    return removed;
  }

  /**
   * Get a task by ID
   *
   * @param taskId - Task ID
   * @returns Task or undefined if not found
   */
  getTask(taskId: string): MPCTask | undefined {
    return this.state?.tasks.get(taskId);
  }

  /**
   * Get all tasks
   *
   * @param filter - Optional filter function
   * @returns Array of tasks
   */
  getTasks(filter?: (task: MPCTask) => boolean): MPCTask[] {
    if (!this.state) {
      return [];
    }

    const tasks = Array.from(this.state.tasks.values());
    return filter ? tasks.filter(filter) : tasks;
  }

  /**
   * Get tasks by status
   *
   * @param status - Task status
   * @returns Array of tasks with the given status
   */
  getTasksByStatus(status: MPCTask['status']): MPCTask[] {
    return this.getTasks((task) => task.status === status);
  }

  /**
   * Get tasks by priority
   *
   * @param priority - Task priority
   * @returns Array of tasks with the given priority
   */
  getTasksByPriority(priority: TaskPriority): MPCTask[] {
    return this.getTasks((task) => task.priority === priority);
  }

  // ========================================================================
  // AGENT STATE MANAGEMENT
  // ========================================================================

  /**
   * Register an agent in the state
   *
   * @param agent - Agent definition
   */
  async registerAgent(agent: AgentDefinition): Promise<void> {
    if (!this.state) {
      throw new Error('State manager not initialized');
    }

    const agentState: AgentExecutionState = {
      agentId: agent.id,
      agent,
      status: 'idle' as AgentState,
      resourcesUsed: new Map(),
      progress: 0,
      retries: 0,
      lastUpdate: Date.now(),
    };

    this.state.agents.set(agent.id, agentState);
    this.state.timestamp = Date.now();
  }

  /**
   * Update agent state
   *
   * @param agentId - Agent ID
   * @param updates - Partial agent state updates
   * @throws {Error} If agent not found
   */
  async updateAgentState(
    agentId: string,
    updates: Partial<AgentExecutionState>
  ): Promise<void> {
    if (!this.state) {
      throw new Error('State manager not initialized');
    }

    const agentState = this.state.agents.get(agentId);
    if (!agentState) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Apply updates
    const updatedState = {
      ...agentState,
      ...updates,
      lastUpdate: Date.now(),
    };

    this.state.agents.set(agentId, updatedState);
    this.state.timestamp = Date.now();
  }

  /**
   * Get agent state by ID
   *
   * @param agentId - Agent ID
   * @returns Agent state or undefined if not found
   */
  getAgentState(agentId: string): AgentExecutionState | undefined {
    return this.state?.agents.get(agentId);
  }

  /**
   * Get all agent states
   *
   * @returns Map of agent ID to agent state
   */
  getAllAgentStates(): Map<string, AgentExecutionState> {
    if (!this.state) {
      return new Map();
    }
    return new Map(this.state.agents);
  }

  // ========================================================================
  // RESOURCE MANAGEMENT
  // ========================================================================

  /**
   * Get resource snapshot
   *
   * @param resourceType - Resource type
   * @returns Resource snapshot or undefined if not found
   */
  getResource(resourceType: ResourceType): ResourceSnapshot | undefined {
    return this.state?.resources.get(resourceType);
  }

  /**
   * Get all resource snapshots
   *
   * @returns Map of resource type to snapshot
   */
  getAllResources(): Map<ResourceType, ResourceSnapshot> {
    if (!this.state) {
      return new Map();
    }
    return new Map(this.state.resources);
  }

  /**
   * Update resource usage
   *
   * @param resourceType - Resource type
   * @param used - Amount used
   * @param reserved - Amount reserved
   */
  async updateResourceUsage(
    resourceType: ResourceType,
    used: number,
    reserved: number
  ): Promise<void> {
    if (!this.state) {
      throw new Error('State manager not initialized');
    }

    const snapshot = this.state.resources.get(resourceType);
    if (!snapshot) {
      throw new Error(`Resource not found: ${resourceType}`);
    }

    // Update snapshot
    const updated: ResourceSnapshot = {
      ...snapshot,
      used,
      reserved,
      available: snapshot.total - used - reserved,
      timestamp: Date.now(),
    };

    this.state.resources.set(resourceType, updated);
    this.state.timestamp = Date.now();

    // Check for anomalies
    await this.checkResourceAnomalies(resourceType, updated);
  }

  /**
   * Reserve resources for a task
   *
   * @param resourceType - Resource type
   * @param amount - Amount to reserve
   * @returns True if reservation successful, false if insufficient resources
   */
  async reserveResources(resourceType: ResourceType, amount: number): Promise<boolean> {
    const snapshot = this.getResource(resourceType);
    if (!snapshot) {
      return false;
    }

    const newReserved = snapshot.reserved + amount;
    if (newReserved > snapshot.available) {
      return false;
    }

    await this.updateResourceUsage(resourceType, snapshot.used, newReserved);
    return true;
  }

  /**
   * Allocate reserved resources (convert reserved to used)
   *
   * @param resourceType - Resource type
   * @param amount - Amount to allocate
   */
  async allocateResources(resourceType: ResourceType, amount: number): Promise<void> {
    const snapshot = this.getResource(resourceType);
    if (!snapshot) {
      throw new Error(`Resource not found: ${resourceType}`);
    }

    const newUsed = snapshot.used + amount;
    const newReserved = snapshot.reserved - amount;

    await this.updateResourceUsage(resourceType, newUsed, newReserved);
  }

  /**
   * Release resources
   *
   * @param resourceType - Resource type
   * @param amount - Amount to release
   * @param fromUsed - Release from used (true) or reserved (false)
   */
  async releaseResources(
    resourceType: ResourceType,
    amount: number,
    fromUsed: boolean = true
  ): Promise<void> {
    const snapshot = this.getResource(resourceType);
    if (!snapshot) {
      throw new Error(`Resource not found: ${resourceType}`);
    }

    if (fromUsed) {
      const newUsed = Math.max(0, snapshot.used - amount);
      await this.updateResourceUsage(resourceType, newUsed, snapshot.reserved);
    } else {
      const newReserved = Math.max(0, snapshot.reserved - amount);
      await this.updateResourceUsage(resourceType, snapshot.used, newReserved);
    }
  }

  // ========================================================================
  // ANOMALY DETECTION
  // ========================================================================

  /**
   * Check for resource anomalies
   *
   * @param resourceType - Resource type
   * @param snapshot - Current resource snapshot
   */
  private async checkResourceAnomalies(
    resourceType: ResourceType,
    snapshot: ResourceSnapshot
  ): Promise<void> {
    const baseline = this.resourceBaselines.get(resourceType);
    if (baseline === undefined) {
      return;
    }

    // Calculate utilization
    const utilization = snapshot.used / baseline;

    // Check for spike (> 90% utilization)
    if (utilization > 0.9) {
      const anomaly: AnomalyDetection = {
        id: this.generateAnomalyId(),
        type: 'resource_spike',
        severity: utilization,
        description: `Resource spike detected: ${resourceType} at ${(utilization * 100).toFixed(1)}% utilization`,
        timestamp: Date.now(),
        affected: [
          {
            type: 'resource',
            id: resourceType,
            deviation: utilization - 0.7, // Deviation from 70% baseline
          },
        ],
        suggestedActions: [
          'Scale down concurrent tasks',
          'Reallocate tasks to other resources',
          'Increase resource capacity if possible',
        ],
      };

      this.emit(MPCEventTypes.ANOMALY_DETECTED, {
        type: MPCEventTypes.ANOMALY_DETECTED,
        timestamp: Date.now(),
        data: { anomaly },
        source: 'StateManager',
      });
    }
  }

  /**
   * Detect anomalies in current state
   *
   * @returns Array of detected anomalies
   */
  async detectAnomalies(): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    if (!this.state) {
      return anomalies;
    }

    // Check for unexpected agent states
    for (const [agentId, agentState] of this.state.agents) {
      if (agentState.status === 'error') {
        anomalies.push({
          id: this.generateAnomalyId(),
          type: 'unexpected_state',
          severity: 0.8,
          description: `Agent in error state: ${agentId}`,
          timestamp: Date.now(),
          affected: [
            {
              type: 'agent',
              id: agentId,
              deviation: 1,
            },
          ],
          suggestedActions: [
            'Restart agent',
            'Check agent logs',
            'Reassign agent tasks',
          ],
        });
      }
    }

    // Check for prediction errors (tasks taking longer than estimated)
    for (const [taskId, task] of this.state.tasks) {
      if (task.status === 'running' && task.actualStart) {
        const elapsed = (Date.now() - task.actualStart) / 1000;
        const estimated = task.estimatedDuration;

        if (elapsed > estimated * 1.5) {
          // 50% over estimate
          anomalies.push({
            id: this.generateAnomalyId(),
            type: 'prediction_error',
            severity: Math.min(1, (elapsed - estimated) / estimated),
            description: `Task ${taskId} exceeding estimated time: ${elapsed.toFixed(1)}s vs ${estimated}s`,
            timestamp: Date.now(),
            affected: [
              {
                type: 'task',
                id: taskId,
                deviation: (elapsed - estimated) / estimated,
              },
            ],
            suggestedActions: [
              'Replan with updated estimates',
              'Allocate more resources',
              'Split task into smaller tasks',
            ],
          });
        }
      }
    }

    // Check for deadlocks (tasks pending with all dependencies complete)
    for (const [taskId, task] of this.state.tasks) {
      if (task.status === 'pending') {
        const allDepsComplete = task.dependencies.every(
          (depId) => {
            const dep = this.state?.tasks.get(depId);
            return dep?.status === 'complete';
          }
        );

        if (allDepsComplete && task.dependencies.length > 0) {
          anomalies.push({
            id: this.generateAnomalyId(),
            type: 'deadlock',
            severity: 0.9,
            description: `Task ${taskId} ready but not scheduled`,
            timestamp: Date.now(),
            affected: [
              {
                type: 'task',
                id: taskId,
                deviation: 1,
              },
            ],
            suggestedActions: [
              'Schedule task immediately',
              'Check for resource conflicts',
              'Verify agent availability',
            ],
          });
        }
      }
    }

    return anomalies;
  }

  // ========================================================================
  // STATE TRANSITIONS
  // ========================================================================

  /**
   * Record a state transition
   *
   * @param trigger - Trigger information
   * @param actions - Actions taken during transition
   */
  private recordTransition(
    trigger: StateTransition['trigger'],
    actions: StateTransition['actions']
  ): void {
    if (!this.state) {
      return;
    }

    const fromState = this.stateHistory[this.stateHistory.length - 1] || this.state;

    const transition: StateTransition = {
      id: this.generateTransitionId(),
      from: fromState,
      to: this.state,
      timestamp: Date.now(),
      trigger,
      actions,
    };

    this.transitions.push(transition);
  }

  /**
   * Commit current state to history
   */
  async commitState(): Promise<void> {
    if (!this.state) {
      return;
    }

    // Add to history
    this.stateHistory.push(this.cloneState(this.state));

    // Trim history if needed
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    // Update metrics
    this.updateMetrics();
  }

  /**
   * Clone state (deep copy)
   *
   * @param state - State to clone
   * @returns Cloned state
   */
  private cloneState(state: MPCState): MPCState {
    return {
      ...state,
      agents: new Map(state.agents),
      tasks: new Map(state.tasks),
      resources: new Map(state.resources),
      currentPlan: state.currentPlan
        ? { ...state.currentPlan }
        : undefined,
    };
  }

  // ========================================================================
  // METRICS
  // ========================================================================

  /**
   * Update MPC metrics
   */
  private updateMetrics(): void {
    if (!this.state) {
      return;
    }

    const completedTasks = this.getTasksByStatus('complete');
    const failedTasks = this.getTasksByStatus('failed');

    this.state.metrics.totalCompleted = completedTasks.length;
    this.state.metrics.totalFailed = failedTasks.length;

    // Average completion time
    const completionTimes = completedTasks
      .filter((t) => t.completedAt && t.actualStart)
      .map((t) => t.completedAt! - t.actualStart!);

    if (completionTimes.length > 0) {
      this.state.metrics.avgCompletionTime =
        completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
    }

    // Average quality score
    const qualityScores = completedTasks
      .filter((t) => t.qualityScore !== undefined)
      .map((t) => t.qualityScore!);

    if (qualityScores.length > 0) {
      this.state.metrics.avgQualityScore =
        qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    }

    // Resource utilization
    const totalResources = Array.from(this.state.resources.values()).length;
    if (totalResources > 0) {
      const avgUtilization =
        Array.from(this.state.resources.values())
          .reduce((sum, r) => sum + r.used / r.total, 0) / totalResources;
      this.state.metrics.resourceUtilization = avgUtilization;
    }
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  /**
   * Validate task
   *
   * @param task - Task to validate
   * @throws {Error} If task is invalid
   */
  private validateTask(task: MPCTask): void {
    if (!task.id?.trim()) {
      throw new Error('Task ID is required');
    }

    if (!task.name?.trim()) {
      throw new Error('Task name is required');
    }

    if (!task.agentId?.trim()) {
      throw new Error('Agent ID is required');
    }

    if (task.estimatedDuration <= 0) {
      throw new Error('Estimated duration must be positive');
    }

    if (task.priority < TaskPriority.LOW || task.priority > TaskPriority.CRITICAL) {
      throw new Error('Invalid task priority');
    }
  }

  /**
   * Validate current state
   *
   * @returns Validation result
   */
  async validate(): Promise<MPCValidationResult> {
    const errors: MPCValidationResult['errors'] = [];

    if (!this.state) {
      errors.push({
        code: 'STATE_NOT_INITIALIZED',
        message: 'State manager not initialized',
        severity: 'error',
        context: {},
      });
      return { valid: false, errors, timestamp: Date.now() };
    }

    // Validate resource consistency
    for (const [type, snapshot] of this.state.resources) {
      if (snapshot.used < 0 || snapshot.reserved < 0) {
        errors.push({
          code: 'NEGATIVE_RESOURCE_USAGE',
          message: `Negative resource usage for ${type}`,
          severity: 'error',
          context: { type, snapshot },
        });
      }

      if (snapshot.used + snapshot.reserved > snapshot.total) {
        errors.push({
          code: 'RESOURCE_OVERFLOW',
          message: `Resource overflow for ${type}`,
          severity: 'error',
          context: { type, snapshot },
        });
      }
    }

    // Validate task dependencies
    for (const [taskId, task] of this.state.tasks) {
      for (const depId of task.dependencies) {
        if (!this.state.tasks.has(depId)) {
          errors.push({
            code: 'MISSING_DEPENDENCY',
            message: `Task ${taskId} depends on non-existent task ${depId}`,
            severity: 'warning',
            context: { taskId, depId },
          });
        }
      }
    }

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      timestamp: Date.now(),
    };
  }

  // ========================================================================
  // EVENT HANDLING
  // ========================================================================

  /**
   * Add event listener
   *
   * @param eventType - Event type to listen for
   * @param listener - Event listener callback
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
   *
   * @param eventType - Event type
   * @param listener - Event listener to remove
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
   * Emit event to all listeners
   *
   * @param eventType - Event type
   * @param event - Event data
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

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Generate unique state ID
   */
  private generateStateId(): string {
    return `state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique anomaly ID
   */
  private generateAnomalyId(): string {
    return `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique transition ID
   */
  private generateTransitionId(): string {
    return `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset state manager
   */
  async reset(): Promise<void> {
    this.state = null;
    this.stateHistory = [];
    this.transitions = [];
    this.resourceBaselines.clear();
  }
}

/**
 * Global state manager singleton instance
 */
export const stateManager = new MPCStateManager();
