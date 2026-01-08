/**
 * JEPA-Style World Model for Predictive State Estimation
 *
 * Predicts future conversation states for proactive agent behavior.
 * Uses learned transition patterns and state encodings for prediction.
 *
 * Part of Neural MPC Phase 2: World Model Foundation
 */

import type {
  ConversationState,
  PredictedState,
  AgentNeedPrediction,
  ResourcePrediction,
  AnomalyDetection,
  PredictionHorizon,
  WorldModelConfig,
  WorldModelState,
  UserIntent,
  AnomalyType,
} from './world-model-types';
import { TransitionTrigger } from './world-model-types';
import {
  DEFAULT_WORLD_MODEL_CONFIG,
  isValidConversationState,
  isValidPredictionHorizon,
  isValidConfidence,
} from './world-model-types';
import { encodeState, decodeState, stateSimilarity, findMostSimilar } from './state-encoder';
import type { EncodedState } from './world-model-types';
import {
  recordTransition,
  predictTransitions,
  getTransitionProbability,
  matchPattern,
  getRareTransitions,
} from './transition-learner';

// ============================================================================
// WORLD MODEL CLASS
// ============================================================================

export class WorldModel {
  private config: WorldModelConfig;
  private state: WorldModelState;
  private encodedStates: Map<string, EncodedState> = new Map();

  constructor(config?: Partial<WorldModelConfig>) {
    this.config = { ...DEFAULT_WORLD_MODEL_CONFIG, ...config };
    this.state = {
      states: [],
      transitions: [],
      transitionMatrix: new Map(),
      patterns: [],
      lastUpdate: Date.now(),
      initialized: false,
    };
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Initialize world model with historical states
   */
  async initialize(historicalStates?: ConversationState[]): Promise<void> {
    if (this.state.initialized) {
      console.log('[WorldModel] Already initialized');
      return;
    }

    console.log('[WorldModel] Initializing...');

    try {
      if (historicalStates && historicalStates.length > 0) {
        // Learn from historical data
        await this.learnFromHistory(historicalStates);
      }

      this.state.initialized = true;
      this.state.lastUpdate = Date.now();
      console.log('[WorldModel] Initialization complete');
    } catch (error) {
      console.error('[WorldModel] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Learn from historical state sequence
   */
  private async learnFromHistory(states: ConversationState[]): Promise<void> {
    console.log(`[WorldModel] Learning from ${states.length} historical states`);

    // Encode all states
    for (const state of states) {
      if (isValidConversationState(state)) {
        const encoded = encodeState(state);
        this.encodedStates.set(state.id, encoded);
        this.state.states.push(state);
      }
    }

    // Learn transitions
    for (let i = 1; i < states.length; i++) {
      const trigger = this.inferTrigger(states[i - 1], states[i]);
      recordTransition(states[i - 1], states[i], trigger);
    }

    // Trim state history
    if (this.state.states.length > this.config.maxStateHistory) {
      this.state.states = this.state.states.slice(-this.config.maxStateHistory);
    }

    console.log('[WorldModel] Learning complete');
  }

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  /**
   * Add current state to world model
   */
  addState(state: ConversationState): void {
    if (!isValidConversationState(state)) {
      throw new Error('Invalid conversation state');
    }

    // Encode state
    const encoded = encodeState(state);
    this.encodedStates.set(state.id, encoded);

    // Add to history
    this.state.states.push(state);

    // Trim if needed
    if (this.state.states.length > this.config.maxStateHistory) {
      const removed = this.state.states.shift();
      if (removed) {
        this.encodedStates.delete(removed.id);
      }
    }

    // Learn transition from previous state
    if (this.state.states.length >= 2) {
      const prevState = this.state.states[this.state.states.length - 2];
      const trigger = this.inferTrigger(prevState, state);
      recordTransition(prevState, state, trigger);
    }
  }

  /**
   * Get current state (most recent)
   */
  getCurrentState(): ConversationState | null {
    return this.state.states.length > 0 ? this.state.states[this.state.states.length - 1] : null;
  }

  /**
   * Get state by ID
   */
  getState(id: string): ConversationState | null {
    return this.state.states.find((s) => s.id === id) || null;
  }

  /**
   * Get all states
   */
  getAllStates(): ConversationState[] {
    return [...this.state.states];
  }

  // ========================================================================
  // PREDICTION
  // ========================================================================

  /**
   * Predict next N states using JEPA-style prediction
   */
  async predictNextState(
    currentState: ConversationState,
    horizon: PredictionHorizon = this.config.horizon
  ): Promise<PredictedState[]> {
    if (!isValidConversationState(currentState)) {
      throw new Error('Invalid current state');
    }

    if (!isValidPredictionHorizon(horizon)) {
      throw new Error('Invalid prediction horizon');
    }

    const predictions: PredictedState[] = [];

    // Get encoded current state
    const currentEncoded = this.encodedStates.get(currentState.id);
    if (!currentEncoded) {
      console.warn('[WorldModel] Current state not encoded, encoding now');
      this.addState(currentState);
    }

    // Generate predictions for each horizon step
    for (let step = 1; step <= horizon.steps; step++) {
      const stepPredictions = await this.predictStateAtStep(currentState, step, horizon);

      // Apply confidence decay
      const decay = Math.pow(1 - horizon.confidenceDecay, step);
      for (const pred of stepPredictions) {
        pred.confidence *= decay;
      }

      predictions.push(...stepPredictions);
    }

    return predictions;
  }

  /**
   * Predict state at specific horizon step
   */
  private async predictStateAtStep(
    currentState: ConversationState,
    step: number,
    horizon: PredictionHorizon
  ): Promise<PredictedState[]> {
    // Method 1: Transition-based prediction
    const transitionPredictions = this.predictByTransitions(currentState, step);

    // Method 2: Similarity-based prediction
    const similarityPredictions = this.predictBySimilarity(currentState, step);

    // Method 3: Pattern-based prediction
    const patternPredictions = this.predictByPatterns(currentState, step);

    // Combine predictions
    const combined = this.combinePredictions([
      ...transitionPredictions,
      ...similarityPredictions,
      ...patternPredictions,
    ]);

    // Filter by minimum confidence
    return combined.filter((p) => p.confidence >= this.config.minConfidence);
  }

  /**
   * Predict by learned transitions
   */
  private predictByTransitions(currentState: ConversationState, step: number): PredictedState[] {
    const predictions: PredictedState[] = [];

    // Get likely next states
    const transitions = predictTransitions(currentState, 5);

    for (const trans of transitions) {
      // Find the target state
      const targetState = this.getState(trans.toState);
      if (!targetState) continue;

      // Extrapolate to horizon step
      const predictedState = this.extrapolateState(targetState, step);

      predictions.push({
        state: predictedState,
        confidence: trans.confidence * trans.probability,
        horizon: step,
        probability: trans.probability,
        alternatives: [],
      });
    }

    return predictions;
  }

  /**
   * Predict by finding similar historical states
   */
  private predictBySimilarity(currentState: ConversationState, step: number): PredictedState[] {
    const predictions: PredictedState[] = [];

    const currentEncoded = this.encodedStates.get(currentState.id);
    if (!currentEncoded) return predictions;

    // Find similar states in history
    const similarStates = findMostSimilar(
      currentEncoded,
      Array.from(this.encodedStates.values()).filter((e) => e.timestamp !== currentEncoded.timestamp),
      5
    );

    for (const { state: similarEncoded, similarity } of similarStates) {
      if (similarity.similarity < 0.7) continue; // Threshold

      // Find what state came after this similar state
      const similarState = this.state.states.find((s) => s.id === similarEncoded.timestamp.toString());
      if (!similarState) continue;

      const similarIdx = this.state.states.indexOf(similarState);
      const nextIdx = similarIdx + step;

      if (nextIdx < this.state.states.length) {
        const nextState = this.state.states[nextIdx];
        const predictedState = this.extrapolateState(nextState, step);

        predictions.push({
          state: predictedState,
          confidence: similarity.similarity * 0.8, // Lower weight than transitions
          horizon: step,
          probability: similarity.similarity * 0.5,
          alternatives: [],
        });
      }
    }

    return predictions;
  }

  /**
   * Predict by matching patterns
   */
  private predictByPatterns(currentState: ConversationState, step: number): PredictedState[] {
    const predictions: PredictedState[] = [];

    // Get recent state IDs
    const recentStates = this.state.states.slice(-5);
    const recentIds = recentStates.map((s) => s.id);

    // Match pattern
    const pattern = matchPattern(recentIds);
    if (!pattern) return predictions;

    // Predict based on pattern
    const patternIdx = this.state.states.findIndex((s) => s.id === recentIds[0]);
    const predictedIdx = patternIdx + recentIds.length + step - 1;

    if (predictedIdx < this.state.states.length) {
      const predictedState = this.state.states[predictedIdx];

      predictions.push({
        state: this.extrapolateState(predictedState, step),
        confidence: pattern.confidence * pattern.frequency,
        horizon: step,
        probability: pattern.frequency,
        alternatives: [],
      });
    }

    return predictions;
  }

  /**
   * Extrapolate state to horizon step (apply trends)
   */
  private extrapolateState(state: ConversationState, step: number): Partial<ConversationState> {
    // Simple linear extrapolation
    const extrapolated: Partial<ConversationState> = {
      ...state,
      id: `predicted-${Date.now()}-${step}`,
      timestamp: state.timestamp + step * 10000, // Assume 10s per step
      messageCount: state.messageCount + Math.round(state.messageRate * (step / 60)), // Add expected messages
      totalTokens: state.totalTokens + Math.round(state.tokenRate * (step / 60)), // Add expected tokens
      conversationAge: state.conversationAge + step * 10000,
    };

    return extrapolated;
  }

  /**
   * Combine and deduplicate predictions
   */
  private combinePredictions(predictions: PredictedState[]): PredictedState[] {
    // Group by similar state features
    const groups = new Map<string, PredictedState[]>();

    for (const pred of predictions) {
      const key = this.getStateKey(pred.state);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(pred);
    }

    // Merge groups
    const merged: PredictedState[] = [];
    for (const [key, group] of groups.entries()) {
      const avgConfidence = group.reduce((sum, p) => sum + p.confidence, 0) / group.length;
      const avgProbability = group.reduce((sum, p) => sum + p.probability, 0) / group.length;

      merged.push({
        state: group[0].state, // Use first prediction as representative
        confidence: Math.min(1, avgConfidence * 1.2), // Boost for consensus
        horizon: group[0].horizon,
        probability: avgProbability,
        alternatives: group.slice(1), // Remaining predictions as alternatives
      });
    }

    return merged.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate key for grouping similar states
   */
  private getStateKey(state: Partial<ConversationState>): string {
    const parts = [
      state.activeAgentCount,
      state.currentTaskType,
      state.userIntent,
      Math.round(state.emotionState?.valence || 0),
      Math.round(state.emotionState?.arousal || 0),
    ];
    return parts.join('-');
  }

  // ========================================================================
  // AGENT NEEDS PREDICTION
  // ========================================================================

  /**
   * Predict which agents will be needed
   */
  async predictAgentNeeds(
    currentState: ConversationState,
    horizon: number = 3
  ): Promise<AgentNeedPrediction[]> {
    const predictions = await this.predictNextState(currentState, {
      steps: horizon,
      stepSize: 10000,
      maxWindow: horizon * 10000,
      confidenceDecay: 0.1,
    });

    // Aggregate agent needs across all predictions
    const agentCounts = new Map<string, { count: number; totalProb: number; totalConf: number }>();

    for (const pred of predictions) {
      const agents = pred.state.activeAgents || [];
      for (const agentId of agents) {
        if (!agentCounts.has(agentId)) {
          agentCounts.set(agentId, { count: 0, totalProb: 0, totalConf: 0 });
        }
        const stats = agentCounts.get(agentId)!;
        stats.count++;
        stats.totalProb += pred.probability;
        stats.totalConf += pred.confidence;
      }
    }

    // Convert to predictions
    const needs: AgentNeedPrediction[] = [];
    for (const [agentId, stats] of agentCounts.entries()) {
      const avgProb = stats.totalProb / stats.count;
      const avgConf = stats.totalConf / stats.count;

      if (avgConf >= this.config.minConfidence) {
        needs.push({
          agentId,
          probability: avgProb,
          timeframe: horizon * 10000,
          confidence: avgConf,
          reason: `Predicted in ${stats.count} of ${predictions.length} futures`,
        });
      }
    }

    return needs.sort((a, b) => b.probability - a.probability);
  }

  // ========================================================================
  // RESOURCE PREDICTION
  // ========================================================================

  /**
   * Predict resource usage for next operations
   */
  async predictResourceUsage(currentState: ConversationState): Promise<ResourcePrediction> {
    // Get recent resource usage
    const recentStates = this.state.states.slice(-10);

    if (recentStates.length < 3) {
      // Not enough data, use current state estimates
      return {
        tokenUsage: currentState.estimatedTokenUsage || 1000,
        timeMs: currentState.estimatedTimeMs || 5000,
        confidence: 0.3,
        upperBound: currentState.estimatedTokenUsage * 2 || 2000,
        lowerBound: currentState.estimatedTokenUsage / 2 || 500,
      };
    }

    // Calculate trends
    const tokens = recentStates.map((s) => s.estimatedTokenUsage);
    const times = recentStates.map((s) => s.estimatedTimeMs);

    const avgTokens = tokens.reduce((a, b) => a + b, 0) / tokens.length;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    // Calculate variance for bounds
    const tokenVariance =
      tokens.reduce((sum, t) => sum + Math.pow(t - avgTokens, 2), 0) / tokens.length;
    const timeVariance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;

    const tokenStd = Math.sqrt(tokenVariance);
    const timeStd = Math.sqrt(timeVariance);

    // Confidence based on data volume
    const confidence = Math.min(1, recentStates.length / 20);

    return {
      tokenUsage: Math.round(avgTokens),
      timeMs: Math.round(avgTime),
      confidence,
      upperBound: Math.round(avgTokens + 1.96 * tokenStd), // 95% CI
      lowerBound: Math.round(Math.max(0, avgTokens - 1.96 * tokenStd)),
    };
  }

  // ========================================================================
  // ANOMALY DETECTION
  // ========================================================================

  /**
   * Detect anomalies in current state
   */
  async detectAnomalies(currentState: ConversationState): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    // 1. Check for rare transitions
    if (this.state.states.length >= 2) {
      const prevState = this.state.states[this.state.states.length - 2];
      const transProb = getTransitionProbability(prevState.id, currentState.id);

      if (transProb > 0 && transProb < 0.1) {
        // Very unlikely transition
        anomalies.push({
          isAnomaly: true,
          type: 'transition_anomaly' as AnomalyType,
          severity: 1 - transProb,
          description: `Unusual state transition detected (probability: ${(transProb * 100).toFixed(1)}%)`,
          suggestions: [
            'Monitor for unexpected behavior',
            'Check if user context changed significantly',
            'Consider updating transition model',
          ],
          confidence: 0.7,
        });
      }
    }

    // 2. Check for emotion anomalies
    const emotionAnomaly = this.detectEmotionAnomaly(currentState);
    if (emotionAnomaly) {
      anomalies.push(emotionAnomaly);
    }

    // 3. Check for resource anomalies
    const resourceAnomaly = this.detectResourceAnomaly(currentState);
    if (resourceAnomaly) {
      anomalies.push(resourceAnomaly);
    }

    // 4. Check for behavior anomalies
    const behaviorAnomaly = this.detectBehaviorAnomaly(currentState);
    if (behaviorAnomaly) {
      anomalies.push(behaviorAnomaly);
    }

    return anomalies;
  }

  /**
   * Detect emotion anomalies
   */
  private detectEmotionAnomaly(state: ConversationState): AnomalyDetection | null {
    // Compare with recent emotion states
    const recentStates = this.state.states.slice(-10);
    if (recentStates.length < 5) return null;

    const emotions = recentStates.map((s) => s.emotionState);
    const avgValence = emotions.reduce((sum, e) => sum + e.valence, 0) / emotions.length;
    const avgArousal = emotions.reduce((sum, e) => sum + e.arousal, 0) / emotions.length;

    const valenceDiff = Math.abs(state.emotionState.valence - avgValence);
    const arousalDiff = Math.abs(state.emotionState.arousal - avgArousal);

    if (valenceDiff > 0.5 || arousalDiff > 0.5) {
      return {
        isAnomaly: true,
        type: 'emotion_anomaly' as AnomalyType,
        severity: Math.max(valenceDiff, arousalDiff),
        description: 'Significant emotion shift detected',
        suggestions: [
          'User may be experiencing strong emotions',
          'Consider adjusting agent responses',
          'Monitor for continued emotion changes',
        ],
        confidence: 0.6,
      };
    }

    return null;
  }

  /**
   * Detect resource anomalies
   */
  private detectResourceAnomaly(state: ConversationState): AnomalyDetection | null {
    const recentStates = this.state.states.slice(-10);
    if (recentStates.length < 5) return null;

    const tokens = recentStates.map((s) => s.estimatedTokenUsage);
    const avgTokens = tokens.reduce((a, b) => a + b, 0) / tokens.length;

    // Check for unusually high token usage
    if (state.estimatedTokenUsage > avgTokens * 2) {
      return {
        isAnomaly: true,
        type: 'resource_anomaly' as AnomalyType,
        severity: Math.min(1, state.estimatedTokenUsage / avgTokens - 1),
        description: `Unusually high token usage: ${state.estimatedTokenUsage} tokens`,
        suggestions: [
          'Consider context compression',
          'Suggest breaking task into smaller parts',
          'Monitor for continued high usage',
        ],
        confidence: 0.5,
      };
    }

    return null;
  }

  /**
   * Detect behavior anomalies
   */
  private detectBehaviorAnomaly(state: ConversationState): AnomalyDetection | null {
    // Check for unusual message patterns
    const recentStates = this.state.states.slice(-10);
    if (recentStates.length < 5) return null;

    const messageRates = recentStates.map((s) => s.messageRate);
    const avgRate = messageRates.reduce((a, b) => a + b, 0) / messageRates.length;

    // Very high message rate could indicate spam or frustration
    if (state.messageRate > avgRate * 3 && state.messageRate > 10) {
      return {
        isAnomaly: true,
        type: 'behavior_anomaly' as AnomalyType,
        severity: Math.min(1, state.messageRate / avgRate - 1),
        description: `Unusually high message rate: ${state.messageRate.toFixed(1)} msgs/min`,
        suggestions: [
          'User may be frustrated or testing',
          'Consider offering assistance',
          'Monitor for continued high activity',
        ],
        confidence: 0.4,
      };
    }

    return null;
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  /**
   * Infer trigger for state transition
   */
  private inferTrigger(fromState: ConversationState, toState: ConversationState): TransitionTrigger {
    // Time delta
    const timeDelta = toState.timestamp - fromState.timestamp;

    // Agent changes
    if (toState.activeAgentCount > fromState.activeAgentCount) {
      return TransitionTrigger.AGENT_ACTIVATED;
    }
    if (toState.activeAgentCount < fromState.activeAgentCount) {
      return TransitionTrigger.AGENT_DEACTIVATED;
    }

    // Task changes
    if (toState.currentTaskType !== fromState.currentTaskType) {
      if (toState.currentTaskType) {
        return TransitionTrigger.TASK_STARTED;
      } else {
        return TransitionTrigger.TASK_COMPLETED;
      }
    }

    // Emotion changes
    const emotionDelta =
      Math.abs(toState.emotionState.valence - fromState.emotionState.valence) +
      Math.abs(toState.emotionState.arousal - fromState.emotionState.arousal);
    if (emotionDelta > 0.5) {
      return TransitionTrigger.EMOTION_SHIFT;
    }

    // Topic changes
    if (toState.currentTopic !== fromState.currentTopic) {
      return TransitionTrigger.TOPIC_CHANGE;
    }

    // Message added
    if (toState.messageCount > fromState.messageCount) {
      return TransitionTrigger.USER_MESSAGE;
    }

    // Default: time passed
    if (timeDelta > 30000) {
      return TransitionTrigger.TIME_PASSED;
    }

    return TransitionTrigger.AGENT_RESPONSE;
  }

  /**
   * Get world model statistics
   */
  getStats() {
    return {
      totalStates: this.state.states.length,
      encodedStates: this.encodedStates.size,
      initialized: this.state.initialized,
      lastUpdate: this.state.lastUpdate,
      config: this.config,
    };
  }

  /**
   * Update world model configuration
   */
  updateConfig(newConfig: Partial<WorldModelConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset world model
   */
  reset(): void {
    this.state.states = [];
    this.encodedStates.clear();
    this.state.transitions = [];
    this.state.transitionMatrix.clear();
    this.state.patterns = [];
    this.state.lastUpdate = Date.now();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let worldModelInstance: WorldModel | null = null;

/**
 * Get or create world model instance
 */
export function getWorldModel(): WorldModel {
  if (!worldModelInstance) {
    worldModelInstance = new WorldModel();
  }
  return worldModelInstance;
}

/**
 * Create new world model instance
 */
export function createWorldModel(config?: Partial<WorldModelConfig>): WorldModel {
  return new WorldModel(config);
}
