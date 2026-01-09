/**
 * Vector Search Benchmarks
 *
 * Measures performance of vector search operations including:
 * - CPU vs GPU search
 * - Small to very large datasets
 * - Batch and real-time search
 * - Index building time
 */

import type { Benchmark, BenchmarkSuite } from '../types.js';

// Simple cosine similarity implementation
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Mock vector store
class MockVectorStore {
  private vectors: Map<string, number[]> = new Map();

  addVector(id: string, vector: number[]) {
    this.vectors.set(id, vector);
  }

  // CPU-based search
  cpuSearch(query: number[], topK: number = 10): Array<{ id: string; similarity: number }> {
    const results: Array<{ id: string; similarity: number }> = [];

    for (const [id, vector] of this.vectors) {
      const similarity = cosineSimilarity(query, vector);
      results.push({ id, similarity });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  // Simulated GPU search (same algorithm, just measuring potential)
  gpuSearch(query: number[], topK: number = 10): Array<{ id: string; similarity: number }> {
    // In real implementation, this would use WebGPU
    // For benchmarking, we simulate GPU overhead with async
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.cpuSearch(query, topK));
      }, 0);
    }) as any;
  }
}

// Generate random vector
function generateRandomVector(dim: number): number[] {
  return Array.from({ length: dim }, () => Math.random() * 2 - 1);
}

// Generate test dataset
function generateDataset(size: number, dim: number = 384): Map<string, number[]> {
  const dataset = new Map<string, number[]>();
  for (let i = 0; i < size; i++) {
    dataset.set(`vec_${i}`, generateRandomVector(dim));
  }
  return dataset;
}

export const vectorSearchBenchmarks: BenchmarkSuite = {
  name: 'Vector Search',
  description: 'Performance benchmarks for vector search operations',

  benchmarks: [
    {
      name: 'Small Dataset (1K vectors) - CPU',
      description: 'Search through 1K vectors on CPU',
      setup: () => {
        const store = new MockVectorStore();
        const dataset = generateDataset(1000);
        for (const [id, vector] of dataset) {
          store.addVector(id, vector);
        }
        return { store, query: generateRandomVector(384) };
      },
      fn: ({ store, query }: any) => {
        store.cpuSearch(query, 10);
      }
    },

    {
      name: 'Medium Dataset (10K vectors) - CPU',
      description: 'Search through 10K vectors on CPU',
      setup: () => {
        const store = new MockVectorStore();
        const dataset = generateDataset(10000);
        for (const [id, vector] of dataset) {
          store.addVector(id, vector);
        }
        return { store, query: generateRandomVector(384) };
      },
      fn: ({ store, query }: any) => {
        store.cpuSearch(query, 10);
      }
    },

    {
      name: 'Large Dataset (100K vectors) - CPU',
      description: 'Search through 100K vectors on CPU',
      setup: () => {
        const store = new MockVectorStore();
        const dataset = generateDataset(100000);
        for (const [id, vector] of dataset) {
          store.addVector(id, vector);
        }
        return { store, query: generateRandomVector(384) };
      },
      fn: ({ store, query }: any) => {
        store.cpuSearch(query, 10);
      }
    },

    {
      name: 'Batch Search (100 queries)',
      description: 'Execute 100 search queries in batch',
      setup: () => {
        const store = new MockVectorStore();
        const dataset = generateDataset(10000);
        for (const [id, vector] of dataset) {
          store.addVector(id, vector);
        }
        const queries = Array.from({ length: 100 }, () => generateRandomVector(384));
        return { store, queries };
      },
      fn: ({ store, queries }: any) => {
        for (const query of queries) {
          store.cpuSearch(query, 10);
        }
      }
    },

    {
      name: 'Real-time Streaming (1000 queries)',
      description: 'Simulate real-time streaming search',
      setup: async () => {
        const store = new MockVectorStore();
        const dataset = generateDataset(5000);
        for (const [id, vector] of dataset) {
          store.addVector(id, vector);
        }
        return { store };
      },
      fn: async ({ store }: any) => {
        for (let i = 0; i < 1000; i++) {
          const query = generateRandomVector(384);
          store.cpuSearch(query, 10);
        }
      }
    },

    {
      name: 'Vector Addition (1000 vectors)',
      description: 'Add 1000 vectors to store',
      setup: () => {
        const store = new MockVectorStore();
        const vectors = Array.from({ length: 1000 }, () => generateRandomVector(384));
        return { store, vectors };
      },
      fn: ({ store, vectors }: any) => {
        for (let i = 0; i < vectors.length; i++) {
          store.addVector(`vec_${i}`, vectors[i]);
        }
      }
    },

    {
      name: 'Cosine Similarity Calculation',
      description: 'Calculate cosine similarity between two 384-dim vectors',
      fn: () => {
        const vec1 = generateRandomVector(384);
        const vec2 = generateRandomVector(384);
        cosineSimilarity(vec1, vec2);
      }
    },

    {
      name: 'High-Dimensional Vectors (1536-dim)',
      description: 'Search with high-dimensional vectors (OpenAI ada-002 size)',
      setup: () => {
        const store = new MockVectorStore();
        const dataset = generateDataset(10000, 1536);
        for (const [id, vector] of dataset) {
          store.addVector(id, vector);
        }
        return { store, query: generateRandomVector(1536) };
      },
      fn: ({ store, query }: any) => {
        store.cpuSearch(query, 10);
      }
    }
  ]
};
