/**
 * Statistical utilities for benchmark analysis
 */

export interface SampleData {
  samples: number[];
  count: number;
  sum: number;
  mean: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  p95: number;
  p99: number;
}

/**
 * Calculate statistical metrics from sample data
 */
export function calculateStatistics(samples: number[]): SampleData {
  if (samples.length === 0) {
    throw new Error('Cannot calculate statistics on empty array');
  }

  const count = samples.length;
  const sum = samples.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  // Calculate variance
  const squaredDiffs = samples.map(x => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;

  // Calculate standard deviation
  const stdDev = Math.sqrt(variance);

  // Calculate min/max
  const min = Math.min(...samples);
  const max = Math.max(...samples);

  // Calculate median
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Calculate percentiles
  const p95Index = Math.floor(count * 0.95);
  const p99Index = Math.floor(count * 0.99);
  const p95 = sorted[p95Index];
  const p99 = sorted[p99Index];

  return {
    samples,
    count,
    sum,
    mean,
    variance,
    stdDev,
    min,
    max,
    median,
    p95,
    p99
  };
}

/**
 * Calculate operations per second
 */
export function calculateOpsPerSecond(avgTimeMs: number): number {
  if (avgTimeMs === 0) return Infinity;
  return 1000 / avgTimeMs;
}

/**
 * Calculate percentage difference between two values
 */
export function calculatePercentageDiff(current: number, baseline: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((current - baseline) / baseline) * 100;
}

/**
 * Determine if a performance difference is statistically significant
 * (simple heuristic using coefficient of variation)
 */
export function isSignificantDifference(
  current: SampleData,
  baseline: SampleData,
  threshold: number = 0.1
): boolean {
  const currentCV = current.stdDev / current.mean;
  const baselineCV = baseline.stdDev / baseline.mean;

  // If either coefficient of variation is high, difference might not be significant
  return currentCV < threshold && baselineCV < threshold;
}

/**
 * Calculate throughput (operations per second)
 */
export function calculateThroughput(totalOps: number, totalTimeMs: number): number {
  if (totalTimeMs === 0) return Infinity;
  return (totalOps / totalTimeMs) * 1000;
}

/**
 * Calculate speedup ratio
 */
export function calculateSpeedup(baselineTime: number, currentTime: number): number {
  if (currentTime === 0) return Infinity;
  return baselineTime / currentTime;
}

/**
 * Format time with appropriate units
 */
export function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Format percentage
 */
export function formatPercentage(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}
