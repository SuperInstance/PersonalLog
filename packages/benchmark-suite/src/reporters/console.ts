/**
 * Console reporter - prints results to terminal with colors
 */

import type { SuiteResult, ComparisonResult, ReporterOptions } from '../types.js';
import { formatTime, formatNumber, formatPercentage } from '../statistics.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Print benchmark results to console
 */
export function reportConsole(
  results: SuiteResult[],
  options: ReporterOptions = {}
): void {
  console.clear();
  console.log(colors.bright + colors.cyan);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Performance Benchmark Results                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  for (const suite of results) {
    printSuiteResults(suite, options);
  }

  if (options.compare && options.baseline) {
    printComparison(results, options.baseline as any);
  }

  console.log(colors.bright);
  console.log('\n' + '─'.repeat(64));
  console.log(colors.reset);
}

/**
 * Print results for a single suite
 */
function printSuiteResults(suite: SuiteResult, options: ReporterOptions): void {
  console.log(colors.bright + colors.blue);
  console.log(`\n📊 ${suite.name}`);
  console.log(colors.dim + `   Total time: ${formatTime(suite.totalTime)}` + colors.reset);
  console.log('  ' + '─'.repeat(60));

  for (const result of suite.results) {
    printBenchmarkResult(result, options);
  }
}

/**
 * Print a single benchmark result
 */
function printBenchmarkResult(result: any, options: ReporterOptions): void {
  if (result.error) {
    console.log(colors.red + `  ❌ ${result.name}` + colors.reset);
    console.log(colors.dim + `     Error: ${result.error}` + colors.reset);
    return;
  }

  const successRate = (result.successRate * 100).toFixed(1);

  console.log(colors.bright + colors.white + `  ${result.name}` + colors.reset);
  console.log(`    Iterations:     ${colors.cyan}${formatNumber(result.iterations)}` + colors.reset);
  console.log(`    Avg time:       ${colors.yellow}${formatTime(result.avgTime)}` + colors.reset);
  console.log(`    Min time:       ${colors.green}${formatTime(result.minTime)}` + colors.reset);
  console.log(`    Max time:       ${colors.red}${formatTime(result.maxTime)}` + colors.reset);
  console.log(`    Median:         ${colors.cyan}${formatTime(result.medianTime)}` + colors.reset);
  console.log(`    Std Dev:        ${colors.dim}${formatTime(result.stdDev)}` + colors.reset);

  if (options.detailed) {
    console.log(`    P95:            ${colors.dim}${formatTime(result.p95)}` + colors.reset);
    console.log(`    P99:            ${colors.dim}${formatTime(result.p99)}` + colors.reset);
  }

  console.log(`    Throughput:     ${colors.green}${formatNumber(result.opsPerSecond)} ops/sec` + colors.reset);
  console.log(`    Success rate:   ${successRate}%`);

  if (result.metadata && Object.keys(result.metadata).length > 0) {
    console.log(`    Metadata:       ${colors.dim}${JSON.stringify(result.metadata)}` + colors.reset);
  }

  console.log('');
}

/**
 * Print comparison with baseline
 */
function printComparison(
  current: SuiteResult[],
  baseline: any
): void {
  console.log(colors.bright + colors.yellow);
  console.log('\n📈 Comparison with Baseline');
  console.log('  ' + '─'.repeat(60) + colors.reset);

  for (const currentSuite of current) {
    const baselineSuite = baseline.suites.find((s: any) => s.name === currentSuite.name);
    if (!baselineSuite) continue;

    for (const currentResult of currentSuite.results) {
      const baselineResult = baselineSuite.results.find((r: any) => r.name === currentResult.name);
      if (!baselineResult) continue;

      const diffPercent = ((currentResult.avgTime - baselineResult.avgTime) / baselineResult.avgTime) * 100;
      const isFaster = diffPercent < 0;
      const isRegression = diffPercent > 10;
      const isImprovement = diffPercent < -10;

      const color = isRegression ? colors.red : isImprovement ? colors.green : colors.yellow;
      const icon = isRegression ? '⚠️' : isImprovement ? '🚀' : '➡️';

      console.log(
        `  ${icon} ${currentResult.name}: ` +
        color + formatPercentage(diffPercent) + colors.reset
      );
    }
  }
}
