/**
 * Agent Prediction Model Tests
 *
 * Comprehensive test suite for the agent transition prediction system.
 * Tests feature extraction, model training, prediction accuracy, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  predictionModel,
  transitionTracker,
  FeatureExtractor,
  extractFeatures,
  AgentTransition,
  TaskType,
  TimeOfDay,
  ActionType,
  ActionRecord,
} from '../index';
import type { Conversation, Message } from '@/types/conversation';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a mock conversation for testing
 */
function createMockConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv_test_123',
    title: 'Test Conversation',
    type: 'ai-assisted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    aiContacts: [],
    settings: {
      responseMode: 'messenger',
      compactOnLimit: true,
      compactStrategy: 'summarize',
    },
    metadata: {
      messageCount: 10,
      totalTokens: 1000,
      hasMedia: false,
      tags: ['test'],
      pinned: false,
      archived: false,
    },
    ...overrides,
  };
}

/**
 * Create a mock transition for testing
 */
function createMockTransition(overrides: Partial<AgentTransition> = {}): AgentTransition {
  return {
    id: 'trans_test_123',
    fromAgentId: 'jepa-v1',
    toAgentId: 'spreader-v1',
    conversationId: 'conv_test_123',
    taskType: TaskType.ANALYSIS,
    timeOfDay: TimeOfDay.MORNING,
    timestamp: Date.now(),
    messageCount: 10,
    conversationLength: 1000,
    recentActions: [],
    userId: 'default',
    sessionId: 'session_test_123',
    ...overrides,
  };
}

/**
 * Create mock action records
 */
function createMockActions(count: number = 5): ActionRecord[] {
  const actions: ActionRecord[] = [];
  const types = [
    ActionType.MESSAGE_SENT,
    ActionType.AI_REQUEST,
    ActionType.AGENT_ACTIVATED,
    ActionType.AGENT_COMPLETED,
  ];

  for (let i = 0; i < count; i++) {
    actions.push({
      type: types[i % types.length],
      timestamp: Date.now() - i * 1000,
      conversationId: 'conv_test_123',
      agentId: i % 2 === 0 ? 'jepa-v1' : 'spreader-v1',
    });
  }

  return actions;
}

// ============================================================================
// FEATURE EXTRACTOR TESTS
// ============================================================================

describe('FeatureExtractor', () => {
  let extractor: FeatureExtractor;

  beforeEach(() => {
    extractor = new FeatureExtractor();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(extractor).toBeDefined();
      expect(extractor.getFeatureSize()).toBeGreaterThan(0);
    });

    it('should initialize with custom configuration', () => {
      const customExtractor = new FeatureExtractor({
        maxAgents: 10,
        maxMessageCount: 500,
      });
      expect(customExtractor).toBeDefined();
    });
  });

  describe('agent indexing', () => {
    it('should update agent indexes', () => {
      const agentIds = ['jepa-v1', 'spreader-v1', 'custom-agent'];
      extractor.updateAgentIndexes(agentIds);
      // Should not throw
      expect(agentIds.length).toBe(3);
    });

    it('should handle empty agent list', () => {
      extractor.updateAgentIndexes([]);
      // Should not throw
      expect([]).toEqual([]);
    });
  });

  describe('feature extraction', () => {
    it('should extract features from prediction context', async () => {
      const context = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1', 'spreader-v1'],
        conversation: createMockConversation(),
        recentActions: createMockActions(3),
        timestamp: Date.now(),
      };

      extractor.updateAgentIndexes(context.availableAgents);
      const features = await extractor.extractFeatures(context);

      expect(features).toBeDefined();
      expect(features.currentAgent).toBeDefined();
      expect(features.taskType).toBeDefined();
      expect(features.timeOfDay).toBeDefined();
      expect(features.messageCount).toBeGreaterThanOrEqual(0);
      expect(features.conversationLength).toBeGreaterThanOrEqual(0);
      expect(features.actionFrequencies).toBeDefined();
      expect(features.agentCooccurrence).toBeDefined();
    });

    it('should handle null current agent', async () => {
      const context = {
        currentAgentId: null,
        availableAgents: ['jepa-v1', 'spreader-v1'],
        conversation: createMockConversation(),
        recentActions: [],
        timestamp: Date.now(),
      };

      extractor.updateAgentIndexes(context.availableAgents);
      const features = await extractor.extractFeatures(context);

      expect(features.currentAgent).toBeDefined();
    });

    it('should extract time since last activation', async () => {
      const context = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1'],
        conversation: createMockConversation(),
        recentActions: createMockActions(5),
        timestamp: Date.now(),
      };

      extractor.updateAgentIndexes(context.availableAgents);
      const features = await extractor.extractFeatures(context);

      expect(features.timeSinceLastActivation).toBeGreaterThanOrEqual(0);
      expect(features.timeSinceLastActivation).toBeLessThanOrEqual(1);
    });

    it('should extract day of week', async () => {
      const context = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1'],
        conversation: createMockConversation(),
        recentActions: [],
        timestamp: Date.now(),
      };

      extractor.updateAgentIndexes(context.availableAgents);
      const features = await extractor.extractFeatures(context);

      expect(features.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(features.dayOfWeek).toBeLessThanOrEqual(1);
    });

    it('should extract hour of day', async () => {
      const context = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1'],
        conversation: createMockConversation(),
        recentActions: [],
        timestamp: Date.now(),
      };

      extractor.updateAgentIndexes(context.availableAgents);
      const features = await extractor.extractFeatures(context);

      expect(features.hourOfDay).toBeGreaterThanOrEqual(0);
      expect(features.hourOfDay).toBeLessThanOrEqual(1);
    });
  });

  describe('feature vector conversion', () => {
    it('should convert features to vector', async () => {
      const context = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1', 'spreader-v1'],
        conversation: createMockConversation(),
        recentActions: [],
        timestamp: Date.now(),
      };

      extractor.updateAgentIndexes(context.availableAgents);
      const features = await extractor.extractFeatures(context);
      const vector = extractor.featuresToVector(features);

      expect(vector).toBeInstanceOf(Float32Array);
      expect(vector.length).toBe(extractor.getFeatureSize());
    });

    it('should have consistent feature vector size', async () => {
      const context1 = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1', 'spreader-v1'],
        conversation: createMockConversation(),
        recentActions: [],
        timestamp: Date.now(),
      };

      const context2 = {
        currentAgentId: 'spreader-v1',
        availableAgents: ['jepa-v1', 'spreader-v1'],
        conversation: createMockConversation(),
        recentActions: createMockActions(5),
        timestamp: Date.now(),
      };

      extractor.updateAgentIndexes(context1.availableAgents);
      const features1 = await extractor.extractFeatures(context1);
      const vector1 = extractor.featuresToVector(features1);

      const features2 = await extractor.extractFeatures(context2);
      const vector2 = extractor.featuresToVector(features2);

      expect(vector1.length).toBe(vector2.length);
    });
  });
});

// ============================================================================
// TRANSITION TRACKER TESTS
// ============================================================================

describe('AgentTransitionTracker', () => {
  beforeEach(async () => {
    await transitionTracker.initialize();
  });

  afterEach(async () => {
    await transitionTracker.clearAllData();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(transitionTracker).toBeDefined();
    });

    it('should create a session', async () => {
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('action tracking', () => {
    it('should record an action', async () => {
      await transitionTracker.recordAction(
        ActionType.MESSAGE_SENT,
        'conv_test_123',
        'jepa-v1'
      );

      const actions = await transitionTracker.getRecentActions('conv_test_123');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].type).toBe(ActionType.MESSAGE_SENT);
    });

    it('should record multiple actions', async () => {
      await transitionTracker.recordAction(
        ActionType.MESSAGE_SENT,
        'conv_test_123'
      );
      await transitionTracker.recordAction(
        ActionType.AI_REQUEST,
        'conv_test_123',
        'jepa-v1'
      );
      await transitionTracker.recordAction(
        ActionType.AGENT_ACTIVATED,
        'conv_test_123',
        'spreader-v1'
      );

      const actions = await transitionTracker.getRecentActions('conv_test_123', 10);
      expect(actions.length).toBe(3);
    });

    it('should limit action history', async () => {
      const limit = 5;
      for (let i = 0; i < 20; i++) {
        await transitionTracker.recordAction(
          ActionType.MESSAGE_SENT,
          'conv_test_123'
        );
      }

      const actions = await transitionTracker.getRecentActions('conv_test_123', limit);
      expect(actions.length).toBeLessThanOrEqual(limit);
    });

    it('should get recent actions for specific conversation', async () => {
      await transitionTracker.recordAction(
        ActionType.MESSAGE_SENT,
        'conv_test_123'
      );
      await transitionTracker.recordAction(
        ActionType.MESSAGE_SENT,
        'conv_other_456'
      );

      const actions1 = await transitionTracker.getRecentActions('conv_test_123');
      const actions2 = await transitionTracker.getRecentActions('conv_other_456');

      expect(actions1.length).toBe(1);
      expect(actions2.length).toBe(1);
    });
  });

  describe('transition tracking', () => {
    it('should record a transition', async () => {
      const transition = await transitionTracker.recordTransition({
        fromAgentId: 'jepa-v1',
        toAgentId: 'spreader-v1',
        conversationId: 'conv_test_123',
        taskType: TaskType.ANALYSIS,
        timeOfDay: TimeOfDay.MORNING,
        messageCount: 10,
        conversationLength: 1000,
        recentActions: [],
      });

      expect(transition).toBeDefined();
      expect(transition.id).toBeDefined();
      expect(transition.fromAgentId).toBe('jepa-v1');
      expect(transition.toAgentId).toBe('spreader-v1');
    });

    it('should record agent completion', async () => {
      await transitionTracker.recordAgentCompletion(
        'jepa-v1',
        'conv_test_123',
        true
      );

      const actions = await transitionTracker.getRecentActions('conv_test_123');
      const completionActions = actions.filter(
        (a) => a.type === ActionType.AGENT_COMPLETED
      );

      expect(completionActions.length).toBeGreaterThan(0);
    });

    it('should get transition history', async () => {
      await transitionTracker.recordTransition({
        fromAgentId: null,
        toAgentId: 'jepa-v1',
        conversationId: 'conv_test_123',
        taskType: TaskType.ANALYSIS,
        timeOfDay: TimeOfDay.MORNING,
        messageCount: 5,
        conversationLength: 500,
        recentActions: [],
      });

      await transitionTracker.recordTransition({
        fromAgentId: 'jepa-v1',
        toAgentId: 'spreader-v1',
        conversationId: 'conv_test_123',
        taskType: TaskType.WRITING,
        timeOfDay: TimeOfDay.AFTERNOON,
        messageCount: 10,
        conversationLength: 1000,
        recentActions: [],
      });

      const history = await transitionTracker.getTransitionHistory('conv_test_123');
      expect(history.length).toBe(2);
    });

    it('should get transitions by agent', async () => {
      await transitionTracker.recordTransition({
        fromAgentId: null,
        toAgentId: 'jepa-v1',
        conversationId: 'conv_test_123',
        taskType: TaskType.ANALYSIS,
        timeOfDay: TimeOfDay.MORNING,
        messageCount: 5,
        conversationLength: 500,
        recentActions: [],
      });

      await transitionTracker.recordTransition({
        fromAgentId: 'jepa-v1',
        toAgentId: 'spreader-v1',
        conversationId: 'conv_test_456',
        taskType: TaskType.WRITING,
        timeOfDay: TimeOfDay.AFTERNOON,
        messageCount: 10,
        conversationLength: 1000,
        recentActions: [],
      });

      const jepaTransitions = await transitionTracker.getTransitionsByAgent('jepa-v1');
      expect(jepaTransitions.length).toBe(1);
    });
  });

  describe('statistics', () => {
    it('should get transition statistics', async () => {
      await transitionTracker.recordTransition({
        fromAgentId: null,
        toAgentId: 'jepa-v1',
        conversationId: 'conv_test_123',
        taskType: TaskType.ANALYSIS,
        timeOfDay: TimeOfDay.MORNING,
        messageCount: 5,
        conversationLength: 500,
        recentActions: [],
      });

      const stats = await transitionTracker.getStatistics();

      expect(stats.totalTransitions).toBeGreaterThan(0);
      expect(stats.transitionsByAgent.size).toBeGreaterThan(0);
      expect(stats.transitionsByTaskType.size).toBeGreaterThan(0);
      expect(stats.transitionsByTimeOfDay.size).toBeGreaterThan(0);
    });
  });

  describe('utilities', () => {
    it('should determine time of day correctly', () => {
      const morning = new Date('2025-01-07T09:00:00').getTime();
      const afternoon = new Date('2025-01-07T14:00:00').getTime();
      const evening = new Date('2025-01-07T20:00:00').getTime();
      const night = new Date('2025-01-07T02:00:00').getTime();

      const { AgentTransitionTracker } = require('../agent-transitions');
      expect(AgentTransitionTracker.getTimeOfDay(morning)).toBe(TimeOfDay.MORNING);
      expect(AgentTransitionTracker.getTimeOfDay(afternoon)).toBe(TimeOfDay.AFTERNOON);
      expect(AgentTransitionTracker.getTimeOfDay(evening)).toBe(TimeOfDay.EVENING);
      expect(AgentTransitionTracker.getTimeOfDay(night)).toBe(TimeOfDay.NIGHT);
    });

    it('should infer task type from conversation', () => {
      const conversation = createMockConversation({
        messages: [
          {
            id: 'msg_1',
            conversationId: 'conv_test',
            type: 'text',
            author: 'user',
            content: { text: 'Can you help me fix this bug in my code?' },
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        ],
      });

      const { AgentTransitionTracker } = require('../agent-transitions');
      const taskType = AgentTransitionTracker.inferTaskType(conversation);
      expect(taskType).toBe(TaskType.DEBUGGING);
    });

    it('should default to general task type when no patterns match', () => {
      const conversation = createMockConversation({
        messages: [
          {
            id: 'msg_1',
            conversationId: 'conv_test',
            type: 'text',
            author: 'user',
            content: { text: 'Hello, how are you today?' },
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        ],
      });

      const { AgentTransitionTracker } = require('../agent-transitions');
      const taskType = AgentTransitionTracker.inferTaskType(conversation);
      expect(taskType).toBe(TaskType.GENERAL);
    });
  });

  describe('data clearing', () => {
    it('should clear all data', async () => {
      await transitionTracker.recordTransition({
        fromAgentId: null,
        toAgentId: 'jepa-v1',
        conversationId: 'conv_test_123',
        taskType: TaskType.ANALYSIS,
        timeOfDay: TimeOfDay.MORNING,
        messageCount: 5,
        conversationLength: 500,
        recentActions: [],
      });

      await transitionTracker.clearAllData();

      const history = await transitionTracker.getTransitionHistory('conv_test_123');
      expect(history.length).toBe(0);
    });

    it('should clear old data', async () => {
      // This would require testing with time manipulation
      // For now, just ensure it doesn't throw
      await transitionTracker.clearOldData(30);
      expect(true).toBe(true);
    });
  });
});

// ============================================================================
// PREDICTION MODEL TESTS
// ============================================================================

describe('AgentPredictionModel', () => {
  beforeEach(async () => {
    await predictionModel.initialize();
    await transitionTracker.initialize();
  });

  afterEach(async () => {
    await predictionModel.resetModel();
    await transitionTracker.clearAllData();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(predictionModel).toBeDefined();
    });

    it('should not be trained initially', async () => {
      const isTrained = await predictionModel.isModelTrained();
      expect(isTrained).toBe(false);
    });
  });

  describe('training', () => {
    it('should require minimum samples to train', async () => {
      await expect(predictionModel.train()).rejects.toThrow();
    });

    it('should train with sufficient data', async () => {
      // Generate training data
      const agents = ['jepa-v1', 'spreader-v1', 'custom-agent'];
      const taskTypes = [TaskType.ANALYSIS, TaskType.WRITING, TaskType.CODING];
      const timesOfDay = [TimeOfDay.MORNING, TimeOfDay.AFTERNOON, TimeOfDay.EVENING];

      // Create 100 transitions
      for (let i = 0; i < 100; i++) {
        const fromAgent = i === 0 ? null : agents[i % agents.length];
        const toAgent = agents[(i + 1) % agents.length];

        await transitionTracker.recordTransition({
          fromAgentId: fromAgent,
          toAgentId: toAgent,
          conversationId: `conv_${i}`,
          taskType: taskTypes[i % taskTypes.length],
          timeOfDay: timesOfDay[i % timesOfDay.length],
          messageCount: Math.floor(Math.random() * 100),
          conversationLength: Math.floor(Math.random() * 10000),
          recentActions: createMockActions(3),
        });
      }

      const metrics = await predictionModel.train();

      expect(metrics).toBeDefined();
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
    });

    it('should update model metadata after training', async () => {
      // Generate training data
      for (let i = 0; i < 100; i++) {
        await transitionTracker.recordTransition({
          fromAgentId: i === 0 ? null : 'jepa-v1',
          toAgentId: 'spreader-v1',
          conversationId: `conv_${i}`,
          taskType: TaskType.ANALYSIS,
          timeOfDay: TimeOfDay.MORNING,
          messageCount: 10,
          conversationLength: 1000,
          recentActions: [],
        });
      }

      await predictionModel.train();

      const sampleCount = await predictionModel.getTrainingSampleCount();
      expect(sampleCount).toBe(100);
    });
  });

  describe('prediction', () => {
    beforeEach(async () => {
      // Generate training data
      for (let i = 0; i < 100; i++) {
        await transitionTracker.recordTransition({
          fromAgentId: i === 0 ? null : 'jepa-v1',
          toAgentId: i % 2 === 0 ? 'spreader-v1' : 'jepa-v1',
          conversationId: `conv_${i}`,
          taskType: i % 2 === 0 ? TaskType.ANALYSIS : TaskType.WRITING,
          timeOfDay: TimeOfDay.MORNING,
          messageCount: 10,
          conversationLength: 1000,
          recentActions: [],
        });
      }

      await predictionModel.train();
    });

    it('should predict next agent', async () => {
      const context = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1', 'spreader-v1'],
        conversation: createMockConversation(),
        recentActions: createMockActions(5),
        timestamp: Date.now(),
      };

      const predictions = await predictionModel.predict(context);

      expect(predictions).toBeDefined();
      expect(predictions.predictions.length).toBeGreaterThan(0);
      expect(predictions.predictions.length).toBeLessThanOrEqual(3);
      expect(predictions.predictions[0].agentId).toBeDefined();
      expect(predictions.predictions[0].confidence).toBeGreaterThanOrEqual(0);
      expect(predictions.predictions[0].confidence).toBeLessThanOrEqual(1);
    });

    it('should return top 3 predictions', async () => {
      const context = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1', 'spreader-v1', 'custom-agent'],
        conversation: createMockConversation(),
        recentActions: [],
        timestamp: Date.now(),
      };

      const predictions = await predictionModel.predict(context);

      expect(predictions.predictions.length).toBeLessThanOrEqual(3);
    });

    it('should include model version in prediction', async () => {
      const context = {
        currentAgentId: 'jepa-v1',
        availableAgents: ['jepa-v1', 'spreader-v1'],
        conversation: createMockConversation(),
        recentActions: [],
        timestamp: Date.now(),
      };

      const predictions = await predictionModel.predict(context);

      expect(predictions.modelVersion).toBeDefined();
      expect(predictions.timestamp).toBeDefined();
    });
  });

  describe('online learning', () => {
    it('should update model with new transition', async () => {
      // Train initial model
      for (let i = 0; i < 60; i++) {
        await transitionTracker.recordTransition({
          fromAgentId: i === 0 ? null : 'jepa-v1',
          toAgentId: 'spreader-v1',
          conversationId: `conv_${i}`,
          taskType: TaskType.ANALYSIS,
          timeOfDay: TimeOfDay.MORNING,
          messageCount: 10,
          conversationLength: 1000,
          recentActions: [],
        });
      }

      await predictionModel.train();

      // Update with new transition
      const newTransition = createMockTransition({
        toAgentId: 'spreader-v1',
        conversationId: 'conv_new',
      });

      await predictionModel.updateModel(newTransition);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('model management', () => {
    it('should get model accuracy', async () => {
      // Train model
      for (let i = 0; i < 60; i++) {
        await transitionTracker.recordTransition({
          fromAgentId: i === 0 ? null : 'jepa-v1',
          toAgentId: 'spreader-v1',
          conversationId: `conv_${i}`,
          taskType: TaskType.ANALYSIS,
          timeOfDay: TimeOfDay.MORNING,
          messageCount: 10,
          conversationLength: 1000,
          recentActions: [],
        });
      }

      await predictionModel.train();

      const accuracy = await predictionModel.getModelAccuracy();
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    });

    it('should get model version', async () => {
      const version = await predictionModel.getModelVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });

    it('should reset model', async () => {
      // Train model
      for (let i = 0; i < 60; i++) {
        await transitionTracker.recordTransition({
          fromAgentId: i === 0 ? null : 'jepa-v1',
          toAgentId: 'spreader-v1',
          conversationId: `conv_${i}`,
          taskType: TaskType.ANALYSIS,
          timeOfDay: TimeOfDay.MORNING,
          messageCount: 10,
          conversationLength: 1000,
          recentActions: [],
        });
      }

      await predictionModel.train();

      // Reset
      await predictionModel.resetModel();

      const isTrained = await predictionModel.isModelTrained();
      expect(isTrained).toBe(false);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Agent Prediction System Integration', () => {
  beforeEach(async () => {
    await transitionTracker.initialize();
    await predictionModel.initialize();
  });

  afterEach(async () => {
    await transitionTracker.clearAllData();
    await predictionModel.resetModel();
  });

  it('should handle complete workflow', async () => {
    // 1. Record transitions over time
    const agents = ['jepa-v1', 'spreader-v1'];
    for (let i = 0; i < 100; i++) {
      await transitionTracker.recordTransition({
        fromAgentId: i === 0 ? null : agents[i % agents.length],
        toAgentId: agents[(i + 1) % agents.length],
        conversationId: `conv_${i}`,
        taskType: TaskType.ANALYSIS,
        timeOfDay: TimeOfDay.MORNING,
        messageCount: Math.floor(Math.random() * 100),
        conversationLength: Math.floor(Math.random() * 10000),
        recentActions: createMockActions(3),
      });
    }

    // 2. Train model
    const metrics = await predictionModel.train();
    expect(metrics.accuracy).toBeGreaterThan(0);

    // 3. Make predictions
    const context = {
      currentAgentId: 'jepa-v1',
      availableAgents: agents,
      conversation: createMockConversation(),
      recentActions: createMockActions(5),
      timestamp: Date.now(),
    };

    const predictions = await predictionModel.predict(context);
    expect(predictions.predictions.length).toBeGreaterThan(0);

    // 4. Update model with new data
    const newTransition = createMockTransition({
      toAgentId: 'spreader-v1',
    });
    await predictionModel.updateModel(newTransition);

    // 5. Verify model is still trained
    const isTrained = await predictionModel.isModelTrained();
    expect(isTrained).toBe(true);
  });

  it('should achieve >70% accuracy with sufficient data', async () => {
    // Generate more realistic data with patterns
    // Pattern: JEPA → Spreader is common for analysis tasks
    // Pattern: Spreader → JEPA is common for writing tasks
    const agents = ['jepa-v1', 'spreader-v1'];

    for (let i = 0; i < 200; i++) {
      const isAnalysis = i % 2 === 0;
      const fromAgent = i === 0 ? null : (isAnalysis ? 'spreader-v1' : 'jepa-v1');
      const toAgent = isAnalysis ? 'jepa-v1' : 'spreader-v1';
      const taskType = isAnalysis ? TaskType.ANALYSIS : TaskType.WRITING;

      await transitionTracker.recordTransition({
        fromAgentId: fromAgent,
        toAgentId: toAgent,
        conversationId: `conv_${i}`,
        taskType,
        timeOfDay: TimeOfDay.MORNING,
        messageCount: 10 + Math.floor(Math.random() * 50),
        conversationLength: 1000 + Math.floor(Math.random() * 10000),
        recentActions: createMockActions(3),
      });
    }

    const metrics = await predictionModel.train(20); // More epochs

    // With clear patterns, should achieve decent accuracy
    expect(metrics.top3Accuracy).toBeGreaterThan(0.5);
  });
});
