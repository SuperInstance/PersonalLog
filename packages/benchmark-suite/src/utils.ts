/**
 * Utility functions for benchmark suite
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Save results to file
 */
export function saveResults(results: any, filepath: string): void {
  const dir = join(process.cwd(), 'results');
  if (!existsSync(dir)) {
    require('fs').mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filepath, JSON.stringify(results, null, 2));
}

/**
 * Load results from file
 */
export function loadResults(filepath: string): any {
  if (!existsSync(filepath)) {
    throw new Error(`Results file not found: ${filepath}`);
  }

  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

/**
 * Get system information
 */
export function getSystemInfo() {
  const os = require('os');
  const cpus = os.cpus();

  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuCores: cpus.length,
    cpuSpeed: cpus[0]?.speed || 0,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime()
  };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format duration to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Calculate percentage change
 */
export function calculateChange(current: number, baseline: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((current - baseline) / baseline) * 100;
}

/**
 * Determine if change is significant
 */
export function isSignificantChange(
  current: number,
  baseline: number,
  threshold: number = 0.1
): boolean {
  const change = Math.abs(calculateChange(current, baseline));
  return change > threshold * 100;
}

/**
 * Get performance status emoji
 */
export function getStatusEmoji(diffPercent: number): string {
  if (diffPercent < -10) return '🚀'; // Improved (faster)
  if (diffPercent > 10) return '⚠️'; // Regression (slower)
  return '➡️'; // Stable
}

/**
 * Get performance status text
 */
export function getStatusText(diffPercent: number): string {
  if (diffPercent < -10) return 'Improved';
  if (diffPercent > 10) return 'Regression';
  return 'Stable';
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measure memory usage
 */
export function measureMemory(): number {
  if (process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0;
}

/**
 * Validate benchmark result
 */
export function validateBenchmarkResult(result: any): boolean {
  return (
    result &&
    typeof result.name === 'string' &&
    typeof result.avgTime === 'number' &&
    typeof result.iterations === 'number' &&
    result.avgTime >= 0 &&
    result.iterations > 0
  );
}

/**
 * Aggregate multiple results
 */
export function aggregateResults(results: any[]): any {
  if (results.length === 0) {
    throw new Error('Cannot aggregate empty results array');
  }

  const first = results[0];
  const times = results.map(r => r.avgTime);

  return {
    ...first,
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    runs: results.length
  };
}
