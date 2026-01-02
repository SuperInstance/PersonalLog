/**
 * WASM Benchmark Utilities
 *
 * Performance testing for comparing WASM vs JavaScript implementations.
 */

import { getVectorOps, getWasmFeatures, isUsingWasm } from './bridge'

export interface BenchmarkResult {
  name: string
  iterations: number
  totalTimeMs: number
  avgTimeMs: number
  opsPerSecond: number
  wasmUsed: boolean
}

export interface BenchmarkComparison {
  wasmResult: BenchmarkResult
  jsResult: BenchmarkResult
  speedup: number
}

/**
 * Generate random test vectors
 */
export function generateRandomVector(dimension: number): number[] {
  return Array.from({ length: dimension }, () => Math.random())
}

/**
 * Generate multiple random vectors
 */
export function generateRandomVectors(count: number, dimension: number): number[] {
  const vectors: number[] = []
  for (let i = 0; i < count; i++) {
    vectors.push(...generateRandomVector(dimension))
  }
  return vectors
}

/**
 * Benchmark a function
 */
async function benchmarkFunction(
  name: string,
  fn: () => void | Promise<void>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const startTime = performance.now()

  for (let i = 0; i < iterations; i++) {
    await fn()
  }

  const totalTime = performance.now() - startTime
  const avgTime = totalTime / iterations
  const opsPerSecond = 1000 / avgTime

  return {
    name,
    iterations,
    totalTimeMs: totalTime,
    avgTimeMs: avgTime,
    opsPerSecond,
    wasmUsed: isUsingWasm(),
  }
}

/**
 * Benchmark cosine similarity
 */
export async function benchmarkCosineSimilarity(
  dimension: number = 384,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const ops = await getVectorOps()
  const a = generateRandomVector(dimension)
  const b = generateRandomVector(dimension)

  return benchmarkFunction(
    `Cosine Similarity (${dimension}D)`,
    () => ops.cosine_similarity(a, b),
    iterations
  )
}

/**
 * Benchmark batch cosine similarity
 */
export async function benchmarkBatchCosineSimilarity(
  numVectors: number = 100,
  dimension: number = 384,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const ops = await getVectorOps()
  const query = generateRandomVector(dimension)
  const vectors = generateRandomVectors(numVectors, dimension)

  return benchmarkFunction(
    `Batch Cosine Similarity (${numVectors} vectors, ${dimension}D)`,
    () => ops.batch_cosine_similarity(query, vectors, dimension),
    iterations
  )
}

/**
 * Benchmark top-K search
 */
export async function benchmarkTopK(
  numVectors: number = 100,
  dimension: number = 384,
  k: number = 10,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const ops = await getVectorOps()
  const query = generateRandomVector(dimension)
  const vectors = generateRandomVectors(numVectors, dimension)

  return benchmarkFunction(
    `Top-K Search (${numVectors} vectors, k=${k})`,
    () => ops.top_k_similar(query, vectors, dimension, k),
    iterations
  )
}

/**
 * Run all benchmarks and compare WASM vs JS
 */
export async function runFullBenchmark(): Promise<void> {
  console.group('🚀 PersonalLog WASM Benchmark Suite')
  console.log('==========================================')

  // Log feature info
  const features = getWasmFeatures()
  console.log('WASM Features:', features)
  console.log('WASM Enabled:', isUsingWasm())
  console.log('')

  // Run benchmarks
  const results: BenchmarkResult[] = []

  console.log('Running benchmarks...')

  results.push(await benchmarkCosineSimilarity(384, 1000))
  results.push(await benchmarkCosineSimilarity(768, 1000))
  results.push(await benchmarkBatchCosineSimilarity(100, 384, 100))
  results.push(await benchmarkBatchCosineSimilarity(1000, 384, 10))
  results.push(await benchmarkTopK(100, 384, 10, 100))
  results.push(await benchmarkTopK(1000, 384, 10, 10))

  console.log('')
  console.log('Results:')
  console.log('--------')

  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.name}`)
    console.log(`   Avg: ${result.avgTimeMs.toFixed(3)}ms`)
    console.log(`   Throughput: ${result.opsPerSecond.toFixed(0)} ops/sec`)
    console.log(`   Implementation: ${result.wasmUsed ? 'WASM' : 'JS'}`)
    console.log('')
  })

  console.groupEnd()
}

/**
 * Compare WASM vs JS performance
 */
export async function compareWasmVsJs(): Promise<void> {
  console.group('⚡ WASM vs JavaScript Comparison')
  console.log('=====================================')

  const features = getWasmFeatures()
  console.log('WASM Supported:', features.supported)
  console.log('SIMD Supported:', features.simd)
  console.log('')

  // Benchmark with WASM
  console.log('Benchmarking with WASM...')
  const wasmTime1 = await benchmarkCosineSimilarity(384, 1000)
  const wasmTime2 = await benchmarkBatchCosineSimilarity(100, 384, 100)

  console.log(`${wasmTime1.name}: ${wasmTime1.avgTimeMs.toFixed(3)}ms (${wasmTime1.opsPerSecond.toFixed(0)} ops/sec)`)
  console.log(`${wasmTime2.name}: ${wasmTime2.avgTimeMs.toFixed(3)}ms (${wasmTime2.opsPerSecond.toFixed(0)} ops/sec)`)
  console.log('')

  console.groupEnd()
}

/**
 * Format benchmark result as markdown table
 */
export function formatBenchmarkTable(results: BenchmarkResult[]): string {
  const header = '| Operation | Avg Time (ms) | Ops/Sec | Implementation |\n|-----------|---------------|---------|----------------|\n'

  const rows = results
    .map(r =>
      `| ${r.name} | ${r.avgTimeMs.toFixed(3)} | ${r.opsPerSecond.toFixed(0)} | ${r.wasmUsed ? 'WASM' : 'JS'} |`
    )
    .join('\n')

  return header + rows
}

/**
 * Run a quick benchmark (for development)
 */
export async function quickBenchmark(): Promise<string> {
  const result = await benchmarkCosineSimilarity(384, 100)
  return `Cosine similarity (384D): ${result.avgTimeMs.toFixed(3)}ms avg (${result.opsPerSecond.toFixed(0)} ops/sec) - ${result.wasmUsed ? 'WASM' : 'JS'}`
}
