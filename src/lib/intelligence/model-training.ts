/**
 * Model Training Pipeline for World Model
 *
 * Implements complete ML training pipeline:
 * - Train world model on historical state transitions
 * - Cross-validation (k-fold)
 * - Hyperparameter tuning
 * - Model versioning and A/B testing
 * - Online learning updates
 *
 * Features:
 * - Automated training on state sequences
 * - Performance metrics and validation
 * - Model comparison and selection
 * - Continuous learning from new data
 *
 * Part of Neural MPC Phase 2: Model Training
 */

import type {
  ConversationState,
  StateTransition,
  WorldModelConfig,
} from './world-model-types';
import { WorldModel } from './world-model';
import { DEFAULT_WORLD_MODEL_CONFIG } from './world-model-types';
import { encodeState, decodeState, stateSimilarity } from './state-encoder';
import { learnTransitions, exportTransitions, importTransitions } from './transition-learner';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Training data sample
 */
export interface TrainingSample {
  /** Input state */
  inputState: ConversationState;
  /** Target state (what actually happened) */
  targetState: ConversationState;
  /** Transition trigger */
  trigger: string;
  /** Time delta */
  timeDelta: number;
}

/**
 * Training dataset
 */
export interface TrainingDataset {
  /** Training samples */
  samples: TrainingSample[];
  /** Created timestamp */
  created: number;
  /** Last updated timestamp */
  updated: number;
  /** Dataset size */
  size: number;
}

/**
 * Model version metadata
 */
export interface ModelVersion {
  /** Version ID */
  id: string;
  /** Version number */
  version: number;
  /** Created timestamp */
  created: number;
  /** Training metrics */
  metrics: TrainingMetrics;
  /** Model configuration */
  config: WorldModelConfig;
  /** Is this the active model */
  active: boolean;
  /** Model data (serialized) */
  data: {
    transitions: ReturnType<typeof exportTransitions>;
    encodedStates: Map<string, Float32Array>;
  };
}

/**
 * Training metrics
 */
export interface TrainingMetrics {
  /** Training accuracy (0-1) */
  accuracy: number;
  /** Validation accuracy (0-1) */
  validationAccuracy: number;
  /** Mean squared error */
  mse: number;
  /** Mean absolute error */
  mae: number;
  /** Training time (ms) */
  trainingTime: number;
  /** Number of samples */
  sampleCount: number;
  /** Number of epochs */
  epochs: number;
}

/**
 * Cross-validation result
 */
export interface CrossValidationResult {
  /** Fold results */
  folds: TrainingMetrics[];
  /** Average metrics across folds */
  averageMetrics: TrainingMetrics;
  /** Standard deviation of metrics */
  stdDev: {
    accuracy: number;
    mse: number;
    mae: number;
  };
}

/**
 * Hyperparameter configuration
 */
export interface HyperparameterConfig {
  /** State encoding dimensions */
  encodingDimensions: number[];
  /** Transition learning min occurrences */
  minOccurrences: number[];
  /** Prediction horizon steps */
  horizonSteps: number[];
  /** Confidence decay rates */
  confidenceDecay: number[];
}

/**
 * Hyperparameter tuning result
 */
export interface HyperparameterResult {
  /** Best configuration */
  bestConfig: Partial<WorldModelConfig>;
  /** Best validation accuracy */
  bestAccuracy: number;
  /** All tested configurations */
  allResults: Array<{
    config: Partial<WorldModelConfig>;
    metrics: TrainingMetrics;
  }>;
}

/**
 * Model comparison result
 */
export interface ModelComparison {
  /** Model versions compared */
  versions: string[];
  /** Performance comparison */
  performance: Array<{
    version: string;
    accuracy: number;
    mse: number;
    mae: number;
  }>;
  /** Recommendation */
  recommendation: string;
  /** Confidence in recommendation (0-1) */
  confidence: number;
}

// ============================================================================
// STATE
// ============================================================================

// Model versions storage
const modelVersions = new Map<string, ModelVersion>();
let currentVersion = 0;

// Training dataset
let trainingDataset: TrainingDataset = {
  samples: [],
  created: Date.now(),
  updated: Date.now(),
  size: 0,
};

// Training configuration
let trainingConfig = {
  // Cross-validation folds
  cvFolds: 5,

  // Test/train split ratio
  testSplitRatio: 0.2,

  // Maximum epochs
  maxEpochs: 100,

  // Early stopping patience
  earlyStoppingPatience: 10,

  // Minimum improvement threshold
  minImprovement: 0.001,

  // Batch size for training
  batchSize: 32,

  // Learning rate (for online learning)
  learningRate: 0.01,

  // Minimum samples for training
  minSamples: 50,
};

// ============================================================================
// DATASET MANAGEMENT
// ============================================================================

/**
 * Build training dataset from state sequence
 */
export function buildDataset(states: ConversationState[]): TrainingDataset {
  const samples: TrainingSample[] = [];

  for (let i = 0; i < states.length - 1; i++) {
    const inputState = states[i];
    const targetState = states[i + 1];
    const timeDelta = targetState.timestamp - inputState.timestamp;

    // Infer trigger
    const trigger = inferTrigger(inputState, targetState);

    samples.push({
      inputState,
      targetState,
      trigger,
      timeDelta,
    });
  }

  trainingDataset = {
    samples,
    created: Date.now(),
    updated: Date.now(),
    size: samples.length,
  };

  console.log(`[ModelTraining] Built dataset with ${samples.length} samples`);

  return trainingDataset;
}

/**
 * Add sample to dataset (for online learning)
 */
export function addSample(sample: TrainingSample): void {
  trainingDataset.samples.push(sample);
  trainingDataset.updated = Date.now();
  trainingDataset.size = trainingDataset.samples.length;
}

/**
 * Get training dataset
 */
export function getDataset(): TrainingDataset {
  return { ...trainingDataset };
}

/**
 * Clear training dataset
 */
export function clearDataset(): void {
  trainingDataset = {
    samples: [],
    created: Date.now(),
    updated: Date.now(),
    size: 0,
  };
}

/**
 * Split dataset into train and test sets
 */
function splitDataset(dataset: TrainingDataset, testRatio: number): {
  train: TrainingSample[];
  test: TrainingSample[];
} {
  const shuffled = [...dataset.samples].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * (1 - testRatio));

  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex),
  };
}

/**
 * Split dataset for k-fold cross-validation
 */
function splitKFold(dataset: TrainingDataset, k: number): TrainingSample[][] {
  const shuffled = [...dataset.samples].sort(() => Math.random() - 0.5);
  const foldSize = Math.floor(shuffled.length / k);
  const folds: TrainingSample[][] = [];

  for (let i = 0; i < k; i++) {
    const start = i * foldSize;
    const end = i === k - 1 ? shuffled.length : (i + 1) * foldSize;
    folds.push(shuffled.slice(start, end));
  }

  return folds;
}

// ============================================================================
// MODEL TRAINING
// ============================================================================

/**
 * Main training API
 * Trains world model on historical state transitions
 */
export async function trainModel(
  dataset: TrainingDataset = trainingDataset,
  config?: Partial<WorldModelConfig>
): Promise<ModelVersion> {
  console.log('[ModelTraining] Starting model training...');

  if (dataset.size < trainingConfig.minSamples) {
    throw new Error(`Dataset too small: ${dataset.size} samples (minimum: ${trainingConfig.minSamples})`);
  }

  const startTime = performance.now();

  // Create new model with config
  const modelConfig = { ...DEFAULT_WORLD_MODEL_CONFIG, ...config };
  const model = new WorldModel(modelConfig);

  // Split into train and test
  const { train, test } = splitDataset(dataset, trainingConfig.testSplitRatio);

  console.log(`[ModelTraining] Train samples: ${train.length}, Test samples: ${test.length}`);

  // Train model
  for (const sample of train) {
    model.addState(sample.inputState);
  }

  // Wait for initialization
  await model.initialize();

  // Evaluate on test set
  const metrics = await evaluateModel(model, test);

  const trainingTime = performance.now() - startTime;

  // Create model version
  const version: ModelVersion = {
    id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    version: ++currentVersion,
    created: Date.now(),
    metrics: {
      ...metrics,
      trainingTime,
      sampleCount: dataset.size,
      epochs: 1, // Single pass for now
    },
    config: modelConfig,
    active: false,
    data: {
      transitions: exportTransitions(),
      encodedStates: new Map(), // Would need to export from model
    },
  };

  // Store version
  modelVersions.set(version.id, version);

  console.log('[ModelTraining] Training complete:', version.metrics);

  return version;
}

/**

/**
 * Evaluate model on test dataset
 */
async function evaluateModel(model: WorldModel, testSamples: TrainingSample[]): Promise<Omit<TrainingMetrics, 'trainingTime' | 'sampleCount' | 'epochs'>> {
  let totalAccuracy = 0;
  let totalMse = 0;
  let totalMae = 0;

  for (const sample of testSamples) {
    // Make prediction
    const predictions = await model.predictNextState(sample.inputState);

    // Get best prediction
    if (predictions.length > 0) {
      const bestPrediction = predictions[0];
      const error = calculateStateError(bestPrediction.state, sample.targetState);
      const accuracy = 1 - error;

      totalAccuracy += accuracy;
      totalMse += error * error;
      totalMae += error;
    }
  }

  const n = testSamples.length;

  return {
    accuracy: n > 0 ? totalAccuracy / n : 0,
    validationAccuracy: n > 0 ? totalAccuracy / n : 0,
    mse: n > 0 ? totalMse / n : 0,
    mae: n > 0 ? totalMae / n : 0,
  };
}

/**
 * Calculate error between predicted and actual state
 */
function calculateStateError(
  predicted: Partial<ConversationState>,
  actual: ConversationState
): number {
  const errors = [
    Math.abs((predicted.messageCount || 0) - actual.messageCount) / Math.max(1, actual.messageCount),
    Math.abs((predicted.activeAgentCount || 0) - actual.activeAgentCount) / Math.max(1, actual.activeAgentCount),
    Math.abs((predicted.emotionState?.valence || 0.5) - actual.emotionState.valence),
    Math.abs((predicted.emotionState?.arousal || 0.5) - actual.emotionState.arousal),
    Math.abs((predicted.totalTokens || 0) - actual.totalTokens) / Math.max(1, actual.totalTokens),
  ];

  return errors.reduce((sum, e) => sum + e, 0) / errors.length;
}

// ============================================================================
// CROSS-VALIDATION
// ============================================================================

/**
 * Perform k-fold cross-validation
 */
export async function crossValidate(
  dataset: TrainingDataset = trainingDataset,
  k: number = trainingConfig.cvFolds,
  config?: Partial<WorldModelConfig>
): Promise<CrossValidationResult> {
  console.log(`[ModelTraining] Starting ${k}-fold cross-validation...`);

  const folds = splitKFold(dataset, k);
  const foldMetrics: TrainingMetrics[] = [];

  for (let i = 0; i < k; i++) {
    console.log(`[ModelTraining] Training fold ${i + 1}/${k}...`);

    // Use fold i as test, rest as train
    const testSet = folds[i];
    const trainSet = folds.flatMap((fold, idx) => (idx === i ? [] : fold));

    // Create temporary dataset
    const trainDataset: TrainingDataset = {
      samples: trainSet,
      created: Date.now(),
      updated: Date.now(),
      size: trainSet.length,
    };

    // Train model
    const startTime = performance.now();
    const model = new WorldModel(config);

    for (const sample of trainSet) {
      model.addState(sample.inputState);
    }

    await model.initialize();

    // Evaluate
    const metrics = await evaluateModel(model, testSet);
    const trainingTime = performance.now() - startTime;

    foldMetrics.push({
      ...metrics,
      trainingTime,
      sampleCount: trainSet.length,
      epochs: 1,
    });
  }

  // Calculate average metrics
  const avgMetrics = calculateAverageMetrics(foldMetrics);

  // Calculate standard deviation
  const stdDev = calculateStdDev(foldMetrics);

  console.log('[ModelTraining] Cross-validation complete:', avgMetrics);

  return {
    folds: foldMetrics,
    averageMetrics: avgMetrics,
    stdDev,
  };
}

/**
 * Calculate average metrics across folds
 */
function calculateAverageMetrics(metrics: TrainingMetrics[]): TrainingMetrics {
  return {
    accuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length,
    validationAccuracy: metrics.reduce((sum, m) => sum + m.validationAccuracy, 0) / metrics.length,
    mse: metrics.reduce((sum, m) => sum + m.mse, 0) / metrics.length,
    mae: metrics.reduce((sum, m) => sum + m.mae, 0) / metrics.length,
    trainingTime: metrics.reduce((sum, m) => sum + m.trainingTime, 0) / metrics.length,
    sampleCount: metrics.reduce((sum, m) => sum + m.sampleCount, 0) / metrics.length,
    epochs: metrics.reduce((sum, m) => sum + m.epochs, 0) / metrics.length,
  };
}

/**
 * Calculate standard deviation of metrics
 */
function calculateStdDev(metrics: TrainingMetrics[]): { accuracy: number; mse: number; mae: number } {
  const avgAccuracy = metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length;
  const avgMse = metrics.reduce((sum, m) => sum + m.mse, 0) / metrics.length;
  const avgMae = metrics.reduce((sum, m) => sum + m.mae, 0) / metrics.length;

  const varianceAccuracy = metrics.reduce((sum, m) => sum + Math.pow(m.accuracy - avgAccuracy, 2), 0) / metrics.length;
  const varianceMse = metrics.reduce((sum, m) => sum + Math.pow(m.mse - avgMse, 2), 0) / metrics.length;
  const varianceMae = metrics.reduce((sum, m) => sum + Math.pow(m.mae - avgMae, 2), 0) / metrics.length;

  return {
    accuracy: Math.sqrt(varianceAccuracy),
    mse: Math.sqrt(varianceMse),
    mae: Math.sqrt(varianceMae),
  };
}

// ============================================================================
// HYPERPARAMETER TUNING
// ============================================================================

/**
 * Tune hyperparameters using grid search
 */
export async function tuneHyperparameters(
  dataset: TrainingDataset = trainingDataset,
  configSpace?: HyperparameterConfig
): Promise<HyperparameterResult> {
  console.log('[ModelTraining] Starting hyperparameter tuning...');

  const hyperparams: HyperparameterConfig = configSpace || {
    encodingDimensions: [16, 32, 64],
    minOccurrences: [1, 3, 5],
    horizonSteps: [3, 6, 12],
    confidenceDecay: [0.1, 0.15, 0.2],
  };

  const allResults: Array<{ config: Partial<WorldModelConfig>; metrics: TrainingMetrics }> = [];

  // Generate all combinations
  const combinations = generateHyperparameterCombinations(hyperparams);

  console.log(`[ModelTraining] Testing ${combinations.length} hyperparameter combinations...`);

  for (const config of combinations) {
    try {
      // Quick cross-validation (3-fold for speed)
      const cvResult = await crossValidate(dataset, 3, config);

      allResults.push({
        config,
        metrics: cvResult.averageMetrics,
      });

      console.log(`[ModelTraining] Tested config: accuracy=${cvResult.averageMetrics.accuracy.toFixed(3)}`);
    } catch (error) {
      console.error('[ModelTraining] Error testing config:', error);
    }
  }

  // Find best configuration
  const bestResult = allResults.reduce((best, current) => (current.metrics.accuracy > best.metrics.accuracy ? current : best));

  console.log('[ModelTraining] Best hyperparameters:', bestResult.config);

  return {
    bestConfig: bestResult.config,
    bestAccuracy: bestResult.metrics.accuracy,
    allResults,
  };
}

/**
 * Generate all hyperparameter combinations
 */
function generateHyperparameterCombinations(space: HyperparameterConfig): Array<Partial<WorldModelConfig>> {
  const combinations: Array<Partial<WorldModelConfig>> = [];

  for (const encodingDim of space.encodingDimensions) {
    for (const minOcc of space.minOccurrences) {
      for (const steps of space.horizonSteps) {
        for (const decay of space.confidenceDecay) {
          combinations.push({
            encoding: {
              targetDimensions: encodingDim,
              method: 'simple',
              normalization: 'minmax',
              cache: true,
            },
            transitionLearning: {
              minOccurrences: minOcc,
              maxHistorySize: 1000,
              minSupport: 0.1,
              useTemporalDecay: true,
              decayRate: 0.05,
            },
            horizon: {
              steps,
              stepSize: 10000,
              maxWindow: steps * 10000,
              confidenceDecay: decay,
            },
            minConfidence: 0.3,
            maxStateHistory: 500,
            onlineLearning: true,
            updateInterval: 30000,
          });
        }
      }
    }
  }

  return combinations;
}

// ============================================================================
// MODEL VERSIONING
// ============================================================================

/**
 * Get model version by ID
 */
export function getModelVersion(id: string): ModelVersion | undefined {
  return modelVersions.get(id);
}

/**
 * Get all model versions
 */
export function getAllModelVersions(): ModelVersion[] {
  return Array.from(modelVersions.values()).sort((a, b) => b.version - a.version);
}

/**
 * Get active model version
 */
export function getActiveModel(): ModelVersion | undefined {
  return Array.from(modelVersions.values()).find((v) => v.active);
}

/**
 * Activate model version
 */
export function activateModel(id: string): void {
  // Deactivate all models
  for (const version of modelVersions.values()) {
    version.active = false;
  }

  // Activate specified model
  const model = modelVersions.get(id);
  if (model) {
    model.active = true;
    console.log(`[ModelTraining] Activated model ${id}`);
  }
}

/**
 * Delete model version
 */
export function deleteModelVersion(id: string): void {
  const model = modelVersions.get(id);
  if (model?.active) {
    throw new Error('Cannot delete active model');
  }

  modelVersions.delete(id);
  console.log(`[ModelTraining] Deleted model ${id}`);
}

// ============================================================================
// MODEL COMPARISON
// ============================================================================

/**
 * Compare multiple model versions
 */
export function compareModels(versionIds: string[]): ModelComparison {
  const versions = versionIds.map((id) => modelVersions.get(id)).filter((v) => v !== undefined) as ModelVersion[];

  if (versions.length < 2) {
    throw new Error('Need at least 2 models to compare');
  }

  const performance = versions.map((v) => ({
    version: v.id,
    accuracy: v.metrics.accuracy,
    mse: v.metrics.mse,
    mae: v.metrics.mae,
  }));

  // Find best model
  const best = performance.reduce((best, current) => (current.accuracy > best.accuracy ? current : best));

  // Calculate confidence in recommendation
  const accuracies = performance.map((p) => p.accuracy);
  const avgAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, a) => sum + Math.pow(a - avgAccuracy, 2), 0) / accuracies.length;
  const confidence = Math.max(0, 1 - Math.sqrt(variance));

  return {
    versions: versionIds,
    performance,
    recommendation: best.version,
    confidence,
  };
}

/**
 * Get best model version
 */
export function getBestModel(): ModelVersion | undefined {
  const versions = Array.from(modelVersions.values());
  if (versions.length === 0) return undefined;

  return versions.reduce((best, current) => (current.metrics.accuracy > best.metrics.accuracy ? current : best));
}

// ============================================================================
// ONLINE LEARNING
// ============================================================================

/**
 * Update model with new sample (online learning)
 */
export function onlineUpdate(model: WorldModel, sample: TrainingSample): void {
  // Add new state
  model.addState(sample.inputState);

  console.log('[ModelTraining] Online learning update complete');
}

/**
 * Batch online learning update
 */
export function batchOnlineUpdate(model: WorldModel, samples: TrainingSample[]): void {
  for (const sample of samples) {
    model.addState(sample.inputState);
  }

  console.log(`[ModelTraining] Batch online learning: ${samples.length} samples`);
}

// ============================================================================
// VALIDATION API
// ============================================================================

/**
 * Validate model performance
 */
export async function validateModel(modelId: string, dataset: TrainingDataset): Promise<TrainingMetrics> {
  const version = modelVersions.get(modelId);
  if (!version) {
    throw new Error(`Model not found: ${modelId}`);
  }

  // Create model from version
  const model = new WorldModel(version.config);

  // Import transitions
  importTransitions(version.data.transitions);

  // Evaluate
  const { train, test } = splitDataset(dataset, trainingConfig.testSplitRatio);
  const metrics = await evaluateModel(model, test);

  return {
    ...metrics,
    trainingTime: version.metrics.trainingTime,
    sampleCount: dataset.size,
    epochs: version.metrics.epochs,
  };
}

/**
 * Get model metrics
 */
export function getModelMetrics(modelId: string): TrainingMetrics | undefined {
  const version = modelVersions.get(modelId);
  return version?.metrics;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Infer trigger for state transition
 */
function inferTrigger(fromState: ConversationState, toState: ConversationState): string {
  const timeDelta = toState.timestamp - fromState.timestamp;

  // Agent changes
  if (toState.activeAgentCount > fromState.activeAgentCount) {
    return 'agent_activated';
  }
  if (toState.activeAgentCount < fromState.activeAgentCount) {
    return 'agent_deactivated';
  }

  // Task changes
  if (toState.currentTaskType !== fromState.currentTaskType) {
    return toState.currentTaskType ? 'task_started' : 'task_completed';
  }

  // Emotion changes
  const emotionDelta = Math.abs(toState.emotionState.valence - fromState.emotionState.valence) + Math.abs(toState.emotionState.arousal - fromState.emotionState.arousal);
  if (emotionDelta > 0.5) {
    return 'emotion_shift';
  }

  // Topic changes
  if (toState.currentTopic !== fromState.currentTopic) {
    return 'topic_change';
  }

  // Message added
  if (toState.messageCount > fromState.messageCount) {
    return 'user_message';
  }

  // Default
  return 'unknown';
}

/**
 * Export trained model
 */
export function exportModel(modelId: string): string {
  const version = modelVersions.get(modelId);
  if (!version) {
    throw new Error(`Model not found: ${modelId}`);
  }

  return JSON.stringify({
    id: version.id,
    version: version.version,
    created: version.created,
    metrics: version.metrics,
    config: version.config,
    data: {
      transitions: version.data.transitions,
    },
  });
}

/**
 * Import trained model
 */
export function importModel(data: string): ModelVersion {
  const parsed = JSON.parse(data);

  const version: ModelVersion = {
    id: parsed.id,
    version: parsed.version,
    created: parsed.created,
    metrics: parsed.metrics,
    config: parsed.config,
    active: false,
    data: {
      transitions: parsed.data.transitions,
      encodedStates: new Map(),
    },
  };

  modelVersions.set(version.id, version);

  console.log(`[ModelTraining] Imported model ${version.id}`);

  return version;
}

// Set default training config
export { trainingConfig };
