/**
 * Memory Benchmarks
 *
 * Benchmarks for memory allocation, garbage collection impact,
 * and memory pressure handling.
 */

import { BenchmarkResult, BenchmarkOptions, BenchmarkOperation } from '../types'

// ============================================================================
// MEMORY ALLOCATION BENCHMARK
// ============================================================================

async function benchmarkMemoryAllocation(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const allocationSize = 1024 * 100 // 100KB per allocation
  const allocationCount = 100 // 100 allocations = ~10MB total

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    performAllocations(allocationSize, allocationCount)
  }

  // Force GC before measurement (if available)
  if (global.gc) {
    global.gc()
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const memBefore = getMemoryUsage()
    const start = performance.now()

    performAllocations(allocationSize, allocationCount)

    const duration = performance.now() - start
    const memAfter = getMemoryUsed()
    const memUsed = memAfter - memBefore

    measurements.push(memUsed)
  }

  return calculateStatistics('memory-allocation', 'memory', measurements, 'bytes/sec', {
    allocationSize,
    allocationCount,
    iterations,
  })
}

function performAllocations(size: number, count: number): void {
  const allocations: string[] = []

  for (let i = 0; i < count; i++) {
    // Allocate string of specified size
    allocations.push('x'.repeat(size))
  }

  // Keep references to prevent optimization
  if (allocations.length === 0) {
    throw new Error('Allocation failed')
  }
}

// ============================================================================
// GARBAGE COLLECTION IMPACT BENCHMARK
// ============================================================================

async function benchmarkGCImpact(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 5, warmupIterations = 1 } = options
  const measurements: number[] = []
  const allocationSize = 1024 * 1024 // 1MB
  const allocationCount = 50 // 50MB total

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    performAllocations(allocationSize, allocationCount)
    if (global.gc) global.gc()
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const memBefore = getMemoryUsed()
    const start = performance.now()

    // Allocate
    performAllocations(allocationSize, allocationCount)

    // Force GC if available
    if (global.gc) {
      global.gc()
    }

    const duration = performance.now() - start
    const memAfter = getMemoryUsed()

    // Measure both time and memory recovered
    measurements.push(duration)
  }

  return calculateStatistics('gc-impact', 'memory', measurements, 'ms', {
    allocationSize,
    allocationCount,
    iterations,
  })
}

// ============================================================================
// MEMORY PRESSURE BENCHMARK
// ============================================================================

async function benchmarkMemoryPressure(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 5, warmupIterations = 1 } = options
  const measurements: number[] = []
  const maxAllocation = 1024 * 1024 * 50 // 50MB max
  const stepSize = 1024 * 1024 // 1MB increments

  // Warmup
  const warmupAllocations = allocateUntilPressure(stepSize, maxAllocation / 10)
  warmupAllocations.length = 0 // Clear

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const allocations = allocateUntilPressure(stepSize, maxAllocation)
    const duration = performance.now() - start
    const allocatedMB = allocations.length * stepSize / (1024 * 1024)

    measurements.push(allocatedMB)

    // Cleanup
    allocations.length = 0
    if (global.gc) global.gc()
  }

  return calculateStatistics('memory-pressure', 'memory', measurements, 'bytes/sec', {
    maxAllocation,
    stepSize,
    iterations,
  })
}

function allocateUntilPressure(stepSize: number, maxSize: number): string[] {
  const allocations: string[] = []
  let totalAllocated = 0

  try {
    while (totalAllocated < maxSize) {
      allocations.push('x'.repeat(stepSize))
      totalAllocated += stepSize

      // Check if we're hitting memory pressure
      const memUsed = getMemoryUsed()
      const memLimit = getMemoryLimit()

      if (memLimit > 0 && memUsed > memLimit * 0.9) {
        break
      }
    }
  } catch (error) {
    // Memory allocation failed - this is expected
  }

  return allocations
}

// ============================================================================
// OBJECT CREATION BENCHMARK
// ============================================================================

async function benchmarkObjectCreation(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const objectCount = 10000

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    createObjects(objectCount)
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const memBefore = getMemoryUsed()
    const start = performance.now()

    const objects = createObjects(objectCount)

    const duration = performance.now() - start
    const memAfter = getMemoryUsed()
    const memUsed = memAfter - memBefore

    measurements.push(memUsed)

    // Cleanup
    objects.length = 0
  }

  return calculateStatistics('object-creation', 'memory', measurements, 'bytes/sec', {
    objectCount,
    iterations,
  })
}

function createObjects(count: number): object[] {
  const objects: object[] = []

  for (let i = 0; i < count; i++) {
    objects.push({
      id: i,
      name: `Object ${i}`,
      data: 'x'.repeat(100), // 100 bytes per object
      timestamp: Date.now(),
      metadata: {
        index: i,
        category: i % 10,
        tags: [`tag${i % 5}`, `tag${(i + 1) % 5}`],
      },
    })
  }

  return objects
}

// ============================================================================
// ARRAY OPERATIONS BENCHMARK
// ============================================================================

async function benchmarkArrayOperations(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const arraySize = 10000

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    performArrayOperations(arraySize)
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const memBefore = getMemoryUsed()
    const start = performance.now()

    performArrayOperations(arraySize)

    const duration = performance.now() - start
    const memAfter = getMemoryUsed()
    const memUsed = memAfter - memBefore

    measurements.push(memUsed)
  }

  return calculateStatistics('array-operations', 'memory', measurements, 'bytes/sec', {
    arraySize,
    iterations,
  })
}

function performArrayOperations(size: number): void {
  // Create array
  const arr = Array.from({ length: size }, (_, i) => i)

  // Map
  const mapped = arr.map(x => x * 2)

  // Filter
  const filtered = mapped.filter(x => x % 3 === 0)

  // Reduce
  const sum = filtered.reduce((acc, val) => acc + val, 0)

  // Spread
  const copied = [...arr]

  // Concat
  const combined = arr.concat(copied)
}

// ============================================================================
// STRING OPERATIONS BENCHMARK
// ============================================================================

async function benchmarkStringOperations(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const stringLength = 1000
  const operationCount = 100

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    performStringOperations(stringLength, operationCount)
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const memBefore = getMemoryUsed()
    const start = performance.now()

    performStringOperations(stringLength, operationCount)

    const duration = performance.now() - start
    const memAfter = getMemoryUsed()
    const memUsed = memAfter - memBefore

    measurements.push(memUsed)
  }

  return calculateStatistics('string-operations', 'memory', measurements, 'bytes/sec', {
    stringLength,
    operationCount,
    iterations,
  })
}

function performStringOperations(length: number, count: number): void {
  const baseString = 'x'.repeat(length)

  for (let i = 0; i < count; i++) {
    // Concatenation
    const result = baseString + baseString

    // Substring
    const substring = result.substring(0, length)

    // Split
    const parts = substring.split('')

    // Join
    const rejoined = parts.join('')

    // Replace
    const replaced = rejoined.replace('x', 'y')
  }
}

// ============================================================================
// MEMORY LEAK DETECTION BENCHMARK
// ============================================================================

async function benchmarkMemoryLeakDetection(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 5, warmupIterations = 1 } = options
  const measurements: number[] = []
  const cycles = 10

  // Warmup
  if (global.gc) global.gc()

  // Measure
  const baselineMem = getMemoryUsed()

  for (let i = 0; i < iterations; i++) {
    const memStart = getMemoryUsed()

    // Simulate potential leak scenario
    simulateLeakyPattern(cycles)

    // Force GC
    if (global.gc) {
      global.gc()
    }

    const memEnd = getMemoryUsed()
    const leaked = memEnd - memStart

    measurements.push(leaked)
  }

  return calculateStatistics('memory-leak-detection', 'memory', measurements, 'bytes/sec', {
    cycles,
    iterations,
    baselineMem,
  })
}

function simulateLeakyPattern(cycles: number): void {
  const cache = new Map()

  for (let i = 0; i < cycles; i++) {
    // Simulate caching
    const key = `item-${i}`
    const data = {
      content: 'x'.repeat(1024 * 10), // 10KB
      timestamp: Date.now(),
    }

    cache.set(key, data)

    // Only clear some entries (simulating leak)
    if (i > 100 && i % 2 === 0) {
      cache.delete(`item-${i - 100}`)
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getMemoryUsage(): number {
  // Browser memory API
  if (performance.memory) {
    return performance.memory.usedJSHeapSize
  }

  // Node.js memory
  if (process.memoryUsage) {
    return process.memoryUsage().heapUsed
  }

  // Fallback: return 0
  return 0
}

function getMemoryUsed(): number {
  return getMemoryUsage()
}

function getMemoryLimit(): number {
  // Browser memory API
  if (performance.memory) {
    return performance.memory.jsHeapSizeLimit
  }

  // Node.js memory
  if (process.memoryUsage) {
    return process.memoryUsage().heapTotal
  }

  // Fallback: return 0
  return 0
}

// ============================================================================
// STATISTICAL CALCULATIONS
// ============================================================================

function calculateStatistics(
  name: string,
  category: string,
  measurements: number[],
  unit: 'ms' | 'ops/sec' | 'fps' | 'bytes/sec',
  metadata?: Record<string, unknown>
): BenchmarkResult {
  const sorted = [...measurements].sort((a, b) => a - b)

  const sum = measurements.reduce((a, b) => a + b, 0)
  const mean = sum / measurements.length

  // Calculate variance and standard deviation
  const variance = measurements.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / measurements.length
  const stdDev = Math.sqrt(variance)

  // Calculate percentiles
  const percentiles = {
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  }

  return {
    id: name,
    name,
    category: category as any,
    measurements,
    mean,
    median: percentiles.p50,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    percentiles,
    unit,
    timestamp: new Date().toISOString(),
    iterations: measurements.length,
    metadata,
  }
}

// ============================================================================
// EXPORT BENCHMARK OPERATIONS
// ============================================================================

export const memoryBenchmarks: BenchmarkOperation[] = [
  {
    id: 'memory-allocation',
    name: 'Memory Allocation',
    description: 'Measures memory allocation speed and overhead',
    category: 'memory',
    run: benchmarkMemoryAllocation,
    estimatedDuration: 500,
    expensive: false,
  },
  {
    id: 'gc-impact',
    name: 'Garbage Collection Impact',
    description: 'Measures GC impact on performance',
    category: 'memory',
    run: benchmarkGCImpact,
    estimatedDuration: 1000,
    expensive: true,
  },
  {
    id: 'memory-pressure',
    name: 'Memory Pressure',
    description: 'Measures behavior under memory pressure',
    category: 'memory',
    run: benchmarkMemoryPressure,
    estimatedDuration: 2000,
    expensive: true,
  },
  {
    id: 'object-creation',
    name: 'Object Creation',
    description: 'Measures object creation overhead',
    category: 'memory',
    run: benchmarkObjectCreation,
    estimatedDuration: 400,
    expensive: false,
  },
  {
    id: 'array-operations',
    name: 'Array Operations',
    description: 'Measures array operation memory efficiency',
    category: 'memory',
    run: benchmarkArrayOperations,
    estimatedDuration: 300,
    expensive: false,
  },
  {
    id: 'string-operations',
    name: 'String Operations',
    description: 'Measures string operation memory efficiency',
    category: 'memory',
    run: benchmarkStringOperations,
    estimatedDuration: 300,
    expensive: false,
  },
  {
    id: 'memory-leak-detection',
    name: 'Memory Leak Detection',
    description: 'Detects potential memory leaks in operations',
    category: 'memory',
    run: benchmarkMemoryLeakDetection,
    estimatedDuration: 1500,
    expensive: true,
  },
]
