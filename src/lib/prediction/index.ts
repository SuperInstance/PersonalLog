/**
 * Agent Transition Prediction System
 *
 * ML-based prediction system for anticipating which agent will be needed next
 * in the workflow. Tracks agent usage patterns, extracts features, and trains
 * a model to predict transitions with >70% accuracy.
 *
 * @example
 * ```typescript
 * import { predictionModel, transitionTracker } from '@/lib/prediction';
 *
 * // Initialize system
 * await transitionTracker.initialize();
 * await predictionModel.initialize();
 *
 * // Track transition
 * await transitionTracker.recordTransition({
 *   fromAgentId: 'jepa-v1',
 *   toAgentId: 'spreader-v1',
 *   conversationId: 'conv_123',
 *   taskType: TaskType.ANALYSIS,
 *   // ... other fields
 * });
 *
 * // Train model
 * await predictionModel.train();
 *
 * // Predict next agent
 * const predictions = await predictionModel.predict(context);
 * console.log(`Next agent likely: ${predictions.predictions[0].agentId}`);
 * ```
 */

import type {
  AgentTransition,
  ActionRecord,
  TransitionFeatures,
  FeatureVector,
  AgentPrediction,
  PredictionContext,
  PredictionResult,
  ModelMetadata,
  TrainingStatistics,
  ModelMetrics,
  PredictionConfig,
} from './types';

// Re-export types
export type {
  AgentTransition,
  ActionRecord,
  TransitionFeatures,
  FeatureVector,
  AgentPrediction,
  PredictionContext,
  PredictionResult,
  ModelMetadata,
  TrainingStatistics,
  ModelMetrics,
  PredictionConfig,
}

// Export enums (need to be exported as values)
export { TaskType, TimeOfDay, ActionType, DEFAULT_PREDICTION_CONFIG } from './types';

// Export transition tracker
export {
  AgentTransitionTracker,
  transitionTracker,
} from './agent-transitions';

// Export feature engineering
export {
  FeatureExtractor,
  extractFeatures,
  extractFeaturesFromTransition,
  normalizeFeatureVector,
  featureSimilarity,
} from './features';

// Export prediction model
export {
  AgentPredictionModel,
  predictionModel,
} from './agent-model';
