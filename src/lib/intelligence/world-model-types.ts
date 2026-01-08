/**
 * World Model Types for Predictive State Estimation
 *
 * JEPA-style world model that predicts future conversation states
 * for proactive agent behavior and anticipation.
 *
 * Foundation for Neural MPC Phase 2: Model Predictive Control
 */

import type { EmotionRecording } from '@/lib/jepa/emotion-storage';
import type { TaskType } from '@/lib/agents/performance-types';

// ============================================================================
// CONVERSATION STATE FEATURES
// ============================================================================

/**
 * Conversation state vector representation
 * High-dimensional representation of the current conversation state
 */
export interface ConversationState {
  /** Unique state ID */
  id: string;
  /** Timestamp when this state was captured */
  timestamp: number;
  /** Conversation ID */
  conversationId: string;

  // Message features
  /** Total number of messages in conversation */
  messageCount: number;
  /** Average message length in characters */
  avgMessageLength: number;
  /** Message complexity score (0-1) */
  messageComplexity: number;
  /** Total tokens in conversation */
  totalTokens: number;

  // Agent features
  /** Active agent IDs */
  activeAgents: string[];
  /** Number of active agents */
  activeAgentCount: number;
  /** Most recently used agent */
  lastUsedAgent: string | null;

  // Task features
  /** Current task type */
  currentTaskType: TaskType | null;
  /** Task completion rate (0-1) */
  taskCompletionRate: number;
  /** Number of tasks in progress */
  tasksInProgress: number;

  // Emotion features (from JEPA)
  /** Current emotion state */
  emotionState: EmotionState;
  /** Emotion trend (improving, stable, declining) */
  emotionTrend: 'improving' | 'stable' | 'declining';
  /** Emotion intensity (0-1) */
  emotionIntensity: number;

  // Topic features
  /** Current topic/subject (derived) */
  currentTopic: string;
  /** Topic confidence (0-1) */
  topicConfidence: number;
  /** Number of topic shifts in conversation */
  topicShifts: number;

  // User intent
  /** Inferred user intent */
  userIntent: UserIntent;
  /** Intent confidence (0-1) */
  intentConfidence: number;

  // Resource usage
  /** Estimated token usage for next operation */
  estimatedTokenUsage: number;
  /** Estimated time for next operation (ms) */
  estimatedTimeMs: number;
  /** System load (0-1) */
  systemLoad: number;

  // Temporal features
  /** Time since last message (ms) */
  timeSinceLastMessage: number;
  /** Conversation age (ms) */
  conversationAge: number;
  /** Time of day (0-1, normalized) */
  timeOfDay: number;

  // Velocity features (rate of change)
  /** Message rate (messages/min) */
  messageRate: number;
  /** Token rate (tokens/min) */
  tokenRate: number;
  /** Agent activation rate (activations/min) */
  agentActivationRate: number;
}

/**
 * Emotion state summary from JEPA
 */
export interface EmotionState {
  /** Valence (0-1, positive/negative) */
  valence: number;
  /** Arousal (0-1, excited/calm) */
  arousal: number;
  /** Dominance (0-1, powerful/submissive) */
  dominance: number;
  /** Primary emotion category */
  category: string;
  /** Confidence in emotion detection (0-1) */
  confidence: number;
}

/**
 * Inferred user intent
 */
export const enum UserIntent {
  /** User is exploring/brainstorming */
  EXPLORING = 'exploring',
  /** User is working on a specific task */
  TASK_FOCUSED = 'task_focused',
  /** User is asking questions */
  QUESTIONING = 'questioning',
  /** User is reflecting */
  REFLECTING = 'reflecting',
  /** User is frustrated/struggling */
  STRUGGLING = 'struggling',
  /** User is satisfied/completing */
  COMPLETING = 'completing',
  /** Unknown intent */
  UNKNOWN = 'unknown',
}

// ============================================================================
// STATE TRANSITION
// ============================================================================

/**
 * State transition from one state to another
 */
export interface StateTransition {
  /** Transition ID */
  id: string;
  /** Source state ID */
  fromStateId: string;
  /** Target state ID */
  toStateId: string;
  /** Transition timestamp */
  timestamp: number;
  /** Time elapsed between states (ms) */
  timeDelta: number;
  /** What triggered this transition */
  trigger: TransitionTrigger;
  /** Transition probability (0-1, learned) */
  probability: number;
  /** Number of times this transition occurred */
  occurrenceCount: number;
}

/**
 * What triggered a state transition
 */
export const enum TransitionTrigger {
  /** User sent a message */
  USER_MESSAGE = 'user_message',
  /** Agent responded */
  AGENT_RESPONSE = 'agent_response',
  /** Agent was activated */
  AGENT_ACTIVATED = 'agent_activated',
  /** Agent was deactivated */
  AGENT_DEACTIVATED = 'agent_deactivated',
  /** Topic changed */
  TOPIC_CHANGE = 'topic_change',
  /** Task completed */
  TASK_COMPLETED = 'task_completed',
  /** Task started */
  TASK_STARTED = 'task_started',
  /** Emotion changed significantly */
  EMOTION_SHIFT = 'emotion_shift',
  /** Time passed (no action) */
  TIME_PASSED = 'time_passed',
  /** Unknown trigger */
  UNKNOWN = 'unknown',
}

// ============================================================================
// PREDICTION
// ============================================================================

/**
 * Predicted future state
 */
export interface PredictedState {
  /** Predicted state */
  state: Partial<ConversationState>;
  /** Prediction confidence (0-1) */
  confidence: number;
  /** Time horizon (how many steps ahead) */
  horizon: number;
  /** Probability of this prediction (0-1) */
  probability: number;
  /** Alternative predictions (branching futures) */
  alternatives: PredictedState[];
}

/**
 * Agent need prediction
 */
export interface AgentNeedPrediction {
  /** Agent ID */
  agentId: string;
  /** Probability that this agent will be needed (0-1) */
  probability: number;
  /** Predicted timeframe (ms from now) */
  timeframe: number;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Reason for prediction */
  reason: string;
}

/**
 * Resource usage prediction
 */
export interface ResourcePrediction {
  /** Predicted token usage */
  tokenUsage: number;
  /** Predicted time (ms) */
  timeMs: number;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Upper bound (p95) */
  upperBound: number;
  /** Lower bound (p5) */
  lowerBound: number;
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  /** Whether an anomaly was detected */
  isAnomaly: boolean;
  /** Anomaly type */
  type: AnomalyType;
  /** Anomaly severity (0-1) */
  severity: number;
  /** Description of anomaly */
  description: string;
  /** Suggested actions */
  suggestions: string[];
  /** Confidence in anomaly detection (0-1) */
  confidence: number;
}

/**
 * Types of anomalies
 */
export const enum AnomalyType {
  /** Unusual emotion pattern */
  EMOTION_ANOMALY = 'emotion_anomaly',
  /** Unexpected agent activation */
  AGENT_ANOMALY = 'agent_anomaly',
  /** Abnormal resource usage */
  RESOURCE_ANOMALY = 'resource_anomaly',
  /** Strange topic shift */
  TOPIC_ANOMALY = 'topic_anomaly',
  /** Unusual user behavior */
  BEHAVIOR_ANOMALY = 'behavior_anomaly',
  /** State transition unlikely */
  TRANSITION_ANOMALY = 'transition_anomaly',
}

// ============================================================================
// PREDICTION HORIZON
// ============================================================================

/**
 * Prediction horizon parameters
 */
export interface PredictionHorizon {
  /** Number of steps ahead to predict */
  steps: number;
  /** Time per step (ms) */
  stepSize: number;
  /** Maximum prediction window (ms) */
  maxWindow: number;
  /** Confidence decay rate (0-1 per step) */
  confidenceDecay: number;
}

/**
 * Default prediction horizons
 */
export const DEFAULT_HORIZONS = {
  SHORT_TERM: { steps: 3, stepSize: 5000, maxWindow: 15000, confidenceDecay: 0.1 }, // 15 seconds
  MEDIUM_TERM: { steps: 6, stepSize: 10000, maxWindow: 60000, confidenceDecay: 0.15 }, // 1 minute
  LONG_TERM: { steps: 12, stepSize: 30000, maxWindow: 360000, confidenceDecay: 0.2 }, // 6 minutes
} as const;

// ============================================================================
// STATE ENCODING
// ============================================================================

/**
 * Encoded state vector (compressed representation)
 */
export interface EncodedState {
  /** Compressed state vector */
  vector: Float32Array;
  /** Original state dimensions */
  originalDimensions: number;
  /** Encoding timestamp */
  timestamp: number;
  /** Encoding method used */
  method: 'pca' | 'autoencoder' | 'simple';
  /** Compression ratio */
  compressionRatio: number;
}

/**
 * State encoding configuration
 */
export interface StateEncodingConfig {
  /** Target vector dimensionality */
  targetDimensions: number;
  /** Encoding method */
  method: 'pca' | 'autoencoder' | 'simple';
  /** Normalization method */
  normalization: 'minmax' | 'zscore' | 'none';
  /** Whether to cache encodings */
  cache: boolean;
}

/**
 * State similarity result
 */
export interface StateSimilarity {
  /** Similarity score (0-1, 1 = identical) */
  similarity: number;
  /** Distance metric used */
  metric: 'cosine' | 'euclidean' | 'manhattan';
  /** Raw distance value */
  distance: number;
}

// ============================================================================
// TRANSITION LEARNING
// ============================================================================

/**
 * Transition probability matrix entry
 */
export interface TransitionProbability {
  /** From state ID */
  fromState: string;
  /** To state ID */
  toState: string;
  /** Probability (0-1) */
  probability: number;
  /** Occurrence count */
  count: number;
  /** Last seen timestamp */
  lastSeen: number;
}

/**
 * Transition pattern cluster
 */
export interface TransitionPattern {
  /** Pattern ID */
  id: string;
  /** Sequence of state IDs in pattern */
  stateSequence: string[];
  /** Pattern frequency (0-1) */
  frequency: number;
  /** Average time to complete pattern (ms) */
  avgDuration: number;
  /** Common triggers */
  commonTriggers: TransitionTrigger[];
  /** Pattern confidence (0-1) */
  confidence: number;
}

/**
 * Transition learning configuration
 */
export interface TransitionLearningConfig {
  /** Minimum occurrences to consider transition significant */
  minOccurrences: number;
  /** Maximum transition history size */
  maxHistorySize: number;
  /** Pattern mining minimum support */
  minSupport: number;
  /** Whether to use temporal decay */
  useTemporalDecay: boolean;
  /** Temporal decay rate (0-1) */
  decayRate: number;
}

// ============================================================================
// WORLD MODEL CONFIG
// ============================================================================

/**
 * World model configuration
 */
export interface WorldModelConfig {
  /** State encoding configuration */
  encoding: StateEncodingConfig;
  /** Transition learning configuration */
  transitionLearning: TransitionLearningConfig;
  /** Default prediction horizon */
  horizon: PredictionHorizon;
  /** Minimum confidence threshold for predictions */
  minConfidence: number;
  /** Maximum state history size */
  maxStateHistory: number;
  /** Whether to enable online learning */
  onlineLearning: boolean;
  /** Model update interval (ms) */
  updateInterval: number;
}

/**
 * Default world model configuration
 */
export const DEFAULT_WORLD_MODEL_CONFIG: WorldModelConfig = {
  encoding: {
    targetDimensions: 32,
    method: 'simple',
    normalization: 'minmax',
    cache: true,
  },
  transitionLearning: {
    minOccurrences: 3,
    maxHistorySize: 1000,
    minSupport: 0.1,
    useTemporalDecay: true,
    decayRate: 0.05,
  },
  horizon: DEFAULT_HORIZONS.MEDIUM_TERM,
  minConfidence: 0.3,
  maxStateHistory: 500,
  onlineLearning: true,
  updateInterval: 30000, // 30 seconds
};

// ============================================================================
// WORLD MODEL STATE
// ============================================================================

/**
 * World model internal state
 */
export interface WorldModelState {
  /** Conversation states history */
  states: ConversationState[];
  /** State transitions history */
  transitions: StateTransition[];
  /** Transition probability matrix */
  transitionMatrix: Map<string, TransitionProbability[]>;
  /** Detected transition patterns */
  patterns: TransitionPattern[];
  /** Last model update timestamp */
  lastUpdate: number;
  /** Model initialized */
  initialized: boolean;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate conversation state
 */
export function isValidConversationState(state: unknown): state is ConversationState {
  if (typeof state !== 'object' || state === null) return false;
  const s = state as Partial<ConversationState>;
  return (
    typeof s.id === 'string' &&
    typeof s.timestamp === 'number' &&
    typeof s.conversationId === 'string' &&
    typeof s.messageCount === 'number' &&
    typeof s.activeAgentCount === 'number' &&
    typeof s.emotionState === 'object' &&
    typeof s.userIntent === 'string'
  );
}

/**
 * Validate prediction horizon
 */
export function isValidPredictionHorizon(horizon: unknown): horizon is PredictionHorizon {
  if (typeof horizon !== 'object' || horizon === null) return false;
  const h = horizon as Partial<PredictionHorizon>;
  return (
    typeof h.steps === 'number' &&
    h.steps > 0 &&
    typeof h.stepSize === 'number' &&
    h.stepSize > 0 &&
    typeof h.maxWindow === 'number' &&
    h.maxWindow > 0
  );
}

/**
 * Validate confidence score (0-1)
 */
export function isValidConfidence(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 1;
}
