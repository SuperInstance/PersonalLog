/**
 * Benchmark Types
 *
 * Type definitions for the benchmarking system.
 * Provides interfaces for benchmark operations, results, and statistics.
 */

// ============================================================================
// BENCHMARK RESULT TYPES
// ============================================================================

export interface BenchmarkResult {
  /** Unique identifier for the benchmark */
  id: string
  /** Human-readable name */
  name: string
  /** Category of benchmark */
  category: BenchmarkCategory
  /** Individual run measurements (in ms or ops/sec) */
  measurements: number[]
  /** Average of all measurements */
  mean: number
  /** Median of all measurements */
  median: number
  /** Standard deviation */
  stdDev: number
  /** Minimum value */
  min: number
  /** Maximum value */
  max: number
  /** Percentiles (p50, p95, p99) */
  percentiles: {
    p50: number
    p95: number
    p99: number
  }
  /** Unit of measurement */
  unit: 'ms' | 'ops/sec' | 'fps' | 'bytes/sec'
  /** Timestamp when benchmark was run */
  timestamp: string
  /** Number of iterations run */
  iterations: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

export type BenchmarkCategory =
  | 'vector'
  | 'storage'
  | 'render'
  | 'memory'
  | 'network'
  | 'overall'

export interface BenchmarkSuiteResult {
  /** Suite name */
  name: string
  /** Suite version */
  version: string
  /** All benchmark results */
  results: BenchmarkResult[]
  /** Overall score (0-100) */
  overallScore: number
  /** Hardware profile */
  hardwareProfile: HardwareProfile
  /** System configuration */
  configuration: SystemConfiguration
  /** Recommendations based on results */
  recommendations: Recommendation[]
  /** Timestamp */
  timestamp: string
}

// ============================================================================
// HARDWARE PROFILE
// ============================================================================

export interface HardwareProfile {
  /** CPU information */
  cpu: {
    cores: number
    architecture: string
    frequency?: number
  }
  /** Memory information */
  memory: {
    total: number
    available: number
    used: number
  }
  /** GPU information (if available) */
  gpu?: {
    vendor: string
    model: string
    memory: number
  }
  /** Storage information */
  storage: {
    type: 'ssd' | 'hdd' | 'unknown'
    estimatedSize: number
  }
  /** Network information */
  network?: {
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
    rtt: number
    downlink: number
  }
}

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

export interface SystemConfiguration {
  /** Browser information */
  browser: {
    name: string
    version: string
  }
  /** Platform */
  platform: {
    os: string
    architecture: string
  }
  /** PersonalLog version */
  appVersion: string
  /** Feature flags enabled */
  features: string[]
  /** Configuration settings */
  settings: Record<string, unknown>
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

export interface Recommendation {
  /** Priority level */
  priority: 'high' | 'medium' | 'low'
  /** Category this recommendation applies to */
  category: BenchmarkCategory
  /** Human-readable recommendation */
  recommendation: string
  /** Expected impact */
  impact: 'high' | 'medium' | 'low'
  /** Configuration changes to apply */
  configChanges?: Record<string, unknown>
  /** Reasoning */
  reasoning: string
}

// ============================================================================
// HISTORICAL DATA
// ============================================================================

export interface BenchmarkHistory {
  /** Historical benchmark runs */
  runs: BenchmarkSuiteResult[]
  /** Trend analysis */
  trends: {
    category: BenchmarkCategory
    direction: 'improving' | 'degrading' | 'stable'
    changePercent: number
  }[]
}

// ============================================================================
// BENCHMARK OPTIONS
// ============================================================================

export interface BenchmarkOptions {
  /** Number of warmup iterations (default: 3) */
  warmupIterations?: number
  /** Number of measurement iterations (default: 10) */
  iterations?: number
  /** Maximum time to spend benchmarking (ms, default: 5000) */
  maxDuration?: number
  /** Whether to run in background (default: true) */
  background?: boolean
  /** Callback for progress updates */
  onProgress?: (progress: BenchmarkProgress) => void
  /** Whether to skip expensive benchmarks (default: false) */
  skipExpensive?: boolean
  /** Minimum sample size for statistical significance (default: 5) */
  minSampleSize?: number
}

export interface BenchmarkProgress {
  /** Current benchmark being run */
  current: string
  /** Progress percentage (0-100) */
  progress: number
  /** Estimated time remaining (ms) */
  eta: number
  /** Results so far */
  results: BenchmarkResult[]
}

// ============================================================================
// BENCHMARK OPERATION INTERFACE
// ============================================================================

export interface BenchmarkOperation {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what's being measured */
  description: string
  /** Category */
  category: BenchmarkCategory
  /** Run the benchmark operation */
  run(options: BenchmarkOptions): Promise<BenchmarkResult>
  /** Estimated duration (ms) */
  estimatedDuration: number
  /** Whether benchmark is expensive */
  expensive: boolean
}

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

export interface Statistics {
  mean: number
  median: number
  stdDev: number
  variance: number
  min: number
  max: number
  range: number
  percentiles: {
    p50: number
    p90: number
    p95: number
    p99: number
  }
}

export interface ConfidenceInterval {
  mean: number
  lower: number
  upper: number
  confidence: number
}
