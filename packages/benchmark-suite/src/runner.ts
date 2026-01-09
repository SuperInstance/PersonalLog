/**
 * Benchmark runner - executes benchmarks and collects results
 */

import type {
  Benchmark,
  BenchmarkOptions,
  BenchmarkResult,
  BenchmarkSuite,
  SuiteResult
} from './types.js';
import { calculateStatistics, calculateOpsPerSecond, formatTime } from './statistics.js';

const DEFAULT_OPTIONS: Required<BenchmarkOptions> = {
  warmupIterations: 3,
  iterations: 10,
  minSampleTime: 500,
  parallel: false,
  metadata: {}
};

/**
 * Run a single benchmark
 */
export async function runBenchmark(
  name: string,
  suiteName: string,
  benchmark: Benchmark
): Promise<BenchmarkResult> {
  const options = { ...DEFAULT_OPTIONS, ...benchmark.options };
  const samples: number[] = [];
  let errors = 0;

  // Warmup iterations
  for (let i = 0; i < options.warmupIterations; i++) {
    try {
      await benchmark.setup?.();
      await benchmark.fn();
      await benchmark.teardown?.();
    } catch (error) {
      // Ignore warmup errors
    }
  }

  // Benchmark iterations
  let setupData: any = undefined;

  for (let i = 0; i < options.iterations; i++) {
    try {
      // Setup (run once before first iteration)
      if (i === 0 && benchmark.setup) {
        setupData = await benchmark.setup();
      }

      // Benchmark function
      const start = performance.now();
      await benchmark.fn(setupData);
      const end = performance.now();

      // Teardown
      await benchmark.teardown?.();

      // Record execution time (excluding setup/teardown)
      const executionTime = end - start;
      samples.push(executionTime);
    } catch (error) {
      errors++;
      if (errors === 1) {
        console.error(`Error in benchmark ${name}:`, error);
      }
    }
  }

  // If all iterations failed, return error result
  if (samples.length === 0) {
    return {
      name,
      suite: suiteName,
      iterations: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: 0,
      maxTime: 0,
      medianTime: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      opsPerSecond: 0,
      successRate: 0,
      error: 'All iterations failed',
      metadata: options.metadata,
      timestamp: new Date().toISOString()
    };
  }

  // Calculate statistics
  const stats = calculateStatistics(samples);
  const totalTime = stats.sum;
  const successRate = samples.length / options.iterations;

  return {
    name,
    suite: suiteName,
    iterations: samples.length,
    totalTime,
    avgTime: stats.mean,
    minTime: stats.min,
    maxTime: stats.max,
    medianTime: stats.median,
    p95: stats.p95,
    p99: stats.p99,
    stdDev: stats.stdDev,
    opsPerSecond: calculateOpsPerSecond(stats.mean),
    successRate,
    metadata: options.metadata,
    timestamp: new Date().toISOString()
  };
}

/**
 * Run a complete benchmark suite
 */
export async function runSuite(suite: BenchmarkSuite): Promise<SuiteResult> {
  console.log(`\n📊 Running suite: ${suite.name}`);
  console.log(`   ${suite.description}\n`);

  const startTime = performance.now();
  const results: BenchmarkResult[] = [];

  for (const benchmark of suite.benchmarks) {
    const result = await runBenchmark(benchmark.name, suite.name, benchmark);
    results.push(result);

    // Print quick summary
    if (result.error) {
      console.log(`   ❌ ${result.name}: ${result.error}`);
    } else {
      console.log(
        `   ✅ ${result.name}: ${formatTime(result.avgTime)} ` +
        `(${result.opsPerSecond.toFixed(0)} ops/sec)`
      );
    }
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  return {
    name: suite.name,
    description: suite.description,
    results,
    totalTime,
    timestamp: new Date().toISOString()
  };
}

/**
 * Run multiple benchmark suites
 */
export async function runAllSuites(
  suites: BenchmarkSuite[],
  filter?: string
): Promise<SuiteResult[]> {
  const filteredSuites = filter
    ? suites.filter(suite =>
        suite.name.includes(filter) ||
        suite.benchmarks.some(b => b.name.includes(filter))
      )
    : suites;

  if (filteredSuites.length === 0) {
    console.log(`No suites found matching filter: ${filter}`);
    return [];
  }

  const results: SuiteResult[] = [];

  for (const suite of filteredSuites) {
    const suiteResult = await runSuite(suite);
    results.push(suiteResult);
  }

  return results;
}
