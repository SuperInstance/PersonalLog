/**
 * Tests for WebGPU Vector Search
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WebGPUVectorSearch,
  WebGPUUnsupportedError,
  WebGPUInitializationError,
} from './webgpu-vector-search'
import { cosineSimilarity } from './vector-utils'

// Mock WebGPU API for testing
const mockGPUDevice = {
  createBuffer: vi.fn(),
  createComputePipeline: vi.fn(),
  createBindGroup: vi.fn(),
  createCommandEncoder: vi.fn(),
  queue: {
    submit: vi.fn(),
    onSubmittedWorkDone: vi.fn(),
  },
  destroy: vi.fn(),
}

const mockAdapter = {
  requestDevice: vi.fn(),
}

const mockGPU = {
  requestAdapter: vi.fn(),
}

describe('WebGPUVectorSearch', () => {
  let search: WebGPUVectorSearch
  const dimension = 384

  beforeEach(() => {
    search = new WebGPUVectorSearch(dimension)
  })

  afterEach(() => {
    search.destroy()
  })

  describe('Initialization', () => {
    it('should create instance with default options', () => {
      expect(search).toBeInstanceOf(WebGPUVectorSearch)
    })

    it('should create instance with custom options', () => {
      const customSearch = new WebGPUVectorSearch(dimension, {
        useGPU: true,
        batchSize: 64,
        enableTiming: true,
      })
      expect(customSearch).toBeInstanceOf(WebGPUVectorSearch)
      customSearch.destroy()
    })

    it('should detect browser support', () => {
      // @ts-ignore - testing static method
      const isSupported = WebGPUVectorSearch.isBrowserSupported()
      expect(typeof isSupported).toBe('boolean')
    })

    it('should check GPU support after initialization', async () => {
      // Before initialization
      expect(search.isGPUSupported()).toBe(false)

      // After initialization attempt (will fail in test env)
      try {
        await search.initializeGPU()
      } catch (e) {
        // Expected to fail in test environment
      }

      // Should still return false or true based on actual support
      const isSupported = search.isGPUSupported()
      expect(typeof isSupported).toBe('boolean')
    })
  })

  describe('CPU Fallback', () => {
    it('should perform CPU search correctly', async () => {
      const query = [1, 2, 3, 4]
      const vectors = [
        1, 2, 3, 4,  // identical to query
        2, 4, 6, 8,  // parallel to query
        1, 0, 0, 0,  // different
      ]
      const k = 2

      const results = await search.search(query, vectors, k)

      expect(results).toHaveLength(2)
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity)
      expect(results[0].index).toBe(0)  // Most similar
    })

    it('should handle empty vectors array', async () => {
      const query = [1, 2, 3, 4]
      const vectors: number[] = []
      const k = 2

      const results = await search.search(query, vectors, k)
      expect(results).toHaveLength(0)
    })

    it('should handle k larger than vector count', async () => {
      const query = [1, 2, 3, 4]
      const vectors = [1, 2, 3, 4, 2, 4, 6, 8]
      const k = 10

      const results = await search.search(query, vectors, k)
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should validate query dimension', async () => {
      const query = [1, 2, 3]  // Wrong dimension
      const vectors = [1, 2, 3, 4]
      const k = 1

      await expect(search.search(query, vectors, k)).rejects.toThrow()
    })

    it('should validate vectors array length', async () => {
      const query = [1, 2, 3, 4]
      const vectors = [1, 2, 3]  // Not multiple of dimension
      const k = 1

      await expect(search.search(query, vectors, k)).rejects.toThrow()
    })

    it('should compute cosine similarity correctly', async () => {
      const query = [1, 0, 0]
      const vectors = [1, 0, 0, 0, 1, 0, 0, 0, 1]
      const k = 3

      const results = await search.search(query, vectors, k)

      expect(results[0].similarity).toBeCloseTo(1.0)  // Identical
      expect(results[1].similarity).toBeCloseTo(0.0)  // Orthogonal
      expect(results[2].similarity).toBeCloseTo(0.0)  // Orthogonal
    })
  })

  describe('Batch Search', () => {
    it('should perform batch search with CPU fallback', async () => {
      const queries = [
        [1, 2, 3, 4],
        [2, 4, 6, 8],
      ]
      const vectors = [
        1, 2, 3, 4,
        2, 4, 6, 8,
        1, 0, 0, 0,
      ]
      const k = 2

      const batchResult = await search.batchSearch(queries, vectors, k)

      expect(batchResult.results).toHaveLength(2)
      expect(batchResult.results[0]).toHaveLength(2)
      expect(batchResult.results[1]).toHaveLength(2)
      expect(batchResult.usedGPU).toBe(false)  // CPU fallback in test env
    })

    it('should handle empty queries array', async () => {
      const queries: number[][] = []
      const vectors = [1, 2, 3, 4]
      const k = 2

      const batchResult = await search.batchSearch(queries, vectors, k)

      expect(batchResult.results).toHaveLength(0)
    })

    it('should handle single query in batch', async () => {
      const queries = [[1, 2, 3, 4]]
      const vectors = [1, 2, 3, 4, 2, 4, 6, 8]
      const k = 1

      const batchResult = await search.batchSearch(queries, vectors, k)

      expect(batchResult.results).toHaveLength(1)
      expect(batchResult.results[0]).toHaveLength(1)
    })
  })

  describe('Performance Metrics', () => {
    it('should track metrics when timing enabled', async () => {
      const timedSearch = new WebGPUVectorSearch(dimension, {
        enableTiming: true,
        useGPU: false,  // Force CPU for testing
      })

      const query = [1, 2, 3, 4]
      const vectors = [1, 2, 3, 4, 2, 4, 6, 8]
      const k = 1

      await timedSearch.search(query, vectors, k)

      const metrics = timedSearch.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].usedGPU).toBe(false)
      expect(metrics[0].cpuTime).toBeGreaterThan(0)

      timedSearch.destroy()
    })

    it('should not track metrics when timing disabled', async () => {
      const untimedSearch = new WebGPUVectorSearch(dimension, {
        enableTiming: false,
        useGPU: false,
      })

      const query = [1, 2, 3, 4]
      const vectors = [1, 2, 3, 4]
      const k = 1

      await untimedSearch.search(query, vectors, k)

      const metrics = untimedSearch.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].cpuTime).toBe(0)

      untimedSearch.destroy()
    })

    it('should calculate average speedup', () => {
      // No GPU searches
      const speedup = search.getAverageSpeedup()
      expect(speedup).toBe(1)
    })

    it('should clear metrics', async () => {
      const query = [1, 2, 3, 4]
      const vectors = [1, 2, 3, 4]
      const k = 1

      await search.search(query, vectors, k)
      expect(search.getMetrics().length).toBeGreaterThan(0)

      search.clearMetrics()
      expect(search.getMetrics()).toHaveLength(0)
    })

    it('should generate performance summary', async () => {
      const query = [1, 2, 3, 4]
      const vectors = [1, 2, 3, 4]
      const k = 1

      await search.search(query, vectors, k)

      const summary = search.getPerformanceSummary()
      expect(summary).toContain('Performance Summary')
      expect(summary).toContain('CPU Searches')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small vectors', async () => {
      const smallSearch = new WebGPUVectorSearch(2)
      const query = [1, 0]
      const vectors = [1, 0, 0, 1]
      const k = 2

      const results = await smallSearch.search(query, vectors, k)
      expect(results).toHaveLength(2)

      smallSearch.destroy()
    })

    it('should handle large vector dimension', async () => {
      const largeDim = 1536
      const largeSearch = new WebGPUVectorSearch(largeDim)
      const query = new Array(largeDim).fill(0).map((_, i) => i % 10)
      const vectors = [
        ...query,
        ...query.map(v => v * 2),
      ]
      const k = 1

      const results = await largeSearch.search(query, vectors, k)
      expect(results).toHaveLength(1)
      expect(results[0].similarity).toBeCloseTo(1.0)

      largeSearch.destroy()
    })

    it('should handle zero magnitude vectors', async () => {
      const query = [0, 0, 0, 0]
      const vectors = [1, 2, 3, 4, 0, 0, 0, 0]
      const k = 2

      const results = await search.search(query, vectors, k)

      // Zero magnitude vectors should have 0 similarity
      const zeroVecResult = results.find(r => r.index === 1)
      expect(zeroVecResult?.similarity).toBe(0)
    })

    it('should handle very large k value', async () => {
      const query = [1, 2, 3, 4]
      const vectors = [
        1, 2, 3, 4,
        2, 4, 6, 8,
        1, 0, 0, 0,
      ]
      const k = 1000  // Much larger than vector count

      const results = await search.search(query, vectors, k)
      expect(results.length).toBe(3)  // Only 3 vectors available
    })
  })

  describe('Cleanup', () => {
    it('should destroy resources', () => {
      const testSearch = new WebGPUVectorSearch(dimension)
      expect(() => testSearch.destroy()).not.toThrow()
    })

    it('should handle multiple destroy calls', () => {
      const testSearch = new WebGPUVectorSearch(dimension)
      testSearch.destroy()
      expect(() => testSearch.destroy()).not.toThrow()
    })
  })

  describe('Similarity Accuracy', () => {
    it('should produce same results as CPU cosine similarity', async () => {
      const query = [1, 2, 3, 4]
      const vectors = [1, 2, 3, 4, 2, 4, 6, 8]
      const k = 2

      const results = await search.search(query, vectors, k)

      // Compare with CPU implementation
      const vec1 = vectors.slice(0, 4)
      const vec2 = vectors.slice(4, 8)

      const expectedSim1 = cosineSimilarity(query, vec1)
      const expectedSim2 = cosineSimilarity(query, vec2)

      expect(results[0].similarity).toBeCloseTo(expectedSim1, 5)
      expect(results[1].similarity).toBeCloseTo(expectedSim2, 5)
    })

    it('should maintain ordering by similarity', async () => {
      const query = [1, 0, 0]
      const vectors = [
        1, 0, 0,      // Similarity: 1.0
        0.9, 0.1, 0,  // Similarity: 0.9
        0.5, 0.5, 0,  // Similarity: 0.707
        0, 1, 0,      // Similarity: 0.0
      ]
      const k = 4

      const results = await search.search(query, vectors, k)

      expect(results[0].similarity).toBeGreaterThan(results[1].similarity)
      expect(results[1].similarity).toBeGreaterThan(results[2].similarity)
      expect(results[2].similarity).toBeGreaterThan(results[3].similarity)
    })
  })
})

describe('WebGPU Errors', () => {
  it('should throw WebGPUUnsupportedError when GPU not available', async () => {
    // Save original navigator.gpu
    const originalGPU = (global as any).navigator?.gpu

    // Mock navigator.gpu as undefined
    Object.defineProperty(navigator, 'gpu', {
      get: () => undefined,
      configurable: true,
    })

    const search = new WebGPUVectorSearch(384)

    await expect(search.initializeGPU()).rejects.toThrow(WebGPUUnsupportedError)

    // Restore original
    if (originalGPU) {
      Object.defineProperty(navigator, 'gpu', {
        get: () => originalGPU,
        configurable: true,
      })
    }

    search.destroy()
  })
})

describe('Integration with Vector Utils', () => {
  it('should work with vector utilities', async () => {
    const { normalizeVector } = await import('./vector-utils')

    const query = [3, 4]
    const normalizedQuery = normalizeVector(query)

    const vectors = [3, 4, 6, 8]
    const k = 2

    const search = new WebGPUVectorSearch(2)
    const results = await search.search(normalizedQuery, vectors, k)

    expect(results).toHaveLength(2)
    expect(results[0].similarity).toBeCloseTo(1.0)  // Identical after normalization

    search.destroy()
  })

  it('should handle hash-based embeddings', async () => {
    const { hashEmbedding } = await import('./vector-utils')

    const queryEmbedding = hashEmbedding('test query', 384)
    const docEmbedding1 = hashEmbedding('similar query', 384)
    const docEmbedding2 = hashEmbedding('different content', 384)

    const vectors = [...docEmbedding1, ...docEmbedding2]
    const k = 2

    const search = new WebGPUVectorSearch(384)
    const results = await search.search(queryEmbedding, vectors, k)

    expect(results).toHaveLength(2)
    expect(results[0].similarity).toBeGreaterThanOrEqual(0)
    expect(results[0].similarity).toBeLessThanOrEqual(1)

    search.destroy()
  })
})
