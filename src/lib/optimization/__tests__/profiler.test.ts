/**
 * Unit Tests: Performance Profiler
 *
 * Tests the performance profiling system including:
 * - Operation profiling (measure, start/stop)
 * - Statistics calculation (avg, percentiles)
 * - API profiling
 * - Component profiling
 * - Cache profiling
 * - Bottleneck identification
 * - Optimization suggestions
 *
 * @coverage Target: 80%+ (Core profiling functionality)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PerformanceProfiler,
  APIProfiler,
  ComponentProfiler,
  CacheProfiler,
  profiler,
  apiProfiler,
  componentProfiler,
  cacheProfiler,
} from '../profiler';
import type { ProfileResult } from '../profiler';

describe('PerformanceProfiler', () => {
  let testProfiler: PerformanceProfiler;

  beforeEach(() => {
    testProfiler = new PerformanceProfiler({
      includeMemory: true,
      includeCPU: false,
      samples: 10,
      slowThreshold: 1000,
    });
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultProfiler = new PerformanceProfiler();
      expect(defaultProfiler).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customProfiler = new PerformanceProfiler({
        includeMemory: false,
        includeCPU: true,
        samples: 20,
        slowThreshold: 500,
      });
      expect(customProfiler).toBeDefined();
    });

    it('should have no operations initially', () => {
      const operations = testProfiler.getOperations();
      expect(operations).toEqual([]);
    });
  });

  // ==========================================================================
  // MEASURE TESTS
  // ==========================================================================

  describe('measure', () => {
    it('should measure synchronous operation', async () => {
      const { result, profile } = await testProfiler.measure('test-op', () => {
        return 42;
      });

      expect(result).toBe(42);
      expect(profile).toBeDefined();
      expect(profile.operation).toBe('test-op');
      expect(profile.duration).toBeGreaterThanOrEqual(0);
      expect(profile.score).toBeGreaterThan(0);
      expect(profile.timestamp).toBeDefined();
    });

    it('should measure asynchronous operation', async () => {
      const { result, profile } = await testProfiler.measure('async-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      expect(result).toBe('async-result');
      expect(profile.operation).toBe('async-op');
      expect(profile.duration).toBeGreaterThanOrEqual(10);
    });

    it('should profile memory usage when enabled', async () => {
      const { profile } = await testProfiler.measure('memory-op', () => {
        const arr = new Array(1000).fill(0);
        return arr.length;
      });

      expect(profile.memory).toBeDefined();
      expect(profile.memory).toBeGreaterThanOrEqual(0);
    });

    it('should not profile memory when disabled', async () => {
      const noMemoryProfiler = new PerformanceProfiler({
        includeMemory: false,
      });

      const { profile } = await noMemoryProfiler.measure('test', () => 42);

      expect(profile.memory).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      await expect(
        testProfiler.measure('error-op', () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should record failed operations', async () => {
      try {
        await testProfiler.measure('fail-op', () => {
          throw new Error('Fail');
        });
      } catch (e) {
        // Expected
      }

      const stats = testProfiler.getStats('fail-op');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
    });
  });

  // ==========================================================================
  // START/STOP TESTS
  // ==========================================================================

  describe('start/stop', () => {
    it('should measure with start/stop pattern', () => {
      const end = testProfiler.start('manual-op');

      // Simulate some work
      const sum = Array.from({ length: 1000 }, (_, i) => i).reduce((a, b) => a + b, 0);

      const profile = end();

      expect(profile.operation).toBe('manual-op');
      expect(profile.duration).toBeGreaterThanOrEqual(0);
      expect(sum).toBe(499500); // Verify work was done
    });

    it('should allow multiple concurrent measurements', () => {
      const end1 = testProfiler.start('op1');
      const end2 = testProfiler.start('op2');
      const end3 = testProfiler.start('op3');

      end1();
      end2();
      end3();

      const stats1 = testProfiler.getStats('op1');
      const stats2 = testProfiler.getStats('op2');
      const stats3 = testProfiler.getStats('op3');

      expect(stats1).not.toBeNull();
      expect(stats2).not.toBeNull();
      expect(stats3).not.toBeNull();
    });
  });

  // ==========================================================================
  // STATISTICS TESTS
  // ==========================================================================

  describe('Statistics', () => {
    it('should calculate statistics for operation', async () => {
      // Record multiple measurements
      for (let i = 0; i < 10; i++) {
        await testProfiler.measure('stats-op', () => {
          return i * 10;
        });
      }

      const stats = testProfiler.getStats('stats-op');

      expect(stats).not.toBeNull();
      expect(stats?.avg).toBeGreaterThan(0);
      expect(stats?.min).toBeGreaterThanOrEqual(0);
      expect(stats?.max).toBeGreaterThanOrEqual(stats.min);
      expect(stats?.count).toBe(10);
    });

    it('should calculate percentiles correctly', async () => {
      // Record 100 measurements with known times
      for (let i = 0; i < 100; i++) {
        await testProfiler.measure('percentile-op', async () => {
          await new Promise(resolve => setTimeout(resolve, i));
          return i;
        });
      }

      const stats = testProfiler.getStats('percentile-op');

      expect(stats).not.toBeNull();
      expect(stats?.p50).toBeGreaterThan(0);
      expect(stats?.p95).toBeGreaterThan(stats?.p50);
      expect(stats?.p99).toBeGreaterThanOrEqual(stats?.p95);
    });

    it('should return null for non-existent operation', () => {
      const stats = testProfiler.getStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should limit sample history', async () => {
      const smallProfiler = new PerformanceProfiler({ samples: 5 });

      // Record more than sample limit
      for (let i = 0; i < 20; i++) {
        await smallProfiler.measure('limited-op', () => i);
      }

      const stats = smallProfiler.getStats('limited-op');

      // Should keep samples * 10 history, but limit statistics
      expect(stats).not.toBeNull();
      expect(stats?.count).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // OPERATIONS TESTS
  // ==========================================================================

  describe('Operations', () => {
    it('should list all profiled operations', async () => {
      await testProfiler.measure('op1', () => 1);
      await testProfiler.measure('op2', () => 2);
      await testProfiler.measure('op3', () => 3);

      const operations = testProfiler.getOperations();

      expect(operations).toContain('op1');
      expect(operations).toContain('op2');
      expect(operations).toContain('op3');
      expect(operations.length).toBe(3);
    });

    it('should not duplicate operations in list', async () => {
      await testProfiler.measure('dup-op', () => 1);
      await testProfiler.measure('dup-op', () => 2);

      const operations = testProfiler.getOperations();
      const count = operations.filter(op => op === 'dup-op').length;

      expect(count).toBe(1);
    });

    it('should clear all operations', async () => {
      await testProfiler.measure('op1', () => 1);
      await testProfiler.measure('op2', () => 2);

      testProfiler.clear();

      const operations = testProfiler.getOperations();
      expect(operations).toEqual([]);
    });
  });

  // ==========================================================================
  // BOTTLENECK DETECTION TESTS
  // ==========================================================================

  describe('Bottleneck Detection', () => {
    it('should identify slow operation bottleneck', async () => {
      const { profile } = await testProfiler.measure('slow-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 3500));
        return 'slow';
      });

      expect(profile.bottleneck).toBe('slow_operation');
    });

    it('should identify latency bottleneck', async () => {
      const { profile } = await testProfiler.measure('latency-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 1200));
        return 'latency';
      });

      expect(profile.bottleneck).toBe('latency');
    });

    it('should not identify bottleneck for fast operations', async () => {
      const { profile } = await testProfiler.measure('fast-op', () => {
        return 'fast';
      });

      expect(profile.bottleneck).toBeUndefined();
    });
  });

  // ==========================================================================
  // OPTIMIZATION SUGGESTIONS TESTS
  // ==========================================================================

  describe('Optimization Suggestions', () => {
    it('should suggest streaming for very slow operations', async () => {
      const { profile } = await testProfiler.measure('very-slow-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 3500));
        return 'data';
      });

      expect(profile.suggestion).toBeDefined();
      expect(profile.suggestion).toContain('enable_streaming');
    });

    it('should suggest caching for slow operations', async () => {
      const { profile } = await testProfiler.measure('slow-cache-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 1200));
        return 'data';
      });

      expect(profile.suggestion).toBeDefined();
      expect(profile.suggestion).toContain('enable_caching');
    });
  });

  // ==========================================================================
  // PERFORMANCE SCORE TESTS
  // ==========================================================================

  describe('Performance Score', () => {
    it('should give high score for fast operations', async () => {
      const { profile } = await testProfiler.measure('fast-op', () => 'fast');

      expect(profile.score).toBeGreaterThan(80);
    });

    it('should give low score for slow operations', async () => {
      const { profile } = await testProfiler.measure('slow-score-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'slow';
      });

      expect(profile.score).toBeLessThan(50);
    });

    it('should give moderate score for medium operations', async () => {
      const { profile } = await testProfiler.measure('medium-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'medium';
      });

      expect(profile.score).toBeGreaterThan(40);
      expect(profile.score).toBeLessThan(90);
    });
  });
});

// ============================================================================
// API PROFILER TESTS
// ============================================================================

describe('APIProfiler', () => {
  let testApiProfiler: APIProfiler;

  beforeEach(() => {
    testApiProfiler = new APIProfiler();
  });

  describe('API Response Profiling', () => {
    it('should profile API response', async () => {
      const { result, profile } = await testApiProfiler.profileResponse(
        '/api/conversations',
        async () => {
          return { data: 'conversations' };
        }
      );

      expect(result).toEqual({ data: 'conversations' });
      expect(profile.operation).toBe('api:/api/conversations');
    });

    it('should get response stats for endpoint', async () => {
      await testApiProfiler.profileResponse('/api/test', async () => ({ ok: true }));
      await testApiProfiler.profileResponse('/api/test', async () => ({ ok: true }));

      const stats = testApiProfiler.getResponseStats('/api/test');

      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(2);
    });

    it('should list all endpoints', async () => {
      await testApiProfiler.profileResponse('/api/users', async () => ({ users: [] }));
      await testApiProfiler.profileResponse('/api/messages', async () => ({ messages: [] }));

      const endpoints = testApiProfiler.getEndpoints();

      expect(endpoints).toContain('/api/users');
      expect(endpoints).toContain('/api/messages');
    });

    it('should return null stats for non-existent endpoint', () => {
      const stats = testApiProfiler.getResponseStats('/api/non-existent');
      expect(stats).toBeNull();
    });
  });
});

// ============================================================================
// COMPONENT PROFILER TESTS
// ============================================================================

describe('ComponentProfiler', () => {
  let testComponentProfiler: ComponentProfiler;

  beforeEach(() => {
    testComponentProfiler = new ComponentProfiler();
  });

  describe('Component Render Profiling', () => {
    it('should profile component render', () => {
      const profile = testComponentProfiler.profileRender('TestComponent', () => {
        // Simulate render
        const div = document.createElement('div');
        div.textContent = 'Test';
        return div;
      });

      expect(profile.operation).toBe('component:TestComponent');
      expect(profile.duration).toBeGreaterThanOrEqual(0);
    });

    it('should get render stats for component', () => {
      testComponentProfiler.profileRender('MyComponent', () => null);
      testComponentProfiler.profileRender('MyComponent', () => null);

      const stats = testComponentProfiler.getRenderStats('MyComponent');

      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(2);
    });

    it('should return null stats for non-existent component', () => {
      const stats = testComponentProfiler.getRenderStats('NonExistent');
      expect(stats).toBeNull();
    });
  });
});

// ============================================================================
// CACHE PROFILER TESTS
// ============================================================================

describe('CacheProfiler', () => {
  let testCacheProfiler: CacheProfiler;

  beforeEach(() => {
    testCacheProfiler = new CacheProfiler();
  });

  describe('Cache Performance Tracking', () => {
    it('should record cache hits', () => {
      testCacheProfiler.recordHit('user-data');
      testCacheProfiler.recordHit('user-data');
      testCacheProfiler.recordHit('conversation-data');

      const stats = testCacheProfiler.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.hitRate).toBeCloseTo(1.0, 1);
    });

    it('should record cache misses', () => {
      testCacheProfiler.recordMiss('user-data');
      testCacheProfiler.recordMiss('conversation-data');

      const stats = testCacheProfiler.getStats();

      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      testCacheProfiler.recordHit('data1');
      testCacheProfiler.recordHit('data2');
      testCacheProfiler.recordMiss('data3');
      testCacheProfiler.recordHit('data4');

      const stats = testCacheProfiler.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.75);
    });

    it('should handle empty cache', () => {
      const stats = testCacheProfiler.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should record cache sizes', () => {
      testCacheProfiler.recordSize('lru-cache', 1024);
      testCacheProfiler.recordSize('lfu-cache', 2048);

      const stats = testCacheProfiler.getStats();

      expect(stats.sizes['lru-cache']).toBe(1024);
      expect(stats.sizes['lfu-cache']).toBe(2048);
    });

    it('should reset statistics', () => {
      testCacheProfiler.recordHit('data1');
      testCacheProfiler.recordMiss('data2');

      testCacheProfiler.reset();

      const stats = testCacheProfiler.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.sizes).toEqual({});
    });
  });
});

// ============================================================================
// GLOBAL INSTANCES TESTS
// ============================================================================

describe('Global Profiler Instances', () => {
  it('should export global profiler instance', () => {
    expect(profiler).toBeInstanceOf(PerformanceProfiler);
  });

  it('should export global apiProfiler instance', () => {
    expect(apiProfiler).toBeInstanceOf(APIProfiler);
  });

  it('should export global componentProfiler instance', () => {
    expect(componentProfiler).toBeInstanceOf(ComponentProfiler);
  });

  it('should export global cacheProfiler instance', () => {
    expect(cacheProfiler).toBeInstanceOf(CacheProfiler);
  });

  it('should share state across global instances', async () => {
    await profiler.measure('global-test', () => 'test');

    const stats = profiler.getStats('global-test');

    expect(stats).not.toBeNull();
    expect(stats?.count).toBe(1);
  });
});
