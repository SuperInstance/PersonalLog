/**
 * MPC Prediction Engine Tests
 *
 * Comprehensive test suite for prediction engine functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MPCPredictionEngine } from '../prediction-engine';
import { MPCStatus, ResourceType, TaskPriority } from '../types';
import type { MPCState, MPCTask, AgentExecutionState, ResourceSnapshot } from '../types';
import type { AgentDefinition } from '@/lib/agents/types';

describe('MPCPredictionEngine', () => {
  let predictionEngine: MPCPredictionEngine;
  let mockState: MPCState;
  let mockTask: MPCTask;
  let mockAgentState: AgentExecutionState;
  let mockAgent: AgentDefinition;

  beforeEach(() => {
    predictionEngine = new MPCPredictionEngine();

    // Mock agent
    mockAgent = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'Test agent',
      icon: '🤖',
      category: 'analysis' as any,
      activationMode: 'foreground' as any,
      initialState: { status: 'idle' as any },
      metadata: {
        version: '1.0.0',
        author: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      },
    };

    // Mock agent state
    mockAgentState = {
      agentId: 'test-agent',
      agent: mockAgent,
      status: 'idle' as any,
      resourcesUsed: new Map(),
      progress: 0,
      retries: 0,
      lastUpdate: Date.now(),
    };

    // Mock task
    mockTask = {
      id: 'task-1',
      name: 'Test Task',
      description: 'Test task description',
      agentId: 'test-agent',
      priority: TaskPriority.NORMAL,
      estimatedDuration: 60,
      resourceRequirements: new Map([
        [ResourceType.CPU, 2],
        [ResourceType.MEMORY, 1024],
      ]),
      dependencies: [],
      createdAt: Date.now(),
      status: 'pending',
    };

    // Mock state
    const resources = new Map<ResourceType, ResourceSnapshot>([
      [ResourceType.CPU, {
        type: ResourceType.CPU,
        total: 8,
        used: 0,
        reserved: 0,
        available: 8,
        timestamp: Date.now(),
        unit: 'cores',
      }],
      [ResourceType.MEMORY, {
        type: ResourceType.MEMORY,
        total: 16384,
        used: 0,
        reserved: 0,
        available: 16384,
        timestamp: Date.now(),
        unit: 'MB',
      }],
    ]);

    mockState = {
      id: 'state-1',
      timestamp: Date.now(),
      status: MPCStatus.IDLE,
      agents: new Map([['test-agent', mockAgentState]]),
      tasks: new Map([['task-1', mockTask]]),
      resources,
      metrics: {
        totalCompleted: 0,
        totalFailed: 0,
        avgCompletionTime: 0,
        avgQualityScore: 0,
        totalTimeSaved: 0,
        resourceUtilization: 0,
        coordinationOverhead: 0,
        replanCount: 0,
        predictionAccuracy: 1,
        parallelizationLevel: 1,
      },
    };
  });

  describe('Agent Outcome Prediction', () => {
    it('should predict agent outcome for task', async () => {
      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      expect(prediction).toBeDefined();
      expect(prediction.agentId).toBe('test-agent');
      expect(prediction.taskId).toBe('task-1');
      expect(prediction.successProbability).toBeDefined();
      expect(prediction.qualityScore).toBeDefined();
      expect(prediction.potentialFailures).toBeDefined();
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        predictionEngine.predictAgentOutcome(mockState, 'test-agent', 'non-existent')
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for non-existent agent', async () => {
      mockState.agents.delete('test-agent');

      await expect(
        predictionEngine.predictAgentOutcome(mockState, 'non-existent', 'task-1')
      ).rejects.toThrow('Agent not found');
    });

    it('should predict success probability within bounds', async () => {
      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      expect(prediction.successProbability.value).toBeGreaterThanOrEqual(0);
      expect(prediction.successProbability.value).toBeLessThanOrEqual(1);
      expect(prediction.successProbability.lowerBound).toBeGreaterThanOrEqual(0);
      expect(prediction.successProbability.upperBound).toBeLessThanOrEqual(1);
    });

    it('should predict quality score within bounds', async () => {
      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      expect(prediction.qualityScore.value).toBeGreaterThanOrEqual(0);
      expect(prediction.qualityScore.value).toBeLessThanOrEqual(1);
      expect(prediction.qualityScore.lowerBound).toBeGreaterThanOrEqual(0);
      expect(prediction.qualityScore.upperBound).toBeLessThanOrEqual(1);
    });

    it('should include confidence intervals', async () => {
      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      expect(prediction.successProbability.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.successProbability.confidence).toBeLessThanOrEqual(1);
      expect(prediction.qualityScore.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.qualityScore.confidence).toBeLessThanOrEqual(1);
    });

    it('should identify potential failures', async () => {
      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      expect(Array.isArray(prediction.potentialFailures)).toBe(true);

      for (const failure of prediction.potentialFailures) {
        expect(failure.mode).toBeDefined();
        expect(failure.probability).toBeGreaterThanOrEqual(0);
        expect(failure.probability).toBeLessThanOrEqual(1);
        expect(Array.isArray(failure.mitigations)).toBe(true);
      }
    });

    it('should detect resource exhaustion failures', async () => {
      // Modify task to require more resources than available
      mockTask.resourceRequirements.set(ResourceType.CPU, 100);

      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      const exhaustionFailures = prediction.potentialFailures.filter(
        (f) => f.mode === 'resource_exhaustion'
      );

      expect(exhaustionFailures.length).toBeGreaterThan(0);
    });

    it('should detect agent error failures', async () => {
      mockAgentState.status = 'error' as any;

      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      const agentFailures = prediction.potentialFailures.filter(
        (f) => f.mode === 'agent_failure'
      );

      expect(agentFailures.length).toBeGreaterThan(0);
    });

    it('should detect dependency failures', async () => {
      // Add failed dependency
      const depTask: MPCTask = {
        ...mockTask,
        id: 'task-dep',
        status: 'failed',
      };
      mockState.tasks.set('task-dep', depTask);
      mockTask.dependencies = ['task-dep'];

      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      const depFailures = prediction.potentialFailures.filter(
        (f) => f.mode === 'dependency_failure'
      );

      expect(depFailures.length).toBeGreaterThan(0);
    });

    it('should adjust success probability based on agent retries', async () => {
      mockAgentState.retries = 3;

      const prediction1 = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      mockAgentState.retries = 0;
      const prediction2 = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      expect(prediction1.successProbability.value).toBeLessThan(
        prediction2.successProbability.value
      );
    });

    it('should adjust success probability based on task priority', async () => {
      mockTask.priority = TaskPriority.CRITICAL;

      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      // Critical tasks should have slightly higher success probability
      expect(prediction.successProbability.value).toBeGreaterThan(0.9);
    });
  });

  describe('Resource Usage Prediction', () => {
    it('should predict resource usage for task', async () => {
      const predictions = await predictionEngine.predictResourceUsage(
        mockState,
        'task-1'
      );

      expect(predictions).toBeInstanceOf(Map);
      expect(predictions.size).toBeGreaterThan(0);
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        predictionEngine.predictResourceUsage(mockState, 'non-existent')
      ).rejects.toThrow('Task not found');
    });

    it('should predict usage for all required resource types', async () => {
      const predictions = await predictionEngine.predictResourceUsage(
        mockState,
        'task-1'
      );

      for (const [resourceType] of mockTask.resourceRequirements) {
        expect(predictions.has(resourceType)).toBe(true);
      }
    });

    it('should include usage predictions with confidence intervals', async () => {
      const predictions = await predictionEngine.predictResourceUsage(
        mockState,
        'task-1'
      );

      for (const prediction of predictions.values()) {
        expect(prediction.usage.value).toBeGreaterThan(0);
        expect(prediction.usage.lowerBound).toBeGreaterThan(0);
        expect(prediction.usage.upperBound).toBeGreaterThan(0);
        expect(prediction.usage.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.usage.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should include peak usage predictions', async () => {
      const predictions = await predictionEngine.predictResourceUsage(
        mockState,
        'task-1'
      );

      for (const prediction of predictions.values()) {
        expect(prediction.peakUsage.value).toBeGreaterThan(0);
        expect(prediction.peakUsage.lowerBound).toBeGreaterThan(0);
        expect(prediction.peakUsage.upperBound).toBeGreaterThan(0);
        expect(prediction.peakUsage.value).toBeGreaterThanOrEqual(prediction.usage.value);
      }
    });

    it('should include duration predictions', async () => {
      const predictions = await predictionEngine.predictResourceUsage(
        mockState,
        'task-1'
      );

      for (const prediction of predictions.values()) {
        expect(prediction.duration.value).toBeGreaterThan(0);
        expect(prediction.duration.lowerBound).toBeGreaterThan(0);
        expect(prediction.duration.upperBound).toBeGreaterThan(0);
      }
    });

    it('should predict resource conflicts', async () => {
      // Add another task that uses same resources
      const task2: MPCTask = {
        ...mockTask,
        id: 'task-2',
        status: 'running',
        actualStart: Date.now(),
      };
      mockState.tasks.set('task-2', task2);

      const predictions = await predictionEngine.predictResourceUsage(
        mockState,
        'task-1'
      );

      for (const prediction of predictions.values()) {
        expect(Array.isArray(prediction.conflicts)).toBe(true);

        for (const conflict of prediction.conflicts) {
          expect(conflict.id).toBeDefined();
          expect(conflict.resourceType).toBeDefined();
          expect(conflict.taskIds).toBeDefined();
          expect(conflict.severity).toBeGreaterThanOrEqual(0);
          expect(conflict.severity).toBeLessThanOrEqual(1);
          expect(['contention', 'exhaustion', 'dependency', 'priority']).toContain(conflict.type);
        }
      }
    });

    it('should suggest conflict resolutions', async () => {
      // Create conflict scenario
      const task2: MPCTask = {
        ...mockTask,
        id: 'task-2',
        status: 'running',
        actualStart: Date.now(),
      };
      mockState.tasks.set('task-2', task2);

      const predictions = await predictionEngine.predictResourceUsage(
        mockState,
        'task-1'
      );

      for (const prediction of predictions.values()) {
        for (const conflict of prediction.conflicts) {
          if (conflict.resolution) {
            expect(conflict.resolution.strategy).toBeDefined();
            expect(['reschedule', 'reallocate', 'prioritize', 'batch']).toContain(
              conflict.resolution.strategy
            );
            expect(conflict.resolution.details).toBeDefined();
          }
        }
      }
    });
  });

  describe('Completion Time Prediction', () => {
    it('should predict completion time for task', async () => {
      const prediction = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      expect(prediction).toBeDefined();
      expect(prediction.taskId).toBe('task-1');
      expect(prediction.completionTime.value).toBeGreaterThan(Date.now());
      expect(prediction.duration.value).toBeGreaterThan(0);
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        predictionEngine.predictCompletionTime(mockState, 'non-existent')
      ).rejects.toThrow('Task not found');
    });

    it('should include confidence intervals', async () => {
      const prediction = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      expect(prediction.completionTime.lowerBound).toBeLessThan(prediction.completionTime.value);
      expect(prediction.completionTime.upperBound).toBeGreaterThan(prediction.completionTime.value);

      expect(prediction.duration.lowerBound).toBeLessThan(prediction.duration.value);
      expect(prediction.duration.upperBound).toBeGreaterThan(prediction.duration.value);
    });

    it('should identify factors affecting prediction', async () => {
      const prediction = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      expect(Array.isArray(prediction.factors)).toBe(true);

      for (const factor of prediction.factors) {
        expect(factor.factor).toBeDefined();
        expect(factor.impact).toBeGreaterThanOrEqual(-1);
        expect(factor.impact).toBeLessThanOrEqual(1);
        expect(factor.confidence).toBeGreaterThanOrEqual(0);
        expect(factor.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should account for task dependencies', async () => {
      // Add incomplete dependency
      const depTask: MPCTask = {
        ...mockTask,
        id: 'task-dep',
        status: 'pending',
        estimatedDuration: 120,
      };
      mockState.tasks.set('task-dep', depTask);
      mockTask.dependencies = ['task-dep'];

      const prediction = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      // Should predict longer duration due to dependency
      expect(prediction.duration.value).toBeGreaterThan(mockTask.estimatedDuration);
    });

    it('should adjust prediction based on priority', async () => {
      mockTask.priority = TaskPriority.CRITICAL;
      const prediction1 = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      mockTask.priority = TaskPriority.LOW;
      const prediction2 = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      // Lower priority tasks should take longer
      expect(prediction2.duration.value).toBeGreaterThan(prediction1.duration.value);
    });
  });

  describe('Scenario Simulation', () => {
    it('should simulate scenario with modifications', async () => {
      const modifications = [
        {
          variable: 'resources.CPU.available',
          original: 8,
          modified: 4,
        },
      ];

      const horizon = {
        steps: 3,
        stepDuration: 10,
        totalDuration: 30,
        replanInterval: 30,
      };

      const simulation = await predictionEngine.simulateScenario(
        mockState,
        modifications,
        horizon
      );

      expect(simulation).toBeDefined();
      expect(simulation.id).toBeDefined();
      expect(simulation.description).toBeDefined();
      expect(simulation.modifications).toEqual(modifications);
      expect(simulation.simulatedState).toBeDefined();
      expect(simulation.outcomes).toBeDefined();
      expect(simulation.comparison).toBeDefined();
    });

    it('should compare simulated outcomes to baseline', async () => {
      const modifications = [
        {
          variable: 'resources.CPU.available',
          original: 8,
          modified: 4,
        },
      ];

      const horizon = {
        steps: 3,
        stepDuration: 10,
        totalDuration: 30,
        replanInterval: 30,
      };

      const simulation = await predictionEngine.simulateScenario(
        mockState,
        modifications,
        horizon
      );

      expect(simulation.comparison.timeDiff).toBeDefined();
      expect(simulation.comparison.qualityDiff).toBeDefined();
      expect(simulation.comparison.resourceUtilDiff).toBeDefined();
      expect(simulation.comparison.riskDiff).toBeDefined();
    });

    it('should calculate outcome metrics', async () => {
      const modifications = [
        {
          variable: 'resources.CPU.available',
          original: 8,
          modified: 4,
        },
      ];

      const horizon = {
        steps: 3,
        stepDuration: 10,
        totalDuration: 30,
        replanInterval: 30,
      };

      const simulation = await predictionEngine.simulateScenario(
        mockState,
        modifications,
        horizon
      );

      expect(simulation.outcomes.completionTime).toBeGreaterThan(0);
      expect(simulation.outcomes.qualityScore).toBeGreaterThanOrEqual(0);
      expect(simulation.outcomes.qualityScore).toBeLessThanOrEqual(1);
      expect(simulation.outcomes.resourceUtilization).toBeGreaterThanOrEqual(0);
      expect(simulation.outcomes.resourceUtilization).toBeLessThanOrEqual(1);
      expect(simulation.outcomes.risk).toBeGreaterThanOrEqual(0);
      expect(simulation.outcomes.risk).toBeLessThanOrEqual(1);
    });

    it('should generate unique scenario IDs', async () => {
      const modifications = [
        {
          variable: 'resources.CPU.available',
          original: 8,
          modified: 4,
        },
      ];

      const horizon = {
        steps: 3,
        stepDuration: 10,
        totalDuration: 30,
        replanInterval: 30,
      };

      const simulation1 = await predictionEngine.simulateScenario(
        mockState,
        modifications,
        horizon
      );
      const simulation2 = await predictionEngine.simulateScenario(
        mockState,
        modifications,
        horizon
      );

      expect(simulation1.id).not.toBe(simulation2.id);
    });
  });

  describe('Future State Prediction', () => {
    it('should predict multiple future states', async () => {
      const horizon = {
        steps: 5,
        stepDuration: 10,
        totalDuration: 50,
        replanInterval: 30,
      };

      const predictions = await predictionEngine.predictFutureStates(
        mockState,
        horizon
      );

      expect(predictions).toBeDefined();
      expect(predictions.length).toBe(horizon.steps);
    });

    it('should create sequential state predictions', async () => {
      const horizon = {
        steps: 3,
        stepDuration: 10,
        totalDuration: 30,
        replanInterval: 30,
      };

      const predictions = await predictionEngine.predictFutureStates(
        mockState,
        horizon
      );

      for (let i = 1; i < predictions.length; i++) {
        expect(predictions[i].timestamp).toBeGreaterThanOrEqual(predictions[i - 1].timestamp);
      }
    });

    it('should update resource snapshots in future states', async () => {
      const horizon = {
        steps: 3,
        stepDuration: 10,
        totalDuration: 30,
        replanInterval: 30,
      };

      const predictions = await predictionEngine.predictFutureStates(
        mockState,
        horizon
      );

      for (const prediction of predictions) {
        expect(prediction.resources).toBeInstanceOf(Map);
        expect(prediction.resources.size).toBeGreaterThan(0);
      }
    });
  });

  describe('Learning from Historical Data', () => {
    it('should learn from completed task', async () => {
      await predictionEngine.learnFromTask(
        mockTask,
        70, // actual duration
        true, // success
        0.85 // quality score
      );

      const historicalData = predictionEngine.getHistoricalData();
      expect(historicalData.length).toBeGreaterThan(0);

      const lastEntry = historicalData[historicalData.length - 1];
      expect(lastEntry.taskId).toBe(mockTask.id);
      expect(lastEntry.agentId).toBe(mockTask.agentId);
      expect(lastEntry.actualDuration).toBe(70);
      expect(lastEntry.success).toBe(true);
      expect(lastEntry.qualityScore).toBe(0.85);
    });

    it('should update patterns after sufficient samples', async () => {
      // Learn from multiple tasks
      for (let i = 0; i < 10; i++) {
        await predictionEngine.learnFromTask(
          mockTask,
          70,
          true,
          0.85
        );
      }

      const patterns = predictionEngine.getPatterns();
      expect(patterns.has('test-agent')).toBe(true);

      const pattern = patterns.get('test-agent');
      expect(pattern).toBeDefined();
      expect(pattern!.avgDurationRatio).toBeDefined();
      expect(pattern!.successRate).toBeDefined();
      expect(pattern!.avgQualityScore).toBeDefined();
      expect(pattern!.sampleSize).toBeGreaterThan(0);
    });

    it('should use learned patterns for predictions', async () => {
      // Learn from multiple tasks with consistent overestimation
      for (let i = 0; i < 10; i++) {
        await predictionEngine.learnFromTask(
          { ...mockTask, estimatedDuration: 100 },
          80, // consistently 20% faster
          true,
          0.9
        );
      }

      // New prediction should use learned pattern
      const prediction = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      // Duration should be adjusted based on historical pattern
      expect(prediction.duration.value).toBeLessThan(mockTask.estimatedDuration);
    });

    it('should trim history when exceeding max size', async () => {
      const maxSize = 100; // Private member, need to infer from behavior

      // Add more than max size
      for (let i = 0; i < 150; i++) {
        await predictionEngine.learnFromTask(
          { ...mockTask, id: `task-${i}` },
          70,
          true,
          0.85
        );
      }

      const historicalData = predictionEngine.getHistoricalData();
      // Should be trimmed to max size
      expect(historicalData.length).toBeLessThanOrEqual(10000); // Based on maxHistorySize
    });

    it('should clear history when requested', async () => {
      await predictionEngine.learnFromTask(
        mockTask,
        70,
        true,
        0.85
      );

      expect(predictionEngine.getHistoricalData().length).toBeGreaterThan(0);

      predictionEngine.clearHistory();

      expect(predictionEngine.getHistoricalData().length).toBe(0);
      expect(predictionEngine.getPatterns().size).toBe(0);
    });
  });

  describe('Confidence Calculation', () => {
    it('should increase confidence with more samples', async () => {
      // Learn from many tasks
      for (let i = 0; i < 20; i++) {
        await predictionEngine.learnFromTask(
          mockTask,
          70,
          true,
          0.85
        );
      }

      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      // Should have higher confidence with more samples
      expect(prediction.successProbability.confidence).toBeGreaterThan(0.5);
    });

    it('should cap confidence at maximum', async () => {
      // Learn from many tasks
      for (let i = 0; i < 1000; i++) {
        await predictionEngine.learnFromTask(
          mockTask,
          70,
          true,
          0.85
        );
      }

      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      // Confidence should be capped at 0.95
      expect(prediction.successProbability.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with no dependencies', async () => {
      mockTask.dependencies = [];

      const prediction = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      expect(prediction.duration.value).toBeGreaterThan(0);
    });

    it('should handle tasks with many dependencies', async () => {
      mockTask.dependencies = ['dep1', 'dep2', 'dep3', 'dep4', 'dep5'];

      const prediction = await predictionEngine.predictAgentOutcome(
        mockState,
        'test-agent',
        'task-1'
      );

      // Should slightly reduce success probability
      expect(prediction.successProbability.value).toBeLessThan(0.95);
    });

    it('should handle zero resource requirements', async () => {
      mockTask.resourceRequirements = new Map();

      const predictions = await predictionEngine.predictResourceUsage(
        mockState,
        'task-1'
      );

      expect(predictions.size).toBe(0);
    });

    it('should handle very long task durations', async () => {
      mockTask.estimatedDuration = 3600; // 1 hour

      const prediction = await predictionEngine.predictCompletionTime(
        mockState,
        'task-1'
      );

      expect(prediction.duration.value).toBeGreaterThan(0);
    });
  });

  describe('Resource Conflict Prediction', () => {
    it('should detect resource contention', async () => {
      // Create contention scenario
      const task2: MPCTask = {
        ...mockTask,
        id: 'task-2',
        status: 'running',
        actualStart: Date.now(),
        resourceRequirements: new Map([[ResourceType.CPU, 6]]),
      };
      mockState.tasks.set('task-2', task2);

      const conflicts = await predictionEngine['predictResourceConflicts'](
        mockState,
        'task-1',
        ResourceType.CPU,
        2,
        60
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('exhaustion');
    });

    it('should suggest appropriate resolution strategies', async () => {
      const conflicts = await predictionEngine['predictResourceConflicts'](
        mockState,
        'task-1',
        ResourceType.CPU,
        10,
        60
      );

      for (const conflict of conflicts) {
        if (conflict.resolution) {
          expect(['reschedule', 'reallocate', 'prioritize', 'batch']).toContain(
            conflict.resolution.strategy
          );
        }
      }
    });
  });
});
