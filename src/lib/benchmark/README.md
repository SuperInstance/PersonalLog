# PersonalLog Benchmark System

A comprehensive, statistically-sound benchmarking suite for measuring and optimizing PersonalLog performance.

## Overview

The benchmark system measures performance across five critical categories:

- **Vector Operations**: Semantic search and embedding performance
- **Storage**: IndexedDB read/write speeds and query performance
- **Rendering**: UI responsiveness and frame rate
- **Memory**: Allocation, GC impact, and leak detection
- **Network**: API latency, bandwidth, and reliability

## Quick Start

```typescript
import { getBenchmarkSuite } from '@/lib/benchmark'

const suite = getBenchmarkSuite()

// Run all benchmarks
const results = await suite.runAll({
  iterations: 10,           // Number of measurement iterations
  warmupIterations: 3,      // Warmup iterations (default: 3)
  skipExpensive: false,     // Skip expensive benchmarks (default: false)
  onProgress: (progress) => {
    console.log(`${progress.current}: ${progress.progress.toFixed(1)}%`)
  }
})

console.log(`Overall Score: ${results.overallScore}/100`)
console.log(`Recommendations:`, results.recommendations)
```

## Features

### Non-Invasive

- Runs in under 5 seconds total
- Minimal impact on user experience
- Background execution support
- Intelligent scheduling

### Statistically Sound

- Multiple iterations for accuracy
- Proper warmup for JIT optimization
- Percentile-based reporting (p50, p95, p99)
- Outlier detection and handling

### Actionable Insights

- Overall performance score (0-100)
- Category-specific recommendations
- Configuration change suggestions
- Impact estimation

### Historical Tracking

- Store results over time
- Trend analysis (improving/degrading)
- Performance degradation detection
- A/B testing support

## Benchmark Categories

### Vector Operations

Measures semantic search and embedding performance:

- Cosine similarity calculation
- Dot product operations
- Vector normalization
- Euclidean distance
- Batch similarity search

**Typical results**:
- Good: <10ms per 100 vector pairs
- Acceptable: <50ms per 100 vector pairs
- Poor: >200ms per 100 vector pairs

### Storage

Measures IndexedDB performance:

- Single read/write operations
- Batch operations (100 items)
- Large object handling (1MB)
- Indexed queries
- Range queries

**Typical results**:
- Good: <5ms per operation
- Acceptable: <20ms per operation
- Poor: >100ms per operation

### Rendering

Measures UI responsiveness:

- Frame rate (FPS)
- DOM manipulation
- List rendering
- Scroll performance
- Event handling

**Typical results**:
- Good: >55 FPS
- Acceptable: >30 FPS
- Poor: <20 FPS

### Memory

Measures memory efficiency:

- Allocation overhead
- GC impact
- Memory pressure handling
- Object creation overhead
- Leak detection

**Typical results**:
- Good: <10% CV (coefficient of variation)
- Acceptable: <20% CV
- Poor: >50% CV or leaks detected

### Network

Measures network performance:

- API latency
- Bandwidth estimation
- DNS lookup time
- Connection quality
- Request reliability

**Typical results**:
- Good: <50ms latency, >10MB/s bandwidth
- Acceptable: <200ms latency, >1MB/s bandwidth
- Poor: >1000ms latency, <500KB/s bandwidth

## API Reference

### BenchmarkSuite

Main benchmark orchestrator.

#### Methods

- `runAll(options)`: Run all benchmarks
- `runCategory(category, options)`: Run specific category
- `runBenchmark(id, options)`: Run single benchmark
- `abort()`: Abort current run
- `getProgress()`: Get current progress
- `getAllBenchmarks()`: List all benchmarks
- `getBenchmarksByCategory(category)`: List benchmarks by category

#### Options

```typescript
interface BenchmarkOptions {
  warmupIterations?: number      // Default: 3
  iterations?: number             // Default: 10
  maxDuration?: number            // Default: 5000 (ms)
  background?: boolean            // Default: true
  onProgress?: (progress) => void // Progress callback
  skipExpensive?: boolean         // Default: false
  minSampleSize?: number          // Default: 5
}
```

### BenchmarkResult

Individual benchmark result.

```typescript
interface BenchmarkResult {
  id: string                      // Benchmark identifier
  name: string                    // Human-readable name
  category: BenchmarkCategory     // Category
  measurements: number[]          // All measurements
  mean: number                    // Average
  median: number                  // Median
  stdDev: number                  // Standard deviation
  min: number                     // Minimum
  max: number                     // Maximum
  percentiles: {                  // Percentiles
    p50: number
    p95: number
    p99: number
  }
  unit: 'ms' | 'ops/sec' | 'fps' | 'bytes/sec'
  timestamp: string
  iterations: number
  metadata?: Record<string, unknown>
}
```

### BenchmarkSuite

Complete suite results.

```typescript
interface BenchmarkSuite {
  name: string                    // Suite name
  version: string                 // Suite version
  results: BenchmarkResult[]      // All results
  overallScore: number            // 0-100 score
  hardwareProfile: HardwareProfile
  configuration: SystemConfiguration
  recommendations: Recommendation[]
  timestamp: string
}
```

## Usage Examples

### Run Specific Category

```typescript
const suite = getBenchmarkSuite()

// Run only vector benchmarks
const vectorResults = await suite.runCategory('vector', {
  iterations: 20
})

vectorResults.forEach(result => {
  console.log(`${result.name}: ${result.mean.toFixed(2)} ${result.unit}`)
})
```

### Run Single Benchmark

```typescript
const suite = getBenchmarkSuite()

// Run only cosine similarity benchmark
const result = await suite.runBenchmark('cosine-similarity', {
  iterations: 15
})

console.log(`Mean: ${result.mean}ms`)
console.log(`P95: ${result.percentiles.p95}ms`)
```

### Progress Tracking

```typescript
const suite = getBenchmarkSuite()

await suite.runAll({
  onProgress: (progress) => {
    console.clear()
    console.log(`Running: ${progress.current}`)
    console.log(`Progress: ${progress.progress.toFixed(1)}%`)
    console.log(`ETA: ${(progress.eta / 1000).toFixed(1)}s`)
    console.log(`\nResults so far:`)
    progress.results.forEach(r => {
      console.log(`  ${r.name}: ${r.mean.toFixed(2)} ${r.unit}`)
    })
  }
})
```

### Apply Recommendations

```typescript
const suite = getBenchmarkSuite()
const results = await suite.runAll()

// Apply high-priority recommendations
results.recommendations
  .filter(r => r.priority === 'high')
  .forEach(rec => {
    console.log(`Applying: ${rec.recommendation}`)
    if (rec.configChanges) {
      updateConfiguration(rec.configChanges)
    }
  })
```

## Best Practices

### 1. Run Regularly

```typescript
// Run benchmarks weekly
setInterval(async () => {
  const results = await suite.runAll()
  saveToHistory(results)
  checkForDegradation(results)
}, 7 * 24 * 60 * 60 * 1000)
```

### 2. Run on Idle

```typescript
// Only run when user is away
if (document.hidden) {
  await suite.runAll({ skipExpensive: true })
}
```

### 3. Compare Over Time

```typescript
const current = await suite.runAll()
const previous = loadFromHistory('last-week')

const trends = analyzeTrends(previous, current)
if (trends.some(t => t.direction === 'degrading')) {
  alert('Performance has degraded!')
}
```

### 4. A/B Test Configurations

```typescript
const configA = { embeddingDimensions: 384 }
const configB = { embeddingDimensions: 256 }

applyConfig(configA)
const resultsA = await suite.runAll()

applyConfig(configB)
const resultsB = await suite.runAll()

if (resultsB.overallScore > resultsA.overallScore) {
  console.log('Config B is better!')
}
```

## Research

See [`docs/research/benchmarking.md`](/docs/research/benchmarking.md) for:

- Measurement methodology
- Statistical significance analysis
- Category-specific findings
- User experience correlation
- Future improvements

## Contributing

When adding new benchmarks:

1. Follow the existing pattern in `operations/`
2. Include proper warmup iterations
3. Use at least 10 measurement iterations
4. Handle errors gracefully
5. Add metadata to results
6. Update this README

## License

MIT

---

*Last Updated: 2025-01-02*
*Version: 1.0.0*
