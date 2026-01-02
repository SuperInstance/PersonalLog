/**
 * Vector Operation Benchmarks
 *
 * Benchmarks for vector operations used in semantic search and embeddings.
 * Measures cosine similarity, dot product, and vector arithmetic performance.
 */

import { BenchmarkResult, BenchmarkOptions, BenchmarkOperation } from '../types'

// ============================================================================
// COSINE SIMILARITY BENCHMARK
// ============================================================================

async function benchmarkCosineSimilarity(
  options: BenchmarkOptions
): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 3 } = options
  const measurements: number[] = []
  const vectorSize = 384 // Common embedding dimension
  const pairs = 100 // Number of vector pairs to compare

  // Generate random vectors
  const vectorsA: number[][] = []
  const vectorsB: number[][] = []

  for (let i = 0; i < pairs; i++) {
    vectorsA.push(Array.from({ length: vectorSize }, () => Math.random()))
    vectorsB.push(Array.from({ length: vectorSize }, () => Math.random()))
  }

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    for (let j = 0; j < pairs; j++) {
      cosineSimilarity(vectorsA[j], vectorsB[j])
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    for (let j = 0; j < pairs; j++) {
      cosineSimilarity(vectorsA[j], vectorsB[j])
    }
    const duration = performance.now() - start
    measurements.push(duration)
  }

  return calculateStatistics('cosine-similarity', 'vector', measurements, 'ms', {
    vectorSize,
    pairs,
    totalCalculations: pairs * iterations,
  })
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (normA * normB)
}

// ============================================================================
// DOT PRODUCT BENCHMARK
// ============================================================================

async function benchmarkDotProduct(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 3 } = options
  const measurements: number[] = []
  const vectorSize = 384
  const pairs = 100

  const vectorsA: number[][] = []
  const vectorsB: number[][] = []

  for (let i = 0; i < pairs; i++) {
    vectorsA.push(Array.from({ length: vectorSize }, () => Math.random()))
    vectorsB.push(Array.from({ length: vectorSize }, () => Math.random()))
  }

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    for (let j = 0; j < pairs; j++) {
      dotProduct(vectorsA[j], vectorsB[j])
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    for (let j = 0; j < pairs; j++) {
      dotProduct(vectorsA[j], vectorsB[j])
    }
    const duration = performance.now() - start
    measurements.push(duration)
  }

  return calculateStatistics('dot-product', 'vector', measurements, 'ms', {
    vectorSize,
    pairs,
    totalCalculations: pairs * iterations,
  })
}

function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result += a[i] * b[i]
  }
  return result
}

// ============================================================================
// VECTOR NORMALIZATION BENCHMARK
// ============================================================================

async function benchmarkVectorNormalization(
  options: BenchmarkOptions
): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 3 } = options
  const measurements: number[] = []
  const vectorSize = 384
  const vectors = 100

  const data: number[][] = []
  for (let i = 0; i < vectors; i++) {
    data.push(Array.from({ length: vectorSize }, () => Math.random()))
  }

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    for (let j = 0; j < vectors; j++) {
      normalize(data[j])
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    for (let j = 0; j < vectors; j++) {
      normalize(data[j])
    }
    const duration = performance.now() - start
    measurements.push(duration)
  }

  return calculateStatistics('vector-normalization', 'vector', measurements, 'ms', {
    vectorSize,
    vectors,
    totalCalculations: vectors * iterations,
  })
}

function normalize(vector: number[]): number[] {
  let norm = 0
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i]
  }
  norm = Math.sqrt(norm)

  if (norm === 0) return vector

  const result = new Array(vector.length)
  for (let i = 0; i < vector.length; i++) {
    result[i] = vector[i] / norm
  }
  return result
}

// ============================================================================
// EUCLIDEAN DISTANCE BENCHMARK
// ============================================================================

async function benchmarkEuclideanDistance(
  options: BenchmarkOptions
): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 3 } = options
  const measurements: number[] = []
  const vectorSize = 384
  const pairs = 100

  const vectorsA: number[][] = []
  const vectorsB: number[][] = []

  for (let i = 0; i < pairs; i++) {
    vectorsA.push(Array.from({ length: vectorSize }, () => Math.random()))
    vectorsB.push(Array.from({ length: vectorSize }, () => Math.random()))
  }

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    for (let j = 0; j < pairs; j++) {
      euclideanDistance(vectorsA[j], vectorsB[j])
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    for (let j = 0; j < pairs; j++) {
      euclideanDistance(vectorsA[j], vectorsB[j])
    }
    const duration = performance.now() - start
    measurements.push(duration)
  }

  return calculateStatistics('euclidean-distance', 'vector', measurements, 'ms', {
    vectorSize,
    pairs,
    totalCalculations: pairs * iterations,
  })
}

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

// ============================================================================
// BATCH SIMILARITY SEARCH BENCHMARK
// ============================================================================

async function benchmarkBatchSimilaritySearch(
  options: BenchmarkOptions
): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 3 } = options
  const measurements: number[] = []
  const vectorSize = 384
  const databaseSize = 1000
  const queries = 10

  // Generate database
  const database: number[][] = []
  for (let i = 0; i < databaseSize; i++) {
    database.push(Array.from({ length: vectorSize }, () => Math.random()))
  }

  // Generate queries
  const queryVectors: number[][] = []
  for (let i = 0; i < queries; i++) {
    queryVectors.push(Array.from({ length: vectorSize }, () => Math.random()))
  }

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    for (const query of queryVectors) {
      for (const vec of database) {
        cosineSimilarity(query, vec)
      }
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    for (const query of queryVectors) {
      for (const vec of database) {
        cosineSimilarity(query, vec)
      }
    }
    const duration = performance.now() - start
    measurements.push(duration)
  }

  return calculateStatistics('batch-similarity-search', 'vector', measurements, 'ms', {
    vectorSize,
    databaseSize,
    queries,
    totalCalculations: databaseSize * queries * iterations,
  })
}

// ============================================================================
// STATISTICAL CALCULATIONS
// ============================================================================

function calculateStatistics(
  name: string,
  category: string,
  measurements: number[],
  unit: 'ms' | 'ops/sec' | 'fps' | 'bytes/sec',
  metadata?: Record<string, unknown>
): BenchmarkResult {
  const sorted = [...measurements].sort((a, b) => a - b)

  const sum = measurements.reduce((a, b) => a + b, 0)
  const mean = sum / measurements.length

  // Calculate variance and standard deviation
  const variance = measurements.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / measurements.length
  const stdDev = Math.sqrt(variance)

  // Calculate percentiles
  const percentiles = {
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  }

  return {
    id: name,
    name,
    category: category as any,
    measurements,
    mean,
    median: percentiles.p50,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    percentiles,
    unit,
    timestamp: new Date().toISOString(),
    iterations: measurements.length,
    metadata,
  }
}

// ============================================================================
// EXPORT BENCHMARK OPERATIONS
// ============================================================================

export const vectorBenchmarks: BenchmarkOperation[] = [
  {
    id: 'cosine-similarity',
    name: 'Cosine Similarity',
    description: 'Measures cosine similarity calculation performance between vector pairs',
    category: 'vector',
    run: benchmarkCosineSimilarity,
    estimatedDuration: 200,
    expensive: false,
  },
  {
    id: 'dot-product',
    name: 'Dot Product',
    description: 'Measures dot product calculation performance',
    category: 'vector',
    run: benchmarkDotProduct,
    estimatedDuration: 150,
    expensive: false,
  },
  {
    id: 'vector-normalization',
    name: 'Vector Normalization',
    description: 'Measures L2 normalization performance',
    category: 'vector',
    run: benchmarkVectorNormalization,
    estimatedDuration: 150,
    expensive: false,
  },
  {
    id: 'euclidean-distance',
    name: 'Euclidean Distance',
    description: 'Measures Euclidean distance calculation performance',
    category: 'vector',
    run: benchmarkEuclideanDistance,
    estimatedDuration: 200,
    expensive: false,
  },
  {
    id: 'batch-similarity-search',
    name: 'Batch Similarity Search',
    description: 'Measures batch similarity search performance (realistic workload)',
    category: 'vector',
    run: benchmarkBatchSimilaritySearch,
    estimatedDuration: 2000,
    expensive: true,
  },
]
