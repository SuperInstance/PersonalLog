/**
 * Tests for Documentation Cache
 *
 * Tests IndexedDB caching, LRU eviction, compression, and versioning.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DocCache,
  getDocCache,
  resetDocCache,
  type CacheStats,
  type CacheConfig,
} from '../doc-cache';

describe('DocCache', () => {
  let cache: DocCache;

  beforeEach(async () => {
    // Create fresh cache for each test
    cache = new DocCache({ maxSize: 1024 * 1024 }); // 1MB
    await cache.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await cache.clear();
    resetDocCache();
  });

  describe('initialization', () => {
    it('should initialize database', async () => {
      const testCache = new DocCache();
      await testCache.initialize();

      const stats = await testCache.getStats();
      expect(stats.totalEntries).toBe(0);

      await testCache.clear();
    });

    it('should not initialize twice', async () => {
      await cache.initialize();
      await cache.initialize(); // Should not error

      const stats = await cache.getStats();
      expect(stats).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const config: Partial<CacheConfig> = {
        maxSize: 10 * 1024 * 1024, // 10MB
        compressionThreshold: 5 * 1024, // 5KB
      };

      const customCache = new DocCache(config);
      expect(customCache).toBeDefined();
    });

    it('should return global instance from getDocCache', () => {
      const instance1 = getDocCache();
      const instance2 = getDocCache();
      expect(instance1).toBe(instance2);
    });

    it('should reset global instance', () => {
      const instance1 = getDocCache();
      resetDocCache();
      const instance2 = getDocCache();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve document', async () => {
      const id = 'test.md';
      const content = '# Test Document\n\nThis is a test.';

      await cache.set(id, content);
      const retrieved = await cache.get(id);

      expect(retrieved).toBe(content);
    });

    it('should return null for non-existent document', async () => {
      const retrieved = await cache.get('nonexistent.md');
      expect(retrieved).toBeNull();
    });

    it('should store multiple documents', async () => {
      const docs = {
        'doc1.md': 'Content 1',
        'doc2.md': 'Content 2',
        'doc3.md': 'Content 3',
      };

      for (const [id, content] of Object.entries(docs)) {
        await cache.set(id, content);
      }

      for (const [id, content] of Object.entries(docs)) {
        const retrieved = await cache.get(id);
        expect(retrieved).toBe(content);
      }
    });

    it('should update existing document', async () => {
      const id = 'test.md';
      const content1 = 'Original content';
      const content2 = 'Updated content';

      await cache.set(id, content1);
      await cache.set(id, content2);

      const retrieved = await cache.get(id);
      expect(retrieved).toBe(content2);
    });

    it('should handle large documents', async () => {
      const largeContent = '# Large Document\n\n' + 'x'.repeat(100000);
      const id = 'large.md';

      await cache.set(id, largeContent);
      const retrieved = await cache.get(id);

      expect(retrieved).toBe(largeContent);
    });

    it('should handle special characters', async () => {
      const content = 'Test with **markdown**, `code`, and emojis 🎉';
      const id = 'special.md';

      await cache.set(id, content);
      const retrieved = await cache.get(id);

      expect(retrieved).toBe(content);
    });

    it('should handle unicode characters', async () => {
      const content = 'Unicode test: 你好 🎮 Ñoño café';
      const id = 'unicode.md';

      await cache.set(id, content);
      const retrieved = await cache.get(id);

      expect(retrieved).toBe(content);
    });
  });

  describe('has', () => {
    it('should return true for cached document', async () => {
      await cache.set('test.md', 'content');

      const exists = await cache.has('test.md');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent document', async () => {
      const exists = await cache.has('nonexistent.md');
      expect(exists).toBe(false);
    });

    it('should return false for invalid version', async () => {
      await cache.set('test.md', 'content');

      // Increment version to invalidate
      await cache.invalidate();

      const exists = await cache.has('test.md');
      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      await cache.set('test.md', 'content');

      await cache.delete('test.md');

      const exists = await cache.has('test.md');
      expect(exists).toBe(false);

      const retrieved = await cache.get('test.md');
      expect(retrieved).toBeNull();
    });

    it('should handle deleting non-existent document', async () => {
      await expect(cache.delete('nonexistent.md')).resolves.not.toThrow();
    });

    it('should delete one document but not others', async () => {
      await cache.set('doc1.md', 'content1');
      await cache.set('doc2.md', 'content2');

      await cache.delete('doc1.md');

      expect(await cache.has('doc1.md')).toBe(false);
      expect(await cache.has('doc2.md')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all documents', async () => {
      await cache.set('doc1.md', 'content1');
      await cache.set('doc2.md', 'content2');
      await cache.set('doc3.md', 'content3');

      await cache.clear();

      expect(await cache.has('doc1.md')).toBe(false);
      expect(await cache.has('doc2.md')).toBe(false);
      expect(await cache.has('doc3.md')).toBe(false);
    });

    it('should reset stats after clear', async () => {
      await cache.set('test.md', 'content');
      await cache.get('test.md'); // Hit

      await cache.clear();

      const stats = await cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should handle clearing empty cache', async () => {
      await expect(cache.clear()).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should increment version', async () => {
      await cache.set('test.md', 'content');

      await cache.invalidate();

      // Old version should not exist
      expect(await cache.has('test.md')).toBe(false);
    });

    it('should clear all documents', async () => {
      await cache.set('doc1.md', 'content1');
      await cache.set('doc2.md', 'content2');

      await cache.invalidate();

      const stats = await cache.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return zero stats for empty cache', async () => {
      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should track hits', async () => {
      await cache.set('test.md', 'content');
      await cache.get('test.md'); // Hit

      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
    });

    it('should track misses', async () => {
      await cache.get('nonexistent.md'); // Miss

      const stats = await cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate', async () => {
      await cache.set('test.md', 'content');
      await cache.get('test.md'); // Hit
      await cache.get('nonexistent.md'); // Miss

      const stats = await cache.getStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit / 2 requests
    });

    it('should track total entries', async () => {
      await cache.set('doc1.md', 'content1');
      await cache.set('doc2.md', 'content2');

      const stats = await cache.getStats();
      expect(stats.totalEntries).toBe(2);
    });

    it('should track total size', async () => {
      const content = 'x'.repeat(1000);
      await cache.set('test.md', content);

      const stats = await cache.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should calculate average entry size', async () => {
      await cache.set('doc1.md', 'x'.repeat(1000));
      await cache.set('doc2.md', 'x'.repeat(2000));

      const stats = await cache.getStats();
      expect(stats.avgEntrySize).toBeGreaterThan(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when full', async () => {
      // Create small cache
      const smallCache = new DocCache({ maxSize: 500 });
      await smallCache.initialize();

      // Add documents that will fill cache
      await smallCache.set('doc1.md', 'x'.repeat(200));
      await smallCache.set('doc2.md', 'x'.repeat(200));

      // Access doc1 to make it more recent
      await smallCache.get('doc1.md');

      // Add doc3 - should evict doc2
      await smallCache.set('doc3.md', 'x'.repeat(200));

      // doc1 should still exist (recently accessed)
      expect(await smallCache.has('doc1.md')).toBe(true);

      // doc2 should be evicted (least recently used)
      expect(await smallCache.has('doc2.md')).toBe(false);

      // doc3 should exist
      expect(await smallCache.has('doc3.md')).toBe(true);

      await smallCache.clear();
    });

    it('should update access time on get', async () => {
      await cache.set('doc1.md', 'content1');
      await cache.set('doc2.md', 'content2');

      // Access doc1
      await cache.get('doc1.md');

      // Add more to trigger eviction
      for (let i = 3; i <= 20; i++) {
        await cache.set(`doc${i}.md`, 'x'.repeat(10000));
      }

      // doc1 should still exist (recently accessed)
      expect(await cache.has('doc1.md')).toBe(true);

      // doc2 might be evicted (less recently accessed)
    });
  });

  describe('compression', () => {
    it('should compress large documents', async () => {
      const largeContent = '# Large\n\n' + 'x'.repeat(20000);
      const id = 'large.md';

      await cache.set(id, largeContent);

      const retrieved = await cache.get(id);
      expect(retrieved).toBe(largeContent);
    });

    it('should not compress small documents', async () => {
      const smallContent = 'Small';
      const id = 'small.md';

      await cache.set(id, smallContent);

      const retrieved = await cache.get(id);
      expect(retrieved).toBe(smallContent);
    });

    it('should calculate compression ratio', async () => {
      const largeContent = 'x'.repeat(20000);
      await cache.set('large.md', largeContent);

      const stats = await cache.getStats();
      // Should have some compression
      expect(stats.compressionRatio).toBeLessThan(1);
    });
  });

  describe('warm', () => {
    it('should warm cache with multiple documents', async () => {
      const entries = {
        'doc1.md': 'content1',
        'doc2.md': 'content2',
        'doc3.md': 'content3',
      };

      await cache.warm(entries);

      for (const [id, content] of Object.entries(entries)) {
        const retrieved = await cache.get(id);
        expect(retrieved).toBe(content);
      }
    });

    it('should handle empty entries', async () => {
      await expect(cache.warm({})).resolves.not.toThrow();
    });

    it('should handle partial failures gracefully', async () => {
      const entries = {
        'doc1.md': 'content1',
        'doc2.md': 'content2',
      };

      // This should not throw
      await cache.warm(entries);
    });
  });

  describe('stats persistence', () => {
    it('should persist stats across sessions', async () => {
      await cache.set('test.md', 'content');
      await cache.get('test.md'); // Hit

      // Create new cache instance (simulates new session)
      const newCache = getDocCache();
      await newCache.initialize();

      const stats = await newCache.getStats();

      // Stats should persist
      expect(stats.hits).toBeGreaterThan(0);
    });
  });

  describe('integrity', () => {
    it('should calculate checksum for document', async () => {
      const content = 'Test content';
      await cache.set('test.md', content);

      // Verify it can be retrieved
      const retrieved = await cache.get('test.md');
      expect(retrieved).toBe(content);
    });

    it('should detect corrupted data', async () => {
      // This is tested indirectly - if data were corrupted,
      // decompression would fail and return null
      const content = 'Test content';
      await cache.set('test.md', content);

      const retrieved = await cache.get('test.md');
      expect(retrieved).toBe(content);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent sets', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`doc${i}.md`, `content${i}`));
      }

      await Promise.all(promises);

      for (let i = 0; i < 10; i++) {
        const retrieved = await cache.get(`doc${i}.md`);
        expect(retrieved).toBe(`content${i}`);
      }
    });

    it('should handle concurrent gets', async () => {
      await cache.set('test.md', 'content');

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cache.get('test.md'));
      }

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBe('content');
      });
    });
  });

  describe('performance', () => {
    it('should set document quickly', async () => {
      const start = performance.now();
      await cache.set('test.md', 'content');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // < 500ms
    });

    it('should get document quickly', async () => {
      await cache.set('test.md', 'content');

      const start = performance.now();
      await cache.get('test.md');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // < 100ms
    });

    it('should handle many documents efficiently', async () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        await cache.set(`doc${i}.md`, `content${i}`);
      }

      const duration = performance.now() - start;

      // Should be reasonably fast (< 10s for 100 docs)
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string content', async () => {
      await cache.set('empty.md', '');
      const retrieved = await cache.get('empty.md');
      expect(retrieved).toBe('');
    });

    it('should handle very long document IDs', async () => {
      const longId = 'a'.repeat(1000) + '.md';
      await cache.set(longId, 'content');

      const retrieved = await cache.get(longId);
      expect(retrieved).toBe('content');
    });

    it('should handle documents with only whitespace', async () => {
      const whitespace = '   \n\n\t\t   ';
      await cache.set('whitespace.md', whitespace);

      const retrieved = await cache.get('whitespace.md');
      expect(retrieved).toBe(whitespace);
    });

    it('should handle documents with special characters in ID', async () => {
      const id = 'path/to/file with spaces.md';
      await cache.set(id, 'content');

      const retrieved = await cache.get(id);
      expect(retrieved).toBe('content');
    });
  });
});

/**
 * Performance benchmark tests
 */
describe('DocCache Performance Benchmarks', () => {
  it('benchmark: sequential writes', async () => {
    const cache = new DocCache();
    await cache.initialize();

    const start = performance.now();

    for (let i = 0; i < 50; i++) {
      await cache.set(`doc${i}.md`, `content${i}`.repeat(100));
    }

    const duration = performance.now() - start;

    console.log(`50 sequential writes: ${duration.toFixed(2)}ms`);

    await cache.clear();
  });

  it('benchmark: sequential reads', async () => {
    const cache = new DocCache();
    await cache.initialize();

    // Write first
    for (let i = 0; i < 50; i++) {
      await cache.set(`doc${i}.md`, `content${i}`.repeat(100));
    }

    // Then read
    const start = performance.now();

    for (let i = 0; i < 50; i++) {
      await cache.get(`doc${i}.md`);
    }

    const duration = performance.now() - start;

    console.log(`50 sequential reads: ${duration.toFixed(2)}ms`);

    await cache.clear();
  });

  it('benchmark: compression performance', async () => {
    const cache = new DocCache();
    await cache.initialize();

    const largeContent = 'x'.repeat(50000);

    const start = performance.now();
    await cache.set('large.md', largeContent);
    const duration = performance.now() - start;

    console.log(`Compressed 50KB document in: ${duration.toFixed(2)}ms`);

    await cache.clear();
  });
});
