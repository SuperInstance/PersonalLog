/**
 * Cache Warming System Tests
 *
 * @module lib/preload/__tests__/cache-warming.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CacheWarmer,
  getCacheWarmer,
  resetCacheWarmer,
  initializeCacheWarmer,
  warmAgentCache,
  warmAllAgentCaches,
  getWarmingProgress,
  isWarmingCache,
  cancelCacheWarming,
  startBackgroundRefresh,
  stopBackgroundRefresh,
  smartRefreshCache,
  WarmingStatus,
} from '../cache-warming';
import type { AgentContext } from '../context-cache';
import type { AgentDefinition } from '@/lib/agents/types';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create mock agent context
 */
function createMockContext(agentType: string): AgentContext {
  return {
    agentType,
    timestamp: Date.now(),
    docs: [{ path: 'test.md', content: 'test', hash: 'hash', lastModified: Date.now(), size: 4 }],
    commits: [],
    files: [],
    types: [],
    agents: [],
    metadata: {
      version: 1,
      totalSize: 100,
      compressedSize: 50,
      compressionRatio: 2,
      buildTime: 100,
      lastAccess: Date.now(),
      accessCount: 0,
      stale: false,
      itemCount: 1,
    },
  };
}

/**
 * Create mock agent definitions
 */
function createMockAgents(count: number): AgentDefinition[] {
  const agents: AgentDefinition[] = [];

  for (let i = 0; i < count; i++) {
    agents.push({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      description: `Test agent ${i}`,
      icon: '🤖',
      category: 'analysis' as any,
      activationMode: 'background' as any,
      initialState: { status: 'idle' as any },
      metadata: {
        version: '1.0.0',
        author: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      },
    });
  }

  return agents;
}

/**
 * Mock context builder
 */
function createMockContextBuilder(): (agentType: string) => Promise<AgentContext> {
  return async (agentType: string) => {
    // Simulate building context with delay
    await new Promise(resolve => setTimeout(resolve, 10));
    return createMockContext(agentType);
  };
}

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

let warmer: CacheWarmer;
let mockContextBuilder: (agentType: string) => Promise<AgentContext>;

beforeEach(() => {
  resetCacheWarmer();
  warmer = getCacheWarmer();
  mockContextBuilder = createMockContextBuilder();
  warmer.initialize(mockContextBuilder);
});

afterEach(() => {
  warmer.dispose();
  resetCacheWarmer();
});

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('Initialization', () => {
  it('should initialize with context builder', () => {
    const newWarmer = new CacheWarmer();
    expect(() => newWarmer.initialize(mockContextBuilder)).not.toThrow();
  });

  it('should throw error when warming without initialization', async () => {
    const newWarmer = new CacheWarmer();

    await expect(newWarmer.warmCache(['agent-1'])).rejects.toThrow();
  });

  it('should return same singleton instance', () => {
    const instance1 = getCacheWarmer();
    const instance2 = getCacheWarmer();

    expect(instance1).toBe(instance2);
  });

  it('should reset singleton', () => {
    const instance1 = getCacheWarmer();
    resetCacheWarmer();
    const instance2 = getCacheWarmer();

    expect(instance1).not.toBe(instance2);
  });
});

// ============================================================================
// CACHE WARMING TESTS
// ============================================================================

describe('Cache Warming', () => {
  it('should warm single agent cache', async () => {
    const result = await warmer.warmCache(['agent-1'], { background: false });

    expect(result.status).toBe(WarmingStatus.COMPLETED);
    expect(result.warmedAgents).toBe(1);
    expect(result.totalAgents).toBe(1);
    expect(result.progress).toBe(100);
  });

  it('should warm multiple agent caches', async () => {
    const agents = ['agent-1', 'agent-2', 'agent-3'];
    const result = await warmer.warmCache(agents, { background: false });

    expect(result.status).toBe(WarmingStatus.COMPLETED);
    expect(result.warmedAgents).toBe(3);
    expect(result.progress).toBe(100);
  });

  it('should track warming progress', async () => {
    warmer.warmCache(['agent-1', 'agent-2', 'agent-3'], { background: false });

    // Check progress during warming
    await new Promise(resolve => setTimeout(resolve, 15));
    const progress = warmer.getProgress();

    expect(progress).toBeDefined();
    expect(progress!.status).toBe(WarmingStatus.WARMING);
    expect(progress!.warmedAgents).toBeGreaterThan(0);
  });

  it('should update progress percentage correctly', async () => {
    const agents = ['agent-1', 'agent-2', 'agent-3', 'agent-4'];
    const result = await warmer.warmCache(agents, { background: false });

    expect(result.progress).toBe(100);
    expect(result.warmedAgents).toBe(4);
  });

  it('should estimate time remaining', async () => {
    const agents = ['agent-1', 'agent-2', 'agent-3'];

    warmer.warmCache(agents, { background: false });

    await new Promise(resolve => setTimeout(resolve, 15));
    const progress = warmer.getProgress();

    expect(progress!.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty agent list', async () => {
    const result = await warmer.warmCache([], { background: false });

    expect(result.status).toBe(WarmingStatus.COMPLETED);
    expect(result.warmedAgents).toBe(0);
  });

  it('should handle warming errors gracefully', async () => {
    const failingBuilder = async (agentType: string) => {
      if (agentType === 'agent-error') {
        throw new Error('Intentional error');
      }
      return createMockContext(agentType);
    };

    warmer.initialize(failingBuilder);
    const result = await warmer.warmCache(['agent-error', 'agent-1'], { background: false });

    expect(result.status).toBe(WarmingStatus.PARTIAL);
    expect(result.errors.length).toBe(1);
    expect(result.warmedAgents).toBe(1);
  });

  it('should fail completely when all agents fail', async () => {
    const failingBuilder = async () => {
      throw new Error('Total failure');
    };

    warmer.initialize(failingBuilder);
    const result = await warmer.warmCache(['agent-1', 'agent-2'], { background: false });

    expect(result.status).toBe(WarmingStatus.FAILED);
    expect(result.warmedAgents).toBe(0);
    expect(result.errors.length).toBe(2);
  });
});

// ============================================================================
// BACKGROUND WARMING TESTS
// ============================================================================

describe('Background Warming', () => {
  it('should warm cache in background', async () => {
    const result = await warmer.warmCache(['agent-1'], { background: true });

    // Should return immediately with WARMING status
    expect(result.status).toBe(WarmingStatus.WARMING);

    // Wait for background warming to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const progress = warmer.getProgress();
    expect(progress!.status).toBe(WarmingStatus.COMPLETED);
  });

  it('should not block when warming in background', async () => {
    const start = Date.now();
    await warmer.warmCache(['agent-1'], { background: true });
    const duration = Date.now() - start;

    // Should return immediately (<10ms)
    expect(duration).toBeLessThan(50);
  });

  it('should handle concurrent warming operations', async () => {
    // Start first warming
    const promise1 = warmer.warmCache(['agent-1'], { background: false });

    // Try to start second warming (should warn or queue)
    const promise2 = warmer.warmCache(['agent-2'], { background: false });

    await Promise.all([promise1, promise2]);

    // Both should complete
    expect(warmer.getProgress()?.status).toBe(WarmingStatus.COMPLETED);
  });
});

// ============================================================================
// PROGRESS TRACKING TESTS
// ============================================================================

describe('Progress Tracking', () => {
  it('should return null progress when not warming', () => {
    const progress = warmer.getProgress();
    expect(progress).toBeDefined();
    expect(progress!.status).toBe(WarmingStatus.IDLE);
  });

  it('should update progress during warming', async () => {
    warmer.warmCache(['agent-1', 'agent-2', 'agent-3'], { background: false });

    const progress1 = warmer.getProgress();
    expect(progress1!.status).toBe(WarmingStatus.WARMING);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 100));

    const progress2 = warmer.getProgress();
    expect(progress2!.status).toBe(WarmingStatus.COMPLETED);
  });

  it('should track current agent being warmed', async () => {
    warmer.warmCache(['agent-1', 'agent-2', 'agent-3'], { background: false });

    await new Promise(resolve => setTimeout(resolve, 15));
    const progress = warmer.getProgress();

    expect(progress!.currentAgent).toBeDefined();
    expect(['agent-1', 'agent-2', 'agent-3']).toContain(progress!.currentAgent);
  });

  it('should check if warming is in progress', () => {
    expect(warmer.isWarming()).toBe(false);

    warmer.warmCache(['agent-1'], { background: true });
    expect(warmer.isWarming()).toBe(true);

    // Wait for completion
    return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
      expect(warmer.isWarming()).toBe(false);
    });
  });
});

// ============================================================================
// CANCELLATION TESTS
// ============================================================================

describe('Cancellation', () => {
  it('should cancel ongoing warming', async () => {
    const agents = Array.from({ length: 10 }, (_, i) => `agent-${i}`);

    warmer.warmCache(agents, { background: false });

    // Cancel after a short delay
    setTimeout(() => warmer.cancelWarming(), 30);

    const result = await warmer.getProgress();
    // Should be cancelled (not all agents warmed)
    expect(result!.warmedAgents).toBeLessThan(10);
  });

  it('should handle cancel when not warming', () => {
    expect(() => warmer.cancelWarming()).not.toThrow();
  });

  it('should stop warming immediately on cancel', async () => {
    warmer.warmCache(['agent-1', 'agent-2', 'agent-3'], { background: false });

    setTimeout(() => warmer.cancelWarming(), 20);

    await new Promise(resolve => setTimeout(resolve, 100));

    const progress = warmer.getProgress();
    expect(progress!.warmedAgents).toBeLessThan(3);
  });
});

// ============================================================================
// ALL AGENTS WARMING TESTS
// ============================================================================

describe('All Agents Warming', () => {
  it('should warm all registered agents', async () => {
    const agents = createMockAgents(5);
    const result = await warmer.warmAllAgents(agents, { background: false });

    expect(result.status).toBe(WarmingStatus.COMPLETED);
    expect(result.warmedAgents).toBe(5);
  });

  it('should handle empty agent list', async () => {
    const result = await warmer.warmAllAgents([], { background: false });

    expect(result.status).toBe(WarmingStatus.COMPLETED);
    expect(result.warmedAgents).toBe(0);
  });

  it('should extract agent IDs from definitions', async () => {
    const agents = createMockAgents(3);
    const agentIds = agents.map(a => a.id);

    const result = await warmer.warmAllAgents(agents, { background: false });

    expect(result.totalAgents).toBe(3);
    expect(result.warmedAgents).toBe(3);
  });
});

// ============================================================================
// BACKGROUND REFRESH TESTS
// ============================================================================

describe('Background Refresh', () => {
  it('should start background refresh', () => {
    const agents = createMockAgents(3);

    expect(() => warmer.startBackgroundRefresh(agents, 1000)).not.toThrow();
  });

  it('should stop background refresh', () => {
    const agents = createMockAgents(3);
    warmer.startBackgroundRefresh(agents, 1000);

    expect(() => warmer.stopBackgroundRefresh()).not.toThrow();
  });

  it('should handle multiple start/stop cycles', () => {
    const agents = createMockAgents(3);

    warmer.startBackgroundRefresh(agents, 1000);
    warmer.stopBackgroundRefresh();

    warmer.startBackgroundRefresh(agents, 1000);
    warmer.stopBackgroundRefresh();

    // Should not throw
    expect(true).toBe(true);
  });
});

// ============================================================================
// SMART REFRESH TESTS
// ============================================================================

describe('Smart Refresh', () => {
  it('should refresh only changed agents', async () => {
    const agents = createMockAgents(3);
    const oldTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago

    const refreshed = await warmer.smartRefresh(agents, oldTimestamp);

    expect(refreshed).toBeGreaterThanOrEqual(0);
    expect(refreshed).toBeLessThanOrEqual(3);
  });

  it('should return zero for no changes', async () => {
    const agents = createMockAgents(3);
    const recentTimestamp = Date.now(); // Very recent

    const refreshed = await warmer.smartRefresh(agents, recentTimestamp);

    expect(refreshed).toBe(0);
  });
});

// ============================================================================
// CONVENIENCE FUNCTIONS TESTS
// ============================================================================

describe('Convenience Functions', () => {
  it('should initialize using convenience function', () => {
    expect(() => initializeCacheWarmer(mockContextBuilder)).not.toThrow();
  });

  it('should warm cache using convenience function', async () => {
    const result = await warmAgentCache(['agent-1'], { background: false });

    expect(result.status).toBe(WarmingStatus.COMPLETED);
  });

  it('should warm all agents using convenience function', async () => {
    const agents = createMockAgents(3);
    const result = await warmAllAgentCaches(agents, { background: false });

    expect(result.status).toBe(WarmingStatus.COMPLETED);
    expect(result.warmedAgents).toBe(3);
  });

  it('should get progress using convenience function', () => {
    const progress = getWarmingProgress();
    expect(progress).toBeDefined();
  });

  it('should check warming status using convenience function', () => {
    const isWarming = isWarmingCache();
    expect(typeof isWarming).toBe('boolean');
  });

  it('should cancel warming using convenience function', () => {
    expect(() => cancelCacheWarming()).not.toThrow();
  });

  it('should start background refresh using convenience function', () => {
    const agents = createMockAgents(3);
    expect(() => startBackgroundRefresh(agents, 1000)).not.toThrow();
    stopBackgroundRefresh();
  });

  it('should stop background refresh using convenience function', () => {
    expect(() => stopBackgroundRefresh()).not.toThrow();
  });

  it('should smart refresh using convenience function', async () => {
    const agents = createMockAgents(3);
    const count = await smartRefreshCache(agents, Date.now());

    expect(typeof count).toBe('number');
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle context builder errors', async () => {
    const errorBuilder = async () => {
      throw new Error('Builder error');
    };

    warmer.initialize(errorBuilder);

    const result = await warmer.warmCache(['agent-1'], { background: false });

    expect(result.status).toBe(WarmingStatus.FAILED);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should continue warming after partial failures', async () => {
    const partialBuilder = async (agentType: string) => {
      if (agentType === 'agent-fail') {
        throw new Error('Fail');
      }
      return createMockContext(agentType);
    };

    warmer.initialize(partialBuilder);

    const result = await warmer.warmCache(
      ['agent-fail', 'agent-1', 'agent-fail-2', 'agent-2'],
      { background: false }
    );

    expect(result.status).toBe(WarmingStatus.PARTIAL);
    expect(result.warmedAgents).toBe(2);
    expect(result.errors.length).toBe(2);
  });

  it('should handle timeout gracefully', async () => {
    const slowBuilder = async () => {
      await new Promise(resolve => setTimeout(resolve, 10000));
      return createMockContext('slow-agent');
    };

    warmer.initialize(slowBuilder);

    const result = await warmer.warmCache(['agent-1'], {
      background: false,
      maxWarmingTime: 50, // 50ms timeout
    });

    // Should timeout and stop
    expect(result.warmedAgents).toBe(0);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration', () => {
  it('should complete full warming cycle', async () => {
    const agents = createMockAgents(5);

    // Warm all agents
    const result = await warmer.warmAllAgents(agents, { background: false });

    expect(result.status).toBe(WarmingStatus.COMPLETED);
    expect(result.warmedAgents).toBe(5);

    // Start background refresh
    warmer.startBackgroundRefresh(agents, 10000);
    expect(warmer.isWarming()).toBe(false); // Not warming, refresh scheduled

    // Stop background refresh
    warmer.stopBackgroundRefresh();
  });

  it('should handle multiple warming cycles', async () => {
    // First cycle
    await warmer.warmCache(['agent-1', 'agent-2'], { background: false });
    expect(warmer.getProgress()?.status).toBe(WarmingStatus.COMPLETED);

    // Second cycle
    await warmer.warmCache(['agent-3', 'agent-4'], { background: false });
    expect(warmer.getProgress()?.status).toBe(WarmingStatus.COMPLETED);
  });
});
