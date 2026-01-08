/**
 * Feature Engineering for Agent Transition Prediction
 *
 * Extracts and engineers features from conversation state, agent history,
 * and user behavior patterns for ML model training and prediction.
 *
 * @example
 * ```typescript
 * import { extractFeatures, FeatureExtractor } from '@/lib/prediction';
 *
 * // Extract features from current state
 * const features = await extractFeatures({
 *   currentAgentId: 'jepa-v1',
 *   availableAgents: ['jepa-v1', 'spreader-v1'],
 *   conversation,
 *   recentActions,
 *   timestamp: Date.now(),
 * });
 * ```
 */

import {
  TransitionFeatures,
  FeatureVector,
  PredictionContext,
  TaskType,
  TimeOfDay,
  ActionType,
  ActionRecord,
  AgentTransition,
} from './types';
import type { Message, Conversation } from '@/types/conversation';

// ============================================================================
// FEATURE EXTRACTION CONFIGURATION
// ============================================================================

interface FeatureConfig {
  /** Maximum number of agents to support */
  maxAgents: number;
  /** Maximum message count for normalization */
  maxMessageCount: number;
  /** Maximum conversation length for normalization */
  maxConversationLength: number;
  /** Maximum action history size */
  maxActionHistory: number;
  /** Number of action types */
  numActionTypes: number;
  /** Enable feature normalization */
  normalizeFeatures: boolean;
}

const DEFAULT_FEATURE_CONFIG: FeatureConfig = {
  maxAgents: 20,
  maxMessageCount: 1000,
  maxConversationLength: 1000000, // 1M characters
  maxActionHistory: 5,
  numActionTypes: Object.keys(ActionType).length / 2,
  normalizeFeatures: true,
};

// ============================================================================
// FEATURE EXTRACTOR CLASS
// ============================================================================

/**
 * Feature Extractor
 *
 * Extracts and engineers features from conversation state for ML prediction.
 */
export class FeatureExtractor {
  private config: FeatureConfig;
  private agentIndexMap: Map<string, number> = new Map();
  private taskTypeIndexMap: Map<TaskType, number> = new Map();
  private timeOfDayIndexMap: Map<TimeOfDay, number> = new Map();
  private actionTypeIndexMap: Map<ActionType, number> = new Map();

  constructor(config: Partial<FeatureConfig> = {}) {
    this.config = { ...DEFAULT_FEATURE_CONFIG, ...config };
    this.initializeIndexes();
  }

  /**
   * Initialize index maps for one-hot encoding
   */
  private initializeIndexes(): void {
    // Initialize task type indexes
    let idx = 0;
    for (const taskType of Object.values(TaskType)) {
      if (typeof taskType === 'string') {
        this.taskTypeIndexMap.set(taskType as TaskType, idx++);
      }
    }

    // Initialize time of day indexes
    idx = 0;
    for (const timeOfDay of Object.values(TimeOfDay)) {
      if (typeof timeOfDay === 'string') {
        this.timeOfDayIndexMap.set(timeOfDay as TimeOfDay, idx++);
      }
    }

    // Initialize action type indexes
    idx = 0;
    for (const actionType of Object.values(ActionType)) {
      if (typeof actionType === 'string') {
        this.actionTypeIndexMap.set(actionType as ActionType, idx++);
      }
    }
  }

  /**
   * Update agent index map
   *
   * @param agentIds - Array of agent IDs
   */
  updateAgentIndexes(agentIds: string[]): void {
    this.agentIndexMap.clear();

    agentIds.forEach((agentId, idx) => {
      this.agentIndexMap.set(agentId, idx);
    });
  }

  /**
   * Extract features from prediction context
   *
   * @param context - Prediction context
   * @returns Feature vector
   */
  async extractFeatures(context: PredictionContext): Promise<TransitionFeatures> {
    // Update agent indexes if needed
    if (this.agentIndexMap.size === 0) {
      this.updateAgentIndexes(context.availableAgents);
    }

    // Extract individual features
    const currentAgent = this.extractCurrentAgent(context.currentAgentId);
    const taskType = this.extractTaskType(context.conversation);
    const timeOfDay = this.extractTimeOfDay(context.timestamp);
    const messageCount = this.extractMessageCount(context.conversation);
    const conversationLength = this.extractConversationLength(context.conversation);
    const actionFrequencies = this.extractActionFrequencies(context.recentActions);
    const agentCooccurrence = this.extractAgentCooccurrence(context);
    const timeSinceLastActivation = this.extractTimeSinceLastActivation(context);
    const dayOfWeek = this.extractDayOfWeek(context.timestamp);
    const hourOfDay = this.extractHourOfDay(context.timestamp);

    return {
      currentAgent,
      taskType,
      timeOfDay,
      messageCount,
      conversationLength,
      actionFrequencies,
      agentCooccurrence,
      timeSinceLastActivation,
      dayOfWeek,
      hourOfDay,
    };
  }

  /**
   * Extract current agent one-hot encoding
   */
  private extractCurrentAgent(currentAgentId: string | null): number[] {
    const vector = new Array(this.config.maxAgents).fill(0);

    if (currentAgentId && this.agentIndexMap.has(currentAgentId)) {
      const idx = this.agentIndexMap.get(currentAgentId)!;
      if (idx < this.config.maxAgents) {
        vector[idx] = 1;
      }
    }

    return vector;
  }

  /**
   * Extract task type one-hot encoding
   */
  private extractTaskType(conversation: Conversation): number[] {
    const taskType = AgentTransitionTracker.inferTaskType(conversation);
    const vector = new Array(this.taskTypeIndexMap.size).fill(0);

    if (this.taskTypeIndexMap.has(taskType)) {
      const idx = this.taskTypeIndexMap.get(taskType)!;
      vector[idx] = 1;
    }

    return vector;
  }

  /**
   * Extract time of day one-hot encoding
   */
  private extractTimeOfDay(timestamp: number): number[] {
    const timeOfDay = AgentTransitionTracker.getTimeOfDay(timestamp);
    const vector = new Array(this.timeOfDayIndexMap.size).fill(0);

    if (this.timeOfDayIndexMap.has(timeOfDay)) {
      const idx = this.timeOfDayIndexMap.get(timeOfDay)!;
      vector[idx] = 1;
    }

    return vector;
  }

  /**
   * Extract normalized message count
   */
  private extractMessageCount(conversation: Conversation): number {
    const count = conversation.messages.length;
    return this.normalize(count, 0, this.config.maxMessageCount);
  }

  /**
   * Extract normalized conversation length
   */
  private extractConversationLength(conversation: Conversation): number {
    const length = conversation.messages.reduce(
      (sum, msg) => sum + (msg.content.text?.length || 0),
      0
    );
    return this.normalize(length, 0, this.config.maxConversationLength);
  }

  /**
   * Extract action type frequencies
   */
  private extractActionFrequencies(actions: ActionRecord[]): number[] {
    const vector = new Array(this.config.numActionTypes).fill(0);

    if (actions.length === 0) {
      return vector;
    }

    // Count frequencies
    for (const action of actions) {
      if (this.actionTypeIndexMap.has(action.type)) {
        const idx = this.actionTypeIndexMap.get(action.type)!;
        vector[idx]++;
      }
    }

    // Normalize by total actions
    const total = actions.length;
    return vector.map((count) => count / total);
  }

  /**
   * Extract agent co-occurrence scores
   *
   * Measures how often agents appear together in recent actions
   */
  private extractAgentCooccurrence(context: PredictionContext): number[] {
    const vector = new Array(this.config.maxAgents).fill(0);

    if (context.recentActions.length === 0) {
      return vector;
    }

    // Count agent appearances
    const agentCounts = new Map<string, number>();
    for (const action of context.recentActions) {
      if (action.agentId) {
        agentCounts.set(
          action.agentId,
          (agentCounts.get(action.agentId) || 0) + 1
        );
      }
    }

    // Normalize and map to vector
    const maxCount = Math.max(...agentCounts.values(), 1);
    for (const [agentId, count] of agentCounts.entries()) {
      if (this.agentIndexMap.has(agentId)) {
        const idx = this.agentIndexMap.get(agentId)!;
        if (idx < this.config.maxAgents) {
          vector[idx] = count / maxCount;
        }
      }
    }

    return vector;
  }

  /**
   * Extract time since last agent activation
   */
  private extractTimeSinceLastActivation(context: PredictionContext): number {
    if (context.recentActions.length === 0) {
      return 1.0; // No recent activation
    }

    // Find most recent agent activation
    const now = context.timestamp;
    let lastActivationTime = 0;

    for (const action of context.recentActions) {
      if (
        (action.type === ActionType.AGENT_ACTIVATED ||
          action.type === ActionType.AGENT_COMPLETED) &&
        action.timestamp > lastActivationTime
      ) {
        lastActivationTime = action.timestamp;
      }
    }

    if (lastActivationTime === 0) {
      return 1.0; // No activation found
    }

    // Normalize to 0-1 range (assuming 1 hour is "long")
    const timeDiff = now - lastActivationTime;
    const maxDiff = 60 * 60 * 1000; // 1 hour
    return Math.min(timeDiff / maxDiff, 1.0);
  }

  /**
   * Extract day of week (0-6)
   */
  private extractDayOfWeek(timestamp: number): number {
    const day = new Date(timestamp).getDay();
    return day / 6; // Normalize to 0-1
  }

  /**
   * Extract hour of day (0-23)
   */
  private extractHourOfDay(timestamp: number): number {
    const hour = new Date(timestamp).getHours();
    return hour / 23; // Normalize to 0-1
  }

  /**
   * Normalize value to 0-1 range
   */
  private normalize(value: number, min: number, max: number): number {
    if (max === min) {
      return 0;
    }
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Convert features to flat feature vector
   *
   * @param features - Transition features
   * @returns Flat feature vector
   */
  featuresToVector(features: TransitionFeatures): FeatureVector {
    const components = [
      ...features.currentAgent,
      ...features.taskType,
      ...features.timeOfDay,
      features.messageCount,
      features.conversationLength,
      ...features.actionFrequencies,
      ...features.agentCooccurrence,
      features.timeSinceLastActivation,
      features.dayOfWeek,
      features.hourOfDay,
    ];

    return new Float32Array(components);
  }

  /**
   * Get feature vector size
   */
  getFeatureSize(): number {
    return (
      this.config.maxAgents +
      this.taskTypeIndexMap.size +
      this.timeOfDayIndexMap.size +
      2 + // messageCount, conversationLength
      this.config.numActionTypes +
      this.config.maxAgents +
      3 // timeSinceLastActivation, dayOfWeek, hourOfDay
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract features from prediction context
 *
 * @param context - Prediction context
 * @param config - Optional feature configuration
 * @returns Feature vector
 */
export async function extractFeatures(
  context: PredictionContext,
  config?: Partial<FeatureConfig>
): Promise<FeatureVector> {
  const extractor = new FeatureExtractor(config);
  const features = await extractor.extractFeatures(context);
  return extractor.featuresToVector(features);
}

/**
 * Extract features from transition
 *
 * @param transition - Agent transition
 * @param availableAgents - Available agent IDs
 * @param config - Optional feature configuration
 * @returns Feature vector
 */
export async function extractFeaturesFromTransition(
  transition: AgentTransition,
  availableAgents: string[],
  config?: Partial<FeatureConfig>
): Promise<FeatureVector> {
  const extractor = new FeatureExtractor(config);
  extractor.updateAgentIndexes(availableAgents);

  // Build prediction context from transition
  const context: PredictionContext = {
    currentAgentId: transition.fromAgentId,
    availableAgents,
    conversation: {
      id: transition.conversationId,
      title: '',
      type: 'ai-assisted',
      createdAt: new Date(transition.timestamp).toISOString(),
      updatedAt: new Date(transition.timestamp).toISOString(),
      messages: [],
      aiContacts: [],
      settings: {
        responseMode: 'messenger',
        compactOnLimit: true,
        compactStrategy: 'summarize',
      },
      metadata: {
        messageCount: transition.messageCount,
        totalTokens: 0,
        hasMedia: false,
        tags: [],
        pinned: false,
        archived: false,
      },
    },
    recentActions: transition.recentActions,
    timestamp: transition.timestamp,
  };

  const features = await extractor.extractFeatures(context);
  return extractor.featuresToVector(features);
}

/**
 * Normalize feature vector
 *
 * @param vector - Feature vector
 * @returns Normalized feature vector
 */
export function normalizeFeatureVector(vector: FeatureVector): FeatureVector {
  const mean = vector.reduce((sum, val) => sum + val, 0) / vector.length;
  const std = Math.sqrt(
    vector.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / vector.length
  );

  if (std === 0) {
    return new Float32Array(vector.length).fill(0);
  }

  return new Float32Array(vector.map((val) => (val - mean) / std));
}

/**
 * Calculate feature vector similarity
 *
 * @param vec1 - First feature vector
 * @param vec2 - Second feature vector
 * @returns Cosine similarity (0-1)
 */
export function featureSimilarity(vec1: FeatureVector, vec2: FeatureVector): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Feature vectors must have same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

// ============================================================================
// IMPORT UTILITIES
// ============================================================================

/**
 * Import AgentTransitionTracker reference for static methods
 */
import { AgentTransitionTracker } from './agent-transitions';
