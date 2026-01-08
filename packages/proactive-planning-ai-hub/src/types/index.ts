/**
 * Proactive Planning AI Hub - Core Types
 *
 * Unified type definitions for the proactive planning system
 * combining intelligence hub, proactive engine, MPC, and world modeling.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type SystemStatus = 'idle' | 'planning' | 'executing' | 'paused' | 'error';

export type Priority = 'low' | 'normal' | 'high' | 'critical';

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  version: string;
}

export type AgentState = 'idle' | 'running' | 'paused' | 'error' | 'complete';

export interface AgentExecutionState {
  agentId: string;
  agent: AgentDefinition;
  status: AgentState;
  currentTaskId?: string;
  progress: number;
  startTime?: number;
  expectedEndTime?: number;
  lastUpdate: number;
}

// ============================================================================
// TASK TYPES
// ============================================================================

export interface Task {
  id: string;
  name: string;
  description: string;
  agentId: string;
  priority: Priority;
  estimatedDuration: number;
  dependencies: string[];
  status: 'pending' | 'scheduled' | 'running' | 'complete' | 'failed' | 'cancelled';
  createdAt: number;
  scheduledStart?: number;
  actualStart?: number;
  completedAt?: number;
  result?: unknown;
  error?: Error;
  qualityScore?: number;
}

// ============================================================================
// PROACTIVE TRIGGER TYPES
// ============================================================================

export enum ProactiveTriggerType {
  CODE_WRITING = 'code_writing',
  QUESTION_DETECTED = 'question_detected',
  LONG_CONVERSATION = 'long_conversation',
  EMOTION_DETECTED = 'emotion_detected',
  COMPLEX_TASK = 'complex_task',
  HELP_REQUEST = 'help_request',
  DEBUGGING = 'debugging',
  AGENT_TRANSITION = 'agent_transition',
  TIME_BASED = 'time_based',
  CONTEXT_SWITCH = 'context_switch',
  REPETITIVE_TASK = 'repetitive_task',
}

export interface ProactiveAgentAction {
  id: string;
  agentId: string;
  triggerType: ProactiveTriggerType;
  conversationId: string;
  confidence: number;
  reason: string;
  expectedBenefit: string;
  timestamp: number;
  executed: boolean;
  userAccepted?: boolean;
  userFeedback?: 'helpful' | 'not_helpful' | 'neutral';
}

export interface ProactiveContext {
  conversationId: string;
  messageCount: number;
  conversationDuration: number;
  timeSinceLastMessage: number;
  taskCategory?: string;
  activeAgents: string[];
  recentAgentActivations: Array<{
    agentId: string;
    timestamp: number;
  }>;
  timestamp: number;
  userFocus?: {
    page: string;
    component?: string;
    activity: 'active' | 'idle' | 'away';
  };
}

// ============================================================================
// INTELLIGENCE HUB TYPES
// ============================================================================

export interface IntelligenceSettings {
  enabled: boolean;
  level: 'off' | 'basic' | 'advanced' | 'full';
  analytics: {
    enabled: boolean;
    retention: number;
    sampleRate: number;
  };
  personalization: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    explainability: boolean;
  };
  proactive: {
    enabled: boolean;
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
    autoActivate: boolean;
  };
  coordination: {
    allowConflicts: boolean;
    priority: string[];
    syncInterval: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  conflicts: Conflict[];
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
}

export interface Conflict {
  id: string;
  systems: [string, string];
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: number;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  action: string;
  priority: string;
  resolvedBy: 'auto' | 'manual';
  resolvedAt: number;
}

export interface Bottleneck {
  id: string;
  system: string;
  metric: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: number;
  suggestion?: string;
}

export interface Recommendation {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: string;
  action: {
    type: string;
    confidence: number;
    riskLevel: string;
  };
  createdAt: number;
}

// ============================================================================
// MPC TYPES
// ============================================================================

export interface MPCState {
  id: string;
  timestamp: number;
  status: SystemStatus;
  agents: Map<string, AgentExecutionState>;
  tasks: Map<string, Task>;
  resources: Map<string, ResourceSnapshot>;
  currentPlan?: MPCPlan;
  error?: string;
  metrics: MPCMetrics;
}

export interface ResourceSnapshot {
  type: string;
  total: number;
  used: number;
  reserved: number;
  available: number;
  timestamp: number;
  unit: string;
}

export interface MPCMetrics {
  totalCompleted: number;
  totalFailed: number;
  avgCompletionTime: number;
  avgQualityScore: number;
  totalTimeSaved: number;
  resourceUtilization: number;
  coordinationOverhead: number;
  replanCount: number;
  predictionAccuracy: number;
  parallelizationLevel: number;
}

export interface MPCPlan {
  id: string;
  createdAt: number;
  horizon: PlanningHorizon;
  objective: OptimizationObjective;
  steps: MPCPlanStep[];
  expectedCompletionTime: number;
  expectedQuality: number;
  totalCost: number;
  risk: number;
  confidence: number;
  predictedConflicts: ResourceConflict[];
  resourceAllocation: Array<{
    time: number;
    usage: Map<string, number>;
  }>;
  agentAssignments: Map<string, string[]>;
  metadata: Record<string, unknown>;
}

export interface PlanningHorizon {
  steps: number;
  stepDuration: number;
  totalDuration: number;
  replanInterval: number;
}

export interface OptimizationObjective {
  name: string;
  description: string;
  weights: {
    timeWeight: number;
    qualityWeight: number;
    resourceWeight: number;
    riskWeight: number;
    priorityWeight: number;
  };
  constraints: Array<{
    name: string;
    type: string;
    value: number;
    strict: boolean;
  }>;
}

export interface MPCPlanStep {
  step: number;
  tasks: string[];
  startTime: number;
  endTime: number;
  resourceUsage: Map<string, number>;
  dependenciesSatisfied: string[];
  risk: number;
  confidence: number;
}

export interface ResourceConflict {
  id: string;
  resourceType: string;
  taskIds: string[];
  severity: number;
  type: 'contention' | 'exhaustion' | 'dependency' | 'priority';
  timeWindow: {
    start: number;
    end: number;
  };
  resolution?: {
    strategy: string;
    details: Record<string, unknown>;
  };
}

export interface MPCConfig {
  horizon: PlanningHorizon;
  objective: OptimizationObjective;
  maxParallelAgents: number;
  enableReplanning: boolean;
  predictionUpdateInterval: number;
  stateHistorySize: number;
  anomalyThreshold: number;
  conflictStrategy: 'preventive' | 'reactive' | 'hybrid';
  hardwareProfile: HardwareProfile;
}

export interface HardwareProfile {
  deviceType: string;
  cores: number;
  memory: number;
  gpu: boolean;
  gpuMemory: number;
  score: number;
}

// ============================================================================
// PREDICTION TYPES
// ============================================================================

export interface Prediction<T> {
  value: T;
  confidence: number;
  lowerBound: T;
  upperBound: T;
  timestamp: number;
}

export interface AgentOutcomePrediction {
  agentId: string;
  taskId: string;
  successProbability: Prediction<number>;
  qualityScore: Prediction<number>;
  potentialFailures: Array<{
    mode: string;
    probability: number;
    mitigations: string[];
  }>;
}

export interface ResourceUsagePrediction {
  resourceType: string;
  usage: Prediction<number>;
  peakUsage: Prediction<number>;
  duration: Prediction<number>;
  conflicts: ResourceConflict[];
}

export interface CompletionTimePrediction {
  taskId: string;
  completionTime: Prediction<number>;
  duration: Prediction<number>;
  factors: Array<{
    factor: string;
    impact: number;
    confidence: number;
  }>;
}

// ============================================================================
// WORLD MODEL TYPES
// ============================================================================

export interface WorldState {
  id: string;
  timestamp: number;
  entities: Map<string, Entity>;
  relationships: Map<string, Relationship[]>;
  globalState: Record<string, unknown>;
  confidence: number;
}

export interface Entity {
  id: string;
  type: string;
  properties: Map<string, unknown>;
  state: Record<string, unknown>;
  confidence: number;
  lastUpdated: number;
}

export interface Relationship {
  from: string;
  to: string;
  type: string;
  properties: Record<string, unknown>;
  confidence: number;
}

export interface StateTransition {
  id: string;
  from: WorldState;
  to: WorldState;
  timestamp: number;
  trigger: {
    type: string;
    description: string;
    data: Record<string, unknown>;
  };
  actions: Array<{
    type: string;
    description: string;
    result: unknown;
  }>;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface SystemEvent {
  type: string;
  timestamp: number;
  source: string;
  data: Record<string, unknown>;
}

export type EventListener = (event: SystemEvent) => void | Promise<void>;

// ============================================================================
// SCENARIO SIMULATION TYPES
// ============================================================================

export interface ScenarioSimulation {
  id: string;
  description: string;
  modifications: Array<{
    variable: string;
    original: unknown;
    modified: unknown;
  }>;
  simulatedState: MPCState;
  simulatedPlan?: MPCPlan;
  outcomes: {
    completionTime: number;
    qualityScore: number;
    resourceUtilization: number;
    risk: number;
  };
  comparison: {
    timeDiff: number;
    qualityDiff: number;
    resourceUtilDiff: number;
    riskDiff: number;
  };
}
