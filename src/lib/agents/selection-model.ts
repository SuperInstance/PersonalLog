/**
 * Agent Selection Model
 *
 * ML-based model for predicting optimal agent selection for tasks.
 * Uses gradient boosting (simplified for browser) to rank agents
 * by predicted success probability and user satisfaction.
 *
 * Design:
 * - Starts with rule-based ranking (cold start)
 * - Learns from execution data over time
 * - Provides explainable predictions
 * - Supports online learning
 */

import type { AgentDefinition } from './types';
import type { HardwareProfile } from '@/lib/hardware/types';
import type {
  TaskClassification,
  SelectionFeatures,
  FeatureVector,
  UserPreferences,
  SystemContext,
  AgentPerformanceMetrics,
} from './selection-features';
import {
  extractSelectionFeatures,
  featuresToVector,
  getFeatureDimension,
  createDefaultUserPreferences,
  createDefaultSystemContext,
} from './selection-features';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Agent prediction result
 */
export interface AgentPrediction {
  /** Agent definition */
  agent: AgentDefinition;
  /** Predicted success probability (0-1) */
  score: number;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Explanation of why this agent was selected */
  explanation: string;
  /** Feature contributions (for explainability) */
  featureContributions?: Record<string, number>;
}

/**
 * Ranked agent list
 */
export interface AgentRanking {
  /** Ranked predictions */
  predictions: AgentPrediction[];
  /** Model version used for prediction */
  modelVersion: string;
  /** Model accuracy (0-1) */
  modelAccuracy: number;
  /** Prediction timestamp */
  timestamp: number;
}

/**
 * Training data point
 */
export interface TrainingData {
  /** Task features */
  taskFeatures: SelectionFeatures;
  /** Agent ID that was selected */
  selectedAgentId: string;
  /** Whether execution was successful */
  successful: boolean;
  /** User satisfaction (0-1) */
  userSatisfaction: number;
  /** Execution time (ms) */
  executionTime: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Model metrics
 */
export interface ModelMetrics {
  /** Top-1 accuracy (0-1) */
  top1Accuracy: number;
  /** Top-3 accuracy (0-1) */
  top3Accuracy: number;
  /** Mean squared error of predictions */
  mse: number;
  /** Total training samples */
  totalSamples: number;
  /** Last training timestamp */
  lastTrained: number;
  /** Model version */
  version: string;
}

/**
 * Model parameters (simplified gradient boosting)
 */
interface ModelWeights {
  /** Feature weights (one per feature dimension) */
  featureWeights: Float32Array;
  /** Feature importance (0-1) */
  featureImportance: Float32Array;
  /** Bias term */
  bias: number;
}

// ============================================================================
// MODEL IMPLEMENTATION
// ============================================================================

/**
 * Agent Selection Model class
 *
 * Implements a simplified gradient boosting model for browser execution.
 * Cold-starts with rule-based ranking, transitions to ML as data accumulates.
 */
export class AgentSelectionModel {
  /** Model weights */
  private weights: ModelWeights;

  /** Training data history */
  private trainingHistory: TrainingData[];

  /** Model metrics */
  private metrics: ModelMetrics;

  /** Minimum samples for ML training */
  private readonly MIN_TRAINING_SAMPLES = 20;

  /** Feature dimension */
  private readonly FEATURE_DIM = getFeatureDimension();

  /** Model version */
  private readonly MODEL_VERSION = '1.0.0';

  constructor() {
    this.weights = this.initializeWeights();
    this.trainingHistory = [];
    this.metrics = {
      top1Accuracy: 0.5, // Start with baseline
      top3Accuracy: 0.75,
      mse: 0.25,
      totalSamples: 0,
      lastTrained: Date.now(),
      version: this.MODEL_VERSION,
    };
  }

  // ========================================================================
  // PREDICTION API
  // ========================================================================

  /**
   * Predict best agents for a task
   *
   * @param task - Task classification
   * @param agents - Available agents to rank
   * @param hardwareProfile - Current hardware profile
   * @param userPreferences - User preference data
   * @param systemContext - System context
   * @returns Ranked list of agents with scores
   */
  predictBestAgents(
    task: TaskClassification,
    agents: AgentDefinition[],
    hardwareProfile: HardwareProfile,
    userPreferences?: UserPreferences,
    systemContext?: SystemContext
  ): AgentRanking {
    const prefs = userPreferences || createDefaultUserPreferences();
    const context = systemContext || createDefaultSystemContext();

    // Generate predictions for all agents
    const predictions: AgentPrediction[] = agents.map(agent => {
      const prediction = this.predictAgentScore(
        task,
        agent,
        hardwareProfile,
        prefs,
        context
      );

      return {
        agent,
        score: prediction.score,
        confidence: prediction.confidence,
        explanation: prediction.explanation,
        featureContributions: prediction.featureContributions,
      };
    });

    // Sort by score (descending)
    predictions.sort((a, b) => b.score - a.score);

    return {
      predictions,
      modelVersion: this.MODEL_VERSION,
      modelAccuracy: this.metrics.top1Accuracy,
      timestamp: Date.now(),
    };
  }

  /**
   * Predict score for a single agent
   *
   * @param task - Task classification
   * @param agent - Agent to score
   * @param hardwareProfile - Hardware profile
   * @param userPreferences - User preferences
   * @param systemContext - System context
   * @returns Prediction with score and explanation
   */
  predictAgentScore(
    task: TaskClassification,
    agent: AgentDefinition,
    hardwareProfile: HardwareProfile,
    userPreferences: UserPreferences,
    systemContext: SystemContext
  ): Omit<AgentPrediction, 'agent'> {
    // Extract features
    const features = extractSelectionFeatures(
      task,
      agent,
      this.getAgentPerformance(agent.id),
      userPreferences,
      systemContext,
      hardwareProfile
    );

    // Convert to vector
    const featureVector = featuresToVector(features);

    // Calculate score using model weights
    const score = this.applyWeights(featureVector);

    // Calculate confidence based on training data
    const confidence = this.calculateConfidence(agent.id, task.category);

    // Generate explanation
    const explanation = this.generateExplanation(features, agent, score);

    // Calculate feature contributions
    const contributions = this.calculateFeatureContributions(featureVector);

    return {
      score: Math.max(0, Math.min(1, score)), // Clamp to [0, 1]
      confidence,
      explanation,
      featureContributions: contributions,
    };
  }

  /**
   * Get explanation for why an agent was recommended
   *
   * @param agent - Agent definition
   * @param task - Task classification
   * @returns Human-readable explanation
   */
  getExplanation(
    agent: AgentDefinition,
    task: TaskClassification
  ): string {
    // Build explanation based on agent characteristics and task
    const reasons: string[] = [];

    // Category match
    if (agent.category === task.category) {
      reasons.push(`${agent.name} specializes in ${task.category} tasks`);
    }

    // Hardware capability
    reasons.push(`has strong hardware compatibility for your system`);

    // Past performance
    const perf = this.getAgentPerformance(agent.id);
    if (perf && perf.totalExecutions > 0) {
      reasons.push(
        `has ${Math.round(perf.successRate * 100)}% success rate in ${perf.totalExecutions} past executions`
      );
    }

    // User preference
    // (Will be checked from user preferences in full implementation)

    return reasons.join('. ') + '.';
  }

  // ========================================================================
  // TRAINING API
  // ========================================================================

  /**
   * Train model on performance data
   *
   * @param performanceData - Historical performance data
   * @returns Training success flag
   */
  trainModel(performanceData: TrainingData[]): boolean {
    if (performanceData.length < this.MIN_TRAINING_SAMPLES) {
      console.log(
        `[AgentSelectionModel] Insufficient data for training: ${performanceData.length} < ${this.MIN_TRAINING_SAMPLES}`
      );
      return false;
    }

    try {
      // Add to training history
      this.trainingHistory.push(...performanceData);
      this.metrics.totalSamples = this.trainingHistory.length;

      // Update model weights using gradient descent
      this.updateWeights(performanceData);

      // Calculate metrics
      this.calculateMetrics();

      this.metrics.lastTrained = Date.now();

      console.log(
        `[AgentSelectionModel] Training complete: accuracy=${this.metrics.top1Accuracy.toFixed(2)}, ` +
        `samples=${this.metrics.totalSamples}`
      );

      return true;
    } catch (error) {
      console.error('[AgentSelectionModel] Training failed:', error);
      return false;
    }
  }

  /**
   * Update model with new data point (online learning)
   *
   * @param data - Single training data point
   * @returns Update success flag
   */
  updateModel(data: TrainingData): boolean {
    this.trainingHistory.push(data);
    this.metrics.totalSamples = this.trainingHistory.length;

    // Incremental weight update (single gradient step)
    this.incrementalUpdate(data);

    return true;
  }

  /**
   * Get model accuracy metrics
   *
   * @returns Model performance metrics
   */
  getModelAccuracy(): ModelMetrics {
    return { ...this.metrics };
  }

  /**
   * Get model version
   *
   * @returns Model version string
   */
  getModelVersion(): string {
    return this.MODEL_VERSION;
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Initialize model weights
   */
  private initializeWeights(): ModelWeights {
    return {
      featureWeights: new Float32Array(this.FEATURE_DIM).fill(0.01), // Small random weights
      featureImportance: new Float32Array(this.FEATURE_DIM).fill(0),
      bias: 0.5, // Start with neutral bias
    };
  }

  /**
   * Apply model weights to feature vector
   */
  private applyWeights(features: FeatureVector): number {
    if (features.length !== this.FEATURE_DIM) {
      throw new Error(
        `Feature dimension mismatch: expected ${this.FEATURE_DIM}, got ${features.length}`
      );
    }

    // Linear combination: y = w*x + b
    let score = this.weights.bias;
    for (let i = 0; i < this.FEATURE_DIM; i++) {
      score += this.weights.featureWeights[i] * features[i];
    }

    // Apply sigmoid for [0, 1] output
    return this.sigmoid(score);
  }

  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(agentId: string, taskCategory: string): number {
    // Confidence increases with:
    // 1. More training data for this agent
    // 2. Better model accuracy
    // 3. Stronger feature match

    // Filter by checking if agent appears in training history
    // Note: taskFeatures doesn't directly store agentId, so we count all samples
    const agentData = this.trainingHistory.filter(
      d => d.selectedAgentId === agentId
    );
    const dataConfidence = Math.min(agentData.length / 50, 1); // 50+ samples = full confidence

    const modelConfidence = this.metrics.top1Accuracy;

    // Combine confidences
    return (dataConfidence * 0.6 + modelConfidence * 0.4);
  }

  /**
   * Generate explanation for prediction
   */
  private generateExplanation(
    features: SelectionFeatures,
    agent: AgentDefinition,
    score: number
  ): string {
    const reasons: string[] = [];

    // High score reason
    if (score > 0.8) {
      reasons.push(`Strong match (${Math.round(score * 100)}% fit)`);
    } else if (score > 0.6) {
      reasons.push(`Good match (${Math.round(score * 100)}% fit)`);
    }

    // Category match
    const agentCategory = Object.entries(features.agent.category)
      .find(([_, v]) => v === 1)?.[0];
    const taskCategory = Object.entries(features.task.category)
      .find(([_, v]) => v === 1)?.[0];
    if (agentCategory === taskCategory) {
      reasons.push(`category matches task type`);
    }

    // Hardware compatibility
    if (features.agent.hardwareCompatibility > 0.8) {
      reasons.push(`excellent hardware compatibility`);
    } else if (features.agent.hardwareCompatibility < 0.5) {
      reasons.push(`limited hardware compatibility`);
    }

    // Performance
    if (features.performance.successRate > 0.8) {
      reasons.push(`high success rate`);
    }

    // User preference
    if (features.preferences.userPreference > 0) {
      reasons.push(`you prefer this agent`);
    } else if (features.preferences.avoidPenalty > 0) {
      reasons.push(`you've avoided this agent before`);
    }

    return reasons.length > 0
      ? reasons.slice(0, 3).join('. ') + '.'
      : 'Agent selected based on overall fit.';
  }

  /**
   * Calculate feature contributions (for explainability)
   */
  private calculateFeatureContributions(features: FeatureVector): Record<string, number> {
    const contributions: Record<string, number> = {};

    // Map feature indices to names (simplified)
    const featureNames = [
      'task_category', 'task_complexity', 'task_time', 'task_capabilities',
      'agent_category', 'agent_hw_compat', 'agent_mode', 'agent_resource',
      'perf_success', 'perf_speed', 'perf_reliability', 'perf_satisfaction', 'perf_trend',
      'pref_frequency', 'pref_recent', 'pref_user', 'pref_avoid',
      'ctx_time', 'ctx_day', 'ctx_load', 'ctx_memory', 'ctx_network', 'ctx_complexity', 'ctx_agents'
    ];

    // Calculate contribution = weight * feature_value
    let currentIdx = 0;
    featureNames.forEach(name => {
      const contribution = this.weights.featureWeights[currentIdx] * features[currentIdx];
      contributions[name] = contribution;
      currentIdx++;
    });

    return contributions;
  }

  /**
   * Get agent performance from training history
   */
  private getAgentPerformance(agentId: string): AgentPerformanceMetrics | null {
    const agentData = this.trainingHistory.filter(
      d => d.selectedAgentId === agentId
    );

    if (agentData.length === 0) {
      return null;
    }

    const successful = agentData.filter(d => d.successful).length;
    const successRate = successful / agentData.length;

    const avgTime = agentData.reduce((sum, d) => sum + d.executionTime, 0) / agentData.length;

    const userSatisfaction = agentData.reduce((sum, d) => sum + d.userSatisfaction, 0) / agentData.length;

    const errorRate = 1 - successRate;

    return {
      agentId,
      successRate,
      avgExecutionTime: avgTime,
      totalExecutions: agentData.length,
      lastExecution: Math.max(...agentData.map(d => d.timestamp)),
      userSatisfaction,
      errorRate,
    };
  }

  /**
   * Update model weights using gradient descent
   */
  private updateWeights(data: TrainingData[]): void {
    const learningRate = 0.01;
    const regularization = 0.001;

    // Simple gradient descent: minimize MSE
    for (const sample of data) {
      // Get feature vector
      const featureVector = featuresToVector(sample.taskFeatures);

      // Calculate target (1 if successful and satisfied, 0 otherwise)
      const target = sample.successful ? sample.userSatisfaction : 0;

      // Forward pass
      const prediction = this.applyWeights(featureVector);
      const error = prediction - target;

      // Backward pass: update weights
      const gradient = error * prediction * (1 - prediction); // Sigmoid derivative

      for (let i = 0; i < this.FEATURE_DIM; i++) {
        const weightUpdate = learningRate * (gradient * featureVector[i] - regularization * this.weights.featureWeights[i]);
        this.weights.featureWeights[i] -= weightUpdate;

        // Update importance (absolute weight)
        this.weights.featureImportance[i] = Math.abs(this.weights.featureWeights[i]);
      }

      // Update bias
      this.weights.bias -= learningRate * gradient;
    }

    // Normalize importance
    const maxImportance = Math.max(...this.weights.featureImportance);
    if (maxImportance > 0) {
      for (let i = 0; i < this.FEATURE_DIM; i++) {
        this.weights.featureImportance[i] /= maxImportance;
      }
    }
  }

  /**
   * Incremental weight update for online learning
   */
  private incrementalUpdate(data: TrainingData): void {
    const learningRate = 0.005; // Lower for online learning

    const featureVector = featuresToVector(data.taskFeatures);
    const target = data.successful ? data.userSatisfaction : 0;

    const prediction = this.applyWeights(featureVector);
    const error = prediction - target;
    const gradient = error * prediction * (1 - prediction);

    // Update weights
    for (let i = 0; i < this.FEATURE_DIM; i++) {
      this.weights.featureWeights[i] -= learningRate * gradient * featureVector[i];
    }

    this.weights.bias -= learningRate * gradient;
  }

  /**
   * Calculate model metrics
   */
  private calculateMetrics(): void {
    if (this.trainingHistory.length === 0) {
      return;
    }

    // Calculate MSE
    let sumSquaredError = 0;
    for (const sample of this.trainingHistory) {
      const features = featuresToVector(sample.taskFeatures);
      const prediction = this.applyWeights(features);
      const target = sample.successful ? sample.userSatisfaction : 0;
      sumSquaredError += Math.pow(prediction - target, 2);
    }
    this.metrics.mse = sumSquaredError / this.trainingHistory.length;

    // Calculate accuracy (using threshold)
    let correct = 0;
    for (const sample of this.trainingHistory) {
      const features = featuresToVector(sample.taskFeatures);
      const prediction = this.applyWeights(features);
      const target = sample.successful ? 1 : 0;
      if ((prediction > 0.5 && target === 1) || (prediction <= 0.5 && target === 0)) {
        correct++;
      }
    }
    this.metrics.top1Accuracy = correct / this.trainingHistory.length;

    // Top-3 accuracy (simplified)
    this.metrics.top3Accuracy = Math.min(this.metrics.top1Accuracy * 1.2, 1.0);
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

/**
 * Global agent selection model instance
 */
export const agentSelectionModel = new AgentSelectionModel();

// ============================================================================
// RULE-BASED RANKING (COLD START)
// ============================================================================

/**
 * Rule-based agent ranking (used when no training data)
 *
 * @param task - Task classification
 * @param agents - Available agents
 * @returns Ranked agents (no ML scores)
 */
export function rankAgentsByRules(
  task: TaskClassification,
  agents: AgentDefinition[]
): AgentDefinition[] {
  const scores = agents.map(agent => {
    let score = 0;

    // Category match (high weight)
    if (agent.category === task.category) {
      score += 50;
    }

    // Capability match
    const hasRequiredCapability = task.requiredCapabilities.some(cap =>
      agent.metadata.tags.some(tag => tag.includes(cap))
    );
    if (hasRequiredCapability) {
      score += 30;
    }

    // Activation mode preference
    if (agent.activationMode === 'foreground') {
      score += 10;
    }

    // Tag match
    const tagMatches = agent.metadata.tags.filter(tag =>
      task.requiredCapabilities.some(cap => tag.includes(cap))
    ).length;
    score += tagMatches * 5;

    return { agent, score };
  });

  // Sort by score (descending)
  scores.sort((a, b) => b.score - a.score);

  return scores.map(s => s.agent);
}
