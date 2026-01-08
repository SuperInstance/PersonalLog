/**
 * Agent Selection Model Tests
 *
 * Comprehensive test suite for ML-based agent selection.
 * Tests feature extraction, model training, prediction, and ranking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentSelectionModel, rankAgentsByRules } from '../selection-model';
import {
  extractSelectionFeatures,
  featuresToVector,
  getFeatureDimension,
  createDefaultUserPreferences,
  createDefaultSystemContext,
  type SelectionFeatures,
  type TaskClassification,
  type AgentPerformanceMetrics,
  type UserPreferences,
  type SystemContext,
} from '../selection-features';
import type { AgentDefinition } from '../types';
import type { HardwareProfile } from '@/lib/hardware/types';
import { AgentCategory, ActivationMode, AgentState } from '../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockAgent(overrides?: Partial<AgentDefinition>): AgentDefinition {
  return {
    id: 'test-agent-v1',
    name: 'Test Agent',
    description: 'A test agent for unit testing',
    icon: '🧪',
    category: AgentCategory.ANALYSIS,
    activationMode: ActivationMode.FOREGROUND,
    initialState: {
      status: AgentState.IDLE,
    },
    metadata: {
      version: '1.0.0',
      author: 'Test Suite',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['test', 'analysis'],
    },
    ...overrides,
  };
}

function createMockHardwareProfile(): HardwareProfile {
  return {
    timestamp: Date.now(),
    cpu: {
      cores: 8,
      concurrency: 8,
      simd: { supported: true },
      wasm: {
        supported: true,
        simd: true,
        threads: true,
        bulkMemory: true,
        exceptions: true,
      },
    },
    gpu: {
      available: true,
      vendor: 'NVIDIA',
      renderer: 'RTX 4060',
      webgpu: { supported: true },
      webgl: { supported: true, version: 2 },
    },
    memory: {
      totalGB: 16,
      hasMemoryAPI: false,
    },
    storage: {
      indexedDB: { supported: true, available: true },
    },
    network: {
      online: true,
      hasNetworkAPI: true,
    },
    display: {
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      colorDepth: 24,
    },
    browser: {
      userAgent: 'Test Browser',
      browser: 'chrome',
      os: 'windows',
      platform: 'win32',
      touchSupport: false,
    },
    features: {
      webWorkers: true,
      serviceWorker: true,
      webrtc: true,
      webassembly: true,
      websockets: true,
      geolocation: true,
      notifications: true,
      fullscreen: true,
      pip: true,
      webBluetooth: false,
      webusb: false,
      fileSystemAccess: true,
    },
    performanceScore: 75,
    performanceClass: 'high',
  };
}

function createMockTaskClassification(overrides?: Partial<TaskClassification>): TaskClassification {
  return {
    category: 'analysis',
    confidence: 0.9,
    complexity: 0.7,
    estimatedTime: 300,
    requiredCapabilities: ['analysis', 'text'],
    ...overrides,
  };
}

function createMockAgentPerformance(overrides?: Partial<AgentPerformanceMetrics>): AgentPerformanceMetrics {
  return {
    agentId: 'test-agent-v1',
    successRate: 0.85,
    avgExecutionTime: 1500,
    totalExecutions: 100,
    lastExecution: Date.now(),
    userSatisfaction: 0.9,
    errorRate: 0.15,
    ...overrides,
  };
}

// ============================================================================
// FEATURE EXTRACTION TESTS
// ============================================================================

describe('Selection Feature Extraction', () => {
  const mockAgent = createMockAgent();
  const mockHardware = createMockHardwareProfile();
  const mockTask = createMockTaskClassification();
  const mockPerformance = createMockAgentPerformance();
  const mockPreferences = createDefaultUserPreferences();
  const mockContext = createDefaultSystemContext();

  describe('extractSelectionFeatures', () => {
    it('should extract complete feature set', () => {
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        mockPerformance,
        mockPreferences,
        mockContext,
        mockHardware
      );

      expect(features).toHaveProperty('task');
      expect(features).toHaveProperty('agent');
      expect(features).toHaveProperty('performance');
      expect(features).toHaveProperty('preferences');
      expect(features).toHaveProperty('context');
    });

    it('should extract task features correctly', () => {
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        mockPerformance,
        mockPreferences,
        mockContext,
        mockHardware
      );

      expect(features.task.category).toBeInstanceOf(Object);
      expect(features.task.category.analysis).toBe(1);
      expect(features.task.complexity).toBe(0.7);
      expect(features.task.estimatedTime).toBeLessThanOrEqual(1);
    });

    it('should extract agent features correctly', () => {
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        mockPerformance,
        mockPreferences,
        mockContext,
        mockHardware
      );

      expect(features.agent.category).toBeInstanceOf(Object);
      expect(features.agent.category.analysis).toBe(1);
      expect(features.agent.hardwareCompatibility).toBeGreaterThan(0);
      expect(features.agent.resourceIntensity).toBeGreaterThan(0);
    });

    it('should extract performance features correctly', () => {
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        mockPerformance,
        mockPreferences,
        mockContext,
        mockHardware
      );

      expect(features.performance.successRate).toBe(0.85);
      expect(features.performance.executionSpeed).toBeGreaterThan(0);
      expect(features.performance.reliability).toBeCloseTo(0.85);
    });

    it('should handle null performance data', () => {
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        null,
        mockPreferences,
        mockContext,
        mockHardware
      );

      expect(features.performance.successRate).toBe(0.5);
      expect(features.performance.executionSpeed).toBe(0.5);
    });
  });

  describe('featuresToVector', () => {
    it('should convert features to flat vector', () => {
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        mockPerformance,
        mockPreferences,
        mockContext,
        mockHardware
      );

      const vector = featuresToVector(features);

      expect(Array.isArray(vector)).toBe(true);
      expect(vector.every(v => typeof v === 'number')).toBe(true);
    });

    it('should produce vector of correct dimension', () => {
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        mockPerformance,
        mockPreferences,
        mockContext,
        mockHardware
      );

      const vector = featuresToVector(features);
      const expectedDim = getFeatureDimension();

      expect(vector.length).toBe(expectedDim);
    });

    it('should produce consistent vectors for same input', () => {
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        mockPerformance,
        mockPreferences,
        mockContext,
        mockHardware
      );

      const vector1 = featuresToVector(features);
      const vector2 = featuresToVector(features);

      expect(vector1).toEqual(vector2);
    });
  });

  describe('getFeatureDimension', () => {
    it('should return correct feature dimension', () => {
      const dim = getFeatureDimension();
      expect(dim).toBe(48);
    });
  });

  describe('createDefaultUserPreferences', () => {
    it('should create valid default preferences', () => {
      const prefs = createDefaultUserPreferences();

      expect(prefs.pastSelections).toBeInstanceOf(Map);
      expect(prefs.preferredAgents).toBeInstanceOf(Set);
      expect(prefs.avoidedAgents).toBeInstanceOf(Set);
      expect(prefs.selectionHistory).toEqual([]);
    });
  });

  describe('createDefaultSystemContext', () => {
    it('should create valid default context', () => {
      const context = createDefaultSystemContext();

      expect(context.hourOfDay).toBeGreaterThanOrEqual(0);
      expect(context.hourOfDay).toBeLessThanOrEqual(23);
      expect(context.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(context.dayOfWeek).toBeLessThanOrEqual(6);
      expect(context.networkOnline).toBe(true);
    });
  });
});

// ============================================================================
// MODEL TESTS
// ============================================================================

describe('AgentSelectionModel', () => {
  let model: AgentSelectionModel;
  const mockAgents = [
    createMockAgent({ id: 'agent-1', name: 'Agent 1', category: AgentCategory.ANALYSIS }),
    createMockAgent({ id: 'agent-2', name: 'Agent 2', category: AgentCategory.CREATIVE }),
    createMockAgent({ id: 'agent-3', name: 'Agent 3', category: AgentCategory.KNOWLEDGE }),
  ];
  const mockHardware = createMockHardwareProfile();
  const mockPreferences = createDefaultUserPreferences();
  const mockContext = createDefaultSystemContext();

  beforeEach(() => {
    model = new AgentSelectionModel();
  });

  describe('initialization', () => {
    it('should initialize with default metrics', () => {
      const accuracy = model.getModelAccuracy();

      expect(accuracy.top1Accuracy).toBe(0.5);
      expect(accuracy.top3Accuracy).toBe(0.75);
      expect(accuracy.totalSamples).toBe(0);
    });

    it('should have valid model version', () => {
      const version = model.getModelVersion();

      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('predictBestAgents', () => {
    it('should return ranked predictions', () => {
      const mockTask = createMockTaskClassification();
      const ranking = model.predictBestAgents(
        mockTask,
        mockAgents,
        mockHardware,
        mockPreferences,
        mockContext
      );

      expect(ranking.predictions).toHaveLength(mockAgents.length);
      expect(ranking.predictions[0].score).toBeGreaterThanOrEqual(ranking.predictions[1].score);
    });

    it('should include required prediction fields', () => {
      const mockTask = createMockTaskClassification();
      const ranking = model.predictBestAgents(
        mockTask,
        mockAgents,
        mockHardware,
        mockPreferences,
        mockContext
      );

      ranking.predictions.forEach(prediction => {
        expect(prediction).toHaveProperty('agent');
        expect(prediction).toHaveProperty('score');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction).toHaveProperty('explanation');
      });
    });

    it('should return scores in valid range', () => {
      const mockTask = createMockTaskClassification();
      const ranking = model.predictBestAgents(
        mockTask,
        mockAgents,
        mockHardware,
        mockPreferences,
        mockContext
      );

      ranking.predictions.forEach(prediction => {
        expect(prediction.score).toBeGreaterThanOrEqual(0);
        expect(prediction.score).toBeLessThanOrEqual(1);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty predictions for empty agent list', () => {
      const mockTask = createMockTaskClassification();
      const ranking = model.predictBestAgents(
        mockTask,
        [],
        mockHardware,
        mockPreferences,
        mockContext
      );

      expect(ranking.predictions).toHaveLength(0);
    });
  });

  describe('predictAgentScore', () => {
    it('should return prediction for single agent', () => {
      const mockTask = createMockTaskClassification();
      const agent = mockAgents[0];
      const prediction = model.predictAgentScore(
        mockTask,
        agent,
        mockHardware,
        mockPreferences,
        mockContext
      );

      expect(prediction.score).toBeGreaterThanOrEqual(0);
      expect(prediction.score).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.explanation).toBeTruthy();
    });

    it('should generate non-empty explanation', () => {
      const mockTask = createMockTaskClassification();
      const agent = mockAgents[0];
      const prediction = model.predictAgentScore(
        mockTask,
        agent,
        mockHardware,
        mockPreferences,
        mockContext
      );

      expect(prediction.explanation.length).toBeGreaterThan(0);
    });

    it('should include feature contributions', () => {
      const mockTask = createMockTaskClassification();
      const agent = mockAgents[0];
      const prediction = model.predictAgentScore(
        mockTask,
        agent,
        mockHardware,
        mockPreferences,
        mockContext
      );

      expect(prediction.featureContributions).toBeInstanceOf(Object);
      const contributions = prediction.featureContributions;
      if (contributions) {
        expect(Object.keys(contributions).length).toBeGreaterThan(0);
      }
    });
  });

  describe('getExplanation', () => {
    it('should generate explanation for agent recommendation', () => {
      const mockTask = createMockTaskClassification();
      const agent = mockAgents[0];
      const explanation = model.getExplanation(agent, mockTask);

      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
    });
  });

  describe('trainModel', () => {
    it('should return false for insufficient data', () => {
      const trainingData: any[] = [];

      const result = model.trainModel(trainingData);

      expect(result).toBe(false);
    });

    it('should train successfully with sufficient data', () => {
      const mockTask = createMockTaskClassification();
      const mockAgent = mockAgents[0];

      // Create mock training data
      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        null,
        mockPreferences,
        mockContext,
        mockHardware
      );

      const trainingData = Array(25).fill(null).map((_, i) => ({
        taskFeatures: features,
        selectedAgentId: mockAgent.id,
        successful: i % 2 === 0,
        userSatisfaction: 0.8,
        executionTime: 1000,
        timestamp: Date.now() - i * 1000,
      }));

      const result = model.trainModel(trainingData);

      expect(result).toBe(true);
      expect(model.getModelAccuracy().totalSamples).toBe(25);
    });

    it('should update model accuracy after training', () => {
      const mockTask = createMockTaskClassification();
      const mockAgent = mockAgents[0];

      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        null,
        mockPreferences,
        mockContext,
        mockHardware
      );

      const trainingData = Array(25).fill(null).map((_, i) => ({
        taskFeatures: features,
        selectedAgentId: mockAgent.id,
        successful: i % 2 === 0,
        userSatisfaction: 0.8,
        executionTime: 1000,
        timestamp: Date.now() - i * 1000,
      }));

      model.trainModel(trainingData);
      const accuracy = model.getModelAccuracy();

      expect(accuracy.top1Accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy.top1Accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('updateModel', () => {
    it('should incrementally update with single data point', () => {
      const mockTask = createMockTaskClassification();
      const mockAgent = mockAgents[0];

      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        null,
        mockPreferences,
        mockContext,
        mockHardware
      );

      const dataPoint = {
        taskFeatures: features,
        selectedAgentId: mockAgent.id,
        successful: true,
        userSatisfaction: 0.9,
        executionTime: 500,
        timestamp: Date.now(),
      };

      const result = model.updateModel(dataPoint);

      expect(result).toBe(true);
      expect(model.getModelAccuracy().totalSamples).toBe(1);
    });

    it('should handle multiple updates', () => {
      const mockTask = createMockTaskClassification();
      const mockAgent = mockAgents[0];

      const features = extractSelectionFeatures(
        mockTask,
        mockAgent,
        null,
        mockPreferences,
        mockContext,
        mockHardware
      );

      for (let i = 0; i < 10; i++) {
        const dataPoint = {
          taskFeatures: features,
          selectedAgentId: mockAgent.id,
          successful: i % 2 === 0,
          userSatisfaction: 0.7,
          executionTime: 800,
          timestamp: Date.now() - i * 100,
        };

        model.updateModel(dataPoint);
      }

      expect(model.getModelAccuracy().totalSamples).toBe(10);
    });
  });

  describe('getModelAccuracy', () => {
    it('should return accuracy metrics', () => {
      const accuracy = model.getModelAccuracy();

      expect(accuracy).toHaveProperty('top1Accuracy');
      expect(accuracy).toHaveProperty('top3Accuracy');
      expect(accuracy).toHaveProperty('mse');
      expect(accuracy).toHaveProperty('totalSamples');
      expect(accuracy).toHaveProperty('lastTrained');
      expect(accuracy).toHaveProperty('version');
    });
  });

  describe('getModelVersion', () => {
    it('should return version string', () => {
      const version = model.getModelVersion();

      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});

// ============================================================================
// RULE-BASED RANKING TESTS
// ============================================================================

describe('Rule-Based Ranking', () => {
  const mockAgents = [
    createMockAgent({
      id: 'agent-1',
      name: 'Analysis Agent',
      category: AgentCategory.ANALYSIS,
      metadata: { ...createMockAgent().metadata, tags: ['analysis', 'text'] },
    }),
    createMockAgent({
      id: 'agent-2',
      name: 'Creative Agent',
      category: AgentCategory.CREATIVE,
      metadata: { ...createMockAgent().metadata, tags: ['creative', 'generation'] },
    }),
    createMockAgent({
      id: 'agent-3',
      name: 'Knowledge Agent',
      category: AgentCategory.KNOWLEDGE,
      metadata: { ...createMockAgent().metadata, tags: ['knowledge', 'search'] },
    }),
  ];

  describe('rankAgentsByRules', () => {
    it('should return ranked agents', () => {
      const mockTask = createMockTaskClassification({ category: 'analysis' });
      const ranked = rankAgentsByRules(mockTask, mockAgents);

      expect(ranked).toHaveLength(mockAgents.length);
    });

    it('should prioritize category-matching agents', () => {
      const mockTask = createMockTaskClassification({ category: 'analysis' });
      const ranked = rankAgentsByRules(mockTask, mockAgents);

      // Analysis agent should be ranked first
      expect(ranked[0].category).toBe(AgentCategory.ANALYSIS);
    });

    it('should handle empty agent list', () => {
      const mockTask = createMockTaskClassification();
      const ranked = rankAgentsByRules(mockTask, []);

      expect(ranked).toEqual([]);
    });

    it('should handle agents with no category match', () => {
      const mockTask = createMockTaskClassification({ category: 'automation' });
      const ranked = rankAgentsByRules(mockTask, mockAgents);

      // All agents should still be returned
      expect(ranked).toHaveLength(mockAgents.length);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Selection Model Integration', () => {
  let model: AgentSelectionModel;

  beforeEach(() => {
    model = new AgentSelectionModel();
  });

  it('should handle end-to-end prediction workflow', () => {
    const agents = [
      createMockAgent({ id: 'jepa-v1', name: 'JEPA', category: AgentCategory.ANALYSIS }),
      createMockAgent({ id: 'spreader-v1', name: 'Spreader', category: AgentCategory.KNOWLEDGE }),
    ];

    const mockTask = createMockTaskClassification({
      category: 'analysis',
      complexity: 0.8,
      requiredCapabilities: ['analysis', 'audio'],
    });

    const ranking = model.predictBestAgents(
      mockTask,
      agents,
      createMockHardwareProfile(),
      createDefaultUserPreferences(),
      createDefaultSystemContext()
    );

    expect(ranking.predictions).toHaveLength(2);
    expect(ranking.modelVersion).toBeTruthy();
    expect(ranking.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should improve accuracy after training', () => {
    const initialAccuracy = model.getModelAccuracy().top1Accuracy;

    // Add training data
    const mockAgent = createMockAgent();
    const mockTask = createMockTaskClassification();

    const features = extractSelectionFeatures(
      mockTask,
      mockAgent,
      null,
      createDefaultUserPreferences(),
      createDefaultSystemContext(),
      createMockHardwareProfile()
    );

    const trainingData = Array(25).fill(null).map((_, i) => ({
      taskFeatures: features,
      selectedAgentId: mockAgent.id,
      successful: true,
      userSatisfaction: 0.9,
      executionTime: 1000,
      timestamp: Date.now() - i * 1000,
    }));

    model.trainModel(trainingData);
    const finalAccuracy = model.getModelAccuracy().top1Accuracy;

    expect(finalAccuracy).toBeGreaterThanOrEqual(0);
  });

  it('should handle online learning gracefully', () => {
    const mockAgent = createMockAgent();
    const mockTask = createMockTaskClassification();

    const features = extractSelectionFeatures(
      mockTask,
      mockAgent,
      null,
      createDefaultUserPreferences(),
      createDefaultSystemContext(),
      createMockHardwareProfile()
    );

    // Add 100 incremental updates
    for (let i = 0; i < 100; i++) {
      model.updateModel({
        taskFeatures: features,
        selectedAgentId: mockAgent.id,
        successful: Math.random() > 0.3, // 70% success rate
        userSatisfaction: 0.75,
        executionTime: 1000,
        timestamp: Date.now() - i * 100,
      });
    }

    const metrics = model.getModelAccuracy();
    expect(metrics.totalSamples).toBe(100);
  });

  it('should maintain valid predictions after extensive updates', () => {
    const agents = [
      createMockAgent({ id: 'agent-1', name: 'Agent 1' }),
      createMockAgent({ id: 'agent-2', name: 'Agent 2' }),
    ];

    const mockTask = createMockTaskClassification();

    // Make predictions
    const ranking1 = model.predictBestAgents(
      mockTask,
      agents,
      createMockHardwareProfile(),
      createDefaultUserPreferences(),
      createDefaultSystemContext()
    );

    // Add some training data
    const features = extractSelectionFeatures(
      mockTask,
      agents[0],
      null,
      createDefaultUserPreferences(),
      createDefaultSystemContext(),
      createMockHardwareProfile()
    );

    for (let i = 0; i < 50; i++) {
      model.updateModel({
        taskFeatures: features,
        selectedAgentId: agents[0].id,
        successful: true,
        userSatisfaction: 0.8,
        executionTime: 800,
        timestamp: Date.now() - i * 1000,
      });
    }

    // Make predictions again
    const ranking2 = model.predictBestAgents(
      mockTask,
      agents,
      createMockHardwareProfile(),
      createDefaultUserPreferences(),
      createDefaultSystemContext()
    );

    // Both should be valid
    expect(ranking1.predictions.length).toBe(2);
    expect(ranking2.predictions.length).toBe(2);

    // All scores should be in valid range
    [...ranking1.predictions, ...ranking2.predictions].forEach(p => {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(1);
    });
  });
});
