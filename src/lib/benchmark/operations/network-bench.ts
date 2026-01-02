/**
 * Network Benchmarks
 *
 * Benchmarks for network operations including API latency,
 * bandwidth estimation, and connection quality.
 */

import { BenchmarkResult, BenchmarkOptions, BenchmarkOperation } from '../types'

// ============================================================================
// NETWORK CONNECTION INFO
// ============================================================================

interface NetworkInfo {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  rtt: number
  downlink: number
  saveData: boolean
}

function getNetworkInfo(): NetworkInfo | null {
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (!conn) return null

  return {
    effectiveType: conn.effectiveType,
    rtt: conn.rtt,
    downlink: conn.downlink,
    saveData: conn.saveData,
  }
}

// ============================================================================
// API LATENCY BENCHMARK
// ============================================================================

async function benchmarkAPILatency(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10 } = options
  const measurements: number[] = []

  // Use a reliable endpoint for testing (e.g., a small API call)
  const testUrls = [
    '/api/models', // Local API endpoint
    'https://httpbin.org/get', // Public test endpoint (fallback)
  ]

  // Warmup
  for (const url of testUrls) {
    try {
      await measureRequest(url)
    } catch {
      // Continue on error
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const url = testUrls[0] // Prefer local endpoint
    try {
      const latency = await measureRequest(url)
      measurements.push(latency)
    } catch (error) {
      // If local endpoint fails, try fallback
      try {
        const latency = await measureRequest(testUrls[1])
        measurements.push(latency)
      } catch {
        measurements.push(0) // Failed request
      }
    }
  }

  // Filter out failed requests
  const validMeasurements = measurements.filter(m => m > 0)

  return calculateStatistics('api-latency', 'network', validMeasurements, 'ms', {
    iterations,
    successfulRequests: validMeasurements.length,
    networkInfo: getNetworkInfo(),
  })
}

async function measureRequest(url: string): Promise<number> {
  const start = performance.now()

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    await response.text() // Consume the response
    return performance.now() - start
  } catch (error) {
    throw error
  }
}

// ============================================================================
// BANDWIDTH ESTIMATION BENCHMARK
// ============================================================================

async function benchmarkBandwidth(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 3 } = options // Fewer iterations for bandwidth tests
  const measurements: number[] = []

  // Use a reliable source for bandwidth test
  const testUrls = [
    'https://via.placeholder.com/1024x1024.png', // ~1-2KB image
    'https://httpbin.org/bytes/1048576', // 1MB of data
  ]

  // Measure bandwidth using the larger file
  const testUrl = testUrls[1]

  for (let i = 0; i < iterations; i++) {
    try {
      const { duration, size } = await measureDownload(testUrl)
      const bytesPerSec = (size * 1000) / duration
      measurements.push(bytesPerSec)
    } catch {
      measurements.push(0)
    }
  }

  // Filter out failed measurements
  const validMeasurements = measurements.filter(m => m > 0)

  return calculateStatistics('bandwidth', 'network', validMeasurements, 'bytes/sec', {
    iterations,
    successfulRequests: validMeasurements.length,
    networkInfo: getNetworkInfo(),
  })
}

async function measureDownload(url: string): Promise<{ duration: number; size: number }> {
  const start = performance.now()

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const duration = performance.now() - start
    const size = blob.size

    return { duration, size }
  } catch (error) {
    throw error
  }
}

// ============================================================================
// DNS LOOKUP BENCHMARK
// ============================================================================

async function benchmarkDNSLookup(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10 } = options
  const measurements: number[] = []

  const testHosts = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://www.amazonaws.com',
  ]

  for (let i = 0; i < iterations; i++) {
    const host = testHosts[i % testHosts.length]
    try {
      const latency = await measureDNSLookup(host)
      measurements.push(latency)
    } catch {
      measurements.push(0)
    }
  }

  // Filter out failed measurements
  const validMeasurements = measurements.filter(m => m > 0)

  return calculateStatistics('dns-lookup', 'network', validMeasurements, 'ms', {
    iterations,
    successfulRequests: validMeasurements.length,
    networkInfo: getNetworkInfo(),
  })
}

async function measureDNSLookup(url: string): Promise<number> {
  const start = performance.now()

  try {
    // Fetch with a very small timeout to measure mostly connection setup
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return performance.now() - start
  } catch {
    return 0
  }
}

// ============================================================================
// CONNECTION QUALITY BENCHMARK
// ============================================================================

async function benchmarkConnectionQuality(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 5 } = options
  const measurements: number[] = []

  const networkInfo = getNetworkInfo()
  if (!networkInfo) {
    // Return a mock result if Network API is not available
    return calculateStatistics('connection-quality', 'network', [50], 'ms', {
      iterations: 0,
      note: 'Network Information API not available',
    })
  }

  // Use RTT (Round Trip Time) as the quality metric
  for (let i = 0; i < iterations; i++) {
    measurements.push(networkInfo.rtt)
  }

  return calculateStatistics('connection-quality', 'network', measurements, 'ms', {
    iterations,
    effectiveType: networkInfo.effectiveType,
    downlink: networkInfo.downlink,
    saveData: networkInfo.saveData,
    networkInfo,
  })
}

// ============================================================================
// REQUEST CONCURRENCY BENCHMARK
// ============================================================================

async function benchmarkRequestConcurrency(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 5 } = options
  const measurements: number[] = []
  const concurrency = 10

  const testUrl = 'https://httpbin.org/delay/1' // 1 second delay

  for (let i = 0; i < iterations; i++) {
    try {
      const duration = await measureConcurrentRequests(testUrl, concurrency)
      measurements.push(duration)
    } catch {
      measurements.push(0)
    }
  }

  const validMeasurements = measurements.filter(m => m > 0)

  return calculateStatistics('request-concurrency', 'network', validMeasurements, 'ms', {
    iterations,
    concurrency,
    successfulRequests: validMeasurements.length,
    networkInfo: getNetworkInfo(),
  })
}

async function measureConcurrentRequests(url: string, count: number): Promise<number> {
  const start = performance.now()

  try {
    const promises = Array.from({ length: count }, () =>
      fetch(url, {
        method: 'GET',
        cache: 'no-store',
      })
    )

    await Promise.all(promises)
    return performance.now() - start
  } catch {
    return 0
  }
}

// ============================================================================
// REQUEST RELIABILITY BENCHMARK
// ============================================================================

async function benchmarkRequestReliability(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 20 } = options
  const measurements: number[] = []

  const testUrl = 'https://httpbin.org/status/200'

  let successCount = 0
  let failureCount = 0
  const latencies: number[] = []

  for (let i = 0; i < iterations; i++) {
    try {
      const latency = await measureRequest(testUrl)
      successCount++
      latencies.push(latency)
    } catch {
      failureCount++
    }
  }

  // Calculate success rate (as a percentage)
  const successRate = (successCount / iterations) * 100
  measurements.push(successRate)

  return calculateStatistics('request-reliability', 'network', measurements, 'ops/sec', {
    iterations,
    successCount,
    failureCount,
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    networkInfo: getNetworkInfo(),
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
  if (measurements.length === 0) {
    // Return a default result if all measurements failed
    return {
      id: name,
      name,
      category: category as any,
      measurements: [0],
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      percentiles: { p50: 0, p95: 0, p99: 0 },
      unit,
      timestamp: new Date().toISOString(),
      iterations: 0,
      metadata: {
        ...metadata,
        error: 'All measurements failed',
      },
    }
  }

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

export const networkBenchmarks: BenchmarkOperation[] = [
  {
    id: 'api-latency',
    name: 'API Latency',
    description: 'Measures API request/response latency',
    category: 'network',
    run: benchmarkAPILatency,
    estimatedDuration: 2000,
    expensive: false,
  },
  {
    id: 'bandwidth',
    name: 'Bandwidth Estimation',
    description: 'Estimates available network bandwidth',
    category: 'network',
    run: benchmarkBandwidth,
    estimatedDuration: 5000,
    expensive: true,
  },
  {
    id: 'dns-lookup',
    name: 'DNS Lookup',
    description: 'Measures DNS lookup latency',
    category: 'network',
    run: benchmarkDNSLookup,
    estimatedDuration: 3000,
    expensive: false,
  },
  {
    id: 'connection-quality',
    name: 'Connection Quality',
    description: 'Measures connection quality metrics',
    category: 'network',
    run: benchmarkConnectionQuality,
    estimatedDuration: 100,
    expensive: false,
  },
  {
    id: 'request-concurrency',
    name: 'Request Concurrency',
    description: 'Measures performance under concurrent requests',
    category: 'network',
    run: benchmarkRequestConcurrency,
    estimatedDuration: 15000,
    expensive: true,
  },
  {
    id: 'request-reliability',
    name: 'Request Reliability',
    description: 'Measures request success rate and reliability',
    category: 'network',
    run: benchmarkRequestReliability,
    estimatedDuration: 5000,
    expensive: false,
  },
]
