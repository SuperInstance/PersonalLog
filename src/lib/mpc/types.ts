/**
 * MPC (Model Predictive Control) Orchestrator Types
 *
 * Comprehensive type definitions for the MPC multi-agent optimization system.
 * MPC enables coordinated agent execution with predictive planning and optimization.
 */

import type { AgentState, AgentDefinition } from '@/lib/agents/types';
import type { HardwareProfile } from '@/lib/hardware/types';

// ============================================================================
// CORE MPC TYPES
// ============================================================================

/**
 * MPC system status
 */
export enum MPCStatus {
  /** MPC is idle and ready to plan */
  IDLE = 'idle',
  /** MPC is generating a plan */
  PLANNING = 'planning',
  /** MPC is executing a plan */
  EXECUTING = 'executing',
  /** MPC is paused */
  PAUSED = 'paused',
  /** MPC encountered an error */
  ERROR = 'error',
}

/**
 * Resource types for tracking and allocation
 */
export enum ResourceType {
  /** GPU compute resources */
  GPU = 'gpu',
  /** CPU compute resources */
  CPU = 'cpu',
  /** Memory allocation */
  MEMORY = 'memory',
  /** Network bandwidth */
  NETWORK = 'network',
  /** API rate limits */
  API_RATE = 'api_rate',
  /** Storage I/O */
  STORAGE = 'storage',
  /** Token budget (for AI API calls) */
  TOKENS = 'tokens',
}

/**
 * Priority levels for tasks and agents
 */
export enum TaskPriority {
  /** Low priority - background tasks */
  LOW = 1,
  /** Normal priority - default */
  NORMAL = 2,
  /** High priority - user-facing tasks */
  HIGH = 3,
  /** Critical priority - urgent tasks */
  CRITICAL = 4,
}

// ============================================================================
// STATE MANAGEMENT TYPES
// ============================================================================

/**
 * Resource availability snapshot
 */
export interface ResourceSnapshot {
  /** Resource type */
  type: ResourceType;
  /** Total available capacity */
  total: number;
  /** Currently used capacity */
  used: number;
  /** Reserved capacity (for planned tasks) */
  reserved: number;
  /** Available capacity (total - used - reserved) */
  available: number;
  /** Measurement timestamp */
  timestamp: number;
  /** Unit (e.g., 'MB', 'cores', 'tokens', 'Mbps') */
  unit: string;
}

/**
 * Agent execution state
 */
export interface AgentExecutionState {
  /** Agent ID */
  agentId: string;
  /** Agent definition */
  agent: AgentDefinition;
  /** Current agent status */
  status: AgentState;
  /** Task ID this agent is working on */
  currentTaskId?: string;
  /** Resources currently being used */
  resourcesUsed: Map<ResourceType, number>;
  /** Start time of current task */
  startTime?: number;
  /** Expected completion time */
  expectedEndTime?: number;
  /** Progress (0-1) */
  progress: number;
  /** Number of retries */
  retries: number;
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Task definition for MPC planning
 */
export interface MPCTask {
  /** Unique task ID */
  id: string;
  /** Task name */
  name: string;
  /** Task description */
  description: string;
  /** Agent ID assigned to execute */
  agentId: string;
  /** Task priority */
  priority: TaskPriority;
  /** Estimated completion time (seconds) */
  estimatedDuration: number;
  /** Expected resource usage */
  resourceRequirements: Map<ResourceType, number>;
  /** Task dependencies (task IDs) */
  dependencies: string[];
  /** Creation timestamp */
  createdAt: number;
  /** Scheduled start time */
  scheduledStart?: number;
  /** Actual start time */
  actualStart?: number;
  /** Completion timestamp */
  completedAt?: number;
  /** Task status */
  status: 'pending' | 'scheduled' | 'running' | 'complete' | 'failed' | 'cancelled';
  /** Result data */
  result?: unknown;
  /** Error if failed */
  error?: Error;
  /** Quality score (0-1) */
  qualityScore?: number;
  /** Success probability (0-1) */
  successProbability?: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete MPC system state
 */
export interface MPCState {
  /** State ID (unique) */
  id: string;
  /** Timestamp of this state */
  timestamp: number;
  /** MPC system status */
  status: MPCStatus;
  /** All agent states */
  agents: Map<string, AgentExecutionState>;
  /** All tasks (pending, running, complete) */
  tasks: Map<string, MPCTask>;
  /** Current resource availability */
  resources: Map<ResourceType, ResourceSnapshot>;
  /** Current plan being executed */
  currentPlan?: MPCPlan;
  /** Error message if in ERROR status */
  error?: string;
  /** Metrics */
  metrics: MPCMetrics;
}

/**
 * MPC metrics for tracking performance
 */
export interface MPCMetrics {
  /** Total tasks completed */
  totalCompleted: number;
  /** Total tasks failed */
  totalFailed: number;
  /** Average completion time (ms) */
  avgCompletionTime: number;
  /** Average quality score (0-1) */
  avgQualityScore: number;
  /** Total time saved by optimization (ms) */
  totalTimeSaved: number;
  /** Resource utilization (0-1) */
  resourceUtilization: number;
  /** Coordination overhead ratio (0-1) */
  coordinationOverhead: number;
  /** Number of replans */
  replanCount: number;
  /** Prediction accuracy (0-1) */
  predictionAccuracy: number;
  /** Current parallelization level */
  parallelizationLevel: number;
}

// ============================================================================
// PREDICTION TYPES
// ============================================================================

/**
 * Prediction result with confidence interval
 */
export interface Prediction<T> {
  /** Predicted value */
  value: T;
  /** Confidence level (0-1) */
  confidence: number;
  /** Lower bound of confidence interval */
  lowerBound: T;
  /** Upper bound of confidence interval */
  upperBound: T;
  /** Prediction timestamp */
  timestamp: number;
}

/**
 * Agent outcome prediction
 */
export interface AgentOutcomePrediction {
  /** Agent ID */
  agentId: string;
  /** Task ID */
  taskId: string;
  /** Success probability (0-1) */
  successProbability: Prediction<number>;
  /** Expected quality score (0-1) */
  qualityScore: Prediction<number>;
  /** Potential failure modes */
  potentialFailures: Array<{
    /** Failure mode name */
    mode: string;
    /** Probability (0-1) */
    probability: number;
    /** Mitigation strategies */
    mitigations: string[];
  }>;
}

/**
 * Resource usage prediction
 */
export interface ResourceUsagePrediction {
  /** Resource type */
  resourceType: ResourceType;
  /** Predicted usage amount */
  usage: Prediction<number>;
  /** Predicted peak usage */
  peakUsage: Prediction<number>;
  /** Predicted duration */
  duration: Prediction<number>;
  /** Resource conflicts predicted */
  conflicts: ResourceConflict[];
}

/**
 * Resource conflict prediction
 */
export interface ResourceConflict {
  /** Conflict ID */
  id: string;
  /** Resource type */
  resourceType: ResourceType;
  /** Conflicting task IDs */
  taskIds: string[];
  /** Conflict severity (0-1) */
  severity: number;
  /** Conflict type */
  type: 'contention' | 'exhaustion' | 'dependency' | 'priority';
  /** Time window of conflict */
  timeWindow: {
    /** Start time */
    start: number;
    /** End time */
    end: number;
  };
  /** Suggested resolution */
  resolution?: {
    /** Resolution strategy */
    strategy: 'reschedule' | 'reallocate' | 'prioritize' | 'batch';
    /** Resolution details */
    details: Record<string, unknown>;
  };
}

/**
 * Completion time prediction
 */
export interface CompletionTimePrediction {
  /** Task ID */
  taskId: string;
  /** Predicted completion time (timestamp) */
  completionTime: Prediction<number>;
  /** Predicted duration (seconds) */
  duration: Prediction<number>;
  /** Factors affecting prediction */
  factors: Array<{
    /** Factor name */
    factor: string;
    /** Impact magnitude (-1 to 1) */
    impact: number;
    /** Confidence in this factor */
    confidence: number;
  }>;
}

/**
 * Scenario simulation result
 */
export interface ScenarioSimulation {
  /** Scenario ID */
  id: string;
  /** Scenario description */
  description: string;
  /** Modified variables */
  modifications: Array<{
    /** Variable path */
    variable: string;
    /** Original value */
    original: unknown;
    /** Modified value */
    modified: unknown;
  }>;
  /** Simulated state */
  simulatedState: MPCState;
  /** Simulated plan */
  simulatedPlan?: MPCPlan;
  /** Predicted outcomes */
  outcomes: {
    /** Expected completion time */
    completionTime: number;
    /** Expected quality score */
    qualityScore: number;
    /** Resource utilization */
    resourceUtilization: number;
    /** Risk level (0-1) */
    risk: number;
  };
  /** Comparison to baseline */
  comparison: {
    /** Time difference (ms) */
    timeDiff: number;
    /** Quality difference */
    qualityDiff: number;
    /** Resource utilization difference */
    resourceUtilDiff: number;
    /** Risk difference */
    riskDiff: number;
  };
}

// ============================================================================
// PLANNING TYPES
// ============================================================================

/**
 * Planning horizon configuration
 */
export interface PlanningHorizon {
  /** Number of steps to plan ahead */
  steps: number;
  /** Step duration in seconds */
  stepDuration: number;
  /** Total horizon duration (steps * stepDuration) */
  totalDuration: number;
  /** Replanning interval (seconds) */
  replanInterval: number;
}

/**
 * Cost function weights
 */
export interface CostWeights {
  /** Weight for completion time (lower is better) */
  timeWeight: number;
  /** Weight for quality score (higher is better) */
  qualityWeight: number;
  /** Weight for resource efficiency (lower usage is better) */
  resourceWeight: number;
  /** Weight for risk (lower is better) */
  riskWeight: number;
  /** Weight for priority (higher priority tasks get preference) */
  priorityWeight: number;
}

/**
 * Optimization objective
 */
export interface OptimizationObjective {
  /** Objective name */
  name: string;
  /** Objective description */
  description: string;
  /** Cost function weights */
  weights: CostWeights;
  /** Constraints */
  constraints: Array<{
    /** Constraint name */
    name: string;
    /** Constraint type */
    type: 'max_time' | 'min_quality' | 'max_resources' | 'max_risk';
    /** Constraint value */
    value: number;
    /** Is constraint strict (must satisfy) or soft (prefer to satisfy) */
    strict: boolean;
  }>;
}

/**
 * MPC plan execution step
 */
export interface MPCPlanStep {
  /** Step number */
  step: number;
  /** Tasks to execute in this step */
  tasks: string[];
  /** Step start time (timestamp) */
  startTime: number;
  /** Step end time (timestamp) */
  endTime: number;
  /** Expected resource usage */
  resourceUsage: Map<ResourceType, number>;
  /** Dependencies satisfied by this step */
  dependenciesSatisfied: string[];
  /** Risk level (0-1) */
  risk: number;
  /** Confidence in this step (0-1) */
  confidence: number;
}

/**
 * Complete MPC plan
 */
export interface MPCPlan {
  /** Plan ID */
  id: string;
  /** Plan creation timestamp */
  createdAt: number;
  /** Planning horizon used */
  horizon: PlanningHorizon;
  /** Optimization objective */
  objective: OptimizationObjective;
  /** Plan steps */
  steps: MPCPlanStep[];
  /** Expected completion time */
  expectedCompletionTime: number;
  /** Expected quality score */
  expectedQuality: number;
  /** Total cost (from cost function) */
  totalCost: number;
  /** Risk level (0-1) */
  risk: number;
  /** Confidence in plan (0-1) */
  confidence: number;
  /** Predicted conflicts */
  predictedConflicts: ResourceConflict[];
  /** Resource allocation timeline */
  resourceAllocation: Array<{
    /** Timestamp */
    time: number;
    /** Resource usage snapshot */
    usage: Map<ResourceType, number>;
  }>;
  /** Agent assignments */
  agentAssignments: Map<string, string[]>; // agentId -> taskIds
  /** Metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// CONTROLLER TYPES
// ============================================================================

/**
 * MPC controller configuration
 */
export interface MPCConfig {
  /** Planning horizon configuration */
  horizon: PlanningHorizon;
  /** Optimization objective */
  objective: OptimizationObjective;
  /** Maximum parallel agents */
  maxParallelAgents: number;
  /** Enable replanning on state change */
  enableReplanning: number;
  /** Prediction update interval (ms) */
  predictionUpdateInterval: number;
  /** State history size */
  stateHistorySize: number;
  /** Anomaly detection threshold (0-1) */
  anomalyThreshold: number;
  /** Conflict prevention strategy */
  conflictStrategy: 'preventive' | 'reactive' | 'hybrid';
  /** Hardware profile for resource awareness */
  hardwareProfile: HardwareProfile;
}

/**
 * MPC controller event types
 */
export enum MPCEventType {
  /** Plan created */
  PLAN_CREATED = 'plan_created',
  /** Plan execution started */
  PLAN_STARTED = 'plan_started',
  /** Plan execution completed */
  PLAN_COMPLETED = 'plan_completed',
  /** Plan failed */
  PLAN_FAILED = 'plan_failed',
  /** Replanning triggered */
  REPLAN_TRIGGERED = 'replan_triggered',
  /** Conflict detected */
  CONFLICT_DETECTED = 'conflict_detected',
  /** Conflict resolved */
  CONFLICT_RESOLVED = 'conflict_resolved',
  /** Anomaly detected */
  ANOMALY_DETECTED = 'anomaly_detected',
  /** State changed */
  STATE_CHANGED = 'state_changed',
  /** Agent assigned */
  AGENT_ASSIGNED = 'agent_assigned',
  /** Task completed */
  TASK_COMPLETED = 'task_completed',
  /** Task failed */
  TASK_FAILED = 'task_failed',
}

/**
 * MPC event
 */
export interface MPCEvent {
  /** Event type */
  type: MPCEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data: Record<string, unknown>;
  /** Source of event */
  source: string;
}

/**
 * MPC event listener
 */
export type MPCEventListener = (event: MPCEvent) => void | Promise<void>;

/**
 * Observer function type
 * Observes current state and returns observations
 */
export type MPCObserver = (state: MPCState) => Promise<Record<string, unknown>>;

/**
 * Predictor function type
 * Predicts future states based on current state and observations
 */
export type MPCPredictor = (
  state: MPCState,
  observations: Record<string, unknown>,
  horizon: PlanningHorizon
) => Promise<MPCState[]>;

/**
 * Optimizer function type
 * Optimizes actions to minimize cost function
 */
export type MPCOptimizer = (
  predictedStates: MPCState[],
  objective: OptimizationObjective,
  currentPlan?: MPCPlan
) => Promise<MPCPlan>;

/**
 * Action executor function type
 * Executes actions from the plan
 */
export type MPCActionExecutor = (
  plan: MPCPlan,
  state: MPCState
) => Promise<Map<string, unknown>>;

// ============================================================================
// ANOMALY DETECTION TYPES
// ============================================================================

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  /** Anomaly ID */
  id: string;
  /** Anomaly type */
  type: 'resource_spike' | 'unexpected_state' | 'prediction_error' | 'performance_drop' | 'deadlock';
  /** Anomaly severity (0-1) */
  severity: number;
  /** Anomaly description */
  description: string;
  /** Detection timestamp */
  timestamp: number;
  /** Affected resources/agents/tasks */
  affected: Array<{
    /** Type of affected entity */
    type: 'agent' | 'task' | 'resource';
    /** Entity ID */
    id: string;
    /** Deviation from expected */
    deviation: number;
  }>;
  /** Suggested actions */
  suggestedActions: string[];
}

// ============================================================================
// STATE TRANSITION TYPES
// ============================================================================

/**
 * State transition
 */
export interface StateTransition {
  /** Transition ID */
  id: string;
  /** From state */
  from: MPCState;
  /** To state */
  to: MPCState;
  /** Transition timestamp */
  timestamp: number;
  /** Trigger for transition */
  trigger: {
    /** Trigger type */
    type: 'task_complete' | 'task_fail' | 'resource_change' | 'replan' | 'manual';
    /** Trigger description */
    description: string;
    /** Trigger data */
    data: Record<string, unknown>;
  };
  /** Actions taken during transition */
  actions: Array<{
    /** Action type */
    type: string;
    /** Action description */
    description: string;
    /** Action result */
    result: unknown;
  }>;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * MPC system validation result
 */
export interface MPCValidationResult {
  /** Overall validity */
  valid: boolean;
  /** Validation errors */
  errors: Array<{
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Severity */
    severity: 'error' | 'warning';
    /** Context */
    context: Record<string, unknown>;
  }>;
  /** Validation timestamp */
  timestamp: number;
}
