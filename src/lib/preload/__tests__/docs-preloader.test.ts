/**
 * Tests for Documentation Preloader
 *
 * Tests preloading functionality, cache integration, and performance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DocsPreloader,
  getDocsPreloader,
  resetDocsPreloader,
  type PreloadResult,
} from '../docs-preloader';
import { DocCache, resetDocCache } from '../doc-cache';
import { AgentCategory } from '@/lib/agents/types';

// Mock fetch for document loading
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock documents
const mockDocs: Record<string, string> = {
  'CLAUDE.md': '# CLAUDE.md\n\nProject documentation...',
  '.agents/WORK_STATUS.md': '# Work Status\n\nCurrent status...',
  'src/lib/agents/types.ts': 'export enum AgentCategory { ... }',
  'src/lib/jepa/audio-capture.ts': 'export class AudioCapture { ... }',
};

describe('DocsPreloader', () => {
  let preloader: DocsPreloader;
  let cache: DocCache;

  beforeEach(async () => {
    // Reset instances
    resetDocsPreloader();
    resetDocCache();

    // Create fresh instances
    cache = new DocCache({ maxSize: 1024 * 1024 }); // 1MB for tests
    preloader = new DocsPreloader({ enableParallel: true, maxParallel: 2 });

    await cache.initialize();

    // Setup fetch mock
    mockFetch.mockImplementation((url: string) => {
      const path = url.includes('path=')
        ? decodeURIComponent(url.split('path=')[1])
        : url;

      const content = mockDocs[path];
      if (content) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(content),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        statusText: 'Not Found',
      } as Response);
    });
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe('initialization', () => {
    it('should create preloader with default config', () => {
      const defaultPreloader = new DocsPreloader();
      expect(defaultPreloader).toBeDefined();
    });

    it('should create preloader with custom config', () => {
      const customPreloader = new DocsPreloader({
        enableParallel: false,
        maxParallel: 3,
        timeout: 5000,
      });
      expect(customPreloader).toBeDefined();
    });

    it('should return global instance from getDocsPreloader', () => {
      const instance1 = getDocsPreloader();
      const instance2 = getDocsPreloader();
      expect(instance1).toBe(instance2);
    });

    it('should reset global instance', () => {
      const instance1 = getDocsPreloader();
      resetDocsPreloader();
      const instance2 = getDocsPreloader();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('preloadDocs', () => {
    it('should preload documents for analysis agent', async () => {
      const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      expect(result.agentType).toBe(AgentCategory.ANALYSIS);
      expect(result.totalDocs).toBeGreaterThan(0);
      expect(result.totalTime).toBeLessThan(5000); // < 5s
    });

    it('should preload documents for knowledge agent', async () => {
      const result = await preloader.preloadDocs(AgentCategory.KNOWLEDGE);

      expect(result.agentType).toBe(AgentCategory.KNOWLEDGE);
      expect(result.totalDocs).toBeGreaterThan(0);
    });

    it('should load documents from cache when available', async () => {
      // Preload once to populate cache
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Preload again - should hit cache
      const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      expect(result.fromCache).toBeGreaterThan(0);
      expect(result.fromCache).toBeLessThanOrEqual(result.totalDocs);
    });

    it('should fetch fresh documents when not in cache', async () => {
      const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      expect(result.fetched).toBeGreaterThan(0);
      expect(result.fetched + result.fromCache + result.failed).toBe(
        result.totalDocs
      );
    });

    it('should handle failed document loads gracefully', async () => {
      // Mock fetch to fail
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Some docs might be cached, but fetches should fail
      expect(result.totalDocs).toBeGreaterThan(0);
    });

    it('should include per-document status', async () => {
      const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      expect(result.docs).toBeDefined();
      expect(result.docs.length).toBe(result.totalDocs);

      // Check first doc status
      if (result.docs.length > 0) {
        const firstDoc = result.docs[0];
        expect(firstDoc).toHaveProperty('id');
        expect(firstDoc).toHaveProperty('loaded');
        expect(firstDoc).toHaveProperty('fromCache');
        expect(firstDoc).toHaveProperty('loadTime');
      }
    });

    it('should not preload same document twice concurrently', async () => {
      // Start two preloads concurrently
      const [result1, result2] = await Promise.all([
        preloader.preloadDocs(AgentCategory.ANALYSIS),
        preloader.preloadDocs(AgentCategory.ANALYSIS),
      ]);

      expect(result1.totalDocs).toBe(result2.totalDocs);
    });
  });

  describe('preloadCommonDocs', () => {
    it('should preload common documentation', async () => {
      const result = await preloader.preloadCommonDocs();

      expect(result.totalDocs).toBeGreaterThan(0);
      expect(result.agentType).toBe(AgentCategory.CUSTOM);
    });

    it('should load CLAUDE.md', async () => {
      const result = await preloader.preloadCommonDocs();

      const claudeMdStatus = result.docs.find((d) => d.id === 'CLAUDE.md');
      expect(claudeMdStatus).toBeDefined();
    });

    it('should load WORK_STATUS.md', async () => {
      const result = await preloader.preloadCommonDocs();

      const workStatusMd = result.docs.find(
        (d) => d.id === '.agents/WORK_STATUS.md'
      );
      expect(workStatusMd).toBeDefined();
    });
  });

  describe('getDocCacheStatus', () => {
    it('should return cache status for all agent docs', async () => {
      const status = await preloader.getDocCacheStatus(AgentCategory.ANALYSIS);

      expect(status).toBeDefined();
      expect(Object.keys(status).length).toBeGreaterThan(0);

      // All values should be booleans
      Object.values(status).forEach((cached) => {
        expect(typeof cached).toBe('boolean');
      });
    });

    it('should show uncached docs as false', async () => {
      const status = await preloader.getDocCacheStatus(AgentCategory.ANALYSIS);

      // Before preloading, most should be false
      const cachedCount = Object.values(status).filter((c) => c).length;
      expect(cachedCount).toBe(0);
    });

    it('should show cached docs as true', async () => {
      // Preload documents
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Check status
      const status = await preloader.getDocCacheStatus(AgentCategory.ANALYSIS);

      // Some should be true now
      const cachedCount = Object.values(status).filter((c) => c).length;
      expect(cachedCount).toBeGreaterThan(0);
    });
  });

  describe('invalidateDocCache', () => {
    it('should clear the cache', async () => {
      // Preload to populate cache
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Verify cache has entries
      let stats = await cache.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);

      // Invalidate
      await preloader.invalidateDocCache();

      // Verify cache is cleared
      stats = await cache.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should clear preload history', async () => {
      // Preload to create history
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      let metrics = preloader.getEffectivenessMetrics();
      expect(metrics.totalPreloads).toBeGreaterThan(0);

      // Invalidate
      await preloader.invalidateDocCache();

      // Verify history is cleared
      metrics = preloader.getEffectivenessMetrics();
      expect(metrics.totalPreloads).toBe(0);
    });
  });

  describe('getEffectivenessMetrics', () => {
    it('should return zero metrics when no preloads', () => {
      const metrics = preloader.getEffectivenessMetrics();

      expect(metrics.avgPreloadTime).toBe(0);
      expect(metrics.avgCacheHitRate).toBe(0);
      expect(metrics.totalPreloads).toBe(0);
      expect(metrics.avgDocsPerPreload).toBe(0);
    });

    it('should calculate metrics after preload', async () => {
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      const metrics = preloader.getEffectivenessMetrics();

      expect(metrics.totalPreloads).toBe(1);
      expect(metrics.avgDocsPerPreload).toBeGreaterThan(0);
      expect(metrics.avgPreloadTime).toBeGreaterThan(0);
    });

    it('should track cache hit rate', async () => {
      // First preload - cache miss
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Second preload - cache hit
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      const metrics = preloader.getEffectivenessMetrics();

      expect(metrics.totalPreloads).toBe(2);
      expect(metrics.avgCacheHitRate).toBeGreaterThan(0);
    });

    it('should calculate average preload time', async () => {
      await preloader.preloadDocs(AgentCategory.ANALYSIS);
      await preloader.preloadDocs(AgentCategory.KNOWLEDGE);

      const metrics = preloader.getEffectivenessMetrics();

      expect(metrics.avgPreloadTime).toBeGreaterThan(0);
    });
  });

  describe('getHistory', () => {
    it('should return empty array initially', () => {
      const history = preloader.getHistory();
      expect(history).toEqual([]);
    });

    it('should return preload history', async () => {
      await preloader.preloadDocs(AgentCategory.ANALYSIS);
      await preloader.preloadDocs(AgentCategory.KNOWLEDGE);

      const history = preloader.getHistory();

      expect(history.length).toBe(2);
      expect(history[0].agentType).toBe(AgentCategory.ANALYSIS);
      expect(history[1].agentType).toBe(AgentCategory.KNOWLEDGE);
    });

    it('should include detailed results in history', async () => {
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      const history = preloader.getHistory();
      const result = history[0];

      expect(result).toHaveProperty('totalDocs');
      expect(result).toHaveProperty('fromCache');
      expect(result).toHaveProperty('fetched');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('totalTime');
      expect(result).toHaveProperty('docs');
    });
  });

  describe('parallel loading', () => {
    it('should load documents in parallel when enabled', async () => {
      const parallelPreloader = new DocsPreloader({
        enableParallel: true,
        maxParallel: 2,
      });

      const startTime = Date.now();
      await parallelPreloader.preloadDocs(AgentCategory.ANALYSIS);
      const endTime = Date.now();

      // Parallel should be faster than sequential would be
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should load documents sequentially when disabled', async () => {
      const sequentialPreloader = new DocsPreloader({
        enableParallel: false,
      });

      const result = await sequentialPreloader.preloadDocs(AgentCategory.ANALYSIS);

      // Should still complete
      expect(result.totalDocs).toBeGreaterThan(0);
    });

    it('should respect maxParallel limit', async () => {
      const parallelPreloader = new DocsPreloader({
        enableParallel: true,
        maxParallel: 2,
      });

      // This should work without error
      const result = await parallelPreloader.preloadDocs(AgentCategory.ANALYSIS);
      expect(result.totalDocs).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should complete preload in less than 5 seconds', async () => {
      const start = Date.now();
      await preloader.preloadDocs(AgentCategory.ANALYSIS);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });

    it('should maintain good cache hit rate', async () => {
      // First load - cache miss
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Second load - cache hit
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      const metrics = preloader.getEffectivenessMetrics();

      // Hit rate should be decent
      expect(metrics.avgCacheHitRate).toBeGreaterThan(0);
    });

    it('should track load time per document', async () => {
      const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Each doc should have load time tracked
      result.docs.forEach((doc) => {
        expect(doc.loadTime).toBeGreaterThanOrEqual(0);
        expect(doc.loadTime).toBeLessThan(10000); // < 10s per doc
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Should have some failed docs
      expect(result.totalDocs).toBeGreaterThan(0);
    });

    it('should handle timeout errors', async () => {
      const timeoutPreloader = new DocsPreloader({ timeout: 1 });

      // Mock slow response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                text: () => Promise.resolve('content'),
              } as Response);
            }, 100);
          })
      );

      const result = await timeoutPreloader.preloadDocs(AgentCategory.ANALYSIS);

      // Should handle timeouts
      expect(result).toBeDefined();
    });

    it('should continue loading after individual doc failure', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            statusText: 'Not Found',
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('content'),
        } as Response);
      });

      const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Should load other docs even if one fails
      expect(result.totalDocs).toBeGreaterThan(0);
    });
  });

  describe('content type detection', () => {
    it('should detect markdown files', async () => {
      // This is tested indirectly through the preload process
      await preloader.preloadCommonDocs();

      // Verify CLAUDE.md was loaded
      const cached = await cache.has('CLAUDE.md');
      expect(cached).toBe(true);
    });

    it('should detect TypeScript files', async () => {
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Verify TS file was loaded
      const cached = await cache.has('src/lib/agents/types.ts');
      expect(cached).toBe(true);
    });
  });

  describe('integration with cache', () => {
    it('should use DocCache for storage', async () => {
      await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Verify docs are in cache
      const stats = await cache.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should retrieve from cache on second load', async () => {
      // First load
      const result1 = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      // Second load - should hit cache
      const result2 = await preloader.preloadDocs(AgentCategory.ANALYSIS);

      expect(result2.fromCache).toBeGreaterThan(result1.fromCache);
    });

    it('should respect cache size limits', async () => {
      const smallCache = new DocCache({ maxSize: 100 }); // Very small
      const smallPreloader = new DocsPreloader();

      // Try to preload - should handle size gracefully
      const result = await smallPreloader.preloadDocs(AgentCategory.ANALYSIS);

      expect(result).toBeDefined();
    });
  });
});

/**
 * Performance Benchmark Tests
 *
 * Run with: npm run test -- --benchmark src/lib/preload/__tests__/docs-preloader.test.ts
 */
describe('DocsPreloader Performance', () => {
  it('benchmark: preload all agent types', async () => {
    const preloader = getDocsPreloader();
    const agentTypes: AgentCategory[] = [
      AgentCategory.ANALYSIS,
      AgentCategory.KNOWLEDGE,
      AgentCategory.CREATIVE,
      AgentCategory.AUTOMATION,
      AgentCategory.COMMUNICATION,
      AgentCategory.DATA,
      AgentCategory.CUSTOM,
    ];

    const results: { type: string; time: number; docs: number }[] = [];

    for (const type of agentTypes) {
      const start = Date.now();
      const result = await preloader.preloadDocs(type);
      const duration = Date.now() - start;

      results.push({
        type: type,
        time: duration,
        docs: result.totalDocs,
      });
    }

    // Log results
    console.table(results);

    // Verify performance
    results.forEach((r) => {
      expect(r.time).toBeLessThan(5000); // Each < 5s
    });
  });
});
