/**
 * Storage Benchmarks
 *
 * Benchmarks for IndexedDB operations including read/write speeds,
 * batch operations, and transaction performance.
 */

import { BenchmarkResult, BenchmarkOptions, BenchmarkOperation } from '../types'

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

const BENCH_DB_NAME = 'PersonalLogBenchmarkDB'
const BENCH_DB_VERSION = 1

async function setupBenchmarkDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BENCH_DB_NAME, BENCH_DB_VERSION)

    request.onerror = () => reject(new Error('Failed to open benchmark database'))
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create test stores
      if (!database.objectStoreNames.contains('small-objects')) {
        database.createObjectStore('small-objects', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('large-objects')) {
        database.createObjectStore('large-objects', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('indexed-objects')) {
        const store = database.createObjectStore('indexed-objects', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('category', 'category', { unique: false })
      }
    }
  })
}

async function cleanupBenchmarkDB(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['small-objects', 'large-objects', 'indexed-objects'], 'readwrite')

    transaction.oncomplete = () => {
      db.close()
      indexedDB.deleteDatabase(BENCH_DB_NAME).onsuccess = () => resolve()
    }
    transaction.onerror = () => reject(transaction.error)

    // Clear all stores
    const stores = ['small-objects', 'large-objects', 'indexed-objects']
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName)
      store.clear()
    }
  })
}

// ============================================================================
// SINGLE WRITE BENCHMARK
// ============================================================================

async function benchmarkSingleWrite(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 50 } = options
  const measurements: number[] = []

  const db = await setupBenchmarkDB()

  // Warmup
  for (let i = 0; i < 5; i++) {
    await writeSingleObject(db, 'small-objects', { id: `warmup-${i}`, data: 'test' })
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await writeSingleObject(db, 'small-objects', {
      id: `bench-${i}`,
      data: 'x'.repeat(100), // ~100 bytes
      timestamp: Date.now(),
    })
    const duration = performance.now() - start
    measurements.push(duration)
  }

  await cleanupBenchmarkDB(db)

  return calculateStatistics(
    'indexeddb-single-write',
    'storage',
    measurements,
    'ms',
    {
      dataSize: 100,
      iterations,
    }
  )
}

function writeSingleObject(
  db: IDBDatabase,
  storeName: string,
  data: Record<string, unknown>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(data)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// SINGLE READ BENCHMARK
// ============================================================================

async function benchmarkSingleRead(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 50 } = options
  const measurements: number[] = []

  const db = await setupBenchmarkDB()

  // Pre-populate data
  for (let i = 0; i < iterations; i++) {
    await writeSingleObject(db, 'small-objects', {
      id: `read-test-${i}`,
      data: 'x'.repeat(100),
      timestamp: Date.now(),
    })
  }

  // Warmup
  for (let i = 0; i < 5; i++) {
    await readSingleObject(db, 'small-objects', `read-test-${i}`)
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await readSingleObject(db, 'small-objects', `read-test-${i}`)
    const duration = performance.now() - start
    measurements.push(duration)
  }

  await cleanupBenchmarkDB(db)

  return calculateStatistics(
    'indexeddb-single-read',
    'storage',
    measurements,
    'ms',
    {
      dataSize: 100,
      iterations,
    }
  )
}

function readSingleObject(
  db: IDBDatabase,
  storeName: string,
  key: string
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// BATCH WRITE BENCHMARK
// ============================================================================

async function benchmarkBatchWrite(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10 } = options
  const batchSize = 100
  const measurements: number[] = []

  const db = await setupBenchmarkDB()

  // Warmup
  const warmupData = Array.from({ length: 20 }, (_, i) => ({
    id: `warmup-${i}`,
    data: 'x'.repeat(100),
  }))
  await writeBatch(db, 'small-objects', warmupData)

  // Measure
  for (let i = 0; i < iterations; i++) {
    const data = Array.from({ length: batchSize }, (_, j) => ({
      id: `batch-${i}-${j}`,
      data: 'x'.repeat(100),
      timestamp: Date.now(),
    }))

    const start = performance.now()
    await writeBatch(db, 'small-objects', data)
    const duration = performance.now() - start
    measurements.push(duration)
  }

  await cleanupBenchmarkDB(db)

  return calculateStatistics(
    'indexeddb-batch-write',
    'storage',
    measurements,
    'ms',
    {
      batchSize,
      dataSizePerItem: 100,
      iterations,
      throughput: 'items/sec',
    }
  )
}

function writeBatch(
  db: IDBDatabase,
  storeName: string,
  data: Record<string, unknown>[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    let completed = 0
    let hasError = false

    data.forEach((item) => {
      const request = store.put(item)
      request.onsuccess = () => {
        completed++
        if (completed === data.length && !hasError) {
          resolve()
        }
      }
      request.onerror = () => {
        hasError = true
        reject(request.error)
      }
    })
  })
}

// ============================================================================
// BATCH READ BENCHMARK
// ============================================================================

async function benchmarkBatchRead(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10 } = options
  const batchSize = 100
  const measurements: number[] = []

  const db = await setupBenchmarkDB()

  // Pre-populate data
  const allData: Record<string, unknown>[] = []
  for (let i = 0; i < iterations; i++) {
    const data = Array.from({ length: batchSize }, (_, j) => ({
      id: `read-batch-${i}-${j}`,
      data: 'x'.repeat(100),
      timestamp: Date.now(),
    }))
    allData.push(...data)
  }
  await writeBatch(db, 'small-objects', allData)

  // Warmup
  await readBatch(db, 'small-objects', allData.slice(0, 20).map(d => d.id as string))

  // Measure
  for (let i = 0; i < iterations; i++) {
    const keys = Array.from({ length: batchSize }, (_, j) => `read-batch-${i}-${j}`)
    const start = performance.now()
    await readBatch(db, 'small-objects', keys)
    const duration = performance.now() - start
    measurements.push(duration)
  }

  await cleanupBenchmarkDB(db)

  return calculateStatistics(
    'indexeddb-batch-read',
    'storage',
    measurements,
    'ms',
    {
      batchSize,
      dataSizePerItem: 100,
      iterations,
    }
  )
}

function readBatch(
  db: IDBDatabase,
  storeName: string,
  keys: string[]
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const results: unknown[] = []
    let completed = 0
    let hasError = false

    keys.forEach((key) => {
      const request = store.get(key)
      request.onsuccess = () => {
        results.push(request.result)
        completed++
        if (completed === keys.length && !hasError) {
          resolve(results)
        }
      }
      request.onerror = () => {
        hasError = true
        reject(request.error)
      }
    })
  })
}

// ============================================================================
// LARGE OBJECT BENCHMARK
// ============================================================================

async function benchmarkLargeObject(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 20 } = options
  const measurements: number[] = []

  const db = await setupBenchmarkDB()

  // Create a large object (~1MB)
  const largeData = {
    id: 'large-obj',
    data: 'x'.repeat(1024 * 1024), // 1MB
    metadata: {
      created: Date.now(),
      size: 1024 * 1024,
    },
  }

  // Warmup
  await writeSingleObject(db, 'large-objects', { ...largeData, id: 'warmup' })
  await readSingleObject(db, 'large-objects', 'warmup')

  // Measure writes
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await writeSingleObject(db, 'large-objects', { ...largeData, id: `large-${i}` })
    const duration = performance.now() - start
    measurements.push(duration)
  }

  await cleanupBenchmarkDB(db)

  return calculateStatistics(
    'indexeddb-large-write',
    'storage',
    measurements,
    'ms',
    {
      dataSize: 1024 * 1024, // 1MB
      iterations,
    }
  )
}

// ============================================================================
// INDEXED QUERY BENCHMARK
// ============================================================================

async function benchmarkIndexedQuery(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 20 } = options
  const measurements: number[] = []

  const db = await setupBenchmarkDB()

  // Pre-populate with data
  const totalRecords = 1000
  const data = Array.from({ length: totalRecords }, (_, i) => ({
    id: `query-${i}`,
    category: i % 10, // 10 different categories
    timestamp: Date.now() - Math.random() * 86400000, // Last 24h
    data: 'x'.repeat(200),
  }))
  await writeBatch(db, 'indexed-objects', data)

  // Warmup
  for (let i = 0; i < 5; i++) {
    await queryByIndex(db, 'indexed-objects', 'category', i % 10)
  }

  // Measure queries
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await queryByIndex(db, 'indexed-objects', 'category', i % 10)
    const duration = performance.now() - start
    measurements.push(duration)
  }

  await cleanupBenchmarkDB(db)

  return calculateStatistics(
    'indexeddb-indexed-query',
    'storage',
    measurements,
    'ms',
    {
      totalRecords,
      iterations,
      averageResults: totalRecords / 10,
    }
  )
}

function queryByIndex(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  value: number
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// RANGE QUERY BENCHMARK
// ============================================================================

async function benchmarkRangeQuery(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 20 } = options
  const measurements: number[] = []

  const db = await setupBenchmarkDB()

  // Pre-populate with data
  const totalRecords = 1000
  const now = Date.now()
  const data = Array.from({ length: totalRecords }, (_, i) => ({
    id: `range-${i}`,
    timestamp: now - Math.random() * 86400000, // Last 24h
    data: 'x'.repeat(200),
  }))
  await writeBatch(db, 'indexed-objects', data)

  // Warmup
  const range = IDBKeyRange.lowerBound(now - 3600000) // Last hour
  await queryByRange(db, 'indexed-objects', 'timestamp', range)

  // Measure queries
  for (let i = 0; i < iterations; i++) {
    const rangeStart = now - Math.random() * 3600000
    const range = IDBKeyRange.lowerBound(rangeStart)
    const start = performance.now()
    await queryByRange(db, 'indexed-objects', 'timestamp', range)
    const duration = performance.now() - start
    measurements.push(duration)
  }

  await cleanupBenchmarkDB(db)

  return calculateStatistics(
    'indexeddb-range-query',
    'storage',
    measurements,
    'ms',
    {
      totalRecords,
      iterations,
    }
  )
}

function queryByRange(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  range: IDBKeyRange
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(range)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
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

export const storageBenchmarks: BenchmarkOperation[] = [
  {
    id: 'indexeddb-single-write',
    name: 'IndexedDB Single Write',
    description: 'Measures performance of single object writes (~100 bytes)',
    category: 'storage',
    run: benchmarkSingleWrite,
    estimatedDuration: 300,
    expensive: false,
  },
  {
    id: 'indexeddb-single-read',
    name: 'IndexedDB Single Read',
    description: 'Measures performance of single object reads (~100 bytes)',
    category: 'storage',
    run: benchmarkSingleRead,
    estimatedDuration: 200,
    expensive: false,
  },
  {
    id: 'indexeddb-batch-write',
    name: 'IndexedDB Batch Write',
    description: 'Measures performance of batch writes (100 objects)',
    category: 'storage',
    run: benchmarkBatchWrite,
    estimatedDuration: 500,
    expensive: false,
  },
  {
    id: 'indexeddb-batch-read',
    name: 'IndexedDB Batch Read',
    description: 'Measures performance of batch reads (100 objects)',
    category: 'storage',
    run: benchmarkBatchRead,
    estimatedDuration: 400,
    expensive: false,
  },
  {
    id: 'indexeddb-large-write',
    name: 'IndexedDB Large Object Write',
    description: 'Measures performance of writing large objects (~1MB)',
    category: 'storage',
    run: benchmarkLargeObject,
    estimatedDuration: 1000,
    expensive: true,
  },
  {
    id: 'indexeddb-indexed-query',
    name: 'IndexedDB Indexed Query',
    description: 'Measures performance of indexed queries',
    category: 'storage',
    run: benchmarkIndexedQuery,
    estimatedDuration: 600,
    expensive: false,
  },
  {
    id: 'indexeddb-range-query',
    name: 'IndexedDB Range Query',
    description: 'Measures performance of range queries',
    category: 'storage',
    run: benchmarkRangeQuery,
    estimatedDuration: 600,
    expensive: false,
  },
]
