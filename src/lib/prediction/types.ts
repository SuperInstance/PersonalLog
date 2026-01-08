/**
 * Agent Transition Prediction Types
 *
 * Type definitions for the ML-based agent transition prediction system.
 * Predicts which agent will be needed next in the workflow based on usage patterns.
 */

import type { Message, Conversation } from '@/types/conversation';

// ============================================================================
// TRANSITION DATA TYPES
// ============================================================================

/**
 * Task types for classification
 */
export enum TaskType {
  /** Writing and content creation */
  WRITING = 'writing',
  /** Coding and development */
  CODING = 'coding',
  /** Analysis and research */
  ANALYSIS = 'analysis',
  /** Debugging and troubleshooting */
  DEBUGGING = 'debugging',
  /** Planning and organization */
  PLANNING = 'planning',
  /** Learning and education */
  LEARNING = 'learning',
  /** General conversation */
  GENERAL = 'general',
}

/**
 * Time of day categories
 */
export enum TimeOfDay {
  /** Early morning (6 AM - 12 PM) */
  MORNING = 'morning',
  /** Afternoon (12 PM - 6 PM) */
  AFTERNOON = 'afternoon',
  /** Evening (6 PM - 12 AM) */
  EVENING = 'evening',
  /** Late night (12 AM - 6 AM) */
  NIGHT = 'night',
}

/**
 * Action type for tracking user behavior
 */
export enum ActionType {
  /** User sent a message */
  MESSAGE_SENT = 'message_sent',
  /** User selected messages */
  MESSAGE_SELECTED = 'message_selected',
  /** User requested AI response */
  AI_REQUEST = 'ai_request',
  /** User compacted conversation */
  CONVERSATION_COMPACTED = 'conversation_compacted',
  /** User started new conversation */
  CONVERSATION_STARTED = 'conversation_started',
  /** User switched conversations */
  CONVERSATION_SWITCHED = 'conversation_switched',
  /** Agent was activated */
  AGENT_ACTIVATED = 'agent_activated',
  /** Agent was deactivated */
  AGENT_DEACTIVATED = 'agent_deactivated',
  /** Agent completed a task */
  AGENT_COMPLETED = 'agent_completed',
}

/**
 * Single action record for recent history
 */
export interface ActionRecord {
  /** Action type */
  type: ActionType;
  /** Timestamp */
  timestamp: number;
  /** Agent ID if action is agent-related */
  agentId?: string;
  /** Conversation ID */
  conversationId: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Transition event between agents
 */
export interface AgentTransition {
  /** Unique transition ID */
  id: string;
  /** Source agent ID (empty if starting fresh) */
  fromAgentId: string | null;
  /** Target agent ID */
  toAgentId: string;
  /** Conversation ID */
  conversationId: string;
  /** Task type at time of transition */
  taskType: TaskType;
  /** Time of day */
  timeOfDay: TimeOfDay;
  /** Timestamp */
  timestamp: number;
  /** Number of messages in conversation */
  messageCount: number;
  /** Conversation length in characters */
  conversationLength: number;
  /** Recent actions (last 5) */
  recentActions: ActionRecord[];
  /** User ID for personalization */
  userId: 'default';
  /** Session ID for grouping related transitions */
  sessionId: string;
  /** Whether prediction was correct (for training feedback) */
  predictionCorrect?: boolean;
}

// ============================================================================
// FEATURE TYPES
// ============================================================================

/**
 * Feature vector for ML model
 */
export interface TransitionFeatures {
  /** One-hot encoded current agent */
  currentAgent: number[];
  /** One-hot encoded task type */
  taskType: number[];
  /** One-hot encoded time of day */
  timeOfDay: number[];
  /** Message count (normalized) */
  messageCount: number;
  /** Conversation length (normalized) */
  conversationLength: number;
  /** Action type frequencies in recent history */
  actionFrequencies: number[];
  /** Agent co-occurrence scores */
  agentCooccurrence: number[];
  /** Time since last agent activation (normalized) */
  timeSinceLastActivation: number;
  /** Day of week (0-6) */
  dayOfWeek: number;
  /** Hour of day (0-23) */
  hourOfDay: number;
}

/**
 * Normalized feature vector
 */
export type FeatureVector = Float32Array;

// ============================================================================
// PREDICTION TYPES
// ============================================================================

/**
 * Prediction result for next agent
 */
export interface AgentPrediction {
  /** Agent ID */
  agentId: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Probability score */
  probability: number;
}

/**
 * Context for prediction
 */
export interface PredictionContext {
  /** Current agent ID (null if none) */
  currentAgentId: string | null;
  /** Available agents */
  availableAgents: string[];
  /** Conversation */
  conversation: Conversation;
  /** Recent actions */
  recentActions: ActionRecord[];
  /** Current timestamp */
  timestamp: number;
}

/**
 * Prediction result
 */
export interface PredictionResult {
  /** Top 3 agent predictions */
  predictions: AgentPrediction[];
  /** Features used for prediction */
  features: TransitionFeatures;
  /** Model version */
  modelVersion: string;
  /** Prediction timestamp */
  timestamp: number;
  /** Confidence in top prediction */
  confidence: number;
}

// ============================================================================
// MODEL TYPES
// ============================================================================

/**
 * Model metadata
 */
export interface ModelMetadata {
  /** Model version */
  version: string;
  /** Training data count */
  trainingSamples: number;
  /** Last training timestamp */
  lastTrainedAt: number;
  /** Model accuracy (0-1) */
  accuracy: number;
  /** Feature count */
  featureCount: number;
  /** Agent count */
  agentCount: number;
}

/**
 * Training data statistics
 */
export interface TrainingStatistics {
  /** Total transitions recorded */
  totalTransitions: number;
  /** Transitions by agent pair */
  transitionMatrix: Map<string, Map<string, number>>;
  /** Transitions by task type */
  taskTypeDistribution: Map<TaskType, number>;
  /** Transitions by time of day */
  timeOfDayDistribution: Map<TimeOfDay, number>;
  /** Average prediction accuracy */
  accuracy: number;
  /** Precision by agent */
  precision: Map<string, number>;
  /** Recall by agent */
  recall: Map<string, number>;
}

/**
 * Model performance metrics
 */
export interface ModelMetrics {
  /** Overall accuracy (0-1) */
  accuracy: number;
  /** Top-3 accuracy (0-1) */
  top3Accuracy: number;
  /** Mean squared error */
  mse: number;
  /** Confusion matrix */
  confusionMatrix: Map<string, Map<string, number>>;
  /** Per-agent precision */
  precision: Map<string, number>;
  /** Per-agent recall */
  recall: Map<string, number>;
  /** F1 score */
  f1Score: number;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/**
 * IndexedDB schema for transition storage
 */
export interface TransitionStoreSchema {
  /** Transitions store */
  transitions: {
    key: string;
    value: AgentTransition;
    indexes: {
      byConversation: string;
      byAgent: string;
      byTimestamp: number;
      byTaskType: TaskType;
    };
  };
  /** Features store */
  features: {
    key: string;
    value: TransitionFeatures;
    indexes: {
      byTransition: string;
    };
  };
  /** Model metadata store */
  modelMetadata: {
    key: string;
    value: ModelMetadata;
  };
  /** Training statistics store */
  trainingStats: {
    key: string;
    value: TrainingStatistics;
  };
}

// ============================================================================
// CONFIG TYPES
// ============================================================================

/**
 * Prediction model configuration
 */
export interface PredictionConfig {
  /** Minimum samples required for training */
  minTrainingSamples: number;
  /** Maximum history size for actions */
  maxActionHistory: number;
  /** Feature vector size */
  featureSize: number;
  /** Model retrain interval (milliseconds) */
  retrainInterval: number;
  /** Enable online learning */
  enableOnlineLearning: boolean;
  /** Minimum confidence threshold */
  minConfidence: number;
  /** Maximum predictions to return */
  maxPredictions: number;
  /** Smoothing factor for probabilities */
  smoothingFactor: number;
}

/**
 * Default configuration
 */
export const DEFAULT_PREDICTION_CONFIG: PredictionConfig = {
  minTrainingSamples: 50,
  maxActionHistory: 5,
  featureSize: 64,
  retrainInterval: 7 * 24 * 60 * 60 * 1000, // 1 week
  enableOnlineLearning: true,
  minConfidence: 0.3,
  maxPredictions: 3,
  smoothingFactor: 1.0,
};
