/**
 * Benchmark Suite
 *
 * Main benchmark runner that orchestrates all benchmarks,
 * collects results, and generates recommendations.
 */

import {
  BenchmarkResult,
  BenchmarkSuite,
  BenchmarkOptions,
  BenchmarkProgress,
  BenchmarkOperation,
  HardwareProfile,
  SystemConfiguration,
  Recommendation,
  BenchmarkCategory,
} from './types'

import { vectorBenchmarks } from './operations/vector-bench'
import { storageBenchmarks } from './operations/storage-bench'
import { renderBenchmarks } from './operations/render-bench'
import { memoryBenchmarks } from './operations/memory-bench'
import { networkBenchmarks } from './operations/network-bench'

// ============================================================================
// BENCHMARK SUITE CLASS
// ============================================================================

export class BenchmarkSuite {
  private benchmarks: Map<BenchmarkCategory, BenchmarkOperation[]>
  private results: BenchmarkResult[] = []
  private currentProgress: BenchmarkProgress | null = null
  private abortController: AbortController | null = null

  constructor() {
    this.benchmarks = new Map([
      ['vector', vectorBenchmarks],
      ['storage', storageBenchmarks],
      ['render', renderBenchmarks],
      ['memory', memoryBenchmarks],
      ['network', networkBenchmarks],
    ])
  }

  /**
   * Run all benchmarks
   */
  async runAll(options: BenchmarkOptions = {}): Promise<BenchmarkSuite> {
    this.results = []
    this.abortController = new AbortController()

    const startTime = performance.now()
    const totalBenchmarks = this.getTotalBenchmarkCount(options)
    let completedBenchmarks = 0

    // Collect hardware profile
    const hardwareProfile = await this.collectHardwareProfile()

    // Collect system configuration
    const systemConfig = this.collectSystemConfiguration()

    // Run benchmarks by category
    for (const [category, benchmarks] of this.benchmarks.entries()) {
      if (this.abortController.signal.aborted) {
        throw new Error('Benchmark suite aborted')
      }

      // Skip expensive benchmarks if requested
      const filteredBenchmarks = options.skipExpensive
        ? benchmarks.filter(b => !b.expensive)
        : benchmarks

      for (const benchmark of filteredBenchmarks) {
        if (this.abortController.signal.aborted) {
          throw new Error('Benchmark suite aborted')
        }

        // Update progress
        this.currentProgress = {
          current: benchmark.name,
          progress: (completedBenchmarks / totalBenchmarks) * 100,
          eta: this.estimateETA(completedBenchmarks, totalBenchmarks, startTime),
          results: [...this.results],
        }

        if (options.onProgress) {
          options.onProgress(this.currentProgress)
        }

        try {
          const result = await benchmark.run(options)
          this.results.push(result)
        } catch (error) {
          console.error(`Benchmark ${benchmark.name} failed:`, error)
          // Add a failed result
          this.results.push(this.createFailedResult(benchmark, error))
        }

        completedBenchmarks++
      }
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore()

    // Generate recommendations
    const recommendations = this.generateRecommendations(hardwareProfile, systemConfig)

    return {
      name: 'PersonalLog Benchmark Suite',
      version: '1.0.0',
      results: this.results,
      overallScore,
      hardwareProfile,
      configuration: systemConfig,
      recommendations,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Run specific category of benchmarks
   */
  async runCategory(
    category: BenchmarkCategory,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult[]> {
    const benchmarks = this.benchmarks.get(category)
    if (!benchmarks) {
      throw new Error(`Unknown benchmark category: ${category}`)
    }

    const results: BenchmarkResult[] = []
    const filteredBenchmarks = options.skipExpensive
      ? benchmarks.filter(b => !b.expensive)
      : benchmarks

    for (const benchmark of filteredBenchmarks) {
      try {
        const result = await benchmark.run(options)
        results.push(result)
      } catch (error) {
        console.error(`Benchmark ${benchmark.name} failed:`, error)
        results.push(this.createFailedResult(benchmark, error))
      }
    }

    return results
  }

  /**
   * Run a single benchmark by ID
   */
  async runBenchmark(id: string, options: BenchmarkOptions = {}): Promise<BenchmarkResult> {
    for (const benchmarks of this.benchmarks.values()) {
      const benchmark = benchmarks.find(b => b.id === id)
      if (benchmark) {
        return benchmark.run(options)
      }
    }

    throw new Error(`Unknown benchmark: ${id}`)
  }

  /**
   * Abort the current benchmark run
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  /**
   * Get current progress
   */
  getProgress(): BenchmarkProgress | null {
    return this.currentProgress
  }

  /**
   * Get all available benchmark operations
   */
  getAllBenchmarks(): BenchmarkOperation[] {
    const all: BenchmarkOperation[] = []
    for (const benchmarks of this.benchmarks.values()) {
      all.push(...benchmarks)
    }
    return all
  }

  /**
   * Get benchmarks by category
   */
  getBenchmarksByCategory(category: BenchmarkCategory): BenchmarkOperation[] {
    return this.benchmarks.get(category) || []
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private getTotalBenchmarkCount(options: BenchmarkOptions): number {
    let count = 0
    for (const benchmarks of this.benchmarks.values()) {
      const filtered = options.skipExpensive
        ? benchmarks.filter(b => !b.expensive)
        : benchmarks
      count += filtered.length
    }
    return count
  }

  private estimateETA(
    completed: number,
    total: number,
    startTime: number
  ): number {
    if (completed === 0) return 0

    const elapsed = performance.now() - startTime
    const avgTimePerBenchmark = elapsed / completed
    const remaining = total - completed

    return avgTimePerBenchmark * remaining
  }

  private async collectHardwareProfile(): Promise<HardwareProfile> {
    // CPU info
    const cpu = {
      cores: navigator.hardwareConcurrency || 4,
      architecture: this.detectArchitecture(),
      frequency: undefined as number | undefined,
    }

    // Memory info
    let memory = {
      total: 0,
      available: 0,
      used: 0,
    }

    if (performance.memory) {
      memory = {
        total: performance.memory.jsHeapSizeLimit,
        available: performance.memory.jsHeapSizeLimit - performance.memory.usedJSHeapSize,
        used: performance.memory.usedJSHeapSize,
      }
    }

    // GPU info (if available)
    let gpu: HardwareProfile['gpu'] = undefined
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        gpu = {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          model: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
          memory: 0, // Not exposed by WebGL
        }
      }
    }

    // Storage info (estimate)
    const storage = {
      type: 'ssd' as const, // Assume SSD for modern browsers
      estimatedSize: 0, // Not directly measurable
    }

    // Network info
    let network: HardwareProfile['network'] = undefined
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (conn) {
      network = {
        effectiveType: conn.effectiveType,
        rtt: conn.rtt,
        downlink: conn.downlink,
      }
    }

    return {
      cpu,
      memory,
      gpu,
      storage,
      network,
    }
  }

  private detectArchitecture(): string {
    const ua = navigator.userAgent
    if (ua.includes('x86_64') || ua.includes('x64') || ua.includes('WOW64')) {
      return 'x86_64'
    } else if (ua.includes('i686') || ua.includes('i386')) {
      return 'x86'
    } else if (ua.includes('arm') || ua.includes('aarch64')) {
      return 'arm'
    }
    return 'unknown'
  }

  private collectSystemConfiguration(): SystemConfiguration {
    return {
      browser: {
        name: this.detectBrowser(),
        version: navigator.userAgent,
      },
      platform: {
        os: navigator.platform,
        architecture: this.detectArchitecture(),
      },
      appVersion: '1.1.0', // Should be pulled from package.json
      features: this.getEnabledFeatures(),
      settings: this.getCurrentSettings(),
    }
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('Edg')) return 'Edge'
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
    return 'Unknown'
  }

  private getEnabledFeatures(): string[] {
    // This should be replaced with actual feature flags
    return ['messenger', 'knowledge', 'ai-chat']
  }

  private getCurrentSettings(): Record<string, unknown> {
    // This should be replaced with actual settings
    return {}
  }

  private calculateOverallScore(): number {
    if (this.results.length === 0) return 0

    // Calculate category scores
    const categoryScores = new Map<BenchmarkCategory, number[]>()

    for (const result of this.results) {
      if (!categoryScores.has(result.category)) {
        categoryScores.set(result.category, [])
      }
      categoryScores.get(result.category)!.push(this.calculateBenchmarkScore(result))
    }

    // Average category scores
    let totalScore = 0
    let categoryCount = 0

    for (const [category, scores] of categoryScores.entries()) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
      totalScore += avgScore
      categoryCount++
    }

    return categoryCount > 0 ? Math.round(totalScore / categoryCount) : 0
  }

  private calculateBenchmarkScore(result: BenchmarkResult): number {
    // Score is based on how well the system performs
    // Higher is better

    let score = 50 // Base score

    // Adjust based on standard deviation (consistency matters)
    const cv = result.stdDev / result.mean // Coefficient of variation
    if (cv < 0.1) score += 20 // Very consistent
    else if (cv < 0.2) score += 10 // Consistent
    else if (cv > 0.5) score -= 20 // Inconsistent

    // Adjust based on percentiles
    const p95Ratio = result.percentiles.p95 / result.mean
    if (p95Ratio < 1.2) score += 10 // Good tail performance

    // Category-specific scoring
    switch (result.category) {
      case 'vector':
        if (result.unit === 'ms') {
          // Lower is better for latency
          if (result.mean < 10) score += 20
          else if (result.mean < 50) score += 10
          else if (result.mean > 200) score -= 20
        }
        break

      case 'storage':
        if (result.unit === 'ms') {
          // Lower is better
          if (result.mean < 5) score += 20
          else if (result.mean < 20) score += 10
          else if (result.mean > 100) score -= 20
        }
        break

      case 'render':
        if (result.unit === 'fps') {
          // Higher is better
          if (result.mean > 55) score += 20
          else if (result.mean > 30) score += 10
          else if (result.mean < 20) score -= 20
        } else if (result.unit === 'ms') {
          // Lower is better
          if (result.mean < 16) score += 20 // 60fps = 16ms
          else if (result.mean < 33) score += 10 // 30fps = 33ms
          else if (result.mean > 100) score -= 20
        }
        break

      case 'memory':
        // Efficiency is key
        if (result.stdDev < result.mean * 0.2) score += 15
        break

      case 'network':
        if (result.unit === 'ms') {
          // Lower is better
          if (result.mean < 50) score += 20
          else if (result.mean < 200) score += 10
          else if (result.mean > 1000) score -= 20
        } else if (result.unit === 'bytes/sec') {
          // Higher is better
          if (result.mean > 10 * 1024 * 1024) score += 20 // > 10MB/s
          else if (result.mean > 1024 * 1024) score += 10 // > 1MB/s
        }
        break
    }

    return Math.max(0, Math.min(100, score))
  }

  private generateRecommendations(
    hardware: HardwareProfile,
    config: SystemConfiguration
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Analyze each category
    for (const category of ['vector', 'storage', 'render', 'memory', 'network'] as BenchmarkCategory[]) {
      const categoryResults = this.results.filter(r => r.category === category)
      if (categoryResults.length === 0) continue

      const avgScore = categoryResults.reduce((sum, r) => sum + this.calculateBenchmarkScore(r), 0) / categoryResults.length

      // Generate recommendations based on score
      if (avgScore < 40) {
        recommendations.push(this.createLowScoreRecommendation(category, hardware, config))
      } else if (avgScore < 60) {
        recommendations.push(this.createMediumScoreRecommendation(category, hardware, config))
      }
    }

    return recommendations
  }

  private createLowScoreRecommendation(
    category: BenchmarkCategory,
    hardware: HardwareProfile,
    config: SystemConfiguration
  ): Recommendation {
    const baseRecommendation: Recommendation = {
      priority: 'high',
      category,
      impact: 'high',
      reasoning: `Performance in ${category} operations is significantly below optimal.`,
      configChanges: {},
    }

    switch (category) {
      case 'vector':
        return {
          ...baseRecommendation,
          recommendation: 'Vector operations are slow. Consider reducing embedding dimensions or using approximate search algorithms.',
          configChanges: {
            embeddingDimensions: 256, // Reduce from 384
            searchAlgorithm: 'approximate',
            batchOperations: true,
          },
        }

      case 'storage':
        return {
          ...baseRecommendation,
          recommendation: 'IndexedDB operations are slow. Implement batch operations and consider indexing strategy.',
          configChanges: {
            batchOperations: true,
            cacheStrategy: 'aggressive',
            indexOptimization: true,
          },
        }

      case 'render':
        return {
          ...baseRecommendation,
          recommendation: 'Rendering performance is poor. Enable virtualization for long lists and reduce animations.',
          configChanges: {
            virtualization: true,
            animations: 'reduced',
            debouncing: 100,
          },
        }

      case 'memory':
        return {
          ...baseRecommendation,
          recommendation: 'Memory usage is high. Implement object pooling and aggressive garbage collection.',
          configChanges: {
            objectPooling: true,
            cacheSize: 100,
            gcFrequency: 'high',
          },
        }

      case 'network':
        return {
          ...baseRecommendation,
          recommendation: 'Network performance is poor. Enable aggressive caching and offline mode.',
          configChanges: {
            offlineMode: true,
            cacheStrategy: 'aggressive',
            compression: true,
          },
        }
    }
  }

  private createMediumScoreRecommendation(
    category: BenchmarkCategory,
    hardware: HardwareProfile,
    config: SystemConfiguration
  ): Recommendation {
    const baseRecommendation: Recommendation = {
      priority: 'medium',
      category,
      impact: 'medium',
      reasoning: `Performance in ${category} operations could be improved.`,
      configChanges: {},
    }

    switch (category) {
      case 'vector':
        return {
          ...baseRecommendation,
          recommendation: 'Consider tuning vector search parameters for better performance.',
          configChanges: {
            searchThreshold: 0.8, // Increase from 0.7
            resultLimit: 10,
          },
        }

      case 'storage':
        return {
          ...baseRecommendation,
          recommendation: 'Optimize IndexedDB indexes for better query performance.',
          configChanges: {
            indexOptimization: true,
            queryCaching: true,
          },
        }

      case 'render':
        return {
          ...baseRecommendation,
          recommendation: 'Consider enabling code splitting and lazy loading.',
          configChanges: {
            codeSplitting: true,
            lazyLoading: true,
          },
        }

      case 'memory':
        return {
          ...baseRecommendation,
          recommendation: 'Consider implementing soft limits for cache sizes.',
          configChanges: {
            cacheLimit: 50 * 1024 * 1024, // 50MB
          },
        }

      case 'network':
        return {
          ...baseRecommendation,
          recommendation: 'Enable request batching and deduplication.',
          configChanges: {
            requestBatching: true,
            deduplication: true,
          },
        }
    }
  }

  private createFailedResult(benchmark: BenchmarkOperation, error: unknown): BenchmarkResult {
    return {
      id: benchmark.id,
      name: benchmark.name,
      category: benchmark.category,
      measurements: [0],
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      percentiles: { p50: 0, p95: 0, p99: 0 },
      unit: 'ms',
      timestamp: new Date().toISOString(),
      iterations: 0,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        failed: true,
      },
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let suiteInstance: BenchmarkSuite | null = null

export function getBenchmarkSuite(): BenchmarkSuite {
  if (!suiteInstance) {
    suiteInstance = new BenchmarkSuite()
  }
  return suiteInstance
}
