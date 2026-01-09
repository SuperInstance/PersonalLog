# @superinstance/benchmark-suite

Comprehensive performance benchmarking suite for Phase 1 tools. Measure, compare, and track performance across GPU profiler, vector search, sentiment analysis, and integration scenarios.

## Features

- **Comprehensive Benchmarks**: 40+ benchmarks across 4 Phase 1 tools
- **Multiple Reporters**: Console, JSON, Markdown, and HTML output formats
- **Baseline Comparison**: Track performance changes over time
- **Regression Detection**: Automatic detection of performance degradations
- **Statistical Analysis**: Mean, median, percentiles, standard deviation
- **CLI & Programmatic API**: Use from command line or import in code

## Installation

```bash
npm install @superinstance/benchmark-suite
```

## Quick Start

### Command Line

Run all benchmarks:

```bash
npm run bench
```

Run specific benchmark suite:

```bash
npm run bench:gpu-profiler
npm run bench:vector-search
npm run bench:jepa-sentiment
npm run bench:integration
```

### Programmatic Usage

```typescript
import {
  runAllSuites,
  reportConsole,
  gpuProfilerBenchmarks,
  vectorSearchBenchmarks
} from '@superinstance/benchmark-suite';

// Run specific suites
const results = await runAllSuites([
  gpuProfilerBenchmarks,
  vectorSearchBenchmarks
]);

// Generate console report
reportConsole(results);
```

## CLI Usage

### Run All Benchmarks

```bash
npm run bench
```

### Filter Benchmarks

```bash
npm run bench -- --filter "GPU"
```

### Change Output Format

```bash
# Console (default)
npm run bench -- --reporter console

# JSON output
npm run bench -- --reporter json --output results.json

# Markdown report
npm run bench -- --reporter markdown --output BENCHMARKS.md

# HTML dashboard
npm run bench -- --reporter html --output benchmarks.html
```

### Save Baseline

```bash
npm run bench -- --save baseline
```

### Compare with Baseline

```bash
npm run bench:compare
```

### Detailed Statistics

```bash
npm run bench -- --detailed
```

## Benchmark Suites

### 1. GPU Profiler Benchmarks

Measures GPU profiling overhead and accuracy:

- **Profiler Initialization**: Time to initialize profiler
- **Start/Stop Overhead**: Overhead of control operations
- **Metrics Collection**: Time to collect metrics
- **Continuous Monitoring**: 100ms continuous monitoring
- **Memory Tracking**: Memory allocation tracking overhead
- **High-Frequency Sampling**: 60Hz metrics collection
- **Metrics Export**: Export collected metrics

**Key Metrics**:
- Initialization time
- Overhead percentage
- Sampling rate capability
- Memory footprint

### 2. Vector Search Benchmarks

Measures vector search performance across dataset sizes:

- **Small Dataset (1K)**: CPU search through 1K vectors
- **Medium Dataset (10K)**: CPU search through 10K vectors
- **Large Dataset (100K)**: CPU search through 100K vectors
- **Batch Search**: 100 queries in batch
- **Real-time Streaming**: 1000 streaming queries
- **Vector Addition**: Adding 1000 vectors to store
- **Cosine Similarity**: Single similarity calculation
- **High-Dimensional**: 1536-dim vectors (OpenAI ada-002)

**Key Metrics**:
- Query latency (ms)
- Throughput (queries/sec)
- Dataset size impact
- Dimension impact

### 3. JEPA Sentiment Benchmarks

Measures sentiment analysis performance:

- **Single Message**: Analyze one message
- **Short Text**: 50-word text analysis
- **Long Text**: 500-word text analysis
- **Very Long Text**: 2000-word text analysis
- **Batch (10)**: 10 messages in batch
- **Batch (100)**: 100 messages in batch
- **Batch (1000)**: 1000 messages in batch
- **Real-time Streaming**: 60 FPS analysis
- **High-Throughput**: Max messages/second
- **Emoji-Rich**: Emoji-heavy text
- **Multi-language**: Mixed language text

**Key Metrics**:
- Messages per second
- Average latency
- P99 latency
- Streaming frame rate

### 4. Integration Benchmarks

Measures tool synergy performance:

- **Research Kit Sequential**: Baseline sequential execution
- **Research Kit Parallel**: Optimized parallel execution
- **Cost Optimization**: Cascade Router cost strategy
- **Speed Optimization**: Cascade Router speed strategy
- **Quality Optimization**: Cascade Router quality strategy
- **AI/ML Workflow**: Combined JEPA + Vector Search
- **GPU Sequential vs Parallel**: Parallel GPU operations
- **End-to-End Pipeline**: Complete data pipeline
- **Multi-Tool Coordination**: 3-tool coordination
- **Memory Efficiency**: Large dataset processing

**Key Metrics**:
- Total execution time
- Speedup ratio
- Cost reduction
- Memory usage

## Output Formats

### Console Reporter

Colorized terminal output with real-time progress:

```
╔════════════════════════════════════════════════════════════╗
║          Performance Benchmark Results                   ║
╚════════════════════════════════════════════════════════════╝

📊 GPU Profiler
   Total time: 1.23s
  ─────────────────────────────────────────────────────────────
  ✅ Profiler Initialization: 10.50ms (95.24 ops/sec)
  ✅ Start/Stop Overhead: 1.20ms (833.33 ops/sec)
  ...
```

### JSON Reporter

Machine-readable JSON with full dataset:

```json
{
  "timestamp": "2026-01-08T12:00:00.000Z",
  "suites": [
    {
      "name": "GPU Profiler",
      "results": [...]
    }
  ],
  "environment": {
    "nodeVersion": "v20.0.0",
    "platform": "linux",
    "arch": "x64",
    "cpuCores": 8,
    "totalMemory": 17179869184
  }
}
```

### Markdown Reporter

GitHub-friendly tables for documentation:

```markdown
# Performance Benchmark Results

| Suite | Benchmarks | Total Time |
|-------|------------|------------|
| GPU Profiler | 7 | 1.23s |
| Vector Search | 8 | 2.45s |

## GPU Profiler

| Benchmark | Avg Time | Min | Max | Median | Std Dev | Ops/sec |
|-----------|----------|-----|-----|--------|---------|---------|
| Profiler Initialization | 10.50ms | 9.80ms | 11.20ms | 10.45ms | 0.50ms | 95.24 |
```

### HTML Reporter

Interactive dashboard with visualizations:

- Summary cards with key metrics
- Color-coded performance bars
- Responsive design
- Embedded charts
- Historical trend comparison

## Baseline Management

### Create Baseline

```bash
npm run bench -- --save baseline
```

Saves current results to `./results/baseline.json`

### Compare with Baseline

```bash
npm run bench:compare
```

Shows performance changes with color coding:

- 🚀 **Improved** (>10% faster)
- ⚠️ **Regression** (>10% slower)
- ➡️ **Stable** (<10% change)

### Custom Baseline Path

```bash
npm run bench:compare -- --baseline ./custom-baseline.json
```

## Statistical Metrics

All benchmarks include comprehensive statistics:

- **Mean**: Average execution time
- **Min/Max**: Fastest and slowest iterations
- **Median**: 50th percentile
- **P95**: 95th percentile (95% of iterations faster than this)
- **P99**: 99th percentile (99% of iterations faster than this)
- **Std Dev**: Standard deviation (consistency measure)
- **Ops/Second**: Throughput measurement

## API Reference

### Main Functions

#### `runAllSuites(suites, filter?)`

Run multiple benchmark suites.

```typescript
const results = await runAllSuites([
  gpuProfilerBenchmarks,
  vectorSearchBenchmarks
], 'GPU');
```

#### `reportConsole(results, options?)`

Generate console report.

```typescript
reportConsole(results, {
  detailed: true,
  compare: true,
  baseline: baselineData
});
```

#### `reportJson(results, options?)`

Generate JSON report.

```typescript
const report = reportJson(results, {
  output: './results/benchmarks.json'
});
```

#### `reportMarkdown(results, options?)`

Generate Markdown report.

```typescript
const markdown = reportMarkdown(results, {
  output: './BENCHMARKS.md'
});
```

#### `reportHtml(results, options?)`

Generate HTML dashboard.

```typescript
const html = reportHtml(results, {
  output: './benchmarks.html'
});
```

### Types

#### `BenchmarkSuite`

```typescript
interface BenchmarkSuite {
  name: string;
  description: string;
  benchmarks: Benchmark[];
}
```

#### `Benchmark`

```typescript
interface Benchmark {
  name: string;
  description?: string;
  fn: () => Promise<void> | void;
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
  options?: BenchmarkOptions;
}
```

#### `BenchmarkResult`

```typescript
interface BenchmarkResult {
  name: string;
  suite: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  medianTime: number;
  p95: number;
  p99: number;
  stdDev: number;
  opsPerSecond: number;
  successRate: number;
  error?: string;
  timestamp: string;
}
```

## Performance Goals

### GPU Profiler

- **Overhead**: < 1% of profiled application
- **Sampling Rate**: Capable of 60 FPS
- **Memory**: < 10MB additional memory
- **Accuracy**: Within 5% of actual GPU metrics

### Vector Search

- **Small Datasets (1K)**: < 1ms per query
- **Medium Datasets (10K)**: < 10ms per query
- **Large Datasets (100K)**: < 100ms per query
- **Throughput**: > 100 queries/second (10K dataset)

### JEPA Sentiment

- **Single Message**: < 1ms
- **Batch (100)**: < 100ms total (< 1ms per message)
- **Streaming**: 60 FPS capable (< 16.67ms per frame)
- **Throughput**: > 1000 messages/second

### Integration

- **Parallel Speedup**: > 3x over sequential
- **Cost Reduction**: > 50% with Cascade Router
- **Memory Efficiency**: < 100MB for 10K items
- **End-to-End Latency**: < 500ms for typical workflow

## Examples

### Create Custom Benchmark Suite

```typescript
import { BenchmarkSuite } from '@superinstance/benchmark-suite';

const mySuite: BenchmarkSuite = {
  name: 'My Custom Benchmarks',
  description: 'Benchmarks for my custom tool',

  benchmarks: [
    {
      name: 'Fast Operation',
      fn: () => {
        // Benchmark code here
      }
    },
    {
      name: 'Operation with Setup',
      setup: () => {
        // Setup code (runs before each iteration)
        return { data: [1, 2, 3] };
      },
      fn: ({ data }) => {
        // Benchmark using setup data
        data.forEach(x => x * 2);
      }
    }
  ]
};

export { mySuite };
```

### Run Benchmarks Programmatically

```typescript
import {
  runAllSuites,
  reportConsole,
  reportJson,
  mySuite
} from '@superinstance/benchmark-suite';

async function main() {
  // Run benchmarks
  const results = await runAllSuites([mySuite]);

  // Generate reports
  reportConsole(results);
  reportJson(results, { output: './results.json' });

  // Access individual results
  for (const suite of results) {
    for (const benchmark of suite.results) {
      console.log(`${benchmark.name}: ${benchmark.avgTime}ms`);
    }
  }
}

main();
```

### Compare Performance Over Time

```bash
# Create baseline after optimization
npm run bench -- --save baseline

# Make changes...

# Compare new performance
npm run bench:compare
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Benchmarks

on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build

      - name: Run benchmarks
        run: npm run bench -- --reporter json --output results.json

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: results.json
```

### Performance Regression Detection

```yaml
- name: Check for regressions
  run: |
    npm run bench -- --reporter json --output new-results.json
    npm run bench:compare
    # Fail if regression detected
    if [ $? -ne 0 ]; then
      echo "Performance regression detected!"
      exit 1
    fi
```

## Troubleshooting

### Inconsistent Results

- Ensure warmup iterations are sufficient (default: 3)
- Increase iteration count for more stable results
- Close other applications to reduce system load
- Run multiple times and average results

### Out of Memory Errors

- Reduce dataset size in benchmarks
- Run suites individually instead of all at once
- Increase Node.js memory limit: `node --max-old-space-size=4096`

### WebGPU Not Available

Some benchmarks mock WebGPU for Node.js environments. For accurate WebGPU benchmarks:
- Run in browser environment with WebGPU support
- Use a browser-based test runner
- Check GPU availability before running benchmarks

## Contributing

To add new benchmarks:

1. Create benchmark file in `src/benchmarks/`
2. Implement `BenchmarkSuite` interface
3. Export suite from `src/benchmarks/`
4. Import in `src/cli.ts`
5. Add to documentation

## License

MIT

## Repository

https://github.com/SuperInstance/benchmark-suite

## Related Packages

- [@superinstance/browser-gpu-profiler](https://github.com/SuperInstance/browser-gpu-profiler)
- [@superinstance/in-browser-vector-search](https://github.com/SuperInstance/In-Browser-Vector-Search)
- [@superinstance/jepa-real-time-sentiment-analysis](https://github.com/SuperInstance/JEPA-Real-Time-Sentiment-Analysis)
- [@superinstance/integration-examples](https://github.com/SuperInstance/integration-examples)

---

Generated by @superinstance/benchmark-suite
