/**
 * Markdown reporter - generates GitHub-friendly markdown tables
 */

import type { SuiteResult, ReporterOptions } from '../types.js';
import { writeFileSync } from 'fs';
import { formatTime, formatNumber, formatPercentage } from '../statistics.js';

/**
 * Generate markdown report
 */
export function reportMarkdown(
  results: SuiteResult[],
  options: ReporterOptions = {}
): string {
  const lines: string[] = [];

  // Header
  lines.push('# Performance Benchmark Results\n');
  lines.push(`**Generated:** ${new Date().toISOString()}\n`);
  lines.push(`**Environment:** ${process.platform} ${process.arch} | Node ${process.version}\n`);

  // Summary
  lines.push('## Summary\n');
  lines.push('| Suite | Benchmarks | Total Time |');
  lines.push('|-------|------------|------------|');

  for (const suite of results) {
    lines.push(
      `| ${suite.name} | ${suite.results.length} | ${formatTime(suite.totalTime)} |`
    );
  }

  lines.push('');

  // Detailed results
  for (const suite of results) {
    lines.push(`## ${suite.name}\n`);
    lines.push(suite.description || '');
    lines.push('');

    lines.push('### Results\n');
    lines.push('| Benchmark | Avg Time | Min | Max | Median | Std Dev | Ops/sec | Success Rate |');
    lines.push('|-----------|----------|-----|-----|--------|---------|---------|--------------|');

    for (const result of suite.results) {
      if (result.error) {
        lines.push(
          `| ${result.name} | ❌ Error | - | - | - | - | - | - |`
        );
        lines.push(`| *${result.error}* | | | | | | | |`);
      } else {
        const successRate = (result.successRate * 100).toFixed(1) + '%';
        lines.push(
          `| ${result.name} | ${formatTime(result.avgTime)} | ` +
          `${formatTime(result.minTime)} | ${formatTime(result.maxTime)} | ` +
          `${formatTime(result.medianTime)} | ${formatTime(result.stdDev)} | ` +
          `${formatNumber(result.opsPerSecond)} | ${successRate} |`
        );
      }
    }

    lines.push('');
  }

  const markdown = lines.join('\n');

  if (options.output) {
    writeFileSync(options.output, markdown);
    console.log(`\n📄 Markdown report saved to: ${options.output}`);
  }

  return markdown;
}

/**
 * Generate comparison markdown
 */
export function reportComparisonMarkdown(
  current: SuiteResult[],
  baseline: any,
  options: ReporterOptions = {}
): string {
  const lines: string[] = [];

  lines.push('# Performance Comparison Report\n');
  lines.push(`**Generated:** ${new Date().toISOString()}\n`);
  lines.push(`**Baseline:** ${baseline.timestamp}\n`);

  lines.push('## Summary of Changes\n');
  lines.push('| Benchmark | Current | Baseline | Difference | Status |');
  lines.push('|-----------|---------|----------|------------|--------|');

  for (const currentSuite of current) {
    const baselineSuite = baseline.suites.find((s: any) => s.name === currentSuite.name);
    if (!baselineSuite) continue;

    for (const currentResult of currentSuite.results) {
      const baselineResult = baselineSuite.results.find((r: any) => r.name === currentResult.name);
      if (!baselineResult) continue;

      const diffPercent = ((currentResult.avgTime - baselineResult.avgTime) / baselineResult.avgTime) * 100;
      const isRegression = diffPercent > 10;
      const isImprovement = diffPercent < -10;

      const status = isRegression ? '⚠️ Regression' : isImprovement ? '🚀 Improved' : '➡️ Stable';
      const diff = formatPercentage(diffPercent);

      lines.push(
        `| ${currentResult.name} | ` +
        `${formatTime(currentResult.avgTime)} | ` +
        `${formatTime(baselineResult.avgTime)} | ` +
        `${diff} | ${status} |`
      );
    }
  }

  lines.push('');

  const markdown = lines.join('\n');

  if (options.output) {
    writeFileSync(options.output, markdown);
    console.log(`\n📄 Comparison report saved to: ${options.output}`);
  }

  return markdown;
}
