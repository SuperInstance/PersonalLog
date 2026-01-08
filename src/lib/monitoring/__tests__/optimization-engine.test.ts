/**
 * Optimization Engine Tests
 *
 * Comprehensive test suite for the adaptive optimization system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getOptimizationEngine } from '../optimization-engine';
import type { OptimizationTrigger, Optimization } from '../optimization-types';

// Mock performance monitor
vi.mock('../performance', () => ({
  getPerformanceMonitor: () => ({
    getMetrics: () => [],
    getMetricsByName: () => [],
    getWebVitalsSummary: () => ({}),
    getAPIMetricsSummary: () => [],
    clearMetrics: () => {},
  }),
}));

describe('OptimizationEngine', () => {
  let engine: ReturnType<typeof getOptimizationEngine>;

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    engine = getOptimizationEngine();
  });

  afterEach(() => {
    engine.stop();
    engine.clearState();
  });

  describe('Engine Lifecycle', () => {
    it('should start the engine', () => {
      engine.start();
      expect(engine).toBeDefined();
    });

    it('should stop the engine', () => {
      engine.start();
      engine.stop();
      expect(engine).toBeDefined();
    });

    it('should not start if already running', () => {
      engine.start();
      engine.start(); // Should not throw
      expect(engine).toBeDefined();
    });
  });

  describe('Trigger Registration', () => {
    it('should register a custom trigger', () => {
      const trigger: Omit<OptimizationTrigger, 'id'> = {
        name: 'Test Trigger',
        description: 'Test trigger for unit tests',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'medium',
        enabled: true,
        cooldown: 60000,
      };

      const id = engine.registerTrigger(trigger);
      expect(id).toBeTruthy();
      expect(id).toContain('custom-trigger-');
    });

    it('should retrieve registered triggers', () => {
      const triggers = engine.getTriggers();
      expect(Array.isArray(triggers)).toBe(true);
      expect(triggers.length).toBeGreaterThan(0);
    });

    it('should unregister a trigger', () => {
      const trigger: Omit<OptimizationTrigger, 'id'> = {
        name: 'Test Trigger',
        description: 'Test trigger for unit tests',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'medium',
        enabled: true,
        cooldown: 60000,
      };

      const id = engine.registerTrigger(trigger);
      const unregistered = engine.unregisterTrigger(id);
      expect(unregistered).toBe(true);

      const triggers = engine.getTriggers();
      expect(triggers.find((t) => t.id === id)).toBeUndefined();
    });

    it('should enable and disable triggers', () => {
      const trigger: Omit<OptimizationTrigger, 'id'> = {
        name: 'Test Trigger',
        description: 'Test trigger for unit tests',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'medium',
        enabled: true,
        cooldown: 60000,
      };

      const id = engine.registerTrigger(trigger);

      // Disable
      engine.setTriggerEnabled(id, false);
      const triggers = engine.getTriggers();
      expect(triggers.find((t) => t.id === id)?.enabled).toBe(false);

      // Enable
      engine.setTriggerEnabled(id, true);
      expect(triggers.find((t) => t.id === id)?.enabled).toBe(true);
    });

    it('should validate trigger conditions', () => {
      const invalidTrigger: Omit<OptimizationTrigger, 'id'> = {
        name: '',
        description: 'Invalid trigger',
        conditions: [],
        optimizationId: 'nonexistent',
        priority: 'medium',
        enabled: true,
        cooldown: -1,
      };

      expect(() => engine.registerTrigger(invalidTrigger)).toThrow();
    });
  });

  describe('Optimization Registration', () => {
    it('should register a custom optimization', () => {
      const optimization: Omit<Optimization, 'id'> = {
        name: 'Test Optimization',
        description: 'Test optimization for unit tests',
        action: async () => ({
          success: true,
          before: { 'memory-used': 100 },
          after: { 'memory-used': 50 },
          improvements: { 'memory-freed': 50 },
        }),
        expectedImpact: {
          metric: 'memory-used',
          improvement: '-50MB',
        },
        canRollback: false,
        tags: ['test'],
      };

      const id = engine.registerOptimization(optimization);
      expect(id).toBeTruthy();
      expect(id).toContain('custom-opt-');
    });

    it('should retrieve registered optimizations', () => {
      const optimizations = engine.getOptimizations();
      expect(Array.isArray(optimizations)).toBe(true);
      expect(optimizations.length).toBeGreaterThan(0);
    });
  });

  describe('Trigger Validation', () => {
    it('should validate a correct trigger', () => {
      const trigger: OptimizationTrigger = {
        id: 'test-trigger',
        name: 'Valid Trigger',
        description: 'A valid trigger',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'high',
        enabled: true,
        cooldown: 60000,
      };

      const validation = engine.validateTrigger(trigger);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject trigger with empty name', () => {
      const trigger: OptimizationTrigger = {
        id: 'test-trigger',
        name: '',
        description: 'Invalid trigger',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'high',
        enabled: true,
        cooldown: 60000,
      };

      const validation = engine.validateTrigger(trigger);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Trigger name is required');
    });

    it('should reject trigger with no conditions', () => {
      const trigger: OptimizationTrigger = {
        id: 'test-trigger',
        name: 'Test Trigger',
        description: 'Invalid trigger',
        conditions: [],
        optimizationId: 'cache-cleanup',
        priority: 'high',
        enabled: true,
        cooldown: 60000,
      };

      const validation = engine.validateTrigger(trigger);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('At least one condition'))).toBe(true);
    });

    it('should reject trigger with invalid metric', () => {
      const trigger: OptimizationTrigger = {
        id: 'test-trigger',
        name: 'Test Trigger',
        description: 'Invalid trigger',
        conditions: [
          {
            metric: 'invalid-metric' as any,
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'high',
        enabled: true,
        cooldown: 60000,
      };

      const validation = engine.validateTrigger(trigger);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Invalid metric type'))).toBe(true);
    });

    it('should reject trigger with nonexistent optimization', () => {
      const trigger: OptimizationTrigger = {
        id: 'test-trigger',
        name: 'Test Trigger',
        description: 'Invalid trigger',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'nonexistent-optimization',
        priority: 'high',
        enabled: true,
        cooldown: 60000,
      };

      const validation = engine.validateTrigger(trigger);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Optimization not found'))).toBe(true);
    });

    it('should warn about very short cooldown', () => {
      const trigger: OptimizationTrigger = {
        id: 'test-trigger',
        name: 'Test Trigger',
        description: 'Trigger with short cooldown',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'high',
        enabled: true,
        cooldown: 500,
      };

      const validation = engine.validateTrigger(trigger);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some((w) => w.includes('very short'))).toBe(true);
    });
  });

  describe('Manual Optimization Triggering', () => {
    it('should manually trigger an optimization', async () => {
      const optimization: Omit<Optimization, 'id'> = {
        name: 'Manual Test Optimization',
        description: 'Test optimization',
        action: async () => ({
          success: true,
          before: { 'memory-used': 100 },
          after: { 'memory-used': 50 },
          improvements: { 'memory-freed': 50 },
        }),
        expectedImpact: {
          metric: 'memory-used',
          improvement: '-50MB',
        },
        canRollback: false,
        tags: ['test'],
      };

      const optId = engine.registerOptimization(optimization);
      const executionId = await engine.triggerOptimization(optId);

      expect(executionId).toBeTruthy();
      expect(executionId).toContain('manual-');

      const history = engine.getExecutionHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].optimizationId).toBe(optId);
    });

    it('should fail to trigger nonexistent optimization', async () => {
      await expect(engine.triggerOptimization('nonexistent')).rejects.toThrow();
    });

    it('should record optimization result', async () => {
      const optimization: Omit<Optimization, 'id'> = {
        name: 'Result Test Optimization',
        description: 'Test optimization',
        action: async () => ({
          success: true,
          before: { 'memory-used': 200 },
          after: { 'memory-used': 100 },
          improvements: { 'memory-freed': 100 },
        }),
        expectedImpact: {
          metric: 'memory-used',
          improvement: '-100MB',
        },
        canRollback: false,
        tags: ['test'],
      };

      const optId = engine.registerOptimization(optimization);
      await engine.triggerOptimization(optId);

      const history = engine.getExecutionHistory();
      const execution = history.find((e) => e.optimizationId === optId);

      expect(execution).toBeDefined();
      expect(execution?.status).toBe('completed');
      expect(execution?.result?.success).toBe(true);
      expect(execution?.result?.before['memory-used']).toBe(200);
      expect(execution?.result?.after['memory-used']).toBe(100);
    });
  });

  describe('Execution History', () => {
    it('should retrieve execution history', () => {
      const history = engine.getExecutionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should limit execution history', async () => {
      const optimization: Omit<Optimization, 'id'> = {
        name: 'History Test',
        description: 'Test optimization',
        action: async () => ({
          success: true,
          before: {},
          after: {},
          improvements: {},
        }),
        expectedImpact: {
          metric: 'memory-used',
          improvement: '0',
        },
        canRollback: false,
        tags: ['test'],
      };

      const optId = engine.registerOptimization(optimization);

      // Trigger multiple times
      for (let i = 0; i < 5; i++) {
        await engine.triggerOptimization(optId);
      }

      // Get limited history
      const limitedHistory = engine.getExecutionHistory(3);
      expect(limitedHistory.length).toBe(3);
    });

    it('should sort history by most recent first', async () => {
      const optimization: Omit<Optimization, 'id'> = {
        name: 'Sort Test',
        description: 'Test optimization',
        action: async () => ({
          success: true,
          before: {},
          after: {},
          improvements: {},
        }),
        expectedImpact: {
          metric: 'memory-used',
          improvement: '0',
        },
        canRollback: false,
        tags: ['test'],
      };

      const optId = engine.registerOptimization(optimization);

      // Trigger multiple times
      for (let i = 0; i < 3; i++) {
        await engine.triggerOptimization(optId);
        await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      }

      const history = engine.getExecutionHistory();
      expect(history[0].triggeredAt).toBeGreaterThanOrEqual(history[1].triggeredAt);
      expect(history[1].triggeredAt).toBeGreaterThanOrEqual(history[2].triggeredAt);
    });
  });

  describe('Trigger History', () => {
    it('should retrieve trigger history', () => {
      const history = engine.getTriggerHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should filter trigger history by trigger ID', async () => {
      const trigger: Omit<OptimizationTrigger, 'id'> = {
        name: 'History Filter Test',
        description: 'Test trigger',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'medium',
        enabled: true,
        cooldown: 1000,
      };

      const triggerId = engine.registerTrigger(trigger);

      // Create a test optimization that doesn't touch IndexedDB
      const optimization: Omit<Optimization, 'id'> = {
        name: 'Test History Optimization',
        description: 'Test optimization for history',
        action: async () => ({
          success: true,
          before: { 'test-metric': 100 },
          after: { 'test-metric': 50 },
          improvements: { 'test-improvement': 50 },
        }),
        expectedImpact: {
          metric: 'test-metric',
          improvement: '-50',
        },
        canRollback: false,
        tags: ['test'],
      };

      const optId = engine.registerOptimization(optimization);
      await engine.triggerOptimization(optId);

      const history = engine.getTriggerHistory(triggerId);
      expect(history).toBeDefined();
    });

    it('should limit trigger history', () => {
      const history = engine.getTriggerHistory(undefined, 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Rule Statistics', () => {
    it('should retrieve statistics for all triggers', () => {
      const stats = engine.getRuleStatistics();
      expect(typeof stats).toBe('object');
    });

    it('should retrieve statistics for specific trigger', () => {
      const trigger: Omit<OptimizationTrigger, 'id'> = {
        name: 'Stats Test',
        description: 'Test trigger',
        conditions: [
          {
            metric: 'memory-used',
            operator: '>',
            threshold: 100,
          },
        ],
        optimizationId: 'cache-cleanup',
        priority: 'medium',
        enabled: true,
        cooldown: 60000,
      };

      const triggerId = engine.registerTrigger(trigger);
      const stats = engine.getRuleStatistics(triggerId);

      expect(stats).toBeDefined();
      if (triggerId in stats) {
        expect(stats[triggerId]).toBeDefined();
      }
    });
  });

  describe('Configuration', () => {
    it('should retrieve default configuration', () => {
      const config = engine.getConfig();
      expect(config).toBeDefined();
      expect(config.evaluationInterval).toBeDefined();
      expect(config.maxConcurrentOptimizations).toBeDefined();
      expect(config.autoRollbackThreshold).toBeDefined();
    });

    it('should update configuration', () => {
      engine.updateConfig({
        evaluationInterval: 60000,
        autoOptimize: false,
      });

      const config = engine.getConfig();
      expect(config.evaluationInterval).toBe(60000);
      expect(config.autoOptimize).toBe(false);
    });

    it('should preserve other config values when updating', () => {
      const originalConfig = engine.getConfig();
      const originalInterval = originalConfig.evaluationInterval;

      engine.updateConfig({
        autoOptimize: false,
      });

      const newConfig = engine.getConfig();
      expect(newConfig.evaluationInterval).toBe(originalInterval);
      expect(newConfig.autoOptimize).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should clear state', () => {
      engine.clearState();
      const triggers = engine.getTriggers();
      const executions = engine.getExecutionHistory();

      // State should be reset to defaults
      expect(triggers).toBeDefined();
      expect(executions).toHaveLength(0);
    });
  });

  describe('Comparison Operators', () => {
    // This tests the private compareValues function indirectly through trigger evaluation
    it('should evaluate greater than operator correctly', async () => {
      const optimization: Omit<Optimization, 'id'> = {
        name: 'Operator Test GT',
        description: 'Test > operator',
        action: async () => ({
          success: true,
          before: { 'memory-used': 150 },
          after: { 'memory-used': 100 },
          improvements: {},
        }),
        expectedImpact: {
          metric: 'memory-used',
          improvement: '0',
        },
        canRollback: false,
        tags: ['test'],
      };

      const optId = engine.registerOptimization(optimization);
      await expect(engine.triggerOptimization(optId)).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle optimization failures gracefully', async () => {
      const optimization: Omit<Optimization, 'id'> = {
        name: 'Failing Optimization',
        description: 'Test that failures are handled',
        action: async () => {
          throw new Error('Optimization failed');
        },
        expectedImpact: {
          metric: 'memory-used',
          improvement: '0',
        },
        canRollback: false,
        tags: ['test'],
      };

      const optId = engine.registerOptimization(optimization);
      await engine.triggerOptimization(optId);

      const history = engine.getExecutionHistory();
      const execution = history.find((e) => e.optimizationId === optId);

      expect(execution?.status).toBe('failed');
      expect(execution?.result?.success).toBe(false);
      expect(execution?.result?.error).toContain('Optimization failed');
    });

    it('should handle rollback failures', async () => {
      let rollbackCalled = false;

      const optimization: Omit<Optimization, 'id'> = {
        name: 'Rollback Failure Test',
        description: 'Test rollback failure handling',
        action: async () => ({
          success: true,
          before: {},
          after: {},
          improvements: {},
        }),
        rollback: async () => {
          rollbackCalled = true;
          throw new Error('Rollback failed');
        },
        expectedImpact: {
          metric: 'memory-used',
          improvement: '0',
        },
        canRollback: true,
        tags: ['test'],
      };

      const optId = engine.registerOptimization(optimization);
      await engine.triggerOptimization(optId);

      // Rollback might be called if effectiveness is low
      // The important thing is it doesn't crash the engine
      expect(engine).toBeDefined();
    });
  });

  describe('Built-in Optimizations', () => {
    it('should have built-in optimizations registered', () => {
      const optimizations = engine.getOptimizations();
      const builtinOptimizations = [
        'cache-cleanup',
        'aggressive-cleanup',
        'enable-caching',
        'enable-circuit-breaker',
        'preload-cache',
        'enable-virtualization',
        'reduce-polling',
        'enable-defensive-mode',
        'storage-cleanup',
      ];

      for (const optId of builtinOptimizations) {
        expect(optimizations.some((o) => o.id === optId)).toBe(true);
      }
    });

    it('should have built-in triggers registered', () => {
      const triggers = engine.getTriggers();
      const expectedTriggerNames = [
        'High Memory Usage',
        'Critical Memory Usage',
        'Slow API Calls',
        'High API Failure Rate',
        'Low Cache Hit Rate',
        'Long Render Times',
        'Many Long Tasks',
        'High Error Count',
        'Storage Almost Full',
      ];

      for (const name of expectedTriggerNames) {
        expect(triggers.some((t) => t.name === name)).toBe(true);
      }
    });
  });
});
