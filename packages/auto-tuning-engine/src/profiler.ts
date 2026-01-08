/**
 * Performance Profiler
 *
 * Continuous profiling of key operations to identify bottlenecks
 * and optimization opportunities.
 */

import type { OptimizationTarget } from './types';

// ============================================================================
// PROFILE RESULT
// ============================================================================

export interface ProfileResult {
  /** Operation name */
  operation: string;

  /** Duration in milliseconds */
  duration: number;

  /** Memory used in MB (if available) */
  memory?: number;

  /** CPU usage percentage (if available) */
  cpu?: number;

  /** Identified bottleneck */
  bottleneck?: string;

  /** Optimization suggestion */
  suggestion?: string;

  /** Performance score (0-100) */
  score: number;

  /** Detailed metrics */
  metrics: Record<string, number>;

  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// PROFILER OPTIONS
// ============================================================================

export interface ProfilerOptions {
  /** Enable memory profiling */
  includeMemory?: boolean;

  /** Enable CPU profiling */
  includeCPU?: boolean;

  /** Number of samples to collect */
  samples?: number;

  /** Threshold for considering operation slow (ms) */
  slowThreshold?: number;
}

// ============================================================================
// PERFORMANCE PROFILER
// ============================================================================

export class PerformanceProfiler {
  private profiles: Map<string, number[]> = new Map();
  private options: Required<ProfilerOptions>;

  constructor(options?: ProfilerOptions) {
    this.options = {
      includeMemory: options?.includeMemory ?? true,
      includeCPU: options?.includeCPU ?? false,
      samples: options?.samples ?? 10,
      slowThreshold: options?.slowThreshold ?? 1000,
    };
  }

  /**
   * Profile a specific operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T> | T,
    options?: ProfilerOptions
  ): Promise<{ result: T; profile: ProfileResult }> {
    const opts = { ...this.options, ...options };

    // Get initial memory
    const initialMemory = opts.includeMemory ? this.getMemoryUsage() : 0;

    // Start CPU measurement (if supported)
    const startCpu = opts.includeCPU ? this.getCPUUsage() : 0;

    // Measure duration
    const startTime = performance.now();

    try {
      const result = await fn();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Get final memory
      const finalMemory = opts.includeMemory ? this.getMemoryUsage() : 0;
      const memoryDelta = finalMemory - initialMemory;

      // Get CPU usage
      const endCpu = opts.includeCPU ? this.getCPUUsage() : 0;
      const cpuDelta = endCpu - startCpu;

      // Record profile
      this.recordProfile(operation, duration);

      // Create profile result
      const profile: ProfileResult = {
        operation,
        duration,
        memory: opts.includeMemory ? memoryDelta : undefined,
        cpu: opts.includeCPU ? cpuDelta : undefined,
        bottleneck: this.identifyBottleneck(duration, memoryDelta, cpuDelta, opts),
        suggestion: this.generateSuggestion(operation, duration, memoryDelta, cpuDelta, opts),
        score: this.calculateScore(duration, memoryDelta, cpuDelta, opts),
        metrics: {
          duration,
          memoryDelta,
          cpuDelta,
        },
        timestamp: Date.now(),
      };

      return { result, profile };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Record failed profile
      this.recordProfile(operation, duration);

      throw error;
    }
  }

  /**
   * Start a manual profile measurement
   */
  start(operation: string): () => ProfileResult {
    const startTime = performance.now();
    const startMemory = this.options.includeMemory ? this.getMemoryUsage() : 0;
    const startCpu = this.options.includeCPU ? this.getCPUUsage() : 0;

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const endMemory = this.options.includeMemory ? this.getMemoryUsage() : 0;
      const memoryDelta = endMemory - startMemory;

      const endCpu = this.options.includeCPU ? this.getCPUUsage() : 0;
      const cpuDelta = endCpu - startCpu;

      // Record profile
      this.recordProfile(operation, duration);

      return {
        operation,
        duration,
        memory: this.options.includeMemory ? memoryDelta : undefined,
        cpu: this.options.includeCPU ? cpuDelta : undefined,
        bottleneck: this.identifyBottleneck(duration, memoryDelta, cpuDelta, this.options),
        suggestion: this.generateSuggestion(operation, duration, memoryDelta, cpuDelta, this.options),
        score: this.calculateScore(duration, memoryDelta, cpuDelta, this.options),
        metrics: {
          duration,
          memoryDelta,
          cpuDelta,
        },
        timestamp: Date.now(),
      };
    };
  }

  /**
   * Get statistics for an operation
   */
  getStats(operation: string): {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    count: number;
  } | null {
    const samples = this.profiles.get(operation);
    if (!samples || samples.length === 0) {
      return null;
    }

    const sorted = [...samples].sort((a, b) => a - b);

    return {
      avg: samples.reduce((sum, val) => sum + val, 0) / samples.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: samples.length,
    };
  }

  /**
   * Get all profiled operations
   */
  getOperations(): string[] {
    return Array.from(this.profiles.keys());
  }

  /**
   * Clear all profiles
   */
  clear(): void {
    this.profiles.clear();
  }

  /**
   * Record a profile measurement
   */
  private recordProfile(operation: string, duration: number): void {
    if (!this.profiles.has(operation)) {
      this.profiles.set(operation, []);
    }

    const samples = this.profiles.get(operation)!;
    samples.push(duration);

    // Keep only recent samples
    if (samples.length > this.options.samples * 10) {
      samples.splice(0, samples.length - this.options.samples * 10);
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    if (
      'memory' in performance &&
      (performance as any).memory?.usedJSHeapSize
    ) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Get current CPU usage (approximation)
   */
  private getCPUUsage(): number {
    // Note: Accurate CPU measurement isn't available in browsers
    // This is a placeholder for future native extensions
    return 0;
  }

  /**
   * Identify performance bottleneck
   */
  private identifyBottleneck(
    duration: number,
    memory: number,
    cpu: number,
    options: Required<ProfilerOptions>
  ): string | undefined {
    if (duration > options.slowThreshold * 3) {
      return 'slow_operation';
    }

    if (memory > 50) {
      return 'memory';
    }

    if (cpu > 80) {
      return 'cpu';
    }

    if (duration > options.slowThreshold) {
      return 'latency';
    }

    return undefined;
  }

  /**
   * Generate optimization suggestion
   */
  private generateSuggestion(
    operation: string,
    duration: number,
    memory: number,
    cpu: number,
    options: Required<ProfilerOptions>
  ): string | undefined {
    const suggestions: string[] = [];

    if (duration > options.slowThreshold * 3) {
      suggestions.push('enable_streaming', 'increase_batch_size');
    } else if (duration > options.slowThreshold) {
      suggestions.push('enable_caching', 'add_timeout');
    }

    if (memory > 50) {
      suggestions.push('reduce_memory', 'enable_compression');
    }

    if (cpu > 80) {
      suggestions.push('reduce_concurrency', 'enable_throttling');
    }

    return suggestions.length > 0 ? suggestions.join(', ') : undefined;
  }

  /**
   * Calculate performance score
   */
  private calculateScore(
    duration: number,
    memory: number,
    cpu: number,
    options: Required<ProfilerOptions>
  ): number {
    let score = 100;

    // Duration score
    const durationScore = Math.max(0, 100 - (duration / options.slowThreshold) * 100);
    score = (score + durationScore) / 2;

    // Memory score
    if (options.includeMemory && memory > 0) {
      const memoryScore = Math.max(0, 100 - (memory / 100) * 100);
      score = (score + memoryScore) / 2;
    }

    // CPU score
    if (options.includeCPU && cpu > 0) {
      const cpuScore = Math.max(0, 100 - cpu);
      score = (score + cpuScore) / 2;
    }

    return Math.round(score);
  }
}

// ============================================================================
// SPECIALIZED PROFILERS
// ============================================================================

/**
 * API Response Profiler
 */
export class APIProfiler {
  private profiler = new PerformanceProfiler({
    includeMemory: true,
    includeCPU: false,
    slowThreshold: 2000, // 2 seconds
  });

  /**
   * Profile API response
   */
  async profileResponse<T>(
    endpoint: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; profile: ProfileResult }> {
    return this.profiler.measure(`api:${endpoint}`, fn);
  }

  /**
   * Get API response stats
   */
  getResponseStats(endpoint: string) {
    return this.profiler.getStats(`api:${endpoint}`);
  }

  /**
   * Get all API endpoints
   */
  getEndpoints(): string[] {
    return this.profiler
      .getOperations()
      .filter((op) => op.startsWith('api:'))
      .map((op) => op.replace('api:', ''));
  }
}

/**
 * Component Render Profiler
 */
export class ComponentProfiler {
  private profiler = new PerformanceProfiler({
    includeMemory: true,
    includeCPU: false,
    slowThreshold: 16, // 60fps = 16.67ms per frame
  });

  /**
   * Profile component render
   */
  profileRender(componentName: string, renderFn: () => void): ProfileResult {
    const end = this.profiler.start(`component:${componentName}`);
    renderFn();
    return end();
  }

  /**
   * Get component render stats
   */
  getRenderStats(componentName: string) {
    return this.profiler.getStats(`component:${componentName}`);
  }
}

/**
 * Cache Performance Profiler
 */
export class CacheProfiler {
  private hits = 0;
  private misses = 0;
  private sizes: Map<string, number> = new Map();

  /**
   * Record cache hit
   */
  recordHit(key: string): void {
    this.hits++;
  }

  /**
   * Record cache miss
   */
  recordMiss(key: string): void {
    this.misses++;
  }

  /**
   * Record cache size
   */
  recordSize(cacheName: string, size: number): void {
    this.sizes.set(cacheName, size);
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    sizes: Record<string, number>;
  } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      sizes: Object.fromEntries(this.sizes),
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.sizes.clear();
  }
}

// ============================================================================
// GLOBAL PROFILER INSTANCE
// ============================================================================

/**
 * Global profiler instance
 */
export const profiler = new PerformanceProfiler();

/**
 * Global API profiler
 */
export const apiProfiler = new APIProfiler();

/**
 * Global component profiler
 */
export const componentProfiler = new ComponentProfiler();

/**
 * Global cache profiler
 */
export const cacheProfiler = new CacheProfiler();
