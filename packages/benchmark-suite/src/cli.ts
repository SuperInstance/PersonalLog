#!/usr/bin/env node
/**
 * Benchmark CLI - Command-line interface for running benchmarks
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as os from 'os';
import { runAllSuites } from './runner.js';
import { reportConsole } from './reporters/console.js';
import { reportJson } from './reporters/json.js';
import { reportMarkdown, reportComparisonMarkdown } from './reporters/markdown.js';
import { reportHtml } from './reporters/html.js';
import type { BaselineData, ReporterType } from './types.js';

// Import benchmark suites
import { gpuProfilerBenchmarks } from './benchmarks/gpu-profiler.bench.js';
import { vectorSearchBenchmarks } from './benchmarks/vector-search.bench.js';
import { jepaSentimentBenchmarks } from './benchmarks/jepa-sentiment.bench.js';
import { integrationBenchmarks } from './benchmarks/integration.bench.js';

const program = new Command();

program
  .name('benchmark-suite')
  .description('Performance benchmarking suite for Phase 1 tools')
  .version('1.0.0');

program
  .command('run', { isDefault: true })
  .description('Run benchmarks')
  .option('-f, --filter <pattern>', 'Filter benchmarks by name pattern')
  .option('-r, --reporter <type>', 'Output reporter type (console|json|markdown|html)', 'console')
  .option('-o, --output <file>', 'Output file path')
  .option('-c, --compare', 'Compare with baseline', false)
  .option('-b, --baseline <file>', 'Baseline file path', './results/baseline.json')
  .option('-d, --detailed', 'Show detailed statistics', false)
  .action(async (options) => {
    // Get all benchmark suites
    const allSuites = [
      gpuProfilerBenchmarks,
      vectorSearchBenchmarks,
      jepaSentimentBenchmarks,
      integrationBenchmarks
    ];

    console.log('🚀 Starting benchmark suite...\n');

    // Run benchmarks
    const results = await runAllSuites(allSuites, options.filter);

    if (results.length === 0) {
      console.log('No results to report.');
      process.exit(0);
    }

    // Load baseline if comparing
    let baseline: BaselineData | undefined;
    if (options.compare && existsSync(options.baseline)) {
      try {
        baseline = JSON.parse(readFileSync(options.baseline, 'utf-8'));
      } catch (error) {
        console.error(`Failed to load baseline: ${error}`);
      }
    }

    // Generate reports
    const reporterOptions = {
      output: options.output,
      detailed: options.detailed,
      compare: options.compare,
      baseline
    };

    switch (options.reporter) {
      case 'console':
        reportConsole(results, reporterOptions);
        break;
      case 'json':
        reportJson(results, reporterOptions);
        break;
      case 'markdown':
        if (baseline) {
          reportComparisonMarkdown(results, baseline, reporterOptions);
        } else {
          reportMarkdown(results, reporterOptions);
        }
        break;
      case 'html':
        reportHtml(results, reporterOptions);
        break;
      default:
        console.error(`Unknown reporter type: ${options.reporter}`);
        process.exit(1);
    }

    // Save as baseline if requested
    if (options.save === 'baseline') {
      const baselineData: BaselineData = {
        name: 'baseline',
        suites: results,
        timestamp: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuCores: os.cpus().length,
          totalMemory: os.totalmem()
        }
      };

      const baselineDir = join(process.cwd(), 'results');
      if (!existsSync(baselineDir)) {
        mkdirSync(baselineDir, { recursive: true });
      }

      writeFileSync(
        join(baselineDir, 'baseline.json'),
        JSON.stringify(baselineData, null, 2)
      );

      console.log('\n✅ Baseline saved to ./results/baseline.json');
    }

    console.log('\n✅ Benchmarks complete!');
  });

program
  .command('save')
  .description('Save current results as baseline')
  .action(async () => {
    const allSuites = [
      gpuProfilerBenchmarks,
      vectorSearchBenchmarks,
      jepaSentimentBenchmarks,
      integrationBenchmarks
    ];

    console.log('🚀 Running benchmarks to save as baseline...\n');

    const results = await runAllSuites(allSuites);

    const baselineData: BaselineData = {
      name: 'baseline',
      suites: results,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCores: os.cpus().length,
        totalMemory: os.totalmem()
      }
    };

    const baselineDir = join(process.cwd(), 'results');
    if (!existsSync(baselineDir)) {
      mkdirSync(baselineDir, { recursive: true });
    }

    writeFileSync(
      join(baselineDir, 'baseline.json'),
      JSON.stringify(baselineData, null, 2)
    );

    console.log('\n✅ Baseline saved to ./results/baseline.json');
  });

program
  .command('compare')
  .description('Compare current results with baseline')
  .option('-b, --baseline <file>', 'Baseline file path', './results/baseline.json')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    if (!existsSync(options.baseline)) {
      console.error(`Baseline file not found: ${options.baseline}`);
      console.log('Run "npm run bench -- --save baseline" to create a baseline.');
      process.exit(1);
    }

    const baseline: BaselineData = JSON.parse(readFileSync(options.baseline, 'utf-8'));

    const allSuites = [
      gpuProfilerBenchmarks,
      vectorSearchBenchmarks,
      jepaSentimentBenchmarks,
      integrationBenchmarks
    ];

    console.log('🚀 Running benchmarks to compare with baseline...\n');

    const results = await runAllSuites(allSuites);

    // Generate comparison report
    reportComparisonMarkdown(results, baseline, { output: options.output });
    reportConsole(results, { compare: true, baseline });
  });

program
  .command('report')
  .description('Generate reports from existing results')
  .option('-i, --input <file>', 'Input results file', './results/results.json')
  .option('-o, --output <file>', 'Output file path')
  .option('-r, --reporter <type>', 'Output reporter type (console|json|markdown|html)', 'console')
  .action((options) => {
    if (!existsSync(options.input)) {
      console.error(`Results file not found: ${options.input}`);
      process.exit(1);
    }

    const results = JSON.parse(readFileSync(options.input, 'utf-8'));

    const reporterOptions = { output: options.output };

    switch (options.reporter) {
      case 'console':
        reportConsole(results, reporterOptions);
        break;
      case 'json':
        reportJson(results, reporterOptions);
        break;
      case 'markdown':
        reportMarkdown(results, reporterOptions);
        break;
      case 'html':
        reportHtml(results, reporterOptions);
        break;
      default:
        console.error(`Unknown reporter type: ${options.reporter}`);
        process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);
