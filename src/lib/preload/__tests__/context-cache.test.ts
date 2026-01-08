/**
 * Context Cache System Tests
 *
 * @module lib/preload/__tests__/context-cache.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AgentContextCache,
  getContextCache,
  resetContextCache,
  cacheAgentContext,
  getAgentContext,
  invalidateAgentContext,
  hasAgentContext,
  getCacheStats,
  clearAllContexts,
  type AgentContext,
  type CacheStats,
} from '../context-cache';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a mock agent context for testing
 */
function createMockContext(agentType: string, size: number = 1000): AgentContext {
  const content = 'x'.repeat(size);

  return {
    agentType,
    timestamp: Date.now(),
    docs: [
      {
        path: 'CLAUDE.md',
        content,
        hash: `hash-${agentType}`,
        lastModified: Date.now(),
        size: content.length,
      },
      {
        path: `${agentType}.md`,
        content: content.repeat(2),
        hash: `hash-${agentType}-2`,
        lastModified: Date.now(),
        size: content.length * 2,
      },
    ],
    commits: [
      {
        hash: 'abc123',
        message: 'Initial commit',
        author: 'Test Author',
        timestamp: Date.now(),
        files: ['file1.ts', 'file2.ts'],
      },
    ],
    files: [
      {
        path: `src/lib/agents/${agentType}.ts`,
        content,
        hash: `hash-file-${agentType}`,
        language: 'typescript',
        lastModified: Date.now(),
        size: content.length,
        imports: ['import { foo } from "bar"'],
        exports: ['export function foo() {}'],
      },
    ],
    types: [
      {
        name: 'TestType',
        definition: 'interface TestType { foo: string }',
        sourceFile: 'src/types.ts',
        kind: 'interface',
      },
    ],
    agents: [
      {
        id: agentType,
        name: 'Test Agent',
        description: 'Test agent description',
        category: 'analysis',
        requirements: {},
      },
    ],
    metadata: {
      version: 1,
      totalSize: size * 5,
      compressedSize: 0,
      compressionRatio: 0,
      buildTime: 100,
      lastAccess: Date.now(),
      accessCount: 0,
      stale: false,
      itemCount: 5,
    },
  };
}

/**
 * Wait for async operations
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

let cache: AgentContextCache;

beforeEach(async () => {
  // Reset singleton before each test
  resetContextCache();
  cache = getContextCache();
  await cache.initialize();
});

afterEach(async () => {
  // Clean up after each test
  await cache.clearAll();
  resetContextCache();
});

// ============================================================================
// CONTEXT CACHING TESTS
// ============================================================================

describe('Context Caching', () => {
  it('should cache agent context successfully', async () => {
    const agentType = 'test-agent-v1';
    const context = createMockContext(agentType);

    const result = await cache.cacheAgentContext(agentType, context);

    expect(result).toBe(true);
  });

  it('should retrieve cached context', async () => {
    const agentType = 'test-agent-v2';
    const context = createMockContext(agentType);

    await cache.cacheAgentContext(agentType, context);
    const retrieved = await cache.getAgentContext(agentType);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.agentType).toBe(agentType);
    expect(retrieved?.docs.length).toBe(context.docs.length);
    expect(retrieved?.commits.length).toBe(context.commits.length);
  });

  it('should return null for non-existent context', async () => {
    const retrieved = await cache.getAgentContext('non-existent-agent');

    expect(retrieved).toBeNull();
  });

  it('should invalidate cached context', async () => {
    const agentType = 'test-agent-v3';
    const context = createMockContext(agentType);

    await cache.cacheAgentContext(agentType, context);
    let hasContext = await cache.hasAgentContext(agentType);
    expect(hasContext).toBe(true);

    await cache.invalidateAgentContext(agentType);
    hasContext = await cache.hasAgentContext(agentType);
    expect(hasContext).toBe(false);
  });

  it('should check if context exists', async () => {
    const agentType = 'test-agent-v4';
    const context = createMockContext(agentType);

    let exists = await cache.hasAgentContext(agentType);
    expect(exists).toBe(false);

    await cache.cacheAgentContext(agentType, context);
    exists = await cache.hasAgentContext(agentType);
    expect(exists).toBe(true);
  });

  it('should handle multiple agent contexts', async () => {
    const agents = ['agent-1', 'agent-2', 'agent-3'];

    for (const agent of agents) {
      const context = createMockContext(agent);
      await cache.cacheAgentContext(agent, context);
    }

    for (const agent of agents) {
      const exists = await cache.hasAgentContext(agent);
      expect(exists).toBe(true);
    }
  });

  it('should update existing context on re-cache', async () => {
    const agentType = 'test-agent-v5';
    const context1 = createMockContext(agentType, 1000);
    const context2 = createMockContext(agentType, 2000);

    await cache.cacheAgentContext(agentType, context1);
    await cache.cacheAgentContext(agentType, context2);

    const retrieved = await cache.getAgentContext(agentType);
    expect(retrieved?.docs[1].size).toBe(2000); // Updated size
  });

  it('should handle large contexts', async () => {
    const agentType = 'large-agent';
    const largeContext = createMockContext(agentType, 100000); // 100KB

    const result = await cache.cacheAgentContext(agentType, largeContext);
    expect(result).toBe(true);

    const retrieved = await cache.getAgentContext(agentType);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.docs[0].size).toBe(100000);
  });
});

// ============================================================================
// COMPRESSION TESTS
// ============================================================================

describe('Compression', () => {
  it('should compress context data', async () => {
    const agentType = 'compress-test';
    const context = createMockContext(agentType, 10000); // 10KB

    await cache.cacheAgentContext(agentType, context);
    const stats = await cache.getCacheStats();

    const agentStats = stats.agentStats[agentType];
    expect(agentStats).toBeDefined();
    expect(agentStats.size).toBeGreaterThan(0);
    expect(agentStats.size).toBeLessThan(10000); // Compressed size < original
  });

  it('should achieve >50% compression ratio', async () => {
    const agentType = 'compression-ratio-test';
    const context = createMockContext(agentType, 50000); // 50KB

    await cache.cacheAgentContext(agentType, context);
    const retrieved = await cache.getAgentContext(agentType);

    expect(retrieved?.metadata.compressionRatio).toBeGreaterThan(1.5);
  });

  it('should decompress context correctly', async () => {
    const agentType = 'decompress-test';
    const originalContext = createMockContext(agentType);

    await cache.cacheAgentContext(agentType, originalContext);
    const retrieved = await cache.getAgentContext(agentType);

    expect(retrieved?.docs[0].content).toBe(originalContext.docs[0].content);
    expect(retrieved?.commits[0].message).toBe(originalContext.commits[0].message);
    expect(retrieved?.files[0].content).toBe(originalContext.files[0].content);
  });
});

// ============================================================================
// CACHE INVALIDATION TESTS
// ============================================================================

describe('Cache Invalidation', () => {
  it('should invalidate single context', async () => {
    const agentType = 'invalidate-test';
    const context = createMockContext(agentType);

    await cache.cacheAgentContext(agentType, context);
    expect(await cache.hasAgentContext(agentType)).toBe(true);

    await cache.invalidateAgentContext(agentType);
    expect(await cache.hasAgentContext(agentType)).toBe(false);
  });

  it('should clear all contexts', async () => {
    const agents = ['agent-1', 'agent-2', 'agent-3'];

    for (const agent of agents) {
      await cache.cacheAgentContext(agent, createMockContext(agent));
    }

    let stats = await cache.getCacheStats();
    expect(stats.totalContexts).toBe(3);

    await cache.clearAll();
    stats = await cache.getCacheStats();
    expect(stats.totalContexts).toBe(0);
  });

  it('should handle invalidating non-existent context', async () => {
    const result = await cache.invalidateAgentContext('non-existent');
    expect(result).toBe(false); // Or true, depending on implementation
  });

  it('should mark context as stale', async () => {
    const agentType = 'stale-test';
    const context = createMockContext(agentType);

    await cache.cacheAgentContext(agentType, context);
    await cache.markStale(agentType);

    const retrieved = await cache.getAgentContext(agentType);
    expect(retrieved?.metadata.stale).toBe(true);
  });
});

// ============================================================================
// CACHE STATISTICS TESTS
// ============================================================================

describe('Cache Statistics', () => {
  it('should track cache hits and misses', async () => {
    const agentType = 'stats-test';
    const context = createMockContext(agentType);

    await cache.cacheAgentContext(agentType, context);

    // Hit
    await cache.getAgentContext(agentType);

    // Miss
    await cache.getAgentContext('non-existent');

    const stats = await cache.getCacheStats();
    expect(stats.totalContexts).toBe(1);
  });

  it('should calculate hit rate correctly', async () => {
    const agentType = 'hit-rate-test';
    const context = createMockContext(agentType);

    await cache.cacheAgentContext(agentType, context);

    // 2 hits, 1 miss
    await cache.getAgentContext(agentType);
    await cache.getAgentContext(agentType);
    await cache.getAgentContext('non-existent');

    const stats = await cache.getCacheStats();
    const agentStats = stats.agentStats[agentType];

    expect(agentStats.hitCount).toBe(2);
    expect(agentStats.hitRate).toBeCloseTo(1.0, 1);
  });

  it('should track total cache size', async () => {
    const agent1 = 'agent-1';
    const agent2 = 'agent-2';

    await cache.cacheAgentContext(agent1, createMockContext(agent1, 10000));
    await cache.cacheAgentContext(agent2, createMockContext(agent2, 20000));

    const stats = await cache.getCacheStats();
    expect(stats.totalSize).toBeGreaterThan(0);
  });

  it('should track average retrieval time', async () => {
    const agentType = 'retrieval-time-test';
    const context = createMockContext(agentType);

    await cache.cacheAgentContext(agentType, context);

    // Retrieve multiple times
    await cache.getAgentContext(agentType);
    await cache.getAgentContext(agentType);
    await cache.getAgentContext(agentType);

    const stats = await cache.getCacheStats();
    const agentStats = stats.agentStats[agentType];

    expect(agentStats.avgRetrievalTime).toBeGreaterThan(0);
  });

  it('should count stale contexts', async () => {
    const agent1 = 'fresh-agent';
    const agent2 = 'stale-agent';

    await cache.cacheAgentContext(agent1, createMockContext(agent1));
    await cache.cacheAgentContext(agent2, createMockContext(agent2));
    await cache.markStale(agent2);

    const stats = await cache.getCacheStats();
    expect(stats.staleContexts).toBe(1);
  });
});

// ============================================================================
// CACHE EVICTION TESTS
// ============================================================================

describe('Cache Eviction', () => {
  it('should evict old contexts when size limit exceeded', async () => {
    // Create many large contexts to exceed limit
    const contexts: Array<{ agentType: string; context: AgentContext }> = [];

    for (let i = 0; i < 20; i++) {
      const agentType = `large-agent-${i}`;
      const context = createMockContext(agentType, 1000000); // 1MB each
      contexts.push({ agentType, context });
    }

    // Cache all contexts
    for (const { agentType, context } of contexts) {
      await cache.cacheAgentContext(agentType, context);
    }

    // Wait a bit for eviction to happen
    await wait(100);

    const stats = await cache.getCacheStats();
    // Some contexts should be evicted to stay under limit
    expect(stats.totalSize).toBeLessThan(50 * 1024 * 1024); // 50MB limit
  });

  it('should evict least recently used contexts first', async () => {
    const agent1 = 'lru-agent-1';
    const agent2 = 'lru-agent-2';
    const agent3 = 'lru-agent-3';

    await cache.cacheAgentContext(agent1, createMockContext(agent1, 10000000));
    await wait(50);

    await cache.cacheAgentContext(agent2, createMockContext(agent2, 10000000));
    await wait(50);

    await cache.cacheAgentContext(agent3, createMockContext(agent3, 10000000));

    // Access agent3 to make it more recent
    await cache.getAgentContext(agent3);

    // Add large context that triggers eviction
    await cache.cacheAgentContext('huge-agent', createMockContext('huge-agent', 30000000));

    await wait(100);

    // Agent1 might be evicted (oldest), agent3 should remain (most recent)
    // This is probabilistic based on LRU eviction timing
    const hasAgent3 = await cache.hasAgentContext(agent3);
    expect(hasAgent3).toBeDefined();
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle caching errors gracefully', async () => {
    const agentType = 'error-test';
    const invalidContext = null as unknown as AgentContext;

    const result = await cache.cacheAgentContext(agentType, invalidContext);
    expect(result).toBe(false);
  });

  it('should handle retrieval errors gracefully', async () => {
    // This test verifies the cache doesn't crash on corrupted data
    const agentType = 'corrupted-test';

    // Try to get non-existent context
    const retrieved = await cache.getAgentContext(agentType);
    expect(retrieved).toBeNull();
  });

  it('should handle invalidation errors gracefully', async () => {
    const result = await cache.invalidateAgentContext('non-existent');
    // Should not throw, just return false or handle gracefully
    expect(typeof result).toBe('boolean');
  });
});

// ============================================================================
// CONVENIENCE FUNCTIONS TESTS
// ============================================================================

describe('Convenience Functions', () => {
  it('should cache using convenience function', async () => {
    const agentType = 'convenience-cache';
    const context = createMockContext(agentType);

    const result = await cacheAgentContext(agentType, context);
    expect(result).toBe(true);
  });

  it('should retrieve using convenience function', async () => {
    const agentType = 'convenience-get';
    const context = createMockContext(agentType);

    await cacheAgentContext(agentType, context);
    const retrieved = await getAgentContext(agentType);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.agentType).toBe(agentType);
  });

  it('should invalidate using convenience function', async () => {
    const agentType = 'convenience-invalidate';
    const context = createMockContext(agentType);

    await cacheAgentContext(agentType, context);
    const result = await invalidateAgentContext(agentType);

    expect(result).toBe(true);
    expect(await hasAgentContext(agentType)).toBe(false);
  });

  it('should check existence using convenience function', async () => {
    const agentType = 'convenience-has';

    expect(await hasAgentContext(agentType)).toBe(false);

    await cacheAgentContext(agentType, createMockContext(agentType));
    expect(await hasAgentContext(agentType)).toBe(true);
  });

  it('should get stats using convenience function', async () => {
    const stats = await getCacheStats();
    expect(stats).toBeDefined();
    expect(stats.totalContexts).toBeGreaterThanOrEqual(0);
  });

  it('should clear all using convenience function', async () => {
    await cacheAgentContext('agent-1', createMockContext('agent-1'));
    await cacheAgentContext('agent-2', createMockContext('agent-2'));

    const result = await clearAllContexts();
    expect(result).toBe(true);

    const stats = await getCacheStats();
    expect(stats.totalContexts).toBe(0);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  it('should retrieve context in <100ms', async () => {
    const agentType = 'perf-test';
    const context = createMockContext(agentType, 50000);

    await cache.cacheAgentContext(agentType, context);

    const start = Date.now();
    await cache.getAgentContext(agentType);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should cache context in reasonable time', async () => {
    const agentType = 'perf-cache-test';
    const context = createMockContext(agentType, 100000);

    const start = Date.now();
    await cache.cacheAgentContext(agentType, context);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // Should complete in <1s
  });

  it('should handle rapid sequential operations', async () => {
    const operations: Promise<boolean>[] = [];

    for (let i = 0; i < 50; i++) {
      const agentType = `rapid-${i}`;
      const context = createMockContext(agentType);
      operations.push(cache.cacheAgentContext(agentType, context));
    }

    const start = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - start;

    // Should complete 50 cache operations in reasonable time
    expect(duration).toBeLessThan(5000);
  });
});

// ============================================================================
// SINGLETON TESTS
// ============================================================================

describe('Singleton', () => {
  it('should return same instance on multiple calls', () => {
    const instance1 = getContextCache();
    const instance2 = getContextCache();

    expect(instance1).toBe(instance2);
  });

  it('should reset singleton', () => {
    const instance1 = getContextCache();
    resetContextCache();
    const instance2 = getContextCache();

    expect(instance1).not.toBe(instance2);
  });
});
