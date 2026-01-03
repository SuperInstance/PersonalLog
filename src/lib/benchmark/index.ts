/**
 * Benchmark System
 *
 * Comprehensive benchmarking suite for PersonalLog.
 * Measures performance across vector operations, storage, rendering, memory, and network.
 *
 * @example
 * ```typescript
 * import { getBenchmarkSuite } from '@/lib/benchmark'
 *
 * const suite = getBenchmarkSuite()
 *
 * // Run all benchmarks with progress updates
 * const results = await suite.runAll({
 *   iterations: 10,
 *   skipExpensive: false,
 *   onProgress: (progress) => {
 *     console.log(`Running: ${progress.current} (${progress.progress.toFixed(1)}%)`)
 *   }
 * })
 *
 * console.log(`Overall Score: ${results.overallScore}/100`)
 * console.log(`Recommendations:`, results.recommendations)
 * ```
 */

// Main benchmark suite
export { BenchmarkSuite, getBenchmarkSuite } from './suite'

// Types
export type {
  BenchmarkResult,
  BenchmarkSuiteResult,
  BenchmarkCategory,
  BenchmarkOptions,
  BenchmarkProgress,
  BenchmarkOperation,
  HardwareProfile,
  SystemConfiguration,
  Recommendation,
  BenchmarkHistory,
  Statistics,
  ConfidenceInterval,
} from './types'

// Individual benchmark operations (for advanced usage)
export { vectorBenchmarks } from './operations/vector-bench'
export { storageBenchmarks } from './operations/storage-bench'
export { renderBenchmarks } from './operations/render-bench'
export { memoryBenchmarks } from './operations/memory-bench'
export { networkBenchmarks } from './operations/network-bench'
