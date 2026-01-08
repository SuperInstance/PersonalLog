/**
 * Agent Transition Prediction Model
 *
 * Machine learning model for predicting next agent in workflow.
 * Uses a simple gradient boosting-like algorithm with online learning capability.
 *
 * @example
 * ```typescript
 * import { predictionModel } from '@/lib/prediction';
 *
 * // Train model
 * await predictionModel.train();
 *
 * // Predict next agent
 * const predictions = await predictionModel.predict({
 *   currentAgentId: 'jepa-v1',
 *   availableAgents: ['jepa-v1', 'spreader-v1'],
 *   conversation,
 *   recentActions: [],
 *   timestamp: Date.now(),
 * });
 *
 * // Update model with feedback
 * await predictionModel.recordFeedback(transitionId, true);
 * ```
 */

import {
  AgentTransition,
  AgentPrediction,
  PredictionContext,
  PredictionResult,
  ModelMetadata,
  ModelMetrics,
  TransitionFeatures,
  FeatureVector,
  DEFAULT_PREDICTION_CONFIG,
} from './types';
import { FeatureExtractor, extractFeatures } from './features';
import { transitionTracker } from './agent-transitions';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

interface AgentModelDB extends DBSchema {
  modelMetadata: {
    key: string;
    value: ModelMetadata;
  };
  modelWeights: {
    key: string;
    value: {
      agentId: string;
      weights: number[];
      lastUpdated: number;
    };
  };
  predictions: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      context: PredictionContext;
      predictions: AgentPrediction[];
      correctAgent: string | null;
    };
  };
  metrics: {
    key: string;
    value: ModelMetrics;
  };
}

// ============================================================================
// PREDICTION MODEL CLASS
// ============================================================================

/**
 * Simple Gradient Boosting-like Classifier
 *
 * Uses weighted feature combination with online learning.
 * Optimized for browser execution without external ML libraries.
 */
class SimpleClassifier {
  private weights: Map<string, number[]> = new Map();
  private biases: Map<string, number> = new Map();
  private learningRate: number = 0.01;
  private featureSize: number;

  constructor(featureSize: number) {
    this.featureSize = featureSize;
  }

  /**
   * Train on a single example
   *
   * @param features - Feature vector
   * @param agentId - Target agent ID
   * @param learningRate - Learning rate (default: 0.01)
   */
  train(features: FeatureVector, agentId: string, learningRate?: number): void {
    const lr = learningRate ?? this.learningRate;

    // Initialize weights if not exists
    if (!this.weights.has(agentId)) {
      this.weights.set(agentId, new Array(this.featureSize).fill(0));
      this.biases.set(agentId, 0);
    }

    const weights = this.weights.get(agentId)!;
    const bias = this.biases.get(agentId)!;

    // Calculate prediction
    let score = bias;
    for (let i = 0; i < this.featureSize; i++) {
      score += weights[i] * features[i];
    }

    // Convert to probability using sigmoid
    const probability = 1 / (1 + Math.exp(-score));

    // Calculate error (binary cross-entropy)
    const target = 1;
    const error = probability - target;

    // Update weights (gradient descent)
    for (let i = 0; i < this.featureSize; i++) {
      weights[i] -= lr * error * features[i];
    }

    // Update bias
    this.biases.set(agentId, bias - lr * error);
  }

  /**
   * Predict probabilities for all agents
   *
   * @param features - Feature vector
   * @param agentIds - All agent IDs
   * @returns Map of agent ID to probability
   */
  predict(features: FeatureVector, agentIds: string[]): Map<string, number> {
    const probabilities = new Map<string, number>();

    // Calculate scores for each agent
    const scores = new Map<string, number>();
    let totalScore = 0;

    for (const agentId of agentIds) {
      let score = this.biases.get(agentId) || 0;

      if (this.weights.has(agentId)) {
        const weights = this.weights.get(agentId)!;
        for (let i = 0; i < this.featureSize; i++) {
          score += weights[i] * features[i];
        }
      }

      scores.set(agentId, Math.exp(score)); // Use exp for softmax
      totalScore += Math.exp(score);
    }

    // Apply softmax to get probabilities
    for (const [agentId, score] of scores.entries()) {
      probabilities.set(agentId, score / totalScore);
    }

    return probabilities;
  }

  /**
   * Get weights for an agent
   */
  getWeights(agentId: string): number[] | undefined {
    return this.weights.get(agentId);
  }

  /**
   * Set weights for an agent
   */
  setWeights(agentId: string, weights: number[]): void {
    this.weights.set(agentId, weights);
  }

  /**
   * Get all agent IDs with weights
   */
  getTrainedAgents(): string[] {
    return Array.from(this.weights.keys());
  }

  /**
   * Clear all weights
   */
  clear(): void {
    this.weights.clear();
    this.biases.clear();
  }
}

// ============================================================================
// AGENT PREDICTION MODEL CLASS
// ============================================================================

/**
 * Agent Transition Prediction Model
 *
 * Main model class for training and prediction.
 */
export class AgentPredictionModel {
  private db: IDBPDatabase<AgentModelDB> | null = null;
  private classifier: SimpleClassifier | null = null;
  private featureExtractor: FeatureExtractor | null = null;
  private readonly DB_NAME = 'AgentPredictionModelDB';
  private readonly DB_VERSION = 1;
  private isInitialized = false;

  /**
   * Initialize the model
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Open database
    this.db = await openDB<AgentModelDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('modelMetadata')) {
          db.createObjectStore('modelMetadata');
        }
        if (!db.objectStoreNames.contains('modelWeights')) {
          db.createObjectStore('modelWeights');
        }
        if (!db.objectStoreNames.contains('predictions')) {
          db.createObjectStore('predictions');
        }
        if (!db.objectStoreNames.contains('metrics')) {
          db.createObjectStore('metrics');
        }
      },
    });

    // Load or create model metadata
    let metadata = await this.db.get('modelMetadata', 'current');
    if (!metadata) {
      metadata = await this.createInitialMetadata();
      await this.db.put('modelMetadata', metadata, 'current');
    }

    // Initialize classifier
    this.classifier = new SimpleClassifier(metadata.featureCount);
    this.featureExtractor = new FeatureExtractor();

    // Load weights if available
    await this.loadWeights();

    this.isInitialized = true;
  }

  /**
   * Create initial model metadata
   */
  private async createInitialMetadata(): Promise<ModelMetadata> {
    return {
      version: '1.0.0',
      trainingSamples: 0,
      lastTrainedAt: Date.now(),
      accuracy: 0,
      featureCount: 64,
      agentCount: 0,
    };
  }

  /**
   * Ensure model is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // ========================================================================
  // TRAINING
  // ========================================================================

  /**
   * Train model on historical transition data
   *
   * @param epochs - Number of training epochs (default: 10)
   * @returns Training metrics
   */
  async train(epochs: number = 10): Promise<ModelMetrics> {
    await this.ensureInitialized();
    await transitionTracker.initialize();

    // Get all transitions
    const transitions = await transitionTracker.getAllTransitions();

    if (transitions.length < DEFAULT_PREDICTION_CONFIG.minTrainingSamples) {
      throw new Error(
        `Insufficient training data: ${transitions.length} samples, ` +
        `need at least ${DEFAULT_PREDICTION_CONFIG.minTrainingSamples}`
      );
    }

    // Get all unique agents
    const agentIds = new Set<string>();
    for (const trans of transitions) {
      if (trans.fromAgentId) agentIds.add(trans.fromAgentId);
      agentIds.add(trans.toAgentId);
    }

    const agentArray = Array.from(agentIds);

    // Update feature extractor
    this.featureExtractor!.updateAgentIndexes(agentArray);

    // Train classifier
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle transitions
      const shuffled = [...transitions].sort(() => Math.random() - 0.5);

      for (const transition of shuffled) {
        // Extract features
        const features = await this.extractFeaturesFromTransition(transition, agentArray);

        // Train on this example
        this.classifier!.train(features, transition.toAgentId);
      }
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(transitions, agentArray);

    // Update metadata
    const metadata = await this.db!.get('modelMetadata', 'current');
    if (metadata) {
      metadata.trainingSamples = transitions.length;
      metadata.lastTrainedAt = Date.now();
      metadata.accuracy = metrics.accuracy;
      metadata.agentCount = agentArray.length;
      await this.db!.put('modelMetadata', metadata, 'current');
    }

    // Save weights
    await this.saveWeights(agentArray);

    // Save metrics
    await this.db!.put('metrics', metrics, `metrics_${Date.now()}`);

    return metrics;
  }

  /**
   * Extract features from transition
   */
  private async extractFeaturesFromTransition(
    transition: AgentTransition,
    agentIds: string[]
  ): Promise<FeatureVector> {
    const context: PredictionContext = {
      currentAgentId: transition.fromAgentId,
      availableAgents: agentIds,
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

    const features = await this.featureExtractor!.extractFeatures(context);
    return this.featureExtractor!.featuresToVector(features);
  }

  /**
   * Calculate model metrics
   */
  private async calculateMetrics(
    transitions: AgentTransition[],
    agentIds: string[]
  ): Promise<ModelMetrics> {
    let correct = 0;
    let top3Correct = 0;
    let total = transitions.length;

    const confusionMatrix = new Map<string, Map<string, number>>();
    const precisionSum = new Map<string, { tp: number; fp: number }>();
    const recallSum = new Map<string, { tp: number; fn: number }>();

    for (const transition of transitions) {
      const features = await this.extractFeaturesFromTransition(transition, agentIds);
      const probabilities = this.classifier!.predict(features, agentIds);

      // Sort by probability
      const sorted = Array.from(probabilities.entries())
        .sort((a, b) => b[1] - a[1]);

      // Top-1 accuracy
      if (sorted[0]?.[0] === transition.toAgentId) {
        correct++;
      }

      // Top-3 accuracy
      const top3 = sorted.slice(0, 3).map((s) => s[0]);
      if (top3.includes(transition.toAgentId)) {
        top3Correct++;
      }

      // Confusion matrix
      if (!confusionMatrix.has(transition.toAgentId)) {
        confusionMatrix.set(transition.toAgentId, new Map());
      }
      const row = confusionMatrix.get(transition.toAgentId)!;
      const predicted = sorted[0]?.[0] || '';
      row.set(predicted, (row.get(predicted) || 0) + 1);

      // Precision/recall tracking
      if (!precisionSum.has(transition.toAgentId)) {
        precisionSum.set(transition.toAgentId, { tp: 0, fp: 0 });
      }
      if (!recallSum.has(transition.toAgentId)) {
        recallSum.set(transition.toAgentId, { tp: 0, fn: 0 });
      }

      if (predicted === transition.toAgentId) {
        precisionSum.get(predicted)!.tp++;
        recallSum.get(transition.toAgentId)!.tp++;
      } else {
        precisionSum.get(predicted)!.fp++;
        recallSum.get(transition.toAgentId)!.fn++;
      }
    }

    // Calculate precision and recall
    const precision = new Map<string, number>();
    const recall = new Map<string, number>();

    for (const [agentId, stats] of precisionSum.entries()) {
      const p = stats.tp / (stats.tp + stats.fp || 1);
      precision.set(agentId, p);
    }

    for (const [agentId, stats] of recallSum.entries()) {
      const r = stats.tp / (stats.tp + stats.fn || 1);
      recall.set(agentId, r);
    }

    // Calculate F1 score
    const precisionValues = Array.from(precision.values());
    const recallValues = Array.from(recall.values());
    const avgPrecision = precisionValues.reduce((a, b) => a + b, 0) / precisionValues.length;
    const avgRecall = recallValues.reduce((a, b) => a + b, 0) / recallValues.length;
    const f1Score = 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall || 1);

    return {
      accuracy: correct / total,
      top3Accuracy: top3Correct / total,
      mse: 0, // Not applicable for classification
      confusionMatrix,
      precision,
      recall,
      f1Score,
      timestamp: Date.now(),
    };
  }

  // ========================================================================
  // PREDICTION
  // ========================================================================

  /**
   * Predict next agent(s) given current context
   *
   * @param context - Prediction context
   * @returns Prediction result
   */
  async predict(context: PredictionContext): Promise<PredictionResult> {
    await this.ensureInitialized();

    // Extract features
    const features = await this.featureExtractor!.extractFeatures(context);
    const featureVector = this.featureExtractor!.featuresToVector(features);

    // Get probabilities
    const probabilities = this.classifier!.predict(
      featureVector,
      context.availableAgents
    );

    // Sort by probability
    const sorted = Array.from(probabilities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, DEFAULT_PREDICTION_CONFIG.maxPredictions);

    // Convert to predictions
    const predictions: AgentPrediction[] = sorted.map(([agentId, prob]) => ({
      agentId,
      confidence: prob,
      probability: prob,
    }));

    // Get model metadata
    const metadata = await this.db!.get('modelMetadata', 'current');

    // Store prediction
    const predictionId = `pred_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await this.db!.put('predictions', {
      id: predictionId,
      timestamp: Date.now(),
      context,
      predictions,
      correctAgent: null,
    });

    return {
      predictions,
      features,
      modelVersion: metadata?.version || '1.0.0',
      timestamp: Date.now(),
      confidence: predictions[0]?.confidence || 0,
    };
  }

  /**
   * Record feedback on prediction
   *
   * @param predictionId - Prediction ID
   * @param correct - Whether prediction was correct
   */
  async recordFeedback(predictionId: string, correct: boolean): Promise<void> {
    await this.ensureInitialized();

    const prediction = await this.db!.get('predictions', predictionId);
    if (!prediction) {
      throw new Error(`Prediction not found: ${predictionId}`);
    }

    // TODO: Use feedback for online learning
    // For now, just store it
  }

  /**
   * Update model with new transition (online learning)
   *
   * @param transition - New transition
   */
  async updateModel(transition: AgentTransition): Promise<void> {
    await this.ensureInitialized();

    if (!DEFAULT_PREDICTION_CONFIG.enableOnlineLearning) {
      return;
    }

    // Get all agents
    const agentIds = this.classifier!.getTrainedAgents();
    if (agentIds.length === 0) {
      return; // Model not trained yet
    }

    // Extract features and train
    const features = await this.extractFeaturesFromTransition(transition, agentIds);
    this.classifier!.train(features, transition.toAgentId);

    // Save updated weights
    await this.saveWeights(agentIds);
  }

  // ========================================================================
  // MODEL MANAGEMENT
  // ========================================================================

  /**
   * Get model accuracy
   */
  async getModelAccuracy(): Promise<number> {
    await this.ensureInitialized();

    const metadata = await this.db!.get('modelMetadata', 'current');
    return metadata?.accuracy || 0;
  }

  /**
   * Get model version
   */
  async getModelVersion(): Promise<string> {
    await this.ensureInitialized();

    const metadata = await this.db!.get('modelMetadata', 'current');
    return metadata?.version || '1.0.0';
  }

  /**
   * Get training sample count
   */
  async getTrainingSampleCount(): Promise<number> {
    await this.ensureInitialized();

    const metadata = await this.db!.get('modelMetadata', 'current');
    return metadata?.trainingSamples || 0;
  }

  /**
   * Check if model is trained
   */
  async isModelTrained(): Promise<boolean> {
    await this.ensureInitialized();

    const metadata = await this.db!.get('modelMetadata', 'current');
    return (metadata?.trainingSamples || 0) >= DEFAULT_PREDICTION_CONFIG.minTrainingSamples;
  }

  /**
   * Reset model (clear all training data)
   */
  async resetModel(): Promise<void> {
    await this.ensureInitialized();

    this.classifier!.clear();

    await this.db!.clear('modelWeights');
    await this.db!.clear('predictions');

    const metadata = await this.createInitialMetadata();
    await this.db!.put('modelMetadata', metadata, 'current');
  }

  // ========================================================================
  // PERSISTENCE
  // ========================================================================

  /**
   * Save model weights to database
   */
  private async saveWeights(agentIds: string[]): Promise<void> {
    const tx = this.db!.transaction('modelWeights', 'readwrite');

    for (const agentId of agentIds) {
      const weights = this.classifier!.getWeights(agentId);
      if (weights) {
        await tx.store.put({
          agentId,
          weights: Array.from(weights),
          lastUpdated: Date.now(),
        });
      }
    }
  }

  /**
   * Load model weights from database
   */
  private async loadWeights(): Promise<void> {
    const tx = this.db!.transaction('modelWeights', 'readonly');

    for await (const cursor of tx.store) {
      const { agentId, weights } = cursor.value;
      this.classifier!.setWeights(agentId, weights);
    }
  }

  // ========================================================================
  // METRICS
  // ========================================================================

  /**
   * Get recent metrics
   */
  async getRecentMetrics(count: number = 10): Promise<ModelMetrics[]> {
    await this.ensureInitialized();

    const metrics: ModelMetrics[] = [];
    const tx = this.db!.transaction('metrics', 'readonly');

    let remaining = count;
    for await (const cursor of tx.store.iterate(null, 'prev')) {
      if (remaining <= 0) break;
      metrics.push(cursor.value);
      remaining--;
    }

    return metrics;
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

/**
 * Global agent prediction model instance
 */
export const predictionModel = new AgentPredictionModel();
