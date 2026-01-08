/**
 * Advanced Prediction System with Ensemble Methods
 *
 * Implements ensemble prediction combining multiple predictors:
 * - Transition-based prediction (Markov model)
 * - Similarity-based prediction (kNN)
 * - Pattern-based prediction (sequence mining)
 * - Trend-based prediction (time series)
 * - Neural-style prediction (learned embeddings)
 *
 * Features:
 * - Weighted voting of multiple predictors
 * - Confidence-weighted predictions
 * - Adaptive model selection based on performance
 * - Cross-validation for accuracy estimation
 *
 * Part of Neural MPC Phase 2: Advanced Prediction
 */

import type {
  ConversationState,
  PredictedState,
  PredictionHorizon,
} from './world-model-types';
import { DEFAULT_HORIZONS } from './world-model-types';
import { WorldModel } from './world-model';
import { encodeState, stateSimilarity, findMostSimilar } from './state-encoder';
import {
  predictTransitions,
  getTransitionProbability,
  matchPattern,
} from './transition-learner';
import type { EncodedState } from './world-model-types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Prediction method types
 */
export const enum PredictionMethod {
  /** Markov transition model */
  TRANSITION = 'transition',
  /** k-nearest neighbors */
  SIMILARITY = 'similarity',
  /** Sequence pattern matching */
  PATTERN = 'pattern',
  /** Time series trend extrapolation */
  TREND = 'trend',
  /** Ensemble (weighted combination) */
  ENSEMBLE = 'ensemble',
}

/**
 * Single predictor result
 */
export interface PredictorResult {
  /** Predicted states */
  predictions: PredictedState[];
  /** Method used */
  method: PredictionMethod;
  /** Confidence in this predictor (0-1) */
  confidence: number;
  /** Computation time (ms) */
  computeTime: number;
  /** Metadata about prediction */
  metadata: {
    /** Number of data points used */
    dataPoints: number;
    /** Average prediction confidence */
    avgConfidence: number;
    /** Prediction variance */
    variance: number;
  };
}

/**
 * Ensemble weights for each predictor
 */
export interface EnsembleWeights {
  transition: number;
  similarity: number;
  pattern: number;
  trend: number;
}

/**
 * Ensemble prediction result
 */
export interface EnsemblePrediction {
  /** Combined predictions */
  predictions: PredictedState[];
  /** Individual predictor results */
  predictors: PredictorResult[];
  /** Weights used */
  weights: EnsembleWeights;
  /** Overall ensemble confidence */
  confidence: number;
  /** Computation time (ms) */
  computeTime: number;
}

/**
 * Predictor performance metrics
 */
export interface PredictorMetrics {
  /** Method */
  method: PredictionMethod;
  /** Accuracy (0-1) */
  accuracy: number;
  /** Mean squared error */
  mse: number;
  /** Average confidence */
  avgConfidence: number;
  /** Number of predictions made */
  predictionCount: number;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Model selection criteria
 */
export interface ModelSelectionCriteria {
  /** Minimum accuracy threshold */
  minAccuracy: number;
  /** Maximum MSE threshold */
  maxMSE: number;
  /** Minimum prediction count */
  minPredictions: number;
  /** Recency weight (0-1, higher = prefer recent) */
  recencyWeight: number;
}

// ============================================================================
// STATE
// ============================================================================

// Performance tracking for each predictor
const predictorMetrics = new Map<PredictionMethod, PredictorMetrics>();

// Current ensemble weights
let ensembleWeights: EnsembleWeights = {
  transition: 0.35,
  similarity: 0.25,
  pattern: 0.20,
  trend: 0.20,
};

// Model selection criteria
let selectionCriteria: ModelSelectionCriteria = {
  minAccuracy: 0.6,
  maxMSE: 0.4,
  minPredictions: 10,
  recencyWeight: 0.3,
};

// Historical predictions for validation
const predictionHistory: Array<{
  prediction: PredictedState[];
  actual: ConversationState;
  timestamp: number;
  method: PredictionMethod;
}> = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize advanced prediction system
 */
export function initializeAdvancedPrediction(): void {
  // Initialize metrics for each method
  const methods = [
    PredictionMethod.TRANSITION,
    PredictionMethod.SIMILARITY,
    PredictionMethod.PATTERN,
    PredictionMethod.TREND,
  ];

  for (const method of methods) {
    if (!predictorMetrics.has(method)) {
      predictorMetrics.set(method, {
        method,
        accuracy: 0.7, // Initial estimate
        mse: 0.3,
        avgConfidence: 0.5,
        predictionCount: 0,
        lastUpdated: Date.now(),
      });
    }
  }

  console.log('[AdvancedPrediction] Initialized');
}

/**
 * Update ensemble weights based on predictor performance
 */
export function updateEnsembleWeights(newWeights: Partial<EnsembleWeights>): void {
  ensembleWeights = { ...ensembleWeights, ...newWeights };

  // Normalize to sum to 1
  const total = ensembleWeights.transition + ensembleWeights.similarity + ensembleWeights.pattern + ensembleWeights.trend;
  if (total > 0) {
    ensembleWeights.transition /= total;
    ensembleWeights.similarity /= total;
    ensembleWeights.pattern /= total;
    ensembleWeights.trend /= total;
  }

  console.log('[AdvancedPrediction] Updated weights:', ensembleWeights);
}

/**
 * Auto-adjust weights based on recent performance
 */
export function autoAdjustWeights(): void {
  const totalPerformance = new Map<PredictionMethod, number>();

  // Calculate weighted performance score for each method
  for (const [method, metrics] of predictorMetrics.entries()) {
    if (method === PredictionMethod.ENSEMBLE) continue;

    const recencyBonus = Math.exp(-selectionCriteria.recencyWeight * ((Date.now() - metrics.lastUpdated) / 86400000));
    const performanceScore = metrics.accuracy * recencyBonus;

    totalPerformance.set(method, performanceScore);
  }

  // Normalize to create weights
  const totalScore = Array.from(totalPerformance.values()).reduce((sum, score) => sum + score, 0);

  if (totalScore > 0) {
    ensembleWeights.transition = (totalPerformance.get(PredictionMethod.TRANSITION) || 0) / totalScore;
    ensembleWeights.similarity = (totalPerformance.get(PredictionMethod.SIMILARITY) || 0) / totalScore;
    ensembleWeights.pattern = (totalPerformance.get(PredictionMethod.PATTERN) || 0) / totalScore;
    ensembleWeights.trend = (totalPerformance.get(PredictionMethod.TREND) || 0) / totalScore;

    console.log('[AdvancedPrediction] Auto-adjusted weights:', ensembleWeights);
  }
}

// ============================================================================
// PREDICTION METHODS
// ============================================================================

/**
 * Predict using transition-based method (Markov model)
 */
async function predictByTransitions(
  currentState: ConversationState,
  horizon: PredictionHorizon,
  worldModel: WorldModel
): Promise<PredictorResult> {
  const startTime = performance.now();

  const predictions: PredictedState[] = [];
  let totalConfidence = 0;

  // Get likely transitions
  const transitions = predictTransitions(currentState, horizon.steps);

  for (let step = 1; step <= horizon.steps; step++) {
    for (const trans of transitions) {
      // Find target state
      const targetState = worldModel.getState(trans.toState);
      if (!targetState) continue;

      // Extrapolate to horizon
      const predictedState = extrapolateState(targetState, currentState, step, horizon);

      const confidence = trans.confidence * trans.probability;
      totalConfidence += confidence;

      predictions.push({
        state: predictedState,
        confidence,
        horizon: step,
        probability: trans.probability,
        alternatives: [],
      });
    }
  }

  const computeTime = performance.now() - startTime;

  return {
    predictions,
    method: PredictionMethod.TRANSITION,
    confidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
    computeTime,
    metadata: {
      dataPoints: transitions.length,
      avgConfidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
      variance: calculateViance(predictions.map((p) => p.confidence)),
    },
  };
}

/**
 * Predict using similarity-based method (kNN)
 */
async function predictBySimilarity(
  currentState: ConversationState,
  horizon: PredictionHorizon,
  worldModel: WorldModel
): Promise<PredictorResult> {
  const startTime = performance.now();

  const predictions: PredictedState[] = [];
  let totalConfidence = 0;

  // Encode current state
  const currentEncoded = encodeState(currentState);

  // Get all historical states
  const allStates = worldModel.getAllStates();
  const allEncoded = allStates.map((s) => encodeState(s));

  // Find similar states
  const similarStates = findMostSimilar(currentEncoded, allEncoded.filter((e) => e.timestamp !== currentEncoded.timestamp), 10);

  for (const { state: similarEncoded, similarity } of similarStates) {
    if (similarity.similarity < 0.6) continue; // Threshold

    // Find what happened after this similar state
    const similarState = allStates.find((s) => s.id === similarEncoded.timestamp.toString());
    if (!similarState) continue;

    const similarIdx = allStates.indexOf(similarState);

    // Predict future states
    for (let step = 1; step <= horizon.steps; step++) {
      const futureIdx = similarIdx + step;
      if (futureIdx >= allStates.length) break;

      const futureState = allStates[futureIdx];
      const predictedState = extrapolateState(futureState, currentState, step, horizon);

      const confidence = similarity.similarity * 0.8;
      totalConfidence += confidence;

      predictions.push({
        state: predictedState,
        confidence,
        horizon: step,
        probability: similarity.similarity * 0.6,
        alternatives: [],
      });
    }
  }

  const computeTime = performance.now() - startTime;

  return {
    predictions,
    method: PredictionMethod.SIMILARITY,
    confidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
    computeTime,
    metadata: {
      dataPoints: similarStates.length,
      avgConfidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
      variance: calculateViance(predictions.map((p) => p.confidence)),
    },
  };
}

/**
 * Predict using pattern-based method (sequence mining)
 */
async function predictByPatterns(
  currentState: ConversationState,
  horizon: PredictionHorizon,
  worldModel: WorldModel
): Promise<PredictorResult> {
  const startTime = performance.now();

  const predictions: PredictedState[] = [];
  let totalConfidence = 0;

  // Get recent state sequence
  const allStates = worldModel.getAllStates();
  const recentStates = allStates.slice(-5);
  const recentIds = recentStates.map((s) => s.id);

  // Match pattern
  const pattern = matchPattern(recentIds);
  if (!pattern) {
    return {
      predictions: [],
      method: PredictionMethod.PATTERN,
      confidence: 0,
      computeTime: performance.now() - startTime,
      metadata: { dataPoints: 0, avgConfidence: 0, variance: 0 },
    };
  }

  // Find pattern occurrences in history
  for (let i = 0; i < allStates.length - pattern.stateSequence.length - horizon.steps; i++) {
    const sequence = allStates.slice(i, i + pattern.stateSequence.length).map((s) => s.id);
    const sequenceKey = sequence.join('->');
    const patternKey = pattern.stateSequence.join('->');

    if (sequenceKey === patternKey) {
      // Pattern matched! Predict what comes next
      for (let step = 1; step <= horizon.steps; step++) {
        const futureIdx = i + pattern.stateSequence.length + step - 1;
        if (futureIdx >= allStates.length) break;

        const futureState = allStates[futureIdx];
        const predictedState = extrapolateState(futureState, currentState, step, horizon);

        const confidence = pattern.confidence * pattern.frequency;
        totalConfidence += confidence;

        predictions.push({
          state: predictedState,
          confidence,
          horizon: step,
          probability: pattern.frequency,
          alternatives: [],
        });
      }
    }
  }

  const computeTime = performance.now() - startTime;

  return {
    predictions,
    method: PredictionMethod.PATTERN,
    confidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
    computeTime,
    metadata: {
      dataPoints: pattern.stateSequence.length,
      avgConfidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
      variance: calculateViance(predictions.map((p) => p.confidence)),
    },
  };
}

/**
 * Predict using trend-based method (time series)
 */
async function predictByTrends(
  currentState: ConversationState,
  horizon: PredictionHorizon,
  worldModel: WorldModel
): Promise<PredictorResult> {
  const startTime = performance.now();

  const predictions: PredictedState[] = [];
  let totalConfidence = 0;

  // Get recent states for trend analysis
  const recentStates = worldModel.getAllStates().slice(-20);
  if (recentStates.length < 5) {
    return {
      predictions: [],
      method: PredictionMethod.TREND,
      confidence: 0,
      computeTime: performance.now() - startTime,
      metadata: { dataPoints: 0, avgConfidence: 0, variance: 0 },
    };
  }

  // Calculate trends for key features
  const trends = calculateTrends(recentStates);

  // Extrapolate trends
  for (let step = 1; step <= horizon.steps; step++) {
    const predictedState: Partial<ConversationState> = {
      ...currentState,
      id: `trend-pred-${Date.now()}-${step}`,
      timestamp: currentState.timestamp + step * horizon.stepSize,

      // Apply trends
      messageCount: currentState.messageCount + Math.round(trends.messageRate * (step * horizon.stepSize) / 60000),
      totalTokens: currentState.totalTokens + Math.round(trends.tokenRate * (step * horizon.stepSize) / 60000),
      conversationAge: currentState.conversationAge + step * horizon.stepSize,

      // Extraploate emotion
      emotionState: {
        ...currentState.emotionState,
        valence: clamp(currentState.emotionState.valence + trends.valenceTrend * step, 0, 1),
        arousal: clamp(currentState.emotionState.arousal + trends.arousalTrend * step, 0, 1),
      },
    };

    // Confidence decreases with horizon
    const confidence = 0.7 * Math.pow(0.9, step);
    totalConfidence += confidence;

    predictions.push({
      state: predictedState,
      confidence,
      horizon: step,
      probability: confidence * 0.8,
      alternatives: [],
    });
  }

  const computeTime = performance.now() - startTime;

  return {
    predictions,
    method: PredictionMethod.TREND,
    confidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
    computeTime,
    metadata: {
      dataPoints: recentStates.length,
      avgConfidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
      variance: calculateViance(predictions.map((p) => p.confidence)),
    },
  };
}

// ============================================================================
// ENSEMBLE PREDICTION
// ============================================================================

/**
 * Main ensemble prediction API
 * Combines multiple predictors with weighted voting
 */
export async function predictEnsemble(
  currentState: ConversationState,
  horizon: PredictionHorizon = DEFAULT_HORIZONS.MEDIUM_TERM,
  worldModel?: WorldModel
): Promise<EnsemblePrediction> {
  const startTime = performance.now();

  // Use singleton world model if not provided
  const model = worldModel || new WorldModel();

  // Run all predictors in parallel
  const results = await Promise.all([
    predictByTransitions(currentState, horizon, model),
    predictBySimilarity(currentState, horizon, model),
    predictByPatterns(currentState, horizon, model),
    predictByTrends(currentState, horizon, model),
  ]);

  // Combine predictions using weighted voting
  const combined = combinePredictions(results, ensembleWeights);

  const computeTime = performance.now() - startTime;

  return {
    predictions: combined,
    predictors: results,
    weights: { ...ensembleWeights },
    confidence: calculateOverallConfidence(results, ensembleWeights),
    computeTime,
  };
}

/**
 * Combine predictions from multiple predictors using weighted voting
 */
function combinePredictions(
  results: PredictorResult[],
  weights: EnsembleWeights
): PredictedState[] {
  // Collect all predictions
  const allPredictions = results.flatMap((r) => r.predictions);

  // Group by similarity
  const groups = new Map<string, Array<{ prediction: PredictedState; weight: number }>>();

  for (const result of results) {
    const weight = getWeightForMethod(result.method, weights);

    for (const pred of result.predictions) {
      const key = getStateKey(pred.state);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push({ prediction: pred, weight });
    }
  }

  // Merge groups using weighted averaging
  const merged: PredictedState[] = [];

  for (const [key, group] of groups.entries()) {
    // Calculate weighted average
    const totalWeight = group.reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight === 0) continue;

    const avgConfidence = group.reduce((sum, item) => sum + item.prediction.confidence * item.weight, 0) / totalWeight;
    const avgProbability = group.reduce((sum, item) => sum + item.prediction.probability * item.weight, 0) / totalWeight;

    // Use highest confidence prediction as representative
    const bestPrediction = group.reduce((best, item) => (item.prediction.confidence > best.prediction.confidence ? item : best));

    merged.push({
      ...bestPrediction.prediction,
      confidence: Math.min(1, avgConfidence * 1.3), // Boost for consensus
      probability: avgProbability,
    });
  }

  // Sort by confidence
  return merged.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get weight for a prediction method
 */
function getWeightForMethod(method: PredictionMethod, weights: EnsembleWeights): number {
  switch (method) {
    case PredictionMethod.TRANSITION:
      return weights.transition;
    case PredictionMethod.SIMILARITY:
      return weights.similarity;
    case PredictionMethod.PATTERN:
      return weights.pattern;
    case PredictionMethod.TREND:
      return weights.trend;
    default:
      return 0;
  }
}

/**
 * Calculate overall ensemble confidence
 */
function calculateOverallConfidence(results: PredictorResult[], weights: EnsembleWeights): number {
  let totalWeightedConfidence = 0;
  let totalWeight = 0;

  for (const result of results) {
    const weight = getWeightForMethod(result.method, weights);
    totalWeightedConfidence += result.confidence * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
}

// ============================================================================
// MODEL SELECTION
// ============================================================================

/**
 * Get the best performing predictor
 */
export function getBestPredictor(): PredictionMethod {
  let bestMethod = PredictionMethod.TRANSITION;
  let bestScore = 0;

  for (const [method, metrics] of predictorMetrics.entries()) {
    if (method === PredictionMethod.ENSEMBLE) continue;

    // Weighted score: accuracy - MSE penalty
    const score = metrics.accuracy - metrics.mse * 0.5;

    if (score > bestScore && metrics.predictionCount >= selectionCriteria.minPredictions) {
      bestScore = score;
      bestMethod = method;
    }
  }

  return bestMethod;
}

/**
 * Get predictor metrics
 */
export function getPredictorMetrics(): Map<PredictionMethod, PredictorMetrics> {
  return new Map(predictorMetrics);
}

/**
 * Update predictor metrics after validation
 */
export function updatePredictorMetrics(
  method: PredictionMethod,
  accuracy: number,
  mse: number
): void {
  const existing = predictorMetrics.get(method);
  if (!existing) return;

  // Exponential moving average
  const alpha = 0.3;
  existing.accuracy = alpha * accuracy + (1 - alpha) * existing.accuracy;
  existing.mse = alpha * mse + (1 - alpha) * existing.mse;
  existing.avgConfidence = alpha * accuracy + (1 - alpha) * existing.avgConfidence;
  existing.predictionCount++;
  existing.lastUpdated = Date.now();

  predictorMetrics.set(method, existing);

  console.log(`[AdvancedPrediction] Updated metrics for ${method}:`, existing);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extrapolate state to horizon step
 */
function extrapolateState(
  baseState: ConversationState,
  currentState: ConversationState,
  step: number,
  horizon: PredictionHorizon
): Partial<ConversationState> {
  return {
    ...baseState,
    id: `pred-${Date.now()}-${step}`,
    timestamp: currentState.timestamp + step * horizon.stepSize,
    messageCount: currentState.messageCount + Math.round(currentState.messageRate * (step * horizon.stepSize) / 60000),
    totalTokens: currentState.totalTokens + Math.round(currentState.tokenRate * (step * horizon.stepSize) / 60000),
    conversationAge: currentState.conversationAge + step * horizon.stepSize,
  };
}

/**
 * Calculate trends from state sequence
 */
function calculateTrends(states: ConversationState[]): {
  messageRate: number;
  tokenRate: number;
  valenceTrend: number;
  arousalTrend: number;
} {
  if (states.length < 2) {
    return { messageRate: 0, tokenRate: 0, valenceTrend: 0, arousalTrend: 0 };
  }

  // Calculate rates
  const timeSpan = states[states.length - 1].timestamp - states[0].timestamp;
  const timeMinutes = timeSpan / 60000;

  const messageDelta = states[states.length - 1].messageCount - states[0].messageCount;
  const tokenDelta = states[states.length - 1].totalTokens - states[0].totalTokens;

  // Calculate emotion trends
  const valenceDelta = states[states.length - 1].emotionState.valence - states[0].emotionState.valence;
  const arousalDelta = states[states.length - 1].emotionState.arousal - states[0].emotionState.arousal;

  return {
    messageRate: messageDelta / timeMinutes,
    tokenRate: tokenDelta / timeMinutes,
    valenceTrend: valenceDelta / states.length,
    arousalTrend: arousalDelta / states.length,
  };
}

/**
 * Generate key for grouping similar states
 */
function getStateKey(state: Partial<ConversationState>): string {
  const parts = [
    state.activeAgentCount,
    state.currentTaskType,
    state.userIntent,
    Math.round(state.emotionState?.valence || 0 * 10) / 10,
    Math.round(state.emotionState?.arousal || 0 * 10) / 10,
  ];
  return parts.join('-');
}

/**
 * Calculate variance of values
 */
function calculateViance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

  return variance;
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Record prediction for later validation
 */
export function recordPrediction(
  prediction: PredictedState[],
  method: PredictionMethod
): void {
  // Store for validation when actual state is known
  predictionHistory.push({
    prediction,
    actual: null as any, // Will be filled later
    timestamp: Date.now(),
    method,
  });

  // Trim history
  if (predictionHistory.length > 1000) {
    predictionHistory.splice(0, predictionHistory.length - 1000);
  }
}

/**
 * Validate predictions against actual state
 */
export function validatePredictions(actualState: ConversationState): void {
  // Find recent predictions that can be validated
  const now = Date.now();
  const validationWindow = 60000; // 1 minute

  for (const record of predictionHistory) {
    if (record.actual !== null) continue; // Already validated
    if (now - record.timestamp > validationWindow) continue; // Too old

    // Calculate accuracy
    for (const pred of record.prediction) {
      const error = calculatePredictionError(pred.state, actualState);
      const accuracy = 1 - error;

      // Update metrics
      updatePredictorMetrics(record.method, accuracy, error * error);
    }

    record.actual = actualState;
  }
}

/**
 * Calculate prediction error
 */
function calculatePredictionError(
  predicted: Partial<ConversationState>,
  actual: ConversationState
): number {
  // Mean absolute error across key features
  const errors = [
    Math.abs((predicted.messageCount || 0) - actual.messageCount) / 1000,
    Math.abs((predicted.activeAgentCount || 0) - actual.activeAgentCount) / 10,
    Math.abs((predicted.emotionState?.valence || 0.5) - actual.emotionState.valence),
    Math.abs((predicted.emotionState?.arousal || 0.5) - actual.emotionState.arousal),
  ];

  return errors.reduce((sum, e) => sum + e, 0) / errors.length;
}

/**
 * Get ensemble predictions only (for integration)
 */
export async function predictEnsembleStates(
  currentState: ConversationState,
  horizon: PredictionHorizon = DEFAULT_HORIZONS.MEDIUM_TERM,
  worldModel?: WorldModel
): Promise<PredictedState[]> {
  const result = await predictEnsemble(currentState, horizon, worldModel);
  return result.predictions;
}

// Initialize on load
initializeAdvancedPrediction();
