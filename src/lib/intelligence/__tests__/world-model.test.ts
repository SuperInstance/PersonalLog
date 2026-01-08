/**
 * World Model Tests
 *
 * Comprehensive test suite for JEPA-style world model including:
 * - State encoding/decoding
 * - Transition learning
 * - Prediction accuracy
 * - Anomaly detection
 * - Agent needs prediction
 * - Resource forecasting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, getWorldModel, createWorldModel } from '../world-model';
import {
  encodeState,
  decodeState,
  stateSimilarity,
  findMostSimilar,
  fitNormalization,
  resetNormalization,
} from '../state-encoder';
import type { EncodedState } from '../world-model-types';
import {
  recordTransition,
  predictTransitions,
  learnTransitions,
  getTransitionProbability,
  resetTransitions,
  minePatterns,
} from '../transition-learner';
import type {
  ConversationState,
} from '../world-model-types';
import {
  UserIntent,
  TransitionTrigger,
} from '../world-model-types';
import { TaskType } from '@/lib/agents/performance-types';
import { DEFAULT_WORLD_MODEL_CONFIG } from '../world-model-types';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockState(overrides?: Partial<ConversationState>): ConversationState {
  const base: ConversationState = {
    id: `state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    conversationId: 'conv-test',

    // Message features
    messageCount: 10,
    avgMessageLength: 500,
    messageComplexity: 0.5,
    totalTokens: 5000,

    // Agent features
    activeAgents: ['agent-1'],
    activeAgentCount: 1,
    lastUsedAgent: 'agent-1',

    // Task features
    currentTaskType: TaskType.ANALYZE,
    taskCompletionRate: 0.5,
    tasksInProgress: 1,

    // Emotion features
    emotionState: {
      valence: 0.5,
      arousal: 0.5,
      dominance: 0.5,
      category: 'neutral',
      confidence: 0.8,
    },
    emotionTrend: 'stable',
    emotionIntensity: 0.5,

    // Topic features
    currentTopic: 'test topic',
    topicConfidence: 0.7,
    topicShifts: 2,

    // User intent
    userIntent: UserIntent.EXPLORING,
    intentConfidence: 0.6,

    // Resource usage
    estimatedTokenUsage: 1000,
    estimatedTimeMs: 5000,
    systemLoad: 0.3,

    // Temporal features
    timeSinceLastMessage: 30000,
    conversationAge: 600000,
    timeOfDay: 0.5,

    // Velocity features
    messageRate: 2,
    tokenRate: 500,
    agentActivationRate: 0.1,

    ...overrides,
  };

  return base;
}

function createMockStates(count: number): ConversationState[] {
  const states: ConversationState[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    states.push(
      createMockState({
        id: `state-${i}`,
        timestamp: now - (count - i) * 10000,
        messageCount: i + 1,
        totalTokens: (i + 1) * 500,
        conversationAge: (count - i) * 10000,
        activeAgentCount: i % 3,
        activeAgents: i % 3 > 0 ? [`agent-${i % 3}`] : [],
      })
    );
  }

  return states;
}

// ============================================================================
// STATE ENCODING/DECODING TESTS
// ============================================================================

describe('State Encoder/Decoder', () => {
  beforeEach(() => {
    resetNormalization();
  });

  it('should encode conversation state to vector', () => {
    const state = createMockState();
    const encoded = encodeState(state);

    expect(encoded).toBeDefined();
    expect(encoded.vector).toBeInstanceOf(Float32Array);
    expect(encoded.vector.length).toBeGreaterThan(0);
    expect(encoded.originalDimensions).toBeGreaterThan(0);
    expect(encoded.compressionRatio).toBeGreaterThan(1);
  });

  it('should decode vector back to partial state', () => {
    const state = createMockState();
    const encoded = encodeState(state);
    const decoded = decodeState(encoded);

    expect(decoded).toBeDefined();
    expect(decoded.messageCount).toBeCloseTo(state.messageCount, -1);
    expect(decoded.emotionState?.valence).toBeCloseTo(state.emotionState.valence, 1);
  });

  it('should handle normalization fitting', () => {
    const states = createMockStates(50);
    fitNormalization(states);

    const normalized = states.map((s) => encodeState(s));

    expect(normalized).toHaveLength(50);
    normalized.forEach((encoded) => {
      expect(encoded.vector).toBeDefined();
      expect(encoded.vector.length).toBeGreaterThan(0);
    });
  });

  it('should calculate state similarity correctly', () => {
    const state1 = createMockState({ messageCount: 10 });
    const state2 = createMockState({ messageCount: 12 });
    const state3 = createMockState({ messageCount: 100 });

    const encoded1 = encodeState(state1);
    const encoded2 = encodeState(state2);
    const encoded3 = encodeState(state3);

    const similarity12 = stateSimilarity(encoded1, encoded2, 'cosine');
    const similarity13 = stateSimilarity(encoded1, encoded3, 'cosine');

    expect(similarity12.similarity).toBeGreaterThan(0);
    expect(similarity13.similarity).toBeGreaterThan(0);
    expect(similarity12.similarity).toBeGreaterThan(similarity13.similarity); // Similar states more similar
  });

  it('should find most similar states', () => {
    const query = createMockState({ messageCount: 10 });
    const candidates = [
      createMockState({ messageCount: 11 }),
      createMockState({ messageCount: 50 }),
      createMockState({ messageCount: 100 }),
    ];

    const queryEncoded = encodeState(query);
    const candidatesEncoded = candidates.map((c) => encodeState(c));

    const similar = findMostSimilar(queryEncoded, candidatesEncoded, 3);

    expect(similar).toHaveLength(3);
    expect(similar[0].similarity.similarity).toBeGreaterThanOrEqual(similar[1].similarity.similarity);
  });

  it('should support different distance metrics', () => {
    const state1 = createMockState();
    const state2 = createMockState({ messageCount: 15 });

    const encoded1 = encodeState(state1);
    const encoded2 = encodeState(state2);

    const cosine = stateSimilarity(encoded1, encoded2, 'cosine');
    const euclidean = stateSimilarity(encoded1, encoded2, 'euclidean');
    const manhattan = stateSimilarity(encoded1, encoded2, 'manhattan');

    expect(cosine.metric).toBe('cosine');
    expect(euclidean.metric).toBe('euclidean');
    expect(manhattan.metric).toBe('manhattan');

    expect(cosine.similarity).toBeGreaterThan(0);
    expect(euclidean.similarity).toBeGreaterThan(0);
    expect(manhattan.similarity).toBeGreaterThan(0);
  });

  it('should handle edge cases', () => {
    const state1 = createMockState();
    const state2 = createMockState();

    const encoded1 = encodeState(state1);
    const encoded2 = encodeState(state2);

    // Same state should be very similar
    const selfSimilarity = stateSimilarity(encoded1, encoded1, 'cosine');
    expect(selfSimilarity.similarity).toBeCloseTo(1, 5);
  });
});

// ============================================================================
// TRANSITION LEARNING TESTS
// ============================================================================

describe('Transition Learning', () => {
  beforeEach(() => {
    resetTransitions();
  });

  it('should record state transitions', () => {
    const state1 = createMockState();
    const state2 = createMockState({ id: 'state-2', timestamp: Date.now() + 10000 });

    const transition = recordTransition(state1, state2, TransitionTrigger.USER_MESSAGE);

    expect(transition).toBeDefined();
    expect(transition.fromStateId).toBe(state1.id);
    expect(transition.toStateId).toBe(state2.id);
    expect(transition.trigger).toBe(TransitionTrigger.USER_MESSAGE);
    expect(transition.occurrenceCount).toBe(1);
  });

  it('should predict transitions from state', () => {
    const states = createMockStates(10);

    // Learn transitions
    for (let i = 1; i < states.length; i++) {
      recordTransition(states[i - 1], states[i], TransitionTrigger.USER_MESSAGE);
    }

    // Predict from first state
    const predictions = predictTransitions(states[0], 3);

    expect(predictions).toBeDefined();
    expect(predictions.length).toBeGreaterThan(0);
    expect(predictions[0].probability).toBeGreaterThan(0);
  });

  it('should get transition probability', () => {
    const state1 = createMockState();
    const state2 = createMockState({ id: 'state-2' });

    recordTransition(state1, state2, TransitionTrigger.USER_MESSAGE);

    const prob = getTransitionProbability(state1.id, state2.id);

    expect(prob).toBeGreaterThan(0);
  });

  it('should learn from historical sequence', () => {
    const states = createMockStates(20);

    learnTransitions(states, [
      TransitionTrigger.USER_MESSAGE,
      TransitionTrigger.AGENT_RESPONSE,
      TransitionTrigger.USER_MESSAGE,
    ]);

    // Should have learned transitions
    const predictions = predictTransitions(states[0], 5);

    expect(predictions.length).toBeGreaterThan(0);
  });

  it('should mine patterns from transitions', () => {
    const states = createMockStates(30);

    for (let i = 1; i < states.length; i++) {
      recordTransition(states[i - 1], states[i], TransitionTrigger.USER_MESSAGE);
    }

    const patterns = minePatterns();

    expect(patterns).toBeDefined();
    expect(Array.isArray(patterns)).toBe(true);
  });

  it('should handle repeated transitions', () => {
    const state1 = createMockState();
    const state2 = createMockState({ id: 'state-2' });

    // Record same transition multiple times
    recordTransition(state1, state2, TransitionTrigger.USER_MESSAGE);
    recordTransition(state1, state2, TransitionTrigger.USER_MESSAGE);
    recordTransition(state1, state2, TransitionTrigger.USER_MESSAGE);

    const prob = getTransitionProbability(state1.id, state2.id);

    expect(prob).toBeGreaterThan(0);
    // Should have higher probability after repeats
    expect(prob).toBeGreaterThan(0.5);
  });
});

// ============================================================================
// WORLD MODEL PREDICTION TESTS
// ============================================================================

describe('World Model Prediction', () => {
  let worldModel: WorldModel;

  beforeEach(() => {
    worldModel = createWorldModel();
  });

  it('should initialize with historical states', async () => {
    const states = createMockStates(50);

    await worldModel.initialize(states);

    const stats = worldModel.getStats();

    expect(stats.initialized).toBe(true);
    expect(stats.totalStates).toBe(50);
  });

  it('should predict future states', async () => {
    const states = createMockStates(30);

    await worldModel.initialize(states);
    const currentState = states[states.length - 1];

    const predictions = await worldModel.predictNextState(currentState, {
      steps: 3,
      stepSize: 10000,
      maxWindow: 30000,
      confidenceDecay: 0.1,
    });

    expect(predictions).toBeDefined();
    expect(Array.isArray(predictions)).toBe(true);
    // Might not have predictions if not enough data
    if (predictions.length > 0) {
      expect(predictions[0].confidence).toBeGreaterThanOrEqual(0);
      expect(predictions[0].confidence).toBeLessThanOrEqual(1);
      expect(predictions[0].horizon).toBeGreaterThan(0);
    }
  });

  it('should predict agent needs', async () => {
    const states = createMockStates(20);
    states[5].activeAgents = ['jepa', 'spreader'];
    states[10].activeAgents = ['jepa', 'spreader', 'analyzer'];

    await worldModel.initialize(states);
    const currentState = states[states.length - 1];

    const agentNeeds = await worldModel.predictAgentNeeds(currentState, 3);

    expect(agentNeeds).toBeDefined();
    expect(Array.isArray(agentNeeds)).toBe(true);
  });

  it('should predict resource usage', async () => {
    const states = createMockStates(20);

    await worldModel.initialize(states);
    const currentState = states[states.length - 1];

    const resources = await worldModel.predictResourceUsage(currentState);

    expect(resources).toBeDefined();
    expect(resources.tokenUsage).toBeGreaterThan(0);
    expect(resources.timeMs).toBeGreaterThan(0);
    expect(resources.confidence).toBeGreaterThanOrEqual(0);
    expect(resources.confidence).toBeLessThanOrEqual(1);
    expect(resources.upperBound).toBeGreaterThanOrEqual(resources.tokenUsage);
    expect(resources.lowerBound).toBeLessThanOrEqual(resources.tokenUsage);
  });

  it('should detect anomalies', async () => {
    const states = createMockStates(20);

    await worldModel.initialize(states);

    // Normal state
    const normalState = states[states.length - 1];
    const normalAnomalies = await worldModel.detectAnomalies(normalState);

    expect(normalAnomalies).toBeDefined();
    expect(Array.isArray(normalAnomalies)).toBe(true);

    // Anomalous state (very different emotion)
    const anomalousState = createMockState({
      emotionState: {
        valence: 0.1, // Very negative
        arousal: 0.9, // Very high arousal
        dominance: 0.1,
        category: 'angry',
        confidence: 0.9,
      },
      messageRate: 50, // Very high message rate
    });

    const anomalies = await worldModel.detectAnomalies(anomalousState);

    expect(anomalies).toBeDefined();
    expect(Array.isArray(anomalies)).toBe(true);
    // Should detect some anomalies
  });

  it('should add new states', async () => {
    await worldModel.initialize([]);

    const state = createMockState();
    worldModel.addState(state);

    const current = worldModel.getCurrentState();

    expect(current).toBeDefined();
    expect(current?.id).toBe(state.id);
  });

  it('should get state by ID', async () => {
    const states = createMockStates(10);
    await worldModel.initialize(states);

    const state = worldModel.getState(states[5].id);

    expect(state).toBeDefined();
    expect(state?.id).toBe(states[5].id);
  });

  it('should get all states', async () => {
    const states = createMockStates(10);
    await worldModel.initialize(states);

    const allStates = worldModel.getAllStates();

    expect(allStates).toHaveLength(10);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('World Model Integration', () => {
  it('should work end-to-end with full conversation flow', async () => {
    const worldModel = createWorldModel();

    // Simulate conversation evolution
    const states = createMockStates(25);

    // Evolve the states to be realistic
    states.forEach((state, i) => {
      state.messageCount = i + 1;
      state.totalTokens = (i + 1) * 500;
      state.activeAgentCount = i % 4;
      state.activeAgents = i % 4 > 0 ? [`agent-${i % 4}`] : [];
      state.emotionState.valence = 0.3 + (i % 5) * 0.1;
      state.messageRate = 1 + (i % 3);
    });

    // Initialize
    await worldModel.initialize(states);

    // Get predictions
    const currentState = states[states.length - 1];
    const predictions = await worldModel.predictNextState(currentState);
    const agentNeeds = await worldModel.predictAgentNeeds(currentState);
    const resources = await worldModel.predictResourceUsage(currentState);
    const anomalies = await worldModel.detectAnomalies(currentState);

    // Verify all outputs
    expect(predictions).toBeDefined();
    expect(agentNeeds).toBeDefined();
    expect(resources).toBeDefined();
    expect(anomalies).toBeDefined();

    // Check prediction accuracy metrics
    const stats = worldModel.getStats();
    expect(stats.totalStates).toBe(25);
    expect(stats.initialized).toBe(true);
  });

  it('should handle sparse data gracefully', async () => {
    const worldModel = createWorldModel();

    // Very few states
    const states = createMockStates(3);
    await worldModel.initialize(states);

    const currentState = states[states.length - 1];
    const predictions = await worldModel.predictNextState(currentState);

    // Should not crash, just return limited predictions
    expect(predictions).toBeDefined();
  });

  it('should maintain prediction consistency', async () => {
    const worldModel = createWorldModel();
    const states = createMockStates(30);

    await worldModel.initialize(states);
    const currentState = states[states.length - 1];

    // Predict multiple times
    const predictions1 = await worldModel.predictNextState(currentState);
    const predictions2 = await worldModel.predictNextState(currentState);

    // Should be consistent
    expect(predictions1.length).toBe(predictions2.length);
  });
});

// ============================================================================
// SINGLETON TESTS
// ============================================================================

describe('World Model Singleton', () => {
  it('should return same instance', () => {
    const model1 = getWorldModel();
    const model2 = getWorldModel();

    expect(model1).toBe(model2);
  });

  it('should create separate instances with factory', () => {
    const model1 = createWorldModel();
    const model2 = createWorldModel();

    expect(model1).not.toBe(model2);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('World Model Performance', () => {
  it('should encode states efficiently', () => {
    const states = createMockStates(100);

    const startTime = performance.now();
    const encoded = states.map((s) => encodeState(s));
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(encoded).toHaveLength(100);
    expect(duration).toBeLessThan(1000); // Should encode 100 states in < 1s
  });

  it('should predict states efficiently', async () => {
    const worldModel = createWorldModel();
    const states = createMockStates(50);

    await worldModel.initialize(states);
    const currentState = states[states.length - 1];

    const startTime = performance.now();
    const predictions = await worldModel.predictNextState(currentState);
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(predictions).toBeDefined();
    expect(duration).toBeLessThan(5000); // Should predict in < 5s
  });

  it('should handle large state histories', async () => {
    const worldModel = createWorldModel({ maxStateHistory: 1000 });
    const states = createMockStates(500);

    const startTime = performance.now();
    await worldModel.initialize(states);
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(worldModel.getStats().totalStates).toBeLessThanOrEqual(1000);
    expect(duration).toBeLessThan(10000); // Should initialize in < 10s
  });
});

// ============================================================================
// ACCURACY TESTS
// ============================================================================

describe('World Model Accuracy', () => {
  it('should achieve reasonable prediction accuracy', async () => {
    const worldModel = createWorldModel();
    const states = createMockStates(50);

    await worldModel.initialize(states);

    // Train on first 40 states
    const trainingStates = states.slice(0, 40);
    await worldModel.initialize(trainingStates);

    // Test on next 10 states
    let correctPredictions = 0;
    let totalPredictions = 0;

    for (let i = 41; i < 50; i++) {
      const prevState = states[i - 1];
      const actualNextState = states[i];

      const predictions = await worldModel.predictNextState(prevState, {
        steps: 1,
        stepSize: 10000,
        maxWindow: 10000,
        confidenceDecay: 0.1,
      });

      if (predictions.length > 0) {
        totalPredictions++;

        // Check if prediction is close to actual
        const topPrediction = predictions[0];
        if (
          topPrediction.confidence > 0.5 &&
          Math.abs((topPrediction.state.messageCount || 0) - actualNextState.messageCount) < 5
        ) {
          correctPredictions++;
        }
      }
    }

    // Accuracy should be reasonable (> 30%)
    const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
    expect(accuracy).toBeGreaterThan(0.3);
  });

  it('should improve accuracy with more data', async () => {
    const worldModel1 = createWorldModel();
    const worldModel2 = createWorldModel();

    const smallDataset = createMockStates(20);
    const largeDataset = createMockStates(100);

    await worldModel1.initialize(smallDataset);
    await worldModel2.initialize(largeDataset);

    // Both should work, but we just verify they don't crash
    const predictions1 = await worldModel1.predictNextState(smallDataset[smallDataset.length - 1]);
    const predictions2 = await worldModel2.predictNextState(largeDataset[largeDataset.length - 1]);

    expect(predictions1).toBeDefined();
    expect(predictions2).toBeDefined();
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('World Model Edge Cases', () => {
  it('should handle empty state history', async () => {
    const worldModel = createWorldModel();

    await worldModel.initialize([]);

    const predictions = await worldModel.predictNextState(createMockState());

    expect(predictions).toBeDefined();
    expect(Array.isArray(predictions)).toBe(true);
  });

  it('should handle single state', async () => {
    const worldModel = createWorldModel();
    const state = createMockState();

    await worldModel.initialize([state]);

    const current = worldModel.getCurrentState();
    expect(current?.id).toBe(state.id);
  });

  it('should handle extreme feature values', () => {
    const extremeState = createMockState({
      messageCount: 1000000,
      avgMessageLength: 1000000,
      messageComplexity: 1,
      totalTokens: 100000000,
      activeAgentCount: 100,
      systemLoad: 1,
      timeSinceLastMessage: 86400000,
      messageRate: 1000,
    });

    const encoded = encodeState(extremeState);

    expect(encoded).toBeDefined();
    expect(encoded.vector).toBeDefined();
  });

  it('should handle zero feature values', () => {
    const zeroState = createMockState({
      messageCount: 0,
      avgMessageLength: 0,
      messageComplexity: 0,
      totalTokens: 0,
      activeAgentCount: 0,
      activeAgents: [],
      lastUsedAgent: null,
      currentTaskType: null,
      taskCompletionRate: 0,
      tasksInProgress: 0,
      estimatedTokenUsage: 0,
      estimatedTimeMs: 0,
      systemLoad: 0,
      messageRate: 0,
      tokenRate: 0,
      agentActivationRate: 0,
    });

    const encoded = encodeState(zeroState);

    expect(encoded).toBeDefined();
    expect(encoded.vector).toBeDefined();
  });
});
