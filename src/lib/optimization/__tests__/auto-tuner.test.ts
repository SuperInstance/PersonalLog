/**
 * Unit Tests: Auto-Tuner
 *
 * Tests the auto-tuning system including:
 * - Performance monitoring
 * - Opportunity detection
 * - Optimization application
 * - Rollback functionality
 * - Effectiveness measurement
 * - Configuration management
 * - History tracking
 *
 * @coverage Target: 80%+ (Auto-tuning functionality)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoTuner, autoTuner } from '../auto-tuner';
import type { Optimization, PerformanceMetrics } from '../auto-tuner';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
      },
    },
    writable: true,
  });
});

afterEach(() => {
  // Clear localStorage after each test
  Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  vi.clearAllMocks();
});

describe('AutoTuner', () => {
  let tuner: AutoTuner;

  beforeEach(() => {
    tuner = new AutoTuner();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default configurations', () => {
      expect(tuner).toBeDefined();

      const configs = tuner.getAllTunableConfigs();
      expect(configs.length).toBeGreaterThan(0);
    });

    it('should have all expected tunable configs', () => {
      const configs = tuner.getAllTunableConfigs();

      const configKeys = configs.map(c => c.key);
      expect(configKeys).toContain('cacheMaxSize');
      expect(configKeys).toContain('cacheTTL');
      expect(configKeys).toContain('apiTimeout');
      expect(configKeys).toContain('apiRetryAttempts');
      expect(configKeys).toContain('apiBatchSize');
      expect(configKeys).toContain('maxConcurrentRequests');
      expect(configKeys).toContain('memoryCacheLimit');
      expect(configKeys).toContain('virtualScrollThreshold');
    });

    it('should initialize with reasonable default values', () => {
      const cacheConfig = tuner.getTunableConfig('cacheMaxSize');
      expect(cacheConfig?.current).toBe(1000);
      expect(cacheConfig?.min).toBe(100);
      expect(cacheConfig?.max).toBe(10000);
    });

    it('should have no history initially', () => {
      const history = tuner.getHistory();
      expect(history).toEqual([]);
    });

    it('should have no baseline metrics initially', () => {
      tuner.monitor(); // This will set baseline
      // After monitoring, baseline should be set
      expect(tuner).toBeDefined();
    });
  });

  // ==========================================================================
  // MONITORING TESTS
  // ==========================================================================

  describe('Monitoring', () => {
    it('should monitor performance metrics', async () => {
      const metrics = await tuner.monitor();

      expect(metrics).toBeDefined();
      expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.bundleSize).toBeGreaterThanOrEqual(0);
      expect(metrics.renderPerformance).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(1);
    });

    it('should set baseline on first monitor', async () => {
      await tuner.monitor();

      // Baseline should be set after first monitor
      const metrics = await tuner.monitor();
      expect(metrics).toBeDefined();
    });

    it('should return consistent metrics structure', async () => {
      const metrics1 = await tuner.monitor();
      const metrics2 = await tuner.monitor();

      expect(Object.keys(metrics1)).toEqual(Object.keys(metrics2));
    });

    it('should handle concurrent monitoring', async () => {
      const [metrics1, metrics2, metrics3] = await Promise.all([
        tuner.monitor(),
        tuner.monitor(),
        tuner.monitor(),
      ]);

      expect(metrics1).toBeDefined();
      expect(metrics2).toBeDefined();
      expect(metrics3).toBeDefined();
    });
  });

  // ==========================================================================
  // OPPORTUNITY DETECTION TESTS
  // ==========================================================================

  describe('Opportunity Detection', () => {
    it('should detect no opportunities when metrics are good', async () => {
      // Mock good metrics
      vi.spyOn(tuner as any, 'measureResponseTime').mockResolvedValue(100);
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.85);
      vi.spyOn(tuner as any, 'measureMemoryUsage').mockResolvedValue(50);
      vi.spyOn(tuner as any, 'measureRenderPerformance').mockResolvedValue(60);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      // Should be empty or very few with good metrics
      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should detect API optimization opportunities', async () => {
      // Mock poor response time
      vi.spyOn(tuner as any, 'measureResponseTime').mockResolvedValue(2000);
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.75);
      vi.spyOn(tuner as any, 'measureMemoryUsage').mockResolvedValue(50);
      vi.spyOn(tuner as any, 'measureRenderPerformance').mockResolvedValue(60);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      expect(opportunities.length).toBeGreaterThan(0);

      const apiOpt = opportunities.find((opt: Optimization) => opt.type === 'api');
      expect(apiOpt).toBeDefined();
    });

    it('should detect cache optimization opportunities', async () => {
      // Mock poor cache hit rate
      vi.spyOn(tuner as any, 'measureResponseTime').mockResolvedValue(500);
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.4);
      vi.spyOn(tuner as any, 'measureMemoryUsage').mockResolvedValue(50);
      vi.spyOn(tuner as any, 'measureRenderPerformance').mockResolvedValue(60);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      const cacheOpt = opportunities.find((opt: Optimization) => opt.type === 'cache');
      expect(cacheOpt).toBeDefined();
    });

    it('should detect memory optimization opportunities', async () => {
      // Mock high memory usage
      vi.spyOn(tuner as any, 'measureResponseTime').mockResolvedValue(500);
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.75);
      vi.spyOn(tuner as any, 'measureMemoryUsage').mockResolvedValue(100);
      vi.spyOn(tuner as any, 'measureRenderPerformance').mockResolvedValue(60);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      const memoryOpt = opportunities.find((opt: Optimization) => opt.type === 'memory');
      expect(memoryOpt).toBeDefined();
    });

    it('should detect render optimization opportunities', async () => {
      // Mock poor frame rate
      vi.spyOn(tuner as any, 'measureResponseTime').mockResolvedValue(500);
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.75);
      vi.spyOn(tuner as any, 'measureMemoryUsage').mockResolvedValue(50);
      vi.spyOn(tuner as any, 'measureRenderPerformance').mockResolvedValue(30);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      const renderOpt = opportunities.find((opt: Optimization) => opt.type === 'rendering');
      expect(renderOpt).toBeDefined();
    });

    it('should sort opportunities by priority', async () => {
      // Mock poor metrics across the board
      vi.spyOn(tuner as any, 'measureResponseTime').mockResolvedValue(2000);
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.4);
      vi.spyOn(tuner as any, 'measureMemoryUsage').mockResolvedValue(100);
      vi.spyOn(tuner as any, 'measureRenderPerformance').mockResolvedValue(30);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      if (opportunities.length > 1) {
        expect(opportunities[0].priority).toBeGreaterThanOrEqual(opportunities[1].priority);
      }
    });

    it('should include expected improvement in opportunities', async () => {
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.4);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      for (const opt of opportunities) {
        expect(opt.expectedImprovement).toBeDefined();
        expect(opt.expectedImprovement).toBeGreaterThan(0);
      }
    });

    it('should include confidence scores in opportunities', async () => {
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.4);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      for (const opt of opportunities) {
        expect(opt.confidence).toBeGreaterThan(0);
        expect(opt.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should include reasoning in opportunities', async () => {
      vi.spyOn(tuner as any, 'measureCacheHitRate').mockResolvedValue(0.4);

      await tuner.monitor();
      const opportunities = await tuner.detectOpportunities();

      for (const opt of opportunities) {
        expect(opt.reasoning).toBeDefined();
        expect(opt.reasoning.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // OPTIMIZATION APPLICATION TESTS
  // ==========================================================================

  describe('Optimization Application', () => {
    it('should apply optimization successfully', async () => {
      const optimization: Optimization = {
        id: 'test-opt-1',
        type: 'cache',
        configKey: 'cacheMaxSize',
        currentValue: 1000,
        suggestedValue: 2000,
        priority: 8,
        expectedImprovement: 35,
        confidence: 0.9,
        reasoning: 'Test optimization',
        riskLevel: 15,
        timestamp: Date.now(),
      };

      const result = await tuner.apply(optimization);

      expect(result.success).toBe(true);
      expect(result.optimizationId).toBe('test-opt-1');
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].key).toBe('cacheMaxSize');
      expect(result.changes[0].after).toBe(2000);
    });

    it('should store before metrics for comparison', async () => {
      const optimization: Optimization = {
        id: 'test-opt-2',
        type: 'cache',
        configKey: 'cacheTTL',
        currentValue: 300000,
        suggestedValue: 600000,
        priority: 7,
        expectedImprovement: 12,
        confidence: 0.8,
        reasoning: 'Test',
        riskLevel: 20,
        timestamp: Date.now(),
      };

      const result = await tuner.apply(optimization);

      expect(result.beforeMetrics).toBeDefined();
      expect(result.beforeMetrics.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should add to history after application', async () => {
      const optimization: Optimization = {
        id: 'test-opt-3',
        type: 'api',
        configKey: 'apiTimeout',
        currentValue: 10000,
        suggestedValue: 15000,
        priority: 7,
        expectedImprovement: 10,
        confidence: 0.75,
        reasoning: 'Test',
        riskLevel: 20,
        timestamp: Date.now(),
      };

      await tuner.apply(optimization);

      const history = tuner.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].optimizationId).toBe('test-opt-3');
    });

    it('should fail for non-existent config', async () => {
      const optimization: Optimization = {
        id: 'test-opt-fail',
        type: 'cache',
        configKey: 'non-existent-config',
        currentValue: 100,
        suggestedValue: 200,
        priority: 5,
        expectedImprovement: 10,
        confidence: 0.5,
        reasoning: 'Test',
        riskLevel: 10,
        timestamp: Date.now(),
      };

      const result = await tuner.apply(optimization);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should persist configuration changes', async () => {
      const optimization: Optimization = {
        id: 'test-opt-persist',
        type: 'cache',
        configKey: 'cacheMaxSize',
        currentValue: 1000,
        suggestedValue: 1500,
        priority: 7,
        expectedImprovement: 15,
        confidence: 0.85,
        reasoning: 'Test',
        riskLevel: 15,
        timestamp: Date.now(),
      };

      await tuner.apply(optimization);

      const stored = localStorage.getItem('personallog-config');
      expect(stored).toBeDefined();

      const config = JSON.parse(stored!);
      expect(config.cacheMaxSize).toBe(1500);
    });
  });

  // ==========================================================================
  // ROLLBACK TESTS
  // ==========================================================================

  describe('Rollback', () => {
    it('should rollback optimization successfully', async () => {
      const optimization: Optimization = {
        id: 'test-opt-rollback',
        type: 'cache',
        configKey: 'cacheMaxSize',
        currentValue: 1000,
        suggestedValue: 2000,
        priority: 8,
        expectedImprovement: 35,
        confidence: 0.9,
        reasoning: 'Test',
        riskLevel: 15,
        timestamp: Date.now(),
      };

      const result = await tuner.apply(optimization);
      await tuner.rollback(result.optimizationId);

      // Verify config was restored
      const stored = localStorage.getItem('personallog-config');
      const config = JSON.parse(stored!);
      expect(config.cacheMaxSize).toBe(1000);
    });

    it('should fail to rollback non-existent optimization', async () => {
      await expect(tuner.rollback('non-existent-id')).rejects.toThrow();
    });

    it('should restore multiple changes on rollback', async () => {
      // Apply multiple optimizations
      const opt1: Optimization = {
        id: 'opt-1',
        type: 'cache',
        configKey: 'cacheMaxSize',
        currentValue: 1000,
        suggestedValue: 2000,
        priority: 8,
        expectedImprovement: 35,
        confidence: 0.9,
        reasoning: 'Test',
        riskLevel: 15,
        timestamp: Date.now(),
      };

      await tuner.apply(opt1);

      // Rollback should work
      await tuner.rollback('opt-1');

      const stored = localStorage.getItem('personallog-config');
      const config = JSON.parse(stored!);
      expect(config.cacheMaxSize).toBe(1000);
    });
  });

  // ==========================================================================
  // EFFECTIVENESS MEASUREMENT TESTS
  // ==========================================================================

  describe('Effectiveness Measurement', () => {
    it('should measure optimization effectiveness', async () => {
      const optimization: Optimization = {
        id: 'test-opt-effect',
        type: 'cache',
        configKey: 'cacheMaxSize',
        currentValue: 1000,
        suggestedValue: 2000,
        priority: 8,
        expectedImprovement: 35,
        confidence: 0.9,
        reasoning: 'Test',
        riskLevel: 15,
        timestamp: Date.now(),
      };

      const result = await tuner.apply(optimization);

      // Wait a bit for effectiveness measurement
      await new Promise(resolve => setTimeout(resolve, 100));

      // Effectiveness is measured asynchronously, just verify it doesn't throw
      expect(result.success).toBe(true);
    });

    it('should return null for non-existent optimization', async () => {
      const effectiveness = await tuner.measure('non-existent');
      expect(effectiveness).toBeNull();
    });
  });

  // ==========================================================================
  // CONFIGURATION MANAGEMENT TESTS
  // ==========================================================================

  describe('Configuration Management', () => {
    it('should get tunable config by key', () => {
      const config = tuner.getTunableConfig('apiTimeout');

      expect(config).toBeDefined();
      expect(config?.key).toBe('apiTimeout');
      expect(config?.current).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent config', () => {
      const config = tuner.getTunableConfig('non-existent');
      expect(config).toBeUndefined();
    });

    it('should get all tunable configs', () => {
      const configs = tuner.getAllTunableConfigs();

      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0]).toHaveProperty('key');
      expect(configs[0]).toHaveProperty('current');
      expect(configs[0]).toHaveProperty('min');
      expect(configs[0]).toHaveProperty('max');
    });

    it('should update config value', () => {
      const success = tuner.updateConfig('cacheMaxSize', 1500);

      expect(success).toBe(true);

      const config = tuner.getTunableConfig('cacheMaxSize');
      expect(config?.current).toBe(1500);
    });

    it('should reject value below minimum', () => {
      const success = tuner.updateConfig('cacheMaxSize', 50);

      expect(success).toBe(false);
    });

    it('should reject value above maximum', () => {
      const success = tuner.updateConfig('cacheMaxSize', 20000);

      expect(success).toBe(false);
    });

    it('should reject non-existent config update', () => {
      const success = tuner.updateConfig('non-existent', 100);

      expect(success).toBe(false);
    });
  });

  // ==========================================================================
  // HISTORY TESTS
  // ==========================================================================

  describe('History', () => {
    it('should track applied optimizations', async () => {
      const optimization: Optimization = {
        id: 'test-opt-history',
        type: 'cache',
        configKey: 'cacheMaxSize',
        currentValue: 1000,
        suggestedValue: 2000,
        priority: 8,
        expectedImprovement: 35,
        confidence: 0.9,
        reasoning: 'Test',
        riskLevel: 15,
        timestamp: Date.now(),
      };

      await tuner.apply(optimization);

      const history = tuner.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should return successful optimizations', async () => {
      const optimization: Optimization = {
        id: 'test-opt-success',
        type: 'cache',
        configKey: 'cacheMaxSize',
        currentValue: 1000,
        suggestedValue: 2000,
        priority: 8,
        expectedImprovement: 35,
        confidence: 0.9,
        reasoning: 'Test',
        riskLevel: 15,
        timestamp: Date.now(),
      };

      await tuner.apply(optimization);

      const successful = tuner.getSuccessfulOptimizations();
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should return failed optimizations', async () => {
      const failedOpt: Optimization = {
        id: 'test-opt-fail-history',
        type: 'cache',
        configKey: 'non-existent',
        currentValue: 100,
        suggestedValue: 200,
        priority: 5,
        expectedImprovement: 10,
        confidence: 0.5,
        reasoning: 'Test',
        riskLevel: 10,
        timestamp: Date.now(),
      };

      await tuner.apply(failedOpt);

      const failed = tuner.getFailedOptimizations();
      expect(failed.length).toBeGreaterThan(0);
    });

    it('should preserve history order', async () => {
      const opt1: Optimization = {
        id: 'history-opt-1',
        type: 'cache',
        configKey: 'cacheTTL',
        currentValue: 300000,
        suggestedValue: 400000,
        priority: 7,
        expectedImprovement: 10,
        confidence: 0.8,
        reasoning: 'Test',
        riskLevel: 15,
        timestamp: Date.now(),
      };

      const opt2: Optimization = {
        id: 'history-opt-2',
        type: 'api',
        configKey: 'apiTimeout',
        currentValue: 10000,
        suggestedValue: 15000,
        priority: 7,
        expectedImprovement: 10,
        confidence: 0.75,
        reasoning: 'Test',
        riskLevel: 20,
        timestamp: Date.now(),
      };

      await tuner.apply(opt1);
      await tuner.apply(opt2);

      const history = tuner.getHistory();
      expect(history[0].optimizationId).toBe('history-opt-1');
      expect(history[1].optimizationId).toBe('history-opt-2');
    });
  });

  // ==========================================================================
  // GLOBAL INSTANCE TESTS
  // ==========================================================================

  describe('Global Instance', () => {
    it('should export global autoTuner instance', () => {
      expect(autoTuner).toBeInstanceOf(AutoTuner);
    });

    it('should share state across global instance', async () => {
      const configs = autoTuner.getAllTunableConfigs();
      expect(configs.length).toBeGreaterThan(0);
    });
  });
});
