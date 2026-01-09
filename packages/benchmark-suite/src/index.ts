/**
 * Benchmark Suite - Main entry point
 *
 * Exports all benchmark functionality for programmatic use
 */

export { runBenchmark, runSuite, runAllSuites } from './runner.js';
export { reportConsole } from './reporters/console.js';
export { reportJson } from './reporters/json.js';
export { reportMarkdown, reportComparisonMarkdown } from './reporters/markdown.js';
export { reportHtml } from './reporters/html.js';

export * from './types.js';
export * from './statistics.js';

// Export benchmark suites
export { gpuProfilerBenchmarks } from './benchmarks/gpu-profiler.bench.js';
export { vectorSearchBenchmarks } from './benchmarks/vector-search.bench.js';
export { jepaSentimentBenchmarks } from './benchmarks/jepa-sentiment.bench.js';
export { integrationBenchmarks } from './benchmarks/integration.bench.js';
