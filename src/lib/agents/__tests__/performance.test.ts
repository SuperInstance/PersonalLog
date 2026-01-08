/**
 * Agent Performance Tracking Tests
 *
 * Comprehensive test suite for the performance tracking system.
 * Tests storage, tracking, aggregation, ranking, and privacy features.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  performanceTracker,
  recordAgentExecution,
  recordAgentFeedback,
  getAgentPerformance,
  getTopAgentsForTask,
  getPerformanceHistory,
  PerformanceTracker,
} from '../performance';
import {
  recordExecution,
  queryExecutions,
  clearAllExecutions,
  getPrivacySettings,
  updatePrivacySettings,
  getStorageStats,
  deleteExecutionsBefore,
} from '../performance-storage';
import {
  TaskType,
  TaskOutcome,
  ErrorType,
  type AgentExecutionRecord,
  type PrivacySettings,
} from '../performance-types';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a test execution record
 */
function createTestExecution(
  agentId: string,
  taskType: TaskType,
  outcome: TaskOutcome,
  duration: number,
  rating?: number,
  reused?: boolean
): AgentExecutionRecord {
  return {
    id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    agentId,
    taskType,
    outcome,
    timestamp: new Date().toISOString(),
    duration,
    errorType: outcome === TaskOutcome.FAILURE ? ErrorType.UNKNOWN : undefined,
    errorMessage: outcome === TaskOutcome.FAILURE ? 'Test error' : undefined,
    rating,
    reused,
    resources: {
      cpu: 0.5,
      memory: 1024000,
    },
    conversationId: 'test-conversation',
  };
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  await clearAllExecutions();
  // Reset privacy settings
  await updatePrivacySettings({
    enabled: true,
    logResources: true,
    logErrors: true,
    retentionDays: 90,
  });
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Agent Performance Tracking', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // ========================================================================
  // STORAGE TESTS
  // ========================================================================

  describe('Storage', () => {
    it('should record an execution', async () => {
      const record = createTestExecution(
        'agent-1',
        TaskType.ANALYZE,
        TaskOutcome.SUCCESS,
        1000
      );

      await recordExecution(record);

      const records = await queryExecutions({ agentId: 'agent-1' });
      expect(records).toHaveLength(1);
      expect(records[0].agentId).toBe('agent-1');
      expect(records[0].taskType).toBe(TaskType.ANALYZE);
      expect(records[0].outcome).toBe(TaskOutcome.SUCCESS);
    });

    it('should record multiple executions', async () => {
      const record1 = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
      const record2 = createTestExecution('agent-2', TaskType.GENERATE, TaskOutcome.SUCCESS, 2000);

      await recordExecution(record1);
      await recordExecution(record2);

      const records = await queryExecutions();
      expect(records).toHaveLength(2);
    });

    it('should query executions by agent ID', async () => {
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));
      await recordExecution(createTestExecution('agent-2', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));
      await recordExecution(createTestExecution('agent-1', TaskType.GENERATE, TaskOutcome.SUCCESS, 1000));

      const agent1Records = await queryExecutions({ agentId: 'agent-1' });
      expect(agent1Records).toHaveLength(2);

      const agent2Records = await queryExecutions({ agentId: 'agent-2' });
      expect(agent2Records).toHaveLength(1);
    });

    it('should query executions by task type', async () => {
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));
      await recordExecution(createTestExecution('agent-2', TaskType.GENERATE, TaskOutcome.SUCCESS, 1000));
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));

      const analyzeRecords = await queryExecutions({ taskType: TaskType.ANALYZE });
      expect(analyzeRecords).toHaveLength(2);

      const generateRecords = await queryExecutions({ taskType: TaskType.GENERATE });
      expect(generateRecords).toHaveLength(1);
    });

    it('should query executions by outcome', async () => {
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.FAILURE, 1000));
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));

      const successRecords = await queryExecutions({ outcome: TaskOutcome.SUCCESS });
      expect(successRecords).toHaveLength(2);

      const failureRecords = await queryExecutions({ outcome: TaskOutcome.FAILURE });
      expect(failureRecords).toHaveLength(1);
    });

    it('should query executions with limit', async () => {
      for (let i = 0; i < 10; i++) {
        await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));
      }

      const limitedRecords = await queryExecutions({ limit: 5 });
      expect(limitedRecords).toHaveLength(5);
    });

    it('should query executions with time range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const oldRecord = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
      oldRecord.timestamp = yesterday.toISOString();
      await recordExecution(oldRecord);

      const newRecord = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
      newRecord.timestamp = now.toISOString();
      await recordExecution(newRecord);

      const recentRecords = await queryExecutions({
        startTime: new Date(yesterday.getTime() + 1).toISOString(),
      });
      expect(recentRecords).toHaveLength(1);
    });

    it('should delete executions before date', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const oldRecord = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
      oldRecord.timestamp = twoDaysAgo.toISOString();
      await recordExecution(oldRecord);

      const newRecord = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
      newRecord.timestamp = now.toISOString();
      await recordExecution(newRecord);

      const deletedCount = await deleteExecutionsBefore(oneDayAgo.toISOString());
      expect(deletedCount).toBe(1);

      const remainingRecords = await queryExecutions();
      expect(remainingRecords).toHaveLength(1);
      expect(remainingRecords[0].timestamp).toBe(now.toISOString());
    });

    it('should clear all executions', async () => {
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));
      await recordExecution(createTestExecution('agent-2', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));

      await clearAllExecutions();

      const records = await queryExecutions();
      expect(records).toHaveLength(0);
    });
  });

  // ========================================================================
  // TRACKING TESTS
  // ========================================================================

  describe('Performance Tracker', () => {
    it('should record agent execution', async () => {
      const recordId = await performanceTracker.recordAgentExecution(
        'agent-1',
        TaskType.ANALYZE,
        {
          outcome: TaskOutcome.SUCCESS,
          duration: 1234,
          resources: { cpu: 0.5, memory: 1024000 },
          conversationId: 'conv-1',
        }
      );

      expect(recordId).toBeTruthy();
      expect(recordId).toMatch(/^exec_/);

      const records = await queryExecutions({ agentId: 'agent-1' });
      expect(records).toHaveLength(1);
      expect(records[0].duration).toBe(1234);
    });

    it('should record failed execution', async () => {
      const recordId = await performanceTracker.recordAgentExecution(
        'agent-1',
        TaskType.ANALYZE,
        {
          outcome: TaskOutcome.FAILURE,
          duration: 500,
          errorType: ErrorType.VALIDATION,
          errorMessage: 'Invalid input',
          resources: { cpu: 0.2, memory: 512000 },
          conversationId: 'conv-1',
        }
      );

      const records = await queryExecutions({ agentId: 'agent-1' });
      expect(records[0].outcome).toBe(TaskOutcome.FAILURE);
      expect(records[0].errorType).toBe(ErrorType.VALIDATION);
      expect(records[0].errorMessage).toBe('Invalid input');
    });

    it('should record agent feedback', async () => {
      await performanceTracker.recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      await performanceTracker.recordAgentFeedback('agent-1', TaskType.ANALYZE, 5, true);

      const records = await queryExecutions({ agentId: 'agent-1' });
      expect(records[0].rating).toBe(5);
      expect(records[0].reused).toBe(true);
    });

    it('should respect privacy settings (disabled)', async () => {
      await updatePrivacySettings({ enabled: false });
      await new PerformanceTracker(); // Reload settings

      const recordId = await performanceTracker.recordAgentExecution(
        'agent-1',
        TaskType.ANALYZE,
        {
          outcome: TaskOutcome.SUCCESS,
          duration: 1000,
          resources: { cpu: 0.5, memory: 1024000 },
          conversationId: 'conv-1',
        }
      );

      expect(recordId).toBe('');

      const records = await queryExecutions({ agentId: 'agent-1' });
      expect(records).toHaveLength(0);
    });

    it('should calculate agent statistics', async () => {
      // Record multiple executions
      await performanceTracker.recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      await performanceTracker.recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 2000,
        resources: { cpu: 0.6, memory: 1024000 },
        conversationId: 'conv-2',
      });

      await performanceTracker.recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.FAILURE,
        duration: 500,
        resources: { cpu: 0.3, memory: 512000 },
        conversationId: 'conv-3',
      });

      const stats = await performanceTracker.getAgentPerformance('agent-1');

      expect(stats).toBeTruthy();
      expect(stats!.totalExecutions).toBe(3);
      expect(stats!.successRate).toBe(2 / 3);
      expect(stats!.averageDuration).toBeCloseTo((1000 + 2000 + 500) / 3);
    });

    it('should return null for agent with no data', async () => {
      const stats = await performanceTracker.getAgentPerformance('nonexistent-agent');
      expect(stats).toBeNull();
    });
  });

  // ========================================================================
  // RANKING TESTS
  // ========================================================================

  describe('Agent Ranking', () => {
    beforeEach(async () => {
      // Create test data for ranking
      // Agent 1: High success rate, slow speed
      for (let i = 0; i < 10; i++) {
        await performanceTracker.recordAgentExecution('agent-fast', TaskType.ANALYZE, {
          outcome: i < 8 ? TaskOutcome.SUCCESS : TaskOutcome.FAILURE,
          duration: 500,
          resources: { cpu: 0.5, memory: 1024000 },
          conversationId: `conv-${i}`,
        });
      }

      // Agent 2: Medium success rate, medium speed
      for (let i = 0; i < 10; i++) {
        await performanceTracker.recordAgentExecution('agent-medium', TaskType.ANALYZE, {
          outcome: i < 7 ? TaskOutcome.SUCCESS : TaskOutcome.FAILURE,
          duration: 1500,
          resources: { cpu: 0.5, memory: 1024000 },
          conversationId: `conv-${i + 10}`,
        });
      }

      // Agent 3: Low success rate, fast speed
      for (let i = 0; i < 10; i++) {
        await performanceTracker.recordAgentExecution('agent-slow', TaskType.ANALYZE, {
          outcome: i < 5 ? TaskOutcome.SUCCESS : TaskOutcome.FAILURE,
          duration: 5000,
          resources: { cpu: 0.5, memory: 1024000 },
          conversationId: `conv-${i + 20}`,
        });
      }
    });

    it('should rank agents by performance', async () => {
      const rankings = await performanceTracker.getTopAgentsForTask(TaskType.ANALYZE);

      expect(rankings.length).toBeGreaterThan(0);
      expect(rankings[0].rank).toBe(1);
      expect(rankings[0].score).toBeGreaterThan(rankings[1]?.score || 0);
    });

    it('should respect minimum sample size', async () => {
      const rankings = await performanceTracker.getTopAgentsForTask(TaskType.ANALYZE, {
        minSampleSize: 20,
      });

      // No agents should meet this threshold
      expect(rankings.length).toBe(0);
    });

    it('should limit results', async () => {
      const rankings = await performanceTracker.getTopAgentsForTask(TaskType.ANALYZE, {
        limit: 2,
      });

      expect(rankings.length).toBeLessThanOrEqual(2);
    });

    it('should calculate composite scores', async () => {
      const rankings = await performanceTracker.getTopAgentsForTask(TaskType.ANALYZE);

      rankings.forEach((ranking) => {
        expect(ranking.score).toBeGreaterThanOrEqual(0);
        expect(ranking.score).toBeLessThanOrEqual(1);
        expect(ranking.successRate).toBeGreaterThanOrEqual(0);
        expect(ranking.successRate).toBeLessThanOrEqual(1);
        expect(ranking.speedScore).toBeGreaterThanOrEqual(0);
        expect(ranking.speedScore).toBeLessThanOrEqual(1);
        expect(ranking.satisfactionScore).toBeGreaterThanOrEqual(0);
        expect(ranking.satisfactionScore).toBeLessThanOrEqual(1);
        expect(ranking.confidence).toBeGreaterThanOrEqual(0);
        expect(ranking.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  // ========================================================================
  // PERFORMANCE HISTORY TESTS
  // ========================================================================

  describe('Performance History', () => {
    beforeEach(async () => {
      // Create historical data
      const now = new Date();

      for (let i = 0; i < 7; i++) {
        const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

        for (let j = 0; j < 5; j++) {
          const record = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
          record.timestamp = timestamp.toISOString();
          await recordExecution(record);
        }
      }
    });

    it('should retrieve performance history', async () => {
      const history = await performanceTracker.getPerformanceHistory('agent-1', 'week');

      expect(history).toBeTruthy();
      expect(history!.agentId).toBe('agent-1');
      expect(history!.window).toBe('week');
      expect(history!.history.length).toBeGreaterThan(0);
    });

    it('should calculate history statistics', async () => {
      const history = await performanceTracker.getPerformanceHistory('agent-1', 'week');

      history!.history.forEach((point) => {
        expect(point.successRate).toBeGreaterThanOrEqual(0);
        expect(point.successRate).toBeLessThanOrEqual(1);
        expect(point.averageDuration).toBeGreaterThan(0);
        expect(point.executionCount).toBeGreaterThan(0);
      });
    });

    it('should return null for agent with no history', async () => {
      const history = await performanceTracker.getPerformanceHistory('nonexistent-agent');
      expect(history).toBeNull();
    });
  });

  // ========================================================================
  // PRIVACY TESTS
  // ========================================================================

  describe('Privacy Features', () => {
    it('should get privacy settings', async () => {
      const settings = await performanceTracker.getPrivacySettings();

      expect(settings).toBeTruthy();
      expect(typeof settings.enabled).toBe('boolean');
      expect(typeof settings.logResources).toBe('boolean');
      expect(typeof settings.logErrors).toBe('boolean');
      expect(typeof settings.retentionDays).toBe('number');
    });

    it('should update privacy settings', async () => {
      await performanceTracker.updatePrivacySettings({
        enabled: false,
        retentionDays: 30,
      });

      const settings = await performanceTracker.getPrivacySettings();
      expect(settings.enabled).toBe(false);
      expect(settings.retentionDays).toBe(30);
    });

    it('should apply retention policy', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Old record
      const oldRecord = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
      oldRecord.timestamp = twoDaysAgo.toISOString();
      await recordExecution(oldRecord);

      // New record
      const newRecord = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
      newRecord.timestamp = now.toISOString();
      await recordExecution(newRecord);

      const deletedCount = await performanceTracker.applyRetentionPolicy(1);
      expect(deletedCount).toBe(1);

      const remainingRecords = await queryExecutions();
      expect(remainingRecords).toHaveLength(1);
    });

    it('should not delete when retention is 0 (keep forever)', async () => {
      const oldRecord = createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000);
      oldRecord.timestamp = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      await recordExecution(oldRecord);

      const deletedCount = await performanceTracker.applyRetentionPolicy(0);
      expect(deletedCount).toBe(0);
    });

    it('should clear all data', async () => {
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));
      await recordExecution(createTestExecution('agent-2', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));

      await performanceTracker.clearAllData();

      const records = await queryExecutions();
      expect(records).toHaveLength(0);
    });
  });

  // ========================================================================
  // STORAGE STATS TESTS
  // ========================================================================

  describe('Storage Statistics', () => {
    it('should get storage statistics', async () => {
      await recordExecution(createTestExecution('agent-1', TaskType.ANALYZE, TaskOutcome.SUCCESS, 1000));
      await recordExecution(createTestExecution('agent-2', TaskType.GENERATE, TaskOutcome.SUCCESS, 1000));

      const stats = await performanceTracker.getStorageStats();

      expect(stats.totalRecords).toBe(2);
      expect(stats.estimatedSizeBytes).toBeGreaterThan(0);
      expect(stats.agentsTracked).toBe(2);
      expect(stats.oldestRecord).toBeTruthy();
      expect(stats.newestRecord).toBeTruthy();
    });

    it('should return zero stats for empty database', async () => {
      const stats = await performanceTracker.getStorageStats();

      expect(stats.totalRecords).toBe(0);
      expect(stats.estimatedSizeBytes).toBe(0);
      expect(stats.agentsTracked).toBe(0);
    });
  });

  // ========================================================================
  // UTILITY FUNCTION TESTS
  // ========================================================================

  describe('Utility Functions', () => {
    it('should record execution via utility function', async () => {
      const recordId = await recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      expect(recordId).toBeTruthy();

      const records = await queryExecutions({ agentId: 'agent-1' });
      expect(records).toHaveLength(1);
    });

    it('should record feedback via utility function', async () => {
      await recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      await recordAgentFeedback('agent-1', TaskType.ANALYZE, 5, true);

      const records = await queryExecutions({ agentId: 'agent-1' });
      expect(records[0].rating).toBe(5);
      expect(records[0].reused).toBe(true);
    });

    it('should get agent performance via utility function', async () => {
      await recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      const stats = await getAgentPerformance('agent-1');
      expect(stats).toBeTruthy();
    });

    it('should get top agents via utility function', async () => {
      await recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      const rankings = await getTopAgentsForTask(TaskType.ANALYZE);
      expect(rankings.length).toBeGreaterThan(0);
    });

    it('should get performance history via utility function', async () => {
      await recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      const history = await getPerformanceHistory('agent-1');
      expect(history).toBeTruthy();
    });
  });

  // ========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle missing error type gracefully', async () => {
      await performanceTracker.recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      const stats = await performanceTracker.getAgentPerformance('agent-1');
      expect(stats!.errorDistribution[ErrorType.UNKNOWN]).toBe(0);
    });

    it('should handle zero ratings', async () => {
      await performanceTracker.recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 1000,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      const stats = await performanceTracker.getAgentPerformance('agent-1');
      expect(stats!.averageRating).toBeNull();
    });

    it('should handle empty query results', async () => {
      const records = await queryExecutions({ agentId: 'nonexistent' });
      expect(records).toHaveLength(0);
    });

    it('should handle very long durations', async () => {
      await performanceTracker.recordAgentExecution('agent-1', TaskType.ANALYZE, {
        outcome: TaskOutcome.SUCCESS,
        duration: 999999,
        resources: { cpu: 0.5, memory: 1024000 },
        conversationId: 'conv-1',
      });

      const stats = await performanceTracker.getAgentPerformance('agent-1');
      expect(stats!.averageDuration).toBeGreaterThan(0);
    });
  });
});

// Helper variable for delete tests
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
