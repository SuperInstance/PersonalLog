/**
 * Core benchmark types for the benchmark suite
 */

export interface BenchmarkOptions {
  /** Number of warmup iterations (default: 3) */
  warmupIterations?: number;
  /** Number of benchmark iterations (default: 10) */
  iterations?: number;
  /** Minimum sample time in milliseconds (default: 500) */
  minSampleTime?: number;
  /** Whether to run in parallel (default: false) */
  parallel?: boolean;
  /** Custom metadata to attach to results */
  metadata?: Record<string, unknown>;
}

export interface BenchmarkResult {
  /** Benchmark name */
  name: string;
  /** Suite name */
  suite: string;
  /** Number of iterations executed */
  iterations: number;
  /** Total time in milliseconds */
  totalTime: number;
  /** Average time per iteration in milliseconds */
  avgTime: number;
  /** Minimum time across all iterations in milliseconds */
  minTime: number;
  /** Maximum time across all iterations in milliseconds */
  maxTime: number;
  /** Median time in milliseconds */
  medianTime: number;
  /** 95th percentile in milliseconds */
  p95: number;
  /** 99th percentile in milliseconds */
  p99: number;
  /** Standard deviation in milliseconds */
  stdDev: number;
  /** Operations per second */
  opsPerSecond: number;
  /** Memory usage in bytes (if measured) */
  memoryUsage?: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Error message if failed */
  error?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp when benchmark was run */
  timestamp: string;
}

export interface BenchmarkSuite {
  /** Suite name */
  name: string;
  /** Suite description */
  description: string;
  /** Benchmarks in this suite */
  benchmarks: Benchmark[];
}

export interface Benchmark {
  /** Benchmark name */
  name: string;
  /** Benchmark description */
  description?: string;
  /** Benchmark function to execute (receives setup data if provided) */
  fn: (setupData?: any) => Promise<void | any> | void | any;
  /** Setup function (run before each iteration, can return data for fn) */
  setup?: () => Promise<any> | any;
  /** Teardown function (run after each iteration) */
  teardown?: () => Promise<void> | void;
  /** Benchmark options */
  options?: BenchmarkOptions;
}

export interface SuiteResult {
  /** Suite name */
  name: string;
  /** Suite description */
  description?: string;
  /** Benchmark results */
  results: BenchmarkResult[];
  /** Total suite execution time in milliseconds */
  totalTime: number;
  /** Timestamp when suite was run */
  timestamp: string;
}

export interface ComparisonResult {
  /** Benchmark name */
  name: string;
  /** Current result */
  current: BenchmarkResult;
  /** Baseline result */
  baseline: BenchmarkResult;
  /** Performance difference as percentage */
  diffPercent: number;
  /** Whether current is faster than baseline */
  isFaster: boolean;
  /** Whether this is a regression (slower than baseline) */
  isRegression: boolean;
  /** Whether this is an improvement (faster than baseline) */
  isImprovement: boolean;
}

export interface BaselineData {
  /** Baseline name */
  name: string;
  /** Suite results */
  suites: SuiteResult[];
  /** Timestamp when baseline was created */
  timestamp: string;
  /** Environment information */
  environment: {
    /** Node version */
    nodeVersion: string;
    /** Platform */
    platform: string;
    /** Architecture */
    arch: string;
    /** CPU model */
    cpuModel?: string;
    /** CPU cores */
    cpuCores: number;
    /** Total memory in bytes */
    totalMemory: number;
  };
}

export type ReporterType = 'console' | 'json' | 'markdown' | 'html';

export interface ReporterOptions {
  /** Output file path (optional, defaults to stdout) */
  output?: string;
  /** Whether to include detailed statistics */
  detailed?: boolean;
  /** Whether to include comparison with baseline */
  compare?: boolean;
  /** Baseline data for comparison */
  baseline?: BaselineData;
}
