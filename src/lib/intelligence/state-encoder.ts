/**
 * State Encoder/Decoder for World Model
 *
 * Converts high-dimensional conversation states to compact vector representations
 * and back. Uses dimensionality reduction for efficient state storage and comparison.
 *
 * Part of Neural MPC Phase 2: World Model Foundation
 */

import type {
  ConversationState,
  EncodedState,
  StateEncodingConfig,
  StateSimilarity,
} from './world-model-types';
import {
  DEFAULT_WORLD_MODEL_CONFIG,
  isValidConversationState,
} from './world-model-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

let config: StateEncodingConfig = DEFAULT_WORLD_MODEL_CONFIG.encoding;

// Feature indices for encoding
const FEATURE_INDICES = {
  // Message features (3)
  messageCount: 0,
  avgMessageLength: 1,
  messageComplexity: 2,

  // Agent features (2)
  activeAgentCount: 3,
  hasLastUsedAgent: 4, // binary

  // Task features (3)
  hasCurrentTask: 5, // binary
  taskCompletionRate: 6,
  tasksInProgress: 7,

  // Emotion features (6)
  valence: 8,
  arousal: 9,
  dominance: 10,
  emotionCategory: 11, // one-hot encoded (expanded later)
  emotionConfidence: 12,
  emotionTrend: 13, // encoded as -1, 0, 1

  // Topic features (3)
  topicConfidence: 14,
  topicShifts: 15,

  // User intent (7 - one-hot encoded)
  // Starting at index 16

  // Resource usage (3)
  estimatedTokenUsage: 23,
  estimatedTimeMs: 24,
  systemLoad: 25,

  // Temporal features (3)
  timeSinceLastMessage: 26,
  conversationAge: 27,
  timeOfDay: 28,

  // Velocity features (3)
  messageRate: 29,
  tokenRate: 30,
  agentActivationRate: 31,
} as const;

// Total raw features: 32
const RAW_FEATURE_COUNT = 32;

// ============================================================================
// NORMALIZATION
// ============================================================================

interface NormalizationParams {
  min: number[];
  max: number[];
  mean: number[];
  std: number[];
  fitted: boolean;
}

let normParams: NormalizationParams = {
  min: new Array(RAW_FEATURE_COUNT).fill(0),
  max: new Array(RAW_FEATURE_COUNT).fill(1),
  mean: new Array(RAW_FEATURE_COUNT).fill(0),
  std: new Array(RAW_FEATURE_COUNT).fill(1),
  fitted: false,
};

/**
 * Update encoder configuration
 */
export function updateEncodingConfig(newConfig: Partial<StateEncodingConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get current encoding configuration
 */
export function getEncodingConfig(): StateEncodingConfig {
  return { ...config };
}

/**
 * Reset normalization parameters
 */
export function resetNormalization(): void {
  normParams = {
    min: new Array(RAW_FEATURE_COUNT).fill(0),
    max: new Array(RAW_FEATURE_COUNT).fill(1),
    mean: new Array(RAW_FEATURE_COUNT).fill(0),
    std: new Array(RAW_FEATURE_COUNT).fill(1),
    fitted: false,
  };
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/**
 * Extract raw feature vector from conversation state
 */
function extractFeatures(state: ConversationState): Float32Array {
  const features = new Float32Array(RAW_FEATURE_COUNT);
  let idx = 0;

  // Message features
  features[FEATURE_INDICES.messageCount] = Math.min(state.messageCount / 1000, 1); // Normalize to 0-1
  features[FEATURE_INDICES.avgMessageLength] = Math.min(state.avgMessageLength / 10000, 1); // Normalize
  features[FEATURE_INDICES.messageComplexity] = state.messageComplexity;

  // Agent features
  features[FEATURE_INDICES.activeAgentCount] = Math.min(state.activeAgentCount / 10, 1); // Normalize
  features[FEATURE_INDICES.hasLastUsedAgent] = state.lastUsedAgent ? 1 : 0;

  // Task features
  features[FEATURE_INDICES.hasCurrentTask] = state.currentTaskType ? 1 : 0;
  features[FEATURE_INDICES.taskCompletionRate] = state.taskCompletionRate;
  features[FEATURE_INDICES.tasksInProgress] = Math.min(state.tasksInProgress / 10, 1);

  // Emotion features
  features[FEATURE_INDICES.valence] = state.emotionState.valence;
  features[FEATURE_INDICES.arousal] = state.emotionState.arousal;
  features[FEATURE_INDICES.dominance] = state.emotionState.dominance;
  features[FEATURE_INDICES.emotionCategory] = encodeEmotionCategory(state.emotionState.category);
  features[FEATURE_INDICES.emotionConfidence] = state.emotionState.confidence;
  features[FEATURE_INDICES.emotionTrend] = encodeEmotionTrend(state.emotionTrend);

  // Topic features
  features[FEATURE_INDICES.topicConfidence] = state.topicConfidence;
  features[FEATURE_INDICES.topicShifts] = Math.min(state.topicShifts / 20, 1);

  // User intent (one-hot encoded)
  const intentStartIdx = 16;
  const intentOneHot = encodeUserIntent(state.userIntent);
  for (let i = 0; i < intentOneHot.length; i++) {
    features[intentStartIdx + i] = intentOneHot[i];
  }

  // Resource usage (normalized)
  features[FEATURE_INDICES.estimatedTokenUsage] = Math.min(state.estimatedTokenUsage / 100000, 1);
  features[FEATURE_INDICES.estimatedTimeMs] = Math.min(state.estimatedTimeMs / 60000, 1); // 1 minute max
  features[FEATURE_INDICES.systemLoad] = state.systemLoad;

  // Temporal features (normalized)
  features[FEATURE_INDICES.timeSinceLastMessage] = Math.min(state.timeSinceLastMessage / 3600000, 1); // 1 hour max
  features[FEATURE_INDICES.conversationAge] = Math.min(state.conversationAge / 86400000, 1); // 1 day max
  features[FEATURE_INDICES.timeOfDay] = state.timeOfDay;

  // Velocity features (normalized)
  features[FEATURE_INDICES.messageRate] = Math.min(state.messageRate / 100, 1); // 100 msgs/min max
  features[FEATURE_INDICES.tokenRate] = Math.min(state.tokenRate / 10000, 1); // 10k tokens/min max
  features[FEATURE_INDICES.agentActivationRate] = Math.min(state.agentActivationRate / 10, 1);

  return features;
}

/**
 * Encode emotion category to number
 */
function encodeEmotionCategory(category: string): number {
  const categories = ['excited', 'calm', 'angry', 'sad', 'confident', 'neutral'];
  const idx = categories.indexOf(category.toLowerCase());
  return idx >= 0 ? idx / (categories.length - 1) : 0.5; // Normalize to 0-1
}

/**
 * Encode emotion trend to number
 */
function encodeEmotionTrend(trend: 'improving' | 'stable' | 'declining'): number {
  switch (trend) {
    case 'improving':
      return 1;
    case 'stable':
      return 0;
    case 'declining':
      return -1;
  }
}

/**
 * Decode emotion trend from number
 */
function decodeEmotionTrend(value: number): 'improving' | 'stable' | 'declining' {
  if (value > 0.33) return 'improving';
  if (value < -0.33) return 'declining';
  return 'stable';
}

/**
 * Encode user intent to one-hot vector
 */
function encodeUserIntent(intent: string): number[] {
  const intents = [
    'exploring',
    'task_focused',
    'questioning',
    'reflecting',
    'struggling',
    'completing',
    'unknown',
  ];
  const idx = intents.indexOf(intent.toLowerCase());
  const oneHot = new Array(intents.length).fill(0);
  if (idx >= 0) {
    oneHot[idx] = 1;
  } else {
    oneHot[intents.length - 1] = 1; // Default to unknown
  }
  return oneHot;
}

/**
 * Decode user intent from one-hot vector
 */
function decodeUserIntent(features: Float32Array): string {
  const intentStartIdx = 16;
  const intents = [
    'exploring',
    'task_focused',
    'questioning',
    'reflecting',
    'struggling',
    'completing',
    'unknown',
  ];

  let maxIdx = intents.length - 1;
  let maxValue = features[intentStartIdx + maxIdx];

  for (let i = 0; i < intents.length - 1; i++) {
    if (features[intentStartIdx + i] > maxValue) {
      maxValue = features[intentStartIdx + i];
      maxIdx = i;
    }
  }

  return intents[maxIdx];
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize feature vector
 */
function normalize(features: Float32Array): Float32Array {
  const normalized = new Float32Array(features.length);

  switch (config.normalization) {
    case 'minmax':
      if (!normParams.fitted) {
        // Assume 0-1 range if not fitted
        return features;
      }
      for (let i = 0; i < features.length; i++) {
        const range = normParams.max[i] - normParams.min[i];
        normalized[i] = range > 0 ? (features[i] - normParams.min[i]) / range : 0;
      }
      break;

    case 'zscore':
      if (!normParams.fitted) {
        return features;
      }
      for (let i = 0; i < features.length; i++) {
        normalized[i] = normParams.std[i] > 0 ? (features[i] - normParams.mean[i]) / normParams.std[i] : 0;
      }
      break;

    case 'none':
    default:
      return features;
  }

  return normalized;
}

/**
 * Denormalize feature vector
 */
function denormalize(features: Float32Array): Float32Array {
  const denormalized = new Float32Array(features.length);

  switch (config.normalization) {
    case 'minmax':
      if (!normParams.fitted) {
        return features;
      }
      for (let i = 0; i < features.length; i++) {
        const range = normParams.max[i] - normParams.min[i];
        denormalized[i] = features[i] * range + normParams.min[i];
      }
      break;

    case 'zscore':
      if (!normParams.fitted) {
        return features;
      }
      for (let i = 0; i < features.length; i++) {
        denormalized[i] = features[i] * normParams.std[i] + normParams.mean[i];
      }
      break;

    case 'none':
    default:
      return features;
  }

  return denormalized;
}

/**
 * Fit normalization parameters on data
 */
export function fitNormalization(states: ConversationState[]): void {
  if (states.length === 0) return;

  // Extract all features
  const allFeatures = states.map(extractFeatures);

  // Initialize arrays
  const sums = new Array(RAW_FEATURE_COUNT).fill(0);
  const mins = new Array(RAW_FEATURE_COUNT).fill(Infinity);
  const maxs = new Array(RAW_FEATURE_COUNT).fill(-Infinity);

  // Compute sums, mins, maxs
  for (const features of allFeatures) {
    for (let i = 0; i < RAW_FEATURE_COUNT; i++) {
      sums[i] += features[i];
      mins[i] = Math.min(mins[i], features[i]);
      maxs[i] = Math.max(maxs[i], features[i]);
    }
  }

  // Compute means
  const means = sums.map((sum) => sum / allFeatures.length);

  // Compute standard deviations
  const squaredDiffs = new Array(RAW_FEATURE_COUNT).fill(0);
  for (const features of allFeatures) {
    for (let i = 0; i < RAW_FEATURE_COUNT; i++) {
      squaredDiffs[i] += Math.pow(features[i] - means[i], 2);
    }
  }
  const stds = squaredDiffs.map((sum, i) => {
    const variance = sum / allFeatures.length;
    return Math.sqrt(variance);
  });

  // Store parameters
  normParams.min = mins;
  normParams.max = maxs;
  normParams.mean = means;
  normParams.std = stds.map((s) => (s < 0.001 ? 1 : s)); // Avoid division by zero
  normParams.fitted = true;
}

// ============================================================================
// DIMENSIONALITY REDUCTION
// ============================================================================

/**
 * Simple projection (select first N features)
 * For production, replace with PCA or autoencoder
 */
function reduceDimensionality(features: Float32Array, targetDim: number): Float32Array {
  if (targetDim >= features.length) {
    return features;
  }

  // Simple uniform sampling strategy
  const reduced = new Float32Array(targetDim);
  const step = features.length / targetDim;

  for (let i = 0; i < targetDim; i++) {
    const srcIdx = Math.floor(i * step);
    reduced[i] = features[srcIdx];
  }

  return reduced;
}

/**
 * Expand dimensions back (for decoding)
 * Note: This is lossy - perfect reconstruction not possible with simple reduction
 */
function expandDimensionality(reduced: Float32Array, originalDim: number): Float32Array {
  const expanded = new Float32Array(originalDim);
  const step = originalDim / reduced.length;

  for (let i = 0; i < reduced.length; i++) {
    const startIdx = Math.floor(i * step);
    const endIdx = Math.min(Math.floor((i + 1) * step), originalDim);
    for (let j = startIdx; j < endIdx; j++) {
      expanded[j] = reduced[i];
    }
  }

  return expanded;
}

// ============================================================================
// ENCODING/DECODING
// ============================================================================

/**
 * Encode conversation state to vector
 */
export function encodeState(state: ConversationState): EncodedState {
  if (!isValidConversationState(state)) {
    throw new Error('Invalid conversation state');
  }

  const startTime = performance.now();

  // Extract features
  const features = extractFeatures(state);

  // Normalize
  const normalized = normalize(features);

  // Reduce dimensionality
  const reduced = reduceDimensionality(normalized, config.targetDimensions);

  const endTime = performance.now();

  return {
    vector: reduced,
    originalDimensions: RAW_FEATURE_COUNT,
    timestamp: Date.now(),
    method: config.method,
    compressionRatio: RAW_FEATURE_COUNT / config.targetDimensions,
  };
}

/**
 * Decode vector to partial state (lossy)
 */
export function decodeState(encoded: EncodedState): Partial<ConversationState> {
  // Expand dimensions
  const expanded = expandDimensionality(encoded.vector, encoded.originalDimensions);

  // Denormalize
  const denormalized = denormalize(expanded);

  // Reconstruct state (this is partial and lossy)
  return {
    messageCount: Math.round(denormalized[FEATURE_INDICES.messageCount] * 1000),
    avgMessageLength: Math.round(denormalized[FEATURE_INDICES.avgMessageLength] * 10000),
    messageComplexity: denormalized[FEATURE_INDICES.messageComplexity],
    activeAgentCount: Math.round(denormalized[FEATURE_INDICES.activeAgentCount] * 10),
    taskCompletionRate: denormalized[FEATURE_INDICES.taskCompletionRate],
    tasksInProgress: Math.round(denormalized[FEATURE_INDICES.tasksInProgress] * 10),
    emotionState: {
      valence: Math.max(0, Math.min(1, denormalized[FEATURE_INDICES.valence])),
      arousal: Math.max(0, Math.min(1, denormalized[FEATURE_INDICES.arousal])),
      dominance: Math.max(0, Math.min(1, denormalized[FEATURE_INDICES.dominance])),
      category: 'neutral', // Can't accurately decode
      confidence: denormalized[FEATURE_INDICES.emotionConfidence],
    },
    emotionTrend: decodeEmotionTrend(denormalized[FEATURE_INDICES.emotionTrend]),
    topicConfidence: denormalized[FEATURE_INDICES.topicConfidence],
    topicShifts: Math.round(denormalized[FEATURE_INDICES.topicShifts] * 20),
    userIntent: decodeUserIntent(denormalized),
    estimatedTokenUsage: Math.round(denormalized[FEATURE_INDICES.estimatedTokenUsage] * 100000),
    estimatedTimeMs: Math.round(denormalized[FEATURE_INDICES.estimatedTimeMs] * 60000),
    systemLoad: denormalized[FEATURE_INDICES.systemLoad],
  } as Partial<ConversationState>;
}

/**
 * Batch encode states
 */
export function encodeStates(states: ConversationState[]): EncodedState[] {
  // Fit normalization if needed
  if (config.normalization !== 'none' && !normParams.fitted) {
    fitNormalization(states);
  }

  return states.map(encodeState);
}

// ============================================================================
// STATE SIMILARITY
// ============================================================================

/**
 * Compute similarity between two encoded states
 */
export function stateSimilarity(
  state1: EncodedState,
  state2: EncodedState,
  metric: 'cosine' | 'euclidean' | 'manhattan' = 'cosine'
): StateSimilarity {
  const v1 = state1.vector;
  const v2 = state2.vector;

  if (v1.length !== v2.length) {
    throw new Error('State vectors must have same dimensionality');
  }

  let distance: number;
  let similarity: number;

  switch (metric) {
    case 'cosine':
      distance = cosineDistance(v1, v2);
      similarity = 1 - distance; // Convert to similarity
      break;

    case 'euclidean':
      distance = euclideanDistance(v1, v2);
      // Normalize by max possible distance
      const maxEuclidean = Math.sqrt(v1.length);
      similarity = 1 - distance / maxEuclidean;
      break;

    case 'manhattan':
      distance = manhattanDistance(v1, v2);
      // Normalize by max possible distance
      const maxManhattan = v1.length;
      similarity = 1 - distance / maxManhattan;
      break;

    default:
      throw new Error(`Unknown distance metric: ${metric}`);
  }

  return { similarity, metric, distance };
}

/**
 * Cosine distance between vectors
 */
function cosineDistance(v1: Float32Array, v2: Float32Array): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;

  return 1 - dotProduct / denominator;
}

/**
 * Euclidean distance between vectors
 */
function euclideanDistance(v1: Float32Array, v2: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Manhattan distance between vectors
 */
function manhattanDistance(v1: Float32Array, v2: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.abs(v1[i] - v2[i]);
  }
  return sum;
}

/**
 * Find most similar states
 */
export function findMostSimilar(
  query: EncodedState,
  candidates: EncodedState[],
  limit: number = 5
): Array<{ state: EncodedState; similarity: StateSimilarity }> {
  const results = candidates
    .map((candidate) => ({
      state: candidate,
      similarity: stateSimilarity(query, candidate),
    }))
    .sort((a, b) => b.similarity.similarity - a.similarity.similarity)
    .slice(0, limit);

  return results;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get feature vector dimensionality
 */
export function getFeatureDimensionality(): number {
  return RAW_FEATURE_COUNT;
}

/**
 * Get encoded vector dimensionality
 */
export function getEncodedDimensionality(): number {
  return config.targetDimensions;
}

/**
 * Check if normalization is fitted
 */
export function isNormalizationFitted(): boolean {
  return normParams.fitted;
}
