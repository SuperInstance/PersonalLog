# Benchmark Suite Examples

This document provides practical examples of using the benchmark suite.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Filtering Benchmarks](#filtering-benchmarks)
- [Generating Reports](#generating-reports)
- [Baseline Comparison](#baseline-comparison)
- [CI/CD Integration](#cicd-integration)
- [Custom Benchmarks](#custom-benchmarks)

## Basic Usage

### Run All Benchmarks

```bash
npm run bench
```

This runs all benchmark suites and displays results in the console.

### Run Specific Suite

```bash
# Run only GPU profiler benchmarks
npm run bench:gpu-profiler

# Run only vector search benchmarks
npm run bench:vector-search

# Run only sentiment analysis benchmarks
npm run bench:jepa-sentiment

# Run only integration benchmarks
npm run bench:integration
```

## Filtering Benchmarks

### Filter by Keyword

```bash
# Run only benchmarks containing "GPU"
node dist/cli.js --filter "GPU"

# Run only benchmarks containing "search"
node dist/cli.js --filter "search"

# Run only benchmarks containing "batch"
node dist/cli.js --filter "batch"
```

## Generating Reports

### JSON Report

```bash
# Save JSON report to file
node dist/cli.js --reporter json --output results.json

# View the report
cat results.json
```

Output example:
```json
{
  "timestamp": "2026-01-08T12:00:00.000Z",
  "suites": [
    {
      "name": "GPU Profiler",
      "description": "Performance benchmarks for GPU profiling operations",
      "results": [
        {
          "name": "Profiler Initialization",
          "avgTime": 10.39,
          "opsPerSecond": 96.24,
          ...
        }
      ]
    }
  ],
  "environment": {
    "nodeVersion": "v20.0.0",
    "platform": "linux",
    "arch": "x64"
  }
}
```

### Markdown Report

```bash
# Generate Markdown report
node dist/cli.js --reporter markdown --output BENCHMARKS.md
```

This creates a GitHub-friendly markdown table:

```markdown
# Performance Benchmark Results

| Suite | Benchmarks | Total Time |
|-------|------------|------------|
| GPU Profiler | 7 | 1.23s |
```

### HTML Report

```bash
# Generate HTML dashboard
node dist/cli.js --reporter html --output benchmarks.html
```

Open `benchmarks.html` in your browser to see an interactive dashboard.

### Console Report with Details

```bash
# Show detailed statistics in console
node dist/cli.js --detailed
```

## Baseline Comparison

### Create Baseline

```bash
# Save current results as baseline
node dist/cli.js save
```

This creates `./results/baseline.json` with current performance metrics.

### Compare with Baseline

```bash
# Compare current performance with baseline
node dist/cli.js compare
```

Output shows performance changes:
- 🚀 **Improved**: >10% faster
- ⚠️ **Regression**: >10% slower
- ➡️ **Stable**: <10% change

### Custom Baseline Path

```bash
# Save baseline to custom location
node dist/cli.js save --baseline ./custom/baseline.json

# Compare with custom baseline
node dist/cli.js compare --baseline ./custom/baseline.json
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Benchmarks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run benchmarks
        run: npm run bench -- --reporter json --output results.json

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: results.json

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('results.json', 'utf8'));

            // Create summary
            let summary = '## Benchmark Results\n\n';
            for (const suite of results.suites) {
              summary += `### ${suite.name}\n`;
              for (const result of suite.results) {
                summary += `- ${result.name}: ${result.avgTime.toFixed(2)}ms\n`;
              }
              summary += '\n';
            }

            // Comment on PR
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: summary
            });
```

### Performance Regression Detection

```yaml
- name: Check for regressions
  run: |
    # Create baseline if it doesn't exist
    if [ ! -f baseline.json ]; then
      npm run bench -- --reporter json --output baseline.json
    fi

    # Run current benchmarks
    npm run bench -- --reporter json --output current.json

    # Compare (implement comparison logic)
    node compare-benchmarks.js baseline.json current.json
```

## Custom Benchmarks

### Create Custom Benchmark Suite

```typescript
// my-benchmarks.ts
import type { BenchmarkSuite } from '@superinstance/benchmark-suite';

const myCustomSuite: BenchmarkSuite = {
  name: 'My Custom Benchmarks',
  description: 'Benchmarks for my custom tool',

  benchmarks: [
    {
      name: 'Fast Operation',
      fn: () => {
        // Code to benchmark
        Math.sqrt(12345);
      }
    },
    {
      name: 'Operation with Setup',
      setup: () => {
        // Return setup data
        return { data: [1, 2, 3, 4, 5] };
      },
      fn: (setupData) => {
        // Use setup data in benchmark
        setupData.data.forEach(x => Math.sqrt(x));
      }
    },
    {
      name: 'Async Operation',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  ]
};

export { myCustomSuite };
```

### Run Custom Benchmarks

```typescript
// run-custom.ts
import { runAllSuites, reportConsole } from '@superinstance/benchmark-suite';
import { myCustomSuite } from './my-benchmarks.js';

async function main() {
  const results = await runAllSuites([myCustomSuite]);
  reportConsole(results);
}

main();
```

## Performance Analysis

### Analyze Results

```typescript
import { loadResults, calculateStatistics } from '@superinstance/benchmark-suite';

const results = loadResults('./results.json');

for (const suite of results.suites) {
  console.log(`\n${suite.name}`);

  for (const benchmark of suite.results) {
    console.log(`  ${benchmark.name}:`);
    console.log(`    Avg: ${benchmark.avgTime.toFixed(2)}ms`);
    console.log(`    Min: ${benchmark.minTime.toFixed(2)}ms`);
    console.log(`    Max: ${benchmark.maxTime.toFixed(2)}ms`);
    console.log(`    StdDev: ${benchmark.stdDev.toFixed(2)}ms`);
    console.log(`    Throughput: ${benchmark.opsPerSecond.toFixed(0)} ops/sec`);
  }
}
```

### Export to CSV

```typescript
import { writeFileSync } from 'fs';

function exportToCSV(results, filename) {
  let csv = 'Suite,Benchmark,AvgTime,MinTime,MaxTime,OpsPerSecond\n';

  for (const suite of results.suites) {
    for (const benchmark of suite.results) {
      csv += `${suite.name},${benchmark.name},` +
             `${benchmark.avgTime},${benchmark.minTime},${benchmark.maxTime},` +
             `${benchmark.opsPerSecond}\n`;
    }
  }

  writeFileSync(filename, csv);
}

exportToCSV(results, 'benchmarks.csv');
```

## Best Practices

### 1. Consistent Environment

Always run benchmarks in consistent conditions:

```bash
# Close other applications
# Run multiple times
for i in {1..5}; do
  npm run bench -- --reporter json --output run-$i.json
done
```

### 2. Warm-up Iterations

The suite automatically includes warm-up iterations. Results exclude warm-up time.

### 3. Statistical Significance

Use the default 10 iterations for stable results. Increase for critical measurements:

```typescript
{
  name: 'Critical Operation',
  options: {
    iterations: 100,  // More iterations
    warmupIterations: 10  // More warmup
  },
  fn: () => { /* ... */ }
}
```

### 4. Monitor Baselines

Track performance over time:

```bash
# Before optimization
node dist/cli.js save --baseline before-optimization.json

# Make changes...

# After optimization
node dist/cli.js compare --baseline before-optimization.json
```

### 5. CI/CD Gates

Add performance gates to prevent regressions:

```yaml
- name: Performance gate
  run: |
    node dist/cli.js compare
    if [ $? -ne 0 ]; then
      echo "Performance regression detected!"
      exit 1
    fi
```

## Troubleshooting

### Inconsistent Results

- Close other applications
- Increase iteration count
- Run multiple times
- Check system load

### Memory Issues

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run bench
```

### Slow Benchmarks

Use filtering to run specific benchmarks:

```bash
# Run only specific test
node dist/cli.js --filter "Exact Benchmark Name"
```

## Additional Resources

- [Main README](./README.md)
- [API Documentation](./API.md)
- [Contributing Guide](./CONTRIBUTING.md)
