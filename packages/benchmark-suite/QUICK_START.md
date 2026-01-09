# Benchmark Suite Quick Start

## Installation

```bash
cd /mnt/c/users/casey/personallog/packages/benchmark-suite
npm install
npm run build
```

## Run Benchmarks

### All Benchmarks
```bash
npm run bench
```

### Specific Suite
```bash
npm run bench:gpu-profiler
npm run bench:vector-search
npm run bench:jepa-sentiment
npm run bench:integration
```

### Filter by Name
```bash
node dist/cli.js --filter "GPU"
node dist/cli.js --filter "search"
```

## Generate Reports

### Console (Default)
```bash
npm run bench -- --detailed
```

### JSON
```bash
npm run bench -- --reporter json --output results.json
```

### Markdown
```bash
npm run bench -- --reporter markdown --output BENCHMARKS.md
```

### HTML
```bash
npm run bench -- --reporter html --output benchmarks.html
```

## Baseline Management

### Save Baseline
```bash
node dist/cli.js save
```

### Compare with Baseline
```bash
node dist/cli.js compare
```

### Custom Baseline
```bash
node dist/cli.js save --baseline ./custom/baseline.json
node dist/cli.js compare --baseline ./custom/baseline.json
```

## Programmatic Usage

```typescript
import {
  runAllSuites,
  reportConsole,
  reportJson,
  gpuProfilerBenchmarks
} from '@superinstance/benchmark-suite';

// Run benchmarks
const results = await runAllSuites([gpuProfilerBenchmarks]);

// Generate reports
reportConsole(results);
reportJson(results, { output: './results.json' });
```

## Benchmark Coverage

| Tool | Benchmarks | Key Metrics |
|------|------------|-------------|
| GPU Profiler | 7 | Overhead, sampling rate, memory |
| Vector Search | 8 | Query latency, throughput |
| JEPA Sentiment | 11 | Messages/sec, latency, FPS |
| Integration | 10 | Speedup, cost reduction |

**Total: 36 Benchmarks**

## Output Interpretation

- ✅ Success: Benchmark completed
- ❌ Error: Benchmark failed
- 🚀 Improved: >10% faster than baseline
- ⚠️ Regression: >10% slower than baseline
- ➡️ Stable: <10% change from baseline

## Performance Goals

### GPU Profiler
- Overhead: < 1%
- Sampling: 60 FPS capable

### Vector Search
- 1K vectors: < 1ms
- 10K vectors: < 10ms
- 100K vectors: < 100ms

### JEPA Sentiment
- Single msg: < 1ms
- Batch (100): < 100ms
- Streaming: 60 FPS

### Integration
- Parallel speedup: > 3x
- Cost reduction: > 50%
- End-to-end: < 500ms

## CLI Options

```
Options:
  -f, --filter <pattern>   Filter benchmarks by name
  -r, --reporter <type>    Output: console|json|markdown|html
  -o, --output <file>      Output file path
  -c, --compare            Compare with baseline
  -b, --baseline <file>    Baseline file path
  -d, --detailed           Show detailed statistics
  -h, --help               Display help
  -V, --version            Display version
```

## Commands

```bash
npm run bench                    # Run all benchmarks
npm run bench:gpu-profiler      # Run GPU profiler suite
npm run bench:vector-search     # Run vector search suite
npm run bench:jepa-sentiment    # Run sentiment suite
npm run bench:integration       # Run integration suite
npm run build                   # Build TypeScript
npm run type-check              # Type check only
```

## Files

- `README.md` - Complete documentation
- `EXAMPLES.md` - Usage examples
- `src/cli.ts` - CLI implementation
- `src/benchmarks/` - Benchmark definitions
- `results/baseline.json` - Baseline results

## Support

- Documentation: See README.md
- Examples: See EXAMPLES.md
- Issues: https://github.com/SuperInstance/benchmark-suite/issues
